const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
const { portariaCheckinPermitido } = require("../utils/portariaPrazoCheckin");
const {
  fetchSupervisorAcessosAtivos,
  fetchSupervisorAcessosCancelados,
  fetchSupervisorAcessoDetalhe,
  fetchUltimoCancelamentoSupervisor,
} = require("../utils/receptionQueries");

const MSG_PRAZO_CANCEL =
  "O cancelamento só é permitido no dia do evento até 23:59.";

async function obterHojeStr() {
  const [todayRows] = await db.execute(`SELECT CURDATE() AS hoje`);
  const hoje = todayRows[0]?.hoje;
  return hoje instanceof Date
    ? hoje.toISOString().slice(0, 10)
    : String(hoje).slice(0, 10);
}

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizarTipoFiltro(raw) {
  const t = String(raw || "todos").toUpperCase().trim();
  if (t === "BID" || t === "WT_PASS") return t;
  return "todos";
}

function normalizarStatusFiltro(raw) {
  const s = String(raw || "todos").toLowerCase().trim();
  if (s === "ativo" || s === "cancelado") return s;
  return "todos";
}

function filtrarBusca(items, q) {
  const term = String(q || "").trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => {
    const campos = [
      item.titular_nome,
      item.recebedor_nome,
      item.evento_titulo,
      item.recebedor_cpf,
      item.titular_cpf,
      item.empresa,
      item.liberado_por_nome,
      item.cancelado_por_nome,
    ];
    return campos.some((c) => String(c || "").toLowerCase().includes(term));
  });
}

function ordenarAcessos(items) {
  return items.sort((a, b) => {
    const da = new Date(a.data_checkin || a.cancelado_em || 0).getTime();
    const db_ = new Date(b.data_checkin || b.cancelado_em || 0).getTime();
    return db_ - da;
  });
}

async function gravarAuditoria(connection, adminId, acao, registroId, detalhes) {
  await connection.execute(
    `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, 'PORTARIA', ?, ?, ?)`,
    [adminId || 1, acao, registroId || null, safeAuditoriaDetalhes(detalhes)],
  );
}

exports.listAcessos = async (req, res) => {
  try {
    const hoje = await obterHojeStr();
    const from = String(req.query.from || defaultFromDate()).trim();
    const to = String(req.query.to || hoje).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: "Informe from e to no formato YYYY-MM-DD." });
    }
    if (from > to) {
      return res.status(400).json({ error: "A data inicial não pode ser maior que a final." });
    }

    const status = normalizarStatusFiltro(req.query.status);
    const tipo = normalizarTipoFiltro(req.query.tipo);
    let items = [];

    if (status === "ativo" || status === "todos") {
      items.push(...(await fetchSupervisorAcessosAtivos(db, from, to, tipo)));
    }
    if (status === "cancelado" || status === "todos") {
      items.push(...(await fetchSupervisorAcessosCancelados(db, from, to, tipo)));
    }

    items = ordenarAcessos(filtrarBusca(items, req.query.q));
    res.json(items);
  } catch (error) {
    await logErro("RECEPTION_SUPERVISOR_LIST_ACESSOS", error);
    res.status(500).json({ error: "Erro ao listar acessos da portaria." });
  }
};

exports.getAcessoDetalhe = async (req, res) => {
  const tipo = String(req.params.tipo || "").toUpperCase().trim();
  const id = Number(req.params.id);
  if (!["BID", "WT_PASS"].includes(tipo) || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Tipo ou ID inválido." });
  }

  try {
    const detalhe = await fetchSupervisorAcessoDetalhe(db, tipo, id);
    if (!detalhe) {
      return res.status(404).json({ error: "Acesso não encontrado." });
    }

    if (detalhe.status === "cancelado") {
      const cancel = await fetchUltimoCancelamentoSupervisor(db, tipo, id);
      if (cancel) {
        detalhe.cancelado_em = cancel.cancelado_em;
        detalhe.cancelado_por_nome = cancel.cancelado_por_nome;
        detalhe.motivo_cancelamento = cancel.motivo_cancelamento;
      }
    }

    res.json(detalhe);
  } catch (error) {
    await logErro("RECEPTION_SUPERVISOR_GET_DETALHE", error);
    res.status(500).json({ error: "Erro ao buscar detalhe do acesso." });
  }
};

exports.cancelarAcesso = async (req, res) => {
  const tipo = String(req.params.tipo || "").toUpperCase().trim();
  const id = Number(req.params.id);
  const motivo = String(req.body?.motivo || "").trim();
  const adminId = req.user?.id || 1;

  if (!["BID", "WT_PASS"].includes(tipo) || !Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Tipo ou ID inválido." });
  }
  if (motivo.length < 10) {
    return res.status(400).json({ error: "Informe o motivo do cancelamento (mínimo 10 caracteres)." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const detalhe = await fetchSupervisorAcessoDetalhe(connection, tipo, id);
    if (!detalhe) {
      await connection.rollback();
      return res.status(404).json({ error: "Acesso não encontrado." });
    }
    if (detalhe.status !== "ativo") {
      await connection.rollback();
      return res.status(409).json({ error: "Este acesso já foi cancelado ou não está liberado." });
    }
    if (!portariaCheckinPermitido(detalhe.data_evento)) {
      await connection.rollback();
      return res.status(403).json({ error: MSG_PRAZO_CANCEL });
    }

    const [adminDados] = await connection.execute(
      `SELECT nome_completo FROM usuarios WHERE id = ?`,
      [adminId],
    );
    const nomeAdmin =
      adminDados.length > 0 ? adminDados[0].nome_completo : "Administrador";

    const snapshot = {
      evento: detalhe.evento_titulo,
      titular: detalhe.titular_nome,
      recebedor: detalhe.recebedor_nome,
      cpf_recebedor: detalhe.recebedor_cpf,
      empresa: detalhe.empresa,
      setor: detalhe.setor_evento_nome,
      data_evento: detalhe.data_evento,
      data_checkin_anterior: detalhe.data_checkin,
      liberado_por: detalhe.liberado_por_nome,
      documento_anexado: detalhe.tem_documento === true,
      partida_id: detalhe.partida_id,
      evento_rh_id: detalhe.evento_rh_id,
      motivo,
      cancelado_por: nomeAdmin,
    };

    if (tipo === "WT_PASS") {
      const [upd] = await connection.execute(
        `UPDATE inscricoes_rh SET
          portaria_checkin = 0,
          portaria_assinatura = NULL,
          portaria_documento = NULL,
          portaria_recebedor_nome = NULL,
          portaria_recebedor_cpf = NULL,
          portaria_data_checkin = NULL
         WHERE id = ? AND portaria_checkin = 1`,
        [id],
      );
      if (upd.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({ error: "Check-in já cancelado ou indisponível." });
      }
      await gravarAuditoria(connection, adminId, "CHECKIN_CANCEL_WT_PASS", id, {
        ...snapshot,
        motivo: `O(a) admin ${nomeAdmin} cancelou liberação WT Pass #${id}: ${motivo}`,
      });
    } else {
      const [upd] = await connection.execute(
        `UPDATE ingressos SET
          checkin = 0,
          assinatura = NULL,
          documento = NULL,
          recebedor_nome = NULL,
          recebedor_cpf = NULL,
          data_checkin = NULL
         WHERE id = ? AND checkin = 1`,
        [id],
      );
      if (upd.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({ error: "Check-in já cancelado ou indisponível." });
      }
      await gravarAuditoria(connection, adminId, "CHECKIN_CANCEL_INGRESSO", id, {
        ...snapshot,
        motivo: `O(a) admin ${nomeAdmin} cancelou liberação do ingresso #${id}: ${motivo}`,
      });
    }

    await connection.commit();
    res.json({ message: "Liberação cancelada com sucesso." });
  } catch (error) {
    await connection.rollback();
    await logErro("RECEPTION_SUPERVISOR_CANCELAR", error);
    res.status(500).json({ error: "Falha ao cancelar liberação." });
  } finally {
    connection.release();
  }
};

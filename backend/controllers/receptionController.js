const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
const { normalizarCpfDigits } = require("../utils/cpf");

async function gravarAuditoria(
  connection,
  adminId,
  modulo,
  acao,
  registroId,
  detalhes,
) {
  try {
    const executor = connection || db;
    await executor.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [
        adminId || 1,
        modulo,
        acao,
        registroId || null,
        safeAuditoriaDetalhes(detalhes),
      ],
    );
  } catch (e) {
    await logErro("RECEPTION_CONTROLLER_GRAVAR_AUDITORIA", e);
  }
}

exports.getTodayEvents = async (req, res) => {
  try {
    const dateParam = req.query.date;
    let filterDate = null;

    if (dateParam != null && String(dateParam).trim() !== "") {
      const normalized = String(dateParam).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD." });
      }
      const [todayRows] = await db.execute(`SELECT CURDATE() AS hoje`);
      const hoje = todayRows[0]?.hoje;
      const hojeStr =
        hoje instanceof Date
          ? hoje.toISOString().slice(0, 10)
          : String(hoje).slice(0, 10);
      if (normalized < hojeStr) {
        return res.status(400).json({ error: "Não é permitido consultar datas anteriores a hoje." });
      }
      filterDate = normalized;
    }

    const dateClause = filterDate ? "?" : "CURDATE()";
    const dateParams = filterDate ? [filterDate] : [];

    const [rowsBid] = await db.execute(
      `SELECT p.id, p.titulo, p.banner, p.data_jogo AS data_evento
       FROM partidas p
       WHERE EXISTS (
         SELECT 1
         FROM apostas a
         WHERE a.partida_id = p.id
           AND a.status = 'GANHOU'
       )
       AND DATE(p.data_jogo) = ${dateClause}
       AND DATE(p.data_jogo) >= CURDATE()
       ORDER BY p.data_jogo ASC`,
      dateParams,
    );

    const bidIds = new Set(rowsBid.map((r) => Number(r.id)));

    const [rowsWt] = await db.execute(
      `SELECT ev.id AS evento_rh_id, ev.titulo, ev.banner, ev.data_evento, ev.partida_id,
              p.titulo AS partida_titulo, p.banner AS partida_banner, p.data_jogo AS partida_data_jogo
         FROM eventos_rh ev
         LEFT JOIN partidas p ON p.id = ev.partida_id
        WHERE ev.status <> 'CANCELADO'
          AND DATE(ev.data_evento) = ${dateClause}
          AND DATE(ev.data_evento) >= CURDATE()
          AND EXISTS (
            SELECT 1 FROM inscricoes_rh i
             WHERE i.evento_id = ev.id AND i.status = 'INSCRITO'
          )
        ORDER BY ev.data_evento ASC, ev.id ASC`,
      dateParams,
    );

    const eventos = rowsBid.map((r) => ({
      id: r.id,
      tipo_evento: "BID",
      titulo: r.titulo,
      banner: r.banner,
      data_evento: r.data_evento,
      partida_id: r.id,
      evento_rh_id: null,
    }));

    for (const ev of rowsWt) {
      const partidaId = ev.partida_id != null ? Number(ev.partida_id) : null;
      if (partidaId != null && bidIds.has(partidaId)) continue;

      eventos.push({
        id: ev.evento_rh_id,
        tipo_evento: "WT_PASS",
        titulo: ev.titulo || ev.partida_titulo,
        banner: ev.banner || ev.partida_banner,
        data_evento: ev.data_evento || ev.partida_data_jogo,
        partida_id: partidaId,
        evento_rh_id: ev.evento_rh_id,
      });
    }

    eventos.sort((a, b) => {
      const ta = a.data_evento ? new Date(a.data_evento).getTime() : 0;
      const tb = b.data_evento ? new Date(b.data_evento).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt", {
        sensitivity: "base",
      });
    });

    res.json(eventos);
  } catch (error) {
    await logErro("RECEPTION_CONTROLLER_GET_TODAY_EVENTS", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

function mapGuestRowBid(r, setorEventoNome) {
  const titCpf =
    normalizarCpfDigits(r.titular_cpf_db) ||
    normalizarCpfDigits(r.titular_cpf_conv_padrao);
  const retCpf = normalizarCpfDigits(r.retirante_cpf);
  const apostaCpf = normalizarCpfDigits(r.aposta_recebedor_cpf);
  const retiranteCpfExibicao = retCpf || titCpf || "";
  const recebedorCpfExibicao = apostaCpf || retCpf || titCpf || "";
  return {
    tipo_convite: "BID",
    ingresso_id: r.ingresso_id,
    aposta_id: r.aposta_id,
    inscricao_rh_id: null,
    checkin: r.checkin === 1,
    assinatura: r.assinatura,
    documento: r.documento,
    titular_id: r.titular_id,
    titular_nome: r.titular_nome,
    titular_cpf: titCpf || null,
    empresa: r.empresa || "Geral",
    setor_evento_nome: setorEventoNome || null,
    recebedor_nome: r.aposta_recebedor_nome || r.retirante_nome || "Pendente",
    recebedor_cpf: recebedorCpfExibicao || "---",
    retirante_nome: r.retirante_nome || "Não indicado",
    retirante_cpf: retiranteCpfExibicao || "---",
  };
}

function mapGuestRowWt(r, setorEventoNome) {
  const titCpf =
    normalizarCpfDigits(r.titular_cpf_db) ||
    normalizarCpfDigits(r.titular_cpf_conv_padrao);
  const nomeTit = r.titular_nome || "";
  const portCpf = normalizarCpfDigits(r.portaria_recebedor_cpf);
  const recebedorCpfExibicao = portCpf || titCpf || "";
  return {
    tipo_convite: "WT_PASS",
    ingresso_id: null,
    aposta_id: null,
    inscricao_rh_id: r.inscricao_rh_id,
    checkin: r.portaria_checkin === 1,
    assinatura: r.portaria_assinatura,
    documento: r.portaria_documento,
    titular_id: r.titular_id,
    titular_nome: nomeTit,
    titular_cpf: titCpf || null,
    empresa: r.empresa || "Geral",
    setor_evento_nome: setorEventoNome || null,
    recebedor_nome: r.portaria_recebedor_nome || nomeTit || "Pendente",
    recebedor_cpf: recebedorCpfExibicao || "---",
    /** Ingresso intransferível: retirante = titular (utilizador inscrito). */
    retirante_nome: nomeTit,
    retirante_cpf: titCpf || "---",
  };
}

exports.getEventGuests = async (req, res) => {
  const { eventId } = req.params;
  const tipoRaw = String(req.query.tipo || "BID").toUpperCase().trim();
  const isWtEvento = tipoRaw === "WT_PASS";
  const idRef = Number(eventId);

  if (!Number.isFinite(idRef) || idRef <= 0) {
    return res.status(400).json({ error: "ID de evento inválido." });
  }

  try {
    let setorEventoNome = null;

    if (isWtEvento) {
      const [setorRows] = await db.execute(
        `SELECT se.nome AS setor_evento_nome
           FROM eventos_rh ev
           LEFT JOIN partidas p ON p.id = ev.partida_id
           LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
          WHERE ev.id = ?
          LIMIT 1`,
        [idRef],
      );
      setorEventoNome = setorRows[0]?.setor_evento_nome || null;

      const queryWtStandalone = `
        SELECT i.id AS inscricao_rh_id, i.portaria_checkin, i.portaria_assinatura, i.portaria_documento,
          i.portaria_recebedor_nome, i.portaria_recebedor_cpf,
          u.id AS titular_id, u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
          (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) AS titular_cpf_conv_padrao,
          em.nome AS empresa
        FROM inscricoes_rh i
        INNER JOIN eventos_rh ev ON ev.id = i.evento_id
        INNER JOIN usuarios u ON u.id = i.usuario_id
        LEFT JOIN empresas em ON u.empresa_id = em.id
        WHERE i.evento_id = ? AND i.status = 'INSCRITO'
        ORDER BY u.nome_completo ASC
      `;
      const [rowsWt] = await db.execute(queryWtStandalone, [idRef]);
      const formatedWt = rowsWt.map((r) => mapGuestRowWt(r, setorEventoNome));
      return res.json(formatedWt);
    }

    const partidaId = idRef;
    const [setorRows] = await db.execute(
      `SELECT se.nome AS setor_evento_nome
       FROM partidas p
       LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
       WHERE p.id = ?
       LIMIT 1`,
      [partidaId],
    );
    setorEventoNome = setorRows[0]?.setor_evento_nome || null;

    const queryBid = `
      SELECT i.id as ingresso_id, i.aposta_id, i.checkin, i.assinatura, i.documento, i.recebedor_nome as aposta_recebedor_nome, i.recebedor_cpf as aposta_recebedor_cpf,
        u.id as titular_id, u.nome_completo as titular_nome, u.cpf as titular_cpf_db,
        (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) as titular_cpf_conv_padrao,
        e.nome as empresa, c.nome_completo as retirante_nome, c.cpf as retirante_cpf
      FROM ingressos i
      JOIN apostas a ON i.aposta_id = a.id
      JOIN usuarios u ON i.usuario_id = u.id
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN convidados c ON i.convidado_id = c.id
      WHERE a.partida_id = ? AND a.status = 'GANHOU'
      ORDER BY u.nome_completo ASC
    `;
    const [rowsBid] = await db.execute(queryBid, [partidaId]);

    const queryWt = `
      SELECT i.id AS inscricao_rh_id, i.portaria_checkin, i.portaria_assinatura, i.portaria_documento,
        i.portaria_recebedor_nome, i.portaria_recebedor_cpf,
        u.id AS titular_id, u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
        (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) AS titular_cpf_conv_padrao,
        em.nome AS empresa
      FROM inscricoes_rh i
      INNER JOIN eventos_rh ev ON ev.id = i.evento_id AND ev.partida_id = ?
      INNER JOIN usuarios u ON u.id = i.usuario_id
      LEFT JOIN empresas em ON u.empresa_id = em.id
      WHERE i.status = 'INSCRITO'
      ORDER BY u.nome_completo ASC
    `;
    const [rowsWt] = await db.execute(queryWt, [partidaId]);

    const formatedBid = rowsBid.map((r) => mapGuestRowBid(r, setorEventoNome));
    const formatedWt = rowsWt.map((r) => mapGuestRowWt(r, setorEventoNome));
    const merged = [...formatedBid, ...formatedWt].sort((a, b) =>
      String(a.titular_nome || "").localeCompare(String(b.titular_nome || ""), "pt", {
        sensitivity: "base",
      }),
    );
    res.json(merged);
  } catch (error) {
    await logErro("RECEPTION_CONTROLLER_GET_EVENT_GUESTS", error);
    res.status(500).json({ error: "Erro ao buscar lista de acesso." });
  }
};

exports.checkin = async (req, res) => {
  const documentoBase64Raw = req.body.documentoBase64 || req.body.recebedorDocumentoBase64;
  const documentoBase64 =
    documentoBase64Raw && typeof documentoBase64Raw === "string" && documentoBase64Raw.trim() !== ""
      ? documentoBase64Raw.trim()
      : null;
  const { assinaturaBase64, recebedorNome, recebedorCpf, adminId } = req.body;

  const inscricaoRhIdRaw = req.body.inscricaoRhId;
  const inscricaoRhId =
    inscricaoRhIdRaw != null && String(inscricaoRhIdRaw).trim() !== ""
      ? Number(inscricaoRhIdRaw)
      : null;
  const partidaIdBody =
    req.body.partidaId != null && String(req.body.partidaId).trim() !== ""
      ? Number(req.body.partidaId)
      : null;
  const eventoRhIdBody =
    req.body.eventoRhId != null && String(req.body.eventoRhId).trim() !== ""
      ? Number(req.body.eventoRhId)
      : null;

  const idIngresso = req.body.ingressoId || req.body.apostaId;
  const isWtCheckin =
    Number.isFinite(inscricaoRhId) && inscricaoRhId != null && inscricaoRhId > 0;

  if (isWtCheckin && idIngresso) {
    return res.status(400).json({ error: "Envie apenas ingressoId ou inscricaoRhId, não ambos." });
  }

  const idFinal = isWtCheckin ? null : idIngresso;
  if ((!idFinal && !isWtCheckin) || !assinaturaBase64 || !recebedorNome || !recebedorCpf) {
    return res.status(400).json({ error: "Dados incompletos para o check-in." });
  }
  if (isWtCheckin) {
    const temPartida =
      Number.isFinite(partidaIdBody) && partidaIdBody != null && partidaIdBody > 0;
    const temEventoRh =
      Number.isFinite(eventoRhIdBody) && eventoRhIdBody != null && eventoRhIdBody > 0;
    if (!temPartida && !temEventoRh) {
      return res.status(400).json({
        error: "Informe partidaId ou eventoRhId para check-in WT Pass.",
      });
    }
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [adminDados] = await connection.execute(
      `SELECT nome_completo FROM usuarios WHERE id = ?`,
      [adminId || 1],
    );
    const nomePorteiro =
      adminDados.length > 0 ? adminDados[0].nome_completo : "Portaria";

    if (isWtCheckin) {
      const [insRows] = await connection.execute(
        `SELECT i.id, ev.id AS evento_rh_id, ev.partida_id, ev.titulo AS evento_wt_titulo, p.titulo AS partida_titulo, u.nome_completo AS titular
         FROM inscricoes_rh i
         INNER JOIN eventos_rh ev ON ev.id = i.evento_id
         LEFT JOIN partidas p ON p.id = ev.partida_id
         INNER JOIN usuarios u ON u.id = i.usuario_id
         WHERE i.id = ? AND i.status = 'INSCRITO'
         FOR UPDATE`,
        [inscricaoRhId],
      );
      if (insRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Inscrição WT não encontrada ou sem vaga ativa." });
      }
      const evPartidaId =
        insRows[0].partida_id != null ? Number(insRows[0].partida_id) : null;
      const evRhId = Number(insRows[0].evento_rh_id);
      if (evPartidaId != null) {
        if (!Number.isFinite(partidaIdBody) || partidaIdBody !== evPartidaId) {
          await connection.rollback();
          return res.status(403).json({ error: "Inscrição não pertence a este evento (partida)." });
        }
      } else if (!Number.isFinite(eventoRhIdBody) || eventoRhIdBody !== evRhId) {
        await connection.rollback();
        return res.status(403).json({ error: "Inscrição não pertence a este evento WT Pass." });
      }

      const [upd] = await connection.execute(
        `UPDATE inscricoes_rh SET
          portaria_checkin = 1,
          portaria_assinatura = ?,
          portaria_documento = ?,
          portaria_recebedor_nome = ?,
          portaria_recebedor_cpf = ?,
          portaria_data_checkin = NOW()
         WHERE id = ? AND status = 'INSCRITO' AND IFNULL(portaria_checkin, 0) = 0`,
        [assinaturaBase64, documentoBase64, recebedorNome, recebedorCpf, inscricaoRhId],
      );
      if (upd.affectedRows === 0) {
        await connection.rollback();
        return res.status(409).json({ error: "Check-in já registrado ou inscrição indisponível." });
      }

      const eventoTitulo =
        insRows[0].partida_titulo || insRows[0].evento_wt_titulo || "Evento Desconhecido";
      const titularNome = insRows[0].titular || "Titular Desconhecido";

      await gravarAuditoria(
        connection,
        adminId || 1,
        "PORTARIA",
        "CHECKIN_WT_PASS",
        inscricaoRhId,
        {
          evento: eventoTitulo,
          titular: titularNome,
          recebedor: recebedorNome,
          cpf_recebedor: recebedorCpf,
          documento_anexado: documentoBase64 != null,
          motivo: `O(a) funcionário(a) ${nomePorteiro} registrou liberação na portaria de ${recebedorNome} (WT Pass inscrição #${inscricaoRhId}) titular ${titularNome} no evento: ${eventoTitulo}`,
        },
      );
    } else {
      await connection.execute(
        `UPDATE ingressos SET checkin = 1, assinatura = ?, documento = ?, recebedor_nome = ?, recebedor_cpf = ?, data_checkin = NOW() WHERE id = ?`,
        [assinaturaBase64, documentoBase64, recebedorNome, recebedorCpf, idFinal],
      );

      const [dados] = await connection.execute(
        `SELECT p.titulo, u.nome_completo as titular FROM ingressos i JOIN apostas a ON i.aposta_id = a.id JOIN partidas p ON a.partida_id = p.id JOIN usuarios u ON i.usuario_id = u.id WHERE i.id = ?`,
        [idFinal],
      );
      const eventoTitulo =
        dados.length > 0 ? dados[0].titulo : "Evento Desconhecido";
      const titularNome =
        dados.length > 0 ? dados[0].titular : "Titular Desconhecido";

      await gravarAuditoria(
        connection,
        adminId || 1,
        "PORTARIA",
        "CHECKIN_INGRESSO",
        idFinal,
        {
          evento: eventoTitulo,
          titular: titularNome,
          recebedor: recebedorNome,
          cpf_recebedor: recebedorCpf,
          documento_anexado: documentoBase64 != null,
          motivo: `O(a) funcionário(a) ${nomePorteiro} liberou a entrada de ${recebedorNome} usando o ingresso #${idFinal} de ${titularNome} no evento: ${eventoTitulo}`,
        },
      );
    }

    await connection.commit();
    res.json({ message: "Entrada liberada com sucesso." });
  } catch (error) {
    await connection.rollback();
    await logErro("RECEPTION_CONTROLLER_CHECKIN", error);
    res.status(500).json({ error: "Falha interna ao processar o check-in." });
  } finally {
    connection.release();
  }
};

exports.processCheckin = exports.checkin;

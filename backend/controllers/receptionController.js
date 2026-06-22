const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
const {
  fetchReceptionEventsForDate,
  fetchReceptionEventDatesInRange,
  fetchReceptionGuestsForEvent,
} = require("../utils/receptionQueries");
const { portariaCheckinPermitido } = require("../utils/portariaPrazoCheckin");

const MSG_PRAZO_CHECKIN =
  "O prazo para liberar entrada encerrou às 23:59 do dia do evento.";

async function obterHojeStr() {
  const [todayRows] = await db.execute(`SELECT CURDATE() AS hoje`);
  const hoje = todayRows[0]?.hoje;
  return hoje instanceof Date
    ? hoje.toISOString().slice(0, 10)
    : String(hoje).slice(0, 10);
}

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
      filterDate = normalized;
    }

    const hojeStr = await obterHojeStr();
    const restrictToFutureOnly = filterDate ? filterDate >= hojeStr : true;

    const eventos = await fetchReceptionEventsForDate(db, {
      date: filterDate,
      restrictToFutureOnly,
    });

    res.json(eventos);
  } catch (error) {
    await logErro("RECEPTION_CONTROLLER_GET_TODAY_EVENTS", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

exports.getEventDates = async (req, res) => {
  try {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ error: "Informe from e to no formato YYYY-MM-DD." });
    }
    if (from > to) {
      return res.status(400).json({ error: "A data inicial não pode ser maior que a final." });
    }
    const datas = await fetchReceptionEventDatesInRange(db, from, to);
    res.json(datas);
  } catch (error) {
    await logErro("RECEPTION_CONTROLLER_GET_EVENT_DATES", error);
    res.status(500).json({ error: "Erro ao buscar datas com eventos." });
  }
};

exports.getEventGuests = async (req, res) => {
  const { eventId } = req.params;
  const tipoRaw = String(req.query.tipo || "BID").toUpperCase().trim();
  const idRef = Number(eventId);

  if (!Number.isFinite(idRef) || idRef <= 0) {
    return res.status(400).json({ error: "ID de evento inválido." });
  }

  try {
    const guests = await fetchReceptionGuestsForEvent(db, idRef, tipoRaw);
    res.json(guests);
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
        `SELECT i.id, ev.id AS evento_rh_id, ev.partida_id, ev.data_evento, ev.titulo AS evento_wt_titulo,
                p.titulo AS partida_titulo, p.data_jogo AS partida_data_jogo, u.nome_completo AS titular
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

      const dataEventoWt =
        insRows[0].partida_data_jogo || insRows[0].data_evento;
      if (!portariaCheckinPermitido(dataEventoWt)) {
        await connection.rollback();
        return res.status(403).json({ error: MSG_PRAZO_CHECKIN });
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
      const [dadosIngresso] = await connection.execute(
        `SELECT p.data_jogo, p.titulo, u.nome_completo as titular
         FROM ingressos i
         JOIN apostas a ON i.aposta_id = a.id
         JOIN partidas p ON a.partida_id = p.id
         JOIN usuarios u ON i.usuario_id = u.id
         WHERE i.id = ?
         FOR UPDATE`,
        [idFinal],
      );
      if (dadosIngresso.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Ingresso não encontrado." });
      }
      if (!portariaCheckinPermitido(dadosIngresso[0].data_jogo)) {
        await connection.rollback();
        return res.status(403).json({ error: MSG_PRAZO_CHECKIN });
      }

      await connection.execute(
        `UPDATE ingressos SET checkin = 1, assinatura = ?, documento = ?, recebedor_nome = ?, recebedor_cpf = ?, data_checkin = NOW() WHERE id = ?`,
        [assinaturaBase64, documentoBase64, recebedorNome, recebedorCpf, idFinal],
      );

      const dados = dadosIngresso;
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

const { normalizarCpfDigits } = require("./cpf");

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
    retirante_nome: nomeTit,
    retirante_cpf: titCpf || "---",
  };
}

/**
 * Eventos de portaria para uma data (BIDs finalizados com ganhadores + WT Pass com inscritos).
 * @param {object} executor - pool ou connection mysql2
 * @param {{ date?: string|null, restrictToFutureOnly?: boolean }} options
 */
async function fetchReceptionEventsForDate(executor, options = {}) {
  const { date = null, restrictToFutureOnly = false } = options;
  const dateClause = date ? "?" : "CURDATE()";
  const dateParams = date ? [date] : [];
  const futureBid = restrictToFutureOnly ? " AND DATE(p.data_jogo) >= CURDATE()" : "";
  const futureWt = restrictToFutureOnly ? " AND DATE(ev.data_evento) >= CURDATE()" : "";

  const [rowsBid] = await executor.execute(
    `SELECT p.id, p.titulo, p.banner, p.data_jogo AS data_evento
     FROM partidas p
     WHERE EXISTS (
       SELECT 1
       FROM apostas a
       WHERE a.partida_id = p.id
         AND a.status = 'GANHOU'
     )
     AND DATE(p.data_jogo) = ${dateClause}${futureBid}
     ORDER BY p.data_jogo ASC`,
    dateParams,
  );

  const bidIds = new Set(rowsBid.map((r) => Number(r.id)));

  const [rowsWt] = await executor.execute(
    `SELECT ev.id AS evento_rh_id, ev.titulo, ev.banner, ev.data_evento, ev.partida_id,
            p.titulo AS partida_titulo, p.banner AS partida_banner, p.data_jogo AS partida_data_jogo
       FROM eventos_rh ev
       LEFT JOIN partidas p ON p.id = ev.partida_id
      WHERE ev.status <> 'CANCELADO'
        AND DATE(ev.data_evento) = ${dateClause}${futureWt}
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

  return eventos;
}

/**
 * Lista de convidados de portaria para um evento (mesma lógica de getEventGuests).
 * @param {object} executor
 * @param {number} eventId
 * @param {'BID'|'WT_PASS'} tipoEvento
 */
async function fetchReceptionGuestsForEvent(executor, eventId, tipoEvento) {
  const idRef = Number(eventId);
  const isWtEvento = String(tipoEvento || "BID").toUpperCase().trim() === "WT_PASS";

  if (!Number.isFinite(idRef) || idRef <= 0) {
    return [];
  }

  if (isWtEvento) {
    const [setorRows] = await executor.execute(
      `SELECT se.nome AS setor_evento_nome
         FROM eventos_rh ev
         LEFT JOIN partidas p ON p.id = ev.partida_id
         LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
        WHERE ev.id = ?
        LIMIT 1`,
      [idRef],
    );
    const setorEventoNome = setorRows[0]?.setor_evento_nome || null;

    const [rowsWt] = await executor.execute(
      `SELECT i.id AS inscricao_rh_id, i.portaria_checkin, i.portaria_assinatura, i.portaria_documento,
          i.portaria_recebedor_nome, i.portaria_recebedor_cpf,
          u.id AS titular_id, u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
          (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) AS titular_cpf_conv_padrao,
          em.nome AS empresa
        FROM inscricoes_rh i
        INNER JOIN eventos_rh ev ON ev.id = i.evento_id
        INNER JOIN usuarios u ON u.id = i.usuario_id
        LEFT JOIN empresas em ON u.empresa_id = em.id
        WHERE i.evento_id = ? AND i.status = 'INSCRITO'
        ORDER BY u.nome_completo ASC`,
      [idRef],
    );
    return rowsWt.map((r) => mapGuestRowWt(r, setorEventoNome));
  }

  const partidaId = idRef;
  const [setorRows] = await executor.execute(
    `SELECT se.nome AS setor_evento_nome
     FROM partidas p
     LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
     WHERE p.id = ?
     LIMIT 1`,
    [partidaId],
  );
  const setorEventoNome = setorRows[0]?.setor_evento_nome || null;

  const [rowsBid] = await executor.execute(
    `SELECT i.id as ingresso_id, i.aposta_id, i.checkin, i.assinatura, i.documento, i.recebedor_nome as aposta_recebedor_nome, i.recebedor_cpf as aposta_recebedor_cpf,
        u.id as titular_id, u.nome_completo as titular_nome, u.cpf as titular_cpf_db,
        (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) as titular_cpf_conv_padrao,
        e.nome as empresa, c.nome_completo as retirante_nome, c.cpf as retirante_cpf
      FROM ingressos i
      JOIN apostas a ON i.aposta_id = a.id
      JOIN usuarios u ON i.usuario_id = u.id
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN convidados c ON i.convidado_id = c.id
      WHERE a.partida_id = ? AND a.status = 'GANHOU'
      ORDER BY u.nome_completo ASC`,
    [partidaId],
  );

  const [rowsWt] = await executor.execute(
    `SELECT i.id AS inscricao_rh_id, i.portaria_checkin, i.portaria_assinatura, i.portaria_documento,
        i.portaria_recebedor_nome, i.portaria_recebedor_cpf,
        u.id AS titular_id, u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
        (SELECT c2.cpf FROM convidados c2 WHERE c2.usuario_id = u.id AND c2.vinculo_titular = 1 LIMIT 1) AS titular_cpf_conv_padrao,
        em.nome AS empresa
      FROM inscricoes_rh i
      INNER JOIN eventos_rh ev ON ev.id = i.evento_id AND ev.partida_id = ?
      INNER JOIN usuarios u ON u.id = i.usuario_id
      LEFT JOIN empresas em ON u.empresa_id = em.id
      WHERE i.status = 'INSCRITO'
      ORDER BY u.nome_completo ASC`,
    [partidaId],
  );

  const formatedBid = rowsBid.map((r) => mapGuestRowBid(r, setorEventoNome));
  const formatedWt = rowsWt.map((r) => mapGuestRowWt(r, setorEventoNome));
  return [...formatedBid, ...formatedWt].sort((a, b) =>
    String(a.titular_nome || "").localeCompare(String(b.titular_nome || ""), "pt", {
      sensitivity: "base",
    }),
  );
}

function emptyTipoCounts() {
  return {
    BID: { liberados: 0, pendentes: 0 },
    WT_PASS: { liberados: 0, pendentes: 0 },
  };
}

function incrementTipoCount(porTipo, tipo, liberado) {
  const key = tipo === "WT_PASS" ? "WT_PASS" : "BID";
  if (liberado) porTipo[key].liberados += 1;
  else porTipo[key].pendentes += 1;
}

/**
 * Agrega convidados em totais por tipo e por empresa (sem expor dados pessoais).
 */
function aggregatePortariaGuests(guests) {
  const porTipo = emptyTipoCounts();
  const empresaMap = new Map();

  let liberados = 0;
  let pendentes = 0;

  for (const guest of guests || []) {
    const tipo = String(guest.tipo_convite || "BID").toUpperCase().trim() === "WT_PASS" ? "WT_PASS" : "BID";
    const empresa = String(guest.empresa || "Geral").trim() || "Geral";
    const isLiberado = guest.checkin === true || guest.checkin === 1 || guest.checkin === "1";

    if (isLiberado) liberados += 1;
    else pendentes += 1;

    incrementTipoCount(porTipo, tipo, isLiberado);

    if (!empresaMap.has(empresa)) {
      empresaMap.set(empresa, {
        empresa,
        liberados: 0,
        pendentes: 0,
        por_tipo: emptyTipoCounts(),
      });
    }
    const row = empresaMap.get(empresa);
    if (isLiberado) row.liberados += 1;
    else row.pendentes += 1;
    incrementTipoCount(row.por_tipo, tipo, isLiberado);
  }

  const por_empresa = Array.from(empresaMap.values()).sort((a, b) =>
    String(a.empresa).localeCompare(String(b.empresa), "pt", { sensitivity: "base" }),
  );

  return {
    liberados,
    pendentes,
    por_tipo: porTipo,
    por_empresa,
  };
}

module.exports = {
  mapGuestRowBid,
  mapGuestRowWt,
  fetchReceptionEventsForDate,
  fetchReceptionGuestsForEvent,
  aggregatePortariaGuests,
};

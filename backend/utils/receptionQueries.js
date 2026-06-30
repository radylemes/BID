const { normalizarCpfDigits } = require("./cpf");

const SETOR_EVENTO_WT_PASS = "Pista Premium";

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

function mapGuestRowWt(r) {
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
    setor_evento_nome: SETOR_EVENTO_WT_PASS,
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
 * Datas (YYYY-MM-DD) com eventos de portaria em um intervalo inclusivo.
 */
async function fetchReceptionEventDatesInRange(executor, fromDate, toDate) {
  const [rows] = await executor.execute(
    `SELECT DISTINCT DATE_FORMAT(d, '%Y-%m-%d') AS data_evento FROM (
      SELECT DATE(p.data_jogo) AS d
      FROM partidas p
      WHERE EXISTS (
        SELECT 1 FROM apostas a WHERE a.partida_id = p.id AND a.status = 'GANHOU'
      )
      AND DATE(p.data_jogo) BETWEEN ? AND ?
      UNION
      SELECT DATE(ev.data_evento) AS d
      FROM eventos_rh ev
      WHERE ev.status <> 'CANCELADO'
        AND DATE(ev.data_evento) BETWEEN ? AND ?
        AND EXISTS (
          SELECT 1 FROM inscricoes_rh i
          WHERE i.evento_id = ev.id AND i.status = 'INSCRITO'
        )
    ) AS combined
    ORDER BY data_evento ASC`,
    [fromDate, toDate, fromDate, toDate],
  );
  return rows.map((r) => String(r.data_evento).slice(0, 10));
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
    return rowsWt.map((r) => mapGuestRowWt(r));
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
  const formatedWt = rowsWt.map((r) => mapGuestRowWt(r));
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

const dbUtcToISO = (v) => {
  if (!v) return null;
  const s = String(v).trim().replace(" ", "T");
  return new Date(s.endsWith("Z") ? s : `${s}Z`).toISOString();
};

function mapSupervisorAcessoAtivoBid(r) {
  return {
    tipo: "BID",
    registro_id: Number(r.registro_id),
    status: "ativo",
    data_checkin: dbUtcToISO(r.data_checkin),
    data_evento: dbUtcToISO(r.data_evento),
    recebedor_nome: r.recebedor_nome || null,
    recebedor_cpf: normalizarCpfDigits(r.recebedor_cpf) || null,
    titular_nome: r.titular_nome || null,
    titular_cpf: normalizarCpfDigits(r.titular_cpf_db) || null,
    retirante_nome: r.retirante_nome || null,
    evento_titulo: r.evento_titulo || null,
    empresa: r.empresa || "Geral",
    setor_evento_nome: r.setor_evento_nome || null,
    liberado_por_nome: r.liberado_por_nome || null,
    partida_id: r.partida_id != null ? Number(r.partida_id) : null,
    evento_rh_id: null,
    tem_assinatura: !!r.assinatura,
    tem_documento: !!r.documento,
  };
}

function mapSupervisorAcessoAtivoWt(r) {
  return {
    tipo: "WT_PASS",
    registro_id: Number(r.registro_id),
    status: "ativo",
    data_checkin: dbUtcToISO(r.data_checkin),
    data_evento: dbUtcToISO(r.data_evento),
    recebedor_nome: r.recebedor_nome || null,
    recebedor_cpf: normalizarCpfDigits(r.recebedor_cpf) || null,
    titular_nome: r.titular_nome || null,
    titular_cpf: normalizarCpfDigits(r.titular_cpf_db) || null,
    retirante_nome: r.titular_nome || null,
    evento_titulo: r.evento_titulo || null,
    empresa: r.empresa || "Geral",
    setor_evento_nome: SETOR_EVENTO_WT_PASS,
    liberado_por_nome: r.liberado_por_nome || null,
    partida_id: r.partida_id != null ? Number(r.partida_id) : null,
    evento_rh_id: r.evento_rh_id != null ? Number(r.evento_rh_id) : null,
    tem_assinatura: !!r.assinatura,
    tem_documento: !!r.documento,
  };
}

function mapSupervisorAcessoCancelado(row) {
  let det = {};
  try {
    det = row.detalhes ? JSON.parse(row.detalhes) : {};
  } catch {
    det = { raw: row.detalhes };
  }
  const tipo = row.acao === "CHECKIN_CANCEL_WT_PASS" ? "WT_PASS" : "BID";
  return {
    tipo,
    registro_id: Number(row.registro_id),
    status: "cancelado",
    auditoria_id: Number(row.auditoria_id),
    data_checkin: det.data_checkin_anterior || null,
    data_evento: det.data_evento || null,
    recebedor_nome: det.recebedor || null,
    recebedor_cpf: det.cpf_recebedor || null,
    titular_nome: det.titular || null,
    evento_titulo: det.evento || null,
    empresa: det.empresa || "Geral",
    setor_evento_nome: tipo === "WT_PASS" ? SETOR_EVENTO_WT_PASS : det.setor || null,
    liberado_por_nome: det.liberado_por || null,
    cancelado_em: dbUtcToISO(row.criado_em),
    cancelado_por_nome: row.cancelado_por_nome || null,
    motivo_cancelamento: det.motivo || null,
    partida_id: det.partida_id != null ? Number(det.partida_id) : null,
    evento_rh_id: det.evento_rh_id != null ? Number(det.evento_rh_id) : null,
    tem_assinatura: false,
    tem_documento: det.documento_anexado === true,
  };
}

async function fetchSupervisorAcessosAtivos(executor, fromDate, toDate, tipoFiltro) {
  const incluirBid = tipoFiltro === "todos" || tipoFiltro === "BID";
  const incluirWt = tipoFiltro === "todos" || tipoFiltro === "WT_PASS";
  const items = [];

  if (incluirBid) {
    const [rows] = await executor.execute(
      `SELECT 'BID' AS tipo, i.id AS registro_id, i.data_checkin, i.recebedor_nome, i.recebedor_cpf,
              i.assinatura, i.documento,
              u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
              p.id AS partida_id, p.titulo AS evento_titulo, p.data_jogo AS data_evento,
              e.nome AS empresa, se.nome AS setor_evento_nome, c.nome_completo AS retirante_nome,
              (SELECT u2.nome_completo FROM auditoria aud
                 LEFT JOIN usuarios u2 ON u2.id = aud.admin_id
                WHERE aud.modulo = 'PORTARIA' AND aud.acao = 'CHECKIN_INGRESSO' AND aud.registro_id = i.id
                ORDER BY aud.criado_em DESC LIMIT 1) AS liberado_por_nome
         FROM ingressos i
         INNER JOIN apostas a ON a.id = i.aposta_id
         INNER JOIN partidas p ON p.id = a.partida_id
         INNER JOIN usuarios u ON u.id = i.usuario_id
         LEFT JOIN empresas e ON e.id = u.empresa_id
         LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
         LEFT JOIN convidados c ON c.id = i.convidado_id
        WHERE i.checkin = 1
          AND DATE(i.data_checkin) BETWEEN ? AND ?
        ORDER BY i.data_checkin DESC`,
      [fromDate, toDate],
    );
    items.push(...rows.map(mapSupervisorAcessoAtivoBid));
  }

  if (incluirWt) {
    const [rows] = await executor.execute(
      `SELECT 'WT_PASS' AS tipo, i.id AS registro_id, i.portaria_data_checkin AS data_checkin,
              i.portaria_recebedor_nome AS recebedor_nome, i.portaria_recebedor_cpf AS recebedor_cpf,
              i.portaria_assinatura AS assinatura, i.portaria_documento AS documento,
              u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
              ev.id AS evento_rh_id, ev.partida_id,
              COALESCE(p.titulo, ev.titulo) AS evento_titulo,
              COALESCE(p.data_jogo, ev.data_evento) AS data_evento,
              em.nome AS empresa, se.nome AS setor_evento_nome,
              (SELECT u2.nome_completo FROM auditoria aud
                 LEFT JOIN usuarios u2 ON u2.id = aud.admin_id
                WHERE aud.modulo = 'PORTARIA' AND aud.acao = 'CHECKIN_WT_PASS' AND aud.registro_id = i.id
                ORDER BY aud.criado_em DESC LIMIT 1) AS liberado_por_nome
         FROM inscricoes_rh i
         INNER JOIN eventos_rh ev ON ev.id = i.evento_id
         LEFT JOIN partidas p ON p.id = ev.partida_id
         LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
         INNER JOIN usuarios u ON u.id = i.usuario_id
         LEFT JOIN empresas em ON em.id = u.empresa_id
        WHERE i.portaria_checkin = 1
          AND DATE(i.portaria_data_checkin) BETWEEN ? AND ?
        ORDER BY i.portaria_data_checkin DESC`,
      [fromDate, toDate],
    );
    items.push(...rows.map(mapSupervisorAcessoAtivoWt));
  }

  return items;
}

async function fetchSupervisorAcessosCancelados(executor, fromDate, toDate, tipoFiltro) {
  const acoes =
    tipoFiltro === "BID"
      ? ["CHECKIN_CANCEL_INGRESSO"]
      : tipoFiltro === "WT_PASS"
        ? ["CHECKIN_CANCEL_WT_PASS"]
        : ["CHECKIN_CANCEL_INGRESSO", "CHECKIN_CANCEL_WT_PASS"];

  const placeholders = acoes.map(() => "?").join(", ");
  const [rows] = await executor.execute(
    `SELECT a.id AS auditoria_id, a.acao, a.registro_id, a.detalhes, a.criado_em,
            u.nome_completo AS cancelado_por_nome
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.admin_id
      WHERE a.modulo = 'PORTARIA'
        AND a.acao IN (${placeholders})
        AND DATE(a.criado_em) BETWEEN ? AND ?
      ORDER BY a.criado_em DESC`,
    [...acoes, fromDate, toDate],
  );
  return rows.map(mapSupervisorAcessoCancelado);
}

async function fetchSupervisorAcessoDetalhe(executor, tipo, registroId) {
  const idRef = Number(registroId);
  if (!Number.isFinite(idRef) || idRef <= 0) return null;

  if (String(tipo).toUpperCase() === "WT_PASS") {
    const [rows] = await executor.execute(
      `SELECT i.id AS registro_id, i.portaria_data_checkin AS data_checkin,
              i.portaria_recebedor_nome AS recebedor_nome, i.portaria_recebedor_cpf AS recebedor_cpf,
              i.portaria_assinatura AS assinatura, i.portaria_documento AS documento,
              i.portaria_checkin AS checkin_ativo,
              u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
              ev.id AS evento_rh_id, ev.partida_id,
              COALESCE(p.titulo, ev.titulo) AS evento_titulo,
              COALESCE(p.data_jogo, ev.data_evento) AS data_evento,
              em.nome AS empresa, se.nome AS setor_evento_nome,
              (SELECT u2.nome_completo FROM auditoria aud
                 LEFT JOIN usuarios u2 ON u2.id = aud.admin_id
                WHERE aud.modulo = 'PORTARIA' AND aud.acao = 'CHECKIN_WT_PASS' AND aud.registro_id = i.id
                ORDER BY aud.criado_em DESC LIMIT 1) AS liberado_por_nome
         FROM inscricoes_rh i
         INNER JOIN eventos_rh ev ON ev.id = i.evento_id
         LEFT JOIN partidas p ON p.id = ev.partida_id
         LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
         INNER JOIN usuarios u ON u.id = i.usuario_id
         LEFT JOIN empresas em ON em.id = u.empresa_id
        WHERE i.id = ?
        LIMIT 1`,
      [idRef],
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    const ativo = r.checkin_ativo === 1;
    const base = mapSupervisorAcessoAtivoWt({ ...r, tipo: "WT_PASS" });
    return {
      ...base,
      status: ativo ? "ativo" : "cancelado",
      assinatura: r.assinatura || null,
      documento: r.documento || null,
      titular_cpf: normalizarCpfDigits(r.titular_cpf_db) || null,
    };
  }

  const [rows] = await executor.execute(
    `SELECT i.id AS registro_id, i.data_checkin, i.recebedor_nome, i.recebedor_cpf,
            i.assinatura, i.documento, i.checkin AS checkin_ativo,
            u.nome_completo AS titular_nome, u.cpf AS titular_cpf_db,
            p.id AS partida_id, p.titulo AS evento_titulo, p.data_jogo AS data_evento,
            e.nome AS empresa, se.nome AS setor_evento_nome, c.nome_completo AS retirante_nome,
            (SELECT u2.nome_completo FROM auditoria aud
               LEFT JOIN usuarios u2 ON u2.id = aud.admin_id
              WHERE aud.modulo = 'PORTARIA' AND aud.acao = 'CHECKIN_INGRESSO' AND aud.registro_id = i.id
              ORDER BY aud.criado_em DESC LIMIT 1) AS liberado_por_nome
       FROM ingressos i
       INNER JOIN apostas a ON a.id = i.aposta_id
       INNER JOIN partidas p ON p.id = a.partida_id
       INNER JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN empresas e ON e.id = u.empresa_id
       LEFT JOIN setores_evento se ON se.id = p.setor_evento_id
       LEFT JOIN convidados c ON c.id = i.convidado_id
      WHERE i.id = ?
      LIMIT 1`,
    [idRef],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  const ativo = r.checkin_ativo === 1;
  const base = mapSupervisorAcessoAtivoBid({ ...r, tipo: "BID" });
  return {
    ...base,
    status: ativo ? "ativo" : "cancelado",
    assinatura: r.assinatura || null,
    documento: r.documento || null,
    titular_cpf: normalizarCpfDigits(r.titular_cpf_db) || null,
  };
}

async function fetchUltimoCancelamentoSupervisor(executor, tipo, registroId) {
  const acao = String(tipo).toUpperCase() === "WT_PASS" ? "CHECKIN_CANCEL_WT_PASS" : "CHECKIN_CANCEL_INGRESSO";
  const [rows] = await executor.execute(
    `SELECT a.id AS auditoria_id, a.detalhes, a.criado_em, u.nome_completo AS cancelado_por_nome
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id = a.admin_id
      WHERE a.modulo = 'PORTARIA' AND a.acao = ? AND a.registro_id = ?
      ORDER BY a.criado_em DESC
      LIMIT 1`,
    [acao, registroId],
  );
  if (rows.length === 0) return null;
  let det = {};
  try {
    det = rows[0].detalhes ? JSON.parse(rows[0].detalhes) : {};
  } catch {
    det = {};
  }
  return {
    cancelado_em: dbUtcToISO(rows[0].criado_em),
    cancelado_por_nome: rows[0].cancelado_por_nome || null,
    motivo_cancelamento: det.motivo || null,
  };
}

module.exports = {
  mapGuestRowBid,
  mapGuestRowWt,
  fetchReceptionEventsForDate,
  fetchReceptionEventDatesInRange,
  fetchReceptionGuestsForEvent,
  aggregatePortariaGuests,
  fetchSupervisorAcessosAtivos,
  fetchSupervisorAcessosCancelados,
  fetchSupervisorAcessoDetalhe,
  fetchUltimoCancelamentoSupervisor,
};

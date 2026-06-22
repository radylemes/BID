const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const {
  fetchReceptionEventsForDate,
  fetchReceptionGuestsForEvent,
  aggregatePortariaGuests,
} = require("../utils/receptionQueries");

const dbUtcToISO = (v) => {
  if (!v) return null;
  const s = String(v).trim().replace(" ", "T");
  return new Date(s.endsWith("Z") ? s : s + "Z").toISOString();
};

async function getBaseUrl() {
  const [rows] = await db.query(
    "SELECT valor FROM configuracoes WHERE chave = 'app_base_url' LIMIT 1",
  );
  const fromConfig = rows[0]?.valor?.trim();
  if (fromConfig) return fromConfig.replace(/\/$/, "");
  return (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
}

function resolvePublicAssetUrl(stored, baseUrl) {
  if (!stored || !String(stored).trim()) return "";
  const s = String(stored).trim();
  if (s.startsWith("http")) return s;
  if (!baseUrl) return s;
  return `${baseUrl}${s.startsWith("/") ? "" : "/"}${s}`;
}

function resolveBidImagemUrl(banner, partidaId, baseUrl) {
  const b = banner && String(banner).trim();
  if (b) {
    if (b.startsWith("http")) return b;
    if (b === "db") {
      return baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
    }
    return resolvePublicAssetUrl(b, baseUrl);
  }
  return baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
}

function resolveWtPassImagemUrl(banner, baseUrl) {
  const b = banner && String(banner).trim();
  if (!b) return "";
  if (b.startsWith("http")) return b;
  return baseUrl ? `${baseUrl}${b.startsWith("/") ? "" : "/"}${b}` : b;
}

function mapBidRow(row, baseUrl) {
  return {
    id: row.id,
    titulo: row.titulo || "Evento sem título",
    subtitulo: row.subtitulo || null,
    local: row.local || null,
    imagem_url: resolveBidImagemUrl(row.banner, row.id, baseUrl) || null,
    data_jogo: dbUtcToISO(row.data_jogo),
    data_inicio_apostas: dbUtcToISO(row.data_inicio_apostas),
    data_limite_aposta: dbUtcToISO(row.data_limite_aposta),
    data_apuracao: dbUtcToISO(row.data_apuracao),
    status: row.status || "ABERTA",
    quantidade_premios: Number(row.quantidade_premios) || 1,
    setor_evento_nome: row.setor_evento_nome || null,
    total_apostas: Number(row.total_apostas) || 0,
    total_participantes: Number(row.total_participantes) || 0,
  };
}

function mapWtPassRow(row, baseUrl) {
  const vagas = Number(row.vagas) || 1;
  const ocupadas = Number(row.ocupadas) || 0;
  const filaCount = Number(row.fila_count) || 0;
  return {
    id: row.id,
    titulo: row.titulo || "Evento sem título",
    subtitulo: row.subtitulo || null,
    local: row.local || null,
    imagem_url: resolveWtPassImagemUrl(row.banner, baseUrl) || null,
    data_evento: dbUtcToISO(row.data_evento),
    data_inicio_inscricao: dbUtcToISO(row.data_inicio_inscricao),
    data_limite_inscricao: dbUtcToISO(row.data_limite_inscricao),
    status: row.status || "ABERTO",
    vagas,
    ocupadas,
    fila_count: filaCount,
    vagas_restantes: Math.max(0, vagas - ocupadas),
    partida_id: row.partida_id != null ? Number(row.partida_id) : null,
  };
}

async function fetchBidsByStatus(status, baseUrl) {
  const [rows] = await db.execute(
    `SELECT p.id, p.titulo, p.subtitulo, p.banner, p.local, p.data_jogo, p.data_inicio_apostas,
            p.data_limite_aposta, p.data_apuracao, p.status, p.quantidade_premios,
            se.nome AS setor_evento_nome,
            (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id) AS total_apostas,
            (SELECT COUNT(DISTINCT a.usuario_id) FROM apostas a WHERE a.partida_id = p.id) AS total_participantes
     FROM partidas p
     LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
     WHERE p.status = ?
     ORDER BY p.data_jogo DESC`,
    [status],
  );
  return rows.map((row) => mapBidRow(row, baseUrl));
}

async function fetchBidWinners(baseUrl) {
  const [events] = await db.execute(
    `SELECT p.id, p.titulo, p.subtitulo, p.banner, p.local, p.data_jogo, p.data_inicio_apostas,
            p.data_limite_aposta, p.data_apuracao, p.status, p.quantidade_premios,
            se.nome AS setor_evento_nome,
            (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id) AS total_apostas,
            (SELECT COUNT(DISTINCT a.usuario_id) FROM apostas a WHERE a.partida_id = p.id) AS total_participantes
     FROM partidas p
     LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
     WHERE p.status = 'FINALIZADA'
     ORDER BY p.data_jogo DESC`,
  );

  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const [winnerRows] = await db.execute(
    `SELECT a.partida_id,
            u.nome_completo AS nome,
            s.nome AS setor,
            a.valor_pago AS lance,
            a.data_aposta
     FROM apostas a
     JOIN usuarios u ON a.usuario_id = u.id
     LEFT JOIN setores s ON u.setor_id = s.id
     WHERE a.partida_id IN (${eventIds.map(() => "?").join(",")})
       AND a.status = 'GANHOU'
     ORDER BY a.partida_id ASC, a.valor_pago DESC, a.data_aposta ASC, a.id ASC`,
    eventIds,
  );

  const winnersMap = new Map();
  for (const row of winnerRows) {
    if (!winnersMap.has(row.partida_id)) winnersMap.set(row.partida_id, []);
    winnersMap.get(row.partida_id).push({
      nome: row.nome,
      setor: row.setor || null,
      lance: Number(row.lance) || 0,
      data_aposta: dbUtcToISO(row.data_aposta),
    });
  }

  return events.map((event) => ({
    ...mapBidRow(event, baseUrl),
    vencedores: winnersMap.get(event.id) || [],
  }));
}

async function fetchWtPassByStatus(statusList, baseUrl) {
  const placeholders = statusList.map(() => "?").join(", ");
  const [rows] = await db.execute(
    `SELECT e.id, e.titulo, e.subtitulo, e.banner, e.local,
            e.data_inicio_inscricao, e.data_limite_inscricao, e.data_evento,
            e.vagas, e.status, e.partida_id,
            COALESCE(s.ocupadas, 0) AS ocupadas,
            COALESCE(s.fila_count, 0) AS fila_count
     FROM eventos_rh e
     LEFT JOIN (
       SELECT evento_id,
         SUM(status IN ('INSCRITO','PRESENTE','FALTOU')) AS ocupadas,
         SUM(status = 'FILA_ESPERA') AS fila_count
       FROM inscricoes_rh
       GROUP BY evento_id
     ) s ON s.evento_id = e.id
     WHERE e.status IN (${placeholders})
     ORDER BY e.data_evento DESC`,
    statusList,
  );
  return rows.map((row) => mapWtPassRow(row, baseUrl));
}

async function fetchWtPassWinners(baseUrl) {
  const encerrados = await fetchWtPassByStatus(["ENCERRADO", "REALIZADO", "CANCELADO"], baseUrl);
  if (encerrados.length === 0) return [];

  const eventIds = encerrados.map((e) => e.id);
  const [winnerRows] = await db.execute(
    `SELECT i.evento_id,
            u.nome_completo AS nome,
            s.nome AS setor,
            i.posicao,
            i.status AS status_inscricao
     FROM inscricoes_rh i
     JOIN usuarios u ON i.usuario_id = u.id
     LEFT JOIN setores s ON u.setor_id = s.id
     WHERE i.evento_id IN (${eventIds.map(() => "?").join(",")})
       AND i.status IN ('INSCRITO', 'PRESENTE')
     ORDER BY i.evento_id ASC, i.posicao ASC, i.id ASC`,
    eventIds,
  );

  const winnersMap = new Map();
  for (const row of winnerRows) {
    if (!winnersMap.has(row.evento_id)) winnersMap.set(row.evento_id, []);
    winnersMap.get(row.evento_id).push({
      nome: row.nome,
      setor: row.setor || null,
      posicao: row.posicao != null ? Number(row.posicao) : null,
      status_inscricao: row.status_inscricao,
    });
  }

  return encerrados.map((event) => ({
    ...event,
    vencedores: winnersMap.get(event.id) || [],
  }));
}

function resolvePortariaImagemUrl(evento, baseUrl) {
  const tipo = String(evento.tipo_evento || "BID").toUpperCase().trim();
  if (tipo === "WT_PASS") {
    return resolveWtPassImagemUrl(evento.banner, baseUrl) || null;
  }
  const partidaId = evento.partida_id != null ? Number(evento.partida_id) : Number(evento.id);
  return resolveBidImagemUrl(evento.banner, partidaId, baseUrl) || null;
}

async function resolvePortariaQueryDate(dateParam) {
  if (dateParam != null && String(dateParam).trim() !== "") {
    const normalized = String(dateParam).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return { error: "Formato de data inválido. Use YYYY-MM-DD." };
    }
    return { date: normalized };
  }

  const [todayRows] = await db.execute(`SELECT CURDATE() AS hoje`);
  const hoje = todayRows[0]?.hoje;
  const hojeStr =
    hoje instanceof Date ? hoje.toISOString().slice(0, 10) : String(hoje).slice(0, 10);
  return { date: hojeStr };
}

async function buildPortariaSummary(dateStr, baseUrl) {
  const eventos = await fetchReceptionEventsForDate(db, {
    date: dateStr,
    restrictToFutureOnly: false,
  });

  const eventosComTotais = [];
  for (const evento of eventos) {
    const tipoEvento = String(evento.tipo_evento || "BID").toUpperCase().trim();
    const guests = await fetchReceptionGuestsForEvent(db, evento.id, tipoEvento);
    const totais = aggregatePortariaGuests(guests);

    eventosComTotais.push({
      id: evento.id,
      tipo_evento: tipoEvento,
      titulo: evento.titulo || "Evento sem título",
      imagem_url: resolvePortariaImagemUrl(evento, baseUrl),
      data_evento: dbUtcToISO(evento.data_evento),
      partida_id: evento.partida_id != null ? Number(evento.partida_id) : null,
      evento_rh_id: evento.evento_rh_id != null ? Number(evento.evento_rh_id) : null,
      totais: {
        liberados: totais.liberados,
        pendentes: totais.pendentes,
        por_tipo: totais.por_tipo,
      },
      por_empresa: totais.por_empresa,
    });
  }

  return {
    data: dateStr,
    eventos: eventosComTotais,
  };
}

exports.getEventos = async (req, res) => {
  try {
    const dateResolved = await resolvePortariaQueryDate(req.query.date);
    if (dateResolved.error) {
      return res.status(400).json({ error: dateResolved.error });
    }

    const baseUrl = await getBaseUrl();
    const [bidsAbertos, bidsEncerrados, bidsVencedores, wtAbertos, wtEncerrados, wtVencedores, portaria] =
      await Promise.all([
        fetchBidsByStatus("ABERTA", baseUrl),
        fetchBidsByStatus("FINALIZADA", baseUrl),
        fetchBidWinners(baseUrl),
        fetchWtPassByStatus(["ABERTO"], baseUrl),
        fetchWtPassByStatus(["ENCERRADO", "REALIZADO", "CANCELADO"], baseUrl),
        fetchWtPassWinners(baseUrl),
        buildPortariaSummary(dateResolved.date, baseUrl),
      ]);

    res.json({
      bids: {
        abertos: bidsAbertos,
        encerrados: bidsEncerrados,
        vencedores: bidsVencedores,
      },
      wtpass: {
        abertos: wtAbertos,
        encerrados: wtEncerrados,
        vencedores: wtVencedores,
      },
      portaria,
      gerado_em: new Date().toISOString(),
    });
  } catch (error) {
    await logErro("INTEGRACAO_GET_EVENTOS", error);
    res.status(500).json({ error: "Erro ao consultar eventos." });
  }
};

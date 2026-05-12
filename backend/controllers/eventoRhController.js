const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes, truncateMotivo } = require("../utils/dbHelpers");

async function gravarAuditoria(connection, adminId, modulo, acao, registroId, detalhes) {
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
    await logErro("EVENTO_RH_GRAVAR_AUDITORIA", e);
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

const dateToUtcString = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;

const formatarDataLocal = (dataString) => {
  if (!dataString) return null;
  const d = dataString instanceof Date ? dataString : new Date(String(dataString).trim());
  if (Number.isNaN(d.getTime())) return null;
  return dateToUtcString(d);
};

/** Data guardada na BD (UTC) → Date; usado em regras de inscrições. */
function parseDbUtcDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(" ", "T");
  const d = new Date(s.endsWith("Z") ? s : s + "Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const dbUtcToISO = (v) => {
  if (!v) return null;
  const s = String(v).trim().replace(" ", "T");
  return new Date(s.endsWith("Z") ? s : s + "Z").toISOString();
};

/** Limite de tempo (ms) até ao qual ainda é permitido cancelar inscrição: 24h antes do dia civil Y-M-D em UTC (igual ao prefixo da ISO devolvida pela API). */
function limiteCancelamentoInscricaoWtPassMs(dataEventoRaw) {
  if (dataEventoRaw == null) return null;
  const s = String(dataEventoRaw).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const da = Number(m[3]);
    return Date.UTC(y, mo, da) - 24 * 60 * 60 * 1000;
  }
  const d = parseDbUtcDate(dataEventoRaw);
  if (!d) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 24 * 60 * 60 * 1000;
}

function mapEventoRow(row) {
  if (!row) return row;
  return {
    ...row,
    data_inicio_inscricao: dbUtcToISO(row.data_inicio_inscricao),
    data_limite_inscricao: dbUtcToISO(row.data_limite_inscricao),
    data_evento: dbUtcToISO(row.data_evento),
    criado_em: row.criado_em ? dbUtcToISO(row.criado_em) : null,
    permitir_lista_espera: Boolean(row.permitir_lista_espera),
    /** Default `true` mantém o comportamento esperado em registos antigos
     *  caso a coluna ainda não tenha sido migrada no momento da leitura. */
    auto_encerrar: row.auto_encerrar == null ? true : Boolean(row.auto_encerrar),
    vagas: Number(row.vagas) || 1,
  };
}

/**
 * Lê as configurações do bloqueio do WT Pass (faltas permitidas e duração do bloqueio).
 * Sempre retorna valores válidos (>= 1) com fallback nos defaults.
 */
async function getWtPassConfig(connection) {
  const executor = connection || db;
  const [rows] = await executor.query(
    "SELECT chave, valor FROM configuracoes WHERE chave IN ('wt_pass_faltas_permitidas', 'wt_pass_eventos_bloqueio')",
  );
  const mapa = rows.reduce((acc, r) => {
    acc[r.chave] = r.valor;
    return acc;
  }, {});
  return {
    faltasPermitidas: Math.max(1, Number(mapa.wt_pass_faltas_permitidas) || 1),
    eventosBloqueio: Math.max(1, Number(mapa.wt_pass_eventos_bloqueio) || 5),
  };
}

async function decrementarBloqueiosAtivos(connection) {
  await connection.execute(
    `UPDATE bloqueios_eventos_rh SET eventos_restantes = eventos_restantes - 1 WHERE ativo = 1 AND eventos_restantes > 0`,
  );
  await connection.execute(
    `UPDATE bloqueios_eventos_rh SET ativo = 0 WHERE ativo = 1 AND eventos_restantes <= 0`,
  );
}

/**
 * Vincula um novo evento aos bloqueios ativos para cada usuário punido,
 * mantendo o evento permanentemente fora do alcance de inscrição desse
 * usuário, mesmo após o contador de "eventos_restantes" zerar.
 */
async function vincularEventoAosBloqueiosAtivos(connection, eventoId) {
  const [bloqueios] = await connection.execute(
    `SELECT id, usuario_id FROM bloqueios_eventos_rh WHERE ativo = 1 AND eventos_restantes > 0`,
  );
  for (const b of bloqueios) {
    await connection.execute(
      `INSERT IGNORE INTO bloqueios_eventos_rh_alvos (bloqueio_id, usuario_id, evento_id) VALUES (?, ?, ?)`,
      [b.id, b.usuario_id, eventoId],
    );
  }
}

async function getBloqueioAtivoUsuario(connection, usuarioId) {
  const [rows] = await connection.execute(
    `SELECT b.id, b.eventos_restantes, b.eventos_total, b.evento_origem_id, e.titulo AS evento_origem_titulo
     FROM bloqueios_eventos_rh b
     INNER JOIN eventos_rh e ON e.id = b.evento_origem_id
     WHERE b.usuario_id = ? AND b.ativo = 1 AND b.eventos_restantes > 0
     ORDER BY b.eventos_restantes ASC, b.id ASC
     LIMIT 1`,
    [usuarioId],
  );
  return rows[0] || null;
}

exports.listEventos = async (req, res) => {
  try {
    const usuarioId = Number(req.user?.id);
    if (!usuarioId) return res.status(401).json({ error: "Não autenticado." });

    const connection = await db.getConnection();
    try {
      const bloqueio = await getBloqueioAtivoUsuario(connection, usuarioId);

      const [eventos] = await connection.execute(
        `SELECT e.*,
          (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status IN ('INSCRITO','PRESENTE','FALTOU')) AS ocupadas,
          (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status = 'INSCRITO') AS ocupadas_inscrito,
          (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status = 'FILA_ESPERA') AS fila_count,
          (SELECT i.posicao FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.usuario_id = ? LIMIT 1) AS minha_posicao,
          (SELECT i.status FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.usuario_id = ? LIMIT 1) AS meu_status,
          (
            SELECT COUNT(*)
            FROM inscricoes_rh ia
            WHERE ia.evento_id = e.id
              AND ia.status IN ('INSCRITO','FILA_ESPERA')
              AND ia.posicao <= (
                SELECT ib.posicao
                FROM inscricoes_rh ib
                WHERE ib.evento_id = e.id
                  AND ib.usuario_id = ?
                  AND ib.status IN ('INSCRITO','FILA_ESPERA')
                ORDER BY ib.id DESC
                LIMIT 1
              )
          ) AS minha_posicao_ativa,
          (SELECT COUNT(*) FROM bloqueios_eventos_rh_alvos ba WHERE ba.evento_id = e.id AND ba.usuario_id = ?) AS bloqueado_para_mim
         FROM eventos_rh e
         ORDER BY e.data_evento ASC`,
        [usuarioId, usuarioId, usuarioId, usuarioId],
      );

      const list = eventos.map((row) => {
        const m = mapEventoRow(row);
        const vagas = Number(row.vagas) || 1;
        const ocupadas = Number(row.ocupadas) || 0;
        const ocupadasInscrito = Number(row.ocupadas_inscrito) || 0;
        return {
          ...m,
          /** Alias do estado do evento (igual ao histórico); útil se o cliente tratar `status` de forma especial. */
          evento_status: row.status != null ? row.status : m.status,
          ocupadas,
          ocupadas_inscrito: ocupadasInscrito,
          fila_count: Number(row.fila_count) || 0,
          vagas_restantes: Math.max(0, vagas - ocupadas),
          minha_posicao:
            row.minha_posicao_ativa != null && Number(row.minha_posicao_ativa) > 0
              ? Number(row.minha_posicao_ativa)
              : row.minha_posicao != null
                ? Number(row.minha_posicao)
                : null,
          meu_status: row.meu_status || null,
          usuario_inscrito: Boolean(row.meu_status && ["INSCRITO", "FILA_ESPERA"].includes(row.meu_status)),
          bloqueado_para_mim: Number(row.bloqueado_para_mim) > 0,
        };
      });

      res.json({
        eventos: list,
        bloqueio_ativo: bloqueio
          ? {
              eventos_restantes: Number(bloqueio.eventos_restantes),
              eventos_total: Number(bloqueio.eventos_total) || Number(bloqueio.eventos_restantes),
              evento_origem_id: bloqueio.evento_origem_id,
              evento_origem_titulo: bloqueio.evento_origem_titulo || "Evento",
            }
          : null,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    await logErro("EVENTO_RH_LIST", error);
    res.status(500).json({ error: "Erro ao listar eventos do WT Pass." });
  }
};

/** Inscrições do utilizador (uma por evento), para a aba Histórico do WT Pass. */
exports.listHistoricoUsuario = async (req, res) => {
  try {
    const usuarioId = Number(req.user?.id);
    if (!usuarioId) return res.status(401).json({ error: "Não autenticado." });

    const [rows] = await db.execute(
      `SELECT i.id AS inscricao_id,
              i.status AS inscricao_status,
              i.posicao,
              i.data_inscricao,
              e.id AS evento_id,
              e.titulo,
              e.banner,
              e.local,
              e.data_evento,
              e.data_inicio_inscricao,
              e.data_limite_inscricao,
              e.status AS evento_status,
              e.vagas,
              (SELECT COUNT(*) FROM inscricoes_rh x WHERE x.evento_id = i.evento_id AND x.status IN ('INSCRITO','PRESENTE','FALTOU')) AS ocupadas_vagas,
              (SELECT COUNT(*) FROM inscricoes_rh x WHERE x.evento_id = i.evento_id AND x.status <> 'CANCELADO') AS total_inscritos_ativos,
              (
                SELECT 1 + COUNT(*)
                FROM inscricoes_rh x
                WHERE x.evento_id = i.evento_id
                  AND x.status <> 'CANCELADO'
                  AND (x.posicao < i.posicao OR (x.posicao = i.posicao AND x.id < i.id))
              ) AS posicao_efetiva
       FROM inscricoes_rh i
       INNER JOIN eventos_rh e ON e.id = i.evento_id
       WHERE i.usuario_id = ?
       ORDER BY e.data_evento ASC, i.id ASC`,
      [usuarioId],
    );

    const historico = rows.map((row) => {
      const vagas = Number(row.vagas) || 1;
      const ocupadas = Number(row.ocupadas_vagas) || 0;
      return {
        inscricao_id: row.inscricao_id,
        inscricao_status: row.inscricao_status,
        /** Ordem fixa no ato da inscrição (pode ficar desatualizada após cancelamentos de terceiros). */
        posicao_ordem_inscricao: Number(row.posicao),
        /** Classificação atual entre inscrições não canceladas (por ordem de chegada). */
        posicao_efetiva: row.posicao_efetiva != null ? Number(row.posicao_efetiva) : null,
        total_inscritos_ativos: Number(row.total_inscritos_ativos) || 0,
        ocupadas,
        vagas_restantes: Math.max(0, vagas - ocupadas),
        data_inscricao: row.data_inscricao ? dbUtcToISO(row.data_inscricao) : null,
        evento_id: row.evento_id,
        titulo: row.titulo,
        banner: row.banner,
        local: row.local,
        data_evento: dbUtcToISO(row.data_evento),
        data_inicio_inscricao: dbUtcToISO(row.data_inicio_inscricao),
        data_limite_inscricao: dbUtcToISO(row.data_limite_inscricao),
        evento_status: row.evento_status,
        vagas,
      };
    });

    res.json({ historico });
  } catch (error) {
    await logErro("EVENTO_RH_HISTORICO", error);
    res.status(500).json({ error: "Erro ao carregar histórico do WT Pass." });
  }
};

/** Lista de participantes do evento para quem também está inscrito (colaborador). Inclui data de inscrição e comparecimento. */
exports.listParticipantesColaborador = async (req, res) => {
  try {
    const eventoId = Number(req.params.id);
    const usuarioId = Number(req.user?.id);
    if (!eventoId || !usuarioId) return res.status(400).json({ error: "Dados inválidos." });

    const [meu] = await db.execute(
      `SELECT id FROM inscricoes_rh WHERE evento_id = ? AND usuario_id = ? LIMIT 1`,
      [eventoId, usuarioId],
    );
    if (meu.length === 0) {
      return res.status(403).json({ error: "Só pode consultar a lista se tiver participado neste evento." });
    }

    const [titRows] = await db.execute(`SELECT titulo FROM eventos_rh WHERE id = ?`, [eventoId]);
    const tituloEvento = titRows.length > 0 ? titRows[0].titulo : "Evento";

    const [inscritos] = await db.execute(
      `SELECT u.nome_completo AS nome,
              i.data_inscricao,
              i.status,
              i.posicao
       FROM inscricoes_rh i
       INNER JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.evento_id = ? AND i.status <> 'CANCELADO'
       ORDER BY i.posicao ASC, i.id ASC`,
      [eventoId],
    );

    const participantes = inscritos.map((r) => {
      const st = String(r.status || "");
      let situacao_inscricao = st;
      if (st === "INSCRITO") situacao_inscricao = "Confirmado (vaga)";
      else if (st === "FILA_ESPERA") situacao_inscricao = "Lista de espera";
      else if (st === "PRESENTE") situacao_inscricao = "Confirmado (vaga)";
      else if (st === "FALTOU") situacao_inscricao = "Confirmado (vaga)";

      let comparecimento = "Pendente";
      if (st === "PRESENTE") comparecimento = "Presente";
      else if (st === "FALTOU") comparecimento = "Falta";

      return {
        nome: r.nome,
        data_inscricao: r.data_inscricao ? dbUtcToISO(r.data_inscricao) : null,
        status_inscricao: st,
        situacao_inscricao,
        comparecimento,
        posicao_ordem: Number(r.posicao),
      };
    });

    res.json({ titulo_evento: tituloEvento, participantes });
  } catch (error) {
    await logErro("EVENTO_RH_LIST_PARTICIPANTES_COLLAB", error);
    res.status(500).json({ error: "Erro ao carregar lista de participantes." });
  }
};

exports.getEvento = async (req, res) => {
  try {
    const usuarioId = Number(req.user?.id);
    const role = String(req.user?.role || "").toUpperCase();
    const id = Number(req.params.id);
    if (!usuarioId || !id) return res.status(400).json({ error: "Dados inválidos." });

    const [rows] = await db.execute(`SELECT * FROM eventos_rh WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento não encontrado." });

    const evento = mapEventoRow(rows[0]);

    const [minha] = await db.execute(
      `SELECT posicao, status FROM inscricoes_rh WHERE evento_id = ? AND usuario_id = ? LIMIT 1`,
      [id, usuarioId],
    );

    const bloqueio = await getBloqueioAtivoUsuario(db, usuarioId);

    const payload = {
      ...evento,
      minha_inscricao: minha[0] || null,
      bloqueio_ativo: bloqueio
        ? {
            eventos_restantes: Number(bloqueio.eventos_restantes),
            eventos_total: Number(bloqueio.eventos_total) || Number(bloqueio.eventos_restantes),
            evento_origem_id: bloqueio.evento_origem_id,
            evento_origem_titulo: bloqueio.evento_origem_titulo || "Evento",
          }
        : null,
    };

    if (role === "ADMIN") {
      const [inscritos] = await db.execute(
        `SELECT i.id, i.evento_id, i.usuario_id, i.posicao, i.status, i.aceitou_politica, i.data_inscricao,
                u.nome_completo, u.email, u.foto, s.nome AS setor_nome
         FROM inscricoes_rh i
         INNER JOIN usuarios u ON u.id = i.usuario_id
         LEFT JOIN setores s ON s.id = u.setor_id
         WHERE i.evento_id = ? AND i.status != 'CANCELADO'
         ORDER BY i.posicao ASC, i.id ASC`,
        [id],
      );
      payload.inscritos = inscritos.map((r) => ({
        ...r,
        data_inscricao: r.data_inscricao ? dbUtcToISO(r.data_inscricao) : null,
        aceitou_politica: Boolean(r.aceitou_politica),
      }));
    }

    res.json(payload);
  } catch (error) {
    await logErro("EVENTO_RH_GET", error);
    res.status(500).json({ error: "Erro ao carregar evento." });
  }
};

exports.listInscritos = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID inválido." });

    const [inscritos] = await db.execute(
      `SELECT i.id, i.evento_id, i.usuario_id, i.posicao, i.status, i.aceitou_politica, i.data_inscricao,
              u.nome_completo, u.email, u.foto, s.nome AS setor_nome
       FROM inscricoes_rh i
       INNER JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN setores s ON s.id = u.setor_id
       WHERE i.evento_id = ? AND i.status != 'CANCELADO'
       ORDER BY i.posicao ASC, i.id ASC`,
      [id],
    );

    res.json(
      inscritos.map((r) => ({
        ...r,
        data_inscricao: r.data_inscricao ? dbUtcToISO(r.data_inscricao) : null,
        aceitou_politica: Boolean(r.aceitou_politica),
      })),
    );
  } catch (error) {
    await logErro("EVENTO_RH_LIST_INSCRITOS", error);
    res.status(500).json({ error: "Erro ao listar inscritos." });
  }
};

exports.createEvento = async (req, res) => {
  try {
    const {
      titulo,
      banner,
      subtitulo,
      descricao,
      local,
      data_inicio_inscricao,
      data_limite_inscricao,
      data_evento,
      vagas,
      permitir_lista_espera,
      auto_encerrar,
      adminId,
    } = req.body;

    if (!data_limite_inscricao || !data_evento) {
      return res.status(400).json({ error: "Datas obrigatórias." });
    }

    const inicioFormatado = data_inicio_inscricao
      ? formatarDataLocal(data_inicio_inscricao)
      : formatarDataLocal(new Date());
    const bannerUrl = banner && String(banner).trim() ? String(banner).trim() : null;
    const listaEspera = permitir_lista_espera === false ? 0 : 1;
    /** Por padrão o auto-encerramento fica ativo (admin pode desligar no formulário). */
    const autoEncerrarFlag = auto_encerrar === false ? 0 : 1;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO eventos_rh (titulo, banner, subtitulo, descricao, local, data_inicio_inscricao, data_limite_inscricao, data_evento, vagas, permitir_lista_espera, auto_encerrar, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO')`,
        [
          titulo || null,
          bannerUrl,
          subtitulo && String(subtitulo).trim() ? String(subtitulo).trim() : null,
          descricao && String(descricao).trim() ? String(descricao).trim() : null,
          local && String(local).trim() ? String(local).trim() : null,
          inicioFormatado,
          formatarDataLocal(data_limite_inscricao),
          formatarDataLocal(data_evento),
          Math.max(1, Number(vagas) || 1),
          listaEspera,
          autoEncerrarFlag,
        ],
      );
      const novoId = result.insertId;

      // Antes de decrementar o contador, registra esse evento como "alvo"
      // dos bloqueios atualmente ativos — assim cada usuário punido fica
      // sem acesso a este evento, mesmo que o contador zere mais tarde.
      await vincularEventoAosBloqueiosAtivos(connection, novoId);
      await decrementarBloqueiosAtivos(connection);

      await gravarAuditoria(connection, adminId, "EVENTOS_RH", "CREATE", novoId, {
        titulo,
        motivo: `Criação evento WT Pass #${novoId}`,
      });

      await connection.commit();
      res.json({ message: "Evento criado com sucesso.", id: novoId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    await logErro("EVENTO_RH_CREATE", error);
    res.status(500).json({ error: "Erro ao criar evento." });
  }
};

exports.updateEvento = async (req, res) => {
  const id = Number(req.params.id);
  const {
    titulo,
    banner,
    subtitulo,
    descricao,
    local,
    data_inicio_inscricao,
    data_limite_inscricao,
    data_evento,
    vagas,
    permitir_lista_espera,
    auto_encerrar,
    status,
    adminId,
    motivo,
  } = req.body;

  const connection = await db.getConnection();
  try {
    const [st] = await connection.execute(
      `SELECT status, titulo, data_limite_inscricao FROM eventos_rh WHERE id = ?`,
      [id],
    );
    if (st.length === 0) {
      return res.status(404).json({ error: "Evento não encontrado." });
    }
    if (
      status !== undefined &&
      String(status).toUpperCase() === "ABERTO" &&
      String(st[0].status || "").toUpperCase() !== "ABERTO"
    ) {
      return res.status(403).json({
        error: "Não é possível reabrir um evento encerrado. Utilize clonar para criar um novo.",
      });
    }
    const bannerUrl = banner !== undefined ? (banner && String(banner).trim() ? String(banner).trim() : null) : undefined;
    const listaEspera =
      permitir_lista_espera === undefined ? undefined : permitir_lista_espera === false ? 0 : 1;
    const autoEncerrarFlag =
      auto_encerrar === undefined ? undefined : auto_encerrar === false ? 0 : 1;

    const fields = [];
    const vals = [];

    if (titulo !== undefined) {
      fields.push("titulo = ?");
      vals.push(titulo || null);
    }
    if (bannerUrl !== undefined) {
      fields.push("banner = ?");
      vals.push(bannerUrl);
    }
    if (subtitulo !== undefined) {
      fields.push("subtitulo = ?");
      vals.push(subtitulo && String(subtitulo).trim() ? String(subtitulo).trim() : null);
    }
    if (descricao !== undefined) {
      fields.push("descricao = ?");
      vals.push(descricao && String(descricao).trim() ? String(descricao).trim() : null);
    }
    if (local !== undefined) {
      fields.push("local = ?");
      vals.push(local && String(local).trim() ? String(local).trim() : null);
    }
    if (data_inicio_inscricao !== undefined) {
      fields.push("data_inicio_inscricao = ?");
      vals.push(data_inicio_inscricao ? formatarDataLocal(data_inicio_inscricao) : null);
    }
    if (data_limite_inscricao !== undefined) {
      fields.push("data_limite_inscricao = ?");
      vals.push(formatarDataLocal(data_limite_inscricao));
    }
    if (data_evento !== undefined) {
      fields.push("data_evento = ?");
      vals.push(formatarDataLocal(data_evento));
    }
    if (vagas !== undefined) {
      fields.push("vagas = ?");
      vals.push(Math.max(1, Number(vagas) || 1));
    }
    if (listaEspera !== undefined) {
      fields.push("permitir_lista_espera = ?");
      vals.push(listaEspera);
    }
    if (autoEncerrarFlag !== undefined) {
      fields.push("auto_encerrar = ?");
      vals.push(autoEncerrarFlag);
    }
    if (status !== undefined) {
      fields.push("status = ?");
      vals.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    const apenasStatus =
      fields.length === 1 && fields[0] === "status = ?" && status !== undefined;
    const dbStatus = String(st[0].status || "").toUpperCase();
    if (dbStatus !== "ABERTO" && !apenasStatus) {
      return res.status(403).json({
        error: "Evento não está aberto: só é permitido alterar o estado (ex.: ENCERRADO → REALIZADO).",
      });
    }

    if (dbStatus === "ABERTO" && !apenasStatus) {
      const limD = parseDbUtcDate(st[0].data_limite_inscricao);
      if (limD && Date.now() > limD.getTime() + 60_000) {
        return res.status(403).json({
          error:
            "Inscrições encerradas: não é possível editar o evento. Altere apenas o estado no painel ou crie um novo evento a partir do clone.",
        });
      }
    }

    vals.push(id);
    await connection.execute(`UPDATE eventos_rh SET ${fields.join(", ")} WHERE id = ?`, vals);

    const motivoAudit = truncateMotivo(String(motivo || "").trim()) || "—";
    const soDatasInsc =
      fields.length > 0 &&
      fields.every((f) => {
        const col = String(f).split(" = ")[0];
        return col === "data_limite_inscricao" || col === "data_inicio_inscricao";
      });
    let tipoAlteracao = "EDICAO_EVENTO";
    if (apenasStatus) tipoAlteracao = "ALTERAR_ESTADO";
    else if (soDatasInsc) tipoAlteracao = "ENCERRAR_INSCRICOES_ANTECIPADO";

    await gravarAuditoria(connection, adminId, "EVENTOS_RH", "UPDATE", id, {
      titulo: titulo !== undefined ? titulo : st[0].titulo,
      motivo_auditoria: motivoAudit,
      tipo_alteracao: tipoAlteracao,
      estado_anterior: st[0].status,
      estado_novo: status !== undefined ? status : st[0].status,
      campos_atualizados: fields.map((f) => f.split(" = ")[0]),
    });

    res.json({ message: "Evento atualizado." });
  } catch (error) {
    await logErro("EVENTO_RH_UPDATE", error);
    res.status(500).json({ error: "Erro ao atualizar evento." });
  } finally {
    connection.release();
  }
};

exports.deleteEvento = async (req, res) => {
  const id = Number(req.params.id);
  const adminId = req.query.adminId ? Number(req.query.adminId) : null;
  const motivo = String(req.query.motivo || "").trim();

  if (motivo.length < 3) {
    return res.status(400).json({
      error: "Motivo da exclusão é obrigatório (mínimo 3 caracteres) para auditoria.",
    });
  }

  const connection = await db.getConnection();
  try {
    const [rows] = await connection.execute(`SELECT titulo FROM eventos_rh WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Evento não encontrado." });

    await connection.beginTransaction();
    await connection.execute(`DELETE FROM eventos_rh WHERE id = ?`, [id]);
    await gravarAuditoria(connection, adminId, "EVENTOS_RH", "DELETE", id, {
      titulo: rows[0].titulo,
      motivo,
    });
    await connection.commit();
    res.json({ message: "Evento excluído." });
  } catch (error) {
    await connection.rollback();
    await logErro("EVENTO_RH_DELETE", error);
    res.status(500).json({ error: "Erro ao excluir evento." });
  } finally {
    connection.release();
  }
};

exports.inscrever = async (req, res) => {
  const eventoId = Number(req.params.id);
  const usuarioId = Number(req.user?.id);
  const role = String(req.user?.role || "").toUpperCase();
  const { aceitou_politica } = req.body;

  if (role === "PORTARIA") {
    return res.status(403).json({ error: "Perfil Portaria não pode se inscrever no WT Pass." });
  }
  if (!aceitou_politica) {
    return res.status(400).json({ error: "É obrigatório aceitar a política de acesso." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const bloqueio = await getBloqueioAtivoUsuario(connection, usuarioId);
    if (bloqueio) {
      await connection.rollback();
      return res.status(403).json({
        error: `Inscrição bloqueada: faltou a um evento. Aguarde mais ${bloqueio.eventos_restantes} evento(s) no WT Pass ser(em) publicado(s).`,
        bloqueio_ativo: {
          eventos_restantes: Number(bloqueio.eventos_restantes),
          eventos_total: Number(bloqueio.eventos_total) || Number(bloqueio.eventos_restantes),
          evento_origem_titulo: bloqueio.evento_origem_titulo,
        },
      });
    }

    // Verifica se este evento específico está vinculado a algum bloqueio
    // anterior do usuário — neste caso, a inscrição permanece negada mesmo
    // que o contador geral de bloqueio já tenha zerado.
    const [alvoRows] = await connection.execute(
      `SELECT id FROM bloqueios_eventos_rh_alvos WHERE usuario_id = ? AND evento_id = ? LIMIT 1`,
      [usuarioId, eventoId],
    );
    if (alvoRows.length > 0) {
      await connection.rollback();
      return res.status(403).json({
        error: "Este evento está bloqueado para você devido a punição anterior por falta no WT Pass.",
      });
    }

    const [evRows] = await connection.execute(
      `SELECT id, titulo, status, vagas, permitir_lista_espera, data_inicio_inscricao, data_limite_inscricao FROM eventos_rh WHERE id = ? FOR UPDATE`,
      [eventoId],
    );
    if (evRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Evento não encontrado." });
    }
    const ev = evRows[0];
    if (ev.status !== "ABERTO") {
      await connection.rollback();
      return res.status(400).json({ error: "Evento não está aberto para inscrições." });
    }

    // Regra atual: todo evento com status ABERTO aceita inscrição, independente da janela de datas.
    // Apenas o estado do evento na BD restringe a inscrição.

    const [existRows] = await connection.execute(
      `SELECT id, status FROM inscricoes_rh WHERE evento_id = ? AND usuario_id = ? FOR UPDATE`,
      [eventoId, usuarioId],
    );

    if (existRows.length > 0) {
      const st = existRows[0].status;
      if (st === "INSCRITO" || st === "FILA_ESPERA") {
        await connection.rollback();
        return res.status(400).json({ error: "Você já está inscrito neste evento." });
      }
      if (st === "PRESENTE" || st === "FALTOU") {
        await connection.rollback();
        return res.status(400).json({ error: "Inscrição já finalizada para este evento." });
      }
    }

    const [[maxRow]] = await connection.execute(
      `SELECT COALESCE(MAX(posicao), 0) AS m FROM inscricoes_rh WHERE evento_id = ?`,
      [eventoId],
    );
    const nextPos = Number(maxRow.m) + 1;

    const [[cntRow]] = await connection.execute(
      `SELECT COUNT(*) AS c FROM inscricoes_rh WHERE evento_id = ? AND status = 'INSCRITO'`,
      [eventoId],
    );
    const ocupadas = Number(cntRow.c) || 0;
    const vagas = Number(ev.vagas) || 1;
    const permiteFila = Boolean(ev.permitir_lista_espera);

    let novoStatus = "INSCRITO";
    if (ocupadas >= vagas) {
      if (!permiteFila) {
        await connection.rollback();
        return res.status(400).json({ error: "Não há vagas disponíveis e a lista de espera está desativada." });
      }
      novoStatus = "FILA_ESPERA";
    }

    if (existRows.length > 0 && existRows[0].status === "CANCELADO") {
      await connection.execute(
        `UPDATE inscricoes_rh SET posicao = ?, status = ?, aceitou_politica = 1, data_inscricao = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextPos, novoStatus, existRows[0].id],
      );
    } else {
      await connection.execute(
        `INSERT INTO inscricoes_rh (evento_id, usuario_id, posicao, status, aceitou_politica) VALUES (?, ?, ?, ?, 1)`,
        [eventoId, usuarioId, nextPos, novoStatus],
      );
    }

    await gravarAuditoria(connection, usuarioId, "EVENTOS_RH", "INSCREVER", eventoId, {
      titulo: ev.titulo,
      status: novoStatus,
      posicao: nextPos,
    });

    await connection.commit();
    res.json({
      message: novoStatus === "INSCRITO" ? "Inscrição confirmada!" : "Você entrou na lista de espera.",
      status: novoStatus,
      posicao: nextPos,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    await logErro("EVENTO_RH_INSCREVER", error);
    res.status(500).json({ error: error.message || "Erro ao inscrever." });
  } finally {
    connection.release();
  }
};

async function promoverFilaEspera(connection, eventoId) {
  const [[cnt]] = await connection.execute(
    `SELECT COUNT(*) AS c FROM inscricoes_rh WHERE evento_id = ? AND status = 'INSCRITO'`,
    [eventoId],
  );
  const [ev] = await connection.execute(`SELECT vagas FROM eventos_rh WHERE id = ?`, [eventoId]);
  if (ev.length === 0) return;
  const vagas = Number(ev[0].vagas) || 1;
  let ocupadas = Number(cnt.c) || 0;

  while (ocupadas < vagas) {
    const [fila] = await connection.execute(
      `SELECT id FROM inscricoes_rh WHERE evento_id = ? AND status = 'FILA_ESPERA' ORDER BY posicao ASC, id ASC LIMIT 1`,
      [eventoId],
    );
    if (fila.length === 0) break;
    await connection.execute(`UPDATE inscricoes_rh SET status = 'INSCRITO' WHERE id = ?`, [fila[0].id]);
    ocupadas++;
  }
}

exports.cancelarInscricao = async (req, res) => {
  const eventoId = Number(req.params.id);
  const usuarioId = Number(req.user?.id);
  const role = String(req.user?.role || "").toUpperCase();

  if (role === "PORTARIA") {
    return res.status(403).json({ error: "Acesso negado." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [evRows] = await connection.execute(
      `SELECT id, status, data_inicio_inscricao, data_limite_inscricao, data_evento FROM eventos_rh WHERE id = ? FOR UPDATE`,
      [eventoId],
    );
    if (evRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Evento não encontrado." });
    }
    const ev = evRows[0];
    if (ev.status !== "ABERTO") {
      await connection.rollback();
      return res.status(400).json({ error: "Não é possível cancelar: evento não está aberto." });
    }

    // Cancelamento permitido até 24h antes do início do dia civil do evento
    // (não o instante bruto em BD, que costuma ser meia-noite UTC e cortava
    // o prazo cedo demais no fuso BR).
    const limiteCancelamentoMs = limiteCancelamentoInscricaoWtPassMs(ev.data_evento);
    if (limiteCancelamentoMs != null && Date.now() > limiteCancelamentoMs) {
      await connection.rollback();
      return res.status(400).json({
        error: "Cancelamento permitido somente até 24 horas antes do evento.",
      });
    }

    const [ins] = await connection.execute(
      `SELECT id, status FROM inscricoes_rh WHERE evento_id = ? AND usuario_id = ? FOR UPDATE`,
      [eventoId, usuarioId],
    );
    if (ins.length === 0 || !["INSCRITO", "FILA_ESPERA"].includes(ins[0].status)) {
      await connection.rollback();
      return res.status(400).json({ error: "Não há inscrição ativa para cancelar." });
    }

    const eraInscrito = ins[0].status === "INSCRITO";
    await connection.execute(
      `UPDATE inscricoes_rh SET status = 'CANCELADO' WHERE id = ?`,
      [ins[0].id],
    );

    if (eraInscrito) await promoverFilaEspera(connection, eventoId);

    await gravarAuditoria(connection, usuarioId, "EVENTOS_RH", "CANCELAR_INSCRICAO", eventoId, {});
    await connection.commit();
    res.json({ message: "Inscrição cancelada." });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    await logErro("EVENTO_RH_CANCELAR", error);
    res.status(500).json({ error: "Erro ao cancelar inscrição." });
  } finally {
    connection.release();
  }
};

exports.marcarPresenca = async (req, res) => {
  const eventoId = Number(req.params.id);
  const { usuario_id: alvoId, status, adminId } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [ins] = await connection.execute(
      `SELECT id, status FROM inscricoes_rh WHERE evento_id = ? AND usuario_id = ? FOR UPDATE`,
      [eventoId, alvoId],
    );
    if (ins.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Inscrição não encontrada." });
    }
    if (!["INSCRITO", "FILA_ESPERA"].includes(ins[0].status)) {
      await connection.rollback();
      return res.status(400).json({ error: "Só é possível marcar presença/falta para inscrições ativas." });
    }

    const prev = ins[0].status;
    await connection.execute(`UPDATE inscricoes_rh SET status = ? WHERE id = ?`, [status, ins[0].id]);

    if (status === "FALTOU" && (prev === "INSCRITO" || prev === "FILA_ESPERA")) {
      const cfg = await getWtPassConfig(connection);

      // Conta as faltas "não consumidas" do usuário (incluindo a recém marcada).
      const [[faltasRow]] = await connection.execute(
        `SELECT COUNT(*) AS total
           FROM inscricoes_rh
          WHERE usuario_id = ?
            AND status = 'FALTOU'
            AND bloqueio_consumido_id IS NULL`,
        [alvoId],
      );
      const faltasAtuais = Number(faltasRow?.total) || 0;

      if (faltasAtuais >= cfg.faltasPermitidas) {
        const [bloqInsert] = await connection.execute(
          `INSERT INTO bloqueios_eventos_rh (usuario_id, evento_origem_id, eventos_restantes, eventos_total, ativo) VALUES (?, ?, ?, ?, 1)`,
          [alvoId, eventoId, cfg.eventosBloqueio, cfg.eventosBloqueio],
        );
        const novoBloqueioId = bloqInsert.insertId;

        // Vincula até N eventos «ativos» (ABERTO, data do evento ainda vigente),
        // por ordem cronológica, **excluindo**:
        // - o evento onde ocorreu a falta;
        // - eventos já ligados a este utilizador em bloqueios_eventos_rh_alvos
        //   (penalidades anteriores — não repetir a mesma vaga de bloqueio);
        // - eventos em que o utilizador já tem inscrição/participação não cancelada
        //   (só penaliza eventos em que ainda podia atuar como «próximo» WT Pass).
        // O restante da duração (wt_pass_eventos_bloqueio) segue para createEvento.
        const [futuros] = await connection.execute(
          `SELECT e.id
             FROM eventos_rh e
            WHERE e.id <> ?
              AND e.status = 'ABERTO'
              AND (e.data_evento IS NULL OR DATE(e.data_evento) >= DATE(NOW()))
              AND NOT EXISTS (
                SELECT 1 FROM bloqueios_eventos_rh_alvos ba
                WHERE ba.usuario_id = ? AND ba.evento_id = e.id
              )
              AND NOT EXISTS (
                SELECT 1 FROM inscricoes_rh i
                WHERE i.evento_id = e.id AND i.usuario_id = ?
                  AND i.status <> 'CANCELADO'
              )
            ORDER BY e.data_evento ASC, e.id ASC
            LIMIT ?`,
          [eventoId, alvoId, alvoId, cfg.eventosBloqueio],
        );
        const aVincular = futuros;
        for (const ev of aVincular) {
          await connection.execute(
            `INSERT IGNORE INTO bloqueios_eventos_rh_alvos (bloqueio_id, usuario_id, evento_id) VALUES (?, ?, ?)`,
            [novoBloqueioId, alvoId, ev.id],
          );
        }

        const vinculadosAgora = aVincular.length;
        const restantes = Math.max(0, cfg.eventosBloqueio - vinculadosAgora);
        if (restantes === 0) {
          // Já tem futuros suficientes para cobrir toda a penalidade — desativa
          // o bloqueio (eventos novos a publicar não precisam mais ser vinculados).
          await connection.execute(
            `UPDATE bloqueios_eventos_rh SET eventos_restantes = 0, ativo = 0 WHERE id = ?`,
            [novoBloqueioId],
          );
        } else {
          // Faltam eventos para completar a penalidade — mantém o bloqueio ativo
          // e o restante será absorvido por createEvento → vincularEventoAosBloqueiosAtivos.
          await connection.execute(
            `UPDATE bloqueios_eventos_rh SET eventos_restantes = ? WHERE id = ?`,
            [restantes, novoBloqueioId],
          );
        }

        // Marca todas as faltas não consumidas como consumidas por este bloqueio,
        // zerando o contador para o próximo ciclo.
        await connection.execute(
          `UPDATE inscricoes_rh
              SET bloqueio_consumido_id = ?
            WHERE usuario_id = ?
              AND status = 'FALTOU'
              AND bloqueio_consumido_id IS NULL`,
          [novoBloqueioId, alvoId],
        );
      }
    }

    await gravarAuditoria(connection, adminId, "EVENTOS_RH", "PRESENCA", eventoId, {
      usuario_id: alvoId,
      status,
      motivo: truncateMotivo(`Presença: ${status}`),
    });

    await connection.commit();
    res.json({ message: status === "PRESENTE" ? "Marcado como presente." : "Marcado como falta; bloqueio aplicado se aplicável." });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    await logErro("EVENTO_RH_PRESENCA", error);
    res.status(500).json({ error: "Erro ao marcar presença." });
  } finally {
    connection.release();
  }
};

exports.listAllForAdmin = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT e.*,
        (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status IN ('INSCRITO','PRESENTE','FALTOU')) AS ocupadas,
        (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status = 'INSCRITO') AS ocupadas_inscrito,
        (SELECT COUNT(*) FROM inscricoes_rh i WHERE i.evento_id = e.id AND i.status = 'FILA_ESPERA') AS fila_count
       FROM eventos_rh e
       ORDER BY e.data_evento DESC`,
    );
    res.json(
      rows.map((row) => {
        const m = mapEventoRow(row);
        const vagas = Number(row.vagas) || 1;
        const ocupadas = Number(row.ocupadas) || 0;
        const ocupadasInscrito = Number(row.ocupadas_inscrito) || 0;
        return {
          ...m,
          ocupadas,
          ocupadas_inscrito: ocupadasInscrito,
          fila_count: Number(row.fila_count) || 0,
          vagas_restantes: Math.max(0, vagas - ocupadas),
        };
      }),
    );
  } catch (error) {
    await logErro("EVENTO_RH_LIST_ADMIN", error);
    res.status(500).json({ error: "Erro ao listar eventos." });
  }
};

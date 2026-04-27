const db = require("../config/db");
const fs = require("fs");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes, truncateMotivo } = require("../utils/dbHelpers");

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
    await logErro("MATCH_CONTROLLER_GRAVAR_AUDITORIA", e);
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

/** Formata Date em UTC para gravar no banco (YYYY-MM-DD HH:mm:ss) — evita diferença de fuso. */
const dateToUtcString = (d) =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;

/**
 * Grava data no banco sempre em UTC ("YYYY-MM-DD HH:mm:ss").
 * - String ISO com Z (ex: "2026-03-02T20:00:00.000Z") → extrai UTC e grava.
 * - String "YYYY-MM-DD HH:mm" ou "YYYY-MM-DDTHH:mm" (sem Z) → trata como local do cliente e converte para UTC (assumindo que o servidor recebeu em local).
 */
const formatarDataLocal = (dataString) => {
  if (!dataString) return null;
  const s = String(dataString).trim();
  const d = dataString instanceof Date ? dataString : new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return dateToUtcString(d);
};

exports.getGroups = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nome, descricao FROM grupos ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_GET_GROUPS", error);
    res.status(500).json({ error: "Erro ao buscar grupos." });
  }
};

exports.getMatches = async (req, res) => {
  const { userId, dashboard } = req.query;
  try {
    const [users] = await db.execute(
      "SELECT perfil, grupo_id FROM usuarios WHERE id = ?",
      [userId],
    );
    if (users.length === 0) return res.json([]);
    const user = users[0];

    let sql = `
      SELECT p.*, g.nome as nome_grupo, se.nome as setor_evento_nome,
        (SELECT COUNT(*) FROM ingressos i INNER JOIN apostas a ON i.aposta_id = a.id WHERE a.partida_id = p.id) as ingressos_sorteados,
        (SELECT COALESCE(SUM(quantidade), 0) FROM transferencias_ingressos WHERE partida_origem_id = p.id) as ingressos_transferidos,
        (SELECT COALESCE(SUM(quantidade), 0) FROM transferencias_ingressos WHERE partida_destino_id = p.id) as ingressos_recebidos,
        (SELECT COALESCE(SUM(quantidade), 0) FROM acrescimos_ingressos WHERE partida_id = p.id) as ingressos_acrescimos,
        (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ?) as tickets_comprados,
        (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ? AND a.status = 'GANHOU') as tickets_ganhos,
        (SELECT GROUP_CONCAT(CONCAT(a.id, ':', a.valor_pago, ':', a.status) ORDER BY a.valor_pago DESC) 
         FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ?) as meus_lances_detalhados,
        (SELECT GROUP_CONCAT(CONCAT(i.id, ':', COALESCE(c.nome_completo, ''), ':', i.checkin) SEPARATOR ',') 
         FROM ingressos i
         JOIN apostas a ON i.aposta_id = a.id
         LEFT JOIN convidados c ON i.convidado_id = c.id
         WHERE a.partida_id = p.id AND a.usuario_id = ?) as raw_ingressos
      FROM partidas p
      LEFT JOIN grupos g ON p.grupo_id = g.id
      LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
      WHERE 1=1 
    `;

    const params = [userId, userId, userId, userId];

    if (user.perfil !== "ADMIN") {
      sql += ` AND (p.grupo_id = ? OR p.grupo_id IS NULL) `;
      params.push(user.grupo_id || 0);
    }

    if (dashboard === 'true') {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

      sql += ` AND DATE(p.data_jogo) >= '${todayStr}' `;
      sql += ` ORDER BY CASE WHEN p.status = 'ABERTA' THEN 1 ELSE 2 END ASC, p.data_jogo ASC`;
    } else {
      sql += ` ORDER BY p.data_jogo DESC`;
    }

    const [rows] = await db.execute(sql, params);

    /** Datas no banco estão em UTC; interpreta como UTC ao enviar para o cliente. */
    const dbUtcToISO = (v) => {
      if (!v) return null;
      const s = String(v).trim().replace(" ", "T");
      return new Date(s.endsWith("Z") ? s : s + "Z").toISOString();
    };

    const results = rows.map((row) => {
      const qtdPremios = row.quantidade_premios || 1;
      const recebidos = Number(row.ingressos_recebidos || 0);
      const acrescimos = Number(row.ingressos_acrescimos || 0);
      const qtdPremiosEfetiva = qtdPremios + recebidos + acrescimos;
      const sorteados = Number(row.ingressos_sorteados || 0);
      const transferidosOut = Number(row.ingressos_transferidos || 0);
      const quantidadePremiosRestante = Math.max(0, qtdPremiosEfetiva - transferidosOut);
      return {
        ...row,
        data_jogo: dbUtcToISO(row.data_jogo),
        data_inicio_apostas: dbUtcToISO(row.data_inicio_apostas),
        data_limite_aposta: dbUtcToISO(row.data_limite_aposta),
        data_apuracao: dbUtcToISO(row.data_apuracao),
        data_evento: dbUtcToISO(row.data_jogo),
        email_bid_aberto_em: dbUtcToISO(row.email_bid_aberto_em),
        email_bid_encerrado_em: dbUtcToISO(row.email_bid_encerrado_em),
        email_ganhadores_em: dbUtcToISO(row.email_ganhadores_em),
        titulo: row.titulo || "Evento sem título",
        quantidade_premios: qtdPremios,
        quantidade_premios_efetiva: qtdPremiosEfetiva,
        quantidade_premios_restante: quantidadePremiosRestante,
        ingressos_transferidos: transferidosOut,
        ingressos_recebidos: recebidos,
        ingressos_sorteados: sorteados,
        ingressos_nao_sorteados: Math.max(0, qtdPremiosEfetiva - sorteados - transferidosOut),
        raw_lances: row.meus_lances_detalhados,
        raw_ingressos: row.raw_ingressos,
        status: row.status || "ABERTA",
      };
    });
    res.json(results);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_GET_MATCHES", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

exports.getMyBets = async (req, res) => {
  const { userId } = req.params;
  try {
    const sql = `
      SELECT p.*, g.nome as nome_grupo,
        (SELECT GROUP_CONCAT(CONCAT(a.id, ':', a.valor_pago, ':', a.status) ORDER BY a.valor_pago DESC) 
         FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ?) as meus_lances_detalhados,
        (SELECT GROUP_CONCAT(CONCAT(i.id, ':', COALESCE(c.nome_completo, ''), ':', i.checkin) SEPARATOR ',') 
         FROM ingressos i
         JOIN apostas a ON i.aposta_id = a.id
         LEFT JOIN convidados c ON i.convidado_id = c.id
         WHERE a.partida_id = p.id AND a.usuario_id = ?) as raw_ingressos
      FROM partidas p
      LEFT JOIN grupos g ON p.grupo_id = g.id
      WHERE EXISTS (SELECT 1 FROM apostas a2 WHERE a2.partida_id = p.id AND a2.usuario_id = ?)
      ORDER BY p.data_jogo DESC
    `;

    const params = [userId, userId, userId];
    const [rows] = await db.execute(sql, params);

    const dbUtcToISO = (v) => {
      if (!v) return null;
      const s = String(v).trim().replace(" ", "T");
      return new Date(s.endsWith("Z") ? s : s + "Z").toISOString();
    };

    const results = rows.map((row) => ({
      ...row,
      data_jogo: dbUtcToISO(row.data_jogo),
      data_inicio_apostas: dbUtcToISO(row.data_inicio_apostas),
      data_limite_aposta: dbUtcToISO(row.data_limite_aposta),
      data_apuracao: dbUtcToISO(row.data_apuracao),
      data_evento: dbUtcToISO(row.data_jogo),
      titulo: row.titulo || "Evento sem título",
      quantidade_premios: row.quantidade_premios || 1,
      raw_lances: row.meus_lances_detalhados,
      raw_ingressos: row.raw_ingressos,
      status: row.status || "ABERTA",
    }));
    res.json(results);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_GET_MY_BETS", error);
    res.status(500).json({ error: "Erro ao buscar minhas apostas." });
  }
};

exports.createMatch = async (req, res) => {
  try {
    const {
      titulo,
      banner,
      subtitulo,
      informacoes_extras,
      link_extra,
      local,
      data_jogo,
      data_inicio_apostas,
      data_limite_aposta,
      data_apuracao,
      quantidade_premios,
      grupo_id,
      setor_evento_id,
      adminId,
      motivo,
    } = req.body;
    const grupoIdFinal =
      grupo_id && String(grupo_id) !== "null" ? grupo_id : null;
    const setorEventoIdFinal =
      setor_evento_id && String(setor_evento_id) !== "null" ? setor_evento_id : null;
    if (!data_jogo)
      return res.status(400).json({ error: "Data do evento obrigatória." });

    const inicioFormatado = data_inicio_apostas
      ? formatarDataLocal(data_inicio_apostas)
      : formatarDataLocal(new Date());
    const bannerUrl = banner && String(banner).trim() ? String(banner).trim() : null;

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO partidas (titulo, banner, subtitulo, informacoes_extras, link_extra, local, data_jogo, data_inicio_apostas, data_limite_aposta, data_apuracao, quantidade_premios, grupo_id, setor_evento_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTA')`,
        [
          titulo,
          bannerUrl,
          subtitulo && String(subtitulo).trim() ? String(subtitulo).trim() : null,
          informacoes_extras && String(informacoes_extras).trim() ? String(informacoes_extras).trim() : null,
          link_extra && String(link_extra).trim() ? String(link_extra).trim() : null,
          local || "Local a definir",
          formatarDataLocal(data_jogo),
          inicioFormatado,
          formatarDataLocal(data_limite_aposta),
          data_apuracao ? formatarDataLocal(data_apuracao) : null,
          quantidade_premios || 1,
          grupoIdFinal,
          setorEventoIdFinal,
        ],
      );
      const novoBidId = result.insertId;

      if (adminId) {
        await connection.execute(
          `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
          [adminId, adminId, truncateMotivo(`Admin: Criou BID #${novoBidId} (${titulo})`)],
        );
      }

      await gravarAuditoria(
        connection,
        adminId,
        "BIDS",
        "CREATE_BID",
        novoBidId,
        {
          titulo,
          grupo_id: grupoIdFinal,
          motivo: motivo || `Criação do evento: ${titulo}`,
        },
      );
      await connection.commit();
      res.json({ message: "Evento criado com sucesso!" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    await logErro("MATCH_CONTROLLER_CREATE_MATCH", error);
    res.status(500).json({ error: "Erro ao criar." });
  }
};

exports.updateMatch = async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    banner,
    subtitulo,
    informacoes_extras,
    link_extra,
    local,
    data_jogo,
    data_inicio_apostas,
    data_limite_aposta,
    data_apuracao,
    quantidade_premios,
    grupo_id,
    setor_evento_id,
    adminId,
    motivo,
  } = req.body;
  const grupoIdFinal =
    grupo_id && String(grupo_id) !== "null" ? grupo_id : null;
  const setorEventoIdFinal =
    setor_evento_id && String(setor_evento_id) !== "null" ? setor_evento_id : null;
  if (!data_jogo)
    return res.status(400).json({ error: "Data do evento obrigatória." });

  const connection = await db.getConnection();
  try {
    const [statusRows] = await connection.execute(
      "SELECT status FROM partidas WHERE id = ?",
      [id],
    );
    if (statusRows.length === 0)
      return res.status(404).json({ error: "Evento não encontrado." });
    if (statusRows[0].status !== "ABERTA")
      return res.status(403).json({
        error: "Não é permitido editar BID encerrado.",
      });

    const bannerUrl = banner && String(banner).trim() ? String(banner).trim() : null;
    const subtituloVal = subtitulo && String(subtitulo).trim() ? String(subtitulo).trim() : null;
    const informacoesExtrasVal = informacoes_extras && String(informacoes_extras).trim() ? String(informacoes_extras).trim() : null;
    const linkExtraVal = link_extra && String(link_extra).trim() ? String(link_extra).trim() : null;

    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE partidas SET titulo = ?, banner = ?, subtitulo = ?, informacoes_extras = ?, link_extra = ?, local = ?, data_jogo = ?, data_inicio_apostas = ?, data_limite_aposta = ?, data_apuracao = ?, quantidade_premios = ?, grupo_id = ?, setor_evento_id = ? WHERE id = ?`,
      [
        titulo,
        bannerUrl,
        subtituloVal,
        informacoesExtrasVal,
        linkExtraVal,
        local || "Local a definir",
        formatarDataLocal(data_jogo),
        formatarDataLocal(data_inicio_apostas),
        formatarDataLocal(data_limite_aposta),
        data_apuracao ? formatarDataLocal(data_apuracao) : null,
        quantidade_premios || 1,
        grupoIdFinal,
        setorEventoIdFinal,
        id,
      ],
    );

    if (result.affectedRows === 0) throw new Error("Evento não encontrado.");

    if (adminId) {
      await connection.execute(
        `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
        [adminId, adminId, truncateMotivo(`Admin: Editou BID #${id} (${titulo})`)],
      );
    }

    await gravarAuditoria(connection, adminId, "BIDS", "UPDATE_BID", id, {
      titulo,
      grupo_id: grupoIdFinal,
      motivo: motivo || `Edição do evento: ${titulo}`,
    });
    await connection.commit();
    res.json({ message: "Evento atualizado com sucesso!" });
  } catch (error) {
    await connection.rollback();
    await logErro("MATCH_CONTROLLER_UPDATE_MATCH", error);
    res.status(500).json({ error: "Erro ao atualizar evento." });
  } finally {
    connection.release();
  }
};

exports.placeBet = async (req, res) => {
  const { partidaId, usuarioId, valores, valorApostado } = req.body;
  const connection = await db.getConnection();
  try {
    const pId = Number(partidaId);
    const uId = Number(usuarioId);
    let lancesParaProcessar = [];
    if (Array.isArray(valores))
      lancesParaProcessar = valores.map((v) => Number(v));
    else if (valorApostado) lancesParaProcessar = [Number(valorApostado)];

    if (!pId || !uId || lancesParaProcessar.length === 0)
      throw new Error("Dados inválidos.");
    if (lancesParaProcessar.length > 4)
      throw new Error("Máximo de 4 lances permitidos.");

    const [rows] = await connection.execute(
      "SELECT COUNT(*) as total FROM apostas WHERE partida_id = ? AND usuario_id = ?",
      [pId, uId],
    );
    if (Number(rows[0].total) > 0)
      throw new Error("Participação Única: Você já registrou seus lances.");

    const [matchData] = await connection.execute(
      "SELECT titulo, data_inicio_apostas, data_limite_aposta, status FROM partidas WHERE id = ?",
      [pId],
    );
    if (matchData.length === 0) throw new Error("Evento não encontrado.");
    const match = matchData[0];
    const agora = new Date();
    const parseDbUtc = (v) => {
      if (!v) return new Date(NaN);
      const s = String(v).trim().replace(" ", "T");
      return new Date(s.endsWith("Z") ? s : s + "Z");
    };
    const inicioApostas = parseDbUtc(match.data_inicio_apostas);
    const limiteApostas = parseDbUtc(match.data_limite_aposta);
    const bufferMs = 60 * 1000;

    if (match.status !== "ABERTA")
      throw new Error("Este evento não está aberto para lances.");
    if (agora.getTime() < inicioApostas.getTime() - bufferMs) {
      const msg =
        "O período de lances ainda não iniciou. Início: " +
        inicioApostas.toISOString() +
        " (servidor: " +
        agora.toISOString() +
        ").";
      throw new Error(msg);
    }
    if (agora.getTime() > limiteApostas.getTime() + bufferMs)
      throw new Error("O período de lances já encerrou.");

    const totalValor = lancesParaProcessar.reduce((acc, v) => acc + v, 0);

    const [userRows] = await connection.execute(
      "SELECT pontos, nome_completo FROM usuarios WHERE id = ?",
      [uId],
    );
    if (userRows.length === 0) throw new Error("Usuário não encontrado.");
    const userName = userRows[0].nome_completo;

    if (Number(userRows[0].pontos) < totalValor)
      throw new Error("Saldo insuficiente.");

    await connection.beginTransaction();
    await connection.execute(
      "UPDATE usuarios SET pontos = pontos - ? WHERE id = ?",
      [totalValor, uId],
    );

    for (const valor of lancesParaProcessar) {
      await connection.execute(
        "INSERT INTO apostas (partida_id, usuario_id, valor_pago, status) VALUES (?, ?, ?, 'PENDENTE')",
        [pId, uId, valor],
      );
    }

    await connection.execute(
      "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
      [
        uId,
        uId,
        Number(userRows[0].pontos),
        Number(userRows[0].pontos) - totalValor,
        truncateMotivo(`BID: ${match.titulo}`),
      ],
    );

    await gravarAuditoria(connection, uId, "BIDS", "PLACE_BET", pId, {
      usuario: userName,
      lances: lancesParaProcessar,
      total: totalValor,
      motivo: `${userName} realizou ${lancesParaProcessar.length} lance(s) totalizando ${totalValor}pts no evento: ${match.titulo}`,
    });

    await connection.commit();
    res.json({ message: "Participação confirmada!" });
  } catch (error) {
    if (connection) await connection.rollback();
    await logErro("MATCH_CONTROLLER_PLACE_BET", error);
    res.status(400).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.finishMatch = async (req, res) => {
  const partidaId = Number(req.body.partidaId);
  const { adminId, motivo } = req.body;
  if (!partidaId || Number.isNaN(partidaId))
    throw new Error("Partida não encontrada");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [matches] = await connection.execute(
      "SELECT titulo, quantidade_premios FROM partidas WHERE id = ?",
      [partidaId],
    );
    if (matches.length === 0) throw new Error("Partida não encontrada");
    const match = matches[0];
    const qtdPremiosOriginal = Number(match.quantidade_premios) || 1;
    const [transferenciasRecebidas] = await connection.execute(
      "SELECT COALESCE(SUM(quantidade), 0) as total FROM transferencias_ingressos WHERE partida_destino_id = ?",
      [partidaId],
    );
    const ingressosRecebidos = Number(
      transferenciasRecebidas[0]?.total ?? transferenciasRecebidas[0]?.TOTAL ?? 0,
    );
    const qtdPremios = qtdPremiosOriginal + ingressosRecebidos;

    const [apostasRaw] = await connection.execute(
      "SELECT id, usuario_id, valor_pago FROM apostas WHERE partida_id = ? ORDER BY valor_pago DESC, id ASC",
      [partidaId],
    );
    const apostas = apostasRaw.map((a) => ({
      ...a,
      valor_pago: Number(a.valor_pago),
    }));

    const vencedores = apostas.slice(0, qtdPremios);
    const perdedores = apostas.slice(qtdPremios);

    for (const win of vencedores) {
      await connection.execute(
        "UPDATE apostas SET status = 'GANHOU' WHERE id = ?",
        [win.id],
      );
      await connection.execute(
        "INSERT INTO ingressos (aposta_id, usuario_id) VALUES (?, ?)",
        [win.id, win.usuario_id],
      );
      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)",
        [
          win.usuario_id,
          adminId || 1,
          truncateMotivo(`VITORIA BID: ${match.titulo} (Lance: ${win.valor_pago})`),
        ],
      );
    }

    const reembolsos = {};
    for (const loss of perdedores) {
      await connection.execute(
        "UPDATE apostas SET status = 'PERDEU' WHERE id = ?",
        [loss.id],
      );
      if (!reembolsos[loss.usuario_id]) reembolsos[loss.usuario_id] = 0;
      reembolsos[loss.usuario_id] += loss.valor_pago;
    }

    for (const [userId, valorTotal] of Object.entries(reembolsos)) {
      const [uRows] = await connection.execute(
        "SELECT pontos FROM usuarios WHERE id = ?",
        [userId],
      );
      const saldoAtual = Number(uRows[0]?.pontos || 0);
      const novoSaldo = saldoAtual + valorTotal;
      await connection.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
        novoSaldo,
        userId,
      ]);
      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          adminId || 1,
          saldoAtual,
          novoSaldo,
          truncateMotivo(`REEMBOLSO BID: ${match.titulo}`),
        ],
      );
    }

    await connection.execute(
      "UPDATE partidas SET status = 'FINALIZADA' WHERE id = ?",
      [partidaId],
    );
    await gravarAuditoria(
      connection,
      adminId,
      "BIDS",
      "FINISH_BID",
      partidaId,
      {
        quantidade_premios_original: qtdPremiosOriginal,
        ingressos_recebidos_transferencia: ingressosRecebidos,
        quantidade_premios_efetiva: qtdPremios,
        vencedores: vencedores.length,
        reembolsados: perdedores.length,
        motivo: motivo || "Sorteio e encerramento do evento",
      },
    );

    await connection.commit();
    res.json({ message: "Sorteio realizado!" });
  } catch (error) {
    await connection.rollback();
    await logErro("MATCH_CONTROLLER_FINISH_MATCH", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.deleteMatch = async (req, res) => {
  const { id } = req.params;
  const { adminId, motivo } = req.query;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [matches] = await connection.execute(
      "SELECT titulo FROM partidas WHERE id = ?",
      [id],
    );
    if (matches.length === 0) throw new Error("Evento não encontrado.");
    const match = matches[0];

    const [apostas] = await connection.execute(
      "SELECT usuario_id, valor_pago FROM apostas WHERE partida_id = ?",
      [id],
    );
    if (apostas.length > 0) {
      const reembolsos = {};
      for (const aposta of apostas) {
        if (!reembolsos[aposta.usuario_id]) reembolsos[aposta.usuario_id] = 0;
        reembolsos[aposta.usuario_id] += Number(aposta.valor_pago);
      }
      for (const [userId, valorTotal] of Object.entries(reembolsos)) {
        const [uRows] = await connection.execute(
          "SELECT pontos FROM usuarios WHERE id = ?",
          [userId],
        );
        const saldoAtual = Number(uRows[0]?.pontos || 0);
        await connection.execute(
          "UPDATE usuarios SET pontos = pontos + ? WHERE id = ?",
          [valorTotal, userId],
        );
        await connection.execute(
          "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
          [
            userId,
            adminId || 1,
            saldoAtual,
            saldoAtual + valorTotal,
            truncateMotivo(`REEMBOLSO CANCELAMENTO BID: ${match.titulo}`),
          ],
        );
      }
      await connection.execute("DELETE FROM apostas WHERE partida_id = ?", [
        id,
      ]);
    }

    await connection.execute("DELETE FROM partidas WHERE id = ?", [id]);
    await gravarAuditoria(connection, adminId, "BIDS", "DELETE_BID", id, {
      titulo: match.titulo,
      motivo: motivo || "Exclusão do evento pelo Administrador",
    });

    await connection.commit();
    res.json({ message: "Evento excluído e pontos reembolsados." });
  } catch (error) {
    await connection.rollback();
    await logErro("MATCH_CONTROLLER_DELETE_MATCH", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.redistribuirIngressos = async (req, res) => {
  const partidaOrigemId = Number(req.params.id);
  const partidaDestinoId = Number(req.body.partidaDestinoId);
  const { adminId, motivo, quantidade: quantidadeBody } = req.body;
  if (!motivo || typeof motivo !== "string" || !motivo.trim()) {
    return res.status(400).json({ error: "Motivo da redistribuição é obrigatório." });
  }
  if (partidaOrigemId === partidaDestinoId) {
    return res.status(400).json({ error: "O BID receptor deve ser diferente do BID de origem." });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // BID origem: deve estar finalizada e ter ingressos não sorteados (não transferidos)
    const [origemRows] = await connection.execute(
      "SELECT id, titulo, quantidade_premios FROM partidas WHERE id = ? AND status = 'FINALIZADA'",
      [partidaOrigemId],
    );
    if (origemRows.length === 0) {
      return res.status(400).json({
        error: "BID de origem não encontrado ou não está finalizado.",
      });
    }
    const origem = origemRows[0];
    const qtdPremiosOrigem = origem.quantidade_premios || 1;

    const [countOrigem] = await connection.execute(
      `SELECT COUNT(*) as total FROM ingressos i INNER JOIN apostas a ON i.aposta_id = a.id WHERE a.partida_id = ?`,
      [partidaOrigemId],
    );
    const sorteadosOrigem = Number(countOrigem[0]?.total || 0);
    const [transfOut] = await connection.execute(
      "SELECT COALESCE(SUM(quantidade), 0) as total FROM transferencias_ingressos WHERE partida_origem_id = ?",
      [partidaOrigemId],
    );
    const transferidosOut = Number(transfOut[0]?.total || 0);
    const ingressosSobresalentes = Math.max(0, qtdPremiosOrigem - sorteadosOrigem - transferidosOut);
    if (ingressosSobresalentes === 0) {
      return res.status(400).json({
        error: "Não há ingressos sobresalentes (não sorteados) para encaminhar ao BID receptor.",
      });
    }

    // Quantidade a transferir: se informada e válida, usar; senão transferir todos
    const quantidadeTransferir =
      quantidadeBody != null && Number.isInteger(Number(quantidadeBody)) && Number(quantidadeBody) >= 1
        ? Math.min(Number(quantidadeBody), ingressosSobresalentes)
        : ingressosSobresalentes;

    // BID destino (receptor): deve existir (pode ser ABERTA ou FINALIZADA)
    const [destinoRows] = await connection.execute(
      "SELECT id, titulo, status FROM partidas WHERE id = ?",
      [partidaDestinoId],
    );
    if (destinoRows.length === 0) {
      return res.status(400).json({
        error: "BID receptor não encontrado.",
      });
    }
    const destino = destinoRows[0];

    // Registrar transferência: quantidade escolhida de origem → destino
    await connection.execute(
      `INSERT INTO transferencias_ingressos (partida_origem_id, partida_destino_id, quantidade, motivo, admin_id) VALUES (?, ?, ?, ?, ?)`,
      [partidaOrigemId, partidaDestinoId, quantidadeTransferir, motivo.trim(), adminId || null],
    );

    // Se o BID receptor estiver ABERTO: só registramos a transferência; os ingressos serão atribuídos quando o BID for encerrado
    if (destino.status === "ABERTA") {
      await gravarAuditoria(
        connection,
        adminId,
        "BIDS",
        "REDISTRIBUIR_INGRESSOS",
        partidaOrigemId,
        {
          motivo: motivo.trim(),
          partida_origem_id: partidaOrigemId,
          partida_origem_titulo: origem.titulo,
          partida_destino_id: partidaDestinoId,
          partida_destino_titulo: destino.titulo,
          quantidade_encaminhada: quantidadeTransferir,
          destino_aberto: true,
          mensagem: "Ingressos serão atribuídos quando o BID receptor for encerrado.",
        },
      );
      await connection.commit();
      return res.json({
        message:
          "Ingressos sobresalentes encaminhados ao BID receptor. Serão atribuídos quando o BID receptor for encerrado.",
        partida_origem_titulo: origem.titulo,
        partida_destino_titulo: destino.titulo,
        quantidade_encaminhada: quantidadeTransferir,
        destino_aberto: true,
      });
    }

    // BID receptor FINALIZADO: usar fila de PERDEU (ordenada por valor_pago DESC) e debitar pontos
    const [perdedoresRows] = await connection.execute(
      `SELECT id, usuario_id, valor_pago FROM apostas WHERE partida_id = ? AND status = 'PERDEU' ORDER BY valor_pago DESC, id ASC`,
      [partidaDestinoId],
    );
    const perdedores = perdedoresRows.map((r) => ({
      id: r.id,
      usuario_id: r.usuario_id,
      valor_pago: Number(r.valor_pago),
    }));

    const beneficiarios = [];
    const puladosPorSaldoInsuficiente = [];
    const quantidade = Math.min(quantidadeTransferir, perdedores.length);

    for (let i = 0; i < quantidade; i++) {
      const aposta = perdedores[i];
      const [userRows] = await connection.execute(
        "SELECT pontos, nome_completo FROM usuarios WHERE id = ?",
        [aposta.usuario_id],
      );
      const saldoAtual = Number(userRows[0]?.pontos || 0);
      const valorPago = aposta.valor_pago;

      if (saldoAtual < valorPago) {
        puladosPorSaldoInsuficiente.push({
          usuario_id: aposta.usuario_id,
          nome: userRows[0]?.nome_completo || "N/A",
          valor_necessario: valorPago,
          saldo_atual: saldoAtual,
          motivo: "Não possui pontos suficientes; passou para o próximo da fila e não ganhou este ingresso.",
        });
        continue;
      }

      await connection.execute(
        "UPDATE apostas SET status = 'GANHOU' WHERE id = ?",
        [aposta.id],
      );
      await connection.execute(
        "INSERT INTO ingressos (aposta_id, usuario_id) VALUES (?, ?)",
        [aposta.id, aposta.usuario_id],
      );
      const novoSaldo = saldoAtual - valorPago;
      await connection.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
        novoSaldo,
        aposta.usuario_id,
      ]);
      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
        [
          aposta.usuario_id,
          adminId || 1,
          saldoAtual,
          novoSaldo,
          truncateMotivo(`REDISTRIBUIÇÃO BID RECEPTOR: ${destino.titulo} (Lance: ${valorPago} pts)`),
        ],
      );
      beneficiarios.push({
        usuario_id: aposta.usuario_id,
        nome: userRows[0]?.nome_completo || "N/A",
        valor_pago: valorPago,
      });
    }

    await gravarAuditoria(
      connection,
      adminId,
      "BIDS",
      "REDISTRIBUIR_INGRESSOS",
      partidaOrigemId,
      {
        motivo: motivo.trim(),
        partida_origem_id: partidaOrigemId,
        partida_origem_titulo: origem.titulo,
        partida_destino_id: partidaDestinoId,
        partida_destino_titulo: destino.titulo,
        quantidade_encaminhada: quantidadeTransferir,
        beneficiarios_bid_receptor: beneficiarios,
        pulados_por_saldo_insuficiente: puladosPorSaldoInsuficiente,
      },
    );

    await connection.commit();
    res.json({
      message: "Ingressos sobresalentes encaminhados ao BID receptor; pontos debitados no BID receptor.",
      partida_origem_titulo: origem.titulo,
      partida_destino_titulo: destino.titulo,
      quantidade_encaminhada: quantidadeTransferir,
      beneficiarios,
      pulados_por_saldo_insuficiente: puladosPorSaldoInsuficiente,
    });
  } catch (error) {
    await connection.rollback();
    await logErro("MATCH_CONTROLLER_REDISTRIBUIR", error);
    res.status(500).json({ error: error.message || "Erro ao redistribuir." });
  } finally {
    connection.release();
  }
};

exports.acrescentarIngressos = async (req, res) => {
  const partidaId = Number(req.params.id);
  const { quantidade: quantidadeBody, adminId, motivo } = req.body;
  if (!motivo || typeof motivo !== "string" || !motivo.trim()) {
    return res.status(400).json({ error: "Motivo é obrigatório para auditoria." });
  }
  const quantidade = Math.max(1, Math.floor(Number(quantidadeBody) || 0));
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [partidas] = await connection.execute(
      "SELECT id, titulo FROM partidas WHERE id = ? AND status = 'FINALIZADA'",
      [partidaId],
    );
    if (partidas.length === 0) {
      return res.status(400).json({
        error: "BID não encontrado ou não está finalizado.",
      });
    }
    const match = partidas[0];

    await connection.execute(
      "INSERT INTO acrescimos_ingressos (partida_id, quantidade, motivo, admin_id) VALUES (?, ?, ?, ?)",
      [partidaId, quantidade, motivo.trim(), adminId || null],
    );

    const [perdedoresRows] = await connection.execute(
      `SELECT id, usuario_id, valor_pago FROM apostas WHERE partida_id = ? AND status = 'PERDEU' ORDER BY valor_pago DESC, id ASC`,
      [partidaId],
    );
    const perdedores = perdedoresRows.map((r) => ({
      id: r.id,
      usuario_id: r.usuario_id,
      valor_pago: Number(r.valor_pago),
    }));

    const beneficiarios = [];
    const puladosPorSaldoInsuficiente = [];
    const qtdAtribuir = Math.min(quantidade, perdedores.length);

    for (let i = 0; i < qtdAtribuir; i++) {
      const aposta = perdedores[i];
      const [userRows] = await connection.execute(
        "SELECT pontos, nome_completo FROM usuarios WHERE id = ?",
        [aposta.usuario_id],
      );
      const saldoAtual = Number(userRows[0]?.pontos || 0);
      const valorPago = aposta.valor_pago;

      if (saldoAtual < valorPago) {
        puladosPorSaldoInsuficiente.push({
          usuario_id: aposta.usuario_id,
          nome: userRows[0]?.nome_completo || "N/A",
          valor_necessario: valorPago,
          saldo_atual: saldoAtual,
          motivo: "Não possui pontos suficientes; passou para o próximo da fila.",
        });
        continue;
      }

      await connection.execute(
        "UPDATE apostas SET status = 'GANHOU' WHERE id = ?",
        [aposta.id],
      );
      await connection.execute(
        "INSERT INTO ingressos (aposta_id, usuario_id) VALUES (?, ?)",
        [aposta.id, aposta.usuario_id],
      );
      const novoSaldo = saldoAtual - valorPago;
      await connection.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
        novoSaldo,
        aposta.usuario_id,
      ]);
      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
        [
          aposta.usuario_id,
          adminId || 1,
          saldoAtual,
          novoSaldo,
          truncateMotivo(`ACRÉSCIMO BID: ${match.titulo} (Lance: ${valorPago} pts)`),
        ],
      );
      beneficiarios.push({
        usuario_id: aposta.usuario_id,
        nome: userRows[0]?.nome_completo || "N/A",
        valor_pago: valorPago,
      });
    }

    await gravarAuditoria(
      connection,
      adminId,
      "BIDS",
      "ACRESCENTAR_INGRESSOS",
      partidaId,
      {
        motivo: motivo.trim(),
        partida_titulo: match.titulo,
        quantidade_solicitada: quantidade,
        quantidade_atribuida: beneficiarios.length,
        beneficiarios,
        pulados_por_saldo_insuficiente: puladosPorSaldoInsuficiente,
      },
    );

    await connection.commit();
    res.json({
      message: "Ingressos acrescentados; prêmios atribuídos à fila de perdedores (pontos debitados).",
      partida_titulo: match.titulo,
      quantidade_solicitada: quantidade,
      quantidade_atribuida: beneficiarios.length,
      beneficiarios,
      pulados_por_saldo_insuficiente: puladosPorSaldoInsuficiente,
    });
  } catch (error) {
    await connection.rollback();
    await logErro("MATCH_CONTROLLER_ACRESCENTAR_INGRESSOS", error);
    res.status(500).json({ error: error.message || "Erro ao acrescentar ingressos." });
  } finally {
    connection.release();
  }
};

exports.getBalance = async (req, res) => {
  try {
    const userId = req.params?.userId;
    if (userId == null || userId === "") {
      return res.status(400).json({ error: "userId é obrigatório.", pontos: 0 });
    }
    const [rows] = await db.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [userId],
    );
    const first = Array.isArray(rows) ? rows[0] : null;
    if (!first) {
      return res.status(404).json({ error: "Usuário não encontrado.", pontos: 0 });
    }
    const pontos = first.pontos != null ? Number(first.pontos) : 0;
    res.json({ pontos: Number.isNaN(pontos) ? 0 : pontos });
  } catch (error) {
    await logErro("MATCH_CONTROLLER_GET_BALANCE", error);
    res.status(500).json({ error: "Erro", pontos: 0 });
  }
};

exports.getMatchWinnersReport = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT u.nome_completo AS titular_nome, s.nome AS titular_setor, a.valor_pago AS lance_pago,
             c.nome_completo AS retirante_nome, c.cpf AS retirante_cpf, i.checkin
      FROM apostas a
      JOIN ingressos i ON i.aposta_id = a.id
      JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN setores s ON u.setor_id = s.id
      LEFT JOIN convidados c ON i.convidado_id = c.id
      WHERE a.partida_id = ? AND a.status = 'GANHOU'
      ORDER BY a.valor_pago DESC
    `,
      [req.params.id],
    );
    res.json(rows);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_WINNERS_REPORT", error);
    res.status(500).json({ error: "Erro." });
  }
};

exports.getMatchBetsReport = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT a.id, u.nome_completo AS nome_completo, a.valor_pago, a.status, a.data_aposta
      FROM apostas a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.partida_id = ?
      ORDER BY a.data_aposta ASC, a.id ASC
    `,
      [req.params.id],
    );

    /** Mesma convenção que getMatches: datas no banco em UTC → ISO com sufixo Z. */
    const dbUtcToISO = (v) => {
      if (!v) return null;
      const s = String(v).trim().replace(" ", "T");
      return new Date(s.endsWith("Z") ? s : s + "Z").toISOString();
    };

    const results = rows.map((row) => ({
      id: row.id,
      nome_completo: row.nome_completo,
      valor_pago: row.valor_pago,
      status: row.status,
      data_aposta: dbUtcToISO(row.data_aposta),
    }));
    res.json(results);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_BETS_REPORT", error);
    res.status(500).json({ error: "Erro." });
  }
};

exports.getPublicHistory = async (req, res) => {
  try {
    const [users] = await db.execute(
      "SELECT perfil, grupo_id FROM usuarios WHERE id = ?",
      [req.user.id],
    );
    if (users.length === 0) return res.json([]);

    const user = users[0];

    let sql = `SELECT p.id, p.titulo, p.banner, p.data_jogo, p.quantidade_premios, p.local,
              se.nome AS setor_evento_nome
       FROM partidas p
       LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
       WHERE p.status = 'FINALIZADA' `;
    const params = [];

    if (user.perfil !== "ADMIN") {
      sql += ` AND (p.grupo_id = ? OR p.grupo_id IS NULL) `;
      params.push(user.grupo_id || 0);
    }

    sql += ` ORDER BY p.data_jogo DESC LIMIT 20`;

    const [matches] = await db.execute(sql, params);

    if (matches.length === 0) {
      return res.json([]);
    }

    const matchIds = matches.map((m) => m.id);

    // Estatísticas agregadas por partida
    const [statsRows] = await db.execute(
      `
        SELECT 
          partida_id,
          COUNT(id) as total_lances,
          COUNT(DISTINCT usuario_id) as total_participantes,
          SUM(valor_pago) as total_pontos,
          AVG(valor_pago) as media_pontos
        FROM apostas
        WHERE partida_id IN (${matchIds.map(() => "?").join(",")})
        GROUP BY partida_id
      `,
      matchIds,
    );

    // Vencedores de todas as partidas em uma única consulta (com foto do usuário)
    const [winnerRows] = await db.execute(
      `
        SELECT 
          a.partida_id,
          u.id as usuario_id,
          u.nome_completo,
          u.foto,
          a.valor_pago
        FROM apostas a
        JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.partida_id IN (${matchIds.map(() => "?").join(",")})
          AND a.status = 'GANHOU'
        ORDER BY a.partida_id ASC, a.valor_pago DESC
      `,
      matchIds,
    );

    // Todas as apostas de cada partida (para exibir no histórico), ordenadas por valor
    const [allBetsRows] = await db.execute(
      `
        SELECT 
          a.partida_id,
          u.id as usuario_id,
          u.nome_completo,
          u.foto,
          a.valor_pago,
          a.status
        FROM apostas a
        JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.partida_id IN (${matchIds.map(() => "?").join(",")})
        ORDER BY a.partida_id ASC, a.valor_pago DESC, a.id ASC
      `,
      matchIds,
    );

    const statsMap = new Map();
    for (const row of statsRows) {
      statsMap.set(row.partida_id, {
        total_lances: row.total_lances || 0,
        total_participantes: row.total_participantes || 0,
        total_pontos: row.total_pontos || 0,
        media_pontos: Math.round(row.media_pontos || 0),
      });
    }

    const winnersMap = new Map();
    for (const row of winnerRows) {
      if (!winnersMap.has(row.partida_id)) {
        winnersMap.set(row.partida_id, []);
      }
      winnersMap.get(row.partida_id).push({
        id: row.usuario_id,
        nome: row.nome_completo,
        valor: row.valor_pago,
        foto: row.foto || null,
      });
    }

    const apostasMap = new Map();
    for (const row of allBetsRows) {
      if (!apostasMap.has(row.partida_id)) {
        apostasMap.set(row.partida_id, []);
      }
      apostasMap.get(row.partida_id).push({
        id: row.usuario_id,
        nome: row.nome_completo,
        valor: row.valor_pago,
        foto: row.foto || null,
        status: row.status || "PENDENTE",
      });
    }

    const history = matches.map((match) => ({
      ...match,
      stats: statsMap.get(match.id) || {
        total_lances: 0,
        total_participantes: 0,
        total_pontos: 0,
        media_pontos: 0,
      },
      winners: winnersMap.get(match.id) || [],
      apostas: apostasMap.get(match.id) || [],
    }));

    res.json(history);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_PUBLIC_HISTORY", error);
    res.status(500).json({ error: "Erro ao carregar o mural de histórico." });
  }
};

exports.getBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      "SELECT banner_data, banner_tipo FROM partidas WHERE id = ? AND banner_data IS NOT NULL",
      [id],
    );
    if (!rows.length || !rows[0].banner_data) {
      return res.status(404).send();
    }
    const tipo = rows[0].banner_tipo || "image/jpeg";
    res.setHeader("Content-Type", tipo);
    res.send(rows[0].banner_data);
  } catch (error) {
    await logErro("MATCH_CONTROLLER_GET_BANNER", error);
    res.status(500).send();
  }
};

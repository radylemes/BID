const db = require("../config/db");

// ============================================================
// MOTOR DE AUDITORIA GLOBAL INVISÍVEL
// ============================================================
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
        JSON.stringify(detalhes),
      ],
    );
  } catch (e) {
    console.error("Falha ao gravar auditoria no MatchController:", e.message);
  }
}

const formatarDataLocal = (dataString) => {
  if (!dataString) return null;
  if (dataString instanceof Date) {
    const offset = dataString.getTimezoneOffset() * 60000;
    const localDate = new Date(dataString.getTime() - offset);
    return localDate.toISOString().slice(0, 19).replace("T", " ");
  }
  return dataString.slice(0, 19).replace("T", " ");
};

exports.getGroups = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nome, descricao FROM grupos ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar grupos." });
  }
};

exports.getMatches = async (req, res) => {
  const { userId } = req.query;
  try {
    const [users] = await db.execute(
      "SELECT perfil, grupo_id FROM usuarios WHERE id = ?",
      [userId],
    );
    if (users.length === 0) return res.json([]);
    const user = users[0];

    // ATUALIZAÇÃO ARQUITETURAL: 'raw_ingressos' agora varre a tabela de Ingressos Reais
    let sql = `
      SELECT p.*, g.nome as nome_grupo,
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
      WHERE 1=1 
    `;

    // 4 Parâmetros para os 4 SELECTS embutidos na Query
    const params = [userId, userId, userId, userId];

    if (user.perfil !== "ADMIN") {
      sql += ` AND (p.grupo_id = ? OR p.grupo_id IS NULL) `;
      params.push(user.grupo_id || 0);
    }

    sql += ` ORDER BY p.data_jogo DESC`;
    const [rows] = await db.execute(sql, params);

    const results = rows.map((row) => ({
      ...row,
      data_evento: row.data_jogo,
      titulo: row.titulo || "Evento sem título",
      quantidade_premios: row.quantidade_premios || 1,
      raw_lances: row.meus_lances_detalhados,
      raw_ingressos: row.raw_ingressos,
      status: row.status || "ABERTA",
    }));
    res.json(results);
  } catch (error) {
    console.error("Erro em getMatches:", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

exports.createMatch = async (req, res) => {
  try {
    const {
      titulo,
      banner,
      local,
      data_jogo,
      data_inicio_apostas,
      data_limite_aposta,
      quantidade_premios,
      grupo_id,
      adminId,
      motivo,
      banner_existente,
    } = req.body;

    const grupoIdFinal =
      grupo_id && String(grupo_id) !== "null" ? grupo_id : null;
    if (!data_jogo)
      return res.status(400).json({ error: "Data do evento obrigatória." });

    const inicioFormatado = data_inicio_apostas
      ? formatarDataLocal(data_inicio_apostas)
      : formatarDataLocal(new Date().toISOString());

    let bannerPath = banner_existente || banner || "";
    if (req.file) {
      bannerPath = req.file.path.replace(/\\/g, "/");
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO partidas (titulo, banner, local, data_jogo, data_inicio_apostas, data_limite_aposta, quantidade_premios, grupo_id, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABERTA')`,
        [
          titulo,
          bannerPath,
          local || "Local a definir",
          formatarDataLocal(data_jogo),
          inicioFormatado,
          formatarDataLocal(data_limite_aposta),
          quantidade_premios || 1,
          grupoIdFinal,
        ],
      );

      const novoBidId = result.insertId;

      if (adminId) {
        await connection.execute(
          `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
          [adminId, adminId, `Admin: Criou BID #${novoBidId} (${titulo})`],
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
    res.status(500).json({ error: "Erro ao criar." });
  }
};

exports.updateMatch = async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    banner,
    local,
    data_jogo,
    data_inicio_apostas,
    data_limite_aposta,
    quantidade_premios,
    grupo_id,
    adminId,
    motivo,
    banner_existente,
  } = req.body;

  const grupoIdFinal =
    grupo_id && String(grupo_id) !== "null" ? grupo_id : null;
  if (!data_jogo)
    return res.status(400).json({ error: "Data do evento obrigatória." });

  let bannerPath = banner_existente || banner || "";
  if (req.file) {
    bannerPath = req.file.path.replace(/\\/g, "/");
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE partidas SET titulo = ?, banner = ?, local = ?, data_jogo = ?, data_inicio_apostas = ?, data_limite_aposta = ?, quantidade_premios = ?, grupo_id = ? WHERE id = ?`,
      [
        titulo,
        bannerPath,
        local || "Local a definir",
        formatarDataLocal(data_jogo),
        formatarDataLocal(data_inicio_apostas),
        formatarDataLocal(data_limite_aposta),
        quantidade_premios || 1,
        grupoIdFinal,
        id,
      ],
    );

    if (result.affectedRows === 0) throw new Error("Evento não encontrado.");

    if (adminId) {
      await connection.execute(
        `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
        [adminId, adminId, `Admin: Editou BID #${id} (${titulo})`],
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

    if (match.status !== "ABERTA")
      throw new Error("Este evento não está aberto para lances.");
    if (agora < new Date(match.data_inicio_apostas))
      throw new Error("O período de lances ainda não iniciou.");
    if (agora > new Date(match.data_limite_aposta))
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
        `BID: ${match.titulo}`.slice(0, 45),
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
    res.status(400).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

exports.finishMatch = async (req, res) => {
  const { partidaId, adminId, motivo } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [matches] = await connection.execute(
      "SELECT titulo, quantidade_premios FROM partidas WHERE id = ?",
      [partidaId],
    );
    if (matches.length === 0) throw new Error("Partida não encontrada");
    const match = matches[0];
    const qtdPremios = match.quantidade_premios || 1;

    const [apostasRaw] = await connection.execute(
      "SELECT id, usuario_id, valor_pago FROM apostas WHERE partida_id = ?",
      [partidaId],
    );
    const apostas = apostasRaw
      .map((a) => ({ ...a, valor_pago: Number(a.valor_pago) }))
      .sort((a, b) => {
        if (b.valor_pago !== a.valor_pago) return b.valor_pago - a.valor_pago;
        return a.id - b.id;
      });

    const vencedores = apostas.slice(0, qtdPremios);
    const perdedores = apostas.slice(qtdPremios);

    for (const win of vencedores) {
      await connection.execute(
        "UPDATE apostas SET status = 'GANHOU' WHERE id = ?",
        [win.id],
      );

      // INSERÇÃO NA NOVA TABELA: Criação do Ingresso Físico para a Portaria
      await connection.execute(
        "INSERT INTO ingressos (aposta_id, usuario_id) VALUES (?, ?)",
        [win.id, win.usuario_id],
      );

      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)",
        [
          win.usuario_id,
          adminId || 1,
          `VITORIA BID: ${match.titulo} (Lance: ${win.valor_pago})`,
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
          `REEMBOLSO BID: ${match.titulo}`,
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
        vencedores: vencedores.length,
        reembolsados: perdedores.length,
        motivo: motivo || "Sorteio e encerramento do evento",
      },
    );

    await connection.commit();
    res.json({ message: "Sorteio realizado!" });
  } catch (error) {
    await connection.rollback();
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
            `REEMBOLSO CANCELAMENTO BID: ${match.titulo}`,
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
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.getBalance = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [req.params.userId],
    );
    res.json({ pontos: rows[0].pontos });
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
};

exports.getMatchWinnersReport = async (req, res) => {
  try {
    // ATUALIZAÇÃO NO RELATÓRIO: Cruzamento das tabelas de Apostas e Ingressos
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
    res.status(500).json({ error: "Erro." });
  }
};

exports.getPublicHistory = async (req, res) => {
  try {
    console.log("🔍 [HISTÓRICO] Frontend pediu a lista de BIDs finalizados...");

    // 1. Busca os eventos já finalizados
    const [matches] = await db.execute(`
      SELECT id, titulo, banner, data_jogo, quantidade_premios
      FROM partidas
      WHERE status = 'FINALIZADA'
      ORDER BY data_jogo DESC
      LIMIT 20
    `);

    console.log(
      `✅ [HISTÓRICO] Encontrados ${matches.length} eventos finalizados no banco.`,
    );

    const history = [];

    // 2. Para cada evento, calcula as estatísticas e busca os vencedores
    for (let match of matches) {
      const [stats] = await db.execute(
        `
        SELECT 
          COUNT(id) as total_lances,
          COUNT(DISTINCT usuario_id) as total_participantes,
          SUM(valor_pago) as total_pontos,
          AVG(valor_pago) as media_pontos
        FROM apostas
        WHERE partida_id = ?
      `,
        [match.id],
      );

      // Removi a coluna 'u.foto' temporariamente caso ela seja o motivo de um possível crash SQL
      const [winners] = await db.execute(
        `
        SELECT u.nome_completo, a.valor_pago
        FROM apostas a
        JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.partida_id = ? AND a.status = 'GANHOU'
        ORDER BY a.valor_pago DESC
      `,
        [match.id],
      );

      history.push({
        ...match,
        stats: {
          total_lances: stats[0].total_lances || 0,
          total_participantes: stats[0].total_participantes || 0,
          total_pontos: stats[0].total_pontos || 0,
          media_pontos: Math.round(stats[0].media_pontos || 0),
        },
        winners: winners.map((w) => ({
          nome: w.nome_completo,
          valor: w.valor_pago,
        })),
      });
    }

    console.log(
      "🚀 [HISTÓRICO] Dados processados com sucesso. Enviando para o Frontend!",
    );
    res.json(history);
  } catch (error) {
    console.error("❌ [ERRO FATAL NO HISTÓRICO]:", error);
    res.status(500).json({ error: "Erro ao carregar o mural de histórico." });
  }
};

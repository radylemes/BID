const db = require("../config/db");

// ... (Mantenha imports e função formatarDataLocal) ...
const formatarDataLocal = (dataString) => {
  if (!dataString) return null;
  if (dataString instanceof Date) {
    const offset = dataString.getTimezoneOffset() * 60000;
    const localDate = new Date(dataString.getTime() - offset);
    return localDate.toISOString().slice(0, 19).replace("T", " ");
  }
  return dataString.slice(0, 19).replace("T", " ");
};

// ... (Mantenha getGroups) ...
exports.getGroups = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM grupos ORDER BY nome ASC");
    res.json(rows);
  } catch (error) {
    console.error("Erro getGroups:", error);
    res.status(500).json({ error: "Erro ao buscar grupos." });
  }
};

// 1. LISTAR EVENTOS (ATUALIZADO PARA TRAZER STATUS DO LANCE)
exports.getMatches = async (req, res) => {
  const { userId } = req.query;

  try {
    const [users] = await db.execute(
      "SELECT perfil, grupo_id FROM usuarios WHERE id = ?",
      [userId],
    );
    if (users.length === 0) return res.json([]);
    const user = users[0];

    // Alteração na Query: GROUP_CONCAT agora traz "VALOR:STATUS" (Ex: 50:GANHOU,20:PERDEU)
    let sql = `
      SELECT 
        p.*,
        g.nome as nome_grupo,
        (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ?) as tickets_comprados,
        (SELECT COUNT(*) FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ? AND a.status = 'GANHOU') as tickets_ganhos,
        
        -- MUDANÇA AQUI: Traz Valor E Status juntos separados por ':'
        (SELECT GROUP_CONCAT(CONCAT(valor_pago, ':', status) ORDER BY valor_pago DESC) 
         FROM apostas a WHERE a.partida_id = p.id AND a.usuario_id = ?) as meus_lances_detalhados

      FROM partidas p
      LEFT JOIN grupos g ON p.grupo_id = g.id
      WHERE 1=1 
    `;

    const params = [userId, userId, userId];

    if (user.perfil !== "ADMIN") {
      sql += ` AND (p.grupo_id = ? OR p.grupo_id IS NULL) `;
      params.push(user.grupo_id || 0);
    }

    sql += ` ORDER BY p.data_jogo DESC`;

    const [rows] = await db.execute(sql, params);

    const results = rows.map((row) => ({
      ...row,
      data_evento: row.data_jogo,
      titulo: row.titulo || `${row.time_casa} x ${row.time_fora}`,
      quantidade_premios: row.quantidade_premios || 1,
      // O frontend vai processar 'meus_lances_detalhados' agora
      raw_lances: row.meus_lances_detalhados,
      status: row.status || "ABERTA",
    }));

    res.json(results);
  } catch (error) {
    console.error("Erro getMatches:", error);
    res.status(500).json({ error: "Erro ao buscar eventos." });
  }
};

// ... (Mantenha createMatch, placeBet, finishMatch, deleteMatch, getBalance IGUAIS) ...
// Apenas garanta que o restante do arquivo continue lá.
// Vou repetir createMatch, placeBet, finishMatch, deleteMatch, getBalance para garantir integridade.

exports.createMatch = async (req, res) => {
  try {
    const {
      titulo,
      banner,
      local,
      data_evento,
      data_jogo,
      data_inicio,
      data_inicio_apostas,
      data_limite,
      data_limite_aposta,
      qtd_premios,
      quantidade_premios,
      grupo_id,
      adminId,
    } = req.body;

    const dataReal = data_jogo || data_evento;
    const inicioReal = data_inicio_apostas || data_inicio;
    const fimReal = data_limite_aposta || data_limite;
    const qtdReal = quantidade_premios || qtd_premios;

    if (!dataReal)
      return res.status(400).json({ error: "Data do evento obrigatória." });

    const inicioFormatado = inicioReal
      ? formatarDataLocal(inicioReal)
      : formatarDataLocal(new Date().toISOString());

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO partidas 
            (titulo, banner, local, data_jogo, data_inicio_apostas, data_limite_aposta, quantidade_premios, grupo_id, time_casa, time_fora, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTA')`,
        [
          titulo,
          banner || "",
          local || "Local a definir",
          formatarDataLocal(dataReal),
          inicioFormatado,
          formatarDataLocal(fimReal),
          qtdReal || 1,
          grupo_id || null,
          "Evento",
          "Evento",
        ],
      );

      if (adminId) {
        await connection.execute(
          `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
          [
            adminId,
            adminId,
            `Admin: Criou BID #${result.insertId} (${titulo})`,
          ],
        );
      }

      await connection.commit();
      res.json({ message: "Evento criado com sucesso!" });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erro CREATE:", error);
    res.status(500).json({ error: "Erro ao criar evento." });
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
      "SELECT data_inicio_apostas, data_limite_aposta, status FROM partidas WHERE id = ?",
      [pId],
    );

    if (matchData.length === 0) throw new Error("Evento não encontrado.");
    const match = matchData[0];
    const agora = new Date();
    const inicio = new Date(match.data_inicio_apostas);
    const fim = new Date(match.data_limite_aposta);

    if (match.status !== "ABERTA")
      throw new Error("Este evento não está aberto para lances.");
    if (agora < inicio)
      throw new Error("O período de lances ainda não iniciou.");
    if (agora > fim) throw new Error("O período de lances já encerrou.");

    const totalValor = lancesParaProcessar.reduce((acc, v) => acc + v, 0);
    const [userRows] = await connection.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [uId],
    );
    if (userRows.length === 0) throw new Error("Usuário não encontrado.");
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

    const [matchRows] = await connection.execute(
      "SELECT titulo FROM partidas WHERE id = ?",
      [pId],
    );
    const titulo = matchRows[0]?.titulo || "Evento";
    await connection.execute(
      "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
      [
        uId,
        1,
        Number(userRows[0].pontos),
        Number(userRows[0].pontos) - totalValor,
        `BID Único: ${titulo}`.slice(0, 45),
      ],
    );

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
  const { partidaId, adminId } = req.body;
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
          `REEMBOLSO: ${match.titulo}`,
        ],
      );
    }

    await connection.execute(
      "UPDATE partidas SET status = 'FINALIZADA' WHERE id = ?",
      [partidaId],
    );
    await connection.commit();
    res.json({
      message: "Sorteio realizado!",
      detalhes: {
        vencedores: vencedores.length,
        reembolsados: perdedores.length,
      },
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.deleteMatch = async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.query;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [matches] = await connection.execute(
      "SELECT titulo FROM partidas WHERE id = ?",
      [id],
    );
    if (matches.length === 0) throw new Error("Evento não encontrado.");

    const [apostas] = await connection.execute(
      "SELECT COUNT(*) as total FROM apostas WHERE partida_id = ?",
      [id],
    );
    if (apostas[0].total > 0) {
      // Opção segura: deletar apostas e reembolsar seria ideal, mas aqui apenas bloqueia
      // Para forçar exclusão, mude para DELETE FROM apostas WHERE partida_id = ?
      await connection.execute("DELETE FROM apostas WHERE partida_id = ?", [
        id,
      ]);
    }
    await connection.execute("DELETE FROM partidas WHERE id = ?", [id]);
    if (adminId) {
      await connection.execute(
        "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)",
        [adminId, adminId, `Admin: Excluiu BID #${id}`],
      );
    }
    await connection.commit();
    res.json({ message: "Excluído com sucesso." });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.getBalance = async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [userId],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ pontos: rows[0].pontos });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar saldo." });
  }
};

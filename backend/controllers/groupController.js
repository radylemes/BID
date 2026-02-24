const db = require("../config/db");

// ============================================================
// MOTOR DE AUDITORIA GLOBAL
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
    console.error("Falha ao gravar auditoria no GroupController:", e.message);
  }
}

// ============================================================
// 1. LISTAR GRUPOS DE APOSTAS (Com contagem de membros)
// ============================================================
exports.getAllGroups = async (req, res) => {
  try {
    // Busca os grupos e já conta quantos usuários pertencem a cada um
    const [grupos] = await db.execute(`
      SELECT g.id, g.nome, g.descricao, COUNT(u.id) as total_membros
      FROM grupos g
      LEFT JOIN usuarios u ON u.grupo_id = g.id
      GROUP BY g.id, g.nome, g.descricao
      ORDER BY g.nome ASC
    `);

    res.json(grupos);
  } catch (error) {
    console.error("Erro ao buscar grupos de apostas:", error);
    res.status(500).json({ error: "Erro ao buscar dados." });
  }
};

// ============================================================
// 2. CRIAR GRUPO DE APOSTA
// ============================================================
exports.createGroup = async (req, res) => {
  const { nome, descricao, motivo, adminId } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      "INSERT INTO grupos (nome, descricao) VALUES (?, ?)", // AGORA SALVA NO LUGAR CERTO!
      [nome, descricao || ""],
    );

    const newId = result.insertId;

    await gravarAuditoria(
      connection,
      adminId,
      "GRUPOS_APOSTAS",
      "CREATE_GRUPO",
      newId,
      { nome, descricao, motivo },
    );

    await connection.commit();
    res
      .status(201)
      .json({ id: newId, nome, descricao, message: "Grupo criado!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro ao criar grupo" });
  } finally {
    connection.release();
  }
};

// ============================================================
// 3. EDITAR GRUPO DE APOSTA
// ============================================================
exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, motivo, adminId } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(
      "UPDATE grupos SET nome = ?, descricao = ? WHERE id = ?",
      [nome, descricao, id],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "GRUPOS_APOSTAS",
      "UPDATE_GRUPO",
      id,
      { nome, descricao, motivo },
    );

    await connection.commit();
    res.json({ message: "Grupo atualizado com sucesso" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 4. EXCLUIR GRUPO DE APOSTA
// ============================================================
exports.deleteGroup = async (req, res) => {
  const { id } = req.params;
  const { motivo, adminId } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute("DELETE FROM grupos WHERE id = ?", [id]);

    await gravarAuditoria(
      connection,
      adminId,
      "GRUPOS_APOSTAS",
      "DELETE_GRUPO",
      id,
      { excluido_por: adminId, motivo },
    );

    await connection.commit();
    res.json({ message: "Grupo removido com sucesso" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// 5. RETORNO DO GRUPO DO USUÁRIO
// ============================================================
exports.getUserGroups = async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.execute(
      `
      SELECT g.id AS grupo_id, g.nome AS grupo_nome
      FROM usuarios u
      LEFT JOIN grupos g ON u.grupo_id = g.id
      WHERE u.id = ?
    `,
      [userId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar grupo do usuário" });
  }
};

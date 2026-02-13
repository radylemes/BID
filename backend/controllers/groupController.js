const db = require("../config/db");

// ============================================================
// 1. LISTAR TODOS OS GRUPOS (CORRIGIDO)
// ============================================================
exports.getAllGroups = async (req, res) => {
  try {
    // AQUI ESTAVA O ERRO: Trocamos 'grupo_membros' por 'usuarios'
    // Agora contamos quantos usuários apontam para este grupo via 'grupo_id'
    const [rows] = await db.execute(`
      SELECT 
        g.id,
        g.nome,
        g.descricao,
        COUNT(u.id) as total_membros 
      FROM grupos g
      LEFT JOIN usuarios u ON g.id = u.grupo_id
      GROUP BY g.id, g.nome, g.descricao
      ORDER BY g.nome ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({ error: "Erro ao buscar grupos" });
  }
};

// ============================================================
// 2. CRIAR NOVO GRUPO
// ============================================================
exports.createGroup = async (req, res) => {
  const { nome, descricao } = req.body;
  try {
    const [result] = await db.execute(
      "INSERT INTO grupos (nome, descricao) VALUES (?, ?)",
      [nome, descricao || ""],
    );
    res.json({
      id: result.insertId,
      nome,
      descricao,
      message: "Empresa criada!",
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar empresa" });
  }
};

// ============================================================
// 3. EDITAR GRUPO
// ============================================================
exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;
  try {
    await db.execute("UPDATE grupos SET nome = ?, descricao = ? WHERE id = ?", [
      nome,
      descricao,
      id,
    ]);
    res.json({ message: "Empresa atualizado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 4. EXCLUIR GRUPO
// ============================================================
exports.deleteGroup = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("UPDATE usuarios SET grupo_id = NULL WHERE grupo_id = ?", [
      id,
    ]);

    await db.execute("DELETE FROM grupos WHERE id = ?", [id]);
    res.json({ message: "Empresa removido com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 5. LISTAR GRUPO DE UM USUÁRIO (OPCIONAL/LEGADO)
// ============================================================
exports.getUserGroups = async (req, res) => {
  const { userId } = req.params;
  try {
    // Ajustado para buscar o grupo único do usuário na tabela nova
    const [rows] = await db.execute(
      `
        SELECT g.* FROM grupos g
        JOIN usuarios u ON u.grupo_id = g.id
        WHERE u.id = ?
      `,
      [userId],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar empresa do usuário" });
  }
};

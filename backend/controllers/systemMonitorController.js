const db = require("../config/db");

exports.getErrors = async (req, res) => {
  try {
    // Busca os erros, ordenando primeiro os não resolvidos e depois os mais recentes
    const [rows] = await db.query(`
      SELECT * FROM logs_erros 
      ORDER BY resolvido ASC, criado_em DESC 
      LIMIT 200
    `);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar logs de erros:", error);
    res.status(500).json({ error: "Erro interno ao carregar o monitor." });
  }
};

exports.resolveError = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(`UPDATE logs_erros SET resolvido = 1 WHERE id = ?`, [id]);
    res.json({ message: "Erro marcado como resolvido!" });
  } catch (error) {
    console.error("Erro ao resolver log de erro:", error);
    res.status(500).json({ error: "Erro ao atualizar o status do erro." });
  }
};

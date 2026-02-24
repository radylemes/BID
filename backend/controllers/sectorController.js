const db = require("../config/db");
const logErro = require("../utils/errorLogger");

exports.getAllSectors = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.id, s.nome, e.nome as empresa_nome 
      FROM setores s
      LEFT JOIN empresas e ON s.empresa_id = e.id
      ORDER BY e.nome ASC, s.nome ASC
    `);
    res.json(rows);
  } catch (error) {
    await logErro("SECTOR_CONTROLLER_GET_ALL", error);
    res.status(500).json({ error: "Erro ao buscar setores." });
  }
};

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

/** Retorna empresas com setores aninhados para organograma (ex.: modal Atribuir Grupo em Lote). */
exports.getEmpresasComSetores = async (req, res) => {
  try {
    const [empresas] = await db.query(
      "SELECT id, nome FROM empresas ORDER BY nome ASC"
    );
    const [setores] = await db.query(
      "SELECT id, nome, empresa_id FROM setores ORDER BY nome ASC"
    );

    const resultado = empresas.map((e) => ({
      id: e.id,
      nome: e.nome,
      setores: setores
        .filter((s) => s.empresa_id === e.id)
        .map((s) => ({ id: s.id, nome: s.nome })),
    }));

    res.json(resultado);
  } catch (error) {
    await logErro("SECTOR_CONTROLLER_ORGANOGRAMA", error);
    res.status(500).json({ error: "Erro ao buscar organograma." });
  }
};

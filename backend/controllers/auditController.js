const db = require("../config/db");
const logErro = require("../utils/errorLogger");

exports.getLogs = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.modulo, a.acao, a.registro_id, a.detalhes, a.criado_em as data_hora, 
             u.nome_completo as admin_nome 
      FROM auditoria a
      LEFT JOIN usuarios u ON a.admin_id = u.id
      ORDER BY a.criado_em DESC
      LIMIT 500
    `);

    const logsFormatados = rows.map((row) => {
      let detalhesObj = {};
      try {
        detalhesObj = row.detalhes ? JSON.parse(row.detalhes) : {};
      } catch (e) {
        detalhesObj = { raw: row.detalhes };
      }
      return { ...row, detalhes: detalhesObj };
    });

    res.json(logsFormatados);
  } catch (error) {
    await logErro("AUDIT_CONTROLLER_GET_LOGS", error);
    res.status(500).json({ error: "Erro interno ao carregar a auditoria." });
  }
};

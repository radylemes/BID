const db = require("../config/db");

exports.getLogs = async (req, res) => {
  try {
    // Busca os últimos 500 logs, convertendo criado_em para data_hora para o Frontend entender
    const [rows] = await db.query(`
      SELECT a.id, a.modulo, a.acao, a.registro_id, a.detalhes, a.criado_em as data_hora, 
             u.nome_completo as admin_nome 
      FROM auditoria a
      LEFT JOIN usuarios u ON a.admin_id = u.id
      ORDER BY a.criado_em DESC
      LIMIT 500
    `);

    // Tenta converter os detalhes (que estão em string JSON) de volta para Objeto para o Frontend
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
    console.error("Erro ao buscar logs de auditoria:", error);
    res.status(500).json({ error: "Erro interno ao carregar a auditoria." });
  }
};

const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

async function gravarAuditoria(adminId, modulo, acao, registroId, detalhes) {
  try {
    await db.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [adminId || 1, modulo, acao, registroId || null, safeAuditoriaDetalhes(detalhes)]
    );
  } catch (e) {
    await logErro("SYSTEM_MONITOR_GRAVAR_AUDITORIA", e);
  }
}

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
    await logErro("SYSTEM_MONITOR_GET_ERRORS", error);
    res.status(500).json({ error: "Erro interno ao carregar o monitor." });
  }
};

exports.resolveError = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute(`UPDATE logs_erros SET resolvido = 1 WHERE id = ?`, [id]);
    await gravarAuditoria(req.user?.id, "SYSTEM_MONITOR", "RESOLVE_ERROR", id, { log_id: id });
    res.json({ message: "Erro marcado como resolvido!" });
  } catch (error) {
    await logErro("SYSTEM_MONITOR_RESOLVE_ERROR", error);
    res.status(500).json({ error: "Erro ao atualizar o status do erro." });
  }
};

exports.clearErrorHistory = async (req, res) => {
  try {
    await db.execute(`DELETE FROM logs_erros`);
    await gravarAuditoria(req.user?.id, "SYSTEM_MONITOR", "CLEAR_ERROR_HISTORY", null, {});
    res.json({ message: "Histórico de erros limpo com sucesso." });
  } catch (error) {
    await logErro("SYSTEM_MONITOR_CLEAR_HISTORY", error);
    res.status(500).json({ error: "Erro ao limpar o histórico de erros." });
  }
};

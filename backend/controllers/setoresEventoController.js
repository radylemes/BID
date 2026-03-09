const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

async function gravarAuditoria(connection, adminId, modulo, acao, registroId, detalhes) {
  try {
    const executor = connection || db;
    await executor.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [adminId || 1, modulo, acao, registroId || null, safeAuditoriaDetalhes(detalhes)],
    );
  } catch (e) {
    await logErro("SETORES_EVENTO_GRAVAR_AUDITORIA", e);
  }
}

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nome, criado_em FROM setores_evento ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    await logErro("SETORES_EVENTO_GET_ALL", error);
    res.status(500).json({ error: "Erro ao buscar setores de evento." });
  }
};

exports.create = async (req, res) => {
  const { nome, adminId } = req.body;
  if (!nome || typeof nome !== "string" || !nome.trim()) {
    return res.status(400).json({ error: "Nome do setor é obrigatório." });
  }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      "INSERT INTO setores_evento (nome) VALUES (?)",
      [nome.trim()],
    );
    const id = result.insertId;
    await gravarAuditoria(connection, adminId, "SETORES_EVENTO", "CREATE", id, {
      nome: nome.trim(),
      motivo: `Criação do setor de evento: ${nome.trim()}`,
    });
    await connection.commit();
    res.status(201).json({ id, nome: nome.trim() });
  } catch (error) {
    await connection.rollback();
    await logErro("SETORES_EVENTO_CREATE", error);
    res.status(500).json({ error: "Erro ao criar setor de evento." });
  } finally {
    connection.release();
  }
};

exports.deleteOne = async (req, res) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ error: "ID inválido." });
  }
  try {
    const [rows] = await db.execute("SELECT id, nome FROM setores_evento WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Setor não encontrado." });
    }
    const nome = rows[0].nome;
    await db.execute("DELETE FROM setores_evento WHERE id = ?", [id]);
    await gravarAuditoria(null, req.user?.id, "SETORES_EVENTO", "DELETE", id, { nome });
    res.json({ message: "Setor excluído. BIDs que o usavam ficarão sem setor." });
  } catch (error) {
    await logErro("SETORES_EVENTO_DELETE", error);
    res.status(500).json({ error: "Erro ao excluir setor de evento." });
  }
};

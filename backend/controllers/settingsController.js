const db = require("../config/db");

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
    console.error("Falha ao gravar auditoria nas Configurações:", e.message);
  }
}

exports.getSettings = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT chave, valor FROM configuracoes");
    const settings = rows.reduce((acc, curr) => {
      acc[curr.chave] = curr.valor;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    res.status(500).json({ error: "Erro ao carregar configurações" });
  }
};

exports.updateSettings = async (req, res) => {
  const { adminId, ...settings } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const chave in settings) {
      await connection.execute(
        "UPDATE configuracoes SET valor = ? WHERE chave = ?",
        [String(settings[chave]), chave],
      );
    }

    await gravarAuditoria(
      connection,
      adminId,
      "CONFIG_SISTEMA",
      "UPDATE_SETTINGS",
      null,
      settings,
    );

    await connection.commit();
    res.json({ message: "Configurações atualizadas com sucesso!" });
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao atualizar configurações:", error);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  } finally {
    connection.release();
  }
};

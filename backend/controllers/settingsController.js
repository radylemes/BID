const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

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
        safeAuditoriaDetalhes(detalhes),
      ],
    );
  } catch (e) {
    await logErro("SETTINGS_CONTROLLER_GRAVAR_AUDITORIA", e);
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
    await logErro("SETTINGS_CONTROLLER_GET_SETTINGS", error);
    res.status(500).json({ error: "Erro ao carregar configurações" });
  }
};

/** Configurações de exportação (PDF/Excel e timbrado) - disponível para qualquer utilizador autenticado. */
exports.getExportSettings = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT chave, valor FROM configuracoes WHERE chave IN ('export_lista_portaria_fields', 'export_usuarios_fields', 'export_pdf_use_letterhead', 'export_pdf_letterhead_path', 'export_pdf_style')",
    );
    const settings = rows.reduce((acc, curr) => {
      acc[curr.chave] = curr.valor;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    await logErro("SETTINGS_CONTROLLER_GET_EXPORT_SETTINGS", error);
    res.status(500).json({ error: "Erro ao carregar configurações de exportação" });
  }
};

exports.updateSettings = async (req, res) => {
  const { adminId, ...settings } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    for (const chave in settings) {
      await connection.execute(
        "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [chave, String(settings[chave])],
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
    await logErro("SETTINGS_CONTROLLER_UPDATE_SETTINGS", error);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  } finally {
    connection.release();
  }
};

exports.getLetterhead = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT valor FROM configuracoes WHERE chave = 'export_pdf_letterhead_path' LIMIT 1",
    );
    const pathVal = rows[0]?.valor;
    if (!pathVal) {
      return res.status(404).json({ error: "Papel timbrado não configurado." });
    }
    const pathValNorm = pathVal.replace(/\\/g, "/").trim();
    const fullPath = path.join(__dirname, "..", "uploads", ...pathValNorm.split("/"));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Ficheiro do timbrado não encontrado." });
    }
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "application/pdf";
    res.setHeader("Content-Type", contentType);
    res.sendFile(path.resolve(fullPath));
  } catch (error) {
    await logErro("SETTINGS_CONTROLLER_GET_LETTERHEAD", error);
    res.status(500).json({ error: "Erro ao obter papel timbrado." });
  }
};

const ALLOWED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

async function upsertConfig(connection, chave, valor) {
  await connection.execute(
    "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
    [chave, String(valor)],
  );
}

exports.uploadLetterhead = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Nenhum ficheiro enviado." });
  }
  const mimetype = req.file.mimetype || "";
  const ext = path.extname(req.file.originalname || "").toLowerCase();
  if (!ALLOWED_MIMES.includes(mimetype) || !ALLOWED_EXT.includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({
      error: "Formato não permitido. Use PDF, PNG ou JPG.",
    });
  }
  const relativePath = path.join("letterhead", path.basename(req.file.path)).replace(/\\/g, "/");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await upsertConfig(connection, "export_pdf_letterhead_path", relativePath.replace(/\\/g, "/"));
    await upsertConfig(connection, "export_pdf_use_letterhead", "1");
    await gravarAuditoria(
      connection,
      req.body?.adminId || req.user?.id,
      "CONFIG_SISTEMA",
      "UPLOAD_LETTERHEAD",
      null,
      { path: relativePath },
    );
    await connection.commit();
    res.json({ path: relativePath, message: "Papel timbrado atualizado." });
  } catch (error) {
    await connection.rollback();
    await logErro("SETTINGS_CONTROLLER_UPLOAD_LETTERHEAD", error);
    res.status(500).json({ error: "Erro ao guardar papel timbrado." });
  } finally {
    connection.release();
  }
};

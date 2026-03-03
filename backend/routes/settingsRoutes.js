const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const settingsController = require("../controllers/settingsController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const letterheadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "letterhead");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = (path.extname(file.originalname) || ".pdf").toLowerCase();
    cb(null, "letterhead-" + uniqueSuffix + ext);
  },
});
const uploadLetterhead = multer({ storage: letterheadStorage });

// Busca as configurações atuais (ADMIN)
router.get("/", authMiddleware, authorizeRoles("ADMIN"), settingsController.getSettings);

// Configurações de exportação (qualquer utilizador autenticado - para PDF/Excel e timbrado)
router.get("/export", authMiddleware, settingsController.getExportSettings);

// Atualiza as configurações (ADMIN)
router.post(
  "/",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.updateSettings,
);

// Upload papel timbrado (ADMIN) - PDF, PNG ou JPG
router.post(
  "/letterhead",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadLetterhead.single("letterhead_file"),
  settingsController.uploadLetterhead,
);

// Obter ficheiro do papel timbrado (qualquer utilizador autenticado, para usar na exportação PDF)
router.get("/letterhead", authMiddleware, settingsController.getLetterhead);

module.exports = router;

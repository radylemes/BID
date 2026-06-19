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
const bidPolicyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "bid-policy");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "bid-policy-" + uniqueSuffix + ".pdf");
  },
});
const uploadBidPolicy = multer({ storage: bidPolicyStorage });
const wtPassPolicyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads", "wt-pass-policy");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "wt-pass-policy-" + uniqueSuffix + ".pdf");
  },
});
const uploadWtPassPolicy = multer({ storage: wtPassPolicyStorage });

// Busca as configurações atuais (ADMIN)
router.get("/", authMiddleware, authorizeRoles("ADMIN"), settingsController.getSettings);

// Configurações de exportação (qualquer utilizador autenticado - para PDF/Excel e timbrado)
router.get("/export", authMiddleware, settingsController.getExportSettings);

// Política de acesso dos lances (qualquer utilizador autenticado)
router.get("/bid-policy", authMiddleware, settingsController.getBidPolicy);
router.get("/bid-policy/document", authMiddleware, settingsController.getBidPolicyDocument);

// Política de acesso WT Pass (qualquer utilizador autenticado)
router.get("/wt-pass-policy", authMiddleware, settingsController.getWtPassPolicy);
router.get("/wt-pass-policy/document", authMiddleware, settingsController.getWtPassPolicyDocument);

// Configurações específicas do WT Pass (ADMIN)
router.get(
  "/wt-pass",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.getWtPassSettings,
);
router.post(
  "/wt-pass",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.updateWtPassSettings,
);


// Configurações de indicação de convidados
router.get("/guest-indication", authMiddleware, settingsController.getGuestIndicationSettings);
router.post(
  "/guest-indication",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.updateGuestIndicationSettings,
);

// Configurações da API de integração externa (ADMIN)
router.get(
  "/external-api",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.getExternalApiSettings,
);
router.post(
  "/external-api",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.updateExternalApiSettings,
);
router.post(
  "/external-api/regenerate",
  authMiddleware,
  authorizeRoles("ADMIN"),
  settingsController.regenerateExternalApiKey,
);

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

router.post(
  "/bid-policy/pdf",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadBidPolicy.single("bid_policy_file"),
  settingsController.uploadBidPolicyPdf,
);

router.post(
  "/wt-pass-policy/pdf",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadWtPassPolicy.single("wt_pass_policy_file"),
  settingsController.uploadWtPassPolicyPdf,
);

// Obter ficheiro do papel timbrado (qualquer utilizador autenticado, para usar na exportação PDF)
router.get("/letterhead", authMiddleware, settingsController.getLetterhead);

module.exports = router;

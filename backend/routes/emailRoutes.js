const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const emailController = require("../controllers/emailController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const EMAIL_INLINE_DIR = path.join(__dirname, "..", "uploads", "email-inline");
const EMAIL_ANEXOS_DIR = path.join(__dirname, "..", "uploads", "email-anexos");

const emailInlineStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(EMAIL_INLINE_DIR)) fs.mkdirSync(EMAIL_INLINE_DIR, { recursive: true });
    cb(null, EMAIL_INLINE_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `email-${uniqueSuffix}${ext}`);
  },
});

const emailAnexosStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(EMAIL_ANEXOS_DIR)) fs.mkdirSync(EMAIL_ANEXOS_DIR, { recursive: true });
    cb(null, EMAIL_ANEXOS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `anexo-${uniqueSuffix}${ext}`);
  },
});

const emailImageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Formato de imagem não suportado."), false);
};

const uploadEmailInline = multer({
  storage: emailInlineStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: emailImageFilter,
});

const uploadEmailAnexo = multer({
  storage: emailAnexosStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: emailImageFilter,
});

// Listas de e-mail (ADMIN)
router.get("/lists", authMiddleware, authorizeRoles("ADMIN"), emailController.getLists);
router.post("/lists", authMiddleware, authorizeRoles("ADMIN"), emailController.createList);
router.put("/lists/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.updateList);
router.delete("/lists/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.deleteList);
router.get("/lists/:listaId/itens", authMiddleware, authorizeRoles("ADMIN"), emailController.getListItens);
router.post("/lists/:listaId/itens", authMiddleware, authorizeRoles("ADMIN"), emailController.addListItem);
router.delete("/lists/:listaId/itens/:itemId", authMiddleware, authorizeRoles("ADMIN"), emailController.removeListItem);
router.post("/lists/:listaId/import-csv", authMiddleware, authorizeRoles("ADMIN"), uploadCsv.single("file"), emailController.importCsv);
router.post("/lists/:listaId/import-users", authMiddleware, authorizeRoles("ADMIN"), emailController.importUsers);

// Templates (ADMIN)
router.get("/templates", authMiddleware, authorizeRoles("ADMIN"), emailController.getTemplates);
router.post(
  "/templates/upload-image",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadEmailInline.single("file"),
  emailController.uploadTemplateImage
);
router.get("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.getTemplateById);
router.post("/templates", authMiddleware, authorizeRoles("ADMIN"), emailController.createTemplate);
router.put("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.updateTemplate);
router.delete("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.deleteTemplate);
router.get("/templates/:templateId/preview", authMiddleware, emailController.previewTemplate);
router.post("/templates/preview-draft", authMiddleware, emailController.previewDraft);
router.post("/templates/:templateId/test", authMiddleware, authorizeRoles("ADMIN"), emailController.testTemplate);

// Disparo (ADMIN)
router.post(
  "/disparo/upload-anexo",
  authMiddleware,
  authorizeRoles("ADMIN"),
  uploadEmailAnexo.single("file"),
  emailController.uploadDisparoAnexo
);
router.get("/partida/:partidaId/disparos-log", authMiddleware, authorizeRoles("ADMIN"), emailController.getDisparosLog);
router.get("/partida/:partidaId/pdf-ganhadores", authMiddleware, authorizeRoles("ADMIN"), emailController.getPdfGanhadores);
router.post("/send", authMiddleware, authorizeRoles("ADMIN"), emailController.sendEmails);
router.post("/send-stream", authMiddleware, authorizeRoles("ADMIN"), emailController.sendEmailsStream);

// Área de Ingressos (ADMIN)
router.post("/area-ingressos/preview", authMiddleware, authorizeRoles("ADMIN"), emailController.previewAreaIngressos);
router.post("/area-ingressos/send", authMiddleware, authorizeRoles("ADMIN"), emailController.sendAreaIngressos);
router.post("/area-ingressos/send-stream", authMiddleware, authorizeRoles("ADMIN"), emailController.sendAreaIngressosStream);

// Teste SMTP (ADMIN)
router.post("/test", authMiddleware, authorizeRoles("ADMIN"), emailController.testSmtp);

module.exports = router;

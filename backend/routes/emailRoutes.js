const express = require("express");
const router = express.Router();
const multer = require("multer");
const emailController = require("../controllers/emailController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

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
router.get("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.getTemplateById);
router.post("/templates", authMiddleware, authorizeRoles("ADMIN"), emailController.createTemplate);
router.put("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.updateTemplate);
router.delete("/templates/:id", authMiddleware, authorizeRoles("ADMIN"), emailController.deleteTemplate);
router.get("/templates/:templateId/preview", authMiddleware, emailController.previewTemplate);
router.post("/templates/preview-draft", authMiddleware, emailController.previewDraft);
router.post("/templates/:templateId/test", authMiddleware, authorizeRoles("ADMIN"), emailController.testTemplate);

// Disparo (ADMIN)
router.get("/partida/:partidaId/disparos-log", authMiddleware, authorizeRoles("ADMIN"), emailController.getDisparosLog);
router.get("/partida/:partidaId/pdf-ganhadores", authMiddleware, authorizeRoles("ADMIN"), emailController.getPdfGanhadores);
router.post("/send", authMiddleware, authorizeRoles("ADMIN"), emailController.sendEmails);

// Teste SMTP (ADMIN)
router.post("/test", authMiddleware, authorizeRoles("ADMIN"), emailController.testSmtp);

module.exports = router;

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configuração do destino da foto de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/avatars/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ==============================================================================
// ⚠️ ATENÇÃO: Rotas específicas DEVEM vir ANTES das rotas com parâmetro (/:id)
// ==============================================================================

// Sincronização e Importação
router.post("/sync", userController.syncUsers);
router.post("/import", userController.bulkUpdate);

// Ações em Lote (Pontos e Grupos)
router.post("/batch-points", userController.addBatchPoints);
router.post("/batch-group", userController.updateBatchGroup);

// Listagens Específicas
router.get("/grupos-apostas", userController.getGruposApostas); // <--- A ROTA QUE ESTAVA FALTANDO!

// ==============================================================================
// ROTAS PADRÃO (CRUD)
// ==============================================================================
router.get("/", userController.getAllUsers);
router.post("/", userController.createUser);

// Rotas com ID
router.get("/:id", userController.getUserById);
router.put("/:id", userController.updateUserManual);
router.put("/:id/perfil", userController.mudarPerfil);
router.delete("/:id", userController.deleteUser);

// Sub-rotas de um usuário específico
router.put("/:id/pontos", userController.updatePontos);
router.put("/:id/status", userController.toggleStatus);
router.put("/:id/grupo", userController.updateUserGroup);
router.get("/:id/historico", userController.getHistorico);

// Adicione junto das suas outras rotas:
router.post(
  "/upload-avatar",
  upload.single("avatar"),
  userController.uploadAvatar,
);
router.get("/:id/stats", userController.getUserStats);

module.exports = router;

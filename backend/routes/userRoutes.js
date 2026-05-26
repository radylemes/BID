const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createUserSchema,
  batchPointsSchema,
} = require("../validations/userSchema");

// Sempre relativo à pasta `backend/` (evita gravar noutro sítio se cwd ≠ backend — 404 em /api/uploads/…)
const AVATAR_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "avatars");

// Configuração do destino da foto de perfil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(AVATAR_UPLOAD_DIR)) fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ==============================================================================
// ⚠️ ATENÇÃO: Rotas específicas DEVEM vir ANTES das rotas com parâmetro (/:id)
// ==============================================================================

// Foto de perfil (multipart) — deve ficar antes de GET/POST "/" e de "/:id"
router.post(
  "/upload-avatar",
  authMiddleware,
  upload.single("avatar"),
  userController.uploadAvatar,
);

// Diagnóstico de conexão com os tenants Azure AD (ADMIN)
router.get("/tenants-status", authMiddleware, authorizeRoles("ADMIN"), userController.getTenantsStatus);

// Sincronização e Importação (ADMIN)
router.post("/sync", authMiddleware, authorizeRoles("ADMIN"), userController.syncUsers);
router.post("/import", authMiddleware, authorizeRoles("ADMIN"), userController.bulkUpdate);
router.post("/bulk-update", authMiddleware, authorizeRoles("ADMIN"), userController.bulkUpdate);

// Ações em Lote (Pontos e Grupos)
router.post("/batch-points", userController.addBatchPoints);
router.post("/batch-group", userController.updateBatchGroup);

// Listagens Específicas
router.get("/grupos-apostas", userController.getGruposApostas); // <--- A ROTA QUE ESTAVA FALTANDO!

// Relatórios por utilizador (ADMIN) — antes de /:id
router.get(
  "/reports/summary",
  authMiddleware,
  authorizeRoles("ADMIN"),
  userController.getUsersReportSummary,
);
router.get(
  "/reports/:userId",
  authMiddleware,
  authorizeRoles("ADMIN"),
  userController.getUserReportDetail,
);

// ==============================================================================
// ROTAS PADRÃO (CRUD)
// ==============================================================================
router.get("/", userController.getAllUsers);
router.post("/create", userController.createUser);
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
router.put("/:id/theme", authMiddleware, userController.updateTheme);
router.get("/:id/historico", userController.getHistorico);

router.get("/:id/stats", userController.getUserStats);

module.exports = router;

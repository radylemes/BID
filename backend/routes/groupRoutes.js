const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// 1. Listar Grupos (somente autenticado)
router.get("/", authMiddleware, groupController.getAllGroups);

// 2. Criar Grupo (ADMIN)
router.post("/", authMiddleware, authorizeRoles("ADMIN"), groupController.createGroup);

// 3. Editar Grupo (ADMIN)
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  groupController.updateGroup,
);

// 4. Excluir Grupo (ADMIN)
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("ADMIN"),
  groupController.deleteGroup,
);

// 5. Grupos de um usuário (dados do próprio usuário ou ADMIN)
router.get("/user/:userId", authMiddleware, groupController.getUserGroups);

module.exports = router;

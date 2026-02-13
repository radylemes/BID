const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groupController");

// 1. Listar Grupos
router.get("/", groupController.getAllGroups);

// 2. Criar Grupo
router.post("/", groupController.createGroup);

// 3. Editar Grupo
router.put("/:id", groupController.updateGroup);

// 4. Excluir Grupo
router.delete("/:id", groupController.deleteGroup);

// 5. Grupos de um usuário (Opcional, mantivemos no controller por compatibilidade)
router.get("/user/:userId", groupController.getUserGroups);

module.exports = router;

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.get("/:id/historico", userController.getHistorico);
router.post("/sync", userController.syncUsers);
router.post("/bulk-update", userController.bulkUpdate);
router.post("/upload-avatar", userController.uploadAvatar);
router.post("/update-groups", userController.updateUserGroup);
router.put("/:id/status", userController.toggleStatus);
router.put("/:id/perfil", userController.mudarPerfil);
router.put("/:id/pontos", userController.updatePontos);
router.post("/create", userController.createUser);
router.delete("/:id", userController.deleteUser);
router.put("/:id", userController.updateUserManual);
router.get("/:userId/stats", userController.getUserStats);

module.exports = router;

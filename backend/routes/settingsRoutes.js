const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

// Busca as configurações atuais
router.get("/", settingsController.getSettings);

// Atualiza as configurações
router.post("/", settingsController.updateSettings);

module.exports = router;

const express = require("express");
const router = express.Router();
const sectorController = require("../controllers/sectorController");

// Rota para buscar todos os setores (usada no modal de configurações)
router.get("/", sectorController.getAllSectors);

module.exports = router;

const express = require("express");
const router = express.Router();
const sectorController = require("../controllers/sectorController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

// Rota para buscar todos os setores (usada no modal de configurações) - ADMIN
router.get("/", authMiddleware, authorizeRoles("ADMIN"), sectorController.getAllSectors);

// Organograma: empresas com setores aninhados (ex.: modal Atribuir Grupo em Lote / Pontos em Lote)
router.get("/organograma", authMiddleware, authorizeRoles("ADMIN"), sectorController.getEmpresasComSetores);

module.exports = router;

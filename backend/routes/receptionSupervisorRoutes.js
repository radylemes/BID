const express = require("express");
const router = express.Router();
const receptionSupervisorController = require("../controllers/receptionSupervisorController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

router.use(authMiddleware, authorizeRoles("ADMIN"));

router.get("/acessos", receptionSupervisorController.listAcessos);
router.get("/acessos/:tipo/:id", receptionSupervisorController.getAcessoDetalhe);
router.post("/acessos/:tipo/:id/cancelar", receptionSupervisorController.cancelarAcesso);

module.exports = router;

const express = require("express");
const router = express.Router();
const integracaoController = require("../controllers/integracaoController");
const apiKeyMiddleware = require("../middleware/apiKeyMiddleware");

router.get("/eventos", apiKeyMiddleware, integracaoController.getEventos);
router.get("/usuarios", apiKeyMiddleware, integracaoController.getUsuarios);

module.exports = router;

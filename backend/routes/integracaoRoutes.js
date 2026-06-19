const express = require("express");
const router = express.Router();
const integracaoController = require("../controllers/integracaoController");
const apiKeyMiddleware = require("../middleware/apiKeyMiddleware");

router.get("/eventos", apiKeyMiddleware, integracaoController.getEventos);

module.exports = router;

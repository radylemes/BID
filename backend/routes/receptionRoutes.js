const express = require("express");
const router = express.Router();
const receptionController = require("../controllers/receptionController");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

if (!receptionController) {
  console.error("ERRO CRÍTICO: receptionController não foi carregado.");
}

// Apenas usuários autenticados com perfil adequado (ADMIN ou PORTARIA)
router.use(authMiddleware, authorizeRoles("ADMIN", "PORTARIA"));

if (receptionController.debugEvents) {
  router.get("/debug", receptionController.debugEvents);
}

router.get("/events/today", receptionController.getTodayEvents);

router.get("/events/:eventId/guests", receptionController.getEventGuests);

router.post(
  "/checkin",
  receptionController.checkin || receptionController.processCheckin,
);

module.exports = router;

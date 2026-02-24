const express = require("express");
const router = express.Router();
const receptionController = require("../controllers/receptionController");

if (!receptionController) {
  console.error("ERRO CRÍTICO: receptionController não foi carregado.");
}

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

const express = require("express");
const router = express.Router();
const receptionController = require("../controllers/receptionController");

if (!receptionController) {
  console.error("ERRO CRÍTICO: receptionController não foi carregado.");
}

// === ROTA DE DEBUG (RAIO-X) ===
router.get("/debug", receptionController.debugEvents);

// 1. Buscar os eventos que acontecem no dia atual
router.get("/events/today", receptionController.getTodayEvents);

// 2. Buscar a lista de convidados para um evento específico
router.get("/events/:eventId/guests", receptionController.getEventGuests);

// 3. Confirmar o check-in e salvar a assinatura base64
router.post("/checkin", receptionController.confirmCheckin);

// Debug de segurança
if (!receptionController) {
  console.error("ERRO CRÍTICO: receptionController não foi carregado.");
}

// 1. Buscar os eventos que acontecem no dia atual
router.get("/events/today", receptionController.getTodayEvents);

// 2. Buscar a lista de convidados para um evento específico
router.get("/events/:eventId/guests", receptionController.getEventGuests);

// 3. Confirmar o check-in e salvar a assinatura base64
router.post("/checkin", receptionController.confirmCheckin);

module.exports = router;

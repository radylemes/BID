const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");

// Debug: Verifica se o controller foi carregado corretamente
if (!matchController) {
  console.error("ERRO CRÍTICO: matchController não foi carregado.");
}

// 1. Listar Eventos (Dashboard)
if (matchController.getMatches) {
  router.get("/", matchController.getMatches);
} else {
  console.error("Erro: Função 'getMatches' não encontrada.");
}

// 2. Criar Novo Evento (Admin)
if (matchController.createMatch) {
  router.post("/", matchController.createMatch);
}

// 3. Apostar / Dar Lance
if (matchController.placeBet) {
  router.post("/bet", matchController.placeBet);
}

// 4. Finalizar Evento (Admin - Sorteio e Ranking)
if (matchController.finishMatch) {
  router.post("/finish", matchController.finishMatch);
}

// 5. Excluir Evento (Admin)
if (matchController.deleteMatch) {
  router.delete("/:id", matchController.deleteMatch);
}

// ==========================================
// 6. EDITAR/ATUALIZAR EVENTO (A ROTA DO ERRO 404)
// ==========================================
if (matchController.updateMatch) {
  router.put("/:id", matchController.updateMatch);
} else {
  console.error(
    "Erro: Função 'updateMatch' não encontrada no matchController.",
  );
}

// 7. Buscar Saldo
if (matchController.getBalance) {
  router.get("/balance/:userId", matchController.getBalance);
}

module.exports = router;

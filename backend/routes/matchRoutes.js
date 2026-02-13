const express = require("express");
const router = express.Router();
const matchController = require("../controllers/matchController");

// Debug: Verifica se o controller foi carregado corretamente
if (!matchController) {
  console.error("ERRO CRÍTICO: matchController não foi carregado.");
}

// 1. Listar Eventos (Dashboard)
// Verifica se a função existe antes de atribuir a rota para evitar o crash
if (matchController.getMatches) {
  router.get("/", matchController.getMatches);
} else {
  console.error("Erro: Função 'getMatches' não encontrada no matchController.");
}

// 2. Criar Novo Evento (Admin)
if (matchController.createMatch) {
  router.post("/", matchController.createMatch);
}

// 3. Apostar / Dar Lance
if (matchController.placeBet) {
  router.post("/bet", matchController.placeBet);
} else {
  console.error("Erro: Função 'placeBet' não encontrada no matchController.");
}

// 4. Finalizar Evento (Admin - Sorteio e Ranking)
if (matchController.finishMatch) {
  router.post("/finish", matchController.finishMatch);
} else {
  console.error(
    "Erro: Função 'finishMatch' não encontrada no matchController.",
  );
}

// 5. Excluir Evento (Admin)
if (matchController.deleteMatch) {
  router.delete("/:id", matchController.deleteMatch);
}

// 6. Listar Grupos
if (matchController.getGroups) {
  router.get("/groups", matchController.getGroups);
}

// 7. Buscar Saldo
if (matchController.getBalance) {
  router.get("/balance/:userId", matchController.getBalance);
}

module.exports = router;

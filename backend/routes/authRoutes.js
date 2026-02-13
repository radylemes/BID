const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");

// =================================================
// ROTAS DE AUTENTICAÇÃO
// =================================================

if (authController.login) {
  router.post("/login", authController.login);
} else {
  console.warn("⚠️ Função authController.login não encontrada!");
}

if (authController.loginMicrosoft) {
  router.post(
    "/login-microsoft",
    passport.authenticate("oauth-bearer", { session: false }),
    authController.loginMicrosoft,
  );
} else {
  console.warn("⚠️ Função authController.loginMicrosoft não encontrada!");
}

router.post("/logout", (req, res) => {
  res.json({
    auth: false,
    token: null,
    message: "Logout realizado com sucesso.",
  });
});

module.exports = router;

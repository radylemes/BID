// backend/config/azureAuth.js
const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
require("dotenv").config();

const options = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  validateIssuer: true, // Garante que o token veio do seu Tenant (Allianz Parque)
  passReqToCallback: false,
  loggingLevel: "warn", // Reduz o lixo no terminal
  audience: process.env.AZURE_CLIENT_ID, // O token deve ser para O NOSSO app
};

const strategy = new BearerStrategy(options, (token, done) => {
  // Se chegou aqui, o token é válido!
  // O 'token' contém os dados do usuário (nome, email, oid, etc.)
  return done(null, token, token);
});

passport.use(strategy);

module.exports = passport;

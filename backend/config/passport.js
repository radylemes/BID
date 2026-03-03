const passport = require("passport");
const BearerStrategy = require("passport-azure-ad").BearerStrategy;
require("dotenv").config();

// Se as variáveis ainda não tiverem carregado, definimos null para evitar crash imediato,
// mas o ideal é garantir que o .env está na raiz do backend.
const tenantID = process.env.AZURE_TENANT_ID || process.env.TENANT_ID;
const clientID = process.env.AZURE_CLIENT_ID || process.env.CLIENT_ID;

if (!clientID || !tenantID) {
  console.error(
    "❌ ERRO FATAL: AZURE_CLIENT_ID ou AZURE_TENANT_ID não estão definidos no arquivo .env",
  );
}

const options = {
  // URL de metadados da Microsoft para validar o token
  identityMetadata: `https://login.microsoftonline.com/${tenantID}/v2.0/.well-known/openid-configuration`,

  // O ID do Cliente (Deve bater com o AZURE_CLIENT_ID do .env)
  clientID: clientID,

  validateIssuer: false,
  loggingLevel: "warn",
  passReqToCallback: false,
  isB2C: false,
  policyName: null,
  loggingNoPII: false,

  // Audience deve ser o mesmo ID do cliente para tokens de ID
  audience: clientID,
};

const bearerStrategy = new BearerStrategy(options, (token, done) => {
  // Verificação simples: se o token tem um ID de objeto (oid), é válido.
  if (!token.oid) {
    return done(new Error("Token inválido: oid não encontrado"), null);
  }
  return done(null, token);
});

passport.use(bearerStrategy);

module.exports = passport;

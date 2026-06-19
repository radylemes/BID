const db = require("../config/db");
const logErro = require("../utils/errorLogger");

function extractApiKey(req) {
  const headerKey = req.headers["x-api-key"] || req.headers["X-API-Key"];
  if (headerKey && String(headerKey).trim()) {
    return String(headerKey).trim();
  }

  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (authHeader && String(authHeader).startsWith("ApiKey ")) {
    return String(authHeader).slice(7).trim();
  }

  return null;
}

async function apiKeyMiddleware(req, res, next) {
  try {
    const providedKey = extractApiKey(req);
    if (!providedKey) {
      return res.status(401).json({ error: "Chave de API não fornecida." });
    }

    const [rows] = await db.query(
      "SELECT chave, valor FROM configuracoes WHERE chave IN ('external_api_enabled', 'external_api_key')",
    );
    const mapa = rows.reduce((acc, r) => {
      acc[r.chave] = r.valor;
      return acc;
    }, {});

    const enabled = String(mapa.external_api_enabled || "0").trim() === "1";
    if (!enabled) {
      return res.status(503).json({ error: "Integração externa desativada." });
    }

    const storedKey = String(mapa.external_api_key || "").trim();
    if (!storedKey || storedKey !== providedKey) {
      return res.status(401).json({ error: "Chave de API inválida." });
    }

    next();
  } catch (error) {
    await logErro("API_KEY_MIDDLEWARE", error);
    res.status(500).json({ error: "Erro ao validar chave de API." });
  }
}

module.exports = apiKeyMiddleware;

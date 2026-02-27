const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secreta_padrao_dev";

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[authMiddleware] 401: Token não enviado no header Authorization.");
    }
    return res.status(401).json({ message: "Token de autenticação não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[authMiddleware] 401: Token inválido ou expirado.", error.message);
    }
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

function authorizeRoles(...roles) {
  const allowed = roles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Acesso negado." });
    }

    const userRole = String(req.user.role).toUpperCase();
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "Permissão insuficiente para esta operação." });
    }

    next();
  };
}

module.exports = {
  authMiddleware,
  authorizeRoles,
};


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "secreta_padrao_dev";

function gerarTokenApp(user) {
  const userRole =
    user.perfil || user.role || (user.is_ad_user ? "user" : "admin");
  return jwt.sign({ id: user.id, role: userRole }, JWT_SECRET, {
    expiresIn: "8h",
  });
}

async function registrarLogLogin(usuarioId, metodo, emailOuUsername) {
  try {
    await db.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, 'AUTH', 'LOGIN', ?, ?)`,
      [
        usuarioId,
        usuarioId,
        safeAuditoriaDetalhes({ metodo, identificador: emailOuUsername }),
      ],
    );
  } catch (e) {
    await logErro("AUTH_CONTROLLER_REGISTRAR_LOG", e);
  }
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Preencha usuário e senha." });

    const [users] = await db.execute(
      `
      SELECT u.*, e.nome as empresa_nome, s.nome as setor_nome, g.nome as grupo_nome
      FROM usuarios u 
      LEFT JOIN empresas e ON u.empresa_id = e.id 
      LEFT JOIN setores s ON u.setor_id = s.id 
      LEFT JOIN grupos g ON u.grupo_id = g.id
      WHERE u.username = ?
    `,
      [username],
    );

    const user = users[0];
    if (!user)
      return res.status(401).json({ message: "Usuário não encontrado." });
    if (user.is_ad_user === 1 && !user.senha_hash)
      return res.status(400).json({ message: 'Use "Entrar com Microsoft".' });
    if (!user.senha_hash)
      return res.status(401).json({ message: "Senha não definida." });

    const senhaValida = await bcrypt.compare(password, user.senha_hash);
    if (!senhaValida)
      return res.status(401).json({ message: "Senha incorreta." });

    await registrarLogLogin(user.id, "MANUAL", user.username);

    res.json({
      auth: true,
      token: gerarTokenApp(user),
      user: {
        id: user.id,
        username: user.username,
        nome_completo: user.nome_completo,
        email: user.email,
        setor: user.setor_nome || "Geral",
        empresa: user.empresa_nome || "Geral",
        grupo_nome: user.grupo_nome || "Sem Grupo",
        foto: user.foto,
        role: user.perfil,
        pontos: user.pontos,
        tema_preferido: user.tema_preferido || "claro",
      },
    });
  } catch (error) {
    await logErro("AUTH_CONTROLLER_LOGIN", error);
    res.status(500).json({ message: "Erro interno." });
  }
};

exports.loginMicrosoft = async (req, res) => {
  const azureUser = req.user;
  if (!azureUser) return res.status(401).json({ message: "Token inválido." });

  try {
    const oid = azureUser.oid;
    const email =
      azureUser.preferred_username || azureUser.upn || azureUser.email;
    const nome = azureUser.name || azureUser.displayName;
    if (!oid || !email) throw new Error("Dados não retornados pela Microsoft.");

    let userLocal = null;

    try {
      const [uId] = await db.execute(
        `
        SELECT u.*, e.nome as empresa_nome, s.nome as setor_nome, g.nome as grupo_nome 
        FROM usuarios u 
        LEFT JOIN empresas e ON u.empresa_id = e.id 
        LEFT JOIN setores s ON u.setor_id = s.id 
        LEFT JOIN grupos g ON u.grupo_id = g.id
        WHERE u.microsoft_id = ?
      `,
        [oid],
      );
      if (uId.length > 0) userLocal = uId[0];
    } catch (e) {
      await logErro("AUTH_CONTROLLER_LOGIN_MICROSOFT_GET_USER", e);
    }

    if (!userLocal) {
      const [uMail] = await db.execute(
        `
        SELECT u.*, e.nome as empresa_nome, s.nome as setor_nome, g.nome as grupo_nome 
        FROM usuarios u 
        LEFT JOIN empresas e ON u.empresa_id = e.id 
        LEFT JOIN setores s ON u.setor_id = s.id 
        LEFT JOIN grupos g ON u.grupo_id = g.id
        WHERE u.email = ?
      `,
        [email],
      );
      if (uMail.length > 0) {
        userLocal = uMail[0];
        try {
          await db.execute(
            "UPDATE usuarios SET microsoft_id = ?, is_ad_user = 1 WHERE id = ?",
            [oid, userLocal.id],
          );
        } catch (err) {
          await logErro("AUTH_CONTROLLER_LOGIN_MICROSOFT_UPDATE_MSID", err);
        }
      }
    }

    if (!userLocal) {
      const username = email.split("@")[0];
      const [result] = await db.execute(
        `INSERT INTO usuarios (username, nome_completo, email, is_ad_user, pontos, senha_hash, perfil, ativo, microsoft_id) VALUES (?, ?, ?, 1, 0, 'MS_AUTH_AD', 'USER', 1, ?)`,
        [username, nome || username, email, oid],
      );
      const [newUsers] = await db.execute(
        "SELECT * FROM usuarios WHERE id = ?",
        [result.insertId],
      );
      userLocal = newUsers[0];
    }

    await registrarLogLogin(userLocal.id, "MICROSOFT", email);

    res.json({
      auth: true,
      token: gerarTokenApp(userLocal),
      user: {
        id: userLocal.id,
        username: userLocal.username,
        nome_completo: userLocal.nome_completo,
        email: userLocal.email,
        setor: userLocal.setor_nome || "Geral",
        empresa: userLocal.empresa_nome || "Geral",
        grupo_nome: userLocal.grupo_nome || "Sem Grupo",
        foto: userLocal.foto,
        role: userLocal.perfil,
        pontos: userLocal.pontos,
        tema_preferido: userLocal.tema_preferido || "claro",
      },
    });
  } catch (error) {
    await logErro("AUTH_CONTROLLER_LOGIN_MICROSOFT", error);
    res.status(500).json({ message: "Erro: " + error.message });
  }
};

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "secreta_padrao_dev";

// --- Função Auxiliar para Gerar Token ---
function gerarTokenApp(user) {
  // Mapeia 'perfil' (do banco) para 'role' (do front)
  // Se não tiver perfil, usa lógica de fallback
  const userRole =
    user.perfil || user.role || (user.is_ad_user ? "user" : "admin");

  return jwt.sign(
    {
      id: user.id,
      role: userRole,
    },
    JWT_SECRET,
    { expiresIn: "8h" },
  );
}

// ==========================================================
// 1. LOGIN MANUAL (Usuário e Senha)
// ==========================================================
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Preencha usuário e senha." });
    }

    const [users] = await db.execute(
      "SELECT * FROM usuarios WHERE username = ?",
      [username],
    );
    const user = users[0];

    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    // Bloqueia usuário de AD tentando login manual sem senha
    if (user.is_ad_user === 1 && !user.senha_hash) {
      return res.status(400).json({
        message: 'Usuário corporativo. Use o botão "Entrar com Microsoft".',
      });
    }

    if (!user.senha_hash) {
      return res.status(401).json({ message: "Senha não definida." });
    }

    const senhaValida = await bcrypt.compare(password, user.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    const token = gerarTokenApp(user);

    console.log(`✅ Login Manual: ${user.username} [${user.perfil}]`);

    res.json({
      auth: true,
      token: token,
      user: {
        id: user.id,
        username: user.username,
        nome_completo: user.nome_completo || user.nome || user.username,
        email: user.email,
        setor: user.setor || "Não informado",
        foto: user.foto || user.foto_url,
        role: user.perfil || "user",
        pontos: user.pontos || 0,
      },
    });
  } catch (error) {
    console.error("❌ ERRO LOGIN MANUAL:", error);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};

// ==========================================================
// 2. LOGIN MICROSOFT (Corrigido para usar ID Único)
// ==========================================================
exports.loginMicrosoft = async (req, res) => {
  const azureUser = req.user;

  if (!azureUser) {
    return res.status(401).json({ message: "Token Microsoft inválido." });
  }

  try {
    // Dados vindos do Token Azure
    const oid = azureUser.oid; // ID Único Imutável do usuário na Microsoft
    const email =
      azureUser.preferred_username || azureUser.upn || azureUser.email;
    const nome = azureUser.name || azureUser.displayName;

    if (!oid || !email) {
      throw new Error(
        "Dados essenciais (OID/Email) não retornados pela Microsoft.",
      );
    }

    // 1. Tenta buscar pelo ID da Microsoft (Mais seguro)
    // Assumindo que você tem uma coluna 'microsoft_id' ou similar.
    // Se não tiver, o código abaixo faz fallback para email.
    let userLocal = null;

    // Verifica se a coluna microsoft_id existe na tabela antes de usar (opcional, mas seguro)
    // Para simplificar, vou tentar buscar pelo email se não achar pelo ID

    // Tenta buscar por ID da Microsoft (se a coluna existir e tiver dados)
    try {
      const [usersById] = await db.execute(
        "SELECT * FROM usuarios WHERE microsoft_id = ?",
        [oid],
      );
      if (usersById.length > 0) {
        userLocal = usersById[0];
      }
    } catch (e) {
      // Ignora erro se a coluna não existir ainda e segue para busca por email
    }

    // 2. Se não achou pelo ID, busca pelo E-mail
    if (!userLocal) {
      const [usersByEmail] = await db.execute(
        "SELECT * FROM usuarios WHERE email = ?",
        [email],
      );
      if (usersByEmail.length > 0) {
        userLocal = usersByEmail[0];

        // ATUALIZAÇÃO: Se achou por email mas não tem o ID da Microsoft gravado, grava agora
        // Isso vincula a conta legada com a conta Microsoft
        try {
          await db.execute(
            "UPDATE usuarios SET microsoft_id = ?, is_ad_user = 1 WHERE id = ?",
            [oid, userLocal.id],
          );
          console.log(`🔗 Conta vinculada ao AD: ${userLocal.username}`);
        } catch (err) {
          // Ignora erro de coluna inexistente
        }
      }
    }

    // 3. Se não existe de jeito nenhum, CRIA O USUÁRIO
    if (!userLocal) {
      console.log(`🆕 Criando usuário AD: ${email}`);

      // Gera username único (se 'daniel.lemes' existir, tenta outro ou usa o mesmo se for permitido)
      // Aqui simplificamos usando a parte antes do @
      const username = email.split("@")[0];

      const nomeFinal = nome || username;

      // INSERT Completo
      // Preencho 'senha_hash' com placeholder para não quebrar NOT NULL
      // Preencho 'perfil' com 'USER' padrão
      // Preencho 'microsoft_id' com o OID
      const [result] = await db.execute(
        `INSERT INTO usuarios 
        (username, nome_completo, email, is_ad_user, setor, pontos, senha_hash, perfil, ativo, microsoft_id)
         VALUES (?, ?, ?, 1, 'Novo', 0, 'MS_AUTH_AD', 'USER', 1, ?)`,
        [username, nomeFinal, email, oid],
      );

      const [newUsers] = await db.execute(
        "SELECT * FROM usuarios WHERE id = ?",
        [result.insertId],
      );
      userLocal = newUsers[0];
    }

    const token = gerarTokenApp(userLocal);

    console.log(
      `✅ Login Microsoft: ${userLocal.username} [${userLocal.perfil}]`,
    );

    res.json({
      auth: true,
      token: token,
      user: {
        id: userLocal.id,
        username: userLocal.username,
        nome_completo: userLocal.nome_completo || userLocal.nome || nome,
        email: userLocal.email,
        setor: userLocal.setor || "Não informado",
        foto: userLocal.foto || userLocal.foto_url,
        role: userLocal.perfil || "user",
        pontos: userLocal.pontos || 0,
      },
    });
  } catch (error) {
    console.error("❌ ERRO CRÍTICO LOGIN MICROSOFT:", error.message);
    if (error.sqlMessage) console.error("Detalhe SQL:", error.sqlMessage);
    res.status(500).json({ message: "Erro no servidor: " + error.message });
  }
};

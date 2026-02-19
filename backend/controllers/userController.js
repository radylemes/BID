const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const qs = require("qs");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      (req.body.userId || "temp") +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname),
    );
  },
});
const upload = multer({ storage: storage });

exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.*, g.nome AS grupo_nome 
      FROM usuarios u
      LEFT JOIN grupos g ON u.grupo_id = g.id
      ORDER BY u.nome_completo ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM usuarios WHERE id = ?", [
      req.params.id,
    ]);
    rows.length
      ? res.json(rows[0])
      : res.status(404).json({ message: "Não encontrado" });
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
};

exports.syncUsers = async (req, res) => {
  const adminId = req.body.adminId || 1;

  console.log("🔄 Iniciando sincronização com Azure AD...");

  try {
    // 1. OBTER TOKEN (Client Credentials)
    const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const tokenData = qs.stringify({
      client_id: process.env.AZURE_CLIENT_ID,
      client_secret: process.env.AZURE_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });

    const tokenResponse = await axios.post(tokenUrl, tokenData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const accessToken = tokenResponse.data.access_token;

    // 2. BUSCAR USUÁRIOS NO GRAPH (ADICIONADO: companyName)
    // companyName é o campo que corresponde a "Empresa" no AD
    const graphUrl =
      "https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,mail,department,jobTitle,userPrincipalName,accountEnabled,companyName";

    const graphResponse = await axios.get(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const adUsers = graphResponse.data.value;

    console.log(`📡 Usuários encontrados no AD: ${adUsers.length}`);

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;

    // 3. PROCESSAR
    for (const adUser of adUsers) {
      const email = adUser.mail || adUser.userPrincipalName;
      const setor = adUser.department || adUser.jobTitle;

      // Filtro: Ignora se não tiver email ou setor
      if (!email || !setor) {
        ignorados++;
        continue;
      }

      const nome = adUser.displayName;
      const oid = adUser.id;
      const ativo = adUser.accountEnabled !== false ? 1 : 0;

      // CAPTURA A EMPRESA (Se não vier, deixamos em branco)
      const empresa = adUser.companyName || "";

      let username = email.split("@")[0];

      // Verifica existência
      const [existing] = await db.execute(
        "SELECT id, setor, nome_completo, username, empresa, microsoft_id FROM usuarios WHERE email = ? OR microsoft_id = ?",
        [email, oid],
      );

      if (existing.length === 0) {
        // --- CRIAÇÃO ---

        // Tratamento de username duplicado
        const [usernameCheck] = await db.execute(
          "SELECT id FROM usuarios WHERE username = ?",
          [username],
        );
        if (usernameCheck.length > 0) {
          const sufixo = Math.floor(Math.random() * 1000);
          username = `${username}.${sufixo}`;
        }

        // ADICIONADO: Campo 'empresa' no INSERT
        await db.execute(
          `INSERT INTO usuarios 
           (username, nome_completo, email, is_ad_user, setor, empresa, pontos, senha_hash, perfil, ativo, microsoft_id)
           VALUES (?, ?, ?, 1, ?, ?, 0, 'MS_AUTH_AD', 'USER', ?, ?)`,
          [username, nome, email, setor, empresa, ativo, oid],
        );
        criados++;
      } else {
        // --- ATUALIZAÇÃO ---
        const u = existing[0];
        // Atualiza se mudou setor, nome, empresa, status ou ID
        if (
          u.setor !== setor ||
          u.nome_completo !== nome ||
          u.empresa !== empresa ||
          u.microsoft_id !== oid
        ) {
          // ADICIONADO: Campo 'empresa' no UPDATE
          await db.execute(
            "UPDATE usuarios SET setor = ?, empresa = ?, nome_completo = ?, microsoft_id = ?, ativo = ? WHERE id = ?",
            [setor, empresa, nome, oid, ativo, u.id],
          );
          atualizados++;
        } else {
          ignorados++;
        }
      }
    }

    console.log(
      `✅ Sync finalizado. Criados: ${criados}, Atualizados: ${atualizados}`,
    );

    res.json({
      message: "Sincronização concluída com sucesso!",
      details: `Criados: ${criados}, Atualizados: ${atualizados}.`,
    });
  } catch (error) {
    console.error("❌ Erro no Sync:", error.message);
    if (error.response?.status === 403) {
      return res.status(403).json({
        error: "Permissão Negada. Verifique 'User.Read.All' no Azure.",
      });
    }
    res.status(500).json({ error: "Erro interno.", details: error.message });
  }
};

exports.toggleStatus = async (req, res) => {
  const { id } = req.params;
  const { ativo, adminId } = req.body; // Recebe o adminId do front

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const novoStatus = ativo ? 1 : 0;
    const textoStatus = ativo ? "ATIVO" : "INATIVO";

    // 1. Atualiza o status
    await connection.execute("UPDATE usuarios SET ativo = ? WHERE id = ?", [
      novoStatus,
      id,
    ]);

    // 2. Grava o Log [FALTAVA ISSO]
    const motivo = `Alteração de Status: Usuário agora está ${textoStatus}`;
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) 
       VALUES (?, ?, 0, 0, ?)`,
      [id, adminId || 1, motivo],
    );

    await connection.commit();
    res.json({ message: `Status atualizado para ${textoStatus}` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.mudarPerfil = async (req, res) => {
  const { id } = req.params;
  const { perfil, adminId } = req.body; // Recebe quem fez a alteração

  const connection = await db.getConnection(); // Usa conexão para transação

  try {
    await connection.beginTransaction();

    // 1. Busca o perfil atual para registrar no log "De X para Y"
    const [rows] = await connection.execute(
      "SELECT perfil FROM usuarios WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    const perfilAntigo = rows[0].perfil;

    // 2. Atualiza o perfil
    await connection.execute("UPDATE usuarios SET perfil = ? WHERE id = ?", [
      perfil,
      id,
    ]);

    // 3. Grava o Log [FALTAVA ISSO]
    const motivo = `Alteração de Perfil: De ${perfilAntigo} para ${perfil}`;
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) 
       VALUES (?, ?, 0, 0, ?)`,
      [id, adminId || 1, motivo],
    );

    await connection.commit();
    res.json({ message: "Perfil atualizado e log gravado!" });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.updatePontos = async (req, res) => {
  const { id } = req.params;
  const { novosPontos, adminId, motivo } = req.body;
  try {
    const [user] = await db.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [id],
    );
    const pontosAntigos = user[0]?.pontos || 0;
    await db.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
      novosPontos,
      id,
    ]);
    await db.execute(
      "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
      [id, adminId || 1, pontosAntigos, novosPontos, motivo || "Ajuste"],
    );
    res.json({ message: "Pontos atualizados" });
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
};

// ============================================================
// 7. IMPORTAÇÃO EM MASSA (SEPARANDO SETOR DE GRUPO)
// ============================================================
exports.bulkUpdate = async (req, res) => {
  const { alteracoes, adminId, motivoGlobal } = req.body;

  if (!alteracoes || alteracoes.length === 0) {
    return res.status(400).json({ error: "Nenhum dado recebido." });
  }

  const connection = await db.getConnection();
  try {
    // 1. CARREGA OS GRUPOS (Somente para mapear a coluna 'Grupo' do Excel)
    const [gruposDb] = await connection.execute("SELECT id, nome FROM grupos");

    const mapaGrupos = {};
    gruposDb.forEach((g) => {
      if (g.nome) mapaGrupos[g.nome.toUpperCase().trim()] = g.id;
    });

    await connection.beginTransaction();
    let atualizados = 0;

    for (const item of alteracoes) {
      if (!item.email) continue;

      // --- TRATAMENTO DE STATUS ---
      let ativoFinal = 1;
      const valorStatus =
        item.ativo !== undefined
          ? item.ativo
          : item.status !== undefined
            ? item.status
            : null;
      if (valorStatus !== null) {
        const statusString = String(valorStatus).trim().toLowerCase();
        if (
          [
            "0",
            "false",
            "falso",
            "inativo",
            "desativado",
            "não",
            "no",
            "off",
          ].includes(statusString)
        ) {
          ativoFinal = 0;
        }
      }

      // --- TRATAMENTO DE PERFIL ---
      let perfilFinal = "USER";
      if (item.perfil && String(item.perfil).trim().toUpperCase() === "ADMIN") {
        perfilFinal = "ADMIN";
      }

      // --- TRATAMENTO DE GRUPO (CORRIGIDO) ---
      // AGORA: Só olha para colunas explícitas de Grupo. NÃO olha mais para Setor.
      let grupoIdFinal = null;
      const nomeGrupoExcel =
        item.grupo || item.Grupo || item.group || item.Group;

      if (nomeGrupoExcel) {
        const chave = String(nomeGrupoExcel).toUpperCase().trim();
        if (mapaGrupos[chave]) {
          grupoIdFinal = mapaGrupos[chave];
        } else {
        }
      }

      // --- BUSCA USUÁRIO ---
      const [rowsUser] = await connection.execute(
        "SELECT id, pontos FROM usuarios WHERE email = ?",
        [item.email],
      );

      if (rowsUser.length > 0) {
        // === ATUALIZAÇÃO ===
        const usuarioExistente = rowsUser[0];

        // Montamos a query.
        // Se grupoIdFinal for null (porque não veio no Excel),
        // NÃO atualizamos o grupo para null, mantemos o que estava (COALESCE ou lógica via JS).
        // Mas na importação massiva, geralmente queremos sobreescrever.
        // Vamos assumir: Se veio nome de grupo e achou ID -> Atualiza. Se não veio -> Mantém NULL ou remove.

        // IMPORTANTE: Para atualizar o setor, usamos item.setor (texto livre)
        await connection.execute(
          `UPDATE usuarios SET 
            nome_completo = ?, 
            setor = ?, 
            empresa = ?, 
            pontos = ?, 
            perfil = ?, 
            ativo = ?, 
            grupo_id = ? 
           WHERE id = ?`,
          [
            item.nome_completo || item.Nome,
            item.setor || item.Setor || "Geral", // Aqui entra o texto "Geral" ou "TI" apenas como label
            item.empresa || "",
            item.pontos || 0,
            perfilFinal,
            ativoFinal,
            grupoIdFinal, // Aqui entra o ID do Grupo (ou NULL)
            usuarioExistente.id,
          ],
        );

        // LOG (Opcional)
        if (motivoGlobal) {
          await connection.execute(
            `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              usuarioExistente.id,
              adminId || 1,
              usuarioExistente.pontos,
              item.pontos || 0,
              motivoGlobal,
            ],
          );
        }
      } else {
        // === CRIAÇÃO ===
        const username =
          item.email.split("@")[0] + Math.floor(Math.random() * 100);
        await connection.execute(
          `INSERT INTO usuarios (nome_completo, email, username, setor, empresa, pontos, perfil, ativo, grupo_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.nome_completo || item.Nome,
            item.email,
            username,
            item.setor || item.Setor || "Geral", // Setor Texto
            item.empresa || "",
            item.pontos || 0,
            perfilFinal,
            ativoFinal,
            grupoIdFinal, // Grupo ID
          ],
        );
      }
      atualizados++;
    }

    await connection.commit();
    res.json({
      message: `Importação concluída! ${atualizados} linhas processadas.`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Erro Bulk Update:", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

exports.getHistorico = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT h.*, u.nome_completo as admin_nome FROM historico_pontos h LEFT JOIN usuarios u ON h.admin_id = u.id WHERE h.usuario_id = ? ORDER BY h.data_alteracao DESC",
      [req.params.id],
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro" });
  }
};

exports.uploadAvatar = [
  upload.single("foto"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ msg: "Arquivo não enviado." });
    const userId = req.body.userId;
    const novaFotoPath = req.file.path.replace(/\\/g, "/");
    try {
      const [rows] = await db.execute(
        "SELECT foto FROM usuarios WHERE id = ?",
        [userId],
      );
      if (rows.length > 0 && rows[0].foto && fs.existsSync(rows[0].foto))
        fs.unlinkSync(rows[0].foto);
      await db.execute("UPDATE usuarios SET foto = ? WHERE id = ?", [
        novaFotoPath,
        userId,
      ]);
      res.json({ msg: "Foto atualizada!", path: novaFotoPath });
    } catch (error) {
      res.status(500).json({ msg: "Erro" });
    }
  },
];

exports.updateUserGroup = async (req, res) => {
  const { usuarioId, grupoId, motivo, adminId } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. BUSCAR NOMES DOS GRUPOS (ANTIGO E NOVO)
    // Busca usuário atual para saber o grupo antigo
    const [rowsUser] = await connection.execute(
      `SELECT u.grupo_id, g.nome as nome_grupo_antigo 
       FROM usuarios u 
       LEFT JOIN grupos g ON u.grupo_id = g.id 
       WHERE u.id = ?`,
      [usuarioId],
    );

    const nomeGrupoAntigo = rowsUser[0]?.nome_grupo_antigo || "Sem Empresa";

    let nomeGrupoNovo = "Sem Empresa";
    if (grupoId) {
      const [rowsGroup] = await connection.execute(
        "SELECT nome FROM grupos WHERE id = ?",
        [grupoId],
      );
      if (rowsGroup.length > 0) nomeGrupoNovo = rowsGroup[0].nome;
    }

    // 2. ATUALIZA O USUÁRIO
    await connection.execute("UPDATE usuarios SET grupo_id = ? WHERE id = ?", [
      grupoId || null,
      usuarioId,
    ]);

    // 3. GRAVA NO HISTÓRICO COM DETALHES CLAROS
    // Formato: "Grupo: [Antigo] -> [Novo]. Obs: [Motivo]"
    const descricaoLog = `Grupo: de '${nomeGrupoAntigo}' para '${nomeGrupoNovo}'. Obs: ${motivo}`;

    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) 
       VALUES (?, ?, 0, 0, ?)`,
      [usuarioId, adminId || 1, descricaoLog],
    );

    await connection.commit();
    res.json({ message: "Empresa atualizada com sucesso!" });
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao atualizar grupo:", error);
    res.status(500).json({ error: "Erro interno ao salvar o grupo" });
  } finally {
    connection.release();
  }
};

// =====================================================================
// CRIAR USUÁRIO MANUAL
// =====================================================================
exports.createUser = async (req, res) => {
  const {
    nome_completo,
    email,
    username,
    senha,
    perfil,
    setor,
    grupo_id,
    pontos,
  } = req.body;

  try {
    if (!nome_completo || !username || !senha) {
      return res
        .status(400)
        .json({ message: "Nome, Usuário e Senha são obrigatórios." });
    }

    // Verifica duplicidade
    const [existing] = await db.execute(
      "SELECT id FROM usuarios WHERE username = ? OR email = ?",
      [username, email],
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Usuário ou E-mail já cadastrados." });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    // INSERE COM OS NOVOS CAMPOS
    // Se grupo_id vier vazio ou 'null', salvamos NULL no banco
    const grupoFinal = grupo_id && grupo_id !== "null" ? grupo_id : null;
    const pontosFinal = pontos ? Number(pontos) : 0;
    const setorFinal = setor || "Geral";

    await db.execute(
      `INSERT INTO usuarios 
       (username, nome_completo, email, senha_hash, is_ad_user, perfil, ativo, setor, grupo_id, pontos)
       VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?, ?)`,
      [
        username,
        nome_completo,
        email,
        hashedPassword,
        perfil || "USER",
        setorFinal,
        grupoFinal,
        pontosFinal,
      ],
    );

    res.status(201).json({ message: "Usuário criado com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro interno ao criar usuário." });
  }
};

// =====================================================================
// EXCLUIR USUÁRIO
// =====================================================================
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const { adminId } = req.body; // Quem está deletando (para logs futuros se precisar)

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Opcional: Impedir que o admin se auto-delete
    if (Number(id) === Number(adminId)) {
      throw new Error("Você não pode excluir sua própria conta.");
    }

    // 1. Limpa dependências (Ex: Apostas, Histórico) para não dar erro de Foreign Key
    // Se o seu banco tiver ON DELETE CASCADE configurado, isso não é necessário,
    // mas é bom garantir via código:
    await connection.execute("DELETE FROM apostas WHERE usuario_id = ?", [id]);
    await connection.execute(
      "DELETE FROM historico_pontos WHERE usuario_id = ?",
      [id],
    );

    // 2. Deleta o Usuário
    const [result] = await connection.execute(
      "DELETE FROM usuarios WHERE id = ?",
      [id],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    await connection.commit();
    res.json({ message: "Usuário excluído com sucesso." });
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao excluir usuário:", error);
    res
      .status(500)
      .json({ message: error.message || "Erro ao excluir usuário." });
  } finally {
    connection.release();
  }
};

exports.updateUserManual = async (req, res) => {
  const { id } = req.params;
  const {
    nome_completo,
    email,
    username,
    senha,
    adminId,
    setor,
    grupo_id,
    pontos,
  } = req.body;

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. BUSCA DADOS ANTIGOS
    // Fazemos um JOIN para pegar o nome do grupo antigo também
    const [rows] = await connection.execute(
      `
      SELECT u.*, g.nome as nome_grupo 
      FROM usuarios u 
      LEFT JOIN grupos g ON u.grupo_id = g.id 
      WHERE u.id = ?
    `,
      [id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const usuarioAntigo = rows[0];
    let listaAlteracoes = []; // Array para guardar as linhas de mudança HTML

    // 2. TRATAMENTO DOS NOVOS DADOS
    const novoGrupoId =
      grupo_id && grupo_id !== "null" ? Number(grupo_id) : null;
    const novosPontos =
      pontos !== undefined ? Number(pontos) : usuarioAntigo.pontos;
    const novoSetor = setor || null;

    // 3. COMPARAÇÕES (Gerando HTML)

    // Nome
    if (usuarioAntigo.nome_completo !== nome_completo) {
      listaAlteracoes.push(
        `<b>Nome:</b> ${usuarioAntigo.nome_completo} ➔ ${nome_completo}`,
      );
    }

    // Email
    if (usuarioAntigo.email !== email) {
      listaAlteracoes.push(`<b>Email:</b> ${usuarioAntigo.email} ➔ ${email}`);
    }

    // Username
    if (usuarioAntigo.username !== username) {
      listaAlteracoes.push(
        `<b>Login:</b> ${usuarioAntigo.username} ➔ ${username}`,
      );
    }

    // Setor
    if ((usuarioAntigo.setor || "") !== (novoSetor || "")) {
      listaAlteracoes.push(
        `<b>Setor:</b> ${usuarioAntigo.setor || "Vazio"} ➔ ${novoSetor || "Vazio"}`,
      );
    }

    // Pontos
    if (Number(usuarioAntigo.pontos) !== novosPontos) {
      listaAlteracoes.push(
        `<b>Pontos:</b> ${usuarioAntigo.pontos} ➔ ${novosPontos}`,
      );
    }

    // Grupo
    if (usuarioAntigo.grupo_id !== novoGrupoId) {
      // Precisamos buscar o nome do NOVO grupo para ficar bonito
      let nomeGrupoNovo = "Sem Empresa";
      if (novoGrupoId) {
        const [gRows] = await connection.execute(
          "SELECT nome FROM grupos WHERE id = ?",
          [novoGrupoId],
        );
        if (gRows.length > 0) nomeGrupoNovo = gRows[0].nome;
      }
      const nomeGrupoAntigo = usuarioAntigo.nome_grupo || "Sem Empresa";

      listaAlteracoes.push(
        `<b>Grupo:</b> ${nomeGrupoAntigo} ➔ ${nomeGrupoNovo}`,
      );
    }

    // Senha
    let querySenha = "";
    let paramsSenha = [];
    if (senha && senha.trim() !== "") {
      const hashedPassword = await bcrypt.hash(senha, 10);
      querySenha = ", senha_hash = ?";
      paramsSenha.push(hashedPassword);
      listaAlteracoes.push(`<b>Senha:</b> Alterada manualmente`);
    }

    // Se nada mudou
    if (listaAlteracoes.length === 0) {
      await connection.rollback();
      return res.json({ message: "Nenhuma informação foi alterada." });
    }

    // 4. ATUALIZAÇÃO NO BANCO
    const query = `
      UPDATE usuarios 
      SET nome_completo = ?, email = ?, username = ?, setor = ?, grupo_id = ?, pontos = ? ${querySenha}
      WHERE id = ?
    `;

    const params = [
      nome_completo,
      email,
      username,
      novoSetor,
      novoGrupoId,
      novosPontos,
      ...paramsSenha,
      id,
    ];

    await connection.execute(query, params);

    // 5. GRAVA O LOG COM HTML
    // Join com <br> cria uma lista vertical visual
    const motivoLog = listaAlteracoes.join("<br>");

    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) 
       VALUES (?, ?, 0, 0, ?)`,
      [id, adminId || 1, motivoLog],
    );

    await connection.commit();
    res.json({ message: "Usuário atualizado com sucesso." });
  } catch (error) {
    await connection.rollback();
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ message: "Erro interno ao atualizar." });
  } finally {
    connection.release();
  }
};

exports.getUserStats = async (req, res) => {
  const { userId } = req.params;
  const db = require("../config/db");

  try {
    const connection = await db.getConnection();

    try {
      const [winRows] = await connection.execute(
        "SELECT COUNT(*) as total FROM apostas WHERE usuario_id = ? AND status = 'GANHOU'",
        [userId],
      );
      const bidsVencidos = winRows[0].total || 0;

      const [avgRows] = await connection.execute(
        "SELECT AVG(valor_pago) as media FROM apostas WHERE usuario_id = ?",
        [userId],
      );
      const mediaPontos = avgRows[0].media ? Math.round(avgRows[0].media) : 0;

      // 1. Trazemos a coluna 'motivo' da tabela
      const [histRows] = await connection.execute(
        "SELECT pontos_antes, pontos_depois, data_alteracao, motivo FROM historico_pontos WHERE usuario_id = ? ORDER BY data_alteracao DESC LIMIT 8",
        [userId],
      );

      const historico = histRows
        .map((row) => {
          const valor = Math.abs(row.pontos_depois - row.pontos_antes);
          const tipo =
            row.pontos_depois >= row.pontos_antes ? "credito" : "gasto";

          const dataObj = new Date(row.data_alteracao);
          const dia = String(dataObj.getDate()).padStart(2, "0");
          const mes = String(dataObj.getMonth() + 1).padStart(2, "0");

          // 2. Limpamos os prefixos técnicos para mostrar apenas o nome do evento no gráfico
          let evento = row.motivo || "Movimentação";
          if (evento.includes("BID Único:"))
            evento = evento.replace("BID Único:", "").trim();
          if (evento.includes("VITORIA BID:"))
            evento = evento.split("(")[0].replace("VITORIA BID:", "").trim();
          if (evento.includes("REEMBOLSO:"))
            evento = evento.replace("REEMBOLSO:", "").trim();

          return { valor, tipo, data: `${dia}/${mes}`, evento }; // Retornamos o evento
        })
        .reverse();

      res.json({
        stats: { bidsVencidos, mediaPontos },
        historico: historico,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Erro getUserStats:", error);
    res.status(500).json({ error: "Erro ao carregar estatísticas." });
  }
};

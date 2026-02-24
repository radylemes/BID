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

// ============================================================
// MOTOR DE AUDITORIA GLOBAL
// ============================================================
async function gravarAuditoria(
  connection,
  adminId,
  modulo,
  acao,
  registroId,
  detalhes,
) {
  try {
    const executor = connection || db;
    await executor.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [
        adminId || 1,
        modulo,
        acao,
        registroId || null,
        JSON.stringify(detalhes),
      ],
    );
  } catch (e) {
    console.error("Falha ao gravar auditoria:", e.message);
  }
}

// Converte Texto para IDs Relacionais do Organograma
async function getOrCreateEmpresaSetor(connection, empNome, setNome) {
  const eName =
    empNome && String(empNome).trim() !== "" ? String(empNome).trim() : "Geral";
  const sName =
    setNome && String(setNome).trim() !== "" ? String(setNome).trim() : "Geral";

  let [empRows] = await connection.execute(
    "SELECT id FROM empresas WHERE nome = ?",
    [eName],
  );
  let empId =
    empRows.length > 0
      ? empRows[0].id
      : (
          await connection.execute(
            "INSERT INTO empresas (nome, descricao) VALUES (?, '')",
            [eName],
          )
        )[0].insertId;

  let [setRows] = await connection.execute(
    "SELECT id FROM setores WHERE nome = ? AND empresa_id = ?",
    [sName, empId],
  );
  let setId =
    setRows.length > 0
      ? setRows[0].id
      : (
          await connection.execute(
            "INSERT INTO setores (nome, empresa_id) VALUES (?, ?)",
            [sName, empId],
          )
        )[0].insertId;

  return { empId, setId };
}

exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.*, e.nome AS empresa_nome, s.nome AS setor_nome, g.nome AS grupo_nome
      FROM usuarios u
      LEFT JOIN empresas e ON u.empresa_id = e.id
      LEFT JOIN setores s ON u.setor_id = s.id
      LEFT JOIN grupos g ON u.grupo_id = g.id
      ORDER BY u.nome_completo ASC
    `);

    const mapped = rows.map((r) => ({
      ...r,
      empresa: r.empresa_nome || "Sem Empresa",
      setor: r.setor_nome || "Sem Setor",
      grupo_nome: r.grupo_nome || "Sem Grupo de Aposta",
      grupo_id: r.grupo_id,
    }));
    res.json(mapped);
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

// ============================================================
// SINCRONIZAÇÃO DO AD (COM AUDITORIA E FILTRO ESTRITO)
// ============================================================
exports.syncUsers = async (req, res) => {
  const adminId = req.body.adminId || 1;
  console.log("🔄 Iniciando sincronização com Azure AD...");

  try {
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
    const graphResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,mail,department,jobTitle,userPrincipalName,accountEnabled,companyName",
      {
        headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
      },
    );
    const adUsers = graphResponse.data.value;

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      for (const adUser of adUsers) {
        const email = adUser.mail || adUser.userPrincipalName;
        const setorTxt = adUser.department || adUser.jobTitle;

        // FILTRO ESTRITO: Ignora quem não tem email ou não tem setor
        if (!email || !setorTxt) {
          ignorados++;
          continue;
        }

        const empresaTxt = adUser.companyName || "Geral";
        const nome = adUser.displayName;
        const oid = adUser.id;
        const ativo = adUser.accountEnabled !== false ? 1 : 0;
        let username = email.split("@")[0];

        const { empId, setId } = await getOrCreateEmpresaSetor(
          connection,
          empresaTxt,
          setorTxt,
        );
        const [existing] = await connection.execute(
          "SELECT id FROM usuarios WHERE email = ? OR microsoft_id = ?",
          [email, oid],
        );

        if (existing.length === 0) {
          const [uCheck] = await connection.execute(
            "SELECT id FROM usuarios WHERE username = ?",
            [username],
          );
          if (uCheck.length > 0)
            username = `${username}.${Math.floor(Math.random() * 1000)}`;

          await connection.execute(
            `INSERT INTO usuarios (username, nome_completo, email, is_ad_user, empresa_id, setor_id, pontos, senha_hash, perfil, ativo, microsoft_id)
             VALUES (?, ?, ?, 1, ?, ?, 0, 'MS_AUTH_AD', 'USER', ?, ?)`,
            [username, nome, email, empId, setId, ativo, oid],
          );
          criados++;
        } else {
          await connection.execute(
            "UPDATE usuarios SET empresa_id = ?, setor_id = ?, nome_completo = ?, microsoft_id = ?, ativo = ? WHERE id = ?",
            [empId, setId, nome, oid, ativo, existing[0].id],
          );
          atualizados++;
        }
      }

      // LOG DE AUDITORIA DO SYNC GERAL
      await gravarAuditoria(connection, adminId, "SISTEMA", "SYNC_AD", null, {
        criados,
        atualizados,
        ignorados,
      });
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    res.json({
      message: "Sincronização concluída com sucesso!",
      details: `Criados: ${criados}, Atualizados: ${atualizados}, Ignorados (Sem Setor/Email): ${ignorados}.`,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro interno.", details: error.message });
  }
};

// ============================================================
// IMPORTAÇÃO VIA EXCEL (EMPRESA/SETOR + GRUPO DE APOSTA)
// ============================================================
exports.bulkUpdate = async (req, res) => {
  const { alteracoes, adminId, motivoGlobal } = req.body;
  if (!alteracoes || alteracoes.length === 0)
    return res.status(400).json({ error: "Nenhum dado recebido." });

  const connection = await db.getConnection();
  try {
    const [gruposDb] = await connection.execute("SELECT id, nome FROM grupos");
    const mapaGrupos = {};
    gruposDb.forEach((g) => {
      if (g.nome) mapaGrupos[g.nome.toUpperCase().trim()] = g.id;
    });

    await connection.beginTransaction();
    let atualizados = 0;

    for (const item of alteracoes) {
      if (!item.email) continue;

      let ativoFinal = 1;
      const vStatus = item.ativo !== undefined ? item.ativo : item.status;
      if (
        vStatus !== null &&
        [
          "0",
          "false",
          "falso",
          "inativo",
          "desativado",
          "não",
          "no",
          "off",
        ].includes(String(vStatus).trim().toLowerCase())
      )
        ativoFinal = 0;

      let perfilFinal =
        item.perfil && String(item.perfil).trim().toUpperCase() === "ADMIN"
          ? "ADMIN"
          : "USER";

      // Organograma
      const { empId, setId } = await getOrCreateEmpresaSetor(
        connection,
        item.empresa,
        item.setor,
      );

      // Lógica de Negócio (Grupo de Aposta)
      let grupoIdFinal = null;
      const nomeGrupoExcel =
        item.grupo || item.Grupo || item.group || item.Group;
      if (
        nomeGrupoExcel &&
        mapaGrupos[String(nomeGrupoExcel).toUpperCase().trim()]
      ) {
        grupoIdFinal = mapaGrupos[String(nomeGrupoExcel).toUpperCase().trim()];
      }

      const [rowsUser] = await connection.execute(
        "SELECT id, pontos FROM usuarios WHERE email = ?",
        [item.email],
      );

      if (rowsUser.length > 0) {
        const u = rowsUser[0];
        await connection.execute(
          `UPDATE usuarios SET nome_completo = ?, empresa_id = ?, setor_id = ?, grupo_id = ?, pontos = ?, perfil = ?, ativo = ? WHERE id = ?`,
          [
            item.nome_completo || item.Nome,
            empId,
            setId,
            grupoIdFinal,
            item.pontos || 0,
            perfilFinal,
            ativoFinal,
            u.id,
          ],
        );
      } else {
        const username =
          item.email.split("@")[0] + Math.floor(Math.random() * 100);
        await connection.execute(
          `INSERT INTO usuarios (nome_completo, email, username, empresa_id, setor_id, grupo_id, pontos, perfil, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.nome_completo || item.Nome,
            item.email,
            username,
            empId,
            setId,
            grupoIdFinal,
            item.pontos || 0,
            perfilFinal,
            ativoFinal,
          ],
        );
      }
      atualizados++;
    }

    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "IMPORT_EXCEL",
      null,
      { linhas_processadas: atualizados, motivo: motivoGlobal },
    );
    await connection.commit();
    res.json({
      message: `Importação concluída! ${atualizados} linhas processadas.`,
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// AÇÕES INDIVIDUAIS COM AUDITORIA
// ============================================================
exports.toggleStatus = async (req, res) => {
  const { id } = req.params;
  const { ativo, adminId } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE usuarios SET ativo = ? WHERE id = ?", [
      ativo ? 1 : 0,
      id,
    ]);
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
      [id, adminId || 1, `Status alterado para ${ativo ? "ATIVO" : "INATIVO"}`],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "UPDATE_STATUS",
      id,
      { ativo: ativo },
    );
    await connection.commit();
    res.json({ message: `Status atualizado` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro" });
  } finally {
    connection.release();
  }
};

exports.mudarPerfil = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE usuarios SET perfil = ? WHERE id = ?", [
      req.body.perfil,
      req.params.id,
    ]);
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
      [
        req.params.id,
        req.body.adminId || 1,
        `Alteração de Perfil para ${req.body.perfil}`,
      ],
    );

    await gravarAuditoria(
      connection,
      req.body.adminId,
      "USUARIOS",
      "UPDATE_PERFIL",
      req.params.id,
      { novo_perfil: req.body.perfil },
    );
    await connection.commit();
    res.json({ message: "Perfil atualizado!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro" });
  } finally {
    connection.release();
  }
};

exports.updatePontos = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [user] = await connection.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [req.params.id],
    );
    await connection.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
      req.body.novosPontos,
      req.params.id,
    ]);
    await connection.execute(
      "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
      [
        req.params.id,
        req.body.adminId || 1,
        user[0]?.pontos || 0,
        req.body.novosPontos,
        req.body.motivo || "Ajuste manual",
      ],
    );

    await gravarAuditoria(
      connection,
      req.body.adminId,
      "USUARIOS",
      "UPDATE_PONTOS",
      req.params.id,
      {
        pontos_antes: user[0]?.pontos,
        pontos_depois: req.body.novosPontos,
        motivo: req.body.motivo,
      },
    );
    await connection.commit();
    res.json({ message: "Pontos atualizados" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro" });
  } finally {
    connection.release();
  }
};

exports.updateUserGroup = async (req, res) => {
  const { usuarioId, grupoId, motivo, adminId } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE usuarios SET grupo_id = ? WHERE id = ?", [
      grupoId || null,
      usuarioId,
    ]);
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, 0, ?)`,
      [usuarioId, adminId || 1, `Grupo de Aposta Atualizado. Obs: ${motivo}`],
    );

    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "UPDATE_GRUPO_APOSTA",
      usuarioId,
      { novo_grupo_id: grupoId, motivo },
    );
    await connection.commit();
    res.json({ message: "Grupo de apostas atualizado!" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Erro interno ao salvar." });
  } finally {
    connection.release();
  }
};

exports.createUser = async (req, res) => {
  const {
    nome_completo,
    email,
    username,
    senha,
    perfil,
    setor_id,
    empresa_id,
    grupo_id,
    pontos,
    motivo, // <--- Puxando o motivo aqui também
    adminId,
  } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const hashedPassword = await bcrypt.hash(senha, 10);
    const empId = empresa_id && empresa_id !== "null" ? empresa_id : null;
    const setId = setor_id && setor_id !== "null" ? setor_id : null;
    const grpId = grupo_id && grupo_id !== "null" ? grupo_id : null;
    const pontosIniciais = pontos ? Number(pontos) : 0;

    const [result] = await connection.execute(
      `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, ativo, empresa_id, setor_id, grupo_id, pontos) VALUES (?, ?, ?, ?, 0, ?, 1, ?, ?, ?, ?)`,
      [
        username,
        nome_completo,
        email,
        hashedPassword,
        perfil || "USER",
        empId,
        setId,
        grpId,
        pontosIniciais,
      ],
    );

    const novoUserId = result.insertId;

    // Grava no Histórico
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, ?, ?)`,
      [
        novoUserId,
        adminId || 1,
        pontosIniciais,
        motivo || "Criação de Usuário",
      ],
    );

    // Grava na Auditoria
    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "CREATE_USER",
      novoUserId,
      { email, username, perfil, pontos_iniciais: pontosIniciais, motivo },
    );

    await connection.commit();
    res.status(201).json({ message: "Criado com sucesso!" });
  } catch (error) {
    await connection.rollback();
    console.error("Erro no createUser:", error);
    res.status(500).json({ message: "Erro" });
  } finally {
    connection.release();
  }
};

exports.updateUserManual = async (req, res) => {
  const {
    nome_completo,
    email,
    username,
    senha,
    empresa_id,
    setor_id,
    grupo_id,
    pontos,
    motivo, // <--- Agora estamos puxando o motivo
    adminId,
  } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Pega os pontos ANTES da edição para o Histórico
    const [oldUserRows] = await connection.execute(
      "SELECT pontos FROM usuarios WHERE id = ?",
      [req.params.id],
    );
    const pontosAntes = oldUserRows.length > 0 ? oldUserRows[0].pontos : 0;
    const pontosDepois = pontos ? Number(pontos) : 0;

    let qSenha = "";
    let pSenha = [];
    if (senha) {
      qSenha = ", senha_hash = ?";
      pSenha.push(await bcrypt.hash(senha, 10));
    }

    const empId =
      empresa_id && String(empresa_id) !== "null" ? empresa_id : null;
    const setId = setor_id && String(setor_id) !== "null" ? setor_id : null;
    const grpId = grupo_id && String(grupo_id) !== "null" ? grupo_id : null;

    // 2. Executa a Edição
    await connection.execute(
      `UPDATE usuarios SET nome_completo = ?, email = ?, username = ?, empresa_id = ?, setor_id = ?, grupo_id = ?, pontos = ? ${qSenha} WHERE id = ?`,
      [
        nome_completo,
        email,
        username,
        empId,
        setId,
        grpId,
        pontosDepois,
        ...pSenha,
        req.params.id,
      ],
    );

    // 3. Salva no Histórico de Pontos (Garante que apareça no 📜)
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.id,
        adminId || 1,
        pontosAntes,
        pontosDepois,
        motivo || "Edição de Cadastro",
      ],
    );

    // 4. Salva na Auditoria Invisível
    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "UPDATE_USER",
      req.params.id,
      {
        nome_completo,
        email,
        grupo_id: grpId,
        pontos_antes: pontosAntes,
        pontos_depois: pontosDepois,
        motivo,
      },
    );

    await connection.commit();
    res.json({ message: "Atualizado" });
  } catch (error) {
    await connection.rollback();
    console.error("Erro no updateUserManual:", error);
    res.status(500).json({ message: "Erro ao atualizar" });
  } finally {
    connection.release();
  }
};

exports.deleteUser = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM usuarios WHERE id = ?", [
      req.params.id,
    ]);
    await gravarAuditoria(
      connection,
      req.body.adminId,
      "USUARIOS",
      "DELETE_USER",
      req.params.id,
      { excluido_por: req.body.adminId },
    );
    await connection.commit();
    res.json({ message: "Excluído" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: "Erro" });
  } finally {
    connection.release();
  }
};

// ============================================================
// OUTROS (Não precisam de transação pesada)
// ============================================================
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Nenhuma imagem enviada." });

    // Pega o caminho do arquivo salvo pelo Multer
    const filePath = req.file.path.replace(/\\/g, "/");
    const userId = req.body.userId;

    await db.execute("UPDATE usuarios SET foto = ? WHERE id = ?", [
      filePath,
      userId,
    ]);
    res.json({ message: "Foto atualizada com sucesso", path: filePath });
  } catch (error) {
    console.error("Erro no upload do avatar:", error);
    res.status(500).json({ error: "Erro interno ao salvar a foto." });
  }
};

exports.getUserStats = async (req, res) => {
  const { id } = req.params;
  try {
    const [bids] = await db.execute(
      "SELECT COUNT(*) as vencidos FROM apostas WHERE usuario_id = ? AND status = 'GANHOU'",
      [id],
    );
    const [medias] = await db.execute(
      "SELECT AVG(valor_pago) as media FROM apostas WHERE usuario_id = ?",
      [id],
    );

    const [historico] = await db.execute(
      `
      SELECT pontos_antes, pontos_depois, motivo, data_alteracao 
      FROM historico_pontos 
      WHERE usuario_id = ? 
      ORDER BY data_alteracao DESC LIMIT 10
    `,
      [id],
    );

    // Busca quais eventos estão ABERTOS no momento
    const [partidasAbertas] = await db.execute(
      "SELECT titulo FROM partidas WHERE status = 'ABERTA'",
    );
    const titulosAbertos = partidasAbertas.map((p) => p.titulo.trim());

    const historicoFormatado = historico.map((h) => {
      const diff = h.pontos_depois - h.pontos_antes;
      const dataObj = new Date(h.data_alteracao);
      const dia = String(dataObj.getDate()).padStart(2, "0");
      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");

      let tipoFinal = "credito";

      // Se for uma dedução de pontos (diff < 0)
      if (diff < 0) {
        tipoFinal = "gasto"; // Padrão: Gasto Definitivo

        // Verifica se é uma dedução de lance (BID)
        if (h.motivo && h.motivo.startsWith("BID:")) {
          const tituloEvento = h.motivo.replace("BID:", "").trim();

          // Se o evento do lance AINDA estiver aberto, o ponto está BLOQUEADO!
          if (titulosAbertos.includes(tituloEvento)) {
            tipoFinal = "bloqueado";
          }
        }
      }

      return {
        valor: Math.abs(diff),
        tipo: tipoFinal,
        evento: h.motivo,
        data: `${dia}/${mes}`,
      };
    });

    res.json({
      stats: {
        bidsVencidos: bids[0].vencidos || 0,
        mediaPontos: Math.round(medias[0].media || 0),
      },
      historico: historicoFormatado.reverse(), // Inverte para a ordem cronológica do gráfico
    });
  } catch (error) {
    console.error("Erro nas estatísticas:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas do usuário" });
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

exports.addBatchPoints = async (req, res) => {
  // Recebe 'motive' do frontend (em inglês)
  const { targetType, targetIds, points, motive, adminId } = req.body;
  const pontosNum = Number(points);

  if (!targetType || !pontosNum || pontosNum <= 0 || !motive) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let whereClause = "ativo = 1"; // Atinge apenas usuários ativos
    let updateParams = [pontosNum];
    let whereParams = [];

    // Lida com as seleções múltiplas da Dual Listbox
    if (targetType !== "all") {
      if (!targetIds || targetIds.length === 0) {
        throw new Error("Nenhum alvo foi selecionado na lista.");
      }

      const placeholders = targetIds.map(() => "?").join(",");

      if (targetType === "empresas") {
        whereClause += ` AND empresa_id IN (${placeholders})`;
      } else if (targetType === "setores") {
        whereClause += ` AND setor_id IN (${placeholders})`;
      } else if (targetType === "users") {
        whereClause += ` AND id IN (${placeholders})`;
      }

      whereParams = [...targetIds];
      updateParams.push(...targetIds);
    }

    // 1. Executa o UPDATE em massa
    const [updateResult] = await connection.execute(
      `UPDATE usuarios SET pontos = pontos + ? WHERE ${whereClause}`,
      updateParams,
    );

    const affectedRows = updateResult.affectedRows;
    if (affectedRows === 0)
      throw new Error("Nenhum usuário encontrado com os filtros selecionados.");

    // 2. Insere no Histórico de Pontos em massa
    await connection.execute(
      `
      INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo)
      SELECT id, ?, (pontos - ?), pontos, ? FROM usuarios WHERE ${whereClause}
    `,
      [adminId || 1, pontosNum, motive, ...whereParams],
    ); // Aqui usamos 'motive'

    // 3. Grava Auditoria Global (Usando a função segura gravarAuditoria)
    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "BATCH_PONTOS",
      null,
      {
        filtro: targetType,
        alvos: targetIds,
        qtd_usuarios: affectedRows,
        pontos_add: pontosNum,
        justificativa: motive, // Mapeado perfeitamente de 'motive' para o JSON
      },
    );

    await connection.commit();
    res.json({
      message: `${affectedRows} usuários receberam ${pontosNum} pontos!`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Erro no batch points:", error);
    res.status(500).json({ message: error.message || "Erro interno." });
  } finally {
    connection.release();
  }
};

exports.getGruposApostas = async (req, res) => {
  try {
    const [rows] = await db.execute(
      "SELECT id, nome FROM grupos ORDER BY nome ASC",
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar grupos de apostas" });
  }
};

exports.updateBatchGroup = async (req, res) => {
  const { targetType, targetIds, grupoId, motive, adminId } = req.body;

  if (!targetType || !motive) {
    return res.status(400).json({ message: "Dados inválidos." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let whereClause = "ativo = 1"; // Atinge apenas usuários ativos
    let updateParams = [grupoId || null];
    let whereParams = [];

    // Lida com as seleções múltiplas da Dual Listbox
    if (targetType !== "all") {
      if (!targetIds || targetIds.length === 0) {
        throw new Error("Nenhum alvo foi selecionado na lista.");
      }
      const placeholders = targetIds.map(() => "?").join(",");
      if (targetType === "empresas") {
        whereClause += ` AND empresa_id IN (${placeholders})`;
      } else if (targetType === "setores") {
        whereClause += ` AND setor_id IN (${placeholders})`;
      } else if (targetType === "users") {
        whereClause += ` AND id IN (${placeholders})`;
      }
      whereParams = [...targetIds];
      updateParams.push(...targetIds);
    }

    // 1. Executa o UPDATE em massa do Grupo
    const [updateResult] = await connection.execute(
      `UPDATE usuarios SET grupo_id = ? WHERE ${whereClause}`,
      updateParams,
    );

    const affectedRows = updateResult.affectedRows;
    if (affectedRows === 0) {
      throw new Error("Nenhum usuário encontrado com os filtros selecionados.");
    }

    // 2. Insere no Histórico (Ícone de pergaminho 📜), mostrando que os pontos não mudaram, mas o cadastro sim
    await connection.execute(
      `
      INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo)
      SELECT id, ?, pontos, pontos, ? FROM usuarios WHERE ${whereClause}
    `,
      [adminId || 1, `Troca em Lote: ${motive}`, ...whereParams],
    );

    // 3. Grava Auditoria Global
    await gravarAuditoria(
      connection,
      adminId,
      "USUARIOS",
      "BATCH_GROUP",
      null,
      {
        filtro: targetType,
        alvos: targetIds,
        qtd_usuarios: affectedRows,
        novo_grupo_id: grupoId,
        justificativa: motive,
      },
    );

    await connection.commit();
    res.json({
      message: `${affectedRows} usuários foram atualizados com sucesso!`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Erro no batch group:", error);
    res.status(500).json({ message: error.message || "Erro interno." });
  } finally {
    connection.release();
  }
};

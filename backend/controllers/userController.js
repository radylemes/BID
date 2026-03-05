const db = require("../config/db");
const multer = require("multer");
const path = require("path");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const qs = require("qs");
const fs = require("fs");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes, truncateMotivo, safeInt } = require("../utils/dbHelpers");

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
        safeAuditoriaDetalhes(detalhes),
      ],
    );
  } catch (e) {
    await logErro("USER_CONTROLLER_GRAVAR_AUDITORIA", e);
  }
}

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
    await logErro("USER_CONTROLLER_GET_ALL", error);
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
    await logErro("USER_CONTROLLER_GET_BY_ID", error);
    res.status(500).json({ error: "Erro" });
  }
};

/** Retorna a lista de configurações de tenants (tenant 1 + tenant 2 se configurado). */
function getTenantConfigs() {
  const configs = [
    {
      label: "Tenant 1",
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
  ];
  if (process.env.AZURE_TENANT_ID_2 && process.env.AZURE_CLIENT_ID_2 && process.env.AZURE_CLIENT_SECRET_2) {
    configs.push({
      label: "Tenant 2",
      tenantId: process.env.AZURE_TENANT_ID_2,
      clientId: process.env.AZURE_CLIENT_ID_2,
      clientSecret: process.env.AZURE_CLIENT_SECRET_2,
    });
  }
  return configs;
}

/**
 * GET /api/users/tenants-status — Diagnóstico: testa conexão e permissão Graph em cada tenant.
 */
exports.getTenantsStatus = async (req, res) => {
  try {
    const configs = getTenantConfigs();
    const results = [];
    for (const config of configs) {
      const item = {
        label: config.label,
        tenantId: config.tenantId,
        status: "error",
        message: null,
        userCount: null,
      };
      try {
        const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
        const tokenData = qs.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        });
        const tokenResponse = await axios.post(tokenUrl, tokenData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (tokenResponse.status !== 200 || !tokenResponse.data?.access_token) {
          item.message = "Falha ao obter token OAuth";
          results.push(item);
          continue;
        }
        const graphResponse = await axios.get(
          "https://graph.microsoft.com/v1.0/users?$top=1&$select=id",
          {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
            validateStatus: () => true,
          },
        );
        if (graphResponse.status === 200 && Array.isArray(graphResponse.data?.value)) {
          item.status = "ok";
          item.message = "Conectado e com permissão para listar usuários (User.Read.All)";
        } else {
          const msg = graphResponse.data?.error?.message || graphResponse.statusText || `HTTP ${graphResponse.status}`;
          item.message = `${graphResponse.status}: ${msg}`;
        }
      } catch (err) {
        item.message = err.response?.data?.error?.message || err.message || "Erro ao conectar";
      }
      results.push(item);
    }
    res.json({ tenants: results });
  } catch (error) {
    await logErro("USER_CONTROLLER_GET_TENANTS_STATUS", error);
    res.status(500).json({ error: "Erro ao verificar tenants.", details: error.message });
  }
};

exports.syncUsers = async (req, res) => {
  const adminId = req.body.adminId || 1;
  try {
    const tenantConfigs = getTenantConfigs().map((c) => ({
      tenantId: c.tenantId,
      clientId: c.clientId,
      clientSecret: c.clientSecret,
    }));

    const adUsers = [];
    const tenantErrors = [];
    for (const config of tenantConfigs) {
      try {
        const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
        const tokenData = qs.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        });
        const tokenResponse = await axios.post(tokenUrl, tokenData, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        if (tokenResponse.status !== 200 || !tokenResponse.data?.access_token) {
          tenantErrors.push(`Tenant ${config.tenantId}: falha ao obter token`);
          continue;
        }
        const graphResponse = await axios.get(
          "https://graph.microsoft.com/v1.0/users?$top=999&$filter=accountEnabled eq true&$select=id,displayName,mail,department,jobTitle,userPrincipalName,accountEnabled,companyName",
          {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` },
            validateStatus: () => true,
          },
        );
        if (graphResponse.status === 200 && Array.isArray(graphResponse.data?.value)) {
          adUsers.push(...graphResponse.data.value);
        } else {
          const msg = graphResponse.data?.error?.message || graphResponse.statusText || `HTTP ${graphResponse.status}`;
          tenantErrors.push(`Tenant ${config.tenantId}: ${graphResponse.status} - ${msg}`);
        }
      } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.error?.message || err.message || "Erro desconhecido";
        tenantErrors.push(`Tenant ${config.tenantId}: ${status || "erro"} - ${msg}`);
        await logErro("USER_CONTROLLER_SYNC_TENANT", err);
      }
    }

    if (adUsers.length === 0 && tenantErrors.length > 0) {
      return res.status(502).json({
        error: "Nenhum usuário obtido dos tenants.",
        details: "Todos os tenants falharam. Verifique permissões da aplicação no Azure AD (ex.: User.Read.All com consentimento de admin).",
        tenantErrors,
      });
    }

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let ocultados = 0;
    let apagados = 0;
    const activeAdOids = new Set();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      for (const adUser of adUsers) {
        const email = adUser.mail || adUser.userPrincipalName;
        const setorTxt = adUser.department || adUser.jobTitle;

        if (!email || !setorTxt) {
          ignorados++;
          continue;
        }

        const empresaTxt = adUser.companyName || "Geral";
        const nome = adUser.displayName;
        const oid = adUser.id;
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
            `INSERT INTO usuarios (username, nome_completo, email, is_ad_user, empresa_id, setor_id, pontos, senha_hash, perfil, ativo, microsoft_id) VALUES (?, ?, ?, 1, ?, ?, 0, 'MS_AUTH_AD', 'USER', 1, ?)`,
            [username, nome, email, empId, setId, oid],
          );
          criados++;
        } else {
          await connection.execute(
            "UPDATE usuarios SET empresa_id = ?, setor_id = ?, nome_completo = ?, microsoft_id = ?, ativo = 1 WHERE id = ?",
            [empId, setId, nome, oid, existing[0].id],
          );
          atualizados++;
        }
        activeAdOids.add(oid);
      }

      // Utilizadores locais do AD que não estão na lista de ativos: ocultar (se tiverem histórico) ou apagar
      const [localAdUsers] = await connection.execute(
        "SELECT id, microsoft_id FROM usuarios WHERE microsoft_id IS NOT NULL AND microsoft_id != ''"
      );
      for (const row of localAdUsers) {
        if (activeAdOids.has(row.microsoft_id)) continue;
        const userId = row.id;
        const [apostasRows] = await connection.execute("SELECT 1 FROM apostas WHERE usuario_id = ? LIMIT 1", [userId]);
        const [histRows] = await connection.execute("SELECT 1 FROM historico_pontos WHERE usuario_id = ? LIMIT 1", [userId]);
        const [convRows] = await connection.execute("SELECT 1 FROM convidados WHERE usuario_id = ? LIMIT 1", [userId]);
        const temHistorico = apostasRows.length > 0 || histRows.length > 0 || convRows.length > 0;
        if (temHistorico) {
          await connection.execute("UPDATE usuarios SET ativo = 0 WHERE id = ?", [userId]);
          ocultados++;
        } else {
          await connection.execute("DELETE FROM usuarios WHERE id = ?", [userId]);
          apagados++;
        }
      }

      await gravarAuditoria(connection, adminId, "SISTEMA", "SYNC_AD", null, {
        criados,
        atualizados,
        ignorados,
        ocultados,
        apagados,
      });
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const parts = [`Criados: ${criados}`, `Atualizados: ${atualizados}`, `Ignorados: ${ignorados}`];
    if (ocultados > 0) parts.push(`Ocultados (inativos com histórico): ${ocultados}`);
    if (apagados > 0) parts.push(`Apagados (inativos sem histórico): ${apagados}`);
    const details = parts.join(", ") + ".";
    res.json({
      message: "Sincronização concluída com sucesso!",
      details: tenantErrors.length > 0 ? `${details} Avisos: ${tenantErrors.join("; ")}` : details,
      tenantErrors: tenantErrors.length > 0 ? tenantErrors : undefined,
    });
  } catch (error) {
    await logErro("USER_CONTROLLER_SYNC_USERS", error);
    res.status(500).json({ error: "Erro interno.", details: error.message });
  }
};

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
      const { empId, setId } = await getOrCreateEmpresaSetor(
        connection,
        item.empresa,
        item.setor,
      );

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
    await logErro("USER_CONTROLLER_BULK_UPDATE", error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

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
      [id, adminId || 1, truncateMotivo(`Status alterado para ${ativo ? "ATIVO" : "INATIVO"}`)],
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
    await logErro("USER_CONTROLLER_TOGGLE_STATUS", error);
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
        truncateMotivo(`Alteração de Perfil para ${req.body.perfil}`),
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
    await logErro("USER_CONTROLLER_MUDAR_PERFIL", error);
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
        truncateMotivo(req.body.motivo || "Ajuste manual"),
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
    await logErro("USER_CONTROLLER_UPDATE_PONTOS", error);
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
      [usuarioId, adminId || 1, truncateMotivo(`Grupo de Aposta Atualizado. Obs: ${motivo}`)],
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
    await logErro("USER_CONTROLLER_UPDATE_USER_GROUP", error);
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
    motivo,
    adminId,
  } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const hashedPassword = await bcrypt.hash(senha, 10);
    const empId = safeInt(empresa_id);
    const setId = safeInt(setor_id);
    const grpId = safeInt(grupo_id);
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

    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, 0, ?, ?)`,
      [
        novoUserId,
        adminId || 1,
        pontosIniciais,
        truncateMotivo(motivo || "Criação de Usuário"),
      ],
    );
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
    await logErro("USER_CONTROLLER_CREATE_USER", error);
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
    motivo,
    adminId,
  } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

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
    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)`,
      [
        req.params.id,
        adminId || 1,
        pontosAntes,
        pontosDepois,
        truncateMotivo(motivo || "Edição de Cadastro"),
      ],
    );
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
    await logErro("USER_CONTROLLER_UPDATE_USER_MANUAL", error);
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
    await logErro("USER_CONTROLLER_DELETE_USER", error);
    res.status(500).json({ message: "Erro" });
  } finally {
    connection.release();
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    const filePath = req.file.path.replace(/\\/g, "/");
    const userId = req.body.userId;
    await db.execute("UPDATE usuarios SET foto = ? WHERE id = ?", [
      filePath,
      userId,
    ]);
    res.json({ message: "Foto atualizada com sucesso", path: filePath });
  } catch (error) {
    await logErro("USER_CONTROLLER_UPLOAD_AVATAR", error);
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
      `SELECT pontos_antes, pontos_depois, motivo, data_alteracao FROM historico_pontos WHERE usuario_id = ? ORDER BY data_alteracao DESC LIMIT 10`,
      [id],
    );
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
      if (diff < 0) {
        tipoFinal = "gasto";
        if (h.motivo && h.motivo.startsWith("BID:")) {
          const tituloEvento = h.motivo.replace("BID:", "").trim();
          if (titulosAbertos.includes(tituloEvento)) tipoFinal = "bloqueado";
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
      historico: historicoFormatado.reverse(),
    });
  } catch (error) {
    await logErro("USER_CONTROLLER_GET_USER_STATS", error);
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
    await logErro("USER_CONTROLLER_GET_HISTORICO", error);
    res.status(500).json({ error: "Erro" });
  }
};

exports.addBatchPoints = async (req, res) => {
  const { targetType, targetIds, points, motive, adminId } = req.body;
  const pontosNum = Number(points);

  if (!targetType || !pontosNum || pontosNum <= 0 || !motive)
    return res.status(400).json({ message: "Dados inválidos." });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let whereClause = "ativo = 1";
    let updateParams = [pontosNum];
    let whereParams = [];

    if (targetType !== "all") {
      if (!targetIds || targetIds.length === 0)
        throw new Error("Nenhum alvo foi selecionado na lista.");
      const placeholders = targetIds.map(() => "?").join(",");
      if (targetType === "empresas")
        whereClause += ` AND empresa_id IN (${placeholders})`;
      else if (targetType === "setores")
        whereClause += ` AND setor_id IN (${placeholders})`;
      else if (targetType === "users")
        whereClause += ` AND id IN (${placeholders})`;
      else if (targetType === "grupos")
        whereClause += ` AND grupo_id IN (${placeholders})`;

      whereParams = [...targetIds];
      updateParams.push(...targetIds);
    }

    const [updateResult] = await connection.execute(
      `UPDATE usuarios SET pontos = pontos + ? WHERE ${whereClause}`,
      updateParams,
    );
    const affectedRows = updateResult.affectedRows;
    if (affectedRows === 0)
      throw new Error("Nenhum usuário encontrado com os filtros selecionados.");

    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) SELECT id, ?, (pontos - ?), pontos, ? FROM usuarios WHERE ${whereClause}`,
      [adminId || 1, pontosNum, truncateMotivo(motive), ...whereParams],
    );
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
        justificativa: motive,
      },
    );

    await connection.commit();
    res.json({
      message: `${affectedRows} usuários receberam ${pontosNum} pontos!`,
    });
  } catch (error) {
    await connection.rollback();
    await logErro("USER_CONTROLLER_ADD_BATCH_POINTS", error);
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
    await logErro("USER_CONTROLLER_GET_GRUPOS_APOSTAS", error);
    res.status(500).json({ error: "Erro ao buscar grupos de apostas" });
  }
};

exports.updateBatchGroup = async (req, res) => {
  const { targetType, targetIds, grupoId, motive, adminId } = req.body;

  if (!targetType || !motive)
    return res.status(400).json({ message: "Dados inválidos." });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let whereClause = "ativo = 1";
    let updateParams = [grupoId || null];
    let whereParams = [];

    if (targetType !== "all") {
      if (!targetIds || targetIds.length === 0)
        throw new Error("Nenhum alvo foi selecionado na lista.");
      const placeholders = targetIds.map(() => "?").join(",");
      if (targetType === "empresas")
        whereClause += ` AND empresa_id IN (${placeholders})`;
      else if (targetType === "setores")
        whereClause += ` AND setor_id IN (${placeholders})`;
      else if (targetType === "users")
        whereClause += ` AND id IN (${placeholders})`;
      else if (targetType === "grupos")
        whereClause += ` AND grupo_id IN (${placeholders})`;

      whereParams = [...targetIds];
      updateParams.push(...targetIds);
    }

    const [updateResult] = await connection.execute(
      `UPDATE usuarios SET grupo_id = ? WHERE ${whereClause}`,
      updateParams,
    );
    const affectedRows = updateResult.affectedRows;
    if (affectedRows === 0)
      throw new Error("Nenhum usuário encontrado com os filtros selecionados.");

    await connection.execute(
      `INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) SELECT id, ?, pontos, pontos, ? FROM usuarios WHERE ${whereClause}`,
      [adminId || 1, truncateMotivo(`Troca em Lote: ${motive}`), ...whereParams],
    );
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
    await logErro("USER_CONTROLLER_UPDATE_BATCH_GROUP", error);
    res.status(500).json({ message: error.message || "Erro interno." });
  } finally {
    connection.release();
  }
};

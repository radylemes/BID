const db = require("../config/db");
const nodemailer = require("nodemailer");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");

/**
 * Obtém transporter Nodemailer a partir das configurações em configuracoes.
 * Retorna null se SMTP não configurado.
 * Compatível com Office 365 / Microsoft 365: host smtp.office365.com, porta 587, secure=false (STARTTLS).
 */
async function getSmtpTransporter() {
  const [rows] = await db.query(
    "SELECT chave, valor FROM configuracoes WHERE chave IN ('smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from')"
  );
  const cfg = rows.reduce((acc, r) => {
    acc[r.chave] = r.valor;
    return acc;
  }, {});
  const host = cfg.smtp_host && String(cfg.smtp_host).trim();
  if (!host) return null;
  // Host deve ser um hostname (ex: smtp.dominio.com), não um e-mail
  if (host.includes("@")) {
    throw new Error(
      "Host SMTP não pode ser um e-mail. Use o endereço do servidor (ex: smtp.office365.com ou smtp.dominio.com)."
    );
  }
  const port = parseInt(cfg.smtp_port, 10) || 587;
  const secure = cfg.smtp_secure === "1" || cfg.smtp_secure === "true";
  return nodemailer.createTransport({
    host,
    port,
    secure, // false = usa STARTTLS na porta 587 (Office 365); true = SSL na porta 465
    auth:
      cfg.smtp_user && cfg.smtp_pass
        ? { user: cfg.smtp_user, pass: cfg.smtp_pass }
        : undefined,
  });
}

/**
 * Retorna a URL base pública da API (para montar URLs de imagens em e-mails).
 * Ordem: configuração app_base_url, variável API_PUBLIC_URL.
 */
async function getBaseUrl() {
  const [rows] = await db.query(
    "SELECT valor FROM configuracoes WHERE chave = 'app_base_url' LIMIT 1"
  );
  const fromConfig = rows[0]?.valor?.trim();
  if (fromConfig) return fromConfig.replace(/\/$/, "");
  return (process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
}

/**
 * Substitui tags {{evento.campo}} e {{usuario.campo}} no texto pelos valores do contexto.
 * @param {string} text - Texto com tags
 * @param {{ evento?: object, usuario?: object }} context
 * @returns {string}
 */
function replaceTemplateTags(text, context = {}) {
  if (!text || typeof text !== "string") return text;
  let result = text;
  const tagRegex = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const key = match[1].trim();
    const parts = key.split(".");
    let value = context;
    for (const p of parts) {
      value = value != null && typeof value === "object" ? value[p] : undefined;
    }
    const replacement = value != null ? String(value) : "";
    result = result.split(match[0]).join(replacement);
  }
  return result;
}

/** Datas no banco estão em UTC; interpreta como UTC e formata no fuso do Brasil. */
const TZ_BR = "America/Sao_Paulo";

function parseDbUtc(dataVal) {
  if (dataVal == null) return null;
  if (dataVal instanceof Date) return new Date(dataVal.toISOString());
  const s = String(dataVal).trim().replace(" ", "T");
  return new Date(s.endsWith("Z") ? s : s + "Z");
}

/**
 * Extrai dia (DD), mês (MM) e hora (HH:mm) em horário do Brasil para uso em tags de template.
 * O valor vindo do banco é interpretado como UTC.
 * @param {Date|string|null} dataVal
 * @returns {{ dia: string, mes: string, hora: string }}
 */
function extrairPartesData(dataVal) {
  if (dataVal == null) return { dia: "", mes: "", hora: "" };
  const d = parseDbUtc(dataVal);
  if (!d || isNaN(d.getTime())) return { dia: "", mes: "", hora: "" };
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ_BR,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    dia: get("day"),
    mes: get("month"),
    hora: `${get("hour")}:${get("minute")}`,
  };
}

/** Formata data do banco (UTC) em string pt-BR no fuso do Brasil. */
function formatarDataPtBr(dataVal) {
  if (dataVal == null) return "";
  const d = parseDbUtc(dataVal);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { timeZone: TZ_BR });
}

async function gravarAuditoria(connection, adminId, modulo, acao, registroId, detalhes) {
  try {
    const executor = connection || db;
    await executor.execute(
      `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
      [adminId || 1, modulo, acao, registroId || null, safeAuditoriaDetalhes(detalhes)]
    );
  } catch (e) {
    await logErro("EMAIL_CONTROLLER_AUDITORIA", e);
  }
}

// ==================== TESTE SMTP ====================

exports.testSmtp = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to || !String(to).trim()) {
      return res.status(400).json({ error: "Informe o e-mail de destino para o teste." });
    }
    const transporter = await getSmtpTransporter();
    if (!transporter) {
      return res.status(400).json({
        error: "SMTP não configurado. Preencha Host e salve antes de testar.",
      });
    }
    const [cfgRows] = await db.query(
      "SELECT chave, valor FROM configuracoes WHERE chave = 'smtp_from'"
    );
    const smtpFrom = cfgRows[0]?.valor?.trim();
    if (!smtpFrom) {
      return res.status(400).json({
        error: "E-mail remetente (smtp_from) não configurado. Salve as configurações.",
      });
    }
    await transporter.sendMail({
      from: smtpFrom,
      to: String(to).trim(),
      subject: "Teste SMTP - BID",
      text: "Este é um e-mail de teste do sistema. Se você recebeu, a configuração SMTP está correta.",
      html: "<p>Este é um e-mail de <strong>teste</strong> do sistema.</p><p>Se você recebeu, a configuração SMTP está correta.</p>",
    });
    res.json({ message: "E-mail de teste enviado com sucesso." });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_TEST_SMTP", error);
    const msg = error.message || "Erro ao enviar e-mail de teste.";
    res.status(500).json({ error: msg });
  }
};

// ==================== LISTAS DE E-MAIL ====================

exports.getLists = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nome, descricao, criado_em FROM listas_email ORDER BY nome ASC"
    );
    res.json(rows);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_GET_LISTS", error);
    res.status(500).json({ error: "Erro ao listar listas de e-mail." });
  }
};

exports.createList = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome da lista é obrigatório." });
    }
    const [result] = await db.execute(
      "INSERT INTO listas_email (nome, descricao) VALUES (?, ?)",
      [String(nome).trim(), descricao ? String(descricao).trim() : null]
    );
    const [rows] = await db.query(
      "SELECT id, nome, descricao, criado_em FROM listas_email WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_CREATE_LIST", error);
    res.status(500).json({ error: "Erro ao criar lista." });
  }
};

exports.updateList = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao } = req.body;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome da lista é obrigatório." });
    }
    await db.execute(
      "UPDATE listas_email SET nome = ?, descricao = ? WHERE id = ?",
      [String(nome).trim(), descricao ? String(descricao).trim() : null, id]
    );
    const [rows] = await db.query(
      "SELECT id, nome, descricao, criado_em FROM listas_email WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Lista não encontrada." });
    res.json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_UPDATE_LIST", error);
    res.status(500).json({ error: "Erro ao atualizar lista." });
  }
};

exports.deleteList = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute("DELETE FROM listas_email WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Lista não encontrada." });
    }
    res.json({ message: "Lista excluída." });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_DELETE_LIST", error);
    res.status(500).json({ error: "Erro ao excluir lista." });
  }
};

exports.getListItens = async (req, res) => {
  try {
    const { listaId } = req.params;
    const [rows] = await db.query(
      "SELECT id, lista_id, email, nome_opcional, criado_em FROM listas_email_itens WHERE lista_id = ? ORDER BY email ASC",
      [listaId]
    );
    res.json(rows);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_GET_LIST_ITENS", error);
    res.status(500).json({ error: "Erro ao listar itens." });
  }
};

exports.addListItem = async (req, res) => {
  try {
    const { listaId } = req.params;
    const { email, nome_opcional } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }
    const [result] = await db.execute(
      "INSERT INTO listas_email_itens (lista_id, email, nome_opcional) VALUES (?, ?, ?)",
      [listaId, String(email).trim(), nome_opcional ? String(nome_opcional).trim() : null]
    );
    const [rows] = await db.query(
      "SELECT id, lista_id, email, nome_opcional, criado_em FROM listas_email_itens WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_ADD_LIST_ITEM", error);
    res.status(500).json({ error: "Erro ao adicionar e-mail." });
  }
};

exports.removeListItem = async (req, res) => {
  try {
    const { listaId, itemId } = req.params;
    const [result] = await db.execute(
      "DELETE FROM listas_email_itens WHERE id = ? AND lista_id = ?",
      [itemId, listaId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Item não encontrado." });
    }
    res.json({ message: "Item removido." });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_REMOVE_LIST_ITEM", error);
    res.status(500).json({ error: "Erro ao remover item." });
  }
};

/** Importa e-mails de um CSV. Aceita arquivo com colunas email e opcionalmente nome (ou nome,email). */
exports.importCsv = async (req, res) => {
  try {
    const { listaId } = req.params;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }
    const raw = (req.file.buffer || Buffer.from("")).toString("utf-8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      return res.status(400).json({ error: "O arquivo CSV está vazio." });
    }
    const separator = lines[0].includes(";") ? ";" : ",";
    const [existingRows] = await db.query(
      "SELECT LOWER(TRIM(email)) as email FROM listas_email_itens WHERE lista_id = ?",
      [listaId]
    );
    const existingSet = new Set(existingRows.map((r) => r.email));
    let headerDone = false;
    let emailCol = 0;
    let nomeCol = 1;
    const toInsert = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(separator).map((p) => p.trim().replace(/^["']|["']$/g, ""));
      if (parts.length === 0) continue;
      const first = (parts[0] || "").toLowerCase();
      if (!headerDone && i === 0 && (first === "email" || first === "e-mail" || first === "nome")) {
        headerDone = true;
        if (first === "nome" && parts.length > 1) {
          emailCol = 1;
          nomeCol = 0;
        }
        continue;
      }
      const email = (parts[emailCol] || "").trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const emailLower = email.toLowerCase();
      if (existingSet.has(emailLower)) continue;
      existingSet.add(emailLower);
      const nome = parts[nomeCol] ? parts[nomeCol].trim() : null;
      toInsert.push([listaId, email, nome || null]);
    }
    if (toInsert.length === 0) {
      return res.json({ adicionados: 0, mensagem: "Nenhum e-mail novo para importar (ou CSV inválido)." });
    }
    for (const row of toInsert) {
      await db.execute(
        "INSERT INTO listas_email_itens (lista_id, email, nome_opcional) VALUES (?, ?, ?)",
        row
      );
    }
    res.json({ adicionados: toInsert.length, mensagem: `${toInsert.length} e-mail(s) importado(s).` });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_IMPORT_CSV", error);
    res.status(500).json({ error: "Erro ao importar CSV." });
  }
};

/** Importa usuários do banco (tabela usuarios) para a lista. Opcional: somente_ativos, grupo_id. */
exports.importUsers = async (req, res) => {
  try {
    const { listaId } = req.params;
    const { somente_ativos, grupo_id } = req.body || {};
    let sql = "SELECT id, email, nome_completo FROM usuarios WHERE email IS NOT NULL AND TRIM(email) != ''";
    const params = [];
    if (somente_ativos === true || somente_ativos === "1") {
      sql += " AND ativo = 1";
    }
    if (grupo_id != null && grupo_id !== "" && grupo_id !== undefined) {
      sql += " AND grupo_id = ?";
      params.push(grupo_id);
    }
    const [usuarios] = await db.query(sql, params);
    const [existingRows] = await db.query(
      "SELECT LOWER(TRIM(email)) as email FROM listas_email_itens WHERE lista_id = ?",
      [listaId]
    );
    const existingSet = new Set(existingRows.map((r) => r.email));
    let adicionados = 0;
    for (const u of usuarios) {
      const email = (u.email || "").trim().toLowerCase();
      if (!email || existingSet.has(email)) continue;
      existingSet.add(email);
      await db.execute(
        "INSERT INTO listas_email_itens (lista_id, email, nome_opcional) VALUES (?, ?, ?)",
        [listaId, (u.email || "").trim(), (u.nome_completo || "").trim() || null]
      );
      adicionados++;
    }
    res.json({
      adicionados,
      ignorados_duplicados: usuarios.length - adicionados,
      total_usuarios: usuarios.length,
      mensagem: `${adicionados} usuário(s) adicionado(s) à lista.`,
    });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_IMPORT_USERS", error);
    res.status(500).json({ error: "Erro ao importar usuários." });
  }
};

// ==================== TEMPLATES ====================

exports.getTemplates = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nome, assunto, corpo_html, criado_em, atualizado_em FROM templates_email ORDER BY nome ASC"
    );
    res.json(rows);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_GET_TEMPLATES", error);
    res.status(500).json({ error: "Erro ao listar templates." });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT id, nome, assunto, corpo_html, criado_em, atualizado_em FROM templates_email WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Template não encontrado." });
    }
    res.json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_GET_TEMPLATE_BY_ID", error);
    res.status(500).json({ error: "Erro ao carregar template." });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const body = req.body || {};
    const nome = body.nome;
    const assunto = body.assunto;
    const corpo_html = body.corpo_html;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do template é obrigatório." });
    }
    if (!assunto || !String(assunto).trim()) {
      return res.status(400).json({ error: "Assunto é obrigatório." });
    }
    const [result] = await db.execute(
      "INSERT INTO templates_email (nome, assunto, corpo_html) VALUES (?, ?, ?)",
      [String(nome).trim(), String(assunto).trim(), corpo_html != null ? String(corpo_html) : ""]
    );
    const [rows] = await db.query(
      "SELECT id, nome, assunto, corpo_html, criado_em, atualizado_em FROM templates_email WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_CREATE_TEMPLATE", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Erro ao criar template.";
    res.status(500).json({ error: msg });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: "ID do template inválido." });
    }
    const body = req.body || {};
    const nome = body.nome;
    const assunto = body.assunto;
    const corpo_html = body.corpo_html;
    if (!nome || !String(nome).trim()) {
      return res.status(400).json({ error: "Nome do template é obrigatório." });
    }
    if (!assunto || !String(assunto).trim()) {
      return res.status(400).json({ error: "Assunto é obrigatório." });
    }
    await db.execute(
      "UPDATE templates_email SET nome = ?, assunto = ?, corpo_html = ? WHERE id = ?",
      [String(nome).trim(), String(assunto).trim(), corpo_html != null ? String(corpo_html) : "", id]
    );
    const [rows] = await db.query(
      "SELECT id, nome, assunto, corpo_html, criado_em, atualizado_em FROM templates_email WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Template não encontrado." });
    res.json(rows[0]);
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_UPDATE_TEMPLATE", error);
    const msg = process.env.NODE_ENV === "development" ? error.message : "Erro ao atualizar template.";
    res.status(500).json({ error: msg });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute("DELETE FROM templates_email WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Template não encontrado." });
    }
    res.json({ message: "Template excluído." });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_DELETE_TEMPLATE", error);
    res.status(500).json({ error: "Erro ao excluir template." });
  }
};

// Dados de exemplo para preview quando não há partida
const DEFAULT_EVENTO = {
  titulo: "Exemplo de Evento",
  local: "Estádio Exemplo",
  data: "2025-03-15 20:00",
  data_dia: "15",
  data_mes: "03",
  data_hora: "20:00",
  data_inicio_apostas: "2025-03-10 08:00",
  data_inicio_apostas_dia: "10",
  data_inicio_apostas_mes: "03",
  data_inicio_apostas_hora: "08:00",
  data_limite_aposta: "2025-03-14 18:00",
  data_limite_aposta_dia: "14",
  data_limite_aposta_mes: "03",
  data_limite_aposta_hora: "18:00",
  data_apuracao: "",
  data_apuracao_dia: "",
  data_apuracao_mes: "",
  data_apuracao_hora: "",
  quantidade_premios: 10,
  nome_grupo: "Geral",
  setor_evento_nome: "Cadeira Inferior",
  imagem: "",
  subtitulo: "",
  informacoes_extras: "",
  link_extra: "",
};

const DEFAULT_USUARIO = {
  nome: "João Silva",
  email: "joao.silva@exemplo.com",
  ingressos_ganhos: "0",
};

exports.previewTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { partidaId } = req.query;

    const [templates] = await db.query(
      "SELECT id, nome, assunto, corpo_html FROM templates_email WHERE id = ?",
      [templateId]
    );
    if (templates.length === 0) {
      return res.status(404).json({ error: "Template não encontrado." });
    }
    const template = templates[0];

    let evento = { ...DEFAULT_EVENTO };
    if (partidaId) {
      const [partidas] = await db.query(
        `SELECT p.titulo, p.local, p.data_jogo, p.data_inicio_apostas, p.data_limite_aposta, p.data_apuracao, p.quantidade_premios,
                p.subtitulo, p.informacoes_extras, p.link_extra, p.banner,
                g.nome as nome_grupo, se.nome as setor_evento_nome
         FROM partidas p
         LEFT JOIN grupos g ON p.grupo_id = g.id
         LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
         WHERE p.id = ?`,
        [partidaId]
      );
      const baseUrl = await getBaseUrl();
      let imagemUrl = baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
      if (partidas.length > 0) {
        const p = partidas[0];
        if (p.banner && String(p.banner).startsWith("http")) imagemUrl = p.banner;
        const partesJogo = extrairPartesData(p.data_jogo);
        const partesInicio = extrairPartesData(p.data_inicio_apostas);
        const partesLimite = extrairPartesData(p.data_limite_aposta);
        const partesApuracao = extrairPartesData(p.data_apuracao);
        evento = {
          titulo: p.titulo || DEFAULT_EVENTO.titulo,
          local: p.local || DEFAULT_EVENTO.local,
          data: formatarDataPtBr(p.data_jogo) || DEFAULT_EVENTO.data,
          data_dia: partesJogo.dia,
          data_mes: partesJogo.mes,
          data_hora: partesJogo.hora,
          data_inicio_apostas: formatarDataPtBr(p.data_inicio_apostas) || DEFAULT_EVENTO.data_inicio_apostas,
          data_inicio_apostas_dia: partesInicio.dia,
          data_inicio_apostas_mes: partesInicio.mes,
          data_inicio_apostas_hora: partesInicio.hora,
          data_limite_aposta: formatarDataPtBr(p.data_limite_aposta) || DEFAULT_EVENTO.data_limite_aposta,
          data_limite_aposta_dia: partesLimite.dia,
          data_limite_aposta_mes: partesLimite.mes,
          data_limite_aposta_hora: partesLimite.hora,
          data_apuracao: formatarDataPtBr(p.data_apuracao) || "",
          data_apuracao_dia: partesApuracao.dia,
          data_apuracao_mes: partesApuracao.mes,
          data_apuracao_hora: partesApuracao.hora,
          quantidade_premios: p.quantidade_premios ?? DEFAULT_EVENTO.quantidade_premios,
          nome_grupo: p.nome_grupo || DEFAULT_EVENTO.nome_grupo,
          setor_evento_nome: p.setor_evento_nome || DEFAULT_EVENTO.setor_evento_nome,
          imagem: imagemUrl,
          subtitulo: p.subtitulo || "",
          informacoes_extras: p.informacoes_extras || "",
          link_extra: p.link_extra || "",
        };
      } else {
        evento.imagem = imagemUrl;
      }
    }

    const context = { evento, usuario: DEFAULT_USUARIO };
    const assunto = replaceTemplateTags(template.assunto, context);
    const html = replaceTemplateTags(template.corpo_html, context);

    res.json({ assunto, html });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_PREVIEW_TEMPLATE", error);
    res.status(500).json({ error: "Erro ao gerar previsualização." });
  }
};

/** Pré-visualização de rascunho (assunto + corpo_html sem salvar). Body: { assunto, corpo_html, partidaId? } */
exports.previewDraft = async (req, res) => {
  try {
    const { assunto, corpo_html, partidaId } = req.body || {};
    if (assunto == null || corpo_html == null) {
      return res.status(400).json({ error: "assunto e corpo_html são obrigatórios." });
    }
    let evento = { ...DEFAULT_EVENTO };
    if (partidaId) {
      const [partidas] = await db.query(
        `SELECT p.titulo, p.local, p.data_jogo, p.data_inicio_apostas, p.data_limite_aposta, p.data_apuracao, p.quantidade_premios,
                p.subtitulo, p.informacoes_extras, p.link_extra, p.banner,
                g.nome as nome_grupo, se.nome as setor_evento_nome
         FROM partidas p
         LEFT JOIN grupos g ON p.grupo_id = g.id
         LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
         WHERE p.id = ?`,
        [partidaId]
      );
      const baseUrl = await getBaseUrl();
      let imagemUrl = baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
      if (partidas.length > 0) {
        const p = partidas[0];
        if (p.banner && String(p.banner).startsWith("http")) imagemUrl = p.banner;
        const partesJogo = extrairPartesData(p.data_jogo);
        const partesInicio = extrairPartesData(p.data_inicio_apostas);
        const partesLimite = extrairPartesData(p.data_limite_aposta);
        const partesApuracao = extrairPartesData(p.data_apuracao);
        evento = {
          titulo: p.titulo || DEFAULT_EVENTO.titulo,
          local: p.local || DEFAULT_EVENTO.local,
          data: formatarDataPtBr(p.data_jogo) || DEFAULT_EVENTO.data,
          data_dia: partesJogo.dia,
          data_mes: partesJogo.mes,
          data_hora: partesJogo.hora,
          data_inicio_apostas: formatarDataPtBr(p.data_inicio_apostas) || DEFAULT_EVENTO.data_inicio_apostas,
          data_inicio_apostas_dia: partesInicio.dia,
          data_inicio_apostas_mes: partesInicio.mes,
          data_inicio_apostas_hora: partesInicio.hora,
          data_limite_aposta: formatarDataPtBr(p.data_limite_aposta) || DEFAULT_EVENTO.data_limite_aposta,
          data_limite_aposta_dia: partesLimite.dia,
          data_limite_aposta_mes: partesLimite.mes,
          data_limite_aposta_hora: partesLimite.hora,
          data_apuracao: formatarDataPtBr(p.data_apuracao) || "",
          data_apuracao_dia: partesApuracao.dia,
          data_apuracao_mes: partesApuracao.mes,
          data_apuracao_hora: partesApuracao.hora,
          quantidade_premios: p.quantidade_premios ?? DEFAULT_EVENTO.quantidade_premios,
          nome_grupo: p.nome_grupo || DEFAULT_EVENTO.nome_grupo,
          setor_evento_nome: p.setor_evento_nome || DEFAULT_EVENTO.setor_evento_nome,
          imagem: imagemUrl,
          subtitulo: p.subtitulo || "",
          informacoes_extras: p.informacoes_extras || "",
          link_extra: p.link_extra || "",
        };
      } else {
        evento.imagem = imagemUrl;
      }
    }
    const context = { evento, usuario: DEFAULT_USUARIO };
    const assuntoOut = replaceTemplateTags(String(assunto), context);
    const html = replaceTemplateTags(String(corpo_html), context);
    res.json({ assunto: assuntoOut, html });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_PREVIEW_DRAFT", error);
    res.status(500).json({ error: "Erro ao gerar pré-visualização." });
  }
};

/** Envia um e-mail de teste usando o template (opcional partidaId para contexto do evento). */
exports.testTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { to, partidaId } = req.body || {};
    if (!to || !String(to).trim()) {
      return res.status(400).json({ error: "Informe o e-mail de destino para o teste." });
    }
    const transporter = await getSmtpTransporter();
    if (!transporter) {
      return res.status(400).json({
        error: "SMTP não configurado. Configure em Configurações > Servidor SMTP.",
      });
    }
    const [cfgRows] = await db.query(
      "SELECT chave, valor FROM configuracoes WHERE chave = 'smtp_from'"
    );
    const smtpFrom = cfgRows[0]?.valor?.trim();
    if (!smtpFrom) {
      return res.status(400).json({
        error: "E-mail remetente (smtp_from) não configurado.",
      });
    }
    const [templates] = await db.query(
      "SELECT id, nome, assunto, corpo_html FROM templates_email WHERE id = ?",
      [templateId]
    );
    if (templates.length === 0) {
      return res.status(404).json({ error: "Template não encontrado." });
    }
    const template = templates[0];
    let evento = { ...DEFAULT_EVENTO };
    if (partidaId) {
      const [partidas] = await db.query(
        `SELECT p.titulo, p.local, p.data_jogo, p.data_inicio_apostas, p.data_limite_aposta, p.data_apuracao, p.quantidade_premios,
                p.subtitulo, p.informacoes_extras, p.link_extra, p.banner,
                g.nome as nome_grupo, se.nome as setor_evento_nome
         FROM partidas p
         LEFT JOIN grupos g ON p.grupo_id = g.id
         LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
         WHERE p.id = ?`,
        [partidaId]
      );
      const baseUrl = await getBaseUrl();
      let imagemUrl = baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
      if (partidas.length > 0) {
        const p = partidas[0];
        if (p.banner && String(p.banner).startsWith("http")) imagemUrl = p.banner;
        const partesJogo = extrairPartesData(p.data_jogo);
        const partesInicio = extrairPartesData(p.data_inicio_apostas);
        const partesLimite = extrairPartesData(p.data_limite_aposta);
        const partesApuracao = extrairPartesData(p.data_apuracao);
        evento = {
          titulo: p.titulo || DEFAULT_EVENTO.titulo,
          local: p.local || DEFAULT_EVENTO.local,
          data: formatarDataPtBr(p.data_jogo) || DEFAULT_EVENTO.data,
          data_dia: partesJogo.dia,
          data_mes: partesJogo.mes,
          data_hora: partesJogo.hora,
          data_inicio_apostas: formatarDataPtBr(p.data_inicio_apostas) || DEFAULT_EVENTO.data_inicio_apostas,
          data_inicio_apostas_dia: partesInicio.dia,
          data_inicio_apostas_mes: partesInicio.mes,
          data_inicio_apostas_hora: partesInicio.hora,
          data_limite_aposta: formatarDataPtBr(p.data_limite_aposta) || DEFAULT_EVENTO.data_limite_aposta,
          data_limite_aposta_dia: partesLimite.dia,
          data_limite_aposta_mes: partesLimite.mes,
          data_limite_aposta_hora: partesLimite.hora,
          data_apuracao: formatarDataPtBr(p.data_apuracao) || "",
          data_apuracao_dia: partesApuracao.dia,
          data_apuracao_mes: partesApuracao.mes,
          data_apuracao_hora: partesApuracao.hora,
          quantidade_premios: p.quantidade_premios ?? DEFAULT_EVENTO.quantidade_premios,
          nome_grupo: p.nome_grupo || DEFAULT_EVENTO.nome_grupo,
          setor_evento_nome: p.setor_evento_nome || DEFAULT_EVENTO.setor_evento_nome,
          imagem: imagemUrl,
          subtitulo: p.subtitulo || "",
          informacoes_extras: p.informacoes_extras || "",
          link_extra: p.link_extra || "",
        };
      } else {
        evento.imagem = imagemUrl;
      }
    }
    const usuario = { nome: "Destinatário Teste", email: String(to).trim() };
    const context = { evento, usuario };
    const assunto = replaceTemplateTags(template.assunto, context);
    const html = replaceTemplateTags(template.corpo_html, context);
    await transporter.sendMail({
      from: smtpFrom,
      to: String(to).trim(),
      subject: assunto,
      html,
      text: assunto,
    });
    res.json({ message: "E-mail de teste enviado com sucesso." });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_TEST_TEMPLATE", error);
    const msg = error.message || "Erro ao enviar e-mail de teste.";
    res.status(500).json({ error: msg });
  }
};

// ==================== DISPARO ====================

exports.sendEmails = async (req, res) => {
  try {
    const { partidaId, listaId, templateId, adminId } = req.body;
    if (!partidaId || !listaId || !templateId) {
      return res.status(400).json({
        error: "partidaId, listaId e templateId são obrigatórios.",
      });
    }

    const transporter = await getSmtpTransporter();
    if (!transporter) {
      return res.status(400).json({
        error: "SMTP não configurado. Configure em Configurações > Servidor SMTP.",
      });
    }

    const [cfgRows] = await db.query(
      "SELECT chave, valor FROM configuracoes WHERE chave = 'smtp_from'"
    );
    const smtpFrom = cfgRows[0]?.valor?.trim();
    if (!smtpFrom) {
      return res.status(400).json({
        error: "E-mail remetente (smtp_from) não configurado.",
      });
    }

    const [partidas] = await db.query(
      `SELECT p.id, p.titulo, p.local, p.data_jogo, p.data_inicio_apostas, p.data_limite_aposta, p.data_apuracao, p.quantidade_premios,
              p.subtitulo, p.informacoes_extras, p.link_extra, p.banner,
              g.nome as nome_grupo, se.nome as setor_evento_nome
       FROM partidas p
       LEFT JOIN grupos g ON p.grupo_id = g.id
       LEFT JOIN setores_evento se ON p.setor_evento_id = se.id
       WHERE p.id = ?`,
      [partidaId]
    );
    if (partidas.length === 0) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }
    const p = partidas[0];
    const baseUrl = await getBaseUrl();
    let imagemUrl = baseUrl ? `${baseUrl}/api/matches/${partidaId}/banner` : "";
    if (p.banner && String(p.banner).startsWith("http")) imagemUrl = p.banner;
    const partesJogo = extrairPartesData(p.data_jogo);
    const partesInicio = extrairPartesData(p.data_inicio_apostas);
    const partesLimite = extrairPartesData(p.data_limite_aposta);
    const partesApuracao = extrairPartesData(p.data_apuracao);
    const evento = {
      titulo: p.titulo || "Evento",
      local: p.local || "",
      data: formatarDataPtBr(p.data_jogo) || "",
      data_dia: partesJogo.dia,
      data_mes: partesJogo.mes,
      data_hora: partesJogo.hora,
      data_inicio_apostas: formatarDataPtBr(p.data_inicio_apostas) || "",
      data_inicio_apostas_dia: partesInicio.dia,
      data_inicio_apostas_mes: partesInicio.mes,
      data_inicio_apostas_hora: partesInicio.hora,
      data_limite_aposta: formatarDataPtBr(p.data_limite_aposta) || "",
      data_limite_aposta_dia: partesLimite.dia,
      data_limite_aposta_mes: partesLimite.mes,
      data_limite_aposta_hora: partesLimite.hora,
      data_apuracao: formatarDataPtBr(p.data_apuracao) || "",
      data_apuracao_dia: partesApuracao.dia,
      data_apuracao_mes: partesApuracao.mes,
      data_apuracao_hora: partesApuracao.hora,
      quantidade_premios: p.quantidade_premios ?? 0,
      nome_grupo: p.nome_grupo || "",
      setor_evento_nome: p.setor_evento_nome || "",
      imagem: imagemUrl,
      subtitulo: p.subtitulo || "",
      informacoes_extras: p.informacoes_extras || "",
      link_extra: p.link_extra || "",
    };

    const [templates] = await db.query(
      "SELECT id, assunto, corpo_html FROM templates_email WHERE id = ?",
      [templateId]
    );
    if (templates.length === 0) {
      return res.status(404).json({ error: "Template não encontrado." });
    }
    const template = templates[0];

    const [itens] = await db.query(
      "SELECT id, email, nome_opcional FROM listas_email_itens WHERE lista_id = ?",
      [listaId]
    );
    if (itens.length === 0) {
      return res.status(400).json({ error: "A lista não possui destinatários." });
    }

    let enviados = 0;
    const erros = [];

    for (const item of itens) {
      const email = String(item.email).trim();
      if (!email) continue;

      let nome = item.nome_opcional && String(item.nome_opcional).trim();
      let usuarioId = null;
      const [users] = await db.query(
        "SELECT id, nome_completo FROM usuarios WHERE email = ? LIMIT 1",
        [email]
      );
      if (users.length > 0) {
        usuarioId = users[0].id;
        if (!nome) nome = users[0].nome_completo || email;
      }
      if (!nome) nome = email;

      let ingressosGanhos = 0;
      if (usuarioId) {
        const [countRows] = await db.query(
          "SELECT COUNT(*) as total FROM apostas WHERE partida_id = ? AND usuario_id = ? AND status = 'GANHOU'",
          [partidaId, usuarioId]
        );
        ingressosGanhos = Number(countRows[0]?.total ?? 0);
      }
      const usuario = { nome, email, ingressos_ganhos: ingressosGanhos };

      const context = { evento, usuario };
      const assunto = replaceTemplateTags(template.assunto, context);
      const html = replaceTemplateTags(template.corpo_html, context);

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: assunto,
          html,
        });
        enviados++;
      } catch (err) {
        await logErro("EMAIL_SEND_ONE", err);
        erros.push(`${email}: ${err.message || "Erro ao enviar"}`);
      }
    }

    await gravarAuditoria(db, adminId || req.user?.id, "EMAIL", "DISPARO", partidaId, {
      partidaId,
      listaId,
      templateId,
      totalDestinatarios: itens.length,
      enviados,
      erros: erros.length,
    });

    res.json({
      enviados,
      total: itens.length,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    await logErro("EMAIL_CONTROLLER_SEND", error);
    res.status(500).json({ error: "Erro ao enviar e-mails." });
  }
};

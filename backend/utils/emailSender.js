const db = require("../config/db");
const nodemailer = require("nodemailer");
const { EmailClient } = require("@azure/communication-email");

const CONFIG_KEYS = [
  "email_provider",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "acs_connection_string",
  "acs_sender",
  "email_ocultar_para",
];

const NOT_CONFIGURED_MSG =
  "Provedor de e-mail não configurado. Configure em Configurações > Servidor SMTP.";

async function loadConfigFromDb() {
  const placeholders = CONFIG_KEYS.map(() => "?").join(", ");
  const [rows] = await db.query(
    `SELECT chave, valor FROM configuracoes WHERE chave IN (${placeholders})`,
    CONFIG_KEYS,
  );
  return rows.reduce((acc, row) => {
    acc[row.chave] = row.valor;
    return acc;
  }, {});
}

/**
 * Lê as configurações de e-mail da tabela configuracoes.
 * @returns {Promise<{ provider: 'smtp'|'acs', smtpHost: string, smtpPort: number, smtpSecure: boolean, smtpUser: string, smtpPass: string, smtpFrom: string, acsConnectionString: string, acsSender: string, emailOcultarPara: boolean }>}
 */
async function getEmailProviderConfig() {
  const cfg = await loadConfigFromDb();
  const provider =
    String(cfg.email_provider || "smtp")
      .trim()
      .toLowerCase() === "acs"
      ? "acs"
      : "smtp";

  return {
    provider,
    smtpHost: cfg.smtp_host ? String(cfg.smtp_host).trim() : "",
    smtpPort: parseInt(cfg.smtp_port, 10) || 587,
    smtpSecure: cfg.smtp_secure === "1" || cfg.smtp_secure === "true",
    smtpUser: cfg.smtp_user || "",
    smtpPass: cfg.smtp_pass || "",
    smtpFrom: cfg.smtp_from ? String(cfg.smtp_from).trim() : "",
    acsConnectionString: cfg.acs_connection_string
      ? String(cfg.acs_connection_string).trim()
      : "",
    acsSender: cfg.acs_sender ? String(cfg.acs_sender).trim() : "",
    emailOcultarPara:
      cfg.email_ocultar_para === "1" || cfg.email_ocultar_para === "true",
  };
}

/**
 * Quando ativo, coloca o destinatário real em BCC e o remetente no campo Para.
 */
function applyHiddenToRecipients(opts, cfg) {
  if (!cfg?.emailOcultarPara || !opts?.to) return opts;
  const realTo = String(opts.to).trim();
  if (!realTo) return opts;
  const envelopeTo =
    (cfg.provider === "acs" ? cfg.acsSender : cfg.smtpFrom) || realTo;
  if (envelopeTo.toLowerCase() === realTo.toLowerCase()) return opts;

  const result = { ...opts, to: envelopeTo, bcc: realTo };
  if (opts.bcc) {
    const existing = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];
    result.bcc = [...new Set([realTo, ...existing.map((a) => String(a).trim())])];
  }
  return result;
}

function createSmtpTransporter(cfg) {
  const host = cfg.smtpHost;
  if (!host) return null;
  if (host.includes("@")) {
    throw new Error(
      "Host SMTP não pode ser um e-mail. Use o endereço do servidor (ex: smtp.office365.com ou smtp.dominio.com).",
    );
  }
  return nodemailer.createTransport({
    host,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    auth:
      cfg.smtpUser && cfg.smtpPass
        ? { user: cfg.smtpUser, pass: cfg.smtpPass }
        : undefined,
  });
}

function decodeHtmlEntities(str) {
  return String(str)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Converte HTML de e-mail em texto simples, preservando URLs de links (incl. botões só com imagem).
 */
function htmlToPlainText(html) {
  if (!html) return "";
  let s = String(html);
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\s*\/\s*(p|div|tr|li|h[1-6])\s*>/gi, "\n");
  s = s.replace(/<\s*(p|div|tr|li|h[1-6])\b[^>]*>/gi, "\n");
  s = s.replace(
    /<\s*a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\s*\/\s*a\s*>/gi,
    (_match, _q, hrefDq, hrefSq, hrefBare, inner) => {
      const url = (hrefDq || hrefSq || hrefBare || "").trim();
      let text = String(inner || "");
      text = text.replace(
        /<\s*img\b[^>]*\balt\s*=\s*("([^"]*)"|'([^']*)')[^>]*\/?>/gi,
        (_m, _q2, altDq, altSq) => {
          const alt = (altDq || altSq || "").trim();
          return alt ? `[${alt}]` : "";
        },
      );
      text = text.replace(/<[^>]+>/g, " ");
      text = decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
      if (text && url) return `${text} (${url})`;
      if (url) return url;
      return text;
    },
  );
  s = s.replace(
    /<\s*img\b[^>]*\balt\s*=\s*("([^"]*)"|'([^']*)')[^>]*\/?>/gi,
    (_m, _q, altDq, altSq) => {
      const alt = (altDq || altSq || "").trim();
      return alt ? `[${alt}]` : "";
    },
  );
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeHtmlEntities(s);
  return s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripHtml(html) {
  return htmlToPlainText(html);
}

function toBase64(content) {
  if (Buffer.isBuffer(content)) return content.toString("base64");
  if (typeof content === "string") return Buffer.from(content).toString("base64");
  return Buffer.from(String(content)).toString("base64");
}

function guessContentType(filename) {
  const name = String(filename || "").toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".html") || name.endsWith(".htm")) return "text/html";
  if (name.endsWith(".txt")) return "text/plain";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function mapAttachmentsForAcs(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  return attachments.map((attachment) => ({
    name: attachment.filename || attachment.name || "attachment",
    contentType:
      attachment.contentType ||
      guessContentType(attachment.filename || attachment.name) ||
      "application/octet-stream",
    contentInBase64: toBase64(attachment.content),
  }));
}

async function sendViaAcs(cfg, { to, bcc, subject, html, text, attachments }) {
  const client = new EmailClient(cfg.acsConnectionString);
  const recipients = {
    to: [{ address: String(to).trim() }],
  };
  if (bcc) {
    const bccList = Array.isArray(bcc) ? bcc : [bcc];
    recipients.bcc = bccList
      .map((addr) => ({ address: String(addr).trim() }))
      .filter((entry) => entry.address);
  }
  const message = {
    senderAddress: cfg.acsSender,
    content: {
      subject: subject || "",
      html: html || undefined,
      plainText: text || htmlToPlainText(html) || subject || "",
    },
    recipients,
  };

  const acsAttachments = mapAttachmentsForAcs(attachments);
  if (acsAttachments?.length) {
    message.attachments = acsAttachments;
  }

  await acsRateLimit();
  const poller = await client.beginSend(message);
  const result = await poller.pollUntilDone();
  if (result?.status !== "Succeeded") {
    const detail = result?.error?.message || result?.status || "desconhecido";
    throw new Error(`Envio ACS falhou: ${detail}`);
  }
}

function buildSmtpSender(cfg, transporter) {
  return {
    provider: "smtp",
    from: cfg.smtpFrom,
    _transporter: transporter,
    sendMail: async (opts) => {
      const finalOpts = applyHiddenToRecipients(opts, cfg);
      await transporter.sendMail({
        from: cfg.smtpFrom,
        ...finalOpts,
      });
    },
  };
}

function buildAcsSender(cfg) {
  return {
    provider: "acs",
    from: cfg.acsSender,
    sendMail: async (opts) => {
      const finalOpts = applyHiddenToRecipients(opts, cfg);
      await sendViaAcs(cfg, {
        to: finalOpts.to,
        bcc: finalOpts.bcc,
        subject: finalOpts.subject,
        html: finalOpts.html,
        text: finalOpts.text,
        attachments: finalOpts.attachments,
      });
    },
  };
}

/**
 * Retorna um sender com interface compatível com Nodemailer (sendMail).
 * Retorna null se o provider ativo não estiver configurado.
 */
async function getMailSender() {
  const cfg = await getEmailProviderConfig();

  if (cfg.provider === "acs") {
    if (!cfg.acsConnectionString || !cfg.acsSender) return null;
    return buildAcsSender(cfg);
  }

  const transporter = createSmtpTransporter(cfg);
  if (!transporter || !cfg.smtpFrom) return null;
  return buildSmtpSender(cfg, transporter);
}

/**
 * Recria apenas o transporter SMTP (útil para retry após erro de conexão).
 */
async function refreshSmtpMailSender() {
  const cfg = await getEmailProviderConfig();
  if (cfg.provider !== "smtp") return null;
  const transporter = createSmtpTransporter(cfg);
  if (!transporter || !cfg.smtpFrom) return null;
  return buildSmtpSender(cfg, transporter);
}

/**
 * Envia um e-mail usando o provider configurado.
 */
async function sendEmail({ to, subject, html, text, attachments } = {}) {
  const sender = await getMailSender();
  if (!sender) {
    throw new Error(NOT_CONFIGURED_MSG);
  }
  await sender.sendMail({ to, subject, html, text, attachments });
}

function isSmtpConnectionError(err) {
  const code = String(err?.code || "").toUpperCase();
  const msg = String(err?.message || "").toLowerCase();
  const connectionCodes = [
    "ECONNRESET",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ESOCKET",
    "EPROTO",
    "EPIPE",
    "ENOTFOUND",
  ];
  if (connectionCodes.includes(code)) return true;
  return (
    msg.includes("connection") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("closed")
  );
}

// ── Rate limiter para ACS ─────────────────────────────────────
// Garante respeito aos limites padrão do Azure Communication Services:
//   30/min · 100/hora · 2.400/dia
// Usado apenas quando email_provider === 'acs'.

const ACS_LIMITS = {
  perMinute: 30,
  perHour:   100,
  perDay:    2400,
};

// Janelas deslizantes simples (timestamps dos envios recentes)
const _acsTimestamps = [];

/**
 * Verifica se o próximo envio ACS está dentro dos limites.
 * Se não estiver, aguarda o tempo necessário antes de prosseguir.
 * Deve ser chamado imediatamente antes de cada beginSend().
 */
async function acsRateLimit() {
  const now = Date.now();

  // Limpar timestamps expirados (mais de 24h)
  const cutoff24h = now - 24 * 60 * 60 * 1000;
  while (_acsTimestamps.length > 0 && _acsTimestamps[0] < cutoff24h) {
    _acsTimestamps.shift();
  }

  // Verificar limite diário
  if (_acsTimestamps.length >= ACS_LIMITS.perDay) {
    const oldest = _acsTimestamps[0];
    const waitMs = (oldest + 24 * 60 * 60 * 1000) - now + 100;
    console.warn(`[ACS Rate Limit] Limite diário (${ACS_LIMITS.perDay}) atingido. Aguardando ${Math.ceil(waitMs / 1000)}s...`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  // Verificar limite por hora
  const cutoff1h = now - 60 * 60 * 1000;
  const lastHour = _acsTimestamps.filter(t => t > cutoff1h);
  if (lastHour.length >= ACS_LIMITS.perHour) {
    const oldest = lastHour[0];
    const waitMs = (oldest + 60 * 60 * 1000) - now + 100;
    console.warn(`[ACS Rate Limit] Limite horário (${ACS_LIMITS.perHour}) atingido. Aguardando ${Math.ceil(waitMs / 1000)}s...`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  // Verificar limite por minuto
  const cutoff1m = now - 60 * 1000;
  const lastMinute = _acsTimestamps.filter(t => t > cutoff1m);
  if (lastMinute.length >= ACS_LIMITS.perMinute) {
    const oldest = lastMinute[0];
    const waitMs = (oldest + 60 * 1000) - now + 100;
    console.log(`[ACS Rate Limit] Limite por minuto (${ACS_LIMITS.perMinute}) atingido. Aguardando ${Math.ceil(waitMs / 1000)}s...`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  // Registrar este envio
  _acsTimestamps.push(Date.now());
}

module.exports = {
  getEmailProviderConfig,
  getMailSender,
  refreshSmtpMailSender,
  sendEmail,
  isSmtpConnectionError,
  NOT_CONFIGURED_MSG,
  acsRateLimit,
  applyHiddenToRecipients,
  htmlToPlainText,
};

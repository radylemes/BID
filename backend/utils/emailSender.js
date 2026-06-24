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
 * @returns {Promise<{ provider: 'smtp'|'acs', smtpHost: string, smtpPort: number, smtpSecure: boolean, smtpUser: string, smtpPass: string, smtpFrom: string, acsConnectionString: string, acsSender: string }>}
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
  };
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

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function sendViaAcs(cfg, { to, subject, html, text, attachments }) {
  const client = new EmailClient(cfg.acsConnectionString);
  const message = {
    senderAddress: cfg.acsSender,
    content: {
      subject: subject || "",
      html: html || undefined,
      plainText: text || stripHtml(html) || subject || "",
    },
    recipients: {
      to: [{ address: String(to).trim() }],
    },
  };

  const acsAttachments = mapAttachmentsForAcs(attachments);
  if (acsAttachments?.length) {
    message.attachments = acsAttachments;
  }

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
      await transporter.sendMail({
        from: cfg.smtpFrom,
        ...opts,
      });
    },
  };
}

function buildAcsSender(cfg) {
  return {
    provider: "acs",
    from: cfg.acsSender,
    sendMail: async (opts) => {
      await sendViaAcs(cfg, {
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        attachments: opts.attachments,
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

module.exports = {
  getEmailProviderConfig,
  getMailSender,
  refreshSmtpMailSender,
  sendEmail,
  isSmtpConnectionError,
  NOT_CONFIGURED_MSG,
};

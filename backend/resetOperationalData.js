/**
 * Limpa dados operacionais (BIDs, WT Pass, utilizadores, logs) preservando:
 * - configuracoes (SMTP, políticas BID/WT Pass, exportação, WT Pass bloqueio, etc.)
 * - templates_email
 * - listas_email / listas_email_itens
 * - regras_pontuacao
 * - empresas, setores, grupos (estrutura organizacional)
 *
 * Uso:
 *   npm run reset-operational -- --confirm
 *   CONFIRM_RESET=1 npm run reset-operational
 *
 * Simulação (não altera o banco):
 *   npm run reset-operational -- --dry-run
 */

const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const TABLES_TO_TRUNCATE = [
  // WT Pass
  "bloqueios_eventos_rh_alvos",
  "inscricoes_rh",
  "bloqueios_eventos_rh",
  "eventos_rh",
  // BIDs / partidas
  "ingressos",
  "transferencias_ingressos",
  "acrescimos_ingressos",
  "apostas",
  "partidas",
  "setores_evento",
  // Utilizadores e histórico de pontos
  "historico_pontos",
  "convidados",
  "usuarios",
  // Logs
  "auditoria",
  "logs_erros",
];

const TABLES_PRESERVED = [
  "configuracoes",
  "templates_email",
  "listas_email",
  "listas_email_itens",
  "regras_pontuacao",
  "empresas",
  "setores",
  "grupos",
];

function parseArgs(argv) {
  return {
    confirm: argv.includes("--confirm") || process.env.CONFIRM_RESET === "1",
    dryRun: argv.includes("--dry-run"),
  };
}

async function tableExists(connection, table) {
  const [rows] = await connection.query("SHOW TABLES LIKE ?", [table]);
  return rows.length > 0;
}

async function ensureOrganizationalSeed(connection) {
  const [empresas] = await connection.query("SELECT id FROM empresas LIMIT 1");
  if (empresas.length === 0) {
    await connection.query(
      "INSERT INTO empresas (id, nome, descricao) VALUES (1, 'Geral', 'Empresa padrão do sistema')",
    );
    console.log("🏢 Empresa padrão criada (id=1).");
  }

  const [setores] = await connection.query("SELECT id FROM setores LIMIT 1");
  if (setores.length === 0) {
    await connection.query(
      "INSERT INTO setores (id, empresa_id, nome) VALUES (1, 1, 'Geral')",
    );
    console.log("📁 Setor padrão criado (id=1).");
  }

  const [grupos] = await connection.query("SELECT id FROM grupos LIMIT 1");
  if (grupos.length === 0) {
    await connection.query(
      "INSERT INTO grupos (id, nome, descricao) VALUES (1, 'Geral', 'Grupo de Apostas Padrão')",
    );
    console.log("👥 Grupo padrão criado (id=1).");
  }
}

async function ensureAdminUser(connection) {
  const [existing] = await connection.query(
    "SELECT id FROM usuarios WHERE username = 'admin' LIMIT 1",
  );
  if (existing.length > 0) {
    console.log("👤 Utilizador 'admin' já existe — não foi recriado.");
    return;
  }

  try {
    const [cpfCol] = await connection.query(
      "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'cpf'",
    );
    if (cpfCol.length === 0) {
      await connection.query(
        "ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(11) NULL COMMENT 'Titular: 11 digitos' AFTER tema_preferido",
      );
    }
    const [idxCpf] = await connection.query(
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uniq_usuarios_cpf'",
    );
    if (idxCpf.length === 0) {
      await connection.query("ALTER TABLE usuarios ADD UNIQUE KEY uniq_usuarios_cpf (cpf)");
    }
  } catch (migErr) {
    console.warn("Aviso ao garantir usuarios.cpf antes do seed:", migErr.message);
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminSeedCpf = "39053344705";

  await connection.query(
    `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo, empresa_id, setor_id, grupo_id, cpf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "admin",
      "Administrador",
      "admin@local.com",
      hashedPassword,
      0,
      "ADMIN",
      10,
      1,
      1,
      1,
      1,
      adminSeedCpf,
    ],
  );

  console.log("👤 Utilizador 'admin' criado (senha: admin123).");
}

async function resetOperationalData() {
  const { confirm, dryRun } = parseArgs(process.argv.slice(2));

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RESET OPERACIONAL — BID (preserva configurações)");
  console.log("═══════════════════════════════════════════════════════════\n");

  if (dryRun) {
    console.log("🔍 Modo simulação (--dry-run). Nenhuma alteração será feita.\n");
  } else if (!confirm) {
    console.error(
      "❌ Operação abortada: confirmação obrigatória.\n" +
        "   Execute com: npm run reset-operational -- --confirm\n" +
        "   Ou defina:   CONFIRM_RESET=1 npm run reset-operational\n",
    );
    process.exit(1);
  }

  if (!process.env.DB_USER || !process.env.DB_NAME) {
    console.error("❌ Configure DB_USER e DB_NAME no arquivo backend/.env");
    process.exit(1);
  }

  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT || 3306);

  console.log("Serão LIMPAS as tabelas:");
  TABLES_TO_TRUNCATE.forEach((t) => console.log(`  • ${t}`));
  console.log("\nSerão PRESERVADAS:");
  TABLES_PRESERVED.forEach((t) => console.log(`  • ${t}`));
  console.log(
    "\n⚠️  Ficheiros em uploads/ (banners, avatares, PDFs de política) NÃO são apagados.\n",
  );

  if (dryRun) {
    console.log("✅ Simulação concluída.");
    return;
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log(`🔌 Conectado ao banco '${process.env.DB_NAME}'.\n`);

    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (const table of TABLES_TO_TRUNCATE) {
      if (await tableExists(connection, table)) {
        await connection.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`🗑️  Tabela '${table}' limpa.`);
      } else {
        console.log(`⏭️  Tabela '${table}' não existe — ignorada.`);
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("\n📋 Recriando estrutura mínima e utilizador administrador...");
    await ensureOrganizationalSeed(connection);
    await ensureAdminUser(connection);

    console.log("\n🏁 Reset operacional concluído com sucesso!");
    console.log("   Configurações, templates SMTP e políticas de acesso foram mantidos.");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(
        `❌ Conexão recusada em ${host}:${port}. Verifique se o MySQL está em execução e o .env está correto.`,
      );
    } else {
      console.error("❌ Erro durante o reset operacional:", error.message);
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

resetOperationalData();

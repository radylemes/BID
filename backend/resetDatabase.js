const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

// Garante que o .env seja carregado da pasta backend (funciona rodando da raiz ou de backend/)
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

async function resetDatabase() {
  console.log("⚠️  INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...");

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || 3306;

  if (!process.env.DB_USER || !process.env.DB_NAME) {
    console.error("❌ Configure DB_USER e DB_NAME no arquivo backend/.env");
    process.exit(1);
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host,
      port: Number(port),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });

    console.log(`🔌 Conectado ao banco '${process.env.DB_NAME}'.`);

    // 1. Desativar verificação de chaves estrangeiras para permitir o TRUNCATE
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    // 2. Limpar todas as tabelas (ordem: dependentes primeiro; FK checks desligados)
    const tables = [
      "ingressos",
      "transferencias_ingressos",
      "apostas",
      "partidas",
      "historico_pontos",
      "convidados",
      "regras_pontuacao",
      "auditoria",
      "logs_erros",
      "usuarios",
      "configuracoes",
      "setores_evento",
      "setores",
      "empresas",
      "grupos",
    ];

    for (const table of tables) {
      // Verifica se a tabela existe antes de tentar limpar
      const [exists] = await connection.query(`SHOW TABLES LIKE '${table}'`);
      if (exists.length > 0) {
        await connection.query(`TRUNCATE TABLE ${table}`);
        console.log(`🗑️  Tabela '${table}' limpa.`);
      }
    }

    // 3. Reativar verificação de chaves estrangeiras
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("✨ Todas as tabelas foram limpas e IDs resetados.");

    // ============================================================
    // RECRIAR ESTRUTURA BÁSICA E ADMIN PADRÃO
    // ============================================================
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Cria a Empresa, o Setor e o Grupo padrão para o sistema não ficar "órfão"
    await connection.query(
      "INSERT INTO empresas (id, nome, descricao) VALUES (1, 'Geral', 'Empresa padrão do sistema')",
    );
    await connection.query(
      "INSERT INTO setores (id, empresa_id, nome) VALUES (1, 1, 'Geral')",
    );
    await connection.query(
      "INSERT INTO grupos (id, nome, descricao) VALUES (1, 'Geral', 'Grupo de Apostas Padrão')",
    );

    // Recria o admin apontando para os novos IDs (agora incluindo o grupo_id)
    await connection.query(
      `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo, empresa_id, setor_id, grupo_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "admin",
        "Administrador",
        "admin@local.com",
        hashedPassword,
        0, // is_ad_user (0 = Manual)
        "ADMIN", // Perfil
        10, // Pontos iniciais
        1, // Ativo
        1, // empresa_id
        1, // setor_id
        1, // grupo_id (NOVO)
      ],
    );

    console.log(
      "👤 Usuário 'admin' (senha: admin123) recriado com sucesso e atrelado ao Grupo Geral.",
    );
    console.log("🏁 Limpeza concluída!");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(
        `❌ Conexão recusada em ${host}:${port}. Verifique:\n` +
          "  • O MySQL está rodando?\n" +
          "  • DB_HOST e DB_PORT no backend/.env estão corretos?",
      );
    } else {
      console.error("❌ Erro ao limpar o banco:", error.message);
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

resetDatabase();

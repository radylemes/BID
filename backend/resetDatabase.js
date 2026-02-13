const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function resetDatabase() {
  console.log("⚠️  INICIANDO LIMPEZA TOTAL DO BANCO DE DADOS...");

  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true, // Permite rodar vários comandos de uma vez
    });

    console.log(`🔌 Conectado ao banco '${process.env.DB_NAME}'.`);

    // 1. Desativar verificação de chaves estrangeiras para permitir o TRUNCATE
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    // 2. Limpar todas as tabelas (Ordem não importa aqui pois FK está desligada)
    const tables = [
      "apostas",
      "historico_pontos",
      "partidas",
      "usuarios",
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
    // RECRIAR ADMIN PADRÃO (Para você não ficar trancado fora)
    // ============================================================
    const hashedPassword = await bcrypt.hash("admin123", 10);

    await connection.query(
      "INSERT INTO grupos (id, nome, descricao) VALUES (1, 'Geral', 'Grupo padrão do sistema')",
    );

    await connection.query(
      `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo, grupo_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "admin",
        "Administrador",
        "admin@local.com",
        hashedPassword,
        0, // is_ad_user (0 = Manual)
        "ADMIN", // Perfil
        1000, // Pontos iniciais
        1, // Ativo
        1, // Grupo ID
      ],
    );

    console.log("👤 Usuário 'admin' (senha: admin123) recriado com sucesso.");
    console.log("🏁 Limpeza concluída!");
  } catch (error) {
    console.error("❌ Erro ao limpar o banco:", error);
  } finally {
    if (connection) await connection.end();
  }
}

resetDatabase();

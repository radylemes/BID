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

    // 2. Limpar todas as tabelas na nova arquitetura
    // ATUALIZADO: Incluídas as novas tabelas (ingressos, auditoria, grupos, configuracoes)
    const tables = [
      "ingressos",
      "apostas",
      "historico_pontos",
      "partidas",
      "auditoria",
      "usuarios",
      "regras_pontuacao",
      "configuracoes",
      "convidados",
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
    console.error("❌ Erro ao limpar o banco:", error);
  } finally {
    if (connection) await connection.end();
  }
}

resetDatabase();

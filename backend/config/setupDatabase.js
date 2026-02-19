const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function initializeDatabase() {
  console.log("🔄 Verificando Banco de Dados...");
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`,
    );
    await connection.changeUser({ database: process.env.DB_NAME });
    console.log(`✅ Banco '${process.env.DB_NAME}' selecionado.`);

    // ============================================================
    // CRIAÇÃO DAS TABELAS (Se não existirem)
    // ============================================================

    // 1. Grupos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS grupos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Usuários
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        nome_completo VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        senha_hash VARCHAR(255) NULL,
        is_ad_user TINYINT(1) DEFAULT 1,
        pontos INT DEFAULT 0,
        perfil ENUM('ADMIN', 'USER') DEFAULT 'USER',
        grupo_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
      );
    `);

    // 3. Convidados (NOVO MÓDULO)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS convidados (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nome_completo VARCHAR(255) NOT NULL,
        cpf VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);

    // 4. Histórico
    await connection.query(`
      CREATE TABLE IF NOT EXISTS historico_pontos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        admin_id INT NOT NULL,
        pontos_antes INT NOT NULL,
        pontos_depois INT NOT NULL,
        motivo VARCHAR(255),
        data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);

    // 5. Partidas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS partidas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NULL,
        banner VARCHAR(500) NULL,
        local VARCHAR(255) NULL,
        quantidade_premios INT DEFAULT 1,
        data_inicio_apostas DATETIME NULL,
        data_jogo DATETIME NOT NULL,
        data_limite_aposta DATETIME NOT NULL,
        status ENUM('ABERTA', 'ENCERRADA', 'FINALIZADA') DEFAULT 'ABERTA',
        custo_aposta INT DEFAULT 10,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Apostas (Adicionado convidado_id para novas instalações)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS apostas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_id INT NOT NULL,
        usuario_id INT NOT NULL,
        convidado_id INT NULL,
        valor_pago INT NOT NULL DEFAULT 0,
        data_aposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('PENDENTE', 'GANHOU', 'PERDEU') DEFAULT 'PENDENTE',
        palpite_casa INT NULL,
        palpite_fora INT NULL,
        FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE SET NULL
      );
    `);

    // ============================================================
    // CORREÇÃO CRÍTICA: REMOVER UNIQUE KEY (Para permitir multi-lances)
    // ============================================================
    try {
      await connection.query("ALTER TABLE apostas DROP INDEX unique_aposta");
      console.log(
        "🔓 Restrição 'unique_aposta' removida com sucesso! (Multi-lances liberado)",
      );
    } catch (e) {
      try {
        await connection.query("ALTER TABLE apostas DROP INDEX unique_ticket");
        console.log("🔓 Restrição 'unique_ticket' removida com sucesso!");
      } catch (e2) {}
    }

    // ============================================================
    // MIGRATIONS DE COLUNAS (Garante que colunas novas existam em BDs antigos)
    // ============================================================
    const ensureColumns = async (tableName, columns) => {
      for (const col of columns) {
        try {
          const [rows] = await connection.query(
            `SHOW COLUMNS FROM ${tableName} LIKE '${col.nome}'`,
          );
          if (rows.length === 0) {
            await connection.query(
              `ALTER TABLE ${tableName} ADD COLUMN ${col.nome} ${col.tipo}`,
            );
            console.log(
              `✨ Coluna '${col.nome}' adicionada em '${tableName}'.`,
            );
          }
        } catch (e) {
          console.error(e.message);
        }
      }
    };

    // Garante as colunas novas em partidas
    await ensureColumns("partidas", [
      { nome: "titulo", tipo: "VARCHAR(255) NULL" },
      { nome: "banner", tipo: "VARCHAR(500) NULL" },
      { nome: "local", tipo: "VARCHAR(255) NULL" },
      { nome: "quantidade_premios", tipo: "INT DEFAULT 1" },
      { nome: "data_inicio_apostas", tipo: "DATETIME NULL" },
      { nome: "grupo_id", tipo: "INT DEFAULT 1" },
    ]);

    // Garante a coluna convidado_id na tabela de apostas (caso a tabela já existisse)
    await ensureColumns("apostas", [
      { nome: "convidado_id", tipo: "INT NULL" },
    ]);

    // Garante a Foreign Key do convidado na tabela de apostas (se ainda não existir)
    try {
      await connection.query(`
        ALTER TABLE apostas 
        ADD CONSTRAINT fk_apostas_convidado 
        FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE SET NULL;
      `);
      console.log(
        "✨ Vínculo (Foreign Key) de convidados adicionado às apostas.",
      );
    } catch (e) {
      // Ignora erro silenciosamente se a chave estrangeira já existir no banco
    }

    // ============================================================
    // FINALIZAÇÃO
    // ============================================================
    const [users] = await connection.query("SELECT * FROM usuarios LIMIT 1");
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await connection.query(
        `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "admin",
          "Administrador",
          "admin@local.com",
          hashedPassword,
          0,
          "ADMIN",
          1000,
          1,
        ],
      );
      console.log("👤 Usuário Admin criado.");
    }

    console.log("🏁 Inicialização concluída!");
  } catch (error) {
    console.error("❌ Erro fatal:", error);
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = initializeDatabase;

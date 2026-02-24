const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function initializeDatabase() {
  console.log(
    "🔄 Verificando e Estruturando Banco de Dados (Arquitetura Otimizada)...",
  );
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
    // 1. ORGANOGRAMA (Vem do AD / Excel)
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS setores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
      );
    `);

    // ============================================================
    // 2. LÓGICA DE NEGÓCIO (Criado manualmente pelo Admin)
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS grupos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        descricao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 3. AUDITORIA GLOBAL (Motor de Logs)
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        modulo VARCHAR(50) NOT NULL,    -- Ex: 'USUARIOS', 'PARTIDAS', 'PORTARIA'
        acao VARCHAR(50) NOT NULL,      -- Ex: 'CREATE', 'CHECKIN_INGRESSO'
        registro_id INT NULL,           -- ID do item afetado
        detalhes JSON NULL,             -- Guarda { "antes": {...}, "depois": {...}, "motivo": "..." }
        ip_address VARCHAR(50) NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================================
    // 4. USUÁRIOS
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        nome_completo VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        senha_hash VARCHAR(255) NULL,
        is_ad_user TINYINT(1) DEFAULT 1,
        pontos INT DEFAULT 0,
        perfil ENUM('ADMIN', 'USER', 'PORTARIA') DEFAULT 'USER',
        
        empresa_id INT NULL,  -- Veio do AD
        setor_id INT NULL,    -- Veio do AD
        grupo_id INT NULL,    -- Grupo de Apostas (Manual)
        
        ativo TINYINT(1) DEFAULT 1,
        microsoft_id VARCHAR(255) NULL,
        foto VARCHAR(500) NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL,
        FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
      );
    `);

    // ============================================================
    // 5. CONVIDADOS E HISTÓRICO DE PONTOS
    // ============================================================
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

    // ============================================================
    // 6. EVENTOS (PARTIDAS), LANCES E INGRESSOS (Nova Arquitetura)
    // ============================================================
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
        grupo_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
      );
    `);

    // LIMPEZA: Tabela de Apostas agora regista apenas o Lance Financeiro!
    await connection.query(`
      CREATE TABLE IF NOT EXISTS apostas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_id INT NOT NULL,
        usuario_id INT NOT NULL,
        valor_pago INT NOT NULL DEFAULT 0,
        data_aposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('PENDENTE', 'GANHOU', 'PERDEU') DEFAULT 'PENDENTE',
        FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `);

    // NOVO: Tabela exclusiva para gestão de bilhetes individuais na portaria
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ingressos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aposta_id INT NOT NULL,
        usuario_id INT NOT NULL,
        convidado_id INT NULL,
        checkin TINYINT(1) DEFAULT 0,
        assinatura LONGTEXT NULL,
        recebedor_nome VARCHAR(255) NULL,
        recebedor_cpf VARCHAR(20) NULL,
        data_checkin DATETIME NULL,
        FOREIGN KEY (aposta_id) REFERENCES apostas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE SET NULL
      );
    `);

    // ============================================================
    // 7. CONFIGURAÇÕES E REGRAS DE PONTUAÇÃO
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS configuracoes (
        chave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL,
        descricao VARCHAR(255),
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS regras_pontuacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL,
        pontos INT NOT NULL DEFAULT 1,
        frequencia_valor INT NOT NULL DEFAULT 1,
        frequencia_tipo ENUM('minutos', 'horas', 'dias', 'meses') NOT NULL,
        ativo BOOLEAN DEFAULT TRUE,
        
        grupo_id INT NULL,
        perfil_alvo VARCHAR(50) NULL,
        setor_id INT NULL,
        somente_ativos TINYINT(1) DEFAULT 1,
        
        ultima_execucao DATETIME NULL,
        proxima_execucao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
        FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL
      );
    `);

    // ============================================================
    // MIGRATIONS E GARANTIAS
    // ============================================================

    // 1. Resolve a transição de empresa_id para grupo_id na tabela partidas
    try {
      const [colsPartidas] = await connection.query(
        "SHOW COLUMNS FROM partidas LIKE 'empresa_id'",
      );
      if (colsPartidas.length > 0) {
        await connection.query("SET FOREIGN_KEY_CHECKS=0;");
        await connection.query(
          "ALTER TABLE partidas CHANGE empresa_id grupo_id INT NULL;",
        );
        await connection.query("SET FOREIGN_KEY_CHECKS=1;");
        console.log(
          "✨ Migration: 'empresa_id' renomeada para 'grupo_id' em 'partidas'.",
        );
      }
    } catch (e) {}

    // 2. Garante que colunas novas existam
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
              `✨ Migration: Coluna '${col.nome}' adicionada em '${tableName}'.`,
            );
          }
        } catch (e) {}
      }
    };

    await ensureColumns("usuarios", [
      { nome: "microsoft_id", tipo: "VARCHAR(255) NULL" },
      { nome: "foto", tipo: "VARCHAR(500) NULL" },
      { nome: "empresa_id", tipo: "INT NULL" },
      { nome: "setor_id", tipo: "INT NULL" },
      { nome: "grupo_id", tipo: "INT NULL" },
    ]);

    await ensureColumns("partidas", [{ nome: "grupo_id", tipo: "INT NULL" }]);
    await ensureColumns("regras_pontuacao", [
      { nome: "grupo_id", tipo: "INT NULL" },
    ]);

    // População Básica se estiver vazio
    const [users] = await connection.query("SELECT * FROM usuarios LIMIT 1");
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await connection.query(
        "INSERT INTO grupos (id, nome, descricao) VALUES (1, 'Geral', 'Grupo de Apostas Padrão')",
      );
      await connection.query(
        `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo, grupo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "admin",
          "Administrador",
          "admin@local.com",
          hashedPassword,
          0,
          "ADMIN",
          1000,
          1,
          1,
        ],
      );
      console.log("👤 Admin padrão recriado.");
    }

    console.log("🏁 Banco Inicializado com Nova Arquitetura de Ingressos!");
  } catch (error) {
    console.error("❌ Erro fatal:", error);
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = initializeDatabase;

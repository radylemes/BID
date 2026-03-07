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
    // 3. AUDITORIA GLOBAL E MONITOR DE ERROS (Motor de Logs)
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

    // NOVO: Tabela para registar falhas e exceções do sistema
    await connection.query(`
      CREATE TABLE IF NOT EXISTS logs_erros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modulo VARCHAR(100) NOT NULL,
        mensagem TEXT NOT NULL,
        stack_trace TEXT NULL,
        resolvido TINYINT(1) DEFAULT 0,
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
        tema_preferido VARCHAR(50) NOT NULL DEFAULT 'claro',
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

    // Setores de evento (catálogo: Cadeira inferior, Pista, Camarote, etc.)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS setores_evento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        setor_evento_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL,
        FOREIGN KEY (setor_evento_id) REFERENCES setores_evento(id) ON DELETE SET NULL
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
    // Para bancos já existentes, execute uma vez: ALTER TABLE ingressos ADD COLUMN documento LONGTEXT NULL AFTER assinatura;
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ingressos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        aposta_id INT NOT NULL,
        usuario_id INT NOT NULL,
        convidado_id INT NULL,
        checkin TINYINT(1) DEFAULT 0,
        assinatura LONGTEXT NULL,
        documento LONGTEXT NULL,
        recebedor_nome VARCHAR(255) NULL,
        recebedor_cpf VARCHAR(20) NULL,
        data_checkin DATETIME NULL,
        FOREIGN KEY (aposta_id) REFERENCES apostas(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE SET NULL
      );
    `);

    // Migração: adicionar coluna documento em instalações antigas (ingressos já existente sem a coluna)
    try {
      const [cols] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ingressos' AND COLUMN_NAME = 'documento'`,
        [process.env.DB_NAME],
      );
      if (cols.length === 0) {
        await connection.query(
          `ALTER TABLE ingressos ADD COLUMN documento LONGTEXT NULL AFTER assinatura`,
        );
        console.log("✅ Coluna 'documento' adicionada à tabela ingressos.");
      }
    } catch (e) {
      console.warn("Aviso ao verificar/adicionar coluna documento em ingressos:", e.message);
    }

    // Transferências de ingressos não sorteados entre BIDs (origem → destino)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transferencias_ingressos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_origem_id INT NOT NULL,
        partida_destino_id INT NOT NULL,
        quantidade INT NOT NULL DEFAULT 0,
        motivo VARCHAR(500) NULL,
        admin_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partida_origem_id) REFERENCES partidas(id) ON DELETE CASCADE,
        FOREIGN KEY (partida_destino_id) REFERENCES partidas(id) ON DELETE CASCADE
      );
    `);

    // Acréscimo de ingressos a BID finalizado (atribui à fila PERDEU, debita pontos)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS acrescimos_ingressos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partida_id INT NOT NULL,
        quantidade INT NOT NULL DEFAULT 0,
        motivo VARCHAR(500) NULL,
        admin_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
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
    // 8. LISTAS DE E-MAIL E TEMPLATES
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS listas_email (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS listas_email_itens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lista_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        nome_opcional VARCHAR(255) NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lista_id) REFERENCES listas_email(id) ON DELETE CASCADE
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS templates_email (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        assunto VARCHAR(255) NOT NULL,
        corpo_html LONGTEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      { nome: "tema_preferido", tipo: "VARCHAR(50) NOT NULL DEFAULT 'claro'" },
      { nome: "empresa_id", tipo: "INT NULL" },
      { nome: "setor_id", tipo: "INT NULL" },
      { nome: "grupo_id", tipo: "INT NULL" },
      { nome: "avatar_data", tipo: "MEDIUMBLOB NULL" },
      { nome: "avatar_tipo", tipo: "VARCHAR(100) NULL" },
    ]);

    await ensureColumns("partidas", [
      { nome: "grupo_id", tipo: "INT NULL" },
      { nome: "setor_evento_id", tipo: "INT NULL" },
      { nome: "banner_data", tipo: "MEDIUMBLOB NULL" },
      { nome: "banner_tipo", tipo: "VARCHAR(100) NULL" },
      { nome: "subtitulo", tipo: "VARCHAR(255) NULL" },
      { nome: "informacoes_extras", tipo: "TEXT NULL" },
      { nome: "link_extra", tipo: "VARCHAR(500) NULL" },
      { nome: "data_apuracao", tipo: "DATETIME NULL" },
      { nome: "email_bid_aberto_em", tipo: "DATETIME NULL" },
      { nome: "email_bid_encerrado_em", tipo: "DATETIME NULL" },
      { nome: "email_ganhadores_em", tipo: "DATETIME NULL" },
    ]);
    await ensureColumns("regras_pontuacao", [
      { nome: "grupo_id", tipo: "INT NULL" },
    ]);

    // 2.1 Garante tema_preferido aceita temas claros e variantes escuras (carbon, amber, forest, violet)
    try {
      await connection.query(
        "ALTER TABLE usuarios MODIFY COLUMN tema_preferido VARCHAR(50) NOT NULL DEFAULT 'claro'",
      );
      await connection.query(
        "UPDATE usuarios SET tema_preferido = 'escuro-violet' WHERE tema_preferido = 'escuro'",
      );
    } catch (e) {}

    // 3. Garante utf8mb4 em templates_email (emojis e Unicode completo)
    try {
      const [tbl] = await connection.query(
        "SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates_email'"
      );
      if (tbl.length > 0 && tbl[0].TABLE_COLLATION && !String(tbl[0].TABLE_COLLATION).startsWith("utf8mb4")) {
        await connection.query(
          "ALTER TABLE templates_email CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        );
        console.log("✨ Migration: tabela 'templates_email' convertida para utf8mb4 (suporte a emojis).");
      }
    } catch (e) {}

    // 4. Garante utf8mb4 em partidas (emojis em titulo, subtitulo, informacoes_extras, etc.)
    try {
      const [tblPartidas] = await connection.query(
        "SELECT TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partidas'"
      );
      if (tblPartidas.length > 0 && tblPartidas[0].TABLE_COLLATION && !String(tblPartidas[0].TABLE_COLLATION).startsWith("utf8mb4")) {
        await connection.query(
          "ALTER TABLE partidas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        );
        console.log("✨ Migration: tabela 'partidas' convertida para utf8mb4 (suporte a emojis).");
      }
    } catch (e) {}

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

    console.log(
      "🏁 Banco Inicializado com Nova Arquitetura de Ingressos e Monitoramento de Erros!",
    );
  } catch (error) {
    console.error("❌ Erro fatal:", error);
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = initializeDatabase;

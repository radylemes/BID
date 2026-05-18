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
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 30000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
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
        cpf VARCHAR(11) NULL COMMENT 'Titular: 11 digitos, obrigatorio em criacao/edicao manual e importacao',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL,
        FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
        FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL
      );
    `);

    // Migração: coluna cpf em usuarios (titular) + índice único (vários NULL permitidos no MySQL)
    try {
      const [cpfCol] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'cpf'`,
        [process.env.DB_NAME],
      );
      if (cpfCol.length === 0) {
        await connection.query(
          `ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(11) NULL COMMENT 'Titular: 11 digitos' AFTER tema_preferido`,
        );
        console.log("✅ Coluna usuarios.cpf adicionada.");
      }
      const [idxCpf] = await connection.query(
        `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'uniq_usuarios_cpf'`,
        [process.env.DB_NAME],
      );
      if (idxCpf.length === 0) {
        try {
          await connection.query(
            `ALTER TABLE usuarios ADD UNIQUE KEY uniq_usuarios_cpf (cpf)`,
          );
          console.log("✅ Índice uniq_usuarios_cpf adicionado à tabela usuarios.");
        } catch (alterErr) {
          console.warn("Aviso ao adicionar UNIQUE cpf em usuarios:", alterErr.message);
        }
      }
    } catch (e) {
      console.warn("Aviso ao migrar usuarios.cpf:", e.message);
    }

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
        vinculo_titular TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = retirante e o proprio titular (nao excluir)',
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_usuario_cpf (usuario_id, cpf)
      );
    `);

    // Migração: UNIQUE (usuario_id, cpf) e normalização de CPF para dígitos
    try {
      const [idxRows] = await connection.query(
        `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'convidados' AND INDEX_NAME = 'uniq_usuario_cpf'`,
        [process.env.DB_NAME],
      );
      if (idxRows.length === 0) {
        try {
          await connection.query(
            `UPDATE convidados SET cpf = REGEXP_REPLACE(IFNULL(cpf,''), '[^0-9]', '')`,
          );
        } catch (normErr) {
          console.warn("Aviso ao normalizar CPF em convidados:", normErr.message);
        }
        try {
          await connection.query(
            `ALTER TABLE convidados ADD UNIQUE KEY uniq_usuario_cpf (usuario_id, cpf)`,
          );
          console.log("✅ Índice uniq_usuario_cpf adicionado à tabela convidados.");
        } catch (alterErr) {
          console.warn(
            "Aviso ao adicionar UNIQUE (usuario_id, cpf) em convidados:",
            alterErr.message,
          );
        }
      }
    } catch (e) {
      console.warn("Aviso ao verificar/migrar índice convidados:", e.message);
    }

    // Migração: convidados.vinculo_titular (retirante = titular da conta)
    try {
      const [vincCol] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'convidados' AND COLUMN_NAME = 'vinculo_titular'`,
        [process.env.DB_NAME],
      );
      if (vincCol.length === 0) {
        await connection.query(
          `ALTER TABLE convidados ADD COLUMN vinculo_titular TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = titular' AFTER telefone`,
        );
        console.log("✅ Coluna convidados.vinculo_titular adicionada.");
      }
    } catch (e) {
      console.warn("Aviso ao migrar convidados.vinculo_titular:", e.message);
    }

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
    // 6b. WT Pass (inscrição por ordem, sem sorteio) — tabelas eventos_rh / inscricoes_rh
    // ============================================================
    await connection.query(`
      CREATE TABLE IF NOT EXISTS eventos_rh (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NULL,
        banner VARCHAR(500) NULL,
        subtitulo VARCHAR(255) NULL,
        descricao TEXT NULL,
        local VARCHAR(255) NULL,
        data_inicio_inscricao DATETIME NULL,
        data_limite_inscricao DATETIME NOT NULL,
        data_evento DATETIME NOT NULL,
        vagas INT NOT NULL DEFAULT 1,
        permitir_lista_espera TINYINT(1) NOT NULL DEFAULT 1,
        auto_encerrar TINYINT(1) NOT NULL DEFAULT 1,
        status ENUM('ABERTO','ENCERRADO','REALIZADO','CANCELADO') NOT NULL DEFAULT 'ABERTO',
        partida_id INT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE SET NULL
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS inscricoes_rh (
        id INT AUTO_INCREMENT PRIMARY KEY,
        evento_id INT NOT NULL,
        usuario_id INT NOT NULL,
        posicao INT NOT NULL,
        status ENUM('INSCRITO','FILA_ESPERA','PRESENTE','FALTOU','CANCELADO') NOT NULL DEFAULT 'INSCRITO',
        aceitou_politica TINYINT(1) NOT NULL DEFAULT 0,
        data_inscricao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        portaria_checkin TINYINT(1) NOT NULL DEFAULT 0,
        portaria_assinatura LONGTEXT NULL,
        portaria_documento LONGTEXT NULL,
        portaria_recebedor_nome VARCHAR(255) NULL,
        portaria_recebedor_cpf VARCHAR(20) NULL,
        portaria_data_checkin DATETIME NULL,
        FOREIGN KEY (evento_id) REFERENCES eventos_rh(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_evento_usuario (evento_id, usuario_id)
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bloqueios_eventos_rh (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        evento_origem_id INT NOT NULL,
        eventos_restantes INT NOT NULL DEFAULT 5,
        eventos_total INT NOT NULL DEFAULT 5,
        ativo TINYINT(1) NOT NULL DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (evento_origem_id) REFERENCES eventos_rh(id) ON DELETE CASCADE
      );
    `);

    // Eventos individualmente bloqueados para um usuário: cada bloqueio gera N vínculos
    // (um por cada novo evento criado enquanto o bloqueio esteve ativo). Mesmo após o
    // bloqueio expirar/zerar, esses eventos continuam fora do alcance de inscrição
    // para o usuário que recebeu a punição.
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bloqueios_eventos_rh_alvos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bloqueio_id INT NOT NULL,
        usuario_id INT NOT NULL,
        evento_id INT NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_bloqueio_evento (bloqueio_id, evento_id),
        KEY idx_usuario_evento (usuario_id, evento_id),
        FOREIGN KEY (bloqueio_id) REFERENCES bloqueios_eventos_rh(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (evento_id) REFERENCES eventos_rh(id) ON DELETE CASCADE
      );
    `);

    // Migração: vincula cada FALTA contabilizada ao bloqueio que ela gerou.
    // Permite contar apenas faltas "não consumidas" para decidir um novo bloqueio.
    try {
      const [cols] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inscricoes_rh' AND COLUMN_NAME = 'bloqueio_consumido_id'`,
        [process.env.DB_NAME],
      );
      if (cols.length === 0) {
        await connection.query(
          `ALTER TABLE inscricoes_rh ADD COLUMN bloqueio_consumido_id INT NULL`,
        );
        await connection.query(
          `ALTER TABLE inscricoes_rh ADD CONSTRAINT fk_inscricoes_rh_bloqueio FOREIGN KEY (bloqueio_consumido_id) REFERENCES bloqueios_eventos_rh(id) ON DELETE SET NULL`,
        );
        console.log("✅ Coluna 'bloqueio_consumido_id' adicionada à tabela inscricoes_rh.");
      }
    } catch (e) {
      console.warn(
        "Aviso ao verificar/adicionar coluna bloqueio_consumido_id em inscricoes_rh:",
        e.message,
      );
    }

    // Migração: garante valores PRESENTE/FALTOU no ENUM de status (bases criadas antes do WT Pass).
    try {
      const [enumRow] = await connection.query(
        `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inscricoes_rh' AND COLUMN_NAME = 'status'`,
        [process.env.DB_NAME],
      );
      const colType = String(enumRow[0]?.COLUMN_TYPE || "");
      if (colType && (!colType.includes("PRESENTE") || !colType.includes("FALTOU"))) {
        await connection.query(
          `ALTER TABLE inscricoes_rh
             MODIFY COLUMN status ENUM('INSCRITO','FILA_ESPERA','PRESENTE','FALTOU','CANCELADO')
             NOT NULL DEFAULT 'INSCRITO'`,
        );
        console.log("✅ ENUM 'status' de inscricoes_rh atualizado (PRESENTE/FALTOU).");
      }
    } catch (e) {
      console.warn("Aviso ao atualizar ENUM status em inscricoes_rh:", e.message);
    }

    // Migração: guarda a duração inicial do bloqueio para permitir exibição
    // "restantes/total" (ex.: 4/5) na UI mesmo após a primeira decremento.
    try {
      const [cols] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bloqueios_eventos_rh' AND COLUMN_NAME = 'eventos_total'`,
        [process.env.DB_NAME],
      );
      if (cols.length === 0) {
        await connection.query(
          `ALTER TABLE bloqueios_eventos_rh ADD COLUMN eventos_total INT NOT NULL DEFAULT 5`,
        );
        // Para bloqueios antigos sem essa informação, assume que o total era
        // pelo menos igual ao que ainda resta — evita exibir progresso inválido.
        await connection.query(
          `UPDATE bloqueios_eventos_rh SET eventos_total = GREATEST(eventos_total, eventos_restantes)`,
        );
        console.log("✅ Coluna 'eventos_total' adicionada à tabela bloqueios_eventos_rh.");
      }
    } catch (e) {
      console.warn(
        "Aviso ao verificar/adicionar coluna eventos_total em bloqueios_eventos_rh:",
        e.message,
      );
    }

    // Migração: adiciona o sinalizador de auto-encerramento (ABERTO → ENCERRADO
    // automático quando data_limite_inscricao expira). Padrão = ligado (1) para
    // novos registos e também para registos antigos, mantendo o comportamento
    // de "fechado de facto" coerente com o estado efetivo já exibido pela UI.
    try {
      const [cols] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'eventos_rh' AND COLUMN_NAME = 'auto_encerrar'`,
        [process.env.DB_NAME],
      );
      if (cols.length === 0) {
        await connection.query(
          `ALTER TABLE eventos_rh ADD COLUMN auto_encerrar TINYINT(1) NOT NULL DEFAULT 1 AFTER permitir_lista_espera`,
        );
        console.log("✅ Coluna 'auto_encerrar' adicionada à tabela eventos_rh.");
      }
    } catch (e) {
      console.warn(
        "Aviso ao verificar/adicionar coluna auto_encerrar em eventos_rh:",
        e.message,
      );
    }

    // Migração: WT Pass ligado à partida (BID) para lista unificada na recepção.
    try {
      const [cols] = await connection.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'eventos_rh' AND COLUMN_NAME = 'partida_id'`,
        [process.env.DB_NAME],
      );
      if (cols.length === 0) {
        await connection.query(
          `ALTER TABLE eventos_rh ADD COLUMN partida_id INT NULL AFTER status`,
        );
        await connection.query(
          `ALTER TABLE eventos_rh ADD CONSTRAINT fk_eventos_rh_partida FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE SET NULL`,
        );
        console.log("✅ Coluna 'partida_id' adicionada à tabela eventos_rh.");
      }
    } catch (e) {
      console.warn("Aviso ao verificar/adicionar coluna partida_id em eventos_rh:", e.message);
    }

    // Migração: check-in da portaria em inscrições WT (espelho de ingressos).
    const portariaCols = [
      ["portaria_checkin", "TINYINT(1) NOT NULL DEFAULT 0"],
      ["portaria_assinatura", "LONGTEXT NULL"],
      ["portaria_documento", "LONGTEXT NULL"],
      ["portaria_recebedor_nome", "VARCHAR(255) NULL"],
      ["portaria_recebedor_cpf", "VARCHAR(20) NULL"],
      ["portaria_data_checkin", "DATETIME NULL"],
    ];
    for (const [colName, colDef] of portariaCols) {
      try {
        const [c] = await connection.query(
          `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inscricoes_rh' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME, colName],
        );
        if (c.length === 0) {
          await connection.query(
            `ALTER TABLE inscricoes_rh ADD COLUMN ${colName} ${colDef}`,
          );
          console.log(`✅ Coluna '${colName}' adicionada à tabela inscricoes_rh.`);
        }
      } catch (e) {
        console.warn(`Aviso ao verificar/adicionar coluna ${colName} em inscricoes_rh:`, e.message);
      }
    }

    // Índice para agregações por evento/status (lista admin WT Pass, contagens).
    try {
      const [idx] = await connection.query(
        `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inscricoes_rh' AND INDEX_NAME = 'idx_inscricoes_rh_evento_status'`,
        [process.env.DB_NAME],
      );
      if (idx.length === 0) {
        await connection.query(
          `CREATE INDEX idx_inscricoes_rh_evento_status ON inscricoes_rh (evento_id, status)`,
        );
        console.log("✅ Índice idx_inscricoes_rh_evento_status criado em inscricoes_rh.");
      }
    } catch (e) {
      console.warn("Aviso ao criar índice idx_inscricoes_rh_evento_status:", e.message);
    }

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

    // Seeds das configurações do WT Pass (não sobrescreve valores existentes).
    await connection.query(
      `INSERT IGNORE INTO configuracoes (chave, valor, descricao) VALUES
        ('wt_pass_faltas_permitidas', '1', 'Quantidade de faltas no WT Pass antes de gerar bloqueio.'),
        ('wt_pass_eventos_bloqueio', '5', 'Duração do bloqueio (em número de eventos novos criados) no WT Pass.')`,
    );

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
        tipo_disparo VARCHAR(50) NULL,
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
    } catch (e) {
      console.warn("Aviso migration partidas.empresa_id→grupo_id:", e.message);
    }

    // 2. Garante que colunas novas existam (instalações antigas com CREATE TABLE IF NOT EXISTS)
    const ensureColumns = async (tableName, columns) => {
      const [tbl] = await connection.query(
        `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [process.env.DB_NAME, tableName],
      );
      if (tbl.length === 0) return;

      for (const col of columns) {
        try {
          const [rows] = await connection.query(
            `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [process.env.DB_NAME, tableName, col.nome],
          );
          if (rows.length === 0) {
            await connection.query(
              `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.nome}\` ${col.tipo}`,
            );
            console.log(
              `✨ Migration: Coluna '${col.nome}' adicionada em '${tableName}'.`,
            );
          }
        } catch (e) {
          console.warn(
            `Aviso migration ${tableName}.${col.nome}:`,
            e.message,
          );
        }
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
      { nome: "cpf", tipo: "VARCHAR(11) NULL" },
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

    await ensureColumns("templates_email", [
      { nome: "tipo_disparo", tipo: "VARCHAR(50) NULL" },
    ]);

    await ensureColumns("convidados", [
      { nome: "vinculo_titular", tipo: "TINYINT(1) NOT NULL DEFAULT 0" },
    ]);

    await ensureColumns("ingressos", [
      { nome: "documento", tipo: "LONGTEXT NULL" },
      { nome: "recebedor_nome", tipo: "VARCHAR(255) NULL" },
      { nome: "recebedor_cpf", tipo: "VARCHAR(20) NULL" },
      { nome: "data_checkin", tipo: "DATETIME NULL" },
    ]);

    await ensureColumns("eventos_rh", [
      { nome: "titulo", tipo: "VARCHAR(255) NULL" },
      { nome: "banner", tipo: "VARCHAR(500) NULL" },
      { nome: "subtitulo", tipo: "VARCHAR(255) NULL" },
      { nome: "descricao", tipo: "TEXT NULL" },
      { nome: "local", tipo: "VARCHAR(255) NULL" },
      { nome: "data_inicio_inscricao", tipo: "DATETIME NULL" },
      { nome: "data_limite_inscricao", tipo: "DATETIME NULL" },
      { nome: "data_evento", tipo: "DATETIME NULL" },
      { nome: "vagas", tipo: "INT NOT NULL DEFAULT 1" },
      { nome: "permitir_lista_espera", tipo: "TINYINT(1) NOT NULL DEFAULT 1" },
      { nome: "auto_encerrar", tipo: "TINYINT(1) NOT NULL DEFAULT 1" },
      { nome: "partida_id", tipo: "INT NULL" },
    ]);

    await ensureColumns("inscricoes_rh", [
      { nome: "bloqueio_consumido_id", tipo: "INT NULL" },
      { nome: "portaria_checkin", tipo: "TINYINT(1) NOT NULL DEFAULT 0" },
      { nome: "portaria_assinatura", tipo: "LONGTEXT NULL" },
      { nome: "portaria_documento", tipo: "LONGTEXT NULL" },
      { nome: "portaria_recebedor_nome", tipo: "VARCHAR(255) NULL" },
      { nome: "portaria_recebedor_cpf", tipo: "VARCHAR(20) NULL" },
      { nome: "portaria_data_checkin", tipo: "DATETIME NULL" },
    ]);

    await ensureColumns("bloqueios_eventos_rh", [
      { nome: "eventos_total", tipo: "INT NOT NULL DEFAULT 5" },
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

    // 5. Template de e-mail para criação manual de utilizador (USUARIO_CRIADO)
    try {
      const [tplUsu] = await connection.query(
        "SELECT id FROM templates_email WHERE tipo_disparo = 'USUARIO_CRIADO' LIMIT 1"
      );
      if (tplUsu.length === 0) {
        const nomeTpl = "Boas-vindas (utilizador criado)";
        const assuntoTpl = "Bem-vindo(a) — a sua conta foi criada";
        const corpoHtml = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1e293b">
  <p>Olá, <strong>{{usuario.nome}}</strong>,</p>
  <p>A sua conta na plataforma de apostas foi criada. Utilize as credenciais abaixo para o primeiro acesso:</p>
  <ul>
    <li><strong>E-mail:</strong> {{usuario.email}}</li>
    <li><strong>Utilizador:</strong> {{usuario.username}}</li>
    <li><strong>Senha inicial:</strong> {{senha}}</li>
  </ul>
  <p><strong>Importante:</strong> por segurança, altere a senha assim que possível após entrar (área de perfil ou definições do utilizador).</p>
  <p>Cumprimentos,<br/>Equipa</p>
</body></html>`;
        await connection.execute(
          "INSERT INTO templates_email (nome, assunto, corpo_html, tipo_disparo) VALUES (?, ?, ?, 'USUARIO_CRIADO')",
          [nomeTpl, assuntoTpl, corpoHtml]
        );
        console.log("✨ Template de e-mail USUARIO_CRIADO inserido.");
      }
    } catch (e) {
      console.error("Migration template USUARIO_CRIADO:", e);
    }

    // População Básica se estiver vazio
    const [users] = await connection.query("SELECT * FROM usuarios LIMIT 1");
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await connection.query(
        "INSERT INTO grupos (id, nome, descricao) VALUES (1, 'Geral', 'Grupo de Apostas Padrão')",
      );
      // CPF fictício válido apenas para seed de desenvolvimento (admin local).
      const adminSeedCpf = "39053344705";
      await connection.query(
        `INSERT INTO usuarios (username, nome_completo, email, senha_hash, is_ad_user, perfil, pontos, ativo, grupo_id, cpf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          adminSeedCpf,
        ],
      );
      console.log("👤 Admin padrão recriado.");
    }

    console.log(
      "🏁 Banco Inicializado com Nova Arquitetura de Ingressos e Monitoramento de Erros!",
    );
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

module.exports = initializeDatabase;

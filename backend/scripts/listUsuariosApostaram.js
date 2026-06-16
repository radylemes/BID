#!/usr/bin/env node
/**
 * Lista usuários que realizaram apostas nos BIDs.
 *
 * Uso:
 *   node scripts/listUsuariosApostaram.js
 *   node scripts/listUsuariosApostaram.js --detalhe
 *   node scripts/listUsuariosApostaram.js --bid 12
 *   node scripts/listUsuariosApostaram.js --status FINALIZADA
 *   node scripts/listUsuariosApostaram.js --json
 *   npm run list-usuarios-apostaram
 */

const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function parseArgs(argv) {
  const bidIdx = argv.indexOf("--bid");
  const statusIdx = argv.indexOf("--status");
  return {
    detalhe: argv.includes("--detalhe"),
    json: argv.includes("--json"),
    bidId: bidIdx >= 0 && argv[bidIdx + 1] ? Number.parseInt(argv[bidIdx + 1], 10) : null,
    status: statusIdx >= 0 && argv[statusIdx + 1] ? String(argv[statusIdx + 1]).toUpperCase() : null,
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Lista usuários que apostaram nos BIDs

Opções:
  --detalhe          Exibe detalhe por usuário e BID
  --bid <ID>         Filtra por BID (partida) específico
  --status <STATUS>  Filtra por status do BID: ABERTA, ENCERRADA ou FINALIZADA
  --json             Saída em JSON
  --help, -h         Exibe esta ajuda
`);
}

function formatData(val) {
  if (!val) return "—";
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? String(val) : d.toLocaleString("pt-BR");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const validStatuses = ["ABERTA", "ENCERRADA", "FINALIZADA"];
  if (opts.status && !validStatuses.includes(opts.status)) {
    console.error(`Status inválido: ${opts.status}. Use: ${validStatuses.join(", ")}`);
    process.exit(2);
  }
  if (opts.bidId != null && !Number.isFinite(opts.bidId)) {
    console.error("ID de BID inválido. Use: --bid <número>");
    process.exit(2);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const where = [];
    const params = [];
    if (opts.bidId != null) {
      where.push("p.id = ?");
      params.push(opts.bidId);
    }
    if (opts.status) {
      where.push("p.status = ?");
      params.push(opts.status);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [usuarios] = await connection.query(
      `SELECT
         u.id,
         u.nome_completo,
         u.email,
         u.username,
         g.nome AS grupo_nome,
         COUNT(a.id) AS total_apostas,
         COUNT(DISTINCT a.partida_id) AS bids_apostados,
         SUM(a.valor_pago) AS total_pontos,
         MIN(a.data_aposta) AS primeira_aposta,
         MAX(a.data_aposta) AS ultima_aposta
       FROM apostas a
       JOIN usuarios u ON u.id = a.usuario_id
       JOIN partidas p ON p.id = a.partida_id
       LEFT JOIN grupos g ON g.id = u.grupo_id
       ${whereSql}
       GROUP BY u.id, u.nome_completo, u.email, u.username, g.nome
       ORDER BY total_apostas DESC, u.nome_completo ASC`,
      params
    );

    const lista = usuarios.map((r) => ({
      id: r.id,
      nome_completo: r.nome_completo || "(sem nome)",
      email: r.email || null,
      username: r.username || null,
      grupo: r.grupo_nome || null,
      total_apostas: Number(r.total_apostas) || 0,
      bids_apostados: Number(r.bids_apostados) || 0,
      total_pontos: Number(r.total_pontos) || 0,
      primeira_aposta: r.primeira_aposta,
      ultima_aposta: r.ultima_aposta,
    }));

    let detalhes = [];
    if (opts.detalhe || opts.json) {
      const [rows] = await connection.query(
        `SELECT
           u.id AS usuario_id,
           u.nome_completo,
           u.email,
           p.id AS bid_id,
           p.titulo AS bid_titulo,
           p.status AS bid_status,
           COUNT(a.id) AS apostas_no_bid,
           SUM(a.valor_pago) AS pontos_no_bid,
           GROUP_CONCAT(DISTINCT a.status ORDER BY a.status SEPARATOR ', ') AS status_apostas
         FROM apostas a
         JOIN usuarios u ON u.id = a.usuario_id
         JOIN partidas p ON p.id = a.partida_id
         ${whereSql}
         GROUP BY u.id, u.nome_completo, u.email, p.id, p.titulo, p.status
         ORDER BY u.nome_completo ASC, p.id DESC`,
        params
      );
      detalhes = rows.map((r) => ({
        usuario_id: r.usuario_id,
        nome_completo: r.nome_completo,
        email: r.email,
        bid_id: r.bid_id,
        bid_titulo: r.bid_titulo || "(sem título)",
        bid_status: r.bid_status,
        apostas_no_bid: Number(r.apostas_no_bid) || 0,
        pontos_no_bid: Number(r.pontos_no_bid) || 0,
        status_apostas: r.status_apostas,
      }));
    }

    const resumo = {
      total_usuarios: lista.length,
      filtro_bid: opts.bidId,
      filtro_status: opts.status,
      usuarios: lista,
      detalhes_por_bid: detalhes.length > 0 ? detalhes : undefined,
    };

    if (opts.json) {
      console.log(JSON.stringify(resumo, null, 2));
      process.exit(0);
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log("  Usuários que apostaram");
    if (opts.bidId != null) console.log(`  Filtro BID: #${opts.bidId}`);
    if (opts.status) console.log(`  Filtro status: ${opts.status}`);
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Total de usuários: ${lista.length}`);
    console.log("───────────────────────────────────────────────────────────");

    if (lista.length === 0) {
      console.log("  Nenhum usuário com apostas encontrado.");
    } else {
      for (const u of lista) {
        console.log(
          `  #${u.id} | ${u.nome_completo} | ${u.email || "—"}`
        );
        console.log(
          `         ${u.total_apostas} aposta(s) em ${u.bids_apostados} BID(s) | ${u.total_pontos} pts` +
            (u.grupo ? ` | Grupo: ${u.grupo}` : "") +
            ` | Última: ${formatData(u.ultima_aposta)}`
        );
      }
    }

    if (opts.detalhe && detalhes.length > 0) {
      console.log("───────────────────────────────────────────────────────────");
      console.log("  Detalhe por usuário e BID:");
      let lastUserId = null;
      for (const d of detalhes) {
        if (d.usuario_id !== lastUserId) {
          console.log("");
          console.log(`  ${d.nome_completo} (${d.email || "—"})`);
          lastUserId = d.usuario_id;
        }
        console.log(
          `    BID #${d.bid_id} | ${d.bid_titulo} | ${d.bid_status} | ` +
            `${d.apostas_no_bid} aposta(s) | ${d.pontos_no_bid} pts | status: ${d.status_apostas}`
        );
      }
    }

    console.log("═══════════════════════════════════════════════════════════");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao listar usuários que apostaram:", err.message);
    process.exit(2);
  } finally {
    if (connection) await connection.end();
  }
}

main();

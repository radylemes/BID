#!/usr/bin/env node
/**
 * Valida se existem apostas nos BIDs (partidas).
 *
 * Uso:
 *   node scripts/validateApostasBids.js
 *   node scripts/validateApostasBids.js --only-empty
 *   node scripts/validateApostasBids.js --status ABERTA
 *   node scripts/validateApostasBids.js --json
 *   npm run validate-apostas-bids
 *
 * Códigos de saída:
 *   0 — todos os BIDs possuem ao menos 1 aposta (ou nenhum BID cadastrado)
 *   1 — existe ao menos 1 BID sem apostas
 *   2 — erro de conexão/consulta
 */

const path = require("path");
const mysql = require("mysql2/promise");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function parseArgs(argv) {
  const statusIdx = argv.indexOf("--status");
  return {
    onlyEmpty: argv.includes("--only-empty"),
    json: argv.includes("--json"),
    status: statusIdx >= 0 && argv[statusIdx + 1] ? String(argv[statusIdx + 1]).toUpperCase() : null,
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Validação de apostas nos BIDs (partidas)

Opções:
  --only-empty       Lista apenas BIDs sem apostas
  --status <STATUS>  Filtra por status: ABERTA, ENCERRADA ou FINALIZADA
  --json             Saída em JSON
  --help, -h         Exibe esta ajuda
`);
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
    if (opts.status) {
      where.push("p.status = ?");
      params.push(opts.status);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await connection.query(
      `SELECT
         p.id,
         p.titulo,
         p.status,
         p.data_jogo,
         p.grupo_id,
         g.nome AS grupo_nome,
         COUNT(a.id) AS total_apostas,
         COUNT(DISTINCT a.usuario_id) AS total_apostadores
       FROM partidas p
       LEFT JOIN apostas a ON a.partida_id = p.id
       LEFT JOIN grupos g ON g.id = p.grupo_id
       ${whereSql}
       GROUP BY p.id, p.titulo, p.status, p.data_jogo, p.grupo_id, g.nome
       ORDER BY p.id DESC`,
      params
    );

    const bids = rows.map((r) => ({
      id: r.id,
      titulo: r.titulo || "(sem título)",
      status: r.status,
      data_jogo: r.data_jogo,
      grupo_id: r.grupo_id,
      grupo_nome: r.grupo_nome || null,
      total_apostas: Number(r.total_apostas) || 0,
      total_apostadores: Number(r.total_apostadores) || 0,
      tem_apostas: Number(r.total_apostas) > 0,
    }));

    const comApostas = bids.filter((b) => b.tem_apostas);
    const semApostas = bids.filter((b) => !b.tem_apostas);
    const exibir = opts.onlyEmpty ? semApostas : bids;

    const resumo = {
      total_bids: bids.length,
      com_apostas: comApostas.length,
      sem_apostas: semApostas.length,
      filtro_status: opts.status,
      bids: exibir,
      bids_sem_apostas: semApostas.map((b) => b.id),
    };

    if (opts.json) {
      console.log(JSON.stringify(resumo, null, 2));
    } else {
      console.log("═══════════════════════════════════════════════════════════");
      console.log("  Validação: apostas nos BIDs");
      if (opts.status) console.log(`  Filtro status: ${opts.status}`);
      console.log("═══════════════════════════════════════════════════════════");
      console.log(`  Total de BIDs       : ${resumo.total_bids}`);
      console.log(`  Com apostas         : ${resumo.com_apostas}`);
      console.log(`  Sem apostas         : ${resumo.sem_apostas}`);
      console.log("───────────────────────────────────────────────────────────");

      if (exibir.length === 0) {
        console.log(opts.onlyEmpty ? "  Nenhum BID sem apostas encontrado." : "  Nenhum BID cadastrado.");
      } else {
        for (const b of exibir) {
          const flag = b.tem_apostas ? "OK " : "VAZIO";
          const dataJogo = b.data_jogo
            ? new Date(b.data_jogo).toLocaleString("pt-BR")
            : "—";
          console.log(
            `  [${flag}] BID #${b.id} | ${b.status.padEnd(10)} | ${b.total_apostas} aposta(s), ${b.total_apostadores} apostador(es) | ${dataJogo}`
          );
          console.log(`         ${b.titulo}${b.grupo_nome ? ` | Grupo: ${b.grupo_nome}` : ""}`);
        }
      }

      if (!opts.onlyEmpty && semApostas.length > 0) {
        console.log("───────────────────────────────────────────────────────────");
        console.log(`  BIDs sem apostas (IDs): ${semApostas.map((b) => b.id).join(", ")}`);
      }
      console.log("═══════════════════════════════════════════════════════════");
    }

    process.exit(semApostas.length > 0 ? 1 : 0);
  } catch (err) {
    console.error("Erro ao validar apostas nos BIDs:", err.message);
    process.exit(2);
  } finally {
    if (connection) await connection.end();
  }
}

main();

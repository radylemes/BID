#!/usr/bin/env node
/**
 * Remove apostas e devolve os pontos aos usuários (estorno de lances PENDENTE).
 *
 * Por padrão só remove apostas com status PENDENTE em BIDs ABERTAS.
 *
 * Uso:
 *   node scripts/removeApostasDevolverPontos.js --dry-run
 *   node scripts/removeApostasDevolverPontos.js --bids 8,12,14,15,17 --dry-run
 *   node scripts/removeApostasDevolverPontos.js --usuarios 332,223,279 --dry-run
 *   node scripts/removeApostasDevolverPontos.js --bids 8,12,14,15,17 --confirm
 *   npm run remove-apostas-devolver-pontos -- --dry-run
 *
 * Códigos de saída:
 *   0 — sucesso (ou dry-run sem apostas)
 *   1 — nenhuma aposta encontrada para os filtros
 *   2 — erro de conexão/execução
 */

const path = require("path");
const mysql = require("mysql2/promise");
const { truncateMotivo, safeAuditoriaDetalhes } = require("../utils/dbHelpers");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function parseArgs(argv) {
  const bidsIdx = argv.indexOf("--bids");
  const bidIdx = argv.indexOf("--bid");
  const usuariosIdx = argv.indexOf("--usuarios");
  const usuarioIdx = argv.indexOf("--usuario");
  const statusIdx = argv.indexOf("--status");

  const parseIds = (raw) =>
    String(raw || "")
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));

  let bidIds = [];
  if (bidsIdx >= 0 && argv[bidsIdx + 1]) bidIds = parseIds(argv[bidsIdx + 1]);
  else if (bidIdx >= 0 && argv[bidIdx + 1]) bidIds = parseIds(argv[bidIdx + 1]);

  let usuarioIds = [];
  if (usuariosIdx >= 0 && argv[usuariosIdx + 1]) usuarioIds = parseIds(argv[usuariosIdx + 1]);
  else if (usuarioIdx >= 0 && argv[usuarioIdx + 1]) usuarioIds = parseIds(argv[usuarioIdx + 1]);

  return {
    dryRun: argv.includes("--dry-run") || (!argv.includes("--confirm") && !process.env.CONFIRM_REMOVE_APOSTAS),
    confirm: argv.includes("--confirm") || process.env.CONFIRM_REMOVE_APOSTAS === "1",
    bidIds,
    usuarioIds,
    status:
      statusIdx >= 0 && argv[statusIdx + 1]
        ? String(argv[statusIdx + 1]).toUpperCase()
        : "PENDENTE",
    partidaStatus: argv.includes("--qualquer-partida") ? null : "ABERTA",
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Remove apostas e devolve pontos (estorno)

Opções:
  --dry-run              Simula sem alterar o banco (padrão se não usar --confirm)
  --confirm              Executa a remoção e o reembolso
  --bid <ID>             Filtra por BID (partida)
  --bids <ID,ID,...>     Filtra por vários BIDs
  --usuario <ID>         Filtra por usuário
  --usuarios <ID,ID,...> Filtra por vários usuários
  --status <STATUS>      Status da aposta (padrão: PENDENTE)
  --qualquer-partida     Permite apostas em BIDs não-ABERTAS (cuidado)
  --json                 Saída em JSON
  --help, -h             Ajuda

Variável de ambiente:
  CONFIRM_REMOVE_APOSTAS=1  Equivalente a --confirm
`);
}

async function gravarAuditoria(connection, adminId, detalhes) {
  await connection.execute(
    `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
    [adminId || 1, "BIDS", "ESTORNO_APOSTAS", null, safeAuditoriaDetalhes(detalhes)]
  );
}

async function buscarApostas(connection, opts) {
  const where = ["a.status = ?"];
  const params = [opts.status];

  if (opts.partidaStatus) {
    where.push("p.status = ?");
    params.push(opts.partidaStatus);
  }
  if (opts.bidIds.length > 0) {
    where.push(`a.partida_id IN (${opts.bidIds.map(() => "?").join(", ")})`);
    params.push(...opts.bidIds);
  }
  if (opts.usuarioIds.length > 0) {
    where.push(`a.usuario_id IN (${opts.usuarioIds.map(() => "?").join(", ")})`);
    params.push(...opts.usuarioIds);
  }

  const [rows] = await connection.query(
    `SELECT
       a.id AS aposta_id,
       a.partida_id,
       a.usuario_id,
       a.valor_pago,
       a.status AS aposta_status,
       a.data_aposta,
       p.titulo AS bid_titulo,
       p.status AS bid_status,
       u.nome_completo,
       u.email,
       u.pontos AS saldo_atual,
       (SELECT COUNT(*) FROM ingressos i WHERE i.aposta_id = a.id) AS ingressos_vinculados
     FROM apostas a
     JOIN partidas p ON p.id = a.partida_id
     JOIN usuarios u ON u.id = a.usuario_id
     WHERE ${where.join(" AND ")}
     ORDER BY a.partida_id, u.nome_completo, a.id`,
    params
  );

  return rows.map((r) => ({
    aposta_id: r.aposta_id,
    partida_id: r.partida_id,
    usuario_id: r.usuario_id,
    valor_pago: Number(r.valor_pago) || 0,
    aposta_status: r.aposta_status,
    data_aposta: r.data_aposta,
    bid_titulo: r.bid_titulo || "(sem título)",
    bid_status: r.bid_status,
    nome_completo: r.nome_completo,
    email: r.email,
    saldo_atual: Number(r.saldo_atual) || 0,
    ingressos_vinculados: Number(r.ingressos_vinculados) || 0,
  }));
}

function agruparReembolsos(apostas) {
  const porUsuario = new Map();
  for (const a of apostas) {
    const cur = porUsuario.get(a.usuario_id) || {
      usuario_id: a.usuario_id,
      nome_completo: a.nome_completo,
      email: a.email,
      saldo_atual: a.saldo_atual,
      total_reembolso: 0,
      apostas: [],
    };
    cur.total_reembolso += a.valor_pago;
    cur.apostas.push(a);
    porUsuario.set(a.usuario_id, cur);
  }
  return [...porUsuario.values()];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const validApostaStatus = ["PENDENTE", "GANHOU", "PERDEU"];
  if (!validApostaStatus.includes(opts.status)) {
    console.error(`Status de aposta inválido: ${opts.status}`);
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

    const apostas = await buscarApostas(connection, opts);
    if (apostas.length === 0) {
      console.log("Nenhuma aposta encontrada para os filtros informados.");
      process.exit(1);
    }

    const comIngressos = apostas.filter((a) => a.ingressos_vinculados > 0);
    if (comIngressos.length > 0) {
      console.error(
        "Abortado: existem apostas com ingressos vinculados. Remova os ingressos antes ou use outro fluxo."
      );
      for (const a of comIngressos) {
        console.error(
          `  Aposta #${a.aposta_id} | BID #${a.partida_id} | ${a.nome_completo} | ingressos: ${a.ingressos_vinculados}`
        );
      }
      process.exit(2);
    }

    const reembolsos = agruparReembolsos(apostas);
    const totalPontos = apostas.reduce((acc, a) => acc + a.valor_pago, 0);
    const adminId = Number(process.env.SCRIPT_ADMIN_ID) || 1;

    const resumo = {
      modo: opts.dryRun ? "dry-run" : "confirm",
      filtros: {
        bidIds: opts.bidIds,
        usuarioIds: opts.usuarioIds,
        aposta_status: opts.status,
        partida_status: opts.partidaStatus,
      },
      total_apostas: apostas.length,
      total_usuarios: reembolsos.length,
      total_pontos_devolver: totalPontos,
      apostas,
      reembolsos: reembolsos.map((r) => ({
        usuario_id: r.usuario_id,
        nome_completo: r.nome_completo,
        email: r.email,
        saldo_atual: r.saldo_atual,
        saldo_depois: r.saldo_atual + r.total_reembolso,
        total_reembolso: r.total_reembolso,
        quantidade_apostas: r.apostas.length,
      })),
    };

    if (opts.json) {
      console.log(JSON.stringify(resumo, null, 2));
      process.exit(opts.dryRun ? 0 : undefined);
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Estorno de apostas — ${opts.dryRun ? "SIMULAÇÃO (dry-run)" : "EXECUÇÃO"}`);
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`  Apostas a remover     : ${apostas.length}`);
    console.log(`  Usuários afetados     : ${reembolsos.length}`);
    console.log(`  Pontos a devolver     : ${totalPontos}`);
    if (opts.bidIds.length) console.log(`  Filtro BIDs           : ${opts.bidIds.join(", ")}`);
    if (opts.usuarioIds.length) console.log(`  Filtro usuários       : ${opts.usuarioIds.join(", ")}`);
    console.log(`  Status aposta         : ${opts.status}`);
    console.log(`  Status partida        : ${opts.partidaStatus || "qualquer"}`);
    console.log("───────────────────────────────────────────────────────────");

    for (const r of reembolsos) {
      console.log(
        `  #${r.usuario_id} ${r.nome_completo} (${r.email || "—"})`
      );
      console.log(
        `    ${r.apostas.length} aposta(s) | +${r.total_reembolso} pts | saldo ${r.saldo_atual} → ${r.saldo_atual + r.total_reembolso}`
      );
      for (const a of r.apostas) {
        console.log(
          `      - Aposta #${a.aposta_id} | BID #${a.partida_id} ${a.bid_titulo} | ${a.valor_pago} pts`
        );
      }
    }

    if (opts.dryRun) {
      console.log("───────────────────────────────────────────────────────────");
      console.log("  Nenhuma alteração feita. Use --confirm para executar.");
      console.log("═══════════════════════════════════════════════════════════");
      process.exit(0);
    }

    await connection.beginTransaction();
    try {
      for (const r of reembolsos) {
        const [uRows] = await connection.execute(
          "SELECT pontos FROM usuarios WHERE id = ? FOR UPDATE",
          [r.usuario_id]
        );
        const saldoAtual = Number(uRows[0]?.pontos || 0);
        const novoSaldo = saldoAtual + r.total_reembolso;

        await connection.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
          novoSaldo,
          r.usuario_id,
        ]);

        const bidsAfetados = [...new Set(r.apostas.map((a) => a.bid_titulo))].join(", ");
        await connection.execute(
          "INSERT INTO historico_pontos (usuario_id, admin_id, pontos_antes, pontos_depois, motivo) VALUES (?, ?, ?, ?, ?)",
          [
            r.usuario_id,
            adminId,
            saldoAtual,
            novoSaldo,
            truncateMotivo(`ESTORNO APOSTA BID: ${bidsAfetados} (${r.apostas.length} lance(s), +${r.total_reembolso} pts)`),
          ]
        );
      }

      const apostaIds = apostas.map((a) => a.aposta_id);
      await connection.execute(
        `DELETE FROM apostas WHERE id IN (${apostaIds.map(() => "?").join(", ")})`,
        apostaIds
      );

      await gravarAuditoria(connection, adminId, {
        motivo: "Estorno manual de apostas via script",
        filtros: resumo.filtros,
        total_apostas: apostas.length,
        total_pontos_devolvidos: totalPontos,
        usuarios: resumo.reembolsos,
        aposta_ids: apostaIds,
      });

      await connection.commit();

      console.log("───────────────────────────────────────────────────────────");
      console.log("  Estorno concluído com sucesso.");
      console.log("═══════════════════════════════════════════════════════════");
      process.exit(0);
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Erro ao estornar apostas:", err.message);
    process.exit(2);
  } finally {
    if (connection) await connection.end();
  }
}

main();

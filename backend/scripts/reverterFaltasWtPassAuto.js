#!/usr/bin/env node
/**
 * Reverte marcações incorretas de FALTOU no WT Pass (ex.: cron automático após data_evento).
 *
 * Por padrão usa os CPFs informados na solicitação de produção (jun/2026).
 * Só altera inscrições com status FALTOU, sem check-in na portaria.
 *
 * Uso:
 *   node scripts/reverterFaltasWtPassAuto.js --dry-run
 *   node scripts/reverterFaltasWtPassAuto.js --cpfs 33498621874,43437256858 --dry-run
 *   node scripts/reverterFaltasWtPassAuto.js --evento-id 22 --dry-run
 *   node scripts/reverterFaltasWtPassAuto.js --somente-auto --dry-run
 *   node scripts/reverterFaltasWtPassAuto.js --confirm
 *   node scripts/reverterFaltasWtPassAuto.js --confirm --reverter-bloqueios
 *
 * Códigos de saída:
 *   0 — sucesso (ou dry-run)
 *   1 — nenhuma inscrição encontrada
 *   2 — erro de execução
 */

const path = require("path");
const mysql = require("mysql2/promise");
const { normalizarCpfDigits } = require("../utils/cpf");
const { safeAuditoriaDetalhes, truncateMotivo } = require("../utils/dbHelpers");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

/** CPFs da lista em produção (Fernanda, Jessica, Kelly, Daniel, Lucas). */
const CPFS_PRODUCAO_JUN2026 = [
  "33498621874",
  "43437256858",
  "36115478839",
  "39059466888",
  "40753940850",
];

function parseArgs(argv) {
  const cpfsIdx = argv.indexOf("--cpfs");
  const eventoIdx = argv.indexOf("--evento-id");
  const inscIdx = argv.indexOf("--inscricao-ids");

  const parseIds = (raw) =>
    String(raw || "")
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

  const parseCpfs = (raw) =>
    String(raw || "")
      .split(",")
      .map((s) => normalizarCpfDigits(s))
      .filter((c) => c.length === 11);

  let cpfs = [...CPFS_PRODUCAO_JUN2026];
  if (cpfsIdx >= 0 && argv[cpfsIdx + 1]) {
    cpfs = parseCpfs(argv[cpfsIdx + 1]);
  }
  if (argv.includes("--todos-cpfs-faltou")) {
    cpfs = [];
  }

  return {
    dryRun:
      argv.includes("--dry-run") ||
      (!argv.includes("--confirm") && process.env.CONFIRM_REVERTER_FALTAS_WT !== "1"),
    confirm: argv.includes("--confirm") || process.env.CONFIRM_REVERTER_FALTAS_WT === "1",
    cpfs,
    eventoId:
      eventoIdx >= 0 && argv[eventoIdx + 1]
        ? Number.parseInt(String(argv[eventoIdx + 1]).trim(), 10)
        : null,
    inscricaoIds:
      inscIdx >= 0 && argv[inscIdx + 1] ? parseIds(argv[inscIdx + 1]) : [],
    somenteAuto: argv.includes("--somente-auto"),
    reverterBloqueios: argv.includes("--reverter-bloqueios"),
    json: argv.includes("--json"),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp() {
  console.log(`
Reverte FALTOU → INSCRITO no WT Pass (marcações automáticas incorretas)

Opções:
  --dry-run                 Simula sem alterar o banco (padrão)
  --confirm                 Executa a reversão
  --cpfs <CPF,CPF,...>      Filtra por CPF (só dígitos ou formatado)
  --todos-cpfs-faltou       Ignora lista de CPFs; busca todos com status FALTOU
  --evento-id <ID>          Filtra por evento WT Pass (eventos_rh.id)
  --inscricao-ids <ID,...>  Filtra por IDs de inscrição
  --somente-auto            Só inscrições com auditoria WT_PASS_NAO_RETIRADA_AUTO
  --reverter-bloqueios      Desativa bloqueios WT Pass dos usuários/eventos afetados
  --json                    Saída em JSON
  --help, -h                Ajuda

Variável de ambiente:
  CONFIRM_REVERTER_FALTAS_WT=1   Equivalente a --confirm

CPFs padrão (se não informar --cpfs nem --todos-cpfs-faltou):
  ${CPFS_PRODUCAO_JUN2026.join(", ")}
`);
}

async function buscarInscricoes(connection, opts) {
  const where = ["i.status = 'FALTOU'", "IFNULL(i.portaria_checkin, 0) = 0"];
  const params = [];

  if (opts.inscricaoIds.length > 0) {
    where.push(`i.id IN (${opts.inscricaoIds.map(() => "?").join(", ")})`);
    params.push(...opts.inscricaoIds);
  }

  if (opts.eventoId != null && Number.isFinite(opts.eventoId) && opts.eventoId > 0) {
    where.push("i.evento_id = ?");
    params.push(opts.eventoId);
  }

  if (opts.cpfs.length > 0) {
    where.push(
      `REPLACE(REPLACE(REPLACE(COALESCE(u.cpf, ''), '.', ''), '-', ''), ' ', '') IN (${opts.cpfs.map(() => "?").join(", ")})`,
    );
    params.push(...opts.cpfs);
  }

  let havingAuto = "";
  if (opts.somenteAuto) {
    havingAuto = `
      AND EXISTS (
        SELECT 1 FROM auditoria a
         WHERE a.modulo = 'EVENTOS_RH'
           AND a.acao = 'WT_PASS_NAO_RETIRADA_AUTO'
           AND a.registro_id = i.evento_id
           AND JSON_UNQUOTE(JSON_EXTRACT(a.detalhes, '$.inscricao_id')) = CAST(i.id AS CHAR)
      )`;
  }

  const [rows] = await connection.query(
    `SELECT
       i.id AS inscricao_id,
       i.evento_id,
       i.usuario_id,
       i.status,
       i.bloqueio_consumido_id,
       i.portaria_checkin,
       u.nome_completo,
       u.cpf,
       ev.titulo AS evento_titulo,
       ev.status AS evento_status,
       ev.data_evento
     FROM inscricoes_rh i
     INNER JOIN usuarios u ON u.id = i.usuario_id
     INNER JOIN eventos_rh ev ON ev.id = i.evento_id
     WHERE ${where.join(" AND ")}${havingAuto}
     ORDER BY ev.data_evento DESC, u.nome_completo ASC, i.id ASC`,
    params,
  );

  return rows;
}

async function reverterBloqueiosUsuarios(connection, inscricoes) {
  const pares = new Map();
  for (const row of inscricoes) {
    const uid = Number(row.usuario_id);
    const eid = Number(row.evento_id);
    if (!Number.isFinite(uid) || !Number.isFinite(eid)) continue;
    pares.set(`${uid}:${eid}`, { usuario_id: uid, evento_id: eid });
  }

  let bloqueiosDesativados = 0;
  let alvosRemovidos = 0;

  for (const { usuario_id, evento_id } of pares.values()) {
    const [bloqs] = await connection.execute(
      `SELECT id FROM bloqueios_eventos_rh
        WHERE usuario_id = ? AND evento_origem_id = ? AND ativo = 1`,
      [usuario_id, evento_id],
    );
    for (const b of bloqs) {
      const [delAlvos] = await connection.execute(
        `DELETE FROM bloqueios_eventos_rh_alvos WHERE bloqueio_id = ? AND usuario_id = ?`,
        [b.id, usuario_id],
      );
      alvosRemovidos += delAlvos.affectedRows || 0;
      await connection.execute(
        `UPDATE bloqueios_eventos_rh SET ativo = 0, eventos_restantes = 0 WHERE id = ?`,
        [b.id],
      );
      bloqueiosDesativados += 1;
    }

    await connection.execute(
      `UPDATE inscricoes_rh SET bloqueio_consumido_id = NULL
        WHERE usuario_id = ? AND evento_id = ? AND bloqueio_consumido_id IS NOT NULL`,
      [usuario_id, evento_id],
    );
  }

  return { bloqueiosDesativados, alvosRemovidos };
}

async function gravarAuditoria(connection, detalhes) {
  await connection.execute(
    `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
    [
      1,
      "EVENTOS_RH",
      "WT_PASS_REVERTER_FALTA_AUTO",
      null,
      safeAuditoriaDetalhes(detalhes),
    ],
  );
}

function imprimirLinhas(rows) {
  for (const r of rows) {
    console.log(
      `  #${r.inscricao_id} | ${r.nome_completo} | CPF ${r.cpf || "—"} | evento #${r.evento_id} "${r.evento_titulo || "—"}" (${r.evento_status}) | ${r.status} → INSCRITO`,
    );
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      timezone: "Z",
    });

    const rows = await buscarInscricoes(connection, opts);

    const resumo = {
      filtros: {
        cpfs: opts.cpfs,
        evento_id: opts.eventoId,
        inscricao_ids: opts.inscricaoIds,
        somente_auto: opts.somenteAuto,
      },
      total: rows.length,
      inscricoes: rows.map((r) => ({
        inscricao_id: r.inscricao_id,
        usuario_id: r.usuario_id,
        evento_id: r.evento_id,
        nome: r.nome_completo,
        cpf: r.cpf,
        evento_titulo: r.evento_titulo,
      })),
    };

    if (opts.json) {
      console.log(JSON.stringify({ ...resumo, dry_run: opts.dryRun }, null, 2));
      if (rows.length === 0) process.exit(1);
      if (opts.dryRun) process.exit(0);
    } else {
      console.log("═══════════════════════════════════════════════════════════");
      console.log("  Reverter FALTOU → INSCRITO (WT Pass)");
      console.log("═══════════════════════════════════════════════════════════");
      if (opts.cpfs.length > 0) console.log(`  CPFs: ${opts.cpfs.join(", ")}`);
      else console.log("  CPFs: (todos com FALTOU)");
      if (opts.eventoId) console.log(`  Evento: #${opts.eventoId}`);
      if (opts.somenteAuto) console.log("  Filtro: somente WT_PASS_NAO_RETIRADA_AUTO");
      console.log(`  Inscrições encontradas: ${rows.length}`);
      console.log("───────────────────────────────────────────────────────────");
      if (rows.length === 0) {
        console.log("  Nenhuma inscrição FALTOU corresponde aos filtros.");
        console.log("═══════════════════════════════════════════════════════════");
        process.exit(1);
      }
      imprimirLinhas(rows);
    }

    if (opts.dryRun) {
      if (!opts.json) {
        console.log("───────────────────────────────────────────────────────────");
        console.log("  Nenhuma alteração feita. Use --confirm para executar.");
        console.log("═══════════════════════════════════════════════════════════");
      }
      process.exit(0);
    }

    await connection.beginTransaction();
    try {
      const ids = rows.map((r) => r.inscricao_id);
      const [upd] = await connection.execute(
        `UPDATE inscricoes_rh
            SET status = 'INSCRITO', bloqueio_consumido_id = NULL
          WHERE id IN (${ids.map(() => "?").join(", ")})
            AND status = 'FALTOU'
            AND IFNULL(portaria_checkin, 0) = 0`,
        ids,
      );

      let bloqueioRes = { bloqueiosDesativados: 0, alvosRemovidos: 0 };
      if (opts.reverterBloqueios) {
        bloqueioRes = await reverterBloqueiosUsuarios(connection, rows);
      }

      await gravarAuditoria(connection, {
        motivo: truncateMotivo(
          `Reversão manual de ${upd.affectedRows} falta(s) WT Pass (script reverterFaltasWtPassAuto).`,
        ),
        filtros: resumo.filtros,
        inscricao_ids: ids,
        linhas_afetadas: upd.affectedRows,
        bloqueios: bloqueioRes,
      });

      await connection.commit();

      if (!opts.json) {
        console.log("───────────────────────────────────────────────────────────");
        console.log(`  Revertidas: ${upd.affectedRows} inscrição(ões).`);
        if (opts.reverterBloqueios) {
          console.log(
            `  Bloqueios desativados: ${bloqueioRes.bloqueiosDesativados} | alvos removidos: ${bloqueioRes.alvosRemovidos}`,
          );
        }
        console.log("  Concluído com sucesso.");
        console.log("═══════════════════════════════════════════════════════════");
      }

      process.exit(0);
    } catch (err) {
      await connection.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Erro ao reverter faltas WT Pass:", err.message);
    process.exit(2);
  } finally {
    if (connection) await connection.end();
  }
}

main();

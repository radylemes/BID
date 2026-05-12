const cron = require("node-cron");
const db = require("../config/db");
const logErro = require("../utils/errorLogger");
const { safeAuditoriaDetalhes } = require("../utils/dbHelpers");
const { executarMarcacaoNaoRetiradaWtPassAposEvento } = require("../controllers/eventoRhController");

/**
 * Cadência do auto-encerramento. Por padrão a cada minuto — suficiente para que
 * o estado «Fechado» fique visível pouco depois do limite expirar. Pode ser
 * ajustado via variável de ambiente `EVENTO_RH_AUTO_ENCERRAR_CRON`.
 */
function buildAutoEncerrarCron() {
  const raw = String(process.env.EVENTO_RH_AUTO_ENCERRAR_CRON || "").trim();
  if (raw) return raw;
  return "* * * * *";
}

/**
 * Promove a `ENCERRADO` os eventos do WT Pass com `auto_encerrar = 1`,
 * estado `ABERTO` e `data_limite_inscricao` já no passado (UTC). Cada
 * transição é registada em auditoria com a etiqueta `AUTO_ENCERRAMENTO`,
 * preservando o histórico das execuções automáticas vs. manuais.
 */
async function executarAutoEncerramento() {
  const connection = await db.getConnection();
  try {
    const [vencidos] = await connection.query(
      `SELECT id, titulo, status, data_limite_inscricao
         FROM eventos_rh
        WHERE status = 'ABERTO'
          AND auto_encerrar = 1
          AND data_limite_inscricao IS NOT NULL
          AND data_limite_inscricao < UTC_TIMESTAMP()`,
    );
    if (vencidos.length === 0) return;

    for (const ev of vencidos) {
      try {
        await connection.beginTransaction();
        const [r] = await connection.execute(
          `UPDATE eventos_rh
              SET status = 'ENCERRADO'
            WHERE id = ?
              AND status = 'ABERTO'
              AND auto_encerrar = 1
              AND data_limite_inscricao IS NOT NULL
              AND data_limite_inscricao < UTC_TIMESTAMP()`,
          [ev.id],
        );
        if (r.affectedRows > 0) {
          await connection.execute(
            `INSERT INTO auditoria (admin_id, modulo, acao, registro_id, detalhes) VALUES (?, ?, ?, ?, ?)`,
            [
              1,
              "EVENTOS_RH",
              "UPDATE",
              ev.id,
              safeAuditoriaDetalhes({
                titulo: ev.titulo,
                tipo_alteracao: "AUTO_ENCERRAMENTO",
                estado_anterior: "ABERTO",
                estado_novo: "ENCERRADO",
                motivo_auditoria:
                  "Auto-encerramento por fim do período de inscrição.",
              }),
            ],
          );
          console.log(
            `🏁 WT Pass auto-encerrado: evento #${ev.id} (${ev.titulo || "sem título"}).`,
          );
        }
        await connection.commit();
      } catch (err) {
        try {
          await connection.rollback();
        } catch (_) {}
        await logErro("EVENTO_RH_AUTO_ENCERRAR_ITEM", err);
      }
    }
  } finally {
    connection.release();
  }
}

function initEventoRhAutoClose() {
  const cronExpr = buildAutoEncerrarCron();
  console.log(
    `🏁 Auto-encerramento WT Pass + marcação «não retirada» agendados: "${cronExpr}" (UTC).`,
  );

  cron.schedule(cronExpr, async () => {
    try {
      await executarAutoEncerramento();
      await executarMarcacaoNaoRetiradaWtPassAposEvento();
    } catch (error) {
      await logErro("EVENTO_RH_AUTO_ENCERRAR_CRON", error);
    }
  });
}

module.exports = {
  initEventoRhAutoClose,
  executarAutoEncerramento,
};

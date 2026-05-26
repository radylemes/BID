/**
 * Utilitários para inserções seguras no banco.
 * Evita erros por undefined, strings longas e tipos incorretos.
 */

const MOTIVO_MAX_LENGTH = 255;

/**
 * Garante valor seguro para coluna JSON (auditoria.detalhes).
 * @param {*} detalhes
 * @returns {string}
 */
function safeAuditoriaDetalhes(detalhes) {
  if (detalhes == null) return "{}";
  try {
    return typeof detalhes === "string" ? detalhes : JSON.stringify(detalhes);
  } catch {
    return "{}";
  }
}

/**
 * Trunca motivo para caber em historico_pontos.motivo (VARCHAR 255).
 * @param {string} motivo
 * @param {number} maxLen
 * @returns {string}
 */
function truncateMotivo(motivo, maxLen = MOTIVO_MAX_LENGTH) {
  if (motivo == null || motivo === "") return null;
  const s = String(motivo);
  return s.length <= maxLen ? s : s.slice(0, maxLen - 3) + "...";
}

/**
 * Converte valor para uso em INSERT (undefined/null string -> null).
 * @param {*} val
 * @returns {*|null}
 */
function safeNull(val) {
  if (val === undefined || val === "") return null;
  return val;
}

/**
 * Converte para inteiro ou null para colunas INT.
 * @param {*} val
 * @returns {number|null}
 */
function safeInt(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

/** Movimentações reais de saldo (exclui auditoria 0→0 de BIDs/admin). */
const SQL_HISTORICO_MOVIMENTO = `NOT (pontos_antes = 0 AND pontos_depois = 0)`;

/**
 * Último saldo registrado no histórico de pontos, ou null se não houver movimentos.
 * @param {*} executor
 * @param {number} userId
 * @returns {Promise<number|null>}
 */
async function obterUltimoSaldoHistorico(executor, userId) {
  const [rows] = await executor.execute(
    `SELECT pontos_depois FROM historico_pontos
     WHERE usuario_id = ? AND ${SQL_HISTORICO_MOVIMENTO}
     ORDER BY data_alteracao DESC, id DESC LIMIT 1`,
    [userId],
  );
  if (!rows.length) return null;
  const n = Number(rows[0].pontos_depois);
  return Number.isNaN(n) ? null : n;
}

/**
 * Saldo efetivo: prioriza o último `pontos_depois` do histórico (trilha de auditoria).
 * Opcionalmente reconcilia `usuarios.pontos` quando estiver dessincronizado.
 * @param {*} executor
 * @param {number} userId
 * @param {{ reconciliar?: boolean }} [opts]
 * @returns {Promise<number>}
 */
async function obterSaldoEfetivoUsuario(executor, userId, opts = {}) {
  const { reconciliar = false } = opts;
  const [uRows] = await executor.execute(
    "SELECT pontos FROM usuarios WHERE id = ?",
    [userId],
  );
  const pontosDb = Number(uRows[0]?.pontos) || 0;
  const saldoHist = await obterUltimoSaldoHistorico(executor, userId);
  if (saldoHist === null) return pontosDb;
  if (saldoHist !== pontosDb && reconciliar) {
    await executor.execute("UPDATE usuarios SET pontos = ? WHERE id = ?", [
      saldoHist,
      userId,
    ]);
  }
  return saldoHist;
}

module.exports = {
  safeAuditoriaDetalhes,
  truncateMotivo,
  safeNull,
  safeInt,
  MOTIVO_MAX_LENGTH,
  SQL_HISTORICO_MOVIMENTO,
  obterUltimoSaldoHistorico,
  obterSaldoEfetivoUsuario,
};

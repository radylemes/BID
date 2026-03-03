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

module.exports = {
  safeAuditoriaDetalhes,
  truncateMotivo,
  safeNull,
  safeInt,
  MOTIVO_MAX_LENGTH,
};

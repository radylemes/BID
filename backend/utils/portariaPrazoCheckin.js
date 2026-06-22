const TZ_BR = "America/Sao_Paulo";
const OFFSET_BR = "-03:00";

function parseDbUtc(dataVal) {
  if (dataVal == null) return null;
  if (dataVal instanceof Date) return new Date(dataVal.toISOString());
  const s = String(dataVal).trim().replace(" ", "T");
  return new Date(s.endsWith("Z") ? s : `${s}Z`);
}

/** Data civil (YYYY-MM-DD) do evento no fuso America/Sao_Paulo. */
function dataCivilBr(dataEvento) {
  const d = parseDbUtc(dataEvento);
  if (!d || Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function inicioDoDiaPortaria(dateIso) {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  return new Date(`${dateIso}T00:00:00.000${OFFSET_BR}`);
}

function fimDoDiaPortaria(dateIso) {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  return new Date(`${dateIso}T23:59:59.999${OFFSET_BR}`);
}

/** Fim do dia civil do evento (23:59:59.999) em America/Sao_Paulo. */
function fimDoDiaEventoPortaria(dataEvento) {
  const civil = dataCivilBr(dataEvento);
  return civil ? fimDoDiaPortaria(civil) : null;
}

/**
 * Check-in permitido no dia do evento entre 00:00 e 23:59:59 (fuso BR).
 * @param {Date|string|null} dataEvento - data_jogo / data_evento do banco (UTC)
 * @param {Date} [agora]
 */
function portariaCheckinPermitido(dataEvento, agora = new Date()) {
  const civil = dataCivilBr(dataEvento);
  if (!civil) return false;
  const inicio = inicioDoDiaPortaria(civil);
  const fim = fimDoDiaPortaria(civil);
  if (!inicio || !fim) return false;
  const t = agora.getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

/** Para data consultada na UI (YYYY-MM-DD). */
function portariaCheckinPermitidoParaData(dateIso, agora = new Date()) {
  const inicio = inicioDoDiaPortaria(dateIso);
  const fim = fimDoDiaPortaria(dateIso);
  if (!inicio || !fim) return false;
  const t = agora.getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

module.exports = {
  TZ_BR,
  dataCivilBr,
  inicioDoDiaPortaria,
  fimDoDiaPortaria,
  fimDoDiaEventoPortaria,
  portariaCheckinPermitido,
  portariaCheckinPermitidoParaData,
};

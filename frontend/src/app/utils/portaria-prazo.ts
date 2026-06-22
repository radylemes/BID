const OFFSET_BR = '-03:00';

function inicioDoDiaPortaria(dateIso: string): Date | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  return new Date(`${dateIso}T00:00:00.000${OFFSET_BR}`);
}

function fimDoDiaPortaria(dateIso: string): Date | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  return new Date(`${dateIso}T23:59:59.999${OFFSET_BR}`);
}

/** Liberação permitida no dia consultado entre 00:00 e 23:59:59 (fuso BR). */
export function portariaCheckinPermitidoParaData(
  dateIso: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!dateIso) return false;
  const inicio = inicioDoDiaPortaria(dateIso);
  const fim = fimDoDiaPortaria(dateIso);
  if (!inicio || !fim) return false;
  const t = agora.getTime();
  return t >= inicio.getTime() && t <= fim.getTime();
}

export function isSomenteVisualizacaoPortaria(
  dateIso: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  return !portariaCheckinPermitidoParaData(dateIso, agora);
}

/** Cancelamento supervisor: permitido no dia civil do evento até 23:59 (BR). */
export function portariaPodeCancelarNoDiaDoEvento(
  dataEventoIso: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!dataEventoIso) return false;
  const d = new Date(dataEventoIso);
  if (Number.isNaN(d.getTime())) return false;
  const civil = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return portariaCheckinPermitidoParaData(civil, agora);
}

/** Padrão de exibição de datas no WT Pass (alinhado à recepção: `dd/MM/yyyy` e `dd/MM/yyyy HH:mm`). */

function parseIso(iso: string | null | undefined): Date | null {
  if (iso == null || String(iso).trim() === '') return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data do evento: `dd/MM/yyyy` */
export function formatarDataWtPass(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Data e hora: `dd/MM/yyyy HH:mm` */
export function formatarDataHoraWtPass(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Coluna compacta (admin): `dd/MM HH:mm` */
export function formatarDataHoraCurtaWtPass(iso: string | null | undefined): string {
  const d = parseIso(iso);
  if (!d) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

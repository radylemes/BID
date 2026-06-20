/** Converte texto em MAIÚSCULAS para título: "ANA PAULA" → "Ana Paula". */
export function formatarTituloPt(val: string | null | undefined, fallback = '—'): string {
  if (val == null || String(val).trim() === '') return fallback;
  return String(val)
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (!part) return '';
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

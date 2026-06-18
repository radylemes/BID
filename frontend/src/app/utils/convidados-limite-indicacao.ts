export type DirecaoLimiteIndicacao = 'antes' | 'depois';

export const DEFAULT_LIMITE_INDICACAO_HORAS = 24;
export const DEFAULT_LIMITE_INDICACAO_DIRECAO: DirecaoLimiteIndicacao = 'antes';

export function parseDirecaoLimiteIndicacao(valor: unknown): DirecaoLimiteIndicacao {
  const s = String(valor ?? '')
    .toLowerCase()
    .trim();
  return s === 'depois' ? 'depois' : 'antes';
}

export function parseHorasLimiteIndicacao(valor: unknown): number {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n < 0) return DEFAULT_LIMITE_INDICACAO_HORAS;
  return Math.min(n, 720);
}

export function calcularLimiteIndicacao(
  dataEvento: string | Date | null | undefined,
  horas: number,
  direcao: DirecaoLimiteIndicacao,
): Date | null {
  if (dataEvento == null || dataEvento === '') return null;
  const inicioEvento = new Date(dataEvento);
  if (Number.isNaN(inicioEvento.getTime())) return null;

  const horasNorm = parseHorasLimiteIndicacao(horas);
  const offsetMs = horasNorm * 60 * 60 * 1000;
  const limite = new Date(inicioEvento.getTime());
  if (direcao === 'depois') {
    limite.setTime(limite.getTime() + offsetMs);
  } else {
    limite.setTime(limite.getTime() - offsetMs);
  }
  return limite;
}

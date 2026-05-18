/** Apenas dígitos, no máximo 11. */
export function normalizarCpfDigits(cpf: unknown): string {
  if (cpf == null || cpf === undefined) return '';
  return String(cpf)
    .replace(/\D/g, '')
    .slice(0, 11);
}

/** Formata entrada de CPF como 000.000.000-00 (máximo 11 dígitos). */
export function formatarInputCpf(raw: unknown): string {
  let v = String(raw ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

/** Motivo legível para falha de validação de CPF (importação / formulários). */
export function descreverErroCpf(cpf: unknown): string {
  const digits = normalizarCpfDigits(cpf);
  if (!digits) return 'CPF em falta';
  if (digits.length !== 11) return `CPF com ${digits.length} dígitos (esperado 11)`;
  if (/^(\d)\1{10}$/.test(digits)) return 'CPF inválido (sequência repetida)';
  return 'CPF inválido (dígitos verificadores)';
}

/** Valida dígitos verificadores do CPF brasileiro (11 dígitos). */
export function validarCpf(cpf: unknown): boolean {
  const digits = normalizarCpfDigits(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(digits[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(digits[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(digits[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(digits[10]);
}

/** Exibe CPF com os 6 dígitos centrais ocultos (ex.: 298.***.***-20). */
export function mascararCpf(cpf: string | null | undefined): string {
  const d = normalizarCpfDigits(cpf);
  if (d.length !== 11) {
    return cpf ? String(cpf) : '—';
  }
  return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
}

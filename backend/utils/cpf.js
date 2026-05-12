/** Normaliza CPF para 11 dígitos ou string vazia. */
function normalizarCpfDigits(cpf) {
  if (cpf == null || cpf === undefined) return "";
  return String(cpf).replace(/\D/g, "").slice(0, 11);
}

/** Valida dígitos verificadores do CPF brasileiro. */
function validarCpf(cpf) {
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

module.exports = { normalizarCpfDigits, validarCpf };

import { HttpErrorResponse } from '@angular/common/http';
import Swal from 'sweetalert2';

function normalizarCorpoErro(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    const texto = raw.trim();
    if (!texto) return undefined;
    try {
      const parsed = JSON.parse(texto);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { error: texto };
    }
  }
  return undefined;
}

function extrairHttpError(err: unknown): {
  status?: number;
  body?: Record<string, unknown>;
} {
  if (err instanceof HttpErrorResponse) {
    return { status: err.status, body: normalizarCorpoErro(err.error) };
  }
  if (!err || typeof err !== 'object') return {};
  const candidato = err as { status?: number; error?: unknown };
  return {
    status: Number.isFinite(Number(candidato.status))
      ? Number(candidato.status)
      : undefined,
    body: normalizarCorpoErro(candidato.error),
  };
}

export function extrairErroAssignConvidado(err: unknown): {
  titulo: string;
  texto: string;
  icon: 'error' | 'warning';
} {
  const { status, body } = extrairHttpError(err);

  const mensagemApi =
    (typeof body?.['error'] === 'string' ? body['error'] : undefined) ||
    (typeof body?.['message'] === 'string' ? body['message'] : undefined);

  const indicadoPor =
    typeof body?.['indicado_por'] === 'string'
      ? body['indicado_por'].trim()
      : '';
  const codigo = body?.['codigo'];

  const jaIndicado =
    codigo === 'CONVIDADO_JA_INDICADO' ||
    status === 409 ||
    indicadoPor.length > 0 ||
    (mensagemApi?.toLowerCase().includes('já foi indicado') ?? false) ||
    (mensagemApi?.toLowerCase().includes('ja foi indicado') ?? false);

  let texto =
    mensagemApi || 'Ocorreu um erro ao salvar alguns convidados.';

  if (jaIndicado && indicadoPor && !texto.includes(indicadoPor)) {
    texto = `Este convidado já foi indicado para este evento por ${indicadoPor}.`;
  }

  return {
    titulo: jaIndicado ? 'Convidado já indicado' : 'Erro',
    texto,
    icon: jaIndicado ? 'warning' : 'error',
  };
}

export function exibirErroAssignConvidado(err: unknown): void {
  const { titulo, texto, icon } = extrairErroAssignConvidado(err);
  Swal.fire({
    icon,
    title: titulo,
    text: texto,
    confirmButtonColor: '#4f46e5',
  });
}

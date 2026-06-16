import Swal from 'sweetalert2';
import {
  DisparoDestinatario,
  SendEmailsResponse,
  SendStreamProgress,
} from '../../services/email.service';

export interface DisparoProgressState {
  total: number;
  enviados: number;
  processados: number;
  recentItems: DisparoDestinatario[];
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildProgressHtml(state: DisparoProgressState): string {
  const total = state.total || 0;
  const processados = state.processados || 0;
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;
  const recent = state.recentItems.slice(-10).reverse();
  const rows = recent
    .map(
      (d) =>
        `<div class="flex items-start justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
          <span class="text-xs text-gray-800 truncate flex-1">${escapeHtml(d.email)}</span>
          <span class="shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
            d.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }">${d.status === 'enviado' ? 'Enviado' : 'Erro'}</span>
        </div>
        ${d.status === 'erro' && d.mensagem ? `<div class="text-xs text-red-600 pb-1 pl-1">${escapeHtml(d.mensagem)}</div>` : ''}`
    )
    .join('');

  return `
    <div class="text-left space-y-3">
      <p class="text-sm text-gray-600">
        Enviando e-mail <strong>${processados}</strong> de <strong>${total || '…'}</strong>
        ${state.enviados > 0 ? `<span class="text-emerald-600">(${state.enviados} com sucesso)</span>` : ''}
      </p>
      <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style="width: ${pct}%"></div>
      </div>
      <div class="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
        ${rows || '<p class="text-xs text-gray-400 py-2 text-center">Aguardando primeiro envio…</p>'}
      </div>
    </div>
  `;
}

function buildResultHtml(res: SendEmailsResponse): string {
  const dest = res.destinatarios || [];
  const erros = dest.filter((d) => d.status === 'erro');
  const sucesso = dest.filter((d) => d.status === 'enviado');

  if (dest.length === 0 && res.erros?.length) {
    return `
      <ul class="text-left text-sm text-red-700 max-h-60 overflow-y-auto space-y-1">
        ${res.erros.map((e) => `<li>• ${escapeHtml(e)}</li>`).join('')}
      </ul>
    `;
  }

  const rows = dest
    .map(
      (d) =>
        `<tr class="border-b border-gray-100">
          <td class="p-2 text-sm text-gray-800">${escapeHtml(d.email)}</td>
          <td class="p-2">
            <span class="px-2 py-0.5 rounded text-xs font-medium ${
              d.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }">${d.status === 'enviado' ? 'Enviado' : 'Erro'}</span>
          </td>
          <td class="p-2 text-xs text-gray-500">${d.status === 'erro' && d.mensagem ? escapeHtml(d.mensagem) : '—'}</td>
        </tr>`
    )
    .join('');

  return `
    <div class="text-left space-y-3">
      <p class="text-sm text-gray-700">
        <strong>${res.enviados}</strong> de <strong>${res.total}</strong> e-mail(s) enviado(s) com sucesso.
        ${erros.length > 0 ? `<span class="text-red-600">${erros.length} falha(s).</span>` : ''}
      </p>
      ${
        rows
          ? `<div class="overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-gray-200">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="p-2 font-semibold text-gray-600">E-mail</th>
                    <th class="p-2 font-semibold text-gray-600">Status</th>
                    <th class="p-2 font-semibold text-gray-600">Mensagem</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`
          : sucesso.length > 0
            ? `<p class="text-sm text-emerald-700">${sucesso.length} e-mail(s) enviado(s).</p>`
            : ''
      }
    </div>
  `;
}

export function openDisparoProgressModal(): void {
  Swal.fire({
    title: 'Enviando e-mails',
    html: buildProgressHtml({ total: 0, enviados: 0, processados: 0, recentItems: [] }),
    allowOutsideClick: false,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' },
  });
}

export function updateDisparoProgressModal(state: DisparoProgressState): void {
  Swal.update({ html: buildProgressHtml(state) });
}

export function appendProgressItem(
  state: DisparoProgressState,
  progress: SendStreamProgress
): DisparoProgressState {
  const item: DisparoDestinatario = {
    email: progress.email,
    status: progress.status,
    mensagem: progress.mensagem || undefined,
  };
  const recentItems = [...state.recentItems, item];
  const erros = recentItems.filter((d) => d.status === 'erro').length;
  return {
    total: progress.total,
    enviados: progress.enviados,
    processados: progress.enviados + erros,
    recentItems,
  };
}

export async function showDisparoResultModal(res: SendEmailsResponse): Promise<void> {
  const errosCount = res.destinatarios?.filter((d) => d.status === 'erro').length ?? res.erros?.length ?? 0;
  let icon: 'success' | 'warning' | 'error' = 'success';
  let title = 'Disparo concluído';

  if (res.enviados === 0 && errosCount > 0) {
    icon = 'error';
    title = 'Disparo falhou';
  } else if (errosCount > 0) {
    icon = 'warning';
    title = 'Disparo concluído com falhas';
  }

  await Swal.fire({
    icon,
    title,
    html: buildResultHtml(res),
    width: '640px',
    confirmButtonText: 'Fechar',
    customClass: { popup: 'rounded-xl' },
  });
}

export function buildPartialFromProgress(state: DisparoProgressState): SendEmailsResponse | undefined {
  if (state.recentItems.length === 0) return undefined;
  const enviados = state.recentItems.filter((d) => d.status === 'enviado').length;
  const erros = state.recentItems
    .filter((d) => d.status === 'erro')
    .map((d) => (d.mensagem ? `${d.email}: ${d.mensagem}` : d.email));
  return {
    enviados,
    total: state.total || state.recentItems.length,
    erros: erros.length > 0 ? erros : undefined,
    destinatarios: state.recentItems,
  };
}

export async function showDisparoPartialErrorModal(
  message: string,
  partial?: SendEmailsResponse
): Promise<void> {
  if (partial && (partial.enviados > 0 || partial.destinatarios?.length)) {
    await Swal.fire({
      icon: 'warning',
      title: 'Disparo interrompido',
      html: `
        <p class="text-sm text-red-700 mb-3">${escapeHtml(message)}</p>
        ${buildResultHtml(partial)}
      `,
      width: '640px',
      confirmButtonText: 'Fechar',
      customClass: { popup: 'rounded-xl' },
    });
    return;
  }
  await Swal.fire('Erro', message, 'error');
}

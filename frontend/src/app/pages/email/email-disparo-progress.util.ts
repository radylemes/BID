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

function truncateMsg(msg: string, max = 280): string {
  const s = String(msg || '').trim();
  if (s.length <= max) return escapeHtml(s);
  return `${escapeHtml(s.slice(0, max))}…`;
}

/** Tabela de destinatários com estilos inline (SweetAlert não aplica Tailwind no HTML injetado). */
export function buildDestinatariosTableHtml(destinatarios: DisparoDestinatario[]): string {
  if (!destinatarios.length) return '';

  const erros = destinatarios.filter((d) => d.status === 'erro');
  const sucessos = destinatarios.filter((d) => d.status === 'enviado');

  const renderTable = (items: DisparoDestinatario[], maxHeight?: string) => {
    const rows = items
      .map((d) => {
        const isErro = d.status === 'erro';
        const badgeBg = isErro ? '#fee2e2' : '#d1fae5';
        const badgeColor = isErro ? '#b91c1c' : '#047857';
        const badgeLabel = isErro ? 'Erro' : 'Enviado';
        const msg = isErro && d.mensagem ? truncateMsg(d.mensagem) : '—';
        const fullMsg = isErro && d.mensagem ? escapeHtml(d.mensagem) : '';
        return `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;word-break:break-all;vertical-align:top;color:#1f2937;">${escapeHtml(d.email)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;vertical-align:top;white-space:nowrap;width:88px;">
            <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${badgeBg};color:${badgeColor};">${badgeLabel}</span>
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;word-break:break-word;overflow-wrap:anywhere;vertical-align:top;font-size:11px;color:#6b7280;"${fullMsg ? ` title="${fullMsg}"` : ''}>${msg}</td>
        </tr>`;
      })
      .join('');

    const wrapStart = maxHeight
      ? `<div style="max-height:${maxHeight};overflow:auto;border:1px solid #e5e7eb;border-radius:8px;background:#fff;">`
      : `<div style="border:1px solid #e5e7eb;border-radius:8px;background:#fff;overflow:hidden;">`;
    return `${wrapStart}
      <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:12px;">
        <colgroup>
          <col style="width:36%">
          <col style="width:14%">
          <col style="width:50%">
        </colgroup>
        <thead>
          <tr>
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:600;color:#4b5563;position:sticky;top:0;">E-mail</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:600;color:#4b5563;position:sticky;top:0;">Status</th>
            <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb;background:#f9fafb;font-weight:600;color:#4b5563;position:sticky;top:0;">Mensagem</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  };

  let html = '';
  if (erros.length > 0) {
    html += `<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#dc2626;">Falhas (${erros.length})</p>`;
    html += renderTable(erros);
  }
  if (sucessos.length > 0) {
    html += `<p style="margin:${erros.length ? '16px' : '0'} 0 8px;font-size:13px;font-weight:600;color:#059669;">Enviados com sucesso (${sucessos.length})</p>`;
    html += renderTable(sucessos, sucessos.length > 15 ? '220px' : undefined);
  }
  return html;
}

function buildProgressHtml(state: DisparoProgressState): string {
  const total = state.total || 0;
  const processados = state.processados || 0;
  const pct = total > 0 ? Math.round((processados / total) * 100) : 0;
  const recent = state.recentItems.slice(-10).reverse();
  const rows = recent
    .map(
      (d) =>
        `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:12px;color:#1f2937;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(d.email)}</span>
          <span style="flex-shrink:0;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;${
            d.status === 'enviado'
              ? 'background:#d1fae5;color:#047857;'
              : 'background:#fee2e2;color:#b91c1c;'
          }">${d.status === 'enviado' ? 'Enviado' : 'Erro'}</span>
        </div>
        ${d.status === 'erro' && d.mensagem ? `<div style="font-size:11px;color:#dc2626;padding:0 0 4px 4px;word-break:break-word;">${truncateMsg(d.mensagem, 120)}</div>` : ''}`
    )
    .join('');

  return `
    <div style="text-align:left;">
      <p style="margin:0 0 12px;font-size:14px;color:#4b5563;">
        Enviando e-mail <strong>${processados}</strong> de <strong>${total || '…'}</strong>
        ${state.enviados > 0 ? `<span style="color:#059669;"> (${state.enviados} com sucesso)</span>` : ''}
      </p>
      <div style="width:100%;height:10px;background:#e5e7eb;border-radius:9999px;overflow:hidden;margin-bottom:12px;">
        <div style="height:10px;background:#4f46e5;border-radius:9999px;width:${pct}%;transition:width 0.3s;"></div>
      </div>
      <div style="max-height:192px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;padding:8px;">
        ${rows || '<p style="font-size:12px;color:#9ca3af;text-align:center;padding:8px 0;margin:0;">Aguardando primeiro envio…</p>'}
      </div>
    </div>
  `;
}

function buildResultHtml(res: SendEmailsResponse): string {
  const dest = res.destinatarios || [];
  const erros = dest.filter((d) => d.status === 'erro');

  if (dest.length === 0 && res.erros?.length) {
    return `
      <ul style="text-align:left;font-size:13px;color:#b91c1c;max-height:240px;overflow-y:auto;margin:0;padding-left:18px;">
        ${res.erros.map((e) => `<li style="margin-bottom:4px;word-break:break-word;">${escapeHtml(e)}</li>`).join('')}
      </ul>
    `;
  }

  return `
    <div style="text-align:left;">
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">
        <strong>${res.enviados}</strong> de <strong>${res.total}</strong> e-mail(s) enviado(s) com sucesso.
        ${erros.length > 0 ? `<span style="color:#dc2626;"> ${erros.length} falha(s).</span>` : ''}
      </p>
      ${dest.length > 0 ? buildDestinatariosTableHtml(dest) : ''}
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
    width: '820px',
    confirmButtonText: 'Fechar',
    customClass: { popup: 'rounded-xl', htmlContainer: 'disparo-result-html' },
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
      width: '820px',
      confirmButtonText: 'Fechar',
      customClass: { popup: 'rounded-xl', htmlContainer: 'disparo-result-html' },
    });
    return;
  }
  await Swal.fire('Erro', message, 'error');
}

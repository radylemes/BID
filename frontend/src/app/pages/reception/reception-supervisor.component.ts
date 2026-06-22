import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  ReceptionSupervisorService,
  SupervisorAcesso,
} from '../../services/reception-supervisor.service';
import { formatarTituloPt } from '../../utils/formatar-texto';
import { portariaPodeCancelarNoDiaDoEvento } from '../../utils/portaria-prazo';

@Component({
  selector: 'app-reception-supervisor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-0 bg-[var(--app-bg)] p-4 md:p-8 font-sans">
      <div class="max-w-7xl mx-auto">
        <div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-black text-[var(--app-text)] tracking-tight flex items-center gap-3">
              <span class="text-3xl">📱</span> Supervisor Portaria
            </h1>
            <p class="text-[var(--app-text-muted)] text-sm mt-1">
              Relatório de acessos, detalhes e cancelamento de liberações indevidas (somente no dia do evento).
            </p>
          </div>
        </div>

        <div class="flex gap-2 mb-4 border-b border-[var(--app-border)]">
          <button
            type="button"
            (click)="selecionarAba('acessos')"
            class="px-4 py-2 text-sm font-bold border-b-2 transition-colors"
            [class.border-indigo-600]="aba === 'acessos'"
            [class.text-indigo-600]="aba === 'acessos'"
            [class.border-transparent]="aba !== 'acessos'"
            [class.text-[var(--app-text-muted)]]="aba !== 'acessos'"
          >
            Acessos liberados
          </button>
          <button
            type="button"
            (click)="selecionarAba('relatorio')"
            class="px-4 py-2 text-sm font-bold border-b-2 transition-colors"
            [class.border-indigo-600]="aba === 'relatorio'"
            [class.text-indigo-600]="aba === 'relatorio'"
            [class.border-transparent]="aba !== 'relatorio'"
            [class.text-[var(--app-text-muted)]]="aba !== 'relatorio'"
          >
            Relatório
          </button>
        </div>

        <div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] p-4 mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1">De</label>
              <input type="date" [(ngModel)]="filtroFrom" class="w-full h-10 rounded-lg border border-[var(--app-border)] px-2 text-sm" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1">Até</label>
              <input type="date" [(ngModel)]="filtroTo" class="w-full h-10 rounded-lg border border-[var(--app-border)] px-2 text-sm" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1">Tipo</label>
              <select [(ngModel)]="filtroTipo" class="w-full h-10 rounded-lg border border-[var(--app-border)] px-2 text-sm">
                <option value="todos">Todos</option>
                <option value="BID">BID</option>
                <option value="WT_PASS">WT Pass</option>
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1">Status</label>
              <select [(ngModel)]="filtroStatus" class="w-full h-10 rounded-lg border border-[var(--app-border)] px-2 text-sm">
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[10px] font-bold text-[var(--app-text-muted)] uppercase mb-1">Buscar</label>
              <input
                type="text"
                [(ngModel)]="filtroBusca"
                placeholder="Nome, CPF, evento..."
                class="w-full h-10 rounded-lg border border-[var(--app-border)] px-3 text-sm"
              />
            </div>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              (click)="carregar()"
              class="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Aplicar filtros
            </button>
            <button
              *ngIf="aba === 'relatorio'"
              type="button"
              (click)="exportarXlsx()"
              [disabled]="acessos.length === 0"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              Exportar XLSX
            </button>
          </div>
        </div>

        <div *ngIf="loading" class="flex justify-center py-16">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>

        <div
          *ngIf="!loading && acessos.length === 0"
          class="text-center py-16 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)]"
        >
          <span class="text-4xl block mb-2 opacity-40">📋</span>
          <p class="text-[var(--app-text-muted)] font-bold text-sm">Nenhum acesso encontrado no período.</p>
        </div>

        <div
          *ngIf="!loading && acessos.length > 0"
          class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] overflow-hidden"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] text-[10px] uppercase font-black tracking-wider">
                <tr>
                  <th class="px-4 py-3">Data check-in</th>
                  <th class="px-4 py-3">Tipo</th>
                  <th class="px-4 py-3">Evento</th>
                  <th class="px-4 py-3">Titular</th>
                  <th class="px-4 py-3">Recebedor</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr
                  *ngFor="let a of listaExibicao()"
                  class="hover:bg-[var(--app-nav-hover-bg)] cursor-pointer"
                  (click)="abrirDetalhe(a)"
                >
                  <td class="px-4 py-3 whitespace-nowrap text-xs font-mono">
                    {{ formatarDataHora(a.data_checkin || a.cancelado_em) }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-black"
                      [class.bg-slate-100]="a.tipo === 'BID'"
                      [class.text-slate-700]="a.tipo === 'BID'"
                      [class.bg-violet-100]="a.tipo === 'WT_PASS'"
                      [class.text-violet-700]="a.tipo === 'WT_PASS'"
                    >
                      {{ rotuloTipo(a.tipo) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 max-w-[180px] truncate" [title]="formatarTituloPt(a.evento_titulo)">
                    {{ formatarTituloPt(a.evento_titulo) }}
                  </td>
                  <td class="px-4 py-3 max-w-[140px] truncate">{{ formatarTituloPt(a.titular_nome) }}</td>
                  <td class="px-4 py-3 max-w-[140px] truncate">{{ formatarTituloPt(a.recebedor_nome) }}</td>
                  <td class="px-4 py-3">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-black"
                      [class.bg-emerald-100]="a.status === 'ativo'"
                      [class.text-emerald-700]="a.status === 'ativo'"
                      [class.bg-rose-100]="a.status === 'cancelado'"
                      [class.text-rose-700]="a.status === 'cancelado'"
                    >
                      {{ a.status === 'ativo' ? 'Ativo' : 'Cancelado' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      (click)="abrirDetalhe(a)"
                      class="text-indigo-600 hover:underline text-xs font-bold mr-2"
                    >
                      Ver
                    </button>
                    <button
                      *ngIf="aba === 'acessos' && a.status === 'ativo' && podeCancelar(a)"
                      type="button"
                      (click)="confirmarCancelamento(a)"
                      class="text-rose-600 hover:underline text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div
      *ngIf="detalhe"
      class="fixed inset-0 bg-gray-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      (click)="fecharDetalhe()"
    >
      <div
        class="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <div class="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 class="font-black text-indigo-900">Detalhe do acesso</h3>
          <button type="button" (click)="fecharDetalhe()" class="text-2xl leading-none text-gray-400 hover:text-gray-600">×</button>
        </div>
        <div class="p-4 space-y-3 text-sm">
          <div class="flex gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800">{{ rotuloTipo(detalhe.tipo) }}</span>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-black"
              [class.bg-emerald-100]="detalhe.status === 'ativo'"
              [class.text-emerald-700]="detalhe.status === 'ativo'"
              [class.bg-rose-100]="detalhe.status === 'cancelado'"
              [class.text-rose-700]="detalhe.status === 'cancelado'"
            >
              {{ detalhe.status === 'ativo' ? 'Ativo' : 'Cancelado' }}
            </span>
          </div>
          <div><span class="text-gray-400 text-xs font-bold">Evento</span><p class="font-semibold">{{ formatarTituloPt(detalhe.evento_titulo) }}</p></div>
          <div><span class="text-gray-400 text-xs font-bold">Data do evento</span><p>{{ formatarDataHora(detalhe.data_evento) }}</p></div>
          <div><span class="text-gray-400 text-xs font-bold">Check-in</span><p>{{ formatarDataHora(detalhe.data_checkin) }}</p></div>
          <div><span class="text-gray-400 text-xs font-bold">Titular</span><p>{{ formatarTituloPt(detalhe.titular_nome) }}</p><p class="text-xs text-gray-500 font-mono">{{ detalhe.titular_cpf || '—' }}</p></div>
          <div><span class="text-gray-400 text-xs font-bold">Recebedor</span><p>{{ formatarTituloPt(detalhe.recebedor_nome) }}</p><p class="text-xs text-gray-500 font-mono">{{ detalhe.recebedor_cpf || '—' }}</p></div>
          <div><span class="text-gray-400 text-xs font-bold">Empresa / Setor</span><p>{{ formatarTituloPt(detalhe.empresa) }} · {{ formatarTituloPt(detalhe.setor_evento_nome) || '—' }}</p></div>
          <div *ngIf="detalhe.liberado_por_nome"><span class="text-gray-400 text-xs font-bold">Liberado por</span><p>{{ formatarTituloPt(detalhe.liberado_por_nome) }}</p></div>
          <div *ngIf="detalhe.status === 'cancelado'">
            <span class="text-gray-400 text-xs font-bold">Cancelamento</span>
            <p>{{ formatarDataHora(detalhe.cancelado_em) }} · {{ formatarTituloPt(detalhe.cancelado_por_nome) }}</p>
            <p class="text-rose-700 text-xs mt-1">{{ detalhe.motivo_cancelamento }}</p>
          </div>
          <div class="flex gap-2 pt-2">
            <button
              *ngIf="detalhe.assinatura || detalhe.tem_assinatura"
              type="button"
              (click)="verAssinatura(detalhe.assinatura)"
              class="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-bold"
            >
              Ver assinatura
            </button>
            <button
              *ngIf="detalhe.documento || detalhe.tem_documento"
              type="button"
              (click)="verDocumento(detalhe.documento)"
              class="px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-xs font-bold"
            >
              Ver documento
            </button>
          </div>
        </div>
        <div class="p-4 border-t border-gray-100 flex gap-2" *ngIf="detalhe.status === 'ativo' && podeCancelar(detalhe)">
          <button
            type="button"
            (click)="confirmarCancelamento(detalhe)"
            class="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700"
          >
            Cancelar liberação
          </button>
        </div>
        <p *ngIf="detalhe.status === 'ativo' && !podeCancelar(detalhe)" class="px-4 pb-4 text-xs text-amber-700 font-medium">
          Cancelamento permitido somente no dia do evento até 23:59.
        </p>
      </div>
    </div>
  `,
})
export class ReceptionSupervisorComponent implements OnInit {
  formatarTituloPt = formatarTituloPt;
  aba: 'acessos' | 'relatorio' = 'acessos';
  loading = false;
  acessos: SupervisorAcesso[] = [];
  detalhe: SupervisorAcesso | null = null;

  filtroFrom = ReceptionSupervisorComponent.isoDaysAgo(90);
  filtroTo = ReceptionSupervisorComponent.hojeIso();
  filtroTipo: 'todos' | 'BID' | 'WT_PASS' = 'todos';
  filtroStatus: 'todos' | 'ativo' | 'cancelado' = 'todos';
  filtroBusca = '';

  constructor(
    private supervisorService: ReceptionSupervisorService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregar();
  }

  selecionarAba(tab: 'acessos' | 'relatorio') {
    if (this.aba === tab) return;
    this.aba = tab;
    if (tab === 'acessos') this.filtroStatus = 'ativo';
    this.carregar();
  }

  listaExibicao(): SupervisorAcesso[] {
    if (this.aba === 'acessos') {
      return this.acessos.filter((a) => a.status === 'ativo');
    }
    return this.acessos;
  }

  carregar() {
    this.loading = true;
    const status = this.aba === 'acessos' ? 'ativo' : this.filtroStatus;
    this.supervisorService
      .listarAcessos({
        from: this.filtroFrom,
        to: this.filtroTo,
        tipo: this.filtroTipo,
        status,
        q: this.filtroBusca,
      })
      .subscribe({
        next: (rows) => {
          this.acessos = Array.isArray(rows) ? rows : [];
          this.loading = false;
          this.cd.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.error || 'Falha ao carregar acessos.', 'error');
          this.cd.detectChanges();
        },
      });
  }

  abrirDetalhe(a: SupervisorAcesso) {
    this.supervisorService.obterDetalhe(a.tipo, a.registro_id).subscribe({
      next: (d) => {
        this.detalhe = d;
        this.cd.detectChanges();
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao carregar detalhe.', 'error'),
    });
  }

  fecharDetalhe() {
    this.detalhe = null;
  }

  podeCancelar(a: SupervisorAcesso): boolean {
    return a.status === 'ativo' && portariaPodeCancelarNoDiaDoEvento(a.data_evento);
  }

  confirmarCancelamento(a: SupervisorAcesso) {
    Swal.fire({
      title: 'Cancelar liberação?',
      html: `<p class="text-sm text-gray-600 mb-2">Recebedor: <strong>${formatarTituloPt(a.recebedor_nome)}</strong></p>`,
      input: 'textarea',
      inputLabel: 'Motivo (obrigatório)',
      inputPlaceholder: 'Descreva o motivo do cancelamento...',
      inputAttributes: { maxlength: '500' },
      showCancelButton: true,
      confirmButtonText: 'Confirmar cancelamento',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Voltar',
      preConfirm: (motivo) => {
        if (!motivo || String(motivo).trim().length < 10) {
          Swal.showValidationMessage('Informe pelo menos 10 caracteres.');
          return false;
        }
        return String(motivo).trim();
      },
    }).then((result) => {
      if (!result.isConfirmed || !result.value) return;
      this.supervisorService
        .cancelarAcesso(a.tipo, a.registro_id, result.value)
        .subscribe({
          next: () => {
            Swal.fire('Cancelado', 'A liberação foi revertida com sucesso.', 'success');
            this.fecharDetalhe();
            this.carregar();
          },
          error: (err) =>
            Swal.fire('Erro', err.error?.error || 'Não foi possível cancelar.', 'error'),
        });
    });
  }

  exportarXlsx() {
    const head = [
      'Data check-in',
      'Tipo',
      'Status',
      'Evento',
      'Data evento',
      'Titular',
      'CPF titular',
      'Recebedor',
      'CPF recebedor',
      'Empresa',
      'Setor',
      'Liberado por',
      'Cancelado em',
      'Cancelado por',
      'Motivo',
    ];
    const linhas = this.acessos.map((a) => [
      this.fmtExcel(a.data_checkin || a.cancelado_em),
      this.rotuloTipo(a.tipo),
      a.status === 'ativo' ? 'Ativo' : 'Cancelado',
      formatarTituloPt(a.evento_titulo),
      this.fmtExcel(a.data_evento),
      formatarTituloPt(a.titular_nome),
      a.titular_cpf || '',
      formatarTituloPt(a.recebedor_nome),
      a.recebedor_cpf || '',
      formatarTituloPt(a.empresa),
      formatarTituloPt(a.setor_evento_nome),
      formatarTituloPt(a.liberado_por_nome),
      this.fmtExcel(a.cancelado_em),
      formatarTituloPt(a.cancelado_por_nome),
      a.motivo_cancelamento || '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([head, ...linhas]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Acessos Portaria');
    XLSX.writeFile(wb, `Relatorio_Acessos_Portaria_${this.filtroTo}.xlsx`);
  }

  rotuloTipo(tipo: string): string {
    return tipo === 'WT_PASS' ? 'WT Pass' : 'BID';
  }

  formatarDataHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  private fmtExcel(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  verAssinatura(base64: string | null | undefined) {
    if (!base64) return;
    Swal.fire({
      title: 'Assinatura registrada',
      imageUrl: base64,
      imageAlt: 'Assinatura',
      confirmButtonColor: '#4f46e5',
    });
  }

  verDocumento(base64: string | null | undefined) {
    if (!base64) return;
    Swal.fire({
      title: 'Documento registrado',
      imageUrl: base64,
      imageAlt: 'Documento',
      confirmButtonColor: '#4f46e5',
    });
  }

  private static hojeIso(): string {
    const d = new Date();
    return ReceptionSupervisorComponent.toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  private static isoDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return ReceptionSupervisorComponent.toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  private static toIso(y: number, m: number, day: number): string {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}

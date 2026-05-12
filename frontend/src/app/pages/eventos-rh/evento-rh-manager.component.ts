import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventoRhService } from '../../services/evento-rh.service';
import { SettingsService } from '../../services/settings.service';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';
import { formatarInputCpf, normalizarCpfDigits } from '../../utils/cpf';
import { exportWtPassInscritosXlsx } from '../../utils/export-wt-pass-inscritos-xlsx';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-evento-rh-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 bg-[var(--app-bg)] min-h-0 space-y-6">
      <div
        class="flex flex-col md:flex-row justify-between items-center mb-2 gap-3 bg-[var(--color-bg-surface)] px-5 py-4 rounded-xl border border-[var(--app-border)]"
      >
        <div>
          <h2 class="text-lg font-bold text-[var(--app-text)] tracking-tight leading-tight">Gerenciar WT Pass</h2>
          <p class="text-xs text-[var(--app-text-muted)] font-medium mt-0.5">Total de {{ eventos.length }} eventos cadastrados</p>
        </div>
        <button
          type="button"
          (click)="abrirCriacao()"
          class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm text-sm transition-all active:scale-95"
        >
          <span class="text-base">📅</span>
          Novo evento WT Pass
        </button>
      </div>

      <div class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl overflow-hidden">
        <div class="border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 pt-4 pb-4">
          <ul class="flex text-sm font-medium text-center -space-x-px" role="tablist">
            <li class="w-full">
              <button
                type="button"
                (click)="abaAtiva='atuais'"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtiva==='atuais',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] border-transparent hover:border-[var(--app-border)]': abaAtiva!=='atuais'
                }"
                class="inline-flex items-center justify-center w-full border rounded-l-lg font-medium leading-5 px-4 py-2.5 transition"
              >
                Em andamento ({{ eventosAtuaisCount }})
              </button>
            </li>
            <li class="w-full">
              <button
                type="button"
                (click)="abaAtiva='anteriores'"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtiva==='anteriores',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] border-transparent hover:border-[var(--app-border)]': abaAtiva!=='anteriores'
                }"
                class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 transition"
              >
                Anteriores ({{ eventosAnterioresCount }})
              </button>
            </li>
          </ul>
          <div class="mt-3 pt-3 border-t border-[var(--app-border)]">
            <input
              type="text"
              [(ngModel)]="busca"
              placeholder="Buscar por título, local ou status..."
              class="w-full px-3 py-2.5 rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-[var(--app-text)] text-sm"
            />
          </div>
        </div>
        <div *ngIf="loading" class="p-8 text-center text-[var(--app-text-muted)]">A carregar…</div>
        <div *ngIf="!loading && eventosFiltrados.length === 0" class="p-8 text-center text-[var(--app-text-muted)]">
          Nenhum evento.
        </div>
        <div *ngIf="!loading && eventosFiltrados.length > 0" class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] text-xs uppercase tracking-wider">
              <tr>
                <th class="w-14 px-3 py-3 align-middle" scope="col"></th>
                <th class="px-4 py-3 font-semibold">Título</th>
                <th class="px-4 py-3 text-center font-semibold w-px whitespace-nowrap">Inscritos</th>
                <th class="px-4 py-3 text-center font-semibold w-px whitespace-nowrap">Datas</th>
                <th class="px-4 py-3 text-center font-semibold w-px whitespace-nowrap">Status</th>
                <th class="px-4 py-3 text-center font-semibold w-px whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ev of eventosFiltrados" class="border-t border-[var(--app-border)]">
                <td class="px-3 py-3 align-middle w-14">
                  <div
                    class="w-11 h-11 rounded-lg overflow-hidden border border-[var(--app-border)] bg-[var(--color-bg-surface)] shrink-0 shadow-sm"
                  >
                    <img
                      [src]="getBannerThumbUrl(ev)"
                      [alt]="ev.titulo || 'Banner do evento'"
                      loading="lazy"
                      class="w-full h-full object-cover"
                      (error)="$any($event.target).src = 'assets/placeholder.jpg'"
                    />
                  </div>
                </td>
                <td class="px-4 py-3 text-[var(--app-text)] font-medium">{{ ev.titulo || '—' }}</td>
                <td class="px-4 py-3 text-center align-middle w-px whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-xs font-semibold text-[var(--app-text)]"
                    [attr.title]="
                      'Inscritos confirmados: ' + (ev.ocupadas || 0) + ' de ' + (ev.vagas || 0) + ' vagas'
                    "
                  >
                    <span aria-hidden="true">🎫</span>
                    {{ ev.ocupadas || 0 }} <span class="text-[var(--app-text-muted)]">/</span> {{ ev.vagas || 0 }}
                  </span>
                </td>
                <td class="px-4 py-3 align-middle w-px whitespace-nowrap">
                  <div class="flex flex-col items-start gap-1 text-[11px] font-medium leading-tight">
                    <span
                      class="inline-flex items-center gap-2 text-emerald-600"
                      [attr.title]="'Abertura das inscrições: ' + formatarDataHoraCompleta(ev.data_inicio_inscricao)"
                    >
                      <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true"></span>
                      <span>{{ formatarDataHoraCurta(ev.data_inicio_inscricao) }}</span>
                    </span>
                    <span
                      class="inline-flex items-center gap-2 text-rose-600"
                      [attr.title]="'Encerramento das inscrições: ' + formatarDataHoraCompleta(ev.data_limite_inscricao)"
                    >
                      <span class="w-2 h-2 rounded-full bg-rose-500 shrink-0" aria-hidden="true"></span>
                      <span>{{ formatarDataHoraCurta(ev.data_limite_inscricao) }}</span>
                    </span>
                    <span
                      class="inline-flex items-center gap-2 text-violet-600"
                      [attr.title]="'Data do evento: ' + formatarDataApenasDia(ev.data_evento)"
                    >
                      <span class="w-2 h-2 rounded-full bg-violet-500 shrink-0" aria-hidden="true"></span>
                      <span>{{ formatarDataApenasDia(ev.data_evento) }}</span>
                    </span>
                  </div>
                </td>
                <td
                  class="px-4 py-3 text-center align-middle w-px whitespace-nowrap"
                  [attr.title]="
                    'Na BD: ' +
                    rotuloEstadoEventoRh(ev.status) +
                    (estadoWtPassEfetivo(ev) !== rotuloEstadoEventoRh(ev.status)
                      ? ' · Efetivo (inscrições): ' + estadoWtPassEfetivo(ev)
                      : '') +
                    (mostrarBadgeAutoEncerrar(ev)
                      ? ' · Auto-encerra ao fim das inscrições'
                      : '')
                  "
                >
                  <div class="inline-flex items-center gap-1.5">
                    <span
                      class="inline-flex items-center justify-center px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide uppercase"
                      [ngClass]="classesPillEstado(ev)"
                    >
                      {{ textoPillEstado(ev) }}
                    </span>
                    <span
                      *ngIf="mostrarBadgeAutoEncerrar(ev)"
                      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200"
                      title="Encerrará automaticamente ao fim do período de inscrição"
                    >
                      Auto
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3 align-middle w-px whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      (click)="abrirModalInscritos(ev)"
                      class="p-2 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100 transition shrink-0 text-sm leading-none"
                      title="Lista de inscritos"
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      (click)="clonar(ev)"
                      class="p-2 rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 transition shrink-0 text-sm leading-none"
                      title="Clonar evento"
                    >
                      📑
                    </button>
                    <button
                      type="button"
                      *ngIf="podeEncerrarInscricoes(ev)"
                      (click)="encerrarInscricoes(ev)"
                      class="p-2 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition shrink-0 text-sm leading-none"
                      title="Encerrar inscrições agora (mantém o evento ABERTO)"
                    >
                      🏁
                    </button>
                    <button
                      type="button"
                      *ngIf="podeEditarEventoWtPass(ev)"
                      (click)="editar(ev)"
                      class="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition shrink-0 text-sm leading-none"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      *ngIf="podeAlterarEstadoEventoRh(ev)"
                      (click)="editarEstado(ev)"
                      class="p-2 rounded-md bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition shrink-0 text-sm leading-none"
                      title="Alterar estado do evento na base de dados"
                    >
                      🏁
                    </button>
                    <button
                      type="button"
                      (click)="excluir(ev)"
                      class="p-2 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition shrink-0 text-sm leading-none"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class EventoRhManagerComponent implements OnInit {
  eventos: any[] = [];
  loading = false;
  currentUser: any = {};
  abaAtiva: 'atuais' | 'anteriores' = 'atuais';
  busca = '';

  novo = {
    titulo: '',
    subtitulo: '',
    descricao: '',
    banner: '',
    local: '',
    vagas: 10,
    data_inicio_inscricao: '',
    data_limite_inscricao: '',
    data_evento: '' as string,
    permitir_lista_espera: true,
    /** Quando ligado, o backend transita o evento de ABERTO → ENCERRADO assim
     *  que `data_limite_inscricao` expira (mantendo o encerramento manual). */
    auto_encerrar: true,
  };

  /** Configurações dinâmicas do bloqueio WT Pass (lidas em ngOnInit). */
  wtPassFaltasPermitidas = 1;
  wtPassEventosBloqueio = 5;

  constructor(
    private eventoRhService: EventoRhService,
    private settingsService: SettingsService,
  ) {}

  get eventosAtuaisCount(): number {
    return this.eventos.filter((ev) => this.isAtual(ev)).length;
  }

  get eventosAnterioresCount(): number {
    return this.eventos.filter((ev) => !this.isAtual(ev)).length;
  }

  get eventosFiltrados(): any[] {
    const q = this.busca.trim().toLowerCase();
    const list = this.eventos.filter((ev) => {
      const atual = this.isAtual(ev);
      if (this.abaAtiva === 'atuais' && !atual) return false;
      if (this.abaAtiva === 'anteriores' && atual) return false;

      if (!q) return true;
      return (
        String(ev.titulo || '').toLowerCase().includes(q) ||
        String(ev.local || '').toLowerCase().includes(q) ||
        String(ev.status || '').toLowerCase().includes(q)
      );
    });
    const ordem = this.abaAtiva === 'anteriores' ? 'desc' : 'asc';
    return [...list].sort((a, b) => this.compararPorDataEvento(a, b, ordem));
  }

  ngOnInit() {
    const u = localStorage.getItem('currentUser');
    this.currentUser = u ? JSON.parse(u) : {};
    this.carregar();
    this.preencherDatasPadrao();
    this.carregarWtPassConfig();
  }

  private carregarWtPassConfig() {
    this.settingsService.getWtPassSettings().subscribe({
      next: (cfg) => {
        this.wtPassFaltasPermitidas =
          Math.max(1, Number(cfg?.wt_pass_faltas_permitidas) || 1);
        this.wtPassEventosBloqueio =
          Math.max(1, Number(cfg?.wt_pass_eventos_bloqueio) || 5);
      },
      error: () => {
        // Mantém valores padrão se falhar.
      },
    });
  }

  preencherDatasPadrao() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toLocalDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toLocalDateTime = (d: Date) =>
      `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.novo.data_inicio_inscricao = toLocalDateTime(now);
    const lim = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.novo.data_limite_inscricao = toLocalDateTime(lim);
    const ev = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    this.novo.data_evento = toLocalDate(ev);
  }

  isAtual(ev: any): boolean {
    const status = String(ev?.status || '').toUpperCase();
    if (status === 'ABERTO') return true;
    const data = ev?.data_evento ? new Date(ev.data_evento).getTime() : 0;
    if (!data) return false;
    return data >= Date.now();
  }

  /** `null` = sem data válida (fica no fim da lista). */
  private dataEventoMs(ev: any): number | null {
    const raw = ev?.data_evento;
    if (raw == null || String(raw).trim() === '') return null;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  private compararPorDataEvento(a: any, b: any, ordem: 'asc' | 'desc'): number {
    const ta = this.dataEventoMs(a);
    const tb = this.dataEventoMs(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    const d = ta - tb;
    return ordem === 'asc' ? d : -d;
  }

  /** Mesmo critério de “período ativo” que o dashboard (1 min de tolerância). */
  private inscricoesPorDataAindaAtivas(ev: any): boolean {
    const buf = 60_000;
    const lim = ev?.data_limite_inscricao ? new Date(ev.data_limite_inscricao).getTime() : 0;
    if (!lim) return true;
    return Date.now() <= lim + buf;
  }

  podeEncerrarInscricoes(ev: any): boolean {
    return String(ev?.status || '').toUpperCase() === 'ABERTO' && this.inscricoesPorDataAindaAtivas(ev);
  }

  /** Badge «Auto» só faz sentido enquanto o evento ainda está ABERTO; já encerrado o auto-encerramento não tem efeito visual. */
  mostrarBadgeAutoEncerrar(ev: any): boolean {
    if (String(ev?.status || '').toUpperCase().trim() !== 'ABERTO') return false;
    return ev?.auto_encerrar == null ? true : Boolean(ev.auto_encerrar);
  }

  /** Texto a apresentar no pill de status — usa o estado efetivo e devolve em maiúsculas (igual ao layout do WT Pass). */
  textoPillEstado(ev: any): string {
    const efetivo = String(this.estadoWtPassEfetivo(ev) || '').trim();
    if (!efetivo || efetivo === '—') return '—';
    return efetivo.toUpperCase();
  }

  /** Classes Tailwind para o pill, mapeadas pelo estado efetivo: cada estado tem a sua paleta (mesmo padrão visual da listagem WT Pass). */
  classesPillEstado(ev: any): string {
    const ef = String(this.estadoWtPassEfetivo(ev) || '').trim().toLowerCase();
    switch (ef) {
      case 'aberto':
        return 'bg-emerald-50 text-emerald-600 border-emerald-300';
      case 'em breve':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'fechado':
        return 'bg-rose-50 text-rose-600 border-rose-300';
      case 'realizado':
        return 'bg-sky-50 text-sky-700 border-sky-300';
      case 'cancelado':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-300';
    }
  }

  /** Rótulo na UI: o valor na API/BD continua `ENCERRADO`, etc. */
  rotuloEstadoEventoRh(raw: string | null | undefined): string {
    const u = String(raw ?? '').toUpperCase().trim();
    const labels: Record<string, string> = {
      ABERTO: 'Aberto',
      ENCERRADO: 'Fechado',
      REALIZADO: 'Realizado',
      CANCELADO: 'Cancelado',
    };
    return labels[u] || (raw != null && String(raw).trim() !== '' ? String(raw) : '—');
  }

  /**
   * Estado como na lista WT Pass / histórico: com `ABERTO` na BD mas inscrições já encerradas
   * por data → mostra «Fechado», não só o campo `status`.
   */
  estadoWtPassEfetivo(ev: any): string {
    const agora = Date.now();
    const buf = 60_000;
    const ini = ev?.data_inicio_inscricao ? new Date(ev.data_inicio_inscricao).getTime() : 0;
    const lim = ev?.data_limite_inscricao ? new Date(ev.data_limite_inscricao).getTime() : 0;
    const st = String(ev?.status ?? '').toUpperCase().trim();
    if (st !== 'ABERTO') return this.rotuloEstadoEventoRh(ev?.status);
    if (ini && agora < ini - buf) return 'Em Breve';
    if (lim && agora > lim + buf) return 'Fechado';
    return 'Aberto';
  }

  /** Edição completa só com evento ABERTO na BD e inscrições ainda não fechadas (calendário). */
  podeEditarEventoWtPass(ev: any): boolean {
    if (String(ev?.status || '').toUpperCase().trim() !== 'ABERTO') return false;
    return this.estadoWtPassEfetivo(ev) !== 'Fechado';
  }

  /**
   * 🏁 Alterar estado na BD: escondido com evento ainda ABERTO e após «Fechado» na UI
   * (inscrições encerradas por data ou ENCERRADO → rótulo Fechado).
   */
  podeAlterarEstadoEventoRh(ev: any): boolean {
    if (String(ev?.status || '').toUpperCase().trim() === 'ABERTO') return false;
    return this.estadoWtPassEfetivo(ev) !== 'Fechado';
  }

  encerrarInscricoes(ev: any): void {
    if (!this.podeEncerrarInscricoes(ev)) return;
    Swal.fire({
      title: 'Encerrar inscrições?',
      html:
        '<div class="max-w-full min-w-0 overflow-x-hidden box-border text-left">' +
        '<p class="text-left text-sm text-gray-700 mb-3">' +
        'O <strong>fim das inscrições</strong> passa a ser <strong>agora</strong>. Novas inscrições deixam de ser aceites. ' +
        'O evento continua <strong>ABERTO</strong> para consultar inscritos e marcar presenças.</p>' +
        '<label class="block text-left text-xs font-bold text-gray-600 mb-1" for="rh-motivo-encerra">Motivo (auditoria, obrigatório)</label>' +
        '<div class="w-full max-w-full min-w-0">' +
        '<textarea id="rh-motivo-encerra" class="swal2-textarea block w-full max-w-full min-w-0 m-0 resize-y" rows="3" maxlength="255" placeholder="Mínimo 3 caracteres"></textarea>' +
        '</div></div>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Sim, encerrar inscrições',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      preConfirm: () => {
        const m =
          (document.getElementById('rh-motivo-encerra') as HTMLTextAreaElement | null)?.value?.trim() || '';
        if (m.length < 3) {
          Swal.showValidationMessage('Indique o motivo para auditoria (mínimo 3 caracteres).');
          return null;
        }
        return m;
      },
    }).then((r) => {
      if (!r.isConfirmed || r.value == null || typeof r.value !== 'string') return;
      /** Fim no passado para ultrapassar o buffer de 60s de `inscrever` e fechar de imediato. */
      const limMs = Date.now() - 120_000;
      const limIso = new Date(limMs).toISOString();
      const payload: Record<string, unknown> = {
        data_limite_inscricao: limIso,
        adminId: this.currentUser.id,
        motivo: r.value,
      };
      const iniT = ev.data_inicio_inscricao ? new Date(ev.data_inicio_inscricao).getTime() : 0;
      if (iniT > limMs) {
        payload['data_inicio_inscricao'] = new Date(limMs - 60_000).toISOString();
      }
      this.eventoRhService.updateEvento(Number(ev.id), payload).subscribe({
        next: () => {
          Swal.fire('Concluído', 'Período de inscrições encerrado.', 'success');
          this.carregar();
        },
        error: (err: any) => Swal.fire('Erro', err.error?.error || 'Não foi possível atualizar.', 'error'),
      });
    });
  }

  toIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  /** Data do evento sem hora (yyyy-mm-dd): envia meio-dia local para evitar deslocamento de dia. */
  toIsoApenasData(yyyyMmDd: string): string {
    if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return '';
    const d = new Date(`${yyyyMmDd.trim()}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  /** ISO do servidor → valor datetime-local */
  isoParaDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** ISO do servidor → yyyy-mm-dd (data do evento) */
  isoParaData(iso: string | null | undefined): string {
    if (!iso) return '';
    const raw = String(iso).trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Clona os mesmos dados do evento de origem (sem deslocamento automático de datas). */
  private aplicarFonteClone(ev: any): void {
    const baseTitulo = String(ev.titulo || 'Evento')
      .replace(/\s*\(Cópia\)\s*$/i, '')
      .trim();
    this.novo.titulo = `${baseTitulo || 'Evento'} (Cópia)`;
    this.novo.subtitulo = ev.subtitulo ? String(ev.subtitulo) : '';
    this.novo.descricao = ev.descricao ? String(ev.descricao) : '';
    this.novo.banner = ev.banner ? String(ev.banner) : '';
    this.novo.local = ev.local ? String(ev.local) : '';
    this.novo.vagas = Math.max(1, Number(ev.vagas) || 10);
    this.novo.permitir_lista_espera = Boolean(ev.permitir_lista_espera);
    this.novo.auto_encerrar = ev.auto_encerrar == null ? true : Boolean(ev.auto_encerrar);

    const ini = ev.data_inicio_inscricao ? String(ev.data_inicio_inscricao) : '';
    const lim = ev.data_limite_inscricao ? String(ev.data_limite_inscricao) : '';
    const evtData = ev.data_evento ? String(ev.data_evento) : '';
    this.novo.data_inicio_inscricao = ini ? this.isoParaDatetimeLocal(ini) : '';
    this.novo.data_limite_inscricao = lim ? this.isoParaDatetimeLocal(lim) : '';
    this.novo.data_evento = evtData ? this.isoParaData(evtData) : '';

    // Se o período clonado já não permite inscrição, abre uma nova janela imediatamente.
    const agora = Date.now();
    const iniMs = ini ? new Date(ini).getTime() : 0;
    const limMs = lim ? new Date(lim).getTime() : 0;
    const buffer = 60_000;
    const periodoInvalido =
      !this.novo.data_inicio_inscricao || !this.novo.data_limite_inscricao || !iniMs || !limMs || limMs <= iniMs;
    const periodoNaoDisponivelAgora = (iniMs && iniMs > agora + buffer) || (limMs && limMs < agora - buffer);
    if (periodoInvalido || periodoNaoDisponivelAgora) {
      const inicio = new Date(agora + 60_000);
      const limite = new Date(agora + 7 * 24 * 60 * 60 * 1000);
      this.novo.data_inicio_inscricao = this.isoParaDatetimeLocal(inicio.toISOString());
      this.novo.data_limite_inscricao = this.isoParaDatetimeLocal(limite.toISOString());
    }

    if (!this.novo.data_limite_inscricao || !this.novo.data_evento) {
      this.preencherDatasPadrao();
      this.novo.titulo = `${baseTitulo || 'Evento'} (Cópia)`;
      this.novo.subtitulo = ev.subtitulo ? String(ev.subtitulo) : '';
      this.novo.descricao = ev.descricao ? String(ev.descricao) : '';
      this.novo.banner = ev.banner ? String(ev.banner) : '';
      this.novo.local = ev.local ? String(ev.local) : '';
      this.novo.vagas = Math.max(1, Number(ev.vagas) || 10);
      this.novo.permitir_lista_espera = Boolean(ev.permitir_lista_espera);
      this.novo.auto_encerrar = ev.auto_encerrar == null ? true : Boolean(ev.auto_encerrar);
    }
  }

  clonar(ev: any): void {
    this.aplicarFonteClone(ev);
    this.abrirCriacao({ clone: true });
  }

  private escapeHtml(s: unknown): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private textoCpfInscrito(cpf: unknown): string {
    const d = normalizarCpfDigits(cpf);
    return d.length === 11 ? formatarInputCpf(d) : '—';
  }

  private exportarInscritosXlsx(ev: any, rows: any[]): void {
    exportWtPassInscritosXlsx(ev, rows);
  }

  /** Título do SweetAlert do modal de inscrições. */
  private tituloModalInscricoes(ev: any): string {
    const t = String(ev?.titulo ?? '').trim();
    return t ? `Inscrições do ${t}` : 'Inscrições';
  }

  /** Banner + resumo (Inscritos / Datas / Status) para o modal de inscrições (HTML escapado). */
  private htmlCabecalhoEventoInscricoes(ev: any): string {
    const bannerUrl = this.getBannerThumbUrl(ev);
    const imgSrc = this.escapeHtml(bannerUrl);
    const ocup = Number(ev.ocupadas) || 0;
    const vagas = Number(ev.vagas) || 0;
    const ini = this.escapeHtml(this.formatarDataHoraCurta(ev.data_inicio_inscricao));
    const lim = this.escapeHtml(this.formatarDataHoraCurta(ev.data_limite_inscricao));
    const diaEvt = this.escapeHtml(this.formatarDataApenasDia(ev.data_evento));
    const tIni = this.escapeHtml(this.formatarDataHoraCompleta(ev.data_inicio_inscricao));
    const tLim = this.escapeHtml(this.formatarDataHoraCompleta(ev.data_limite_inscricao));
    const tEvtDia = this.escapeHtml('Data do evento: ' + this.formatarDataApenasDia(ev.data_evento));
    const pillText = this.escapeHtml(this.textoPillEstado(ev));
    const pillClass = this.classesPillEstado(ev);
    const cardBase =
      'rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-2 sm:px-2.5 sm:py-1.5 sm:h-full sm:min-h-0 sm:flex sm:flex-col sm:justify-center';
    return (
      '<div class="mb-4 pb-4 border-b border-gray-200 text-left">' +
      '<div class="flex flex-col sm:flex-row gap-3 sm:items-stretch">' +
      '<div class="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm mx-auto sm:mx-0">' +
      `<img src="${imgSrc}" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.onerror=null;this.src='assets/placeholder.jpg'">` +
      '</div>' +
      '<div class="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2 sm:h-28">' +
      `<div class="${cardBase}">` +
      '<div class="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-0.5 sm:mb-0.5">Inscritos</div>' +
      `<div class="text-sm font-semibold text-gray-900 leading-tight" title="Confirmados / vagas">🎫 ${ocup} <span class="text-gray-400 font-normal">/</span> ${vagas}</div>` +
      '</div>' +
      `<div class="${cardBase}">` +
      '<div class="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-0.5">Datas</div>' +
      '<div class="text-[10px] sm:text-[11px] font-medium leading-tight space-y-0.5">' +
      `<div class="text-emerald-600" title="Início inscrições: ${tIni}"><span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle"></span>Inscr. ${ini}</div>` +
      `<div class="text-rose-600" title="Fim inscrições: ${tLim}"><span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 mr-1 align-middle"></span>Limite ${lim}</div>` +
      `<div class="text-violet-700" title="${tEvtDia}"><span class="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 mr-1 align-middle"></span>Evento ${diaEvt}</div>` +
      '</div></div>' +
      `<div class="${cardBase}">` +
      '<div class="text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-0.5">Status</div>' +
      `<span class="inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-bold tracking-wide uppercase leading-tight ${pillClass}">${pillText}</span>` +
      '</div></div></div></div>'
    );
  }

  private htmlTabelaInscritos(ev: any, rows: any[]): string {
    const cab = this.htmlCabecalhoEventoInscricoes(ev);
    const toolbar =
      '<div class="mb-2 flex justify-end">' +
      '<button type="button" id="rh-inscritos-export-xlsx" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">' +
      'Exportar XLSX</button></div>';
    const head =
      '<thead><tr class="border-b border-gray-200 text-gray-500 text-xs uppercase">' +
      '<th class="py-2 px-2 text-left">#</th>' +
      '<th class="py-2 px-2 text-left">Nome</th>' +
      '<th class="py-2 px-2 text-left">CPF</th>' +
      '<th class="py-2 px-2 text-left">Setor</th>' +
      '<th class="py-2 px-2 text-left">Estado</th>' +
      '<th class="py-2 px-2 text-right">Chamada</th>' +
      '</tr></thead>';
    const bodyRows = rows
      .map((r) => {
        const pode = r.status === 'INSCRITO' || r.status === 'FILA_ESPERA';
        const uid = Number(r.usuario_id);
        const botoes = pode
          ? `<button type="button" id="rh-modal-pres-${uid}-ok" class="text-emerald-600 font-bold text-xs hover:underline mr-2">Presente</button>` +
            `<button type="button" id="rh-modal-pres-${uid}-falta" class="text-red-600 font-bold text-xs hover:underline">Faltou</button>`
          : '—';
        const cpfTxt = this.textoCpfInscrito(r.cpf);
        return (
          '<tr class="border-t border-gray-100">' +
          `<td class="py-2 px-2">${this.escapeHtml(r.posicao_exibicao ?? r.posicao)}</td>` +
          `<td class="py-2 px-2">${this.escapeHtml(r.nome_completo)}</td>` +
          `<td class="py-2 px-2 font-mono text-xs whitespace-nowrap">${this.escapeHtml(cpfTxt)}</td>` +
          `<td class="py-2 px-2">${this.escapeHtml(r.setor_nome || '—')}</td>` +
          `<td class="py-2 px-2">${this.escapeHtml(r.status)}</td>` +
          `<td class="py-2 px-2 text-right whitespace-nowrap">${botoes}</td>` +
          '</tr>'
        );
      })
      .join('');
    return (
      cab +
      toolbar +
      '<div class="overflow-x-auto max-h-[min(60vh,480px)] overflow-y-auto text-left">' +
      '<table class="w-full text-sm">' +
      head +
      '<tbody>' +
      bodyRows +
      '</tbody></table></div>'
    );
  }

  private anexarPresencaModal(ev: any, rows: any[]): void {
    rows.forEach((r) => {
      if (r.status !== 'INSCRITO' && r.status !== 'FILA_ESPERA') return;
      const uid = Number(r.usuario_id);
      document.getElementById(`rh-modal-pres-${uid}-ok`)?.addEventListener('click', () => {
        this.presenca(r, 'PRESENTE', ev);
      });
      document.getElementById(`rh-modal-pres-${uid}-falta`)?.addEventListener('click', () => {
        this.presenca(r, 'FALTOU', ev);
      });
    });
  }

  abrirModalInscritos(ev: any): void {
    Swal.fire({
      title: 'A carregar inscrições…',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    this.eventoRhService.getInscritos(Number(ev.id)).subscribe({
      next: (rows) => {
        Swal.close();
        const mapped = (rows || []).map((r, idx) => ({
          ...r,
          posicao_exibicao: idx + 1,
        }));
        if (mapped.length === 0) {
          Swal.fire({
            title: this.tituloModalInscricoes(ev),
            html:
              this.htmlCabecalhoEventoInscricoes(ev) +
              '<p class="text-gray-500 text-sm text-left mt-1">Sem inscrições ativas.</p>',
            width: 640,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Fechar',
          });
          return;
        }
        const html = this.htmlTabelaInscritos(ev, mapped);
        Swal.fire({
          title: this.tituloModalInscricoes(ev),
          html,
          width: 1000,
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Fechar',
          didOpen: () => {
            this.anexarPresencaModal(ev, mapped);
            document.getElementById('rh-inscritos-export-xlsx')?.addEventListener('click', () => {
              this.exportarInscritosXlsx(ev, mapped);
            });
          },
        });
      },
      error: () => {
        Swal.close();
        Swal.fire('Erro', 'Não foi possível carregar inscrições.', 'error');
      },
    });
  }

  carregar() {
    this.loading = true;
    this.eventoRhService.listAdminTodos().subscribe({
      next: (data) => {
        this.eventos = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar a lista.', 'error');
      },
    });
  }

  criarEvento() {
    if (!this.novo.data_limite_inscricao || !this.novo.data_evento) {
      Swal.fire('Atenção', 'Preencha data limite de inscrição e data do evento.', 'warning');
      return;
    }
    const body: Record<string, unknown> = {
      titulo: this.novo.titulo || null,
      subtitulo: this.novo.subtitulo?.trim() || null,
      descricao: this.novo.descricao?.trim() || null,
      banner: this.novo.banner?.trim() || null,
      local: this.novo.local || null,
      vagas: Number(this.novo.vagas) || 1,
      permitir_lista_espera: this.novo.permitir_lista_espera,
      data_inicio_inscricao: this.toIso(this.novo.data_inicio_inscricao),
      data_limite_inscricao: this.toIso(this.novo.data_limite_inscricao),
      data_evento: this.toIsoApenasData(this.novo.data_evento) || this.toIso(this.novo.data_evento),
      adminId: this.currentUser.id,
    };
    this.eventoRhService.createEvento(body).subscribe({
      next: () => {
        Swal.fire('Criado', 'Evento do WT Pass criado.', 'success');
        this.carregar();
        this.preencherDatasPadrao();
        this.novo.titulo = '';
        this.novo.subtitulo = '';
        this.novo.descricao = '';
        this.novo.banner = '';
        this.novo.local = '';
      },
      error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha ao criar.', 'error'),
    });
  }

  abrirCriacao(opts?: { clone?: boolean }) {
    const ehClone = !!opts?.clone;
    if (!ehClone) {
      this.preencherDatasPadrao();
      this.novo.titulo = '';
      this.novo.subtitulo = '';
      this.novo.descricao = '';
      this.novo.banner = '';
      this.novo.local = '';
      this.novo.vagas = 10;
      this.novo.permitir_lista_espera = true;
      this.novo.auto_encerrar = true;
    }
    const tituloModal = ehClone ? 'Clonar evento WT Pass' : 'Novo evento WT Pass';
    const emojiTitulo = ehClone ? '📑' : '🎫';

    const preencherFormCriacao = () => {
      const setVal = (id: string, v: string) => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) el.value = v ?? '';
      };
      setVal('rh-new-titulo', this.novo.titulo || '');
      setVal('rh-new-subtitulo', this.novo.subtitulo || '');
      setVal('rh-new-descricao', this.novo.descricao || '');
      setVal('rh-new-banner', this.novo.banner || '');
      setVal('rh-new-local', this.novo.local || '');
      const vagasEl = document.getElementById('rh-new-vagas') as HTMLInputElement | null;
      if (vagasEl) vagasEl.value = String(this.novo.vagas || 10);
      const fila = document.getElementById('rh-new-fila') as HTMLInputElement | null;
      if (fila) fila.checked = this.novo.permitir_lista_espera !== false;
      const autoEnc = document.getElementById('rh-new-auto-encerrar') as HTMLInputElement | null;
      if (autoEnc) autoEnc.checked = this.novo.auto_encerrar !== false;
      const inj = document.getElementById('rh-new-inicio') as HTMLInputElement | null;
      const lim = document.getElementById('rh-new-limite') as HTMLInputElement | null;
      const dev = document.getElementById('rh-new-evento') as HTMLInputElement | null;
      if (inj) inj.value = this.novo.data_inicio_inscricao || '';
      if (lim) lim.value = this.novo.data_limite_inscricao || '';
      if (dev) dev.value = this.novo.data_evento || '';
    };

    Swal.fire({
      title: tituloModal,
      width: '700px',
      didOpen: () => {
        const titleEl = document.querySelector('.swal2-title') as HTMLElement | null;
        if (titleEl) {
          titleEl.style.display = 'flex';
          titleEl.style.alignItems = 'center';
          titleEl.style.justifyContent = 'center';
          titleEl.style.width = '100%';
          titleEl.style.gap = '10px';
          titleEl.innerHTML =
            '<span style="display:inline-flex;align-items:center;gap:10px"><span style="font-size:46px;line-height:1" aria-hidden="true">' +
            emojiTitulo +
            '</span>' +
            tituloModal +
            '</span>';
        }
        preencherFormCriacao();
      },
      html: `
        <div class="text-left space-y-4 px-2 max-w-full min-w-0 overflow-x-hidden box-border">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-titulo">Título do evento</label>
              <input id="rh-new-titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-subtitulo">Subtítulo</label>
              <input id="rh-new-subtitulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-banner">Banner (URL da imagem)</label>
              <input id="rh-new-banner" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://... ou /uploads/..." />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-local">Local</label>
              <input id="rh-new-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-descricao">Informações extras</label>
            <textarea id="rh-new-descricao" class="swal2-textarea w-full m-0 text-sm border-gray-300 rounded-lg" rows="3" placeholder="Texto livre (opcional)"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <label class="block text-xs font-bold text-blue-600 uppercase mb-1" for="rh-new-vagas">Vagas</label>
              <div class="flex flex-wrap items-center gap-3">
                <input id="rh-new-vagas" type="number" min="1" value="10" class="swal2-input w-24 m-0 h-10 text-sm border-gray-300 rounded-lg" />
                <label class="flex items-center gap-2 text-xs font-medium text-gray-600 whitespace-nowrap">
                  <input id="rh-new-fila" type="checkbox" checked class="rounded border-gray-300" />
                  Lista de espera
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-new-evento">Data do evento</label>
              <input id="rh-new-evento" type="date" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-emerald-600 uppercase mb-1" for="rh-new-inicio">Início das inscrições</label>
              <input id="rh-new-inicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 rounded-lg" />
            </div>
            <div>
              <label class="block text-xs font-bold text-rose-500 uppercase mb-1" for="rh-new-limite">Fim das inscrições</label>
              <input id="rh-new-limite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 rounded-lg" />
            </div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label class="flex items-start gap-2 text-sm text-amber-900 cursor-pointer">
              <input id="rh-new-auto-encerrar" type="checkbox" checked class="mt-1 rounded border-amber-300" />
              <span>
                <span class="font-semibold block">Encerrar automaticamente após o fim das inscrições</span>
                <span class="text-xs text-amber-800 block">Quando o prazo terminar, o evento passa de <strong>ABERTO</strong> para <strong>ENCERRADO</strong> sem ação manual. O botão 🏁 continua disponível para encerrar antes.</span>
              </span>
            </label>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Salvar evento',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const titulo = (document.getElementById('rh-new-titulo') as HTMLInputElement)?.value?.trim();
        const dataLimite = (document.getElementById('rh-new-limite') as HTMLInputElement)?.value;
        const dataEvento = (document.getElementById('rh-new-evento') as HTMLInputElement)?.value?.trim();
        if (!dataLimite || !dataEvento) {
          Swal.showValidationMessage('Fim das inscrições e data do evento são obrigatórios.');
          return null;
        }
        const dataEventoIso = this.toIsoApenasData(dataEvento);
        if (!dataEventoIso) {
          Swal.showValidationMessage('Data do evento inválida.');
          return null;
        }
        return {
          titulo,
          subtitulo: (document.getElementById('rh-new-subtitulo') as HTMLInputElement)?.value?.trim() || null,
          descricao: (document.getElementById('rh-new-descricao') as HTMLTextAreaElement)?.value?.trim() || null,
          banner: (document.getElementById('rh-new-banner') as HTMLInputElement)?.value?.trim() || null,
          local: (document.getElementById('rh-new-local') as HTMLInputElement)?.value?.trim() || null,
          vagas: Number((document.getElementById('rh-new-vagas') as HTMLInputElement)?.value || 1),
          permitir_lista_espera: (document.getElementById('rh-new-fila') as HTMLInputElement)?.checked ?? true,
          auto_encerrar: (document.getElementById('rh-new-auto-encerrar') as HTMLInputElement)?.checked ?? true,
          data_inicio_inscricao: this.toIso((document.getElementById('rh-new-inicio') as HTMLInputElement)?.value || ''),
          data_limite_inscricao: this.toIso(dataLimite),
          data_evento: dataEventoIso,
          adminId: this.currentUser.id,
        };
      },
    }).then((r) => {
      if (!r.isConfirmed || !r.value) return;
      this.eventoRhService.createEvento(r.value).subscribe({
        next: () => {
          Swal.fire(
            ehClone ? 'Clonado' : 'Criado',
            ehClone ? 'Novo evento criado a partir do original.' : 'Evento do WT Pass criado.',
            'success',
          );
          this.carregar();
          if (!ehClone) {
            this.preencherDatasPadrao();
          }
        },
        error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha ao criar.', 'error'),
      });
    });
  }

  getBannerThumbUrl(ev: { banner?: string | null }): string {
    if (!ev?.banner) return 'assets/placeholder.jpg';
    if (String(ev.banner).startsWith('http')) return String(ev.banner);
    return uploadsPublicUrl(String(ev.banner));
  }

  formatarDataApenasDia(iso: string | null): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
    } catch {
      return '—';
    }
  }

  /** Formato curto «DD/MM HH:mm» — usado na coluna «Datas» (3 bolinhas coloridas). */
  formatarDataHoraCurta(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  /** Formato extenso para tooltip (mantém ano + segundos): «DD/MM/YYYY HH:mm». */
  formatarDataHoraCompleta(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return '—';
    }
  }

  editar(ev: any) {
    if (!this.podeEditarEventoWtPass(ev)) {
      Swal.fire(
        'Edição indisponível',
        this.estadoWtPassEfetivo(ev) === 'Fechado' && String(ev?.status || '').toUpperCase().trim() === 'ABERTO'
          ? 'As inscrições já estão encerradas. Não é possível alterar dados do evento; use 🏁 para mudar o estado ou 📑 para clonar.'
          : 'Eventos fora do estado Aberto na base de dados não podem ser editados (apenas alteração de estado com 🏁).',
        'info',
      );
      return;
    }
    const vInicio = this.isoParaDatetimeLocal(ev.data_inicio_inscricao);
    const vLimite = this.isoParaDatetimeLocal(ev.data_limite_inscricao);
    const vEvento = this.isoParaData(ev.data_evento);
    const st = String(ev.status || 'ABERTO').toUpperCase().trim();
    const optsStatus = (['ABERTO', 'ENCERRADO', 'REALIZADO', 'CANCELADO'] as const)
      .map(
        (s) =>
          `<option value="${s}" ${st === s ? 'selected' : ''}>${this.rotuloEstadoEventoRh(s)}</option>`,
      )
      .join('');

    Swal.fire({
      title: 'Editar evento WT Pass',
      width: '700px',
      didOpen: () => {
        const setVal = (id: string, v: string) => {
          const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
          if (el) el.value = v ?? '';
        };
        setVal('rh-edit-titulo', ev.titulo || '');
        setVal('rh-edit-subtitulo', ev.subtitulo || '');
        setVal('rh-edit-descricao', ev.descricao || '');
        setVal('rh-edit-banner', ev.banner || '');
        setVal('rh-edit-local', ev.local || '');
        const fila = document.getElementById('rh-edit-fila') as HTMLInputElement | null;
        if (fila) fila.checked = Boolean(ev.permitir_lista_espera);
        const autoEnc = document.getElementById('rh-edit-auto-encerrar') as HTMLInputElement | null;
        if (autoEnc) autoEnc.checked = ev.auto_encerrar == null ? true : Boolean(ev.auto_encerrar);
      },
      html: `
        <div class="text-left space-y-4 px-2 max-w-full min-w-0 overflow-x-hidden box-border">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-titulo">Título do evento</label>
              <input id="rh-edit-titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-subtitulo">Subtítulo</label>
              <input id="rh-edit-subtitulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-banner">Banner (URL da imagem)</label>
              <input id="rh-edit-banner" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://... ou /uploads/..." />
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-local">Local</label>
              <input id="rh-edit-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-descricao">Informações extras</label>
            <textarea id="rh-edit-descricao" class="swal2-textarea w-full m-0 text-sm border-gray-300 rounded-lg" rows="3" placeholder="Texto livre (opcional)"></textarea>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-status">Estado</label>
            <select id="rh-edit-status" class="swal2-select w-full m-0 h-10 text-sm border-gray-300 rounded-lg">${optsStatus}</select>
          </div>
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <label class="block text-xs font-bold text-blue-600 uppercase mb-1" for="rh-edit-vagas">Vagas</label>
              <div class="flex flex-wrap items-center gap-3">
                <input id="rh-edit-vagas" type="number" min="1" class="swal2-input w-24 m-0 h-10 text-sm border-gray-300 rounded-lg" value="${Number(ev.vagas) || 1}" />
                <label class="flex items-center gap-2 text-xs font-medium text-gray-600 whitespace-nowrap">
                  <input id="rh-edit-fila" type="checkbox" class="rounded border-gray-300" />
                  Lista de espera
                </label>
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="rh-edit-evento">Data do evento</label>
              <input id="rh-edit-evento" type="date" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${vEvento}" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-emerald-600 uppercase mb-1" for="rh-edit-inicio">Início das inscrições</label>
              <input id="rh-edit-inicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 rounded-lg" value="${vInicio}" />
            </div>
            <div>
              <label class="block text-xs font-bold text-rose-500 uppercase mb-1" for="rh-edit-limite">Fim das inscrições</label>
              <input id="rh-edit-limite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 rounded-lg" value="${vLimite}" />
            </div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label class="flex items-start gap-2 text-sm text-amber-900 cursor-pointer">
              <input id="rh-edit-auto-encerrar" type="checkbox" class="mt-1 rounded border-amber-300" />
              <span>
                <span class="font-semibold block">Encerrar automaticamente após o fim das inscrições</span>
                <span class="text-xs text-amber-800 block">Se ativo, o evento passa a <strong>ENCERRADO</strong> assim que o prazo expira. Desative para encerrar apenas manualmente.</span>
              </span>
            </label>
          </div>
          <div class="pt-2 border-t border-gray-200 w-full max-w-full min-w-0">
            <label class="block text-xs font-bold text-gray-600 mb-1" for="rh-edit-motivo">Motivo (auditoria, obrigatório)</label>
            <textarea id="rh-edit-motivo" class="swal2-textarea block w-full max-w-full min-w-0 m-0 text-sm border-gray-300 rounded-lg resize-y" rows="2" maxlength="255" placeholder="Descreva o motivo desta alteração (mín. 3 caracteres)"></textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Guardar alterações',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const dataLimite = (document.getElementById('rh-edit-limite') as HTMLInputElement)?.value;
        const dataEvento = (document.getElementById('rh-edit-evento') as HTMLInputElement)?.value?.trim();
        if (!dataLimite || !dataEvento) {
          Swal.showValidationMessage('Fim das inscrições e data do evento são obrigatórios.');
          return null;
        }
        const dataEventoIso = this.toIsoApenasData(dataEvento);
        if (!dataEventoIso) {
          Swal.showValidationMessage('Data do evento inválida.');
          return null;
        }
        const dataInicioRaw = (document.getElementById('rh-edit-inicio') as HTMLInputElement)?.value || '';
        const motivo =
          (document.getElementById('rh-edit-motivo') as HTMLTextAreaElement | null)?.value?.trim() || '';
        if (motivo.length < 3) {
          Swal.showValidationMessage('Indique o motivo para auditoria (mínimo 3 caracteres).');
          return null;
        }
        return {
          titulo: (document.getElementById('rh-edit-titulo') as HTMLInputElement)?.value?.trim() || null,
          subtitulo: (document.getElementById('rh-edit-subtitulo') as HTMLInputElement)?.value?.trim() || null,
          descricao: (document.getElementById('rh-edit-descricao') as HTMLTextAreaElement)?.value?.trim() || null,
          banner: (document.getElementById('rh-edit-banner') as HTMLInputElement)?.value?.trim() || null,
          local: (document.getElementById('rh-edit-local') as HTMLInputElement)?.value?.trim() || null,
          status: (document.getElementById('rh-edit-status') as HTMLSelectElement).value,
          vagas: Number((document.getElementById('rh-edit-vagas') as HTMLInputElement)?.value || 1),
          permitir_lista_espera: (document.getElementById('rh-edit-fila') as HTMLInputElement)?.checked ?? true,
          auto_encerrar: (document.getElementById('rh-edit-auto-encerrar') as HTMLInputElement)?.checked ?? true,
          data_inicio_inscricao: dataInicioRaw ? this.toIso(dataInicioRaw) : '',
          data_limite_inscricao: this.toIso(dataLimite),
          data_evento: dataEventoIso,
          adminId: this.currentUser.id,
          motivo,
        };
      },
    }).then((r) => {
      if (!r.isConfirmed || !r.value) return;
      this.eventoRhService
        .updateEvento(Number(ev.id), {
          ...r.value,
        })
        .subscribe({
          next: () => {
            Swal.fire('OK', 'Evento atualizado.', 'success');
            this.carregar();
          },
          error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha.', 'error'),
        });
    });
  }

  editarEstado(ev: any) {
    if (!this.podeAlterarEstadoEventoRh(ev)) return;
    const st = String(ev?.status || '').toUpperCase().trim();
    const opts = (['ENCERRADO', 'REALIZADO', 'CANCELADO'] as const)
      .map(
        (s) =>
          `<option value="${s}" ${st === s ? 'selected' : ''}>${this.rotuloEstadoEventoRh(s)}</option>`,
      )
      .join('');
    Swal.fire({
      title: 'Alterar estado do evento',
      html: `
        <div class="max-w-full min-w-0 overflow-x-hidden box-border text-left">
        <p class="text-left text-sm text-gray-600 mb-2">O estado <strong>ABERTO</strong> não está disponível após encerramento; use <strong>Clonar</strong> para um novo evento.</p>
        <div class="text-left text-sm w-full max-w-full min-w-0">
          <label class="block text-xs font-bold text-gray-600 mb-1" for="rh-edit-status2">Estado</label>
          <select id="rh-edit-status2" class="swal2-input w-full max-w-full min-w-0">${opts}</select>
        </div>
        <div class="mt-3 text-left w-full max-w-full min-w-0">
          <label class="block text-xs font-bold text-gray-600 mb-1" for="rh-estado-motivo">Motivo (auditoria, obrigatório)</label>
          <textarea id="rh-estado-motivo" class="swal2-textarea block w-full max-w-full min-w-0 m-0 resize-y text-sm border border-gray-300 rounded-lg" rows="3" maxlength="255" placeholder="Mínimo 3 caracteres"></textarea>
        </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      focusConfirm: false,
      preConfirm: () => {
        const status = (document.getElementById('rh-edit-status2') as HTMLSelectElement).value;
        const motivo =
          (document.getElementById('rh-estado-motivo') as HTMLTextAreaElement | null)?.value?.trim() || '';
        if (motivo.length < 3) {
          Swal.showValidationMessage('Indique o motivo para auditoria (mínimo 3 caracteres).');
          return null;
        }
        return { status, motivo };
      },
    }).then((r) => {
      if (!r.isConfirmed || !r.value) return;
      this.eventoRhService
        .updateEvento(Number(ev.id), {
          status: r.value.status,
          motivo: r.value.motivo,
          adminId: this.currentUser.id,
        })
        .subscribe({
          next: () => {
            Swal.fire('OK', 'Estado atualizado.', 'success');
            this.carregar();
          },
          error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha.', 'error'),
        });
    });
  }

  excluir(ev: any) {
    Swal.fire({
      title: 'Excluir evento?',
      input: 'text',
      inputLabel: 'Motivo (auditoria, obrigatório)',
      inputPlaceholder: 'Descreva o motivo da exclusão (mínimo 3 caracteres)',
      inputAttributes: { maxlength: '255' },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      inputValidator: (value) => {
        const motivo = String(value || '').trim();
        if (motivo.length < 3) {
          return 'Indique o motivo da exclusão (mínimo 3 caracteres).';
        }
        return null;
      },
    }).then((r) => {
      if (!r.isConfirmed) return;
      const motivo = String(r.value || '').trim();
      this.eventoRhService.deleteEvento(Number(ev.id), this.currentUser.id, motivo).subscribe({
        next: () => {
          Swal.fire('Removido', 'Evento excluído.', 'success');
          this.carregar();
        },
        error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    });
  }

  presenca(row: any, status: 'PRESENTE' | 'FALTOU', eventoCtx: any) {
    const faltas = this.wtPassFaltasPermitidas;
    const eventos = this.wtPassEventosBloqueio;
    const tx = (n: number, singular: string, plural: string) =>
      n === 1 ? singular : plural;
    const regraFaltas =
      faltas === 1
        ? 'O bloqueio é aplicado já na 1ª falta.'
        : `O bloqueio é aplicado a partir de ${faltas} ${tx(faltas, 'falta acumulada', 'faltas acumuladas')}.`;
    const regraDuracao = `Duração do bloqueio: <strong>${eventos}</strong> ${tx(
      eventos,
      'evento do WT Pass',
      'eventos do WT Pass',
    )}.`;
    const nome = String(row?.nome_completo || '').trim() || '—';
    const aplicaBloqueio = status === 'FALTOU' && row.status === 'INSCRITO';
    const html = aplicaBloqueio
      ? `<div class="text-left">
           <p class="mb-2"><strong>${nome}</strong></p>
           <p class="text-sm">${regraFaltas}</p>
           <p class="text-sm">${regraDuracao}</p>
           <p class="text-xs text-gray-500 mt-2">Os parâmetros podem ser ajustados em Configurações → WT Pass.</p>
         </div>`
      : `<div class="text-left"><strong>${nome}</strong></div>`;
    Swal.fire({
      title: `Marcar ${status}?`,
      html,
      icon: 'question',
      showCancelButton: true,
    }).then((r) => {
      if (!r.isConfirmed || !eventoCtx) return;
      this.eventoRhService
        .marcarPresenca(Number(eventoCtx.id), Number(row.usuario_id), status, this.currentUser.id)
        .subscribe({
          next: () => {
            this.carregar();
            this.abrirModalInscritos(eventoCtx);
          },
          error: (err: any) => Swal.fire('Erro', err.error?.error || 'Falha.', 'error'),
        });
    });
  }
}

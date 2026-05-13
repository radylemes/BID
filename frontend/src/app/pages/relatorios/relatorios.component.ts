import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { EventoRhService } from '../../services/evento-rh.service';
import { MatchService } from '../../services/match.service';
import { exportWtPassInscritosXlsx } from '../../utils/export-wt-pass-inscritos-xlsx';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';
import { environment } from '../../../environments/environment';

type AbaRelatorio = 'wt_pass' | 'bids';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 bg-[var(--app-bg)] min-h-0 space-y-4">
      <div
        class="bg-[var(--color-bg-surface)] px-5 py-5 rounded-xl border border-[var(--app-border)]"
      >
        <!-- Indicadores / gráficos -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          <div
            class="rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 py-4 min-h-[180px] sm:min-h-[200px] flex flex-col"
          >
            <p class="text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wide">Eventos realizados</p>
            <p class="text-[10px] text-[var(--app-text-muted)] mt-0.5 mb-3">WT Pass (inscrições encerradas) · BIDs finalizados</p>
            <div *ngIf="loadingWt || loadingBids" class="flex-1 flex items-center justify-center text-xs text-[var(--app-text-muted)]">
              A carregar…
            </div>
            <div *ngIf="!(loadingWt || loadingBids)" class="flex-1 flex flex-col justify-end min-h-[120px]">
              <div class="flex items-end justify-center gap-10 sm:gap-16 min-h-[156px] px-2">
                <div class="flex flex-col items-center gap-2 w-16">
                  <div
                    class="w-full max-w-[48px] mx-auto rounded-t-md bg-teal-500 shadow-sm transition-[height] duration-300"
                    [style.height.px]="alturaBarraEventosWt()"
                  ></div>
                  <span class="text-2xl sm:text-3xl font-black text-[var(--app-text)] leading-none">{{ eventosRealizadosWt }}</span>
                  <span class="text-[10px] font-semibold text-[var(--app-text-muted)] text-center leading-tight">WT Pass</span>
                </div>
                <div class="flex flex-col items-center gap-2 w-16">
                  <div
                    class="w-full max-w-[48px] mx-auto rounded-t-md bg-indigo-500 shadow-sm transition-[height] duration-300"
                    [style.height.px]="alturaBarraEventosBid()"
                  ></div>
                  <span class="text-2xl sm:text-3xl font-black text-[var(--app-text)] leading-none">{{ eventosRealizadosBid }}</span>
                  <span class="text-[10px] font-semibold text-[var(--app-text-muted)] text-center leading-tight">BIDs</span>
                </div>
              </div>
            </div>
          </div>

          <div
            class="rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 py-4 min-h-[180px] sm:min-h-[200px] flex flex-col"
          >
            <p class="text-[11px] font-bold text-[var(--app-text-muted)] uppercase tracking-wide">Ingressos distribuídos</p>
            <p class="text-[10px] text-[var(--app-text-muted)] mt-0.5 mb-3">Sorteados em BIDs finalizados</p>
            <div *ngIf="loadingWt || loadingBids" class="flex-1 flex items-center justify-center text-xs text-[var(--app-text-muted)]">
              A carregar…
            </div>
            <div *ngIf="!(loadingWt || loadingBids)" class="flex-1 flex flex-col justify-center gap-4 min-h-[120px]">
              <p class="text-3xl sm:text-4xl font-black text-[var(--app-text)] tracking-tight tabular-nums">
                {{ totalIngressosDistribuidosBid | number }}
              </p>
              <div class="h-3 w-full rounded-full bg-[var(--app-border)] overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-300"
                  [style.width.%]="larguraBarraIngressosPct()"
                ></div>
              </div>
              <p class="text-[10px] text-[var(--app-text-muted)] leading-snug">
                Referência: {{ capIngressosReferencia | number }} (soma de prémios efetivos nos BIDs finalizados)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col lg:flex-row gap-4 min-h-[420px]">
        <!-- Lista -->
        <div
          class="lg:w-[42%] flex-shrink-0 bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl overflow-hidden flex flex-col"
        >
          <div class="p-3 border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] flex flex-row items-stretch gap-2 sm:gap-3 min-w-0">
            <ul
              class="flex shrink-0 text-sm font-medium text-center -space-x-px w-40 sm:w-44"
              role="tablist"
            >
              <li class="flex min-w-0 flex-1">
                <button
                  type="button"
                  (click)="setAba('wt_pass')"
                  [ngClass]="{
                    'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]':
                      aba === 'wt_pass',
                    'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] border-transparent':
                      aba !== 'wt_pass',
                  }"
                  class="inline-flex items-center justify-center w-full min-w-0 border rounded-l-lg px-2 sm:px-3 py-2 text-xs sm:text-sm transition"
                >
                  WT Pass
                </button>
              </li>
              <li class="flex min-w-0 flex-1">
                <button
                  type="button"
                  (click)="setAba('bids')"
                  [ngClass]="{
                    'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]':
                      aba === 'bids',
                    'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] border-transparent':
                      aba !== 'bids',
                  }"
                  class="inline-flex items-center justify-center w-full min-w-0 border rounded-r-lg px-2 sm:px-3 py-2 text-xs sm:text-sm transition"
                >
                  BIDs
                </button>
              </li>
            </ul>
            <input
              type="text"
              [(ngModel)]="busca"
              [placeholder]="aba === 'wt_pass' ? 'Buscar WT Pass…' : 'Buscar BID…'"
              class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-[var(--app-text)] text-sm"
            />
          </div>
          <div class="flex-1 overflow-auto max-h-[60vh] lg:max-h-[calc(100vh-220px)]">
            <ng-container *ngIf="aba === 'wt_pass'">
              <div *ngIf="loadingWt" class="p-8 text-center text-[var(--app-text-muted)]">A carregar…</div>
              <div
                *ngIf="!loadingWt && eventosWtFiltrados.length === 0"
                class="p-8 text-center text-[var(--app-text-muted)]"
              >
                Nenhum evento.
              </div>
              <table *ngIf="!loadingWt && eventosWtFiltrados.length > 0" class="w-full text-sm text-left table-fixed">
                <thead
                  class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] text-xs uppercase sticky top-0"
                >
                  <tr>
                    <th scope="col" class="w-16 px-2 py-2 font-semibold text-center align-middle">
                      <span class="sr-only">Imagem</span>
                    </th>
                    <th scope="col" class="px-3 py-2 font-semibold min-w-0">Título</th>
                    <th scope="col" class="w-[7.5rem] px-3 py-2 font-semibold whitespace-nowrap">Data evento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let ev of eventosWtFiltrados"
                    (click)="selecionarWt(ev)"
                    class="border-t border-[var(--app-border)] cursor-pointer hover:bg-[var(--app-nav-hover-bg)] transition align-middle h-16"
                    [style.background]="wtSelecionadoId === ev.id ? 'var(--app-nav-active-bg)' : null"
                  >
                    <td class="w-16 px-2 py-2 align-middle">
                      <div
                        class="w-14 h-14 mx-auto rounded-lg overflow-hidden border border-[var(--app-border)] bg-[var(--color-bg-surface)] shrink-0"
                      >
                        <img
                          [src]="getWtListaBannerUrl(ev)"
                          alt=""
                          class="w-full h-full object-cover"
                          (error)="$any($event.target).src = 'assets/placeholder.jpg'"
                        />
                      </div>
                    </td>
                    <td class="min-w-0 px-3 py-2 align-middle">
                      <span class="block text-[var(--app-text)] font-medium truncate" [title]="ev.titulo || '—'">{{
                        ev.titulo || '—'
                      }}</span>
                    </td>
                    <td class="w-[7.5rem] px-3 py-2 align-middle whitespace-nowrap tabular-nums text-[var(--app-text-muted)]">
                      {{ formatarDataCurta(ev.data_evento) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </ng-container>

            <ng-container *ngIf="aba === 'bids'">
              <div *ngIf="loadingBids" class="p-8 text-center text-[var(--app-text-muted)]">A carregar…</div>
              <div
                *ngIf="!loadingBids && matchesFiltrados.length === 0"
                class="p-8 text-center text-[var(--app-text-muted)]"
              >
                Nenhum BID.
              </div>
              <table *ngIf="!loadingBids && matchesFiltrados.length > 0" class="w-full text-sm text-left table-fixed">
                <thead
                  class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] text-xs uppercase sticky top-0"
                >
                  <tr>
                    <th scope="col" class="w-16 px-2 py-2 font-semibold text-center align-middle">
                      <span class="sr-only">Imagem</span>
                    </th>
                    <th scope="col" class="px-3 py-2 font-semibold min-w-0">Título</th>
                    <th scope="col" class="w-[7.5rem] px-3 py-2 font-semibold whitespace-nowrap">Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    *ngFor="let m of matchesFiltrados"
                    (click)="selecionarBid(m)"
                    class="border-t border-[var(--app-border)] cursor-pointer hover:bg-[var(--app-nav-hover-bg)] transition align-middle h-16"
                    [style.background]="bidSelecionadoId === m.id ? 'var(--app-nav-active-bg)' : null"
                  >
                    <td class="w-16 px-2 py-2 align-middle">
                      <div
                        class="w-14 h-14 mx-auto rounded-lg overflow-hidden border border-[var(--app-border)] bg-[var(--color-bg-surface)] shrink-0"
                      >
                        <img
                          [src]="getBidListaBannerUrl(m)"
                          alt=""
                          class="w-full h-full object-cover"
                          (error)="$any($event.target).src = 'assets/banner-placeholder.jpg'"
                        />
                      </div>
                    </td>
                    <td class="min-w-0 px-3 py-2 align-middle">
                      <span class="block text-[var(--app-text)] font-medium truncate" [title]="m.titulo || '—'">{{
                        m.titulo || '—'
                      }}</span>
                    </td>
                    <td class="w-[7.5rem] px-3 py-2 align-middle whitespace-nowrap tabular-nums text-[var(--app-text-muted)]">
                      {{ formatarDataCurta(m.data_jogo) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </ng-container>
          </div>
        </div>

        <!-- Detalhe -->
        <div
          class="flex-1 min-w-0 bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl p-4 lg:p-5 flex flex-col"
        >
          <ng-container *ngIf="aba === 'wt_pass'">
            <div *ngIf="!wtSelecionadoId" class="text-[var(--app-text-muted)] text-sm py-8 text-center">
              Selecione um evento WT Pass na lista.
            </div>
            <div *ngIf="wtSelecionadoId && loadingDetailWt" class="text-[var(--app-text-muted)] text-sm py-8 text-center">
              A carregar detalhe…
            </div>
            <ng-container *ngIf="wtSelecionadoId && !loadingDetailWt && wtDetalhe">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h3 class="text-base font-bold text-[var(--app-text)]">{{ wtDetalhe.titulo || '—' }}</h3>
                  <p class="text-xs text-[var(--app-text-muted)] mt-1">
                    {{ wtDetalhe.local || '—' }} · {{ formatarDataCurta(wtDetalhe.data_evento) }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="exportarWtPass()"
                  class="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Exportar XLSX
                </button>
              </div>
              <dl class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-4 border-b border-[var(--app-border)] pb-4">
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Início inscrições</dt>
                  <dd class="text-[var(--app-text)]">{{ formatarDataHora(wtDetalhe.data_inicio_inscricao) }}</dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Limite inscrições</dt>
                  <dd class="text-[var(--app-text)]">{{ formatarDataHora(wtDetalhe.data_limite_inscricao) }}</dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Vagas / ocupadas</dt>
                  <dd class="text-[var(--app-text)]">
                    {{ wtDetalhe.vagas ?? '—' }} / {{ wtDetalhe.ocupadas ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Status</dt>
                  <dd class="text-[var(--app-text)]">{{ wtDetalhe.status || '—' }}</dd>
                </div>
              </dl>
              <h4 class="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">Inscritos</h4>
              <div class="overflow-x-auto flex-1 min-h-0">
                <table class="w-full text-xs text-left">
                  <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)]">
                    <tr>
                      <th class="px-2 py-2">#</th>
                      <th class="px-2 py-2">Nome</th>
                      <th class="px-2 py-2">Setor</th>
                      <th class="px-2 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let i of wtInscritosExibicao" class="border-t border-[var(--app-border)]">
                      <td class="px-2 py-1.5">{{ i.posicao_exibicao }}</td>
                      <td class="px-2 py-1.5">{{ i.nome_completo }}</td>
                      <td class="px-2 py-1.5">{{ i.setor_nome || '—' }}</td>
                      <td class="px-2 py-1.5">{{ i.status }}</td>
                    </tr>
                  </tbody>
                </table>
                <p *ngIf="wtInscritosExibicao.length === 0" class="text-[var(--app-text-muted)] text-sm py-2">
                  Sem inscrições ativas.
                </p>
              </div>
            </ng-container>
          </ng-container>

          <ng-container *ngIf="aba === 'bids'">
            <div *ngIf="!bidSelecionadoId" class="text-[var(--app-text-muted)] text-sm py-8 text-center">
              Selecione um BID na lista.
            </div>
            <div *ngIf="bidSelecionadoId && loadingDetailBid" class="text-[var(--app-text-muted)] text-sm py-8 text-center">
              A carregar relatórios…
            </div>
            <ng-container *ngIf="bidSelecionadoId && !loadingDetailBid && matchSelecionado">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h3 class="text-base font-bold text-[var(--app-text)]">{{ matchSelecionado.titulo || '—' }}</h3>
                  <p class="text-xs text-[var(--app-text-muted)] mt-1">
                    {{ matchSelecionado.nome_grupo || '—' }} · {{ formatarDataCurta(matchSelecionado.data_jogo) }}
                  </p>
                </div>
                <button
                  type="button"
                  (click)="exportarBid()"
                  class="shrink-0 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Exportar XLSX
                </button>
              </div>
              <dl class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4 border-b border-[var(--app-border)] pb-4">
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Status</dt>
                  <dd class="text-[var(--app-text)]">{{ matchSelecionado.status || '—' }}</dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Prémios</dt>
                  <dd class="text-[var(--app-text)]">{{ matchSelecionado.quantidade_premios_efetiva ?? matchSelecionado.quantidade_premios ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Apostas</dt>
                  <dd class="text-[var(--app-text)]">{{ matchSelecionado.total_apostas_realizadas ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-[var(--app-text-muted)] font-semibold">Limite apostas</dt>
                  <dd class="text-[var(--app-text)]">{{ formatarDataHora(matchSelecionado.data_limite_aposta) }}</dd>
                </div>
              </dl>
              <h4 class="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">Apostas</h4>
              <div class="overflow-x-auto max-h-48 mb-4">
                <table class="w-full text-xs text-left">
                  <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] sticky top-0">
                    <tr>
                      <th class="px-2 py-2">Data</th>
                      <th class="px-2 py-2">Participante</th>
                      <th class="px-2 py-2">Lance</th>
                      <th class="px-2 py-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let a of bidApostas" class="border-t border-[var(--app-border)]">
                      <td class="px-2 py-1.5 whitespace-nowrap">{{ formatarDataHora(a.data_aposta) }}</td>
                      <td class="px-2 py-1.5">{{ a.nome_completo }}</td>
                      <td class="px-2 py-1.5">{{ a.valor_pago }}</td>
                      <td class="px-2 py-1.5">{{ rotuloStatusAposta(a.status) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h4 class="text-xs font-bold text-[var(--app-text-muted)] uppercase tracking-wider mb-2">Ganhadores / retirada</h4>
              <div class="overflow-x-auto max-h-48">
                <table class="w-full text-xs text-left">
                  <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] sticky top-0">
                    <tr>
                      <th class="px-2 py-2">Titular</th>
                      <th class="px-2 py-2">Setor</th>
                      <th class="px-2 py-2">Data da retirada</th>
                      <th class="px-2 py-2">Retirante</th>
                      <th class="px-2 py-2">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let g of bidGanhadores" class="border-t border-[var(--app-border)]">
                      <td class="px-2 py-1.5">{{ g.titular_nome }}</td>
                      <td class="px-2 py-1.5">{{ g.titular_setor || '—' }}</td>
                      <td class="px-2 py-1.5 whitespace-nowrap">{{ formatarDataHora(g.data_checkin) }}</td>
                      <td class="px-2 py-1.5">{{ g.retirante_nome || '—' }}</td>
                      <td class="px-2 py-1.5">{{ g.checkin != null ? g.checkin : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>
          </ng-container>
        </div>
      </div>
    </div>
  `,
})
export class RelatoriosComponent implements OnInit {
  aba: AbaRelatorio = 'wt_pass';
  busca = '';

  eventosWt: any[] = [];
  matches: any[] = [];

  loadingWt = false;
  loadingBids = false;
  loadingDetailWt = false;
  loadingDetailBid = false;

  wtSelecionadoId: number | null = null;
  wtDetalhe: any | null = null;

  bidSelecionadoId: number | null = null;
  matchSelecionado: any | null = null;
  bidApostas: any[] = [];
  bidGanhadores: any[] = [];

  private currentUser: { id?: number } = {};
  private wtCarregado = false;
  private bidsCarregado = false;

  constructor(
    private eventoRhService: EventoRhService,
    private matchService: MatchService,
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarWtSeNecessario();
    if (this.currentUser?.id) {
      this.carregarBidsSeNecessario();
    }
  }

  get eventosWtFiltrados(): any[] {
    const q = (this.busca || '').trim().toLowerCase();
    const base = this.eventosWt.filter((ev) => this.isWtPassEncerrado(ev));
    const filtered = !q
      ? base
      : base.filter((ev) => {
          const t = String(ev.titulo || '').toLowerCase();
          const l = String(ev.local || '').toLowerCase();
          const d = String(ev.data_evento || '').toLowerCase();
          return t.includes(q) || l.includes(q) || d.includes(q);
        });
    return [...filtered].sort((a, b) => {
      const ta = this.parseDate(a?.data_evento)?.getTime() ?? 0;
      const tb = this.parseDate(b?.data_evento)?.getTime() ?? 0;
      return tb - ta;
    });
  }

  get matchesFiltrados(): any[] {
    const q = (this.busca || '').trim().toLowerCase();
    const encerrados = this.matches.filter((m) => this.isBidEncerrado(m));
    const sorted = [...encerrados].sort((a, b) => {
      const ta = this.parseDate(a?.data_jogo)?.getTime() ?? 0;
      const tb = this.parseDate(b?.data_jogo)?.getTime() ?? 0;
      return tb - ta;
    });
    if (!q) return sorted;
    return sorted.filter((m) => {
      const t = String(m.titulo || '').toLowerCase();
      const g = String(m.nome_grupo || '').toLowerCase();
      return t.includes(q) || g.includes(q);
    });
  }

  get wtInscritosExibicao(): any[] {
    const rows = (this.wtDetalhe?.inscritos as any[]) || [];
    return rows.map((r, idx) => ({
      ...r,
      posicao_exibicao: idx + 1,
    }));
  }

  /** WT Pass: mesma base que a lista do relatório (`isWtPassEncerrado`). */
  get eventosRealizadosWt(): number {
    return this.eventosWt.filter((ev) => this.isWtPassEncerrado(ev)).length;
  }

  /** BIDs com leilão finalizado. */
  get eventosRealizadosBid(): number {
    return this.matches.filter((m) => this.isBidEncerrado(m)).length;
  }

  /** Total de ingressos sorteados nos BIDs finalizados. */
  get totalIngressosDistribuidosBid(): number {
    return this.matches
      .filter((m) => this.isBidEncerrado(m))
      .reduce((sum, m) => sum + Number(m?.ingressos_sorteados ?? 0), 0);
  }

  /** Capacidade de referência para a barra (prémios efetivos totais nos BIDs finalizados). */
  get capIngressosReferencia(): number {
    const finals = this.matches.filter((m) => this.isBidEncerrado(m));
    const pool = finals.reduce(
      (s, m) => s + Number(m?.quantidade_premios_efetiva ?? m?.quantidade_premios ?? 0),
      0,
    );
    return Math.max(pool, this.totalIngressosDistribuidosBid, 1);
  }

  larguraBarraIngressosPct(): number {
    const t = this.totalIngressosDistribuidosBid;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((t / this.capIngressosReferencia) * 100));
  }

  alturaBarraEventosWt(): number {
    const max = Math.max(this.eventosRealizadosWt, this.eventosRealizadosBid, 1);
    return this.barHeightPx(this.eventosRealizadosWt, max, 96);
  }

  alturaBarraEventosBid(): number {
    const max = Math.max(this.eventosRealizadosWt, this.eventosRealizadosBid, 1);
    return this.barHeightPx(this.eventosRealizadosBid, max, 96);
  }

  private barHeightPx(val: number, maxVal: number, capPx: number): number {
    const m = Math.max(maxVal, 1);
    return Math.max(8, Math.round((val / m) * capPx));
  }

  setAba(aba: AbaRelatorio): void {
    this.aba = aba;
    this.busca = '';
  }

  /** Miniatura na lista (WT Pass): mesmo critério que o gestor de eventos. */
  getWtListaBannerUrl(ev: { banner?: string | null }): string {
    if (!ev?.banner) return 'assets/placeholder.jpg';
    if (String(ev.banner).startsWith('http')) return String(ev.banner);
    return uploadsPublicUrl(String(ev.banner));
  }

  /** Miniatura na lista (BID): URLs, ficheiro em uploads ou banner na BD. */
  getBidListaBannerUrl(m: { banner?: string | null; id?: number }): string {
    if (!m?.banner) return 'assets/banner-placeholder.jpg';
    if (String(m.banner).startsWith('http')) return String(m.banner);
    if (m.banner === 'db' && m.id) return `${environment.apiUri}/matches/${m.id}/banner`;
    return uploadsPublicUrl(String(m.banner));
  }

  private carregarWtSeNecessario(): void {
    if (this.wtCarregado) return;
    this.loadingWt = true;
    this.eventoRhService.listAdminTodos().subscribe({
      next: (list) => {
        this.eventosWt = Array.isArray(list) ? list : [];
        this.wtCarregado = true;
        this.loadingWt = false;
      },
      error: (err) => {
        this.loadingWt = false;
        Swal.fire('Erro', err.error?.error || 'Não foi possível carregar eventos WT Pass.', 'error');
      },
    });
  }

  private carregarBidsSeNecessario(): void {
    if (this.bidsCarregado) return;
    const uid = this.currentUser?.id;
    if (!uid) {
      this.loadingBids = false;
      return;
    }
    this.loadingBids = true;
    this.matchService.getMatches(uid).subscribe({
      next: (data) => {
        this.matches = (data || []).map((m: any) => ({
          ...m,
          total_apostas_realizadas: Number(m?.total_apostas_realizadas ?? m?.tickets_comprados ?? 0),
        }));
        this.bidsCarregado = true;
        this.loadingBids = false;
      },
      error: () => {
        this.loadingBids = false;
        Swal.fire('Erro', 'Não foi possível carregar BIDs.', 'error');
      },
    });
  }

  selecionarWt(ev: any): void {
    const id = Number(ev?.id);
    if (!id || !this.isWtPassEncerrado(ev)) return;
    this.wtSelecionadoId = id;
    this.loadingDetailWt = true;
    this.wtDetalhe = null;
    this.eventoRhService.getEvento(id).subscribe({
      next: (det) => {
        this.wtDetalhe = det;
        this.loadingDetailWt = false;
      },
      error: (err) => {
        this.loadingDetailWt = false;
        Swal.fire('Erro', err.error?.error || 'Falha ao carregar evento.', 'error');
      },
    });
  }

  selecionarBid(m: any): void {
    const id = Number(m?.id);
    if (!id || !this.isBidEncerrado(m)) return;
    this.bidSelecionadoId = id;
    this.matchSelecionado = m;
    this.loadingDetailBid = true;
    this.bidApostas = [];
    this.bidGanhadores = [];
    forkJoin({
      apostas: this.matchService.getBetsReport(id),
      ganhadores: this.matchService.getWinnersReport(id),
    }).subscribe({
      next: ({ apostas, ganhadores }) => {
        this.bidApostas = Array.isArray(apostas) ? apostas : [];
        this.bidGanhadores = Array.isArray(ganhadores) ? ganhadores : [];
        this.loadingDetailBid = false;
      },
      error: () => {
        this.loadingDetailBid = false;
        Swal.fire('Erro', 'Falha ao carregar relatórios do BID.', 'error');
      },
    });
  }

  exportarWtPass(): void {
    if (!this.wtDetalhe) return;
    const rows = this.wtInscritosExibicao;
    exportWtPassInscritosXlsx(this.wtDetalhe, rows);
  }

  exportarBid(): void {
    if (!this.matchSelecionado) return;
    const m = this.matchSelecionado;
    const tituloSeguro = String(m.titulo || 'bid')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 50);

    const headAp = ['Data e hora', 'Participante', 'Lance (pts)', 'Resultado'];
    const linhasAp = (this.bidApostas || []).map((row: any) => [
      this.fmtDataExcel(row.data_aposta),
      row.nome_completo ?? '',
      row.valor_pago ?? '',
      this.rotuloStatusAposta(String(row.status ?? '')),
    ]);
    const wsAp = XLSX.utils.aoa_to_sheet([headAp, ...linhasAp]);

    const headGa = ['Titular', 'Setor', 'Data da retirada', 'Retirante', 'CPF retirante', 'Check-in'];
    const linhasGa = (this.bidGanhadores || []).map((g: any) => [
      g.titular_nome ?? '',
      g.titular_setor ?? '',
      this.fmtDataExcel(g.data_checkin),
      g.retirante_nome ?? '',
      g.retirante_cpf ?? '',
      g.checkin != null ? String(g.checkin) : '',
    ]);
    const wsGa = XLSX.utils.aoa_to_sheet([headGa, ...linhasGa]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAp, 'Apostas');
    XLSX.utils.book_append_sheet(wb, wsGa, 'Ganhadores');
    XLSX.writeFile(wb, `BID_relatorio_${m.id}_${tituloSeguro}.xlsx`);
  }

  formatarDataCurta(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
    } catch {
      return '—';
    }
  }

  formatarDataHora(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }

  private fmtDataExcel(iso: string | null | undefined): string {
    return this.formatarDataHora(iso);
  }

  rotuloStatusAposta(s: string): string {
    if (s === 'GANHOU') return 'Ganhou';
    if (s === 'PERDEU') return 'Perdeu';
    if (s === 'PENDENTE') return 'Pendente';
    return s || '—';
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  /**
   * WT Pass: considera encerrado se estado na BD é final (ENCERRADO, REALIZADO, CANCELADO)
   * ou ainda ABERTO mas já após o fim do período de inscrições (alinhado ao pill «Fechado» do gestor).
   */
  private isWtPassEncerrado(ev: any): boolean {
    const st = String(ev?.status ?? '')
      .toUpperCase()
      .trim();
    if (st === 'ENCERRADO' || st === 'REALIZADO' || st === 'CANCELADO') return true;
    if (st === 'ABERTO') {
      const buf = 60_000;
      const lim = ev?.data_limite_inscricao ? new Date(ev.data_limite_inscricao).getTime() : NaN;
      if (!Number.isNaN(lim) && Date.now() > lim + buf) return true;
    }
    return false;
  }

  /** BID encerrado = leilão finalizado na BD. */
  private isBidEncerrado(m: any): boolean {
    return String(m?.status ?? '')
      .toUpperCase()
      .trim() === 'FINALIZADA';
  }
}

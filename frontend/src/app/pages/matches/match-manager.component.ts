import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, forkJoin } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { SettingsService, ExportPdfStyle } from '../../services/settings.service';
import { EmailService } from '../../services/email.service';
import { EventoRhService } from '../../services/evento-rh.service';
import { environment } from '../../../environments/environment';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

/** Dados da Fase 1 do wizard Novo BID / Clonar. */
interface MatchWizardDadosBid {
  titulo: string;
  subtitulo: string;
  setor_evento_id: string;
  local: string;
  banner: string;
  link_extra: string;
  informacoes_extras: string;
  data_jogo_local: string;
  data_inicio_apostas_local: string;
  data_limite_aposta_local: string;
  data_apuracao_local: string;
}

interface MatchWizardGruposSel {
  publico: boolean;
  publico_qtd: number;
  ids: number[];
  quantidades: Record<number, number>;
}

interface MatchWizardWtPass {
  ativo: boolean;
  vagas: number;
  permitir_lista_espera: boolean;
  data_inicio_inscricao_local: string;
  data_limite_inscricao_local: string;
  data_evento_yyyy_mm_dd: string;
}

interface MatchWizardState {
  dados: MatchWizardDadosBid;
  grupos: MatchWizardGruposSel;
  wtPass: MatchWizardWtPass;
  /** Se já aplicámos defaults do BID aos campos WT Pass (não sobrescrever ao voltar da Fase 3). */
  wtPassSeeded: boolean;
}

@Component({
  selector: 'app-match-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 bg-[var(--app-bg)] min-h-0">
      <div
        class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-[var(--color-bg-surface)] p-6 rounded-xl border border-[var(--app-border)]"
      >
        <div>
          <h2 class="text-3xl font-extrabold text-[var(--app-text)] tracking-tight">Gerenciar BIDs</h2>
          <p class="text-sm text-[var(--app-text-muted)] font-medium">
            Total de {{ matches.length }} BIDs cadastrados
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="criarSetor()"
            class="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2.5 rounded-lg font-bold text-sm transition-all border border-indigo-200"
          >
            <img
              src="assets/allianz_stadium_seat_realistic.png"
              alt=""
              class="w-10 h-10 object-contain"
            />
            Criar setor
          </button>
          <button
            (click)="criarJogo()"
            class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md text-sm transition-all active:scale-95"
          >
            <img
              src="assets/allianz_ticket_blue_cartoon.png"
              alt=""
              class="w-10 h-10 object-contain inline-block align-middle"
            />
            Novo BID
          </button>
        </div>
      </div>

      <div class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)]">
        <div *ngIf="loading" class="p-8 text-center text-[var(--app-text-muted)]">
          <span class="animate-pulse">Carregando BIDs...</span>
        </div>
        <div *ngIf="!loading && matches.length === 0" class="p-8 text-center text-[var(--app-text-muted)]">
          Nenhum bid encontrado. Crie um novo!
        </div>

        <div
          *ngIf="!loading && matches.length > 0"
          class="border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 pt-4 pb-4"
        >
          <div class="sm:hidden">
            <label for="tabs-bids" class="sr-only">Aba de BIDs</label>
            <select
              id="tabs-bids"
              [value]="abaAtiva"
              (change)="setAba($any($event.target).value)"
              class="block w-full px-3 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="atuais">Em andamento ({{ matchesAtuaisCount }})</option>
              <option value="anteriores">Anteriores ({{ matchesAnterioresCount }})</option>
            </select>
          </div>
          <ul class="hidden sm:flex text-sm font-medium text-center -space-x-px" role="tablist">
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="abaAtiva === 'atuais' ? 'page' : null"
                (click)="setAba('atuais')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtiva === 'atuais',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaAtiva !== 'atuais'
                }"
                class="inline-flex items-center justify-center w-full border rounded-l-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                Em andamento ({{ matchesAtuaisCount }})
              </button>
            </li>
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="abaAtiva === 'anteriores' ? 'page' : null"
                (click)="setAba('anteriores')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtiva === 'anteriores',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaAtiva !== 'anteriores'
                }"
                class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/></svg>
                Anteriores ({{ matchesAnterioresCount }})
              </button>
            </li>
          </ul>
          <div class="mt-3 pt-3 border-t border-[var(--app-border)]">
            <label for="busca-bids" class="sr-only">Buscar BIDs</label>
            <div class="relative">
              <span
                class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--app-text-muted)]"
                aria-hidden="true"
              >
                <svg class="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </span>
              <input
                id="busca-bids"
                type="search"
                name="buscaBids"
                [(ngModel)]="filtroBusca"
                autocomplete="off"
                placeholder="Buscar por título, local, grupo, setor, status ou datas…"
                class="block w-full rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] py-2.5 pl-10 pr-10 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
              <button
                *ngIf="filtroBusca.trim()"
                type="button"
                (click)="filtroBusca = ''"
                class="absolute inset-y-0 right-0 flex items-center pr-2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] rounded-r-lg px-2 text-xs font-medium"
                title="Limpar busca"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        <div
          *ngIf="!loading && matches.length > 0 && matchesNaAba.length > 0"
          class="border-t border-[var(--app-border)] -mx-2 sm:mx-0 px-2 sm:px-0 overflow-x-auto overflow-y-visible"
        >
          <table class="min-w-[760px] sm:min-w-[980px] w-full text-sm">
            <thead class="sticky top-0 z-20">
              <tr class="bg-[var(--color-bg-surface-alt)] border-b border-[var(--app-border)]">
                <th
                  class="min-w-[220px] sm:min-w-[280px] sm:w-auto sticky left-0 z-20 bg-[var(--color-bg-surface-alt)] px-3 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider shadow-[4px_0_6px_-2px_rgba(0,0,0,0.15)] align-middle"
                >
                  BID
                </th>
                <th
                  class="w-[200px] px-3 sm:px-4 py-3 sm:py-3.5 text-center text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider align-middle leading-tight"
                  title="Ingressos disponíveis / Apostas realizadas"
                >
                  Ingr. / Apostas
                </th>
                <th
                  class="w-[170px] px-3 sm:px-4 py-3 sm:py-3.5 text-center text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider whitespace-nowrap align-middle"
                >
                  Datas
                </th>
                <th class="min-w-[120px] w-[120px] px-2 sm:px-3 py-3 sm:py-3.5 text-center align-middle">
                  <div
                    #statusFiltroHost
                    class="relative inline-flex items-center justify-center gap-1.5"
                  >
                    <span
                      class="text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider whitespace-nowrap"
                    >Status</span>
                    <button
                      type="button"
                      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-bg-surface-alt)]"
                      [attr.aria-expanded]="menuFiltroStatusAberto"
                      aria-haspopup="true"
                      aria-label="Filtrar por status"
                      (click)="toggleFiltroStatusMenu($event)"
                    >
                      <svg
                        class="h-3.5 w-3.5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
                <th
                  class="w-[210px] px-3 sm:px-4 py-3 sm:py-3.5 text-right text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider whitespace-nowrap align-middle"
                >
                  Ações
                </th>
                <th
                  class="w-[260px] px-3 sm:px-4 py-3 sm:py-3.5 text-right text-xs font-semibold text-[var(--app-text-muted)] uppercase tracking-wider whitespace-nowrap align-middle"
                >
                  Relatórios
                </th>
              </tr>
            </thead>
            <tbody class="bg-[var(--color-bg-surface)] divide-y divide-[var(--app-border)]">
              <tr
                *ngIf="matchesNaAba.length > 0 && displayedMatches.length === 0"
                class="bg-[var(--color-bg-surface)]"
              >
                <td
                  colspan="6"
                  class="px-6 py-12 text-center text-sm text-[var(--app-text-muted)]"
                >
                  Nenhum BID corresponde aos filtros.
                </td>
              </tr>
              <tr *ngFor="let m of displayedMatches" class="group hover:bg-[var(--app-nav-hover-bg)] transition-colors">
                <td class="min-w-[220px] sm:min-w-[280px] sm:w-auto sticky left-0 z-10 bg-[var(--color-bg-surface)] group-hover:bg-[var(--app-nav-hover-bg)] px-3 sm:px-5 py-3 sm:py-4 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.08)] align-middle">
                  <div class="flex items-start gap-3 min-w-0">
                    <div
                      class="w-14 h-14 rounded-lg overflow-hidden border border-[var(--app-border)] bg-[var(--color-bg-surface)] shrink-0 shadow-sm"
                    >
                      <img
                        [src]="getBannerThumbUrl(m)"
                        [alt]="m.titulo || 'Banner do BID'"
                        loading="lazy"
                        class="w-full h-full object-cover"
                        (error)="$any($event.target).src = 'assets/banner-placeholder.jpg'"
                      />
                    </div>
                    <div class="flex flex-col justify-center min-h-[52px] min-w-0 flex-1">
                    <div class="font-semibold text-[var(--app-text)] truncate" [title]="m.titulo">{{ m.titulo }}</div>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--app-text-muted)] mt-1">
                      <span
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                      >
                        {{ m.nome_grupo || 'Público' }}
                      </span>
                      <span class="inline-flex items-center gap-1 shrink-0">
                        <span class="text-rose-500">📍</span>
                        {{ m.local || 'Local não definido' }}
                      </span>
                      <span
                        *ngIf="m.setor_evento_nome"
                        class="inline-flex items-center gap-1 text-indigo-600 font-medium shrink-0"
                        ><span aria-hidden="true">🪑</span> {{ m.setor_evento_nome }}</span
                      >
                    </div>
                    </div>
                  </div>
                </td>
                <td class="px-3 sm:px-4 py-3 sm:py-4 align-middle">
                  <div class="flex items-center justify-center min-h-[52px] gap-2 flex-wrap">
                    <span
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                      [title]="
                        (m.ingressos_transferidos || 0) > 0
                          ? (m.quantidade_premios_efetiva ?? m.quantidade_premios ?? 1) +
                            ' orig., ' +
                            m.ingressos_transferidos +
                            ' transf.'
                          : 'Ingressos'
                      "
                      ><img
                        src="assets/allianz_ticket_blue_cartoon.png"
                        alt=""
                        class="w-4 h-4 object-contain inline-block"
                        aria-hidden="true"
                      />
                      {{
                        m.quantidade_premios_restante ??
                          m.quantidade_premios_efetiva ??
                          m.quantidade_premios ??
                          1
                      }}</span
                    >
                    <span class="text-[var(--app-text-muted)] text-xs shrink-0">/</span>
                    <span
                      *ngIf="!isApuracaoEncerrada(m) && m.status !== 'ABERTA' && (m.ingressos_nao_sorteados || 0) > 0"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                      title="Apostas realizadas"
                      ><span aria-hidden="true">🎟️</span> {{ m.ingressos_nao_sorteados }}</span
                    >
                    <span
                      *ngIf="isPrazoApostasEncerrado(m)"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0"
                      title="Apostas realizadas"
                      ><span aria-hidden="true">🧾</span> {{ m.total_apostas_realizadas }}</span
                    >
                    <span
                      *ngIf="!isPrazoApostasEncerrado(m) && (m.status === 'ABERTA' || (m.ingressos_nao_sorteados || 0) === 0)"
                      class="text-[var(--app-text-muted)] text-xs shrink-0"
                      title="Apostas realizadas"
                      >—</span
                    >
                  </div>
                </td>
                <td class="px-3 sm:px-4 py-3 sm:py-4 align-middle">
                  <div class="flex items-center justify-center min-h-[52px]">
                  <div class="flex flex-col gap-0.5 text-xs whitespace-nowrap items-center">
                    <span
                      class="text-emerald-600 font-medium flex items-center justify-center gap-1"
                      ><span aria-hidden="true">🟢</span>
                      {{ m.data_inicio_apostas | date: 'dd/MM HH:mm' }}</span
                    >
                    <span class="text-rose-500 font-medium flex items-center justify-center gap-1"
                      ><span aria-hidden="true">🔴</span>
                      {{ m.data_limite_aposta | date: 'dd/MM HH:mm' }}</span
                    >
                    <span
                      class="text-violet-600 font-medium flex items-center justify-center gap-1"
                      [title]="m.data_apuracao ? 'Data de apuração' : 'Data de apuração não definida'"
                      ><span aria-hidden="true">🟣</span>
                      {{ m.data_apuracao ? (m.data_apuracao | date: 'dd/MM HH:mm') : 'Sem apuração' }}</span
                    >
                  </div>
                  </div>
                </td>
                <td class="px-3 sm:px-4 py-3 sm:py-4 align-middle">
                  <div class="flex items-center justify-center min-h-[52px]">
                  <span
                    [ngClass]="{
                      'bg-emerald-500/10 text-emerald-700 border-emerald-300':
                        m.status === 'ABERTA',
                      'bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] border-[var(--app-border)]': m.status !== 'ABERTA',
                    }"
                    class="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border shrink-0"
                    >{{ m.status }}</span
                  >
                  </div>
                </td>
                <td class="px-3 sm:px-4 py-3 sm:py-4 align-middle">
                  <div class="flex items-center justify-end min-h-[52px] gap-2 flex-wrap">
                    <button
                      (click)="canEditMatch(m) && editarJogo(m)"
                      [disabled]="!canEditMatch(m)"
                      [class.opacity-50]="!canEditMatch(m)"
                      [class.cursor-not-allowed]="!canEditMatch(m)"
                      class="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition disabled:hover:bg-blue-50 shrink-0"
                      [title]="getEditTooltip(m)"
                    >
                      ✏️
                    </button>
                    <button
                      (click)="clonarJogo(m)"
                      class="p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-100 transition shrink-0"
                      title="Clonar"
                    >
                      📑
                    </button>
                    <button
                      *ngIf="m.status === 'ABERTA'"
                      (click)="finalizarJogo(m)"
                      class="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition shrink-0"
                      title="Encerrar"
                    >
                      🏁
                    </button>
                    <button
                      (click)="excluirJogo(m)"
                      class="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 transition shrink-0"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                    <span class="w-px h-5 bg-[var(--app-border)] mx-0.5 shrink-0" *ngIf="m.status !== 'ABERTA'"></span>
                    <button
                      *ngIf="m.status !== 'ABERTA' && (m.ingressos_nao_sorteados || 0) > 0"
                      (click)="redistribuir(m)"
                      class="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition shrink-0"
                      title="Encaminhar sobresalentes"
                    >
                      🔄
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="acrescentarIngressos(m)"
                      class="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100 transition shrink-0"
                      title="Acrescentar ingressos"
                    >
                      ➕
                    </button>
                  </div>
                </td>
                <td class="px-3 sm:px-4 py-3 sm:py-4 align-middle">
                  <div class="flex items-center justify-end min-h-[52px] gap-2 flex-wrap">
                    <button
                      (click)="dispararEmail(m)"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition shrink-0"
                      title="Enviar e-mail"
                    >
                      ✉️ E-mail
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="baixarRelatorio(m, 'pdf')"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition shrink-0"
                      title="PDF lista de portaria (ganhadores)"
                    >
                      PDF
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="baixarPdfResultadoApostas(m)"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition shrink-0"
                      title="PDF com todas as apostas (data e hora)"
                    >
                      Apostas
                    </button>
                    <button
                      *ngIf="m.status !== 'ABERTA'"
                      (click)="baixarRelatorio(m, 'excel')"
                      class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition shrink-0"
                      title="Excel"
                    >
                      Excel
                    </button>
                    <span *ngIf="m.status === 'ABERTA'" class="text-[var(--app-text-muted)] text-xs shrink-0">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          *ngIf="menuFiltroStatusAberto"
          #statusFiltroPanel
          class="fixed z-[200] rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] py-1 text-left shadow-lg"
          [style.top.px]="statusFiltroPanelTop"
          [style.left.px]="statusFiltroPanelLeft"
          [style.minWidth.px]="statusFiltroPanelMinWidth"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]"
            [class.font-semibold]="!filtroStatus"
            (click)="selectStatusFiltro('')"
          >
            Todos
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]"
            [class.font-semibold]="filtroStatus === 'ABERTA'"
            (click)="selectStatusFiltro('ABERTA')"
          >
            Aberta
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]"
            [class.font-semibold]="filtroStatus === 'FINALIZADA'"
            (click)="selectStatusFiltro('FINALIZADA')"
          >
            Finalizada
          </button>
        </div>
        <div
          *ngIf="!loading && matches.length > 0 && matchesNaAba.length === 0"
          class="p-8 text-center text-[var(--app-text-muted)]"
        >
          Nenhum BID nesta aba.
        </div>
      </div>
    </div>
  `,
})
export class MatchManagerComponent implements OnInit {
  @ViewChild('statusFiltroHost', { read: ElementRef }) statusFiltroHost?: ElementRef<HTMLElement>;
  @ViewChild('statusFiltroPanel', { read: ElementRef }) statusFiltroPanel?: ElementRef<HTMLElement>;

  matches: any[] = [];
  groups: any[] = [];
  setoresEvento: any[] = [];
  currentUser: any = {};
  loading: boolean = false;
  abaAtiva: 'atuais' | 'anteriores' = 'atuais';
  filtroBusca = '';
  filtroStatus = '';
  menuFiltroStatusAberto = false;
  statusFiltroPanelTop = 0;
  statusFiltroPanelLeft = 0;
  statusFiltroPanelMinWidth = 168;

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.menuFiltroStatusAberto) return;
    const t = ev.target as Node;
    if (this.statusFiltroHost?.nativeElement?.contains(t)) return;
    if (this.statusFiltroPanel?.nativeElement?.contains(t)) return;
    this.menuFiltroStatusAberto = false;
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.menuFiltroStatusAberto) {
      this.updateStatusFiltroMenuPosition();
    }
  }

  toggleFiltroStatusMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.menuFiltroStatusAberto = !this.menuFiltroStatusAberto;
    if (this.menuFiltroStatusAberto) {
      requestAnimationFrame(() => this.updateStatusFiltroMenuPosition());
    }
  }

  private updateStatusFiltroMenuPosition(): void {
    const hostEl = this.statusFiltroHost?.nativeElement;
    if (!hostEl) return;
    const r = hostEl.getBoundingClientRect();
    const gap = 4;
    const minW = 168;
    let left = r.left + r.width / 2 - minW / 2;
    const top = r.bottom + gap;
    const pad = 8;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    if (left < pad) left = pad;
    if (left + minW > vw - pad) left = Math.max(pad, vw - pad - minW);
    this.statusFiltroPanelTop = top;
    this.statusFiltroPanelLeft = left;
    this.statusFiltroPanelMinWidth = minW;
    this.cdr.markForCheck();
  }

  selectStatusFiltro(val: string): void {
    this.filtroStatus = val;
    this.menuFiltroStatusAberto = false;
  }

  setAba(value: string): void {
    this.abaAtiva = value === 'anteriores' ? 'anteriores' : 'atuais';
    this.menuFiltroStatusAberto = false;
  }

  private get hojeInicio(): Date {
    const h = new Date();
    h.setHours(0, 0, 0, 0);
    return h;
  }

  private isMatchAtual(m: any): boolean {
    if (!m.data_jogo) return true;
    const d = new Date(m.data_jogo);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= this.hojeInicio.getTime();
  }

  private isMatchAnterior(m: any): boolean {
    if (!m.data_jogo) return false;
    const d = new Date(m.data_jogo);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < this.hojeInicio.getTime();
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  isApuracaoEncerrada(m: any): boolean {
    const apuracao = this.parseDate(m?.data_apuracao);
    if (!apuracao) return false;
    return Date.now() > apuracao.getTime();
  }

  isPrazoApostasEncerrado(m: any): boolean {
    const limite = this.parseDate(m?.data_limite_aposta);
    if (!limite) return false;
    return Date.now() > limite.getTime();
  }

  canEditMatch(m: any): boolean {
    return m?.status === 'ABERTA' && !this.isApuracaoEncerrada(m);
  }

  getEditTooltip(m: any): string {
    if (this.isApuracaoEncerrada(m)) return 'Edição bloqueada: data de apuração encerrada';
    if (m?.status !== 'ABERTA') return 'Edição não permitida';
    return 'Editar';
  }

  getBannerThumbUrl(match: { banner?: string; id?: number }): string {
    if (!match?.banner) return 'assets/banner-placeholder.jpg';
    if (String(match.banner).startsWith('http')) return String(match.banner);
    if (match.banner === 'db' && match.id) return `${environment.apiUri}/matches/${match.id}/banner`;
    return uploadsPublicUrl(String(match.banner));
  }

  get matchesNaAba(): any[] {
    return this.matches.filter((m) =>
      this.abaAtiva === 'anteriores' ? this.isMatchAnterior(m) : this.isMatchAtual(m),
    );
  }

  get displayedMatches(): any[] {
    const base = [...this.matchesNaAba].sort((a, b) => this.compareByDataEvento(a, b));
    const q = (this.filtroBusca || '').trim().toLowerCase();
    const afterSearch = !q ? base : base.filter((m) => this.bidMatchesSearch(m, q));
    const st = (this.filtroStatus || '').trim().toUpperCase();
    if (!st) return afterSearch;
    return afterSearch.filter((m) => String(m?.status || '').toUpperCase() === st);
  }

  private compareByDataEvento(a: any, b: any): number {
    const da = this.parseDate(a?.data_jogo)?.getTime();
    const db = this.parseDate(b?.data_jogo)?.getTime();
    if (da != null && db != null) return da - db;
    if (da != null) return -1;
    if (db != null) return 1;
    return String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR');
  }

  private bidMatchesSearch(m: any, q: string): boolean {
    return this.textoBuscaBid(m).includes(q);
  }

  private textoBuscaBid(m: any): string {
    const fmt = (d: unknown): string => {
      if (d == null || d === '') return '';
      try {
        const date = new Date(d as string);
        if (Number.isNaN(date.getTime())) return String(d).toLowerCase();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
      } catch {
        return String(d).toLowerCase();
      }
    };
    const parts = [
      m.titulo,
      m.nome_grupo,
      m.local,
      m.setor_evento_nome,
      m.status,
      fmt(m.data_jogo),
      fmt(m.data_inicio_apostas),
      fmt(m.data_limite_aposta),
      fmt(m.data_apuracao),
      m.id != null ? String(m.id) : '',
    ];
    return parts
      .filter((x) => x != null && String(x).length > 0)
      .map((x) => String(x).toLowerCase())
      .join(' ');
  }

  get matchesAtuaisCount(): number {
    return this.matches.filter((m) => this.isMatchAtual(m)).length;
  }

  get matchesAnterioresCount(): number {
    return this.matches.filter((m) => this.isMatchAnterior(m)).length;
  }

  constructor(
    private matchService: MatchService,
    private settingsService: SettingsService,
    private emailService: EmailService,
    private eventoRhService: EventoRhService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!localStorage.getItem('token') || !this.currentUser?.id) return;
    this.carregar();
    this.carregarGrupos();
    this.carregarSetoresEvento();
  }

  carregarSetoresEvento() {
    this.matchService.getSetoresEvento().subscribe({
      next: (data) => {
        this.setoresEvento = data;
        this.cdr.detectChanges();
      },
      error: () => {},
    });
  }

  async dispararEmail(match: any) {
    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        const listasOptions = listas.length
          ? listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
          : '<option value="">— Nenhuma lista —</option>';
        const templatesOptions = templates.length
          ? templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
          : '<option value="">— Nenhum template —</option>';
        Swal.fire({
          title: 'Enviar e-mail',
          html: `
            <p class="text-left text-sm text-gray-600 mb-3">BID: <strong>${match.titulo}</strong></p>
            <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Lista de e-mail</label>
            <select id="swal-lista" class="swal2-input w-full m-0 mb-3">${listasOptions}</select>
            <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
            <select id="swal-template" class="swal2-input w-full m-0">${templatesOptions}</select>
          `,
          showCancelButton: true,
          confirmButtonText: 'Enviar',
          confirmButtonColor: '#4f46e5',
          preConfirm: () => {
            const listaId = Number((document.getElementById('swal-lista') as HTMLSelectElement)?.value);
            const templateId = Number((document.getElementById('swal-template') as HTMLSelectElement)?.value);
            if (!listaId || !templateId) {
              Swal.showValidationMessage('Selecione a lista e o template.');
              return null;
            }
            return { listaId, templateId };
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            this.emailService
              .send(match.id, result.value!.templateId, this.currentUser?.id, { listaId: result.value!.listaId })
              .subscribe({
                next: (res) => {
                  const msg = res.erros?.length
                    ? `${res.enviados} enviado(s). Erros: ${res.erros.slice(0, 3).join('; ')}${res.erros.length > 3 ? '...' : ''}`
                    : `${res.enviados} e-mail(s) enviado(s) com sucesso.`;
                  Swal.fire({ icon: 'success', title: 'Disparo concluído', text: msg });
                },
                error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao enviar e-mails.', 'error'),
              });
          }
        });
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  buildSetoresModalHtml(): string {
    const list = (this.setoresEvento || [])
      .map(
        (s) =>
          `<div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm font-medium text-gray-800">${s.nome}</span>
            <button type="button" data-delete-setor-id="${s.id}" class="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition">Excluir</button>
          </div>`,
      )
      .join('');
    return `
      <div class="text-left">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Cadastrados</p>
        <div id="setores-lista" class="max-h-48 overflow-y-auto mb-4 rounded-lg border border-gray-100 bg-gray-50/50 p-2">${list || '<p class="text-gray-400 text-sm py-2">Nenhum setor cadastrado.</p>'}</div>
        <hr class="my-4 border-gray-100">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Novo setor</p>
        <div class="flex gap-2">
          <input id="setor-novo-nome" type="text" class="swal2-input flex-1 m-0 text-sm" placeholder="Ex.: Cadeira inferior, Pista, Camarote">
          <button type="button" id="setor-novo-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">Adicionar</button>
        </div>
      </div>
    `;
  }

  private refreshSetoresModalContent(): void {
    this.matchService.getSetoresEvento().subscribe((data) => {
      this.setoresEvento = data;
      this.cdr.detectChanges();
      const container = Swal.getHtmlContainer();
      if (container && Swal.getTitle()?.textContent?.includes('Setores de evento')) {
        container.innerHTML = this.buildSetoresModalHtml();
        this.attachSetoresHandlers();
      } else {
        Swal.close();
        Swal.fire({
          title: 'Setores de evento',
          html: this.buildSetoresModalHtml(),
          showConfirmButton: false,
          showCancelButton: true,
          cancelButtonText: 'Fechar',
          cancelButtonColor: '#6b7280',
          width: '480px',
          didOpen: () => this.attachSetoresHandlers(),
        });
      }
    });
  }

  private attachSetoresHandlers(): void {
    const container = Swal.getHtmlContainer();
    if (!container) return;
    container.querySelectorAll('[data-delete-setor-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-setor-id');
        if (!id) return;
        Swal.fire({
          title: 'Excluir setor?',
          text: 'BIDs que usam este setor ficarão sem setor.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
        }).then((r) => {
          if (r.isConfirmed) {
            this.matchService.deleteSetorEvento(Number(id)).subscribe({
              next: () => this.refreshSetoresModalContent(),
              error: () => Swal.fire('Erro', 'Não foi possível excluir o setor.', 'error'),
            });
          }
        });
      });
    });
    const addBtn = container.querySelector('#setor-novo-btn');
    const addInput = container.querySelector('#setor-novo-nome') as HTMLInputElement | null;
    if (addBtn && addInput) {
      addBtn.addEventListener('click', () => {
        const nome = addInput.value?.trim();
        if (!nome) {
          Swal.fire('Atenção', 'Informe o nome do setor.', 'warning');
          return;
        }
        if (this.setoresEvento.some((s) => s.nome.toLowerCase() === nome.toLowerCase())) {
          Swal.fire('Atenção', 'Já existe um setor com este nome.', 'warning');
          return;
        }
        this.matchService.createSetorEvento(nome, this.currentUser.id).subscribe({
          next: () => {
            addInput.value = '';
            this.refreshSetoresModalContent();
          },
          error: () => Swal.fire('Erro', 'Não foi possível criar o setor.', 'error'),
        });
      });
    }
  }

  async criarSetor() {
    this.matchService.getSetoresEvento().subscribe((data) => {
      this.setoresEvento = data;
      this.cdr.detectChanges();
      Swal.fire({
        title: 'Setores de evento',
        html: this.buildSetoresModalHtml(),
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Fechar',
        cancelButtonColor: '#6b7280',
        width: '480px',
        didOpen: () => this.attachSetoresHandlers(),
      });
    });
  }

  async redistribuir(match: any) {
    const bidsReceptor = this.matches.filter((m) => m.id !== match.id);
    if (bidsReceptor.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Nenhum BID receptor',
        text: 'Não há outro BID para receber os ingressos sobresalentes.',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }
    const maxTransferir = match.ingressos_nao_sorteados || 1;
    const optionsHtml = bidsReceptor
      .map(
        (m) =>
          `<option value="${m.id}">${m.titulo || 'Sem título'} (${m.quantidade_premios_restante ?? m.quantidade_premios_efetiva ?? m.quantidade_premios ?? 1} ing.) — ${m.status === 'ABERTA' ? 'Aberto' : 'Encerrado'}</option>`,
      )
      .join('');
    const { value: result, isConfirmed } = await Swal.fire({
      title: 'Encaminhar ingressos sobresalentes',
      html: `
        <p class="text-left text-sm text-gray-600 mb-2">
          <strong>${match.titulo}</strong> tem <strong>${maxTransferir}</strong> ingresso(s) sobresalentes disponíveis.
        </p>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Quantidade a transferir (máx. ${maxTransferir})</label>
        <input id="swal-quantidade-redist" type="number" min="1" max="${maxTransferir}" value="${maxTransferir}" class="swal2-input w-full m-0 text-sm">
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">BID receptor</label>
        <select id="swal-bid-receptor" class="swal2-input w-full m-0 text-sm">
          ${optionsHtml}
        </select>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Motivo (obrigatório para auditoria)</label>
        <input id="swal-motivo-redist" class="swal2-input w-full m-0 text-sm" placeholder="Ex.: Realocação de sobra para outro evento">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Encaminhar',
      preConfirm: () => {
        const partidaDestinoId = Number(
          (document.getElementById('swal-bid-receptor') as HTMLSelectElement)?.value,
        );
        const qtdInput = document.getElementById('swal-quantidade-redist') as HTMLInputElement;
        const quantidade = qtdInput
          ? Math.min(Math.max(1, Math.floor(Number(qtdInput.value) || 1)), maxTransferir)
          : maxTransferir;
        const m = (document.getElementById('swal-motivo-redist') as HTMLInputElement)?.value;
        if (!m || !m.trim()) {
          Swal.showValidationMessage('O motivo é obrigatório.');
          return null;
        }
        if (!partidaDestinoId) {
          Swal.showValidationMessage('Selecione o BID receptor.');
          return null;
        }
        return { partidaDestinoId, quantidade, motivo: m.trim() };
      },
    });
    if (isConfirmed && result) {
      const destTitulo =
        bidsReceptor.find((b) => b.id === result.partidaDestinoId)?.titulo || 'BID receptor';
      const { isConfirmed: consentimento } = await Swal.fire({
        title: 'Confirmar alteração',
        html: `
          <p class="text-left text-sm text-gray-600 mb-2">
            Deseja realmente <strong>encaminhar ${result.quantidade} ingresso(s)</strong> de <strong>${match.titulo}</strong> para <strong>${destTitulo}</strong>?
          </p>
          <p class="text-left text-xs text-gray-500">Motivo: ${result.motivo}</p>
          <p class="text-left text-xs text-amber-600 mt-2 font-medium">Esta ação altera dados do sistema. Confirme apenas se tiver certeza.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, encaminhar',
        cancelButtonText: 'Cancelar',
      });
      if (!consentimento) return;

      this.loading = true;
      this.matchService
        .redistribuirIngressos(
          match.id,
          result.partidaDestinoId,
          result.quantidade,
          result.motivo,
          this.currentUser.id,
        )
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            const qtd = res.quantidade_encaminhada ?? 0;
            const dest = res.partida_destino_titulo || 'BID receptor';
            let msg: string;
            if (res.destino_aberto) {
              msg = `${qtd} ingresso(s) encaminhado(s) para "${dest}". Serão atribuídos quando o BID receptor for encerrado.`;
            } else {
              msg = `${qtd} ingresso(s) encaminhado(s) para "${dest}". Os pontos foram debitados dos apostadores do BID receptor.`;
              if (res.pulados_por_saldo_insuficiente?.length > 0) {
                msg +=
                  ' Alguns usuários do BID receptor não tinham pontos suficientes e passaram para o próximo da fila.';
              }
            }
            Swal.fire({
              title: 'Encaminhamento concluído',
              text: msg,
              icon: 'success',
              confirmButtonColor: '#4f46e5',
            });
            this.carregar();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire(
              'Erro',
              err.error?.error || 'Não foi possível encaminhar os ingressos.',
              'error',
            );
          },
        });
    }
  }

  async acrescentarIngressos(match: any) {
    const { value: result, isConfirmed } = await Swal.fire({
      title: 'Acrescentar ingressos ao BID',
      html: `
        <p class="text-left text-sm text-gray-600 mb-2">
          Os novos ingressos serão atribuídos à fila de perdedores (maior lance primeiro). Os pontos serão debitados dos beneficiados.
        </p>
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Quantidade de ingressos</label>
        <input id="swal-qtd-acrescentar" type="number" min="1" value="1" class="swal2-input w-full m-0 text-sm">
        <label class="block text-left text-xs font-medium text-gray-600 mt-3 mb-1">Motivo (obrigatório para auditoria)</label>
        <input id="swal-motivo-acrescentar" class="swal2-input w-full m-0 text-sm" placeholder="Ex.: Inclusão de cortesias">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      confirmButtonText: 'Acrescentar',
      preConfirm: () => {
        const qtdInput = document.getElementById('swal-qtd-acrescentar') as HTMLInputElement;
        const quantidade = Math.max(1, Math.floor(Number(qtdInput?.value) || 1));
        const motivo = (
          document.getElementById('swal-motivo-acrescentar') as HTMLInputElement
        )?.value?.trim();
        if (!motivo) {
          Swal.showValidationMessage('O motivo é obrigatório.');
          return null;
        }
        return { quantidade, motivo };
      },
    });
    if (isConfirmed && result) {
      const { isConfirmed: consentimento } = await Swal.fire({
        title: 'Confirmar alteração',
        html: `
          <p class="text-left text-sm text-gray-600 mb-2">
            Deseja realmente <strong>acrescentar ${result.quantidade} ingresso(s)</strong> ao BID <strong>${match.titulo}</strong>?
          </p>
          <p class="text-left text-xs text-gray-500">Motivo: ${result.motivo}</p>
          <p class="text-left text-xs text-amber-600 mt-2 font-medium">Os ingressos serão atribuídos à fila de perdedores e os pontos debitados. Confirme apenas se tiver certeza.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#0d9488',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sim, acrescentar',
        cancelButtonText: 'Cancelar',
      });
      if (!consentimento) return;

      this.loading = true;
      this.matchService
        .acrescentarIngressos(match.id, result.quantidade, result.motivo, this.currentUser.id)
        .subscribe({
          next: (res: any) => {
            this.loading = false;
            const atribuidos = res.quantidade_atribuida ?? 0;
            let msg = `${atribuidos} ingresso(s) atribuído(s) à fila de perdedores. Pontos debitados.`;
            if (res.pulados_por_saldo_insuficiente?.length > 0) {
              msg += ' Alguns usuários não tinham pontos suficientes e foram pulados.';
            }
            Swal.fire({
              title: 'Concluído',
              text: msg,
              icon: 'success',
              confirmButtonColor: '#4f46e5',
            });
            this.carregar();
          },
          error: (err) => {
            this.loading = false;
            Swal.fire(
              'Erro',
              err.error?.error || 'Não foi possível acrescentar ingressos.',
              'error',
            );
          },
        });
    }
  }

  carregar() {
    this.loading = true;
    this.matchService.getMatches(this.currentUser.id).subscribe({
      next: (data) => {
        this.matches = data.map((m: any) => ({
          ...m,
          total_apostas_realizadas: Number(
            m?.total_apostas_realizadas ?? m?.tickets_comprados ?? 0,
          ),
        }));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  carregarGrupos() {
    this.matchService.getGroups().subscribe({
      next: (data) => {
        this.groups = data;
      },
      error: () => {},
    });
  }

  async criarJogo() {
    await this.abrirFormularioFases(null, false);
  }

  async editarJogo(match: any) {
    await this.abrirFormulario(match);
  }

  async clonarJogo(match: any) {
    await this.abrirFormularioFases(match, true);
  }

  private escapeHtmlWizard(s: unknown): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** ISO → valor datetime-local no fuso do browser. */
  private formatIsoParaDatetimeLocal(iso: string | null | undefined): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  }

  private dataJogoParaApenasData(dataJogoLocal: string): string {
    if (!dataJogoLocal) return '';
    const part = dataJogoLocal.trim().split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : '';
  }

  private toIsoWtPassLocal(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  private toIsoApenasDataWtPass(yyyyMmDd: string): string {
    if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd.trim())) return '';
    const d = new Date(`${yyyyMmDd.trim()}T12:00:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }

  private emptyWizardGruposSel(defaultQtd = 1): MatchWizardGruposSel {
    const quantidades: Record<number, number> = {};
    for (const g of this.groups) {
      quantidades[Number(g.id)] = defaultQtd;
    }
    return { publico: false, publico_qtd: defaultQtd, ids: [], quantidades };
  }

  private getMaxQuantidadeGruposSel(grupos: MatchWizardGruposSel): number {
    let max = 1;
    if (grupos.publico) max = Math.max(max, Math.max(1, Number(grupos.publico_qtd) || 1));
    for (const gid of grupos.ids) {
      max = Math.max(max, Math.max(1, Number(grupos.quantidades[gid]) || 1));
    }
    return max;
  }

  private buildInitialWizardState(match: any | null, isClone: boolean): MatchWizardState {
    const emptyDados: MatchWizardDadosBid = {
      titulo: '',
      subtitulo: '',
      setor_evento_id: 'null',
      local: '',
      banner: '',
      link_extra: '',
      informacoes_extras: '',
      data_jogo_local: '',
      data_inicio_apostas_local: '',
      data_limite_aposta_local: '',
      data_apuracao_local: '',
    };

    if (match && isClone) {
      const tituloBase = String(match.titulo || '')
        .replace(/\s*\(Cópia\)\s*$/i, '')
        .trim();
      const dados: MatchWizardDadosBid = {
        ...emptyDados,
        titulo: `${tituloBase || 'BID'} (Cópia)`,
        subtitulo: match.subtitulo ? String(match.subtitulo) : '',
        setor_evento_id: match.setor_evento_id != null ? String(match.setor_evento_id) : 'null',
        local: match.local ? String(match.local) : '',
        banner:
          match.banner && String(match.banner).startsWith('http') ? String(match.banner) : '',
        link_extra: match.link_extra ? String(match.link_extra) : '',
        informacoes_extras: match.informacoes_extras ? String(match.informacoes_extras) : '',
        data_jogo_local: this.formatIsoParaDatetimeLocal(match.data_jogo),
        data_inicio_apostas_local: this.formatIsoParaDatetimeLocal(match.data_inicio_apostas),
        data_limite_aposta_local: this.formatIsoParaDatetimeLocal(match.data_limite_aposta),
        data_apuracao_local: match.data_apuracao
          ? this.formatIsoParaDatetimeLocal(match.data_apuracao)
          : '',
      };
      const cloneQtd = Math.max(1, Number(match.quantidade_premios) || 1);
      return {
        dados,
        grupos: this.emptyWizardGruposSel(cloneQtd),
        wtPass: {
          ativo: false,
          vagas: cloneQtd,
          permitir_lista_espera: true,
          data_inicio_inscricao_local: dados.data_inicio_apostas_local,
          data_limite_inscricao_local: dados.data_limite_aposta_local,
          data_evento_yyyy_mm_dd: this.dataJogoParaApenasData(dados.data_jogo_local),
        },
        wtPassSeeded: false,
      };
    }

    return {
      dados: emptyDados,
      grupos: this.emptyWizardGruposSel(1),
      wtPass: {
        ativo: false,
        vagas: 1,
        permitir_lista_espera: true,
        data_inicio_inscricao_local: '',
        data_limite_inscricao_local: '',
        data_evento_yyyy_mm_dd: '',
      },
      wtPassSeeded: false,
    };
  }

  private ensureWtPassDefaults(state: MatchWizardState): void {
    const d = state.dados;
    state.wtPass.vagas = this.getMaxQuantidadeGruposSel(state.grupos);
    state.wtPass.data_inicio_inscricao_local = d.data_inicio_apostas_local;
    state.wtPass.data_limite_inscricao_local = d.data_limite_aposta_local;
    state.wtPass.data_evento_yyyy_mm_dd = this.dataJogoParaApenasData(d.data_jogo_local);
  }

  private buildMatchFormDataForGrupo(
    dados: MatchWizardDadosBid,
    grupoId: string,
    motivo: string,
    quantidadePremios: number,
  ): FormData {
    const toIsoUtc = (v: string) => (v ? new Date(v).toISOString() : '');
    const fd = new FormData();
    fd.append('titulo', dados.titulo.trim());
    fd.append('grupo_id', grupoId);
    fd.append('setor_evento_id', dados.setor_evento_id || 'null');
    fd.append('banner', dados.banner ?? '');
    fd.append('subtitulo', dados.subtitulo ?? '');
    fd.append('informacoes_extras', dados.informacoes_extras ?? '');
    fd.append('link_extra', dados.link_extra ?? '');
    fd.append('local', dados.local ?? '');
    fd.append('data_jogo', toIsoUtc(dados.data_jogo_local) || dados.data_jogo_local);
    fd.append(
      'data_inicio_apostas',
      toIsoUtc(dados.data_inicio_apostas_local) || dados.data_inicio_apostas_local,
    );
    fd.append(
      'data_limite_aposta',
      toIsoUtc(dados.data_limite_aposta_local) || dados.data_limite_aposta_local,
    );
    fd.append('data_apuracao', toIsoUtc(dados.data_apuracao_local) || '');
    fd.append('quantidade_premios', String(Math.max(1, Number(quantidadePremios) || 1)));
    fd.append('motivo', motivo);
    fd.append('adminId', String(this.currentUser.id));
    return fd;
  }

  private buildWtPassBody(state: MatchWizardState): Record<string, unknown> | null {
    if (!state.wtPass.ativo) return null;
    const d = state.dados;
    const w = state.wtPass;
    const dataEventoIso = this.toIsoApenasDataWtPass(w.data_evento_yyyy_mm_dd);
    const dataLimite = this.toIsoWtPassLocal(w.data_limite_inscricao_local);
    const dataInicio = this.toIsoWtPassLocal(w.data_inicio_inscricao_local);
    if (!dataEventoIso || !dataLimite) return null;
    return {
      titulo: d.titulo.trim() || null,
      subtitulo: d.subtitulo?.trim() || null,
      descricao: d.informacoes_extras?.trim() || null,
      banner: d.banner?.trim() || null,
      local: d.local?.trim() || null,
      vagas: Math.max(1, Number(w.vagas) || 1),
      permitir_lista_espera: w.permitir_lista_espera,
      data_inicio_inscricao: dataInicio || '',
      data_limite_inscricao: dataLimite,
      data_evento: dataEventoIso,
      adminId: this.currentUser.id,
    };
  }

  private applyDadosBidToDom(d: MatchWizardDadosBid): void {
    const setVal = (id: string, v: string) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) el.value = v ?? '';
    };
    setVal('bid-w-titulo', d.titulo);
    setVal('bid-w-subtitulo', d.subtitulo);
    const setor = document.getElementById('bid-w-setorEventoId') as HTMLSelectElement | null;
    if (setor) setor.value = d.setor_evento_id || 'null';
    setVal('bid-w-local', d.local);
    setVal('bid-w-banner', d.banner);
    setVal('bid-w-linkExtra', d.link_extra);
    setVal('bid-w-informacoesExtras', d.informacoes_extras);
    setVal('bid-w-dataEvento', d.data_jogo_local);
    setVal('bid-w-dataInicio', d.data_inicio_apostas_local);
    setVal('bid-w-dataLimite', d.data_limite_aposta_local);
    setVal('bid-w-dataApuracao', d.data_apuracao_local);
  }

  private readDadosBidFromDom(): MatchWizardDadosBid | null {
    const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value ?? '';
    const getTa = (id: string) =>
      (document.getElementById(id) as HTMLTextAreaElement)?.value ?? '';
    const titulo = getVal('bid-w-titulo').trim();
    const dataJogo = getVal('bid-w-dataEvento');
    if (!titulo || !dataJogo) {
      Swal.showValidationMessage('Título e Data do Show/Jogo são obrigatórios.');
      return null;
    }
    return {
      titulo,
      subtitulo: getVal('bid-w-subtitulo'),
      setor_evento_id:
        (document.getElementById('bid-w-setorEventoId') as HTMLSelectElement)?.value ?? 'null',
      local: getVal('bid-w-local'),
      banner: getVal('bid-w-banner'),
      link_extra: getVal('bid-w-linkExtra'),
      informacoes_extras: getTa('bid-w-informacoesExtras'),
      data_jogo_local: dataJogo,
      data_inicio_apostas_local: getVal('bid-w-dataInicio'),
      data_limite_aposta_local: getVal('bid-w-dataLimite'),
      data_apuracao_local: getVal('bid-w-dataApuracao'),
    };
  }

  private buildWizardFase1Html(setoresOptions: string, tituloInput: string): string {
    return `
        <div class="text-left space-y-4 px-2">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Título do BID</label>
              <input id="bid-w-titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" value="${this.escapeHtmlWizard(tituloInput)}">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Subtítulo</label>
              <input id="bid-w-subtitulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-extrabold text-indigo-600 uppercase mb-1">Setor do evento</label>
              <select id="bid-w-setorEventoId" class="swal2-select w-full m-0 h-10 text-sm border-indigo-200 bg-indigo-50/50 text-indigo-700 rounded-lg">
                  <option value="null">— Nenhum</option>
                  ${setoresOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
              <input id="bid-w-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Banner (URL da imagem)</label>
                <input id="bid-w-banner" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://...">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Link extra</label>
                <input id="bid-w-linkExtra" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://... (opcional)">
              </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Informações extras</label>
            <textarea id="bid-w-informacoesExtras" class="swal2-textarea w-full m-0 text-sm border-gray-300 rounded-lg" rows="3" placeholder="Texto livre (opcional)"></textarea>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Show/Jogo</label>
              <input id="bid-w-dataEvento" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="">
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Início das Apostas</label>
                <input id="bid-w-dataInicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 rounded-lg" value="">
            </div>
            <div>
                <label class="block text-xs font-bold text-rose-500 uppercase mb-1">Fim das Apostas</label>
                <input id="bid-w-dataLimite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 rounded-lg" value="">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Dia de apuração</label>
                <input id="bid-w-dataApuracao" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional">
            </div>
          </div>
        </div>
      `;
  }

  private runWizardFase1(
    state: MatchWizardState,
    match: any | null,
    isClone: boolean,
  ): Promise<'cancel' | 'next'> {
    const tituloModalBase = isClone ? '📑 Clonar BID' : 'Novo BID';
    const tituloInput = state.dados.titulo || (isClone ? `${match?.titulo || ''} (Cópia)` : '');

    const setoresOptions = this.setoresEvento
      .map(
        (s) =>
          `<option value="${s.id}" ${state.dados.setor_evento_id === String(s.id) ? 'selected' : ''}>📌 ${this.escapeHtmlWizard(s.nome)}</option>`,
      )
      .join('');

    return Swal.fire({
      title: `${tituloModalBase} — Etapa 1 de 3`,
      width: '700px',
      html: this.buildWizardFase1Html(setoresOptions, tituloInput),
      focusConfirm: false,
      showCancelButton: true,
      showDenyButton: false,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Próximo',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        this.applyDadosBidToDom(state.dados);
        if (match && isClone) {
          const bannerEl = document.getElementById('bid-w-banner') as HTMLInputElement;
          if (bannerEl && match.banner) bannerEl.value = match.banner.startsWith('http') ? match.banner : '';
        }
        if (!isClone) {
          const titleEl = document.querySelector('.swal2-title') as HTMLElement | null;
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.alignItems = 'center';
            titleEl.style.justifyContent = 'center';
            titleEl.style.width = '100%';
            titleEl.style.gap = '10px';
            titleEl.innerHTML =
              '<span style="display:inline-flex;align-items:center;gap:10px"><img src="assets/allianz_ticket_blue_cartoon.png" alt="" style="width:50px;height:50px;object-fit:contain" />Novo BID — Etapa 1 de 3</span>';
          }
        }
      },
      preConfirm: () => {
        const dados = this.readDadosBidFromDom();
        if (!dados) return false;
        state.dados = dados;
        return true;
      },
    }).then((r) => {
      if (r.isConfirmed) return 'next' as const;
      return 'cancel' as const;
    });
  }

  private updateWizardGrupoCount(): void {
    const pub = (document.getElementById('bid-w-g-publico') as HTMLInputElement)?.checked;
    const ids: number[] = [];
    document.querySelectorAll<HTMLInputElement>('[data-bid-w-gid]:checked').forEach((el) => {
      const id = el.getAttribute('data-bid-w-gid');
      if (id) ids.push(Number(id));
    });
    let n = ids.length;
    if (pub) n += 1;
    const el = document.getElementById('bid-wizard-count');
    if (el) el.textContent = String(n);
  }

  private wizardGrupoQtdInputHtml(value: number, disabled: boolean, grupoId?: number): string {
    const idAttr =
      grupoId != null
        ? `data-bid-w-qtd-for="${grupoId}"`
        : 'id="bid-w-g-publico-qtd"';
    return `<input type="number" min="1" ${idAttr} class="swal2-input w-16 m-0 h-8 text-sm border-gray-300 rounded-lg shrink-0" value="${value}" ${disabled ? 'disabled' : ''} />`;
  }

  private syncWizardGrupoQtdDisabled(): void {
    const pubCb = document.getElementById('bid-w-g-publico') as HTMLInputElement | null;
    const pubQtd = document.getElementById('bid-w-g-publico-qtd') as HTMLInputElement | null;
    if (pubQtd) pubQtd.disabled = !pubCb?.checked;
    document.querySelectorAll<HTMLInputElement>('[data-bid-w-gid]').forEach((cb) => {
      const id = cb.getAttribute('data-bid-w-gid');
      const qtd = document.querySelector(
        `[data-bid-w-qtd-for="${id}"]`,
      ) as HTMLInputElement | null;
      if (qtd) qtd.disabled = !cb.checked;
    });
  }

  private readWizardQtdFromInput(el: HTMLInputElement | null): number | null {
    if (!el) return null;
    const n = Math.floor(Number(el.value));
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  }

  private buildWizardFase2Html(state: MatchWizardState): string {
    const qtdLabel =
      '<span class="text-[10px] font-bold text-blue-600 uppercase shrink-0 w-24 text-right">Qtd. ingressos</span>';
    const publicoQtd = Math.max(1, Number(state.grupos.publico_qtd) || 1);
    const gruposHtml = this.groups
      .map((g) => {
        const gid = Number(g.id);
        const checked = state.grupos.ids.includes(gid);
        const qtd = Math.max(1, Number(state.grupos.quantidades[gid]) || 1);
        return `<label class="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0 cursor-pointer">
          <input type="checkbox" data-bid-w-gid="${g.id}" class="rounded border-gray-300 shrink-0" ${checked ? 'checked' : ''} />
          <span class="text-sm text-gray-800 flex-1 min-w-0">🎲 ${this.escapeHtmlWizard(g.nome)}</span>
          ${qtdLabel}
          ${this.wizardGrupoQtdInputHtml(qtd, !checked, gid)}
        </label>`;
      })
      .join('');
    return `
      <div class="text-left space-y-3 px-1">
        <p class="text-sm text-gray-600">Serão criados <strong id="bid-wizard-count">0</strong> BID(s) (um por opção selecionada).</p>
        <p class="text-xs text-gray-500">Marque <strong>Público</strong> e/ou um ou mais grupos e defina a quantidade de ingressos de cada um.</p>
        <div class="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/80 p-3">
          <label class="flex items-center gap-2 py-2 border-b border-amber-100 mb-1 cursor-pointer font-medium text-amber-800">
            <input type="checkbox" id="bid-w-g-publico" class="rounded border-amber-300 shrink-0" ${state.grupos.publico ? 'checked' : ''} />
            <span class="flex-1 min-w-0">👥 Público (Todos)</span>
            ${qtdLabel}
            ${this.wizardGrupoQtdInputHtml(publicoQtd, !state.grupos.publico)}
          </label>
          ${gruposHtml || '<p class="text-gray-400 text-sm py-2">Nenhum grupo cadastrado.</p>'}
        </div>
      </div>
    `;
  }

  private attachWizardFase2Handlers(): void {
    const upd = () => {
      this.updateWizardGrupoCount();
      this.syncWizardGrupoQtdDisabled();
    };
    document.getElementById('bid-w-g-publico')?.addEventListener('change', upd);
    document.querySelectorAll('[data-bid-w-gid]').forEach((el) => el.addEventListener('change', upd));
    upd();
  }

  private readGruposFromDom(state: MatchWizardState): boolean {
    const publico = !!(document.getElementById('bid-w-g-publico') as HTMLInputElement)?.checked;
    const ids: number[] = [];
    document.querySelectorAll<HTMLInputElement>('[data-bid-w-gid]:checked').forEach((el) => {
      const id = el.getAttribute('data-bid-w-gid');
      if (id) ids.push(Number(id));
    });
    if (!publico && ids.length === 0) {
      Swal.showValidationMessage('Selecione pelo menos Público ou um grupo.');
      return false;
    }
    let publico_qtd = state.grupos.publico_qtd;
    if (publico) {
      const q = this.readWizardQtdFromInput(
        document.getElementById('bid-w-g-publico-qtd') as HTMLInputElement,
      );
      if (q === null) {
        Swal.showValidationMessage('Público: informe uma quantidade de ingressos válida (≥ 1).');
        return false;
      }
      publico_qtd = q;
    }
    const quantidades = { ...state.grupos.quantidades };
    for (const gid of ids) {
      const qtdEl = document.querySelector(
        `[data-bid-w-qtd-for="${gid}"]`,
      ) as HTMLInputElement | null;
      const q = this.readWizardQtdFromInput(qtdEl);
      if (q === null) {
        const g = this.groups.find((x) => Number(x.id) === gid);
        Swal.showValidationMessage(
          `Grupo "${g?.nome || gid}": quantidade de ingressos inválida (≥ 1).`,
        );
        return false;
      }
      quantidades[gid] = q;
    }
    state.grupos = { publico, publico_qtd, ids, quantidades };
    return true;
  }

  private runWizardFase2(state: MatchWizardState): Promise<'cancel' | 'back' | 'next'> {
    return Swal.fire({
      title: 'Grupos — Etapa 2 de 3',
      width: '600px',
      html: this.buildWizardFase2Html(state),
      focusConfirm: false,
      showCancelButton: true,
      showDenyButton: true,
      denyButtonText: 'Voltar',
      denyButtonColor: '#6b7280',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Próximo',
      cancelButtonText: 'Cancelar',
      didOpen: () => this.attachWizardFase2Handlers(),
      preConfirm: () => this.readGruposFromDom(state),
    }).then((r) => {
      if (r.isConfirmed) return 'next' as const;
      if (r.isDenied) return 'back' as const;
      return 'cancel' as const;
    });
  }

  private buildWizardFase3Html(): string {
    return `
      <div class="text-left space-y-4 px-2">
        <label class="flex items-center gap-2 cursor-pointer font-medium text-gray-800">
          <input type="checkbox" id="bid-w-wt-ativo" class="rounded border-gray-300" />
          <span>Criar evento WT Pass paralelo?</span>
        </label>
        <div id="bid-w-wt-fields" class="space-y-3 hidden border border-gray-100 rounded-lg p-3 bg-gray-50/80">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-blue-600 uppercase mb-1" for="bid-w-wt-vagas">Vagas</label>
              <input id="bid-w-wt-vagas" type="number" min="1" class="swal2-input w-full m-0 h-10 text-sm" />
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input id="bid-w-wt-fila" type="checkbox" checked class="rounded border-gray-300" />
                Lista de espera
              </label>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1" for="bid-w-wt-evento">Data do evento (WT Pass)</label>
            <input id="bid-w-wt-evento" type="date" class="swal2-input w-full m-0 h-10 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-emerald-600 uppercase mb-1" for="bid-w-wt-ini">Início das inscrições</label>
              <input id="bid-w-wt-ini" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm" />
            </div>
            <div>
              <label class="block text-xs font-bold text-rose-500 uppercase mb-1" for="bid-w-wt-lim">Fim das inscrições</label>
              <input id="bid-w-wt-lim" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private applyWtPassToDom(state: MatchWizardState): void {
    const ativo = document.getElementById('bid-w-wt-ativo') as HTMLInputElement | null;
    const fields = document.getElementById('bid-w-wt-fields');
    if (ativo) ativo.checked = state.wtPass.ativo;
    if (fields) {
      if (state.wtPass.ativo) fields.classList.remove('hidden');
      else fields.classList.add('hidden');
    }
    const setN = (id: string, v: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = v;
    };
    setN('bid-w-wt-vagas', String(Math.max(1, Number(state.wtPass.vagas) || 1)));
    const fila = document.getElementById('bid-w-wt-fila') as HTMLInputElement | null;
    if (fila) fila.checked = state.wtPass.permitir_lista_espera !== false;
    setN('bid-w-wt-evento', state.wtPass.data_evento_yyyy_mm_dd || '');
    setN('bid-w-wt-ini', state.wtPass.data_inicio_inscricao_local || '');
    setN('bid-w-wt-lim', state.wtPass.data_limite_inscricao_local || '');
  }

  private attachWizardFase3Handlers(state: MatchWizardState): void {
    const ativo = document.getElementById('bid-w-wt-ativo') as HTMLInputElement | null;
    const fields = document.getElementById('bid-w-wt-fields');
    const toggle = () => {
      if (!fields) return;
      if (ativo?.checked) fields.classList.remove('hidden');
      else fields.classList.add('hidden');
    };
    ativo?.addEventListener('change', () => {
      state.wtPass.ativo = !!ativo.checked;
      toggle();
    });
    this.applyWtPassToDom(state);
    toggle();
  }

  private readWtPassFromDom(state: MatchWizardState): boolean {
    const ativo = !!(document.getElementById('bid-w-wt-ativo') as HTMLInputElement)?.checked;
    if (!ativo) {
      state.wtPass.ativo = false;
      return true;
    }
    const vagas = Math.max(1, Math.floor(Number((document.getElementById('bid-w-wt-vagas') as HTMLInputElement)?.value) || 1));
    const permitir_lista_espera =
      (document.getElementById('bid-w-wt-fila') as HTMLInputElement)?.checked ?? true;
    const data_evento_yyyy_mm_dd =
      (document.getElementById('bid-w-wt-evento') as HTMLInputElement)?.value?.trim() || '';
    const data_inicio_inscricao_local =
      (document.getElementById('bid-w-wt-ini') as HTMLInputElement)?.value || '';
    const data_limite_inscricao_local =
      (document.getElementById('bid-w-wt-lim') as HTMLInputElement)?.value || '';
    if (!data_limite_inscricao_local || !data_evento_yyyy_mm_dd) {
      Swal.showValidationMessage('WT Pass: data do evento e fim das inscrições são obrigatórios.');
      return false;
    }
    if (!this.toIsoApenasDataWtPass(data_evento_yyyy_mm_dd)) {
      Swal.showValidationMessage('WT Pass: data do evento inválida.');
      return false;
    }
    state.wtPass = {
      ativo: true,
      vagas,
      permitir_lista_espera,
      data_inicio_inscricao_local,
      data_limite_inscricao_local,
      data_evento_yyyy_mm_dd,
    };
    return true;
  }

  private runWizardFase3(state: MatchWizardState): Promise<'cancel' | 'back' | 'next'> {
    return Swal.fire({
      title: 'WT Pass — Etapa 3 de 3',
      width: '560px',
      html: this.buildWizardFase3Html(),
      focusConfirm: false,
      showCancelButton: true,
      showDenyButton: true,
      denyButtonText: 'Voltar',
      denyButtonColor: '#6b7280',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      didOpen: () => this.attachWizardFase3Handlers(state),
      preConfirm: () => this.readWtPassFromDom(state),
    }).then((r) => {
      if (r.isConfirmed) return 'next' as const;
      if (r.isDenied) return 'back' as const;
      return 'cancel' as const;
    });
  }

  private finishWizardSubmit(
    okCount: number,
    failed: { label: string; err?: unknown }[],
    wtOk: boolean | null,
    wtErr: string | null,
  ): void {
    this.loading = false;
    this.cdr.detectChanges();
    let msg = `${okCount} BID(s) criado(s) com sucesso.`;
    if (failed.length) {
      msg += ` Falha em: ${failed.map((f) => f.label).join(', ')}.`;
    }
    if (wtOk === true) msg += ' Evento WT Pass criado.';
    if (wtOk === false && wtErr) msg += ` WT Pass: ${wtErr}`;
    const icon = failed.length || wtOk === false ? 'warning' : 'success';
    Swal.fire({ title: failed.length || wtOk === false ? 'Concluído com avisos' : 'Sucesso!', text: msg, icon });
    this.carregar();
  }

  private submitWizardState(state: MatchWizardState, match: any | null, isClone: boolean): void {
    const titulo = state.dados.titulo.trim();
    const targets: { grupo_id: string; label: string; quantidade: number }[] = [];
    if (state.grupos.publico) {
      targets.push({
        grupo_id: 'null',
        label: 'Público',
        quantidade: Math.max(1, Number(state.grupos.publico_qtd) || 1),
      });
    }
    for (const gid of state.grupos.ids) {
      const g = this.groups.find((x) => Number(x.id) === Number(gid));
      targets.push({
        grupo_id: String(gid),
        label: g?.nome || `Grupo ${gid}`,
        quantidade: Math.max(1, Number(state.grupos.quantidades[gid]) || 1),
      });
    }

    const baseMotivo = isClone
      ? `Clonagem do evento: ${match?.titulo || '?'} -> ${titulo}`
      : `Criação do evento: ${titulo}`;

    const requests = targets.map((t) =>
      this.matchService
        .createMatch(
          this.buildMatchFormDataForGrupo(
            state.dados,
            t.grupo_id,
            `${baseMotivo} [${t.label}]`,
            t.quantidade,
          ),
        )
        .pipe(
          map((res: { id?: number }) => ({
            ok: true as const,
            label: t.label,
            matchId: res != null && res.id != null ? Number(res.id) : null,
          })),
          catchError((err) => of({ ok: false as const, label: t.label, err })),
        ),
    );

    this.loading = true;
    this.cdr.detectChanges();

    forkJoin(requests).subscribe({
      next: (results) => {
        const failed = results.filter((r) => !r.ok) as { ok: false; label: string; err: unknown }[];
        const okCount = results.filter((r) => r.ok).length;

        let firstPartidaId: number | null = null;
        for (const r of results) {
          if (r.ok && r.matchId != null && Number.isFinite(r.matchId) && r.matchId > 0) {
            firstPartidaId = r.matchId;
            break;
          }
        }

        const wtBody = this.buildWtPassBody(state);
        if (state.wtPass.ativo) {
          if (!wtBody) {
            this.finishWizardSubmit(
              okCount,
              failed,
              false,
              'Dados do WT Pass inválidos. Verifique as datas.',
            );
            return;
          }
          if (firstPartidaId != null) {
            wtBody['partida_id'] = firstPartidaId;
          }
          this.eventoRhService.createEvento(wtBody).subscribe({
            next: () => this.finishWizardSubmit(okCount, failed, true, null),
            error: (err: { error?: { error?: string } }) =>
              this.finishWizardSubmit(
                okCount,
                failed,
                false,
                err.error?.error || 'Falha ao criar WT Pass.',
              ),
          });
        } else {
          this.finishWizardSubmit(okCount, failed, null, null);
        }
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        Swal.fire('Erro', 'Falha ao criar BIDs.', 'error');
      },
    });
  }

  async abrirFormularioFases(match: any = null, isClone: boolean = false): Promise<void> {
    const state = this.buildInitialWizardState(match, isClone);
    let step: 1 | 2 | 3 = 1;

    for (;;) {
      if (step === 1) {
        const r = await this.runWizardFase1(state, match, isClone);
        if (r === 'cancel') return;
        step = 2;
        continue;
      }
      if (step === 2) {
        const r = await this.runWizardFase2(state);
        if (r === 'cancel') return;
        if (r === 'back') {
          step = 1;
          continue;
        }
        if (!state.wtPassSeeded) {
          this.ensureWtPassDefaults(state);
          state.wtPassSeeded = true;
        }
        step = 3;
        continue;
      }
      if (step === 3) {
        const r = await this.runWizardFase3(state);
        if (r === 'cancel') return;
        if (r === 'back') {
          step = 2;
          continue;
        }
        this.submitWizardState(state, match, isClone);
        return;
      }
    }
  }

  async excluirJogo(match: any) {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Excluir BID?',
      text: `Justifique a exclusão de "${match.titulo}". (Todos os pontos serão reembolsados)`,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo da exclusão para auditoria...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório para a auditoria!' : null),
    });

    if (isConfirmed && motivo) {
      this.matchService.deleteMatch(match.id, this.currentUser.id, motivo).subscribe({
        next: () => {
          this.carregar();
          Swal.fire('Excluído!', 'O BID foi removido e os pontos devolvidos.', 'success');
        },
        error: () => Swal.fire('Erro', 'Não foi possível excluir o evento.', 'error'),
      });
    }
  }

  async abrirFormulario(match: any = null, isClone: boolean = false) {
    const isEdit = !!match && !isClone;

    const tituloModal = isEdit ? '✏️ Editar BID' : isClone ? '📑 Clonar BID' : 'Novo BID';
    const tituloInput = isClone ? `${match.titulo} (Cópia)` : match?.titulo || '';

    /** Converte ISO (UTC) para "YYYY-MM-DDTHH:mm" em horário local do usuário (valor do datetime-local). */
    const formatData = (iso: string) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch (e) {
        return '';
      }
    };

    const groupsOptions = this.groups
      .map(
        (g) =>
          `<option value="${g.id}" ${match && match.grupo_id === g.id ? 'selected' : ''}>🎲 ${g.nome}</option>`,
      )
      .join('');

    const setoresOptions = this.setoresEvento
      .map(
        (s) =>
          `<option value="${s.id}" ${match && match.setor_evento_id === s.id ? 'selected' : ''}>📌 ${s.nome}</option>`,
      )
      .join('');

    const { value: formValues } = await Swal.fire({
      title: tituloModal,
      width: '700px',
      didOpen: () => {
        if (match) {
          const bannerEl = document.getElementById('banner') as HTMLInputElement;
          const subtituloEl = document.getElementById('subtitulo') as HTMLInputElement;
          const informacoesEl = document.getElementById('informacoesExtras') as HTMLTextAreaElement;
          const linkExtraEl = document.getElementById('linkExtra') as HTMLInputElement;
          const dataApuracaoEl = document.getElementById('dataApuracao') as HTMLInputElement;
          if (bannerEl && match.banner) bannerEl.value = match.banner.startsWith('http') ? match.banner : '';
          if (subtituloEl && match.subtitulo) subtituloEl.value = match.subtitulo;
          if (informacoesEl && match.informacoes_extras) informacoesEl.value = match.informacoes_extras;
          if (linkExtraEl && match.link_extra) linkExtraEl.value = match.link_extra;
          if (dataApuracaoEl && match.data_apuracao) dataApuracaoEl.value = formatData(match.data_apuracao);
        }
        if (!isEdit && !isClone) {
          const titleEl = document.querySelector('.swal2-title') as HTMLElement | null;
          if (titleEl) {
            titleEl.style.display = 'flex';
            titleEl.style.alignItems = 'center';
            titleEl.style.justifyContent = 'center';
            titleEl.style.width = '100%';
            titleEl.style.gap = '10px';
            titleEl.innerHTML =
              '<span style="display:inline-flex;align-items:center;gap:10px"><img src="assets/allianz_ticket_blue_cartoon.png" alt="" style="width:50px;height:50px;object-fit:contain" />Novo BID</span>';
          }
        }
      },
      html: `
        <div class="text-left space-y-4 px-2">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Título do BID</label>
              <input id="titulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 focus:ring-indigo-500 rounded-lg" value="${tituloInput}">
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Subtítulo</label>
              <input id="subtitulo" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="Opcional">
            </div>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-[10px] font-extrabold text-amber-600 uppercase mb-1">Grupo de Apostas</label>
              <select id="grupoId" class="swal2-select w-full m-0 h-10 text-sm border-amber-200 bg-amber-50 text-amber-700 rounded-lg">
                  <option value="null">👥 Público (Todos)</option>
                  ${groupsOptions}
              </select>
            </div>
            <div>
              <label class="block text-[10px] font-extrabold text-indigo-600 uppercase mb-1">Setor do evento</label>
              <select id="setorEventoId" class="swal2-select w-full m-0 h-10 text-sm border-indigo-200 bg-indigo-50/50 text-indigo-700 rounded-lg">
                  <option value="null">— Nenhum</option>
                  ${setoresOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
              <input id="local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match?.local || ''}">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Banner (URL da imagem)</label>
                <input id="banner" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://...">
              </div>
              <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Link extra</label>
                <input id="linkExtra" type="url" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" placeholder="https://... (opcional)">
              </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Informações extras</label>
            <textarea id="informacoesExtras" class="swal2-textarea w-full m-0 text-sm border-gray-300 rounded-lg" rows="3" placeholder="Texto livre (opcional)"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div>
                 <label class="block text-xs font-bold text-blue-600 uppercase mb-1">Qtd. Ingressos</label>
                 <input id="qtdPremios" type="number" min="1" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match?.quantidade_premios || 1}">
              </div>
              <div>
                 <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Data do Show/Jogo</label>
                 <input id="dataEvento" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match ? formatData(match.data_jogo) : ''}">
              </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
                <label class="block text-xs font-bold text-emerald-600 uppercase mb-1">Início das Apostas</label>
                <input id="dataInicio" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-emerald-200 rounded-lg" value="${match ? formatData(match.data_inicio_apostas) : ''}">
            </div>
            <div>
                <label class="block text-xs font-bold text-rose-500 uppercase mb-1">Fim das Apostas</label>
                <input id="dataLimite" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-rose-200 rounded-lg" value="${match ? formatData(match.data_limite_aposta) : ''}">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Dia de apuração</label>
                <input id="dataApuracao" type="datetime-local" class="swal2-input w-full m-0 h-10 text-sm border-gray-300 rounded-lg" value="${match && match.data_apuracao ? formatData(match.data_apuracao) : ''}" placeholder="Opcional">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Salvar BID',
      preConfirm: () => {
        const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value;
        const titulo = getVal('titulo');
        const dataJogo = getVal('dataEvento');

        // Geração do motivo de auditoria 100% invisível e automático
        let motivo = '';
        if (isClone) {
          motivo = `Clonagem do evento: ${match.titulo} -> ${titulo}`;
        } else if (isEdit) {
          motivo = `Edição do evento: ${titulo}`;
        } else {
          motivo = `Criação do evento: ${titulo}`;
        }

        if (!titulo || !dataJogo) {
          Swal.showValidationMessage('Título e Data do Show/Jogo são obrigatórios.');
          return false;
        }

        const getTextarea = (id: string) => (document.getElementById(id) as HTMLTextAreaElement)?.value ?? '';
        /** Envia data/hora em ISO UTC para o backend gravar em UTC (evita diferença de fuso). */
        const toIsoUtc = (v: string) => (v ? new Date(v).toISOString() : '');

        const formData = new FormData();
        formData.append('titulo', titulo);
        formData.append('grupo_id', getVal('grupoId'));
        formData.append(
          'setor_evento_id',
          (document.getElementById('setorEventoId') as HTMLSelectElement)?.value ?? 'null',
        );
        formData.append('banner', getVal('banner'));
        formData.append('subtitulo', getVal('subtitulo'));
        formData.append('informacoes_extras', getTextarea('informacoesExtras'));
        formData.append('link_extra', getVal('linkExtra'));
        formData.append('local', getVal('local'));
        formData.append('data_jogo', toIsoUtc(dataJogo) || dataJogo);
        formData.append('data_inicio_apostas', toIsoUtc(getVal('dataInicio')) || getVal('dataInicio'));
        formData.append('data_limite_aposta', toIsoUtc(getVal('dataLimite')) || getVal('dataLimite'));
        formData.append('data_apuracao', toIsoUtc(getVal('dataApuracao')) || '');
        formData.append('quantidade_premios', String(Number(getVal('qtdPremios')) || 1));
        formData.append('motivo', motivo);
        formData.append('adminId', String(this.currentUser.id));

        return formData;
      },
    });

    if (formValues) {
      this.loading = true;
      const req = isEdit
        ? this.matchService.updateMatch(match.id, formValues)
        : this.matchService.createMatch(formValues);

      req.subscribe({
        next: () => {
          Swal.fire({
            title: 'Sucesso!',
            text: 'BID salvo com sucesso.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
          this.carregar();
        },
        error: () => {
          this.loading = false;
          Swal.fire('Erro', 'Falha ao salvar BID.', 'error');
        },
      });
    }
  }

  async finalizarJogo(match: any) {
    const qtdVencedores = match.quantidade_premios_efetiva ?? match.quantidade_premios ?? 1;
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Encerrar Leilão?',
      html: `
        <div class="text-left bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm mb-4">
            <p class="font-bold text-amber-800 mb-2">Atenção:</p>
            <ul class="list-disc pl-4 text-amber-700 space-y-1">
                <li>Os <b>Top ${qtdVencedores}</b> maiores lances vencerão${(match.ingressos_recebidos || 0) > 0 ? ' (incl. ' + match.ingressos_recebidos + ' recebidos de outros BIDs)' : ''}.</li>
                <li>Todos os outros serão <b>REEMBOLSADOS</b> integralmente.</li>
            </ul>
        </div>
        <input id="swal-motivo-fim" class="swal2-input w-full m-0 text-sm" placeholder="Motivo/Auditoria (Obrigatório)">
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'Sim, Encerrar',
      preConfirm: () => {
        const m = (document.getElementById('swal-motivo-fim') as HTMLInputElement).value;
        if (!m) Swal.showValidationMessage('O motivo é obrigatório!');
        return m;
      },
    });

    if (isConfirmed && motivo) {
      this.loading = true;
      this.matchService
        .finishMatch({ partidaId: match.id, adminId: this.currentUser.id, motivo })
        .subscribe({
          next: () => {
            Swal.fire('Concluído', 'Vencedores definidos e reembolsos processados.', 'success');
            this.carregar();
          },
          error: () => {
            this.loading = false;
            Swal.fire('Erro', 'Não foi possível encerrar o leilão.', 'error');
          },
        });
    }
  }

  private getValorCampoListaPortaria(item: any, key: string): string | number {
    switch (key) {
      case 'titular_nome': return item.titular_nome ?? '';
      case 'titular_setor': return item.titular_setor || 'N/A';
      case 'retirante_nome': return item.retirante_nome || 'Pendente de indicação';
      case 'retirante_cpf': return item.retirante_cpf || '---';
      case 'lance_pago': return item.lance_pago ?? '';
      case 'assinatura': return '';
      default: return '';
    }
  }

  baixarRelatorio(match: any, tipo: 'pdf' | 'excel') {
    this.settingsService.getExportSettings().pipe(
      catchError(() => of(null)),
      switchMap((settings) =>
        this.matchService.getWinnersReport(match.id).pipe(
          map((dados: any) => ({ settings, dados })),
        ),
      ),
    ).subscribe({
      next: ({ settings, dados }: { settings: Record<string, string> | null; dados: any[] }) => {
        if (!dados || dados.length === 0) {
          Swal.fire('Vazio', 'Não há ganhadores para este evento.', 'info');
          return;
        }
        const fields = this.settingsService.parseListaPortariaFields(settings).filter((f) => f.enabled !== false);
        const colunas = fields.map((f) => f.label);
        const formatoTabela = dados.map((item: any) =>
          fields.map((f) => this.getValorCampoListaPortaria(item, f.key)),
        );
        const nomeArquivo = `Lista_Portaria_${match.titulo.replace(/\s+/g, '_')}`;
        const pdfStyle = this.settingsService.parseExportPdfStyle(settings);

        if (tipo === 'pdf') {
          const useLetterhead = this.settingsService.useLetterhead(settings);
          const letterheadPath = settings?.['export_pdf_letterhead_path'] ?? '';
          if (useLetterhead && letterheadPath) {
            this.settingsService.getLetterheadBlob().subscribe({
              next: (blob) => {
                const pathLower = letterheadPath.toLowerCase();
                const isImageByPath = /\.(png|jpg|jpeg)$/.test(pathLower);
                const useAsImage =
                  blob.size > 0 &&
                  (blob.type.startsWith('image/') || (isImageByPath && (blob.type === '' || blob.type === 'application/octet-stream')));
                if (useAsImage) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, reader.result as string, pdfStyle);
                  };
                  reader.readAsDataURL(blob);
                } else if (blob.type === 'application/pdf' || pathLower.endsWith('.pdf')) {
                  this.renderTimbradoPdfNaPrimeiraPagina(match.titulo, colunas, formatoTabela, nomeArquivo, blob, pdfStyle);
                } else {
                  this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
                }
              },
              error: () => this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle),
            });
          } else {
            this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
          }
        } else {
          this.gerarExcel(colunas, formatoTabela, nomeArquivo);
        }
      },
      error: () => Swal.fire('Erro', 'Falha ao buscar relatório.', 'error'),
    });
  }

  baixarPdfResultadoApostas(match: any) {
    this.settingsService.getExportSettings().pipe(
      catchError(() => of(null)),
      switchMap((settings) =>
        this.matchService.getBetsReport(match.id).pipe(
          map((dados: any) => ({ settings, dados })),
        ),
      ),
    ).subscribe({
      next: ({ settings, dados }: { settings: Record<string, string> | null; dados: any[] }) => {
        if (!dados || dados.length === 0) {
          Swal.fire('Vazio', 'Não há apostas registadas para este evento.', 'info');
          return;
        }
        const colunas = ['Data e hora', 'Participante', 'Lance (pts)', 'Resultado'];
        const fmtData = (iso: string | null | undefined) => {
          if (!iso) return '—';
          try {
            return new Date(iso).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
          } catch {
            return String(iso);
          }
        };
        const statusLabel = (s: string) => {
          if (s === 'GANHOU') return 'Ganhou';
          if (s === 'PERDEU') return 'Perdeu';
          if (s === 'PENDENTE') return 'Pendente';
          return s || '—';
        };
        const formatoTabela = dados.map((row: any) => [
          fmtData(row.data_aposta),
          row.nome_completo ?? '',
          row.valor_pago ?? '',
          statusLabel(String(row.status ?? '')),
        ]);
        const nomeArquivo = `Resultado_BID_${match.titulo.replace(/\s+/g, '_')}`;
        const pdfStyle = this.settingsService.parseExportPdfStyle(settings);

        const useLetterhead = this.settingsService.useLetterhead(settings);
        const letterheadPath = settings?.['export_pdf_letterhead_path'] ?? '';
        if (useLetterhead && letterheadPath) {
          this.settingsService.getLetterheadBlob().subscribe({
            next: (blob) => {
              const pathLower = letterheadPath.toLowerCase();
              const isImageByPath = /\.(png|jpg|jpeg)$/.test(pathLower);
              const useAsImage =
                blob.size > 0 &&
                (blob.type.startsWith('image/') ||
                  (isImageByPath && (blob.type === '' || blob.type === 'application/octet-stream')));
              if (useAsImage) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, reader.result as string, pdfStyle);
                };
                reader.readAsDataURL(blob);
              } else if (blob.type === 'application/pdf' || pathLower.endsWith('.pdf')) {
                this.renderTimbradoPdfNaPrimeiraPagina(match.titulo, colunas, formatoTabela, nomeArquivo, blob, pdfStyle);
              } else {
                this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
              }
            },
            error: () => this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle),
          });
        } else {
          this.gerarPDF(match.titulo, colunas, formatoTabela, nomeArquivo, undefined, pdfStyle);
        }
      },
      error: () => Swal.fire('Erro', 'Falha ao buscar relatório de apostas.', 'error'),
    });
  }

  /** Constrói o PDF de conteúdo (título + tabela) sem timbrado. Usado para fusão com timbrado PDF. */
  private buildConteudoPdf(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    style: ExportPdfStyle,
  ): jsPDF {
    const doc = new jsPDF();
    const startY = 20;
    const titleRgb = this.settingsService.hexToRgb(style.colorTitle);
    const subtitleRgb = this.settingsService.hexToRgb(style.colorSubtitle);
    const headerRgb = this.settingsService.hexToRgb(style.colorTableHeader);
    const altRgb = this.settingsService.hexToRgb(style.colorTableAlt);

    doc.setFont(style.fontFamily, 'normal');
    doc.setFontSize(style.fontSizeTitle);
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text(style.title, 14, startY);
    doc.setFontSize(style.fontSizeSubtitle);
    doc.setTextColor(subtitleRgb[0], subtitleRgb[1], subtitleRgb[2]);
    doc.text(`${style.subtitleEventoLabel} ${tituloEvento}`, 14, startY + 8);
    doc.text(`${style.subtitleGeradoLabel} ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 14);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: startY + 22,
      theme: 'grid',
      headStyles: { fillColor: headerRgb },
      alternateRowStyles: { fillColor: altRgb },
    });
    return doc;
  }

  /** Renderiza a primeira página do PDF do timbrado como imagem e gera um único PDF (timbrado no topo + lista abaixo). */
  private async renderTimbradoPdfNaPrimeiraPagina(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadPdfBlob: Blob,
    style: ExportPdfStyle,
  ): Promise<void> {
    try {
      const dataUrl = await this.pdfFirstPageToDataUrl(letterheadPdfBlob);
      if (dataUrl) {
        this.gerarPDF(tituloEvento, colunas, linhas, nomeArquivo, dataUrl, style);
      } else {
        await this.gerarPDFComTimbradoPdf(tituloEvento, colunas, linhas, nomeArquivo, letterheadPdfBlob, style);
      }
    } catch {
      await this.gerarPDFComTimbradoPdf(tituloEvento, colunas, linhas, nomeArquivo, letterheadPdfBlob, style);
    }
  }

  /** Converte a primeira página de um PDF (blob) em data URL PNG para usar como imagem no jsPDF. */
  private async pdfFirstPageToDataUrl(blob: Blob): Promise<string | null> {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  /** Gera o PDF com papel timbrado em PDF: primeira página = timbrado, seguintes = conteúdo. */
  private async gerarPDFComTimbradoPdf(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadPdfBlob: Blob,
    style: ExportPdfStyle,
  ): Promise<void> {
    try {
      const s = style ?? this.settingsService.parseExportPdfStyle(null);
      const contentDoc = this.buildConteudoPdf(tituloEvento, colunas, linhas, s);
      const contentBytes = contentDoc.output('arraybuffer');

      const letterheadBytes = await letterheadPdfBlob.arrayBuffer();
      const letterheadPdf = await PDFDocument.load(letterheadBytes);
      const contentPdf = await PDFDocument.load(contentBytes);
      const mergedPdf = await PDFDocument.create();

      const letterheadPageCount = letterheadPdf.getPageCount();
      const letterheadIndices = Array.from({ length: letterheadPageCount }, (_, i) => i);
      const letterheadPages = await mergedPdf.copyPages(letterheadPdf, letterheadIndices);
      letterheadPages.forEach((p) => mergedPdf.addPage(p));

      const contentPageCount = contentPdf.getPageCount();
      const contentIndices = Array.from({ length: contentPageCount }, (_, i) => i);
      const contentPages = await mergedPdf.copyPages(contentPdf, contentIndices);
      contentPages.forEach((p) => mergedPdf.addPage(p));

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nomeArquivo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao mesclar PDF com timbrado:', err);
      this.gerarPDF(tituloEvento, colunas, linhas, nomeArquivo, undefined, style);
    }
  }

  gerarPDF(
    tituloEvento: string,
    colunas: string[],
    linhas: any[],
    nomeArquivo: string,
    letterheadDataUrl?: string,
    style?: ExportPdfStyle,
  ) {
    const doc = new jsPDF();
    let startY = 20;
    const s = style ?? this.settingsService.parseExportPdfStyle(null);
    const titleRgb = this.settingsService.hexToRgb(s.colorTitle);
    const subtitleRgb = this.settingsService.hexToRgb(s.colorSubtitle);
    const headerRgb = this.settingsService.hexToRgb(s.colorTableHeader);
    const altRgb = this.settingsService.hexToRgb(s.colorTableAlt);

    if (letterheadDataUrl) {
      const imgW = doc.internal.pageSize.getWidth();
      const imgH = 52;
      const format = letterheadDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(letterheadDataUrl, format, 0, 0, imgW, imgH);
      startY = imgH + 14;
    }

    doc.setFont(s.fontFamily, 'normal');
    doc.setFontSize(s.fontSizeTitle);
    doc.setTextColor(titleRgb[0], titleRgb[1], titleRgb[2]);
    doc.text(s.title, 14, startY);
    doc.setFontSize(s.fontSizeSubtitle);
    doc.setTextColor(subtitleRgb[0], subtitleRgb[1], subtitleRgb[2]);
    doc.text(`${s.subtitleEventoLabel} ${tituloEvento}`, 14, startY + 8);
    doc.text(`${s.subtitleGeradoLabel} ${new Date().toLocaleDateString('pt-BR')}`, 14, startY + 14);

    autoTable(doc, {
      head: [colunas],
      body: linhas,
      startY: startY + 22,
      theme: 'grid',
      headStyles: { fillColor: headerRgb },
      alternateRowStyles: { fillColor: altRgb },
    });
    doc.save(`${nomeArquivo}.pdf`);
  }

  gerarExcel(colunas: string[], linhas: any[], nomeArquivo: string) {
    const dadosExcel = [colunas, ...linhas];
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dadosExcel);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista Portaria');
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  }
}

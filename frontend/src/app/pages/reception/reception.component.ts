import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, interval, Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-100 pb-6 sm:pb-10 font-sans">
      <header
        class="bg-indigo-900 text-white shadow-md sticky top-0 z-30"
      >
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:p-4">
          <div
            class="relative flex items-center justify-center lg:justify-start w-full px-3 pt-3 pb-2 border-b border-indigo-700/50 lg:border-0 lg:px-0 lg:pt-0 lg:pb-0 lg:w-auto"
          >
            <div class="flex items-center gap-2 lg:gap-3 min-w-0 justify-center lg:justify-start lg:flex-1">
              <span class="text-2xl lg:text-3xl shrink-0 leading-none">📱</span>
              <div class="min-w-0">
                <h1
                  class="text-base lg:text-xl font-black tracking-tight leading-none whitespace-nowrap text-center lg:text-left"
                >
                  Concierge BID
                </h1>
                <p
                  class="hidden lg:block text-[9px] lg:text-[10px] text-indigo-200 uppercase tracking-widest mt-0.5"
                >
                  Gestão de Portaria e Acessos
                </p>
              </div>
            </div>
            <div
              class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-500 shadow-inner shrink-0 lg:hidden"
            >
              PT
            </div>
          </div>

          <div
            class="flex items-center justify-center gap-2 w-full px-3 py-2 pb-3 lg:px-0 lg:py-0 lg:pb-0 lg:w-auto lg:shrink-0 lg:justify-end lg:flex-wrap"
          >
            <div
              class="flex items-center gap-2 shrink-0 lg:min-w-[150px] lg:max-w-[210px]"
            >
              <label class="text-[9px] font-black uppercase tracking-widest text-indigo-200 shrink-0">
                Dia
              </label>
              <input
                type="date"
                [ngModel]="selectedDate"
                (ngModelChange)="onSelectDate($event)"
                [min]="minDateIso"
                class="w-[132px] lg:flex-1 lg:min-w-0 bg-indigo-900/70 text-white border border-indigo-700 rounded-lg px-2 py-1.5 text-[11px] font-bold text-center lg:text-left outline-none focus:ring-2 focus:ring-indigo-400 [color-scheme:dark]"
              />
            </div>
            <div class="flex items-center gap-2 shrink-0">
            <a
              routerLink="/reception/confirmados"
              class="text-emerald-200 hover:text-white flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-xs font-bold transition-colors bg-indigo-800 hover:bg-emerald-700/50 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg border border-indigo-600 hover:border-emerald-500 active:scale-95 shrink-0"
              title="Ver convidados já confirmados"
            >
              <span class="text-sm lg:text-base leading-none">✅</span>
              <span>Confirmados</span>
            </a>
            <button
              (click)="carregarTudoUnificado()"
              class="text-indigo-200 hover:text-white flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-xs font-bold transition-colors bg-indigo-800 hover:bg-indigo-700 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg border border-indigo-600 active:scale-95 shrink-0"
              title="Sincronizar dados agora"
            >
              <span class="text-sm lg:text-base leading-none">↻</span>
              <span>Sincronizar</span>
            </button>
            <button
              type="button"
              (click)="logout()"
              class="text-rose-200 hover:text-white flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-xs font-bold transition-colors bg-indigo-800 hover:bg-rose-700/60 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg border border-rose-500/50 hover:border-rose-400 active:scale-95 shrink-0"
              title="Sair do Sistema"
            >
              <span class="text-sm lg:text-base leading-none">🚪</span>
              <span class="hidden sm:inline">Sair</span>
            </button>
            </div>

            <span
              *ngIf="selectedDate"
              class="text-[10px] lg:text-xs font-bold text-indigo-200 hidden lg:flex flex-col border-l border-indigo-700 pl-2 lg:pl-4 max-w-[200px] xl:max-w-xs text-right leading-tight shrink-0"
              [title]="resumoDiaSelecionado()"
            >
              <span class="text-indigo-300/90">{{ resumoDiaSelecionado() }}</span>
            </span>
            <div
              class="hidden lg:flex w-8 h-8 lg:w-10 lg:h-10 bg-indigo-700 rounded-full items-center justify-center font-bold text-xs lg:text-base border border-indigo-500 shadow-inner shrink-0"
            >
              PT
            </div>
          </div>
        </div>
      </header>

      <main class="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div
          *ngIf="!loading && events.length === 0"
          class="bg-white p-6 sm:p-8 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 text-center"
        >
          <span class="text-4xl block mb-2">📅</span>
          <h3 class="font-black text-gray-800 text-sm sm:text-base">Nenhum evento nesta data</h3>
        </div>

        <div
          *ngIf="!loading && events.length > 0 && allGuests.length === 0"
          class="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 text-center"
        >
          <p class="text-amber-900 font-bold text-sm">Nenhum convidado na lista para esta data</p>
          <p class="text-amber-800/80 text-xs mt-1">
            Não há ingressos BID (apostas ganhas) nem inscrições WT Pass com vaga vinculadas aos eventos deste dia.
          </p>
        </div>

        <div
          *ngIf="!loading && allGuests.length > 0 && guestsParaEstatisticas().length > 0"
          class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch"
        >
          <div
            *ngIf="primeiroEventoDoDia() as ev"
            class="relative rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-hidden shrink-0 w-full sm:w-40 md:w-48 lg:w-52 self-stretch min-h-[160px] sm:min-h-0"
          >
            <img
              [src]="getEventBannerUrl(ev)"
              [alt]="ev.titulo"
              class="absolute inset-0 w-full h-full object-cover"
              (error)="onBannerError($event)"
            />
          </div>

          <div class="bg-white p-3 sm:p-4 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 flex-1 min-w-0">
          <div
            *ngIf="events.length > 0"
            class="mb-3 pb-3 border-b border-gray-100"
          >
            <p
              class="font-black text-indigo-900 text-[10px] sm:text-xs leading-tight line-clamp-2 uppercase"
              [title]="primeiroEventoDoDia()?.titulo"
            >
              {{ primeiroEventoDoDia()?.titulo }}
            </p>
          </div>
          <h3
            class="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2"
          >
            <span>🏢</span> Resumo por Empresa
          </h3>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            <div
              *ngFor="let emp of estatisticasEmpresas"
              class="bg-gray-50 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow min-w-0"
            >
              <div
                class="font-black text-indigo-900 text-[10px] sm:text-xs uppercase mb-0.5 sm:mb-1 truncate"
                [title]="emp.nome"
              >
                {{ emp.nome }}
              </div>
              <div class="text-[9px] sm:text-[10px] font-bold text-gray-500 mb-1.5 sm:mb-2">
                🎟️ {{ emp.total }} Ingressos
              </div>
              <div
                class="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-bold border-t border-gray-200/60 pt-1.5 sm:pt-2 flex-wrap"
              >
                <span
                  class="text-emerald-600 bg-emerald-50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm border border-emerald-100"
                  >✅ {{ emp.liberados }}</span
                >
                <span
                  class="text-amber-600 bg-amber-50 px-1 sm:px-1.5 py-0.5 rounded shadow-sm border border-amber-100"
                  >⏳ {{ emp.pendentes }}</span
                >
              </div>
            </div>
          </div>
          </div>
        </div>

        <div
          class="bg-white p-3 sm:p-4 rounded-xl lg:rounded-2xl shadow-md border border-gray-200 flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between sticky top-[88px] lg:top-[72px] z-20"
        >
          <div class="relative w-full lg:w-1/3 min-w-0">
            <span class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar nome, CPF, empresa, tipo, setor..."
              class="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl py-2.5 sm:py-3 pl-10 sm:pl-12 pr-3 sm:pr-4 text-xs sm:text-sm font-bold outline-none transition-all shadow-inner"
            />
          </div>

          <div
            *ngIf="!loading && allGuests.length > 0"
            class="flex flex-wrap items-center justify-center lg:justify-end gap-1.5 sm:gap-2 w-full lg:w-auto"
          >
            <div
              class="flex items-center gap-1.5 sm:gap-2.5 bg-indigo-50 border border-indigo-100 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl min-w-0"
              title="Total de Ingressos"
            >
              <span class="text-base sm:text-xl leading-none shrink-0">🎟️</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-400 truncate"
                  >Total</span
                >
                <span class="text-sm sm:text-lg font-black text-indigo-700 leading-none">{{ totalConvidados }}</span>
              </div>
            </div>
            <div
              class="flex items-center gap-1.5 sm:gap-2.5 bg-emerald-50 border border-emerald-100 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl min-w-0"
            >
              <span class="text-base sm:text-xl leading-none shrink-0">✅</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-500 truncate"
                  >Entraram</span
                >
                <span class="text-sm sm:text-lg font-black text-emerald-600 leading-none">{{ totalLiberados }}</span>
              </div>
            </div>
            <div
              class="flex items-center gap-1.5 sm:gap-2.5 bg-amber-50 border border-amber-100 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl min-w-0"
            >
              <span class="text-base sm:text-xl leading-none shrink-0">⏳</span>
              <div class="flex flex-col min-w-0">
                <span class="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-500 truncate"
                  >Pendentes</span
                >
                <span class="text-sm sm:text-lg font-black text-amber-600 leading-none">{{ totalPendentes }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          *ngIf="(exibirFiltroStatus || exibirAbasTipo || exibirAbasSetor) && !loading && allGuests.length > 0"
          class="flex flex-col sm:flex-row gap-2 sm:gap-3"
        >
          <div
            *ngIf="exibirFiltroStatus"
            class="bg-white p-2 sm:p-3 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar flex-1 min-w-0"
          >
            <div class="flex items-center gap-2 min-w-max">
              <button
                *ngFor="let st of statusDisponiveis"
                type="button"
                (click)="selecionarStatus(st.key)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all border shrink-0"
                [ngClass]="
                  selectedStatusKey === st.key
                    ? st.key === 'LIBERADOS'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                "
              >
                <span>{{ st.label }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black"
                  [ngClass]="
                    selectedStatusKey === st.key
                      ? st.key === 'LIBERADOS'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-400 text-white'
                      : st.key === 'LIBERADOS'
                        ? 'bg-white text-emerald-600 border border-emerald-100'
                        : 'bg-white text-amber-600 border border-amber-100'
                  "
                >
                  {{ st.total }}
                </span>
              </button>
            </div>
          </div>

          <div
            *ngIf="exibirAbasTipo"
            class="bg-white p-2 sm:p-3 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar flex-1 min-w-0"
          >
            <div class="flex items-center gap-2 min-w-max">
              <button
                *ngFor="let tipo of tiposDisponiveis"
                type="button"
                (click)="selecionarTipo(tipo.key)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all border shrink-0"
                [ngClass]="
                  selectedTipoKey === tipo.key
                    ? tipo.key === 'WT_PASS'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                "
              >
                <span>{{ tipo.label }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black"
                  [ngClass]="
                    selectedTipoKey === tipo.key
                      ? tipo.key === 'WT_PASS'
                        ? 'bg-violet-500 text-white'
                        : 'bg-indigo-500 text-white'
                      : 'bg-white text-indigo-600 border border-indigo-100'
                  "
                >
                  {{ tipo.total }}
                </span>
              </button>
            </div>
          </div>

          <div
            *ngIf="exibirAbasSetor"
            class="bg-white p-2 sm:p-3 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar flex-1 min-w-0"
          >
            <div class="flex items-center gap-2 min-w-max">
              <button
                *ngFor="let setor of setoresDisponiveis"
                type="button"
                (click)="selecionarSetor(setor.key)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all border shrink-0"
                [ngClass]="
                  selectedSetorKey === setor.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                "
              >
                <span>{{ setor.label }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black"
                  [ngClass]="
                    selectedSetorKey === setor.key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-indigo-600 border border-indigo-100'
                  "
                >
                  {{ setor.total }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="text-center py-12 sm:py-20">
          <div
            class="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto mb-3 sm:mb-4"
          ></div>
          <p class="text-gray-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs px-2">
            Carregando lista de convidados...
          </p>
        </div>

        <div
          *ngIf="!loading && allGuests.length > 0 && guestsDoSetorAtivo().length === 0"
          class="bg-white p-6 sm:p-8 rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 text-center"
        >
          <span class="text-4xl block mb-2">📋</span>
          <h3 class="font-black text-gray-800 text-sm sm:text-base">{{ mensagemListaVaziaFiltro() }}</h3>
          <p class="text-gray-500 text-xs mt-1">{{ mensagemListaVaziaSubtitulo() }}</p>
        </div>

        <!-- Lista mobile: só Titular + Convidado, ao clicar abre modal com tudo -->
        <div
          *ngIf="!loading && guestsDoSetorAtivo().length > 0"
          class="md:hidden space-y-2"
        >
          <div
            *ngFor="let group of filteredGuests()"
            (click)="openDetailModal(group)"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm"
              [ngClass]="
                group.checkin
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-gray-200 text-gray-600'
              "
            >
              {{ group.checkin ? '✓' : inicialRetirante(group) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-black text-gray-900 text-sm truncate">{{ group.retirante_nome }}</p>
              <p class="text-xs text-gray-500 truncate">Titular: {{ group.titular_nome }}</p>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5">CPF {{ cpfRetiranteOuTitular(group) }}</p>
              <p class="text-[10px] text-violet-600 font-bold mt-0.5">{{ rotuloTipoConvite(group.tipo_convite) }}</p>
              <p *ngIf="group.setor_evento_nome" class="text-[10px] text-gray-500 truncate mt-0.5">
                Setor: {{ group.setor_evento_nome }}
              </p>
            </div>
            <span
              *ngIf="group.checkin"
              class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0"
            >
              Liberado
            </span>
            <span
              *ngIf="!group.checkin"
              class="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0"
            >
              Pendente
            </span>
          </div>
        </div>

        <!-- Tabela desktop -->
        <div
          *ngIf="!loading && guestsDoSetorAtivo().length > 0"
          class="hidden md:block bg-white rounded-xl lg:rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-w-0"
        >
          <div class="overflow-x-auto custom-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
            <table class="w-full table-fixed min-w-full text-left text-sm lg:min-w-[680px]">
              <thead
                class="bg-indigo-50/50 text-indigo-900 uppercase font-black text-[9px] sm:text-[10px] tracking-wider border-b border-gray-200"
              >
                <tr>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden md:table-cell w-[12%]">Usuário (Titular)</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden lg:table-cell w-[10%]">Empresa</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden xl:table-cell w-[7%]">Tipo</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden xl:table-cell min-w-[140px] w-[14%]">Setor</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 sticky left-0 z-10 bg-indigo-50/50 min-w-[140px] lg:min-w-[180px] w-[18%]">Convidado (Retirante)</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center w-[9%]">Status</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center w-[10%]">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  *ngFor="let group of filteredGuests()"
                  class="hover:bg-gray-50 transition-colors group"
                >
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-bold text-gray-700 text-xs hidden md:table-cell">{{ group.titular_nome }}</td>

                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden lg:table-cell">
                    <div
                      class="inline-block max-w-[130px] truncate align-middle bg-indigo-100 text-indigo-800 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-black tracking-wider uppercase border border-indigo-200 cursor-help"
                      title="{{ group.empresa }}"
                    >
                      {{ group.empresa }}
                    </div>
                  </td>

                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden xl:table-cell">
                    <span
                      class="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border"
                      [ngClass]="
                        (group.tipo_convite || 'BID') === 'WT_PASS'
                          ? 'bg-violet-100 text-violet-800 border-violet-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      "
                    >
                      {{ rotuloTipoConvite(group.tipo_convite) }}
                    </span>
                  </td>
                  <td
                    class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden xl:table-cell align-top whitespace-normal break-words text-[10px] font-bold text-gray-600"
                    [title]="group.setor_evento_nome || ''"
                  >
                    {{ group.setor_evento_nome || '—' }}
                  </td>

                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    <div class="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div
                        class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 font-black text-[10px] sm:text-xs"
                        [ngClass]="
                          group.checkin
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-200 text-gray-600'
                        "
                      >
                        {{ group.checkin ? '✓' : inicialRetirante(group) }}
                      </div>
                      <div class="min-w-0">
                        <div class="font-black text-gray-900 text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span class="truncate">{{ group.retirante_nome }}</span>
                          <span
                            class="xl:hidden inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0"
                            [ngClass]="
                              (group.tipo_convite || 'BID') === 'WT_PASS'
                                ? 'bg-violet-100 text-violet-800 border-violet-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            "
                            >{{ rotuloTipoConvite(group.tipo_convite) }}</span
                          >
                        </div>
                        <div class="text-[9px] sm:text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                          CPF: {{ cpfRetiranteOuTitular(group) }}
                        </div>
                        <div
                          class="xl:hidden text-[9px] text-gray-500 truncate mt-0.5"
                          *ngIf="group.setor_evento_nome"
                        >
                          Setor: {{ group.setor_evento_nome }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center">
                    <span
                      *ngIf="group.checkin"
                      class="bg-emerald-50 text-emerald-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center justify-center gap-1 w-max mx-auto"
                    >
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                      Liberado
                    </span>
                    <span
                      *ngIf="!group.checkin"
                      class="bg-amber-50 text-amber-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider border border-amber-100 flex items-center justify-center gap-1 w-max mx-auto"
                    >
                      <span class="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0"></span>
                      Pendente
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-center">
                    <button
                      *ngIf="!group.checkin"
                      (click)="abrirAssinatura(group); $event.stopPropagation()"
                      class="w-full min-w-[120px] sm:min-w-0 bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2"
                    >
                      <span>✍️</span> Liberar
                    </button>
                    <div *ngIf="group.checkin" class="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                      <button
                        (click)="verAssinatura(group.assinatura)"
                        class="min-w-0 text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span>👁️</span> Assin.
                      </button>
                      <button
                        *ngIf="group.documento"
                        (click)="verDocumento(group.documento)"
                        class="min-w-0 text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                      >
                        <span>📄</span> Doc.
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div
        *ngIf="showSignatureModal"
        class="fixed inset-0 bg-gray-900/90 z-50 flex flex-col items-center justify-center p-2 sm:p-4 touch-none backdrop-blur-sm"
      >
        <div
          class="bg-white w-full max-w-lg rounded-xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh] min-h-0"
        >
          <div class="p-3 sm:p-4 bg-indigo-50 border-b border-indigo-100 text-center relative shrink-0">
            <h3 class="font-black text-indigo-900 text-base sm:text-lg uppercase tracking-tight">
              Identificação na Portaria
            </h3>
            <p class="text-[10px] sm:text-xs text-indigo-600 mt-1 font-medium">
              Identificação do convidado
            </p>
          </div>

          <div class="p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar bg-gray-50 space-y-3 sm:space-y-4 min-h-0">
            <div class="space-y-3">
              <p
                class="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center mb-1"
              >
                Dados de quem vai entrar
              </p>

              <div
                *ngFor="let ticket of ingressosParaAssinar; let i = index"
                class="bg-white p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-gray-200 shadow-sm relative"
              >
                <div
                  class="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 bg-indigo-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-md"
                >
                  {{ i + 1 }}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 pl-1 sm:pl-2">
                  <div>
                    <label
                      class="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                      >Nome Completo</label
                    >
                    <input
                      [(ngModel)]="ticket.recebedor_nome"
                      placeholder="Ex: João da Silva"
                      class="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-colors read-only:bg-gray-100 read-only:text-gray-700"
                    />
                  </div>
                  <div>
                    <label
                      class="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                      >CPF (Apenas números)</label
                    >
                    <input
                      [(ngModel)]="ticket.recebedor_cpf"
                      placeholder="00000000000"
                      maxlength="14"
                      class="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-colors font-mono read-only:bg-gray-100 read-only:text-gray-700"
                    />
                  </div>
                </div>
                <div class="mt-2 sm:mt-3 pl-1 sm:pl-2">
                  <label
                    class="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                    >Foto do documento (RG/CNH) da pessoa (opcional)</label
                  >
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onDocumentoSelected($event, ticket)"
                    class="w-full text-[10px] sm:text-xs font-medium file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-bold file:cursor-pointer"
                  />
                  <div *ngIf="ticket.recebedor_documento" class="mt-2 flex items-center gap-2 flex-wrap">
                    <img
                      [src]="ticket.recebedor_documento"
                      alt="Documento"
                      class="h-16 w-auto rounded border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      (click)="removerDocumento(ticket)"
                      class="text-[9px] font-bold text-rose-500 hover:bg-rose-50 py-1 px-3 rounded border border-rose-200 transition-colors uppercase"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <hr class="border-gray-200" />

            <div>
              <p
                class="text-[10px] text-gray-500 uppercase font-black tracking-widest flex items-center justify-center gap-2 mb-2"
              >
                <span>👇</span> Assinatura do Responsável
              </p>
              <canvas
                #signatureCanvas
                class="bg-white border-2 border-dashed border-indigo-300 rounded-xl sm:rounded-2xl shadow-inner w-full h-32 sm:h-40 touch-none cursor-crosshair"
                (touchstart)="startDrawing($event)"
                (touchmove)="draw($event)"
                (touchend)="stopDrawing()"
                (mousedown)="startDrawing($event)"
                (mousemove)="draw($event)"
                (mouseup)="stopDrawing()"
                (mouseleave)="stopDrawing()"
              >
              </canvas>
              <div class="text-center mt-2">
                <button
                  (click)="limparAssinatura()"
                  class="text-[9px] font-black text-rose-500 hover:bg-rose-50 py-1.5 px-4 rounded-full border border-rose-200 transition-colors uppercase tracking-wider"
                >
                  🧹 Limpar / Refazer
                </button>
              </div>
            </div>
          </div>

          <div class="p-2.5 sm:p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
            <button
              (click)="fecharModal()"
              class="flex-1 sm:w-1/3 py-2.5 sm:py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-[10px] sm:text-xs"
            >
              Cancelar
            </button>
            <button
              (click)="confirmarCheckinLote()"
              class="flex-[2] sm:w-2/3 py-2.5 sm:py-3 rounded-xl font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-xs sm:text-sm uppercase tracking-wide"
            >
              Liberar entrada
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de detalhes (mobile): todas as informações + ações -->
      <div
        *ngIf="selectedGroupForModal"
        class="fixed inset-0 bg-gray-900/80 z-40 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 backdrop-blur-sm"
        (click)="closeDetailModal()"
      >
        <div
          class="bg-white w-full rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[90vh] sm:max-h-[85vh]"
          (click)="$event.stopPropagation()"
        >
          <div class="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between shrink-0">
            <h3 class="font-black text-indigo-900 text-sm uppercase tracking-tight">
              Detalhes do ingresso
            </h3>
            <button
              type="button"
              (click)="closeDetailModal()"
              class="p-2 rounded-lg hover:bg-indigo-100 text-indigo-700 transition-colors"
              aria-label="Fechar"
            >
              <span class="text-xl leading-none">×</span>
            </button>
          </div>
          <div class="p-4 flex-1 overflow-y-auto space-y-4">
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo de convite</p>
              <p class="font-bold text-gray-800 text-sm">{{ rotuloTipoConvite(selectedGroupForModal.tipo_convite) }}</p>
            </div>
            <div *ngIf="selectedGroupForModal.setor_evento_nome">
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Setor do evento</p>
              <p class="font-bold text-gray-800 text-sm">{{ selectedGroupForModal.setor_evento_nome }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Titular</p>
              <p class="font-bold text-gray-800 text-sm">{{ selectedGroupForModal.titular_nome }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresa</p>
              <p class="font-bold text-gray-800 text-sm">{{ selectedGroupForModal.empresa }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Convidado (Retirante)</p>
              <p class="font-bold text-gray-800 text-sm">{{ selectedGroupForModal.retirante_nome }}</p>
              <p class="text-xs text-gray-500 font-mono mt-0.5">CPF: {{ cpfRetiranteOuTitular(selectedGroupForModal) }}</p>
            </div>
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Evento</p>
              <p class="font-bold text-gray-800 text-sm">{{ selectedGroupForModal.evento_titulo }}</p>
              <p class="text-xs text-gray-500 mt-0.5">
                📅 {{ selectedGroupForModal.data_evento | date: 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div>
              <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
              <span
                *ngIf="selectedGroupForModal.checkin"
                class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase border border-emerald-100"
              >
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Liberado
              </span>
              <span
                *ngIf="!selectedGroupForModal.checkin"
                class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase border border-amber-100"
              >
                <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
                Pendente
              </span>
            </div>
          </div>
          <div class="p-4 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
            <button
              *ngIf="!selectedGroupForModal.checkin"
              (click)="abrirAssinatura(selectedGroupForModal); closeDetailModal()"
              class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✍️</span> Iniciar Liberação
            </button>
            <button
              *ngIf="selectedGroupForModal.checkin"
              (click)="verAssinatura(selectedGroupForModal.assinatura)"
              class="flex-1 text-indigo-600 bg-white border-2 border-indigo-200 hover:bg-indigo-50 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>👁️</span> Ver Assinatura
            </button>
            <button
              *ngIf="selectedGroupForModal.checkin && selectedGroupForModal.documento"
              (click)="verDocumento(selectedGroupForModal.documento)"
              class="flex-1 text-indigo-600 bg-white border-2 border-indigo-200 hover:bg-indigo-50 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>📄</span> Ver Documento
            </button>
            <button
              (click)="closeDetailModal()"
              class="px-4 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReceptionComponent implements OnInit, OnDestroy {
  apiUrl = `${environment.apiUri}/reception`;

  currentUser: any = {};
  loading = false;
  events: any[] = [];
  selectedDate = ReceptionComponent.hojeLocalIso();
  minDateIso = ReceptionComponent.hojeLocalIso();
  allGuests: any[] = [];
  /** Uma linha por ingresso (sem agrupar por retirante). */
  guestsList: any[] = [];

  private static readonly SETOR_TODOS = '__todos__';
  private static readonly SETOR_SEM = '__sem_setor__';
  private static readonly TIPO_TODOS = '__todos_tipo__';

  searchTerm = '';
  selectedStatusKey: 'PENDENTES' | 'LIBERADOS' = 'PENDENTES';
  statusDisponiveis: { key: 'PENDENTES' | 'LIBERADOS'; label: string; total: number }[] = [];
  exibirFiltroStatus = false;
  selectedSetorKey = ReceptionComponent.SETOR_TODOS;
  setoresDisponiveis: { key: string; label: string; total: number }[] = [];
  exibirAbasSetor = false;
  selectedTipoKey = ReceptionComponent.TIPO_TODOS;
  tiposDisponiveis: { key: string; label: string; total: number }[] = [];
  exibirAbasTipo = false;

  /** CPF do retirante ou do titular quando não houver indicação (usa `titular_cpf` da API). */
  cpfRetiranteOuTitular(g: any): string {
    const r = g?.retirante_cpf;
    const t = g?.titular_cpf;
    const rs = r != null ? String(r).trim() : '';
    if (rs && rs !== '---') return rs;
    const ts = t != null ? String(t).trim() : '';
    return ts || '---';
  }

  /** Só dígitos para pré-preencher o check-in (vazio se não houver CPF). */
  cpfParaCampoCheckin(g: any): string {
    const v = this.cpfRetiranteOuTitular(g);
    if (!v || v === '---') return '';
    return v.replace(/\D/g, '');
  }

  rotuloTipoConvite(tipo: string | undefined): string {
    const t = String(tipo || 'BID').toUpperCase().trim();
    return t === 'WT_PASS' ? 'WT Pass' : 'BID';
  }

  inicialRetirante(g: any): string {
    const n = String(g?.retirante_nome || g?.titular_nome || '?').trim();
    return n ? n.charAt(0).toUpperCase() : '?';
  }

  totalConvidados = 0;
  totalLiberados = 0;
  totalPendentes = 0;
  estatisticasEmpresas: { nome: string; total: number; liberados: number; pendentes: number }[] =
    [];

  selectedGroup: any = null;
  showSignatureModal = false;
  ingressosParaAssinar: any[] = [];
  selectedGroupForModal: any = null;

  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;
  private isDrawing = false;
  private isCanvasEmpty = true;

  // Variável para gerenciar o refresh automático
  private autoRefreshSub?: Subscription;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  logout() {
    this.authService.logout();
  }

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarTudoUnificado();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy() {
    // Evita vazamento de memória quando sair da tela
    if (this.autoRefreshSub) {
      this.autoRefreshSub.unsubscribe();
    }
  }

  iniciarAutoRefresh() {
    // Atualiza silenciosamente a cada 30 segundos
    this.autoRefreshSub = interval(30000).subscribe(() => {
      // SÓ ATUALIZA SE O MODAL ESTIVER FECHADO!
      // Assim o guarda não perde o que estava a escrever/assinar
      if (!this.showSignatureModal) {
        this.carregarTudoUnificado(true);
      }
    });
  }

  // Adicionado parâmetro 'silencioso' para não mostrar a tela de loading no auto-refresh
  carregarTudoUnificado(silencioso = false) {
    if (!silencioso) {
      this.loading = true;
      this.cd.detectChanges();
    }

    this.http.get<any[]>(`${this.apiUrl}/events/today?date=${this.selectedDate}`).subscribe({
      next: (eventsRes) => {
        this.events = Array.isArray(eventsRes) ? eventsRes : [];
        if (this.events.length === 0) {
          this.allGuests = [];
          if (!silencioso) this.loading = false;
          this.agruparEAtualizar();
          this.cd.detectChanges();
          return;
        }

        const guestRequests = this.events.map((ev) => {
          const tipoEvento = String(ev.tipo_evento || 'BID').toUpperCase();
          const guestsUrl = `${this.apiUrl}/events/${ev.id}/guests?tipo=${tipoEvento === 'WT_PASS' ? 'WT_PASS' : 'BID'}`;
          return this.http.get<any[]>(guestsUrl).pipe(
            map((guestsRes) => {
              const raw = Array.isArray(guestsRes) ? guestsRes : [];
              return raw.map((g) => ({
                ...g,
                checkin: g.checkin === true || g.checkin === 1 || g.checkin === '1',
                partida_id:
                  ev.partida_id != null
                    ? Number(ev.partida_id)
                    : tipoEvento === 'BID'
                      ? ev.id
                      : null,
                evento_rh_id:
                  ev.evento_rh_id != null
                    ? Number(ev.evento_rh_id)
                    : tipoEvento === 'WT_PASS'
                      ? ev.id
                      : null,
                tipo_evento: tipoEvento,
                evento_titulo: ev.titulo,
                data_evento: ev.data_evento || ev.data_jogo,
              }));
            }),
            catchError(() => of([])),
          );
        });

        forkJoin(guestRequests).subscribe({
          next: (results) => {
            this.allGuests = results
              .flat()
              .sort((a, b) =>
                String(a.retirante_nome || a.titular_nome || '').localeCompare(
                  String(b.retirante_nome || b.titular_nome || ''),
                  'pt',
                  { sensitivity: 'base' },
                ),
              );
            if (!silencioso) this.loading = false;
            this.agruparEAtualizar();
            this.cd.detectChanges();
          },
          error: () => {
            this.allGuests = [];
            if (!silencioso) this.loading = false;
            this.agruparEAtualizar();
            this.cd.detectChanges();
          },
        });
      },
      error: () => {
        if (!silencioso) this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  onSelectDate(date: string) {
    if (!date || date === this.selectedDate) return;
    if (date < this.minDateIso) return;
    this.selectedDate = date;
    this.carregarTudoUnificado(false);
  }

  resumoDiaSelecionado(): string {
    if (!this.selectedDate) return '';
    const [y, m, d] = this.selectedDate.split('-');
    const dataFmt = `${d}/${m}/${y}`;
    if (this.events.length === 0) return `Sem eventos · ${dataFmt}`;
    return `${this.events.length} evento(s) · ${dataFmt}`;
  }

  primeiroEventoDoDia(): any | null {
    return this.events.length > 0 ? this.events[0] : null;
  }

  getEventBannerUrl(ev: { banner?: string | null; id?: number }): string {
    if (!ev?.banner) return 'assets/banner-placeholder.jpg';
    if (String(ev.banner).startsWith('http')) return ev.banner;
    if (ev.banner === 'db' && ev.id) return `${environment.apiUri}/matches/${ev.id}/banner`;
    return uploadsPublicUrl(ev.banner);
  }

  onBannerError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) img.src = 'assets/banner-placeholder.jpg';
  }

  private static hojeLocalIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  agruparEAtualizar() {
    this.guestsList = this.allGuests.map((guest) => ({
      ...guest,
      documento: guest.documento ?? null,
      quantidade_ingressos: 1,
      ingressos_liberados: guest.checkin ? 1 : 0,
      ingressos_detalhes: [
        {
          ingresso_id: guest.ingresso_id,
          inscricao_rh_id: guest.inscricao_rh_id,
          aposta_id: guest.aposta_id,
          checkin: guest.checkin,
          recebedor_nome: guest.recebedor_nome || '',
          recebedor_cpf: guest.recebedor_cpf || '',
        },
      ],
    }));

    this.atualizarStatusDisponiveis();
    this.atualizarTiposDisponiveis();
    this.atualizarSetoresDisponiveis();
    this.recalcularEstatisticas(this.guestsParaEstatisticas());
  }

  private isCheckin(guest: any): boolean {
    return guest?.checkin === true || guest?.checkin === 1 || guest?.checkin === '1';
  }

  guestsDoStatusAtivo(): any[] {
    if (this.selectedStatusKey === 'LIBERADOS') {
      return this.guestsList.filter((guest) => this.isCheckin(guest));
    }
    return this.guestsList.filter((guest) => !this.isCheckin(guest));
  }

  /** Estatísticas do header/resumo — tipo/setor, sem filtro de status. */
  guestsParaEstatisticas(): any[] {
    return this.filtrarPorSetor(this.filtrarPorTipo(this.guestsList));
  }

  private filtrarPorTipo(base: any[]): any[] {
    if (this.selectedTipoKey === ReceptionComponent.TIPO_TODOS || !this.exibirAbasTipo) {
      return base;
    }
    return base.filter((guest) => this.tipoKey(guest) === this.selectedTipoKey);
  }

  private filtrarPorSetor(base: any[]): any[] {
    if (this.selectedSetorKey === ReceptionComponent.SETOR_TODOS || !this.exibirAbasSetor) {
      return base;
    }
    return base.filter(
      (guest) => this.setorKey(guest.setor_evento_nome) === this.selectedSetorKey,
    );
  }

  atualizarStatusDisponiveis() {
    let pendentes = 0;
    let liberados = 0;
    this.guestsList.forEach((guest) => {
      if (this.isCheckin(guest)) liberados++;
      else pendentes++;
    });
    this.exibirFiltroStatus = this.guestsList.length > 0;
    this.statusDisponiveis = [
      { key: 'PENDENTES', label: 'Pendentes', total: pendentes },
      { key: 'LIBERADOS', label: 'Liberados', total: liberados },
    ];
  }

  selecionarStatus(key: 'PENDENTES' | 'LIBERADOS') {
    if (this.selectedStatusKey === key) return;
    this.selectedStatusKey = key;
    this.atualizarTiposDisponiveis();
    this.atualizarSetoresDisponiveis();
    this.cd.detectChanges();
  }

  tipoKey(guest: any): 'BID' | 'WT_PASS' {
    return String(guest?.tipo_convite || 'BID').toUpperCase().trim() === 'WT_PASS' ? 'WT_PASS' : 'BID';
  }

  atualizarTiposDisponiveis() {
    const base = this.guestsDoStatusAtivo();
    let totalBid = 0;
    let totalWt = 0;
    base.forEach((guest) => {
      if (this.tipoKey(guest) === 'WT_PASS') totalWt++;
      else totalBid++;
    });

    this.exibirAbasTipo = totalBid > 0 && totalWt > 0;

    if (this.exibirAbasTipo) {
      this.tiposDisponiveis = [
        { key: ReceptionComponent.TIPO_TODOS, label: 'Todos', total: base.length },
        { key: 'BID', label: 'BID', total: totalBid },
        { key: 'WT_PASS', label: 'WT Pass', total: totalWt },
      ];
    } else {
      this.tiposDisponiveis = [];
    }

    const keysValidas = new Set(this.tiposDisponiveis.map((t) => t.key));
    if (!keysValidas.has(this.selectedTipoKey)) {
      this.selectedTipoKey = ReceptionComponent.TIPO_TODOS;
    }
  }

  guestsDoTipoAtivo(): any[] {
    return this.filtrarPorTipo(this.guestsDoStatusAtivo());
  }

  selecionarTipo(key: string) {
    if (this.selectedTipoKey === key) return;
    this.selectedTipoKey = key;
    this.atualizarSetoresDisponiveis();
    this.recalcularEstatisticas(this.guestsParaEstatisticas());
    this.cd.detectChanges();
  }

  mensagemListaVaziaFiltro(): string {
    const statusLbl = this.selectedStatusKey === 'LIBERADOS' ? 'liberado' : 'pendente';
    const tipo =
      this.selectedTipoKey === 'WT_PASS'
        ? 'WT Pass'
        : this.selectedTipoKey === 'BID'
          ? 'BID'
          : null;
    const setor =
      this.selectedSetorKey !== ReceptionComponent.SETOR_TODOS && this.exibirAbasSetor
        ? this.setorLabel(this.selectedSetorKey)
        : null;
    if (tipo && setor) return `Nenhum ingresso ${statusLbl} ${tipo} no setor ${setor}`;
    if (tipo) return `Nenhum ingresso ${statusLbl} ${tipo} nesta data`;
    if (setor) return `Nenhum ingresso ${statusLbl} no setor ${setor}`;
    if (this.selectedStatusKey === 'PENDENTES') return 'Nenhum ingresso pendente';
    return 'Nenhum ingresso liberado';
  }

  mensagemListaVaziaSubtitulo(): string {
    const temLiberados = (this.statusDisponiveis.find((s) => s.key === 'LIBERADOS')?.total ?? 0) > 0;
    const temPendentes = (this.statusDisponiveis.find((s) => s.key === 'PENDENTES')?.total ?? 0) > 0;
    if (this.selectedStatusKey === 'PENDENTES' && temLiberados) {
      return 'Use o filtro Liberados para ver os ingressos já liberados.';
    }
    if (this.selectedStatusKey === 'LIBERADOS' && temPendentes) {
      return 'Use o filtro Pendentes para ver quem ainda aguarda liberação.';
    }
    return 'Ajuste os filtros de status, tipo ou setor para ver outros convidados.';
  }

  setorKey(nome: string | null | undefined): string {
    const trimmed = nome != null ? String(nome).trim() : '';
    return trimmed ? trimmed : ReceptionComponent.SETOR_SEM;
  }

  setorLabel(key: string): string {
    if (key === ReceptionComponent.SETOR_SEM) return 'Sem setor';
    return key;
  }

  atualizarSetoresDisponiveis() {
    const base = this.guestsDoTipoAtivo();
    const mapa = new Map<string, number>();
    base.forEach((guest) => {
      const key = this.setorKey(guest.setor_evento_nome);
      mapa.set(key, (mapa.get(key) || 0) + 1);
    });

    const setoresReais = Array.from(mapa.entries())
      .map(([key, total]) => ({ key, label: this.setorLabel(key), total }))
      .sort((a, b) => {
        if (a.key === ReceptionComponent.SETOR_SEM) return 1;
        if (b.key === ReceptionComponent.SETOR_SEM) return -1;
        return a.label.localeCompare(b.label, 'pt');
      });

    this.exibirAbasSetor = setoresReais.length > 1;

    if (this.exibirAbasSetor) {
      this.setoresDisponiveis = [
        {
          key: ReceptionComponent.SETOR_TODOS,
          label: 'Todos',
          total: base.length,
        },
        ...setoresReais,
      ];
    } else {
      this.setoresDisponiveis = [];
    }

    const keysValidas = new Set(this.setoresDisponiveis.map((s) => s.key));
    if (!keysValidas.has(this.selectedSetorKey)) {
      this.selectedSetorKey = ReceptionComponent.SETOR_TODOS;
    }
  }

  guestsDoSetorAtivo(): any[] {
    return this.filtrarPorSetor(this.guestsDoTipoAtivo());
  }

  selecionarSetor(key: string) {
    if (this.selectedSetorKey === key) return;
    this.selectedSetorKey = key;
    this.recalcularEstatisticas(this.guestsParaEstatisticas());
    this.cd.detectChanges();
  }

  private recalcularEstatisticas(guests: any[]) {
    const mapaEmpresas = new Map<string, any>();

    this.totalConvidados = 0;
    this.totalLiberados = 0;
    this.totalPendentes = 0;

    guests.forEach((guest) => {
      this.totalConvidados++;
      if (this.isCheckin(guest)) this.totalLiberados++;
      else this.totalPendentes++;

      const nomeEmpresa = guest.empresa || 'Geral';
      if (!mapaEmpresas.has(nomeEmpresa)) {
        mapaEmpresas.set(nomeEmpresa, { nome: nomeEmpresa, total: 0, liberados: 0, pendentes: 0 });
      }
      const stat = mapaEmpresas.get(nomeEmpresa);
      stat.total++;
      if (this.isCheckin(guest)) stat.liberados++;
      else stat.pendentes++;
    });

    this.estatisticasEmpresas = Array.from(mapaEmpresas.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );
  }

  filteredGuests() {
    const base = this.guestsDoSetorAtivo();
    if (!this.searchTerm) return base;
    const term = this.searchTerm.toLowerCase();
    const termDigits = term.replace(/\D/g, '');

    return base.filter((g) => {
      const cpf = this.cpfRetiranteOuTitular(g);
      const tipoLbl = this.rotuloTipoConvite(g.tipo_convite).toLowerCase();
      const setor = g.setor_evento_nome != null ? String(g.setor_evento_nome).toLowerCase() : '';
      return (
        (g.retirante_nome && g.retirante_nome.toLowerCase().includes(term)) ||
        (cpf !== '---' && (cpf.includes(term) || (termDigits.length > 0 && cpf.includes(termDigits)))) ||
        (g.empresa && g.empresa.toLowerCase().includes(term)) ||
        (g.titular_nome && g.titular_nome.toLowerCase().includes(term)) ||
        (g.evento_titulo && g.evento_titulo.toLowerCase().includes(term)) ||
        tipoLbl.includes(term) ||
        (setor && setor.includes(term))
      );
    });
  }

  abrirAssinatura(guest: any) {
    if (guest.checkin) return;

    this.selectedGroup = guest;

    this.ingressosParaAssinar = [
      {
        ingresso_id: guest.ingresso_id ?? null,
        inscricao_rh_id: guest.inscricao_rh_id ?? null,
        partida_id: guest.partida_id ?? null,
        evento_rh_id: guest.evento_rh_id ?? null,
        checkin: guest.checkin,
        recebedor_nome: guest.retirante_nome || guest.titular_nome || '',
        recebedor_cpf: this.cpfParaCampoCheckin(guest),
        recebedor_documento: null as string | null,
      },
    ];

    this.showSignatureModal = true;
    this.isCanvasEmpty = true;

    setTimeout(() => {
      const canvas = this.signatureCanvas.nativeElement;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      this.ctx = canvas.getContext('2d');
      if (this.ctx) {
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#312e81';
      }
    }, 100);
  }

  fecharModal() {
    this.showSignatureModal = false;
    this.selectedGroup = null;
    this.ingressosParaAssinar = [];
  }

  openDetailModal(group: any) {
    this.selectedGroupForModal = group;
  }

  closeDetailModal() {
    this.selectedGroupForModal = null;
  }

  onDocumentoSelected(event: Event, ticket: any) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      ticket.recebedor_documento = dataUrl;
      input.value = '';
      this.cd.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removerDocumento(ticket: any) {
    ticket.recebedor_documento = null;
    this.cd.detectChanges();
  }

  private getCoordinates(event: MouseEvent | TouchEvent) {
    const canvas = this.signatureCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
  }

  startDrawing(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.isDrawing = true;
    this.isCanvasEmpty = false;
    const { x, y } = this.getCoordinates(event);
    this.ctx?.beginPath();
    this.ctx?.moveTo(x, y);
  }

  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing) return;
    event.preventDefault();
    const { x, y } = this.getCoordinates(event);
    this.ctx?.lineTo(x, y);
    this.ctx?.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  limparAssinatura() {
    const canvas = this.signatureCanvas.nativeElement;
    this.ctx?.clearRect(0, 0, canvas.width, canvas.height);
    this.isCanvasEmpty = true;
  }

  confirmarCheckinLote() {
    const inputsInvalidos = this.ingressosParaAssinar.filter(
      (t) => !t.recebedor_nome || !t.recebedor_cpf,
    );
    if (inputsInvalidos.length > 0) {
      Swal.fire(
        'Atenção',
        'Por favor, preencha o Nome e o CPF de quem vai entrar.',
        'warning',
      );
      return;
    }

    if (this.isCanvasEmpty) {
      Swal.fire('Atenção', 'A assinatura é obrigatória para liberar a entrada.', 'warning');
      return;
    }

    const canvas = this.signatureCanvas.nativeElement;
    const base64Signature = canvas.toDataURL('image/png');

    const requests = this.ingressosParaAssinar.map((ticket: any) => {
      const body: {
        assinaturaBase64: string;
        documentoBase64: unknown;
        recebedorNome: string;
        recebedorCpf: string;
        adminId: number;
        inscricaoRhId?: number;
        partidaId?: number | null;
        eventoRhId?: number | null;
        ingressoId?: number;
      } = {
        assinaturaBase64: base64Signature,
        documentoBase64: ticket.recebedor_documento || null,
        recebedorNome: ticket.recebedor_nome,
        recebedorCpf: ticket.recebedor_cpf,
        adminId: this.currentUser.id,
      };
      if (ticket.inscricao_rh_id != null && Number(ticket.inscricao_rh_id) > 0) {
        body.inscricaoRhId = ticket.inscricao_rh_id;
        if (ticket.partida_id != null && Number(ticket.partida_id) > 0) {
          body.partidaId = ticket.partida_id;
        } else if (ticket.evento_rh_id != null && Number(ticket.evento_rh_id) > 0) {
          body.eventoRhId = ticket.evento_rh_id;
        }
      } else {
        body.ingressoId = ticket.ingresso_id;
      }
      return this.http.post(`${this.apiUrl}/checkin`, body);
    });

    forkJoin(requests).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Entrada liberada!',
          text: 'O check-in foi registrado com sucesso.',
          timer: 2000,
          showConfirmButton: false,
        });

        // Atualiza a base de dados local para refletir na tela
        this.allGuests.forEach((guest) => {
          const ingressoAtualizado = this.ingressosParaAssinar.find(
            (t) =>
              (t.ingresso_id != null && t.ingresso_id === guest.ingresso_id) ||
              (t.inscricao_rh_id != null && t.inscricao_rh_id === guest.inscricao_rh_id),
          );
          if (ingressoAtualizado) {
            guest.checkin = true;
            guest.assinatura = base64Signature;
            guest.documento = ingressoAtualizado.recebedor_documento ?? guest.documento;
            guest.recebedor_nome = ingressoAtualizado.recebedor_nome;
            guest.recebedor_cpf = ingressoAtualizado.recebedor_cpf;
          }
        });

        this.agruparEAtualizar();
        this.fecharModal();
        this.cd.detectChanges();
      },
      error: () => Swal.fire('Erro', 'Ocorreu um problema ao confirmar os ingressos.', 'error'),
    });
  }

  verAssinatura(base64: string) {
    Swal.fire({
      title: 'Assinatura Registrada',
      imageUrl: base64,
      imageAlt: 'Assinatura do convidado',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Fechar',
    });
  }

  verDocumento(base64: string | null | undefined) {
    if (!base64) return;
    Swal.fire({
      title: 'Documento Registrado',
      imageUrl: base64,
      imageAlt: 'Documento do convidado',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Fechar',
    });
  }
}

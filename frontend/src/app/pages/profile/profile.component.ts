import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { MatchService } from '../../services/match.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import { ThemeService, AppTheme, APP_THEMES } from '../../services/theme.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-gray-50,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-white,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-gray-50\\/30,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-gray-50\\/50 {
        background-color: var(--color-bg-secondary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .border-gray-50,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .border-gray-100,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .border-gray-200 {
        border-color: var(--color-border-primary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-900,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-800,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-700 {
        color: var(--color-text-primary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-600,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-500 {
        color: var(--color-text-secondary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-400,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-gray-300 {
        color: var(--color-text-tertiary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .hover\\:bg-gray-50\\/50:hover {
        background-color: var(--color-bg-hover);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-indigo-50,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-indigo-100 {
        background-color: rgba(99, 102, 241, 0.18);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-indigo-600 {
        background-color: var(--color-primary);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .hover\\:bg-indigo-700:hover {
        background-color: var(--color-primary-dark);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-indigo-700,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-indigo-600 {
        color: var(--color-primary-light);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-emerald-50 {
        background-color: rgba(16, 185, 129, 0.16);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-emerald-700,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-emerald-600 {
        color: var(--color-success);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-amber-50 {
        background-color: rgba(245, 158, 11, 0.16);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-amber-700,
      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-amber-600 {
        color: var(--color-warning);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-blue-50 {
        background-color: rgba(59, 130, 246, 0.16);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-blue-500 {
        color: var(--color-info);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-rose-50 {
        background-color: rgba(244, 63, 94, 0.16);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .text-rose-600 {
        color: var(--color-danger);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-emerald-200 {
        background-color: rgba(16, 185, 129, 0.28);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-amber-200 {
        background-color: rgba(245, 158, 11, 0.28);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-rose-200 {
        background-color: rgba(244, 63, 94, 0.28);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .hover\\:bg-emerald-400:hover {
        background-color: rgba(16, 185, 129, 0.4);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .hover\\:bg-amber-400:hover {
        background-color: rgba(245, 158, 11, 0.4);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .hover\\:bg-rose-400:hover {
        background-color: rgba(244, 63, 94, 0.4);
      }

      :host-context([data-theme='escuro']), :host-context([data-theme^='escuro-']) .bg-gray-800 {
        background-color: #111827;
      }

      .profile-theme-switch {
        width: 100%;
        display: grid;
        place-items: center;
      }

      .profile-theme-switch label {
        cursor: pointer;
      }

      .profile-theme-switch.disabled label {
        cursor: not-allowed;
        opacity: 0.7;
      }

      .profile-theme-switch #profile-theme-checkbox {
        display: none;
      }

      .profile-theme-switch .toggle {
        height: 40px;
        width: 110px;
        border-radius: 9999px;
        background: linear-gradient(to bottom, #6ec8ff, #1f73a7);
        position: relative;
        overflow: hidden;
        box-shadow: 6px 6px 10px #0000003d;
        transition: all 0.5s ease-in-out;
      }

      .profile-theme-switch .mountains {
        height: 100%;
        width: 100%;
        position: absolute;
        z-index: 3;
        background-color: #1d7371;
        transition: all 0.5s ease-in-out;
        clip-path: polygon(
          0% 80%,
          25% 50%,
          40% 70%,
          60% 35%,
          65% 45%,
          80% 20%,
          100% 80%,
          100% 100%,
          0% 100%
        );
      }

      .profile-theme-switch .cloud {
        height: 4px;
        width: 10px;
        border-radius: 9999px;
        background-color: #fff;
        position: absolute;
        top: 20%;
        left: 10%;
        filter: opacity(0.5);
      }

      .profile-theme-switch .sea {
        height: 110px;
        width: 300%;
        border-radius: 50%;
        position: absolute;
        right: 50%;
        bottom: -500%;
        transform: translateX(50%);
        transition: all 0.5s ease-in-out;
        background: linear-gradient(to bottom, #3f75cc, #06063b, #06063b, #06063b, #06063b);
      }

      .profile-theme-switch .sea::before {
        content: '';
        height: 12px;
        width: 7px;
        background-color: rgba(254, 254, 254, 0.34);
        filter: blur(5px);
        position: absolute;
        top: 2%;
        left: 43%;
      }

      .profile-theme-switch .star {
        height: 2px;
        width: 2px;
        position: absolute;
        top: -50%;
        right: 15%;
        background-color: #fff;
        transition: all 0.5s ease-in-out;
        filter: blur(0.8px);
        border-radius: 50%;
      }

      .profile-theme-switch .star::before {
        content: '';
        height: 100%;
        width: 100%;
        position: absolute;
        top: -50%;
        right: 20px;
        background-color: #fff;
        transition: all 0.5s ease-in-out;
        border-radius: 50%;
      }

      .profile-theme-switch .star::after {
        content: '';
        height: 100%;
        width: 100%;
        position: absolute;
        top: 10px;
        right: -20px;
        background-color: #fff;
        transition: all 0.5s ease-in-out;
        border-radius: 50%;
      }

      .profile-theme-switch .cloud::before {
        content: '';
        height: 6px;
        width: 6px;
        border-radius: 50%;
        background-color: #fff;
        position: absolute;
        top: -50%;
        right: 50%;
        transform: translateX(50%);
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle {
        background: linear-gradient(to bottom, #036daf, #003d63);
      }

      .profile-theme-switch .toggle::before {
        content: '';
        height: 20px;
        width: 20px;
        position: absolute;
        top: 18%;
        right: 30%;
        border-radius: 50%;
        background-color: #ffd34d;
        transition: all 0.5s ease-in-out;
        box-shadow: 0 0 15px #fef95fc3;
      }

      .profile-theme-switch .toggle::after {
        content: '';
        height: 18px;
        width: 18px;
        position: absolute;
        top: 20%;
        left: -60%;
        border-radius: 50%;
        background-color: #fff;
        transition: all 0.5s ease-in-out;
        box-shadow: 0 0 10px #ffffff88;
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle::before {
        transform: translateX(210%);
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle::after {
        transform: translateX(340%);
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle .mountains {
        background-color: #05021a;
        transform: translateY(100%);
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle .sea {
        background-color: #05021a;
        bottom: -210%;
      }

      .profile-theme-switch #profile-theme-checkbox:checked + .toggle .star {
        transform: rotate(10deg);
        top: 20%;
      }
    `,
  ],
  template: `
    <div class="min-h-full w-full flex flex-col min-h-0 bg-[var(--app-bg)]">
      <div class="flex-1 flex flex-col min-h-0 w-full px-4 sm:px-4 lg:px-0 space-y-4 lg:space-y-6 pb-4 lg:pb-0">
        <div
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 flex-shrink-0 lg:flex-1 lg:min-h-0 lg:items-stretch"
        >
          <div
            class="lg:col-span-3 lg:h-full lg:min-h-0 bg-[var(--color-bg-surface)] rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] overflow-hidden flex flex-col relative pb-6 lg:pb-8"
          >
            <div class="h-24 sm:h-28 lg:h-32 bg-gradient-to-r from-indigo-600 to-blue-500"></div>

            <div class="px-4 sm:px-5 lg:px-6 relative flex-1 flex flex-col items-center text-center">
              <div class="relative -mt-12 sm:-mt-14 lg:-mt-16 mb-3 lg:mb-4 flex justify-center w-full">
                <div class="relative group">
                  <div
                    class="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 rounded-full border-4 lg:border-[6px] border-[var(--color-bg-surface)] bg-[var(--color-bg-surface)] overflow-hidden flex items-center justify-center"
                  >
                    <img
                      *ngIf="user?.foto"
                      [src]="avatarUrlFinal"
                      class="w-full h-full object-cover"
                      alt="Foto de perfil"
                    />
                    <div
                      *ngIf="!user?.foto"
                      class="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl sm:text-3xl lg:text-4xl font-black uppercase"
                    >
                      {{ (user?.nome_completo || 'U').charAt(0) }}
                    </div>
                  </div>
                  <button
                    (click)="fileInput.click()"
                    class="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 sm:p-2 rounded-full cursor-pointer transition-transform hover:scale-110"
                  >
                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      ></path>
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </button>
                  <input
                    #fileInput
                    type="file"
                    (change)="onFileSelected($event)"
                    class="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <h1 class="text-lg sm:text-xl lg:text-2xl font-black text-[var(--app-text)] leading-tight truncate max-w-full px-1">
                {{ user?.nome_completo || 'Carregando...' }}
              </h1>
              <p class="text-xs sm:text-sm text-[var(--app-text-muted)] mt-0.5 truncate max-w-full px-1">{{ user?.email || user?.username }}</p>

              <p
                class="text-[10px] sm:text-[11px] font-black text-indigo-700 mt-2 uppercase tracking-widest bg-indigo-50 px-2 sm:px-3 py-1 rounded-lg"
              >
                {{ user?.setor || user?.setor_nome || 'Geral' }}
              </p>

              <div class="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2">
                <span
                  class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  [class]="
                    user?.perfil === 'ADMIN' || user?.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-indigo-50 text-indigo-700'
                  "
                >
                  {{ user?.perfil || user?.role || 'USER' }}
                </span>
                <span
                  class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700"
                >
                  Conta Ativa
                </span>
              </div>

              <div class="mt-4 w-full max-w-xs">
                <p class="text-[10px] font-black text-[var(--app-text-muted)] uppercase tracking-widest mb-2">Tema</p>
                <select
                  [ngModel]="selectedTheme"
                  (ngModelChange)="alterarTema($event)"
                  [disabled]="themeSaving"
                  class="w-full rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  @for (opt of themeOptions; track opt.value) {
                    <option [value]="opt.value">{{ opt.label }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 lg:h-full lg:min-h-0 flex flex-col sm:flex-row lg:flex-col gap-3 h-full">
            <div
              class="bg-[var(--color-bg-surface)] p-4 sm:p-5 rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
            >
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100"
              >
                <img
                  src="/assets/wtoken_coin.png"
                  alt="W Token Coin"
                  class="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm"
                />
              </div>
              <div class="min-w-0 flex-1 overflow-hidden">
                <p class="text-[9px] sm:text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
                  Saldo Atual
                </p>
                <p class="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-[var(--app-text)] leading-none mt-1 break-words">
                  {{ user?.pontos ?? 0 | number:'1.0-0':'pt' }} <span class="text-xs sm:text-sm font-bold text-[var(--app-text-muted)]">pts</span>
                </p>
              </div>
            </div>

            <div
              class="bg-[var(--color-bg-surface)] p-4 sm:p-5 rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
            >
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100"
              >
                <img
                  src="/assets/wtokenl_trophy.png"
                  alt="Troféu"
                  class="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-sm"
                />
              </div>
              <div class="min-w-0">
                <p class="text-[9px] sm:text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
                  Bids Vencidos
                </p>
                <p class="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--app-text)] leading-none mt-1">
                  {{ stats.bidsVencidos }}
                </p>
              </div>
            </div>

            <div
              class="bg-[var(--color-bg-surface)] p-4 sm:p-5 rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] flex items-center gap-3 sm:gap-4 flex-1 min-w-0"
            >
              <div
                class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl sm:text-3xl border border-blue-100"
              >
                📊
              </div>
              <div class="min-w-0 flex-1 overflow-hidden">
                <p class="text-[9px] sm:text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
                  Média / Lance
                </p>
                <p class="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-[var(--app-text)] leading-none mt-1 break-words">
                  {{ stats.mediaPontos | number:'1.0-0':'pt' }} <span class="text-xs sm:text-sm font-bold text-[var(--app-text-muted)]">pts</span>
                </p>
              </div>
            </div>
          </div>

          <div
            class="lg:col-span-7 lg:h-full lg:min-h-0 bg-[var(--color-bg-surface)] p-4 sm:p-5 lg:p-6 rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] flex flex-col min-w-0"
          >
            <div
              class="flex flex-shrink-0 flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 lg:mb-4"
            >
              <div class="min-w-0">
                <h3 class="text-base sm:text-lg font-black text-[var(--app-text)] tracking-tight">Evolução do Saldo</h3>
                <p class="text-[9px] sm:text-[10px] font-bold text-[var(--app-text-muted)] uppercase tracking-widest">
                  Últimos 30 dias · saldo fim do dia (base + movimentos por tipo)
                </p>
              </div>

              <div class="flex flex-col items-end gap-2 min-w-0">
                <div
                  class="flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[9px] font-black tracking-wider text-[var(--app-text-muted)] uppercase flex-wrap justify-end"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-sm bg-slate-400 shadow-sm ring-1 ring-slate-500/20"></span> Base
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-sm bg-teal-400 shadow-sm ring-1 ring-teal-600/15"></span> Créditos
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-sm bg-sky-400 shadow-sm ring-1 ring-sky-600/15"></span> Bloqueados
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-sm bg-rose-300 shadow-sm ring-1 ring-rose-500/15"></span> Gastos
                  </div>
                </div>
                <div
                  class="text-[9px] sm:text-[10px] font-bold text-[var(--app-text-muted)] text-right leading-snug max-w-full space-y-0.5"
                >
                  <p class="truncate" title="Saldo em pontos disponível para novos lances">
                    Saldo disponível:
                    <span class="text-[var(--app-text)] font-black"
                      >{{ (user?.pontos ?? 0) | number:'1.0-0':'pt' }} pts</span
                    >
                  </p>
                  <p class="truncate" title="Pontos em lances em partidas abertas (mesmo critério do menu)">
                    Bloqueado (em jogo):
                    <span class="text-[var(--app-text)] font-black"
                      >{{ pontosBloqueadosResumo | number:'1.0-0':'pt' }} pts</span
                    >
                  </p>
                </div>
              </div>
            </div>

            <div
              *ngIf="historicoPontos.length === 0"
              class="flex min-h-[12rem] flex-1 flex-col items-center justify-center text-[var(--app-text-muted)] lg:min-h-0"
            >
              <span class="text-4xl mb-2 opacity-50 grayscale">📊</span>
              <span class="text-xs font-bold uppercase tracking-wider"
                >Carregando histórico…</span
              >
            </div>

            <div
              *ngIf="historicoPontos.length > 0"
              class="flex min-h-0 flex-1 flex-col min-w-0"
            >
              <p
                class="mb-2 flex-shrink-0 text-[9px] font-bold text-[var(--app-text-muted)] text-center sm:text-left"
              >
                Toque na coluna do dia para ver o detalhe · no computador, passe o mouse · botões ou arraste para os 30
                dias
              </p>

              <div
                *ngIf="historicoDiaHover as h"
                class="mb-3 flex-shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-3 py-2.5 text-[10px] shadow-sm sm:px-4"
              >
                <div class="mb-1 flex items-start justify-between gap-2">
                  <p class="min-w-0 flex-1 text-[9px] font-medium leading-snug text-[var(--app-text-muted)]">
                    {{ h.eventoResumo || 'Movimentação' }} · {{ h.data }}
                  </p>
                  <button
                    type="button"
                    (click)="fecharDetalheHistorico(); $event.stopPropagation()"
                    class="shrink-0 rounded-md border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--app-text)] active:scale-95"
                  >
                    Fechar
                  </button>
                </div>
                <p class="mt-1 text-center text-sm font-black text-[var(--app-text)]">
                  {{ h.pontosAntes | number:'1.0-0':'pt' }} → {{ h.pontosDepois | number:'1.0-0':'pt' }}
                  <span class="block text-[9px] font-bold text-[var(--app-text-muted)]"
                    >Mov. no dia {{ h.totalDia | number:'1.0-0':'pt' }} pts</span
                  >
                </p>
                <div
                  class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[var(--app-border)] pt-2 text-[9px] text-[var(--app-text-muted)] sm:grid-cols-4"
                >
                  <span>Base <b class="text-[var(--app-text)]">{{ h.pontosAntes | number:'1.0-0':'pt' }}</b></span>
                  <span
                    >Créd. <b class="text-teal-700 dark:text-teal-300">{{ (h.volumeCredito ?? 0) | number:'1.0-0':'pt' }}</b></span
                  >
                  <span
                    >Bloq. <b class="text-sky-700 dark:text-sky-300">{{ (h.volumeBloqueado ?? 0) | number:'1.0-0':'pt' }}</b></span
                  >
                  <span
                    >Gasto <b class="text-rose-700 dark:text-rose-300">{{ (h.volumeGasto ?? 0) | number:'1.0-0':'pt' }}</b></span
                  >
                </div>
              </div>

              <div class="flex min-h-0 w-full flex-1 items-stretch gap-1.5 sm:gap-2">
                <button
                  type="button"
                  (click)="historicoVerDiasMaisAntigos()"
                  [disabled]="historicoScrollNoInicio"
                  class="flex w-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-lg font-black text-[var(--app-text)] shadow-sm transition-all hover:bg-[var(--app-nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--color-bg-surface)] sm:w-10"
                  title="Dias mais antigos"
                  aria-label="Rolar para dias mais antigos"
                >
                  ‹
                </button>
                <div
                  #historicoScroll
                  (scroll)="atualizarEstadoScrollHistorico()"
                  class="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)]/40 px-0 pt-1 pb-2 scroll-smooth sm:px-0.5"
                >
                <div
                  class="relative flex h-full min-h-[12rem] w-max max-w-none min-w-0 items-end justify-start gap-2 border-b border-[var(--app-border)] px-2 pb-12 pt-8 sm:min-h-0 sm:gap-2.5 sm:pb-14 sm:pt-10"
                  [style.minWidth.px]="larguraHistoricoGraficoPx()"
                >
                  <div
                    class="pointer-events-none absolute inset-0 flex flex-col justify-between px-2 pb-12 pt-8 sm:pb-14 sm:pt-10"
                  >
                    <div class="w-full border-t border-dashed border-[var(--app-border)]"></div>
                    <div class="w-full border-t border-dashed border-[var(--app-border)]"></div>
                    <div class="w-full border-t border-dashed border-[var(--app-border)]"></div>
                  </div>

                  <div
                    *ngFor="let item of historicoPontos; trackBy: trackHistoricoDia"
                    role="button"
                    tabindex="0"
                    (mouseenter)="onHistoricoColunaEnter(item)"
                    (mouseleave)="onHistoricoColunaLeave()"
                    (click)="onHistoricoColunaTap(item, $event)"
                    (keydown.enter)="onHistoricoColunaTap(item, $event)"
                    (keydown.space)="$event.preventDefault(); onHistoricoColunaTap(item, $event)"
                    class="group relative z-10 flex h-full w-[52px] shrink-0 cursor-pointer flex-col justify-end touch-manipulation transition-all hover:brightness-[1.02] active:opacity-90"
                    [class.ring-2]="historicoDiaHover?.dataChave === item.dataChave"
                    [class.ring-teal-500/40]="historicoDiaHover?.dataChave === item.dataChave"
                    [class.rounded-t-md]="historicoDiaHover?.dataChave === item.dataChave"
                    [attr.title]="historicoBarTitle(item)"
                  >
                    <div
                      class="absolute -top-5 left-1/2 z-20 max-w-[min(100%,3.25rem)] -translate-x-1/2 truncate px-0.5 text-center text-[7px] font-black tracking-tight text-[var(--app-text)] sm:-top-6 sm:text-[9px]"
                    >
                      {{ item.pontosDepois | number:'1.0-0':'pt' }}
                    </div>

                    <div
                      class="relative z-10 flex min-h-0 w-full flex-1 flex-col justify-end"
                    >
                      <div
                        class="relative w-full min-h-[3px]"
                        [ngStyle]="{ height: alturaColunaSaldoDepois(item) + '%' }"
                      >
                        <div
                          class="flex h-full w-full flex-col overflow-hidden rounded-t-lg border border-[var(--app-border)]/60 bg-[var(--color-bg-surface)]/50 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                        >
                          <div
                            *ngFor="let seg of historicoSegmentosEmpilhados(item)"
                            [style.flex-grow]="seg.weight"
                            class="min-h-[1px] w-full shrink-0"
                            [ngClass]="seg.klass"
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div
                      class="absolute -bottom-8 left-1/2 w-full max-w-full -translate-x-1/2 px-0.5 text-center sm:-bottom-9"
                    >
                      <div
                        class="truncate text-[7px] font-bold leading-tight text-[var(--app-text-muted)] sm:text-[9px]"
                      >
                        {{ item.data }}
                      </div>
                      <div
                        class="mt-0.5 truncate text-[6px] font-black leading-tight text-[var(--app-text)] sm:text-[8px]"
                      >
                        {{ item.pontosDepois | number:'1.0-0':'pt' }}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
                <button
                  type="button"
                  (click)="historicoVerDiasMaisRecentes()"
                  [disabled]="historicoScrollNoFim"
                  class="flex w-9 shrink-0 items-center justify-center self-stretch rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] text-lg font-black text-[var(--app-text)] shadow-sm transition-all hover:bg-[var(--app-nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--color-bg-surface)] sm:w-10"
                  title="Dias mais recentes"
                  aria-label="Rolar para dias mais recentes"
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-[var(--color-bg-surface)] p-4 sm:p-5 md:p-6 lg:p-8 rounded-xl lg:rounded-[2rem] border border-[var(--app-border)] flex-1 flex flex-col min-h-[320px] sm:min-h-[360px] min-w-0"
        >
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 lg:mb-6 flex-shrink-0"
          >
            <div class="min-w-0 flex-1">
              <h2 class="text-xl sm:text-2xl font-black text-[var(--app-text)] tracking-tight leading-tight break-words">
                Meus Convidados (Retirantes)
              </h2>
              <p class="text-xs sm:text-sm text-[var(--app-text-muted)] mt-1 leading-snug break-words">
                Pessoas autorizadas a retirar seus ingressos ganhos na portaria do evento.
              </p>
            </div>
            <button
              (click)="abrirFormularioConvidado()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span class="text-lg leading-none">+</span> Adicionar Convidado
            </button>
          </div>

          <div class="overflow-x-auto overflow-y-auto flex-1 min-h-[200px] rounded-xl lg:rounded-2xl border border-[var(--app-border)] -mx-1 px-1 sm:mx-0 sm:px-0 bg-[var(--color-bg-surface-alt)]">
            <table class="w-full text-left text-sm text-[var(--app-text-muted)] min-w-0">
              <thead
                class="bg-[var(--color-bg-surface-alt)] text-[9px] sm:text-[10px] uppercase font-black text-[var(--app-text-muted)] border-b border-[var(--app-border)] tracking-widest"
              >
                <tr>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4">Nome / Contato</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden md:table-cell">CPF</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden md:table-cell">Eventos Participados</th>
                  <th class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="convidados.length === 0">
                  <td colspan="4" class="text-center py-16 text-[var(--app-text-muted)] font-medium">
                    Nenhum convidado cadastrado.
                  </td>
                </tr>
                <tr
                  *ngFor="let conv of convidados"
                  class="border-b border-[var(--app-border)] hover:bg-[var(--app-nav-hover-bg)] transition-colors"
                >
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
                    <p class="font-black text-[var(--app-text)] text-xs sm:text-sm">{{ conv.nome_completo }}</p>
                    <p class="text-[10px] sm:text-[11px] text-[var(--app-text-muted)] font-medium mt-0.5 hidden md:block truncate max-w-[180px] lg:max-w-none">
                      {{ conv.email || 'Sem e-mail' }} | {{ conv.telefone || 'Sem telefone' }}
                    </p>
                  </td>
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-mono text-[10px] sm:text-xs font-medium hidden md:table-cell">{{ conv.cpf }}</td>
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 hidden md:table-cell">
                    <span
                      *ngIf="conv.eventos_participados"
                      class="text-[var(--app-text-muted)] text-[11px] font-bold italic"
                    >
                      {{ conv.eventos_participados }}
                    </span>
                    <span
                      *ngIf="!conv.eventos_participados"
                      class="text-[var(--app-text-muted)] text-[11px] font-medium italic"
                      >Nenhum evento ainda</span
                    >
                  </td>
                  <td class="px-3 sm:px-4 lg:px-6 py-3 lg:py-4 text-right whitespace-nowrap">
                    <button
                      (click)="abrirFormularioConvidado(conv)"
                      class="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors inline-flex items-center"
                    >
                      Editar
                    </button>
                    <button
                      (click)="excluirConvidado(conv.id)"
                      class="text-rose-600 font-black text-[10px] uppercase tracking-widest bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-colors inline-flex items-center ml-1 sm:ml-2"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  user: any = null;
  apiUrl = environment.apiUri.replace('/api', '');
  convidados: any[] = [];
  selectedTheme: AppTheme = 'claro';
  themeOptions = APP_THEMES;
  themeSaving = false;

  stats = { bidsVencidos: 0, mediaPontos: 0 };

  /** Um item por dia: saldo fim + volumes por tipo (empilhado). */
  historicoPontos: Array<{
    data: string;
    dataChave: string;
    totalDia: number;
    pontosAntes: number;
    pontosDepois: number;
    volumeCredito?: number;
    volumeBloqueado?: number;
    volumeGasto?: number;
    tipo: 'credito' | 'gasto' | 'bloqueado';
    eventoResumo?: string;
  }> = [];
  maxPonto: number = 300;

  /** Soma dos lances em partidas ABERTA com ingresso, alinhada ao menu (Em jogo). */
  pontosBloqueadosResumo = 0;

  @ViewChild('historicoScroll') historicoScrollRef?: ElementRef<HTMLDivElement>;

  /** Desabilita ‹ quando já no primeiro dia; › quando já no último (hoje). */
  historicoScrollNoInicio = true;
  historicoScrollNoFim = true;

  /** Dia sob o mouse — detalhe fixo acima do gráfico (evita tooltip cortado). */
  historicoDiaHover: (typeof this.historicoPontos)[0] | null = null;
  private historicoHoverLeaveTimer?: ReturnType<typeof setTimeout>;

  /** Largura fixa da coluna de cada dia (px), alinhada ao cálculo de `larguraHistoricoGraficoPx`. */
  private readonly historicoBarraLarguraPx = 52;
  private readonly historicoBarraGapPx = 8;

  constructor(
    private userService: UserService,
    private matchService: MatchService,
    private authService: AuthService,
    private guestService: GuestService,
    private themeService: ThemeService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarPerfil();
  }
  avatarUrlFinal: string = '';
  /** Timestamp estável para cache-bust da URL do avatar (evita NG0100). */
  private avatarCacheBust = 0;

  carregarPerfil() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      this.user.nome_completo = this.user.nome_completo || this.user.nome;
      this.user.username = this.user.username || this.user.login;
      this.user.role = this.user.role || this.user.perfil || 'user';
      this.selectedTheme = this.themeService.resolveThemeFromUser(this.user);
      this.themeService.applyTheme(this.selectedTheme);
      this.avatarUrlFinal = this.getAvatarUrlStable(this.user);
      this.carregarConvidados();
      this.carregarEstatisticas();

      if (this.user.id) {
        this.userService.getById(this.user.id).subscribe({
          next: (fullUser: any) => {
            const usuarioAtualizado = {
              ...fullUser,
              role: fullUser.perfil || fullUser.role || this.user.role,
              setor:
                fullUser.setor || fullUser.setor_nome || this.user.setor || this.user.setor_nome,
              nome_completo: fullUser.nome_completo || fullUser.nome || this.user.nome_completo,
            };
            this.user = usuarioAtualizado;
            this.selectedTheme = this.themeService.resolveThemeFromUser(usuarioAtualizado);
            this.themeService.applyTheme(this.selectedTheme);
            localStorage.setItem('currentUser', JSON.stringify(usuarioAtualizado));
            // Atualiza o avatar no próximo ciclo para evitar NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
            setTimeout(() => {
              this.avatarUrlFinal = this.getAvatarUrlStable(this.user);
              this.cd.detectChanges();
            }, 0);
          },
          error: (err) => console.error('Erro ao atualizar perfil:', err),
        });
      }
    } else {
      setTimeout(() => this.carregarPerfil(), 500);
    }
  }

  carregarEstatisticas() {
    if (!this.user || !this.user.id) return;

    this.matchService.getMatches(this.user.id, true).subscribe({
      next: (matches: any[]) => {
        this.pontosBloqueadosResumo = this.calcularPontosBloqueadosEmJogo(matches);
        this.cd.detectChanges();
      },
      error: () => {},
    });

    if (typeof this.userService.getUserStats === 'function') {
      this.userService.getUserStats(this.user.id).subscribe({
        next: (data) => {
          this.stats = data.stats;

          if (data.historico && Array.isArray(data.historico)) {
            const h = data.historico as any[];
            if (h.length && typeof h[0]?.totalDia === 'number') {
              this.historicoPontos = h.map((row: any) => ({
                ...row,
                volumeCredito: Number(row.volumeCredito) || 0,
                volumeBloqueado: Number(row.volumeBloqueado) || 0,
                volumeGasto: Number(row.volumeGasto) || 0,
              }));
            } else {
              this.historicoPontos = this.agregarHistoricoPorDia(h);
            }
          } else {
            this.historicoPontos = [];
          }

          if (this.historicoPontos.length > 0) {
            const saldosFim = this.historicoPontos.map((x) => Number(x.pontosDepois) || 0);
            const maiorSaldo = Math.max(...saldosFim, 1);
            this.maxPonto = Math.max(Math.ceil(maiorSaldo * 1.12), 10);
          } else {
            this.maxPonto = 10;
          }

          this.cd.detectChanges();
          this.agendarScrollHistoricoParaDiasRecentes();
        },
        error: (err) => console.error('Erro ao carregar estatísticas do usuário', err),
      });
    }
  }

  /** Largura mínima da faixa do gráfico (30 dias × coluna fixa + gaps + padding). */
  larguraHistoricoGraficoPx(): number {
    const n = this.historicoPontos?.length ?? 0;
    if (n <= 0) return 0;
    const padInterno = 8;
    return padInterno + n * this.historicoBarraLarguraPx + (n - 1) * this.historicoBarraGapPx;
  }

  /** Alinha a rolagem ao fim: dia atual e dias anteriores visíveis na janela (~6 colunas). */
  private scrollHistoricoParaFim(): void {
    const el = this.historicoScrollRef?.nativeElement;
    if (!el) return;
    el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    this.atualizarEstadoScrollHistorico();
  }

  private agendarScrollHistoricoParaDiasRecentes(): void {
    queueMicrotask(() => {
      this.scrollHistoricoParaFim();
      setTimeout(() => this.scrollHistoricoParaFim(), 60);
      setTimeout(() => this.scrollHistoricoParaFim(), 200);
    });
  }

  atualizarEstadoScrollHistorico(): void {
    const el = this.historicoScrollRef?.nativeElement;
    if (!el) {
      this.historicoScrollNoInicio = true;
      this.historicoScrollNoFim = true;
      return;
    }
    const eps = 4;
    this.historicoScrollNoInicio = el.scrollLeft <= eps;
    this.historicoScrollNoFim = el.scrollLeft + el.clientWidth >= el.scrollWidth - eps;
  }

  /** Rola para a esquerda (dias mais antigos). */
  historicoVerDiasMaisAntigos(): void {
    const el = this.historicoScrollRef?.nativeElement;
    if (!el) return;
    const col = this.historicoBarraLarguraPx + this.historicoBarraGapPx;
    const step = Math.max(col * 3, Math.floor(el.clientWidth * 0.65));
    el.scrollBy({ left: -step, behavior: 'smooth' });
    setTimeout(() => {
      this.atualizarEstadoScrollHistorico();
      this.cd.markForCheck();
    }, 320);
  }

  /** Rola para a direita (dias mais recentes / hoje). */
  historicoVerDiasMaisRecentes(): void {
    const el = this.historicoScrollRef?.nativeElement;
    if (!el) return;
    const col = this.historicoBarraLarguraPx + this.historicoBarraGapPx;
    const step = Math.max(col * 3, Math.floor(el.clientWidth * 0.65));
    el.scrollBy({ left: step, behavior: 'smooth' });
    setTimeout(() => {
      this.atualizarEstadoScrollHistorico();
      this.cd.markForCheck();
    }, 320);
  }

  /** Altura da coluna proporcional ao saldo ao fim do dia. */
  alturaColunaSaldoDepois(item: { pontosDepois: number; totalDia?: number }): number {
    const pd = Number(item.pontosDepois) || 0;
    if (pd <= 0 && !(Number(item.totalDia) > 0)) return 2;
    const pct = this.maxPonto > 0 ? (pd / this.maxPonto) * 100 : 0;
    return Math.min(100, Math.max(pct, 2.5));
  }

  /**
   * Faixas empilhadas (de cima para baixo no DOM = gasto → bloqueado → crédito → saldo início).
   * Proporções = volume de cada parte em relação à soma (base + movimentos do dia).
   */
  historicoSegmentosEmpilhados(item: {
    pontosAntes: number;
    volumeCredito?: number;
    volumeBloqueado?: number;
    volumeGasto?: number;
  }): Array<{ weight: number; klass: string }> {
    const pa = Math.max(0, Number(item.pontosAntes) || 0);
    const vc = Math.max(0, Number(item.volumeCredito) || 0);
    const vb = Math.max(0, Number(item.volumeBloqueado) || 0);
    const vg = Math.max(0, Number(item.volumeGasto) || 0);
    const sum = pa + vc + vb + vg;
    if (sum <= 0) return [{ weight: 1, klass: 'bg-slate-200 dark:bg-slate-600' }];
    const segs: Array<{ weight: number; klass: string }> = [
      { weight: vg, klass: 'bg-rose-300 dark:bg-rose-500/90' },
      { weight: vb, klass: 'bg-sky-300 dark:bg-sky-500/90' },
      { weight: vc, klass: 'bg-teal-400 dark:bg-teal-600/95' },
      { weight: pa, klass: 'bg-slate-300 dark:bg-slate-600/95' },
    ].filter((s) => s.weight > 0);
    return segs.length ? segs : [{ weight: 1, klass: 'bg-slate-200 dark:bg-slate-600' }];
  }

  onHistoricoColunaEnter(item: (typeof this.historicoPontos)[0]): void {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) {
      return;
    }
    if (this.historicoHoverLeaveTimer) {
      clearTimeout(this.historicoHoverLeaveTimer);
      this.historicoHoverLeaveTimer = undefined;
    }
    this.historicoDiaHover = item;
    this.cd.markForCheck();
  }

  onHistoricoColunaLeave(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }
    this.historicoHoverLeaveTimer = setTimeout(() => {
      this.historicoDiaHover = null;
      this.historicoHoverLeaveTimer = undefined;
      this.cd.markForCheck();
    }, 220);
  }

  /** Toque / clique: alterna o dia selecionado (celular e mouse). */
  onHistoricoColunaTap(item: (typeof this.historicoPontos)[0], ev?: Event): void {
    if (this.historicoHoverLeaveTimer) {
      clearTimeout(this.historicoHoverLeaveTimer);
      this.historicoHoverLeaveTimer = undefined;
    }
    if (this.historicoDiaHover?.dataChave === item.dataChave) {
      this.historicoDiaHover = null;
    } else {
      this.historicoDiaHover = item;
    }
    ev?.stopPropagation?.();
    this.cd.markForCheck();
  }

  fecharDetalheHistorico(): void {
    if (this.historicoHoverLeaveTimer) {
      clearTimeout(this.historicoHoverLeaveTimer);
      this.historicoHoverLeaveTimer = undefined;
    }
    this.historicoDiaHover = null;
    this.cd.markForCheck();
  }

  trackHistoricoDia(_index: number, item: { dataChave: string }): string {
    return item.dataChave;
  }

  /** Título nativo da coluna (saldo fim + composição). */
  historicoBarTitle(item: {
    data: string;
    totalDia: number;
    pontosAntes: number;
    pontosDepois: number;
    volumeCredito?: number;
    volumeBloqueado?: number;
    volumeGasto?: number;
  }): string {
    const vc = item.volumeCredito ?? 0;
    const vb = item.volumeBloqueado ?? 0;
    const vg = item.volumeGasto ?? 0;
    return `${item.data}: fim ${item.pontosDepois} pts (${item.pontosAntes}→${item.pontosDepois}) · mov. ${item.totalDia} (C${vc} B${vb} G${vg})`;
  }

  /**
   * Agrupa movimentos por dia (dataChave). totalDia = soma dos módulos de cada movimento;
   * pontosAntes/pontosDepois = saldo antes da 1ª e depois da última movimentação do dia.
   */
  private agregarHistoricoPorDia(
    rows: Array<{
      valor: number;
      tipo: 'credito' | 'gasto' | 'bloqueado';
      data: string;
      dataChave?: string;
      evento?: string;
      pontosAntes?: number;
      pontosDepois?: number;
    }>,
  ): Array<{
    data: string;
    dataChave: string;
    totalDia: number;
    pontosAntes: number;
    pontosDepois: number;
    volumeCredito: number;
    volumeBloqueado: number;
    volumeGasto: number;
    tipo: 'credito' | 'gasto' | 'bloqueado';
    eventoResumo?: string;
  }> {
    if (!rows.length) return [];
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = r.dataChave || r.data;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
    return keys.map((key) => {
      const list = map.get(key)!;
      let volumeCredito = 0;
      let volumeBloqueado = 0;
      let volumeGasto = 0;
      const totalDia = list.reduce((s, x) => {
        const v = Number(x.valor) || 0;
        if (x.tipo === 'credito') volumeCredito += v;
        else if (x.tipo === 'bloqueado') volumeBloqueado += v;
        else volumeGasto += v;
        return s + v;
      }, 0);
      const first = list[0];
      const last = list[list.length - 1];
      const pa = first.pontosAntes ?? 0;
      const pd = last.pontosDepois ?? 0;
      const eventoResumo =
        list.length > 1
          ? `${list.length} movimentações neste dia`
          : first.evento || 'Movimentação';
      return {
        dataChave: key,
        data: first.data,
        totalDia,
        pontosAntes: pa,
        pontosDepois: pd,
        volumeCredito,
        volumeBloqueado,
        volumeGasto,
        tipo: last.tipo,
        eventoResumo,
      };
    });
  }

  /**
   * Mesmo critério de `MainLayoutComponent.carregarEstatisticasGlobais` (raw_lances, data_jogo ≥ hoje).
   */
  private calcularPontosBloqueadosEmJogo(matches: any[]): number {
    let total = 0;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dadosFiltrados = matches.filter((m: any) => {
      if (!m.data_jogo) return true;
      const dataJogo = new Date(m.data_jogo);
      dataJogo.setHours(0, 0, 0, 0);
      return dataJogo.getTime() >= hoje.getTime();
    });
    dadosFiltrados.forEach((match) => {
      const comprados = Number(match.tickets_comprados) || 0;
      if (match.status === 'ABERTA' && comprados > 0 && match.raw_lances) {
        const lancesArray = match.raw_lances.toString().split(',');
        const totalNoEvento = lancesArray.reduce((acc: number, lanceStr: string) => {
          const valor = Number(lanceStr.split(':')[1]) || 0;
          return acc + valor;
        }, 0);
        total += totalNoEvento;
      }
    });
    return total;
  }

  carregarConvidados() {
    if (!this.user || !this.user.id) return;
    this.guestService.getGuests(this.user.id).subscribe({
      next: (data) => {
        this.convidados = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erro ao buscar convidados', err),
    });
  }

  async abrirFormularioConvidado(convidado: any = null) {
    const isEdit = !!convidado;
    const { value: formValues } = await Swal.fire({
      title: `<h3 class="text-xl font-black text-gray-800">${isEdit ? 'Editar Retirante' : 'Novo Retirante'}</h3>`,
      width: '450px',
      html: `
        <div class="space-y-4 text-left px-1 mt-4">
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome Completo</label>
            <input id="swal-nome" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.nome_completo || ''}" placeholder="Nome de quem vai buscar">
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">CPF (Obrigatório para portaria)</label>
            <input id="swal-cpf" maxlength="14" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg font-mono" value="${convidado?.cpf || ''}" placeholder="000.000.000-00">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">E-mail <span class="text-gray-400 font-normal">(Opcional)</span></label>
              <input id="swal-email" type="email" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.email || ''}" placeholder="email@exemplo.com">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Telefone <span class="text-gray-400 font-normal">(Opcional)</span></label>
              <input id="swal-telefone" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.telefone || ''}" placeholder="(11) 90000-0000">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const cpfInput = document.getElementById('swal-cpf') as HTMLInputElement;
        if (cpfInput) {
          const aplicarMascara = () => {
            let v = cpfInput.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            cpfInput.value = v;
          };
          aplicarMascara();
          cpfInput.addEventListener('input', aplicarMascara);
        }
      },
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement).value;
        const cpf = (document.getElementById('swal-cpf') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const telefone = (document.getElementById('swal-telefone') as HTMLInputElement).value;

        if (!nome || !cpf) {
          Swal.showValidationMessage('Os campos Nome e CPF são obrigatórios.');
          return false;
        }
        return { usuario_id: this.user.id, nome_completo: nome, cpf, email, telefone };
      },
    });

    if (formValues) {
      if (isEdit) {
        this.guestService.updateGuest(convidado.id, formValues).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Atualizado!',
              timer: 1500,
              showConfirmButton: false,
            });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Não foi possível atualizar.', 'error'),
        });
      } else {
        this.guestService.createGuest(formValues).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Salvo!', timer: 1500, showConfirmButton: false });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Não foi possível salvar.', 'error'),
        });
      }
    }
  }

  excluirConvidado(id: number) {
    Swal.fire({
      title: 'Remover convidado?',
      text: 'Ele sumirá da sua lista para eventos futuros.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.guestService.deleteGuest(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Removido!',
              timer: 1500,
              showConfirmButton: false,
            });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Erro ao excluir.', 'error'),
        });
      }
    });
  }

  getFotoUrl(path: string) {
    if (!path) return '';
    if (path === 'db') return '';
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `${this.apiUrl}/${cleanPath}?t=${new Date().getTime()}`;
  }

  getAvatarUrl(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    return this.getFotoUrl(user.foto);
  }

  /** Retorna URL do avatar com timestamp estável (evita NG0100 ao atualizar após getById). */
  getAvatarUrlStable(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    if (user.foto.startsWith('http')) return user.foto;
    if (this.avatarCacheBust === 0) this.avatarCacheBust = Date.now();
    const cleanPath = user.foto.replace(/\\/g, '/').replace(/^\//, '');
    return `${this.apiUrl}/${cleanPath}?t=${this.avatarCacheBust}`;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Arquivo muito grande', 'Máximo 2MB.', 'warning');
      return;
    }

    this.userService.uploadAvatar(this.user.id, file).subscribe({
      next: (res: any) => {
        this.user.foto = res.path;
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        Swal.fire({
          icon: 'success',
          title: 'Foto atualizada!',
          timer: 1500,
          showConfirmButton: false,
        });
        setTimeout(() => window.location.reload(), 1500);
      },
      error: (err) => Swal.fire('Erro', 'Falha no envio.', 'error'),
    });
  }

  alterarTema(theme: AppTheme) {
    if (!this.user?.id || theme === this.selectedTheme || this.themeSaving) return;

    const previousTheme = this.selectedTheme;
    this.selectedTheme = theme;
    this.themeService.setTheme(theme);
    this.themeSaving = true;

    this.userService.updateTheme(this.user.id, theme).subscribe({
      next: () => {
        this.user.tema_preferido = theme;
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        this.themeSaving = false;
      },
      error: () => {
        this.selectedTheme = previousTheme;
        this.themeService.setTheme(previousTheme);
        this.themeSaving = false;
        Swal.fire('Erro', 'Não foi possível salvar seu tema.', 'error');
      },
    });
  }

}

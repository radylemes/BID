import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { EmailService, SendEmailsResponse, DisparoLogEntry, TemplateEmail, ListaEmail, ListaEmailItem } from '../../services/email.service';
import { UserService } from '../../services/user.service';
import {
  openDisparoProgressModal,
  updateDisparoProgressModal,
  appendProgressItem,
  showDisparoResultModal,
  showDisparoPartialErrorModal,
  buildPartialFromProgress,
  buildDestinatariosTableHtml,
  DisparoProgressState,
} from './email-disparo-progress.util';
import Swal from 'sweetalert2';

type TipoDisparo = 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES' | 'EVENTO';
type FiltroGrupoMatch = number | 'PUBLICO' | null;
type FiltroSetorMatch = number | 'SEM_SETOR' | null;

@Component({
  selector: 'app-disparo-emails',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-[var(--app-bg)] min-h-0">
      <div class="mb-6">
        <h2 class="text-3xl font-extrabold text-[var(--app-text)] tracking-tight">Disparo de E-mails</h2>
        <p class="text-sm text-[var(--app-text-muted)] font-medium mt-1">
          Selecione o tipo de disparo e o BID para enviar e-mails, gerencie templates ou listas de destinatários.
        </p>
      </div>

      <div class="mb-4">
        <div class="sm:hidden">
          <label for="tabs-email" class="sr-only">Aba</label>
          <select
            id="tabs-email"
            [value]="abaAtual"
            (change)="setAba($any($event.target).value)"
            class="block w-full px-3 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          >
            <option value="disparo">Disparo</option>
            <option value="templates">Templates de e-mail</option>
            <option value="listas">Listas de e-mail</option>
          </select>
        </div>
        <ul class="hidden sm:flex text-sm font-medium text-center -space-x-px" role="tablist">
          <li class="w-full focus-within:z-10" role="presentation">
            <button
              type="button"
              role="tab"
              [attr.aria-current]="abaAtual === 'disparo' ? 'page' : null"
              (click)="abaAtual = 'disparo'"
              [ngClass]="{
                'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtual === 'disparo',
                'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaAtual !== 'disparo'
              }"
              class="inline-flex items-center justify-center w-full border rounded-l-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              Disparo
            </button>
          </li>
          <li class="w-full focus-within:z-10" role="presentation">
            <button
              type="button"
              role="tab"
              [attr.aria-current]="abaAtual === 'templates' ? 'page' : null"
              (click)="irAbaTemplates()"
              [ngClass]="{
                'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtual === 'templates',
                'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaAtual !== 'templates'
              }"
              class="inline-flex items-center justify-center w-full border font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              Templates
            </button>
          </li>
          <li class="w-full focus-within:z-10" role="presentation">
            <button
              type="button"
              role="tab"
              [attr.aria-current]="abaAtual === 'listas' ? 'page' : null"
              (click)="irAbaListas()"
              [ngClass]="{
                'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaAtual === 'listas',
                'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaAtual !== 'listas'
              }"
              class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            >
              <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
              Listas
            </button>
          </li>
        </ul>
      </div>

      <div *ngIf="abaAtual === 'disparo'" class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] overflow-hidden">
        <div class="border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] px-4 pt-4 pb-4">
          <div class="sm:hidden">
            <label for="tabs-tipo-disparo" class="sr-only">Tipo de disparo</label>
            <select
              id="tabs-tipo-disparo"
              [value]="tipoAtivo"
              (change)="setTipoAtivo($any($event.target).value)"
              class="block w-full px-3 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="BID_ABERTO">1 – Bid Aberto</option>
              <option value="BID_ENCERRADO">2 – Bid Encerrado</option>
              <option value="GANHADORES">3 – Ganhadores</option>
              <option value="EVENTO">4 – Evento (agrupar)</option>
            </select>
          </div>
          <ul class="hidden sm:flex text-sm font-medium text-center -space-x-px" role="tablist">
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="tipoAtivo === 'BID_ABERTO' ? 'page' : null"
                (click)="setTipoAtivo('BID_ABERTO')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': tipoAtivo === 'BID_ABERTO',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': tipoAtivo !== 'BID_ABERTO'
                }"
                class="inline-flex items-center justify-center w-full border rounded-l-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5v14l7-7-7-7Z"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5h10a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1Z"/></svg>
                1 – Bid Aberto
              </button>
            </li>
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="tipoAtivo === 'BID_ENCERRADO' ? 'page' : null"
                (click)="setTipoAtivo('BID_ENCERRADO')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': tipoAtivo === 'BID_ENCERRADO',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': tipoAtivo !== 'BID_ENCERRADO'
                }"
                class="inline-flex items-center justify-center w-full border font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11.917L9.724 16.6 19 7.3"/></svg>
                2 – Bid Encerrado
              </button>
            </li>
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="tipoAtivo === 'GANHADORES' ? 'page' : null"
                (click)="setTipoAtivo('GANHADORES')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': tipoAtivo === 'GANHADORES',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': tipoAtivo !== 'GANHADORES'
                }"
                class="inline-flex items-center justify-center w-full border font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l4-4 4 4 5-5M4 18h16"/></svg>
                3 – Ganhadores
              </button>
            </li>
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="tipoAtivo === 'EVENTO' ? 'page' : null"
                (click)="setTipoAtivo('EVENTO')"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': tipoAtivo === 'EVENTO',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': tipoAtivo !== 'EVENTO'
                }"
                class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                4 – Evento (agrupar)
              </button>
            </li>
          </ul>
        </div>

        <div class="p-4">
          <p class="text-sm text-[var(--app-text-muted)] mb-4" [innerHTML]="descricaoTipo"></p>

          <div
            *ngIf="!loading && matches.length > 0"
            class="mb-4 border border-[var(--app-border)] rounded-xl bg-[var(--color-bg-surface-alt)] px-4 pt-4 pb-4"
          >
            <div class="sm:hidden">
              <label for="tabs-periodo-disparo" class="sr-only">Período dos BIDs</label>
              <select
                id="tabs-periodo-disparo"
                [value]="abaPeriodoBids"
                (change)="setAbaPeriodoBids($any($event.target).value)"
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
                  [attr.aria-current]="abaPeriodoBids === 'atuais' ? 'page' : null"
                  (click)="setAbaPeriodoBids('atuais')"
                  [ngClass]="{
                    'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaPeriodoBids === 'atuais',
                    'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaPeriodoBids !== 'atuais'
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
                  [attr.aria-current]="abaPeriodoBids === 'anteriores' ? 'page' : null"
                  (click)="setAbaPeriodoBids('anteriores')"
                  [ngClass]="{
                    'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': abaPeriodoBids === 'anteriores',
                    'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': abaPeriodoBids !== 'anteriores'
                  }"
                  class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                >
                  <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 1 1 0-4h14a2 2 0 1 1 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4"/></svg>
                  Anteriores ({{ matchesAnterioresCount }})
                </button>
              </li>
            </ul>
            <div class="mt-3 pt-3 border-t border-[var(--app-border)]">
              <label for="busca-disparo-bids" class="sr-only">Buscar BIDs</label>
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
                  id="busca-disparo-bids"
                  type="search"
                  name="buscaDisparoBids"
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
            *ngIf="tipoAtivo === 'EVENTO' && quantidadeSelecionados > 0"
            class="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3"
          >
            <span class="text-sm font-medium text-indigo-900">
              <strong>{{ quantidadeSelecionados }}</strong> evento(s) selecionado(s)
            </span>
            <button
              type="button"
              (click)="abrirModalDisparoLote()"
              class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Disparar selecionados
            </button>
            <button
              type="button"
              (click)="limparSelecaoBids()"
              class="text-xs font-medium text-indigo-700 hover:text-indigo-900 underline"
            >
              Limpar seleção
            </button>
          </div>

          <div *ngIf="loading" class="py-8 text-center text-[var(--app-text-muted)]">
            <span class="animate-pulse">Carregando BIDs...</span>
          </div>

          <div *ngIf="!loading && matches.length === 0" class="py-8 text-center text-[var(--app-text-muted)]">
            Nenhum BID encontrado.
          </div>

          <div *ngIf="!loading && matches.length > 0" class="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table class="min-w-[980px] w-full text-sm">
              <thead>
                <tr class="bg-[var(--color-bg-surface-alt)] border-b border-[var(--app-border)]">
                  <th *ngIf="tipoAtivo === 'EVENTO'" class="w-10 px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-[var(--app-border)] text-indigo-600 focus:ring-indigo-500"
                      [checked]="todosDisparaveisSelecionados"
                      [indeterminate]="selecaoParcial"
                      (change)="toggleSelecionarTodos($event)"
                      aria-label="Selecionar todos os eventos visíveis"
                    />
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--app-text-muted)] uppercase">BID</th>
                  <th class="px-3 py-3 text-center align-middle">
                    <div #dataFiltroHost class="relative inline-flex items-center justify-center gap-1.5">
                      <span class="text-xs font-semibold text-[var(--app-text-muted)] uppercase whitespace-nowrap">Data do evento</span>
                      <button
                        type="button"
                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)]"
                        [ngClass]="{ 'bg-[var(--app-nav-hover-bg)] text-[var(--app-text)]': filtroDataAtivo }"
                        [attr.aria-expanded]="menuFiltroDataAberto"
                        aria-haspopup="true"
                        aria-label="Filtrar por data do evento"
                        (click)="toggleFiltroDataMenu($event)"
                      >
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th class="px-3 py-3 text-center align-middle">
                    <div #setorFiltroHost class="relative inline-flex items-center justify-center gap-1.5">
                      <span class="text-xs font-semibold text-[var(--app-text-muted)] uppercase whitespace-nowrap">Setor</span>
                      <button
                        type="button"
                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)]"
                        [ngClass]="{ 'bg-[var(--app-nav-hover-bg)] text-[var(--app-text)]': filtroSetorAtivo }"
                        [attr.aria-expanded]="menuFiltroSetorAberto"
                        aria-haspopup="true"
                        aria-label="Filtrar por setor"
                        (click)="toggleFiltroSetorMenu($event)"
                      >
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th class="px-3 py-3 text-center align-middle">
                    <div #grupoFiltroHost class="relative inline-flex items-center justify-center gap-1.5">
                      <span class="text-xs font-semibold text-[var(--app-text-muted)] uppercase whitespace-nowrap">Grupo</span>
                      <button
                        type="button"
                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)]"
                        [ngClass]="{ 'bg-[var(--app-nav-hover-bg)] text-[var(--app-text)]': filtroGrupoAtivo }"
                        [attr.aria-expanded]="menuFiltroGrupoAberto"
                        aria-haspopup="true"
                        aria-label="Filtrar por grupo"
                        (click)="toggleFiltroGrupoMenu($event)"
                      >
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th class="px-3 py-3 text-center align-middle">
                    <div #statusFiltroHost class="relative inline-flex items-center justify-center gap-1.5">
                      <span class="text-xs font-semibold text-[var(--app-text-muted)] uppercase whitespace-nowrap">Status</span>
                      <button
                        type="button"
                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)]"
                        [ngClass]="{ 'bg-[var(--app-nav-hover-bg)] text-[var(--app-text)]': !!filtroStatus }"
                        [attr.aria-expanded]="menuFiltroStatusAberto"
                        aria-haspopup="true"
                        aria-label="Filtrar por status"
                        (click)="toggleFiltroStatusMenu($event)"
                      >
                        <svg class="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--app-text-muted)] uppercase">Disparos já feitos</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--app-text-muted)] uppercase">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngIf="matches.length > 0 && matchesFiltrados.length === 0">
                  <td [attr.colspan]="tipoAtivo === 'EVENTO' ? 8 : 7" class="px-6 py-12 text-center text-sm text-[var(--app-text-muted)]">
                    Nenhum BID corresponde aos filtros.
                  </td>
                </tr>
                <tr *ngFor="let m of matchesFiltrados" class="hover:bg-[var(--app-nav-hover-bg)]">
                  <td *ngIf="tipoAtivo === 'EVENTO'" class="w-10 px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-[var(--app-border)] text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      [checked]="isBidSelecionado(m.id)"
                      [disabled]="!podeDisparar(m)"
                      (change)="toggleBidSelecionado(m.id, $event)"
                      [attr.aria-label]="'Selecionar ' + m.titulo"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-[var(--app-text)] truncate" [title]="m.titulo">{{ m.titulo }}</div>
                  </td>
                  <td class="px-3 py-3 text-center text-[var(--app-text-muted)] whitespace-nowrap tabular-nums">
                    {{ m.data_jogo ? (m.data_jogo | date:'dd/MM/yyyy HH:mm') : '—' }}
                  </td>
                  <td class="px-3 py-3 text-center text-[var(--app-text-muted)]">
                    {{ m.setor_evento_nome || '—' }}
                  </td>
                  <td class="px-3 py-3 text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      {{ m.nome_grupo || 'Público' }}
                    </span>
                  </td>
                  <td class="px-3 py-3 text-center">
                    <span
                      [ngClass]="{
                        'bg-emerald-500/10 text-emerald-700': m.status === 'ABERTA',
                        'bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)]': m.status !== 'ABERTA'
                      }"
                      class="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase"
                    >
                      {{ m.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap justify-center gap-1">
                      <span
                        [title]="m.email_bid_aberto_em ? ('Enviado em ' + (m.email_bid_aberto_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_bid_aberto_em"
                        [class.text-emerald-700]="m.email_bid_aberto_em"
                        [class.bg-[var(--color-bg-surface-alt)]]="!m.email_bid_aberto_em"
                        [class.text-[var(--app-text-muted)]]="!m.email_bid_aberto_em"
                      >
                        Aberto {{ m.email_bid_aberto_em ? '✓' : '—' }}
                      </span>
                      <span
                        [title]="m.email_bid_encerrado_em ? ('Enviado em ' + (m.email_bid_encerrado_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_bid_encerrado_em"
                        [class.text-emerald-700]="m.email_bid_encerrado_em"
                        [class.bg-[var(--color-bg-surface-alt)]]="!m.email_bid_encerrado_em"
                        [class.text-[var(--app-text-muted)]]="!m.email_bid_encerrado_em"
                      >
                        Encerrado {{ m.email_bid_encerrado_em ? '✓' : '—' }}
                      </span>
                      <span
                        [title]="m.email_ganhadores_em ? ('Enviado em ' + (m.email_ganhadores_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_ganhadores_em"
                        [class.text-emerald-700]="m.email_ganhadores_em"
                        [class.bg-[var(--color-bg-surface-alt)]]="!m.email_ganhadores_em"
                        [class.text-[var(--app-text-muted)]]="!m.email_ganhadores_em"
                      >
                        Ganhadores {{ m.email_ganhadores_em ? '✓' : '—' }}
                      </span>
                      <span
                        [title]="m.email_evento_em ? ('Enviado em ' + (m.email_evento_em | date:'dd/MM HH:mm')) : 'Não enviado'"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        [class.bg-emerald-100]="m.email_evento_em"
                        [class.text-emerald-700]="m.email_evento_em"
                        [class.bg-[var(--color-bg-surface-alt)]]="!m.email_evento_em"
                        [class.text-[var(--app-text-muted)]]="!m.email_evento_em"
                      >
                        Evento {{ m.email_evento_em ? '✓' : '—' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        (click)="verLogsDisparo(m)"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)] hover:border-indigo-400 transition"
                        title="Ver log de disparos (destinatários e status)"
                      >
                        Ver log
                      </button>
                      <button
                        *ngIf="tipoAtivo === 'BID_ENCERRADO'"
                        type="button"
                        (click)="visualizarPdfGanhadores(m)"
                        [disabled]="pdfLoadingPartidaId === m.id"
                        [class.opacity-50]="pdfLoadingPartidaId === m.id"
                        [class.cursor-not-allowed]="pdfLoadingPartidaId === m.id"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400 transition disabled:hover:bg-sky-50 disabled:hover:border-sky-300"
                        title="Visualizar PDF da lista de ganhadores antes do envio"
                      >
                        {{ pdfLoadingPartidaId === m.id ? 'Gerando PDF...' : 'Visualizar PDF' }}
                      </button>
                      <button
                        (click)="abrirModalDisparo(m)"
                        [disabled]="podeDisparar(m) === false"
                        [class.opacity-50]="podeDisparar(m) === false"
                        [class.cursor-not-allowed]="podeDisparar(m) === false"
                        class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600 transition"
                      >
                        Disparar
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            *ngIf="menuFiltroGrupoAberto"
            #grupoFiltroPanel
            class="fixed z-[200] max-h-56 overflow-y-auto rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] py-1 text-left shadow-lg"
            [style.top.px]="grupoFiltroPanelTop"
            [style.left.px]="grupoFiltroPanelLeft"
            [style.minWidth.px]="grupoFiltroPanelMinWidth"
            role="menu"
          >
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroGrupoId === null" (click)="selectGrupoFiltro(null)">Todos os grupos</button>
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroGrupoId === 'PUBLICO'" (click)="selectGrupoFiltro('PUBLICO')">Público</button>
            <button *ngFor="let g of groups" type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroGrupoId === g.id" (click)="selectGrupoFiltro(g.id)">{{ g.nome }}</button>
          </div>
          <div
            *ngIf="menuFiltroDataAberto"
            #dataFiltroPanel
            class="fixed z-[200] rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] py-1 text-left shadow-lg"
            [style.top.px]="dataFiltroPanelTop"
            [style.left.px]="dataFiltroPanelLeft"
            [style.minWidth.px]="dataFiltroPanelMinWidth"
            role="menu"
          >
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="!filtroDataEvento" (click)="limparFiltroData()">Todas as datas</button>
            <div class="px-3 py-2 border-t border-[var(--app-border)]">
              <label class="block text-[10px] font-semibold uppercase text-[var(--app-text-muted)] mb-1.5">Data do evento</label>
              <input
                type="date"
                name="filtroDataEventoDisparo"
                class="w-full rounded-md border border-[var(--app-border)] bg-[var(--color-bg-surface)] px-2 py-1.5 text-sm text-[var(--app-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-border)]"
                [(ngModel)]="filtroDataEvento"
                (ngModelChange)="selectDataEventoFiltro($event)"
                (change)="selectDataEventoFiltro(filtroDataEvento)"
                (click)="$event.stopPropagation()"
              />
            </div>
          </div>
          <div
            *ngIf="menuFiltroSetorAberto"
            #setorFiltroPanel
            class="fixed z-[200] max-h-56 overflow-y-auto rounded-lg border border-[var(--app-border)] bg-[var(--color-bg-surface)] py-1 text-left shadow-lg"
            [style.top.px]="setorFiltroPanelTop"
            [style.left.px]="setorFiltroPanelLeft"
            [style.minWidth.px]="setorFiltroPanelMinWidth"
            role="menu"
          >
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroSetorId === null" (click)="selectSetorFiltro(null)">Todos os setores</button>
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroSetorId === 'SEM_SETOR'" (click)="selectSetorFiltro('SEM_SETOR')">Sem setor</button>
            <button *ngFor="let s of setoresEvento" type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroSetorId === s.id" (click)="selectSetorFiltro(s.id)">{{ s.nome }}</button>
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
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="!filtroStatus" (click)="selectStatusFiltro('')">Todos</button>
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroStatus === 'ABERTA'" (click)="selectStatusFiltro('ABERTA')">Aberta</button>
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroStatus === 'ENCERRADA'" (click)="selectStatusFiltro('ENCERRADA')">Encerrada</button>
            <button type="button" role="menuitem" class="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)]" [class.font-semibold]="filtroStatus === 'FINALIZADA'" (click)="selectStatusFiltro('FINALIZADA')">Finalizada</button>
          </div>
        </div>
      </div>

      <!-- Aba Templates de e-mail -->
      <div *ngIf="abaAtual === 'templates'" class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] overflow-hidden">
        <div class="p-4 space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold text-[var(--app-text)]">Templates de e-mail</h3>
            <button (click)="novoTemplate()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm">+ Novo template</button>
          </div>
          <div class="rounded-xl border border-[var(--app-border)] overflow-hidden">
            <div class="p-3 border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)]">
              <input
                type="text"
                [(ngModel)]="filtroTemplates"
                placeholder="Buscar template por nome, assunto ou tipo..."
                class="w-full px-3 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
            </div>
            <div *ngIf="templatesLoading" class="p-6 text-center text-[var(--app-text-muted)]">A carregar...</div>
            <div *ngIf="!templatesLoading && templatesFiltrados.length === 0" class="p-6 text-center text-[var(--app-text-muted)]">Nenhum template encontrado.</div>
            <table *ngIf="!templatesLoading && templatesFiltrados.length > 0" class="min-w-full text-sm">
              <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] uppercase font-bold text-xs">
                <tr>
                  <th class="px-4 py-3 text-left">Nome</th>
                  <th class="px-4 py-3 text-left">Assunto</th>
                  <th class="px-4 py-3 text-left">Tipo</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngFor="let t of templatesFiltrados" class="hover:bg-[var(--app-nav-hover-bg)]">
                  <td class="px-4 py-3 font-medium text-[var(--app-text)]">{{ t.nome }}</td>
                  <td class="px-4 py-3 text-[var(--app-text-muted)]">{{ t.assunto }}</td>
                  <td class="px-4 py-3 text-[var(--app-text-muted)]">{{ getLabelTipoTemplate(t.tipo_disparo) }}</td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="visualizarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Visualizar">👁 Visualizar</button>
                    <button (click)="testeEnvioTemplate(t)" class="mr-2 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-bold hover:bg-amber-100" title="Enviar e-mail de teste">✉ Teste</button>
                    <button (click)="editarTemplate(t)" class="mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100">Editar</button>
                    <button (click)="clonarTemplate(t)" class="mr-2 px-2 py-1 bg-sky-50 text-sky-700 rounded text-xs font-bold hover:bg-sky-100" title="Clonar">Clonar</button>
                    <button (click)="excluirTemplate(t)" class="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Excluir">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Aba Listas de e-mail -->
      <div *ngIf="abaAtual === 'listas'" class="bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--app-border)] overflow-hidden">
        <div class="p-4 space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-xl font-bold text-[var(--app-text)]">Listas de e-mail</h3>
              <p class="text-sm text-[var(--app-text-muted)]">Crie listas de destinatários para disparos.</p>
            </div>
            <button (click)="novaLista()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-sm">+ Nova lista</button>
          </div>
          <div class="rounded-xl border border-[var(--app-border)] overflow-hidden">
            <div class="p-3 border-b border-[var(--app-border)] bg-[var(--color-bg-surface-alt)]">
              <input
                type="text"
                [(ngModel)]="filtroListas"
                placeholder="Buscar lista por nome ou descrição..."
                class="w-full px-3 py-2.5 bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
            </div>
            <div *ngIf="listasEmailLoading" class="p-6 text-center text-[var(--app-text-muted)]">A carregar...</div>
            <div *ngIf="!listasEmailLoading && listasEmailFiltradas.length === 0" class="p-6 text-center text-[var(--app-text-muted)]">Nenhuma lista encontrada.</div>
            <table *ngIf="!listasEmailLoading && listasEmailFiltradas.length > 0" class="min-w-full text-sm">
              <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] uppercase font-bold text-xs">
                <tr>
                  <th class="px-4 py-3 text-left">Nome</th>
                  <th class="px-4 py-3 text-left">Descrição</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngFor="let lista of listasEmailFiltradas" class="hover:bg-[var(--app-nav-hover-bg)]">
                  <td class="px-4 py-3 font-medium text-[var(--app-text)]">{{ lista.nome }}</td>
                  <td class="px-4 py-3 text-[var(--app-text-muted)]">{{ lista.descricao || '—' }}</td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="abrirItensLista(lista)" class="mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100">E-mails</button>
                    <button (click)="editarLista(lista)" class="mr-2 px-2 py-1 bg-[var(--color-bg-surface-alt)] text-[var(--app-text)] rounded text-xs font-bold hover:bg-[var(--app-nav-hover-bg)]" title="Editar">Editar</button>
                    <button (click)="excluirLista(lista)" class="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100" title="Excluir">Excluir</button>
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
export class DisparoEmailsComponent implements OnInit {
  @ViewChild('statusFiltroHost', { read: ElementRef }) statusFiltroHost?: ElementRef<HTMLElement>;
  @ViewChild('statusFiltroPanel', { read: ElementRef }) statusFiltroPanel?: ElementRef<HTMLElement>;
  @ViewChild('grupoFiltroHost', { read: ElementRef }) grupoFiltroHost?: ElementRef<HTMLElement>;
  @ViewChild('grupoFiltroPanel', { read: ElementRef }) grupoFiltroPanel?: ElementRef<HTMLElement>;
  @ViewChild('dataFiltroHost', { read: ElementRef }) dataFiltroHost?: ElementRef<HTMLElement>;
  @ViewChild('dataFiltroPanel', { read: ElementRef }) dataFiltroPanel?: ElementRef<HTMLElement>;
  @ViewChild('setorFiltroHost', { read: ElementRef }) setorFiltroHost?: ElementRef<HTMLElement>;
  @ViewChild('setorFiltroPanel', { read: ElementRef }) setorFiltroPanel?: ElementRef<HTMLElement>;

  abaAtual: 'disparo' | 'templates' | 'listas' = 'disparo';
  matches: any[] = [];
  groups: any[] = [];
  setoresEvento: any[] = [];
  loading = false;
  tipoAtivo: TipoDisparo = 'BID_ABERTO';
  abaPeriodoBids: 'atuais' | 'anteriores' = 'atuais';
  bidsSelecionados = new Set<number>();

  setTipoAtivo(value: string): void {
    if (value === 'BID_ENCERRADO') this.tipoAtivo = 'BID_ENCERRADO';
    else if (value === 'GANHADORES') this.tipoAtivo = 'GANHADORES';
    else if (value === 'EVENTO') this.tipoAtivo = 'EVENTO';
    else this.tipoAtivo = 'BID_ABERTO';
    if (this.tipoAtivo !== 'EVENTO') {
      this.limparSelecaoBids();
    }
  }

  currentUser: any = {};
  listas: any[] = [];
  templates: any[] = [];
  templatesList: TemplateEmail[] = [];
  templatesLoading = false;
  listasEmail: ListaEmail[] = [];
  listasEmailLoading = false;
  pdfLoadingPartidaId: number | null = null;
  filtroBusca = '';
  filtroStatus = '';
  filtroGrupoId: FiltroGrupoMatch = null;
  filtroDataEvento = '';
  filtroSetorId: FiltroSetorMatch = null;
  menuFiltroStatusAberto = false;
  menuFiltroGrupoAberto = false;
  menuFiltroDataAberto = false;
  menuFiltroSetorAberto = false;
  statusFiltroPanelTop = 0;
  statusFiltroPanelLeft = 0;
  statusFiltroPanelMinWidth = 168;
  grupoFiltroPanelTop = 0;
  grupoFiltroPanelLeft = 0;
  grupoFiltroPanelMinWidth = 168;
  dataFiltroPanelTop = 0;
  dataFiltroPanelLeft = 0;
  dataFiltroPanelMinWidth = 220;
  setorFiltroPanelTop = 0;
  setorFiltroPanelLeft = 0;
  setorFiltroPanelMinWidth = 168;
  filtroTemplates = '';
  filtroListas = '';

  get filtroGrupoAtivo(): boolean {
    return this.filtroGrupoId !== null;
  }

  get filtroDataAtivo(): boolean {
    return !!this.filtroDataEvento;
  }

  get filtroSetorAtivo(): boolean {
    return this.filtroSetorId !== null;
  }

  get descricaoTipo(): string {
    switch (this.tipoAtivo) {
      case 'BID_ABERTO':
        return 'Enviar e-mail avisando que o BID está aberto para apostas. Destinatários: participantes do grupo ou lista de e-mails.';
      case 'BID_ENCERRADO':
        return 'Enviar e-mail com o resultado (apostas realizadas). Inclui PDF com nome e aposta. Apenas para BIDs já encerrados.';
      case 'GANHADORES':
        return 'Enviar e-mail apenas para os usuários vencedores do BID. Apenas para BIDs já finalizados com sorteio.';
      case 'EVENTO':
        return 'Comunicação geral sobre um ou mais eventos/BIDs. Selecione um ou mais BIDs na tabela e use «Disparar selecionados». Destinatários: participantes do grupo, lista ou envio personalizado.';
      default:
        return '';
    }
  }

  get matchesNaAba(): any[] {
    return this.matches.filter((m) =>
      this.abaPeriodoBids === 'anteriores' ? this.isMatchAnterior(m) : this.isMatchAtual(m),
    );
  }

  get matchesAtuaisCount(): number {
    return this.matches.filter((m) => this.isMatchAtual(m)).length;
  }

  get matchesAnterioresCount(): number {
    return this.matches.filter((m) => this.isMatchAnterior(m)).length;
  }

  get matchesFiltrados(): any[] {
    let result = [...this.matchesNaAba].sort((a, b) => this.compareByDataEvento(a, b));
    const q = (this.filtroBusca || '').trim().toLowerCase();
    if (q) {
      result = result.filter((m) => this.textoBuscaBid(m).includes(q));
    }
    if (this.filtroGrupoId !== null) {
      result = result.filter((m) => this.matchMatchesGrupoFiltro(m));
    }
    if (this.filtroDataEvento) {
      result = result.filter((m) => this.matchMatchesDataEventoFiltro(m));
    }
    if (this.filtroStatus) {
      result = result.filter((m) => String(m?.status || '').toUpperCase() === this.filtroStatus);
    }
    if (this.filtroSetorId !== null) {
      result = result.filter((m) => this.matchMatchesSetorFiltro(m));
    }
    return result;
  }

  get templatesFiltrados(): TemplateEmail[] {
    const termo = this.normalizeText(this.filtroTemplates);
    return [...this.templatesList]
      .sort((a, b) => this.getTimestamp(b?.atualizado_em || b?.criado_em || b?.id) - this.getTimestamp(a?.atualizado_em || a?.criado_em || a?.id))
      .filter((t) => {
        if (!termo) return true;
        const texto = [
          t?.id,
          t?.nome,
          t?.assunto,
          this.getLabelTipoTemplate(t?.tipo_disparo),
        ].map((v) => this.normalizeText(v)).join(' ');
        return texto.includes(termo);
      });
  }

  get listasEmailFiltradas(): ListaEmail[] {
    const termo = this.normalizeText(this.filtroListas);
    return [...this.listasEmail]
      .sort((a, b) => this.getTimestamp(b?.criado_em || b?.id) - this.getTimestamp(a?.criado_em || a?.id))
      .filter((lista) => {
        if (!termo) return true;
        const texto = [lista?.id, lista?.nome, lista?.descricao].map((v) => this.normalizeText(v)).join(' ');
        return texto.includes(termo);
      });
  }

  constructor(
    private matchService: MatchService,
    private emailService: EmailService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarMatches();
    this.matchService.getGroups().subscribe({
      next: (data) => {
        this.groups = data || [];
      },
    });
    this.matchService.getSetoresEvento().subscribe({
      next: (data) => {
        this.setoresEvento = data || [];
      },
    });
    this.route.queryParams.subscribe((params) => {
      const aba = params['aba'];
      if (aba === 'templates') {
        this.abaAtual = 'templates';
        this.loadTemplates();
      } else if (aba === 'listas') {
        this.abaAtual = 'listas';
        this.loadListasEmail();
      }
    });
  }

  setAba(value: string): void {
    if (value === 'templates') {
      this.irAbaTemplates();
    } else if (value === 'listas') {
      this.irAbaListas();
    } else {
      this.abaAtual = 'disparo';
      this.router.navigate([], { relativeTo: this.route, queryParams: { aba: null }, queryParamsHandling: 'merge' });
    }
  }

  setAbaPeriodoBids(value: string): void {
    this.abaPeriodoBids = value === 'anteriores' ? 'anteriores' : 'atuais';
    this.fecharOutrosFiltroMenus();
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

  irAbaListas(): void {
    this.abaAtual = 'listas';
    this.loadListasEmail();
    this.router.navigate([], { relativeTo: this.route, queryParams: { aba: 'listas' }, queryParamsHandling: 'merge' });
  }

  irAbaTemplates(): void {
    this.abaAtual = 'templates';
    this.loadTemplates();
    this.router.navigate([], { relativeTo: this.route, queryParams: { aba: 'templates' }, queryParamsHandling: 'merge' });
  }

  loadTemplates(): void {
    this.templatesLoading = true;
    this.emailService.getTemplates().subscribe({
      next: (data) => {
        this.templatesList = data;
        this.templatesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.templatesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadListasEmail(): void {
    this.listasEmailLoading = true;
    this.emailService.getLists().subscribe({
      next: (data) => {
        this.listasEmail = data;
        this.listasEmailLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.listasEmailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  async novaLista(): Promise<void> {
    const { value } = await Swal.fire({
      title: 'Nova lista de e-mail',
      html: `
        <div class="text-left">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
          <input id="swal-nome" class="swal2-input w-full m-0 mb-3" placeholder="Ex: Colaboradores Geral">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (opcional)</label>
          <input id="swal-desc" class="swal2-input w-full m-0" placeholder="Descrição da lista">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Criar',
      confirmButtonColor: '#059669',
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement)?.value?.trim();
        if (!nome) {
          Swal.showValidationMessage('Nome é obrigatório.');
          return null;
        }
        return {
          nome,
          descricao: (document.getElementById('swal-desc') as HTMLInputElement)?.value?.trim() || undefined,
        };
      },
    });
    if (value) {
      this.emailService.createList(value.nome, value.descricao).subscribe({
        next: () => {
          this.loadListasEmail();
          Swal.fire({ icon: 'success', title: 'Lista criada.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao criar.', 'error'),
      });
    }
  }

  async editarLista(lista: ListaEmail): Promise<void> {
    const nomeSafe = (lista.nome || '').replace(/"/g, '&quot;');
    const descSafe = (lista.descricao || '').replace(/"/g, '&quot;');
    const { value } = await Swal.fire({
      title: 'Editar lista',
      html: `
        <div class="text-left">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
          <input id="edit-nome" class="swal2-input w-full m-0 mb-3" value="${nomeSafe}">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição (opcional)</label>
          <input id="edit-desc" class="swal2-input w-full m-0" value="${descSafe}">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const nome = (document.getElementById('edit-nome') as HTMLInputElement)?.value?.trim();
        if (!nome) {
          Swal.showValidationMessage('Nome é obrigatório.');
          return null;
        }
        return {
          nome,
          descricao: (document.getElementById('edit-desc') as HTMLInputElement)?.value?.trim() || undefined,
        };
      },
    });
    if (value) {
      this.emailService.updateList(lista.id, value.nome, value.descricao).subscribe({
        next: () => {
          this.loadListasEmail();
          Swal.fire({ icon: 'success', title: 'Lista atualizada.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao atualizar.', 'error'),
      });
    }
  }

  async excluirLista(lista: ListaEmail): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir lista?',
      text: `"${lista.nome}" será excluída permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
    });
    if (isConfirmed) {
      this.emailService.deleteList(lista.id).subscribe({
        next: () => {
          this.loadListasEmail();
          Swal.fire({ icon: 'success', title: 'Lista excluída.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }

  abrirItensLista(lista: ListaEmail): void {
    this.emailService.getListItens(lista.id).subscribe({
      next: (itens) => this.mostrarModalItensLista(lista, itens),
      error: () => Swal.fire('Erro', 'Falha ao carregar e-mails.', 'error'),
    });
  }

  private mostrarModalItensLista(lista: ListaEmail, itens: ListaEmailItem[]): void {
    itens.sort((a, b) => this.getTimestamp(b.criado_em || b.id) - this.getTimestamp(a.criado_em || a.id));
    const listHtml = itens.length
      ? itens
          .map(
            (i) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-800">${i.email}</span>
            <span class="text-xs text-gray-500">${i.nome_opcional || '—'}</span>
            <button type="button" data-remove-id="${i.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
          </div>
        `
          )
          .join('')
      : '<p class="text-gray-400 text-sm py-2">Nenhum e-mail na lista.</p>';

    Swal.fire({
      title: `E-mails: ${lista.nome}`,
      html: `
        <div class="text-left max-h-80 overflow-y-auto mb-4">
          <div class="flex gap-2 mb-3">
            <input id="item-email" type="email" class="swal2-input flex-1 m-0 text-sm" placeholder="E-mail">
            <input id="item-nome" type="text" class="swal2-input flex-1 m-0 text-sm" placeholder="Nome (opcional)">
            <button type="button" id="btn-add-item" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Adicionar</button>
          </div>
          <div class="mb-3">
            <input id="item-search" type="text" class="swal2-input w-full m-0 text-sm" placeholder="Buscar por nome ou e-mail...">
          </div>
          <div class="mb-3">
            <button type="button" id="btn-importar-banco" class="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200">Importar do banco</button>
          </div>
          <div id="itens-list" class="rounded-lg border border-gray-100 bg-gray-50/50 p-2">${listHtml}</div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Fechar',
      width: '560px',
      didOpen: () => {
        const container = Swal.getHtmlContainer();
        if (!container) return;
        const btnAdd = container.querySelector('#btn-add-item');
        const inputEmail = container.querySelector('#item-email') as HTMLInputElement;
        const inputNome = container.querySelector('#item-nome') as HTMLInputElement;
        const inputSearch = container.querySelector('#item-search') as HTMLInputElement;
        const listEl = container.querySelector('#itens-list');
        let termoBuscaItens = '';

        const addItem = () => {
          const email = inputEmail?.value?.trim();
          if (!email) {
            Swal.fire('Atenção', 'Informe o e-mail.', 'warning');
            return;
          }
          this.emailService.addListItem(lista.id, email, inputNome?.value?.trim()).subscribe({
            next: (novo) => {
              itens.push(novo);
              itens.sort((a, b) => this.getTimestamp(b.criado_em || b.id) - this.getTimestamp(a.criado_em || a.id));
              renderItensList();
              inputEmail!.value = '';
              if (inputNome) inputNome.value = '';
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao adicionar.', 'error'),
          });
        };

        const removeItem = (itemId: number) => {
          this.emailService.removeListItem(lista.id, itemId).subscribe({
            next: () => {
              itens.splice(itens.findIndex((i) => i.id === itemId), 1);
              renderItensList();
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao remover.', 'error'),
          });
        };

        const renderItensList = () => {
          if (!listEl) return;
          const itensFiltrados = itens.filter((i) => {
            if (!termoBuscaItens) return true;
            const texto = [i.id, i.email, i.nome_opcional].map((v) => this.normalizeText(v)).join(' ');
            return texto.includes(termoBuscaItens);
          });
          listEl.innerHTML = itensFiltrados.length
            ? itensFiltrados
                .map(
                  (i) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-800">${(i.email || '').replace(/</g, '&lt;')}</span>
            <span class="text-xs text-gray-500">${(i.nome_opcional || '—').replace(/</g, '&lt;')}</span>
            <button type="button" data-remove-id="${i.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
          </div>
        `
                )
                .join('')
            : '<p class="text-gray-400 text-sm py-2">Nenhum e-mail encontrado.</p>';
          listEl.querySelectorAll('[data-remove-id]').forEach((btn) => {
            btn.addEventListener('click', () => removeItem(Number((btn as HTMLElement).getAttribute('data-remove-id'))));
          });
        };

        const importarDoBanco = () => {
          this.matchService.getGroups().subscribe({
            next: (grupos) => {
              const grupoOptions = grupos
                .map((g: { id: number; nome: string }) => `<option value="${g.id}">${(g.nome || '').replace(/"/g, '&quot;')}</option>`)
                .join('');
              const htmlContent = `
                <style>
                  .dual-list-import option { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
                  .dual-list-import option:hover { background-color: #f8fafc; }
                  .dual-list-import option:checked { background-color: #e0e7ff; color: #4338ca; font-weight: bold; }
                </style>
                <div class="text-left font-sans mt-2">
                  <label class="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">1. Tipo de importação</label>
                  <select id="import-tipo" class="swal2-select w-full m-0 mb-4 text-sm border-gray-300 rounded-xl bg-gray-50">
                    <option value="grupo">Por grupo (importar todos do grupo)</option>
                    <option value="nome">Selecionar usuários por nome</option>
                  </select>
                  <div id="import-grupo-wrap" class="mb-4">
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Grupo</label>
                    <select id="import-grupo" class="swal2-input w-full m-0"><option value="">Todos os grupos</option>${grupoOptions}</select>
                  </div>
                  <div id="import-dual-wrap" class="hidden flex-col gap-2 mb-4">
                    <label class="block text-xs font-extrabold text-indigo-600 uppercase mb-1">2. Filtre e transfira os usuários</label>
                    <div class="flex gap-3 items-stretch h-56 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div class="flex-1 flex flex-col h-full">
                        <span class="text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Disponíveis</span>
                        <input type="text" id="import-filter-av" placeholder="🔍 Pesquisar por nome..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md">
                        <select id="import-list-av" multiple class="dual-list-import flex-1 w-full border border-gray-300 rounded-lg text-xs bg-white" style="min-height:120px"></select>
                      </div>
                      <div class="flex flex-col gap-2 justify-center px-1">
                        <button type="button" id="import-btn-add" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-sm">&gt;</button>
                        <button type="button" id="import-btn-add-all" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-xs">&gt;&gt;</button>
                        <button type="button" id="import-btn-rem" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-sm mt-2">&lt;</button>
                        <button type="button" id="import-btn-rem-all" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg font-bold text-xs">&lt;&lt;</button>
                      </div>
                      <div class="flex-1 flex flex-col h-full">
                        <span class="text-[10px] font-bold text-emerald-600 uppercase mb-1 text-center">Selecionados</span>
                        <input type="text" id="import-filter-sel" placeholder="🔍 Pesquisar selecionados..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md">
                        <select id="import-list-sel" multiple class="dual-list-import flex-1 w-full border border-emerald-300 rounded-lg text-xs bg-white" style="min-height:120px"></select>
                      </div>
                    </div>
                  </div>
                </div>
              `;
              Swal.fire({
                title: 'Importar do banco',
                html: htmlContent,
                width: '720px',
                showCancelButton: true,
                confirmButtonText: 'Importar',
                confirmButtonColor: '#4f46e5',
                focusConfirm: false,
                didOpen: () => {
                  const popup = Swal.getPopup();
                  const tipoEl = popup?.querySelector('#import-tipo') as HTMLSelectElement;
                  const grupoWrap = popup?.querySelector('#import-grupo-wrap');
                  const dualWrap = popup?.querySelector('#import-dual-wrap');
                  const listAv = popup?.querySelector('#import-list-av') as HTMLSelectElement;
                  const listSel = popup?.querySelector('#import-list-sel') as HTMLSelectElement;
                  const filterAv = popup?.querySelector('#import-filter-av') as HTMLInputElement;
                  const filterSel = popup?.querySelector('#import-filter-sel') as HTMLInputElement;
                  const applyFilter = (input: HTMLInputElement | null, select: HTMLSelectElement | null) => {
                    if (!input || !select) return;
                    const term = input.value.toLowerCase();
                    Array.from(select.options).forEach((opt) => {
                      (opt as HTMLElement).style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
                    });
                  };
                  const moveOptions = (src: HTMLSelectElement, tgt: HTMLSelectElement, all: boolean) => {
                    const opts = all ? Array.from(src.options).filter((o) => (o as HTMLElement).style.display !== 'none') : Array.from(src.selectedOptions);
                    opts.forEach((opt) => {
                      opt.selected = false;
                      (opt as HTMLElement).style.display = '';
                      tgt.appendChild(opt);
                    });
                    const sorted = Array.from(tgt.options).sort((a, b) => a.text.localeCompare(b.text));
                    tgt.innerHTML = '';
                    sorted.forEach((opt) => tgt.appendChild(opt));
                    applyFilter(filterAv, listAv);
                    applyFilter(filterSel, listSel);
                  };
                  tipoEl?.addEventListener('change', () => {
                    const isNome = tipoEl.value === 'nome';
                    if (grupoWrap) (grupoWrap as HTMLElement).classList.toggle('hidden', isNome);
                    if (dualWrap) (dualWrap as HTMLElement).classList.toggle('hidden', !isNome);
                    if (isNome && listAv && listAv.options.length === 0) {
                      listAv.innerHTML = '';
                      listSel!.innerHTML = '';
                      this.userService.getUsers().subscribe({
                        next: (users) => {
                          const comEmail = users.filter((u: any) => u.email && String(u.email).trim());
                          comEmail.forEach((u: any) => {
                            const opt = document.createElement('option');
                            opt.value = String(u.id);
                            opt.text = `${(u.nome_completo || u.email || '').replace(/</g, '')} (${(u.email || '').trim()})`;
                            listAv!.appendChild(opt);
                          });
                        },
                        error: () => Swal.fire('Erro', 'Falha ao carregar usuários.', 'error'),
                      });
                    }
                  });
                  popup?.querySelector('#import-btn-add')?.addEventListener('click', () => moveOptions(listAv!, listSel!, false));
                  popup?.querySelector('#import-btn-add-all')?.addEventListener('click', () => moveOptions(listAv!, listSel!, true));
                  popup?.querySelector('#import-btn-rem')?.addEventListener('click', () => moveOptions(listSel!, listAv!, false));
                  popup?.querySelector('#import-btn-rem-all')?.addEventListener('click', () => moveOptions(listSel!, listAv!, true));
                  listAv?.addEventListener('dblclick', () => { if (listAv.selectedOptions.length) moveOptions(listAv, listSel!, false); });
                  listSel?.addEventListener('dblclick', () => { if (listSel.selectedOptions.length) moveOptions(listSel, listAv!, false); });
                  filterAv?.addEventListener('input', () => applyFilter(filterAv, listAv));
                  filterSel?.addEventListener('input', () => applyFilter(filterSel, listSel));
                },
                preConfirm: () => {
                  const popup = Swal.getPopup();
                  const tipoEl = popup?.querySelector('#import-tipo') as HTMLSelectElement;
                  const tipo = tipoEl?.value || 'grupo';
                  if (tipo === 'grupo') {
                    const grupoEl = popup?.querySelector('#import-grupo') as HTMLSelectElement;
                    const v = grupoEl?.value;
                    return { tipo: 'grupo' as const, grupoId: v === '' ? null : Number(v) };
                  }
                  const listSel = popup?.querySelector('#import-list-sel') as HTMLSelectElement;
                  const userIds = listSel ? Array.from(listSel.options).map((o) => Number(o.value)) : [];
                  if (userIds.length === 0) {
                    Swal.showValidationMessage('Transfira ao menos um usuário para "Selecionados".');
                    return null;
                  }
                  return { tipo: 'nome' as const, userIds };
                },
              }).then((result) => {
                if (!result.isConfirmed || !result.value) return;
                const v = result.value as { tipo: 'grupo'; grupoId: number | null } | { tipo: 'nome'; userIds: number[] };
                const opts = v.tipo === 'grupo'
                  ? { somente_ativos: true, grupo_id: v.grupoId }
                  : { user_ids: v.userIds };
                this.emailService.importUsers(lista.id, opts).subscribe({
                  next: (res) => {
                    Swal.fire('Sucesso', res.mensagem || `${res.adicionados} adicionado(s).`, 'success');
                    this.emailService.getListItens(lista.id).subscribe({
                      next: (newItens) => {
                        itens.length = 0;
                        itens.push(...newItens);
                        renderItensList();
                      },
                      error: () => Swal.fire('Erro', 'Falha ao atualizar lista.', 'error'),
                    });
                  },
                  error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao importar.', 'error'),
                });
              });
            },
            error: () => Swal.fire('Erro', 'Falha ao carregar grupos.', 'error'),
          });
        };

        btnAdd?.addEventListener('click', addItem);
        inputSearch?.addEventListener('input', () => {
          termoBuscaItens = this.normalizeText(inputSearch.value);
          renderItensList();
        });
        container.querySelector('#btn-importar-banco')?.addEventListener('click', importarDoBanco);
        container.querySelectorAll('[data-remove-id]').forEach((btn) => {
          btn.addEventListener('click', () => removeItem(Number((btn as HTMLElement).getAttribute('data-remove-id'))));
        });
        renderItensList();
      },
    });
  }

  novoTemplate(): void {
    this.router.navigate(['/settings/templates-email/new'], { queryParams: { returnTo: 'disparo' } });
  }

  editarTemplate(t: TemplateEmail): void {
    this.router.navigate(['/settings/templates-email/edit', t.id], { queryParams: { returnTo: 'disparo' } });
  }

  visualizarTemplate(t: TemplateEmail): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (preview sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'Visualizar template',
          text: 'Escolha um evento para preencher as tags (ex.: {{evento.titulo}}). Opcional.',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Visualizar',
        }).then((result) => {
          if (result.isConfirmed) {
            const partidaId = result.value ? Number(result.value) : undefined;
            this.emailService.previewTemplate(t.id, partidaId).subscribe({
              next: (res) => {
                Swal.fire({
                  title: res.assunto || t.nome,
                  html: `<div class="text-left max-h-[60vh] overflow-auto border border-gray-200 rounded-lg p-4 bg-white">${res.html || ''}</div>`,
                  width: '700px',
                  showConfirmButton: true,
                  confirmButtonText: 'Fechar',
                });
              },
              error: (err) => Swal.fire('Erro', err.error?.error || 'Não foi possível carregar a pré-visualização.', 'error'),
            });
          }
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  testeEnvioTemplate(t: TemplateEmail): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      Swal.fire('Aviso', 'Sessão inválida. Faça login novamente.', 'warning');
      return;
    }
    this.matchService.getMatches(userId, false).subscribe({
      next: (partidas) => {
        const inputOptions: { [key: string]: string } = { '': 'Nenhum (sem evento)' };
        partidas.forEach((p: any) => {
          inputOptions[p.id] = p.titulo || `Evento #${p.id}`;
        });
        Swal.fire({
          title: 'E-mail de teste',
          text: 'Escolha o evento para preencher as tags no e-mail (opcional).',
          input: 'select',
          inputOptions,
          inputPlaceholder: 'Selecionar evento',
          showCancelButton: true,
          confirmButtonText: 'Próximo',
        }).then((result) => {
          if (result.isDismissed) return;
          const partidaId = result.value ? Number(result.value) : undefined;
          Swal.fire({
            title: 'E-mail de destino',
            text: `Enviar o template "${t.nome}" para qual endereço?`,
            input: 'email',
            inputPlaceholder: 'email@exemplo.com',
            inputValidator: (value) => (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Indique um e-mail válido.' : null),
            showCancelButton: true,
            confirmButtonText: 'Enviar',
          }).then((result2) => {
            if (result2.isConfirmed && result2.value) {
              this.emailService.testTemplate(t.id, result2.value, partidaId).subscribe({
                next: () => Swal.fire({ icon: 'success', title: 'E-mail de teste enviado!', text: `Enviado para ${result2.value}` }),
                error: (err) => Swal.fire('Erro', err.error?.error || err.error?.message || 'Falha ao enviar o e-mail de teste.', 'error'),
              });
            }
          });
        });
      },
      error: () => Swal.fire('Erro', 'Não foi possível carregar a lista de eventos.', 'error'),
    });
  }

  clonarTemplate(t: TemplateEmail): void {
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '', t.tipo_disparo ?? undefined).subscribe({
      next: () => {
        this.loadTemplates();
        Swal.fire({ icon: 'success', title: 'Template clonado.', timer: 1500, showConfirmButton: false });
      },
      error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao clonar.', 'error'),
    });
  }

  async excluirTemplate(t: TemplateEmail): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      title: 'Excluir template?',
      text: `"${t.nome}" será excluído permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
    });
    if (isConfirmed) {
      this.emailService.deleteTemplate(t.id).subscribe({
        next: () => {
          this.loadTemplates();
          Swal.fire({ icon: 'success', title: 'Template excluído.', timer: 1500, showConfirmButton: false });
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao excluir.', 'error'),
      });
    }
  }

  carregarMatches(): void {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.matchService
      .getMatches(userId, false)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.matches = data || [];
        },
        error: () => {},
      });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const t = ev.target as Node;
    if (this.menuFiltroStatusAberto) {
      if (this.statusFiltroHost?.nativeElement?.contains(t)) return;
      if (this.statusFiltroPanel?.nativeElement?.contains(t)) return;
      this.menuFiltroStatusAberto = false;
    }
    if (this.menuFiltroGrupoAberto) {
      if (this.grupoFiltroHost?.nativeElement?.contains(t)) return;
      if (this.grupoFiltroPanel?.nativeElement?.contains(t)) return;
      this.menuFiltroGrupoAberto = false;
    }
    if (this.menuFiltroDataAberto) {
      if (this.dataFiltroHost?.nativeElement?.contains(t)) return;
      if (this.dataFiltroPanel?.nativeElement?.contains(t)) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && active.type === 'date') return;
      setTimeout(() => {
        if (!this.menuFiltroDataAberto) return;
        const focused = document.activeElement;
        if (focused instanceof HTMLInputElement && focused.type === 'date') return;
        this.menuFiltroDataAberto = false;
        this.cdr.markForCheck();
      }, 0);
    }
    if (this.menuFiltroSetorAberto) {
      if (this.setorFiltroHost?.nativeElement?.contains(t)) return;
      if (this.setorFiltroPanel?.nativeElement?.contains(t)) return;
      this.menuFiltroSetorAberto = false;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.menuFiltroStatusAberto) this.updateStatusFiltroMenuPosition();
    if (this.menuFiltroGrupoAberto) this.updateGrupoFiltroMenuPosition();
    if (this.menuFiltroDataAberto) this.updateDataFiltroMenuPosition();
    if (this.menuFiltroSetorAberto) this.updateSetorFiltroMenuPosition();
  }

  private fecharOutrosFiltroMenus(exceto?: 'status' | 'grupo' | 'data' | 'setor'): void {
    if (exceto !== 'status') this.menuFiltroStatusAberto = false;
    if (exceto !== 'grupo') this.menuFiltroGrupoAberto = false;
    if (exceto !== 'data') this.menuFiltroDataAberto = false;
    if (exceto !== 'setor') this.menuFiltroSetorAberto = false;
  }

  toggleFiltroStatusMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharOutrosFiltroMenus('status');
    this.menuFiltroStatusAberto = !this.menuFiltroStatusAberto;
    if (this.menuFiltroStatusAberto) {
      requestAnimationFrame(() => this.updateStatusFiltroMenuPosition());
    }
  }

  toggleFiltroGrupoMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharOutrosFiltroMenus('grupo');
    this.menuFiltroGrupoAberto = !this.menuFiltroGrupoAberto;
    if (this.menuFiltroGrupoAberto) {
      requestAnimationFrame(() => this.updateGrupoFiltroMenuPosition());
    }
  }

  toggleFiltroDataMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharOutrosFiltroMenus('data');
    this.menuFiltroDataAberto = !this.menuFiltroDataAberto;
    if (this.menuFiltroDataAberto) {
      requestAnimationFrame(() => this.updateDataFiltroMenuPosition());
    }
  }

  toggleFiltroSetorMenu(ev: MouseEvent): void {
    ev.stopPropagation();
    this.fecharOutrosFiltroMenus('setor');
    this.menuFiltroSetorAberto = !this.menuFiltroSetorAberto;
    if (this.menuFiltroSetorAberto) {
      requestAnimationFrame(() => this.updateSetorFiltroMenuPosition());
    }
  }

  private updateStatusFiltroMenuPosition(): void {
    this.posicionarFiltroMenu(this.statusFiltroHost?.nativeElement, 'status', this.statusFiltroPanelMinWidth);
  }

  private updateGrupoFiltroMenuPosition(): void {
    this.posicionarFiltroMenu(this.grupoFiltroHost?.nativeElement, 'grupo', this.grupoFiltroPanelMinWidth);
  }

  private updateDataFiltroMenuPosition(): void {
    this.posicionarFiltroMenu(this.dataFiltroHost?.nativeElement, 'data', this.dataFiltroPanelMinWidth);
  }

  private updateSetorFiltroMenuPosition(): void {
    this.posicionarFiltroMenu(this.setorFiltroHost?.nativeElement, 'setor', this.setorFiltroPanelMinWidth);
  }

  private posicionarFiltroMenu(
    hostEl: HTMLElement | undefined,
    alvo: 'status' | 'grupo' | 'data' | 'setor',
    minW: number,
  ): void {
    if (!hostEl) return;
    const r = hostEl.getBoundingClientRect();
    const gap = 4;
    let left = r.left + r.width / 2 - minW / 2;
    const top = r.bottom + gap;
    const pad = 8;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    if (left < pad) left = pad;
    if (left + minW > vw - pad) left = Math.max(pad, vw - pad - minW);
    if (alvo === 'status') {
      this.statusFiltroPanelTop = top;
      this.statusFiltroPanelLeft = left;
      this.statusFiltroPanelMinWidth = minW;
    } else if (alvo === 'grupo') {
      this.grupoFiltroPanelTop = top;
      this.grupoFiltroPanelLeft = left;
      this.grupoFiltroPanelMinWidth = minW;
    } else if (alvo === 'data') {
      this.dataFiltroPanelTop = top;
      this.dataFiltroPanelLeft = left;
      this.dataFiltroPanelMinWidth = minW;
    } else {
      this.setorFiltroPanelTop = top;
      this.setorFiltroPanelLeft = left;
      this.setorFiltroPanelMinWidth = minW;
    }
    this.cdr.markForCheck();
  }

  selectStatusFiltro(val: string): void {
    this.filtroStatus = val;
    this.menuFiltroStatusAberto = false;
  }

  selectGrupoFiltro(grupoId: FiltroGrupoMatch): void {
    this.filtroGrupoId = grupoId;
    this.menuFiltroGrupoAberto = false;
  }

  selectSetorFiltro(setorId: FiltroSetorMatch): void {
    this.filtroSetorId = setorId;
    this.menuFiltroSetorAberto = false;
  }

  selectDataEventoFiltro(val: string): void {
    this.filtroDataEvento = (val || '').trim();
    this.cdr.markForCheck();
  }

  limparFiltroData(): void {
    this.filtroDataEvento = '';
    this.menuFiltroDataAberto = false;
    this.cdr.markForCheck();
  }

  private matchMatchesGrupoFiltro(m: any): boolean {
    if (this.filtroGrupoId === 'PUBLICO') return m.grupo_id == null;
    return Number(m.grupo_id) === this.filtroGrupoId;
  }

  private matchMatchesDataEventoFiltro(m: any): boolean {
    const key = this.dataJogoParaChave(m);
    if (!key) return false;
    return key === this.filtroDataEvento;
  }

  private matchMatchesSetorFiltro(m: any): boolean {
    if (this.filtroSetorId === 'SEM_SETOR') return m.setor_evento_id == null;
    return Number(m.setor_evento_id) === this.filtroSetorId;
  }

  private dataJogoParaChave(m: any): string | null {
    const local = this.formatIsoParaDatetimeLocal(m?.data_jogo);
    const key = this.dataJogoParaApenasData(local);
    return key || null;
  }

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

  private compareByDataEvento(a: any, b: any): number {
    const da = this.parseDate(a?.data_jogo)?.getTime();
    const db = this.parseDate(b?.data_jogo)?.getTime();
    if (da != null && db != null) return da - db;
    if (da != null) return -1;
    if (db != null) return 1;
    return String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'pt-BR');
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(value as string);
    return Number.isNaN(d.getTime()) ? null : d;
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

  podeDisparar(m: any): boolean {
    if (this.tipoAtivo === 'BID_ABERTO' || this.tipoAtivo === 'EVENTO') return true;
    const status = (m.status || '').toUpperCase();
    if (this.tipoAtivo === 'BID_ENCERRADO' || this.tipoAtivo === 'GANHADORES') {
      return status === 'ENCERRADA' || status === 'FINALIZADA';
    }
    return true;
  }

  get matchesDisparaveisFiltrados(): any[] {
    return this.matchesFiltrados.filter((m) => this.podeDisparar(m));
  }

  get quantidadeSelecionados(): number {
    return this.bidsSelecionados.size;
  }

  get todosDisparaveisSelecionados(): boolean {
    const disparaveis = this.matchesDisparaveisFiltrados;
    if (disparaveis.length === 0) return false;
    return disparaveis.every((m) => this.bidsSelecionados.has(m.id));
  }

  get selecaoParcial(): boolean {
    const disparaveis = this.matchesDisparaveisFiltrados;
    if (disparaveis.length === 0) return false;
    const selected = disparaveis.filter((m) => this.bidsSelecionados.has(m.id)).length;
    return selected > 0 && selected < disparaveis.length;
  }

  isBidSelecionado(id: number): boolean {
    return this.bidsSelecionados.has(id);
  }

  toggleBidSelecionado(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) this.bidsSelecionados.add(id);
    else this.bidsSelecionados.delete(id);
  }

  toggleSelecionarTodos(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const disparaveis = this.matchesDisparaveisFiltrados;
    if (checked) {
      disparaveis.forEach((m) => this.bidsSelecionados.add(m.id));
    } else {
      disparaveis.forEach((m) => this.bidsSelecionados.delete(m.id));
    }
  }

  limparSelecaoBids(): void {
    this.bidsSelecionados.clear();
  }

  private escapeHtml(s: string): string {
    if (s == null || s === undefined) return '';
    const str = String(s);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private normalizeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private getTimestamp(value: unknown): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.getTime();
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : 0;
  }

  verLogsDisparo(match: any): void {
    this.emailService.getDisparosLog(match.id, { sort: 'desc', limit: 100 }).subscribe({
      next: (logs: DisparoLogEntry[]) => {
        if (!logs || logs.length === 0) {
          Swal.fire('Informação', 'Nenhum disparo registrado para este BID.', 'info');
          return;
        }
        const labelTipo = (t: string) => {
          if (t === 'BID_ABERTO') return 'Bid Aberto';
          if (t === 'BID_ENCERRADO') return 'Bid Encerrado';
          if (t === 'GANHADORES') return 'Ganhadores';
          if (t === 'EVENTO') return 'Evento';
          if (t === 'USUARIO_CRIADO') return 'Criação de utilizador';
          if (t === 'WT_PASS_PROMOVIDO_FILA') return 'WT Pass — vaga na fila';
          return t || '—';
        };
        Swal.fire({
          title: `Log de disparos: ${match.titulo}`,
          html: `
            <div class="mb-3">
              <input id="log-search" type="text" class="swal2-input w-full m-0 text-sm" placeholder="Buscar por BID, admin, tipo, e-mail ou mensagem...">
            </div>
            <div id="log-results" class="overflow-y-auto max-h-[70vh] pr-1"></div>
          `,
          width: '900px',
          showConfirmButton: true,
          confirmButtonText: 'Fechar',
          customClass: { popup: 'rounded-xl' },
          didOpen: () => {
            const popup = Swal.getPopup();
            if (!popup) return;
            const inputSearch = popup.querySelector('#log-search') as HTMLInputElement | null;
            const logResults = popup.querySelector('#log-results') as HTMLElement | null;
            let termoBuscaLog = '';

            const renderLogs = () => {
              if (!logResults) return;
              const logsFiltrados = [...logs]
                .sort((a, b) => this.getTimestamp(b.data_hora || b.id) - this.getTimestamp(a.data_hora || a.id))
                .filter((log) => {
                  if (!termoBuscaLog) return true;
                  const dest = log.destinatarios || [];
                  const errosLista: string[] = (log as any).errosLista || [];
                  const textoDest = dest.map((d: any) => `${d.email || ''} ${d.status || ''} ${d.mensagem || ''}`).join(' ');
                  const texto = [
                    match?.id,
                    match?.titulo,
                    log?.id,
                    log?.data_hora,
                    log?.admin_nome,
                    log?.tipoDisparo,
                    log?.totalDestinatarios,
                    log?.enviados,
                    log?.erros,
                    textoDest,
                    errosLista.join(' '),
                  ].map((v) => this.normalizeText(v)).join(' ');
                  return texto.includes(termoBuscaLog);
                });

              if (logsFiltrados.length === 0) {
                logResults.innerHTML = '<p class="text-sm text-gray-500 py-2">Nenhum log encontrado.</p>';
                return;
              }

              const blocos = logsFiltrados.map((log) => {
                const dataHora = log.data_hora ? new Date(log.data_hora).toLocaleString('pt-BR') : '—';
                const enviados = log.enviados ?? 0;
                const total = log.totalDestinatarios ?? 0;
                const erros = log.erros ?? 0;
                const dest: any[] = log.destinatarios || [];
                const errosLista: string[] = (log as any).errosLista || [];

                const temDestinatarios = dest.length > 0;
                let corpoTabela = '';

                if (temDestinatarios) {
                  corpoTabela = `<div style="padding:12px;background:#fff;">${buildDestinatariosTableHtml(dest)}</div>`;
                } else {
                  const errosHtml =
                    errosLista.length > 0
                      ? `<div class="mt-2">
                          <p class="text-xs font-semibold text-red-600 mb-1">Erros (${errosLista.length}):</p>
                          <ul class="text-xs text-red-500 space-y-0.5 max-h-32 overflow-y-auto">
                            ${errosLista.map((e: string) => `<li class="truncate">• ${this.escapeHtml(e)}</li>`).join('')}
                          </ul>
                        </div>`
                      : '';
                  corpoTabela = `
                    <div class="px-3 py-3 bg-white text-sm text-gray-600">
                      <div class="flex gap-6">
                        <span>✅ <strong>${enviados}</strong> enviado(s)</span>
                        <span>👥 <strong>${total}</strong> destinatário(s)</span>
                        ${erros > 0 ? `<span>❌ <strong>${erros}</strong> erro(s)</span>` : ''}
                      </div>
                      ${errosHtml}
                    </div>`;
                }

                return `
                  <div class="mb-4 rounded-lg border border-gray-200 overflow-hidden">
                    <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>${dataHora}</span>
                      <span>${labelTipo(log.tipoDisparo ?? '')}</span>
                      <span>${this.escapeHtml(log.admin_nome || 'Sistema')}</span>
                      <span>BID #${this.escapeHtml(String(match?.id ?? '—'))}</span>
                      <span class="text-emerald-600">${enviados}/${total} enviados</span>
                      ${erros > 0 ? `<span class="text-red-600">${erros} erro(s)</span>` : ''}
                    </div>
                    ${corpoTabela}
                  </div>`;
              });
              logResults.innerHTML = blocos.join('');
            };

            inputSearch?.addEventListener('input', () => {
              termoBuscaLog = this.normalizeText(inputSearch.value);
              renderLogs();
            });
            renderLogs();
          },
        });
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar log de disparos.', 'error'),
    });
  }

  visualizarPdfGanhadores(match: any): void {
    if (this.pdfLoadingPartidaId != null) return;
    this.pdfLoadingPartidaId = match.id;
    this.cdr.markForCheck();
    this.emailService.getPdfGanhadores(match.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err) => {
        let msg = 'Não foi possível gerar o PDF.';
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const body = JSON.parse(reader.result as string);
              msg = body?.error || msg;
            } catch (_) {}
            Swal.fire('Erro', msg, 'error');
          };
          reader.readAsText(err.error);
        } else {
          msg = err.error?.error || msg;
          Swal.fire('Erro', msg, 'error');
        }
      },
      complete: () => {
        this.pdfLoadingPartidaId = null;
        this.cdr.markForCheck();
      },
    });
  }

  abrirModalDisparo(match: any): void {
    if (this.tipoAtivo !== 'BID_ABERTO' && this.tipoAtivo !== 'EVENTO' && (match.status || '').toUpperCase() !== 'ENCERRADA' && (match.status || '').toUpperCase() !== 'FINALIZADA') {
      Swal.fire('Atenção', 'Este disparo só é permitido para BID já encerrado ou finalizado.', 'warning');
      return;
    }

    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        this.listas = listas || [];
        const all = templates || [];
        this.templates = all.filter((t) => t.tipo_disparo === this.tipoAtivo);
        this.mostrarModalDisparo(match);
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  abrirModalDisparoLote(): void {
    if (this.bidsSelecionados.size < 1) {
      Swal.fire('Atenção', 'Selecione ao menos um evento na tabela.', 'warning');
      return;
    }

    const matches = this.matches.filter((m) => this.bidsSelecionados.has(m.id));
    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        this.listas = listas || [];
        const all = templates || [];
        this.templates = all.filter((t) => t.tipo_disparo === 'EVENTO');
        this.mostrarModalDisparoLote(matches);
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  private mostrarModalDisparo(match: any): void {
    const usaLista = this.tipoAtivo === 'BID_ABERTO' || this.tipoAtivo === 'BID_ENCERRADO' || this.tipoAtivo === 'EVENTO';
    const listasOptions =
      this.listas.length > 0
        ? this.listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
        : '<option value="">— Nenhuma lista —</option>';
    const templatesOptions =
      this.templates.length > 0
        ? this.templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
        : '<option value="">— Nenhum template para este tipo —</option>';
    const hintSemTemplate =
      this.templates.length === 0
        ? `<p class="text-left text-xs text-amber-600 mt-1 mb-2">Atribua o tipo "<strong>${this.getLabelTipo(this.tipoAtivo)}</strong>" aos templates em Configurações → Templates de e-mail para que apareçam aqui.</p>`
        : '';

    let html = `
      <p class="text-left text-sm text-gray-600 mb-3">BID: <strong>${match.titulo}</strong></p>
      <p class="text-left text-xs text-gray-500 mb-3">Tipo: <strong>${this.getLabelTipo(this.tipoAtivo)}</strong></p>
      <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
      <select id="swal-template" class="swal2-input w-full m-0 mb-1">${templatesOptions}</select>
      <button type="button" id="swal-preview" class="mt-2 mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400 transition">
        👁 Pré-visualizar e-mail
      </button>
      ${hintSemTemplate}
    `;

    if (usaLista) {
      html += `
        <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Destinatários</label>
        <select id="swal-dest" class="swal2-input w-full m-0 mb-2">
          <option value="grupo" selected>Participantes do grupo</option>
          <option value="lista">Lista de e-mails</option>
          <option value="personalizado">Envio personalizado</option>
        </select>
        <div id="swal-lista-wrap" class="hidden">
          <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Lista</label>
          <select id="swal-lista" class="swal2-input w-full m-0">${listasOptions}</select>
        </div>
        <div id="swal-personalizado-wrap" class="hidden mt-2">
          <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">E-mails (um por linha ou separados por vírgula)</label>
          <textarea id="swal-emails-personalizado" class="swal2-textarea w-full m-0 text-sm" rows="4" placeholder="email1@exemplo.com&#10;email2@exemplo.com"></textarea>
        </div>
      `;
    }

    Swal.fire({
      title: 'Disparar e-mail',
      html,
      showCancelButton: true,
      confirmButtonText: 'Disparar',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const popup = Swal.getPopup();
        const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
        const wrapLista = popup?.querySelector('#swal-lista-wrap');
        const wrapPersonalizado = popup?.querySelector('#swal-personalizado-wrap');
        popup?.querySelector('#swal-preview')?.addEventListener('click', () => {
          const templateEl = popup?.querySelector('#swal-template') as HTMLSelectElement | null;
          const templateId = templateEl ? Number(templateEl.value) : 0;
          if (!templateId) {
            Swal.fire('Atenção', 'Selecione o template para pré-visualizar.', 'warning');
            return;
          }
          this.emailService.previewTemplate(templateId, match.id).subscribe({
            next: (res) => {
              const pdfNote =
                this.tipoAtivo === 'BID_ENCERRADO'
                  ? '<p class="text-xs text-amber-600 mt-2 mb-2">O PDF de ganhadores é anexado apenas no envio real.</p>'
                  : '';
              Swal.fire({
                title: res.assunto || 'Pré-visualização',
                html: `${pdfNote}<div class="text-left max-h-[60vh] overflow-auto border border-gray-200 rounded-lg p-4 bg-white">${res.html || ''}</div>`,
                width: '700px',
                showConfirmButton: true,
                confirmButtonText: 'Fechar',
              });
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Não foi possível carregar a pré-visualização.', 'error'),
          });
        });
        if (dest) {
          dest.value = 'grupo';
          const updateVisibility = () => {
            if (wrapLista) (wrapLista as HTMLElement).classList.toggle('hidden', dest.value !== 'lista');
            if (wrapPersonalizado) (wrapPersonalizado as HTMLElement).classList.toggle('hidden', dest.value !== 'personalizado');
          };
          dest.addEventListener('change', updateVisibility);
          updateVisibility();
        }
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const templateEl = popup?.querySelector('#swal-template') as HTMLSelectElement | null;
        const templateId = templateEl ? Number(templateEl.value) : 0;
        if (!templateId) {
          Swal.showValidationMessage('Selecione o template.');
          return null;
        }
        let listaId: number | undefined;
        let usarGrupo = false;
        let emailsPersonalizados: string[] | undefined;
        if (usaLista) {
          const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
          const destValue = (dest?.value ?? 'grupo').trim() || 'grupo';
          console.log('[Disparo] preConfirm destinatários:', { destValue, raw: dest?.value });
          if (destValue === 'lista') {
            const listaEl = popup?.querySelector('#swal-lista') as HTMLSelectElement | null;
            listaId = listaEl ? Number(listaEl.value) : undefined;
            if (!listaId) {
              Swal.showValidationMessage('Selecione a lista de e-mails.');
              return null;
            }
          } else if (destValue === 'personalizado') {
            const textarea = popup?.querySelector('#swal-emails-personalizado') as HTMLTextAreaElement | null;
            const raw = (textarea?.value ?? '').trim();
            const list = raw
              .split(/[\n,;]+/)
              .map((e) => e.trim().toLowerCase())
              .filter((e) => e.length > 0);
            const valid = list.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
            if (valid.length === 0) {
              Swal.showValidationMessage('Informe ao menos um e-mail válido no envio personalizado.');
              return null;
            }
            emailsPersonalizados = valid;
          } else {
            usarGrupo = true;
          }
        }
        console.log('[Disparo] preConfirm resultado:', { templateId, listaId, usarGrupo, emailsPersonalizados });
        return { templateId, listaId, usarGrupo, emailsPersonalizados };
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const { templateId, listaId, usarGrupo, emailsPersonalizados } = result.value!;
        console.log('[Disparo] Enviando:', { partidaId: match.id, templateId, listaId, usarGrupo, emailsPersonalizados });

        openDisparoProgressModal();
        let progressState: DisparoProgressState = { total: 0, enviados: 0, processados: 0, recentItems: [] };

        try {
          const res = await this.emailService.sendStream(
            match.id,
            templateId,
            this.currentUser?.id,
            { listaId, usarGrupo, emailsPersonalizados, tipoDisparo: this.tipoAtivo },
            {
              onInit: ({ total }) => {
                progressState = { ...progressState, total };
                updateDisparoProgressModal(progressState);
              },
              onProgress: (progress) => {
                progressState = appendProgressItem(progressState, progress);
                updateDisparoProgressModal(progressState);
              },
            }
          );
          await showDisparoResultModal(res);
          this.carregarMatches();
        } catch (err: unknown) {
          console.error('[Disparo] Erro na requisição:', err);
          const partial =
            (err as { partial?: SendEmailsResponse })?.partial ?? buildPartialFromProgress(progressState);
          const message = err instanceof Error ? err.message : 'Falha ao enviar e-mails.';
          await showDisparoPartialErrorModal(message, partial);
          if (partial && partial.enviados > 0) {
            this.carregarMatches();
          }
        }
      }
    });
  }

  private mostrarModalDisparoLote(matches: any[]): void {
    const previewMatch = matches[0];
    const listasOptions =
      this.listas.length > 0
        ? this.listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
        : '<option value="">— Nenhuma lista —</option>';
    const templatesOptions =
      this.templates.length > 0
        ? this.templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
        : '<option value="">— Nenhum template para este tipo —</option>';
    const hintSemTemplate =
      this.templates.length === 0
        ? `<p class="text-left text-xs text-amber-600 mt-1 mb-2">Atribua o tipo "<strong>${this.getLabelTipo('EVENTO')}</strong>" aos templates em Configurações → Templates de e-mail para que apareçam aqui.</p>`
        : '';

    const maxShow = 5;
    const titulos = matches.map((m) => m.titulo);
    let resumoEventos = `<p class="text-left text-sm text-gray-600 mb-2">Serão disparados <strong>${matches.length}</strong> evento(s):</p>`;
    if (titulos.length <= maxShow) {
      resumoEventos += `<ul class="text-left text-sm text-gray-600 mb-3 list-disc pl-5">${titulos.map((t) => `<li>${this.escapeHtml(t)}</li>`).join('')}</ul>`;
    } else {
      const shown = titulos.slice(0, maxShow);
      const rest = titulos.length - maxShow;
      resumoEventos += `<ul class="text-left text-sm text-gray-600 mb-1 list-disc pl-5">${shown.map((t) => `<li>${this.escapeHtml(t)}</li>`).join('')}</ul>`;
      resumoEventos += `<p class="text-left text-xs text-gray-500 mb-3">… e mais ${rest} evento(s)</p>`;
    }

    let html = `
      ${resumoEventos}
      <p class="text-left text-xs text-gray-500 mb-3">Tipo: <strong>${this.getLabelTipo('EVENTO')}</strong></p>
      <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
      <select id="swal-template" class="swal2-input w-full m-0 mb-1">${templatesOptions}</select>
      <button type="button" id="swal-preview" class="mt-2 mb-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:border-sky-400 transition">
        👁 Pré-visualizar e-mail
      </button>
      <p class="text-left text-xs text-gray-400 mb-2">A pré-visualização usa o primeiro evento selecionado.</p>
      ${hintSemTemplate}
      <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Destinatários</label>
      <select id="swal-dest" class="swal2-input w-full m-0 mb-2">
        <option value="grupo" selected>Participantes do grupo</option>
        <option value="lista">Lista de e-mails</option>
        <option value="personalizado">Envio personalizado</option>
      </select>
      <div id="swal-lista-wrap" class="hidden">
        <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Lista</label>
        <select id="swal-lista" class="swal2-input w-full m-0">${listasOptions}</select>
      </div>
      <div id="swal-personalizado-wrap" class="hidden mt-2">
        <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">E-mails (um por linha ou separados por vírgula)</label>
        <textarea id="swal-emails-personalizado" class="swal2-textarea w-full m-0 text-sm" rows="4" placeholder="email1@exemplo.com&#10;email2@exemplo.com"></textarea>
      </div>
    `;

    Swal.fire({
      title: 'Disparar e-mails em lote',
      html,
      showCancelButton: true,
      confirmButtonText: 'Disparar selecionados',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const popup = Swal.getPopup();
        const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
        const wrapLista = popup?.querySelector('#swal-lista-wrap');
        const wrapPersonalizado = popup?.querySelector('#swal-personalizado-wrap');
        popup?.querySelector('#swal-preview')?.addEventListener('click', () => {
          const templateEl = popup?.querySelector('#swal-template') as HTMLSelectElement | null;
          const templateId = templateEl ? Number(templateEl.value) : 0;
          if (!templateId) {
            Swal.fire('Atenção', 'Selecione o template para pré-visualizar.', 'warning');
            return;
          }
          this.emailService.previewTemplate(templateId, previewMatch.id).subscribe({
            next: (res) => {
              Swal.fire({
                title: res.assunto || 'Pré-visualização',
                html: `<div class="text-left max-h-[60vh] overflow-auto border border-gray-200 rounded-lg p-4 bg-white">${res.html || ''}</div>`,
                width: '700px',
                showConfirmButton: true,
                confirmButtonText: 'Fechar',
              });
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Não foi possível carregar a pré-visualização.', 'error'),
          });
        });
        if (dest) {
          dest.value = 'grupo';
          const updateVisibility = () => {
            if (wrapLista) (wrapLista as HTMLElement).classList.toggle('hidden', dest.value !== 'lista');
            if (wrapPersonalizado) (wrapPersonalizado as HTMLElement).classList.toggle('hidden', dest.value !== 'personalizado');
          };
          dest.addEventListener('change', updateVisibility);
          updateVisibility();
        }
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const templateEl = popup?.querySelector('#swal-template') as HTMLSelectElement | null;
        const templateId = templateEl ? Number(templateEl.value) : 0;
        if (!templateId) {
          Swal.showValidationMessage('Selecione o template.');
          return null;
        }
        let listaId: number | undefined;
        let usarGrupo = false;
        let emailsPersonalizados: string[] | undefined;
        const dest = popup?.querySelector('#swal-dest') as HTMLSelectElement | null;
        const destValue = (dest?.value ?? 'grupo').trim() || 'grupo';
        if (destValue === 'lista') {
          const listaEl = popup?.querySelector('#swal-lista') as HTMLSelectElement | null;
          listaId = listaEl ? Number(listaEl.value) : undefined;
          if (!listaId) {
            Swal.showValidationMessage('Selecione a lista de e-mails.');
            return null;
          }
        } else if (destValue === 'personalizado') {
          const textarea = popup?.querySelector('#swal-emails-personalizado') as HTMLTextAreaElement | null;
          const raw = (textarea?.value ?? '').trim();
          const list = raw
            .split(/[\n,;]+/)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 0);
          const valid = list.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
          if (valid.length === 0) {
            Swal.showValidationMessage('Informe ao menos um e-mail válido no envio personalizado.');
            return null;
          }
          emailsPersonalizados = valid;
        } else {
          usarGrupo = true;
        }
        return { templateId, listaId, usarGrupo, emailsPersonalizados };
      },
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const { templateId, listaId, usarGrupo, emailsPersonalizados } = result.value!;
        await this.executarDisparoLote(matches, templateId, { listaId, usarGrupo, emailsPersonalizados });
      }
    });
  }

  private async executarDisparoLote(
    matches: any[],
    templateId: number,
    opcoes: { listaId?: number; usarGrupo: boolean; emailsPersonalizados?: string[] }
  ): Promise<void> {
    openDisparoProgressModal();
    const totalEventos = matches.length;
    const aggregate: SendEmailsResponse = {
      enviados: 0,
      total: 0,
      destinatarios: [],
      erros: [],
    };

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      let progressState: DisparoProgressState = {
        total: 0,
        enviados: 0,
        processados: 0,
        recentItems: [],
        eventoIndice: i + 1,
        totalEventos,
        tituloEvento: match.titulo,
      };
      updateDisparoProgressModal(progressState);

      try {
        const res = await this.emailService.sendStream(
          match.id,
          templateId,
          this.currentUser?.id,
          { ...opcoes, tipoDisparo: 'EVENTO' },
          {
            onInit: ({ total }) => {
              progressState = {
                ...progressState,
                total,
                enviados: 0,
                processados: 0,
                recentItems: [],
              };
              updateDisparoProgressModal(progressState);
            },
            onProgress: (progress) => {
              progressState = appendProgressItem(progressState, progress);
              updateDisparoProgressModal(progressState);
            },
          }
        );
        aggregate.enviados += res.enviados;
        aggregate.total += res.total;
        if (res.destinatarios?.length) aggregate.destinatarios!.push(...res.destinatarios);
        if (res.erros?.length) aggregate.erros!.push(...res.erros);
      } catch (err: unknown) {
        const partial =
          (err as { partial?: SendEmailsResponse })?.partial ?? buildPartialFromProgress(progressState);
        if (partial) {
          aggregate.enviados += partial.enviados;
          aggregate.total += partial.total;
          if (partial.destinatarios?.length) aggregate.destinatarios!.push(...partial.destinatarios);
          if (partial.erros?.length) aggregate.erros!.push(...partial.erros);
        }
        const message = err instanceof Error ? err.message : `Falha no evento "${match.titulo}".`;
        aggregate.erros!.push(message);
      }
    }

    Swal.close();
    const errosLista = aggregate.erros?.filter(Boolean) ?? [];
    const resFinal: SendEmailsResponse = {
      enviados: aggregate.enviados,
      total: aggregate.total,
      destinatarios: aggregate.destinatarios,
      erros: errosLista.length ? errosLista : undefined,
    };
    await showDisparoResultModal(resFinal, `${totalEventos} evento(s) processado(s).`);
    this.limparSelecaoBids();
    this.carregarMatches();
  }

  private getLabelTipo(t: TipoDisparo): string {
    switch (t) {
      case 'BID_ABERTO':
        return '1 – Bid Aberto';
      case 'BID_ENCERRADO':
        return '2 – Bid Encerrado';
      case 'GANHADORES':
        return '3 – Ganhadores';
      case 'EVENTO':
        return '4 – Evento (agrupar)';
      default:
        return t;
    }
  }

  getLabelTipoTemplate(tipo: string | null | undefined): string {
    if (tipo == null || tipo === '') return 'Qualquer';
    switch (tipo) {
      case 'BID_ABERTO':
        return 'Bid aberto';
      case 'BID_ENCERRADO':
        return 'Bid encerrado';
      case 'GANHADORES':
        return 'Ganhadores';
      case 'EVENTO':
        return 'Evento';
      case 'USUARIO_CRIADO':
        return 'Criação de utilizador';
      case 'WT_PASS_PROMOVIDO_FILA':
        return 'WT Pass — vaga na fila';
      default:
        return tipo;
    }
  }
}

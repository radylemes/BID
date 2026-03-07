import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatchService } from '../../services/match.service';
import { EmailService, SendEmailsResponse, DisparoLogEntry, TemplateEmail, ListaEmail, ListaEmailItem } from '../../services/email.service';
import { UserService } from '../../services/user.service';
import Swal from 'sweetalert2';

type TipoDisparo = 'BID_ABERTO' | 'BID_ENCERRADO' | 'GANHADORES';

@Component({
  selector: 'app-disparo-emails',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-[var(--app-bg)] min-h-screen">
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
            </select>
          </div>
          <ul class="hidden sm:flex text-sm font-medium text-center -space-x-px" role="tablist">
            <li class="w-full focus-within:z-10" role="presentation">
              <button
                type="button"
                role="tab"
                [attr.aria-current]="tipoAtivo === 'BID_ABERTO' ? 'page' : null"
                (click)="tipoAtivo = 'BID_ABERTO'"
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
                (click)="tipoAtivo = 'BID_ENCERRADO'"
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
                (click)="tipoAtivo = 'GANHADORES'"
                [ngClass]="{
                  'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] font-semibold border-[var(--app-border)]': tipoAtivo === 'GANHADORES',
                  'bg-[var(--color-bg-surface)] text-[var(--app-text-muted)] hover:bg-[var(--color-bg-surface-alt)] hover:text-[var(--app-text)] border-transparent hover:border-[var(--app-border)]': tipoAtivo !== 'GANHADORES'
                }"
                class="inline-flex items-center justify-center w-full border rounded-r-lg font-medium leading-5 px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
              >
                <svg class="w-4 h-4 me-1.5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l4-4 4 4 5-5M4 18h16"/></svg>
                3 – Ganhadores
              </button>
            </li>
          </ul>
        </div>

        <div class="p-4">
          <p class="text-sm text-[var(--app-text-muted)] mb-4" [innerHTML]="descricaoTipo"></p>

          <div *ngIf="loading" class="py-8 text-center text-[var(--app-text-muted)]">
            <span class="animate-pulse">Carregando BIDs...</span>
          </div>

          <div *ngIf="!loading && matches.length === 0" class="py-8 text-center text-[var(--app-text-muted)]">
            Nenhum BID encontrado.
          </div>

          <div *ngIf="!loading && matches.length > 0" class="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table class="min-w-[700px] w-full text-sm">
              <thead>
                <tr class="bg-[var(--color-bg-surface-alt)] border-b border-[var(--app-border)]">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-[var(--app-text-muted)] uppercase">BID</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--app-text-muted)] uppercase">Status</th>
                  <th class="px-4 py-3 text-center text-xs font-semibold text-[var(--app-text-muted)] uppercase">Disparos já feitos</th>
                  <th class="px-4 py-3 text-right text-xs font-semibold text-[var(--app-text-muted)] uppercase">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngFor="let m of matchesFiltrados" class="hover:bg-[var(--app-nav-hover-bg)]">
                  <td class="px-4 py-3">
                    <div class="font-semibold text-[var(--app-text)]">{{ m.titulo }}</div>
                    <div class="text-xs text-[var(--app-text-muted)]">{{ m.nome_grupo || 'Público' }} · {{ m.data_limite_aposta | date:'dd/MM/yyyy HH:mm' }}</div>
                  </td>
                  <td class="px-4 py-3 text-center">
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
            <div *ngIf="templatesLoading" class="p-6 text-center text-[var(--app-text-muted)]">A carregar...</div>
            <div *ngIf="!templatesLoading && templatesList.length === 0" class="p-6 text-center text-[var(--app-text-muted)]">Nenhum template. Crie um novo template.</div>
            <table *ngIf="!templatesLoading && templatesList.length > 0" class="min-w-full text-sm">
              <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] uppercase font-bold text-xs">
                <tr>
                  <th class="px-4 py-3 text-left">Nome</th>
                  <th class="px-4 py-3 text-left">Assunto</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngFor="let t of templatesList" class="hover:bg-[var(--app-nav-hover-bg)]">
                  <td class="px-4 py-3 font-medium text-[var(--app-text)]">{{ t.nome }}</td>
                  <td class="px-4 py-3 text-[var(--app-text-muted)]">{{ t.assunto }}</td>
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
            <div *ngIf="listasEmailLoading" class="p-6 text-center text-[var(--app-text-muted)]">A carregar...</div>
            <div *ngIf="!listasEmailLoading && listasEmail.length === 0" class="p-6 text-center text-[var(--app-text-muted)]">Nenhuma lista. Crie uma nova lista.</div>
            <table *ngIf="!listasEmailLoading && listasEmail.length > 0" class="min-w-full text-sm">
              <thead class="bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] uppercase font-bold text-xs">
                <tr>
                  <th class="px-4 py-3 text-left">Nome</th>
                  <th class="px-4 py-3 text-left">Descrição</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--app-border)]">
                <tr *ngFor="let lista of listasEmail" class="hover:bg-[var(--app-nav-hover-bg)]">
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
  abaAtual: 'disparo' | 'templates' | 'listas' = 'disparo';
  matches: any[] = [];
  loading = false;
  tipoAtivo: TipoDisparo = 'BID_ABERTO';

  setTipoAtivo(value: string): void {
    if (value === 'BID_ENCERRADO') this.tipoAtivo = 'BID_ENCERRADO';
    else if (value === 'GANHADORES') this.tipoAtivo = 'GANHADORES';
    else this.tipoAtivo = 'BID_ABERTO';
  }

  currentUser: any = {};
  listas: any[] = [];
  templates: any[] = [];
  templatesList: TemplateEmail[] = [];
  templatesLoading = false;
  listasEmail: ListaEmail[] = [];
  listasEmailLoading = false;
  pdfLoadingPartidaId: number | null = null;

  get descricaoTipo(): string {
    switch (this.tipoAtivo) {
      case 'BID_ABERTO':
        return 'Enviar e-mail avisando que o BID está aberto para apostas. Destinatários: participantes do grupo ou lista de e-mails.';
      case 'BID_ENCERRADO':
        return 'Enviar e-mail com o resultado (apostas realizadas). Inclui PDF com nome e aposta. Apenas para BIDs já encerrados.';
      case 'GANHADORES':
        return 'Enviar e-mail apenas para os usuários vencedores do BID. Apenas para BIDs já finalizados com sorteio.';
      default:
        return '';
    }
  }

  get matchesFiltrados(): any[] {
    return this.matches;
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
        const listEl = container.querySelector('#itens-list');

        const addItem = () => {
          const email = inputEmail?.value?.trim();
          if (!email) {
            Swal.fire('Atenção', 'Informe o e-mail.', 'warning');
            return;
          }
          this.emailService.addListItem(lista.id, email, inputNome?.value?.trim()).subscribe({
            next: (novo) => {
              itens.push(novo);
              const div = document.createElement('div');
              div.className = 'flex items-center justify-between py-2 border-b border-gray-100 last:border-0';
              div.innerHTML = `
                <span class="text-sm text-gray-800">${novo.email}</span>
                <span class="text-xs text-gray-500">${novo.nome_opcional || '—'}</span>
                <button type="button" data-remove-id="${novo.id}" class="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs">Remover</button>
              `;
              div.querySelector('[data-remove-id]')?.addEventListener('click', () => removeItem(novo.id));
              listEl?.appendChild(div);
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
              container.querySelectorAll(`[data-remove-id="${itemId}"]`).forEach((btn) => btn.closest('div')?.remove());
            },
            error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao remover.', 'error'),
          });
        };

        const renderItensList = () => {
          if (!listEl) return;
          listEl.innerHTML = itens.length
            ? itens
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
            : '<p class="text-gray-400 text-sm py-2">Nenhum e-mail na lista.</p>';
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
        container.querySelector('#btn-importar-banco')?.addEventListener('click', importarDoBanco);
        container.querySelectorAll('[data-remove-id]').forEach((btn) => {
          btn.addEventListener('click', () => removeItem(Number((btn as HTMLElement).getAttribute('data-remove-id'))));
        });
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
    this.emailService.createTemplate(t.nome + ' (cópia)', t.assunto, t.corpo_html ?? '').subscribe({
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

  podeDisparar(m: any): boolean {
    if (this.tipoAtivo === 'BID_ABERTO') return true;
    const status = (m.status || '').toUpperCase();
    if (this.tipoAtivo === 'BID_ENCERRADO' || this.tipoAtivo === 'GANHADORES') {
      return status === 'ENCERRADA' || status === 'FINALIZADA';
    }
    return true;
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

  verLogsDisparo(match: any): void {
    this.emailService.getDisparosLog(match.id).subscribe({
      next: (logs: DisparoLogEntry[]) => {
        if (!logs || logs.length === 0) {
          Swal.fire('Informação', 'Nenhum disparo registrado para este BID.', 'info');
          return;
        }
        const labelTipo = (t: string) => {
          if (t === 'BID_ABERTO') return 'Bid Aberto';
          if (t === 'BID_ENCERRADO') return 'Bid Encerrado';
          if (t === 'GANHADORES') return 'Ganhadores';
          return t || '—';
        };
        const blocos = logs.map((log) => {
          const dataHora = log.data_hora ? new Date(log.data_hora).toLocaleString('pt-BR') : '—';
          const enviados = log.enviados ?? 0;
          const total = log.totalDestinatarios ?? 0;
          const erros = log.erros ?? 0;
          const dest = log.destinatarios || [];
          const rows = dest
            .map(
              (d) =>
                `<tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="p-2 text-sm text-gray-800">${this.escapeHtml(d.email)}</td>
                  <td class="p-2"><span class="px-2 py-0.5 rounded text-xs font-medium ${d.status === 'enviado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">${d.status === 'enviado' ? 'Enviado' : 'Erro'}</span></td>
                  <td class="p-2 text-xs text-gray-500">${d.status === 'erro' && d.mensagem ? this.escapeHtml(d.mensagem) : '—'}</td>
                </tr>`
            )
            .join('');
          return `
            <div class="mb-4 rounded-lg border border-gray-200 overflow-hidden">
              <div class="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>${dataHora}</span>
                <span>${labelTipo(log.tipoDisparo ?? '')}</span>
                <span>${this.escapeHtml(log.admin_nome || 'Sistema')}</span>
                <span class="text-emerald-600">${enviados}/${total} enviados</span>
                ${erros > 0 ? `<span class="text-red-600">${erros} erro(s)</span>` : ''}
              </div>
              <div class="overflow-x-auto max-h-48 overflow-y-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead class="bg-gray-50 sticky top-0">
                    <tr><th class="p-2 border-b font-semibold text-gray-600">E-mail</th><th class="p-2 border-b font-semibold text-gray-600">Status</th><th class="p-2 border-b font-semibold text-gray-600">Mensagem</th></tr>
                  </thead>
                  <tbody class="bg-white">${rows || '<tr><td colspan="3" class="p-2 text-gray-400">Nenhum destinatário registrado.</td></tr>'}</tbody>
                </table>
              </div>
            </div>`;
        });
        const html = `<div class="overflow-y-auto max-h-[70vh] pr-1">${blocos.join('')}</div>`;
        Swal.fire({
          title: `Log de disparos: ${match.titulo}`,
          html,
          width: '900px',
          showConfirmButton: true,
          confirmButtonText: 'Fechar',
          customClass: { popup: 'rounded-xl' },
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
    if (this.tipoAtivo !== 'BID_ABERTO' && (match.status || '').toUpperCase() !== 'ENCERRADA' && (match.status || '').toUpperCase() !== 'FINALIZADA') {
      Swal.fire('Atenção', 'Este disparo só é permitido para BID já encerrado ou finalizado.', 'warning');
      return;
    }

    forkJoin({
      listas: this.emailService.getLists(),
      templates: this.emailService.getTemplates(),
    }).subscribe({
      next: ({ listas, templates }) => {
        this.listas = listas || [];
        this.templates = templates || [];
        this.mostrarModalDisparo(match);
      },
      error: () => Swal.fire('Erro', 'Falha ao carregar listas ou templates.', 'error'),
    });
  }

  private mostrarModalDisparo(match: any): void {
    const usaLista = this.tipoAtivo === 'BID_ABERTO' || this.tipoAtivo === 'BID_ENCERRADO';
    const listasOptions =
      this.listas.length > 0
        ? this.listas.map((l) => `<option value="${l.id}">${l.nome}</option>`).join('')
        : '<option value="">— Nenhuma lista —</option>';
    const templatesOptions =
      this.templates.length > 0
        ? this.templates.map((t) => `<option value="${t.id}">${t.nome} – ${t.assunto}</option>`).join('')
        : '<option value="">— Nenhum template —</option>';

    let html = `
      <p class="text-left text-sm text-gray-600 mb-3">BID: <strong>${match.titulo}</strong></p>
      <p class="text-left text-xs text-gray-500 mb-3">Tipo: <strong>${this.getLabelTipo(this.tipoAtivo)}</strong></p>
      <label class="block text-left text-xs font-bold text-gray-500 uppercase mb-1">Template</label>
      <select id="swal-template" class="swal2-input w-full m-0 mb-3">${templatesOptions}</select>
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
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: 'Enviando...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        const { templateId, listaId, usarGrupo, emailsPersonalizados } = result.value!;
        console.log('[Disparo] Enviando:', { partidaId: match.id, templateId, listaId, usarGrupo, emailsPersonalizados });
        this.emailService
          .send(match.id, templateId, this.currentUser?.id, { listaId, usarGrupo, emailsPersonalizados, tipoDisparo: this.tipoAtivo })
          .subscribe({
            next: (res: SendEmailsResponse) => {
              const msg =
                res.erros && res.erros.length > 0
                  ? `${res.enviados} enviado(s). Erros: ${res.erros.slice(0, 3).join('; ')}${res.erros.length > 3 ? '...' : ''}`
                  : `${res.enviados} e-mail(s) enviado(s) com sucesso.`;
              Swal.fire({ icon: 'success', title: 'Disparo concluído', text: msg });
              this.carregarMatches();
            },
            error: (err: HttpErrorResponse) => {
              console.error('[Disparo] Erro na requisição:', err.status, err.error);
              Swal.fire('Erro', err.error?.error || 'Falha ao enviar e-mails.', 'error');
            },
          });
      }
    });
  }

  private getLabelTipo(t: TipoDisparo): string {
    switch (t) {
      case 'BID_ABERTO':
        return '1 – Bid Aberto';
      case 'BID_ENCERRADO':
        return '2 – Bid Encerrado';
      case 'GANHADORES':
        return '3 – Ganhadores';
      default:
        return t;
    }
  }
}

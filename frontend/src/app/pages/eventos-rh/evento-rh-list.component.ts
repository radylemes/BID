import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoRhListResponse, EventoRhService } from '../../services/evento-rh.service';
import { uploadsPublicUrl } from '../../utils/uploads-public-url';
import {
  eventoStatusPermiteCancelarInscricaoWtPass,
  rotuloSituacaoInscricaoWtPass,
  seloDestaqueWtPass,
} from '../../utils/wt-pass-inscricao';
import { formatarDataHoraWtPass, formatarDataWtPass } from '../../utils/wt-pass-datas';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-evento-rh-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-0 bg-[var(--app-bg)] p-3 sm:p-4 md:p-6 lg:p-8 pb-10 space-y-4 sm:space-y-6">
      <div *ngIf="!somenteDisponiveis" class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-2xl p-4 sm:p-5 md:p-6">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-[var(--app-text)]">WT Pass</h1>
          </div>
          <div class="md:ml-auto">
          <button
            type="button"
            (click)="aplicarFiltroDisponiveis()"
            class="inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 px-5 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wide whitespace-nowrap group"
          >
            Ver Eventos Disponíveis
            <span class="group-hover:translate-x-0.5 transition-transform" aria-hidden="true">→</span>
          </button>
          </div>
        </div>
      </div>

      <div
        *ngIf="!somenteDisponiveis"
        class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-2xl p-4 sm:p-5 md:p-6"
      >
        <p class="text-sm text-[var(--app-text-muted)] leading-relaxed">
          O WT Pass é um benefício exclusivo para colaboradores WTorre, criado para proporcionar experiências
          únicas nos eventos realizados na Wtorre Entretenimento.
        </p>
        <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
          Por meio dele, os colaboradores contemplados recebem uma pulseira de acesso pessoal e intransferível,
          que permite assistir ao evento em um setor previamente definido pela organização. O benefício é
          destinado exclusivamente ao colaborador, não permitindo a utilização por terceiros ou a entrada de
          acompanhantes.
        </p>
        <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
          Mais do que acesso a eventos, o WT Pass é uma forma de reconhecer e valorizar as pessoas que contribuem
          diariamente para a construção dos nossos projetos. Por isso, contamos com a colaboração de todos para
          que a experiência seja aproveitada com responsabilidade, respeito às regras do programa e alinhamento
          aos valores do Grupo WTorre.
        </p>
      </div>

      <div *ngIf="!somenteDisponiveis" class="grid gap-4 md:grid-cols-2">
        <div class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl p-4 sm:p-5">
          <h3 class="text-xl font-black text-[var(--app-text)] border-l-4 border-indigo-500 pl-3">
            Critérios para Inscrição
          </h3>
          <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
            A inscrição está disponível para todos os colaboradores ativos das empresas WTorre, WTorre
            Entretenimento e PNU. É necessário informar nome completo, CPF e empresa no ato da inscrição.
          </p>
        </div>

        <div class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl p-4 sm:p-5">
          <h3 class="text-xl font-black text-[var(--app-text)] border-l-4 border-indigo-500 pl-3">Política de Vagas</h3>
          <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
            Cada evento possui um número limitado de vagas. As inscrições são por ordem de chegada e serão
            encerradas automaticamente quando todas as vagas forem preenchidas. Caso o limite seja atingido, é
            possível entrar na lista de espera. Em caso de desistência de algum inscrito, as vagas serão
            preenchidas seguindo a ordem de inscrição na lista.
          </p>
        </div>

        <div class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl p-4 sm:p-5">
          <h3 class="text-xl font-black text-[var(--app-text)] border-l-4 border-indigo-500 pl-3">
            Prazos e Cancelamentos
          </h3>
          <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
            As inscrições podem ser encerradas a qualquer momento pelo administrador. Em caso de necessidade de
            cancelamento, entre em contato com o RH ou o organizador do evento.
          </p>
        </div>

        <div class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-xl p-4 sm:p-5">
          <h3 class="text-xl font-black text-[var(--app-text)] border-l-4 border-indigo-500 pl-3">
            Observações Importantes
          </h3>
          <p class="text-sm text-[var(--app-text-muted)] mt-3 leading-relaxed">
            Cada colaborador pode se inscrever apenas uma vez por evento. A utilização é pessoal e intransferível.
            A data e hora da inscrição são registradas automaticamente e não podem ser alteradas.
          </p>
        </div>
      </div>

      <div
        *ngIf="!somenteDisponiveis"
        class="bg-[var(--color-bg-surface)] border border-[var(--app-border)] rounded-2xl p-4 sm:p-5 md:p-6"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-7 h-7 rounded-full border-2 border-indigo-500 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0"
            aria-hidden="true"
          >
            i
          </div>
          <div>
            <h4 class="text-2xl font-extrabold text-[var(--app-text)] leading-none">Precisa de ajuda?</h4>
            <p class="text-sm text-[var(--app-text-muted)] mt-2 leading-relaxed">
              Em caso de dúvidas sobre os eventos ou problemas com inscrições, entre em contato com o departamento de
              Recursos Humanos ou envie um e-mail para recursoshumanos@wtorre.com.br.
            </p>
          </div>
        </div>
      </div>

      <div
        *ngIf="!somenteDisponiveis && bloqueioAtivo"
        class="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100"
      >
        <strong>Inscrição temporariamente bloqueada.</strong> Por falta num evento anterior, ainda restam
        <strong>{{ bloqueioTotal }}/{{ bloqueioAtivo.eventos_restantes }}</strong>
        evento(s) no WT Pass para a liberação (total da configuração / pendentes). (Evento de referência:
        {{ bloqueioAtivo.evento_origem_titulo || '—' }})
      </div>

      <section *ngIf="exibirListaEventos" [ngClass]="somenteDisponiveis ? 'space-y-3 sm:space-y-4' : 'space-y-4'">
        <div>
          <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--app-text)] tracking-tight">
            {{ somenteDisponiveis ? 'Eventos Disponíveis' : 'Eventos' }}
          </h2>
          <p
            *ngIf="!somenteDisponiveis"
            class="mt-1 text-sm sm:text-base md:text-lg text-[var(--app-text-muted)]"
          >
            Confira os eventos disponíveis e faça sua inscrição.
          </p>
        </div>

        <!-- Vista «Disponíveis»: painel com mini-cartões + pesquisa + Voltar -->
        <div
          *ngIf="somenteDisponiveis"
          class="rounded-2xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] shadow-sm p-2 sm:p-2.5"
          role="region"
          aria-label="Situação e pesquisa WT Pass"
        >
          <div
            class="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3 w-full min-w-0"
          >
            <div *ngIf="bloqueioAtivo" class="shrink-0 w-auto max-w-full">
              <div
                class="inline-flex max-w-full rounded-xl border border-[var(--wt-pink-border)] overflow-hidden shadow-sm"
                [attr.title]="
                  'Inscrição impedida por falta em «' +
                  (bloqueioAtivo.evento_origem_titulo || '—') +
                  '». Faltam ' +
                  bloqueioAtivo.eventos_restantes +
                  ' de ' +
                  bloqueioTotal +
                  ' evento(s) WT Pass para liberar.'
                "
              >
                <div
                  class="h-9 sm:h-10 inline-flex flex-row items-center gap-2 px-3 sm:px-3.5 bg-[var(--wt-pink-surface)]"
                >
                  <span
                    class="text-[10px] sm:text-[11px] font-black uppercase tracking-wide whitespace-nowrap text-[var(--wt-pink-strong)]"
                    >Bloqueado</span
                  >
                  <span
                    class="text-xs sm:text-sm font-black tabular-nums whitespace-nowrap text-[var(--wt-pink-strong)]"
                    >{{ bloqueioTotal }}/{{ bloqueioAtivo.eventos_restantes }}</span
                  >
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 w-full min-w-0 lg:flex-1 lg:justify-end">
              <div class="relative flex-1 min-w-[11rem] lg:max-w-[18rem]">
              <span
                class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--app-text-muted)] pointer-events-none opacity-80"
                aria-hidden="true"
                >🔍</span
              >
              <input
                type="search"
                [(ngModel)]="busca"
                (ngModelChange)="atualizarListaExibicao()"
                placeholder="Buscar eventos…"
                class="w-full h-10 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface-alt)] pl-8 pr-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] shadow-inner outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-shadow"
              />
            </div>
            <button
              type="button"
              (click)="voltarParaCards()"
              class="shrink-0 h-10 whitespace-nowrap rounded-xl px-4 text-xs font-bold uppercase tracking-wide bg-[var(--color-bg-surface-alt)] border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-secondary)] active:scale-[0.98] transition-all"
            >
              Voltar
            </button>
            </div>
          </div>
        </div>

        <div *ngIf="!somenteDisponiveis" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative w-full max-w-[200px] sm:max-w-[220px] shrink-0">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs opacity-70" aria-hidden="true">🔍</span>
            <input
              type="text"
              [(ngModel)]="busca"
              (ngModelChange)="atualizarListaExibicao()"
              placeholder="Buscar eventos..."
              class="w-full h-10 rounded-xl border border-[var(--app-border)] bg-[var(--color-bg-surface)] pl-8 pr-3 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-muted)] focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-shadow"
            />
          </div>
          <button
            type="button"
            (click)="voltarParaCards()"
            class="shrink-0 h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wide bg-[var(--color-bg-surface)] border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-nav-hover-bg)] transition-colors sm:ml-auto"
          >
            Voltar para Informativos
          </button>
          </div>
          <div
            class="flex flex-wrap sm:flex-nowrap items-stretch gap-2 w-full"
            role="group"
            aria-label="Filtrar por estado do evento"
          >
          <button
            type="button"
            (click)="filtroStatus = 'TODOS'; atualizarListaExibicao()"
            [class]="chipRowChipClass('TODOS')"
          >
            Todos
          </button>
          <button
            type="button"
            (click)="filtroStatus = 'ABERTOS'; atualizarListaExibicao()"
            [class]="chipRowChipClass('ABERTOS')"
          >
            Abertos
          </button>
          <button
            type="button"
            (click)="filtroStatus = 'EM_BREVE'; atualizarListaExibicao()"
            [class]="chipRowChipClass('EM_BREVE')"
          >
            Em Breve
          </button>
          <button
            type="button"
            (click)="filtroStatus = 'LISTA_ESPERA'; atualizarListaExibicao()"
            [class]="chipRowChipClass('LISTA_ESPERA')"
          >
            Lista de Espera
          </button>
          <button
            type="button"
            (click)="filtroStatus = 'ENCERRADOS'; atualizarListaExibicao()"
            [class]="chipRowChipClass('ENCERRADOS')"
          >
            Fechados
          </button>
          </div>
        </div>

        <div *ngIf="!loading && eventosExibicao.length === 0" class="text-center text-[var(--app-text-muted)] py-12">
          {{
            somenteDisponiveis
              ? 'Nenhum evento ativo para inscrição e sem vagas confirmadas suas a mostrar.'
              : 'Nenhum evento cadastrado no WT Pass.'
          }}
        </div>
      </section>

      <div *ngIf="exibirListaEventos && !loading && eventosExibicao.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
        <div
          *ngFor="let ev of eventosExibicao"
          class="bg-[var(--color-bg-surface)] rounded-2xl hover:-translate-y-1 border border-[var(--app-border)] overflow-hidden transition-all duration-300 flex flex-col relative group h-full"
        >
          <div class="h-40 w-full bg-gray-200 relative overflow-hidden shrink-0">
            <img
              [src]="getBannerUrl(ev)"
              [alt]="ev.titulo || 'Evento'"
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-black/20"></div>
            <div class="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-[1]">
              <span
                class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-sm"
                [ngClass]="{
                  'bg-emerald-500 text-white': statusBadge(ev) === 'Aberto',
                  'bg-blue-600 text-white': statusBadge(ev) === 'Em Breve',
                  'bg-gray-800 text-white': statusBadge(ev) === 'Fechado'
                }"
              >
                {{ statusBadge(ev) }}
              </span>
              <span
                *ngIf="bloqueadoParaUsuario(ev)"
                class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-sm bg-[var(--wt-pink-strong)] text-white inline-flex items-center gap-1"
                [title]="
                  ev.bloqueado_para_mim
                    ? 'Este evento está bloqueado para você por penalidade anterior no WT Pass.'
                    : 'Você está com bloqueio ativo no WT Pass — inscrição indisponível.'
                "
              >
                <span aria-hidden="true">⛔</span> Bloqueado
              </span>
              <span
                *ngIf="seloDestaqueListaDisponiveis(ev) as selo"
                class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-sm"
                [ngClass]="{
                  'bg-amber-500 text-white': selo.tone === 'amber',
                  'bg-emerald-600 text-white': selo.tone === 'emerald',
                  'bg-slate-600 text-white': selo.tone === 'slate'
                }"
              >
                {{ selo.texto }}
              </span>
            </div>
          </div>
          <div class="p-4 flex-1 flex flex-col min-h-0">
            <div class="mb-4">
              <h2 class="text-xl font-black text-[var(--app-text)] leading-tight line-clamp-2 pr-1 min-w-0">
                {{ ev.titulo || 'Sem título' }}
              </h2>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 mb-4 text-xs pb-4 border-b border-[var(--app-border)]">
              <div class="flex items-center gap-2">
                <span class="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded text-[10px] uppercase">GERAL</span>
                <div class="flex items-center gap-1.5 text-[var(--app-text-muted)] flex-wrap">
                  <span class="text-rose-500 text-sm">📍</span>
                  <span class="font-medium truncate max-w-[100px]">{{ ev.local || 'Local a definir' }}</span>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span class="text-[9px] font-bold uppercase text-[var(--app-text-muted)]">Data do Evento</span>
                <div class="flex items-center gap-1 text-[var(--app-text)]">
                  <span class="text-indigo-400">📅</span>
                  <span class="font-bold">{{ formatarDataWtPass(ev.data_evento) }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between bg-[var(--color-bg-surface-alt)] p-2.5 rounded-lg border border-[var(--app-border)] mb-2 text-[10px] text-[var(--app-text-muted)]">
              <div class="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <span class="text-sm">⏱️</span> Período de inscrições
              </div>
              <div class="flex items-center gap-2 font-medium flex-wrap justify-end text-xs">
                <span class="text-emerald-700 font-semibold">{{ formatarDataHoraWtPass(ev.data_inicio_inscricao) }}</span>
                <span class="mx-1">até</span>
                <span class="text-rose-600 font-semibold">{{ formatarDataHoraWtPass(ev.data_limite_inscricao) }}</span>
              </div>
            </div>

            <div
              class="mt-2 grid grid-cols-1 gap-2 sm:gap-2.5 min-h-0"
              [ngClass]="bloqueadoPenalidadeNoEvento(ev) ? 'flex-1 grid-rows-[minmax(0,1fr)]' : null"
            >
              <div
                class="rounded-xl lg:rounded-2xl border px-2 sm:px-3 text-center flex flex-col items-center justify-center min-w-0"
                [ngClass]="
                  bloqueadoPenalidadeNoEvento(ev)
                    ? 'h-full min-h-[5rem] py-5 sm:py-8 border bg-[var(--wt-pink-surface)] border-[var(--wt-pink-border)]'
                    : situacaoWtCardCancelada(ev)
                      ? 'min-h-[5rem] sm:min-h-[5.25rem] py-2.5 border bg-[var(--wt-pink-surface)] border-[var(--wt-pink-border)]'
                      : 'min-h-[4.5rem] sm:min-h-[4.75rem] py-2.5 border-emerald-100 bg-emerald-50/50 dark:bg-emerald-500/10 dark:border-emerald-400/20'
                "
                [attr.title]="bloqueadoPenalidadeNoEvento(ev) ? labelSituacaoWtCard(ev) : null"
              >
                <div
                  class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest shrink-0"
                  [ngClass]="
                    bloqueadoPenalidadeNoEvento(ev) || situacaoWtCardCancelada(ev)
                      ? 'text-[var(--wt-pink-muted)]'
                      : 'text-emerald-400'
                  "
                >
                  Situação
                </div>
                <div
                  class="font-black leading-snug mt-0.5 sm:mt-1 w-full max-w-full"
                  [ngClass]="
                    bloqueadoPenalidadeNoEvento(ev)
                      ? 'text-sm sm:text-base text-[var(--wt-pink-strong)] line-clamp-none px-1 sm:px-2'
                      : situacaoWtCardCancelada(ev)
                        ? 'text-base sm:text-lg text-[var(--wt-pink-strong)] line-clamp-2'
                        : 'text-base sm:text-lg text-emerald-600 dark:text-emerald-300 line-clamp-2'
                  "
                >
                  {{ labelSituacaoWtCard(ev) }}
                </div>
              </div>
            </div>
            <div class="mt-2 sm:mt-3 flex flex-col gap-2 shrink-0">
              <div
                *ngIf="
                  statusBadge(ev) === 'Fechado' &&
                  !participouDoEvento(ev) &&
                  !bloqueadoParaUsuario(ev)
                "
                class="flex flex-col items-center justify-center h-full w-full"
              >
                <div class="text-4xl mb-1 opacity-40">👁</div>
                <div class="text-[13px] font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                  Você não participou
                </div>
              </div>

              <button
                *ngIf="participacaoFinalizada(ev)"
                type="button"
                disabled
                class="w-full bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] font-bold py-3.5 rounded-xl text-sm cursor-not-allowed border border-[var(--app-border)]"
              >
                {{ ev.meu_status === 'PRESENTE' ? 'Presença confirmada' : 'Participação registada (falta)' }}
              </button>

              <button
                *ngIf="podeInscrever(ev)"
                type="button"
                (click)="abrirModalInscricao(ev)"
                class="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide border border-indigo-600 transition-all"
              >
                Inscrever-se <span>➜</span>
              </button>
              <button
                *ngIf="podeCancelar(ev)"
                type="button"
                (click)="cancelar(ev)"
                class="w-full bg-[var(--color-bg-surface)] hover:bg-red-50 text-red-600 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide border border-red-500/60 transition-all"
              >
                Cancelar inscrição
              </button>
              <button
                *ngIf="
                  bloqueadoParaUsuario(ev) &&
                  !bloqueadoPenalidadeNoEvento(ev) &&
                  !podeInscrever(ev) &&
                  !podeCancelar(ev) &&
                  !participacaoFinalizada(ev)
                "
                type="button"
                disabled
                [title]="
                  bloqueioAtivo
                    ? 'Faltam ' +
                      bloqueioAtivo.eventos_restantes +
                      ' de ' +
                      bloqueioTotal +
                      ' evento(s) para liberar.'
                    : 'Bloqueado por penalidade anterior no WT Pass.'
                "
                class="w-full bg-[var(--wt-pink-surface)] text-[var(--wt-pink-strong)] font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide cursor-not-allowed border border-[var(--wt-pink-border)] flex items-center justify-center gap-2"
              >
                <span>⛔</span>
                <span>Bloqueado</span>
                <span *ngIf="bloqueioAtivo" class="tabular-nums">
                  {{ bloqueioTotal }}/{{ bloqueioAtivo.eventos_restantes }}
                </span>
              </button>
              <button
                *ngIf="
                  statusBadge(ev) === 'Fechado' &&
                  !podeInscrever(ev) &&
                  !podeCancelar(ev) &&
                  !participacaoFinalizada(ev) &&
                  !bloqueadoParaUsuario(ev)
                "
                disabled
                class="w-full bg-[var(--color-bg-surface-alt)] text-[var(--app-text-muted)] font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide cursor-not-allowed border border-[var(--app-border)] flex items-center justify-center gap-2"
              >
                <span>🏁</span> Fechado
              </button>
              <button
                *ngIf="
                  statusBadge(ev) === 'Em Breve' &&
                  !podeInscrever(ev) &&
                  !podeCancelar(ev) &&
                  !participacaoFinalizada(ev) &&
                  !bloqueadoParaUsuario(ev)
                "
                disabled
                class="w-full bg-blue-50/50 text-blue-700 font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide cursor-not-allowed border border-blue-100 flex items-center justify-center gap-2"
              >
                <span>⏳</span> Em Breve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EventoRhListComponent implements OnInit {
  eventos: any[] = [];
  eventosExibicao: any[] = [];
  bloqueioAtivo: EventoRhListResponse['bloqueio_ativo'] = null;
  loading = false;
  currentUser: any = {};
  somenteDisponiveis = false;
  exibirListaEventos = false;
  busca = '';
  filtroStatus: 'TODOS' | 'ABERTOS' | 'EM_BREVE' | 'LISTA_ESPERA' | 'ENCERRADOS' = 'TODOS';

  constructor(private eventoRhService: EventoRhService) {}

  /**
   * Quantos eventos (lista completa da API) permitem nova inscrição neste momento
   * — mesmo critério do botão «Inscrever-se».
   */
  get contagemEventosPodeInscreverAgenda(): number {
    if (!Array.isArray(this.eventos)) return 0;
    return this.eventos.filter((ev) => this.podeInscrever(ev)).length;
  }

  /**
   * Total original de eventos do bloqueio em curso (usado para exibir
   * o progresso como «restantes/total», ex.: `4/5`).
   * Para registros antigos sem `eventos_total`, cai no `eventos_restantes`
   * para evitar exibições inválidas como `5/0`.
   */
  get bloqueioTotal(): number {
    const t = Number(this.bloqueioAtivo?.eventos_total);
    if (Number.isFinite(t) && t > 0) return t;
    return Number(this.bloqueioAtivo?.eventos_restantes) || 0;
  }

  /** Valor na API/BD (`ABERTO`, `ENCERRADO`…); comparação tolerante a maiúsculas. */
  eventoStatusDbAberto(ev: { status?: string } | null | undefined): boolean {
    return String(ev?.status ?? '').toUpperCase().trim() === 'ABERTO';
  }

  ngOnInit() {
    const u = localStorage.getItem('currentUser');
    this.currentUser = u ? JSON.parse(u) : {};
    this.carregar();
  }

  carregar() {
    this.loading = true;
    this.eventoRhService.listEventos().subscribe({
      next: (res) => {
        this.eventos = res.eventos || [];
        this.bloqueioAtivo = res.bloqueio_ativo ?? null;
        this.atualizarListaExibicao();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        Swal.fire('Erro', 'Não foi possível carregar os eventos do WT Pass.', 'error');
      },
    });
  }

  atualizarListaExibicao() {
    const base = Array.isArray(this.eventos) ? this.eventos : [];
    const agora = Date.now();
    let filtrados = base
      .filter((ev) => {
        if (!this.somenteDisponiveis) return true;

        // Mesma ideia do "🏆 BID vencido" no Dashboard: quem garantiu vaga ou teve presença confirmada.
        if (this.ganhouVagaWtPass(ev)) return true;

        // Sempre manter visível o evento já inscrito para permitir cancelamento.
        if (ev.usuario_inscrito) return true;

        // Só retira da lista «disponíveis» quem já encerrou participação **após**
        // o dia do evento (evita esconder evento «fechado»/ENCERRADO quando ainda
        // há falta ou presença registada antes do dia correto).
        if (ev.meu_status === 'PRESENTE' || ev.meu_status === 'FALTOU') {
          if (!this.eventoDiaCalendarioAindaVigente(ev)) return false;
        }

        // Eventos bloqueados (penalidade ativa ou vinculados a uma penalidade
        // anterior) permanecem visíveis: o card exibe badge e botão "Bloqueado"
        // para deixar claro ao usuário que o evento existe mas está fora do
        // alcance de inscrição.
        if (this.bloqueadoParaUsuario(ev)) return true;

        // Mantém o card enquanto o **dia** do evento no calendário local não
        // terminou, mesmo com status na BD diferente de ABERTO (ex.: ENCERRADO).
        if (this.eventoDiaCalendarioAindaVigente(ev)) {
          const st = String(ev?.status ?? ev?.evento_status ?? '')
            .toUpperCase()
            .trim();
          if (st === 'CANCELADO') return false;
          return true;
        }

        return false;
      })
      .filter((ev) => {
        if (this.filtroStatus === 'ABERTOS') return this.eventoStatusDbAberto(ev);
        if (this.filtroStatus === 'EM_BREVE') {
          const ini = ev.data_inicio_inscricao ? new Date(ev.data_inicio_inscricao).getTime() : 0;
          return this.eventoStatusDbAberto(ev) && !!ini && agora < ini - 60_000;
        }
        if (this.filtroStatus === 'LISTA_ESPERA') {
          const vagas = Number(ev.vagas) || 0;
          const ini = Number(ev.ocupadas_inscrito ?? 0);
          return vagas > 0 && ini >= vagas;
        }
        if (this.filtroStatus === 'ENCERRADOS') return !this.eventoStatusDbAberto(ev);
        return true;
      })
      .filter((ev) => {
        const q = this.busca.trim().toLowerCase();
        if (!q) return true;
        return (
          String(ev.titulo || '').toLowerCase().includes(q) ||
          String(ev.subtitulo || '').toLowerCase().includes(q) ||
          String(ev.local || '').toLowerCase().includes(q)
        );
      });

    filtrados = [...filtrados].sort((a, b) => this.compararPorDataEventoDepoisTitulo(a, b));

    this.eventosExibicao = filtrados;
  }

  /**
   * Ordem crescente por data do evento (não prioriza vaga confirmada — isso quebrava o calendário).
   * Sem data válida vai para o fim; mesmo dia desempata pelo título.
   */
  private compararPorDataEventoDepoisTitulo(a: any, b: any): number {
    const ta = this.dataEventoMs(a);
    const tb = this.dataEventoMs(b);
    if (ta == null && tb == null) {
      /* fall through to titulo */
    } else if (ta == null) return 1;
    else if (tb == null) return -1;
    else if (ta !== tb) return ta - tb;
    return String(a?.titulo || '')
      .localeCompare(String(b?.titulo || ''), 'pt', { sensitivity: 'base' });
  }

  private dataEventoMs(ev: any): number | null {
    const raw = ev?.data_evento;
    if (raw == null || String(raw).trim() === '') return null;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  /**
   * O dia do evento no calendário local ainda não acabou (até 23:59:59 local).
   * Evita que `data_evento` em UTC meia-noite some o cartão durante o dia do
   * evento no Brasil e alinha a lista «Disponíveis» ao critério «por data do evento».
   */
  eventoDiaCalendarioAindaVigente(ev: any): boolean {
    const raw = ev?.data_evento;
    if (raw == null || String(raw).trim() === '') return false;
    const d = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);
    if (Number.isNaN(d.getTime())) return false;
    const fim = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    return fim >= Date.now();
  }

  aplicarFiltroDisponiveis() {
    this.exibirListaEventos = true;
    this.somenteDisponiveis = true;
    this.busca = '';
    this.filtroStatus = 'TODOS';
    this.atualizarListaExibicao();
  }

  limparFiltroDisponiveis() {
    this.somenteDisponiveis = false;
    this.busca = '';
    this.filtroStatus = 'TODOS';
    this.atualizarListaExibicao();
  }

  voltarParaCards() {
    this.exibirListaEventos = false;
    this.limparFiltroDisponiveis();
  }

  /**
   * Alinhado ao destaque "🏆 BID vencido" no Dashboard: vaga obtida (inscrito) ou presença confirmada.
   */
  ganhouVagaWtPass(ev: { meu_status?: string }): boolean {
    return ev?.meu_status === 'INSCRITO' || ev?.meu_status === 'PRESENTE';
  }

  participacaoFinalizada(ev: { meu_status?: string }): boolean {
    return ev?.meu_status === 'PRESENTE' || ev?.meu_status === 'FALTOU';
  }

  participouDoEvento(ev: { meu_status?: string }): boolean {
    const s = ev?.meu_status;
    if (!s) return false;
    return ['INSCRITO', 'FILA_ESPERA', 'PRESENTE', 'FALTOU', 'CANCELADO'].includes(s);
  }

  chipClass(tipo: 'TODOS' | 'ABERTOS' | 'EM_BREVE' | 'LISTA_ESPERA' | 'ENCERRADOS'): string {
    const ativo = this.filtroStatus === tipo;
    return ativo
      ? 'rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide bg-indigo-600 text-white border border-indigo-600'
      : 'rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide bg-[var(--color-bg-surface)] hover:bg-[var(--app-nav-hover-bg)] border border-[var(--app-border)] text-[var(--app-text-muted)] transition-colors';
  }

  /** Chips da fila de estado: largura igual em desktop; em ecrã estreito, duas colunas. */
  chipRowChipClass(tipo: 'TODOS' | 'ABERTOS' | 'EM_BREVE' | 'LISTA_ESPERA' | 'ENCERRADOS'): string {
    const layout =
      'flex-1 basis-0 min-w-[calc(50%-0.25rem)] sm:min-w-0 text-center whitespace-normal sm:whitespace-nowrap leading-tight';
    return `${this.chipClass(tipo)} ${layout}`;
  }

  /**
   * Estado visível do evento na lista de inscrição.
   * Considera tanto o status BD quanto a janela de inscrições — se o admin
   * encerrou as inscrições (data passada ou encerramento antecipado), o
   * badge passa para "Fechado" mesmo com status BD ainda ABERTO.
   */
  statusBadge(ev: any): string {
    const agora = Date.now();
    const ini = ev?.data_inicio_inscricao ? new Date(ev.data_inicio_inscricao).getTime() : 0;
    const lim = ev?.data_limite_inscricao ? new Date(ev.data_limite_inscricao).getTime() : 0;
    const st = String(ev?.status ?? ev?.evento_status ?? '')
      .toUpperCase()
      .trim();
    if (st !== 'ABERTO') return 'Fechado';
    if (ini && agora < ini - 60_000) return 'Em Breve';
    if (lim && agora > lim + 60_000) return 'Fechado';
    return 'Aberto';
  }

  getBannerUrl(ev: { banner?: string | null; id?: number }): string {
    if (!ev?.banner) return 'assets/placeholder.jpg';
    if (String(ev.banner).startsWith('http')) return ev.banner;
    return uploadsPublicUrl(ev.banner);
  }

  formatarDataWtPass = formatarDataWtPass;
  formatarDataHoraWtPass = formatarDataHoraWtPass;

  /**
   * Texto de contagem do bloqueio no cartão:
   * — com vínculo em `alvos`: `eventos_total/ordem` por data (ex.: 3/1, 3/2) + «restam X» se o bloqueio estiver ativo;
   * — senão: `total/restantes` global ou do registo expirado.
   */
  private textoContagemBloqueioParaCard(ev: any): string | null {
    const ordem = Number(ev?.wt_pass_bloqueio_ordem_alvo);
    const temOrdem = Number.isFinite(ordem) && ordem > 0;

    let total = 0;
    let rest = 0;
    if (this.bloqueioAtivo) {
      total = this.bloqueioTotal;
      rest = Number(this.bloqueioAtivo.eventos_restantes);
    } else {
      total = Number(ev?.wt_pass_bloqueio_eventos_total) || 0;
      rest = Number(ev?.wt_pass_bloqueio_eventos_restantes);
    }
    const totalOk = total > 0;
    const restOk = Number.isFinite(rest);

    if (temOrdem && totalOk) {
      let s = `${total}/${ordem}`;
      if (this.bloqueioAtivo && restOk) {
        s += ` · restam ${rest}`;
      } else if (!this.bloqueioAtivo && restOk && rest > 0) {
        s += ` · restam ${rest}`;
      }
      return s;
    }
    if (totalOk && restOk) return `${total}/${rest}`;
    if (totalOk) return `${total}/0`;
    return null;
  }

  /** Colaborador registado como ausente neste evento (origem da penalidade). */
  faltouNesteEvento(ev: { meu_status?: string | null }): boolean {
    return String(ev?.meu_status ?? '').toUpperCase().trim() === 'FALTOU';
  }

  /** Cartão «Situação» — período de inscrições igual ao badge «Aberto». */
  labelSituacaoWtCard(ev: any): string {
    if (this.faltouNesteEvento(ev)) {
      return 'Faltou ao evento';
    }
    if (this.bloqueadoPenalidadeNoEvento(ev)) {
      const titulo =
        this.bloqueioAtivo?.evento_origem_titulo ??
        ev?.wt_pass_evento_origem_bloqueio_titulo ??
        '—';
      let msg = `Bloqueado devido a falta no evento ${titulo}`;
      const cont = this.textoContagemBloqueioParaCard(ev);
      if (cont) msg += ` (${cont})`;
      return msg;
    }
    return rotuloSituacaoInscricaoWtPass(ev, 'Sem inscrição', this.statusBadge(ev) === 'Aberto');
  }

  situacaoWtCardCancelada(ev: { meu_status?: string | null }): boolean {
    return String(ev?.meu_status ?? '')
      .toUpperCase()
      .trim() === 'CANCELADO';
  }

  /** Selo sobre o banner só na vista «disponíveis para si». */
  seloDestaqueListaDisponiveis(ev: any): ReturnType<typeof seloDestaqueWtPass> {
    if (!this.somenteDisponiveis) return null;
    return seloDestaqueWtPass(ev, this.statusBadge(ev) === 'Aberto');
  }

  podeInscrever(ev: any): boolean {
    if (this.participacaoFinalizada(ev)) return false;
    if (!this.eventoStatusDbAberto(ev)) return false;
    if (this.bloqueioAtivo) return false;
    if (ev.bloqueado_para_mim) return false;
    if (ev.usuario_inscrito) return false;
    // Só permite inscrever quando a janela de inscrições está efetivamente aberta.
    return this.statusBadge(ev) === 'Aberto';
  }

  /**
   * Evento bloqueado especificamente para este usuário — seja por estar
   * vinculado a uma penalidade anterior (`bloqueado_para_mim`) ou por o
   * usuário estar com penalidade ativa em curso. Não considera eventos onde
   * o usuário já está inscrito (esses mantém a opção de cancelar).
   */
  bloqueadoParaUsuario(ev: any): boolean {
    if (ev?.usuario_inscrito) return false;
    if (ev?.bloqueado_para_mim) return true;
    if (this.bloqueioAtivo) return true;
    return false;
  }

  /**
   * Penalidade aplicada a este evento (`bloqueios_eventos_rh_alvos`).
   * Só nestes cartões se usa a mensagem «Bloqueado devido a falta…» e o layout rosa expandido;
   * `bloqueioAtivo` sozinho bloqueia inscrições em geral sem marcar cada card como penalidade.
   */
  bloqueadoPenalidadeNoEvento(ev: any): boolean {
    if (ev?.usuario_inscrito) return false;
    return Boolean(ev?.bloqueado_para_mim);
  }

  /**
   * Início do dia civil do evento no fuso local (alinha à data mostrada em «DATA DO EVENTO»).
   * Evita usar o instante ISO/UTC cru, que adiantava o fim do cancelamento ~24h.
   */
  private inicioDiaDataEventoLocalMs(ev: any): number | null {
    const raw = ev?.data_evento;
    if (raw == null || String(raw).trim() === '') return null;
    const iso = String(raw).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const da = Number(m[3]);
      return new Date(y, mo, da).getTime();
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  podeCancelar(ev: any): boolean {
    if (!eventoStatusPermiteCancelarInscricaoWtPass(ev)) return false;
    if (!ev.usuario_inscrito) return false;
    // Até 24h antes do início do dia do evento (calendário local), mesmo com
    // inscrições já encerradas (status ENCERRADO ou período expirado) — alinhado ao backend.
    const inicioDia = this.inicioDiaDataEventoLocalMs(ev);
    if (inicioDia != null) {
      const limiteCancelamentoMs = inicioDia - 24 * 60 * 60 * 1000;
      if (Date.now() > limiteCancelamentoMs) return false;
    }
    return true;
  }

  abrirModalInscricao(ev: any) {
    const policyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/politica-acesso-wt-pass`;
    Swal.fire({
      title: `Inscrição: ${ev.titulo || 'Evento'}`,
      html: `
        <p class="text-left text-sm mb-3 text-slate-600">Confirme que leu a política de acesso WT Pass antes de se inscrever.</p>
        <p class="text-left text-sm mb-3">
          <a href="${policyUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 font-bold underline">Abrir Política de Acesso WT Pass</a>
        </p>
        <label class="flex items-start gap-2 text-left text-sm cursor-pointer">
          <input type="checkbox" id="rh-aceite-politica" class="mt-1 rounded border-slate-300" />
          <span>Li e aceito a política de acesso WT Pass e as condições de participação.</span>
        </label>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar inscrição',
      cancelButtonText: 'Voltar',
      focusConfirm: false,
      preConfirm: () => {
        const el = document.getElementById('rh-aceite-politica') as HTMLInputElement | null;
        if (!el?.checked) {
          Swal.showValidationMessage('É obrigatório aceitar a política de acesso WT Pass.');
          return false;
        }
        return true;
      },
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.eventoRhService.inscrever(Number(ev.id), true).subscribe({
        next: (msg) => {
          Swal.fire('Sucesso', msg.message || 'Inscrição registada.', 'success');
          this.carregar();
        },
        error: (err) => {
          Swal.fire('Não foi possível inscrever', err.error?.error || 'Erro', 'error');
        },
      });
    });
  }

  cancelar(ev: any) {
    Swal.fire({
      title: 'Cancelar inscrição?',
      text: 'Pode voltar a inscrever-se se ainda houver vagas ou lista de espera.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Não',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.eventoRhService.cancelarInscricao(Number(ev.id)).subscribe({
        next: () => {
          Swal.fire('Feito', 'Inscrição cancelada.', 'success');
          this.carregar();
        },
        error: (err) => Swal.fire('Erro', err.error?.error || 'Falha ao cancelar.', 'error'),
      });
    });
  }
}

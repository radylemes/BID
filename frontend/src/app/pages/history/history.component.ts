import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div class="max-w-full mx-auto">
        <div class="mb-8">
          <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span class="text-4xl">🏛️</span> Hall da Fama e Histórico
          </h1>
          <p class="text-gray-500 font-medium text-sm mt-1">
            Veja como foram os BIDs passados, estatísticas de pontos e os grandes vencedores.
          </p>
        </div>

        <div *ngIf="loading" class="flex justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>

        <div
          *ngIf="!loading && history.length === 0"
          class="text-center py-20 bg-white rounded-[2rem] shadow-sm border border-gray-100"
        >
          <span class="text-5xl block mb-3 grayscale opacity-30">📭</span>
          <h3 class="text-gray-500 font-bold uppercase tracking-widest text-sm">
            Nenhum BID finalizado ainda.
          </h3>
        </div>

        <div class="flex flex-col gap-6 pb-10">
          <div
            *ngFor="let match of history"
            class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-md"
          >
            <div class="relative h-48 md:h-auto md:w-1/3 lg:w-1/4 bg-gray-900 shrink-0">
              <img
                [src]="getFotoUrl(match.banner)"
                (error)="
                  $any($event.target).src = 'https://placehold.co/800x400?text=Evento+Encerrado'
                "
                class="w-full h-full object-cover opacity-60 grayscale transition-opacity hover:grayscale-0"
              />
              <div
                class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-gray-900/90 to-transparent"
              ></div>

              <div class="absolute bottom-4 left-4 right-4">
                <span
                  class="bg-gray-800/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-2 inline-block border border-gray-600"
                >
                  Encerrado em {{ match.data_jogo | date: 'dd/MM/yyyy' }}
                </span>
                <h3 class="text-2xl font-black text-white leading-tight drop-shadow-md">
                  {{ match.titulo }}
                </h3>
              </div>
            </div>

            <div class="p-5 md:p-8 flex-1 flex flex-col justify-center gap-6">
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  class="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center"
                >
                  <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest"
                    >Apostado</span
                  >
                  <span class="text-2xl font-black text-indigo-700 leading-none mt-1">
                    {{ match.stats.total_pontos }}
                    <span class="text-[10px] text-indigo-400">pts</span>
                  </span>
                </div>

                <div
                  class="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center"
                >
                  <span class="text-[10px] font-black text-amber-400 uppercase tracking-widest"
                    >Média / Lance</span
                  >
                  <span class="text-2xl font-black text-amber-600 leading-none mt-1">
                    {{ match.stats.media_pontos }}
                    <span class="text-[10px] text-amber-400">pts</span>
                  </span>
                </div>

                <div
                  class="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center"
                >
                  <span class="text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                    >Participantes</span
                  >
                  <span class="text-2xl font-black text-emerald-600 leading-none mt-1">
                    {{ match.stats.total_participantes }}
                    <span class="text-[10px] text-emerald-400">pessoas</span>
                  </span>
                </div>

                <div
                  class="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center"
                >
                  <span class="text-[10px] font-black text-rose-400 uppercase tracking-widest"
                    >Nota de Corte</span
                  >
                  <span class="text-2xl font-black text-rose-600 leading-none mt-1">
                    {{ match.nota_corte }} <span class="text-[10px] text-rose-400">pts</span>
                  </span>
                </div>
              </div>
            </div>

            <div
              class="p-6 md:p-8 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col items-center justify-center shrink-0 bg-gray-50 md:w-64"
            >
              <div class="text-center mb-4">
                <span class="text-4xl block mb-2">🏆</span>
                <h4 class="text-xs font-black text-gray-500 uppercase tracking-widest">
                  {{ match.quantidade_premios }} Ingressos
                </h4>
                <p class="text-[10px] text-gray-400 font-medium">Distribuídos</p>
              </div>

              <button
                (click)="abrirModalGanhadores(match)"
                class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95 uppercase tracking-wide"
              >
                Ver Ganhadores
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HistoryComponent implements OnInit {
  history: any[] = [];
  loading = true;

  // 1. INJEÇÃO DO ChangeDetectorRef ADICIONADA AQUI:
  constructor(
    private matchService: MatchService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarHistorico();
  }

  carregarHistorico() {
    this.matchService.getPublicHistory().subscribe({
      next: (data) => {
        this.history = data
          .map((match) => {
            const nota_corte =
              match.winners && match.winners.length > 0
                ? match.winners[match.winners.length - 1].valor
                : 0;

            return {
              ...match,
              nota_corte,
            };
          })
          .sort((a, b) => new Date(b.data_jogo).getTime() - new Date(a.data_jogo).getTime());

        this.loading = false;
        // 2. FORÇANDO A TELA A ATUALIZAR IMEDIATAMENTE AQUI:
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar histórico:', err);
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  getFotoUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    return `http://localhost:3005/${cleanPath}`;
  }

  abrirModalGanhadores(match: any) {
    if (!match.winners || match.winners.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sem ganhadores',
        text: 'Ninguém ganhou ingressos neste evento.',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    const winnersHtml = match.winners
      .map((winner: any, i: number) => {
        const isFirst = i === 0;
        const initial = winner.nome.charAt(0).toUpperCase();
        const medal = isFirst ? '<span class="text-amber-500 mr-1 text-lg">🥇</span>' : '';
        const avatarBorder = isFirst
          ? 'border-amber-400 bg-amber-50 text-amber-600'
          : 'border-gray-200 bg-gray-100 text-gray-500';

        return `
        <div class="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm mb-2 hover:border-indigo-200 transition-colors">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-6 shrink-0 text-center">
              <span class="text-sm font-black text-gray-300">${i + 1}º</span>
            </div>
            <div class="w-10 h-10 rounded-full shrink-0 border-2 flex items-center justify-center overflow-hidden font-black text-sm ${avatarBorder}">
               ${initial}
            </div>
            <div class="text-left truncate">
              <p class="text-sm font-black text-gray-800 truncate flex items-center">
                ${medal} ${winner.nome}
              </p>
            </div>
          </div>
          <div class="shrink-0 pl-3">
            <span class="bg-emerald-50 text-emerald-700 font-black text-[11px] px-2.5 py-1.5 rounded-lg border border-emerald-100">
              ${winner.valor} pts
            </span>
          </div>
        </div>
      `;
      })
      .join('');

    Swal.fire({
      title: `<h3 class="text-2xl font-black text-gray-800 tracking-tight">Ganhadores</h3>`,
      html: `
        <p class="text-xs text-gray-500 font-medium mb-4 uppercase tracking-widest">${match.titulo}</p>
        <div class="max-h-80 overflow-y-auto custom-scrollbar p-1 bg-gray-50 rounded-xl border border-gray-100">
          ${winnersHtml}
        </div>
      `,
      width: '500px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-[2rem] p-4',
        closeButton: 'focus:outline-none',
      },
    });
  }
}

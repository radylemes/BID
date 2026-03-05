import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchService } from '../../services/match.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

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
                [src]="getBannerUrl(match)"
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
                  class="bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-sm mb-2 inline-block"
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
                Ver apostas
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
    if (!path || path === 'db') return '';
    if (path.startsWith('http')) return path;
    const base = environment.apiUri.replace(/\/api\/?$/, '');
    let cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `${base}/${cleanPath}`;
  }

  getBannerUrl(match: { banner?: string; id?: number }): string {
    if (!match?.banner) return '';
    if (match.banner === 'db' && match.id) return `${environment.apiUri}/matches/${match.id}/banner`;
    return this.getFotoUrl(match.banner);
  }

  getAvatarUrl(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    return this.getFotoUrl(user.foto);
  }

  abrirModalGanhadores(match: any) {
    const apostas = match.apostas && match.apostas.length > 0 ? match.apostas : (match.winners || []);
    if (!apostas || apostas.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sem apostas',
        text: 'Não há apostas registradas para este evento.',
        confirmButtonColor: '#4f46e5',
      });
      return;
    }

    let posGanhador = 0;
    const apostasHtml = apostas
      .map((item: any, i: number) => {
        const isGanhou = item.status === 'GANHOU' || !item.status; // sem status = lista antiga só de ganhadores
        if (isGanhou) posGanhador += 1;
        const isFirst = isGanhou && posGanhador === 1;
        const initial = (item.nome || '?').charAt(0).toUpperCase();
        const medal = isFirst ? '<span class="text-amber-500 mr-1 text-lg">🥇</span>' : '';
        const avatarBorder = isGanhou
          ? (isFirst ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-emerald-300 bg-emerald-50 text-emerald-600')
          : 'border-gray-200 bg-gray-100 text-gray-500';
        const id = item.id;
        const fotoUrl = item.foto ? (item.foto === 'db' && id ? `${environment.apiUri}/users/${id}/avatar` : this.getFotoUrl(item.foto)) : '';
        const avatarHtml = item.foto
          ? `<img src="${fotoUrl}" alt="" class="w-10 h-10 rounded-full object-cover border-2 shrink-0 ${avatarBorder}" />`
          : `<span class="w-10 h-10 rounded-full shrink-0 border-2 flex items-center justify-center overflow-hidden font-black text-sm ${avatarBorder}">${initial}</span>`;
        const badgeGanhou = isGanhou
          ? '<span class="bg-emerald-100 text-emerald-700 font-black text-[10px] px-2 py-0.5 rounded-md border border-emerald-200 ml-1">Ganhou</span>'
          : '';

        return `
        <div class="flex items-center justify-between bg-white p-3 rounded-xl border mb-2 transition-colors ${isGanhou ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300' : 'border-gray-100 hover:border-gray-200'}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-6 shrink-0 text-center">
              <span class="text-sm font-black text-gray-300">${i + 1}º</span>
            </div>
            <div class="flex items-center justify-center overflow-hidden">
              ${avatarHtml}
            </div>
            <div class="text-left truncate">
              <p class="text-sm font-black text-gray-800 truncate flex items-center flex-wrap gap-1">
                ${medal} ${item.nome} ${badgeGanhou}
              </p>
            </div>
          </div>
          <div class="shrink-0 pl-3 flex items-center gap-2">
            <span class="${isGanhou ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-600 border-gray-200'} font-black text-[11px] px-2.5 py-1.5 rounded-lg border">
              ${item.valor} pts
            </span>
          </div>
        </div>
      `;
      })
      .join('');

    const dataEncerrado = match.data_jogo
      ? new Date(match.data_jogo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    const stats = match.stats || {};
    const totalPontos = stats.total_pontos ?? 0;
    const mediaPontos = stats.media_pontos ?? 0;
    const totalParticipantes = stats.total_participantes ?? 0;
    const notaCorte = match.nota_corte ?? 0;

    const bannerUrl = this.getBannerUrl(match);
    const placeholderImg = 'https://placehold.co/800x200?text=Evento+Encerrado';
    const localEvento = match.local ? String(match.local).trim() : '';
    const setorEvento = match.setor_evento_nome ? String(match.setor_evento_nome).trim() : '';
    const qtdIngressos = match.quantidade_premios ?? 0;

    const eventoInfoHtml = `
      <div class="flex gap-6 mb-5 pb-5 border-b border-gray-100">
        <div class="shrink-0 w-36 h-28 rounded-2xl overflow-hidden bg-gray-100 border-2 border-amber-200/60 shadow-md">
          <img src="${bannerUrl || placeholderImg}" alt="" class="w-full h-full object-cover" onerror="this.src='${placeholderImg}'" />
        </div>
        <div class="min-w-0 flex-1 flex flex-col justify-center">
          <h4 class="text-lg font-black text-gray-800 mb-3 break-words">${match.titulo || 'Evento'}</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            ${dataEncerrado ? `<p class="text-gray-600 font-medium">📅 ${dataEncerrado}</p>` : ''}
            ${localEvento ? `<p class="text-gray-600">📍 ${localEvento}</p>` : ''}
            ${setorEvento ? `<p class="text-gray-600">🏷️ ${setorEvento}</p>` : ''}
            <p class="text-indigo-600 font-semibold">🎫 ${qtdIngressos} ingresso${qtdIngressos !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    `;

    const statsCardsHtml = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div class="bg-indigo-50/80 border border-indigo-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Apostado</span>
          <span class="text-xl font-black text-indigo-700 leading-none mt-1">${totalPontos}<span class="text-[10px] text-indigo-400"> pts</span></span>
        </div>
        <div class="bg-amber-50/80 border border-amber-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <span class="text-[10px] font-black text-amber-400 uppercase tracking-widest">Média / Lance</span>
          <span class="text-xl font-black text-amber-600 leading-none mt-1">${mediaPontos}<span class="text-[10px] text-amber-400"> pts</span></span>
        </div>
        <div class="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <span class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Participantes</span>
          <span class="text-xl font-black text-emerald-600 leading-none mt-1">${totalParticipantes}<span class="text-[10px] text-emerald-400"> pessoas</span></span>
        </div>
        <div class="bg-rose-50/80 border border-rose-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
          <span class="text-[10px] font-black text-rose-400 uppercase tracking-widest">Nota de Corte</span>
          <span class="text-xl font-black text-rose-600 leading-none mt-1">${notaCorte}<span class="text-[10px] text-rose-400"> pts</span></span>
        </div>
      </div>
    `;

    Swal.fire({
      title: `<h3 class="text-2xl font-black text-gray-800 tracking-tight">Apostas e ganhadores</h3>`,
      html: `
        ${eventoInfoHtml}
        ${statsCardsHtml}
        <p class="text-[10px] text-gray-500 font-medium mb-2 uppercase tracking-widest">Lista de apostas</p>
        <div class="max-h-80 overflow-y-auto custom-scrollbar p-1 bg-gray-50 rounded-xl border border-gray-100">
          ${apostasHtml}
        </div>
      `,
      width: '720px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-[2rem] p-4',
        closeButton: 'focus:outline-none',
      },
    });
  }
}

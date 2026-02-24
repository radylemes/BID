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
import { HttpClient } from '@angular/common/http';
import { forkJoin, interval, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100 pb-10 font-sans">
      <header
        class="bg-indigo-900 text-white p-4 shadow-md sticky top-0 z-30 flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <span class="text-3xl">📱</span>
          <div>
            <h1 class="text-xl font-black tracking-tight leading-none">Concierge BID</h1>
            <p class="text-[10px] text-indigo-200 uppercase tracking-widest mt-0.5">
              Gestão de Portaria e Acessos
            </p>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button
            (click)="carregarTudoUnificado()"
            class="text-indigo-200 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-colors bg-indigo-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-600 active:scale-95"
            title="Sincronizar dados agora"
          >
            <span class="text-base leading-none">↻</span>
            <span class="hidden md:inline">Sincronizar</span>
          </button>

          <span
            class="text-xs font-bold text-indigo-200 hidden md:block border-l border-indigo-700 pl-4"
          >
            {{ events.length }} Evento(s) Ativos
          </span>
          <div
            class="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center font-bold border border-indigo-500 shadow-inner"
          >
            PT
          </div>
        </div>
      </header>

      <main class="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div
          *ngIf="!loading && allGuests.length > 0"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-200"
        >
          <h3
            class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"
          >
            <span>🏢</span> Resumo por Empresa
          </h3>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              *ngFor="let emp of estatisticasEmpresas"
              class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div
                class="font-black text-indigo-900 text-xs uppercase mb-1 truncate"
                title="{{ emp.nome }}"
              >
                {{ emp.nome }}
              </div>
              <div class="text-[10px] font-bold text-gray-500 mb-2">
                🎟️ {{ emp.total }} Ingressos
              </div>
              <div
                class="flex items-center justify-between text-[10px] font-bold border-t border-gray-200/60 pt-2"
              >
                <span
                  class="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded shadow-sm border border-emerald-100"
                  >✅ {{ emp.liberados }} Retirou</span
                >
                <span
                  class="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shadow-sm border border-amber-100"
                  >⏳ {{ emp.pendentes }} Aguardando</span
                >
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white p-3 md:p-4 rounded-2xl shadow-md border border-gray-200 flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-[72px] z-20"
        >
          <div class="relative w-full lg:w-1/3">
            <span class="absolute left-4 top-3.5 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar Nome, CPF, Empresa..."
              class="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold outline-none transition-all shadow-inner"
            />
          </div>

          <div
            *ngIf="!loading && allGuests.length > 0"
            class="flex flex-wrap items-center justify-center lg:justify-end gap-2 w-full lg:w-auto"
          >
            <div
              class="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl"
              title="Total de Ingressos"
            >
              <span class="text-xl leading-none">🎟️</span>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-indigo-400"
                  >Total Ingressos</span
                >
                <span class="text-lg font-black text-indigo-700 leading-none">{{
                  totalConvidados
                }}</span>
              </div>
            </div>
            <div
              class="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl"
            >
              <span class="text-xl leading-none">✅</span>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-emerald-500"
                  >Já Entraram</span
                >
                <span class="text-lg font-black text-emerald-600 leading-none">{{
                  totalLiberados
                }}</span>
              </div>
            </div>
            <div
              class="flex items-center gap-2.5 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl"
            >
              <span class="text-xl leading-none">⏳</span>
              <div class="flex flex-col">
                <span class="text-[9px] font-black uppercase tracking-widest text-amber-500"
                  >Faltam Chegar</span
                >
                <span class="text-lg font-black text-amber-600 leading-none">{{
                  totalPendentes
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="text-center py-20">
          <div
            class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">
            Carregando e agrupando listas...
          </p>
        </div>

        <div
          *ngIf="!loading && allGuests.length > 0"
          class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div class="overflow-x-auto custom-scrollbar">
            <table class="min-w-full text-left text-sm whitespace-nowrap">
              <thead
                class="bg-indigo-50/50 text-indigo-900 uppercase font-black text-[10px] tracking-wider border-b border-gray-200"
              >
                <tr>
                  <th class="px-6 py-4">Usuário (Titular)</th>
                  <th class="px-6 py-4">Empresa</th>
                  <th class="px-6 py-4">Convidado (Retirante)</th>
                  <th class="px-6 py-4">Evento / Data</th>
                  <th class="px-6 py-4 text-center">Status Ingressos</th>
                  <th class="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr
                  *ngFor="let group of filteredGroupedGuests()"
                  class="hover:bg-gray-50 transition-colors group"
                >
                  <td class="px-6 py-4 font-bold text-gray-700">{{ group.titular_nome }}</td>

                  <td class="px-6 py-4">
                    <div
                      class="inline-block max-w-[130px] truncate align-middle bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded text-[10px] font-black tracking-wider uppercase border border-indigo-200 cursor-help"
                      title="{{ group.empresa }}"
                    >
                      {{ group.empresa }}
                    </div>
                  </td>

                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs"
                        [ngClass]="
                          group.checkin
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-gray-200 text-gray-600'
                        "
                      >
                        {{ group.checkin ? '✓' : group.retirante_nome.charAt(0) }}
                      </div>
                      <div>
                        <div class="font-black text-gray-900 text-sm flex items-center gap-2">
                          {{ group.retirante_nome }}
                          <span
                            *ngIf="group.quantidade_ingressos > 1"
                            class="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md border border-indigo-200 shadow-sm"
                          >
                            🎟️ {{ group.quantidade_ingressos }} Ingressos
                          </span>
                        </div>
                        <div class="text-[10px] text-gray-400 font-mono mt-0.5">
                          CPF: {{ group.retirante_cpf }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="font-bold text-gray-800 text-xs">{{ group.evento_titulo }}</div>
                    <div
                      class="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5"
                    >
                      <span>📅</span> {{ group.data_evento | date: 'dd/MM/yyyy HH:mm' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <span
                      *ngIf="group.checkin"
                      class="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center justify-center gap-1 w-max mx-auto"
                    >
                      <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Liberado ({{
                        group.ingressos_liberados
                      }}/{{ group.quantidade_ingressos }})
                    </span>
                    <span
                      *ngIf="!group.checkin"
                      class="bg-amber-50 text-amber-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100 flex items-center justify-center gap-1 w-max mx-auto"
                    >
                      <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span> Pendente ({{
                        group.quantidade_ingressos - group.ingressos_liberados
                      }})
                    </span>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <button
                      *ngIf="!group.checkin"
                      (click)="abrirAssinatura(group)"
                      class="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>✍️</span> Iniciar Liberação
                    </button>
                    <button
                      *ngIf="group.checkin"
                      (click)="verAssinatura(group.assinatura)"
                      class="w-full text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>👁️</span> Ver Assinatura
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div
        *ngIf="showSignatureModal"
        class="fixed inset-0 bg-gray-900/90 z-50 flex flex-col items-center justify-center p-2 touch-none backdrop-blur-sm"
      >
        <div
          class="bg-white w-full max-w-lg rounded-2xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]"
        >
          <div class="p-4 bg-indigo-50 border-b border-indigo-100 text-center relative shrink-0">
            <h3 class="font-black text-indigo-900 text-lg uppercase tracking-tight">
              Identificação na Portaria
            </h3>
            <p class="text-xs text-indigo-600 mt-1 font-medium">
              Liberação de <strong>{{ ingressosParaAssinar.length }} ingresso(s)</strong>
            </p>
          </div>

          <div class="p-4 flex-1 overflow-y-auto custom-scrollbar bg-gray-50 space-y-4">
            <div class="space-y-3">
              <p
                class="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center mb-1"
              >
                Dados de quem vai entrar
              </p>

              <div
                *ngFor="let ticket of ingressosParaAssinar; let i = index"
                class="bg-white p-3 rounded-xl border border-gray-200 shadow-sm relative"
              >
                <div
                  class="absolute -top-2 -left-2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-md"
                >
                  {{ i + 1 }}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                  <div>
                    <label
                      class="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1"
                      >Nome Completo</label
                    >
                    <input
                      [(ngModel)]="ticket.recebedor_nome"
                      placeholder="Ex: João da Silva"
                      class="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
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
                      class="w-full text-sm font-bold bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:bg-white transition-colors font-mono"
                    />
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
                class="bg-white border-2 border-dashed border-indigo-300 rounded-2xl shadow-inner w-full h-40 touch-none cursor-crosshair"
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

          <div class="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
            <button
              (click)="fecharModal()"
              class="w-1/3 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-xs"
            >
              Cancelar
            </button>
            <button
              (click)="confirmarCheckinLote()"
              class="w-2/3 py-3 rounded-xl font-black text-white bg-emerald-500 shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all text-sm uppercase tracking-wide"
            >
              Liberar Entradas
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ReceptionComponent implements OnInit, OnDestroy {
  apiUrl = 'http://localhost:3005/api/reception';

  currentUser: any = {};
  loading = false;
  events: any[] = [];
  allGuests: any[] = [];
  groupedGuests: any[] = [];
  searchTerm = '';

  totalConvidados = 0;
  totalLiberados = 0;
  totalPendentes = 0;
  estatisticasEmpresas: { nome: string; total: number; liberados: number; pendentes: number }[] =
    [];

  selectedGroup: any = null;
  showSignatureModal = false;
  ingressosParaAssinar: any[] = [];

  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;
  private isDrawing = false;
  private isCanvasEmpty = true;

  // Variável para gerenciar o refresh automático
  private autoRefreshSub?: Subscription;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
  ) {}

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

    this.http.get<any[]>(`${this.apiUrl}/events/today`).subscribe({
      next: (eventsRes) => {
        this.events = Array.isArray(eventsRes) ? eventsRes : [];
        if (this.events.length === 0) {
          if (!silencioso) this.loading = false;
          this.agruparEAtualizar();
          this.cd.detectChanges();
          return;
        }

        // Variável temporária para não piscar a tela caso seja silencioso
        let novosGuests: any[] = [];
        let completedRequests = 0;

        this.events.forEach((ev) => {
          this.http.get<any[]>(`${this.apiUrl}/events/${ev.id}/guests`).subscribe({
            next: (guestsRes) => {
              const mappedGuests = (Array.isArray(guestsRes) ? guestsRes : []).map((g) => ({
                ...g,
                evento_titulo: ev.titulo,
                data_evento: ev.data_evento || ev.data_jogo,
              }));
              novosGuests = [...novosGuests, ...mappedGuests];
              completedRequests++;

              if (completedRequests === this.events.length) {
                this.allGuests = novosGuests;
                if (!silencioso) this.loading = false;
                this.agruparEAtualizar();
                this.cd.detectChanges();
              }
            },
            error: () => {
              completedRequests++;
              if (completedRequests === this.events.length) {
                this.allGuests = novosGuests;
                if (!silencioso) this.loading = false;
                this.agruparEAtualizar();
                this.cd.detectChanges();
              }
            },
          });
        });
      },
      error: () => {
        if (!silencioso) this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  agruparEAtualizar() {
    const mapaGrupos = new Map<string, any>();
    const mapaEmpresas = new Map<string, any>();

    this.totalConvidados = 0;
    this.totalLiberados = 0;
    this.totalPendentes = 0;

    this.allGuests.forEach((guest) => {
      this.totalConvidados++;
      if (guest.checkin) this.totalLiberados++;
      else this.totalPendentes++;

      const nomeEmpresa = guest.empresa || 'Geral';
      if (!mapaEmpresas.has(nomeEmpresa)) {
        mapaEmpresas.set(nomeEmpresa, { nome: nomeEmpresa, total: 0, liberados: 0, pendentes: 0 });
      }
      const stat = mapaEmpresas.get(nomeEmpresa);
      stat.total++;
      if (guest.checkin) stat.liberados++;
      else stat.pendentes++;

      const key = `${guest.retirante_cpf}-${guest.evento_titulo}`;

      const infoIngresso = {
        ingresso_id: guest.ingresso_id,
        aposta_id: guest.aposta_id,
        checkin: guest.checkin,
        recebedor_nome: guest.recebedor_nome || '',
        recebedor_cpf: guest.recebedor_cpf || '',
      };

      if (!mapaGrupos.has(key)) {
        mapaGrupos.set(key, {
          ...guest,
          ingressos_detalhes: [infoIngresso],
          quantidade_ingressos: 1,
          ingressos_liberados: guest.checkin ? 1 : 0,
        });
      } else {
        const grupo = mapaGrupos.get(key);
        grupo.ingressos_detalhes.push(infoIngresso);
        grupo.quantidade_ingressos++;
        if (guest.checkin) {
          grupo.ingressos_liberados++;
          grupo.assinatura = grupo.assinatura || guest.assinatura;
        }
        grupo.checkin = grupo.ingressos_liberados === grupo.quantidade_ingressos;
      }
    });

    this.estatisticasEmpresas = Array.from(mapaEmpresas.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome),
    );
    this.groupedGuests = Array.from(mapaGrupos.values());
  }

  filteredGroupedGuests() {
    if (!this.searchTerm) return this.groupedGuests;
    const term = this.searchTerm.toLowerCase();

    return this.groupedGuests.filter(
      (g) =>
        (g.retirante_nome && g.retirante_nome.toLowerCase().includes(term)) ||
        (g.retirante_cpf && g.retirante_cpf.includes(term)) ||
        (g.empresa && g.empresa.toLowerCase().includes(term)) ||
        (g.titular_nome && g.titular_nome.toLowerCase().includes(term)) ||
        (g.evento_titulo && g.evento_titulo.toLowerCase().includes(term)),
    );
  }

  abrirAssinatura(group: any) {
    this.selectedGroup = group;

    const ingressosPendentes = group.ingressos_detalhes.filter((t: any) => !t.checkin);

    this.ingressosParaAssinar = ingressosPendentes.map((t: any, index: number) => {
      return {
        ...t,
        recebedor_nome: index === 0 ? group.retirante_nome : '',
        recebedor_cpf: index === 0 ? group.retirante_cpf : '',
      };
    });

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
        'Por favor, preencha o Nome e o CPF de todas as pessoas que vão entrar.',
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
      return this.http.post(`${this.apiUrl}/checkin`, {
        ingressoId: ticket.ingresso_id,
        assinaturaBase64: base64Signature,
        recebedorNome: ticket.recebedor_nome,
        recebedorCpf: ticket.recebedor_cpf,
        adminId: this.currentUser.id,
      });
    });

    forkJoin(requests).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Entradas Liberadas!',
          text: `Todos os acompanhantes foram registrados.`,
          timer: 2000,
          showConfirmButton: false,
        });

        // Atualiza a base de dados local para refletir na tela
        this.allGuests.forEach((guest) => {
          const ingressoAtualizado = this.ingressosParaAssinar.find(
            (t) => t.ingresso_id === guest.ingresso_id,
          );
          if (ingressoAtualizado) {
            guest.checkin = true;
            guest.assinatura = base64Signature;
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
}

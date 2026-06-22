import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { formatarTituloPt } from '../../utils/formatar-texto';
import { isSomenteVisualizacaoPortaria } from '../../utils/portaria-prazo';
import { AuthService } from '../../services/auth.service';
import { ReceptionDatePickerComponent } from '../../components/reception-date-picker/reception-date-picker.component';

@Component({
  selector: 'app-reception-confirmed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReceptionDatePickerComponent],
  template: `
    <div class="min-h-screen bg-gray-100 pb-6 sm:pb-10 font-sans">
      <header
        class="bg-emerald-800 text-white p-3 sm:p-4 shadow-md sticky top-0 z-30 flex items-center justify-between gap-2 flex-wrap"
      >
        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <a
            routerLink="/reception"
            class="p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <span class="text-xl sm:text-2xl">←</span>
          </a>
          <div class="min-w-0">
            <h1 class="text-base sm:text-xl font-black tracking-tight leading-none truncate">
              Convidados Confirmados
            </h1>
            <p class="hidden sm:block text-[9px] sm:text-[10px] text-emerald-200 uppercase tracking-widest mt-0.5">
              Quem já entrou no evento
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 min-w-[150px] max-w-[210px]">
          <label class="text-[9px] font-black uppercase tracking-widest text-emerald-200 shrink-0">
            Dia
          </label>
          <app-reception-date-picker
            [selectedDate]="selectedDate"
            [apiUrl]="apiUrl"
            theme="emerald"
            (selectedDateChange)="onSelectDate($event)"
          />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div
            class="flex items-center gap-2 bg-emerald-700/50 px-3 py-1.5 rounded-xl border border-emerald-600"
          >
            <span class="text-lg">✅</span>
            <span class="text-sm font-black">{{ confirmedList.length }}</span>
          </div>
          <button
            type="button"
            (click)="logout()"
            class="text-rose-200 hover:text-white flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-xs font-bold transition-colors bg-emerald-900/70 hover:bg-rose-700/60 px-2 lg:px-3 py-1.5 rounded-lg border border-rose-500/50 hover:border-rose-400 active:scale-95"
            title="Sair do Sistema"
          >
            <span class="text-sm lg:text-base leading-none">🚪</span>
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div
        *ngIf="isSomenteVisualizacao()"
        class="bg-amber-50 border-b border-amber-200 px-3 py-2 text-center text-[10px] sm:text-xs font-bold text-amber-900"
      >
        Consulta histórica — exibindo convidados confirmados nesta data
      </div>

      <main class="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
        <div *ngIf="loading" class="text-center py-16">
          <div
            class="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-emerald-600 mx-auto mb-4"
          ></div>
          <p class="text-gray-500 font-bold uppercase tracking-widest text-xs">
            Carregando lista...
          </p>
        </div>

        <div
          *ngIf="!loading && events.length === 0"
          class="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200 mb-4"
        >
          <span class="text-4xl block mb-2 opacity-50">📅</span>
          <h3 class="text-gray-700 font-bold text-sm">Nenhum evento nesta data</h3>
          <p class="text-gray-500 text-xs mt-1">Não há partidas para a data selecionada.</p>
        </div>

        <div
          *ngIf="!loading && confirmedList.length === 0 && events.length > 0 && allGuests.length > 0 && totalConfirmadosDia() === 0"
          class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <span class="text-5xl block mb-3 opacity-50">📋</span>
          <h3 class="text-gray-600 font-bold text-sm sm:text-base">
            Nenhum convidado confirmado nesta data
          </h3>
          <p class="text-gray-400 text-xs sm:text-sm mt-1">
            As liberações aparecerão aqui quando forem feitas na portaria.
          </p>
          <a
            routerLink="/reception"
            class="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Ir para Portaria
          </a>
        </div>

        <div
          *ngIf="!loading && confirmedList.length === 0 && events.length > 0 && allGuests.length > 0 && totalConfirmadosDia() > 0"
          class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <span class="text-5xl block mb-3 opacity-50">📋</span>
          <h3 class="text-gray-600 font-bold text-sm sm:text-base">
            {{ mensagemListaVaziaFiltro() }}
          </h3>
          <p class="text-gray-400 text-xs sm:text-sm mt-1">
            As liberações aparecerão aqui quando forem feitas na portaria.
          </p>
          <a
            routerLink="/reception"
            class="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            Ir para Portaria
          </a>
        </div>

        <div
          *ngIf="(exibirAbasTipo || exibirAbasSetor) && !loading && allGuests.length > 0"
          class="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4"
        >
          <div
            *ngIf="exibirAbasTipo"
            class="bg-white p-2 sm:p-3 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar flex-1 min-w-0"
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
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                "
              >
                <span>{{ tipo.label }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black"
                  [ngClass]="
                    selectedTipoKey === tipo.key
                      ? tipo.key === 'WT_PASS'
                        ? 'bg-violet-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-white text-emerald-600 border border-emerald-100'
                  "
                >
                  {{ tipo.total }}
                </span>
              </button>
            </div>
          </div>

          <div
            *ngIf="exibirAbasSetor"
            class="bg-white p-2 sm:p-3 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto custom-scrollbar flex-1 min-w-0"
          >
            <div class="flex items-center gap-2 min-w-max">
              <button
                *ngFor="let setor of setoresDisponiveis"
                type="button"
                (click)="selecionarSetor(setor.key)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide whitespace-nowrap transition-all border shrink-0"
                [ngClass]="
                  selectedSetorKey === setor.key
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                "
              >
                <span>{{ setor.label }}</span>
                <span
                  class="px-1.5 py-0.5 rounded-md text-[9px] font-black"
                  [ngClass]="
                    selectedSetorKey === setor.key
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-emerald-600 border border-emerald-100'
                  "
                >
                  {{ setor.total }}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div *ngIf="!loading && confirmedList.length > 0" class="space-y-3">
          <div
            *ngFor="let group of confirmedList"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-emerald-600 bg-emerald-100 text-sm"
            >
              ✓
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-black text-gray-900 text-sm sm:text-base">
                {{ formatarTituloPt(group.retirante_nome) }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                Titular: {{ formatarTituloPt(group.titular_nome) }}
              </p>
              <p class="text-[10px] text-gray-400 font-mono mt-0.5">
                CPF {{ cpfRetiranteOuTitular(group) }}
              </p>
              <p class="text-[10px] text-gray-600 mt-0.5">
                <span class="font-black text-violet-700">{{
                  (group.tipo_convite || '').toString().toUpperCase().trim() === 'WT_PASS'
                    ? 'WT Pass'
                    : 'BID'
                }}</span>
                <span *ngIf="group.setor_evento_nome" class="text-gray-500">
                  · Setor: {{ formatarTituloPt(group.setor_evento_nome) }}</span
                >
              </p>
              <p class="text-[10px] text-indigo-600 font-semibold mt-1">
                {{ formatarTituloPt(group.evento_titulo) }} · {{ group.data_evento | date: 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-emerald-100"
              >
                Entrada confirmada
              </span>
              <span class="text-[10px] font-bold text-gray-400 hidden sm:inline">
                {{ formatarTituloPt(group.empresa) }}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class ReceptionConfirmedComponent implements OnInit {
  formatarTituloPt = formatarTituloPt;
  apiUrl = `${environment.apiUri}/reception`;
  loading = true;
  events: any[] = [];
  selectedDate = ReceptionConfirmedComponent.hojeLocalIso();

  private static readonly SETOR_TODOS = '__todos__';
  private static readonly SETOR_SEM = '__sem_setor__';
  private static readonly TIPO_TODOS = '__todos_tipo__';

  allGuests: any[] = [];
  confirmedList: any[] = [];
  selectedSetorKey = ReceptionConfirmedComponent.SETOR_TODOS;
  setoresDisponiveis: { key: string; label: string; total: number }[] = [];
  exibirAbasSetor = false;
  selectedTipoKey = ReceptionConfirmedComponent.TIPO_TODOS;
  tiposDisponiveis: { key: string; label: string; total: number }[] = [];
  exibirAbasTipo = false;

  cpfRetiranteOuTitular(g: any): string {
    const r = g?.retirante_cpf;
    const t = g?.titular_cpf;
    const rs = r != null ? String(r).trim() : '';
    if (rs && rs !== '---') return rs;
    const ts = t != null ? String(t).trim() : '';
    return ts || '---';
  }

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  logout() {
    this.authService.logout();
  }

  ngOnInit() {
    this.carregarConfirmados();
  }

  carregarConfirmados() {
    this.loading = true;
    this.confirmedList = [];
    this.allGuests = [];
    this.cd.detectChanges();

    this.http
      .get<any[]>(`${this.apiUrl}/events/today?date=${this.selectedDate}`)
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (eventsRes) => {
          const rawEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any)?.data;
          this.events = Array.isArray(rawEvents) ? rawEvents : [];
          if (this.events.length === 0) {
            this.allGuests = [];
            this.confirmedList = [];
            this.setoresDisponiveis = [];
            this.exibirAbasSetor = false;
            this.loading = false;
            this.cd.detectChanges();
            return;
          }

          const guestRequests = this.events.map((ev) => {
            const tipoEvento = String(ev.tipo_evento || 'BID').toUpperCase();
            const guestsUrl = `${this.apiUrl}/events/${ev.id}/guests?tipo=${tipoEvento === 'WT_PASS' ? 'WT_PASS' : 'BID'}`;
            return this.http.get<any[]>(guestsUrl).pipe(
              map((guestsRes) => {
                const raw = Array.isArray(guestsRes) ? guestsRes : ((guestsRes as any)?.data ?? []);
                return raw.map((g: any) => ({
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
                  evento_titulo: ev.titulo || g.evento_titulo,
                  data_evento: ev.data_evento || ev.data_jogo || g.data_evento,
                }));
              }),
              catchError(() => of([])),
            );
          });

          forkJoin(guestRequests).subscribe({
            next: (results) => {
              this.montarListaConfirmados(results.flat());
              this.loading = false;
              this.cd.detectChanges();
            },
            error: () => {
              this.allGuests = [];
              this.confirmedList = [];
              this.loading = false;
              this.cd.detectChanges();
            },
          });
        },
        error: () => {
          this.loading = false;
          this.confirmedList = [];
          this.allGuests = [];
          this.events = [];
          this.cd.detectChanges();
        },
      });
  }

  onSelectDate(date: string) {
    if (!date || date === this.selectedDate) return;
    this.selectedDate = date;
    this.carregarConfirmados();
  }

  isSomenteVisualizacao(): boolean {
    return isSomenteVisualizacaoPortaria(this.selectedDate);
  }

  private static hojeLocalIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private montarListaConfirmados(guests: any[]) {
    this.allGuests = guests || [];
    this.atualizarTiposDisponiveis();
    this.atualizarSetoresDisponiveis();
    this.atualizarListaConfirmada();
  }

  tipoKey(guest: any): 'BID' | 'WT_PASS' {
    return String(guest?.tipo_convite || 'BID').toUpperCase().trim() === 'WT_PASS' ? 'WT_PASS' : 'BID';
  }

  atualizarTiposDisponiveis() {
    let totalBid = 0;
    let totalWt = 0;
    this.allGuests.forEach((guest) => {
      if (this.tipoKey(guest) === 'WT_PASS') totalWt++;
      else totalBid++;
    });

    this.exibirAbasTipo = totalBid > 0 && totalWt > 0;

    if (this.exibirAbasTipo) {
      this.tiposDisponiveis = [
        { key: ReceptionConfirmedComponent.TIPO_TODOS, label: 'Todos', total: this.allGuests.length },
        { key: 'BID', label: 'BID', total: totalBid },
        { key: 'WT_PASS', label: 'WT Pass', total: totalWt },
      ];
    } else {
      this.tiposDisponiveis = [];
    }

    const keysValidas = new Set(this.tiposDisponiveis.map((t) => t.key));
    if (!keysValidas.has(this.selectedTipoKey)) {
      this.selectedTipoKey = ReceptionConfirmedComponent.TIPO_TODOS;
    }
  }

  guestsDoTipoAtivo(): any[] {
    if (this.selectedTipoKey === ReceptionConfirmedComponent.TIPO_TODOS || !this.exibirAbasTipo) {
      return this.allGuests;
    }
    return this.allGuests.filter((guest) => this.tipoKey(guest) === this.selectedTipoKey);
  }

  selecionarTipo(key: string) {
    if (this.selectedTipoKey === key) return;
    this.selectedTipoKey = key;
    this.atualizarSetoresDisponiveis();
    this.atualizarListaConfirmada();
    this.cd.detectChanges();
  }

  mensagemListaVaziaFiltro(): string {
    const tipo =
      this.selectedTipoKey === 'WT_PASS'
        ? 'WT Pass'
        : this.selectedTipoKey === 'BID'
          ? 'BID'
          : null;
    const setor =
      this.selectedSetorKey !== ReceptionConfirmedComponent.SETOR_TODOS && this.exibirAbasSetor
        ? this.setorLabel(this.selectedSetorKey)
        : null;
    if (tipo && setor) return `Nenhum convidado ${tipo} confirmado no setor ${setor}`;
    if (tipo) return `Nenhum convidado ${tipo} confirmado nesta data`;
    if (setor) return `Nenhum convidado confirmado no setor ${setor}`;
    return 'Nenhum convidado confirmado com os filtros selecionados';
  }

  setorKey(nome: string | null | undefined): string {
    const trimmed = nome != null ? String(nome).trim() : '';
    return trimmed ? trimmed : ReceptionConfirmedComponent.SETOR_SEM;
  }

  setorLabel(key: string): string {
    if (key === ReceptionConfirmedComponent.SETOR_SEM) return 'Sem setor';
    return formatarTituloPt(key);
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
        if (a.key === ReceptionConfirmedComponent.SETOR_SEM) return 1;
        if (b.key === ReceptionConfirmedComponent.SETOR_SEM) return -1;
        return a.label.localeCompare(b.label, 'pt');
      });

    this.exibirAbasSetor = setoresReais.length > 1;

    if (this.exibirAbasSetor) {
      this.setoresDisponiveis = [
        {
          key: ReceptionConfirmedComponent.SETOR_TODOS,
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
      this.selectedSetorKey = ReceptionConfirmedComponent.SETOR_TODOS;
    }
  }

  guestsDoSetorAtivo(): any[] {
    const base = this.guestsDoTipoAtivo();
    if (
      this.selectedSetorKey === ReceptionConfirmedComponent.SETOR_TODOS ||
      !this.exibirAbasSetor
    ) {
      return base;
    }
    return base.filter(
      (guest) => this.setorKey(guest.setor_evento_nome) === this.selectedSetorKey,
    );
  }

  selecionarSetor(key: string) {
    if (this.selectedSetorKey === key) return;
    this.selectedSetorKey = key;
    this.atualizarListaConfirmada();
    this.cd.detectChanges();
  }

  totalConfirmadosDia(): number {
    return this.allGuests.filter(
      (guest) => guest.checkin === true || guest.checkin === 1 || guest.checkin === '1',
    ).length;
  }

  private atualizarListaConfirmada() {
    const liberados = this.guestsDoSetorAtivo().filter(
      (guest) => guest.checkin === true || guest.checkin === 1 || guest.checkin === '1',
    );

    this.confirmedList = liberados.sort((a, b) => {
      const da = new Date(a.data_evento).getTime();
      const db = new Date(b.data_evento).getTime();
      if (da !== db) return db - da;
      return (a.retirante_nome || '').localeCompare(b.retirante_nome || '');
    });
  }
}

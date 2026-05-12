import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reception-confirmed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-100 pb-6 sm:pb-10 font-sans">
      <header
        class="bg-emerald-800 text-white p-3 sm:p-4 shadow-md sticky top-0 z-30 flex items-center justify-between gap-2"
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
            <p class="text-[9px] sm:text-[10px] text-emerald-200 uppercase tracking-widest mt-0.5">
              Quem já entrou no evento
            </p>
          </div>
        </div>
        <div *ngIf="events.length > 0" class="hidden sm:flex items-center gap-2 min-w-[220px] max-w-[340px]">
          <label class="text-[9px] font-black uppercase tracking-widest text-emerald-200 shrink-0">
            Evento
          </label>
          <select
            [ngModel]="selectedEventId"
            (ngModelChange)="onSelectEvent($event)"
            class="flex-1 min-w-0 bg-emerald-900/70 text-white border border-emerald-700 rounded-lg px-2.5 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option *ngFor="let ev of events" [ngValue]="ev.id">
              {{ ev.titulo }} - {{ (ev.data_evento || ev.data_jogo) | date: 'dd/MM HH:mm' }}
            </option>
          </select>
        </div>
        <div
          class="flex items-center gap-2 bg-emerald-700/50 px-3 py-1.5 rounded-xl border border-emerald-600"
        >
          <span class="text-lg">✅</span>
          <span class="text-sm font-black">{{ confirmedList.length }}</span>
        </div>
      </header>

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
          <h3 class="text-gray-700 font-bold text-sm">Nenhum evento hoje</h3>
          <p class="text-gray-500 text-xs mt-1">Não há partidas para a data de hoje.</p>
        </div>

        <div
          *ngIf="!loading && confirmedList.length === 0 && events.length > 0"
          class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <span class="text-5xl block mb-3 opacity-50">📋</span>
          <h3 class="text-gray-600 font-bold text-sm sm:text-base">
            Nenhum convidado confirmado neste evento
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
                {{ group.retirante_nome }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                Titular: {{ group.titular_nome }}
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
                  · Setor: {{ group.setor_evento_nome }}</span
                >
              </p>
              <p class="text-[10px] text-indigo-600 font-semibold mt-1">
                {{ group.evento_titulo }} · {{ group.data_evento | date: 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-emerald-100"
              >
                Entrada confirmada
              </span>
              <span class="text-[10px] font-bold text-gray-400 hidden sm:inline">
                {{ group.empresa }}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class ReceptionConfirmedComponent implements OnInit {
  apiUrl = `${environment.apiUri}/reception`;
  loading = true;
  events: any[] = [];
  selectedEventId: number | null = null;
  confirmedList: any[] = [];

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
  ) {}

  ngOnInit() {
    this.carregarConfirmados();
  }

  carregarConfirmados() {
    this.loading = true;
    this.confirmedList = [];
    this.cd.detectChanges();

    this.http.get<any[]>(`${this.apiUrl}/events/today`).pipe(
      catchError(() => of([])),
    ).subscribe({
      next: (eventsRes) => {
        const rawEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes as any)?.data;
        this.events = Array.isArray(rawEvents) ? rawEvents : [];
        if (this.events.length === 0) {
          this.selectedEventId = null;
          this.confirmedList = [];
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        const ids = new Set(this.events.map((e) => e.id));
        if (this.selectedEventId == null || !ids.has(this.selectedEventId)) {
          this.selectedEventId = this.events[0].id;
        }

        const ev = this.events.find((e) => e.id === this.selectedEventId) ?? this.events[0];

        this.http
          .get<any[]>(`${this.apiUrl}/events/${ev.id}/guests`)
          .pipe(
            map((guestsRes) => {
              const raw = Array.isArray(guestsRes) ? guestsRes : ((guestsRes as any)?.data ?? []);
              return raw.map((g: any) => ({
                ...g,
                checkin: g.checkin === true || g.checkin === 1 || g.checkin === '1',
                evento_titulo: ev.titulo || g.evento_titulo,
                data_evento: ev.data_evento || ev.data_jogo || g.data_evento,
              }));
            }),
            catchError(() => of([])),
          )
          .subscribe({
            next: (guests) => {
              this.montarListaConfirmados(guests);
              this.loading = false;
              this.cd.detectChanges();
            },
            error: () => {
              this.confirmedList = [];
              this.loading = false;
              this.cd.detectChanges();
            },
          });
      },
      error: () => {
        this.loading = false;
        this.confirmedList = [];
        this.events = [];
        this.cd.detectChanges();
      },
    });
  }

  onSelectEvent(eventId: number | string | null) {
    const parsedId = Number(eventId);
    if (!Number.isFinite(parsedId)) return;
    if (this.selectedEventId === parsedId) return;
    this.selectedEventId = parsedId;
    this.carregarConfirmados();
  }

  private montarListaConfirmados(guests: any[]) {
    const liberados = (guests || []).filter(
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

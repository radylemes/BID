import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reception-confirmed',
  standalone: true,
  imports: [CommonModule, RouterModule],
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
          *ngIf="!loading && confirmedList.length === 0"
          class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200"
        >
          <span class="text-5xl block mb-3 opacity-50">📋</span>
          <h3 class="text-gray-600 font-bold text-sm sm:text-base">
            Nenhum convidado confirmado ainda
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
                CPF {{ group.retirante_cpf }}
              </p>
              <p class="text-[10px] text-indigo-600 font-semibold mt-1">
                {{ group.evento_titulo }} · {{ group.data_evento | date: 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-emerald-100"
              >
                {{ group.ingressos_liberados }}/{{ group.quantidade_ingressos }} ingresso(s)
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
  confirmedList: any[] = [];

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
        const events = Array.isArray(rawEvents) ? rawEvents : [];
        if (events.length === 0) {
          this.confirmedList = [];
          this.loading = false;
          this.cd.detectChanges();
          return;
        }

        const requests = events.map((ev: any) =>
          this.http.get<any[]>(`${this.apiUrl}/events/${ev.id}/guests`).pipe(
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
          ),
        );

        forkJoin(requests).subscribe({
          next: (arrays) => {
            const allGuests = (arrays || []).reduce((acc: any[], arr) => acc.concat(arr), []);
            this.montarListaConfirmados(allGuests);
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
        this.cd.detectChanges();
      },
    });
  }

  private montarListaConfirmados(guests: any[]) {
    const mapa = new Map<string, any>();

    guests.forEach((guest) => {
      const liberado = guest.checkin === true || guest.checkin === 1 || guest.checkin === '1';
      if (!liberado) return;

      const key = `${guest.titular_id ?? guest.titular_nome ?? ''}-${guest.retirante_cpf ?? ''}-${guest.evento_titulo ?? ''}`;

      if (!mapa.has(key)) {
        mapa.set(key, {
          ...guest,
          checkin: true,
          quantidade_ingressos: 1,
          ingressos_liberados: 1,
        });
      } else {
        const g = mapa.get(key);
        g.quantidade_ingressos++;
        g.ingressos_liberados++;
      }
    });

    this.confirmedList = Array.from(mapa.values()).sort((a, b) => {
      const da = new Date(a.data_evento).getTime();
      const db = new Date(b.data_evento).getTime();
      if (da !== db) return db - da;
      return (a.retirante_nome || '').localeCompare(b.retirante_nome || '');
    });
  }
}

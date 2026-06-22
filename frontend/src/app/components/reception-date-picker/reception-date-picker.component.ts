import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

type Theme = 'indigo' | 'emerald';

interface CalDay {
  iso: string;
  day: number;
  inMonth: boolean;
}

@Component({
  selector: 'app-reception-date-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" #root>
      <button
        type="button"
        (click)="toggleOpen($event)"
        class="w-[132px] lg:w-full lg:min-w-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-center lg:text-left outline-none focus:ring-2 transition-colors border flex items-center justify-center lg:justify-between gap-1"
        [ngClass]="triggerClasses"
        [attr.aria-expanded]="open"
        aria-haspopup="dialog"
      >
        <span>{{ labelDataSelecionada() }}</span>
        <span class="text-[10px] opacity-70 shrink-0">📅</span>
      </button>

      <div
        *ngIf="open"
        class="absolute z-50 mt-1 right-0 lg:right-auto lg:left-0 w-[280px] rounded-xl shadow-2xl border overflow-hidden"
        [ngClass]="panelClasses"
        role="dialog"
        aria-label="Selecionar data"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b" [ngClass]="headerBorderClass">
          <button
            type="button"
            (click)="mudarMes(-1)"
            class="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <span class="text-xs font-black capitalize">{{ tituloMes() }}</span>
          <button
            type="button"
            (click)="mudarMes(1)"
            class="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>

        <div class="grid grid-cols-7 gap-0.5 px-2 pt-2 text-[10px] font-bold text-center opacity-60">
          <span *ngFor="let w of diasSemana">{{ w }}</span>
        </div>

        <div class="grid grid-cols-7 gap-0.5 p-2">
          <button
            *ngFor="let cell of gradeDias"
            type="button"
            [disabled]="!cell.inMonth"
            (click)="selecionarDia(cell)"
            class="relative h-9 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-25 disabled:cursor-default"
            [ngClass]="classesCelula(cell)"
          >
            {{ cell.day }}
            <span
              *ngIf="cell.inMonth && temEvento(cell.iso)"
              class="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
              [ngClass]="dotEventoClass"
            ></span>
          </button>
        </div>

        <div class="flex items-center justify-between px-3 py-2 border-t text-[10px] font-bold" [ngClass]="headerBorderClass">
          <button type="button" (click)="limpar()" class="hover:underline opacity-80">Limpar</button>
          <button type="button" (click)="irParaHoje()" class="hover:underline" [ngClass]="accentTextClass">Hoje</button>
        </div>
      </div>
    </div>
  `,
})
export class ReceptionDatePickerComponent implements OnInit, OnChanges {
  @Input() selectedDate = '';
  @Input() apiUrl = '';
  @Input() theme: Theme = 'indigo';
  @Output() selectedDateChange = new EventEmitter<string>();

  private http = inject(HttpClient);
  private rootRef = inject(ElementRef<HTMLElement>);

  open = false;
  viewYear = 0;
  viewMonth = 0;
  gradeDias: CalDay[] = [];
  eventDates = new Set<string>();

  readonly diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  ngOnInit() {
    this.syncViewFromSelected();
    this.montarGrade();
    this.carregarEventosDoMes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate'] && !changes['selectedDate'].firstChange) {
      this.syncViewFromSelected();
      this.montarGrade();
    }
  }

  get triggerClasses(): string {
    return this.theme === 'emerald'
      ? 'bg-emerald-900/70 text-white border-emerald-700 focus:ring-emerald-400'
      : 'bg-indigo-900/70 text-white border-indigo-700 focus:ring-indigo-400';
  }

  get panelClasses(): string {
    return this.theme === 'emerald'
      ? 'bg-gray-900 text-white border-emerald-700/60'
      : 'bg-gray-900 text-white border-indigo-700/60';
  }

  get headerBorderClass(): string {
    return this.theme === 'emerald' ? 'border-emerald-800/60' : 'border-indigo-800/60';
  }

  get accentTextClass(): string {
    return this.theme === 'emerald' ? 'text-emerald-300' : 'text-indigo-300';
  }

  get dotEventoClass(): string {
    return this.theme === 'emerald' ? 'bg-emerald-400' : 'bg-emerald-400';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.open) return;
    if (!this.rootRef.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }

  toggleOpen(event: Event) {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this.syncViewFromSelected();
      this.montarGrade();
      this.carregarEventosDoMes();
    }
  }

  labelDataSelecionada(): string {
    if (!this.selectedDate) return '—';
    const [y, m, d] = this.selectedDate.split('-');
    return `${d}/${m}/${y}`;
  }

  tituloMes(): string {
    const d = new Date(this.viewYear, this.viewMonth, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  temEvento(iso: string): boolean {
    return this.eventDates.has(iso);
  }

  classesCelula(cell: CalDay): Record<string, boolean> {
    const hoje = ReceptionDatePickerComponent.hojeIso();
    const selecionado = cell.iso === this.selectedDate;
    const comEvento = this.temEvento(cell.iso);
    const classes: Record<string, boolean> = {
      'ring-1 ring-white/30': cell.iso === hoje && !selecionado && !comEvento,
      'hover:bg-white/10': cell.inMonth && !selecionado,
    };
    if (this.theme === 'emerald') {
      classes['bg-emerald-600 text-white ring-2 ring-emerald-300'] = selecionado;
      classes['ring-1 ring-emerald-400/80 bg-emerald-950/40'] = comEvento && !selecionado;
    } else {
      classes['bg-indigo-600 text-white ring-2 ring-indigo-300'] = selecionado;
      classes['ring-1 ring-emerald-400/90 bg-emerald-950/30'] = comEvento && !selecionado;
    }
    return classes;
  }

  mudarMes(delta: number) {
    this.viewMonth += delta;
    if (this.viewMonth < 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else if (this.viewMonth > 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    }
    this.montarGrade();
    this.carregarEventosDoMes();
  }

  selecionarDia(cell: CalDay) {
    if (!cell.inMonth) return;
    this.selectedDateChange.emit(cell.iso);
    this.open = false;
  }

  limpar() {
    this.open = false;
  }

  irParaHoje() {
    const hoje = ReceptionDatePickerComponent.hojeIso();
    this.selectedDateChange.emit(hoje);
    this.syncViewFromSelected();
    this.montarGrade();
    this.carregarEventosDoMes();
    this.open = false;
  }

  private syncViewFromSelected() {
    const base = this.selectedDate || ReceptionDatePickerComponent.hojeIso();
    const [y, m] = base.split('-').map(Number);
    this.viewYear = y;
    this.viewMonth = m - 1;
  }

  private montarGrade() {
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const daysPrevMonth = new Date(this.viewYear, this.viewMonth, 0).getDate();

    const cells: CalDay[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = daysPrevMonth - i;
      const prevMonth = this.viewMonth === 0 ? 11 : this.viewMonth - 1;
      const year = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
      cells.push({
        iso: ReceptionDatePickerComponent.toIso(year, prevMonth + 1, day),
        day,
        inMonth: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        iso: ReceptionDatePickerComponent.toIso(this.viewYear, this.viewMonth + 1, day),
        day,
        inMonth: true,
      });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const nextMonth = this.viewMonth === 11 ? 0 : this.viewMonth + 1;
      const year = this.viewMonth === 11 ? this.viewYear + 1 : this.viewYear;
      cells.push({
        iso: ReceptionDatePickerComponent.toIso(year, nextMonth + 1, nextDay),
        day: nextDay,
        inMonth: false,
      });
      nextDay++;
    }
    this.gradeDias = cells;
  }

  private carregarEventosDoMes() {
    if (!this.apiUrl) return;
    const from = ReceptionDatePickerComponent.toIso(this.viewYear, this.viewMonth + 1, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const to = ReceptionDatePickerComponent.toIso(this.viewYear, this.viewMonth + 1, lastDay);
    this.http.get<string[]>(`${this.apiUrl}/events/dates?from=${from}&to=${to}`).subscribe({
      next: (datas) => {
        this.eventDates = new Set(Array.isArray(datas) ? datas : []);
      },
      error: () => {
        this.eventDates = new Set();
      },
    });
  }

  private static hojeIso(): string {
    const d = new Date();
    return ReceptionDatePickerComponent.toIso(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  private static toIso(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
}

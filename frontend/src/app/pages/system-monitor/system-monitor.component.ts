import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemMonitorService } from '../../services/system-monitor.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-system-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-900 p-4 md:p-8 font-sans text-gray-200">
      <div class="max-w-7xl mx-auto">
        <div
          class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6"
        >
          <div>
            <h1 class="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span class="text-4xl">🚨</span> Monitor do Sistema
            </h1>
            <p class="text-gray-400 font-medium text-sm mt-1">
              Rastreamento de exceções, falhas de API e crashes do Node.js.
            </p>
          </div>

          <div class="flex gap-4">
            <div
              class="bg-gray-800 px-4 py-2 rounded-xl border border-gray-700 flex flex-col items-center"
            >
              <span class="text-[10px] uppercase font-bold text-gray-500">Erros Pendentes</span>
              <span class="text-2xl font-black text-rose-500 leading-none">{{
                pendentesCount
              }}</span>
            </div>
            <button
              (click)="carregarErros()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors shadow-lg active:scale-95"
              title="Atualizar"
            >
              🔄
            </button>
          </div>
        </div>

        <div *ngIf="loading" class="flex justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>

        <div
          *ngIf="!loading && erros.length === 0"
          class="text-center py-20 bg-gray-800/50 rounded-2xl border border-gray-800"
        >
          <span class="text-5xl block mb-3 grayscale opacity-30">✅</span>
          <h3 class="text-gray-400 font-bold uppercase tracking-widest text-sm">
            Sistema Saudável. Nenhum erro registado.
          </h3>
        </div>

        <div *ngIf="!loading && erros.length > 0" class="flex flex-col gap-4">
          <div
            *ngFor="let erro of erros"
            class="p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-4"
            [ngClass]="
              erro.resolvido
                ? 'bg-gray-800/30 border-gray-800 opacity-60'
                : 'bg-gray-800 border-rose-900/50 shadow-lg shadow-rose-900/10'
            "
          >
            <div class="shrink-0">
              <span
                *ngIf="!erro.resolvido"
                class="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl border border-rose-500/20"
                >🔥</span
              >
              <span
                *ngIf="erro.resolvido"
                class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-2xl border border-emerald-500/20"
                >✅</span
              >
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                  [ngClass]="
                    erro.resolvido ? 'bg-gray-700 text-gray-400' : 'bg-rose-500/20 text-rose-400'
                  "
                >
                  {{ erro.modulo }}
                </span>
                <span class="text-[10px] text-gray-500 font-mono">{{
                  erro.criado_em | date: 'dd/MM/yyyy HH:mm:ss'
                }}</span>
              </div>
              <p class="text-sm font-bold text-gray-200 truncate" title="{{ erro.mensagem }}">
                {{ erro.mensagem }}
              </p>
            </div>

            <div class="flex items-center gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0">
              <button
                (click)="verStackTrace(erro)"
                class="flex-1 md:flex-none bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                Ver Código
              </button>
              <button
                *ngIf="!erro.resolvido"
                (click)="marcarResolvido(erro.id)"
                class="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-emerald-900/20"
              >
                Marcar Resolvido
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SystemMonitorComponent implements OnInit {
  erros: any[] = [];
  loading = true;
  pendentesCount = 0;

  constructor(
    private monitorService: SystemMonitorService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarErros();
  }

  carregarErros() {
    this.loading = true;
    this.monitorService.getErrors().subscribe({
      next: (data) => {
        this.erros = data;
        this.pendentesCount = data.filter((e) => !e.resolvido).length;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar monitor:', err);
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  marcarResolvido(id: number) {
    this.monitorService.resolveError(id).subscribe({
      next: () => {
        const erro = this.erros.find((e) => e.id === id);
        if (erro) erro.resolvido = 1;
        this.pendentesCount = this.erros.filter((e) => !e.resolvido).length;
        this.cd.detectChanges();

        Swal.fire({
          icon: 'success',
          title: 'Resolvido!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
        });
      },
    });
  }

  verStackTrace(erro: any) {
    Swal.fire({
      title: `<h3 class="text-xl font-black text-rose-500 tracking-tight text-left">Detalhe do Erro</h3>`,
      html: `
        <div class="text-left bg-gray-900 rounded-xl p-4 mt-2 overflow-x-auto border border-gray-700">
          <p class="text-white text-sm font-bold mb-3">${erro.mensagem}</p>
          <pre class="text-rose-400 text-[10px] font-mono m-0 whitespace-pre-wrap"><code>${erro.stack_trace}</code></pre>
        </div>
      `,
      width: '800px',
      background: '#1f2937',
      showConfirmButton: true,
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#4f46e5',
    });
  }
}

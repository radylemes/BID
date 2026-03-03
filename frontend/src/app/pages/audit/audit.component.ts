import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div class="max-w-7xl mx-auto">
        <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 class="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
              <span class="text-4xl">🛡️</span> Auditoria e Logs
            </h1>
            <p class="text-gray-500 font-medium text-sm mt-1">
              Rastreamento de atividades, configurações e acessos do sistema.
            </p>
          </div>

          <div class="relative w-full md:w-96">
            <span class="absolute left-4 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Buscar por módulo, ação ou usuário..."
              class="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-medium text-sm"
            />
          </div>
        </div>

        <div *ngIf="loading" class="flex justify-center py-20">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>

        <div
          *ngIf="!loading && logs.length === 0"
          class="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100"
        >
          <span class="text-5xl block mb-3 grayscale opacity-30">📭</span>
          <h3 class="text-gray-500 font-bold uppercase tracking-widest text-sm">
            Nenhum registro encontrado.
          </h3>
        </div>

        <div
          *ngIf="!loading && logs.length > 0"
          class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div class="overflow-x-auto custom-scrollbar">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead
                class="bg-gray-50 text-gray-500 uppercase font-black text-[10px] tracking-wider border-b border-gray-200"
              >
                <tr>
                  <th class="px-6 py-4">Data / Hora</th>
                  <th class="px-6 py-4">Usuário Responsável</th>
                  <th class="px-6 py-4">Módulo</th>
                  <th class="px-6 py-4">Ação</th>
                  <th class="px-6 py-4 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr *ngFor="let log of filteredLogs()" class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="font-bold text-gray-800">
                      {{ log.data_hora | date: 'dd/MM/yyyy' }}
                    </div>
                    <div class="text-[10px] text-gray-400 font-mono">
                      {{ log.data_hora | date: 'HH:mm:ss' }}
                    </div>
                  </td>

                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <div
                        class="w-6 h-6 rounded bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]"
                      >
                        {{ log.admin_nome ? log.admin_nome.charAt(0) : 'S' }}
                      </div>
                      <span class="font-bold text-gray-700">{{
                        log.admin_nome || 'Sistema Automático'
                      }}</span>
                    </div>
                  </td>

                  <td class="px-6 py-4">
                    <span
                      class="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-black tracking-wider border border-gray-200 uppercase"
                    >
                      {{ log.modulo }}
                    </span>
                  </td>

                  <td class="px-6 py-4">
                    <span class="text-xs font-bold text-indigo-700">{{ log.acao }}</span>
                    <div *ngIf="log.registro_id" class="text-[9px] text-gray-400 mt-0.5">
                      ID Ref: #{{ log.registro_id }}
                    </div>
                  </td>

                  <td class="px-6 py-4 text-center">
                    <button
                      (click)="verDetalhes(log)"
                      class="bg-white border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      👁️ Ver Dados
                    </button>
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
export class AuditComponent implements OnInit {
  logs: any[] = [];
  loading = true;
  searchTerm = '';

  // 1. INJEÇÃO DO ChangeDetectorRef ADICIONADA AQUI:
  constructor(
    private auditService: AuditService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarLogs();
  }

  carregarLogs() {
    this.auditService.getLogs().subscribe({
      next: (data) => {
        this.logs = data;
        this.loading = false;
        // 2. FORÇANDO A TELA A ATUALIZAR IMEDIATAMENTE:
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar auditoria:', err);
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  filteredLogs() {
    if (!this.searchTerm) return this.logs;
    const term = this.searchTerm.toLowerCase();
    return this.logs.filter(
      (log) =>
        (log.admin_nome && log.admin_nome.toLowerCase().includes(term)) ||
        (log.modulo && log.modulo.toLowerCase().includes(term)) ||
        (log.acao && log.acao.toLowerCase().includes(term)),
    );
  }

  verDetalhes(log: any) {
    const jsonFormatado = JSON.stringify(log.detalhes, null, 2);

    Swal.fire({
      title: `<h3 class="text-xl font-black text-gray-800 tracking-tight">Detalhes do Log</h3>`,
      html: `
        <div class="text-left bg-gray-900 rounded-xl p-4 mt-2 overflow-x-auto">
          <pre class="text-emerald-400 text-[11px] font-mono m-0"><code>${jsonFormatado}</code></pre>
        </div>
      `,
      width: '600px',
      showConfirmButton: true,
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#4f46e5',
    });
  }
}

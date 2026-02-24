import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen">
      <div class="mb-8">
        <h2 class="text-3xl font-extrabold text-gray-800 tracking-tight">
          Configurações do Sistema
        </h2>
        <p class="text-sm text-gray-500 font-medium">
          Gerencie automações, regras de negócio e integrações.
        </p>
      </div>

      <div
        class="bg-white shadow-md rounded-2xl border border-gray-100 flex flex-col lg:flex-row overflow-hidden min-h-[600px]"
      >
        <div class="w-full lg:w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-2 shrink-0">
          <button
            (click)="abaAtual = 'pontos'"
            [ngClass]="
              abaAtual === 'pontos'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">💰</span> Regras de Pontos
          </button>
          <button
            (click)="abaAtual = 'email'"
            [ngClass]="
              abaAtual === 'email'
                ? 'bg-indigo-100 text-indigo-700 font-bold'
                : 'text-gray-600 hover:bg-gray-100'
            "
            class="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-sm"
          >
            <span class="text-lg">📧</span> Servidor SMTP
            <span
              class="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase ml-auto"
              >Breve</span
            >
          </button>
        </div>

        <div class="p-6 md:p-8 flex-1 bg-white">
          <div *ngIf="loading" class="text-gray-400 animate-pulse font-bold text-center py-10">
            Carregando dados...
          </div>

          <div *ngIf="abaAtual === 'pontos' && !loading">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
              <div>
                <h3 class="text-xl font-black text-gray-800">Automação de Pontos</h3>
                <p class="text-xs text-gray-500 mt-1">
                  Configure regras de ganho de pontos e aplique filtros específicos.
                </p>
              </div>
              <button
                (click)="abrirModalRegra()"
                class="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              >
                <span class="text-lg leading-none">+</span> Nova Regra
              </button>
            </div>

            <div
              *ngIf="rules.length === 0"
              class="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200"
            >
              <span class="text-5xl opacity-30 grayscale mb-3 block">🕰️</span>
              <h4 class="text-gray-600 font-bold">Nenhuma regra configurada</h4>
            </div>

            <div *ngIf="rules.length > 0" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div
                *ngFor="let rule of rules"
                class="bg-white p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between"
                [ngClass]="
                  rule.ativo
                    ? 'border-indigo-100 shadow-sm hover:shadow-md'
                    : 'border-gray-200 opacity-60 grayscale'
                "
              >
                <div
                  class="absolute top-0 left-0 bottom-0 w-1.5"
                  [ngClass]="rule.ativo ? 'bg-emerald-500' : 'bg-gray-300'"
                ></div>

                <div>
                  <div class="flex justify-between items-start mb-2 pl-2">
                    <div class="flex-1 pr-3">
                      <h4 class="font-black text-gray-800 text-sm leading-tight">
                        {{ rule.descricao }}
                      </h4>

                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span
                          *ngIf="!rule.grupo_id"
                          class="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🌍 Global</span
                        >
                        <span
                          *ngIf="rule.grupo_id"
                          class="text-[9px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🎯 Grupo: {{ rule.grupo_nome }}</span
                        >

                        <span
                          *ngIf="rule.perfil_alvo"
                          class="text-[9px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >👤 Perfil: {{ rule.perfil_alvo }}</span
                        >

                        <span
                          *ngIf="rule.setor_id"
                          class="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 uppercase font-black tracking-wider flex items-center gap-1"
                          >🏢 Setor: {{ rule.setor_nome }}</span
                        >

                        <span
                          class="text-[9px] px-2 py-0.5 rounded border uppercase font-black tracking-wider flex items-center gap-1"
                          [ngClass]="
                            rule.somente_ativos
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          "
                        >
                          {{ rule.somente_ativos ? '✅ Somente Ativos' : '👁️ Todos Usuários' }}
                        </span>
                      </div>
                    </div>

                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        [checked]="rule.ativo"
                        (change)="toggleStatus(rule)"
                        class="sr-only peer"
                      />
                      <div
                        class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"
                      ></div>
                    </label>
                  </div>
                </div>

                <div class="mt-4 pl-2 space-y-3">
                  <div
                    class="bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between text-xs"
                  >
                    <div class="flex items-center gap-2 text-gray-700 font-bold">
                      <span class="text-indigo-600">+{{ rule.pontos }} pts</span>
                      <span class="text-gray-300">|</span>
                      <span class="font-medium"
                        >🔁 A cada {{ rule.frequencia_valor }} {{ rule.frequencia_tipo }}</span
                      >
                    </div>
                    <div class="flex gap-1">
                      <button
                        (click)="abrirModalRegra(rule)"
                        class="text-gray-400 hover:text-indigo-500 transition-colors p-1"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        (click)="deletarRegra(rule.id)"
                        class="text-gray-400 hover:text-rose-500 transition-colors p-1"
                        title="Apagar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div class="text-[9px] text-gray-400 flex justify-between items-center">
                    <span *ngIf="rule.ultima_execucao" title="Última Execução"
                      >Última: {{ rule.ultima_execucao | date: 'dd/MM HH:mm' }}</span
                    >
                    <span *ngIf="!rule.ultima_execucao">Nunca executada</span>
                    <span *ngIf="rule.ativo" class="text-indigo-400 font-bold"
                      >Próxima: {{ rule.proxima_execucao | date: 'dd/MM HH:mm' }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            *ngIf="abaAtual === 'email'"
            class="text-center py-20 text-gray-400 h-full flex flex-col items-center justify-center"
          >
            <span class="text-6xl block mb-4 grayscale opacity-30">📨</span>
            <p class="font-bold text-lg text-gray-600">Configurações de SMTP</p>
            <p class="text-sm">Área reservada para integrações de disparo de e-mails.</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  abaAtual = 'pontos';
  loading = true;
  apiUrl = 'http://localhost:3005/api/points-rules';

  rules: any[] = [];
  grupos: any[] = [];
  setores: any[] = [];
  currentUser: any = {};

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.carregarGrupos();
    this.carregarSetores();
    this.carregarRegras();
  }

  carregarRegras() {
    this.loading = true;
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (res) => {
        this.rules = res;
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  carregarGrupos() {
    this.http.get<any[]>('http://localhost:3005/api/groups').subscribe({
      next: (res) => (this.grupos = res),
    });
  }

  carregarSetores() {
    this.http.get<any[]>('http://localhost:3005/api/sectors').subscribe({
      next: (res) => (this.setores = res),
    });
  }

  toggleStatus(rule: any) {
    const novoStatus = !rule.ativo;
    this.http
      .put(`${this.apiUrl}/${rule.id}/toggle`, {
        ativo: novoStatus,
        adminId: this.currentUser.id,
      })
      .subscribe({
        next: () => {
          rule.ativo = novoStatus;
          if (novoStatus)
            Swal.fire({
              icon: 'success',
              title: 'Regra Reativada!',
              timer: 2000,
              showConfirmButton: false,
            });
          this.carregarRegras();
        },
        error: () => this.cd.detectChanges(),
      });
  }

  deletarRegra(id: number) {
    Swal.fire({
      title: 'Apagar regra?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, apagar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.apiUrl}/${id}?adminId=${this.currentUser.id}`).subscribe({
          next: () => {
            this.rules = this.rules.filter((r) => r.id !== id);
            this.cd.detectChanges();
          },
        });
      }
    });
  }

  async abrirModalRegra(regraExistente: any = null) {
    const isEdit = !!regraExistente;

    // Constrói Dropdowns
    let gruposHTML = `<option value="GLOBAL">🌍 Global: Todos os Grupos</option>`;
    this.grupos.forEach((g: any) => {
      const isSelected = regraExistente && regraExistente.grupo_id === g.id ? 'selected' : '';
      gruposHTML += `<option value="${g.id}" ${isSelected}>🎯 Grupo: ${g.nome}</option>`;
    });

    let setoresHTML = `<option value="">🏢 Todos os Setores</option>`;
    this.setores.forEach((s: any) => {
      const isSelected = regraExistente && regraExistente.setor_id === s.id ? 'selected' : '';
      setoresHTML += `<option value="${s.id}" ${isSelected}>🏢 ${s.nome} (${s.empresa_nome})</option>`;
    });

    const perfisHTML = `
      <option value="">👤 Todos os Perfis</option>
      <option value="USER" ${regraExistente && regraExistente.perfil_alvo === 'USER' ? 'selected' : ''}>👤 Apenas USER (Colaborador)</option>
      <option value="ADMIN" ${regraExistente && regraExistente.perfil_alvo === 'ADMIN' ? 'selected' : ''}>⭐ Apenas ADMIN</option>
      <option value="PORTARIA" ${regraExistente && regraExistente.perfil_alvo === 'PORTARIA' ? 'selected' : ''}>🛡️ Apenas PORTARIA</option>
    `;

    const { value: formValues } = await Swal.fire({
      title: `<h3 class="text-xl font-black text-gray-800">${isEdit ? 'Editar Regra' : 'Nova Regra'}</h3>`,
      width: '600px',
      html: `
        <div class="text-left space-y-4 px-1 mt-4 font-sans">
            <div>
                <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome da Regra</label>
                <input id="swal-desc" value="${isEdit ? regraExistente.descricao : ''}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" placeholder="Ex: Bônus de Participação">
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <label class="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Pontos (+)</label>
                    <input id="swal-pontos" type="number" min="1" value="${isEdit ? regraExistente.pontos : 1}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg font-black text-indigo-600">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Status do Usuário</label>
                    <select id="swal-ativos" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                        <option value="1" ${isEdit && regraExistente.somente_ativos === 1 ? 'selected' : ''}>✅ Somente Ativos</option>
                        <option value="0" ${isEdit && regraExistente.somente_ativos === 0 ? 'selected' : ''}>👁️ Todos (Ativos e Inativos)</option>
                    </select>
                </div>
            </div>

            <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mt-4">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b border-gray-200 pb-2">Filtros de Aplicação</p>
              
              <div>
                  <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Grupo de Aposta</label>
                  <select id="swal-alvo" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                      ${gruposHTML}
                  </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                  <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Perfil</label>
                      <select id="swal-perfil" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                          ${perfisHTML}
                      </select>
                  </div>
                  <div>
                      <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Filtro por Setor</label>
                      <select id="swal-setor" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                          ${setoresHTML}
                      </select>
                  </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Repetir a cada</label>
                    <input id="swal-freq-val" type="number" min="1" value="${isEdit ? regraExistente.frequencia_valor : 1}" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg text-center">
                </div>
                <div>
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Período</label>
                    <select id="swal-freq-tipo" class="swal2-select !m-0 !mt-1 w-full text-sm rounded-lg border-gray-300">
                        <option value="minutos" ${isEdit && regraExistente.frequencia_tipo === 'minutos' ? 'selected' : ''}>Minuto(s)</option>
                        <option value="horas" ${isEdit && regraExistente.frequencia_tipo === 'horas' ? 'selected' : ''}>Hora(s)</option>
                        <option value="dias" ${!isEdit || regraExistente.frequencia_tipo === 'dias' ? 'selected' : ''}>Dia(s)</option>
                        <option value="meses" ${isEdit && regraExistente.frequencia_tipo === 'meses' ? 'selected' : ''}>Mês(es)</option>
                    </select>
                </div>
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar Regra',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      preConfirm: () => {
        const desc = (document.getElementById('swal-desc') as HTMLInputElement).value;
        const pontos = parseInt((document.getElementById('swal-pontos') as HTMLInputElement).value);
        const freqVal = parseInt(
          (document.getElementById('swal-freq-val') as HTMLInputElement).value,
        );

        if (!desc || isNaN(pontos) || isNaN(freqVal)) {
          Swal.showValidationMessage('Preencha os campos Nome, Pontos e Frequência.');
          return false;
        }

        return {
          descricao: desc,
          pontos: pontos,
          frequencia_valor: freqVal,
          frequencia_tipo: (document.getElementById('swal-freq-tipo') as HTMLSelectElement).value,
          grupo_id: (document.getElementById('swal-alvo') as HTMLSelectElement).value,
          perfil_alvo: (document.getElementById('swal-perfil') as HTMLSelectElement).value,
          setor_id: (document.getElementById('swal-setor') as HTMLSelectElement).value,
          somente_ativos: (document.getElementById('swal-ativos') as HTMLSelectElement).value,
          adminId: this.currentUser.id,
        };
      },
    });

    if (formValues) {
      const request = isEdit
        ? this.http.put(`${this.apiUrl}/${regraExistente.id}`, formValues)
        : this.http.post(this.apiUrl, formValues);

      request.subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Salvo com sucesso!',
            timer: 1500,
            showConfirmButton: false,
          });
          this.carregarRegras();
        },
        error: () => Swal.fire('Erro', 'Falha ao salvar a regra.', 'error'),
      });
    }
  }
}

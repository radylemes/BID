import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-8">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div
            class="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative"
          >
            <div class="h-28 bg-gradient-to-r from-indigo-600 to-blue-500"></div>

            <div class="px-6 pb-6 relative flex-1 flex flex-col">
              <div class="relative -mt-14 mb-4 flex justify-center">
                <div class="relative group">
                  <div
                    class="w-24 h-24 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center"
                  >
                    <img
                      *ngIf="user?.foto"
                      [src]="getFotoUrl(user.foto)"
                      class="w-full h-full object-cover"
                      alt="Foto de perfil"
                    />
                    <div
                      *ngIf="!user?.foto"
                      class="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl font-black uppercase"
                    >
                      {{ (user?.nome_completo || 'U').charAt(0) }}
                    </div>
                  </div>
                  <button
                    (click)="fileInput.click()"
                    class="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      ></path>
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      ></path>
                    </svg>
                  </button>
                  <input
                    #fileInput
                    type="file"
                    (change)="onFileSelected($event)"
                    class="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <div class="text-center mb-6">
                <h1 class="text-xl font-black text-gray-900 leading-tight">
                  {{ user?.nome_completo || 'Carregando...' }}
                </h1>
                <p class="text-xs text-gray-500 mt-1">{{ user?.email || user?.username }}</p>

                <div class="mt-3 flex justify-center gap-2">
                  <span
                    class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    [class]="
                      user?.perfil === 'ADMIN' || user?.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-indigo-50 text-indigo-700'
                    "
                  >
                    {{ user?.perfil || user?.role || 'USER' }}
                  </span>
                  <span
                    class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700"
                  >
                    Conta Ativa
                  </span>
                </div>
              </div>

              <div class="border-t border-gray-100 pt-5 mt-auto">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Informações de Rede
                </h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500">Setor</label>
                    <input
                      type="text"
                      [value]="user?.setor || 'Não identificado'"
                      disabled
                      class="mt-1 block w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-600"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold text-gray-500">Login</label>
                    <input
                      type="text"
                      [value]="user?.username || 'N/A'"
                      disabled
                      class="mt-1 block w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-8 flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl"
                >
                  💰
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Saldo Atual
                  </p>
                  <p class="text-2xl font-black text-gray-800 leading-none mt-1">
                    {{ user?.pontos || 0 }}
                    <span class="text-sm font-medium text-gray-400">pts</span>
                  </p>
                </div>
              </div>

              <div
                class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl"
                >
                  🏆
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Bids Vencidos
                  </p>
                  <p class="text-2xl font-black text-gray-800 leading-none mt-1">
                    {{ stats.bidsVencidos }}
                  </p>
                </div>
              </div>

              <div
                class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
              >
                <div
                  class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl"
                >
                  📊
                </div>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Média / Lance
                  </p>
                  <p class="text-2xl font-black text-gray-800 leading-none mt-1">
                    {{ stats.mediaPontos }}
                    <span class="text-sm font-medium text-gray-400">pts</span>
                  </p>
                </div>
              </div>
            </div>

            <div
              class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1 flex flex-col"
            >
              <div class="flex justify-between items-end mb-4">
                <div>
                  <h3 class="text-sm font-black text-gray-800">Evolução do Saldo</h3>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Últimas movimentações
                  </p>
                </div>
                <div class="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase">
                  <div class="flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Créditos
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-rose-400"></span> Gastos
                  </div>
                </div>
              </div>

              <div
                class="relative flex-1 flex items-end justify-between gap-2 h-40 mt-auto border-b border-gray-200 pb-5 pt-6"
              >
                <div
                  class="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 pt-6"
                >
                  <div class="w-full border-t border-dashed border-gray-100"></div>
                  <div class="w-full border-t border-dashed border-gray-100"></div>
                  <div class="w-full border-t border-dashed border-gray-100"></div>
                </div>

                <div
                  *ngFor="let item of historicoPontos"
                  class="relative w-full rounded-t-md group transition-all duration-300 cursor-pointer z-10"
                  [ngClass]="
                    item.tipo === 'credito'
                      ? 'bg-emerald-200 hover:bg-emerald-500'
                      : 'bg-rose-200 hover:bg-rose-500'
                  "
                  [style.height]="(item.valor / maxPonto) * 100 + '%'"
                >
                  <div
                    class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-tighter"
                    [ngClass]="item.tipo === 'credito' ? 'text-emerald-600' : 'text-rose-600'"
                  >
                    {{ item.valor }}
                  </div>

                  <div
                    class="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1.5 px-3 rounded-lg font-bold pointer-events-none transition-opacity whitespace-nowrap shadow-xl flex flex-col items-center z-50"
                  >
                    <span
                      [ngClass]="item.tipo === 'credito' ? 'text-emerald-400' : 'text-rose-400'"
                    >
                      {{ item.tipo === 'credito' ? '+' : '-' }}{{ item.valor }} pts
                    </span>
                    <span class="text-[8px] text-gray-300 font-normal">{{ item.data }}</span>
                  </div>

                  <div
                    class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-gray-400 whitespace-nowrap"
                  >
                    {{ item.data }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div
            class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
          >
            <div>
              <h2 class="text-lg font-black text-gray-800">Meus Convidados (Retirantes)</h2>
              <p class="text-xs text-gray-500 mt-1">
                Pessoas autorizadas a retirar seus ingressos ganhos na portaria do evento.
              </p>
            </div>
            <button
              (click)="abrirFormularioConvidado()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
            >
              <span class="text-base leading-none">+</span> Adicionar Convidado
            </button>
          </div>

          <div class="overflow-x-auto rounded-xl border border-gray-100">
            <table class="w-full text-left text-sm text-gray-600">
              <thead
                class="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100 tracking-wider"
              >
                <tr>
                  <th class="px-4 py-3">Nome / Contato</th>
                  <th class="px-4 py-3">CPF</th>
                  <th class="px-4 py-3">Eventos Participados</th>
                  <th class="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="convidados.length === 0">
                  <td colspan="4" class="text-center py-12 text-gray-400 font-medium bg-gray-50/30">
                    <span class="text-3xl block mb-2 opacity-50">🎫</span>
                    Nenhum convidado cadastrado.
                  </td>
                </tr>
                <tr
                  *ngFor="let conv of convidados"
                  class="border-b border-gray-50 hover:bg-gray-50/80 transition-colors"
                >
                  <td class="px-4 py-3">
                    <p class="font-bold text-gray-800 text-sm">{{ conv.nome_completo }}</p>
                    <p class="text-[10px] text-gray-400 mt-0.5">
                      {{ conv.email || 'Sem e-mail' }} | {{ conv.telefone || 'Sem telefone' }}
                    </p>
                  </td>
                  <td class="px-4 py-3 font-mono text-xs">{{ conv.cpf }}</td>
                  <td class="px-4 py-3">
                    <span
                      *ngIf="conv.eventos_participados"
                      class="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold inline-block max-w-[200px] truncate"
                    >
                      {{ conv.eventos_participados }}
                    </span>
                    <span
                      *ngIf="!conv.eventos_participados"
                      class="text-gray-400 text-[10px] italic"
                      >Nenhum evento ainda</span
                    >
                  </td>
                  <td class="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      (click)="abrirFormularioConvidado(conv)"
                      class="text-indigo-600 hover:text-indigo-800 font-bold text-[11px] uppercase tracking-wide bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      (click)="excluirConvidado(conv.id)"
                      class="text-rose-600 hover:text-rose-800 font-bold text-[11px] uppercase tracking-wide bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Excluir
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
export class ProfileComponent implements OnInit {
  user: any = null;
  apiUrl = 'http://localhost:3005';
  convidados: any[] = [];

  // Variáveis vazias aguardando os dados do banco
  stats = { bidsVencidos: 0, mediaPontos: 0 };
  historicoPontos: Array<{ valor: number; tipo: 'credito' | 'gasto'; data: string }> = [];
  maxPonto: number = 100; // Será calculado automaticamente

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private guestService: GuestService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarPerfil();
  }

  carregarPerfil() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      this.user.nome_completo = this.user.nome_completo || this.user.nome;
      this.user.username = this.user.username || this.user.login;
      this.user.role = this.user.role || this.user.perfil || 'user';

      // Carrega os módulos paralelos
      this.carregarConvidados();
      this.carregarEstatisticas(); // <--- CHAMADA DA NOVA FUNÇÃO

      if (this.user.id) {
        this.userService.getById(this.user.id).subscribe({
          next: (fullUser: any) => {
            const usuarioAtualizado = {
              ...fullUser,
              role: fullUser.perfil || fullUser.role || this.user.role,
              setor: fullUser.setor || this.user.setor,
              nome_completo: fullUser.nome_completo || fullUser.nome || this.user.nome_completo,
            };
            this.user = usuarioAtualizado;
            localStorage.setItem('currentUser', JSON.stringify(usuarioAtualizado));
          },
          error: (err) => console.error('Erro ao atualizar perfil:', err),
        });
      }
    } else {
      setTimeout(() => this.carregarPerfil(), 500);
    }
  }

  // ==========================================
  // FUNÇÃO DE ESTATÍSTICAS (NOVO)
  // ==========================================
  carregarEstatisticas() {
    if (!this.user || !this.user.id) return;

    this.userService.getUserStats(this.user.id).subscribe({
      next: (data) => {
        this.stats = data.stats;
        this.historicoPontos = data.historico;

        // Calcula a barra mais alta do gráfico para escalar perfeitamente (com 20% de margem no topo)
        if (this.historicoPontos && this.historicoPontos.length > 0) {
          const valores = this.historicoPontos.map((h) => h.valor);
          const maiorValor = Math.max(...valores, 50); // Mínimo de 50 para o gráfico não ficar achatado
          this.maxPonto = Math.ceil(maiorValor * 1.2);
        }

        this.cd.detectChanges(); // Atualiza a tela
      },
      error: (err) => console.error('Erro ao carregar estatísticas do usuário', err),
    });
  }

  // ==========================================
  // FUNÇÕES DE CONVIDADOS (MANTIDAS)
  // ==========================================

  carregarConvidados() {
    if (!this.user || !this.user.id) return;
    this.guestService.getGuests(this.user.id).subscribe({
      next: (data) => {
        this.convidados = data;
        this.cd.detectChanges();
      },
      error: (err) => console.error('Erro ao buscar convidados', err),
    });
  }

  async abrirFormularioConvidado(convidado: any = null) {
    const isEdit = !!convidado;
    const { value: formValues } = await Swal.fire({
      title: `<h3 class="text-xl font-black text-gray-800">${isEdit ? 'Editar Retirante' : 'Novo Retirante'}</h3>`,
      width: '450px',
      html: `
        <div class="space-y-4 text-left px-1 mt-4">
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nome Completo</label>
            <input id="swal-nome" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.nome_completo || ''}" placeholder="Nome de quem vai buscar">
          </div>
          <div>
            <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">CPF (Obrigatório para portaria)</label>
            <input id="swal-cpf" maxlength="14" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg font-mono" value="${convidado?.cpf || ''}" placeholder="000.000.000-00">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">E-mail <span class="text-gray-400 font-normal">(Opcional)</span></label>
              <input id="swal-email" type="email" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.email || ''}" placeholder="email@exemplo.com">
            </div>
            <div>
              <label class="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Telefone <span class="text-gray-400 font-normal">(Opcional)</span></label>
              <input id="swal-telefone" class="swal2-input !m-0 !mt-1 w-full text-sm rounded-lg" value="${convidado?.telefone || ''}" placeholder="(11) 90000-0000">
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4f46e5',
      didOpen: () => {
        const cpfInput = document.getElementById('swal-cpf') as HTMLInputElement;
        if (cpfInput) {
          const aplicarMascara = () => {
            let v = cpfInput.value.replace(/\D/g, '');
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d)/, '$1.$2');
            v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            cpfInput.value = v;
          };
          aplicarMascara();
          cpfInput.addEventListener('input', aplicarMascara);
        }
      },
      preConfirm: () => {
        const nome = (document.getElementById('swal-nome') as HTMLInputElement).value;
        const cpf = (document.getElementById('swal-cpf') as HTMLInputElement).value;
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const telefone = (document.getElementById('swal-telefone') as HTMLInputElement).value;

        if (!nome || !cpf) {
          Swal.showValidationMessage('Os campos Nome e CPF são obrigatórios.');
          return false;
        }
        return { usuario_id: this.user.id, nome_completo: nome, cpf, email, telefone };
      },
    });

    if (formValues) {
      if (isEdit) {
        this.guestService.updateGuest(convidado.id, formValues).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Atualizado!',
              timer: 1500,
              showConfirmButton: false,
            });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Não foi possível atualizar.', 'error'),
        });
      } else {
        this.guestService.createGuest(formValues).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Salvo!', timer: 1500, showConfirmButton: false });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Não foi possível salvar.', 'error'),
        });
      }
    }
  }

  excluirConvidado(id: number) {
    Swal.fire({
      title: 'Remover convidado?',
      text: 'Ele sumirá da sua lista para eventos futuros.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.guestService.deleteGuest(id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Removido!',
              timer: 1500,
              showConfirmButton: false,
            });
            this.carregarConvidados();
          },
          error: () => Swal.fire('Erro', 'Erro ao excluir.', 'error'),
        });
      }
    });
  }

  // ==========================================
  // FUNÇÕES DE USUÁRIO (MANTIDAS)
  // ==========================================

  getFotoUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `${this.apiUrl}/${cleanPath}?t=${new Date().getTime()}`;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Arquivo muito grande', 'Máximo 2MB.', 'warning');
      return;
    }

    this.userService.uploadAvatar(this.user.id, file).subscribe({
      next: (res: any) => {
        this.user.foto = res.path;
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        Swal.fire({
          icon: 'success',
          title: 'Foto atualizada!',
          timer: 1500,
          showConfirmButton: false,
        });
        setTimeout(() => window.location.reload(), 1500);
      },
      error: (err) => Swal.fire('Erro', 'Falha no envio.', 'error'),
    });
  }
}

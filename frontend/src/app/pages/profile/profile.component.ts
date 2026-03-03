import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { GuestService } from '../../services/guest.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
    `,
  ],
  template: `
    <div class="h-full w-full flex flex-col min-h-0 bg-gray-50">
      <div class="flex-1 flex flex-col min-h-0 w-full px-0 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 flex-shrink-0">
          <div
            class="lg:col-span-3 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col relative pb-8"
          >
            <div class="h-32 bg-gradient-to-r from-indigo-600 to-blue-500"></div>

            <div class="px-6 relative flex-1 flex flex-col items-center text-center">
              <div class="relative -mt-16 mb-4 flex justify-center w-full">
                <div class="relative group">
                  <div
                    class="w-32 h-32 rounded-full border-[6px] border-white bg-white shadow-md overflow-hidden flex items-center justify-center"
                  >
                    <img
                      *ngIf="user?.foto"
                      [src]="avatarUrlFinal"
                      class="w-full h-full object-cover"
                      alt="Foto de perfil"
                    />
                    <div
                      *ngIf="!user?.foto"
                      class="w-full h-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-black uppercase"
                    >
                      {{ (user?.nome_completo || 'U').charAt(0) }}
                    </div>
                  </div>
                  <button
                    (click)="fileInput.click()"
                    class="absolute bottom-1 right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110"
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

              <h1 class="text-2xl font-black text-gray-900 leading-tight">
                {{ user?.nome_completo || 'Carregando...' }}
              </h1>
              <p class="text-sm text-gray-500 mt-0.5">{{ user?.email || user?.username }}</p>

              <p
                class="text-[11px] font-black text-indigo-700 mt-2 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg"
              >
                {{ user?.setor || user?.setor_nome || 'Geral' }}
              </p>

              <div class="mt-6 flex justify-center gap-2">
                <span
                  class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  [class]="
                    user?.perfil === 'ADMIN' || user?.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-indigo-50 text-indigo-700'
                  "
                >
                  {{ user?.perfil || user?.role || 'USER' }}
                </span>
                <span
                  class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700"
                >
                  Conta Ativa
                </span>
              </div>
            </div>
          </div>

          <div class="lg:col-span-2 flex flex-col gap-3 h-full">
            <div
              class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 flex-1"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100"
              >
                <img
                  src="/assets/wtoken_coin.png"
                  alt="W Token Coin"
                  class="w-8 h-8 object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Saldo Atual
                </p>
                <p class="text-3xl font-black text-gray-800 leading-none mt-1">
                  {{ user?.pontos || 0 }} <span class="text-sm font-bold text-gray-400">pts</span>
                </p>
              </div>
            </div>

            <div
              class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 flex-1"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100"
              >
                <img
                  src="/assets/wtokenl_trophy.png"
                  alt="Troféu"
                  class="w-8 h-8 object-contain drop-shadow-sm"
                />
              </div>
              <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Bids Vencidos
                </p>
                <p class="text-3xl font-black text-gray-800 leading-none mt-1">
                  {{ stats.bidsVencidos }}
                </p>
              </div>
            </div>

            <div
              class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 flex-1"
            >
              <div
                class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-3xl border border-blue-100"
              >
                📊
              </div>
              <div>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Média / Lance
                </p>
                <p class="text-3xl font-black text-gray-800 leading-none mt-1">
                  {{ stats.mediaPontos }} <span class="text-sm font-bold text-gray-400">pts</span>
                </p>
              </div>
            </div>
          </div>

          <div
            class="lg:col-span-7 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col"
          >
            <div class="flex justify-between items-start mb-6">
              <div>
                <h3 class="text-lg font-black text-gray-800 tracking-tight">Evolução do Saldo</h3>
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Últimas movimentações reais
                </p>
              </div>

              <div
                class="flex items-center gap-3 text-[9px] font-black tracking-wider text-gray-500 uppercase flex-wrap justify-end"
              >
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Créditos
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Bloqueados
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Gastos
                </div>
              </div>
            </div>

            <div
              *ngIf="historicoPontos.length === 0"
              class="flex-1 flex flex-col items-center justify-center text-gray-400 h-48"
            >
              <span class="text-4xl mb-2 opacity-50 grayscale">📊</span>
              <span class="text-xs font-bold uppercase tracking-wider"
                >Nenhuma movimentação recente</span
              >
            </div>

            <div
              *ngIf="historicoPontos.length > 0"
              class="relative flex-1 flex items-end justify-between gap-3 h-48 mt-auto border-b border-gray-200 pb-6 pt-8"
            >
              <div
                class="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 pt-8"
              >
                <div class="w-full border-t border-dashed border-gray-100"></div>
                <div class="w-full border-t border-dashed border-gray-100"></div>
                <div class="w-full border-t border-dashed border-gray-100"></div>
              </div>

              <div
                *ngFor="let item of historicoPontos"
                class="relative w-full rounded-t-xl group transition-all duration-300 cursor-pointer z-10"
                [ngClass]="{
                  'bg-emerald-200 hover:bg-emerald-400': item.tipo === 'credito',
                  'bg-amber-200 hover:bg-amber-400': item.tipo === 'bloqueado',
                  'bg-rose-200 hover:bg-rose-400': item.tipo === 'gasto',
                }"
                [style.height]="(item.valor / maxPonto) * 100 + '%'"
              >
                <div
                  class="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-black tracking-tight"
                  [ngClass]="{
                    'text-emerald-600': item.tipo === 'credito',
                    'text-amber-600': item.tipo === 'bloqueado',
                    'text-rose-600': item.tipo === 'gasto',
                  }"
                >
                  {{ item.valor }}
                </div>

                <div
                  class="opacity-0 group-hover:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-2 px-3 rounded-lg font-bold pointer-events-none transition-opacity whitespace-nowrap shadow-xl flex flex-col items-center z-50"
                >
                  <span class="text-[9px] text-gray-300 font-medium mb-1 truncate max-w-[150px]">{{
                    item.evento || 'Movimentação'
                  }}</span>
                  <span
                    [ngClass]="{
                      'text-emerald-400': item.tipo === 'credito',
                      'text-amber-400': item.tipo === 'bloqueado',
                      'text-rose-400': item.tipo === 'gasto',
                    }"
                    class="text-xs"
                  >
                    {{ item.tipo === 'credito' ? '+' : '-' }}{{ item.valor }} pts
                  </span>
                  <span class="text-[8px] text-gray-400 font-normal mt-0.5">{{ item.data }}</span>
                </div>

                <div
                  class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 whitespace-nowrap"
                >
                  {{ item.data }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <div
            class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
          >
            <div>
              <h2 class="text-2xl font-black text-gray-800 tracking-tight">
                Meus Convidados (Retirantes)
              </h2>
              <p class="text-sm text-gray-500 mt-1">
                Pessoas autorizadas a retirar seus ingressos ganhos na portaria do evento.
              </p>
            </div>
            <button
              (click)="abrirFormularioConvidado()"
              class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
            >
              <span class="text-lg leading-none">+</span> Adicionar Convidado
            </button>
          </div>

          <div class="overflow-auto flex-1 min-h-0 rounded-2xl border border-gray-100">
            <table class="w-full text-left text-sm text-gray-600">
              <thead
                class="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 border-b border-gray-100 tracking-widest"
              >
                <tr>
                  <th class="px-6 py-4">Nome / Contato</th>
                  <th class="px-6 py-4">CPF</th>
                  <th class="px-6 py-4">Eventos Participados</th>
                  <th class="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngIf="convidados.length === 0">
                  <td colspan="4" class="text-center py-16 text-gray-400 font-medium">
                    <img
                      src="assets/allianz_ticket_blue_cartoon.png"
                      alt=""
                      class="w-12 h-12 object-contain block mb-3 opacity-40 grayscale"
                    />
                    Nenhum convidado cadastrado.
                  </td>
                </tr>
                <tr
                  *ngFor="let conv of convidados"
                  class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td class="px-6 py-4">
                    <p class="font-black text-gray-800 text-sm">{{ conv.nome_completo }}</p>
                    <p class="text-[11px] text-gray-400 font-medium mt-0.5">
                      {{ conv.email || 'Sem e-mail' }} | {{ conv.telefone || 'Sem telefone' }}
                    </p>
                  </td>
                  <td class="px-6 py-4 font-mono text-xs font-medium">{{ conv.cpf }}</td>
                  <td class="px-6 py-4">
                    <span
                      *ngIf="conv.eventos_participados"
                      class="text-gray-600 text-[11px] font-bold italic"
                    >
                      {{ conv.eventos_participados }}
                    </span>
                    <span
                      *ngIf="!conv.eventos_participados"
                      class="text-gray-300 text-[11px] font-medium italic"
                      >Nenhum evento ainda</span
                    >
                  </td>
                  <td class="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      (click)="abrirFormularioConvidado(conv)"
                      class="text-indigo-600 font-black text-[10px] uppercase tracking-widest bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      (click)="excluirConvidado(conv.id)"
                      class="text-rose-600 font-black text-[10px] uppercase tracking-widest bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-lg transition-colors"
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
  apiUrl = environment.apiUri.replace('/api', '');
  convidados: any[] = [];

  stats = { bidsVencidos: 0, mediaPontos: 0 };

  // Atualizado para receber os 3 tipos
  historicoPontos: Array<{
    valor: number;
    tipo: 'credito' | 'gasto' | 'bloqueado';
    data: string;
    evento?: string;
  }> = [];
  maxPonto: number = 300;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private guestService: GuestService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarPerfil();
  }
  avatarUrlFinal: string = '';
  /** Timestamp estável para cache-bust da URL do avatar (evita NG0100). */
  private avatarCacheBust = 0;

  carregarPerfil() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);
      this.user.nome_completo = this.user.nome_completo || this.user.nome;
      this.user.username = this.user.username || this.user.login;
      this.user.role = this.user.role || this.user.perfil || 'user';
      this.avatarUrlFinal = this.getAvatarUrlStable(this.user);
      this.carregarConvidados();
      this.carregarEstatisticas();

      if (this.user.id) {
        this.userService.getById(this.user.id).subscribe({
          next: (fullUser: any) => {
            const usuarioAtualizado = {
              ...fullUser,
              role: fullUser.perfil || fullUser.role || this.user.role,
              setor:
                fullUser.setor || fullUser.setor_nome || this.user.setor || this.user.setor_nome,
              nome_completo: fullUser.nome_completo || fullUser.nome || this.user.nome_completo,
            };
            this.user = usuarioAtualizado;
            localStorage.setItem('currentUser', JSON.stringify(usuarioAtualizado));
            // Atualiza o avatar no próximo ciclo para evitar NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
            setTimeout(() => {
              this.avatarUrlFinal = this.getAvatarUrlStable(this.user);
              this.cd.detectChanges();
            }, 0);
          },
          error: (err) => console.error('Erro ao atualizar perfil:', err),
        });
      }
    } else {
      setTimeout(() => this.carregarPerfil(), 500);
    }
  }

  carregarEstatisticas() {
    if (!this.user || !this.user.id) return;

    if (typeof this.userService.getUserStats === 'function') {
      this.userService.getUserStats(this.user.id).subscribe({
        next: (data) => {
          this.stats = data.stats;

          if (data.historico && Array.isArray(data.historico)) {
            this.historicoPontos = data.historico;
          }

          if (this.historicoPontos && this.historicoPontos.length > 0) {
            const valores = this.historicoPontos.map((h) => h.valor);
            const maiorValor = Math.max(...valores, 50);
            this.maxPonto = Math.ceil(maiorValor * 1.2);
          }

          this.cd.detectChanges();
        },
        error: (err) => console.error('Erro ao carregar estatísticas do usuário', err),
      });
    }
  }

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

  getFotoUrl(path: string) {
    if (!path) return '';
    if (path === 'db') return '';
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/').replace(/^\//, '');
    return `${this.apiUrl}/${cleanPath}?t=${new Date().getTime()}`;
  }

  getAvatarUrl(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    return this.getFotoUrl(user.foto);
  }

  /** Retorna URL do avatar com timestamp estável (evita NG0100 ao atualizar após getById). */
  getAvatarUrlStable(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    if (user.foto.startsWith('http')) return user.foto;
    if (this.avatarCacheBust === 0) this.avatarCacheBust = Date.now();
    const cleanPath = user.foto.replace(/\\/g, '/').replace(/^\//, '');
    return `${this.apiUrl}/${cleanPath}?t=${this.avatarCacheBust}`;
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

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50 py-10">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="h-32 bg-gradient-to-r from-indigo-600 to-blue-500"></div>

          <div class="relative px-6 pb-6">
            <div class="relative -mt-16 mb-6 flex justify-center">
              <div class="relative group">
                <div
                  class="w-32 h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center relative"
                >
                  <img
                    *ngIf="user?.foto"
                    [src]="getFotoUrl(user.foto)"
                    class="w-full h-full object-cover"
                    alt="Foto de perfil"
                  />

                  <div
                    *ngIf="!user?.foto"
                    class="w-full h-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-4xl font-bold uppercase"
                  >
                    {{ (user?.nome_completo || 'U').charAt(0) }}
                  </div>
                </div>

                <button
                  (click)="fileInput.click()"
                  class="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110"
                >
                  📷
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

            <div class="text-center mb-8">
              <h1 class="text-3xl font-bold text-gray-900">
                {{ user?.nome_completo || 'Carregando...' }}
              </h1>
              <p class="text-gray-500">{{ user?.email || user?.username }}</p>

              <div class="mt-4 flex justify-center gap-2">
                <span
                  class="px-3 py-1 rounded-full text-sm font-semibold"
                  [class]="
                    user?.perfil === 'ADMIN' || user?.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-indigo-100 text-indigo-800'
                  "
                >
                  {{ user?.perfil || user?.role || 'USER' }}
                </span>
                <span
                  class="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800"
                >
                  {{ user?.pontos || 0 }} Pontos
                </span>
              </div>
            </div>

            <div class="border-t border-gray-100 pt-6">
              <h3 class="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Setor</label>
                  <input
                    type="text"
                    [value]="user?.setor || 'Setor não identificado'"
                    disabled
                    class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-gray-500"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Login de Rede</label>
                  <input
                    type="text"
                    [value]="user?.username || 'N/A'"
                    disabled
                    class="mt-1 block w-full bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  user: any = null; // Iniciamos como null para facilitar a checagem
  apiUrl = 'http://localhost:3005';

  constructor(
    private userService: UserService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.user = JSON.parse(savedUser);

      // Garante que o objeto tenha as propriedades que o HTML espera
      this.user.nome_completo = this.user.nome_completo || this.user.nome;
      this.user.username = this.user.username || this.user.login;
      // Garante que a role não se perca
      this.user.role = this.user.role || this.user.perfil || 'user';

      if (this.user.id) {
        this.userService.getById(this.user.id).subscribe({
          next: (fullUser: any) => {
            // --- CORREÇÃO DO MENU SUMINDO ---
            // Ao atualizar o usuário com dados do banco, preservamos a ROLE e o TOKEN
            // caso a API de 'getById' não os retorne corretamente.
            const usuarioAtualizado = {
              ...fullUser,
              // Mantém a role antiga se a nova vier vazia
              role: fullUser.perfil || fullUser.role || this.user.role,
              // Mantém o setor antigo se o novo vier vazio
              setor: fullUser.setor || this.user.setor,
              // Garante nome completo
              nome_completo: fullUser.nome_completo || fullUser.nome || this.user.nome_completo,
            };

            this.user = usuarioAtualizado;

            // Salva no storage sem quebrar o layout
            localStorage.setItem('currentUser', JSON.stringify(usuarioAtualizado));
          },
          error: (err) => console.error('Erro ao atualizar perfil:', err),
        });
      }
    }
  }

  carregarPerfil() {
    const savedUser = localStorage.getItem('currentUser');

    if (savedUser) {
      this.user = JSON.parse(savedUser);
      console.log('✅ [Profile] Dados locais carregados:', this.user);

      // Se tivermos o ID, buscamos a versão mais atualizada do banco
      if (this.user?.id) {
        this.userService.getById(this.user.id).subscribe({
          next: (fullUser: any) => {
            this.user = fullUser;
            localStorage.setItem('currentUser', JSON.stringify(fullUser));
          },
          error: (err) => {
            console.error('❌ Erro ao buscar dados completos:', err);
          },
        });
      }
    } else {
      // Caso o redirect da Microsoft ainda esteja processando, tentamos de novo em instantes
      console.warn('⚠️ [Profile] LocalStorage vazio, tentando novamente em 500ms...');
      setTimeout(() => this.carregarPerfil(), 500);
    }
  }

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

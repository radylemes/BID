import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div class="text-center">
          <h2 class="mt-6 text-3xl font-extrabold text-gray-900">Bolão BID ⚽</h2>
          <p class="mt-2 text-sm text-gray-600">Entre para gerenciar seus palpites</p>
        </div>

        <ng-container *ngIf="showAdminLogin">
          <form class="space-y-6" (ngSubmit)="login()">
            <div class="rounded-md shadow-sm -space-y-px">
              <input
                name="username"
                type="text"
                required
                [(ngModel)]="credentials.username"
                class="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Usuário"
                [disabled]="loading"
              />
              <input
                name="password"
                type="password"
                required
                [(ngModel)]="credentials.password"
                class="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                [disabled]="loading"
              />
            </div>

            <button
              type="submit"
              [disabled]="loading"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
            >
              {{ loading ? 'Processando...' : 'Entrar' }}
            </button>
          </form>
        </ng-container>

        <button
          (click)="loginMicrosoft()"
          [disabled]="loading"
          type="button"
          class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors disabled:opacity-50"
        >
          <img
            src="https://learn.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/ms-symbollockup_mssymbol_19.png"
            alt="Microsoft"
            class="h-5 w-5"
          />
          Login
        </button>

        <div class="text-center">
          <button
            (click)="toggleAdminLogin()"
            [disabled]="loading"
            type="button"
            class="text-sm text-gray-500 hover:text-gray-700 focus:outline-none underline disabled:opacity-50"
          >
            {{ showAdminLogin ? 'Ocultar login admin' : 'Login sem Microsoft' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  credentials = { username: '', password: '' };
  loading = false;
  showAdminLogin = false;

  toggleAdminLogin() {
    this.showAdminLogin = !this.showAdminLogin;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const isReturningFromAzure =
      window.location.hash.includes('#') || window.location.search.includes('code=');
    if (!isReturningFromAzure) {
      if (localStorage.getItem('token') || localStorage.getItem('currentUser')) {
        console.log('🧹 Limpeza preventiva de sessão antiga.');
        localStorage.clear();
        sessionStorage.clear();
      }
    }

    this.checkMsRedirect();
  }

  async checkMsRedirect() {
    try {
      // O handleRedirect no AuthService vai processar o token caso ele exista na URL
      await this.authService.handleRedirect();
    } catch (error) {
      console.error('Erro ao processar retorno da Microsoft:', error);
    }
  }

  login() {
    if (!this.credentials.username || !this.credentials.password) {
      Swal.fire('Atenção', 'Preencha todos os campos.', 'warning');
      return;
    }
    this.loading = true;
    this.authService.loginManual(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Erro', err.error?.message || 'Falha na autenticação', 'error');
      },
    });
  }

  loginMicrosoft() {
    this.loading = true;
    // Dispara o redirecionamento total (sai do seu site e vai para a MS)
    this.authService.loginMicrosoft();
  }
}

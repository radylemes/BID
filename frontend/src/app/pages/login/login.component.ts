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
    <div class="w-full max-w-[380px] mx-auto space-y-8">
      <div class="flex flex-col items-center">
        <img
          [src]="wtorreLogoSrc"
          alt="WTorre"
          class="h-10 w-auto object-contain"
          (error)="wtorreLogoSrc = 'assets/wtorre.png'" style="padding-bottom: 10px;height: 45px;"
        />
        <div class="mt-2 w-28 h-0.5 bg-blue-500 rounded-full" aria-hidden="true"></div>
      </div>
      <h2 class="text-xl font-medium text-white text-center">Acesse sua conta</h2>

      <ng-container *ngIf="showAdminLogin">
        <form class="space-y-5" (ngSubmit)="login()">
          <div>
            <label for="email" class="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">E-MAIL</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              </span>
              <input
                id="email"
                name="username"
                type="text"
                required
                [(ngModel)]="credentials.username"
                placeholder="sou@email.com"
                [disabled]="loading"
                class="block w-full rounded-lg border-0 bg-gray-700/80 pl-10 pr-4 py-3 text-base text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">SENHA</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </span>
              <input
                id="password"
                name="password"
                [type]="showPassword ? 'text' : 'password'"
                required
                [(ngModel)]="credentials.password"
                placeholder="••••••••"
                [disabled]="loading"
                class="block w-full rounded-lg border-0 bg-gray-700/80 pl-10 pr-12 py-3 text-base text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none p-1"
                [attr.aria-label]="showPassword ? 'Ocultar senha' : 'Mostrar senha'"
              >
                <svg *ngIf="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <svg *ngIf="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.031 11.117A10.047 10.047 0 002 12c1.274 4.057 5.065 7 9.542 7 1.018 0 2.007-.138 2.945-.398m4.712-4.712L3 3m18 18l-9-9"/></svg>
              </button>
            </div>
            <div class="mt-1.5 flex justify-end">
              <a href="#" class="text-sm text-blue-400 hover:text-blue-300 focus:outline-none">Esqueceu a senha?</a>
            </div>
          </div>

          <button
            type="submit"
            [disabled]="loading"
            class="w-full flex items-center justify-center py-3 px-4 rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1a1f2c] disabled:opacity-50 transition-colors"
          >
            {{ loading ? 'Processando...' : 'Entrar' }}
          </button>
        </form>
      </ng-container>

      <button
        (click)="loginMicrosoft()"
        [disabled]="loading"
        type="button"
        class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-600 bg-gray-700/60 text-base text-white hover:bg-gray-600 font-medium focus:outline-none transition-colors disabled:opacity-50"
      >
        <img
          src="https://learn.microsoft.com/en-us/azure/active-directory/develop/media/howto-add-branding-in-azure-ad-apps/ms-symbollockup_mssymbol_19.png"
          alt="Microsoft"
          class="h-5 w-5 shrink-0"
        />
        <span>Entrar</span>
      </button>

      <div class="text-center pt-1">
        <button
          (click)="toggleAdminLogin()"
          [disabled]="loading"
          type="button"
          class="text-sm text-blue-500 hover:text-blue-400 focus:outline-none underline disabled:opacity-50"
        >
          {{ showAdminLogin ? 'Ocultar login admin' : 'Login sem Microsoft' }}
        </button>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  credentials = { username: '', password: '' };
  loading = false;
  showAdminLogin = false;
  showPassword = false;
  wtorreLogoSrc = 'assets/wtorre.svg';

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

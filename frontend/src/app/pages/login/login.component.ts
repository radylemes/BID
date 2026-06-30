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
    <div class="relative w-[348px]">

      <!-- Linha roxa no topo do card -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-0.5 bg-[#820AD1] rounded-b-sm z-10"></div>

      <!-- Card glassmorphism -->
      <div class="
        w-full
        bg-[rgba(7,10,20,0.70)]
        backdrop-blur-[40px]
        border border-white/[0.08]
        rounded-[22px]
        px-[38px] pt-[42px] pb-[34px]
        flex flex-col items-center
        shadow-[0_0_0_1px_rgba(130,10,209,0.10),0_32px_72px_rgba(0,0,0,0.55)]
      ">

        <!-- Logo BID WTORRE -->
        <img
          src="assets/bid-wtorre-logo.png"
          alt="BID WTORRE - Plataforma Interna"
          class="max-w-[280px] w-full h-auto mb-0"
        />

        <!-- Divisória -->
        <div class="w-full h-px bg-white/[0.08] my-[26px]"></div>

        <!-- Subtítulo -->
        <p class="text-sm text-white/[0.42] mb-[22px]">Acesse sua conta</p>

        <!-- Botão Microsoft -->
        <button
          type="button"
          (click)="loginMicrosoft()"
          [disabled]="loading"
          class="
            w-full flex items-center justify-center gap-2.5
            px-5 py-[13px] mb-2
            bg-white/[0.04] border border-white/[0.11]
            rounded-[11px]
            text-white/90 text-sm font-medium
            hover:bg-white/[0.09] hover:border-white/20 hover:-translate-y-px
            active:translate-y-0
            transition-all duration-200
            disabled:opacity-50
          "
        >
          <svg width="16" height="16" viewBox="0 0 21 21">
            <path fill="#f25022" d="M1 1h9v9H1z"/>
            <path fill="#7fba00" d="M11 1h9v9H11z"/>
            <path fill="#00a4ef" d="M1 11h9v9H1z"/>
            <path fill="#ffb900" d="M11 11h9v9H11z"/>
          </svg>
          Entrar com Microsoft
        </button>

        <!-- Login sem Microsoft (toggle) -->
        <button
          type="button"
          (click)="toggleAdminLogin()"
          [disabled]="loading"
          class="w-full py-2.5 text-sm text-white/[0.42] hover:text-white/90 bg-transparent border-none transition-colors duration-200 disabled:opacity-50"
        >
          {{ showAdminLogin ? 'Ocultar login admin' : 'Login sem Microsoft' }}
        </button>

        <!-- Formulário admin (condicional) -->
        <ng-container *ngIf="showAdminLogin">
          <div class="w-full h-px bg-white/[0.08] my-5"></div>
          <form class="w-full space-y-4" (ngSubmit)="login()">

            <div *ngIf="loginError" role="alert"
              class="w-full flex items-center gap-2 px-3 py-2.5
                     rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ loginError }}
            </div>

            <div>
              <label for="email" class="block text-[11px] font-medium uppercase tracking-widest text-white/40 mb-1.5">E-mail</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </span>
                <input id="email" name="username" type="text" required
                  [(ngModel)]="credentials.username" (ngModelChange)="clearLoginError()"
                  placeholder="seu@email.com"
                  [disabled]="loading"
                  class="w-full rounded-lg bg-white/[0.06] border border-white/[0.08] pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#820AD1] focus:border-[#820AD1] transition-colors"
                />
              </div>
            </div>

            <div>
              <label for="password" class="block text-[11px] font-medium uppercase tracking-widest text-white/40 mb-1.5">Senha</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </span>
                <input id="password" name="password" [type]="showPassword ? 'text' : 'password'" required
                  [(ngModel)]="credentials.password" (ngModelChange)="clearLoginError()"
                  placeholder="••••••••"
                  [disabled]="loading"
                  class="w-full rounded-lg bg-white/[0.06] border border-white/[0.08] pl-9 pr-10 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-[#820AD1] focus:border-[#820AD1] transition-colors"
                />
                <button type="button" (click)="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1">
                  <svg *ngIf="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <svg *ngIf="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878a4.5 4.5 0 106.262 6.262M4.031 11.117A10.047 10.047 0 002 12c1.274 4.057 5.065 7 9.542 7 1.018 0 2.007-.138 2.945-.398m4.712-4.712L3 3m18 18l-9-9"/></svg>
                </button>
              </div>
            </div>

            <button type="submit" [disabled]="loading"
              class="w-full py-2.5 rounded-lg bg-[#820AD1] hover:bg-[#9B20E8] text-white text-sm font-medium transition-colors disabled:opacity-50">
              {{ loading ? 'Processando...' : 'Entrar' }}
            </button>

          </form>
        </ng-container>

      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  credentials = { username: '', password: '' };
  loading = false;
  showAdminLogin = false;
  showPassword = false;
  loginError: string | null = null;

  toggleAdminLogin() {
    this.showAdminLogin = !this.showAdminLogin;
    this.loginError = null;
  }

  clearLoginError() {
    this.loginError = null;
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
    this.loginError = null;
    this.loading = true;
    this.authService.loginManual(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        const user = this.authService.getCurrentUser();
        const role = String(user?.role || user?.perfil || '').toUpperCase();
        this.router.navigate([role === 'PORTARIA' ? '/reception' : '/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.loginError = 'Usuário ou senha inválidos.';
        } else {
          Swal.fire('Erro', err.error?.message || 'Falha na autenticação', 'error');
        }
      },
    });
  }

  loginMicrosoft() {
    this.loading = true;
    this.authService.loginMicrosoft();
  }
}

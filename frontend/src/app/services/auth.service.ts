import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
// 1. Importar o MsalService para gerenciar o popup
import { MsalService } from '@azure/msal-angular';
import { AuthenticationResult } from '@azure/msal-browser';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';
import { ThemeService } from './theme.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUri}/auth`;

  constructor(
    private http: HttpClient,
    private router: Router,
    private msalService: MsalService, // 2. Injetar o MSAL aqui no serviço
    private themeService: ThemeService,
  ) {}

  saveSession(response: any) {
    if (response && response.token) {
      localStorage.setItem('token', response.token);
    }

    if (response && response.user) {
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      this.themeService.initializeFromStorage();
    }
  }

  // LOGIN MANUAL - Perfeito como está
  loginManual(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        this.saveSession(response);
      }),
    );
  }

  // ==========================================================
  // 3. LOGIN MICROSOFT (MELHORADO)
  // ==========================================================

  loginMicrosoft() {
    console.log('🚀 [AuthService] Redirecionando para login Microsoft...');

    // Inicia o fluxo de redirecionamento oficial
    this.msalService.loginRedirect({
      scopes: ['User.Read'],
      prompt: 'select_account',
    });
  }

  // MÉTODO NOVO: Precisa ser chamado quando o usuário volta do redirecionamento
  handleRedirect() {
    this.msalService.handleRedirectObservable().subscribe({
      next: (result: any) => {
        if (result) {
          console.log('✅ Retorno do Redirect com sucesso:', result);
          this.validarNoBackend(result);
        }
      },
      error: (error) => console.error('❌ Erro no retorno do redirect:', error),
    });
  }

  private validarNoBackend(azureResult: any) {
    // Use o idToken se o seu backend estiver esperando os dados do usuário,
    // ou accessToken se estiver usando para chamadas de API.
    const tokenParaEnviar = azureResult.idToken || azureResult.accessToken;

    console.log('📡 Enviando token para o servidor: ', tokenParaEnviar.substring(0, 20) + '...');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${tokenParaEnviar}`,
    });

    this.http.post(`${this.apiUrl}/login-microsoft`, {}, { headers }).subscribe({
      next: (res: any) => {
        console.log('✅ Servidor autorizou o acesso!');
        this.saveSession(res);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('❌ Erro 401 no Backend. O servidor não aceitou o token da MS.', err);
        Swal.fire(
          'Erro de Servidor',
          'O Azure te reconheceu, mas o nosso servidor recusou o acesso (Erro 401).',
          'error',
        );
      },
    });
  }
  getCurrentUser() {
    const u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
  }

  logout() {
    console.log('🚪 [AuthService] Logout iniciado...');

    // 1. Identifica se é usuário Microsoft ANTES de limpar tudo
    // Tenta pegar a conta ativa ou a primeira conta disponível
    let activeAccount = this.msalService.instance.getActiveAccount();
    if (!activeAccount) {
      const accounts = this.msalService.instance.getAllAccounts();
      if (accounts.length > 0) {
        activeAccount = accounts[0];
      }
    }

    // 2. Limpeza local agressiva (Isso resolve o problema dos dados persistirem)
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.clear();
    sessionStorage.clear();

    if (activeAccount) {
      console.log('🛑 Redirecionando para logout Microsoft:', activeAccount.username);
      this.msalService.logoutRedirect({
        account: activeAccount,
        postLogoutRedirectUri: window.location.origin + '/login',
        // REMOVIDO: onRedirectNavigate (causava o erro TS2353)
      });
    } else {
      // Login manual: apenas recarrega a página de login para limpar memória
      this.router.navigate(['/login']).then(() => {
        window.location.reload();
      });
    }
  }
}

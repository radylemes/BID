import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <aside class="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20">
        <div class="h-16 flex items-center px-6 bg-indigo-700 flex-shrink-0">
          <h1 class="text-lg font-bold text-white tracking-widest flex items-center gap-2">
            🏟️ <span>BID <span class="text-indigo-300 font-light">WTORRE</span></span>
          </h1>
        </div>

        <nav class="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p class="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2">
            Principal
          </p>
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-indigo-50 text-indigo-600"
            class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
          >
            <span class="mr-3 text-lg">🏠</span> Início
          </a>
          <a
            routerLink="/minhas-apostas"
            routerLinkActive="bg-indigo-50 text-indigo-600"
            class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
          >
            <span class="mr-3 text-lg">🎫</span> Meus Bids
          </a>

          <div *ngIf="isAdmin">
            <div class="my-4 border-t border-gray-100"></div>
            <p class="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Administração
            </p>
            <a
              routerLink="/users"
              routerLinkActive="bg-indigo-50 text-indigo-600"
              class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <span class="mr-3 text-lg">👤</span> Gerenciar Usuários
            </a>
            <a
              routerLink="/groups"
              routerLinkActive="bg-indigo-50 text-indigo-600"
              class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <span class="mr-3 text-lg">👥</span> Gerenciar Empresas
            </a>
            <a
              routerLink="/matches/manage"
              routerLinkActive="bg-indigo-50 text-indigo-600"
              class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <span class="mr-3 text-lg">🎫</span> Gerenciar Bids
            </a>
          </div>
        </nav>

        <div class="p-4 border-t border-gray-100 bg-gray-50">
          <button
            (click)="logout()"
            class="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <span class="mr-3 text-lg">🚪</span> Sair
          </button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm z-10"
        >
          <h2 class="text-xl font-semibold text-gray-800">{{ pageTitle }}</h2>

          <div class="flex items-center gap-4">
            <a
              routerLink="/profile"
              class="flex items-center gap-3 group hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <div class="text-right hidden md:block">
                <p
                  class="text-sm font-bold text-gray-700 truncate max-w-[150px]"
                  title="{{ userName }}"
                >
                  {{ userName || 'Carregando...' }}
                </p>
                <p
                  class="text-[10px] text-indigo-500 font-bold uppercase tracking-wider group-hover:text-indigo-700"
                >
                  Ver Perfil
                </p>
              </div>

              <div
                class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 overflow-hidden shadow-sm"
              >
                <img
                  *ngIf="fotoUrlCompleta"
                  [src]="fotoUrlCompleta"
                  class="w-full h-full object-cover"
                  alt="Avatar"
                />
                <span *ngIf="!fotoUrlCompleta">{{ userName?.charAt(0) }}</span>
              </div>
            </a>
          </div>
        </header>

        <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class MainLayoutComponent implements OnInit {
  userName: string | null = null;
  fotoUrlCompleta: string | null = null;
  isAdmin: boolean = false;
  apiUrl = 'http://localhost:3005';

  // Variável que guarda o título atual
  pageTitle: string = 'Painel de Controle';

  // Mapa de rotas -> Títulos
  private routeTitles: { [key: string]: string } = {
    '/dashboard': ' ',
    '/minhas-apostas': 'Meus BIDs',
    '/profile': 'Meu Perfil',
    '/users': 'Gerenciamento de Usuários',
    '/groups': 'Empresas',
    '/matches/manage': 'Gestão de Bids',
    '/matches': 'Bids',
  };

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.carregarDados();

    // 1. Define o título inicial ao carregar a página
    this.atualizarTitulo(this.router.url);

    // 2. Escuta mudanças de rota para atualizar o título dinamicamente
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.atualizarTitulo(event.url);
      });

    if (!this.userName) {
      setTimeout(() => this.carregarDados(), 500);
    }
  }

  // Lógica para encontrar o título certo baseado na URL
  atualizarTitulo(url: string) {
    // Procura se a URL atual começa com alguma das chaves do nosso mapa
    // Ex: '/users/import' vai dar match com '/users'
    const key = Object.keys(this.routeTitles).find((path) => url.startsWith(path));

    if (key) {
      this.pageTitle = this.routeTitles[key];
    } else {
      this.pageTitle = 'Painel de Controle'; // Título padrão
    }
  }

  carregarDados() {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const u = JSON.parse(user);
      this.userName = u.nome_completo || u.username;
      this.isAdmin = u.role === 'ADMIN' || u.role === 'admin';

      if (u.foto) {
        this.fotoUrlCompleta = this.getFotoUrl(u.foto);
      }
    }
  }

  getFotoUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    let cleanPath = path.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    return `${this.apiUrl}/${cleanPath}`;
  }

  logout() {
    this.authService.logout();
  }
}

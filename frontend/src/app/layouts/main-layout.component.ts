import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { MatchService } from '../services/match.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
        <div class="bg-white p-3.5 border border-gray-200 shadow-sm">
          <div class="space-y-2">
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-500 font-medium flex items-center gap-1.5"
                ><span class="opacity-80">💰</span> Saldo</span
              >
              <span class="font-black text-emerald-600"
                >{{ saldo | number }}
                <span class="text-[9px] text-gray-400 font-bold">pts</span></span
              >
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-500 font-medium flex items-center gap-1.5"
                ><span class="opacity-80">🔒</span> Em Jogo</span
              >
              <span class="font-black text-amber-500"
                >{{ pontosEmJogo | number }}
                <span class="text-[9px] text-gray-400 font-bold">pts</span></span
              >
            </div>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-500 font-medium flex items-center gap-1.5"
                ><span class="opacity-80">🎫</span> Lances</span
              >
              <span class="font-black text-indigo-600">{{ meusLancesCount }}</span>
            </div>
          </div>
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
            routerLink="/profile"
            routerLinkActive="bg-indigo-50 text-indigo-600"
            class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
          >
            <span class="mr-3 text-lg">👤</span> Meu Perfil
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
              <span class="mr-3 text-lg">👥</span> Gerenciar Usuários
            </a>
            <a
              routerLink="/groups"
              routerLinkActive="bg-indigo-50 text-indigo-600"
              class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <span class="mr-3 text-lg">🏢</span> Gerenciar Empresas
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

        <div class="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          <button
            (click)="logout()"
            class="flex items-center justify-center w-full px-3 py-2 text-sm font-bold text-red-600 bg-white border border-red-100 hover:bg-red-50 rounded-lg transition-colors shadow-sm"
          >
            <span class="mr-2 text-lg">🚪</span> Sair do Sistema
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
export class MainLayoutComponent implements OnInit, OnDestroy {
  userId: number | null = null;
  userName: string | null = null;
  fotoUrlCompleta: string | null = null;
  isAdmin: boolean = false;
  apiUrl = 'http://localhost:3005';

  // Variáveis para a Carteira do Menu
  saldo: number = 0;
  pontosEmJogo: number = 0;
  meusLancesCount: number = 0;

  pageTitle: string = 'Painel de Controle';
  private routeSub!: Subscription;
  private intervalId: any;

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
    private matchService: MatchService, // Adicionado para buscar os dados de pontos
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.atualizarTitulo(this.router.url);

    // Atualiza o título e os dados toda vez que muda de página
    this.routeSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.atualizarTitulo(event.url);
        this.carregarEstatisticasGlobais();
      });

    // Atualiza silenciosamente a cada 5 segundos para refletir lances feitos no Dashboard
    this.intervalId = setInterval(() => {
      this.carregarEstatisticasGlobais();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.intervalId) clearInterval(this.intervalId);
  }

  atualizarTitulo(url: string) {
    const key = Object.keys(this.routeTitles).find((path) => url.startsWith(path));
    this.pageTitle = key ? this.routeTitles[key] : 'Painel de Controle';
  }

  carregarDados() {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const u = JSON.parse(user);
      this.userId = u.id;
      this.userName = u.nome_completo || u.username;
      this.isAdmin = u.role === 'ADMIN' || u.role === 'admin';
      this.saldo = u.pontos || 0;

      if (u.foto) this.fotoUrlCompleta = this.getFotoUrl(u.foto);

      // Carrega os pontos bloqueados e lances ativos
      this.carregarEstatisticasGlobais();
    } else {
      setTimeout(() => this.carregarDados(), 500);
    }
  }

  // ==========================================
  // FUNÇÃO QUE CALCULA A CARTEIRA DO MENU
  // ==========================================
  carregarEstatisticasGlobais() {
    if (!this.userId) return;

    // 1. Atualiza o saldo mais recente do banco
    this.matchService.getBalance(this.userId).subscribe({
      next: (res: any) => {
        this.saldo = res.pontos;
        // Atualiza no localStorage discretamente
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const u = JSON.parse(userStr);
          u.pontos = this.saldo;
          localStorage.setItem('currentUser', JSON.stringify(u));
        }
      },
    });

    // 2. Calcula Pontos Bloqueados e Lances Ativos
    this.matchService.getMatches(this.userId).subscribe({
      next: (matches: any[]) => {
        this.pontosEmJogo = 0;
        this.meusLancesCount = 0;

        matches.forEach((match) => {
          const comprados = Number(match.tickets_comprados) || 0;

          if (match.status === 'ABERTA' && comprados > 0) {
            this.meusLancesCount += comprados;

            if (match.raw_lances) {
              const lancesArray = match.raw_lances.split(',');
              const totalNoEvento = lancesArray.reduce((acc: number, lanceStr: string) => {
                const valor = Number(lanceStr.split(':')[0]) || 0;
                return acc + valor;
              }, 0);
              this.pontosEmJogo += totalNoEvento;
            }
          }
        });
      },
    });
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

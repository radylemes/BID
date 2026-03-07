import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { MatchService } from '../services/match.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-screen bg-[var(--app-bg)] text-[var(--app-text)] font-sans overflow-hidden">
      <!-- Backdrop mobile -->
      <div
        *ngIf="sidebarOpen"
        class="fixed inset-0 bg-black/50 z-10 lg:hidden"
        (click)="closeSidebar()"
        aria-hidden="true"
      ></div>

      <aside
        class="fixed lg:relative inset-y-0 left-0 z-20 w-72 lg:w-64 bg-[var(--color-bg-surface)] border-r border-[var(--app-border)] flex flex-col shadow-sm transition-transform duration-200 ease-out -translate-x-full lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen"
        [class.translate-x-0]="sidebarOpen"
      >
        <div class="relative h-16 flex items-center justify-center px-4 lg:px-6 border-b border-[var(--app-border)] flex-shrink-0">
          <h1 class="text-lg font-bold text-[var(--app-text)] tracking-widest flex items-center">
            <img src="assets/wtorre.svg" alt="WTorre" class="h-5 w-auto object-contain" />
          </h1>
          <button
            type="button"
            class="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-nav-hover-bg)] transition-colors"
            (click)="closeSidebar()"
            aria-label="Fechar menu"
          >
            <span class="text-xl leading-none">×</span>
          </button>
        </div>
        <div class="mx-3 mt-4 mb-2 bg-[var(--color-bg-surface-alt)] p-3.5 rounded-xl border border-[var(--app-border)] shadow-sm">
          <div class="space-y-2">
            <div class="flex justify-between items-center text-xs gap-2">
              <span class="text-[var(--app-text-muted)] font-medium flex items-center gap-1.5 shrink-0">
                <img src="assets/wtoken_coin.png" alt="" class="w-6 h-6 object-contain" /> Saldo</span
              >
              <span class="font-black text-emerald-600"
                >{{ saldo | number }}
                <span class="text-[9px] text-[var(--app-text-muted)] font-bold">pts</span></span
              >
            </div>
            <div class="flex justify-between items-center text-xs gap-2">
              <span class="text-[var(--app-text-muted)] font-medium flex items-center gap-1.5 shrink-0">
                <img src="assets/wtoken_coin_locked.png" alt="" class="w-6 h-6 object-contain" /> Em Jogo</span
              >
              <span class="font-black text-amber-500"
                >{{ pontosEmJogo | number }}
                <span class="text-[9px] text-[var(--app-text-muted)] font-bold">pts</span></span
              >
            </div>
            <div class="flex justify-between items-center text-xs gap-2">
              <span class="text-[var(--app-text-muted)] font-medium flex items-center gap-1.5 shrink-0">
                <img src="assets/wtoken_dice.png" alt="" class="w-6 h-6 object-contain" /> Lances</span
              >
              <span class="font-black text-[var(--color-primary-light)]">{{ meusLancesCount }}</span>
            </div>
          </div>
        </div>

        <nav class="flex-1 py-4 px-3 space-y-1 overflow-y-auto" (click)="closeSidebar()">
          <p class="px-3 text-xs font-black text-[#5f7aa3] uppercase tracking-widest mb-2 mt-3">
            Principal
          </p>
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
            class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
          >
            <span class="mr-3 text-lg">🏠</span> Início
          </a>

          <a
            routerLink="/profile"
            routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
            class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
          >
            <span class="mr-3 text-lg">👤</span> Meu Perfil
          </a>

          <a
            routerLink="/minhas-apostas"
            routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
            class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
          >
            <span class="mr-3 text-lg">🎫</span> Meus Bids
          </a>

          <a
            routerLink="/historico"
            routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
            class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
          >
            <span class="mr-3 text-lg">🏛️</span> Histórico
          </a>

          <div *ngIf="isAdmin">
            <div class="my-4 border-t border-[var(--app-border)]"></div>
            <p class="px-3 text-xs font-black text-[#5f7aa3] uppercase tracking-widest mb-2">
              Administração
            </p>
            <a
              routerLink="/users"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">👥</span> Gerenciar Usuários
            </a>
            <a
              routerLink="/groups"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">🏢</span> Gerenciar Grupos
            </a>
            <a
              routerLink="/matches/manage"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">🎫</span> Gerenciar Bids
            </a>
            <a
              *ngIf="isAdmin || userRole === 'PORTARIA'"
              routerLink="/reception"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">📱</span> App Portaria
            </a>
            <a
              *ngIf="isAdmin"
              routerLink="/auditoria"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">🛡️</span> Auditoria
            </a>
            <a
              *ngIf="isAdmin"
              routerLink="/email/disparo"
              routerLinkActive="bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)] border-l-2 border-[var(--color-primary-light)] pl-2.5"
              class="flex items-center px-3 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-active-text)] transition-colors group"
            >
              <span class="mr-3 text-lg">📧</span> Disparo de E-mails
            </a>
            <a
              *ngIf="isAdmin"
              routerLink="/settings"
              routerLinkActive="bg-indigo-50 text-indigo-600"
              class="flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors group"
            >
              <span class="mr-3 text-lg">⚙️</span> Configurações
            </a>
          </div>
        </nav>

        <div class="p-4 border-t border-[var(--app-border)] bg-[var(--color-bg-surface)] flex flex-col gap-3">
          <button
            (click)="logout()"
            class="flex items-center justify-center w-full px-3 py-2 text-sm font-bold text-red-400 bg-transparent border border-red-500/70 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <span class="mr-2 text-lg">🚪</span> Sair do Sistema
          </button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          class="h-16 bg-[var(--app-surface)] border-b border-[var(--app-border)] flex items-center justify-between gap-3 px-4 lg:px-8 shadow-sm z-10"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              class="lg:hidden flex-shrink-0 p-2 rounded-md text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] transition-colors"
              (click)="toggleSidebar()"
              aria-label="Abrir menu"
            >
              <span class="text-xl leading-none">☰</span>
            </button>
            <h2 class="text-lg lg:text-xl font-semibold text-[var(--app-text)] truncate">{{ pageTitle }}</h2>
          </div>

          <div class="flex items-center gap-4 flex-shrink-0">
            <a
              routerLink="/profile"
              class="flex items-center gap-3 group hover:bg-[var(--app-surface-muted)] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <div class="text-right hidden md:block">
                <p
                  class="text-sm font-bold text-[var(--app-text)] truncate max-w-[150px]"
                  title="{{ userName }}"
                >
                  {{ userName || 'Carregando...' }}
                </p>
                <p
                  class="text-[10px] text-[var(--color-primary-light)] font-bold uppercase tracking-wider group-hover:text-[var(--color-primary)]"
                >
                  Ver Perfil
                </p>
              </div>

              <div
                class="h-10 w-10 rounded-full bg-[var(--color-primary-lighter)] flex items-center justify-center text-[var(--color-primary-dark)] font-bold border border-[var(--app-border)] overflow-hidden shadow-sm"
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

        <main class="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--app-bg)] p-4 lg:p-6">
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
  userRole: string = '';
  apiUrl = environment.apiUri.replace(/\/api\/?$/, '');

  // Variáveis para a Carteira do Menu
  saldo: number = 0;
  pontosEmJogo: number = 0;
  meusLancesCount: number = 0;

  pageTitle: string = 'Painel de Controle';
  sidebarOpen = false;
  private routeSub!: Subscription;
  private intervalId: any;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  // ATUALIZADO COM O TÍTULO DO HISTÓRICO
  private routeTitles: { [key: string]: string } = {
    '/dashboard': ' ',
    '/minhas-apostas': 'Meus BIDs',
    '/profile': 'Meu Perfil',
    '/historico': 'Hall da Fama',
    '/users': 'Gerenciamento de Usuários',
    '/groups': 'Empresas',
    '/matches/manage': 'Gestão de Bids',
    '/matches': 'Bids',
    '/auditoria': 'Logs de Auditoria',
    '/reception': 'App Portaria',
    '/email/disparo': 'Disparo de E-mails',
    '/settings': 'Configurações',
    '/monitor': 'Monitor do Sistema',
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private matchService: MatchService,
    private cd: ChangeDetectorRef,
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
        this.closeSidebar();
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

      if (u.foto) {
        this.fotoUrlCompleta =
          u.foto === 'db' && u.id
            ? `${environment.apiUri}/users/${u.id}/avatar`
            : this.getFotoUrl(u.foto);
      }

      // Pequeno delay para garantir que o token já foi gravado após o login
      setTimeout(() => this.carregarEstatisticasGlobais(), 0);
    } else {
      setTimeout(() => this.carregarDados(), 500);
    }
  }

  // ==========================================
  // FUNÇÃO QUE CALCULA A CARTEIRA DO MENU
  // ==========================================
  carregarEstatisticasGlobais() {
    if (!this.userId || !localStorage.getItem('token')) return;

    // 1. Atualiza o saldo mais recente do banco
    this.matchService.getBalance(this.userId).subscribe({
      next: (res: any) => {
        this.saldo = res.pontos;
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const u = JSON.parse(userStr);
          u.pontos = this.saldo;
          localStorage.setItem('currentUser', JSON.stringify(u));
        }
        this.cd.detectChanges();
      },
      error: () => {},
    });

    // 2. Calcula Pontos Bloqueados e Lances Ativos (mesmo critério do dashboard)
    this.matchService.getMatches(this.userId, true).subscribe({
      next: (matches: any[]) => {
        this.pontosEmJogo = 0;
        this.meusLancesCount = 0;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dadosFiltrados = matches.filter((m: any) => {
          if (!m.data_jogo) return true;
          const dataJogo = new Date(m.data_jogo);
          dataJogo.setHours(0, 0, 0, 0);
          return dataJogo.getTime() >= hoje.getTime();
        });

        dadosFiltrados.forEach((match) => {
          const comprados = Number(match.tickets_comprados) || 0;

          if (match.status === 'ABERTA' && comprados > 0) {
            this.meusLancesCount += comprados;

            if (match.raw_lances) {
              const lancesArray = match.raw_lances.toString().split(',');
              const totalNoEvento = lancesArray.reduce((acc: number, lanceStr: string) => {
                const valor = Number(lanceStr.split(':')[1]) || 0;
                return acc + valor;
              }, 0);
              this.pontosEmJogo += totalNoEvento;
            }
          }
        });
        this.cd.detectChanges();
      },
      error: () => {},
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

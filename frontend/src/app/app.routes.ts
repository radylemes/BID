import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthGuard } from './guards/auth.guard';

// Componentes
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { UserListComponent } from './pages/users/user-list.component';
import { GroupManagerComponent } from './pages/groups/group-manager.component';
import { MatchManagerComponent } from './pages/matches/match-manager.component';
import { MyBetsComponent } from './pages/my-bets/my-bets.component';
import { ReceptionComponent } from './pages/reception/reception.component';
import { ReceptionConfirmedComponent } from './pages/reception/reception-confirmed.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { HistoryComponent } from './pages/history/history.component';
import { AuditComponent } from './pages/audit/audit.component';
import { SystemMonitorComponent } from './pages/system-monitor/system-monitor.component';
import { EmailTemplateEditorComponent } from './pages/email/email-template-editor.component';
import { DisparoEmailsComponent } from './pages/email/disparo-emails.component';
import { TenantsStatusComponent } from './pages/tenants-status/tenants-status.component';
import { PolicyAccessComponent } from './pages/policy/policy-access.component';
import { EventoRhListComponent } from './pages/eventos-rh/evento-rh-list.component';
import { EventoRhManagerComponent } from './pages/eventos-rh/evento-rh-manager.component';
import { RelatoriosComponent } from './pages/relatorios/relatorios.component';
import { ReceptionSupervisorComponent } from './pages/reception/reception-supervisor.component';

export const routes: Routes = [
  {
    path: 'login',
    component: AuthLayoutComponent,
    children: [{ path: '', component: LoginComponent }],
  },

  // ==========================================
  // APP DA PORTARIA (TELA CHEIA)
  // Colocamos fora do MainLayout para não exibir o menu lateral no tablet
  // ==========================================
  {
    path: 'reception/confirmados',
    component: ReceptionConfirmedComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'PORTARIA'] },
  },
  {
    path: 'reception',
    component: ReceptionComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'PORTARIA'] },
  },

  // Política de acesso (lances): tela simples sem menu/header do painel
  {
    path: 'politica-acesso',
    component: PolicyAccessComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'], policyScope: 'bids' },
  },
  {
    path: 'politica-acesso-wt-pass',
    component: PolicyAccessComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN', 'USER'], policyScope: 'wtPass' },
  },

  // ==========================================
  // SISTEMA PRINCIPAL (COM MENU LATERAL)
  // ==========================================
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Tela Inicial (Usuário vê stats e aposta)
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'USER'] } },
      { path: 'eventos-rh', component: EventoRhListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'USER'] } },
      { path: 'eventos-rh/manage', component: EventoRhManagerComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'minhas-apostas', component: MyBetsComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'USER'] } },
      { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'USER'] } },

      // Rotas de Administração
      { path: 'users', component: UserListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'groups', component: GroupManagerComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'matches/manage', component: MatchManagerComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'historico', component: HistoryComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN', 'USER'] } },
      { path: 'settings/templates-email/edit/:id', component: EmailTemplateEditorComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'settings/templates-email/new', component: EmailTemplateEditorComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'email/disparo', component: DisparoEmailsComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'relatorios', component: RelatoriosComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'portaria-supervisor', component: ReceptionSupervisorComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'auditoria', component: AuditComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'monitor', component: SystemMonitorComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
      { path: 'tenants-status', component: TenantsStatusComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN'] } },
    ],
  },

  // Qualquer outra rota não encontrada cai aqui (Vai pro login)
  { path: '**', redirectTo: 'login' },
];

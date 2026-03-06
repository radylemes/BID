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
      { path: 'dashboard', component: DashboardComponent },
      { path: 'minhas-apostas', component: MyBetsComponent },
      { path: 'profile', component: ProfileComponent },

      // Rotas de Administração
      { path: 'users', component: UserListComponent },
      { path: 'groups', component: GroupManagerComponent },
      { path: 'matches/manage', component: MatchManagerComponent },
      { path: 'historico', component: HistoryComponent },
      { path: 'settings/templates-email/edit/:id', component: EmailTemplateEditorComponent, canActivate: [AuthGuard] },
      { path: 'settings/templates-email/new', component: EmailTemplateEditorComponent, canActivate: [AuthGuard] },
      { path: 'email/disparo', component: DisparoEmailsComponent, canActivate: [AuthGuard] },
      { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
      { path: 'auditoria', component: AuditComponent },
      { path: 'monitor', component: SystemMonitorComponent },
      { path: 'tenants-status', component: TenantsStatusComponent, canActivate: [AuthGuard] },
    ],
  },

  // Qualquer outra rota não encontrada cai aqui (Vai pro login)
  { path: '**', redirectTo: 'login' },
];

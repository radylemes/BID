import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
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
import { SettingsComponent } from './pages/settings/settings.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // ==========================================
  // APP DA PORTARIA (TELA CHEIA)
  // Colocamos fora do MainLayout para não exibir o menu lateral no tablet
  // ==========================================
  {
    path: 'reception',
    component: ReceptionComponent,
    canActivate: [AuthGuard], // Protegido! Só entra se estiver logado
    data: { roles: ['ADMIN', 'PORTARIA'] }, // (Opcional) Se o seu AuthGuard validar perfis
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
      { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
    ],
  },

  // Qualquer outra rota não encontrada cai aqui (Vai pro login)
  { path: '**', redirectTo: 'login' },
];

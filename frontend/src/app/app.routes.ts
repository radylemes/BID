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
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
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
      { path: 'users', component: UserListComponent },
      { path: 'groups', component: GroupManagerComponent },

      // Rota Admin para criar jogos
      { path: 'matches/manage', component: MatchManagerComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];

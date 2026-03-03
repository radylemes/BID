import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // Verifica se há restrição de roles na rota
  const requiredRoles = route.data && (route.data['roles'] as string[] | undefined);
  if (requiredRoles && requiredRoles.length > 0) {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      router.navigate(['/login']);
      return false;
    }

    const currentUser = JSON.parse(currentUserStr);
    const userRole = (currentUser.role || currentUser.perfil || '').toUpperCase();
    const hasRole = requiredRoles.map((r) => r.toUpperCase()).includes(userRole);

    if (!hasRole) {
      // Sem permissão para a rota, redireciona para o dashboard
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};

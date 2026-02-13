import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { map, catchError, of } from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const msalService = inject(MsalService);

  // 1. Verifica se já existe o token no localStorage (Login Manual ou Microsoft já concluído)
  const token = localStorage.getItem('token');
  if (token) {
    return true;
  }

  // 2. Se não tem token, verificamos se estamos no meio de um retorno da Microsoft
  // Isso evita que o Guard redirecione para o /login enquanto o handleRedirect ainda processa
  return msalService.handleRedirectObservable().pipe(
    map((result) => {
      // Se result existe, o token será salvo pelo handleRedirect no componente
      // Se não existe result e não tem token no storage, aí sim barramos
      const hasToken = !!localStorage.getItem('token');

      if (hasToken || result) {
        return true;
      }

      console.warn('auth.guard.ts: ⛔ Acesso negado. Redirecionando para login...');
      router.navigate(['/login']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/login']);
      return of(false);
    }),
  );
};

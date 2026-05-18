import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    // Chamadas à API (URL relativa ou absoluta com o mesmo prefixo configurado)
    const apiBase = String(environment.apiUri).replace(/\/+$/, '');
    let isApiRequest = req.url === apiBase || req.url.startsWith(`${apiBase}/`);
    if (!isApiRequest && req.url.startsWith('http')) {
      try {
        const pathOnly = new URL(req.url).pathname;
        const norm = pathOnly.replace(/\/+$/, '') || '/';
        isApiRequest = norm === apiBase || norm.startsWith(`${apiBase}/`);
      } catch {
        /* URL inválida */
      }
    }

    let authReq = req;
    if (token && isApiRequest) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // 403 = permissão/negócio (ex.: edição restrita); não encerrar sessão
        if (error.status === 401) {
          this.authService.logout();
        }
        return throwError(() => error);
      }),
    );
  }
}


import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, from } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/** Pas de refresh/logout forcé sur les routes auth publiques. */
const PUBLIC_AUTH_URL_PARTS = [
  '/auth/token/',
  '/auth/google/',
  '/users/register/',
  '/users/email/verify/',
  '/users/email/resend/',
  '/users/password/reset/',
  '/users/password/reset/validate/',
  '/users/password/reset/confirm/',
];

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private refreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isPublicAuthRequest(req.url)) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status !== 401) {
          return throwError(() => error);
        }
        return this.handle401(req, next);
      }),
    );
  }

  private isPublicAuthRequest(url: string): boolean {
    return PUBLIC_AUTH_URL_PARTS.some((part) => url.includes(part));
  }

  private handle401(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.refreshing) {
      this.refreshing = true;
      this.refreshSubject.next(null);

      return from(this.authService.refreshAccessToken()).pipe(
        switchMap((token) => {
          if (!token) {
            // Session morte : clear sans forcer /login si on est déjà sur register/login
            this.authService.clearSession({ redirectToLogin: !this.authService.isOnPublicAuthPage() });
            return throwError(() => new HttpErrorResponse({ status: 401 }));
          }
          this.refreshSubject.next(token);
          return next.handle(this.addToken(req, token));
        }),
        catchError((err) => {
          this.authService.clearSession({ redirectToLogin: !this.authService.isOnPublicAuthPage() });
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshing = false;
        }),
      );
    }

    return this.refreshSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next.handle(this.addToken(req, token))),
    );
  }

  private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
}

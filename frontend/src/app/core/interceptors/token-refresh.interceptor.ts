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

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private refreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.isAuthRequest(req.url)) {
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

  private isAuthRequest(url: string): boolean {
    return url.includes('/auth/token/');
  }

  private handle401(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.refreshing) {
      this.refreshing = true;
      this.refreshSubject.next(null);

      return from(this.authService.refreshAccessToken()).pipe(
        switchMap((token) => {
          if (!token) {
            this.authService.logout();
            return throwError(() => new HttpErrorResponse({ status: 401 }));
          }
          this.refreshSubject.next(token);
          return next.handle(this.addToken(req, token));
        }),
        catchError((err) => {
          this.authService.logout();
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

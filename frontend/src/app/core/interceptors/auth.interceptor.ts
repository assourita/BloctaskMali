import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints publics : ne jamais coller un Bearer (token expiré → 401 DRF même si AllowAny). */
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
export class AuthInterceptor implements HttpInterceptor {
  
  constructor(private authService: AuthService) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (this.isPublicAuthRequest(req.url)) {
      return next.handle(req);
    }

    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }

  private isPublicAuthRequest(url: string): boolean {
    return PUBLIC_AUTH_URL_PARTS.some((part) => url.includes(part));
  }
}

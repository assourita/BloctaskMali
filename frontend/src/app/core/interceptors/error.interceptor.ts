import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  
  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService
  ) {}
  
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Les composants candidature gèrent leurs propres messages
        if (req.url.includes('/apply/')) {
          return throwError(() => error);
        }

        let message = 'Une erreur est survenue';
        
        if (error.status === 400 && error.error) {
          const body = error.error;
          if (typeof body === 'string') {
            message = body;
          } else if (body.error) {
            message = body.error;
          } else if (body.detail) {
            message = body.detail;
          } else if (body.non_field_errors?.[0]) {
            message = body.non_field_errors[0];
          } else {
            const firstKey = Object.keys(body)[0];
            const val = body[firstKey];
            if (Array.isArray(val) && val[0]) message = String(val[0]);
          }
        } else if (error.status === 401) {
          // Géré par TokenRefreshInterceptor (refresh JWT puis retry)
          return throwError(() => error);
        } else if (error.status === 403) {
          message = 'Accès non autorisé';
        } else if (error.status === 404) {
          message = 'Ressource non trouvée';
        } else if (error.status === 500) {
          message = 'Erreur serveur';
        }
        
        this.snackBar.open(message, 'Fermer', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
        
        return throwError(() => error);
      })
    );
  }
}

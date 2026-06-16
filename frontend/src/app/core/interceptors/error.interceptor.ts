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
        let message = 'Une erreur est survenue';
        
        if (error.status === 401) {
          message = 'Votre session a expiré ou le token est invalide. Veuillez vous reconnecter.';
          this.authService.logout();
          this.router.navigate(['/login'], { 
            queryParams: { 
              message: 'session_expired',
              returnUrl: this.router.url 
            }
          });
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

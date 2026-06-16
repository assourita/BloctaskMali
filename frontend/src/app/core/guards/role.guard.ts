import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const requiredRoles = route.data['roles'] as string[];

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          return this.router.createUrlTree(['/login']);
        }

        if (!requiredRoles) return true;

        // Rôles disponibles = rôle primaire + rôle secondaire activé
        const availableRoles = [user.user_type, user.secondary_role].filter(Boolean) as string[];
        const hasAccess = requiredRoles.some(r => availableRoles.includes(r));

        if (!hasAccess) {
          const activeRole = user.active_role || user.user_type;
          return this.router.createUrlTree([`/${activeRole}`]);
        }

        return true;
      })
    );
  }
}

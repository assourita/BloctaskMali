import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take, switchMap, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileCompleteGuard implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivateChild(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    return this.checkProfile(route);
  }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    return this.checkProfile(route);
  }

  private checkProfile(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    if (route.routeConfig?.path === 'profile') {
      return of(true);
    }

    const role = route.parent?.data?.['roles']?.[0] || this.authService.getActiveRole();
    if (role === 'admin') {
      return of(true);
    }
    const profilePath = `/${role}/profile`;

    return this.authService.isAuthenticated$.pipe(
      take(1),
      switchMap((isAuth) => {
        if (!isAuth) {
          return of(this.router.createUrlTree(['/login']));
        }
        const user = this.authService.getCurrentUser();
        if (user?.can_access_platform === true) {
          return of(true);
        }
        return this.authService.refreshUserProfile().pipe(
          map((u) => {
            if (u.can_access_platform) {
              return true;
            }
            return this.router.createUrlTree([profilePath], {
              queryParams: this.authService.getProfileQueryParams(u),
            });
          }),
        );
      }),
    );
  }
}

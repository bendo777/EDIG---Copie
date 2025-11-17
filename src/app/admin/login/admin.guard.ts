import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { SupabaseService } from 'src/app/shared/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private router: Router, private supabaseService: SupabaseService) {}

  async canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    const user = await this.supabaseService.getUser();

    if (!user) {
      return this.router.createUrlTree(['/login']);
    }

    const role = await this.supabaseService.resolveUserRole(user);
    if (role === 'admin') {
      return true;
    }

    return this.router.createUrlTree(['/bibliotheque']);
  }
}


import { Routes } from '@angular/router';
import { LoginComponent } from './admin/login/login.component';
import { AdminGuard } from './admin/login/admin.guard'; // Import the function

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./admin/login/register.component').then((m) => m.RegisterComponent),
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'admin',
    canActivate: [AdminGuard], // Removed usage
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule),
  },
  {
    path: 'bibliotheque',
    loadChildren: () =>
      import('./user/user-routing.module').then((m) => m.UserRoutingModule),
  },
  { path: '**', redirectTo: 'login' },
];

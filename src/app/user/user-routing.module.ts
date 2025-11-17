import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'collection',
    loadComponent: () =>
      import('./catalog/library.component').then((m) => m.LibraryComponent),
  },
  {
    path: 'nouveautes',
    loadComponent: () =>
      import('./catalog/nouveautes.component').then((m) => m.NouveautesComponent),
  },
  {
    path: 'populaires',
    loadComponent: () =>
      import('./catalog/populaires.component').then((m) => m.PopulairesComponent),
  },
  {
    path: 'compte',
    loadComponent: () =>
      import('./account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: 'niveaux',
    loadComponent: () =>
      import('./levels/levels.component').then((m) => m.LevelsComponent),
  },
  {
    path: 'a-propos',
    loadComponent: () =>
      import('./about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./contact/contact.component').then((m) => m.ContactComponent),
  },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule {}

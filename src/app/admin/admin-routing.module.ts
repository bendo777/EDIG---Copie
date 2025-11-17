import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { UsersComponent } from './users/users.component';
import { AddBookComponent } from './books/add-book/add-book.component';
import { AddUserComponent } from './users/add-user/add-user.component';
import { ListBooksComponent } from './books/list-books/list-books.component';
import { CatalogComponent } from './catalog/catalog.component';
import { AdminGuard } from './login/admin.guard'; // Import the function
import { EditBookComponent } from './books/edit-book/edit-book.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { 
    path: 'books',
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      { path: 'list', component: ListBooksComponent },
      { path: 'add', component: AddBookComponent },
      { path: 'add/:id', component: AddBookComponent }, // Route for editing a book using AddBookComponent (will be removed)
      { path: 'edit/:id', component: EditBookComponent } // New route for editing a book using EditBookComponent
    ]
  },
  { path: 'catalog', component: CatalogComponent },
  { path: 'users', component: UsersComponent },
  { path: 'users/add', component: AddUserComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}


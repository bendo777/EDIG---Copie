import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';

import { DashboardComponent } from './dashboard/dashboard.component';
import { SettingsComponent } from './settings/settings.component';
import { AddUserComponent } from './users/add-user/add-user.component';
import { ListBooksComponent } from './books/list-books/list-books.component';
import { AddBookComponent } from './books/add-book/add-book.component';
import { EditBookComponent } from './books/edit-book/edit-book.component'; // Import the new EditBookComponent

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    AdminRoutingModule,
    ListBooksComponent,
    AddBookComponent, // Keep AddBookComponent in imports for its own routes
    EditBookComponent, // Add EditBookComponent to imports
  ],
  providers: []
})
export class AdminModule { }


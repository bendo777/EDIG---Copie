import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-user',
  templateUrl: './add-user.component.html',
  styleUrls: ['./add-user.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AddUserComponent {
  user = {
    name: '',
    email: '',
    password: ''
  };

  onSubmit() {
    console.log('User to be added:', this.user);
    this.user = {
      name: '',
      email: '',
      password: ''
    };
  }
}

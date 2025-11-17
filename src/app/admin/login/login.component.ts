import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../shared/services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  errorMsg = '';
  loading = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async login() {
    this.loading = true;
    this.errorMsg = '';

    try {
      const { data, error } = await this.supabase.supabase.auth.signInWithPassword({
        email: this.email,
        password: this.password,
      });

      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error('Utilisateur non trouvé');

      const role = await this.supabase.resolveUserRole(user);

      if (role === 'admin') {
        await this.supabase.supabase.auth.setSession(data.session);
        this.router.navigate(['/admin/dashboard']);
        return;
      }

      await this.supabase.supabase.auth.setSession(data.session);
      this.router.navigate(['/bibliotheque']);
    } catch (err: any) {
      this.errorMsg = err.message || 'Erreur de connexion';
    } finally {
      this.loading = false;
    }
  }
}

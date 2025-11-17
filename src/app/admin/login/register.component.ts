import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../shared/services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';

  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private supabase: SupabaseService, private router: Router) {}

  async register(): Promise<void> {
    this.errorMsg = '';
    this.successMsg = '';

    const trimmedName = this.fullName.trim();
    const trimmedEmail = this.email.trim();

    if (!trimmedName) {
      this.errorMsg = 'Veuillez renseigner votre nom complet.';
      return;
    }

    if (!trimmedEmail) {
      this.errorMsg = 'Veuillez renseigner une adresse e-mail valide.';
      return;
    }

    if (this.password.length < 8) {
      this.errorMsg = 'Le mot de passe doit contenir au moins 8 caractères.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.loading = true;

    try {
      const { data, error } = await this.supabase.supabase.auth.signUp({
        email: trimmedEmail,
        password: this.password,
        options: {
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Vérifier si une session a été créée automatiquement
      const { data: sessionData } = await this.supabase.supabase.auth.getSession();
      
      if (sessionData?.session) {
        // Rediriger vers la page d'accueil si la session est active
        this.successMsg = 'Compte créé avec succès ! Redirection en cours...';
        setTimeout(() => {
          this.router.navigate(['/bibliotheque']);
        }, 1000);
      } else {
        // Si confirmation par email est requise
        this.successMsg = 'Compte créé avec succès. Consultez votre boîte mail pour confirmer votre inscription.';
      }
      
      this.fullName = '';
      this.email = '';
      this.password = '';
      this.confirmPassword = '';
    } catch (err: any) {
      this.errorMsg = err?.message ?? "Impossible de créer le compte. Veuillez réessayer.";
    } finally {
      this.loading = false;
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}


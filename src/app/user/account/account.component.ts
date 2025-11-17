import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../shared/services/supabase.service';

interface ProfileDetail {
  label: string;
  value: string;
}

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
})
export class AccountComponent implements OnInit, OnDestroy {
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  profileDetails: ProfileDetail[] = [];
  loading = true;
  error: string | null = null;
  private authSubscription: any;

  readonly navLinks = [
    { label: 'Collection', route: '/bibliotheque/collection' },
    { label: 'Niveaux', route: '/bibliotheque/niveaux' },
    { label: 'Nouveautés', route: '/bibliotheque/nouveautes' },
    { label: 'Populaires', route: '/bibliotheque/populaires' },
    { label: 'À propos', route: '/bibliotheque/a-propos' },
    { label: 'Contacts', route: '/bibliotheque/contact' },
  ];

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        this.navigateToPublic();
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await this.loadUser();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      try {
        this.authSubscription.data.subscription.unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await this.supabaseService.supabase.auth.signOut();
    } catch (err) {
      console.warn('Erreur lors de la déconnexion :', err);
    } finally {
      this.navigateToPublic();
    }
  }

  navigateToCatalog(): void {
    this.router.navigate(['/bibliotheque/collection']);
  }

  private async loadUser(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.user = await this.supabaseService.getUser();
      if (!this.user) {
        this.navigateToPublic();
        return;
      }

      const metadata = this.user.user_metadata || {};
      this.userName = metadata['full_name'] || metadata['name'] || this.user.email?.split('@')[0] || 'Utilisateur';
      this.userEmail = this.user.email || '';
      this.userAvatar =
        metadata['avatar_url'] || metadata['picture'] || this.getDefaultAvatar(this.userName, this.userEmail);

      this.buildProfileDetails(metadata);
    } catch (err) {
      console.error('Erreur lors du chargement du compte utilisateur :', err);
      this.error = "Impossible de récupérer les informations du compte pour le moment.";
    } finally {
      this.loading = false;
    }
  }

  private buildProfileDetails(metadata: Record<string, any>): void {
    const details: ProfileDetail[] = [
      { label: 'Nom complet', value: this.userName || 'Non renseigné' },
      { label: 'Adresse e-mail', value: this.userEmail || 'Non renseignée' },
    ];

    const role = metadata['role'] || metadata['user_role'] || metadata['account_role'];
    if (role) {
      details.push({ label: 'Rôle', value: role });
    }

    const organization = metadata['organization'] || metadata['company'];
    if (organization) {
      details.push({ label: 'Organisation', value: organization });
    }

    const phone = metadata['phone'] || metadata['phone_number'];
    if (phone) {
      details.push({ label: 'Téléphone', value: phone });
    }

    details.push({ label: 'Identifiant Supabase', value: this.user?.id ?? '—' });
    details.push({ label: 'Membre depuis', value: this.formatDate(this.user?.created_at) });
    details.push({ label: 'Dernière connexion', value: this.formatDate(this.user?.last_sign_in_at) });

    this.profileDetails = details;
  }

  private getDefaultAvatar(name: string, email: string): string {
    const displayName = encodeURIComponent(name || email || 'Utilisateur');
    return `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff&size=128`;
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return value;
    }
  }

  private navigateToPublic(): void {
    this.resetUserState();
    this.router.navigate(['/bibliotheque']);
  }

  private resetUserState(): void {
    this.user = null;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
    this.profileDetails = [];
  }
}



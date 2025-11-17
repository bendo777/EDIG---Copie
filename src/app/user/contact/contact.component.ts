import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../shared/services/supabase.service';

declare const feather: any;

interface ContactChannel {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionValue: string;
  actionHref: string;
}

interface OfficeLocation {
  city: string;
  address: string;
  schedule: string;
  contact: string;
}

interface SupportStep {
  step: string;
  title: string;
  detail: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.css'],
})
export class ContactComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  showProfileMenu = false;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  private featherTimeout: any;
  private iconsInitialized = false;

  readonly contactChannels: ContactChannel[] = [
    {
      icon: 'phone-call',
      title: 'Assistance pédagogique',
      description: 'Une question sur les manuels, les ateliers ou les dotations ?',
      actionLabel: 'Appelez-nous',
      actionValue: '+241 01 45 67 89',
      actionHref: 'tel:+24101456789',
    },
    {
      icon: 'mail',
      title: 'Équipe projets & partenariats',
      description: 'Pour les établissements pilotes et les institutions partenaires.',
      actionLabel: 'Envoyer un e-mail',
      actionValue: 'partenariats@edig.ga',
      actionHref: 'mailto:partenariats@edig.ga',
    },
    {
      icon: 'message-circle',
      title: 'Support numérique',
      description: 'Accès plateforme, comptes Supabase, ressources numériques.',
      actionLabel: 'Écrire sur WhatsApp',
      actionValue: '+241 07 88 55 44',
      actionHref: 'https://wa.me/24107885544',
    },
  ];

  readonly officeLocations: OfficeLocation[] = [
    {
      city: 'Libreville',
      address: 'Boulevard Triomphal, Immeuble EDICEF, 3e étage',
      schedule: 'Du lundi au vendredi · 8h30 - 17h30',
      contact: '+241 01 45 67 89',
    },
    {
      city: 'Port-Gentil',
      address: 'Quartier Grand Village, Centre de ressources pédagogiques',
      schedule: 'Mardi & jeudi · 9h - 16h',
      contact: '+241 06 12 34 56',
    },
    {
      city: 'Franceville',
      address: 'Rue de l’IPN, antenne EDIG Franceville',
      schedule: 'Mercredi · 9h30 - 15h',
      contact: '+241 02 98 76 54',
    },
  ];

  readonly supportSteps: SupportStep[] = [
    {
      step: '01',
      title: 'Comprendre vos besoins',
      detail: 'Un point avec votre équipe pédagogique pour cadrer les niveaux, volumes et ressources nécessaires.',
    },
    {
      step: '02',
      title: 'Planifier la dotation',
      detail: 'Nous préparons un plan d’accompagnement : manuels, formations et kits numériques.',
    },
    {
      step: '03',
      title: 'Suivre la mise en œuvre',
      detail: 'Un référent EDIG reste à vos côtés pour mesurer l’impact en classe et ajuster les ressources.',
    },
  ];

  readonly mapImageUrl =
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80';

  currentYear = new Date().getFullYear();

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        await this.loadUser();
      }
    });
  }

  ngAfterViewInit(): void {
    this.scheduleFeatherRefresh();
  }

  ngAfterViewChecked(): void {
    if (!this.iconsInitialized) {
      this.scheduleFeatherRefresh();
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      try {
        this.authSubscription.data.subscription.unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    }
    if (this.featherTimeout) {
      clearTimeout(this.featherTimeout);
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      this.scheduleFeatherRefresh();
    }
  }

  goToAccount(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/bibliotheque/compte']);
  }

  async logout(): Promise<void> {
    this.showProfileMenu = false;
    try {
      await this.supabaseService.supabase.auth.signOut();
    } catch (err) {
      console.warn('Erreur de déconnexion :', err);
    } finally {
      this.resetUserState();
      this.router.navigate(['/bibliotheque']);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: MouseEvent): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  private async loadUser(): Promise<void> {
    this.user = await this.supabaseService.getUser();
    if (this.user) {
      const metadata = this.user.user_metadata || {};
      this.userName = metadata['full_name'] || metadata['name'] || this.user.email?.split('@')[0] || 'Utilisateur';
      this.userEmail = this.user.email || '';
      this.userAvatar = metadata['avatar_url'] || metadata['picture'] || this.getDefaultAvatar(this.userName, this.userEmail);
    } else {
      this.userName = '';
      this.userEmail = '';
      this.userAvatar = '';
    }
  }

  private getDefaultAvatar(name: string, email: string): string {
    const displayName = encodeURIComponent(name || email || 'User');
    return `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff&size=128`;
  }

  private resetUserState(): void {
    this.user = null;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
  }

  toTelLink(phone: string): string {
    if (!phone) {
      return '';
    }
    return `tel:${phone.replace(/\s+/g, '')}`;
  }

  private refreshFeatherIcons(): void {
    this.iconsInitialized = false;
    this.scheduleFeatherRefresh();
  }

  private scheduleFeatherRefresh(): void {
    try {
      if (typeof feather !== 'undefined') {
        if (this.featherTimeout) {
          clearTimeout(this.featherTimeout);
        }
        this.featherTimeout = setTimeout(() => {
          try {
            feather.replace();
            this.iconsInitialized = true;
          } catch {
            // ignore rendering issues
          }
        }, 0);
      }
    } catch {
      // ignore global access errors
    }
  }
}



import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../shared/services/supabase.service';

declare const feather: any;

interface StatCard {
  value: string;
  label: string;
  detail: string;
}

interface PillarCard {
  icon: string;
  title: string;
  description: string;
}

interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

interface ImpactCard {
  title: string;
  points: string[];
  accentClass: string;
}

interface LeaderProfile {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
})
export class AboutComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  showProfileMenu = false;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  private featherTimeout: any;
  private iconsInitialized = false;

  readonly stats: StatCard[] = [
    { value: '150+', label: 'Manuels certifiés', detail: 'du pré-primaire au lycée' },
    { value: '45', label: 'experts pédagogiques', detail: 'engagés sur tout le territoire' },
    { value: '1 200', label: 'enseignants formés', detail: 'aux méthodes EDIG depuis 2020' },
  ];

  readonly pillars: PillarCard[] = [
    {
      icon: '🌍',
      title: 'Conception locale',
      description: 'Nous co-créons chaque collection avec des enseignants gabonais pour refléter la réalité des classes.',
    },
    {
      icon: '🧪',
      title: 'Pédagogie éprouvée',
      description: 'Nos ressources sont testées sur le terrain et améliorées en continu grâce aux retours des équipes.',
    },
    {
      icon: '💡',
      title: 'Innovation accessible',
      description: 'Supports imprimés, contenus numériques, animations : nous facilitons l’usage des outils hybrides.',
    },
  ];

  readonly timeline: TimelineItem[] = [
    {
      year: '2018',
      title: 'Premiers ateliers pilotes',
      description: 'Lancement d’un comité d’auteurs gabonais et premiers tests auprès de 12 écoles partenaires.',
    },
    {
      year: '2020',
      title: 'Plateforme numérique',
      description: 'Mise en ligne de la bibliothèque EDIG pour faciliter l’accès aux manuels et aux ressources à distance.',
    },
    {
      year: '2022',
      title: 'Programme national',
      description: 'Co-construction avec l’IPN de parcours de formation continue pour les enseignants des trois cycles.',
    },
    {
      year: '2024',
      title: 'Accompagnement sur mesure',
      description: 'Déploiement d’équipes dédiées dans chaque province et création d’un centre de ressources itinérant.',
    },
  ];

  readonly impactCards: ImpactCard[] = [
    {
      title: 'Pour les enseignants',
      points: [
        'Séquences clé en main adaptées aux réalités locales',
        'Formations courtes et ateliers sur site toute l’année',
        'Communauté d’échange et retour d’expérience en ligne',
      ],
      accentClass: 'impact-card--teachers',
    },
    {
      title: 'Pour les élèves',
      points: [
        'Activités différenciées pour valoriser chaque progression',
        'Ressources audio et vidéos pour favoriser l’oral et la pratique',
        'Évaluations formatives pour sécuriser les acquis',
      ],
      accentClass: 'impact-card--students',
    },
    {
      title: 'Pour les familles',
      points: [
        'Guides simplifiés pour suivre les apprentissages à la maison',
        'Suggestions d’activités et de projets coopératifs',
        'Newsletter avec conseils pédagogiques trimestriels',
      ],
      accentClass: 'impact-card--families',
    },
  ];

  readonly leadership: LeaderProfile[] = [
    {
      name: 'Olivia Mbadinga',
      role: 'Directrice éditoriale',
      bio: "Coordonne les équipes d’auteurs et garantit l’alignement avec les référentiels nationaux.",
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Rodolphe Nziengui',
      role: 'Responsable innovation pédagogique',
      bio: 'Met en lien les établissements pilotes, supervise les tests utilisateurs et les retours de terrain.',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Samantha Obiang',
      role: 'Cheffe des opérations',
      bio: 'Accompagne les déploiements logistiques, des impressions à la livraison dans les établissements.',
      photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    },
  ];

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



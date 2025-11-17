import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';
import { User } from '@supabase/supabase-js';

declare const feather: any;

interface LevelDetail {
  cycle: string;
  description: string;
  highlights: string[];
  cta: string;
  gradientClass: string;
}

interface SupportCard {
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-levels',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './levels.component.html',
  styleUrls: ['./levels.component.css'],
})
export class LevelsComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  showProfileMenu = false;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  private featherTimeout: any;
  private iconsInitialized = false;
  currentYear = new Date().getFullYear();
  readonly levelDetails: LevelDetail[] = [
    {
      cycle: 'Primaire',
      description:
        "Une progression pas à pas pour consolider les apprentissages fondamentaux : lecture, écriture, mathématiques et découverte du monde. Chaque manuel propose des activités prêtes à l'emploi et motivantes pour la classe.",
      highlights: [
        "Parcours différenciés pour accompagner chaque élève",
        "Fiches d’activités et affichages pour la classe",
        "Supports parents pour prolonger l’apprentissage à la maison",
      ],
      cta: 'Découvrir les manuels du primaire',
      gradientClass: 'level-card--primaire',
    },
    {
      cycle: 'Collège',
      description:
        "Des ressources adaptées aux réalités des adolescents. Projets interdisciplinaires, évaluations personnalisables et ressources audio/vidéo pour dynamiser les apprentissages.",
      highlights: [
        "Projets thématiques prêts à l’emploi",
        "Évaluations et corrigés personnalisables",
        "Ateliers créatifs et activités encadrées",
      ],
      cta: 'Explorer les manuels du collège',
      gradientClass: 'level-card--college',
    },
    {
      cycle: 'Lycée',
      description:
        "Des manuels ancrés dans les programmes officiels des séries générales et technologiques. Dossiers d’actualité, sujets d’entraînement et progressions modulables pour préparer les examens.",
      highlights: [
        "Dossiers d’actualité et sujets d’entraînement",
        "Parcours compétences et ressources d’orientation",
        "Supports numériques pour les cours hybrides",
      ],
      cta: 'Découvrir les manuels du lycée',
      gradientClass: 'level-card--lycee',
    },
  ];

  readonly supportCards: SupportCard[] = [
    {
      title: 'Guides de mise en œuvre',
      description:
        "Des guides détaillés pour chaque cycle, avec des exemples de séquences, des conseils pédagogiques et des outils de différenciation.",
      icon: '📘',
    },
    {
      title: 'Formations et ateliers',
      description:
        "Des sessions en ligne et en présentiel pour découvrir les manuels, partager les pratiques et renforcer les compétences pédagogiques.",
      icon: '🎓',
    },
    {
      title: 'Accompagnement sur mesure',
      description:
        "Un suivi personnalisé pour vos équipes : déploiement, suivi et retour d’expérience en établissement.",
      icon: '🤝',
    },
  ];

  constructor(private supabaseService: SupabaseService, private router: Router) {}

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: MouseEvent): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
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
      try { this.authSubscription.data.subscription.unsubscribe(); } catch { /* ignore */ }
    }
    if (this.featherTimeout) {
      clearTimeout(this.featherTimeout);
    }
  }

  private async loadUser(): Promise<void> {
    this.user = await this.supabaseService.getUser();
    if (this.user) {
      const metadata = (this.user as any).user_metadata || {};
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

  private resetUserState(): void {
    this.user = null;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
  }

  private scheduleFeatherRefresh(): void {
    try {
      if (typeof feather !== 'undefined') {
        this.iconsInitialized = false;
        if (this.featherTimeout) {
          clearTimeout(this.featherTimeout);
        }
        this.featherTimeout = setTimeout(() => {
          try {
            feather.replace();
            this.iconsInitialized = true;
          } catch {
            // ignore errors
          }
        }, 0);
      }
    } catch {
      // ignore global access errors
    }
  }
}

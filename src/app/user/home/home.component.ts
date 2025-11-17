import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../shared/services/supabase.service';
import { User } from '@supabase/supabase-js';

declare const feather: any;

interface NavLink {
  label: string;
  fragment?: string;
  route?: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
}

interface ApproachPoint {
  title: string;
  description: string;
}

interface ValueCard {
  title: string;
  description: string;
  icon: string;
  accentClass: string;
}

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  showProfileMenu = false;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  readonly navLinks: NavLink[] = [
  { label: 'Collection', route: '/bibliotheque/collection' },
    { label: 'Niveaux', route: '/bibliotheque/niveaux' },
    { label: 'Nouveautés', route: '/bibliotheque/nouveautes' },
    { label: 'Populaires', route: '/bibliotheque/populaires' },
    { label: 'À propos', route: '/bibliotheque/a-propos' },
    { label: 'Contacts', route: '/bibliotheque/contact' },
  ];

  readonly levelTabs: readonly string[] = ['Primaire', 'Collège', 'Lycée'];
  selectedLevel = this.levelTabs[0];

  readonly teamMembers: TeamMember[] = [
    {
      name: 'Sandrine Anagilet',
      role: 'Autrice & enseignante',
      description:
        'Chaque collection est co-écrite avec les professeurs gabonais pour refléter notre quotidien en classe.',
    },
    {
      name: 'Josué Ndomba',
      role: 'Coordinateur éditorial',
      description:
        'Les contenus sont relus, testés et certifiés par nos partenaires académiques et associatifs.',
    },
    {
      name: 'Germain Ngazina',
      role: 'Formateur pédagogique',
      description:
        'Nous accompagnons les enseignants avec des parcours de formation et des ateliers terrain.',
    },
  ];

  readonly approachPoints: ApproachPoint[] = [
    {
      title: 'Une approche 100 % par les compétences',
      description:
        'Lecture, écriture, sciences ou mathématiques : chaque manuel guide les élèves pas à pas, avec des activités différenciées et contextualisées.',
    },
    {
      title: 'Des ressources prêtes à projeter',
      description:
        'Tous les supports sont disponibles en version numérique pour vos cours, vos devoirs ou vos révisions collectives.',
    },
    {
      title: 'Des outils pour les familles',
      description:
        'Nous proposons des fiches simplifiées, des podcasts et des pistes d’activités pour prolonger les apprentissages à la maison.',
    },
  ];

  readonly valueCards: ValueCard[] = [
    {
      icon: '🤝',
      title: 'Co-création locale',
      description:
        'Des équipes gabonaises concevant des contenus ancrés dans notre culture et validés par le ministère.',
      accentClass: 'value-card--orange',
    },
    {
      icon: '✍️',
      title: 'Prêts à enseigner',
      description:
        'Des séances clé-en-main, des évaluations et des supports différenciés pour chaque niveau.',
      accentClass: 'value-card--cyan',
    },
    {
      icon: '🎓',
      title: 'Suivi des progrès',
      description:
        'Des indicateurs simples pour suivre la progression et partager les résultats avec les familles.',
      accentClass: 'value-card--pink',
    },
  ];

  readonly newsletterTopics: string[] = [
    'Des ressources inédites chaque mois',
    'Des invitations à nos ateliers pédagogiques',
    "Des témoignages inspirants d'enseignants",
  ];

  currentYear = new Date().getFullYear();

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    // Re-render feather icons for dynamically inserted markup
    if (this.showProfileMenu) {
      this.refreshFeatherIcons();
    }
  }

  goToAccount(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/bibliotheque/compte']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: MouseEvent): void {
    // Fermer le menu si l'utilisateur clique en dehors
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    // Écouter les changements d'authentification
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        await this.loadUser();
      }
    });
  }

  ngAfterViewInit(): void {
    // Rafraîchir les icônes Feather après le rendu de la vue
    this.refreshFeatherIcons();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.data.subscription.unsubscribe();
    }
  }

  private refreshFeatherIcons(): void {
    try {
      if (typeof feather !== 'undefined') {
        setTimeout(() => {
          try {
            feather.replace();
          } catch (err) {
            console.warn('Feather icons replacement error:', err);
          }
        }, 0);
      }
    } catch (err) {
      console.warn('Unable to refresh feather icons:', err);
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

  async logout(): Promise<void> {
    this.showProfileMenu = false;
    try {
      await this.supabaseService.supabase.auth.signOut();
    } catch (err) {
      console.warn('Erreur lors de la déconnexion :', err);
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

  setLevel(level: string): void {
    this.selectedLevel = level;
  }

  getTeamMemberPhoto(index: number): string {
    // Photos de personnes africaines pour les membres de l'équipe
    const photos = [
      'https://cdn.pixabay.com/photo/2022/08/06/11/00/black-woman-7368398_640.jpg', // Sandrine Anagilet - Femme africaine professionnelle
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80', // Josué Ndomba - Coordinateur éditorial (Homme africain professionnel)
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&q=80', // Germain Ngazina - Homme africain souriant
    ];
    return photos[index] || photos[0];
  }
}


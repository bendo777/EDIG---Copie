import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ManualDetailsModalComponent } from 'src/app/shared/components/manual-details-modal/manual-details-modal.component';
import { SupabaseService } from 'src/app/shared/services/supabase.service';
import { RouterModule } from '@angular/router';

declare const feather: any;

interface Manual {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  subject?: string | null;
  description?: string | null;
  image_url?: string | null;
  level_id?: string | null;
  is_new?: boolean | null;
  is_popular?: boolean | null;
  created_at: string;
}

interface Level {
  id: string;
  name: string;
}

type SortOption = 'recent' | 'alphabetical' | 'popular';

@Component({
  selector: 'app-library',
  standalone: true,
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.css'],
  imports: [CommonModule, FormsModule, RouterModule, ManualDetailsModalComponent],
})
export class LibraryComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  showProfileMenu = false;
  readonly navLinks = [
  { label: 'Collection', fragment: 'collections', route: '/bibliotheque/collection' },
    { label: 'Niveaux', route: '/bibliotheque/niveaux' },
    { label: 'Nouveautés', route: '/bibliotheque/nouveautes' },
    { label: 'Populaires', route: '/bibliotheque/populaires' },
    { label: 'À propos', route: '/bibliotheque/a-propos' },
    { label: 'Contacts', route: '/bibliotheque/contact' },
  ];
  // Level tabs used in the hero (same as HomeComponent)
  readonly levelTabs: readonly string[] = ['Primaire', 'Collège', 'Lycée'];
  manuals: Manual[] = [];
  filteredManuals: Manual[] = [];
  levels: Level[] = [];
  subjects: string[] = [];
  recentManuals: Manual[] = [];
  highlightedManuals: Manual[] = [];
  popularManuals: Manual[] = [];

  selectedLevel: string | null = null;
  // Track the selected level name for hero active state
  selectedLevelName: string | null = null;
  selectedSubject: string | null = null;
  searchTerm = '';
  sortOption: SortOption = 'recent';

  selectedManual: Manual | null = null;
  isModalVisible = false;

  stats = {
    totalManuals: 0,
    totalSubjects: 0,
    newManuals: 0,
  };

  currentYear = new Date().getFullYear();
  private featherTimeout: any;

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    // Load user + initial data
    await Promise.all([this.loadUser(), this.loadManuals(), this.loadLevels()]);
    this.updateDerivedData();
    this.isLoading = false;
    this.refreshIcons();

    // Listen to auth changes to update header
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        await this.loadUser();
      }
    });
  }

  ngAfterViewInit(): void {
    this.refreshIcons();
  }

  ngOnDestroy(): void {
    if (this.featherTimeout) {
      clearTimeout(this.featherTimeout);
    }
    if (this.authSubscription) {
      try { this.authSubscription.data.subscription.unsubscribe(); } catch { /* ignore */ }
    }
  }

  async loadUser(): Promise<void> {
    try {
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
    } catch (err) {
      console.warn('Erreur loadUser:', err);
      this.user = null;
      this.userName = '';
      this.userEmail = '';
      this.userAvatar = '';
    }
  }

  private getDefaultAvatar(name: string, email: string): string {
    const displayName = encodeURIComponent(name || email || 'User');
    return `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff&size=128`;
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      setTimeout(() => { try { (window as any).feather?.replace(); } catch { /* ignore */ } }, 0);
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
      console.warn('Logout error', err);
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

  private resetUserState(): void {
    this.user = null;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
  }

  trackByManualId(_index: number, manual: Manual): string {
    return manual.id;
  }

  getLevelName(levelId: string | null | undefined): string {
    if (!levelId) {
      return 'Niveau non défini';
    }
    return (
      this.levels.find((level) => level.id === levelId)?.name ?? 'Niveau non défini'
    );
  }

  setLevel(level: string | null): void {
    // Accept either a level id (from filters) or a level name (from hero tabs)
    if (!level) {
      this.selectedLevel = null;
      this.selectedLevelName = null;
    } else {
      // Try to find a matching level by id or by name (case-insensitive)
      const found = this.levels.find((l) => l.id === level || l.name?.toLowerCase() === level.toLowerCase());
      if (found) {
        this.selectedLevel = found.id;
        this.selectedLevelName = found.name;
      } else {
        // If not found, assume the passed value may be an id; set as selectedLevel
        this.selectedLevel = level;
        this.selectedLevelName = null;
      }
    }

    this.updateDerivedData();
    this.refreshIcons();
  }

  setSubject(subject: string | null): void {
    this.selectedSubject = subject;
    this.updateDerivedData();
    this.refreshIcons();
  }

  setSort(option: SortOption): void {
    this.sortOption = option;
    this.updateDerivedData();
  }

  handleSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.updateDerivedData();
  }

  openManual(manual: Manual): void {
    this.selectedManual = manual;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedManual = null;
  }

  private async loadManuals(): Promise<void> {
    try {
      // Fetch a limited set of fields and limit initial results to speed up first render.
      const { data, error } = await this.supabaseService.supabase
        .from('manuals')
        .select('id,title,author,publisher,subject,description,image_url,level_id,is_new,is_popular,created_at')
        .order('created_at', { ascending: false })
        .limit(48);

      if (error) {
        console.error('Erreur lors du chargement des manuels pour la bibliothèque utilisateur :', error);
        this.manuals = [];
        return;
      }

      this.manuals = (data ?? []).map((manual: any) => ({
        id: manual.id,
        title: manual.title ?? 'Manuel sans titre',
        author: manual.author ?? 'Auteur non renseigné',
        publisher: manual.publisher ?? null,
        subject: manual.subject ?? null,
        description: manual.description ?? null,
        image_url: manual.image_url ?? null,
        level_id: manual.level_id ?? null,
        is_new: manual.is_new ?? false,
        is_popular: manual.is_popular ?? false,
        created_at: manual.created_at ?? new Date().toISOString(),
      }));

      this.subjects = Array.from(
        new Set(
          this.manuals
            .map((manual) => (manual.subject ?? '').trim())
            .filter((subject) => subject)
            .map((subject) => subject.charAt(0).toUpperCase() + subject.slice(1))
        )
      ).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));

      this.recentManuals = this.manuals.slice(0, 4);

      const newManuals = this.manuals.filter((manual) => !!manual.is_new);
      this.highlightedManuals = this.takeWithFallback(newManuals, this.manuals, 4);

      const popularManuals = this.manuals.filter((manual) => !!manual.is_popular);
      this.popularManuals = this.takeWithFallback(popularManuals, this.manuals, 4);
    } catch (err) {
      console.error('Erreur inattendue lors du chargement des manuels :', err);
      this.manuals = [];
    }
  }

  // Optional: allow loading more items on demand (e.g. 'Load more' button or infinite scroll)
  async loadMoreManuals(limit = 48, from = 48): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('manuals')
        .select('id,title,author,publisher,subject,description,image_url,level_id,is_new,is_popular,created_at')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);

      if (error) {
        console.error('Erreur lors du chargement additionnel des manuels :', error);
        return;
      }

      const more = (data ?? []).map((manual: any) => ({
        id: manual.id,
        title: manual.title ?? 'Manuel sans titre',
        author: manual.author ?? 'Auteur non renseigné',
        publisher: manual.publisher ?? null,
        subject: manual.subject ?? null,
        description: manual.description ?? null,
        image_url: manual.image_url ?? null,
        level_id: manual.level_id ?? null,
        is_new: manual.is_new ?? false,
        is_popular: manual.is_popular ?? false,
        created_at: manual.created_at ?? new Date().toISOString(),
      }));

      this.manuals = [...this.manuals, ...more];
      this.updateDerivedData();
    } catch (err) {
      console.error('Erreur inattendue lors du chargement additionnel :', err);
    }
  }

  private async loadLevels(): Promise<void> {
    try {
      const levels = await this.supabaseService.getLevels();
      this.levels = (levels ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    } catch (err) {
      console.error('Erreur lors du chargement des niveaux scolaires :', err);
      this.levels = [];
    }
  }

  private updateDerivedData(): void {
    const term = this.searchTerm.trim().toLowerCase();

    let manuals = [...this.manuals];

    if (this.selectedLevel) {
      manuals = manuals.filter((manual) => manual.level_id === this.selectedLevel);
    }

    if (this.selectedSubject) {
      const normalizedSubject = this.selectedSubject.trim().toLowerCase();
      manuals = manuals.filter((manual) => (manual.subject ?? '').trim().toLowerCase() === normalizedSubject);
    }

    if (term) {
      manuals = manuals.filter((manual) => {
        const haystack = [
          manual.title,
          manual.author,
          manual.publisher,
          manual.subject,
          manual.description,
        ]
          .map((value) => (value ?? '').toLowerCase())
          .join(' ');
        return haystack.includes(term);
      });
    }

    manuals = this.sortManuals(manuals, this.sortOption);
    this.filteredManuals = manuals;

    this.stats = {
      totalManuals: this.manuals.length,
      totalSubjects: this.subjects.length,
      newManuals: this.manuals.filter((manual) => !!manual.is_new).length,
    };
  }

  private sortManuals(manuals: Manual[], option: SortOption): Manual[] {
    const sorted = [...manuals];

    switch (option) {
      case 'alphabetical':
        return sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'fr', { sensitivity: 'base' }));
      case 'popular':
        return sorted.sort((a, b) => {
          const popularScore = Number(!!b.is_popular) - Number(!!a.is_popular);
          if (popularScore !== 0) {
            return popularScore;
          }
          return this.compareByDateDesc(a.created_at, b.created_at);
        });
      case 'recent':
      default:
        return sorted.sort((a, b) => this.compareByDateDesc(a.created_at, b.created_at));
    }
  }

  private compareByDateDesc(dateA: string | null | undefined, dateB: string | null | undefined): number {
    const timeA = dateA ? new Date(dateA).getTime() : 0;
    const timeB = dateB ? new Date(dateB).getTime() : 0;
    return timeB - timeA;
  }

  private takeWithFallback(primary: Manual[], fallback: Manual[], count: number): Manual[] {
    const seen = new Set<string>();
    const result: Manual[] = [];

    for (const manual of primary) {
      if (!manual?.id || seen.has(manual.id)) {
        continue;
      }
      result.push(manual);
      seen.add(manual.id);
      if (result.length === count) {
        return result;
      }
    }

    for (const manual of fallback) {
      if (!manual?.id || seen.has(manual.id)) {
        continue;
      }
      result.push(manual);
      seen.add(manual.id);
      if (result.length === count) {
        break;
      }
    }

    return result;
  }

  private refreshIcons(): void {
    try {
      if (typeof feather !== 'undefined') {
        if (this.featherTimeout) {
          clearTimeout(this.featherTimeout);
        }
        this.featherTimeout = setTimeout(() => {
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
}



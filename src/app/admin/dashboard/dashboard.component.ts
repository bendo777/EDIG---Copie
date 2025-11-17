import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import Chart from 'chart.js/auto'; // Import Chart.js
declare var feather: any; // Declare feather to avoid TypeScript errors
import { SupabaseService, UserLoginActivityPoint } from 'src/app/shared/services/supabase.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ManualDetailsModalComponent } from 'src/app/shared/components/manual-details-modal/manual-details-modal.component';
import { AddBookComponent } from '../books/add-book/add-book.component';
import { UsersComponent } from '../users/users.component';
import { SettingsComponent } from '../settings/settings.component';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { User } from '@supabase/supabase-js';

type RecentActivity = { message: string; created_at: string };

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true, // Make DashboardComponent standalone
  imports: [CommonModule, RouterModule, ManualDetailsModalComponent, AddBookComponent, UsersComponent, SettingsComponent] // Import CommonModule, RouterModule, modal component, add book form, users management
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  isSidebarOpen = false; // State for sidebar visibility
  isNiveauxScolairesOpen = false; // State for Niveaux scolaires sub-menu visibility
  isProfileMenuOpen = false; // State for profile menu dropdown
  recentManuals: any[] = [];
  recentActivities: RecentActivity[] = [];
  lastAddedManual: any | null = null; // Changed to any for now due to mixed activity/manual data
  isModalVisible: boolean = false;
  selectedManual: any | null = null;
  private manualAddedSubscription: Subscription = new Subscription();
  private routerSubscription: Subscription = new Subscription();
  totalManuals: number = 0;
  manualCountsByLevel: { levelName: string; count: number }[] = [];
  private levelChart: Chart | null = null; // Property to store the Chart instance
  manualsEvolutionData: { date: string; count: number }[] = [];
  private manualsEvolutionChart: Chart | null = null; // Property to store the Chart instance for evolution
  userLoginActivity: UserLoginActivityPoint[] = [];
  private userLoginChart: Chart | null = null;
  averageTimeBetweenAdditions: string = 'N/A';
  adminUser: User | null = null; // Store admin user info
  adminName: string = 'Chargement...';
  adminEmail: string = 'Chargement...';
  adminAvatar: string = '';
  adminRole: string = 'Administrateur';
  adminJobTitle: string = '';
  adminPhone: string = '';
  adminOrganization: string = '';
  adminBio: string = '';
  adminLastSignIn: string | null = null;
  activeView: 'overview' | 'manuals' | 'addManual' | 'users' | 'settings' = 'overview';
  previousView: 'overview' | 'manuals' | 'addManual' | 'users' | 'settings' = 'overview';
  editingManual: any | null = null;
  allManuals: any[] = [];
  isManualsLoading = false;
  manualsLoadError: string | null = null;
  private documentClickHandler: ((event: MouseEvent) => void) | null = null;

  constructor(private supabaseService: SupabaseService, private router: Router) { }

  async ngOnInit(): Promise<void> {
    await this.loadAdminInfo();
    this.fetchRecentManuals();
    this.fetchTotalManuals();
    this.fetchManualCountsByLevel(); // Fetch manual counts by level
    this.fetchAverageTimeBetweenAdditions(); // Fetch average time between additions
    this.fetchUserLoginActivity();
    this.manualAddedSubscription = this.supabaseService.manualAdded$.subscribe(() => {
      this.fetchRecentManuals();
      this.fetchTotalManuals();
      this.fetchManualCountsByLevel(); // Update counts when a manual is added
      this.fetchAverageTimeBetweenAdditions(); // Update average time when a manual is added
      if (this.activeView === 'manuals') {
        this.loadAllManuals(true);
      }
    });

    this.supabaseService.subscribeToManualUpdates((payload) => {
      const title = payload?.new?.title || '';
      const msg = `Manuel modifié: ${title}`.trim();
      this.recentActivities = [{ message: msg, created_at: new Date().toISOString() }, ...this.recentActivities].slice(0, 6);
      this.fetchRecentManuals();
      this.fetchManualCountsByLevel();
      if (this.activeView === 'manuals') {
        this.loadAllManuals(true);
      }
    });

    // Subscribe to router events to refresh activities when navigating back to dashboard
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url === '/admin/dashboard') {
          this.fetchRecentManuals();
        }
      });
  }

  ngAfterViewInit(): void {
    feather.replace();
    this.initializeLevelChart(); // Call a method to initialize the chart
    this.updateUserLoginChart();
    // this.initializeManualsEvolutionChart(); // Removed, as we are displaying average time now

    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card, index) => {
      (card as HTMLElement).style.opacity = '0';
      (card as HTMLElement).style.transform = 'translateY(20px)';
      (card as HTMLElement).style.transition = `all 0.5s ease ${index * 0.1}s`;
      
      setTimeout(() => {
        (card as HTMLElement).style.opacity = '1';
        (card as HTMLElement).style.transform = 'translateY(0)';
      }, 100);
    });

    // Add click listener to close profile menu when clicking outside
    this.documentClickHandler = this.handleDocumentClick.bind(this);
    document.addEventListener('click', this.documentClickHandler);
  }

  ngOnDestroy(): void {
    this.manualAddedSubscription.unsubscribe();
    this.routerSubscription.unsubscribe();
    this.supabaseService.unsubscribeFromManualUpdates();
    if (this.userLoginChart) {
      this.userLoginChart.destroy();
      this.userLoginChart = null;
    }
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleNiveauxScolaires(): void {
    this.isNiveauxScolairesOpen = !this.isNiveauxScolairesOpen;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    if (this.isProfileMenuOpen) {
      setTimeout(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    }
  }

  setActiveView(view: 'overview' | 'manuals' | 'addManual' | 'users' | 'settings'): void {
    if (this.activeView === view) {
      if (view === 'manuals') {
        this.loadAllManuals(true);
      }
      return;
    }
    const lastView = this.activeView;
    this.activeView = view;
    this.previousView = lastView;
    if (view === 'manuals') {
      this.loadAllManuals(true);
    }
    if (view === 'addManual' || view === 'users') {
      setTimeout(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    } else if (view === 'settings') {
      setTimeout(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    }
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
  }

  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const profileMenu = document.querySelector('[data-profile-menu]');
    
    if (this.isProfileMenuOpen && profileMenu && !profileMenu.contains(target)) {
      this.closeProfileMenu();
    }
  }

  async loadAdminInfo(): Promise<void> {
    try {
      this.adminUser = await this.supabaseService.getUser();
      if (this.adminUser) {
        // Get name from user_metadata or email
        const metadata = this.adminUser.user_metadata || {};
        const nameFromEmail = this.adminUser.email?.split('@')[0] || 'Admin';
        const profile = await this.supabaseService.getAdminProfileByUserId(this.adminUser.id, this.adminUser.email);

        this.adminName = profile?.full_name ||
                        metadata['full_name'] || 
                        metadata['name'] || 
                        nameFromEmail;
        this.adminEmail = this.adminUser.email || metadata['email'] || '';

        const resolvedRole = profile?.role || metadata['role'];
        const resolvedJobTitle = profile?.job_title || metadata['job_title'];
        this.adminRole = resolvedRole || 'Administrateur';
        this.adminJobTitle = resolvedJobTitle || '';
        this.adminPhone = profile?.phone || metadata['phone'] || metadata['phone_number'] || '';
        this.adminOrganization = profile?.organization || metadata['organization'] || metadata['company'] || '';
        this.adminBio = profile?.bio || metadata['bio'] || '';
        this.adminLastSignIn = this.adminUser.last_sign_in_at || null;

        // Get avatar from profile, user_metadata or use default
        const avatarFromProfile = profile?.avatar_url;
        const avatarFromMetadata = metadata['avatar_url'] || metadata['picture'];
        if (avatarFromProfile) {
          this.adminAvatar = avatarFromProfile;
        } else if (avatarFromMetadata) {
          this.adminAvatar = avatarFromMetadata;
        } else {
          // Generate a simple avatar based on name and email
          this.adminAvatar = this.getDefaultAvatar(this.adminName, this.adminEmail);
        }
        
        // Refresh feather icons after data is loaded
        setTimeout(() => {
          if (typeof feather !== 'undefined') {
            feather.replace();
          }
        }, 100);
      } else {
        console.warn('No admin user found');
      }
    } catch (error) {
      console.error('Error loading admin info:', error);
    }
  }

  getDefaultAvatar(name: string, email: string): string {
    // Generate a simple avatar based on name and email
    const displayName = name || email?.split('@')[0] || 'Admin';
    const hash = (email || name || 'admin').split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const colors = ['4F46E5', '10B981', 'F59E0B', 'EF4444', '3B82F6', 'EC4899', '8B5CF6', '14B8A6'];
    const color = colors[Math.abs(hash) % colors.length];
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${color}&color=fff&size=128&bold=true`;
  }

  async logout(): Promise<void> {
    try {
      // 🟢 SIMPLIFIÉ : Pas besoin d'updateLastSignIn()
      // Supabase enregistre automatiquement last_sign_in dans auth.users
      await this.supabaseService.supabase.auth.signOut();
      this.router.navigate(['/admin/login']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  goToSettings(): void {
    this.setActiveView('settings');
    this.closeProfileMenu();
  }

  viewAllRecentActivity(): void {
    // Implement navigation to a page showing all recent activity or open a modal
    console.log('View all recent activity');
    // Example: this.router.navigate(['/admin/activity']);
  }

  addManual(): void {
    // Implement navigation to a page for adding a manual or open a modal
    console.log('Add a manual');
    this.showAddManualForm();
  }

  generateReport(): void {
    // Implement logic to generate and download a report or open a modal
    console.log('Generate a report');
    // Example: Trigger a service call to generate report
  }

  addUser(): void {
    // Implement navigation to a page for adding a user or open a modal
    console.log('Add a user');
    this.router.navigate(['/admin/users/add']); // Assuming a route exists for adding users
  }

  viewLastAddedManualDetails(): void {
    if (this.lastAddedManual) {
      this.selectedManual = this.lastAddedManual;
      this.isModalVisible = true;
    }
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedManual = null;
  }

  navigateToAddBook(): void {
    this.showAddManualForm();
  }

  goToManualsList(): void {
    this.setActiveView('manuals');
  }

  private async fetchRecentManuals(): Promise<void> {
    try {
      this.recentManuals = await this.supabaseService.getRecentManuals();
      const fromManuals: RecentActivity[] = (this.recentManuals || []).map((m: any) => ({
        message: `Nouveau manuel ajouté: ${m.title ?? ''}`.trim(),
        created_at: m.created_at
      }));
      // Merge with localStorage-based edits, latest first
      let fromLocal: RecentActivity[] = [];
      try {
        const raw = localStorage.getItem('recentActivities');
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) {
          fromLocal = arr.map((x: any) => ({ message: x.message || '', created_at: x.createdAt || new Date().toISOString() }));
        }
      } catch {}
      // Sort by date, newest first, then take first 6
      this.recentActivities = [...fromLocal, ...fromManuals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);

      this.lastAddedManual = this.recentManuals && this.recentManuals.length > 0 ? this.recentManuals[0] : null;
      setTimeout(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    } catch (error) {
      console.error('Error fetching recent manuals:', error);
      this.recentActivities = [];
    }
  }

  private async fetchTotalManuals(): Promise<void> {
    try {
      this.totalManuals = await this.supabaseService.getTotalManualsCount();
    } catch (error) {
      console.error('Error fetching total manuals count:', error);
    }
  }

  private async fetchManualCountsByLevel(): Promise<void> {
    try {
      this.manualCountsByLevel = await this.supabaseService.getManualsCountByLevel();
      this.updateLevelChart(); // Update chart after fetching data
    } catch (error) {
      console.error('Error fetching manual counts by level:', error);
    }
  }

  private async fetchManualsEvolutionData(): Promise<void> {
    try {
      // This method is no longer fetching evolution data for a chart.
      // We keep it as a placeholder or remove it if not needed for other purposes.
      // this.manualsEvolutionData = await this.supabaseService.getManualsEvolutionData();
      // this.updateManualsEvolutionChart();
    } catch (error) {
      console.error('Error fetching manuals evolution data:', error);
    }
  }

  private async fetchAverageTimeBetweenAdditions(): Promise<void> {
    try {
      this.averageTimeBetweenAdditions = await this.supabaseService.getAverageTimeBetweenAdditions();
    } catch (error) {
      console.error('Error fetching average time between additions:', error);
    }
  }

  private async fetchUserLoginActivity(days = 30): Promise<void> {
    try {
      this.userLoginActivity = await this.supabaseService.getUserLoginActivity(days);
      this.updateUserLoginChart();
    } catch (error) {
      console.error('Error fetching user login activity:', error);
    }
  }

  private initializeLevelChart(): void {
    const levelCtx = document.getElementById('levelChart') as HTMLCanvasElement;
    if (levelCtx) {
      this.levelChart = new Chart(levelCtx, {
        type: 'doughnut',
        data: {
          labels: this.manualCountsByLevel.map(item => item.levelName),
          datasets: [{
            data: this.manualCountsByLevel.map(item => item.count),
            backgroundColor: [
              '#4F46E5',
              '#10B981',
              '#F59E0B',
              '#EF4444',
              '#3B82F6',
              '#EC4899'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        }
      });
    }
  }

  private updateLevelChart(): void {
    if (!this.levelChart) {
      const levelCtx = document.getElementById('levelChart') as HTMLCanvasElement;
      if (!levelCtx) return;
      this.levelChart = new Chart(levelCtx, {
        type: 'doughnut',
        data: {
          labels: this.manualCountsByLevel.map(item => item.levelName),
          datasets: [{
            data: this.manualCountsByLevel.map(item => item.count),
            backgroundColor: [
              '#4F46E5',
              '#10B981',
              '#F59E0B',
              '#EF4444',
              '#3B82F6',
              '#EC4899'
            ],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        }
      });
      return;
    }

    this.levelChart.data.labels = this.manualCountsByLevel.map(item => item.levelName);
    this.levelChart.data.datasets[0].data = this.manualCountsByLevel.map(item => item.count);
    this.levelChart.update();
  }

  private updateUserLoginChart(): void {
    const canvas = document.getElementById('userLoginChart') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const labels = this.userLoginActivity.map(point => {
      if (!point?.date) {
        return '';
      }
      const parsed = new Date(point.date);
      if (Number.isNaN(parsed.getTime())) {
        return point.date;
      }
      return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    });

    const dataPoints = this.userLoginActivity.map(point => point?.count ?? 0);

    if (!this.userLoginChart) {
      this.userLoginChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Connexions',
            data: dataPoints,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.12)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 5,
            pointBackgroundColor: '#4F46E5',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            x: {
              ticks: {
                color: '#6b7280',
                maxRotation: 0,
              },
              grid: {
                display: false,
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: '#6b7280',
                stepSize: 1,
                precision: 0,
              },
              grid: {
                color: 'rgba(148, 163, 184, 0.18)',
              },
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const value = context?.parsed?.y ?? 0;
                  const suffix = value > 1 ? ' connexions' : ' connexion';
                  return `${value}${suffix}`;
                },
              },
            },
          },
        },
      });
      return;
    }

    this.userLoginChart.data.labels = labels;
    this.userLoginChart.data.datasets[0].data = dataPoints;
    this.userLoginChart.update();
  }

  // The evolution chart is no longer needed as we are displaying a single average value.
  // private initializeManualsEvolutionChart(): void {
  //   const evolutionCtx = document.getElementById('manualsEvolutionChart') as HTMLCanvasElement;
  //   if (evolutionCtx) {
  //     this.manualsEvolutionChart = new Chart(evolutionCtx, {
  //       type: 'line',
  //       data: {
  //         labels: this.manualsEvolutionData.map(item => item.date),
  //         datasets: [{
  //           label: 'Manuels ajoutés',
  //           data: this.manualsEvolutionData.map(item => item.count),
  //           borderColor: '#4F46E5',
  //           tension: 0.3,
  //           fill: false
  //         }]
  //       },
  //       options: {
  //         responsive: true,
  //         maintainAspectRatio: false,
  //         scales: {
  //           x: { type: 'category' },
  //           y: { beginAtZero: true }
  //         },
  //         plugins: {
  //           legend: {
  //             display: true,
  //             position: 'top',
  //           }
  //         }
  //       }
  //     });
  //   }
  // }

  // private updateManualsEvolutionChart(): void {
  //   if (this.manualsEvolutionChart) {
  //     this.manualsEvolutionChart.data.labels = this.manualsEvolutionData.map(item => item.date);
  //     this.manualsEvolutionChart.data.datasets[0].data = this.manualsEvolutionData.map(item => item.count);
  //     this.manualsEvolutionChart.update();
  //   }
  // }

  private async loadAllManuals(force = false): Promise<void> {
    if (!force && this.allManuals.length > 0) {
      return;
    }

    this.isManualsLoading = true;
    this.manualsLoadError = null;

    try {
      const manuals = await this.supabaseService.getBooks();
      this.allManuals = manuals || [];
    } catch (error) {
      console.error('Error loading manuals list:', error);
      this.manualsLoadError = 'Impossible de charger les manuels pour le moment.';
    } finally {
      this.isManualsLoading = false;
      setTimeout(() => {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      });
    }
  }

  setOverviewView(): void {
    this.setActiveView('overview');
  }

  openManualFromList(manual: any): void {
    if (!manual) {
      return;
    }
    this.selectedManual = manual;
    this.isModalVisible = true;
  }

  showAddManualForm(): void {
    this.editingManual = null;
    this.setActiveView('addManual');
  }

  handleManualFormCancel(): void {
    this.editingManual = null;
    if (this.previousView === 'manuals') {
      this.setActiveView('manuals');
    } else if (this.previousView === 'users') {
      this.setActiveView('users');
    } else if (this.previousView === 'settings') {
      this.setActiveView('settings');
    } else {
      this.setOverviewView();
    }
  }

  async handleManualFormSubmit(_mode: 'create' | 'update'): Promise<void> {
    this.editingManual = null;
    this.setActiveView('manuals');
    await Promise.all([
      this.fetchRecentManuals(),
      this.fetchTotalManuals(),
      this.fetchManualCountsByLevel(),
    ]);
  }

  showEditManualForm(manual: any): void {
    this.editingManual = manual;
    this.setActiveView('addManual');
  }

  goToUsers(): void {
    this.setActiveView('users');
  }

  async deleteManual(manual: any): Promise<void> {
    if (!manual || !manual.id) {
      return;
    }

    const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le manuel "${manual.title ?? ''}" ?`);
    if (!confirmed) {
      return;
    }

    try {
      const { error } = await this.supabaseService.supabase
        .from('manuals')
        .delete()
        .eq('id', manual.id);

      if (error) {
        console.error('Error deleting manual:', error);
        alert('Erreur lors de la suppression du manuel.');
        return;
      }

      this.allManuals = this.allManuals.filter(item => item.id !== manual.id);

      if (this.selectedManual && this.selectedManual.id === manual.id) {
        this.closeModal();
      }

      try {
        const key = 'recentActivities';
        const entry = { message: `Manuel "${manual.title ?? ''}" supprimé.`, createdAt: new Date().toISOString() };
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? [entry, ...arr] : [entry];
        localStorage.setItem(key, JSON.stringify(next.slice(0, 6)));
      } catch (storageError) {
        console.warn('Unable to record deletion activity in localStorage:', storageError);
      }

      await this.fetchRecentManuals();
      await this.fetchTotalManuals();
      await this.fetchManualCountsByLevel();

      alert('Manuel supprimé avec succès !');
    } catch (err) {
      console.error('Unexpected error deleting manual:', err);
      alert('Une erreur inattendue est survenue.');
    }
  }
}

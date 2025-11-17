import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService, AdminUserProfile } from 'src/app/shared/services/supabase.service';

declare const feather: any;

interface AdminUser extends AdminUserProfile {
  statusLabel: string;
  statusLevel: 'active' | 'inactive' | 'invited';
  roleLabel: string;
  initials: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  isLoading = false;
  error: string | null = null;

  searchTerm = '';
  selectedRole = 'all';
  selectedStatus = 'all';

  totalUsers = 0;
  activeUsers = 0;
  invitedUsers = 0;
  rolesSummary: { label: string; value: number }[] = [];

  selectedUser: AdminUser | null = null;
  isDetailsOpen = false;

  constructor(private supabaseService: SupabaseService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const data = await this.supabaseService.getAdminUsers();
      this.users = (data || []).map(user => this.enrichUser(user));
      this.computeSummaries();
      this.applyFilters();
    } catch (err) {
      console.error('Error loading users:', err);
      this.error = 'Impossible de charger les utilisateurs pour le moment.';
    } finally {
      this.isLoading = false;
      this.refreshIcons();
    }
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter(user => {
      const matchesTerm = !term || [
        user.full_name,
        user.email,
        user.organization,
        user.roleLabel,
      ].some(field => field?.toLowerCase().includes(term));

      const matchesRole = this.selectedRole === 'all' || (user.role || '').toLowerCase() === this.selectedRole;
      const matchesStatus = this.selectedStatus === 'all' || user.statusLevel === this.selectedStatus;

      return matchesTerm && matchesRole && matchesStatus;
    });

    this.refreshIcons();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(role: string): void {
    this.selectedRole = role;
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status as any;
    this.applyFilters();
  }

  selectUser(user: AdminUser): void {
    this.selectedUser = user;
    this.isDetailsOpen = true;
    this.refreshIcons();
  }

  closeDetails(): void {
    this.isDetailsOpen = false;
    this.selectedUser = null;
  }

  refresh(): void {
    this.loadUsers();
  }

  trackByUserId(_index: number, user: AdminUser): string {
    return user.id;
  }

  private enrichUser(user: AdminUserProfile): AdminUser {
    const statusInfo = this.computeStatus(user);
    return {
      ...user,
      full_name: user.full_name || user.email || 'Utilisateur',
      role: user.role || 'membre',
      roleLabel: this.getRoleLabel(user.role),
      statusLabel: statusInfo.label,
      statusLevel: statusInfo.level,
      initials: this.getInitials(user.full_name || user.email || 'Utilisateur'),
    };
  }

  private computeSummaries(): void {
    this.totalUsers = this.users.length;
    this.activeUsers = this.users.filter(user => user.statusLevel === 'active').length;
    this.invitedUsers = this.users.filter(user => user.statusLevel === 'invited').length;

    const roleMap = new Map<string, number>();
    this.users.forEach(user => {
      const key = user.roleLabel;
      roleMap.set(key, (roleMap.get(key) || 0) + 1);
    });
    this.rolesSummary = Array.from(roleMap.entries()).map(([label, value]) => ({ label, value }));

    if (this.rolesSummary.length === 0) {
      this.rolesSummary = [
        { label: 'Administrateur', value: 0 },
        { label: 'Utilisateur', value: 0 }
      ];
    } else {
      const roleLabels = new Set(this.rolesSummary.map(r => r.label));
      if (!roleLabels.has('Administrateur')) {
        this.rolesSummary.push({ label: 'Administrateur', value: 0 });
      }
      if (!roleLabels.has('Utilisateur')) {
        this.rolesSummary.push({ label: 'Utilisateur', value: 0 });
      }
      this.rolesSummary.sort((a, b) => a.label.localeCompare(b.label));
    }
  }

  private computeStatus(user: AdminUserProfile): { label: string; level: 'active' | 'inactive' | 'invited' } {
    if (user.status) {
      const normalized = user.status.toLowerCase();
      if (normalized.includes('inv')) {
        return { label: 'Invitation en attente', level: 'invited' };
      }
      if (normalized.includes('act')) {
        return { label: 'Actif', level: 'active' };
      }
      if (normalized.includes('inact')) {
        return { label: 'Inactif', level: 'inactive' };
      }
    }

    if (!user.last_sign_in_at) {
      return { label: 'Jamais connecté', level: 'inactive' };
    }

    const lastSignIn = new Date(user.last_sign_in_at).getTime();
    const daysSince = (Date.now() - lastSignIn) / (1000 * 60 * 60 * 24);

    if (daysSince <= 14) {
      return { label: 'Actif', level: 'active' };
    }
    if (daysSince <= 45) {
      return { label: 'Inactif récent', level: 'inactive' };
    }
    return { label: 'Inactif prolongé', level: 'inactive' };
  }

  private getRoleLabel(role?: string | null): string {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'admin' || normalized === 'administrator') {
      return 'Administrateur';
    }
    return 'Utilisateur';
  }

  private getInitials(value: string): string {
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('');
  }

  private refreshIcons(): void {
    setTimeout(() => {
      try {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      } catch {
        // ignore feather errors when not available
      }
    });
  }
}

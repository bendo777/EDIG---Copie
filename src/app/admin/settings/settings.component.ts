import { Component, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

declare const feather: any;

type FeedbackType = 'success' | 'error' | 'info';

interface FeedbackMessage {
  text: string;
  type: FeedbackType;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class SettingsComponent implements AfterViewInit {
  @Input() mode: 'standalone' | 'embedded' = 'standalone';
  navLinks = [
    { label: 'Tableau de bord', icon: 'home', route: '/admin/dashboard', exact: true },
    { label: 'Manuels', icon: 'book-open', route: '/admin/books/list', exact: false },
    { label: 'Utilisateurs', icon: 'users', route: '/admin/users', exact: true },
    { label: 'Paramètres', icon: 'settings', route: '/admin/settings', exact: true }
  ];

  profileSettings = {
    fullName: 'Administrateur',
    email: 'admin@edig.com',
    organisation: 'ÉDIG',
    phone: ''
  };

  securitySettings = {
    twoFactor: false,
    autoLogoutDelay: 30,
    emailAlerts: true
  };

  notificationSettings = {
    productUpdates: true,
    securityAlerts: true,
    weeklyDigest: false
  };

  appearanceSettings = {
    theme: 'system' as 'light' | 'dark' | 'system',
    density: 'comfortable' as 'comfortable' | 'compact'
  };

  feedback: FeedbackMessage | null = null;
  private feedbackTimeout: any;

  ngAfterViewInit(): void {
    this.refreshIcons();
  }

  saveProfile(): void {
    this.showFeedback('Profil mis à jour avec succès.');
  }

  saveSecurity(): void {
    this.showFeedback('Préférences de sécurité enregistrées.');
  }

  saveNotifications(): void {
    this.showFeedback('Notifications mises à jour.');
  }

  saveAppearance(): void {
    this.showFeedback('Préférences d’affichage sauvegardées.');
  }

  resetPreferences(): void {
    this.notificationSettings = {
      productUpdates: true,
      securityAlerts: true,
      weeklyDigest: false
    };
    this.appearanceSettings = {
      theme: 'system',
      density: 'comfortable'
    };
    this.showFeedback('Préférences réinitialisées.', 'info');
  }

  private showFeedback(text: string, type: FeedbackType = 'success'): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedback = { text, type };
    this.refreshIcons();
    this.feedbackTimeout = setTimeout(() => {
      this.feedback = null;
    }, 4000);
  }

  private refreshIcons(): void {
    setTimeout(() => {
      try {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      } catch {
        /* noop */
      }
    }, 0);
  }
}

import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http'; // Import provideHttpClient
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
// import { AdminGuard } from './admin/login/admin.guard'; // Remove import as it's a functional guard now
import { SupabaseService } from './shared/services/supabase.service';

function initializeApp(supabaseService: SupabaseService) {
  return () => supabaseService.supabase.auth.getSession();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), // Provide HttpClient for potential use in services
    // AdminGuard, // Remove from providers as it's a functional guard
    SupabaseService,
    // Provide default locale for pipes and formatting
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { // APP_INITIALIZER to ensure Supabase session is loaded before app starts
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [SupabaseService],
      multi: true,
    }
  ]
};

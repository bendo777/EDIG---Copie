import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register French locale data so Angular pipes (DatePipe, CurrencyPipe...) work with 'fr-FR'
registerLocaleData(localeFr, 'fr-FR');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

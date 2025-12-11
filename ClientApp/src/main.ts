import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { RootComponent } from './app/root.component';
import { AppComponent } from './app/app.component';
import { StatisticsHomeComponent } from './app/statistics-home/statistics-home.component';
import { StatisticsViewerComponent } from './app/statistics-viewer/statistics-viewer.component';

// Translation loader factory
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

bootstrapApplication(RootComponent, {
  providers: [
    provideAnimations(),
    provideRouter([
      { path: 'statistics', component: StatisticsHomeComponent },
      { path: 'statistics/overview', component: StatisticsViewerComponent },
      { path: 'statistics/leaderboard', component: StatisticsViewerComponent },
      { path: 'statistics/users', component: StatisticsViewerComponent },
      { path: '', component: AppComponent }
    ]),
    provideHttpClient(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
}).catch((err) => {
  // Bootstrap error - silent fail in production
});

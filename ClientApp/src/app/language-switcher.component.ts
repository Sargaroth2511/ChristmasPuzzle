import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher">
      <button 
        type="button" 
        class="lang-btn" 
        [class.active]="currentLang === 'de'"
        (click)="switchLanguage('de')"
        title="Deutsch">
        <img src="assets/flags/de.svg" alt="Deutsch" class="flag-icon">
      </button>
      <button 
        type="button" 
        class="lang-btn" 
        [class.active]="currentLang === 'en'"
        (click)="switchLanguage('en')"
        title="English">
        <img src="assets/flags/en.svg" alt="English" class="flag-icon">
      </button>
    </div>
  `,
  styles: [`
    .language-switcher {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
      background: rgba(0, 20, 60, 0.7);
      padding: 10px 12px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
    }

    .lang-btn {
      border: 2px solid transparent;
      background: transparent;
      cursor: pointer;
      padding: 0;
      border-radius: 6px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .flag-icon {
      width: 32px;
      height: 22px;
      display: block;
      border-radius: 3px;
      transition: all 0.3s ease;
    }

    /* Inactive flag - darker and less visible */
    .lang-btn:not(.active) .flag-icon {
      opacity: 0.4;
      filter: brightness(0.6) saturate(0.5);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    /* Hover on inactive flag */
    .lang-btn:not(.active):hover .flag-icon {
      opacity: 0.7;
      filter: brightness(0.8) saturate(0.7);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      transform: scale(1.05);
    }

    /* Active flag - glowing effect */
    .lang-btn.active .flag-icon {
      opacity: 1;
      filter: brightness(1.1) saturate(1.2);
      box-shadow: 
        0 0 12px rgba(255, 255, 255, 0.7),
        0 0 24px rgba(255, 255, 255, 0.5),
        0 2px 10px rgba(0, 0, 0, 0.3);
    }

    /* Hover on active flag */
    .lang-btn.active:hover .flag-icon {
      transform: scale(1.05);
    }

    @media (max-width: 768px) {
      .language-switcher {
        top: 10px;
        right: 10px;
        padding: 8px 10px;
        gap: 8px;
      }

      .flag-icon {
        width: 28px;
        height: 19px;
      }
    }
  `]
})
export class LanguageSwitcherComponent {
  currentLang: string;

  constructor(private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'de';
    
    // Subscribe to language changes from anywhere in the app
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang = lang;
    
    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', lang);
    
    console.log(`🌍 Language switched to: ${lang}`);
  }
}

# Runtime Language Switching Implementation

## What Changed?

We've switched from **Angular i18n (@angular/localize)** to **ngx-translate** to enable **runtime language switching** with flag icons.

## Key Features

✅ **User's default language** - Automatically loads based on `UserData.language`
✅ **Manual language switching** - Users can click flag icons (🇩🇪 / 🇬🇧) to switch languages
✅ **Persistent preference** - Language choice saved to `localStorage`
✅ **Single build** - One build serves all languages (no separate builds needed)
✅ **Real-time switching** - Language changes immediately without page reload

## How It Works

### 1. Language Detection Priority

```typescript
1. User clicks flag → Save to localStorage → Use that language
2. localStorage has saved preference → Use saved language
3. UserData.language (from backend) → Use user's default language
4. No user data → Default to German
```

### 2. User Flow Example

```
User opens: https://yourdomain.com/?uid=c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f

1. App starts → Default German loaded
2. App calls: GET /api/users/c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f
3. Backend returns: { "language": 1 /* English */ }
4. App checks localStorage: No saved preference
5. App switches to: English (from user data)
6. UI updates: All text now in English
7. User clicks: 🇩🇪 flag
8. App saves to localStorage: "de"
9. App switches to: German
10. UI updates: All text now in German
11. User refreshes page
12. App checks localStorage: "de" found
13. App loads: German (overrides user's English preference)
```

## File Structure

```
ClientApp/
├── src/
│   ├── assets/
│   │   └── i18n/
│   │       ├── de.json      # German translations
│   │       └── en.json      # English translations
│   ├── app/
│   │   ├── app.component.ts              # Uses TranslateService
│   │   ├── app.component.html            # Uses translate pipe
│   │   └── language-switcher.component.ts # Flag buttons
│   └── main.ts                           # TranslateModule configuration
└── package.json                          # ngx-translate dependencies
```

## Translation Files

### German (de.json)
```json
{
  "userInfo": {
    "language": "Sprache:",
    "bestTime": "Beste Zeit:"
  },
  "buttons": {
    "newGame": "Neues Spiel",
    "sendCoins": "Münzen senden"
  },
  "greeting": {
    "personalFormal": "Hallo {{name}}! Schön, dass Sie da sind! 🎄",
    "personalInformal": "Hallo {{name}}! Schön, dass du da bist! 🎄"
  }
}
```

### English (en.json)
```json
{
  "userInfo": {
    "language": "Language:",
    "bestTime": "Best Time:"
  },
  "buttons": {
    "newGame": "New Game",
    "sendCoins": "Send Coins"
  },
  "greeting": {
    "personalFormal": "Hello {{name}}! Great to see you! 🎄",
    "personalInformal": "Hello {{name}}! Great to see you! 🎄"
  }
}
```

## Usage in Templates

### Simple Translation
```html
<p>{{ 'userInfo.language' | translate }}</p>
<!-- Output: "Sprache:" (German) or "Language:" (English) -->
```

### Translation with Parameters
```html
<h2>{{ ('completion.perfect.' + salutationVariant) | translate: { time: formatTime(completionTime) } }}</h2>
<!-- Output (German informal): "🎉 Perfekt! Du hast alle 22 Teile in 2:30 zusammengesetzt!" -->
```
> `salutationVariant` is a component property that resolves to `'informal'` or `'formal'` based on the active user salutation.

### Translation with HTML
```html
<p [innerHTML]="('completion.perfectDescription.' + salutationVariant) | translate"></p>
<!-- Renders HTML like <br> tags -->
```

### Salutation-aware Strings
```html
<h1>{{ ('app.title.' + salutationVariant) | translate }}</h1>
<p>{{ ('hero.description.' + salutationVariant) | translate }}</p>
```
> Use the same pattern for any text that needs formal/informal variants (e.g. `'instructions.drag'`, `'modals.explosionDescription'`).

### Conditional Translation
```html
<button>{{ showDebug ? ('menu.hideGuides' | translate) : ('menu.showGuides' | translate) }}</button>
```

## Usage in TypeScript

```typescript
// Get translation
this.translate.get('greeting.personalFormal', { name: 'John' }).subscribe(text => {
  console.log(text); // "Hello John! Great to see you! 🎄"
});

// Switch language
this.translate.use('en');

// Get current language
const currentLang = this.translate.currentLang; // 'de' or 'en'
```

## Language Switcher Component

The flag buttons are positioned in the top-right corner with proper SVG flag images:

```html
<app-language-switcher></app-language-switcher>
```

**Design Features**:
- **SVG Flags**: High-quality German 🇩🇪 and British 🇬🇧 flag images
- **Active State**: Green border and background highlight for current language
- **Hover Effect**: Scale animation and enhanced shadow on hover
- **Responsive**: Smaller flags on mobile devices
- **Position**: Fixed top-right corner with semi-transparent white background
- **Accessibility**: Proper alt text and title attributes

**Technical Details**:
- Language change detection via `TranslateService.onLangChange` subscription
- Ensures active state stays in sync even when language is changed programmatically
- Flag assets stored in `assets/flags/de.svg` and `assets/flags/en.svg`

## Development & Testing

### Start Development Server
```bash
cd ClientApp
npm start
```
Open: `http://127.0.0.1:4300`

### Test German User
```
?uid=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d (Lars Engels)
Expected: German UI by default
```

### Test English User
```
?uid=c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f (John Beier)
Expected: English UI by default
```

### Test Language Switching
1. Open app with any user
2. Click 🇬🇧 flag → UI switches to English
3. Click 🇩🇪 flag → UI switches to German
4. Refresh page → Last selected language persists

### Clear Saved Preference
```javascript
// In browser console
localStorage.removeItem('preferredLanguage');
location.reload();
```

## Production Build

### Single Build (All Languages Included)
```bash
npm run build
```

Output: `dist/` contains one app bundle with both languages

### Deploy
```
wwwroot/
├── index.html
├── main.js
├── assets/
│   └── i18n/
│       ├── de.json
│       └── en.json
└── api/
```

## Adding New Translations

### Step 1: Add to JSON Files

**de.json:**
```json
{
  "mySection": {
    "myKey": "Deutscher Text mit {{param}}"
  }
}
```

**en.json:**
```json
{
  "mySection": {
    "myKey": "English text with {{param}}"
  }
}
```

### Step 2: Use in Template

```html
<p>{{ 'mySection.myKey' | translate: { param: myValue } }}</p>
```

### Step 3: Test

No rebuild needed! Just refresh the page.

## Migration from @angular/localize

### What Was Removed
- ❌ `@angular/localize` package (completely removed from dependencies)
- ❌ `src/locale/` directory with `messages.xlf` and `messages.en.xlf` files
- ❌ `i18n` attributes in HTML templates
- ❌ `$localize` calls in TypeScript code
- ❌ Separate build configurations for each language in `angular.json`
- ❌ `npm run build:de` and `npm run build:en` scripts from `package.json`
- ❌ i18n-related imports from `polyfills.ts`

### What Was Added
- ✅ `@ngx-translate/core` and `@ngx-translate/http-loader` packages
- ✅ `src/assets/i18n/de.json` and `en.json` translation files
- ✅ `src/assets/flags/de.svg` and `en.svg` flag images
- ✅ `translate` pipe in HTML templates
- ✅ `TranslateService` integration in TypeScript
- ✅ `LanguageSwitcherComponent` with SVG flag icons
- ✅ Single build configuration with runtime language switching

## Advantages of ngx-translate

| Feature | @angular/localize | ngx-translate |
|---------|-------------------|---------------|
| **Runtime switching** | ❌ No | ✅ Yes |
| **Build time** | Separate builds per language | Single build |
| **Bundle size** | Smaller (only one language) | Slightly larger (all languages) |
| **Deploy complexity** | Multiple folders | Single folder |
| **User experience** | Must reload page | Instant switch |
| **Development** | Need to rebuild | Hot reload works |
| **Translation format** | XML (.xlf) | JSON |
| **Ease of translation** | Complex | Simple |

## localStorage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `preferredLanguage` | `'de'` or `'en'` | User's manually selected language |

## Browser Console Commands

### Check Current Language
```javascript
console.log('Current language:', localStorage.getItem('preferredLanguage'));
```

### Force German
```javascript
localStorage.setItem('preferredLanguage', 'de');
location.reload();
```

### Force English
```javascript
localStorage.setItem('preferredLanguage', 'en');
location.reload();
```

### Reset to User Default
```javascript
localStorage.removeItem('preferredLanguage');
location.reload();
```

## Troubleshooting

### Flags not visible
✅ Check that `<app-language-switcher></app-language-switcher>` is in `app.component.html`

### Translations not working
✅ Check browser console for 404 errors loading JSON files
✅ Verify `assets/i18n/de.json` and `en.json` exist

### Language doesn't switch
✅ Check browser console for errors
✅ Verify TranslateModule is configured in `main.ts`

### Wrong language loads
✅ Clear localStorage: `localStorage.removeItem('preferredLanguage')`
✅ Check user data in backend has correct `language` value

## Summary

🎯 **Goal Achieved**: Users get their default language + can manually switch with flag icons

✅ **Default Language**: Loaded from `UserData.language` field
✅ **Manual Switch**: Click 🇩🇪 or 🇬🇧 flags
✅ **Persistent**: Choice saved to localStorage
✅ **Real-time**: No page reload needed
✅ **Simple**: One build, one deployment, easier maintenance

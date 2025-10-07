# Greeting Modal Implementation

## Overview
Implemented a personalized greeting modal that displays when the app loads, showing a customized message based on whether the user's GUID is present in the user.json file.

## User Flow
1. **App loads** → Initial scene starts with cinematic zoom animation
2. **Zoom completes** → Greeting modal appears with personalized message
3. **User clicks "Weiter"** → Greeting modal hides, stag modal appears ("...irgend etwas stimmt mit unserem Hirsch nicht!")
4. **User clicks "Weiter" again** → Game/puzzle begins

## Implementation Details

### TypeScript Changes (`app.component.ts`)

#### New Properties
- `showGreetingModal: boolean` - Controls visibility of the greeting modal
- `greetingMessage: string` - Stores the personalized greeting text

#### New Methods
- `setGreetingMessage(userFound: boolean)` - Generates personalized greeting based on user data
  - If user found: Shows personalized greeting with name, salutation (formal/informal), and language preference
  - If no user: Shows generic welcome message "Willkommen! Viel Spaß beim Puzzle! 🎄"
- `getSalutationPronoun()` - Returns "Sie" or "du" based on user's salutation preference
- `getSalutationVerb()` - Returns "sind" or "bist" to match the pronoun

#### Modified Flow
1. **ngOnInit**: Sets default greeting message if no UID parameter
2. **validateUser**: Calls `setGreetingMessage(true)` on successful validation, `setGreetingMessage(false)` on error
3. **initial-zoom-complete event**: Shows greeting modal instead of stag modal
4. **continueToPuzzle**: 
   - First click: Hides greeting modal, shows stag modal
   - Second click: Hides stag modal, starts puzzle

### HTML Template Changes (`app.component.html`)

Added new greeting modal before the stag modal:
```html
<div class="stag-modal" *ngIf="showGreetingModal && !puzzleComplete">
  <div class="modal-content greeting-modal">
    <h1>{{ greetingMessage }}</h1>
    <p *ngIf="userData">Wir freuen uns, dass {{ getSalutationPronoun() }} wieder da {{ getSalutationVerb() }}!</p>
    <p *ngIf="!userData">Schön, dass du hier bist!</p>
    <button type="button" (click)="continueToPuzzle()">Weiter</button>
  </div>
</div>
```

Updated stag modal condition to only show when greeting modal is hidden:
```html
<div class="stag-modal" *ngIf="showInitialContinueButton && !puzzleComplete && !showGreetingModal">
```

### CSS Changes (`app.component.scss`)

Added `.greeting-modal` styles with gradient background matching the user info box:
- Purple gradient background (`#667eea` → `#764ba2`)
- White text with high contrast
- Semi-transparent white button with hover effects
- Larger heading (1.8rem) for emphasis

## Greeting Message Logic

### For Users with Valid GUID
**German (Informal - du)**
```
Hallo [Name]! Schön, dass du wieder da bist! 🎄
Wir freuen uns, dass du wieder da bist!
```

**German (Formal - Sie)**
```
Hallo [Name]! Schön, dass Sie wieder da sind! 🎄
Wir freuen uns, dass Sie wieder da sind!
```

**English**
```
Hello [Name]! Great to see you again! 🎄
[No secondary message for English currently]
```

### For Users without GUID
```
Willkommen! Viel Spaß beim Puzzle! 🎄
Schön, dass du hier bist!
```

## Visual Style
The greeting modal uses the same visual style as the other modals in the app:
- Full-screen overlay with semi-transparent backdrop
- Centered modal card with rounded corners
- Gradient background for visual appeal
- High z-index (160) to appear above game content
- Smooth "Weiter" button with hover effects

## Testing
To test with different scenarios:
1. **With valid UID**: `?uid=<valid-guid>` - Shows personalized greeting
2. **Without UID**: No query parameter - Shows generic greeting
3. **With invalid UID**: `?uid=invalid` - Shows generic greeting (after validation fails)

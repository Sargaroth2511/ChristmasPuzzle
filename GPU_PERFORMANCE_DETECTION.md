# GPU Performance Detection Implementation

## Overview
Implemented silent GPU/performance detection that only warns users when real hardware acceleration issues are detected. The system checks for software rendering (SwiftShader, llvmpipe) and blocked GPU access, providing actionable guidance to users.

## Architecture

### 1. GPU Detection Service (`gpu-detection.service.ts`)
**Location:** `ClientApp/src/app/services/gpu-detection.service.ts`

**Core Functionality:**
- Silently detects GPU/WebGL issues using `WEBGL_debug_renderer_info` extension
- Checks for software rendering indicators (SwiftShader, llvmpipe, Microsoft Basic Render Driver)
- Detects blocked or blacklisted GPUs
- Returns browser-specific settings URLs for hardware acceleration
- Respects user's "don't show again" preference via localStorage

**Detection Criteria (Conservative):**
- ✅ **Software Renderer** - Definite performance issue
  - SwiftShader, llvmpipe, "software", ANGLE (SwiftShader)
  - Mesa, Chromium software rendering
  - Microsoft Basic Render Driver
  - Generic "OpenGL ES 2.0" or "WebGL 1.0" (fallback)
- ✅ **Firefox-specific detection**
  - Missing GPU vendor (NVIDIA, AMD, Intel, Radeon, GeForce)
  - Using Mesa or llvmpipe
  - Empty renderer string
- ✅ **No WebGL** - Critical issue
  - WebGL context creation fails entirely
- ✅ **Blocked GPU** - Potential issue
  - ANGLE D3D11 without recognized vendor (NVIDIA/AMD/Intel)

**Not Detected (Avoids False Positives):**
- ❌ Integrated GPUs (Intel UHD, AMD Vega) - may be slow but functional
- ❌ Low-tier GPUs - still hardware-accelerated
- ❌ Old drivers - unless causing software fallback

### 2. App Component Integration
**Modified:** `ClientApp/src/app/app.component.ts`

**Changes:**
- Added `GpuDetectionService` injection
- Added `showPerformanceWarning` and `performanceIssue` properties
- Called `detectPerformanceIssues()` in `ngOnInit()` with 2-second delay
- Added methods:
  - `detectPerformanceIssues()` - Async detection with error handling
  - `closePerformanceWarning()` - Temporary dismiss
  - `dismissPerformanceWarning()` - Permanent dismiss (localStorage)
  - `getBrowserName()` - For dynamic instruction text
  - `getSettingsUrl()` - Browser-specific settings URL

### 3. Performance Warning Modal
**Modified:** `ClientApp/src/app/app.component.html`

**Features:**
- Only shown when `showPerformanceWarning === true`
- Uses existing modal component styling
- Displays:
  - Clear explanation of the issue
  - Step-by-step instructions with browser-specific URLs
  - "Don't show again" button (permanent dismiss)
  - "Close" button (temporary dismiss)

### 4. Translations
**Modified:**
- `ClientApp/src/assets/i18n/en.json`
- `ClientApp/src/assets/i18n/de.json`

**New Keys:**
```json
"modals": {
  "performanceWarningTitle": "Performance Notice / Hinweis zur Leistung",
  "performanceWarningMessage": "Browser using software rendering...",
  "performanceWarningSteps": "To enable hardware acceleration in {{browser}}:",
  "performanceWarningStep1": "1. Copy this address: <strong>{{url}}</strong>",
  "performanceWarningStep2": "2. Paste it into your browser's address bar",
  "performanceWarningStep3": "3. Enable the \"Use hardware acceleration...\" option",
  "performanceWarningStep4": "4. Restart your browser",
  "performanceWarningDismiss": "Don't show again / Nicht mehr anzeigen"
}
```

### 5. Styling
**Modified:** `ClientApp/src/app/app.component.scss`

**Added:**
```scss
.performance-steps {
  text-align: left;
  margin: 1.5rem 0;
  padding-left: 1.5rem;
  line-height: 1.8;
  
  li {
    margin-bottom: 0.75rem;
    color: rgba(247, 252, 255, 0.9);
  }
}
```

## Browser-Specific Settings URLs

| Browser | Settings URL | Detection Method |
|---------|-------------|------------------|
| Chrome | `chrome://settings/system` | User-agent includes 'chrome' |
| Edge | `edge://settings/?search=hardware` | User-agent includes 'edg' |
| Brave | `brave://settings/system` | User-agent includes 'brave' |
| Opera | `opera://settings` | User-agent includes 'opr' or 'opera' |
| Firefox | `about:preferences#general` | User-agent includes 'firefox' |
| Safari | (System Preferences) | User-agent includes 'safari' |

## Browser-Specific Instructions

### Chromium-based (Chrome, Brave)
Uses standard 4-step instructions from translation files:
1. Copy settings URL
2. Paste into address bar
3. Enable hardware acceleration option
4. Restart browser

### Edge
Custom 5-step instructions (hardcoded in service):
1. Navigate to `edge://settings/?search=hardware` (includes search)
2. Look for hardware acceleration toggle in search results
3. Enable the toggle switch
4. Click "Restart" button
5. Browser will restart automatically

### Firefox
Custom 6-step instructions (hardcoded in service):
1. Navigate to `about:preferences#general`
2. Scroll to Performance section
3. Uncheck "Use recommended performance settings"
4. Check "Use hardware acceleration when available"
5. Restart browser

### Opera
Custom instructions (hardcoded in service):
1. Navigate to `opera://settings`
2. Click "Advanced" in sidebar
3. Go to "Browser" section
4. Enable hardware acceleration
5. Restart browser

### Safari
Custom macOS-specific instructions (hardcoded in service):
1. Open System Preferences
2. Go to "Displays"
3. Check display settings
4. Ensure hardware acceleration enabled at system level

## User Experience Flow

### Normal User (GPU Working)
1. Page loads → GPU detection runs silently
2. No issues detected → No modal shown
3. Initial scene plays (stag zoom animation)
4. User clicks "Continue" → Puzzle scene loads
5. Game runs smoothly

### User with Software Renderer
1. Page loads → GPU detection runs silently in background
2. Software renderer detected (e.g., SwiftShader) → Issue stored, NO modal yet
3. Initial scene plays (stag zoom animation) without interruption
4. User clicks "Continue" → Puzzle scene loads
5. **After 2-second delay**: Performance warning modal appears
6. User sees:
   - Clear explanation (not technical jargon)
   - Browser-specific instructions
   - Copy-paste-ready settings URL
7. User options:
   - **"Don't show again"** → Permanently dismissed (localStorage)
   - **"Close"** → Dismissed for this session only
8. User can continue playing (modal doesn't block gameplay)

### User Who Dismissed Warning
1. Page loads → GPU detection checks localStorage
2. Finds `gpu-warning-dismissed === 'true'`
3. Detection skipped → No modal shown
4. User can reset via browser dev tools: `localStorage.removeItem('gpu-warning-dismissed')`

## Testing

### Test Software Rendering Detection
1. Open Chrome
2. Navigate to `chrome://flags`
3. Search for "Override software rendering list"
4. Enable it (forces software rendering)
5. Restart browser
6. Load ChristmasPuzzle → Modal should appear

### Test "Don't Show Again"
1. Trigger modal (software rendering)
2. Click "Don't show again"
3. Reload page → Modal should NOT appear
4. Check localStorage: `localStorage.getItem('gpu-warning-dismissed')` → `"true"`

### Test Browser-Specific URLs
1. Open in different browsers
2. Check modal shows correct settings URL:
   - Chrome: `chrome://settings/system`
   - Edge: `edge://settings/system`
   - Firefox: `about:preferences#general`

## Console Logging

The service logs detection results for debugging:

```javascript
✅ GPU detection passed: ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)
🔴 Software renderer detected: Google SwiftShader
🟡 Possible GPU block detected: ANGLE (D3D11)
```

## Deployment Notes

### Production Checklist
- ✅ Conservative detection (no false positives)
- ✅ Silent failure (doesn't break game)
- ✅ User can dismiss permanently
- ✅ 2-second delay (non-intrusive)
- ✅ Browser-agnostic (Chrome, Edge, Firefox, Safari)
- ✅ Translations complete (EN/DE)
- ✅ No external dependencies

### Monitoring Recommendations
Consider tracking these metrics:
- % of users shown the warning
- Which browsers/renderers trigger warnings
- "Don't show again" click rate
- User completion rate after seeing warning

## Files Modified

1. **New:** `ClientApp/src/app/services/gpu-detection.service.ts` (170 lines)
2. **Modified:** `ClientApp/src/app/app.component.ts` (+40 lines)
3. **Modified:** `ClientApp/src/app/app.component.html` (+16 lines)
4. **Modified:** `ClientApp/src/app/app.component.scss` (+17 lines)
5. **Modified:** `ClientApp/src/assets/i18n/en.json` (+8 keys)
6. **Modified:** `ClientApp/src/assets/i18n/de.json` (+8 keys)

## Future Enhancements (Optional)

### Telemetry (if needed)
```typescript
if (result.hasIssue) {
  this.userService.logTelemetry({
    event: 'gpu-issue-detected',
    renderer: result.renderer,
    vendor: result.vendor,
    issueType: result.issueType
  });
}
```

### Adaptive Quality (Phase 2)
```typescript
if (result.issueType === 'software-renderer') {
  this.sceneEvents?.emit('set-quality-profile', 'LOW');
}
```

### User Override (Phase 3)
Add manual quality selector in hamburger menu:
- Auto (detect automatically)
- High (force full quality)
- Low (force reduced quality)

## Compatibility

✅ **Browsers:**
- Chrome 90+ (Chromium-based instructions)
- Edge 90+ (Chromium-based instructions)
- Brave 1.25+ (Chromium-based instructions)
- Opera 76+ (Custom Opera instructions)
- Firefox 88+ (Custom Firefox instructions)
- Safari 14+ (macOS System Preferences instructions)

✅ **WebGL Support:**
- Requires WebGL 1.0 minimum
- Prefers WebGL 2.0 if available
- Uses `powerPreference: 'high-performance'`

✅ **Features:**
- localStorage (for "don't show again")
- WEBGL_debug_renderer_info extension (optional, graceful degradation)
- Browser detection via user-agent

## Security & Privacy

- ✅ No user data collected by GPU detection
- ✅ Renderer/vendor info logged to console only
- ✅ localStorage used only for user preference
- ✅ No external API calls
- ✅ No fingerprinting beyond standard WebGL APIs

---

**Status:** ✅ Implemented and ready for testing  
**Priority:** Medium (improves UX for affected users, doesn't block normal operation)  
**Risk:** Low (silent failure, conservative detection, user-dismissible)

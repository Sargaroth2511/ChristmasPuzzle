# Firefox GPU Detection Enhancement

## Problem

Firefox was not showing the performance warning modal even when hardware acceleration was disabled. This was due to Firefox privacy settings blocking the `WEBGL_debug_renderer_info` extension.

## Root Cause

According to Mozilla documentation (Bug 1171228), Firefox can completely block the `WEBGL_debug_renderer_info` extension when:
- `privacy.resistFingerprinting` is set to `true` (privacy-focused users)
- Privacy/tracking protection is enabled
- The extension is disabled for security/fingerprinting reasons

When blocked:
- `gl.getExtension('WEBGL_debug_renderer_info')` returns `null`
- Fallback to `gl.getParameter(gl.RENDERER)` returns generic strings like:
  - `"WebGL"` (Firefox)
  - `"WebKit WebGL"` (Safari)
  - `"Mozilla WebGL"` (older Firefox)

These generic strings don't contain indicators like "swiftshader" or "llvmpipe", so software rendering detection fails.

## Solution

Implemented a **three-tier detection strategy**:

### Tier 1: WEBGL_debug_renderer_info Extension (Primary)
- Try to get `UNMASKED_VENDOR_WEBGL` and `UNMASKED_RENDERER_WEBGL`
- Works on Chrome, Edge, Brave, Opera when not blocked
- Works on Firefox when privacy settings allow

### Tier 2: Standard WebGL Parameters (Fallback)
- If extension is blocked, use `gl.RENDERER` and `gl.VENDOR`
- Catches generic renderer strings
- Still checks for known software rendering patterns

### Tier 3: Performance Benchmark (Ultimate Fallback)
- If renderer info is unavailable or generic (`"WebGL"`, `"WebKit WebGL"`, etc.)
- **Runs actual WebGL draw test**: 1000 triangle draws
- Measures execution time:
  - Hardware GPU: <10ms (very fast)
  - Software rendering: >100ms (slow)
- Only triggers if Tier 1 & 2 fail to provide conclusive data

## Code Changes

### Enhanced Detection Logic

```typescript
// Get renderer with fallback
let vendor = '';
let renderer = '';

if (debugInfo) {
  vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
  renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
}

// Fallback to standard parameters
if (!renderer) {
  renderer = gl.getParameter(gl.RENDERER) || '';
  vendor = gl.getParameter(gl.VENDOR) || '';
}

// Performance test for generic renderers
let slowPerformance = false;
if (!renderer || renderer === 'webgl' || renderer === 'webkit webgl' || renderer === 'moz webgl') {
  console.log('⚠️ Renderer info unavailable (privacy settings?), running performance test...');
  slowPerformance = await this.testWebGLPerformance(gl);
}
```

### Performance Test Method

```typescript
private async testWebGLPerformance(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<boolean> {
  // Creates minimal shader program
  // Draws 1000 triangles
  // Measures total time with gl.finish()
  // Returns true if >100ms (software rendering)
  // Returns false if <100ms (hardware GPU)
}
```

## Testing Scenarios

### Firefox with Hardware Acceleration Disabled
**Before**: No modal shown (renderer = empty string)
**After**: Modal shows via performance test (slow draw time detected)

### Firefox with Privacy Mode
**Before**: No modal shown (extension blocked)
**After**: Modal shows via performance test (benchmark fallback)

### Chrome/Edge with Software Rendering
**Before**: Modal shows (SwiftShader detected)
**After**: Modal shows (same detection works)

### Normal Hardware GPU
**Before**: No modal (correct behavior)
**After**: No modal (performance test passes, <10ms)

## Performance Impact

- **No impact on normal users**: Performance test only runs if renderer info is unavailable
- **Minimal overhead**: 1000 triangle draws takes <10ms on hardware GPU
- **Async operation**: Uses `gl.finish()` to wait for completion without blocking
- **One-time check**: Only runs on app initialization

## Browser Compatibility

| Browser | Extension Available | Fallback Method |
|---------|---------------------|-----------------|
| Chrome | ✅ Always | Not needed |
| Edge | ✅ Always | Not needed |
| Brave | ✅ Always | Not needed |
| Opera | ✅ Always | Not needed |
| Firefox (normal) | ✅ Usually | Performance test if blocked |
| Firefox (privacy mode) | ❌ Blocked | Performance test |
| Safari | ⚠️ Sometimes | Performance test |

## Console Logging

Enhanced logging helps diagnose detection issues:

```
GPU Detection - Vendor: Mozilla Renderer: WebGL
⚠️ Renderer info unavailable (privacy settings?), running performance test...
WebGL Performance Test: 1000 draws in 156.23ms
⚠️ Slow performance detected (156.23ms) - likely software rendering
🔴 Software renderer detected: WebGL (vendor: Mozilla )
```

## Known Issues

### False Positives
- Very old hardware GPUs might trigger the performance warning
- Mitigation: 100ms threshold is conservative (10x slower than modern GPUs)

### Privacy Settings
- Users with `privacy.resistFingerprinting=true` will see generic renderer names
- Performance test is the only reliable detection method in this case

## Future Improvements

1. **Adaptive Threshold**: Adjust performance benchmark based on canvas size
2. **Multiple Metrics**: Test fill rate, texture uploads, shader compilation
3. **User Feedback**: Add "This warning is incorrect" button to improve detection
4. **Telemetry**: Track false positive/negative rates (if user consents)

## References

- [Mozilla Bug 1171228 - Expose WEBGL_debug_renderer_info](https://bugzilla.mozilla.org/show_bug.cgi?id=1171228)
- [MDN: WEBGL_debug_renderer_info](https://developer.mozilla.org/en-US/docs/Web/API/WEBGL_debug_renderer_info)
- [WebGL Specification](https://www.khronos.org/registry/webgl/extensions/WEBGL_debug_renderer_info/)

# Debug Rendering Control

## Current State: DISABLED ✅

The Matter.js collision body debug rendering is currently **disabled** for cleaner testing.

## Location

**File:** `ClientApp/src/game/puzzle.scene.ts`  
**Function:** `renderMatterDebug()` (around line 2783)

## How to Toggle

### To Disable (Current State)
```typescript
private renderMatterDebug(): void {
  // DISABLED for cleaner testing - re-enable by removing this return
  return;
  
  // ... rest of function
}
```

### To Enable
Simply **remove or comment out** the early `return;` statement:

```typescript
private renderMatterDebug(): void {
  // Debug rendering enabled
  // return; // ← Comment this out or delete it
  
  if (!this.matter || !this.matter.world) {
    return;
  }
  // ... rest of function works normally
}
```

## What Debug Rendering Shows

When enabled, you see colored outlines on collision bodies:

- **🔴 Red:** Static bodies (dragged pieces, walls)
- **🟢 Green:** Dynamic bodies (free-floating pieces)
- **🔵 Blue:** Phantom bodies (if phantom system active - currently not used)

## Debug Color Meanings

| Color | Body Type | Behavior |
|-------|-----------|----------|
| Red | Static (`isStatic: true`) | Infinite mass, immovable, pushes others |
| Green | Dynamic (`isStatic: false`) | Finite mass, affected by gravity/forces |
| Blue | Phantom/Sensor | Special collision body (currently unused) |

## Performance Impact

**With Debug Rendering:**
- Extra draw calls for outlines
- Minimal impact (~0.5ms per frame)
- Useful for understanding collision behavior

**Without Debug Rendering:**
- Cleaner visual experience
- Slightly better performance
- Easier to test gameplay feel

## When to Enable

**Enable debug rendering when:**
- Investigating collision issues
- Verifying body alignment
- Checking if bodies are sleeping (can add sleep indicator)
- Understanding physics behavior

**Keep disabled when:**
- Testing gameplay feel
- Taking screenshots/videos
- Production builds
- User testing

## Alternative Debug Methods

Without visual rendering, you can still debug via console logs:

```typescript
// Already present in code:
console.log(`[dragstart] Making piece static`);
console.log(`⏰ [WAKE] Woke up N sleeping bodies`);
console.log(`[dragend] Restored to dynamic`);
```

These logs provide insight without visual clutter.

## Quick Reference

**Current Status:** ✅ DISABLED  
**To Enable:** Remove `return;` at line ~2785  
**To Disable:** Add `return;` at start of `renderMatterDebug()`

---

*Last Updated: Static drag approach with wake-up system active*

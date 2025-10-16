# Drag Visuals Disabled

## Changes Made

Disabled the visual effects that were applied when dragging pieces for a cleaner, more minimal drag experience.

## What Was Disabled

### 1. Scale Effect ❌
**Before:**
```typescript
piece.shape.setScale(DRAG_ACTIVE_SCALE); // Was scaling up to 1.05x
```

**After:**
```typescript
// Disabled - piece stays at normal scale (1.0)
```

### 2. Shadow Effect ❌
**Before:**
```typescript
if (!piece.dragShadow) {
  piece.dragShadow = this.createDragShadow(piece);
}
this.syncDragShadow(piece);
```

**After:**
```typescript
// Disabled - no shadow created or synced
```

## Code Location

**File:** `ClientApp/src/game/puzzle.scene.ts`  
**Function:** `applyDragVisuals()` (around line 217)

## Current Behavior

### During Drag:
- ✅ Piece follows mouse/touch exactly
- ✅ Auto-rotation to upright (0°) still works
- ✅ Depth increases (piece on top)
- ❌ No scale increase
- ❌ No shadow underneath

### After Drop:
- ✅ Scale reset to 1.0 (via `clearDragVisuals()`)
- ✅ Shadow removed (if any existed)
- ✅ Details synced correctly

## Benefits

**Cleaner Look:**
- No visual "pop" when picking up piece
- Piece size stays consistent
- Less visual noise during drag

**Better Testing:**
- Easier to judge actual collision behavior
- No confusing shadow layer
- Clearer view of piece boundaries

**Performance:**
- No shadow graphics creation/updates
- Fewer draw calls per frame
- Slightly better FPS with many pieces

## To Re-Enable

If you want the shadow/scale effects back:

```typescript
private applyDragVisuals(piece: PieceRuntime, active: boolean): void {
  if (active) {
    // UNCOMMENT these lines:
    piece.shape.setScale(DRAG_ACTIVE_SCALE);
    if (!piece.dragShadow) {
      piece.dragShadow = this.createDragShadow(piece);
    } else {
      this.updateDragShadowStyle(piece, piece.dragShadow);
    }
    this.syncDragShadow(piece);
    
    this.syncDetailsTransform(piece);
    return;
  }

  this.clearDragVisuals(piece);
}
```

## What Still Works

✅ **Auto-rotation** - Pieces still rotate to 0° when picked up  
✅ **Depth sorting** - Dragged piece appears on top  
✅ **Touch offset** - Pieces offset on touch so visible above finger  
✅ **Cursor change** - Cursor changes to "grabbing"  
✅ **Matter.js physics** - Static drag with collisions active  
✅ **Wake-up system** - Sleeping bodies wake up  
✅ **Detail graphics** - SVG details still sync with piece  

## Visual Effects Summary

| Effect | Before | After |
|--------|--------|-------|
| Scale | 1.05x (5% larger) | 1.0x (no change) ✅ |
| Shadow | Dark polygon underneath | None ✅ |
| Rotation | Smooth to 0° | Smooth to 0° ✅ |
| Depth | Increased | Increased ✅ |
| Cursor | "grabbing" | "grabbing" ✅ |

## Constants Referenced

**File:** `ClientApp/src/game/puzzle.constants.ts` (presumably)

```typescript
DRAG_ACTIVE_SCALE = 1.05;          // Not used anymore
DRAG_SHADOW_COLOR = 0x000000;      // Not used anymore
DRAG_SHADOW_ALPHA = 0.3;           // Not used anymore
DRAG_SHADOW_OFFSET = {x: 6, y: 6}; // Not used anymore
```

These constants remain defined but are no longer applied during drag.

---

*Status: Shadow and scale effects disabled for minimal drag UX*

# Display Origin Fix - The Real Root Cause

## The Actual Problem

The collision bodies were offset because of **Phaser's display origin system**. The issue was NOT with Matter.js's centroid calculation, but with **how Phaser polygons position themselves**.

### Key Discovery

From the console output:
```
🔍 [ANCHOR] Piece 0:
  - shape.x/y: (456.0, 504.2)
  - displayOrigin: (36.3, 57.4)  ← NOT (0, 0)!
```

**The polygon's `displayOrigin` is NOT at (0, 0)!**

## Understanding the Coordinate Systems

### Phaser Polygon Positioning

When you create a Phaser polygon:
```typescript
const shape = this.add.polygon(anchor.x, anchor.y, geometry.coords);
```

1. The `geometry.coords` are **relative to the anchor point**
2. Phaser calculates a `displayOrigin` based on the polygon's bounding box
3. The polygon is then positioned at: `position = anchor + displayOrigin`

So the final visual position is:
```
Visual position = anchor + displayOrigin
```

### Matter.js Body Positioning

Our `piece.localPoints` are relative to the anchor (before the displayOrigin offset):
```typescript
const localX = point.x - anchor.x;  // Relative to anchor
const localY = point.y - anchor.y;
```

When we create the Matter body, we need to position it at the **anchor**, not the visual position:
```
Body position = anchor = visual position - displayOrigin
```

## The Fix

### 1. Creating Bodies at Correct Position

**Before (WRONG):**
```typescript
const centerX = piece.shape.x;  // Visual position
const centerY = piece.shape.y;
body = Bodies.fromVertices(centerX, centerY, vertices);
```

**After (CORRECT):**
```typescript
// Position body at anchor (visual position - displayOrigin)
const centerX = piece.shape.x - piece.shape.displayOriginX;
const centerY = piece.shape.y - piece.shape.displayOriginY;
body = Bodies.fromVertices(centerX, centerY, vertices);
```

### 2. Syncing Visual to Body

**Before (WRONG):**
```typescript
// Direct copy - ignores displayOrigin
piece.shape.setPosition(body.position.x, body.position.y);
```

**After (CORRECT):**
```typescript
// Add displayOrigin offset to get visual position
const visualX = body.position.x + piece.shape.displayOriginX;
const visualY = body.position.y + piece.shape.displayOriginY;
piece.shape.setPosition(visualX, visualY);
```

### 3. Syncing Body to Visual

**Before (WRONG):**
```typescript
// Sets body to visual position
this.matter.body.setPosition(body, { x: piece.shape.x, y: piece.shape.y });
```

**After (CORRECT):**
```typescript
// Convert visual position to anchor position
const bodyX = piece.shape.x - piece.shape.displayOriginX;
const bodyY = piece.shape.y - piece.shape.displayOriginY;
this.matter.body.setPosition(body, { x: bodyX, y: bodyY });
```

## Why This Happened

The Phaser polygon's displayOrigin is **automatically calculated** based on the polygon's geometry. For irregular puzzle pieces, this origin can be significantly offset from (0, 0).

Example from console:
- Piece 0: `displayOrigin: (36.3, 57.4)` ← 36-57 pixel offset!
- Piece 2: `displayOrigin: (22.9, 138.1)` ← 22-138 pixel offset!

This explains why the collision bodies appeared offset by varying amounts for different pieces - each piece has a different displayOrigin!

## Files Modified

All changes in `ClientApp/src/game/puzzle.scene.ts`:

1. **Body creation** (~line 2910):
   - Position body at `anchor = shape.position - displayOrigin`

2. **Update loop body→visual sync** (~line 1636):
   - Set visual to `body.position + displayOrigin`

3. **Explosion loop body→visual sync** (~line 1690):
   - Set visual to `body.position + displayOrigin`

4. **preparePiecesForPuzzle visual→body sync** (~line 1570):
   - Set body to `shape.position - displayOrigin`

5. **dragend visual→body sync** (~line 2086):
   - Set body to `shape.position - displayOrigin`

## Testing

After refresh, you should see:
```
🔍 [ANCHOR] Piece 0:
  - shape.x/y: (456.0, 504.2)
  - displayOrigin: (36.3, 57.4)
  - anchor (corrected): (419.7, 446.8)  ← Body positioned here!
  
⚙️ [BODY] piece_1: Vertex alignment offset: (0.00, 0.00) ✅
```

The collision shapes should now **perfectly align** with the puzzle pieces!

## Previous Attempts

1. ❌ **Centroid pre-calculation** - This was actually correct, but didn't solve the offset because the root cause was displayOrigin
2. ❌ **Moving body after creation** - Didn't account for displayOrigin
3. ✅ **Account for displayOrigin in all conversions** - This is the complete solution!

## Key Lesson

When working with Phaser shapes and physics engines:
- **Always check displayOrigin** - it's often not (0, 0)!
- **Be consistent** with coordinate systems
- **Anchor vs Visual position** - know which one you're using

The local coordinates (`localPoints`) are relative to the **anchor**, not the visual position. The physics body should be positioned at the **anchor**, and then we add `displayOrigin` to get the visual position.

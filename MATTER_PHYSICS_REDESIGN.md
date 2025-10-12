# Matter.js Physics Redesign - Problem Analysis

## Current Issues

### 1. **Collision Bodies Don't Match Piece Shapes**
- Screenshot shows green rectangles that don't follow puzzle piece contours
- `fromVertices()` is likely failing and falling back to rectangles silently
- Bodies are positioned incorrectly (often outside the visual pieces)

### 2. **Desynchronization During Drag**
- Visual piece moves with mouse
- Physics body stays behind or falls to ground
- Bodies and sprites are separate objects with manual sync

### 3. **Architecture Problem**
Current approach:
```typescript
// WRONG: Separate visual and physics objects
piece.shape = this.add.polygon(...);  // Visual Phaser.Polygon
piece.matterBody = this.matter.add.rectangle(...);  // Physics body
// Then manually sync in update() - UNRELIABLE!
```

## Root Cause

**Phaser + Matter.js** is designed to work with **unified physics game objects**, not separate visual/physics entities. When you use `Phaser.GameObjects.Polygon` (a pure visual object) and try to attach a separate Matter body, you're fighting the framework.

## Proper Solution Options

### Option 1: Use Matter.Image with Custom Shape (RECOMMENDED)
```typescript
// Create invisible Matter.Image with fromVertices body
const matterObj = this.matter.add.image(x, y, null);
matterObj.setExistingBody(customPolygonBody);
matterObj.setVisible(false);

// Keep visual Polygon separate, sync from physics
piece.shape = this.add.polygon(...);
piece.matterObj = matterObj;

// In update(): sync visual FROM physics (one direction only)
piece.shape.setPosition(matterObj.x, matterObj.y);
piece.shape.setRotation(matterObj.rotation);
```

### Option 2: Convert to Matter.Sprite
```typescript
// Replace Polygon with Matter.Sprite using texture
const sprite = this.matter.add.sprite(x, y, texture);
sprite.setBody(customVertices);

// Sprite now handles physics automatically
// No manual syncing needed!
```

### Option 3: Use setExistingBody Properly
```typescript
// Create Matter GameObject first
const gameObject = this.matter.add.gameObject(polygonShape);
gameObject.setExistingBody(customBody);

// Physics handled by Phaser automatically
```

## Why fromVertices() Might Be Failing

1. **Vertices in wrong coordinate space**
   - Must be relative to center, not absolute world coords
   - Need to be clockwise winding order
   
2. **Too many vertices**
   - Matter.js may fail with 100+ vertices
   - Need more aggressive simplification (target 12-16 instead of 24)

3. **Concave without poly-decomp**
   - `fromVertices()` requires poly-decomp library for concave shapes
   - Phaser doesn't include it by default
   - Falls back to convex hull (which makes rectangles for complex shapes)

## Immediate Fix Strategy

### Phase 1: Fix Vertex Creation
1. Ensure vertices are centered around (0,0)
2. Reduce to 12-16 vertices max
3. Add better error handling with fallback

### Phase 2: Proper Phaser Integration  
1. Use invisible Matter.Image as physics driver
2. Sync visual Polygon FROM physics (not bidirectional)
3. Use Phaser's drag events instead of manual dragging

### Phase 3: Handle Dragging Correctly
```typescript
// Don't move visual directly - move physics body
this.matter.world.on('drag', (body) => {
  // Body automatically updates
  // Visual syncs in update() loop
});
```

## Next Steps

1. **Verify poly-decomp availability**
   - Check if it's loaded: `console.log(typeof decomp)`
   - If undefined, fromVertices can't handle concave shapes

2. **Fix vertex coordinate space**
   - Current: `piece.localPoints` (relative to anchor)
   - Needed: Vertices centered at (0,0)

3. **Implement proper Phaser-Matter integration**
   - Stop manual position syncing
   - Use Phaser's built-in physics-visual binding

---

**Current Status**: Diagnosed - bodies created but wrong shape/position  
**Action**: Implement Option 1 with fixed vertex handling  
**Expected Result**: Green collision outlines match piece shapes exactly

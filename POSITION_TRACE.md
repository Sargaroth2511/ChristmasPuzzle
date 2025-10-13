# Position Trace: Visual Pieces vs Matter.js Bodies

## Overview
This document traces where and how positions are set for both visual pieces and their Matter.js collision bodies.

---

## 1. INITIAL PIECE CREATION (convertToMatterBody)
**File**: `puzzle.scene.ts`, lines ~2870-2940

### Visual Position (INPUT):
```typescript
const centerX = piece.shape.x;  // ← Visual piece X position
const centerY = piece.shape.y;  // ← Visual piece Y position
```

### Vertices (RELATIVE to visual center):
```typescript
const localVertices = piece.localPoints.map(pt => ({ x: pt.x, y: pt.y }));
// These are RELATIVE coordinates like: [{x: -10, y: -5}, {x: 10, y: -5}, ...]
// They represent the shape OFFSET from the piece center
```

### Body Creation at Origin:
```typescript
body = (this.matter.bodies as any).fromVertices(
    0,  // ← Create at origin X
    0,  // ← Create at origin Y
    [simplifiedVertices],  // ← Vertices relative to (0,0)
    { angle: piece.shape.rotation, ... }
);
```

**What Matter.js does internally:**
1. Takes vertices (relative coordinates)
2. Calculates center of mass from vertices
3. Re-centers vertices around (0, 0)
4. Sets `body.position` to the calculated center of mass

### Body Positioning:
```typescript
this.matter.world.add(body);  // Add to world

// Move body to match visual position
this.matter.body.setPosition(body, { x: centerX, y: centerY });
```

**Expected Result**: Body position = Visual position ✅

---

## 2. EXPLOSION LAUNCH (launchPieceExplosionWithMatter)
**File**: `puzzle.scene.ts`, lines ~1450-1510

### Visual Position:
```typescript
const start = new Phaser.Math.Vector2(
    piece.target.x + piece.origin.x, 
    piece.target.y + piece.origin.y
);
piece.shape.setPosition(start.x, start.y);  // ← Set visual position
```

### Body Position:
```typescript
this.matter.body.setPosition(body, { x: start.x, y: start.y });  // ← Set body position
```

**Expected Result**: Body position = Visual position ✅

### Then Physics Takes Over:
```typescript
this.matter.body.setVelocity(body, { x: velocityX, y: velocityY });
this.matter.body.setAngularVelocity(body, angularVelocity);
```

**Result**: Body starts moving due to physics! Visual and body DIVERGE ⚠️

---

## 3. EXPLOSION UPDATE LOOP (updateExplosionWithMatter)
**File**: `puzzle.scene.ts`, lines ~1656-1680

### Syncing Direction: BODY → VISUAL
```typescript
const matterBody = (piece as any).matterBody;

// Read body position (after physics simulation)
const bodyX = matterBody.position.x;  // ← Physics-simulated position
const bodyY = matterBody.position.y;

// Update visual to match body
piece.shape.setPosition(matterBody.position.x, matterBody.position.y);  // ← Visual follows body
piece.shape.setRotation(matterBody.angle);
```

**Result**: Visual moves to where physics put the body ✅
**Issue**: When explosion ends, body is at final physics position, visual is synced to it

---

## 4. PUZZLE PREPARATION (preparePiecesForPuzzle)
**File**: `puzzle.scene.ts`, lines ~1555-1575

### Visual Position Reset:
```typescript
const restPosition = piece.restPosition ?? new Phaser.Math.Vector2(piece.shape.x, piece.shape.y);
piece.shape.setPosition(restPosition.x, restPosition.y);  // ← Move visual to rest
piece.shape.rotation = startRotation;
```

### Body Position (THE FIX):
```typescript
const matterBody = (piece as any).matterBody;
if (matterBody && this.matter) {
    this.matter.body.setPosition(matterBody, { x: restPosition.x, y: restPosition.y });  // ← Move body to match
    this.matter.body.setAngle(matterBody, startRotation);
    this.matter.body.setVelocity(matterBody, { x: 0, y: 0 });
    this.matter.body.setAngularVelocity(matterBody, 0);
}
```

**Expected Result**: Body and visual both at rest position ✅

---

## 5. PUZZLE UPDATE LOOP (update)
**File**: `puzzle.scene.ts`, lines ~1615-1630

### For Non-Dragging Pieces with Bodies:
```typescript
if (matterBody && !piece.placed && !piece.isDragging) {
    // Sync visual to physics body
    piece.shape.setPosition(matterBody.position.x, matterBody.position.y);
    piece.shape.setRotation(matterBody.angle);
    this.syncDetailsTransform(piece);
}
```

**Result**: Visual follows body position continuously

---

## 6. DRAGGING (drag handlers)
**File**: `puzzle.scene.ts`, lines ~1940-2010

### On Drag Start:
```typescript
if (matterBody && this.matter) {
    this.matter.body.setStatic(matterBody, true);  // Freeze physics
    this.matter.body.setVelocity(matterBody, { x: 0, y: 0 });
}
```

### During Drag:
```typescript
this.updateDraggingPieceTransform(piece, pointer);  // Updates visual position

const matterBody = (piece as any).matterBody;
if (matterBody && this.matter) {
    // Sync body to visual
    this.matter.body.setPosition(matterBody, { x: piece.shape.x, y: piece.shape.y });
    this.matter.body.setAngle(matterBody, piece.shape.rotation);
}
```

### On Drag End:
```typescript
this.matter.body.setStatic(matterBody, false);  // Re-enable physics
this.matter.body.setPosition(matterBody, { x: piece.shape.x, y: piece.shape.y });
this.matter.body.setAngle(matterBody, piece.shape.rotation);
```

**Result**: Body stays synced with visual during drag ✅

---

## THE PROBLEM IDENTIFIED

### Issue Timeline:
1. **Creation**: Body at (454, 504), Visual at (454, 504) ✅ ALIGNED
2. **Explosion Launch**: Both at start position (454, 504) ✅ ALIGNED
3. **Physics Simulation**: Body moves to (568, 497) due to velocity/gravity
4. **Explosion Update**: Visual synced to body → Visual at (568, 497) ✅ ALIGNED
5. **Explosion Settles**: Body records position as "rest" → (568, 497)
6. **preparePiecesForPuzzle**: 
   - Visual moved to `restPosition` (which was recorded during explosion)
   - **BUG**: Body NOT moved to match visual!
7. **Result**: Visual at (568, 497), Body STILL at old physics position → ❌ OFFSET!

### The Fix Applied:
Added in `preparePiecesForPuzzle()` to sync body to visual rest position:
```typescript
this.matter.body.setPosition(matterBody, { x: restPosition.x, y: restPosition.y });
```

---

## KEY INSIGHTS

### localPoints vs World Coordinates:
```typescript
// localPoints are RELATIVE to piece center
piece.localPoints = [
    { x: -10, y: -5 },   // 10px left, 5px up from center
    { x: 10, y: -5 },    // 10px right, 5px up from center
    { x: 0, y: 10 }      // 0px horizontal, 10px down from center
];

// When piece.shape.x = 454, piece.shape.y = 504:
// Actual vertex positions in world:
// (444, 499), (464, 499), (454, 514)
```

### Matter.js Body Position:
```typescript
body.position.x  // ← Body center X in world coordinates
body.position.y  // ← Body center Y in world coordinates
body.vertices[0].x  // ← First vertex X in world coordinates (absolute)
body.vertices[0].y  // ← First vertex Y in world coordinates (absolute)
```

### The vertices are ALREADY in world coordinates:
When Matter.js creates the body, it stores vertices in **absolute world positions**, not relative!
So if body is at (454, 504) with relative vertex (-10, -5), the vertex is stored as (444, 499).

---

## VERIFICATION CHECKLIST

After the fix, verify:
- [ ] `⚙️ [CONVERT]` shows Offset=(0.00, 0.00) at creation
- [ ] `[preparePiecesForPuzzle] Synced Matter body` appears in console
- [ ] No `⚠️ [OFFSET]` warnings after puzzle preparation
- [ ] Green collision outlines perfectly align with visual pieces
- [ ] Alignment maintained during drag
- [ ] Alignment maintained after release/fall

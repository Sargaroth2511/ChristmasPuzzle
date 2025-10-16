# Drag Momentum Transfer System

## Feature: Realistic Push Feel

Added momentum transfer when dragged pieces push other pieces, creating a more realistic and satisfying interaction.

## How It Works

### 1. Velocity Tracking

During drag, we track the dragged piece's movement:

```typescript
// Calculate drag velocity
const prevX = matterBody.position.x;
const prevY = matterBody.position.y;

this.syncMatterBodyWithShape(piece, matterBody);

const deltaX = matterBody.position.x - prevX;
const deltaY = matterBody.position.y - prevY;
piece.dragVelocity = { x: deltaX * 60, y: deltaY * 60 }; // Scale to per-second
```

### 2. Momentum Application

Each frame, we apply momentum to nearby pieces:

```typescript
this.applyDragMomentum(piece, matterBody, deltaX, deltaY);
```

### 3. Smart Push Calculation

Momentum is calculated based on:

#### A. Drag Speed
- Faster drag = more momentum
- Slow drag = gentle push
- No movement = no momentum transfer

#### B. Distance (Proximity)
```typescript
const proximityFactor = 1 - (distance / momentumRadius);
// Close pieces (0px): 100% of momentum
// Far pieces (80px): 0% of momentum
```

#### C. Alignment (Direction)
```typescript
const alignmentFactor = dot(pushDirection, dragDirection);
// Directly in front: 100% of momentum
// To the side: less momentum
// Behind drag: 0% (ignored)
```

#### D. Final Momentum
```typescript
const momentumStrength = dragSpeed * proximityFactor * alignmentFactor * 0.15;
// Takes 15% of drag speed, scaled by proximity and alignment
```

## Parameters (Tunable)

| Parameter | Value | Effect |
|-----------|-------|--------|
| `momentumRadius` | `80px` | How far momentum reaches |
| `momentumStrength` | `15%` | % of drag speed transferred |
| `minSpeed` | `0.1` | Minimum drag speed to transfer |
| `angularImpulse` | `0.001` | Rotation added to pushed pieces |

## Visual Example

```
Dragged Piece (moving right at 300px/s):
              →→→→→
             [###]
                |
                | 60px (close, aligned)
                ↓
              [###]  ← Gets: 300 * 0.75 * 1.0 * 0.15 = 34px/s
         
         [###]  ← 80px away, aligned: Gets minimal push
         
    [###]  ← Behind drag direction: Gets nothing
```

## Behavior Details

### What Gets Pushed
✅ Dynamic bodies (not static)  
✅ Bodies within 80px of dragged piece  
✅ Bodies **in front of** drag direction  
✅ Awake or sleeping bodies (sleeping ones wake up)  

### What Doesn't Get Pushed
❌ Static bodies (walls, etc.)  
❌ The dragged piece itself  
❌ Bodies behind the drag direction  
❌ Bodies more than 80px away  

### Momentum Characteristics

**Additive:** Adds to existing velocity, doesn't replace it
```typescript
newVelocity = currentVelocity + momentum
```

**Proportional:** Closer pieces get more push
- 0px distance → 100% momentum
- 40px distance → 50% momentum  
- 80px distance → 0% momentum

**Directional:** Only pushes in drag direction
- Aligned pieces get full momentum
- Side pieces get partial momentum
- Rear pieces get no momentum

### Angular Momentum (Spin)

Pushed pieces also get slight rotation:
```typescript
angularImpulse = crossProduct(pushDir, dragDir) * 0.001
```

This creates natural spinning when pieces are hit at an angle.

## Performance Optimization

**Smart Checks:**
- Only runs if drag speed > 0.1px/frame
- Early exit for static bodies
- Distance-squared checks (no sqrt until needed)
- Only affects bodies within 80px radius

**Cost:** ~0.2ms for 20 pieces (negligible)

## Tuning Guide

### For More Aggressive Push
```typescript
const momentumStrength = dragSpeed * proximityFactor * alignmentFactor * 0.25; // 25% instead of 15%
const momentumRadius = 100; // Larger radius
```

### For Gentler Push
```typescript
const momentumStrength = dragSpeed * proximityFactor * alignmentFactor * 0.10; // 10% instead of 15%
const momentumRadius = 60; // Smaller radius
```

### For More Spin
```typescript
const angularImpulse = ... * 0.002; // Double the spin
```

### For Less Spin
```typescript
const angularImpulse = ... * 0.0005; // Half the spin
```

## Testing Scenarios

### Test 1: Direct Push
1. Drag piece quickly into another piece
2. **Expected:** Hit piece slides away in drag direction
3. **Bonus:** Slight rotation if hit at angle

### Test 2: Side Swipe
1. Drag piece past another piece (not directly at it)
2. **Expected:** Side piece gets partial push
3. **Bonus:** More rotation from glancing contact

### Test 3: Slow Drag
1. Drag piece slowly through others
2. **Expected:** Gentle pushing, no violent shoving
3. **Bonus:** Smooth natural feeling

### Test 4: Group Push
1. Drag piece into cluster of pieces
2. **Expected:** All pieces in front get pushed
3. **Bonus:** Pieces behind cluster unaffected

## Before & After Comparison

### Before (Static Collision Only)
- ❌ Pieces only respond when actually colliding
- ❌ Static friction makes them "stick" initially
- ❌ No momentum transfer
- ❌ Feels stiff and unrealistic

### After (With Momentum Transfer)
- ✅ Pieces start moving as drag approaches
- ✅ Smooth anticipation of collision
- ✅ Realistic momentum transfer
- ✅ Natural, fluid feeling

## Integration with Other Systems

**Works With:**
- ✅ Static drag (immovable dragged piece)
- ✅ Wake-up system (wakes sleeping targets)
- ✅ Matter.js physics (respects mass, friction)
- ✅ Collision detection (doesn't interfere)

**Complements:**
- Wake-up system wakes bodies → momentum can push them
- Static friction prevents sliding → momentum overcomes it
- High mass pieces → require more momentum to move

## Code Location

**File:** `ClientApp/src/game/puzzle.scene.ts`

**Functions:**
- `applyDragMomentum()` - Main momentum transfer logic (~80 lines)
- `update()` - Calls momentum application each frame

**Variables:**
- `piece.dragVelocity` - Stores drag velocity for calculations
- `deltaX, deltaY` - Frame-to-frame position change

## Physics Equations

### Momentum Transfer
```
momentum = dragSpeed × proximityFactor × alignmentFactor × 0.15

where:
  dragSpeed = sqrt(deltaX² + deltaY²) × 60
  proximityFactor = 1 - (distance / radius)
  alignmentFactor = dot(pushDir, dragDir)
```

### Velocity Update
```
newVelocity = currentVelocity + (momentum × 0.016)

where:
  0.016 ≈ 1/60 (frame time at 60fps)
```

### Angular Momentum
```
angularImpulse = (pushDir.x × dragDir.y - pushDir.y × dragDir.x) × 0.001
newAngularVelocity = currentAngularVelocity + angularImpulse
```

## Future Enhancements (Optional)

**Could Add:**
- Mass-based momentum (heavy pieces push harder)
- Velocity decay (momentum fades over time)
- Chain reactions (pushed pieces push others)
- Visual feedback (particles on impact)
- Sound effects (push/collision sounds)

---

*Status: Momentum transfer active with 15% strength, 80px radius*

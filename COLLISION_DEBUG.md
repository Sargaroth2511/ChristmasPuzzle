# Collision Debug Diagnostics

## Issue: Pieces Fall Apart After Colliding with Ground Pieces

**User Report:**
- ✅ Correct behavior while pieces are dragged
- ✅ Correct behavior while pieces fall to the ground
- ❌ **Incorrect behavior after they collide with pieces that lie on the ground**

## Diagnostic Logging Added

### Main Update Loop (Line ~1632)

Added detailed logging to detect when visual and body positions desync:

```typescript
// Check for significant offset (indicates desync)
const currentVisualX = piece.shape.x;
const currentVisualY = piece.shape.y;
const offsetX = visualX - currentVisualX;
const offsetY = visualY - currentVisualY;

if (Math.abs(offsetX) > 5 || Math.abs(offsetY) > 5) {
  if (Math.random() < 0.05) {
    console.log(`⚠️ [SYNC] ${piece.id}: Correcting visual from (${currentVisualX}, ${currentVisualY}) to (${visualX}, ${visualY}), offset=(${offsetX}, ${offsetY}), bodyPos=(${matterBody.position.x}, ${matterBody.position.y}), displayOrigin=(${displayOriginX}, ${displayOriginY})`);
  }
}
```

## What to Look For

**Refresh your browser** and watch the console when pieces collide with ground pieces:

### Expected Output (Good):
- No `⚠️ [SYNC]` messages → Visual and body stay aligned ✅
- Pieces stack naturally without "falling apart" ✅

### Problem Output (Bad):
```
⚠️ [SYNC] piece_5: Correcting visual from (450.0, 580.0) to (500.0, 590.0), offset=(50.0, 10.0)
```
- This indicates the visual was at one position, but the body moved to another
- The offset shows how far apart they were before correction

## Possible Root Causes

If you see desync messages, it could be:

1. **Bodies becoming static when they shouldn't**
   - Check if pieces on the ground are marked as static
   - Static bodies won't respond to collisions

2. **Display origin changing during gameplay**
   - Unlikely but possible if something modifies the shape

3. **Race condition in update order**
   - Body updated by Matter.js physics
   - But visual update happens too late or gets overridden

4. **Collision response moving bodies**
   - Matter.js collision moves body position
   - But we're not syncing visual fast enough
   - Creates visual "lag" that looks like falling apart

## Current Sync Strategy

We sync in **two places**:

### 1. Main Update Loop (Every Frame)
```typescript
if (matterBody && !piece.placed && !piece.isDragging) {
  const visualX = matterBody.position.x + piece.shape.displayOriginX;
  const visualY = matterBody.position.y + piece.shape.displayOriginY;
  piece.shape.setPosition(visualX, visualY);
  piece.shape.setRotation(matterBody.angle);
}
```
- Runs every frame for all non-placed, non-dragging pieces
- Should keep visual aligned with body

### 2. Explosion Update Loop
```typescript
const correctedVisualX = bodyX + piece.shape.displayOriginX;
const correctedVisualY = bodyY + piece.shape.displayOriginY;
piece.shape.setPosition(correctedVisualX, correctedVisualY);
piece.shape.setRotation(matterBody.angle);
```
- Runs during explosion phase
- Same sync logic

## Next Steps Based on Console Output

### If you see NO desync messages:
The sync is working! The "falling apart" might be:
- Physics restitution (bounciness) too high
- Collision shapes not matching visual well enough
- Need to adjust physics parameters (friction, density, etc.)

### If you see desync messages:
The sync is happening but something is overriding it:
- Look for other code that calls `piece.shape.setPosition()`
- Check if something is modifying the body position without syncing
- May need to add sync calls in other locations

## Testing Instructions

1. **Refresh browser**
2. **Enable physics mode** (should be on by default)
3. **Watch the explosion** - pieces fall and collide
4. **Watch for console messages**:
   - `⚠️ [SYNC]` = Desync detected and corrected
   - `⚠️ [OFFSET]` = Offset during explosion phase
5. **Observe visual behavior**:
   - Do pieces "jump" or "teleport"?
   - Do collision outlines stay aligned?
   - Do pieces "fall apart" when they shouldn't?

Share the console output and describe what you see visually!

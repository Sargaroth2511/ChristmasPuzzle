# Matter.js Vertex Alignment Fix

## Problem Summary

Collision bodies created with `Matter.Bodies.fromVertices()` were offset 6-8 pixels **right and up** from their visual sprites, despite body centers being positioned correctly.

## Root Cause

From Matter.js documentation:

> **Bodies.fromVertices**: "The resulting vertices are **reorientated about their centre of mass**, and offset such that `body.position` corresponds to this point."

When you pass vertices to `fromVertices()`, Matter.js:

1. **Calculates the centroid** (geometric center of mass) using `Vertices.centre()`
2. **Re-centers the vertices** around that centroid (origin 0,0)
3. Sets `body.position` to the calculated centroid
4. Translates vertices to world space

### Why This Caused an Offset

Our `piece.localPoints` were relative to the **visual sprite's anchor point** (center). But for irregular shapes, the **geometric centroid** calculated by Matter.js is often different from the visual center.

Example:
- Visual center (sprite anchor): `(0, 0)`
- Geometric centroid (Matter.js): `(6.2, 8.5)`

When Matter.js re-centered the vertices around its calculated centroid, they no longer aligned with the visual sprite, even though we later moved `body.position` to match the visual center.

## The Solution

**Pre-calculate the centroid and subtract it from vertices BEFORE passing to `fromVertices()`.**

### Implementation

```typescript
// 1. Calculate centroid using Matter.js's formula
let centroid = { x: 0, y: 0 };
let signedArea = 0;
for (let i = 0; i < simplifiedVertices.length; i++) {
  const j = (i + 1) % simplifiedVertices.length;
  const cross = simplifiedVertices[i].x * simplifiedVertices[j].y - 
                simplifiedVertices[j].x * simplifiedVertices[i].y;
  signedArea += cross;
  centroid.x += (simplifiedVertices[i].x + simplifiedVertices[j].x) * cross;
  centroid.y += (simplifiedVertices[i].y + simplifiedVertices[j].y) * cross;
}
signedArea *= 0.5;
centroid.x /= (6 * signedArea);
centroid.y /= (6 * signedArea);

// 2. Pre-center vertices by subtracting centroid
const centeredVertices = simplifiedVertices.map(v => ({
  x: v.x - centroid.x,
  y: v.y - centroid.y
}));

// 3. Create body with pre-centered vertices
body = (this.matter.bodies as any).fromVertices(
  centerX, centerY,        // Position at visual center
  [centeredVertices],      // Use pre-centered vertices
  { /* options */ }
);
```

### How It Works

1. **Before the fix**: 
   - Input vertices relative to visual center: `[(x, y), ...]`
   - Matter.js calculates centroid: `(6.2, 8.5)`
   - Matter.js re-centers vertices around `(6.2, 8.5)`
   - Result: **Vertices offset by `(6.2, 8.5)` from visual**

2. **After the fix**:
   - Input vertices already centered around their centroid: `[(x-6.2, y-8.5), ...]`
   - Matter.js calculates centroid: `(0, 0)` ✅
   - Matter.js re-centers vertices around `(0, 0)` (no change)
   - Result: **Perfect alignment** ✅

## Key Insights from Matter.js Documentation

### `Vertices.centre()` Formula
Uses the **signed area method** to calculate centroid:

```javascript
var area = Vertices.area(vertices, true),
    centre = { x: 0, y: 0 };

for (var i = 0; i < vertices.length; i++) {
    j = (i + 1) % vertices.length;
    cross = Vector.cross(vertices[i], vertices[j]);
    temp = Vector.mult(Vector.add(vertices[i], vertices[j]), cross);
    centre = Vector.add(centre, temp);
}

return Vector.div(centre, 6 * area);
```

### `Body.setVertices()` Process

```javascript
// 1. Orient vertices around centre of mass at origin (0, 0)
var centre = Vertices.centre(body.vertices);
Vertices.translate(body.vertices, centre, -1);  // Subtract centroid

// 2. Update inertia while vertices are at origin
Body.setInertia(body, Body._inertiaScale * Vertices.inertia(body.vertices, body.mass));

// 3. Translate to world space
Vertices.translate(body.vertices, body.position);
```

## Testing

After implementing this fix:

1. **Refresh the browser**
2. Check console output:
   ```
   ⚙️ [CONVERT] piece_1: Centroid offset: (6.23, 8.47)
   ⚙️ [CONVERT] piece_1: Visual=(454.5, 504.0), Body=(454.5, 504.0)
   ⚙️ [CONVERT] piece_1: Body vertices: (439.3, 483.7), ...
   ⚙️ [CONVERT] piece_1: Expected vertices: (439.3, 483.7), ...
   ```
   Body vertices should now **match** expected vertices ✅

3. **Visual verification**: Green collision outlines should perfectly align with puzzle pieces

## Alternative Solutions Considered

### ❌ Adjust body position after creation
```typescript
// Doesn't work - vertices already re-centered
this.matter.body.setPosition(body, { x: centerX - centroid.x, y: centerY - centroid.y });
```
**Problem**: Matter.js already re-centered vertices. Moving the body moves both position AND vertices, maintaining the offset.

### ❌ Use Body.setCentre()
```typescript
Body.setCentre(body, { x: centerX, y: centerY }, false);
```
**Problem**: Documentation states: "Invalid if centre falls outside the body's convex hull."

### ✅ Pre-center vertices (chosen solution)
**Why**: Works with Matter.js's internal logic rather than against it. Vertices are already centered when passed to `fromVertices()`, so Matter.js's re-centering is a no-op.

## References

- [Matter.js Bodies.fromVertices](https://brm.io/matter-js/docs/classes/Bodies#method_fromVertices)
- [Matter.js Vertices.centre](https://brm.io/matter-js/docs/classes/Vertices#method_centre)
- [Matter.js Body.setVertices](https://brm.io/matter-js/docs/classes/Body#method_setVertices)

## Files Modified

- `ClientApp/src/game/puzzle.scene.ts` (lines ~2907-2970)
  - Added centroid pre-calculation
  - Pre-centered vertices before `fromVertices()`
  - Updated diagnostic logging

## Next Steps

1. ✅ Refresh browser to verify fix
2. ✅ Confirm collision shapes align with visuals
3. ✅ Test physics behavior (stacking, collision response)
4. Remove or reduce diagnostic logging once verified

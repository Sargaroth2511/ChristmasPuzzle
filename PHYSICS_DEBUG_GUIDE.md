# Matter.js Physics Debug Guide

## How to View the Collision Models

### 1. Open the Application
- Navigate to: http://localhost:4300
- Open browser Developer Tools (F12)
- Go to the Console tab

### 2. Enable Realistic Physics
- Click the **"Realistic Physics"** toggle button below the puzzle scene
- Watch the console for physics initialization messages

### 3. What You Should See

#### Console Output
```
✅ Matter.js physics enabled - pieces will fall with realistic physics
✅ Polygon body for piece_1: {
  inputVertices: 156,
  simplifiedTo: 24,
  bodyParts: 3,              // Concave shape decomposed into 3 convex parts
  totalBodyVertices: 72,
  position: { x: "234.5", y: "456.7" },
  bounds: { min: { x: "200", y: "400" }, max: { x: "269", y: "513" } }
}
✅ Polygon body for piece_2: ...
[Matter Debug] Static bodies: 4, Dynamic bodies: 24
```

#### Visual Overlays
- **RED outlines** = Static walls (floor, ceiling, left/right sides)
  - Thick polygons at screen edges
  - Should be large and clearly visible
  
- **GREEN outlines** = Dynamic puzzle pieces
  - Green polygons around each piece
  - Shows the actual collision shape
  - May be multiple polygons per piece (concave decomposition)
  
- **Small dots** = Vertices of collision polygons
  - Lighter colored dots show vertex positions
  
- **Center dots** = Body centers of mass
  - Larger filled circles at body centers

### 4. Understanding the Body Structure

#### Simple Pieces (Convex)
```
bodyParts: 2              // 1 parent + 1 convex hull
totalBodyVertices: 24     // Single polygon with 24 vertices
```

#### Complex Pieces (Concave - with tabs/slots)
```
bodyParts: 4              // 1 parent + 3 decomposed parts
totalBodyVertices: 72     // 3 polygons × 24 vertices each
```

Matter.js automatically decomposes concave shapes into multiple convex parts for accurate collision detection.

### 5. Common Issues & Solutions

#### Issue: No Green Outlines Visible
**Symptoms:**
- Only red walls visible
- No green polygons around pieces

**Diagnosis:**
1. Check console: `[Matter Debug] Static bodies: 4, Dynamic bodies: 0`
2. No polygon creation messages

**Solutions:**
- Ensure physics toggle is ON (button should show "Disable Physics")
- Refresh the page after enabling physics
- Check for errors in console (red text)

#### Issue: Weird Collision Behavior
**Symptoms:**
- Pieces collide when far apart
- Pieces pass through each other
- Excessive spinning or bouncing

**Diagnosis:**
1. Look at the green collision polygons
2. Check if they match the visual piece shape
3. Observe console for body part counts

**Possible Causes:**

**A) Over-simplification**
```
simplifiedTo: 8    // Too few vertices
```
- Solution: Increase `targetVertexCount` in convertToMatterBody()
- Currently: 24 vertices
- Try: 30-40 for more accuracy (at cost of performance)

**B) Excessive Decomposition**
```
bodyParts: 12    // Too many parts
```
- Solution: Adjust `minimumArea` parameter
- Currently: 10
- Try: 20-50 to merge small parts

**C) Incorrect Vertex Winding**
- Vertices must be in clockwise order
- Matter.js may create incorrect hulls if counter-clockwise

**D) High Restitution (Bounciness)**
```
restitution: 0.5    // Currently moderate
```
- Try: 0.2-0.3 for less bouncing
- Try: 0.8-1.0 for more bouncing

**E) Low Friction**
```
friction: 0.8       // Currently high
frictionAir: 0.005  // Currently low
```
- Increase friction: 0.9-1.0 for more grip
- Increase frictionAir: 0.01-0.02 to slow down faster

### 6. Debug Commands (Browser Console)

#### Inspect Physics State
```javascript
// Get the puzzle scene
const scene = window.game?.scene?.scenes[1];

// Check if Matter physics is enabled
console.log('Physics enabled:', scene.useMatterPhysics);

// Count bodies
const bodies = scene.matter?.world?.localWorld?.bodies;
console.log('Total bodies:', bodies?.length);

// List all bodies
bodies?.forEach((body, i) => {
  console.log(`Body ${i}:`, {
    label: body.label,
    isStatic: body.isStatic,
    parts: body.parts?.length,
    position: body.position
  });
});
```

#### Toggle Debug Rendering
```javascript
// Force debug rendering on/off
const scene = window.game?.scene?.scenes[1];
scene.useMatterPhysics = true;  // Force enable
```

#### Inspect a Specific Piece
```javascript
const scene = window.game?.scene?.scenes[1];
const piece = scene.pieces[0];  // First piece

console.log('Piece info:', {
  id: piece.id,
  position: { x: piece.shape.x, y: piece.shape.y },
  vertices: piece.localPoints.length,
  hasMatterBody: !!piece.matterBody,
  bodyParts: piece.matterBody?.parts?.length
});
```

### 7. Performance Monitoring

#### FPS Counter
- Look for frame rate drops
- Target: 60 FPS
- Below 30 FPS indicates performance issues

#### Body Count
```
[Matter Debug] Static bodies: 4, Dynamic bodies: 24
```
- Static: Should always be 4 (walls)
- Dynamic: Equals number of active (non-placed) pieces

#### Vertex Count
```
simplifiedTo: 24    // Per piece
totalBodyVertices: 72   // Per piece after decomposition
```
- Higher = more accurate, slower
- Lower = less accurate, faster

### 8. Visual Comparison

#### Expected vs Actual

**Expected Behavior:**
1. Green polygons closely follow piece shapes
2. Tabs and slots visible in collision outlines
3. Multiple green shapes per piece (concave decomposition)
4. Smooth collision response
5. Pieces stack naturally

**Actual Problems to Report:**
1. Green polygons much larger than pieces
2. Flat rectangles instead of piece-shaped polygons
3. Single polygon for clearly concave pieces
4. Excessive spinning after collision
5. Pieces stuck together or vibrating

### 9. Screenshot Guidelines

When reporting issues, capture:
1. Full game view with visible green/red overlays
2. Browser console with body creation messages
3. Specific weird behavior (use browser recording if possible)
4. Include the body structure from console logs

### 10. Quick Test Procedure

1. Open http://localhost:4300
2. Open DevTools Console (F12)
3. Enable "Realistic Physics" toggle
4. Wait for explosion
5. Check console for polygon creation messages
6. Observe green outlines during/after explosion
7. Try dragging a piece - should push others
8. Report any unexpected behavior with screenshots

---

## Common Observations

### Normal Behavior
- ✅ 24 puzzle pieces create 24 green collision bodies
- ✅ Each body has 2-5 parts (concave decomposition)
- ✅ Collision shapes roughly match visual shapes
- ✅ Pieces bounce, roll, and settle naturally
- ✅ Dragged pieces push others on contact

### Problematic Behavior
- ❌ Bodies created but no green outlines visible
- ❌ Collision shapes are simple rectangles
- ❌ Pieces spin violently after small collisions
- ❌ Collision polygons much larger/smaller than pieces
- ❌ Pieces pass through each other
- ❌ FPS drops below 30

---

**Last Updated**: October 9, 2025  
**Version**: 1.0

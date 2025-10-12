# Collision Detection - How It Works

## Current Status: ✅ Drag works, collision requires physics mode

## How Collision Detection Works

### Two Physics Modes:

1. **Simple Mode (Default)** 🎯
   - Pure drag-and-drop
   - **No Matter.js bodies**
   - **No collisions**
   - Pieces don't interact with each other
   - Fastest performance
   
2. **Matter.js Mode (Enable via Physics Toggle Button)** ⚛️
   - Realistic physics simulation
   - **Pieces have Matter.js bodies**
   - **Collisions enabled**
   - Dragged pieces push other pieces away
   - Pieces fall with gravity
   - More realistic, more fun

## How to Enable Collisions

### Step 1: Click the Physics Toggle Button
- Located below the game scene
- Toggle it to **enable Matter.js physics**

### Step 2: Verify in Console
You should see:
```
[togglePhysicsMode] Switching to Matter.js mode
✅ Matter.js physics enabled - pieces will fall with realistic physics
[togglePhysicsMode] Converted 22 pieces to Matter bodies
```

### Step 3: Drag a Piece
When you start dragging, you should see:
```
[Drag Collision] Piece has Matter body - collision detection active during drag
```

### Step 4: Test Collisions
- Drag one piece **quickly** toward another piece
- The other piece should be **pushed away**
- The faster you drag, the harder the push

## Why No Collisions in Simple Mode?

**Performance**: Creating Matter.js bodies for all pieces uses more CPU/memory. By keeping it optional:
- Users on slower devices can use simple mode
- Users who want realistic physics can enable Matter mode
- Best of both worlds! 🎉

## Troubleshooting

### "I toggled physics but pieces don't collide"

**Check:**
1. Did you see the console message "Converted X pieces to Matter bodies"?
2. When you drag, do you see "[Drag Collision]" message?
3. Are you dragging **fast enough**? Slow drags have low velocity
4. Try dragging a piece **directly into** another piece

### "Pieces fall off screen in Matter mode"

This is expected! Matter.js has gravity. Pieces will fall until they hit:
- The floor (world boundary at bottom)
- Other pieces
- When you place them correctly

### "Collision feels weak"

The velocity is scaled by 0.1 for smooth interaction. To make it stronger, you can:
- Drag **faster** for more force
- Ask me to increase the velocity multiplier

## Technical Details

### During Drag (Matter Mode):
```typescript
// Calculate velocity from mouse movement
velocityX = (currentX - previousX) / deltaTime
velocityY = (currentY - previousY) / deltaTime

// Apply to Matter body (scaled down)
setVelocity(body, { 
  x: velocityX * 0.1,  // 10% of actual velocity
  y: velocityY * 0.1 
})
```

### Collision Response:
- When dragged piece's Matter body moves with velocity
- Matter.js detects collision with other bodies
- Physics engine calculates realistic response
- Other pieces get pushed based on:
  - Mass (all pieces have same mass currently)
  - Velocity of collision
  - Angle of impact
  - Friction and restitution settings

## Console Commands for Testing

Open console (F12) and try:

```javascript
// Check if a piece has a Matter body
game.scene.scenes[0].pieces[0].matterBody

// Check current physics mode
game.scene.scenes[0].matter.world.engine.gravity.y
// 0 = simple mode, 1 = matter mode

// Manually toggle physics
game.scene.scenes[0].togglePhysicsMode(true)  // Enable
game.scene.scenes[0].togglePhysicsMode(false) // Disable
```

## Summary

- ✅ **Dragging works** in both modes
- ✅ **Collisions work** in Matter.js mode only
- ✅ **Toggle button** switches between modes
- ✅ **Console logs** confirm what's happening
- ⚠️ **Enable Matter mode** for collision detection

Try enabling Matter physics mode and dragging pieces around! The collision should work beautifully! 🎄⚛️

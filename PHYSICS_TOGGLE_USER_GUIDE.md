# Physics Toggle - User Guide

## 🎮 How to Use the Physics Toggle

### Finding the Toggle Button
Look for the physics toggle button at the **bottom center** of the game screen. It's a sleek button that shows the current physics mode.

### Toggle States

#### 🔵 **Arcade Mode** (Default)
- **What it does**: Simple drag-and-drop puzzle mechanics
- **Visual**: Blue border with bouncing ball icon
- **Label**: "Arcade - Simple Physics"
- **Behavior**: 
  - Pieces stay exactly where you place them
  - No gravity or falling
  - Predictable, classic puzzle experience
  - Best for focused puzzle-solving

#### 🟠 **Matter.js Mode** (Realistic Physics)
- **What it does**: Real-world physics simulation
- **Visual**: Orange border with molecular structure icon
- **Label**: "Matter.js - Realistic Physics"
- **Behavior**:
  - Pieces fall with gravity
  - Pieces bounce and rotate naturally
  - Pieces can interact and collide
  - More challenging and dynamic!

### Switching Modes
1. **Click the button** at the bottom of the screen
2. Watch the button animate and change color
3. Physics mode switches instantly
4. Try dragging and dropping pieces to feel the difference!

### Tips & Tricks

**In Matter.js Mode:**
- Drop pieces from different heights for variety
- Watch pieces bounce and settle naturally
- Pieces will tumble and rotate realistically
- Already-placed pieces won't move (they're locked)

**When to Use Each Mode:**
- **Arcade**: When you want to focus on solving the puzzle
- **Matter.js**: When you want a more dynamic, challenging experience

### Button Behavior
- ✅ Available during active gameplay
- ⛔ Disabled when modals are open
- ⛔ Disabled when puzzle is complete
- 📱 Works on mobile and desktop

### Keyboard Accessibility
- Button is fully keyboard accessible
- Use Tab to focus, Enter/Space to toggle
- Screen reader friendly with ARIA labels

## 🛠️ Developer Notes

### Integration
The physics toggle communicates with:
- **Puzzle Scene**: Applies physics to game objects
- **App Component**: Manages UI state
- **Matter.js**: Phaser's built-in physics engine

### Performance
- Physics bodies are only created when Matter mode is active
- Switching to Arcade mode removes all physics bodies
- Optimized update loop syncs visuals with physics

### Debugging
If you encounter issues:
1. Open browser console (F12)
2. Look for physics-related messages
3. Check that Matter.js is properly initialized
4. Verify pieces have correct bounds

Console messages:
```
✅ Matter.js physics enabled - pieces will fall with realistic physics
✅ Physics disabled - back to simple drag-and-drop
```

## 🎨 Customization

### For Developers
Want to tweak the physics? Edit these values in `puzzle.scene.ts`:

```typescript
// In convertToMatterBody method:
{
  restitution: 0.4,    // Bounciness (0-1)
  friction: 0.05,      // Surface friction
  frictionAir: 0.01,   // Air resistance
  density: 0.001       // Mass per area
}
```

### For Designers
Button styling is in `physics-toggle.component.scss`:
- Colors: Change `.arcade-mode` and `.matter-mode` border colors
- Size: Adjust padding in `.physics-toggle-button`
- Position: Modify `.physics-toggle-container` position
- Animation: Edit `@keyframes pulse`

## 📱 Mobile Experience
- Button automatically adjusts for smaller screens
- Touch-friendly size (minimum 44x44px touch target)
- Responsive text sizing
- Works in both portrait and landscape

## ❓ FAQ

**Q: Can I toggle while dragging a piece?**
A: No, the toggle is temporarily disabled during drag operations to prevent conflicts.

**Q: Will my puzzle progress be lost when toggling?**
A: No! Already-placed pieces stay locked in position regardless of physics mode.

**Q: Does Matter.js mode make the puzzle harder?**
A: It can be! Pieces falling and bouncing adds a fun challenge, but you can always switch back to Arcade mode.

**Q: Why do some pieces fall faster than others?**
A: In Matter.js mode, pieces have realistic mass based on their size. Larger pieces may fall slightly differently.

**Q: Can pieces fall off the screen?**
A: No, the game world has boundaries. Pieces will bounce off the edges and bottom.

## 🐛 Known Limitations

1. **Complex Shapes**: Physics bodies use rectangular bounds for simplicity
2. **Mobile Performance**: Matter.js mode may be slightly slower on older devices
3. **Collision Accuracy**: Very small pieces may have slightly simplified collision

## 🎯 Best Practices

1. **Start with Arcade**: Learn the puzzle layout first
2. **Try Matter.js**: Add excitement once you're familiar
3. **Mix and Match**: Switch modes based on difficulty preference
4. **Have Fun**: Experiment with different drop heights and angles!

---

Enjoy the enhanced puzzle experience with dynamic physics! 🎉

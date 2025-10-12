# Console Log Debugging Guide

## How to Collect Console Logs

### 1. **Open Developer Console**
- Press `F12` or `Ctrl+Shift+I` (Linux/Windows) or `Cmd+Option+I` (Mac)
- Click on the **Console** tab

### 2. **Clear Previous Logs**
- Click the 🚫 (clear) button in the console
- Or type `console.clear()` and press Enter

### 3. **Reload the Page**
- Press `Ctrl+Shift+R` (hard reload) to ensure fresh code
- Watch the console as the game loads

### 4. **Let the Game Run**
- Wait for the explosion animation to complete (pieces falling)
- Try to drag a piece
- Let it run for at least 10-15 seconds

### 5. **Copy All Console Output**
- Right-click in the console
- Select "Save as..." or just select all text (Ctrl+A)
- Copy and paste the entire log

## What We're Looking For

### Expected Log Sequence (Normal):

```
[beginIntroExplosion] Starting explosion with 12 pieces
[beginIntroExplosion] explosionActive: true, explosionComplete: false
[launchPieceExplosionWithMatter] Piece launched with Matter body, velocity: (...)
[launchPieceExplosionWithMatter] Piece launched with Matter body, velocity: (...)
... (one for each piece)

[Explosion Progress] 0/12 pieces settled, 12 have Matter bodies
[Explosion Progress] 3/12 pieces settled, 12 have Matter bodies
[Piece Settling] Piece settled - speed: 0.0234, angularSpeed: 0.0123, nearGround: true, ...
[Piece Settling] Piece settled - speed: 0.0189, angularSpeed: 0.0098, nearGround: true, ...
[Explosion Progress] 9/12 pieces settled, 12 have Matter bodies
[Explosion Complete] All 12 pieces settled, transitioning to puzzle phase

[preparePiecesForPuzzle] Starting puzzle preparation
[preparePiecesForPuzzle] Gravity disabled
[preparePiecesForPuzzle] Piece 0 made draggable, interactive: true, draggable: true
[preparePiecesForPuzzle] Piece 1 made draggable, interactive: true, draggable: true
...
[preparePiecesForPuzzle] Puzzle ready - explosionComplete: true, explosionActive: false, total pieces: 12

[update] Game running - explosionActive: false, explosionComplete: true, pieces: 12

// When you try to drag:
[dragstart] Drag started on object
[dragstart] Piece 5 drag started successfully
```

### Possible Problem Scenarios:

#### Scenario 1: Explosion Never Completes
```
[Explosion Progress] 11/12 pieces settled, 12 have Matter bodies
[Explosion Progress] 11/12 pieces settled, 12 have Matter bodies
// Stuck here - one piece never settles
```

#### Scenario 2: No Matter Bodies Created
```
[Explosion Progress] 0/12 pieces settled, 0 have Matter bodies
// No pieces have Matter bodies!
```

#### Scenario 3: Pieces Not Interactive
```
[preparePiecesForPuzzle] Piece 0 made draggable, interactive: false, draggable: false
// Pieces not marked as interactive/draggable
```

#### Scenario 4: Drag Handler Not Firing
```
// You click on pieces but see no [dragstart] messages
```

## Critical Information to Send

Please send me:

1. **Full console log** from page load to when you try dragging
2. **Any error messages** (shown in red)
3. **What you observe** visually:
   - Do pieces explode and fall?
   - Do they eventually settle?
   - Can you see them at all?
   - What happens when you click/drag them?

4. **Browser info**: Chrome/Firefox/Safari version

## Quick Test Commands

You can also type these in the console to get instant info:

```javascript
// Check if explosion is complete
game.scene.scenes[0].explosionComplete

// Check how many pieces exist
game.scene.scenes[0].pieces.length

// Check if a piece is draggable
game.scene.scenes[0].pieces[0].shape.input.draggable

// Check if a piece has Matter body
game.scene.scenes[0].pieces[0].matterBody
```

## Filtering Logs

If there's too much output, you can filter:
- Type `[Explosion` in the filter box to see only explosion logs
- Type `[dragstart]` to see only drag logs
- Type `[preparePieces` to see preparation logs

---

**Just copy and paste the entire console output and send it to me!** 🎄

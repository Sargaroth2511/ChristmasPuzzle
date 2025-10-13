# Drag Handler Display Origin Fix

## Problem Identified

User observed:
- ✅ Pieces align correctly when **dropped** (after dragend)
- ❌ Pieces are **offset during dragging**
- ❌ When pieces interact with other elements, they fall apart

This indicates the **drag handler** was not accounting for `displayOrigin`.

## Root Cause

During dragging, we were syncing the Matter.js body to the **visual position** directly:

```typescript
// WRONG - visual position includes displayOrigin offset
this.matter.body.setPosition(matterBody, { x: piece.shape.x, y: piece.shape.y });
```

But the body needs to be at the **anchor position** (visual position - displayOrigin):

```typescript
// CORRECT - convert visual to anchor
const bodyX = piece.shape.x - piece.shape.displayOriginX;
const bodyY = piece.shape.y - piece.shape.displayOriginY;
this.matter.body.setPosition(matterBody, { x: bodyX, y: bodyY });
```

## Locations Fixed

### 1. Simple Drag (no dragOffset) - Line ~2026

**Before:**
```typescript
this.matter.body.setPosition(matterBody, { x: dragX, y: dragY });
```

**After:**
```typescript
const bodyX = dragX - piece.shape.displayOriginX;
const bodyY = dragY - piece.shape.displayOriginY;
this.matter.body.setPosition(matterBody, { x: bodyX, y: bodyY });
```

### 2. Complex Drag (with dragOffset and rotation) - Line ~2047

**Before:**
```typescript
this.matter.body.setPosition(matterBody, { x: piece.shape.x, y: piece.shape.y });
```

**After:**
```typescript
const bodyX = piece.shape.x - piece.shape.displayOriginX;
const bodyY = piece.shape.y - piece.shape.displayOriginY;
this.matter.body.setPosition(matterBody, { x: bodyX, y: bodyY });
```

## Why This Matters

During dragging:
1. User moves the piece → visual position updates
2. We make the body static (no gravity)
3. We sync body position to match visual
4. **Without displayOrigin correction**: Body is offset → collision shape doesn't match visual
5. **With displayOrigin correction**: Body at anchor → collision shape aligns perfectly ✅

## Testing

**Refresh the browser** and test:

1. **During drag**: 
   - Green collision outline should align with piece ✅
   - Console may show: `🖱️ [DRAG] piece_1: Visual=(456.0, 504.2), Body=(419.7, 446.8), Origin=(36.3, 57.4)`

2. **When dropped**:
   - Pieces should fall naturally with aligned collision bodies ✅
   - No "falling apart" when interacting with other pieces ✅

3. **When stacking**:
   - Pieces should stack realistically ✅
   - Collision detection should be accurate ✅

## Complete Fix Summary

Now **all coordinate conversions** account for displayOrigin:

| Location | Conversion | Formula |
|----------|-----------|---------|
| Body creation | Visual → Anchor | `body.pos = shape.pos - displayOrigin` |
| Update loop | Anchor → Visual | `shape.pos = body.pos + displayOrigin` |
| Explosion loop | Anchor → Visual | `shape.pos = body.pos + displayOrigin` |
| Prepare puzzle | Visual → Anchor | `body.pos = shape.pos - displayOrigin` |
| **Drag handler** | Visual → Anchor | `body.pos = shape.pos - displayOrigin` |
| Dragend | Visual → Anchor | `body.pos = shape.pos - displayOrigin` |

All conversions are now **consistent** and **correct**! 🎉

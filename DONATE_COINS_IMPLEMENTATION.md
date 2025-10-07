# Donate Coins Implementation

## Overview
Implemented functionality to send game results to the backend when users click the "Münzen senden" button. User stats (coins collected, completion time, puzzle completion) are now updated in the database only when the user explicitly chooses to donate.

## Changes Made

### 1. Updated `donateCoins()` Method
**Before**: 
- Just showed a temporary message
- No data was sent to backend
- No user stats were updated

**After**:
- Checks if user is validated and has completed the game
- Sends coin total, completion time, and puzzle completion status to backend
- Updates user data in the database
- Shows success/error in console
- Displays donation confirmation message

### 2. Removed Automatic Stats Update
**Before**: 
- Stats were automatically sent when puzzle completed
- Used hardcoded value of 12 pieces
- User had no control over submission

**After**:
- Stats only sent when user clicks "Münzen senden"
- Uses actual coin total from game
- User has full control over when to submit results

### 3. Greeting Text Updated
**Removed "wieder" from greetings**:
- German (Informal): "Hallo [Name]! Schön, dass du da bist! 🎄"
- German (Formal): "Hallo [Name]! Schön, dass Sie da sind! 🎄"
- English: "Hello [Name]! Great to see you! 🎄"

## Implementation Details

### `donateCoins()` Function Flow

```typescript
1. Check if user is validated
   ├─ No → Just show donation message (anonymous users)
   └─ Yes → Continue

2. Send data to backend
   ├─ piecesAchieved: this.coinTotal (actual coins collected)
   ├─ completionTimeSeconds: this.completionTime
   └─ puzzleCompleted: true

3. Handle response
   ├─ Success → Update userData, show confirmation
   └─ Error → Log error, still show confirmation message

4. Show donation message for 2 seconds
```

### Data Sent to Backend

```json
{
  "piecesAchieved": 15,           // Actual coin count
  "completionTimeSeconds": 45.3,  // Time taken
  "puzzleCompleted": true
}
```

### Backend Response

The backend returns updated user data:
```json
{
  "uid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "name": "Lars Engels",
  "language": 0,
  "salutation": 1,
  "maxPiecesAchieved": 15,        // Updated with new max
  "fastestTimeSeconds": 45.3,     // Updated with new best
  "totalPuzzlesCompleted": 1,     // Incremented
  "lastAccessedUtc": "2025-10-07T13:42:00Z"
}
```

## User Experience

### For Validated Users

1. **Complete the puzzle**
2. **See completion overlay** with coin count and time
3. **Choose action**:
   - "Neues Spiel" → Restart without submitting
   - "Münzen senden" → Submit results to backend

4. **After clicking "Münzen senden"**:
   - Results sent to backend
   - User data updated in database
   - Confirmation message shown: "{coinTotal} Münzen für einen guten Zweck gespendet"
   - "Neues Spiel" button hidden
   - Can only see the donation message

### For Anonymous Users

1. **Complete the puzzle**
2. **See completion overlay** with coin count and time
3. **Click "Münzen senden"** (if shown):
   - Just shows confirmation message
   - No data sent (no UID)
   - Can continue playing

## Console Logs

### Successful Donation (Validated User):
```
💰 Sending coins to backend: 15 Time: 45.3
✅ Game results sent successfully: {name: "Lars Engels", maxPiecesAchieved: 15, ...}
```

### Anonymous User:
```
(No console logs - just shows message)
```

### API Error:
```
💰 Sending coins to backend: 15 Time: 45.3
❌ Failed to send game results: [Error details]
(Still shows donation message to user)
```

## API Endpoint Used

**POST** `/api/users/{uid}/stats`

**Request Body**:
```json
{
  "piecesAchieved": 15,
  "completionTimeSeconds": 45.3,
  "puzzleCompleted": true
}
```

**Response**: Updated `UserData` object

## Testing

### Test with Valid User:
1. Load: `http://127.0.0.1:4300/?uid=a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d`
2. Complete the puzzle
3. Click "Münzen senden"
4. Check console for success message
5. Check `users.json` file for updated stats

### Expected Database Update:
Before:
```json
{
  "Uid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "Name": "Lars Engels",
  "MaxPiecesAchieved": null,
  "FastestTimeSeconds": null,
  "TotalPuzzlesCompleted": null
}
```

After (first completion with 15 coins in 45.3 seconds):
```json
{
  "Uid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "Name": "Lars Engels",
  "MaxPiecesAchieved": 15,
  "FastestTimeSeconds": 45.3,
  "TotalPuzzlesCompleted": 1,
  "LastAccessedUtc": "2025-10-07T13:42:00.000Z"
}
```

After (second completion with 18 coins in 52.1 seconds):
```json
{
  "Uid": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "Name": "Lars Engels",
  "MaxPiecesAchieved": 18,        // Updated (better than 15)
  "FastestTimeSeconds": 45.3,     // Kept (45.3 is faster than 52.1)
  "TotalPuzzlesCompleted": 2,     // Incremented
  "LastAccessedUtc": "2025-10-07T13:45:00.000Z"
}
```

## Benefits

✅ **User Control**: Users decide when to submit results
✅ **Accurate Data**: Uses actual coin count from game
✅ **Graceful Errors**: Still shows message even if API fails
✅ **Anonymous Support**: Works for users without UID (just shows message)
✅ **Stats Tracking**: Properly updates max coins, fastest time, total completions
✅ **No Duplicates**: Only submits when user clicks button

# User Individualization Feature

## Overview

This feature adds personalized user tracking to the Christmas Puzzle game. Users can access personalized links with a unique UID to track their progress, see their name in greetings, and monitor their best statistics.

## Features

- **Personalized Greetings**: Users are greeted by their name
- **Maximum Pieces Achieved**: Tracks the highest number of puzzle pieces placed
- **Fastest Completion Time**: Records the best completion time in seconds
- **Total Puzzles Completed**: Counts how many times the puzzle has been completed
- **Last Accessed**: Tracks when the user last accessed their puzzle

## Data Storage

User data is stored in a JSON file located at:
```
src/Server/ChristmasPuzzle.Server/App_Data/users.json
```

### JSON Structure

```json
{
  "users": [
    {
      "uid": "unique-user-id",
      "name": "User Name",
      "maxPiecesAchieved": 12,
      "fastestTimeSeconds": 45.5,
      "totalPuzzlesCompleted": 3,
      "lastAccessedUtc": "2025-10-07T12:00:00Z"
    }
  ]
}
```

## API Endpoints

### 1. Get User Data
**GET** `/api/users/{uid}?name=OptionalName`

Retrieves user data by UID. If the user doesn't exist, a new user is created.

**Parameters:**
- `uid` (path, required): Unique user identifier
- `name` (query, optional): User's display name (used only when creating new user)

**Response:**
```json
{
  "uid": "user-123",
  "name": "John Doe",
  "maxPiecesAchieved": 12,
  "fastestTimeSeconds": 45.5,
  "totalPuzzlesCompleted": 3,
  "lastAccessedUtc": "2025-10-07T12:00:00Z"
}
```

### 2. Update User Statistics
**POST** `/api/users/{uid}/stats`

Updates user statistics after game progress or completion.

**Parameters:**
- `uid` (path, required): Unique user identifier

**Request Body:**
```json
{
  "piecesAchieved": 12,
  "completionTimeSeconds": 45.5,
  "puzzleCompleted": true
}
```

**Response:**
```json
{
  "uid": "user-123",
  "name": "John Doe",
  "maxPiecesAchieved": 12,
  "fastestTimeSeconds": 45.5,
  "totalPuzzlesCompleted": 4,
  "lastAccessedUtc": "2025-10-07T12:30:00Z"
}
```

## Usage Examples

### Creating a Personalized Link

Users can access their personalized puzzle using a URL like:
```
https://yoursite.com/?uid=user-123&name=John
```

### Frontend Integration Example

```typescript
// In your Angular component
export class AppComponent {
  private userId: string;
  private userName: string;
  userData: UserData;

  ngOnInit() {
    // Get UID from URL parameters
    const params = new URLSearchParams(window.location.search);
    this.userId = params.get('uid') || this.generateUID();
    this.userName = params.get('name') || 'Puzzler';
    
    // Load user data
    this.loadUserData();
  }

  async loadUserData() {
    const response = await fetch(`/api/users/${this.userId}?name=${this.userName}`);
    this.userData = await response.json();
    
    // Display greeting
    console.log(`Welcome back, ${this.userData.name}!`);
    console.log(`Your best time: ${this.userData.fastestTimeSeconds}s`);
    console.log(`Max pieces: ${this.userData.maxPiecesAchieved}`);
  }

  async onPuzzleComplete(completionTime: number, piecesPlaced: number) {
    const response = await fetch(`/api/users/${this.userId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        piecesAchieved: piecesPlaced,
        completionTimeSeconds: completionTime,
        puzzleCompleted: true
      })
    });
    
    this.userData = await response.json();
    
    // Show achievement messages if records were broken
    if (completionTime === this.userData.fastestTimeSeconds) {
      console.log('New record time!');
    }
  }

  private generateUID(): string {
    return 'user-' + Math.random().toString(36).substr(2, 9);
  }
}
```

## Architecture

### Components

1. **UserData.cs**: Model representing user data
2. **UpdateUserStatsRequest.cs**: DTO for updating statistics
3. **UserDataService.cs**: Service handling JSON file read/write operations with thread-safety
4. **UsersController.cs**: API controller exposing user endpoints
5. **users.json**: JSON file storing all user data

### Thread Safety

The `UserDataService` uses a `SemaphoreSlim` to ensure thread-safe read/write operations on the JSON file, preventing data corruption from concurrent requests.

### Auto-Creation

When a user accesses the application with a new UID, a user record is automatically created with default values.

## Testing

### Test Getting User Data
```bash
curl http://localhost:5000/api/users/test-user-001?name=TestUser
```

### Test Updating Stats
```bash
curl -X POST http://localhost:5000/api/users/test-user-001/stats \
  -H "Content-Type: application/json" \
  -d '{
    "piecesAchieved": 12,
    "completionTimeSeconds": 45.5,
    "puzzleCompleted": true
  }'
```

## Deployment Notes

- The `App_Data` folder is automatically created if it doesn't exist
- Ensure the application has write permissions to the `App_Data` folder
- The `users.json` file is created automatically on first use
- Consider backing up the `users.json` file periodically
- For production, consider migrating to a database if user count grows significantly

## Future Enhancements

Potential improvements:
- Add user authentication
- Implement database storage for better scalability
- Add user profile pictures
- Track puzzle-specific statistics
- Implement leaderboards
- Add social sharing features
- Track piece placement patterns and heatmaps

# Quick Reference: User Individualization

## 🎯 What You Got

A complete user tracking system with:
- **Personalized greetings** (by name)
- **Max pieces achieved** tracking
- **Fastest completion time** tracking
- **Total completions** counter
- **JSON storage** in `App_Data/users.json`

## 📂 Files Created

```
src/Server/ChristmasPuzzle.Server/
├── App_Data/users.json                    ← User database
└── Features/Users/
    ├── UserData.cs                        ← Data model
    ├── UpdateUserStatsRequest.cs          ← Update DTO
    ├── UserDataService.cs                 ← Business logic
    ├── UsersController.cs                 ← API endpoints
    ├── README.md                          ← Full documentation
    └── Users.http                         ← API tests

Program.cs                                  ← Updated (DI registration)
USER_INDIVIDUALIZATION_SUMMARY.md          ← Implementation guide
```

## 🔌 API Endpoints

### Get User Data
```
GET /api/users/{uid}?name={optional-name}
```
**Example**: `GET /api/users/john-123?name=John`

**Response**:
```json
{
  "uid": "john-123",
  "name": "John",
  "maxPiecesAchieved": 12,
  "fastestTimeSeconds": 45.5,
  "totalPuzzlesCompleted": 3,
  "lastAccessedUtc": "2025-10-07T12:00:00Z"
}
```

### Update Stats
```
POST /api/users/{uid}/stats
Content-Type: application/json

{
  "piecesAchieved": 12,
  "completionTimeSeconds": 45.5,
  "puzzleCompleted": true
}
```

## 🎮 User Flow

1. **User visits**: `yoursite.com/?uid=john-123&name=John`
2. **Frontend calls**: `GET /api/users/john-123?name=John`
3. **Show greeting**: "Welcome back, John!"
4. **Display stats**: Best time, max pieces
5. **On completion**: `POST /api/users/john-123/stats` with results
6. **Show achievements**: "New record!" if applicable

## 💻 Frontend Integration (Copy-Paste Ready)

### TypeScript Interface
```typescript
export interface UserData {
  uid: string;
  name: string;
  maxPiecesAchieved: number;
  fastestTimeSeconds: number | null;
  totalPuzzlesCompleted: number;
  lastAccessedUtc: string;
}
```

### Get UID from URL
```typescript
// In ngOnInit or constructor
const params = new URLSearchParams(window.location.search);
const uid = params.get('uid') || this.generateUID();
const name = params.get('name') || 'Puzzler';

private generateUID(): string {
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}
```

### Load User Data
```typescript
async loadUser() {
  const response = await fetch(`/api/users/${uid}?name=${name}`);
  const userData = await response.json();
  console.log(`Welcome, ${userData.name}!`);
}
```

### Update on Completion
```typescript
async onComplete(time: number, pieces: number) {
  await fetch(`/api/users/${uid}/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      piecesAchieved: pieces,
      completionTimeSeconds: time,
      puzzleCompleted: true
    })
  });
}
```

## 🧪 Test It Now

1. **Start the server**:
   ```bash
   cd src/Server/ChristmasPuzzle.Server
   dotnet run
   ```

2. **Open `Users.http`** in VS Code

3. **Click "Send Request"** above any HTTP request

4. **See results immediately**!

Or use curl:
```bash
curl "http://localhost:5000/api/users/test-123?name=Test"
```

## 📊 Data Storage

The `users.json` file grows automatically:
```json
{
  "Users": [
    { "Uid": "user-1", "Name": "Alice", ... },
    { "Uid": "user-2", "Name": "Bob", ... }
  ]
}
```

**Location**: `src/Server/ChristmasPuzzle.Server/App_Data/users.json`

## ⚠️ Important Notes

- ✅ **Thread-safe**: Multiple users can access simultaneously
- ✅ **Auto-creates**: New users are created on first access
- ✅ **Smart updates**: Only saves improvements (best time, max pieces)
- ⚠️ **Backup**: The JSON file is your database - back it up!
- 🔒 **Security**: Use long random UIDs (like UUIDs) in production

## 🚀 Next Steps

1. **Add to Angular app**: Create a `UserService`
2. **Parse URL params**: Extract `uid` and `name`
3. **Display stats**: Show user greeting and records
4. **Call on complete**: Update stats when puzzle finishes
5. **Show achievements**: Celebrate new records!

## 🎨 UI Ideas

```html
<!-- Welcome banner -->
<div class="welcome">
  <h2>Welcome back, {{userName}}! 🎄</h2>
  <p>Best time: {{bestTime}}s | Max pieces: {{maxPieces}}</p>
</div>

<!-- Achievement popup -->
<div class="achievement" *ngIf="newRecord">
  🎉 New Record! {{recordType}}: {{recordValue}}
</div>
```

## 📚 Full Documentation

See these files for more details:
- `Features/Users/README.md` - Complete API documentation
- `USER_INDIVIDUALIZATION_SUMMARY.md` - Implementation guide
- `Users.http` - API testing examples

---

**Ready to go!** Everything is built, tested, and ready to integrate. 🎄✨

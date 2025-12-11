# Statistics API - Setup Guide

## 🔐 Setting Up the Access Key in IIS

The Statistics API is protected by an access key that must be configured as an environment variable on your IIS server.

### Step 1: Generate a Strong Access Key

Generate a random 32+ character key. You can use PowerShell:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Example output: `kJ8mNpR3sT9wXyZ2aB5cD8eF1gH4iK7l`

### Step 2: Configure in IIS

1. Open **IIS Manager**
2. Navigate to your site → **Configuration Editor**
3. Section: Select `appSettings`
4. Collection: Click `(Add)` button
5. Add new entry:
   - **Name**: `Statistics:AccessKey`
   - **Value**: `your-generated-key-here`
6. Click **Apply**
7. Restart your application pool

**Alternative: Environment Variables UI**
1. IIS Manager → Your Site → **Configuration Editor**
2. Section: `system.webServer/aspNetCore`
3. Find `environmentVariables` collection
4. Add: `Statistics__AccessKey` = `your-generated-key-here`
   - Note: Use **double underscore** `__` instead of `:`

### Step 3: Verify Configuration

Check that your app can read the key:
1. Check application logs after restart
2. Should see: "StatisticsService initialized"
3. No errors about missing configuration

---

## 📡 API Endpoints

All endpoints require the `X-Stats-Key` header with your access key.

### Authentication

```bash
curl -H "X-Stats-Key: your-key-here" https://your-domain.com/api/statistics/overview
```

### Available Endpoints

#### 1. **Overview Statistics**
```
GET /api/statistics/overview
```

Returns summary statistics:
- Total users, players, completion rate
- Average/median/fastest times
- Language and salutation distribution
- Total games played

**Example:**
```bash
curl -H "X-Stats-Key: your-key" https://your-domain.com/api/statistics/overview
```

#### 2. **Leaderboards**
```
GET /api/statistics/leaderboard?type={fastest|mostPlayed|mostPieces}&limit=10
```

Parameters:
- `type`: `fastest` (default), `mostPlayed`, or `mostPieces`
- `limit`: Number of entries (1-100, default: 10)

**Examples:**
```bash
# Top 10 fastest times
curl -H "X-Stats-Key: your-key" \
  "https://your-domain.com/api/statistics/leaderboard?type=fastest&limit=10"

# Top 25 most active players
curl -H "X-Stats-Key: your-key" \
  "https://your-domain.com/api/statistics/leaderboard?type=mostPlayed&limit=25"
```

#### 3. **User List**
```
GET /api/statistics/users?filter={all|played|completed|notPlayed}&sortBy={name|fastestTime|totalGames|lastPlayed}
```

Parameters:
- `filter`: `all` (default), `played`, `completed`, `notPlayed`
- `sortBy`: `name` (default), `fastestTime`, `totalGames`, `lastPlayed`

**Examples:**
```bash
# All users sorted by name
curl -H "X-Stats-Key: your-key" \
  "https://your-domain.com/api/statistics/users?filter=all&sortBy=name"

# Users who completed, sorted by fastest time
curl -H "X-Stats-Key: your-key" \
  "https://your-domain.com/api/statistics/users?filter=completed&sortBy=fastestTime"
```

#### 4. **Export to CSV**
```
GET /api/statistics/export
```

Downloads a CSV file with all user statistics.

**Example:**
```bash
curl -H "X-Stats-Key: your-key" \
  https://your-domain.com/api/statistics/export \
  -o statistics.csv
```

---

## 🌐 Browser Usage

You can also call these endpoints from a browser using JavaScript:

```javascript
const key = 'your-key-here';

fetch('https://your-domain.com/api/statistics/overview', {
  headers: {
    'X-Stats-Key': key
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 🔒 Security Notes

- **Never commit** the access key to git
- **Use HTTPS** in production
- **Rotate the key** periodically
- **Limit access** to authorized personnel only
- Keys are **case-sensitive**

---

## 🐛 Troubleshooting

### "Statistics endpoint is not properly configured"
- The `Statistics:AccessKey` environment variable is not set in IIS
- Follow Step 2 above to configure it

### "Unauthorized. X-Stats-Key header is required"
- You didn't include the header in your request
- Add: `-H "X-Stats-Key: your-key"` to curl commands

### "Unauthorized. Invalid access key"
- The key you provided doesn't match the configured key
- Check for typos, trailing spaces, or case sensitivity
- Verify the key in IIS configuration

### No data returned
- Check that users.json exists in App_Data folder
- Verify users have played the game (seed data has null stats initially)

---

## 📊 Example Response Formats

### Overview
```json
{
  "generatedAt": "2025-12-11T10:00:00Z",
  "totalUsers": 382,
  "usersWhoPlayed": 156,
  "usersWhoCompleted": 89,
  "completionRate": 23.3,
  "averageCompletionTimeSeconds": 165.4,
  "medianCompletionTimeSeconds": 142.0,
  "fastestTimeSeconds": 83.2,
  "totalGamesPlayed": 423,
  "languages": {
    "german": 345,
    "english": 37
  },
  "salutations": {
    "informal": 298,
    "formal": 84
  }
}
```

### Leaderboard
```json
{
  "generatedAt": "2025-12-11T10:00:00Z",
  "type": "Fastest Completion Times",
  "totalEntries": 10,
  "entries": [
    {
      "rank": 1,
      "name": "John Beier",
      "timeSeconds": 83.2,
      "timeFormatted": "1:23",
      "totalGamesPlayed": 5,
      "maxPiecesAchieved": 22,
      "lastPlayed": "2025-12-10T15:30:00Z"
    }
  ]
}
```

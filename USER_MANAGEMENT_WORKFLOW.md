# User Management Workflow

## Overview
This document explains how to manage users across development and production environments while preserving game progress.

## Two User Data Files

### 1. seed-users.json (Source of Truth for Profiles)
**Location**: `src/Server/ChristmasPuzzle.Server/seed-users.json`  
**Purpose**: Deployable user profile data  
**In Git**: ✅ Yes, version controlled  
**Contains**: Profile data only (Uid, FirstName, LastName, Language, Salutation)  
**Excludes**: Game progress (MaxPiecesAchieved, FastestTimeSeconds, etc.)

### 2. App_Data/users.json (Runtime Data)
**Location**: `src/Server/ChristmasPuzzle.Server/App_Data/users.json`  
**Purpose**: Live user data with game progress  
**In Git**: ❌ No, excluded via .gitignore  
**Contains**: Full user data (profiles + game stats)  
**Source**: Merged from seed-users.json + existing game data on startup

## Adding New Users - Development Workflow

### Option A: Add to Seed File First (RECOMMENDED)

1. **Edit seed-users.json**:
   ```json
   {
     "Users": [
       {
         "Uid": "new-guid-here",
         "FirstName": "New",
         "LastName": "Developer",
         "Language": 0,
         "Salutation": 1
       }
     ]
   }
   ```

2. **Restart the application**
   - UserDataService will merge on startup
   - New user appears in App_Data/users.json with null game stats
   - User can now play and accumulate game progress

3. **Commit seed-users.json to git**
   ```bash
   git add seed-users.json
   git commit -m "feat: Add new user - New Developer"
   ```

4. **Deploy**
   - seed-users.json is included in deployment
   - User exists in production with clean slate (no game data)

✅ **Advantages**:
- User is version controlled
- Automatic deployment
- Clean workflow
- Single source of truth

### Option B: Add via API/Runtime (Current Gap)

1. User plays game without being in seed file
2. UserDataService creates user in App_Data/users.json
3. User accumulates game progress

❌ **Problems**:
- User only exists locally in App_Data/users.json
- NOT in seed-users.json → Won't deploy to production
- Manual sync required

⚠️ **If you use this approach**, you must manually sync:

**Manual Sync Process**:
1. Copy user profile from App_Data/users.json
2. Add to seed-users.json (REMOVE game stats!)
3. Commit seed-users.json
4. On next deployment, user will exist in production

## Current Users in Your Dev Environment

From your `users.json`, I see:

| User | Has Game Progress | In seed-users.json? |
|------|------------------|---------------------|
| Lars Engels | ❌ No | ✅ Yes |
| Larissa Spahl | ❌ No | ✅ Yes |
| John Beier | ❌ No | ✅ Yes |
| Johannes Beier | ✅ Yes (22 pieces) | ✅ Yes |

✅ **Good news**: All 4 users are already in seed-users.json!  
✅ **Ready to deploy**: All users will exist in production

## Adding Many New Users at Once

### Scenario: Adding 10 new developers

1. **Generate GUIDs** (use online tool or PowerShell):
   ```powershell
   1..10 | ForEach-Object { [guid]::NewGuid() }
   ```

2. **Batch edit seed-users.json**:
   ```json
   {
     "Users": [
       {"Uid": "guid-1", "FirstName": "Dev1", "LastName": "User", "Language": 0, "Salutation": 0},
       {"Uid": "guid-2", "FirstName": "Dev2", "LastName": "User", "Language": 0, "Salutation": 0},
       {"Uid": "guid-3", "FirstName": "Dev3", "LastName": "User", "Language": 1, "Salutation": 1}
       // ... etc
     ]
   }
   ```

3. **Restart app** → All users available immediately

4. **Commit once** → All users deployed together

## What Happens on Deployment

### First Deployment
```
Server has: (empty)
Deploy contains: seed-users.json with 4 users

Result: App creates App_Data/users.json with 4 users (no game data)
```

### After Users Play Games
```
Server has: App_Data/users.json with game progress
  - Johannes: 22 pieces, 47.7s
  
Deploy contains: seed-users.json (unchanged)

Result: Merge preserves Johannes's 22 pieces + 47.7s time ✅
```

### Adding 5th User
```
Server has: App_Data/users.json with 4 users
  - Johannes: 22 pieces (game data)
  
Deploy contains: seed-users.json with 5 users
  - New user: Sarah Smith
  
Result after merge:
  - Johannes: Profile updated if changed, 22 pieces PRESERVED ✅
  - Sarah: Added to users.json with null game stats ✅
```

### Updating Lars's Name
```
Server has: App_Data/users.json
  - Lars Engels: 50 pieces (game data)
  
Deploy contains: seed-users.json
  - Lars Engel (name corrected, removed 's')
  
Result after merge:
  - Lars Engel: Name updated, 50 pieces PRESERVED ✅
```

## Important Rules

### ✅ DO:
- Add new users to seed-users.json FIRST
- Commit seed-users.json to git
- Use seed-users.json as source of truth for profiles
- Let the merge logic handle updates automatically

### ❌ DON'T:
- Edit App_Data/users.json manually (it's auto-generated)
- Add game progress fields to seed-users.json
- Copy App_Data/users.json to production
- Remove users from seed-users.json (they'll persist from existing data)

## Migration Path: Existing Local Users

If you have users in App_Data/users.json that aren't in seed-users.json:

1. **Extract profile data** from App_Data/users.json
2. **Add to seed-users.json** (without game stats)
3. **Commit seed-users.json**
4. **Restart app** to verify merge works
5. **Deploy** - users now in production

## Testing Your Current Setup

Want to verify the merge works? Try this:

1. **Update Lars's first name** in seed-users.json:
   ```json
   "FirstName": "Larry"  // Changed from Lars
   ```

2. **Restart the application**

3. **Check App_Data/users.json**:
   - Name should be "Larry" ✅
   - All game stats preserved ✅

4. **Check logs** for merge confirmation

## FAQ

**Q: Can I add users directly via the API?**  
A: Technically possible, but they won't deploy. Best practice: Add to seed-users.json first.

**Q: What if I delete a user from seed-users.json?**  
A: They persist in App_Data/users.json! The merge preserves users not in seed.

**Q: How do I really remove a user?**  
A: Remove from seed-users.json AND manually edit App_Data/users.json on server.

**Q: Can I have different users in dev vs production?**  
A: Yes! seed-users.json deploys everywhere, but each environment's App_Data/users.json can have additional users.

**Q: What happens if two environments have conflicting game progress for the same Uid?**  
A: Each environment is independent. App_Data/users.json is never copied between environments.

## Recommended Workflow Summary

```
Developer adds user to seed-users.json
        ↓
Commits to git
        ↓
Deploys to server
        ↓
App merges seed → App_Data/users.json
        ↓
User plays game, accumulates stats
        ↓
Next deployment: Profile updates from seed, stats preserved
```

This creates a clean separation:
- **Profile data** (seed-users.json) → Version controlled, deployable
- **Game data** (App_Data/users.json) → Server-specific, persistent

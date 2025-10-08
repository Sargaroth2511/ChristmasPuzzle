# User Data Protection Strategy

## Problem
Deploying new versions should NOT overwrite user game data (users.json). Users' puzzle progress, coins, and completion times must persist across deployments.

## Solution Implemented

### 1. Data Storage Location
- User data stored in `App_Data/users.json`
- This folder is created at runtime next to the executable
- Located at: `myapp/App_Data/users.json` on the server

### 2. Deployment Protection
✅ **Build Script (`publish-optimized.sh`)**
- Automatically removes `App_Data` from deployment package
- Creates seed data in `seed-data/users.json.seed` for first-time setup
- Ensures user data can never be accidentally overwritten

✅ **Git Protection (`.gitignore`)**
- `App_Data/` folder excluded from version control
- `users.json` files never committed to repository
- Prevents accidental inclusion in source code

✅ **Runtime Behavior (`UserDataService.cs`)**
- Creates `App_Data` folder automatically if missing
- Creates empty `users.json` if file doesn't exist
- Never overwrites existing user data

### 3. Deployment Workflow

#### First Deployment
1. Run `./publish-optimized.sh`
2. Copy all files to server
3. **Optional**: Copy `seed-data/users.json.seed` to `myapp/App_Data/users.json` for initial data
4. App runs and manages `users.json` from there

#### Subsequent Updates
1. Run `./publish-optimized.sh` (builds new version)
2. Copy ONLY `myapp/` folder to server
3. **NEVER** copy `App_Data/` folder
4. User data automatically preserved ✅

### 4. File Structure

```
Production Server:
==================
publish-optimized/
├── myapp/
│   ├── ChristmasPuzzle.Server.exe
│   ├── wwwroot/                    ← Your app updates
│   └── App_Data/                   ← NEVER in deployment
│       └── users.json              ← User data (PERSISTS!)
│
├── seed-data/
│   └── users.json.seed             ← First-time seed only
│
└── web.config

Development Build:
==================
publish-optimized/
├── myapp/                          ← Deploy this folder
│   ├── (NO App_Data)               ← Excluded by build script
│   └── wwwroot/
│
└── seed-data/                      ← Optional seed data
    └── users.json.seed
```

### 5. Safety Mechanisms

| Protection Layer | What It Does |
|-----------------|--------------|
| **Build Script** | Removes `App_Data` from deployment package |
| **`.gitignore`** | Prevents committing user data to git |
| **Runtime Code** | Creates file only if missing, never overwrites |
| **Documentation** | Warns against copying `App_Data` on updates |

### 6. Data Flow

```
First Run:
----------
1. App starts
2. Checks for App_Data/users.json
3. If missing → Creates empty file
4. Ready to store user data

User Plays Game:
---------------
1. User completes puzzle
2. App updates users.json
3. Data persisted to disk
4. User can reload page - data preserved

New Deployment:
--------------
1. Build script excludes App_Data
2. Copy myapp/ to server
3. App_Data/users.json untouched
4. All user progress preserved ✅
```

### 7. Recovery Scenarios

**Lost App_Data folder?**
- App creates new empty `users.json`
- User data lost (backup important!)
- Recommend periodic backups of `App_Data/`

**Want to reset all user data?**
- Stop IIS site
- Delete `myapp/App_Data/users.json`
- Start IIS site
- Fresh empty file created

**Want seed data for testing?**
- Copy `seed-data/users.json.seed` to `myapp/App_Data/users.json`
- Edit the file with test data
- Restart app

### 8. Best Practices

✅ **DO:**
- Keep `App_Data/` on the server between deployments
- Backup `users.json` regularly (outside deployment)
- Monitor `App_Data/` folder size and growth
- Use seed file for fresh installations only

❌ **DON'T:**
- Never copy `App_Data/` during updates
- Never commit `users.json` to git
- Never manually edit `users.json` while app is running
- Never delete production `users.json` without backup

### 9. Monitoring

Check user data health:
```bash
# On server
ls -lh myapp/App_Data/
cat myapp/App_Data/users.json | jq '.Users | length'  # Count users
```

### 10. Backup Strategy

Recommended backup script (run before deployments):
```bash
# Backup user data before updating
DATE=$(date +%Y%m%d_%H%M%S)
cp myapp/App_Data/users.json ~/backups/users_$DATE.json
```

## Summary

**User data is now fully protected:**
- ✅ Excluded from deployment builds
- ✅ Ignored by git
- ✅ Automatically created if missing
- ✅ Never overwritten by updates
- ✅ Documented for team awareness

Users can play the puzzle game, earn coins, and complete challenges with confidence that their progress will persist across application updates! 🎉

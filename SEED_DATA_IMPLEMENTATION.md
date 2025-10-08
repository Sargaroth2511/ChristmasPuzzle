# Seed Data Implementation Summary

## Overview
Implemented a sophisticated data merge strategy that allows deploying user profile updates while preserving game progress across deployments.

## Problem Solved
Previously, deploying `users.json` would overwrite existing user data, causing loss of:
- Game achievements (MaxPiecesAchieved)
- High scores (FastestTimeSeconds)
- Completion counts (TotalPuzzlesCompleted)
- Access timestamps (LastAccessedUtc)

## Solution Architecture

### 1. Seed Data File
**Location**: `src/Server/ChristmasPuzzle.Server/seed-users.json`

**Contents**: Profile data only
- `Uid` - User unique identifier
- `FirstName` - User's first name
- `LastName` - User's last name
- `Language` - Preferred language (0=German, 1=English)
- `Salutation` - Salutation type (0=Neutral, 1=Formal)

**Excludes**: All game progress fields

### 2. Merge Logic
**Location**: `UserDataService.cs` - `InitializeDataFile()` method

**Process on startup**:
1. Read `seed-users.json` from deployment directory
2. Read existing `App_Data/users.json` (if exists)
3. For each user in seed file:
   - If exists: Update profile fields, **preserve game progress**
   - If new: Add user with null game stats
4. Preserve users in `users.json` not present in seed file
5. Write merged data to `App_Data/users.json`

**Example Merge**:
```
Seed File:              Existing users.json:           Merged Result:
-----------             -------------------            ---------------
Uid: abc123             Uid: abc123                    Uid: abc123
FirstName: John         FirstName: Johnny              FirstName: John ✓ (updated)
LastName: Beier         LastName: Beier                LastName: Beier
Language: 1             Language: 0                    Language: 1 ✓ (updated)
Salutation: 1           Salutation: 0                  Salutation: 1 ✓ (updated)
                        MaxPieces: 42                  MaxPieces: 42 ✓ (preserved!)
                        FastestTime: 125               FastestTime: 125 ✓ (preserved!)
                        TotalCompleted: 10             TotalCompleted: 10 ✓ (preserved!)
```

### 3. Build Configuration
**File**: `ChristmasPuzzle.Server.csproj`

Added `seed-users.json` to build output:
```xml
<Content Update="seed-users.json">
  <CopyToOutputDirectory>Always</CopyToOutputDirectory>
</Content>
```

### 4. Deployment Protection
**File**: `publish-optimized.sh`

- `App_Data/` directory is **excluded** from deployment builds
- `seed-users.json` is **included** in myapp/ folder
- Updated deployment README with merge process documentation

## Data Flow

### First Deployment
1. Deploy app with `seed-users.json`
2. No `App_Data/users.json` exists yet
3. App creates `App_Data/users.json` from seed data
4. Users have profiles, no game progress yet

### Subsequent Deployments
1. Deploy app with updated `seed-users.json`
2. Existing `App_Data/users.json` has user game progress
3. On startup, app merges:
   - Profile updates from seed → `users.json`
   - Game progress preserved → `users.json`
4. Users get profile updates, keep all achievements

### User Plays Game
1. User completes puzzle
2. Game stats updated in `App_Data/users.json`
3. Next deployment: Game stats preserved
4. User never loses progress

## Key Benefits

✅ **Deploy Profile Changes**: Update names, languages, salutations via seed file  
✅ **Preserve Achievements**: Game stats never lost on deployment  
✅ **Add New Users**: Simply add to seed file and deploy  
✅ **Rename Users**: Update seed file, achievements follow user Uid  
✅ **Version Control**: seed-users.json in git, users.json excluded  
✅ **Automatic Merge**: No manual intervention required  

## Usage

### Adding a New User (RECOMMENDED WORKFLOW)

**Best Practice**: Add users to seed-users.json FIRST, then deploy.

1. Edit `seed-users.json`:
   ```json
   {
     "Users": [
       {
         "Uid": "new-guid-here",
         "FirstName": "New",
         "LastName": "User",
         "Language": 0,
         "Salutation": 1
       }
     ]
   }
   ```

2. Restart app (dev) or deploy (production)
3. App automatically adds user to `App_Data/users.json` with null game stats
4. Commit seed-users.json to git

✅ **Why this works**:
- User is version controlled
- Automatic deployment to all environments
- No manual sync needed
- Clean separation: profiles in git, game data on server

⚠️ **Alternative (Not Recommended)**: If a user is created via API/runtime and only exists in `App_Data/users.json`, they must be manually added to `seed-users.json` for deployment. This creates extra manual work.

### Adding Multiple New Users
When adding many developers/users in dev mode:

1. **Batch edit seed-users.json** with all new users
2. **Commit to git** once
3. **Restart dev server** → All users available
4. **Deploy** → All users in production

This is much cleaner than creating users one-by-one via the app!

### Updating User Profile
Edit `seed-users.json` with new name/language, deploy.  
Game progress is preserved automatically.

Example: Rename "Lars" to "Larry":
```json
{"Uid": "a1b2c3d4-...", "FirstName": "Larry", ...}
```
On next startup → Name updated, game stats untouched ✅

### Removing a User
**Do NOT remove from seed file** - they'll be preserved from existing `users.json`.  
If removal is needed, manually edit `App_Data/users.json` on server.

The merge logic preserves users that exist in App_Data but not in seed file.

## Logging
The merge process logs detailed information:
- Seed users loaded count
- Existing users loaded count
- Profile updates applied
- New users added
- Existing users preserved

Check logs in `logs/` folder for merge audit trail.

## Testing Checklist

- [x] Build compiles without errors
- [x] seed-users.json copied to build output
- [ ] First deployment creates users.json from seed
- [ ] Profile update preserves game progress
- [ ] New user added via seed file
- [ ] Existing user not in seed is preserved
- [ ] Game progress updates work after merge

## Files Modified

1. `src/Server/ChristmasPuzzle.Server/seed-users.json` - Created
2. `src/Server/ChristmasPuzzle.Server/Features/Users/UserDataService.cs` - Merge logic
3. `src/Server/ChristmasPuzzle.Server/ChristmasPuzzle.Server.csproj` - Build config
4. `publish-optimized.sh` - Deployment documentation
5. `.gitignore` - Already excludes App_Data and users.json

## Related Documentation
- `USER_DATA_PROTECTION.md` - Overall data protection strategy
- `publish-optimized/README-DEPLOYMENT.txt` - Deployment instructions with merge info

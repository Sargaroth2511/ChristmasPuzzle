# Seed Data Merge - Startup Initialization Fix

## Problem Discovered

The seed data merge was not running at application startup because `UserDataService` was registered as a **Singleton** but never instantiated until the first API request.

### Symptoms
- No merge logs when running `dotnet run`
- Only saw basic startup logs (listening on port, environment, content root)
- Merge only happened when first user API call was made
- Made testing difficult - had to make API calls to trigger merge

### Root Cause

In ASP.NET Core, **Singleton services are lazy-loaded**:
- They're registered in DI container
- But not instantiated until first requested
- Constructor only runs when service is first resolved

## Solution

Force `UserDataService` to initialize immediately after app is built in `Program.cs`:

```csharp
var app = builder.Build();

// Force UserDataService to initialize at startup (runs merge logic)
var userDataService = app.Services.GetRequiredService<IUserDataService>();
app.Logger.LogInformation("UserDataService initialized - seed data merge completed");

if (app.Environment.IsDevelopment())
{
    // ... rest of startup
}
```

## Result

### Before Fix
```
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://127.0.0.1:5080
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
```

*No merge logs - merge happens later on first API call*

### After Fix
```
Building...
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Looking for App_Data at: .../bin/Debug/net8.0/App_Data
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Loaded 5 seed users from .../bin/Debug/net8.0/seed-users.json
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Loaded 4 existing users from .../bin/Debug/net8.0/App_Data/users.json
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Updated profile for user a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d: Lars Mueller
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Added new user from seed: e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b: Sarah Schmidt
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      Initialized users.json with 5 total users
info: ChristmasPuzzle.Server.Program[0]
      UserDataService initialized - seed data merge completed
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://127.0.0.1:5080
```

*Merge logs visible immediately! Clear audit trail of what changed*

## Benefits

✅ **Immediate feedback**: See merge results in console on startup
✅ **Better debugging**: Know if merge succeeded before making API calls
✅ **Clear audit trail**: Logs show exactly what profiles updated and users added
✅ **Predictable behavior**: Merge always runs at startup, not randomly on first request
✅ **Easier testing**: Just restart app, check logs, verify merge

## Testing

### Test 1: Update User Profile

**Before restart**:
```bash
# Edit seed file
nano src/Server/ChristmasPuzzle.Server/seed-users.json
# Change Lars Engels → Lars Mueller

# Check current data
cat src/Server/ChristmasPuzzle.Server/bin/Debug/net8.0/App_Data/users.json
# Still shows "Engels"
```

**Restart backend**:
```bash
dotnet run
```

**Expected logs**:
```
✓ Loaded 5 seed users
✓ Loaded 4 existing users
✓ Updated profile for user a1b2c3d4...: Lars Mueller  ← Name changed!
✓ Initialized users.json with 5 total users
```

**After restart**:
```bash
cat src/Server/ChristmasPuzzle.Server/bin/Debug/net8.0/App_Data/users.json
# Now shows "Mueller" with game stats preserved!
```

### Test 2: Add New User

**Before restart**:
```bash
# Add Sarah Schmidt to seed-users.json
nano src/Server/ChristmasPuzzle.Server/seed-users.json
```

**Restart backend**:
```bash
dotnet run
```

**Expected logs**:
```
✓ Added new user from seed: e5f6a7b8...: Sarah Schmidt  ← New user!
✓ Initialized users.json with 5 total users
```

**After restart**:
```bash
cat src/Server/ChristmasPuzzle.Server/bin/Debug/net8.0/App_Data/users.json
# Sarah appears with null game stats
```

## Important Notes

### Development vs Production

**Development (`dotnet run`)**:
- Working directory: `bin/Debug/net8.0/`
- Seed file: `bin/Debug/net8.0/seed-users.json` (auto-copied by build)
- Data file: `bin/Debug/net8.0/App_Data/users.json` (created at runtime)

**Production (IIS deployment)**:
- Working directory: `I:\INETPUP\site\public_html\myapp\`
- Seed file: `myapp/seed-users.json` (included in deployment)
- Data file: `myapp/App_Data/users.json` (persisted across deployments)

### File Locations

The source folder's `App_Data/users.json` is **NOT used during development**. 

To edit game data during development, modify:
```
src/Server/ChristmasPuzzle.Server/bin/Debug/net8.0/App_Data/users.json
```

Or better yet, let the app manage it and only edit `seed-users.json`.

## Related Documentation

- `SEED_DATA_IMPLEMENTATION.md` - Complete merge logic documentation
- `DEPLOYMENT.md` - Production deployment with seed file strategy
- `USER_DATA_PROTECTION.md` - Overall data protection architecture

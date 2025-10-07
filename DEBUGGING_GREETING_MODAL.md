# Debugging Greeting Modal Issues

## Current Issues

### Issue 1: Port 4300 (Angular Dev Server)
- **URL**: `http://127.0.0.1:4300/?uid=dc2fb55c-853a-4574-85db-961a51c615aa`
- **Symptom**: Message is shown but WITHOUT user data (generic greeting instead of personalized)
- **Possible Cause**: API call to `/api/users/{uid}` is failing (likely CORS or proxy issue)

### Issue 2: Port 5080 (ASP.NET Server)
- **URL**: `http://localhost:5080/?uid=dc2fb55c-853a-4574-85db-961a51c615aa`
- **Symptom**: No message shown at all
- **Possible Cause**: Timing issue or event not being triggered

## Debugging Steps

### 1. Check Browser Console Logs
Open the browser console (F12) and look for:

#### Expected Logs for Successful Flow:
```
Validating user with UID: dc2fb55c-853a-4574-85db-961a51c615aa
✅ User data loaded successfully: {uid: "dc2fb55c-853a-4574-85db-961a51c615aa", name: "Puzzler", ...}
Setting greeting message. userFound: true userData: {uid: "dc2fb55c-853a-4574-85db-961a51c615aa", ...}
✅ Personalized greeting set: Hallo Puzzler! Schön, dass du wieder da bist! 🎄
🎬 Initial zoom complete - showing greeting modal
```

#### Expected Logs for Failed API Call:
```
Validating user with UID: dc2fb55c-853a-4574-85db-961a51c615aa
❌ User validation failed: [Error details]
Error details: [Error message and object]
Setting greeting message. userFound: false userData: undefined
ℹ️ Default greeting set: Willkommen! Viel Spaß beim Puzzle! 🎄
🎬 Initial zoom complete - showing greeting modal
```

### 2. Check Network Tab
In the browser's Network tab (F12 → Network), look for:
- Request to: `/api/users/dc2fb55c-853a-4574-85db-961a51c615aa`
- Status: Should be `200 OK`
- Response: Should contain JSON with user data

#### If you see 404 or 500 errors:
- The API endpoint is not being found or is returning an error
- Check backend logs in the terminal running `dotnet run`

#### If you see CORS errors:
- The Angular dev server proxy is not configured correctly
- Check for `proxy.conf.json` in the ClientApp folder

### 3. Verify User Data in Database
Check the file: `/home/jbeier/ChristmasPuzzle/src/Server/ChristmasPuzzle.Server/App_Data/users.json`

Expected content:
```json
{
  "Users": [
    {
      "Uid": "dc2fb55c-853a-4574-85db-961a51c615aa",
      "Name": "Puzzler",
      "Language": 0,
      "Salutation": 0,
      "MaxPiecesAchieved": null,
      "FastestTimeSeconds": null,
      "TotalPuzzlesCompleted": null,
      "LastAccessedUtc": null
    }
  ]
}
```

### 4. Test API Endpoint Directly
Use curl or browser to test the API:

#### For Angular Dev Server (port 4300):
```bash
curl http://127.0.0.1:4300/api/users/dc2fb55c-853a-4574-85db-961a51c615aa
```

#### For ASP.NET Server (port 5080):
```bash
curl http://localhost:5080/api/users/dc2fb55c-853a-4574-85db-961a51c615aa
```

Expected response:
```json
{
  "uid": "dc2fb55c-853a-4574-85db-961a51c615aa",
  "name": "Puzzler",
  "language": 0,
  "salutation": 0,
  "maxPiecesAchieved": null,
  "fastestTimeSeconds": null,
  "totalPuzzlesCompleted": null,
  "lastAccessedUtc": "2025-10-07T13:14:00.000Z"
}
```

## Common Issues and Solutions

### Issue: API Returns 404
**Cause**: User not in database or incorrect GUID format
**Solution**: Verify the GUID in `users.json` matches exactly

### Issue: CORS Error (Angular Dev Server)
**Cause**: Proxy not configured or backend not allowing the origin
**Solution**: 
1. Create `proxy.conf.json` in ClientApp folder:
```json
{
  "/api": {
    "target": "http://localhost:5080",
    "secure": false,
    "changeOrigin": true
  }
}
```
2. Update `angular.json` to use proxy:
```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

### Issue: Modal Not Showing (Port 5080)
**Cause**: Timing issue - greeting modal triggered before Angular is ready
**Solution**: Check console logs for "🎬 Initial zoom complete" message

### Issue: Generic Greeting Instead of Personalized
**Cause**: API call failed or returned error
**Solution**: 
1. Check console for "❌ User validation failed" message
2. Check Network tab for failed API request
3. Verify backend is running on port 5080

## Expected Behavior

### Successful Flow:
1. App loads → `ngOnInit` is called
2. UID parsed from URL → `validateUser` called
3. API request sent to `/api/users/{uid}`
4. API responds with user data
5. `userData` is set, `greetingMessage` is personalized
6. Initial scene plays zoom animation
7. Zoom completes → `initial-zoom-complete` event fired
8. **Greeting modal appears** with personalized message
9. User clicks "Weiter" → Greeting modal hides, stag modal shows
10. User clicks "Weiter" again → Puzzle starts

### Failed API Flow:
1. App loads → `ngOnInit` is called
2. UID parsed from URL → `validateUser` called
3. API request sent to `/api/users/{uid}`
4. API fails (404, 500, CORS, etc.)
5. `userData` remains undefined, `greetingMessage` set to default
6. Initial scene plays zoom animation
7. Zoom completes → `initial-zoom-complete` event fired
8. **Greeting modal appears** with generic message
9. Rest of flow continues normally

## Next Steps

1. Open browser to `http://localhost:5080/?uid=dc2fb55c-853a-4574-85db-961a51c615aa`
2. Open browser console (F12)
3. Look for the console logs mentioned above
4. Check Network tab for API requests
5. Report back what you see in the console

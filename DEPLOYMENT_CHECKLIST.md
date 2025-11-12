# Deployment Checklist - $(date +%Y-%m-%d)

## ✅ Build Status: COMPLETED

### What was built:
- Angular application with production optimizations
- .NET self-contained deployment (includes runtime)
- **Video file included**: `endscene_v1.mp4` (5.6 MB) ✅

### Package Details:
- **Location**: `./publish-optimized/`
- **Size**: 147 MB (full self-contained with .NET runtime)
- **Video location in package**: `myapp/wwwroot/assets/videos/endscene_v1.mp4`

## 📦 What's Included:

✅ Angular app (production build)
✅ All .NET dependencies
✅ .NET 9.0 runtime (self-contained)
✅ Video file (5.6 MB)
✅ All assets (images, fonts, i18n)
✅ seed-users.json (will merge with existing users)
❌ App_Data (excluded - preserves user game progress on server)

## 🚀 Deployment Steps:

### 1. Stop the website on server:
```powershell
Stop-WebSite -Name "ChristmasPuzzle"
```

### 2. Backup current deployment (optional but recommended):
```powershell
Copy-Item -Path "I:\INETPUP\xmas.oh22.net\public_html" -Destination "I:\INETPUP\xmas.oh22.net\backup-$(Get-Date -Format 'yyyy-MM-dd-HHmm')" -Recurse
```

### 3. Deploy new version:
```powershell
# Copy entire myapp folder
Copy-Item -Path ".\publish-optimized\myapp\*" -Destination "I:\INETPUP\xmas.oh22.net\public_html\myapp\" -Recurse -Force

# Copy web.config
Copy-Item -Path ".\publish-optimized\web.config" -Destination "I:\INETPUP\xmas.oh22.net\public_html\" -Force
```

### 4. Verify video is deployed:
```powershell
Test-Path "I:\INETPUP\xmas.oh22.net\public_html\myapp\wwwroot\assets\videos\endscene_v1.mp4"
```
Should return: `True`

### 5. Start the website:
```powershell
Start-WebSite -Name "ChristmasPuzzle"
```

## 🧪 Post-Deployment Testing:

1. **Open the app** in browser
2. **Complete a puzzle** to trigger the video
3. **Verify video plays** correctly
4. **Check user data** is preserved (login with existing user)
5. **Test in multiple browsers** (Chrome, Firefox, Edge)

## 🔍 Video Verification:

The video should be accessible at:
- **URL**: `https://xmas.oh22.net/xmaspuzzlegame/assets/videos/endscene_v1.mp4`
- **Size**: 5.6 MB
- **Format**: MP4

If video doesn't play, check:
- [ ] File permissions on server
- [ ] MIME types configured in IIS (video/mp4)
- [ ] Browser console for 404 errors
- [ ] Network tab to see if file is being requested

## 📊 What's Different from Previous Deployment:

- ✅ Video file now included in assets
- ✅ Latest code changes deployed
- ✅ Fixed puzzle collapse issue (if that was resolved)
- ❌ User data preserved (App_Data not overwritten)

## 🆘 Rollback Procedure (if needed):

```powershell
# Stop site
Stop-WebSite -Name "ChristmasPuzzle"

# Restore from backup
Copy-Item -Path "I:\INETPUP\xmas.oh22.net\backup-YYYY-MM-DD-HHmm\*" -Destination "I:\INETPUP\xmas.oh22.net\public_html\" -Recurse -Force

# Start site
Start-WebSite -Name "ChristmasPuzzle"
```

## 📝 Notes:

- User game progress is preserved (App_Data excluded from deployment)
- seed-users.json will auto-merge with existing users
- Video file is 5.6 MB - first load may take a moment on slow connections
- Consider pre-loading video in code if not already implemented

---
**Build Date**: $(date)
**Package Location**: `./publish-optimized/`
**Ready for deployment**: ✅ YES

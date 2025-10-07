# Deployment Guide

## Quick Start

### Build Deployment Package

```bash
./publish-optimized.sh
```

This creates a `publish-optimized/` folder with everything needed for IIS deployment.

---

## What Gets Created

```
publish-optimized/
├── myapp/              140MB - Deploy this entire folder
│   ├── ChristmasPuzzle.Server.exe
│   ├── *.dll files (runtime + your code)
│   └── wwwroot/        Your Angular app
├── logs/               Empty - IIS will write logs here
└── web.config          IIS configuration
```

---

## Deploy to IIS

### 1. Upload Files

Copy to your IIS site folder (e.g., `I:\INETPUP\xmas.oh22.net\public_html\`):

```powershell
# Stop site
Stop-WebSite -Name "YourSiteName"

# Copy files
Copy-Item .\publish-optimized\* -Destination "I:\INETPUP\xmas.oh22.net\public_html\" -Recurse -Force

# Start site
Start-WebSite -Name "YourSiteName"
```

### 2. Configure IIS (First Time Only)

**Application Pool:**
- Open IIS Manager
- Application Pools → Select your pool
- Set ".NET CLR Version" to **"No Managed Code"**
- Set "Managed Pipeline Mode" to "Integrated"

**Site Configuration:**
- Ensure site points to deployment folder
- Verify "AspNetCoreModuleV2" is installed
  - If not: Install "ASP.NET Core Hosting Bundle" from microsoft.com

**URL Rewrite Module:**
- Install from: https://www.iis.net/downloads/microsoft/url-rewrite
- Required for Angular routing

### 3. Set Permissions

```powershell
$path = "I:\INETPUP\xmas.oh22.net\public_html"

# Grant permissions to IIS users
icacls $path /grant "IIS_IUSRS:(OI)(CI)F" /T

# Grant permissions to Application Pool
icacls $path /grant "IIS APPPOOL\YourAppPoolName:(OI)(CI)F" /T
```

Replace `YourAppPoolName` with your actual application pool name.

---

## Testing

### 1. Browse to Site
```
https://xmas.oh22.net/
```
Should load the puzzle game.

### 2. Test API
```
https://xmas.oh22.net/api/health
```
Should return: `{"status":"healthy"}`

### 3. Check Logs
```powershell
Get-Content I:\INETPUP\xmas.oh22.net\public_html\logs\stdout_*.log -Tail 20
```

Should show:
- ✓ Application started
- ✓ Hosting environment: Production
- ✓ Content root path: I:\INETPUP\...

---

## Updating Existing Deployment

When you make code changes:

```bash
# 1. Build new version
./publish-optimized.sh

# 2. Upload myapp/ folder
# Size: ~140MB

# 3. Restart IIS site
```

**Note:** Self-contained deployments require uploading all 140MB each time. For smaller updates (13MB), consider installing .NET 8.0 Runtime on the server.

---

## Troubleshooting

### 500 Internal Server Error

Run diagnostics:
```powershell
.\diagnose-server.ps1
```

Common fixes:
- Set Application Pool to "No Managed Code"
- Install AspNetCoreModuleV2 (Hosting Bundle)
- Fix file permissions
- Check Event Viewer for errors

See `TROUBLESHOOTING-500-ERROR.md` for detailed steps.

### Empty Log Files

Grant write permissions to logs folder:
```powershell
icacls "I:\INETPUP\xmas.oh22.net\public_html\logs" /grant "IIS_IUSRS:(OI)(CI)M" /T
```

### 404 Not Found

- Verify `myapp/wwwroot/` has files
- Check URL Rewrite Module is installed
- Review web.config rewrite rules

---

## File Structure Reference

### What Goes Where

**On Server:**
```
I:\INETPUP\xmas.oh22.net\public_html\
├── myapp\
│   ├── ChristmasPuzzle.Server.exe     ← Your app
│   ├── hostpolicy.dll                 ← Critical runtime file
│   ├── Microsoft.*.dll                ← ASP.NET runtime
│   ├── System.*.dll                   ← .NET runtime
│   └── wwwroot\                       ← Angular app
│       └── index.html
├── logs\
│   └── stdout_*.log                   ← Auto-created
└── web.config
```

### What's in Git

✅ **Included:**
- Source code (`ClientApp/`, `src/`)
- Build scripts (`publish-optimized.sh/ps1`)
- Documentation (`README.md`, etc.)
- Configuration templates

❌ **Excluded (.gitignore):**
- `publish-optimized/` (build artifact)
- `node_modules/` (npm packages)
- `bin/`, `obj/` (.NET build outputs)
- `wwwroot/` in server project (Angular build output)

---

## Requirements Summary

**Server:**
- Windows Server with IIS
- AspNetCoreModuleV2 (from Hosting Bundle)
- URL Rewrite Module
- No .NET runtime needed (self-contained)

**Development:**
- .NET 8.0 SDK
- Node.js 18+
- Bash shell (for build script)

**Deployment:**
- 140MB disk space
- Write permissions for IIS users
- HTTPS recommended

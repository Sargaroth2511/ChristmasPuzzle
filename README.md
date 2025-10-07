# Christmas Puzzle 🎄

A festive jigsaw puzzle game built with Angular and Phaser 3, featuring a stag illustration that can be assembled piece by piece. Includes a coin collection mechanic and Christmas-themed backgrounds.

## Tech Stack

- **Frontend:** Angular 17+ (Standalone Components)
- **Game Engine:** Phaser 3
- **Backend:** ASP.NET Core 8.0 (Minimal API)
- **Hosting:** IIS (Windows Server)

## Project Structure

```
ChristmasPuzzle/
├── ClientApp/              # Angular application
│   └── src/
│       ├── app/            # Angular components
│       ├── game/           # Phaser game scenes
│       ├── assets/         # Game assets (images, SVGs)
│       └── styles.scss     # Global styles
├── src/Server/             # ASP.NET Core backend
│   └── ChristmasPuzzle.Server/
│       ├── Program.cs      # Application entry point
│       └── Controllers/    # API endpoints
└── publish-optimized.sh    # Deployment script

```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- .NET 8.0 SDK
- Visual Studio Code or Visual Studio 2022

### Install Dependencies

```bash
# Install .NET dependencies
dotnet restore

# Install npm dependencies
cd ClientApp
npm install
```

### Run Development Servers

#### Frontend Only (Angular + Phaser)
```bash
cd ClientApp
npm start
# Opens at http://localhost:4200
```

#### Full Stack (Angular + .NET Backend)
```bash
# Terminal 1: Run .NET backend
cd src/Server/ChristmasPuzzle.Server
dotnet run
# Runs at https://localhost:5001

# Terminal 2: Run Angular dev server
cd ClientApp
npm start
# Opens at http://localhost:4200 (proxies API to :5001)
```

## Building for Production

### Self-Contained Deployment (Recommended)

Build a deployment package that includes the .NET runtime (no server runtime installation needed):

```bash
./publish-optimized.sh
```

This creates `publish-optimized/` with:
- `myapp/` - Application files + .NET runtime (~140MB)
- `logs/` - IIS log folder (auto-created)
- `web.config` - IIS configuration

**Deploy to IIS:**
1. Copy `myapp/`, `logs/`, and `web.config` to your IIS site folder
2. Configure IIS Application Pool: Set ".NET CLR Version" to **"No Managed Code"**
3. Ensure AspNetCoreModuleV2 is installed (from ASP.NET Core Hosting Bundle)

## Game Features

- **Interactive Puzzle:** Drag and drop pieces with touch/mouse support
- **Coin Collection:** Collect spinning coins for bonus points
- **Timer:** Track completion time
- **Responsive:** Works on desktop and mobile devices
- **Kiosk Mode:** Fullscreen + landscape lock for public displays
- **Completion Animation:** Success overlay with confetti effect

## Configuration

### Environment Files

- `ClientApp/src/environments/environment.ts` - Development settings
- `ClientApp/src/environments/environment.production.ts` - Production settings
- `src/Server/ChristmasPuzzle.Server/appsettings.json` - Server configuration
- `src/Server/ChristmasPuzzle.Server/appsettings.Production.json` - Production overrides

### Key Settings

**Angular (environment.production.ts):**
```typescript
export const environment = {
  production: true,
  apiUrl: '/api'  // Relative URL (same origin)
};
```

**ASP.NET Core (appsettings.Production.json):**
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  },
  "AllowedHosts": "*"
}
```

## Deployment

### Requirements

**Server Requirements:**
- Windows Server with IIS
- ASP.NET Core Module V2 (from Hosting Bundle)
- URL Rewrite Module (for SPA routing)

**Build Requirements:**
- Bash shell (Linux/macOS/WSL/Git Bash)
- .NET 8.0 SDK
- Node.js 18+

### Deployment Steps

1. **Build:**
   ```bash
   ./publish-optimized.sh
   ```

2. **Upload to Server:**
   Copy `publish-optimized/` contents to IIS site folder

3. **Configure IIS:**
   - Application Pool → .NET CLR Version: "No Managed Code"
   - Ensure site points to the deployment folder
   - Verify AspNetCoreModuleV2 is installed

4. **Test:**
   - Browse to: `https://yoursite.com/`
   - Check health: `https://yoursite.com/api/health`

### Future Updates

When you make code changes:

```bash
# 1. Build new version
./publish-optimized.sh

# 2. Upload myapp/ folder to server (replaces existing)
# Size: ~140MB

# 3. Restart IIS site
```

## Troubleshooting

### Common Issues

**500 Internal Server Error**
- Check IIS Application Pool is set to "No Managed Code"
- Verify AspNetCoreModuleV2 is installed
- Check file permissions (IIS_IUSRS needs access)
- Review logs in `logs/` folder

**Angular App Not Loading (404)**
- Verify `wwwroot/` folder has files
- Check URL Rewrite Module is installed
- Review web.config rewrite rules

**API Not Responding**
- Check CORS settings in Program.cs
- Verify controllers are registered
- Check application logs

### Diagnostic Tools

Run the diagnostic script on the server:

```powershell
.\diagnose-server.ps1
```

This checks:
- File structure
- IIS configuration  
- AspNetCoreModule installation
- Permissions
- Recent errors

## Project Guidelines

See [AGENTS.md](./AGENTS.md) for:
- Code style conventions
- Testing guidelines
- Commit message format
- Build and deployment commands

## License

Private project - All rights reserved

## Support

For issues or questions, check:
- `TROUBLESHOOTING-500-ERROR.md` - IIS deployment troubleshooting
- `diagnose-server.ps1` - Automated diagnostics
- IIS logs in `logs/` folder
- Windows Event Viewer (Application log)

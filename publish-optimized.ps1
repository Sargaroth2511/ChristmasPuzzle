# Optimized self-contained publish script
# Separates runtime from application for faster updates!

param(
    [string]$Configuration = "Release",
    [string]$OutputPath = ".\publish-optimized"
)

Write-Host "Christmas Puzzle - Optimized Self-Contained Build" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Bundles .NET runtime separately for easy updates!" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build Angular app
Write-Host "Step 1: Building Angular application..." -ForegroundColor Yellow
Set-Location ClientApp

if (Test-Path "node_modules") {
    Write-Host "Node modules found, skipping npm install" -ForegroundColor Green
} else {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Running Angular build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Angular build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Step 2: Copy Angular dist to wwwroot
Write-Host ""
Write-Host "Step 2: Copying Angular dist to wwwroot..." -ForegroundColor Yellow
$wwwrootPath = "src\Server\ChristmasPuzzle.Server\wwwroot"

if (Test-Path $wwwrootPath) {
    Remove-Item -Path $wwwrootPath -Recurse -Force
}

New-Item -ItemType Directory -Path $wwwrootPath -Force | Out-Null
Copy-Item -Path "ClientApp\dist\*" -Destination $wwwrootPath -Recurse -Force
Write-Host "Angular files copied to wwwroot" -ForegroundColor Green

# Step 3: Publish .NET application as SELF-CONTAINED
Write-Host ""
Write-Host "Step 3: Publishing .NET application (SELF-CONTAINED)..." -ForegroundColor Yellow
$tempPublish = ".\temp-publish"

dotnet publish src\Server\ChristmasPuzzle.Server\ChristmasPuzzle.Server.csproj `
    -c $Configuration `
    -o $tempPublish `
    --self-contained true `
    -r win-x64 `
    /p:PublishTrimmed=false `
    /p:PublishSingleFile=false

if ($LASTEXITCODE -ne 0) {
    Write-Host "dotnet publish failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Organize into optimized structure
Write-Host ""
Write-Host "Step 4: Organizing into optimized folder structure..." -ForegroundColor Yellow

# Clean output directory
if (Test-Path $OutputPath) {
    Remove-Item -Path $OutputPath -Recurse -Force
}
New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null

# Create folders
New-Item -ItemType Directory -Path "$OutputPath\app" -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputPath\runtime" -Force | Out-Null
New-Item -ItemType Directory -Path "$OutputPath\logs" -Force | Out-Null

# Move application files to app folder
Write-Host "  Moving application files to app/..." -ForegroundColor Yellow
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.exe" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.dll" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.pdb" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.deps.json" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.runtimeconfig.json" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\ChristmasPuzzle.Server.staticwebassets.endpoints.json" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\appsettings.json" -Destination "$OutputPath\app\" -Force
Move-Item -Path "$tempPublish\appsettings.Development.json" -Destination "$OutputPath\app\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "$tempPublish\appsettings.Production.json" -Destination "$OutputPath\app\" -Force -ErrorAction SilentlyContinue
Move-Item -Path "$tempPublish\wwwroot" -Destination "$OutputPath\app\" -Force

# Move runtime files to runtime folder
Write-Host "  Moving .NET runtime to runtime/..." -ForegroundColor Yellow
Get-ChildItem -Path $tempPublish -File | Move-Item -Destination "$OutputPath\runtime\" -Force
Get-ChildItem -Path $tempPublish -Directory | Move-Item -Destination "$OutputPath\runtime\" -Force

# Create optimized web.config
Write-Host "  Creating web.config..." -ForegroundColor Yellow
@"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <!-- Optimized: .exe in app folder, runtime in runtime folder -->
      <aspNetCore processPath=".\app\ChristmasPuzzle.Server.exe"
                  arguments=""
                  stdoutLogEnabled="true"
                  stdoutLogFile=".\logs\stdout"
                  hostingModel="inprocess">
        <environmentVariables>
          <environmentVariable name="ASPNETCORE_ENVIRONMENT" value="Production" />
        </environmentVariables>
      </aspNetCore>
      
      <staticContent>
        <mimeMap fileExtension=".json" mimeType="application/json" />
        <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
        <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
        <mimeMap fileExtension=".svg" mimeType="image/svg+xml" />
      </staticContent>
      
      <rewrite>
        <rules>
          <rule name="API" stopProcessing="true">
            <match url="^api/.*" />
            <conditions logicalGrouping="MatchAll" trackAllCaptures="false" />
            <action type="None" />
          </rule>
          <rule name="StaticFiles" stopProcessing="true">
            <match url="^(.*\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|map))$" />
            <conditions logicalGrouping="MatchAll" trackAllCaptures="false" />
            <action type="None" />
          </rule>
          <rule name="Angular Routes" stopProcessing="true">
            <match url=".*" />
            <conditions logicalGrouping="MatchAll" trackAllCaptures="false">
              <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
              <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            </conditions>
            <action type="Rewrite" url="/app/wwwroot/index.html" />
          </rule>
        </rules>
      </rewrite>
      
      <httpProtocol>
        <customHeaders>
          <remove name="X-Powered-By" />
          <add name="X-Content-Type-Options" value="nosniff" />
          <add name="X-Frame-Options" value="SAMEORIGIN" />
          <add name="X-XSS-Protection" value="1; mode=block" />
        </customHeaders>
      </httpProtocol>
    </system.webServer>
  </location>
</configuration>
"@ | Out-File -FilePath "$OutputPath\web.config" -Encoding utf8

# Create README for deployment
@"
OPTIMIZED DEPLOYMENT STRUCTURE
==============================

This deployment is organized for easy updates!

FOLDER STRUCTURE:
----------------
publish-optimized\
├── app\                    ← YOUR APPLICATION (update this on changes)
│   ├── ChristmasPuzzle.Server.exe
│   ├── ChristmasPuzzle.Server.dll
│   ├── appsettings.json
│   └── wwwroot\            ← Angular app
│       ├── index.html
│       ├── *.js
│       └── assets\
├── runtime\                ← .NET RUNTIME (copy once, rarely update)
│   └── *.dll               ← ~300 files, ~90MB
├── logs\                   ← Application logs (auto-created)
└── web.config              ← IIS configuration

INITIAL DEPLOYMENT:
------------------
1. Copy ALL folders (app, runtime, logs, web.config) to server
2. Configure IIS to point to this folder
3. Done!

FUTURE UPDATES:
--------------
For code/content changes:
1. Build new version: .\publish-optimized.ps1
2. Copy ONLY the 'app\' folder to server
3. Restart IIS site
4. Done! (~13MB vs ~140MB)

Runtime folder stays unchanged unless you upgrade .NET version.

FOLDER SIZES:
------------
app\      ~13MB  (your code + Angular)
runtime\  ~90MB  (one-time copy)
logs\     varies (application logs)

BENEFITS:
--------
✓ Faster updates (only copy app\ folder)
✓ Smaller transfers (13MB vs 140MB)
✓ Cleaner organization
✓ Runtime isolation
"@ | Out-File -FilePath "$OutputPath\README-DEPLOYMENT.txt" -Encoding utf8

# Create update script for future deployments
@"
QUICK UPDATE INSTRUCTIONS
========================

When you make code changes and want to update the server:

1. Build new version:
   .\publish-optimized.ps1

2. On server, stop site:
   Stop-WebSite -Name "ChristmasPuzzle"

3. Copy ONLY the app\ folder:
   Copy-Item -Path ".\publish-optimized\app\*" -Destination "C:\inetpub\puzzle\app\" -Recurse -Force

4. Start site:
   Start-WebSite -Name "ChristmasPuzzle"

That's it! No need to copy runtime\ folder again.
"@ | Out-File -FilePath "$OutputPath\update-app-only.txt" -Encoding utf8

# Clean up temp folder
Remove-Item -Path $tempPublish -Recurse -Force

# Calculate sizes
$appSize = (Get-ChildItem -Path "$OutputPath\app" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$runtimeSize = (Get-ChildItem -Path "$OutputPath\runtime" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$totalSize = (Get-ChildItem -Path $OutputPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Optimized build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Folder Structure:" -ForegroundColor Yellow
Write-Host "  $OutputPath\" -ForegroundColor White
Write-Host "  ├── app\         ($([math]::Round($appSize, 1))MB) ← Update this for code changes" -ForegroundColor White
Write-Host "  ├── runtime\     ($([math]::Round($runtimeSize, 1))MB) ← Copy once, rarely update" -ForegroundColor White
Write-Host "  ├── logs\        (empty) ← Auto-created logs" -ForegroundColor White
Write-Host "  └── web.config" -ForegroundColor White
Write-Host ""
Write-Host "Total size: $([math]::Round($totalSize, 1))MB" -ForegroundColor Green
Write-Host ""
Write-Host "Benefits:" -ForegroundColor Yellow
Write-Host "✓ Initial deployment: Copy everything once" -ForegroundColor White
Write-Host "✓ Future updates: Copy only app\ folder ($([math]::Round($appSize, 1))MB)" -ForegroundColor White
Write-Host "✓ 10x faster updates! ($([math]::Round($appSize, 1))MB vs $([math]::Round($totalSize, 1))MB)" -ForegroundColor White
Write-Host ""
Write-Host "See $OutputPath\README-DEPLOYMENT.txt for details" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

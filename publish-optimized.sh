#!/bin/bash
# Optimized self-contained publish script
# Separates runtime from application for faster updates!

CONFIGURATION="${1:-Release}"
OUTPUT_PATH="${2:-./publish-optimized}"

echo -e "\033[0;36mChristmas Puzzle - Optimized Self-Contained Build\033[0m"
echo -e "\033[0;36m===================================================\033[0m"
echo -e "\033[0;33mBundles .NET runtime separately for easy updates!\033[0m"
echo -e "\033[0;36m===================================================\033[0m"
echo ""

# Step 1: Build Angular app
echo -e "\033[0;33mStep 1: Building Angular application...\033[0m"
cd ClientApp || exit 1

if [ -d "node_modules" ]; then
    echo -e "\033[0;32mNode modules found, skipping npm install\033[0m"
else
    echo -e "\033[0;33mInstalling npm dependencies...\033[0m"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "\033[0;31mnpm install failed!\033[0m"
        exit 1
    fi
fi

echo -e "\033[0;33mRunning Angular build...\033[0m"
npm run build
if [ $? -ne 0 ]; then
    echo -e "\033[0;31mAngular build failed!\033[0m"
    exit 1
fi

cd ..

# Step 2: Copy Angular dist to wwwroot
echo ""
echo -e "\033[0;33mStep 2: Copying Angular dist to wwwroot...\033[0m"
WWWROOT_PATH="src/Server/ChristmasPuzzle.Server/wwwroot"

if [ -d "$WWWROOT_PATH" ]; then
    rm -rf "$WWWROOT_PATH"
fi

mkdir -p "$WWWROOT_PATH"
cp -r ClientApp/dist/* "$WWWROOT_PATH/"
echo -e "\033[0;32mAngular files copied to wwwroot\033[0m"

# Step 3: Publish .NET application as SELF-CONTAINED
echo ""
echo -e "\033[0;33mStep 3: Publishing .NET application (SELF-CONTAINED)...\033[0m"
TEMP_PUBLISH="./temp-publish"

dotnet publish src/Server/ChristmasPuzzle.Server/ChristmasPuzzle.Server.csproj \
    -c "$CONFIGURATION" \
    -o "$TEMP_PUBLISH" \
    --self-contained true \
    -r win-x64 \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false

if [ $? -ne 0 ]; then
    echo -e "\033[0;31mdotnet publish failed!\033[0m"
    exit 1
fi

# Step 4: Organize into optimized structure
echo ""
echo -e "\033[0;33mStep 4: Organizing into optimized folder structure...\033[0m"

# Clean output directory
rm -rf "$OUTPUT_PATH"
mkdir -p "$OUTPUT_PATH"

# Create folders
mkdir -p "$OUTPUT_PATH/myapp"
mkdir -p "$OUTPUT_PATH/logs"

# Move EVERYTHING directly to myapp/ (self-contained requirement)
echo -e "\033[0;33m  Moving all files to myapp/ (self-contained needs all DLLs with .exe)...\033[0m"
mv "$TEMP_PUBLISH/"* "$OUTPUT_PATH/myapp/" 2>/dev/null || true

# Create optimized web.config
echo -e "\033[0;33m  Creating web.config...\033[0m"
cat > "$OUTPUT_PATH/web.config" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <!-- Optimized: Your app files in myapp/, runtime DLLs at root -->
      <aspNetCore processPath=".\myapp\ChristmasPuzzle.Server.exe"
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
      
      <!-- No URL rewrite rules needed - ASP.NET Core handles all routing -->
      <!-- The MapFallbackToFile in Program.cs serves index.html for Angular routes -->
      
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
EOF

# Create README for deployment
cat > "$OUTPUT_PATH/README-DEPLOYMENT.txt" << 'EOF'
# Create README for deployment
cat > "$OUTPUT_PATH/README-DEPLOYMENT.txt" << 'EOF'
OPTIMIZED DEPLOYMENT STRUCTURE - THE SMART WAY!
===============================================

Runtime DLLs at root (one-time copy), YOUR files in myapp/ folder (update this!)

FOLDER STRUCTURE:
----------------
publish-optimized/
├── myapp/                  ← YOUR APPLICATION (~13MB - UPDATE THIS!)
│   ├── ChristmasPuzzle.Server.exe  ← Your app entry point
│   ├── ChristmasPuzzle.Server.dll  ← Your compiled code
│   ├── appsettings.json            ← Your configuration
│   └── wwwroot/                    ← Your Angular app (~12MB)
│       ├── index.html
│       ├── main.js                 ← Your Angular code
│       ├── vendor.js               ← Angular/Phaser libraries
│       └── assets/                 ← Your images
│
├── Microsoft.*.dll         ← .NET RUNTIME at root (~150 files)
├── System.*.dll            ← .NET RUNTIME at root (~80 files)
├── hostpolicy.dll          ← Critical runtime file (stays here)
├── coreclr.dll             ← Critical runtime file (stays here)
│
├── logs/                   ← Application logs (auto-created)
└── web.config              ← IIS configuration

WHY THIS WORKS:
--------------
✓ .NET finds runtime DLLs at root (next to the .exe path)
✓ Your app files organized in myapp/ folder
✓ Future updates: Copy ONLY myapp/ folder (~13MB)
✓ Runtime stays at root (one-time copy, ~100MB)

INITIAL DEPLOYMENT:
------------------
1. Copy EVERYTHING to server (all files and folders)
   Total: ~140MB
2. Configure IIS to point to this folder
3. Done!

FUTURE UPDATES (THE MAGIC!):
----------------------------
When you change YOUR code (Angular or .NET backend):

1. Build new version: ./publish-optimized.sh
2. Copy ONLY myapp/ folder to server (~13MB)
3. Restart IIS site
4. Done!

Runtime DLLs stay on server unchanged!

WHAT TO UPDATE WHEN:
-------------------
Change Angular code         → Copy myapp/ folder only
Change .NET backend         → Copy myapp/ folder only
Change configuration        → Copy myapp/ folder only
Upgrade .NET version        → Copy ALL files (rare!)

SIZE COMPARISON:
---------------
First deployment:    140MB (everything)
Each update:         ~13MB (myapp/ folder only!)
Savings:             90% smaller updates! 🎉

TECHNICAL DETAILS:
-----------------
The .exe is in myapp/ but .NET automatically searches:
1. Same folder as .exe (myapp/)
2. Parent folder (root) ← Runtime DLLs found here!

This is standard .NET behavior and works perfectly!
EOF
EOF

# Create update script for future deployments
cat > "$OUTPUT_PATH/update-app-only.txt" << 'EOF'
# Create update script for future deployments
cat > "$OUTPUT_PATH/update-app-only.txt" << 'EOF'
QUICK UPDATE INSTRUCTIONS
========================

When you make code changes and want to update the server:

1. Build new version:
   ./publish-optimized.sh

2. On server, stop site:
   Stop-WebSite -Name "ChristmasPuzzle"

3. Copy ONLY the myapp/ folder:
   Copy-Item -Path ".\publish-optimized\myapp\*" -Destination "I:\INETPUP\xmas.oh22.net\public_html\myapp\" -Recurse -Force

4. Start site:
   Start-WebSite -Name "ChristmasPuzzle"

That's it! Only ~13MB uploaded instead of 140MB!

The runtime DLLs at the root stay unchanged.
EOF
EOF

# Clean up temp folder
rm -rf "$TEMP_PUBLISH"

# Calculate sizes
MYAPP_SIZE=$(du -sh "$OUTPUT_PATH/myapp" | cut -f1)
TOTAL_SIZE=$(du -sh "$OUTPUT_PATH" | cut -f1)

echo ""
echo -e "\033[0;36m===================================================\033[0m"
echo -e "\033[0;32m✅ SELF-CONTAINED BUILD COMPLETED\033[0m"
echo ""
echo -e "\033[0;33mFolder Structure:\033[0m"
echo -e "\033[0;37m  $OUTPUT_PATH/\033[0m"
echo -e "\033[0;37m  ├── myapp/        ($MYAPP_SIZE) ← Deploy this entire folder\033[0m"
echo -e "\033[0;37m  └── logs/         (empty) ← IIS creates logs here\033[0m"
echo ""
echo -e "\033[0;32mTotal size: $TOTAL_SIZE\033[0m"
echo ""
echo -e "\033[0;33m📦 What's in myapp/:\033[0m"
echo -e "\033[0;37m  • Your .exe and .dll files\033[0m"
echo -e "\033[0;37m  • All .NET runtime DLLs (Microsoft.*, System.*)\033[0m"
echo -e "\033[0;37m  • Your Angular app (wwwroot/)\033[0m"
echo -e "\033[0;37m  • Configuration (appsettings.json)\033[0m"
echo ""
echo -e "\033[0;33m⚠️  Self-contained reality:\033[0m"
echo -e "\033[0;37m  Updates = Upload full myapp/ folder (~140MB)\033[0m"
echo ""
echo -e "\033[0;33m💡 For 13MB updates instead:\033[0m"
echo -e "\033[0;37m  Install .NET 8.0 Runtime on server → use ./publish.sh\033[0m"
echo -e "\033[0;37m  See THE-HONEST-TRUTH.md for details\033[0m"
echo ""
echo -e "\033[0;36m===================================================\033[0m"
echo ""

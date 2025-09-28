#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/ClientApp"
SERVER_PROJECT="$ROOT_DIR/src/Server/ChristmasPuzzle.Server/ChristmasPuzzle.Server.csproj"
PUBLISH_DIR="$ROOT_DIR/publish-christmas"
BASE_HREF="${BASE_HREF:-/ChristmasGame/}"
DOTNET_CONFIGURATION="${DOTNET_CONFIGURATION:-Release}"

printf '==> Cleaning previous Angular build\n'
rm -rf "$CLIENT_DIR/dist"

printf '==> Building Angular app with base href %s\n' "$BASE_HREF"
(
  cd "$CLIENT_DIR"
  npm run build -- --base-href "$BASE_HREF"
)

printf '==> Publishing ASP.NET Core app (%s)\n' "$DOTNET_CONFIGURATION"
rm -rf "$PUBLISH_DIR"
dotnet publish "$SERVER_PROJECT" -c "$DOTNET_CONFIGURATION" -o "$PUBLISH_DIR"

printf '\nDeployment artifact ready in %s\n' "$PUBLISH_DIR"
printf '\nNext steps:\n'
printf '  1. rsync -avz %s/ <user>@<server>:/home/johannes/ChristmasGame/publish/\n' "$PUBLISH_DIR"
printf '  2. On the server:\n'
printf '     sudo systemctl daemon-reload\n'
printf '     sudo systemctl enable --now knutgame-christmas\n'
printf '     sudo systemctl reload apache2\n'
printf '\nTip: ensure ASPNETCORE_PATHBASE=/ChristmasGame when running on the server.\n'

# Issues

- **High** `src/Server/ChristmasPuzzle.Server/Program.cs:36`: The backend serves the Angular bundle from `ClientApp/dist` by walking up three directories. This path only exists when running from the source tree; after `dotnet publish` the published output no longer contains `ClientApp/dist`, so the app will log warnings and the SPA will not load. We should copy the built assets into `wwwroot` during publish or resolve the path relative to the deployed content root.
- **Medium** `.gitignore:292`: The Angular production build directory (`ClientApp/dist/`) is not ignored. Running `npm run build` leaves behind sizable generated artifacts that show up as untracked changes. Add the directory to `.gitignore` (e.g., `ClientApp/dist/` or `/ClientApp/dist/`) to avoid accidental commits.

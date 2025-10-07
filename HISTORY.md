# Session 01999418-c8fd-7dd2-8dd0-a6fa6608946f

## Summary
- Implemented complete IIS deployment pipeline with automated build/publish scripts for Windows (PowerShell) and Linux/Mac (Bash).
- Created `web.config` with URL rewrite rules for Angular SPA routing, API route protection, and security headers.
- Added production configuration (`appsettings.Production.json`) and updated CORS policy for environment-specific origins.
- Fixed mobile game loading issues: removed intro overlay blocking, unified flow across all devices, added touch drag offset for better UX.
- Implemented timer display showing elapsed time in MM:SS format, positioned below coin counter with matching styling.
- Timer and coin HUD now appear when explosion modal shows, timer starts counting only when user clicks "Los geht's".
- Repositioned burger menu to upper left to avoid overlapping coin counter, reduced shadow blur for cleaner text rendering.
- Created comprehensive deployment documentation (DEPLOYMENT.md, DEPLOYMENT-QUICK.md, DEPLOYMENT-SUMMARY.md).
- Enhanced mobile experience: added kiosk mode (fullscreen + landscape lock) that exits on puzzle completion.

## Technical Changes
- **Build Pipeline**: Automated Angular build → copy to wwwroot → .NET publish in single command
- **IIS Configuration**: ASP.NET Core Module v2, InProcess hosting, stdout logging enabled
- **Game Flow**: InitialScene → explosion animation → modal with "Los geht's" → PuzzleScene with HUD
- **Touch Detection**: Native event checking via `nativeEvent.touches`, offset pieces 50px up/left of finger
- **Timer Implementation**: Created in `showHudElements()`, starts in `startTimer()`, updates in game loop
- **Styling Consistency**: Timer and coin label both use Montserrat 26px with matching shadows and colors

## Notes
- Publish scripts tested and verified to create complete deployment package
- IIS requires ASP.NET Core 9.0 Hosting Bundle and URL Rewrite Module
- Application pool must use "No Managed Code" for .NET Core
- For virtual application deployment, update Angular base href to `/subdirectory/`

# Session 01999418-c8fd-7dd2-8dd0-a6fa6608946f (Previous)

## Summary
- Parsed `ClientApp/src/assets/pieces/Zeichnung.svg` at runtime to generate puzzle geometry, replacing the placeholder star.
- Normalized the SVG coordinates to fit the Phaser board uniformly and clamped scatter positions to keep pieces within view.
- Removed snapping so pieces stay draggable for debugging while retaining hover highlights.
- Restyled pieces with transparent fills and black outlines for a frosted-glass look aligned with the new page palette.
- Added a “Show/Hide Guides” toggle that controls the drag overlay while leaving the outline always visible.
- Updated global styling to a frosty background to complement the new visuals.
- Introduced blurred mountain artwork as the gameplay backdrop, including scene preloading.
- Captured puzzle-piece fill colours from the SVG so runtime pieces match editor styling.
- Added a Glass Pieces toggle to switch between frosted transparency and the default opaque look on demand.

## Session 01998b10-b33a-73b0-a8b7-b8fe91f564cd
### Summary
- Refined the burst sequence into a shattered-glass effect: shards spray laterally with gravity, keep the stag outline visible during the cinematic, and share styling with puzzle mode.
- Reworked drag mechanics so pieces pivot around the cursor, recording/restoring their resting pose for seamless pickup and snap.
- Added optional base-path support in `Program.cs` and automated SPA asset copying in the project file, then reverted those deployment-specific changes when no longer needed.
- Created (and later removed) the `tools/publish-christmas.sh` helper; the final codebase reflects feature/cinematic changes only.

## Notes
- Snapping remains disabled; revisit once geometry and UX are finalized.
- `samplePath` currently samples at ~4px intervals; adjust if higher fidelity is required.

# Session 01999ef8-880e-7811-bbcc-0a43a647bc22

## Summary
- Expanded the touch hit-area for each puzzle piece so mobile users can grab pieces more easily without affecting snap accuracy.
- Reworked the stag outline overlay to render the `greyPaper.png` texture inside the silhouette using a geometry mask while keeping the SVG stroke styling intact.
- Normalized burst physics so scattered pieces always settle on the global floor (scene height − 40) and never come to rest above the ground or inside the silhouette; added an optional debug floor line.
- Documented every constant in `puzzle.constants.ts` with inline comments for quick tweaking and included `.ts` sources in `tsconfig.app.json` so the new files participate in builds/linting.

## Notes
- The outline texture respects the SVG fill alpha; adjust `#outline` fill opacity to control how strong the paper texture appears.
- Enable `DEBUG_SHOW_FLOOR` in `puzzle.constants.ts` to visualize the burst floor while tuning scatter behaviour.

# Session 0199a479-3a94-72e0-a023-59d1f813a54d

## Summary
- Replaced the Phaser-based “Go on” button with an Angular overlay that appears once the intro zoom finishes, then relaunches the puzzle scene and new HUD logic while delaying the completion overlay by one second.
- Swapped the completion overlay text to German, reporting the collected coin total with “Neues Spiel”/“Münzen senden” options, hiding the restart button after donation and displaying a short confirmation toast.
- Moved the spinning OH22 coin HUD into the puzzle scene so it loads via spritesheet, anchors to the left edge, tracks the registry total, increments on piece placement, and stays hidden outside puzzle play.
- Hardened transitions by reinitialising interactivity when the cinematic ends (including a timed fallback) and routing Angular coin-total requests through the scene.

## Notes
- Adjust `coinMargin` and `coinVerticalGap` in `PuzzleScene` to reposition the HUD.
- Emit `coin-total-request` whenever Angular needs a fresh total after scene lifecycle changes.

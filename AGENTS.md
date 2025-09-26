# Repository Guidelines

## Project Structure & Module Organization
The project is intended to follow the `dotnet new angular` layout. Server code resides in `src/Server/` (entry point, controllers, middleware) with feature folders under `src/Server/Application/`. Angular modules live in `ClientApp/src/app/`; place Phaser game scenes and helpers in `ClientApp/src/game/`. Share reusable interfaces through `ClientApp/src/app/shared/` and align them with DTOs exposed by the server. Store SVG puzzle assets and derived textures in `ClientApp/src/assets/pieces/`, and keep automation scripts or one-off utilities in `tools/` once they are stable.

## Build, Test, and Development Commands
Install dependencies once per clone: `dotnet restore` at the repo root and `npm install` inside `ClientApp`. Use `dotnet run` for the ASP.NET Core host and `npm run start` to launch the Angular dev server; run both for full-stack development. Produce a production bundle with `npm run build` (outputs to `ClientApp/dist/`) and publish the combined app via `dotnet publish -c Release`.

## Coding Style & Naming Conventions
Use four-space indentation for C# files and two spaces for TypeScript/HTML/SCSS. Follow Angular style guide conventions: `kebab-case` for selectors, `PascalCase` for components and services, and suffix classes with their role (`PuzzleScene`, `board.service.ts`). Prefer `async/await` over raw promises. Keep Phaser configuration declarative; extract magic numbers into `constants.ts`. Run `npm run lint` before submitting and apply `dotnet format` for C# changes.

## Testing Guidelines
Front-end unit tests use Jasmine/Karma; add specs alongside components as `*.spec.ts` and execute them with `npm run test`. Aim to cover drag/drop edge cases and snapping tolerances. Back-end logic should be validated with xUnit projects under `tests/`; run `dotnet test` before merging. When adding new puzzle assets, include screenshot fixtures or golden coordinates to make regressions obvious.

## Commit & Pull Request Guidelines
Local history currently follows Conventional Commits—start messages with `feat`, `fix`, `chore`, or `docs` and keep the subject ≤72 characters. Reference related issues in the body and describe gameplay or UX changes briefly. For pull requests, include a summary, testing notes (`npm run test`, `dotnet test`), and screenshots or GIFs for visual tweaks. Request review from at least one teammate before merging.

## Security & Configuration Tips
Keep secrets outside the repo; consume them through `appsettings.Development.json` and Angular environment files excluded from git. Audit Phaser asset licensing prior to commit, and validate that uploaded art is optimized SVG. Review CORS settings when exposing new APIs and prefer HTTPS URLs in production builds.

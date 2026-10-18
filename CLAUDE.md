# CLAUDE.md — Development Rules for Star Destroyer

> **Status:** APPROVED by owner 2026-10-17

Read `PROJECT.md` (scope), `ARCHITECTURE.md` (decisions), and `ROADMAP.md` (current task) before starting work.

## Roles

- **Owner (GitHub `soncsec`):** approves scope, architecture, merges, and production deployments.
- **Claude:** implements approved tasks, writes tests, runs checks, prepares PRs, and keeps the docs current.

## Scope boundary (other Claude sessions may be building other games)

- Change files only inside this repo. Never edit another game's folder, the portal repo, or shared assets.
- `legacy/` (the art pack) is read-only. It is a link to the shared `~/dev/games/_assets/legacy/`. Copy what you need into `public/assets/`.
- Changes another repo needs (for example, this game's portal card) go through a PR or issue on that repo.
- On the production server, this game may only write to `/var/www/html/soncrant.com/pub/games/star-destroyer/`.
- Local dev server port: **5173**. Playwright's test server uses **4174**.
- Other games' sessions share this machine. Stop only processes you started, by PID or by your own port (e.g. the pid listening on 4174). Never stop processes by name (`pkill -f vite`, `pkill -f "vite preview"`, `killall node`): that kills other sessions' servers mid-run.

## Always ask the owner before

- Changing the architecture or any ADR, or adding a dependency not listed in ARCHITECTURE.md
- Changing scope (adding or dropping features)
- Destructive operations: deleting files or branches, force-pushing, rewriting history, deleting repos
- Any production deployment, or any change on the production server or its Apache configuration. **Standing approval (owner, 2026-10-18):** release Star Destroyer with `scripts/release.sh deploy` after each PR the owner merges to `main`, once that commit's CI checks and staging ZAP scan have passed, and report the result. This covers the game only, not the portal, and no other server changes.
- Security decisions: CSP and header policy, HTTP vs HTTPS, SSH keys, secrets handling, permissions, CI tokens
- Adding new third-party assets (art, audio, fonts)

## Git workflow

- Never commit or push directly to `main`, and never merge PRs. The owner merges.
- One task per branch, named `feature/<roadmap-id>-<short-name>` (e.g. `feature/M1.5-player-movement`).
- Small PRs, one roadmap task each. The PR description includes:
  - a summary of the change (what and why)
  - test evidence: commands run and results, plus screenshots or GIFs for visual changes
  - the roadmap task ID and its acceptance criteria, each marked met or not met
- Commit messages are short and in the imperative mood.
- Never commit `legacy/`, `node_modules/`, `dist/`, secrets, or `.env` files.

## Quality rules

- A task is **not done** until its acceptance criteria are verified against the running game, not just because code exists.
- Never weaken, skip, or delete a test to make it pass. If a test seems wrong, explain why in the PR and ask.
- Every PR must pass: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`, `npm audit --audit-level=high`.
- Game rules go in `src/logic/` as plain TypeScript (no Phaser imports) with unit tests.
- Gameplay numbers go in `src/config/tuning.ts`. No magic numbers in scenes.
- Use the seeded RNG for anything random in gameplay.
- Reuse pooled objects for bullets, enemies and effects.

## Security rules

- No runtime requests to third-party hosts. Everything is bundled and served from our own origin.
- Pin exact dependency versions, at least two weeks old, and commit the lockfile.
- Run static checks (CodeQL, ESLint, `npm audit`, Gitleaks) and a dynamic check (OWASP ZAP baseline) before any deployment or configuration change, and report the results.
- No personal data is collected. localStorage holds only the high score.
- Never put credentials in code, the chat, or CI logs; use GitHub Actions secrets.

## Environment

- Node.js comes from nvm. Run `export NVM_DIR=$HOME/.nvm; . $NVM_DIR/nvm.sh` before using `node` or `npm` in a fresh shell.
- The GitHub CLI is at `~/.local/bin/gh`.

## Docs

- Update `ROADMAP.md` checkboxes and status as tasks complete.
- Record new or changed decisions as ADRs in `ARCHITECTURE.md`, after approval.
- Update `PROJECT.md` when the owner approves scope changes.
- After changing any of the four docs, run `python3 tools/docs-page/build.py` and publish the output to the existing docs artifact (https://claude.ai/artifact/L8gay7hMBWrkLA7Req7nTs, pass it as `url`).

## Assets

- Source pack: `legacy/` (Ansimuz Legacy Collection, CC0). Copy only the files used into `public/assets/` and list them in `CREDITS.md`.
- Keep native pixel resolution. Render with `pixelArt: true` and integer scaling.

# Star Destroyer and Games Portal — Roadmap

> **Status:** APPROVED by owner 2026-10-17, including moving production setup earlier (P1)
> Every milestone ends with a playable build the owner can try.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done |
| M1 Walking skeleton | In progress |
| P1 Portal and production server | Not started |
| T1 Game template for parallel instances | Not started |
| M2 Core loop | Not started |
| M3 Weapons | Not started |
| M4 Boss | Not started |
| M5 Polish | Not started |
| M6 v1.0 release | Not started |

## Risks driving this order

| # | Risk | Mitigation | Addressed in |
|---|---|---|---|
| 1 | Canvas games are hard to test automatically | Logic kept separate from Phaser, a test hook, seeded randomness, Playwright | M1 onward |
| 2 | Sprite sheets have uneven frame sizes and naming; boss comes in parts | Asset manifest plus a preview scene, checked early | M1 |
| 3 | Game feel and difficulty are subjective | Playable on staging from M1; all tuning in one config file; owner play-tests | Every milestone |
| 4 | Production deployment touches a server that already hosts other sites | Own subfolder, config test before any reload, rollback plan, done early | P1 |
| 5 | Public DNS and port forwarding are unconfirmed | Settle in P1 with owner, verify from outside the home network | P1 |
| 6 | Performance with many bullets and effects | Object pooling; automated frame-rate check | M1, M4 |
| 7 | Supply chain (compromised dependencies) | Few dependencies, exact versions at least two weeks old, lockfile, audits | M0 onward |

---

## M0 — Setup

**Demonstrable result:** both GitHub repos exist with a protected `main` and a passing CI run.

- [x] M0.1 Install Node.js 24.21.0 LTS via nvm (no sudo)
- [x] M0.2 Install GitHub CLI 2.102.0 (checksum verified)
- [x] M0.3 Owner logs in to GitHub; set the Git identity to the GitHub no-reply address
- [x] M0.4 `git init` for `star-destroyer` with a `.gitignore` that excludes `legacy/`; create `soncsec/star-destroyer` (public)
- [x] M0.5 Create `soncsec/games-portal` (public)
- [x] M0.6 Branch protection on `main` in both repos: PR required, admins included, no force pushes or deletions; secret scanning with push protection and Dependabot alerts on. Direct push to `main` verified rejected. The CI check becomes required once it has run on this PR.
- [x] M0.7 Copy the needed assets (56 files, 356 KB) from `legacy/` to `public/assets/`, with `CREDITS.md`; first CI workflow (asset hygiene check plus gitleaks secret scan)
- [x] M0.8 Confirm the Phaser version: 4.2.1 (recorded in ADR-002)

**Acceptance criteria:** a direct push to `main` is rejected; a test PR shows a green CI check; `legacy/` is not in the repo.

## M1 — Walking skeleton

**Demonstrable result:** on the staging URL, the ship flies and shoots over a scrolling background, and one enemy type appears, can be destroyed, and explodes.

- [x] M1.1 Vite 8.3.2 + TypeScript 6.0.3 + Phaser 4.2.1 scaffold (relative `base: './'`); Prettier and ESLint; seeded RNG with unit tests
- [x] M1.2 CI workflow: format, lint, type check, Vitest with coverage, build, `npm audit`, CodeQL (security-extended), gitleaks; Dependabot with a 14-day cooldown
- [x] M1.3 Asset manifest and preview scene showing every sheet animating correctly (open the game with `?scene=preview`)
- [x] M1.4 Scrolling background (nebula plus a faster star layer) with whole-number pixel scaling
- [x] M1.5 Player movement (arrows or WASD) with banking animation, engine flame and screen bounds
- [x] M1.6 Shooting with pooled bullets (Space; 5 shots per second; effect sprites rotated −90° to fire upward)
- [ ] M1.7 One enemy type, collision, explosion
- [ ] M1.8 Playwright: game boots with no console errors; an enemy can be destroyed through the test hook
- [ ] M1.9 Auto-deploy to GitHub Pages on merge; ZAP baseline scan of staging

**Acceptance criteria:** the owner plays it on staging; CI is green; Playwright tests pass in Chromium and Firefox; the ZAP scan has no high-severity findings.

## P1 — Portal and production server

**Demonstrable result:** `games.soncrant.com` loads from outside the home network, showing the arcade portal with a Star Destroyer card that opens the M1 build.

- [ ] P1.1 Portal scaffold (Vite + TypeScript), CI pipeline matching the game's
- [ ] P1.2 Retro-arcade design: "Soncrant Arcade" wordmark and logo, card grid rendered from `games.json`, responsive layout
- [ ] P1.3 Tests: `games.json` schema check, every card links to a page and an image that exist, Playwright render and accessibility check
- [x] P1.4 Decide HTTP or HTTPS (ADR-010): owner chose HTTP on port 80
- [ ] P1.5 Server prep runbook: `deploy` user, SSH key, write access to `/var/www/html/soncrant.com/pub/games/` — *needs approval; owner runs the sudo steps or grants access*
- [ ] P1.6 Owner maps `games.soncrant.com` to the `games/` folder in Apache. Claude supplies the security-header config for that folder, checked with `apachectl configtest` before reload; existing sites verified unaffected — *needs approval*
- [ ] P1.7 DNS `A` record for `games.soncrant.com` and port 80 forwarding (owner)
- [ ] P1.8 Release scripts for portal and game (atomic symlink switch, rollback command)
- [ ] P1.9 First production release; ZAP scan and smoke test from outside the network — *needs approval*

**Acceptance criteria:** the portal and game load at the production URL from an outside network; the security headers are present; the ZAP scan has no high-severity findings; a rollback has been rehearsed; the other sites on the server still work.

## T1 — Game template for parallel instances (ADR-011)

**Demonstrable result:** a second Claude session creates a new game from the template and gets it onto staging and into the portal, while Star Destroyer work continues, with no conflicts.

- [ ] T1.1 Portal reads one file per game (`games/<slug>.json`) instead of a single list
- [ ] T1.2 Extract `soncsec/game-template` from Star Destroyer: scaffold, CI, security checks, tests, release script, CLAUDE.md and doc skeletons
- [ ] T1.3 Release script locks the target to `/var/www/html/soncrant.com/pub/games/<slug>/` and refuses anything else (tested)
- [ ] T1.4 `NEW-GAME.md` runbook: create the repo from the template, claim the slug in the portal, pick a dev port, start a Claude session in `~/games/<slug>/`
- [ ] T1.5 Dry run: create a throwaway game from the template, then delete it — *deletion needs approval*

**Acceptance criteria:** the dry-run game passes CI and deploys to staging with no edits outside its own repo except its portal entry; two dev servers run side by side.

## M2 — Core loop

**Demonstrable result:** a full survival loop of fighting, taking damage, dying, restarting and scoring.

- [ ] M2.1 Health, lives and invulnerability flashes after a hit (logic unit tested)
- [ ] M2.2 Enemy bullets
- [ ] M2.3 Enemy types 2 and 3 with distinct movement patterns
- [ ] M2.4 Scripted wave schedule driven by data (unit tested)
- [ ] M2.5 Destructible asteroids
- [ ] M2.6 Score and HUD
- [ ] M2.7 Game over screen and restart
- [ ] M2.8 Playwright: player death leads to game over, and restart works

**Acceptance criteria:** the owner can die, restart and score; waves follow the schedule; logic test coverage is at least 80%.

## M3 — Weapons

**Demonstrable result:** collecting power-ups visibly upgrades the ship's weapon.

- [ ] M3.1 Power-up drops (drop rate set in the tuning config)
- [ ] M3.2 Weapon levels 1–3 using the pulse, bolt and charged effects
- [ ] M3.3 Hit-spark effects on impact
- [ ] M3.4 Unit tests for weapon progression. Power-ups never time out; what happens on death is pending the owner's decision

**Acceptance criteria:** each weapon level is visually distinct and tested; frame rate holds with the maximum weapon level and a full wave on screen.

## M4 — Boss

**Demonstrable result:** the full stage can be beaten from start to finish.

- [ ] M4.1 Multi-part boss assembly (body, cannons, helmet, thrust)
- [ ] M4.2 Attacks: bolt volleys and ray beam with a warning before it fires
- [ ] M4.3 Destructible cannons and phase changes (logic unit tested)
- [ ] M4.4 Boss health bar, victory screen
- [ ] M4.5 Playwright: an automated run through every boss phase to victory
- [ ] M4.6 Automated frame-rate check during the boss fight

**Acceptance criteria:** the owner beats the boss; the phase test passes; 60 fps holds during the fight.

## M5 — Polish

**Demonstrable result:** a release-candidate game.

- [ ] M5.1 Title screen with a link back to the portal, and pause
- [ ] M5.2 High score saved in localStorage, safe if storage is unavailable
- [ ] M5.3 CC0 sound effects (sources recorded in the credits file) — *new assets need approval*
- [ ] M5.4 Parallax background layers, asteroid and planet props
- [ ] M5.5 Difficulty tuning from the owner's play-test feedback
- [ ] M5.6 Cross-browser check: Chrome, Firefox, Safari, Edge
- [ ] M5.7 Final card screenshot for the portal

**Acceptance criteria:** the owner signs off on game feel; no console errors in a full playthrough on all four browsers.

## M6 — v1.0 release

**Demonstrable result:** Star Destroyer v1.0 is live on `games.soncrant.com`.

- [ ] M6.1 Final security review: dependencies, CodeQL, secret scan, ZAP scan of staging
- [ ] M6.2 Release through the release script — *needs approval*
- [ ] M6.3 ZAP scan of production; smoke test from outside the network; tag `v1.0`

**Acceptance criteria:** the production URL serves v1.0 with the security headers in place; the post-deploy scan is clean; the owner approves.

# Star Destroyer and Games Portal — Roadmap

> **Status:** APPROVED by owner 2026-10-17, including moving production setup earlier (P1)
> Every milestone ends with a playable build the owner can try.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done |
| M1 Walking skeleton | Done (owner play-tested and approved 2026-10-17) |
| P1 Portal and production server | Done (2026-10-17) |
| T1 Game template for parallel instances | Not started |
| M2 Core loop (level 1) | In progress |
| M3 Power-ups | Not started |
| M4 Level system and first boss | Not started |
| M5 Levels 2–4 | Not started |
| M6 Levels 5–8 | Not started |
| M7 Polish and balance | Not started |
| M8 v1.0 release | Not started |

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
- [x] M1.7 One enemy type (3 hits to destroy), shot collision, pooled explosions, seeded spawns (`?seed=` in the URL)
- [x] M1.8 Playwright (1.63.0) in Chromium and Firefox, run in CI: game boots with no console errors or third-party requests; preview scene loads; keyboard movement; an enemy takes 3 hits and explodes; `?seed=` repeats spawns
- [x] M1.9 Auto-deploy to GitHub Pages on merge (https://soncsec.github.io/star-destroyer/); ZAP baseline scan of staging. First run 2026-10-17: 0 high, 5 medium, 6 low — all are response headers GitHub Pages can't set; production Apache sets them in P1.6

**Acceptance criteria:** the owner plays it on staging; CI is green; Playwright tests pass in Chromium and Firefox; the ZAP scan has no high-severity findings.

## P1 — Portal and production server

**Demonstrable result:** `games.soncrant.com` loads from outside the home network, showing the arcade portal with a Star Destroyer card that opens the M1 build.

- [x] P1.1 Portal scaffold (Vite + TypeScript), CI pipeline matching the game's — games-portal PR #1
- [x] P1.2 Retro-arcade design: "Soncrant Arcade" wordmark and logo, card grid rendered from `games.json`, responsive layout — games-portal PR #2. Font: Press Start 2P (SIL OFL, bundled), approved by owner 2026-10-17 (games-portal PR #2)
- [x] P1.3 Tests: `games.json` schema check, every card links to a page and an image that exist, Playwright render and accessibility check (games-portal PR #3; link targets are checked by the release smoke test)
- [x] P1.4 Decide HTTP or HTTPS (ADR-010): owner chose HTTP on port 80
- [x] P1.5 Server prep runbook: `deploy` user, SSH key, write access to `/var/www/html/soncrant.com/pub/games/`. Done 2026-10-17; key restricted to the dev machine, access verified
- [x] P1.6 Owner maps `games.soncrant.com` to the `games/` folder in Apache. Claude supplies the security-header config for that folder, checked with `apachectl configtest` before reload; existing sites verified unaffected. Applied by the owner 2026-10-17; all 7 headers live, no folder listings, other sites unchanged
- [x] P1.7 DNS `A` record for `games.soncrant.com` and port 80 forwarding (owner). Resolves inside and outside the network
- [x] P1.8 Release scripts for portal and game (atomic symlink switch, rollback command). Game: star-destroyer #18; portal: games-portal #6 (single `_portal` switch)
- [x] P1.9 First production release; ZAP scan and smoke test from outside the network. Approved by the owner; released 2026-10-17 (game `20261017T172140Z-5c2b2e72`, portal `20261017T174255Z-6f2e61df`). Outside check by the games-portal `Production check` workflow: smoke tests passed with headers required; ZAP: 0 high (remaining: server version banner, COEP, cache info)

**Acceptance criteria:** the portal and game load at the production URL from an outside network; the security headers are present; the ZAP scan has no high-severity findings; a rollback has been rehearsed; the other sites on the server still work.

**Verified 2026-10-17:** outside check (games-portal `Production check` run 39056703574) passed with headers required and 0 high ZAP findings. Rollback rehearsed in production with owner approval: release B `20261017T181633Z-5c2b2e72` → rollback to A in 0.3 s (smoke test against the public URL passed, portal unaffected) → forward to B (smoke passed). Other sites checked unchanged after the Apache change.

## T1 — Game template for parallel instances (ADR-011)

**Demonstrable result:** a second Claude session creates a new game from the template and gets it onto staging and into the portal, while Star Destroyer work continues, with no conflicts.

- [ ] T1.1 Portal reads one file per game (`games/<slug>.json`) instead of a single list
- [ ] T1.2 Extract `soncsec/game-template` from Star Destroyer: scaffold, CI, security checks, tests, release script, CLAUDE.md and doc skeletons
- [ ] T1.3 Release script locks the target to `/var/www/html/soncrant.com/pub/games/<slug>/` and refuses anything else (tested)
- [ ] T1.4 `NEW-GAME.md` runbook: create the repo from the template, claim the slug in the portal, pick a dev port, start a Claude session in `~/dev/games/<slug>/`
- [ ] T1.5 Dry run: create a throwaway game from the template, then delete it — *deletion needs approval*

**Acceptance criteria:** the dry-run game passes CI and deploys to staging with no edits outside its own repo except its portal entry; two dev servers run side by side.

## M2 — Core loop (level 1)

**Demonstrable result:** a full survival loop on level 1: fighting, taking damage, dying, restarting and scoring.

- [x] M2.1 Health (5 hits per life), 3 lives, invulnerability flashes after losing a life (logic unit tested). Enemies crashing into the ship cost a hit until enemy shots arrive (M2.2)
- [ ] M2.2 Enemy bullets (boss bolt sprite)
- [ ] M2.3 Enemy types 2 and 3 with distinct movement patterns
- [ ] M2.4 Scripted wave schedule driven by data (unit tested)
- [ ] M2.5 Destructible asteroids; large ones split into small ones
- [ ] M2.6 Score and HUD
- [ ] M2.7 Game over screen and restart
- [ ] M2.8 Playwright: player death leads to game over, and restart works

**Acceptance criteria:** the owner can die, restart and score; waves follow the schedule; logic test coverage is at least 80%.

## M3 — Power-ups

**Demonstrable result:** all three power-ups drop and work as specified in PROJECT.md section 4a.

- [ ] M3.1 Drop system with per-type rarity (data-driven, seeded, unit tested); pickup icons from the gems pack
- [ ] M3.2 Weapon levels 1–3 (bolt, double, charged or spread); reset to level 1 on death; no time-out
- [ ] M3.3 Shield: energy-shield effect, blocks all damage for 30 s, timer shown in the HUD
- [ ] M3.4 Screen clear: destroys all on-screen enemies with a large explosion; rare; never dropped during boss fights
- [ ] M3.5 Hit-spark effects on impact
- [ ] M3.6 Unit tests for every power-up rule, including "lost on death" and "no screen clear during bosses"

**Acceptance criteria:** each power-up is visibly distinct and behaves as specified; rules are unit tested; frame rate holds with max weapon and a full wave.

## M4 — Level system and first boss

**Demonstrable result:** level 1 ends with a boss, and beating it moves on to level 2.

- [ ] M4.1 Data-driven level format: background layers, enemy roster, wave script, boss, difficulty numbers (ADR-012)
- [ ] M4.2 Difficulty curve function with the limits in PROJECT.md section 4a (unit tested)
- [ ] M4.3 Boss framework: entry, health bar, phases, attack patterns, defeat
- [ ] M4.4 Level 1 boss; level-complete screen; transition to the next level
- [ ] M4.5 Playwright: complete level 1 via the test hook and reach level 2

**Acceptance criteria:** the owner beats the level 1 boss and reaches level 2; difficulty limits are enforced by tests.

## M5 — Levels 2–4

**Demonstrable result:** levels 1–4 are playable start to finish, each with its own look and boss.

- [ ] M5.1 Import and slice the extra art for levels 2–4 (manifest and credits updated)
- [ ] M5.2 Level 2 (Asteroid Belt) and its boss
- [ ] M5.3 Level 3 (Blue Expanse) and its boss
- [ ] M5.4 Level 4 (Red Giant) and its boss
- [ ] M5.5 Automated check that every level's data is valid and within the difficulty limits

**Acceptance criteria:** the owner plays through levels 1–4; each level looks distinct; all checks pass.

## M6 — Levels 5–8

**Demonstrable result:** all 8 levels are playable, ending with the multi-part final boss.

- [ ] M6.1 Import and slice the extra art for levels 5–8
- [ ] M6.2 Level 5 (Station Run) and its boss
- [ ] M6.3 Level 6 (Demon Rift) and its boss
- [ ] M6.4 Level 7 (Deep Dark) and its twin boss
- [ ] M6.5 Level 8 (The Core) and the final multi-part boss (cannons, helmet, beam with warning, phases)
- [ ] M6.6 Victory screen after level 8
- [ ] M6.7 Automated frame-rate check during the final boss fight

**Acceptance criteria:** the owner beats level 8 (hard but beatable); 60 fps holds during the final boss fight.

## M7 — Polish and balance

**Demonstrable result:** a release-candidate game.

- [ ] M7.1 Title screen with a link back to the portal, and pause
- [ ] M7.2 High score saved in localStorage, safe if storage is unavailable
- [ ] M7.3 CC0 sound effects (sources recorded in the credits file) — *new assets need approval*
- [ ] M7.4 Parallax props (asteroids, planets) per level
- [ ] M7.5 Difficulty balance pass across all 8 levels from the owner's play-tests
- [ ] M7.6 Cross-browser check: Chrome, Firefox, Safari, Edge
- [ ] M7.7 Final card screenshot for the portal

**Acceptance criteria:** the owner signs off on game feel and difficulty; no console errors in a full playthrough on all four browsers.

## M8 — v1.0 release

**Demonstrable result:** Star Destroyer v1.0 is live on `games.soncrant.com`.

- [ ] M8.1 Final security review: dependencies, CodeQL, secret scan, ZAP scan of staging
- [ ] M8.2 Release through the release script — *needs approval*
- [ ] M8.3 ZAP scan of production; smoke test from outside the network; tag `v1.0`

**Acceptance criteria:** the production URL serves v1.0 with the security headers in place; the post-deploy scan is clean; the owner approves.

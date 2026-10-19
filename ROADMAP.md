# Star Destroyer and Games Portal — Roadmap

> **Status:** APPROVED by owner 2026-10-17, including moving production setup earlier (P1)
> Every milestone ends with a playable build the owner can try.

## Progress

| Milestone | Status |
|---|---|
| M0 Setup | Done |
| M1 Walking skeleton | Done (owner play-tested and approved 2026-10-17) |
| P1 Portal and production server | Done (2026-10-17) |
| T1 Game template for parallel instances | Done (2026-10-17) |
| M2 Core loop (level 1) | Done |
| M3 Power-ups | Done; play-test pending |
| C Controls and cheats (owner request) | Done; play-test pending |
| M4 Level system and first boss | Done; play-test pending |
| M5 Levels 2–4 | Done; play-test pending |
| M6 Levels 5–8 | In progress |
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
- [x] P1.10 Leave the asset preview (`?scene=preview`, a developer tool) out of the production build (owner 2026-10-18); the release script refuses a build that contains it
- [x] P1.11 E2E tests tolerate a busy machine (a release was refused 2026-10-18 when the load average hit 31 on 6 cores): waits for game-time events allow 20 s, default poll wait 15 s, test limit 60 s; the checks themselves are unchanged

**Acceptance criteria:** the portal and game load at the production URL from an outside network; the security headers are present; the ZAP scan has no high-severity findings; a rollback has been rehearsed; the other sites on the server still work.

**Verified 2026-10-17:** outside check (games-portal `Production check` run 39056703574) passed with headers required and 0 high ZAP findings. Rollback rehearsed in production with owner approval: release B `20261017T181633Z-5c2b2e72` → rollback to A in 0.3 s (smoke test against the public URL passed, portal unaffected) → forward to B (smoke passed). Other sites checked unchanged after the Apache change.

## T1 — Game template for parallel instances (ADR-011)

**Demonstrable result:** a second Claude session creates a new game from the template and gets it onto staging and into the portal, while Star Destroyer work continues, with no conflicts.

- [x] T1.1 Portal reads one file per game (`games/<slug>.json`) instead of a single list. games-portal #11; plus `in-development` status, reserved slugs, unique `devPort` (#13)
- [x] T1.2 Extract `soncsec/game-template` from Star Destroyer: scaffold, CI, security checks, tests, release script, CLAUDE.md and doc skeletons. `soncsec/game-template` (#1, #4): placeholder game, all CI and security checks, staging + ZAP, release scripts with `activate`, one-time `init-game.sh`
- [x] T1.3 Release script locks the target to `/var/www/html/soncrant.com/pub/games/<slug>/` and refuses anything else (tested). Every release command checks that SLUG matches package.json and the repo, and refuses the portal's names (game-template #2/#3, star-destroyer #20)
- [x] T1.4 `NEW-GAME.md` runbook: create the repo from the template, claim the slug in the portal, pick a dev port, start a Claude session in `~/dev/games/<slug>/`. games-portal #13
- [x] T1.5 Dry run: create a throwaway game from the template, then delete it. Done 2026-10-17 with `dry-run-game` (owner approved staging and deletion); found and fixed a template bug (game-template #4); repo deleted by the owner; portal entry removed (games-portal #15)

**Acceptance criteria:** the dry-run game passes CI and deploys to staging with no edits outside its own repo except its portal entry; two dev servers run side by side.

**Verified 2026-10-17:** `dry-run-game`, made by following NEW-GAME.md: Repo checks, Build and test, CodeQL, staging deploy and ZAP all passed on its `main`, and staging served "Dry Run". Its only change outside its own repo was the portal claim. Star Destroyer (5173) and Dry Run (5175) dev servers ran side by side.

## M2 — Core loop (level 1)

**Demonstrable result:** a full survival loop on level 1: fighting, taking damage, dying, restarting and scoring.

- [x] M2.1 Health (5 hits per life), 3 lives, invulnerability flashes after losing a life (logic unit tested). Enemies crashing into the ship cost a hit until enemy shots arrive (M2.2)
- [x] M2.2 Enemy bullets (boss bolt sprite). Each enemy fires on its own seeded timer once fully on screen; shots aim at the ship within 30° of straight down
- [x] M2.3 Enemy types 2 and 3 with distinct movement patterns: weaver (sways, 2 HP, 150 pts) and diver (hovers, then dives at where the ship was; 4 HP, 200 pts; doesn't shoot)
- [x] M2.4 Scripted wave schedule driven by data (unit tested). `src/levels/level1.ts` (grunts and weavers, ~45 s, loops until M4 adds the boss) built from line/column/V helpers; data checks for order, on-screen positions and crowd size
- [x] M2.5 Destructible asteroids; large ones split into small ones: grey large rock (6 HP, 50 pts) splits into 3 small rocks (1 HP, 25 pts); crashing costs a hit and still splits it; 3 in level 1
- [x] M2.6 Score and HUD: `SCORE 000000` top left, 5 health pips under it, `LIVES 3` top right, in Press Start 2P (owner approved for the game)
- [x] M2.7 Game over screen and restart: GAME OVER panel with the final score after the explosion; a fresh Space or Enter press (even a tap shorter than a frame) starts a new game; holding fire through the death never restarts
- [x] M2.8 Playwright: player death leads to game over, and restart works (`tests/e2e/game-over.spec.ts`, with M2.7)

**Acceptance criteria:** the owner can die, restart and score; waves follow the schedule; logic test coverage is at least 80%.

## M3 — Power-ups

**Demonstrable result:** all three power-ups drop and work as specified in PROJECT.md section 4a.

- [x] M3.1 Drop system with per-type rarity (data-driven, seeded, unit tested); pickup icons from the gems pack: 12% of kills (enemies, large asteroids) drop a gem; weapon 6 : shield 3 : clear 1; clear never in boss fights; gems cut from the pack's gem sheet
- [x] M3.2 Weapon levels 1–3, shots growing bigger and stronger (owner request): small tracer → double pulse → spread of three charged blasts (double damage); reset to level 1 on death; no time-out. Level 1 is the space-marine tracer (visible 10×4), then pulse ×2, then charged ×3 spread at 2 damage
- [x] M3.3 Shield: energy-shield effect, blocks all damage for 30 s (10 s since M3.7), timer shown in the HUD. A new pickup resets to full time; the bubble (2× art) absorbs enemy shots and destroys rammers; blinks for the last 3 s; HUD shows SHIELD n
- [x] M3.4 Screen clear: destroys all on-screen enemies with a large explosion; rare; never dropped during boss fights. Also removes every enemy shot (owner); each kill scores; enemies still above the screen and asteroids are spared; its kills drop nothing; 192 px blast behind the ship plus a short white flash
- [x] M3.5 Hit-spark effects on impact: a cyan spark (pack's Warped hits-3, 5 frames, 0.25 s) wherever a player shot hits an enemy or asteroid (also non-lethal hits) and where an enemy shot hits the ship or the shield; pooled
- [x] M3.6 Unit tests for every power-up rule, including "lost on death" and "no screen clear during bosses". Rules that lived in the game scene (what each gem does, lost on death, only shot-down kills drop gems) moved to `src/logic/powerups.ts` with unit tests
- [x] M3.7 Balance (owner request 2026-10-18, "too easy"): stronger weapon levels fire a little less often and fly a little slower (level 2: 5% down on both, level 3: 10%); player shots drawn 40% smaller with matching hitboxes; shield lasts 10 s instead of 30
- [x] M3.8 Balance, round 2 (owner 2026-10-18, "still too easy"): every weapon level fires 15% less often and its shots fly 15% slower again (level 1: 4.25 shots/s at 289 px/s; level 3: 3.83 at 230); shots drawn at 45% of the art (was 60%), hitboxes to match
- [x] M3.9 Level 1 tracer back to full size (owner 2026-10-18: "don't shrink the small weapon, only the larger weapon art"); its hitbox is its visible 4×10, so each level still hits a bigger area than the last

**Acceptance criteria:** each power-up is visibly distinct and behaves as specified; rules are unit tested; frame rate holds with max weapon and a full wave.

## C — Controls and cheats (owner request 2026-10-17)

**Demonstrable result:** the player can pause, quit to the arcade, see the controls, play full screen and mute; the owner has two hidden cheats.

- [x] C1 Pause and resume with P or Esc (the world freezes, animations included); pause screen shows the controls legend
- [x] C2 Q asks "QUIT TO ARCADE? Y / N"; Y returns to the portal, N resumes
- [x] C3 Controls legend: H toggles it; shown on the pause screen and for a few seconds at the start; lists every control except the cheats
- [x] C4 F toggles full screen; M toggles mute (effective once sound arrives in M7.3)
- [x] C5 Hidden cheats typed during play: +5 lives, and invincibility on/off; not shown anywhere in the game; a cheat run can't set the high score
- [x] C6 Playwright: pause freezes the game, quit confirmation (Y and N), legend, cheats

**Acceptance criteria:** every control works as listed in PROJECT.md 4b; cheats work and appear nowhere in the game's text; tests pass.

## M4 — Level system and first boss

**Demonstrable result:** level 1 ends with a boss, and beating it moves on to level 2.

- [x] M4.1 Data-driven level format: background layers, enemy roster, wave script, boss, difficulty numbers (ADR-012). `src/levels/types.ts` (`Level`: number, name, background layers, roster, waves, boss, `bossAfter`), `LEVELS` list, level 1 converted; difficulty numbers come from `difficulty(level)` in M4.2; every level is checked by unit tests
- [x] M4.2 Difficulty curve function with the limits in PROJECT.md section 4a (unit tested). `difficulty(level)` in `src/logic/difficulty.ts`, numbers in `DIFFICULTY`: fire rate ×2.5 by level 8 in equal steps (+13.98% per level), shot speed +30% by level 8, weapon and shield drops +25% by level 8 with the screen clear's chance unchanged
- [x] M4.3 Boss framework: entry, health bar, phases, attack patterns, defeat. `src/logic/boss.ts` (enters from above untouchable, sways, phases by health, aimed and fan attacks, fans proven to leave a ship-wide gap, defeat), `BOSSES` tuning, `entities/Boss.ts` with a health bar; level 1's spaceship-unit boss (Warped art turned to face down) can be spawned via the test hook until M4.4 brings it in at the level's end
- [x] M4.4 Level 1 boss; level-complete screen; transition to the next level. Waves play once, the boss comes in after the level's pause, beating it shows LEVEL n COMPLETE (Space, or 8 s), then the next level; score, lives, health, weapon and the cheat flag carry over, the shield ends (owner decisions 2026-10-18). An early level 2 (Asteroid Belt: grunts, divers, heavy asteroids) borrows level 1's backdrop and boss until M5. After the last level the panel says ALL LEVELS COMPLETE and the next press starts a new game
- [x] M4.5 Playwright: complete level 1 via the test hook and reach level 2 (`tests/e2e/levels.spec.ts`)

**Acceptance criteria:** the owner beats the level 1 boss and reaches level 2; difficulty limits are enforced by tests.

## M5 — Levels 2–4

**Demonstrable result:** levels 1–4 are playable start to finish, each with its own look and boss.

- [x] M5.1 Import and slice the extra art for levels 2–4 (manifest and credits updated): level 2 purple asteroid field (asteroid-fighter pack); level 4 red parallax layers, big planet and ring planet (space background pack, original version); bosses Warped vehicle 1 and 2; alien flyer. Level 3 uses the blue space pack layers already bundled
- [x] M5.2 Level 2 (Asteroid Belt) and its boss: purple asteroid field (drawn 2× so the 160-wide tile covers the screen), grunts, divers and heavy asteroids, boss Warped vehicle 1 (220 HP, 7,500 points, fans up to 6 shots)
- [x] M5.3 Level 3 (Blue Expanse) and its boss: blue space pack layers, weavers, divers and the new alien flyer (5 HP, 250 points, wide slow sway, fires), boss Warped vehicle 2 (280 HP, 10,000 points, fans up to 7 shots)
- [x] M5.4 Level 4 (Red Giant) and its boss: red parallax layers (the sky still at 2×, since its light band doesn't repeat cleanly), the big red planet and ringed planet drifting past (new level `props`), alien flyers and divers, boss the upgraded spaceship unit (340 HP, 12,500 points, a fourth phase, fans up to 7 shots)
- [x] M5.5 Automated check that every level's data is valid and within the difficulty limits (`tests/unit/levels.test.ts` runs every check on every level in `LEVELS`, including its `difficulty()` numbers and a tougher boss each level)

**Acceptance criteria:** the owner plays through levels 1–4; each level looks distinct; all checks pass.

## M6 — Levels 5–8

**Demonstrable result:** all 8 levels are playable, ending with the multi-part final boss.

- [x] M6.1 Import and slice the extra art for levels 5–8: the Station Run tunnel (built from the Zone 202 corridor by `tools/art/build_tunnel.py`), Warped vehicle 3, the flying-eye demon and the fire skull (with and without flames). Levels 7 and 8 reuse art already in the game; the final boss art came in with M0.7
- [x] M6.2 Level 5 (Station Run) and its boss: grunts, weavers and divers down the Zone 202 tunnel (no asteroids inside the station); Warped vehicle 3, longer than the screen, hangs down from the top with only its front half showing, and only that half can be hit (boss hitboxes gain an `offsetY`)
- [x] M6.3 Level 6 (Demon Rift) and its boss: flying-eye demons (quick, frail, fast sway) and fire skulls (hover, then ram) over level 4's red layers darkened (background layers gain a `tint`); the flaming fire skull boss sways wide and fast through four phases
- [x] M6.4 Level 7 (Deep Dark) and its twin boss: every enemy type over stars only; two Warped vehicle 1s, each with its own health, swaying as mirror images. After one attacks, the other waits at least half a cooldown, so their volleys never land together and each fan's gap check still holds. Level 7 ends when both are down
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
- [ ] M7.9 Play-test level skip (owner 2026-10-18, product review): `?level=n` starts at level n on every build and counts as a cheat (no high score). Built first, so the owner can play-test levels 6–8 and the final boss on any device
- [ ] M7.10 Continues (owner 2026-10-18): on game over, continue from the current level with 3 fresh lives and the score reset to 0; a continued run can still set the high score
- [ ] M7.11 Real-device check: the owner plays through on Chrome, Firefox and Brave (desktop) and on Safari on an iPhone; the touch pause menu hides its full-screen button where the browser has no full-screen API (iPhone Safari)

**Acceptance criteria:** the owner signs off on game feel and difficulty; no console errors in a full playthrough on all four browsers.

**Releases (owner 2026-10-18):** production is released in two batches, once all of M6 has merged and once all of M7 has, instead of after every merge.

## M8 — v1.0 release

**Demonstrable result:** Star Destroyer v1.0 is live on `games.soncrant.com`.

- [ ] M8.1 Final security review: dependencies, CodeQL, secret scan, ZAP scan of staging
- [ ] M8.2 Release through the release script — *needs approval*
- [ ] M8.3 ZAP scan of production; smoke test from outside the network; tag `v1.0`

**Acceptance criteria:** the production URL serves v1.0 with the security headers in place; the post-deploy scan is clean; the owner approves.

# Star Destroyer — Product Requirements

> **Status:** APPROVED by owner 2026-10-17 (open items in section 11 are needed for P1)
> **Owner:** soncsec (approves scope, merges, and production releases)
> **Dev lead:** Claude Code

## 1. Summary

Star Destroyer is a single-player, browser-based vertical scrolling space shooter. The player pilots a ship upward through waves of enemies and asteroids, collects weapon power-ups, and defeats a multi-part boss. It is built from the Ansimuz "Legacy Collection" pixel-art pack (Warped sci-fi set).

It is the first game on **games.soncrant.com**, a retro-arcade style portal that hosts multiple browser games (section 5).

## 2. Goals

- A complete, polished, playable stage that a stranger can open from a URL and finish with no setup.
- Classic arcade feel (Galaga / 1942 style): readable, fair, moderate bullet density.
- A games portal that makes adding future games easy.
- A clean, tested codebase delivered through reviewable pull requests.

## 3. Users

- **Primary:** casual players on desktop browsers, reaching the site over the public internet.
- **Secondary:** the owner, as play-tester and reviewer.

## 4. Star Destroyer scope — Version 1.0

### In scope

| Area | Requirement |
|---|---|
| Levels | **8 levels, each ending in a boss fight** (owner decision 2026-10-17). Each level uses different art where the pack has it (see section 4a). About 3–4 minutes per level |
| Player | One ship (from the 4 available), banking animation, engine thrust |
| Controls | Keyboard: arrows or WASD to move, Space to fire, P to pause |
| Survival | 3 lives, **5 hits per life** (health bar). Brief invulnerability after losing a life. Game over screen with restart |
| Continues | On game over, the player can continue from the current level with 3 fresh lives; the score resets to 0 (owner decision 2026-10-18). A continued run can still set the high score with its new score |
| Enemies | Several enemy types with distinct movement and firing patterns, varying by level |
| Difficulty | Enemy fire gets gradually more frequent from level 1 to 8. **Level 8 must be hard but beatable** (limits in section 4a) |
| Obstacles | Destructible asteroids; **large asteroids split into small ones** |
| Weapons | Weapon power-up drops raise the weapon level (4 levels since M7.13, using the Warped shooting effects). Weapon upgrades **never time out**, but **losing a life drops you back to the basic weapon** (owner decisions 2026-10-17) |
| Shield | Power-up: a shield that blocks all damage for **10 seconds** (owner change 2026-10-18; was 30) |
| Screen clear | **Rare** power-up that destroys every enemy on screen. **Never appears during a boss fight** |
| Bosses | One boss per level, each with its own attack patterns. The multi-part top-down boss (body, cannons, helmet, beam) is the final boss |
| Scoring | Score display; high score saved in the browser (localStorage) |
| Screens | Title, game, pause, game over, victory |
| Navigation | A link back to the games portal from the title screen |
| Visuals | Layered scrolling space backgrounds; explosion effects |
| Audio | CC0 sound effects (sourced separately; the art pack has no audio) |
| Display | 256×320 portrait game area at native pixel size, scaled to fit the window with sharp pixels |

### Out of scope (v1)

- Ship selection
- Mobile and touch controls, gamepad
- Music
- Online leaderboards, accounts, payments, analytics
- Any backend or server-side code

## 4a. Levels, power-ups and difficulty

### Power-up rules (owner decisions 2026-10-17; shield reset, screen clear removing shots and the level-3 spread shot confirmed later the same day)

| Power-up | Effect | How often | Notes |
|---|---|---|---|
| Weapon | Raises the weapon one level (max 4). Shots start small and grow bigger and stronger: 1 single small orange tracer (visible 10×4; the art pack's smallest player shot), 2 one large spark ray, 3 two rays side by side, 4 a spread of three rays; the rays do double damage (owner request 2026-10-18, M7.13; replaced the double pulse and triple charged blast) | Common | Never times out; lost on death (back to level 1). Every shot is drawn full size (the earlier 45% drawing ended with M7.13). Owner changes 2026-10-18: every level fires 15% less often and its shots fly 15% slower than first tuned, and stronger levels are a little slower again (level 2: 5%, level 3: 7.5%, level 4: 10% below level 1) |
| Shield | Blocks all damage for 10 seconds (owner change 2026-10-18; was 30) | Uncommon | Picking up another resets the timer to 10 s |
| Screen clear | Destroys every enemy on screen, plus enemy shots | Rare | Never dropped during a boss fight |

### Level plan (approved by owner 2026-10-17)

The pack has about 5 distinct top-down space backgrounds and 6 distinct boss designs, so some art is reused with different layer combinations. Side-view ships are rotated to face down.

| Level | Name | Background | Enemies | Boss |
|---|---|---|---|---|
| 1 | Teal Nebula | Top-down nebula + stars | Enemy types 1, 2 | Spaceship unit (rotated) |
| 2 | Asteroid Belt | Purple asteroid-field background, heavy asteroids | Enemy types 1, 3 | Warped vehicle 1 (rotated) |
| 3 | Blue Expanse | Blue space pack, layered | Enemy types 2, 3, alien flyers | Warped vehicle 2 (rotated) |
| 4 | Red Giant | Red planet parallax pack | Alien flyers, enemy type 3 | Spaceship unit, upgraded attacks |
| 5 | Station Run | Warped Zone 202 corridor, rotated into a vertical tunnel | Enemy types 1–3 | Warped vehicle 3 (rotated) |
| 6 | Demon Rift | Red planet pack, darker layers | Flying-eye demons, fire skulls | Fire skull, enlarged role |
| 7 | Deep Dark | Blue space pack, stars only | Mix of all | Twin Warped vehicle 1s |
| 8 | The Core | Top-down nebula, night layers | Mix of all | **Top-down multi-part boss** (final) |

### Difficulty curve and limits (keeps level 8 beatable)

- Enemy fire rate rises gradually: level 8 fires at most **2.5×** as often as level 1 (about +14% per level).
- Enemy shot speed rises at most 30% by level 8.
- Every enemy attack pattern leaves a gap the player's ship can fit through.
- Shield and weapon drops become slightly more common in later levels.
- Verified by the owner beating level 8, plus automated checks that the per-level numbers stay within these limits.

## 5. Games portal scope — Version 1.0

| Area | Requirement |
|---|---|
| URL | `games.soncrant.com` (portal home); each game at its own path, e.g. `/star-destroyer/` |
| Home page | A grid with one card per game: logo or screenshot, title, 1–2 sentence summary, play link |
| Name | **Soncrant Arcade** |
| Style | Retro arcade: pixel display type, CRT/neon glow, attractive and gamer-focused |
| Adding games | Edit one data file (`games.json`) and add a card image; no admin UI |
| Devices | Desktop first; the card grid also works on phones (the games themselves are desktop only) |
| Data | No analytics, tracking, cookies, or third-party requests |

Out of scope: user accounts, comments, ratings, an admin interface, search.

## 6. Constraints

- **Browser only, single player.**
- **No personal data is collected or transmitted.** The only stored data is the local high score, which stays in the player's browser.
- **No accounts, no payments.**
- **Art stays as-is:** native pixel-art style, no redraws.
- **Desktop browsers:** current Chrome, Firefox, Safari, Edge.
- **Production host:** existing Debian 13 server (address kept out of the repo) running Apache on TCP port 80, reachable from the internet. Files live under `/var/www/html/soncrant.com/pub/games/`, one subfolder per game.

## 7. Non-functional requirements

- Steady 60 fps on a mid-range laptop during the heaviest moments (boss fight).
- First load under about 3 seconds on a typical broadband connection.
- No console errors during a full playthrough.
- The site works under a strict Content Security Policy with no third-party runtime requests.
- Adding the new site must not disturb the other sites already on the Apache server.

## 8. Definition of success (v1.0)

1. A stranger opens `games.soncrant.com`, picks Star Destroyer, and plays the full stage to victory or game over with no setup.
2. 60 fps holds on the owner's machine.
3. The owner signs off that the game feels fair and fun, and that the portal looks good, after playing it on Chrome, Firefox and Brave on desktop and on Safari on an iPhone (the owner's play-test devices, 2026-10-18).
4. All CI checks and pre-release security scans pass.

## 9. Art assets

Source: `legacy/` (Ansimuz Legacy Collection). **License: CC0**, so commercial use is allowed and no attribution is required (we credit the artist anyway as a courtesy). Only the assets below get copied into the project; `legacy/` stays out of Git.

| Use | Path under `legacy/` |
|---|---|
| Player ship (4 designs, red and yellow, 5-frame banking, 48×48) | `Warped/Characters/top-down-shooter-ship/` |
| Enemies (3 types) and enemy explosion | `Warped/Characters/top-down-shooter-enemies/` |
| Boss (body, cannons, helmet, rays, bolt, thrust) | `Warped/Characters/top-down-boss/` |
| Asteroids, planet | `Warped/Misc/asteroid-fighter Pack/`, `Warped/Environments/top-down-space-environment/` |
| Backgrounds (vertical stage 256×320, parallax layers) | `Warped/Environments/top-down-space-environment/`, `Warped/Environments/space_background_pack/` |
| Weapon effects (pulse, bolt, spark, waveform, charged, crossed) | `Explosions and Magic/Warped shooting fx/` |
| Explosions (7 variants) | `Explosions and Magic/Explosions pack/` |

## 4b. Controls and hidden cheats (owner request 2026-10-17)

**Controls** (all listed in an on-screen legend, except the cheats):

| Key | Action |
|---|---|
| Arrows / WASD | Move |
| Space | Fire (and play again after game over; Enter also works) |
| P or Esc | Pause / resume. The pause screen shows the controls legend |
| Q | Asks "QUIT TO ARCADE? Y / N"; Y returns to the arcade portal, N resumes |
| H | Shows or hides the controls legend (also shown briefly at the start) |
| F | Full screen on / off (whole-number pixel scaling kept) |
| M | Mute / unmute (takes effect once sound arrives, M7.3) |

**Hidden cheats** (owner decision: secret words typed during play; never shown in the game):
- One word gives **+5 lives**; another toggles **invincibility**.
- The words live in the code (the repo is public), not in the game's text or legend.
- A run that used a cheat is not eligible for the high score (M7.2).

**Play-test level skip** (owner decision 2026-10-18): opening the game with `?level=n` (1–8) starts at that level, on every build, so the owner can play-test the late levels and the final boss on any device, phones included. It counts as a cheat, so that run can't set the high score. Nothing is stored.

## 10. Decisions confirmed by the owner (2026-10-17)

- Single player, browser only, no data collected, no accounts or payments, art unchanged, desktop browsers.
- Architecture and milestones approved; production setup moved earlier (right after M1).
- Production: Debian 13 server with Apache, public on the internet, domain `games.soncrant.com`.
- Deployment through a release script (no server credentials stored on GitHub).
- Portal: named **Soncrant Arcade**, retro-arcade style.
- HTTP only (port 80): the server uses self-signed certificates and the site holds no sensitive data. The owner configures Apache to map `games.soncrant.com` to the games folder.
- Parallel Claude instances for other games, using the plan in ARCHITECTURE.md ADR-011.
- GitHub account `soncsec`; Claude may create repositories and install needed packages.
- Product review decisions (2026-10-18): continues with the score reset (still high-score eligible); a `?level=n` play-test skip that counts as a cheat; production releases in two batches (once all of M6 has merged, and once all of M7 has) instead of after every merge; the owner play-tests on Chrome, Firefox, Brave and iPhone Safari.

## 11. Open items

1. **SSH access** for the release script: a deploy user on the server and an SSH key from the dev machine.
2. **Public DNS:** an `A` record for `games.soncrant.com` pointing at the public IP, and port 80 forwarded to the server (check whether this already exists for `soncrant.com`).
3. **Folder move:** done 2026-10-17, when development moved to a new machine. Game repos live in `~/dev/games/<slug>/` (owner's choice of path) and the portal in `~/dev/games/games-portal/`. The art pack is shared at `~/dev/games/_assets/legacy/`, and each game links it in as `legacy` (git-ignored).

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
| Stage | One stage, about 3–5 minutes: scripted enemy waves, then a boss fight |
| Player | One ship (from the 4 available), banking animation, engine thrust |
| Controls | Keyboard: arrows or WASD to move, Space to fire, P to pause |
| Survival | Health bar and lives; game over screen with restart |
| Enemies | 3 enemy types with distinct movement and firing patterns |
| Obstacles | Destructible asteroids |
| Weapons | Power-up drops; 2–3 weapon levels using the Warped shooting effects. **Power-ups are permanent and never time out** (owner decision 2026-10-17). Whether a level is lost on death is still open. |
| Boss | Multi-part boss (body, left and right cannons, helmet) with beam and bolt attacks, multiple phases |
| Scoring | Score display; high score saved in the browser (localStorage) |
| Screens | Title, game, pause, game over, victory |
| Navigation | A link back to the games portal from the title screen |
| Visuals | Layered scrolling space backgrounds; explosion effects |
| Audio | CC0 sound effects (sourced separately; the art pack has no audio) |
| Display | 256×320 portrait game area at native pixel size, scaled to fit the window with sharp pixels |

### Out of scope (v1)

- Multiple stages, ship selection
- Mobile and touch controls, gamepad
- Music
- Online leaderboards, accounts, payments, analytics
- Any backend or server-side code

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
3. The owner signs off that the game feels fair and fun, and that the portal looks good.
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

## 10. Decisions confirmed by the owner (2026-10-17)

- Single player, browser only, no data collected, no accounts or payments, art unchanged, desktop browsers.
- Architecture and milestones approved; production setup moved earlier (right after M1).
- Production: Debian 13 server with Apache, public on the internet, domain `games.soncrant.com`.
- Deployment through a release script (no server credentials stored on GitHub).
- Portal: named **Soncrant Arcade**, retro-arcade style.
- HTTP only (port 80): the server uses self-signed certificates and the site holds no sensitive data. The owner configures Apache to map `games.soncrant.com` to the games folder.
- Parallel Claude instances for other games, using the plan in ARCHITECTURE.md ADR-011.
- GitHub account `soncsec`; Claude may create repositories and install needed packages.

## 11. Open items

1. **SSH access** for the release script: a deploy user on the server and an SSH key from the dev machine.
2. **Public DNS:** an `A` record for `games.soncrant.com` pointing at the public IP, and port 80 forwarded to the server (check whether this already exists for `soncrant.com`).
3. **Folder move** (approved, scheduled after M1): game repos under `~/games/<slug>/`, and `legacy/` to the shared `~/games/_assets/legacy/`.

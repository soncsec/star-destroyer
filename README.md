# Star Destroyer

A browser-based vertical space shooter built with Phaser 4, TypeScript and Vite, using the CC0 Ansimuz "Warped" pixel-art pack. It will be playable at `games.soncrant.com/star-destroyer/` as part of Soncrant Arcade.

**Play the staging build:** https://soncsec.github.io/star-destroyer/ (updated after every merge to `main`; arrow keys or WASD to move, Space to fire).

| Doc | Contents |
|---|---|
| [PROJECT.md](PROJECT.md) | Product requirements and scope |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical design and decisions (ADRs) |
| [ROADMAP.md](ROADMAP.md) | Milestones, tasks and progress |
| [CLAUDE.md](CLAUDE.md) | Development rules |

Status: M1 done; P1 (portal and production) in progress.

## Releasing to production

Only with the owner's approval for each release (CLAUDE.md).

```sh
cp deploy/server.env.example deploy/server.env   # once; fill in the real values (git-ignored)
git checkout main && git pull
scripts/release.sh deploy --dry-run   # checks and build only; shows what is on the server
scripts/release.sh deploy             # upload, switch, smoke test (rolls back on failure)
scripts/release.sh rollback           # back to the previous release
scripts/release.sh status             # list releases on the server
```

`deploy` refuses to run unless HEAD is `origin/main`, the working tree is clean, and CI passed on that commit (including CodeQL and the ZAP scan of staging).

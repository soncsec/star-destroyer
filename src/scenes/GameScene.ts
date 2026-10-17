import Phaser from 'phaser';
import {
  BACKGROUND,
  DEFAULT_SEED,
  ENEMY_BASIC,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HEALTH,
  WEAPON,
} from '../config/tuning';
import { Bullets } from '../entities/Bullets';
import { Enemies } from '../entities/Enemies';
import { Explosions } from '../entities/Explosions';
import { Player } from '../entities/Player';
import { firstHit } from '../logic/collision';
import { stepSpawner } from '../logic/enemy';
import {
  isGameOver,
  newHealth,
  shipVisible,
  takeHit,
  tickHealth,
  type Health,
  type HitResult,
} from '../logic/health';
import type { Axis } from '../logic/player';
import { createRng, type Rng } from '../logic/rng';
import { stepFire, type FireState } from '../logic/weapon';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  score: number;
  player: { x: number; y: number };
  enemies: { x: number; y: number; hp: number }[];
  shots: number;
  explosions: number;
  health: Health & { gameOver: boolean };
  /** The result of the most recent hit, for tests and (later) the HUD. */
  lastHit: HitResult | null;
}

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'fire',
  Phaser.Input.Keyboard.Key
>;

export class GameScene extends Phaser.Scene {
  private nebula!: Phaser.GameObjects.TileSprite;
  private stars!: Phaser.GameObjects.TileSprite;
  private player!: Player;
  private bullets!: Bullets;
  private fireState: FireState = { cooldown: 0 };
  private enemies!: Enemies;
  private explosions!: Explosions;
  private rng!: Rng;
  private spawnTimer = 0;
  private score = 0;
  private spawning = true;
  private health: Health = newHealth(PLAYER_HEALTH);
  private lastHit: HitResult | null = null;
  private keys!: Keys;

  constructor() {
    super('Game');
  }

  create(): void {
    this.nebula = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-stage-back').setOrigin(0);
    this.stars = this.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-blue-stars')
      .setOrigin(0)
      .setAlpha(0.8);
    this.rng = createRng(seedFromUrl());
    this.spawnTimer = 0;
    this.score = 0;
    this.spawning = true;
    this.health = newHealth(PLAYER_HEALTH);
    this.lastHit = null;
    this.enemies = new Enemies(this);
    this.bullets = new Bullets(this);
    this.player = new Player(this);
    this.explosions = new Explosions(this);

    const kb = this.input.keyboard;
    if (!kb) throw new Error('keyboard input is not available');
    this.keys = kb.addKeys({
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      w: 'W',
      a: 'A',
      s: 'S',
      d: 'D',
      fire: 'SPACE',
    }) as Keys;
  }

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    // Moving the texture down makes the ship appear to fly up.
    this.nebula.tilePositionY -= BACKGROUND.nebulaSpeed * dt;
    this.stars.tilePositionY -= BACKGROUND.starsSpeed * dt;
    const alive = !isGameOver(this.health);
    if (alive) this.player.update(this.readAxis(), dt);

    const shot = stepFire(this.fireState, alive && this.keys.fire.isDown, dt, WEAPON.fireInterval);
    this.fireState = shot.state;
    if (shot.fire) {
      const { x, y } = this.player.position;
      this.bullets.fire(x, y + WEAPON.muzzleOffsetY);
    }
    this.bullets.update(dt);

    const spawn = stepSpawner(this.spawnTimer, dt, ENEMY_BASIC.spawnInterval);
    this.spawnTimer = spawn.timeLeft;
    if (spawn.spawn && this.spawning) {
      const margin = ENEMY_BASIC.hitbox.w / 2 + 4;
      this.enemies.spawn(this.rng.range(margin, GAME_WIDTH - margin));
    }
    this.enemies.update(dt);
    this.resolveShotHits();

    this.health = tickHealth(this.health, dt);
    this.resolvePlayerHits();
    this.player.setVisible(
      !isGameOver(this.health) && shipVisible(this.health, PLAYER_HEALTH.flashHz),
    );
  }

  /** An enemy touching the ship costs one hit and is destroyed (no points). */
  private resolvePlayerHits(): void {
    if (isGameOver(this.health) || this.health.invulnerable > 0) return;
    const enemies = this.enemies.active();
    const target =
      enemies[
        firstHit(
          this.player.hitbox(),
          enemies.map((e) => this.enemies.hitbox(e)),
        )
      ];
    if (!target) return;

    const { health, result } = takeHit(this.health, PLAYER_HEALTH);
    this.health = health;
    this.lastHit = result;
    this.explosions.play(target.sprite.x, target.sprite.y);
    this.enemies.destroy(target);
    if (result === 'lifeLost' || result === 'gameOver') {
      const { x, y } = this.player.position;
      this.explosions.play(x, y);
      if (result === 'lifeLost') this.player.reset();
    }
  }

  snapshot(): GameSnapshot {
    const { x, y } = this.player.position;
    return {
      score: this.score,
      player: { x, y },
      enemies: this.enemies.active().map((e) => ({ x: e.sprite.x, y: e.sprite.y, hp: e.hp })),
      shots: this.bullets.active().length,
      explosions: this.explosions.activeCount(),
      health: { ...this.health, gameOver: isGameOver(this.health) },
      lastHit: this.lastHit,
    };
  }

  /** Turns random spawning on or off (tests use this to control the screen). */
  setSpawning(on: boolean): void {
    this.spawning = on;
  }

  /** Removes all enemies without scoring (tests use this for a clean screen). */
  clearEnemies(): void {
    this.enemies.clear();
  }

  /** Spawns one basic enemy at `x`: at the top of the screen, or at `y` if given. */
  spawnEnemy(x: number, y?: number): boolean {
    return this.enemies.spawn(x, y);
  }

  /** Each shot hits at most one enemy and is used up. */
  private resolveShotHits(): void {
    const enemies = this.enemies.active();
    if (enemies.length === 0) return;
    for (const shot of this.bullets.active()) {
      const boxes = enemies.map((e) => this.enemies.hitbox(e));
      const i = firstHit(this.bullets.hitbox(shot), boxes);
      const target = enemies[i];
      if (!target) continue;
      this.bullets.release(shot);
      const { x, y } = target.sprite;
      if (this.enemies.hit(target, 1)) {
        this.explosions.play(x, y);
        this.score += ENEMY_BASIC.points;
        enemies.splice(i, 1);
        if (enemies.length === 0) return;
      }
    }
  }

  private readAxis(): Axis {
    const k = this.keys;
    const left = k.left.isDown || k.a.isDown;
    const right = k.right.isDown || k.d.isDown;
    const up = k.up.isDown || k.w.isDown;
    const down = k.down.isDown || k.s.isDown;
    return {
      x: left === right ? 0 : left ? -1 : 1,
      y: up === down ? 0 : up ? -1 : 1,
    };
  }
}

/** Seed from the URL (?seed=123) for repeatable runs, otherwise the default. */
function seedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get('seed');
  const n = raw === null ? Number.NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : DEFAULT_SEED;
}

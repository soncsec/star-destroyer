import Phaser from 'phaser';
import {
  BACKGROUND,
  DEFAULT_SEED,
  ENEMY_FIRE,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HEALTH,
  WEAPON,
  type EnemyKind,
} from '../config/tuning';
import { Bullets } from '../entities/Bullets';
import { EnemyBullets } from '../entities/EnemyBullets';
import { Enemies } from '../entities/Enemies';
import { Explosions } from '../entities/Explosions';
import { Player } from '../entities/Player';
import { firstHit } from '../logic/collision';
import { LEVEL_1 } from '../levels/level1';
import { aimDown, firstShotDelay, nextShotDelay, stepEnemyFire } from '../logic/enemyFire';
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
import { startWaves, stepWaves, type WaveRunner } from '../logic/waves';
import { stepFire, type FireState } from '../logic/weapon';

/** Read-only view of the game state, used by the e2e test hook. */
export interface GameSnapshot {
  score: number;
  player: { x: number; y: number };
  /** spawnX is where it appeared (weavers sway away from it). */
  /** fireIn: seconds until its next shot (the seeded RNG sets the first one). */
  enemies: {
    kind: EnemyKind;
    x: number;
    y: number;
    hp: number;
    spawnX: number;
    fireIn: number;
  }[];
  /** Progress through the level's wave script. */
  waves: WaveRunner;
  shots: number;
  explosions: number;
  /** Enemy shots in flight. */
  enemyShots: { x: number; y: number }[];
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
  private enemyBullets!: EnemyBullets;
  private explosions!: Explosions;
  private rng!: Rng;
  private waves: WaveRunner = startWaves();
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
    this.waves = startWaves();
    this.score = 0;
    this.spawning = true;
    this.health = newHealth(PLAYER_HEALTH);
    this.lastHit = null;
    this.enemies = new Enemies(this);
    this.enemyBullets = new EnemyBullets(this);
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

    if (this.spawning) {
      const step = stepWaves(this.waves, LEVEL_1.waves, dt, LEVEL_1.loopGap);
      this.waves = step.runner;
      for (const sp of step.spawns) {
        this.spawnEnemy(sp.x * GAME_WIDTH, undefined, undefined, sp.kind);
      }
    }
    this.enemies.update(dt, this.player.position);
    this.enemiesFire(dt);
    this.enemyBullets.update(dt);
    this.resolveShotHits();

    this.health = tickHealth(this.health, dt);
    this.resolvePlayerHits();
    this.player.setVisible(
      !isGameOver(this.health) && shipVisible(this.health, PLAYER_HEALTH.flashHz),
    );
  }

  /** Each enemy on screen shoots on its own timer, aimed (within limits) at the ship. */
  private enemiesFire(dt: number): void {
    const next = (): number => nextShotDelay(this.rng, ENEMY_FIRE);
    const target = this.player.position;
    for (const e of this.enemies.active()) {
      if (!ENEMY_TYPES[e.kind].fires) continue;
      const step = stepEnemyFire(e.fireIn, dt, this.enemies.onScreen(e), next);
      e.fireIn = step.timeLeft;
      if (!step.fire) continue;
      const from = { x: e.sprite.x, y: e.sprite.y + ENEMY_FIRE.muzzleOffsetY };
      this.enemyBullets.fire(
        from.x,
        from.y,
        aimDown(from, target, ENEMY_FIRE.speed, ENEMY_FIRE.maxAimAngleDeg),
      );
    }
  }

  /**
   * An enemy shot or an enemy touching the ship costs one hit. The shot is
   * used up; a crashing enemy is destroyed (no points).
   */
  private resolvePlayerHits(): void {
    if (isGameOver(this.health) || this.health.invulnerable > 0) return;
    const ship = this.player.hitbox();
    const shots = this.enemyBullets.active();
    const shot =
      shots[
        firstHit(
          ship,
          shots.map((s) => this.enemyBullets.hitbox(s)),
        )
      ];
    const enemies = this.enemies.active();
    const enemy =
      enemies[
        firstHit(
          ship,
          enemies.map((e) => this.enemies.hitbox(e)),
        )
      ];
    if (!shot && !enemy) return;

    const { health, result } = takeHit(this.health, PLAYER_HEALTH);
    this.health = health;
    this.lastHit = result;
    if (shot) this.enemyBullets.release(shot);
    if (enemy) {
      this.explosions.play(enemy.sprite.x, enemy.sprite.y);
      this.enemies.destroy(enemy);
    }
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
      enemies: this.enemies.active().map((e) => ({
        kind: e.kind,
        x: e.sprite.x,
        y: e.sprite.y,
        hp: e.hp,
        spawnX: e.move.x0,
        fireIn: e.fireIn,
      })),
      waves: { ...this.waves },
      shots: this.bullets.active().length,
      explosions: this.explosions.activeCount(),
      enemyShots: this.enemyBullets.active().map((sh) => ({ x: sh.sprite.x, y: sh.sprite.y })),
      health: { ...this.health, gameOver: isGameOver(this.health) },
      lastHit: this.lastHit,
    };
  }

  /** Turns the wave script on or off (tests use this to control the screen). */
  setSpawning(on: boolean): void {
    this.spawning = on;
  }

  /** Removes all enemies and, unless `keepShots`, their shots (tests use this for a clean screen). */
  clearEnemies(keepShots = false): void {
    this.enemies.clear();
    if (!keepShots) this.enemyBullets.clear();
  }

  /**
   * Spawns one enemy of `kind` (default grunt) at `x`: at the top of the
   * screen, or at `y` if given. Its first shot comes after a random delay, or
   * `firstShot` seconds on screen (tests).
   */
  spawnEnemy(x: number, y?: number, firstShot?: number, kind: EnemyKind = 'grunt'): boolean {
    return this.enemies.spawn(kind, x, firstShot ?? firstShotDelay(this.rng, ENEMY_FIRE), y);
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
        this.score += ENEMY_TYPES[target.kind].points;
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

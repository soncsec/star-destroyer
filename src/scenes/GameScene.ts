import Phaser from 'phaser';
import {
  BACKGROUND,
  ASTEROIDS,
  DEFAULT_SEED,
  GAME_OVER,
  ENEMY_FIRE,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HEALTH,
  POWERUPS,
  WEAPON,
  type EnemyKind,
} from '../config/tuning';
import { Asteroids, type RockSize, type RockSlot } from '../entities/Asteroids';
import { Bullets } from '../entities/Bullets';
import { EnemyBullets } from '../entities/EnemyBullets';
import { Enemies } from '../entities/Enemies';
import { Explosions } from '../entities/Explosions';
import { GameOverPanel } from '../entities/GameOverPanel';
import { Hud } from '../entities/Hud';
import { Pickups } from '../entities/Pickups';
import { Player } from '../entities/Player';
import { firstHit, type Box } from '../logic/collision';
import { rollDrop, type PowerUpKind } from '../logic/drops';
import { panelShown, startGameOver, stepGameOver, type GameOverState } from '../logic/gameOver';
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
  asteroids: { size: RockSize; x: number; y: number; hp: number }[];
  /** What the HUD shows. */
  hud: { score: string; lives: string; pips: boolean[] };
  /** Pickups drifting down, and how many of each kind the ship has collected. */
  pickups: { kind: PowerUpKind; x: number; y: number }[];
  collected: Record<PowerUpKind, number>;
  /** The game-over panel, and whether a fresh key press will now restart. */
  gameOver: { visible: boolean; title: string; score: string; prompt: string; armed: boolean };
  shots: number;
  explosions: number;
  /** Enemy shots in flight. */
  enemyShots: { x: number; y: number }[];
  health: Health & { gameOver: boolean };
  /** The result of the most recent hit, for tests and (later) the HUD. */
  lastHit: HitResult | null;
}

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'fire' | 'enter',
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
  private asteroids!: Asteroids;
  private explosions!: Explosions;
  private hud!: Hud;
  private pickups!: Pickups;
  /** Power-ups collected this game, by kind (their effects arrive in M3.2–M3.4). */
  private collected: Record<PowerUpKind, number> = { weapon: 0, shield: 0, clear: 0 };
  /** True while a boss is on screen (M4): no screen-clear drops then. */
  private bossFight = false;
  /** Drop chance override (tests force drops); null uses the tuning. */
  private dropChance: number | null = null;
  private gameOverPanel!: GameOverPanel;
  /** Set when the last life is lost; null while playing. */
  private gameOver: GameOverState | null = null;
  /** A new Space or Enter press since the last frame (catches taps shorter than a frame). */
  private restartPressed = false;
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
    this.asteroids = new Asteroids(this);
    this.enemies = new Enemies(this);
    this.enemyBullets = new EnemyBullets(this);
    this.bullets = new Bullets(this);
    this.player = new Player(this);
    this.explosions = new Explosions(this);
    this.hud = new Hud(this, PLAYER_HEALTH.hitsPerLife);
    this.pickups = new Pickups(this);
    this.collected = { weapon: 0, shield: 0, clear: 0 };
    this.bossFight = false;
    this.dropChance = null;
    this.gameOverPanel = new GameOverPanel(this);
    this.gameOver = null;

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
      enter: 'ENTER',
    }) as Keys;
    // The 'down' event fires once per real press (not for key-repeat), even if
    // the key is released again before the next frame.
    this.restartPressed = false;
    const onPress = (): void => {
      this.restartPressed = true;
    };
    this.keys.fire.on('down', onPress);
    this.keys.enter.on('down', onPress);
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

    if (this.spawning && !this.gameOver) {
      const step = stepWaves(this.waves, LEVEL_1.waves, dt, LEVEL_1.loopGap);
      this.waves = step.runner;
      for (const sp of step.spawns) {
        if (sp.kind === 'asteroid') this.asteroids.spawnLarge(sp.x * GAME_WIDTH, this.rng);
        else this.spawnEnemy(sp.x * GAME_WIDTH, undefined, undefined, sp.kind);
      }
    }
    this.enemies.update(dt, this.player.position);
    this.asteroids.update(dt);
    this.pickups.update(dt);
    this.enemiesFire(dt);
    this.enemyBullets.update(dt);
    this.resolveShotHits();

    this.health = tickHealth(this.health, dt);
    this.resolvePlayerHits();
    this.collectPickups();
    this.player.setVisible(
      !isGameOver(this.health) && shipVisible(this.health, PLAYER_HEALTH.flashHz),
    );
    this.hud.update(this.score, this.health.hits, this.health.lives);
    this.updateGameOver(dt);
  }

  /** After the last life: show the panel, then restart on a fresh Space or Enter press. */
  private updateGameOver(dt: number): void {
    const pressed = this.restartPressed;
    this.restartPressed = false;
    if (!this.gameOver) {
      if (isGameOver(this.health)) this.gameOver = startGameOver();
      return;
    }
    const held = this.keys.fire.isDown || this.keys.enter.isDown;
    const step = stepGameOver(this.gameOver, dt, { held, pressed }, GAME_OVER);
    this.gameOver = step.state;
    const shown = panelShown(this.gameOver, GAME_OVER);
    this.gameOverPanel.show(shown, this.score, this.gameOver.t - GAME_OVER.showAfter);
    if (step.restart) this.scene.restart();
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
   * An enemy shot, an enemy or an asteroid touching the ship costs one hit.
   * The shot is used up; a crashing enemy is destroyed and a crashing rock
   * shatters (no points either way).
   */
  private resolvePlayerHits(): void {
    if (isGameOver(this.health) || this.health.invulnerable > 0) return;
    const ship = this.player.hitbox();
    const shot = touching(ship, this.enemyBullets.active(), (b) => this.enemyBullets.hitbox(b));
    const enemy = touching(ship, this.enemies.active(), (e) => this.enemies.hitbox(e));
    const rock = touching(ship, this.asteroids.active(), (r) => this.asteroids.hitbox(r));
    if (!shot && !enemy && !rock) return;

    const { health, result } = takeHit(this.health, PLAYER_HEALTH);
    this.health = health;
    this.lastHit = result;
    if (shot) this.enemyBullets.release(shot);
    if (enemy) {
      this.explosions.play(enemy.sprite.x, enemy.sprite.y);
      this.enemies.destroy(enemy);
    }
    if (rock) {
      this.asteroids.destroy(rock);
      this.shatter(rock);
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
      hud: this.hud.read(),
      gameOver: { ...this.gameOverPanel.read(), armed: this.gameOver?.armed ?? false },
      pickups: this.pickups.active().map((p) => ({ kind: p.kind, x: p.sprite.x, y: p.sprite.y })),
      collected: { ...this.collected },
      asteroids: this.asteroids
        .active()
        .map((r) => ({ size: r.size, x: r.rock.x, y: r.rock.y, hp: r.hp })),
      shots: this.bullets.active().length,
      explosions: this.explosions.activeCount(),
      enemyShots: this.enemyBullets.active().map((sh) => ({ x: sh.sprite.x, y: sh.sprite.y })),
      health: { ...this.health, gameOver: isGameOver(this.health) },
      lastHit: this.lastHit,
    };
  }

  /** Spawns a large asteroid at `x`: at the top of the screen, or at `y` if given (tests). */
  /** Overrides the drop chance (tests: 1 = every kill drops); null restores the tuning. */
  setDropChance(chance: number | null): void {
    this.dropChance = chance;
  }

  /** Drops a pickup of `kind` at (x, y) (tests). */
  spawnPickup(kind: PowerUpKind, x: number, y: number): boolean {
    return this.pickups.spawn(kind, x, y);
  }

  spawnAsteroid(x: number, y?: number): boolean {
    return this.asteroids.spawnLarge(x, this.rng, y);
  }

  /** Fires exactly one player shot from the ship (tests; no keyboard timing involved). */
  fireShot(): boolean {
    const { x, y } = this.player.position;
    return this.bullets.fire(x, y + WEAPON.muzzleOffsetY);
  }

  /** Puts the ship on its last life with one hit left (tests reach game over quickly). */
  oneHitLeft(): void {
    this.health = { hits: PLAYER_HEALTH.hitsPerLife - 1, lives: 1, invulnerable: 0 };
  }

  /** Turns the wave script on or off (tests use this to control the screen). */
  setSpawning(on: boolean): void {
    this.spawning = on;
  }

  /** Removes all enemies and, unless `keepShots`, their shots (tests use this for a clean screen). */
  clearEnemies(keepShots = false): void {
    this.enemies.clear();
    this.asteroids.clear();
    this.pickups.clear();
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

  /**
   * Each shot hits at most one target and is used up: an enemy if it touches
   * one, otherwise an asteroid.
   */
  private resolveShotHits(): void {
    for (const shot of this.bullets.active()) {
      const box = this.bullets.hitbox(shot);
      const enemy = touching(box, this.enemies.active(), (e) => this.enemies.hitbox(e));
      if (enemy) {
        this.bullets.release(shot);
        const { x, y } = enemy.sprite;
        if (this.enemies.hit(enemy, 1)) {
          this.explosions.play(x, y);
          this.score += ENEMY_TYPES[enemy.kind].points;
          this.maybeDrop(x, y);
        }
        continue;
      }
      const rock = touching(box, this.asteroids.active(), (r) => this.asteroids.hitbox(r));
      if (rock) {
        this.bullets.release(shot);
        if (this.asteroids.hit(rock, 1)) {
          this.score += ASTEROIDS[rock.size].points;
          if (rock.size === 'large') this.maybeDrop(rock.rock.x, rock.rock.y);
          this.shatter(rock);
        }
      }
    }
  }

  /** A destroyed or crashed rock explodes; a large one splits into small pieces. */
  /** A kill may drop a power-up where it happened (seeded; never a screen clear in a boss fight). */
  private maybeDrop(x: number, y: number): void {
    const rules = { ...POWERUPS.drops, chance: this.dropChance ?? POWERUPS.drops.chance };
    const kind = rollDrop(this.rng, rules, { bossFight: this.bossFight });
    if (kind) this.pickups.spawn(kind, x, y);
  }

  /** The ship collects any pickup it touches. */
  private collectPickups(): void {
    if (isGameOver(this.health)) return;
    const ship = this.player.hitbox();
    for (const p of this.pickups.active()) {
      if (firstHit(ship, [this.pickups.hitbox(p)]) < 0) continue;
      this.pickups.release(p);
      this.collected[p.kind]++;
    }
  }

  private shatter(rock: RockSlot): void {
    this.explosions.play(rock.rock.x, rock.rock.y);
    if (rock.size === 'large') this.asteroids.split(rock, this.rng);
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

/** The first item whose hitbox overlaps `box`, if any. */
function touching<T>(box: Box, items: readonly T[], hitbox: (item: T) => Box): T | undefined {
  return items[firstHit(box, items.map(hitbox))];
}

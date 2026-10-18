import Phaser from 'phaser';
import {
  BACKGROUND,
  ASTEROIDS,
  CHEATS,
  CONTROLS,
  DEFAULT_SEED,
  GAME_OVER,
  ENEMY_FIRE,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HEALTH,
  POWERUPS,
  SHIELD,
  WEAPON,
  WEAPON_LEVELS,
  type EnemyKind,
} from '../config/tuning';
import { Asteroids, type RockSize, type RockSlot } from '../entities/Asteroids';
import { Bullets } from '../entities/Bullets';
import { ControlsOverlay } from '../entities/ControlsOverlay';
import { EnemyBullets } from '../entities/EnemyBullets';
import { Enemies } from '../entities/Enemies';
import { Explosions } from '../entities/Explosions';
import { GameOverPanel } from '../entities/GameOverPanel';
import { Hud } from '../entities/Hud';
import { Pickups } from '../entities/Pickups';
import { ShieldBubble } from '../entities/ShieldBubble';
import { Player } from '../entities/Player';
import { typeLetter, type Cheat } from '../logic/cheats';
import { firstHit, type Box } from '../logic/collision';
import {
  pressKey,
  running,
  startControls,
  tickLegend,
  type ControlKey,
  type ControlState,
} from '../logic/controls';
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
import { collectShield, shieldSeconds, shieldUp, tickShield, type Shield } from '../logic/shield';
import { startWaves, stepWaves, type WaveRunner } from '../logic/waves';
import { stepFire, type FireState } from '../logic/weapon';
import { levelUp, volley } from '../logic/weaponLevels';

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
  hud: { score: string; lives: string; pips: boolean[]; shield: string };
  /** Seconds of shield left, and whether the bubble is drawn this frame. */
  shield: { timeLeft: number; bubbleVisible: boolean };
  /** Pause / quit / legend state and what the overlay shows; mute and full screen. */
  controls: { mode: string; legend: boolean; overlay: ReturnType<ControlsOverlay['read']> };
  muted: boolean;
  /** Test hook only; the game itself never shows these. */
  cheats: { invincible: boolean; used: boolean };
  fullscreen: boolean;
  /** Pickups drifting down, and how many of each kind the ship has collected. */
  pickups: { kind: PowerUpKind; x: number; y: number }[];
  collected: Record<PowerUpKind, number>;
  weaponLevel: number;
  /** The game-over panel, and whether a fresh key press will now restart. */
  gameOver: { visible: boolean; title: string; score: string; prompt: string; armed: boolean };
  shots: number;
  /** Damage of each player shot in flight. */
  shotDamage: number[];
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
  /** Current weapon level, 1 to WEAPON_LEVELS.length (owner rules: no time-out, reset on death). */
  private weaponLevel = 1;
  /** Seconds of shield left (M3.3); 0 = none. */
  private shield: Shield = 0;
  private shieldBubble!: ShieldBubble;
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
  private controls: ControlState = startControls(true);
  private controlsOverlay!: ControlsOverlay;
  /** Seconds the start-of-game legend has shown; -1 once it's done or H was pressed. */
  private introLegend = 0;
  /** Hidden cheats (never shown in the game). */
  private cheatBuffer = '';
  private invincible = false;
  /** True once any cheat was used this game: the run can't set the high score (M7.2). */
  private cheated = false;
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
    this.weaponLevel = 1;
    this.shield = 0;
    this.shieldBubble = new ShieldBubble(this);
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

    // Pause, quit, legend, full screen and mute (PROJECT.md 4b).
    this.controls = startControls(true);
    this.introLegend = 0;
    this.controlsOverlay = new ControlsOverlay(this);
    const bind = (code: string, action: () => void): void => {
      kb.addKey(code).on('down', action);
    };
    const control = (key: ControlKey) => (): void => this.onControl(key);
    bind('P', control('pause'));
    bind('ESC', control('escape'));
    bind('Q', control('quit'));
    bind('Y', control('yes'));
    bind('N', control('no'));
    bind('H', control('help'));
    bind('F', () => this.scale.toggleFullscreen());
    bind('M', () => {
      this.sound.mute = !this.sound.mute;
    });

    // Hidden cheats: secret words typed during play.
    this.cheatBuffer = '';
    this.invincible = false;
    this.cheated = false;
    // The browser's own keydown, not Phaser's general key event: Phaser's can
    // deliver a typed letter more than once and out of order, which breaks words.
    const onType = (e: KeyboardEvent): void => {
      if (e.repeat || !running(this.controls) || isGameOver(this.health)) return;
      const letter = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const typed = typeLetter(this.cheatBuffer, letter, CHEATS.words);
      this.cheatBuffer = typed.buffer;
      if (typed.cheat) this.applyCheat(typed.cheat);
    };
    window.addEventListener('keydown', onType);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onType),
    );
  }

  private applyCheat(cheat: Cheat): void {
    this.cheated = true;
    if (cheat === 'lives')
      this.health = { ...this.health, lives: this.health.lives + CHEATS.extraLives };
    else this.invincible = !this.invincible;
  }

  /** Applies a pause/quit/legend key, freezing or resuming animations to match. */
  private onControl(key: ControlKey): void {
    const wasRunning = running(this.controls);
    const { state, quit } = pressKey(this.controls, key, { gameOver: isGameOver(this.health) });
    this.controls = state;
    if (key === 'help') this.introLegend = -1; // the player took over the legend
    if (quit) {
      window.location.assign(new URL(CONTROLS.quitUrl, window.location.href).href);
      return;
    }
    if (wasRunning && !running(state)) this.anims.pauseAll();
    if (!wasRunning && running(state)) this.anims.resumeAll();
  }

  override update(_time: number, deltaMs: number): void {
    const dt = deltaMs / 1000;
    if (this.introLegend >= 0 && running(this.controls)) {
      this.introLegend += dt;
      if (this.introLegend >= CONTROLS.introLegendSeconds) {
        this.controls = tickLegend(this.controls, this.introLegend, CONTROLS.introLegendSeconds);
        this.introLegend = -1;
      }
    }
    this.controlsOverlay.show(this.controls);
    if (!running(this.controls)) {
      // Paused or asking to quit: the world stands still.
      this.restartPressed = false;
      return;
    }
    // Moving the texture down makes the ship appear to fly up.
    this.nebula.tilePositionY -= BACKGROUND.nebulaSpeed * dt;
    this.stars.tilePositionY -= BACKGROUND.starsSpeed * dt;
    const alive = !isGameOver(this.health);
    if (alive) this.player.update(this.readAxis(), dt);

    const shot = stepFire(this.fireState, alive && this.keys.fire.isDown, dt, WEAPON.fireInterval);
    this.fireState = shot.state;
    if (shot.fire) this.fireVolley();
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
    this.shield = tickShield(this.shield, dt);
    const { x: sx, y: sy } = this.player.position;
    this.shieldBubble.update(sx, sy, this.shield);
    this.player.setVisible(
      !isGameOver(this.health) && shipVisible(this.health, PLAYER_HEALTH.flashHz),
    );
    this.hud.update(this.score, this.health.hits, this.health.lives, shieldSeconds(this.shield));
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
   * While the shield is up nothing hurts the ship: enemy shots touching the
   * bubble are absorbed, and enemies or rocks that ram it are destroyed (no points).
   */
  private shieldBlocks(): void {
    const { x, y } = this.player.position;
    const bubble = { x, y, ...SHIELD.hitbox };
    for (const b of this.enemyBullets.active()) {
      if (firstHit(bubble, [this.enemyBullets.hitbox(b)]) >= 0) this.enemyBullets.release(b);
    }
    for (const e of this.enemies.active()) {
      if (firstHit(bubble, [this.enemies.hitbox(e)]) < 0) continue;
      this.explosions.play(e.sprite.x, e.sprite.y);
      this.enemies.destroy(e);
    }
    for (const r of this.asteroids.active()) {
      if (firstHit(bubble, [this.asteroids.hitbox(r)]) < 0) continue;
      this.asteroids.destroy(r);
      this.shatter(r);
    }
  }

  /**
   * An enemy shot, an enemy or an asteroid touching the ship costs one hit.
   * The shot is used up; a crashing enemy is destroyed and a crashing rock
   * shatters (no points either way).
   */
  private resolvePlayerHits(): void {
    if (isGameOver(this.health)) return;
    if (shieldUp(this.shield)) {
      this.shieldBlocks();
      return;
    }
    if (this.health.invulnerable > 0 || this.invincible) return;
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
      this.weaponLevel = 1; // owner rule: power-ups are lost on death
      this.shield = 0;
      this.shieldBubble.reset();
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
      shield: { timeLeft: this.shield, bubbleVisible: this.shieldBubble.visible },
      controls: {
        mode: this.controls.mode,
        legend: this.controls.legend,
        overlay: this.controlsOverlay.read(),
      },
      muted: this.sound.mute,
      cheats: { invincible: this.invincible, used: this.cheated },
      fullscreen: this.scale.isFullscreen,
      gameOver: { ...this.gameOverPanel.read(), armed: this.gameOver?.armed ?? false },
      pickups: this.pickups.active().map((p) => ({ kind: p.kind, x: p.sprite.x, y: p.sprite.y })),
      collected: { ...this.collected },
      weaponLevel: this.weaponLevel,
      asteroids: this.asteroids
        .active()
        .map((r) => ({ size: r.size, x: r.rock.x, y: r.rock.y, hp: r.hp })),
      shots: this.bullets.active().length,
      shotDamage: this.bullets.active().map((b) => b.damage),
      explosions: this.explosions.activeCount(),
      enemyShots: this.enemyBullets.active().map((sh) => ({ x: sh.sprite.x, y: sh.sprite.y })),
      health: { ...this.health, gameOver: isGameOver(this.health) },
      lastHit: this.lastHit,
    };
  }

  /** Spawns a large asteroid at `x`: at the top of the screen, or at `y` if given (tests). */
  /** Sets the seconds of shield left (tests reach the end of a shield quickly). */
  setShield(seconds: number): void {
    this.shield = Math.max(0, seconds);
  }

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

  /** Fires one volley at the current weapon level from the ship (tests; no keyboard timing). */
  fireShot(): boolean {
    return this.fireVolley();
  }

  /** Sets the weapon level directly (tests). */
  setWeaponLevel(level: number): void {
    this.weaponLevel = Math.min(WEAPON_LEVELS.length, Math.max(1, Math.round(level)));
  }

  /** One trigger pull: every shot of the current weapon level. False if the pool ran out. */
  private fireVolley(): boolean {
    const level = WEAPON_LEVELS[this.weaponLevel - 1];
    if (!level) return false;
    const { x, y } = this.player.position;
    let all = true;
    for (const shot of volley(level, x, y + WEAPON.muzzleOffsetY)) {
      all = this.bullets.fire(shot, level.sprite, level.hitbox) && all;
    }
    return all;
  }

  /** Leaves the ship one hit from losing a life (tests); on its last life unless `lives` is given. */
  oneHitLeft(lives = 1): void {
    this.health = { hits: PLAYER_HEALTH.hitsPerLife - 1, lives, invulnerable: 0 };
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
        if (this.enemies.hit(enemy, shot.damage)) {
          this.explosions.play(x, y);
          this.score += ENEMY_TYPES[enemy.kind].points;
          this.maybeDrop(x, y);
        }
        continue;
      }
      const rock = touching(box, this.asteroids.active(), (r) => this.asteroids.hitbox(r));
      if (rock) {
        this.bullets.release(shot);
        if (this.asteroids.hit(rock, shot.damage)) {
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
      if (p.kind === 'shield') this.shield = collectShield(this.shield, SHIELD);
      if (p.kind === 'weapon') this.weaponLevel = levelUp(this.weaponLevel, WEAPON_LEVELS.length);
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

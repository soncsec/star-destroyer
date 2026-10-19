import Phaser from 'phaser';
import {
  ASTEROIDS,
  BOSS_DEFEAT,
  CHEATS,
  CONTROLS,
  DEFAULT_SEED,
  DEPTH,
  GAME_OVER,
  HIT_SPARK,
  HIGH_SCORE,
  LEVEL_COMPLETE,
  VICTORY,
  ENEMY_FIRE,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_HEALTH,
  SCREEN_CLEAR,
  SHIELD,
  WEAPON,
  WEAPON_LEVELS,
  type LevelBossKind,
  type SfxName,
  type EnemyKind,
} from '../config/tuning';
import { Asteroids, type RockSize, type RockSlot } from '../entities/Asteroids';
import { Sfx } from '../audio/Sfx';
import { Boss, type BossFight } from '../entities/Boss';
import { FinalBoss } from '../entities/FinalBoss';
import { Bullets } from '../entities/Bullets';
import { ControlsOverlay } from '../entities/ControlsOverlay';
import { EnemyBullets } from '../entities/EnemyBullets';
import { Enemies } from '../entities/Enemies';
import { Explosions } from '../entities/Explosions';
import { GameOverPanel } from '../entities/GameOverPanel';
import { LevelCompletePanel, type LevelCompleteInfo } from '../entities/LevelCompletePanel';
import { TouchMenu } from '../entities/TouchMenu';
import { VictoryPanel } from '../entities/VictoryPanel';
import type { Drag } from '../logic/touch';
import type { TouchAction } from '../logic/touchMenu';
import { isTouchDevice } from '../platform/touch';
import { Hud } from '../entities/Hud';
import { Pickups } from '../entities/Pickups';
import { ShieldBubble } from '../entities/ShieldBubble';
import { Player } from '../entities/Player';
import { typeLetter, type Cheat } from '../logic/cheats';
import { requestedLevel } from '../logic/levelSkip';
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
import {
  continueStart,
  panelShown,
  startGameOver,
  stepGameOver,
  type GameOverState,
} from '../logic/gameOver';
import { LEVELS } from '../levels';
import { levelDifficulty } from '../levels/difficulty';
import type { BackgroundProp, Level } from '../levels/types';
import { driftY } from '../logic/backdrop';
import type { Difficulty } from '../logic/difficulty';
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
import {
  panelShown as flowPanelShown,
  startFlow,
  stepFlow,
  type FlowRules,
  type FlowState,
} from '../logic/levelFlow';
import { isNewHighScore, loadHighScore, saveHighScore } from '../logic/highScore';
import { createRng, type Rng } from '../logic/rng';
import { browserStore } from '../platform/storage';
import { screenClear } from '../logic/screenClear';
import {
  collectPowerUp,
  killCanDrop,
  loseLife,
  startPowerUps,
  type KillCause,
  type PowerUps,
} from '../logic/powerups';
import { shieldSeconds, shieldUp, tickShield } from '../logic/shield';
import { startWaves, stepWaves, type WaveRunner } from '../logic/waves';
import { stepFire, type FireState } from '../logic/weapon';
import { volley } from '../logic/weaponLevels';

/** Read-only view of the game state, used by the e2e test hook. */
/** What can cost the ship a hit. */
export type HitCause = 'shot' | 'enemy' | 'rock' | 'boss' | 'beam';

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
  /** The level being played. */
  level: { number: number; name: string };
  /** That level's difficulty numbers. */
  difficulty: Difficulty;
  asteroids: { size: RockSize; x: number; y: number; hp: number }[];
  /** What the HUD shows. */
  hud: { score: string; lives: string; pips: boolean[]; shield: string };
  /** Seconds of shield left, and whether the bubble is drawn this frame. */
  shield: { timeLeft: number; bubbleVisible: boolean };
  /** Pause / quit / legend state and what the overlay shows; mute and full screen. */
  controls: { mode: string; legend: boolean; overlay: ReturnType<ControlsOverlay['read']> };
  muted: boolean;
  /** Touch play: whether it's in use, a drag in progress, and the buttons on screen. */
  touch: { used: boolean; dragging: boolean; buttons: ReturnType<TouchMenu['read']> };
  /** Sounds (M7.3): whether they are ready, and how often each has played this level. */
  sfx: { ready: boolean; played: Record<SfxName, number> };
  /** The best score so far, and whether this run set it (M7.2). */
  highScore: { best: number; isNew: boolean };
  /** Test hook only; the game itself never shows these. */
  cheats: { invincible: boolean; used: boolean };
  fullscreen: boolean;
  /** Pickups drifting down, and how many of each kind the ship has collected. */
  pickups: { kind: PowerUpKind; x: number; y: number }[];
  collected: Record<PowerUpKind, number>;
  weaponLevel: number;
  /** The game-over panel, and whether a fresh key press will now restart. */
  gameOver: ReturnType<GameOverPanel['read']> & { armed: boolean };
  shots: number;
  /** Damage of each player shot in flight. */
  shotDamage: number[];
  explosions: number;
  /** How many hit sparks have been shown this game. */
  sparks: number;
  /** How many big blasts (screen clear, boss defeat) have played this game. */
  blasts: number;
  /** The boss, once it has appeared (null before). */
  boss: ReturnType<Boss['read']>;
  /** Where the level is (waves, boss, complete) and the level-complete panel. */
  flow: {
    stage: FlowState['stage'];
    /** Seconds of game time in this stage. */
    t: number;
    panel: ReturnType<LevelCompletePanel['read']>;
    victory: ReturnType<VictoryPanel['read']>;
  };
  /** Enemy shots in flight. */
  enemyShots: { x: number; y: number }[];
  health: Health & { gameOver: boolean };
  /** The result of the most recent hit, for tests and (later) the HUD. */
  lastHit: HitResult | null;
  /** What caused the last hit on the ship. */
  lastHitBy: HitCause | null;
}

type Keys = Record<
  'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'fire' | 'enter',
  Phaser.Input.Keyboard.Key
>;

export class GameScene extends Phaser.Scene {
  /** The level being played (M4.1). */
  private level!: Level;
  /** That level's fire rates, shot speed and drop rates (M4.2). */
  private difficulty!: Difficulty;
  /** The level's scrolling background layers, furthest back first. */
  private backdrop: { sprite: Phaser.GameObjects.TileSprite; scrollSpeed: number }[] = [];
  /** The level's drifting planets and the like (M5.4). */
  private props: { sprite: Phaser.GameObjects.Image; prop: BackgroundProp }[] = [];
  private player!: Player;
  private bullets!: Bullets;
  private fireState: FireState = { cooldown: 0 };
  /** Current weapon level, 1 to WEAPON_LEVELS.length (owner rules: no time-out, reset on death). */
  /** Weapon level and shield time (M3.2, M3.3); all lost on death. */
  private powerUps: PowerUps = startPowerUps();
  private shieldBubble!: ShieldBubble;
  private enemies!: Enemies;
  private enemyBullets!: EnemyBullets;
  private asteroids!: Asteroids;
  private explosions!: Explosions;
  /** Hit sparks where shots land (M3.5). */
  private sparks!: Explosions;
  /** The screen clear's big blast (one at a time). */
  private blast!: Explosions;
  private hud!: Hud;
  private pickups!: Pickups;
  /** Power-ups collected this game, by kind (their effects arrive in M3.2–M3.4). */
  private collected: Record<PowerUpKind, number> = { weapon: 0, shield: 0, clear: 0 };
  /** The level's boss, once it has appeared (M4.3). */
  /** The boss being fought: `normalBoss` (one ship or a twin) or `finalBoss`. */
  private boss!: BossFight;
  private normalBoss!: Boss;
  private finalBoss!: FinalBoss;
  /** Which level to play and what carried over (set by `init`). */
  private start: GameStart = {};
  /** Waves, boss, level complete (M4.4). */
  private flow: FlowState = startFlow();
  private levelPanel!: LevelCompletePanel;
  private victoryPanel!: VictoryPanel;
  /** Seconds until the next victory firework. */
  private fireworks = 0;
  private sfx!: Sfx;
  /** Touchscreen play (owner request 2026-10-18): the buttons, and the drag in progress. */
  private touchMenu!: TouchMenu;
  /** The screen has been touched (or this is a phone or tablet): show the touch buttons. */
  private touchUsed = false;
  private drag: Drag | null = null;
  private finger = { x: 0, y: 0 };
  /** The beam's last mode, to sound its warning and its firing as they start. */
  private lastBeam: string | undefined;
  /** The level-complete jingle has played for this level. */
  private completeSounded = false;
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
  /** The best score so far (M7.2), and whether this run has set a new one. */
  private highScore = { best: 0, isNew: false };
  /** The run's score has been checked against the high score (once, at its end). */
  private scoreRecorded = false;
  private rng!: Rng;
  private waves: WaveRunner = startWaves();
  private score = 0;
  private spawning = true;
  private health: Health = newHealth(PLAYER_HEALTH);
  private lastHit: HitResult | null = null;
  private lastHitBy: HitCause | null = null;
  private keys!: Keys;

  constructor() {
    super('Game');
  }

  /** Which level to play, and what carries over from the last one (M4.4). */
  init(data: GameStart): void {
    this.start = data;
    // ?level=n (M7.9): the play-test skip, whenever nothing else chose the level.
    // A restart after game over passes no level, so it comes back to the same one.
    if (data.level === undefined) {
      const level = requestedLevel(window.location.search, LEVELS.length);
      if (level !== null) this.start = { ...data, level, skipped: true };
    }
  }

  create(): void {
    const level = LEVELS[(this.start.level ?? 1) - 1];
    if (!level) throw new Error(`no level ${this.start.level}`);
    this.level = level;
    const carry = this.start.carry;
    this.difficulty = levelDifficulty(level.number);
    this.backdrop = level.background.map((layer) => ({
      sprite: this.add
        .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, layer.texture)
        .setOrigin(0)
        .setAlpha(layer.alpha)
        .setTint(layer.tint ?? 0xffffff)
        .setTileScale(layer.scale ?? 1),
      scrollSpeed: layer.scrollSpeed,
    }));
    this.props = (level.props ?? []).map((prop) => ({
      sprite: this.add.image(prop.x * GAME_WIDTH, prop.y, prop.texture).setDepth(DEPTH.background),
      prop,
    }));
    // Each level gets its own repeatable random sequence.
    this.rng = createRng(seedFromUrl() + level.number - 1);
    this.flow = startFlow();
    this.waves = startWaves();
    this.score = carry?.score ?? 0;
    this.spawning = true;
    this.health = carry
      ? { ...newHealth(PLAYER_HEALTH), hits: carry.hits, lives: carry.lives }
      : newHealth(PLAYER_HEALTH);
    this.lastHit = null;
    this.lastHitBy = null;
    this.asteroids = new Asteroids(this);
    this.enemies = new Enemies(this);
    this.enemyBullets = new EnemyBullets(this);
    this.bullets = new Bullets(this);
    this.player = new Player(this);
    this.explosions = new Explosions(this);
    this.sparks = new Explosions(this, HIT_SPARK.sprite, HIT_SPARK.poolSize, DEPTH.sparks);
    this.blast = new Explosions(this, SCREEN_CLEAR.blast, 1, DEPTH.blast);
    this.hud = new Hud(this, PLAYER_HEALTH.hitsPerLife);
    this.pickups = new Pickups(this);
    this.collected = { weapon: 0, shield: 0, clear: 0 };
    // The weapon carries into the next level; a shield doesn't.
    this.powerUps = { ...startPowerUps(), weaponLevel: carry?.weaponLevel ?? 1 };
    this.shieldBubble = new ShieldBubble(this);
    this.normalBoss = new Boss(this);
    this.finalBoss = new FinalBoss(this);
    this.boss = this.normalBoss;
    this.dropChance = null;
    this.gameOverPanel = new GameOverPanel(this);
    this.levelPanel = new LevelCompletePanel(this);
    this.victoryPanel = new VictoryPanel(this);
    this.sfx = new Sfx(this);
    this.lastBeam = undefined;
    this.completeSounded = false;
    this.fireworks = 0;
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
    // One-shot keys (restart, pause, quit, legend, full screen, mute) are read
    // from the browser's own keydown: it fires exactly once per press, while
    // Phaser's key events can occasionally deliver the same press twice, which
    // flips a toggle straight back. Auto-repeat is ignored. Movement and fire
    // still use Phaser's held-key state.
    this.restartPressed = false;
    // The controls legend shows at the start of a game, not at each new level.
    this.controls = startControls(!carry);
    this.introLegend = carry ? -1 : 0;
    this.controlsOverlay = new ControlsOverlay(this);
    this.touchMenu = new TouchMenu(this);
    this.touchUsed = isTouchDevice();
    this.drag = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.onTouchDown({ x: p.x, y: p.y });
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch && this.drag) this.finger = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.wasTouch) this.drag = null;
    });
    const actions: Record<string, () => void> = {
      Space: () => (this.restartPressed = true),
      Enter: () => (this.restartPressed = true),
      NumpadEnter: () => (this.restartPressed = true),
      KeyP: () => this.onControl('pause'),
      Escape: () => this.onControl('escape'),
      KeyQ: () => this.onControl('quit'),
      KeyY: () => this.onControl('yes'),
      KeyN: () => this.onControl('no'),
      KeyH: () => this.onControl('help'),
      KeyF: () => this.scale.toggleFullscreen(),
      KeyM: () => {
        this.sound.mute = !this.sound.mute;
      },
    };
    const onKey = (e: KeyboardEvent): void => {
      if (!e.repeat) actions[e.code]?.();
    };
    window.addEventListener('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      window.removeEventListener('keydown', onKey),
    );

    // Hidden cheats: secret words typed during play.
    this.cheatBuffer = '';
    this.invincible = carry?.invincible ?? false;
    this.cheated = (carry?.cheated ?? false) || (this.start.skipped ?? false);
    this.highScore = { best: loadHighScore(browserStore(), HIGH_SCORE.storageKey), isNew: false };
    this.scoreRecorded = false;
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
  /**
   * A finger touches the screen: a button if it's on one; otherwise it starts
   * steering (and firing), and counts as a press for the panels ("tap to
   * continue").
   */
  private onTouchDown(point: { x: number; y: number }): void {
    this.touchUsed = true;
    const button = this.touchMenu.at(point);
    if (button) {
      this.onTouchButton(button.action);
      return;
    }
    if (!running(this.controls)) return;
    this.restartPressed = true;
    this.finger = point;
    this.drag = { finger: point, ship: { x: this.player.position.x, y: this.player.position.y } };
  }

  /** The touch buttons do what the keys do. */
  private onTouchButton(action: TouchAction): void {
    this.drag = null;
    const keys: Partial<Record<TouchAction, ControlKey>> = {
      pause: 'pause',
      resume: 'pause',
      quit: 'quit',
      yes: 'yes',
      no: 'no',
    };
    const key = keys[action];
    if (key) this.onControl(key);
    else if (action === 'mute') this.sound.mute = !this.sound.mute;
    else this.scale.toggleFullscreen();
    this.touchMenu.show(this.touchUsed, this.controls.mode, {
      gameOver: isGameOver(this.health),
      muted: this.sound.mute,
    });
  }

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
    // Redraw at once, so the screen never shows a different state from the game's.
    this.controlsOverlay.show(this.controls, this.touchUsed);
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
    this.controlsOverlay.show(this.controls, this.touchUsed);
    this.touchMenu.show(this.touchUsed, this.controls.mode, {
      gameOver: isGameOver(this.health),
      muted: this.sound.mute,
    });
    if (!running(this.controls)) {
      // Paused or asking to quit: the world stands still.
      this.restartPressed = false;
      return;
    }
    // Moving the texture down makes the ship appear to fly up.
    for (const layer of this.backdrop) layer.sprite.tilePositionY -= layer.scrollSpeed * dt;
    for (const { sprite, prop } of this.props) {
      sprite.y = driftY(sprite.y, prop.scrollSpeed * dt, sprite.height, GAME_HEIGHT, prop.gap);
    }
    const alive = !isGameOver(this.health);
    if (alive) {
      if (this.drag) this.player.updateTouch(this.drag, this.finger, dt);
      else this.player.update(this.readAxis(), dt);
    }

    // A finger on the screen fires, as holding Space does.
    const firing = alive && (this.keys.fire.isDown || this.drag !== null);
    const shot = stepFire(this.fireState, firing, dt, this.gun().fireInterval);
    this.fireState = shot.state;
    if (shot.fire) this.fireVolley();
    this.bullets.update(dt);

    if (this.spawning && !this.gameOver && this.flow.stage === 'waves') {
      // The wave script plays once (an endless gap means it never loops).
      const step = stepWaves(this.waves, this.level.waves, dt, Infinity);
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
    for (const volley of this.boss.update(dt, this.player.position)) {
      for (const v of volley.shots) this.enemyBullets.fire(volley.from.x, volley.from.y, v);
    }
    // The final boss's beam sounds as it starts to charge, and again as it fires.
    const beam = this.boss.read()?.beam;
    if (beam !== this.lastBeam) {
      if (beam === 'warning') this.sfx.play('beamWarn');
      if (beam === 'firing') this.sfx.play('beam');
      this.lastBeam = beam;
    }
    this.enemyBullets.update(dt);
    this.resolveShotHits();

    this.health = tickHealth(this.health, dt);
    this.resolvePlayerHits();
    this.collectPickups();
    this.powerUps.shield = tickShield(this.powerUps.shield, dt);
    const { x: sx, y: sy } = this.player.position;
    this.shieldBubble.update(sx, sy, this.powerUps.shield);
    this.player.setVisible(
      !isGameOver(this.health) && shipVisible(this.health, PLAYER_HEALTH.flashHz),
    );
    this.hud.update(
      this.score,
      this.health.hits,
      this.health.lives,
      shieldSeconds(this.powerUps.shield),
    );
    const pressed = this.restartPressed;
    this.restartPressed = false;
    this.updateFlow(dt, pressed);
    this.updateGameOver(dt, pressed);
  }

  /** After the last life: show the panel, then restart on a fresh Space or Enter press. */
  /**
   * Waves, then the boss, then the level-complete panel and the next level
   * (M4.4). Stops while the game is over.
   */
  private updateFlow(dt: number, pressed: boolean): void {
    if (this.gameOver) return;
    const held = this.keys.fire.isDown || this.keys.enter.isDown || this.drag !== null;
    const step = stepFlow(
      this.flow,
      dt,
      {
        wavesDone: this.spawning && this.waves.next >= this.level.waves.length,
        bossDefeated: this.boss.read()?.mode === 'defeated',
        key: { held, pressed },
      },
      this.flowRules(),
    );
    this.flow = step.state;
    if (step.startBoss) this.spawnBoss(this.level.boss);
    if (flowPanelShown(this.flow, this.flowRules())) {
      const t = this.flow.t - LEVEL_COMPLETE.completeAfter;
      if (!this.completeSounded) {
        this.completeSounded = true;
        this.sfx.play(this.isLastLevel() ? 'victory' : 'levelComplete');
      }
      if (this.isLastLevel()) this.celebrate(dt, t);
      else this.levelPanel.show(this.levelInfo(), t);
    }
    if (step.next) this.goToNextLevel();
  }

  private isLastLevel(): boolean {
    return LEVELS[this.level.number] === undefined;
  }

  /** After the last level the victory screen waits for the player (M6.6); others move on by themselves. */
  private flowRules(): FlowRules {
    return {
      ...LEVEL_COMPLETE,
      bossAfter: this.level.bossAfter,
      autoNext: this.isLastLevel() ? Infinity : LEVEL_COMPLETE.autoNext,
    };
  }

  /**
   * At the end of a run (game over or victory), once: a higher score without
   * cheats becomes the new high score and is saved (M7.2).
   */
  private recordScore(): void {
    if (this.scoreRecorded) return;
    this.scoreRecorded = true;
    if (!isNewHighScore(this.score, this.highScore.best, this.cheated)) return;
    this.highScore = { best: this.score, isNew: true };
    saveHighScore(browserStore(), HIGH_SCORE.storageKey, this.score);
  }

  /** The victory screen, with fireworks going off behind it. */
  private celebrate(dt: number, t: number): void {
    this.recordScore();
    this.victoryPanel.show(
      { score: this.score, lives: this.health.lives, high: this.highScore },
      t,
    );
    this.fireworks -= dt;
    if (this.fireworks > 0) return;
    this.fireworks += VICTORY.fireworksEvery;
    const { min, max } = VICTORY.fireworksY;
    this.explosions.play(this.rng.range(0, GAME_WIDTH), this.rng.range(min, max));
  }

  /** The finished level and the one after it, for the panel. */
  private levelInfo(): LevelCompleteInfo {
    const next = LEVELS[this.level.number];
    return {
      number: this.level.number,
      name: this.level.name,
      score: this.score,
      next: next ? { number: next.number, name: next.name } : null,
    };
  }

  /** On to the next level, carrying score, lives, health and weapon; or, after the last, a new game. */
  private goToNextLevel(): void {
    const next = LEVELS[this.level.number];
    if (!next) {
      // A new game always starts at level 1, even if ?level=n (M7.9) chose this run's start.
      this.scene.restart({ level: 1 });
      return;
    }
    const start: GameStart = {
      level: next.number,
      carry: {
        score: this.score,
        lives: this.health.lives,
        hits: this.health.hits,
        weaponLevel: this.powerUps.weaponLevel,
        cheated: this.cheated,
        invincible: this.invincible,
      },
    };
    this.scene.restart(start);
  }

  private updateGameOver(dt: number, pressed: boolean): void {
    if (!this.gameOver) {
      if (isGameOver(this.health)) {
        this.gameOver = startGameOver();
        this.recordScore();
        this.sfx.play('gameOver');
      }
      return;
    }
    const held = this.keys.fire.isDown || this.keys.enter.isDown || this.drag !== null;
    const step = stepGameOver(this.gameOver, dt, { held, pressed }, GAME_OVER);
    this.gameOver = step.state;
    const shown = panelShown(this.gameOver, GAME_OVER);
    const level = this.level.number;
    this.gameOverPanel.show(
      shown,
      this.score,
      level,
      this.gameOver.t - GAME_OVER.showAfter,
      this.highScore,
    );
    // A continue (M7.10): this level again, fresh lives, score 0.
    if (step.restart) this.scene.restart(continueStart(level, this.cheated, PLAYER_HEALTH));
  }

  /** Each enemy on screen shoots on its own timer, aimed (within limits) at the ship. */
  private enemiesFire(dt: number): void {
    const next = (): number => nextShotDelay(this.rng, this.difficulty.fire);
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
        aimDown(from, target, this.difficulty.shotSpeed, ENEMY_FIRE.maxAimAngleDeg),
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
      if (firstHit(bubble, [this.enemyBullets.hitbox(b)]) < 0) continue;
      this.sparks.play(b.sprite.x, b.sprite.y);
      this.enemyBullets.release(b);
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
    if (shieldUp(this.powerUps.shield)) {
      this.shieldBlocks();
      return;
    }
    if (this.health.invulnerable > 0 || this.invincible) return;
    const ship = this.player.hitbox();
    const shot = touching(ship, this.enemyBullets.active(), (b) => this.enemyBullets.hitbox(b));
    const enemy = touching(ship, this.enemies.active(), (e) => this.enemies.hitbox(e));
    const rock = touching(ship, this.asteroids.active(), (r) => this.asteroids.hitbox(r));
    // Flying into the boss, or its beam, costs a hit; the boss itself is unharmed.
    const beam = this.boss.beam();
    const inBeam = beam !== null && firstHit(ship, [beam]) >= 0;
    const rammedBoss = this.boss.touching(ship) >= 0;
    const cause: HitCause | null = shot
      ? 'shot'
      : enemy
        ? 'enemy'
        : rock
          ? 'rock'
          : inBeam
            ? 'beam'
            : rammedBoss
              ? 'boss'
              : null;
    if (!cause) return;

    const { health, result } = takeHit(this.health, PLAYER_HEALTH);
    this.sfx.play('hurt');
    this.health = health;
    this.lastHit = result;
    this.lastHitBy = cause;
    if (shot) {
      this.sparks.play(shot.sprite.x, shot.sprite.y);
      this.enemyBullets.release(shot);
    }
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
      this.powerUps = loseLife();
      this.shieldBubble.reset();
      if (result === 'lifeLost') {
        this.player.reset();
        // Steer on from the restart point, not from where the ship was lost.
        if (this.drag) this.drag = { finger: this.finger, ship: { ...this.player.position } };
      }
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
      level: { number: this.level.number, name: this.level.name },
      difficulty: this.difficulty,
      hud: this.hud.read(),
      shield: { timeLeft: this.powerUps.shield, bubbleVisible: this.shieldBubble.visible },
      controls: {
        mode: this.controls.mode,
        legend: this.controls.legend,
        overlay: this.controlsOverlay.read(),
      },
      muted: this.sound.mute,
      cheats: { invincible: this.invincible, used: this.cheated },
      highScore: { ...this.highScore },
      sfx: { ready: this.sfx.ready, played: this.sfx.counts() },
      touch: { used: this.touchUsed, dragging: this.drag !== null, buttons: this.touchMenu.read() },
      fullscreen: this.scale.isFullscreen,
      gameOver: { ...this.gameOverPanel.read(), armed: this.gameOver?.armed ?? false },
      pickups: this.pickups.active().map((p) => ({ kind: p.kind, x: p.sprite.x, y: p.sprite.y })),
      collected: { ...this.collected },
      weaponLevel: this.powerUps.weaponLevel,
      asteroids: this.asteroids
        .active()
        .map((r) => ({ size: r.size, x: r.rock.x, y: r.rock.y, hp: r.hp })),
      shots: this.bullets.active().length,
      shotDamage: this.bullets.active().map((b) => b.damage),
      explosions: this.explosions.activeCount(),
      sparks: this.sparks.playedCount(),
      blasts: this.blast.playedCount(),
      boss: this.boss.read(),
      flow: {
        stage: this.flow.stage,
        t: this.flow.t,
        panel: this.levelPanel.read(),
        victory: this.victoryPanel.read(),
      },
      enemyShots: this.enemyBullets.active().map((sh) => ({ x: sh.sprite.x, y: sh.sprite.y })),
      health: { ...this.health, gameOver: isGameOver(this.health) },
      lastHit: this.lastHit,
      lastHitBy: this.lastHitBy,
    };
  }

  /** Sets the seconds of shield left (tests reach the end of a shield quickly). */
  setShield(seconds: number): void {
    this.powerUps.shield = Math.max(0, seconds);
  }

  /** Overrides the drop chance (tests: 1 = every kill drops); null restores the tuning. */
  setDropChance(chance: number | null): void {
    this.dropChance = chance;
  }

  /** Drops a pickup of `kind` at (x, y) (tests). */
  spawnPickup(kind: PowerUpKind, x: number, y: number): boolean {
    return this.pickups.spawn(kind, x, y);
  }

  /** Spawns a large asteroid at `x`: at the top of the screen, or at `y` if given (tests). */
  spawnAsteroid(x: number, y?: number): boolean {
    return this.asteroids.spawnLarge(x, this.rng, y);
  }

  /** Fires one volley at the current weapon level from the ship (tests; no keyboard timing). */
  fireShot(): boolean {
    return this.fireVolley();
  }

  /** Sets the weapon level directly (tests). */
  setWeaponLevel(level: number): void {
    this.powerUps.weaponLevel = Math.min(WEAPON_LEVELS.length, Math.max(1, Math.round(level)));
  }

  /** The current weapon level's settings. */
  private gun(): (typeof WEAPON_LEVELS)[number] {
    const level = WEAPON_LEVELS[this.powerUps.weaponLevel - 1];
    if (!level) throw new Error(`no weapon level ${this.powerUps.weaponLevel}`);
    return level;
  }

  /** One trigger pull: every shot of the current weapon level. False if the pool ran out. */
  private fireVolley(): boolean {
    const level = this.gun();
    const { x, y } = this.player.position;
    let all = true;
    let any = false;
    for (const shot of volley(level, x, y + WEAPON.muzzleOffsetY)) {
      const fired = this.bullets.fire(shot, level.sprite, level.hitbox, level.scale);
      any ||= fired;
      all &&= fired;
    }
    if (any) this.sfx.play('shot');
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

  /** Removes enemy shots in flight, leaving enemies and the boss (tests). */
  clearEnemyShots(): void {
    this.enemyBullets.clear();
  }

  /** Removes all enemies and, unless `keepShots`, their shots (tests use this for a clean screen). */
  clearEnemies(keepShots = false): void {
    this.enemies.clear();
    this.normalBoss.clear();
    this.finalBoss.clear();
    this.asteroids.clear();
    this.pickups.clear();
    if (!keepShots) this.enemyBullets.clear();
  }

  /**
   * Damages the boss by `amount` (tests): its first ship that can be hit, and
   * any damage left over goes on to the next (a twin).
   */
  hurtBoss(amount: number): void {
    let left = amount;
    for (let i = this.boss.firstFighting(); i >= 0 && left > 0; i = this.boss.firstFighting()) {
      const hp = this.boss.hpOf(i);
      this.hurtBossShip(i, Math.min(left, hp));
      left -= hp;
    }
  }

  /** Damages one ship of the boss; each ship explodes and scores when defeated. */
  private hurtBossShip(index: number, amount: number): void {
    const defeated = this.boss.hit(index, amount);
    if (defeated) this.bossDefeated(defeated.at.x, defeated.at.y, defeated.points);
  }

  /** Ends the level's waves at once, so the boss comes after the usual pause (tests). */
  skipWaves(): void {
    this.waves = { ...this.waves, next: this.level.waves.length };
  }

  /** Brings in a boss: `kind`, or the level's own boss (tests, until M4.4 does it at the level's end). */
  spawnBoss(kind: LevelBossKind = this.level.boss): void {
    this.normalBoss.clear();
    this.finalBoss.clear();
    if (kind === 'final-boss') {
      this.finalBoss.spawn();
      this.boss = this.finalBoss;
    } else {
      this.normalBoss.spawn(kind);
      this.boss = this.normalBoss;
    }
  }

  /**
   * Spawns one enemy of `kind` (default grunt) at `x`: at the top of the
   * screen, or at `y` if given. Its first shot comes after a random delay, or
   * `firstShot` seconds on screen (tests).
   */
  spawnEnemy(x: number, y?: number, firstShot?: number, kind: EnemyKind = 'grunt'): boolean {
    return this.enemies.spawn(
      kind,
      x,
      firstShot ?? firstShotDelay(this.rng, this.difficulty.fire),
      y,
    );
  }

  /**
   * Each shot hits at most one target and is used up: the boss if it touches
   * it, otherwise an enemy, otherwise an asteroid.
   */
  private resolveShotHits(): void {
    for (const shot of this.bullets.active()) {
      const box = this.bullets.hitbox(shot);
      // The spark shows at the shot's nose, where it struck.
      const tip = { x: box.x, y: box.y - box.h / 2 };
      const bossShip = this.boss.touching(box);
      if (bossShip >= 0) {
        this.sparks.play(tip.x, tip.y);
        this.bullets.release(shot);
        this.hurtBossShip(bossShip, shot.damage);
        continue;
      }
      const enemy = touching(box, this.enemies.active(), (e) => this.enemies.hitbox(e));
      if (enemy) {
        this.sparks.play(tip.x, tip.y);
        this.bullets.release(shot);
        const { x, y } = enemy.sprite;
        if (this.enemies.hit(enemy, shot.damage)) {
          this.explosions.play(x, y);
          this.sfx.play('enemyDown');
          this.score += ENEMY_TYPES[enemy.kind].points;
          this.maybeDrop(x, y, 'shot');
        }
        continue;
      }
      const rock = touching(box, this.asteroids.active(), (r) => this.asteroids.hitbox(r));
      if (rock) {
        this.sparks.play(tip.x, tip.y);
        this.bullets.release(shot);
        if (this.asteroids.hit(rock, shot.damage)) {
          this.score += ASTEROIDS[rock.size].points;
          if (rock.size === 'large') this.maybeDrop(rock.rock.x, rock.rock.y, 'shot');
          this.shatter(rock);
        }
      }
    }
  }

  /**
   * A kill may drop a power-up where it happened: only one shot down (seeded;
   * never a screen clear in a boss fight).
   */
  private maybeDrop(x: number, y: number, cause: KillCause): void {
    if (!killCanDrop(cause)) return;
    const base = this.difficulty.drops;
    const rules = { ...base, chance: this.dropChance ?? base.chance };
    const kind = rollDrop(this.rng, rules, { bossFight: this.boss.active });
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
      const got = collectPowerUp(this.powerUps, p.kind, {
        maxWeaponLevel: WEAPON_LEVELS.length,
        shield: SHIELD,
      });
      this.powerUps = got.powerUps;
      this.sfx.play(
        p.kind === 'weapon' ? 'weaponUp' : p.kind === 'shield' ? 'shieldUp' : 'screenClear',
      );
      if (got.clearScreen) this.clearScreen();
    }
  }

  /**
   * Screen clear: every enemy on screen explodes and scores, and every enemy
   * shot vanishes, under one big blast at the ship and a white flash. Its kills
   * drop nothing, so one clear can't set off another.
   */
  private clearScreen(): void {
    const targets = this.enemies.active();
    const result = screenClear(
      targets.map((e) => ({ box: this.enemies.hitbox(e), points: ENEMY_TYPES[e.kind].points })),
      GAME_WIDTH,
      GAME_HEIGHT,
    );
    for (const i of result.destroyed) {
      const enemy = targets[i];
      if (!enemy) continue;
      this.explosions.play(enemy.sprite.x, enemy.sprite.y);
      this.enemies.destroy(enemy);
    }
    this.score += result.points;
    this.enemyBullets.clear();
    const { x, y } = this.player.position;
    this.blast.play(x, y);
    this.cameras.main.flash(SCREEN_CLEAR.flashMs);
  }

  /** The boss goes up in a big blast with explosions around it, and scores its points. */
  private bossDefeated(x: number, y: number, points: number): void {
    this.score += points;
    this.sfx.play('bossDown');
    this.blast.play(x, y);
    for (const [dx, dy] of BOSS_DEFEAT.bursts) this.explosions.play(x + dx, y + dy);
  }

  /** A destroyed or crashed rock explodes; a large one splits into small pieces. */
  private shatter(rock: RockSlot): void {
    this.explosions.play(rock.rock.x, rock.rock.y);
    this.sfx.play('enemyDown');
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

/** What the scene starts with: a level (default 1) and, after level 1, what carried over. */
export interface GameStart {
  level?: number;
  /** True when `?level=n` chose the level (M7.9): the run counts as cheated. */
  skipped?: boolean;
  carry?: {
    score: number;
    lives: number;
    hits: number;
    weaponLevel: number;
    cheated: boolean;
    invincible: boolean;
  };
}

/** The first item whose hitbox overlaps `box`, if any. */
function touching<T>(box: Box, items: readonly T[], hitbox: (item: T) => Box): T | undefined {
  return items[firstHit(box, items.map(hitbox))];
}

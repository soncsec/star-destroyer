import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import {
  BOSSES,
  DEPTH,
  GAME_WIDTH,
  HUD,
  type BossKind,
  type LevelBossKind,
} from '../config/tuning';
import {
  bossLineup,
  bossTotalHp,
  damageBoss,
  startBoss,
  stepBossGroup,
  type BossSlot,
  type BossState,
  type BossVolley,
} from '../logic/boss';
import { firstHit, type Box } from '../logic/collision';
import type { Vec } from '../logic/enemyFire';

/** One ship (or part) of a boss, for the e2e test hook. */
export interface BossShipView {
  mode: BossState['mode'];
  hp: number;
  phase: number;
  x: number;
  y: number;
}

/**
 * The boss on screen, for the e2e test hook: the boss as a whole (health
 * summed; mode 'defeated' once it is beaten), plus each ship or part.
 */
export interface BossView {
  kind: LevelBossKind;
  mode: BossState['mode'];
  hp: number;
  phase: number;
  x: number;
  y: number;
  bar: number;
  barVisible: boolean;
  ships: BossShipView[];
  /** The final boss only: its stage and its beam. */
  stage?: string;
  beam?: string;
}

/** What the game scene needs from a boss: a normal one or twin (`Boss`), or the final boss. */
export interface BossFight {
  readonly active: boolean;
  /** Moves it and returns the shots it fires this step. */
  update(dt: number, target: Vec): BossVolley[];
  /** Which ship or part `box` touches (one that blocks or takes shots now), or -1. */
  touching(box: Box): number;
  /** Index of the first ship or part that can be hurt now, or -1. */
  firstFighting(): number;
  /** Damages ship or part `index`; the points and where it was if that destroyed it. */
  hit(index: number, amount: number): { points: number; at: Vec } | null;
  hpOf(index: number): number;
  /** A beam that hurts the ship, while one fires. */
  beam(): Box | null;
  clear(): void;
  read(): BossView | null;
}

/** Most ships one boss can have (a twin). */
const MAX_SHIPS = 2;

/** One ship of the boss on screen. */
interface Ship {
  state: BossState;
  flash: number;
}

/**
 * The boss on screen (one at a time: one ship, or a twin pair, M6.4) and its
 * health bar, which shows the health of all its ships together. The rules are
 * in logic/boss.ts; this draws them.
 */
export class Boss implements BossFight {
  private readonly sprites: Phaser.GameObjects.Sprite[];
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private kind: BossKind | null = null;
  private slots: BossSlot[] = [];
  private ships: Ship[] = [];

  constructor(scene: Phaser.Scene) {
    this.sprites = Array.from({ length: MAX_SHIPS }, () =>
      scene.add
        .sprite(0, 0, BOSSES['spaceship-unit'].sprite)
        .setDepth(DEPTH.enemies)
        .setActive(false)
        .setVisible(false),
    );
    const bar = HUD.bossBar;
    const left = (GAME_WIDTH - bar.w) / 2;
    this.barBack = scene.add
      .rectangle(left, bar.y, bar.w, bar.h, bar.back)
      .setOrigin(0)
      .setDepth(DEPTH.hud)
      .setVisible(false);
    this.barFill = scene.add
      .rectangle(left, bar.y, bar.w, bar.h, bar.fill)
      .setOrigin(0)
      .setDepth(DEPTH.hud)
      .setVisible(false);
  }

  /** Brings in a boss of `kind` from above the screen. */
  spawn(kind: BossKind): void {
    const rules = BOSSES[kind];
    this.clear();
    this.kind = kind;
    this.slots = bossLineup(rules, GAME_WIDTH / 2);
    this.ships = this.slots.map((slot) => ({
      state: startBoss(rules, slot.centerX, slot.side, slot.delay),
      flash: 0,
    }));
    this.ships.forEach((ship, i) => {
      this.sprite(i)
        .setTexture(rules.sprite)
        .setAngle(rules.angleDeg)
        .setPosition(ship.state.x, ship.state.y)
        .setAlpha(1)
        .setActive(true)
        .setVisible(true)
        .play(animKey(rules.sprite));
    });
    this.drawBar();
  }

  /** True from the moment it appears until every ship is defeated or it is cleared. */
  get active(): boolean {
    return this.ships.some((s) => s.state.mode !== 'defeated');
  }

  /** Moves it and returns the shots its ships fire this step. */
  update(dt: number, target: Vec): BossVolley[] {
    const { kind } = this;
    if (!kind || !this.active) return [];
    const step = stepBossGroup(
      this.ships.map((s) => s.state),
      BOSSES[kind],
      dt,
      target,
      this.slots,
    );
    this.ships.forEach((ship, i) => {
      ship.state = step.parts[i] ?? ship.state;
      ship.flash = Math.max(0, ship.flash - dt);
      this.sprite(i)
        .setPosition(ship.state.x, ship.state.y)
        .setAlpha(ship.flash > 0 ? 0.35 : 1);
    });
    return step.volleys;
  }

  /** Which ship `box` touches (one that can be hit now), or -1. */
  touching(box: Box): number {
    return this.ships.findIndex((_, i) => {
      const ship = this.hitbox(i);
      return ship !== null && firstHit(box, [ship]) >= 0;
    });
  }

  /** Index of the first ship that can be hit now, or -1. */
  firstFighting(): number {
    return this.ships.findIndex((s) => s.state.mode === 'fighting');
  }

  /**
   * Damages ship `index`. Returns the points scored and where it was if this
   * hit defeated it, else null.
   */
  hit(index: number, amount: number): { points: number; at: Vec } | null {
    const { kind } = this;
    const ship = this.ships[index];
    if (!kind || !ship) return null;
    const rules = BOSSES[kind];
    const r = damageBoss(ship.state, rules, amount);
    ship.state = r.state;
    ship.flash = HUD.bossHitFlash;
    this.drawBar();
    if (!r.defeated) return null;
    const at = { x: ship.state.x, y: ship.state.y };
    this.hideShip(index);
    if (!this.active) this.hideBar();
    return { points: rules.points, at };
  }

  /** Health left on ship `index` (0 if there is no such ship). */
  hpOf(index: number): number {
    return this.ships[index]?.state.hp ?? 0;
  }

  /** Normal bosses have no beam. */
  beam(): Box | null {
    return null;
  }

  /** Removes it without a fight (a new game, or tests). */
  clear(): void {
    this.kind = null;
    this.ships = [];
    this.slots = [];
    this.sprites.forEach((_, i) => this.hideShip(i));
    this.hideBar();
  }

  /** What is on screen, for the e2e test hook (mode 'defeated' once every ship is). */
  read(): BossView | null {
    const first = this.ships[0];
    if (!this.kind || !first) return null;
    const ships = this.ships.map(({ state: s }) => ({
      mode: s.mode,
      hp: s.hp,
      phase: s.phase,
      x: s.x,
      y: s.y,
    }));
    const lead = this.ships.find((s) => s.state.mode !== 'defeated') ?? first;
    const mode: BossState['mode'] = !this.active
      ? 'defeated'
      : ships.some((s) => s.mode === 'fighting')
        ? 'fighting'
        : 'entering';
    return {
      kind: this.kind,
      mode,
      hp: ships.reduce((sum, s) => sum + s.hp, 0),
      phase: Math.max(...ships.map((s) => s.phase)),
      x: lead.state.x,
      y: lead.state.y,
      bar: this.barFill.width / HUD.bossBar.w,
      barVisible: this.barFill.visible,
      ships,
    };
  }

  private sprite(index: number): Phaser.GameObjects.Sprite {
    const sprite = this.sprites[index];
    if (!sprite) throw new RangeError(`no boss sprite ${index}`);
    return sprite;
  }

  private hitbox(index: number): Box | null {
    const ship = this.ships[index];
    if (!this.kind || ship?.state.mode !== 'fighting') return null;
    const h = BOSSES[this.kind].hitbox;
    return { x: ship.state.x, y: ship.state.y + h.offsetY, w: h.w, h: h.h };
  }

  private drawBar(): void {
    if (!this.kind || this.ships.length === 0) return;
    const hp = this.ships.reduce((sum, s) => sum + s.state.hp, 0);
    const fill = hp / bossTotalHp(BOSSES[this.kind]);
    this.barBack.setVisible(true);
    this.barFill.setVisible(true).setSize(HUD.bossBar.w * fill, HUD.bossBar.h);
  }

  private hideShip(index: number): void {
    const sprite = this.sprite(index);
    sprite.stop();
    sprite.setActive(false).setVisible(false);
  }

  private hideBar(): void {
    this.barBack.setVisible(false);
    this.barFill.setVisible(false);
  }
}

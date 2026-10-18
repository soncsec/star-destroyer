import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { BOSSES, DEPTH, GAME_WIDTH, HUD, type BossKind } from '../config/tuning';
import { bossHealth, damageBoss, startBoss, stepBoss, type BossState } from '../logic/boss';
import type { Box } from '../logic/collision';
import type { Vec } from '../logic/enemyFire';

/**
 * The boss on screen (one at a time) and its health bar. The rules are in
 * logic/boss.ts; this draws them.
 */
export class Boss {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private kind: BossKind | null = null;
  private state: BossState | null = null;
  private flash = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add
      .sprite(0, 0, BOSSES['spaceship-unit'].sprite)
      .setDepth(DEPTH.enemies)
      .setActive(false)
      .setVisible(false);
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
    this.kind = kind;
    this.state = startBoss(rules, GAME_WIDTH / 2);
    this.flash = 0;
    this.sprite
      .setTexture(rules.sprite)
      .setAngle(rules.angleDeg)
      .setPosition(this.state.x, this.state.y)
      .setAlpha(1)
      .setActive(true)
      .setVisible(true)
      .play(animKey(rules.sprite));
    this.drawBar();
  }

  /** True from the moment it appears until it is defeated or cleared. */
  get active(): boolean {
    return this.state !== null && this.state.mode !== 'defeated';
  }

  /** Moves it and returns any shots it fires this step: where from, and their velocities. */
  update(dt: number, target: Vec): { from: Vec; shots: Vec[] } {
    const { kind, state } = this;
    if (!kind || !state || state.mode === 'defeated') return { from: target, shots: [] };
    const rules = BOSSES[kind];
    const step = stepBoss(state, rules, dt, target, GAME_WIDTH / 2);
    this.state = step.state;
    this.sprite.setPosition(step.state.x, step.state.y);
    this.flash = Math.max(0, this.flash - dt);
    this.sprite.setAlpha(this.flash > 0 ? 0.35 : 1);
    return { from: { x: step.state.x, y: step.state.y + rules.muzzleOffsetY }, shots: step.shots };
  }

  /** Its collision box while it can be hit (fighting), otherwise null. */
  hitbox(): Box | null {
    if (!this.kind || this.state?.mode !== 'fighting') return null;
    const h = BOSSES[this.kind].hitbox;
    return { x: this.state.x, y: this.state.y + h.offsetY, w: h.w, h: h.h };
  }

  /** Damages it. Returns the points scored if this hit defeated it, else 0. */
  hit(amount: number): number {
    const { kind, state } = this;
    if (!kind || !state) return 0;
    const rules = BOSSES[kind];
    const r = damageBoss(state, rules, amount);
    this.state = r.state;
    this.flash = HUD.bossHitFlash;
    this.drawBar();
    if (!r.defeated) return 0;
    this.hide();
    return rules.points;
  }

  /** Where it is, for explosions. */
  get position(): Vec {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Removes it without a fight (a new game, or tests). */
  clear(): void {
    this.kind = null;
    this.state = null;
    this.hide();
  }

  /** What is on screen, for the e2e test hook. */
  read(): {
    kind: BossKind;
    mode: BossState['mode'];
    hp: number;
    phase: number;
    x: number;
    y: number;
    bar: number;
    barVisible: boolean;
  } | null {
    if (!this.kind || !this.state) return null;
    return {
      kind: this.kind,
      mode: this.state.mode,
      hp: this.state.hp,
      phase: this.state.phase,
      x: this.state.x,
      y: this.state.y,
      bar: this.barFill.width / HUD.bossBar.w,
      barVisible: this.barFill.visible,
    };
  }

  private drawBar(): void {
    if (!this.kind || !this.state) return;
    const fill = bossHealth(this.state, BOSSES[this.kind]);
    this.barBack.setVisible(true);
    this.barFill.setVisible(true).setSize(HUD.bossBar.w * fill, HUD.bossBar.h);
  }

  private hide(): void {
    this.sprite.stop();
    this.sprite.setActive(false).setVisible(false);
    this.barBack.setVisible(false);
    this.barFill.setVisible(false);
  }
}

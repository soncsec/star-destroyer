import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, FINAL_BOSS, GAME_HEIGHT, GAME_WIDTH, HUD } from '../config/tuning';
import type { BossVolley } from '../logic/boss';
import type { Box } from '../logic/collision';
import type { Vec } from '../logic/enemyFire';
import {
  FINAL_PARTS,
  beamBox,
  canHurt,
  damageFinalBoss,
  finalStage,
  finalTotalHp,
  finalTouching,
  partCenter,
  startFinalBoss,
  stepFinalBoss,
  type FinalBossState,
  type FinalPart,
  type FinalTarget,
} from '../logic/finalBoss';
import type { BossFight, BossView } from './Boss';

/** Shot targets by index: the parts in order, then the hull. */
const TARGETS: readonly FinalTarget[] = [...FINAL_PARTS, 'hull'];
const STAGES = ['cannons', 'helmet', 'core'] as const;
/** Frames per second of the beam's charge and fire animations. */
const RAY_FPS = 14;

/**
 * The final boss on screen (M6.5): the bare body with its cannons and helmet
 * drawn over it while they last, its thrust, and the core's beam. The rules
 * are in logic/finalBoss.ts; this draws them.
 */
export class FinalBoss implements BossFight {
  private readonly thrust: Phaser.GameObjects.Sprite;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly parts: Record<Exclude<FinalPart, 'core'>, Phaser.GameObjects.Image>;
  private readonly rays: Phaser.GameObjects.Sprite;
  private readonly barBack: Phaser.GameObjects.Rectangle;
  private readonly barFill: Phaser.GameObjects.Rectangle;
  private state: FinalBossState | null = null;
  private readonly flash: Record<FinalPart, number> = {
    cannonLeft: 0,
    cannonRight: 0,
    helmet: 0,
    core: 0,
  };

  constructor(scene: Phaser.Scene) {
    this.thrust = scene.add.sprite(0, 0, FINAL_BOSS.thrust);
    this.body = scene.add.sprite(0, 0, FINAL_BOSS.body, FINAL_BOSS.bodyFrames.bare);
    const s = FINAL_BOSS.partSprites;
    this.parts = {
      cannonLeft: scene.add.image(0, 0, s.cannonLeft),
      cannonRight: scene.add.image(0, 0, s.cannonRight),
      helmet: scene.add.image(0, 0, s.helmet),
    };
    for (const o of [this.thrust, this.body, ...Object.values(this.parts)]) {
      o.setDepth(DEPTH.enemies).setActive(false).setVisible(false);
    }
    // The beam shows over the ship, so it is clear what hit it.
    this.rays = scene.add
      .sprite(0, 0, FINAL_BOSS.rays, 0)
      .setDepth(DEPTH.enemyShots)
      .setVisible(false);
    this.rays.setOrigin(0.5, FINAL_BOSS.rayTop / this.rays.height);
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

  /** Brings it in from above the screen. */
  spawn(): void {
    this.state = startFinalBoss(FINAL_BOSS, GAME_WIDTH / 2);
    for (const p of FINAL_PARTS) this.flash[p] = 0;
    this.body.setActive(true).setVisible(true);
    this.thrust.setActive(true).setVisible(true).play(animKey(FINAL_BOSS.thrust));
    for (const img of Object.values(this.parts)) img.setActive(true).setVisible(true);
    this.draw();
  }

  get active(): boolean {
    return this.state !== null && this.state.mode !== 'defeated';
  }

  update(dt: number, target: Vec): BossVolley[] {
    if (!this.state || !this.active) return [];
    const step = stepFinalBoss(this.state, FINAL_BOSS, dt, target, GAME_WIDTH / 2);
    this.state = step.state;
    for (const p of FINAL_PARTS) this.flash[p] = Math.max(0, this.flash[p] - dt);
    this.draw();
    return step.volleys;
  }

  touching(box: Box): number {
    if (!this.state) return -1;
    const hit = finalTouching(this.state, FINAL_BOSS, box);
    return hit === null ? -1 : TARGETS.indexOf(hit);
  }

  firstFighting(): number {
    const { state } = this;
    if (!state) return -1;
    return FINAL_PARTS.findIndex((p) => canHurt(state, p));
  }

  hit(index: number, amount: number): { points: number; at: Vec } | null {
    const target = TARGETS[index];
    if (!this.state || !target) return null;
    const at = target === 'hull' ? null : partCenter(this.state, FINAL_BOSS, target);
    const r = damageFinalBoss(this.state, FINAL_BOSS, target, amount);
    if (r.state === this.state) return null; // blocked: the hull, or armour
    this.state = r.state;
    if (target !== 'hull') this.flash[target] = HUD.bossHitFlash;
    this.draw();
    if (!r.destroyed || !at) return null;
    if (r.defeated) this.hide();
    return { points: FINAL_BOSS.parts[r.destroyed].points, at };
  }

  hpOf(index: number): number {
    const target = TARGETS[index];
    if (!this.state || !target || target === 'hull') return 0;
    return this.state.hp[target];
  }

  beam(): Box | null {
    return this.state ? beamBox(this.state, FINAL_BOSS, GAME_HEIGHT) : null;
  }

  clear(): void {
    this.state = null;
    this.hide();
  }

  read(): BossView | null {
    const { state } = this;
    if (!state) return null;
    const stage = finalStage(state);
    return {
      kind: 'final-boss',
      mode: state.mode,
      hp: FINAL_PARTS.reduce((sum, p) => sum + state.hp[p], 0),
      phase: STAGES.indexOf(stage),
      x: state.x,
      y: state.y,
      bar: this.barFill.width / HUD.bossBar.w,
      barVisible: this.barFill.visible,
      ships: FINAL_PARTS.map((p) => ({
        mode: state.hp[p] <= 0 ? 'defeated' : state.mode,
        hp: state.hp[p],
        phase: STAGES.indexOf(stage),
        ...partCenter(state, FINAL_BOSS, p),
      })),
      stage,
      beam: state.beam.mode,
    };
  }

  private draw(): void {
    const s = this.state;
    if (!s || s.mode === 'defeated') return;
    const { x, y } = s;
    const core = s.hp.core / FINAL_BOSS.parts.core.hp;
    const frames = FINAL_BOSS.bodyFrames;
    this.body
      .setPosition(x, y)
      .setFrame(core < FINAL_BOSS.crackedBelow ? frames.cracked : frames.bare)
      .setAlpha(this.flash.core > 0 ? 0.35 : 1);
    this.thrust.setPosition(x, y + FINAL_BOSS.thrustOffsetY);
    for (const [part, img] of Object.entries(this.parts) as [
      Exclude<FinalPart, 'core'>,
      Phaser.GameObjects.Image,
    ][]) {
      const c = partCenter(s, FINAL_BOSS, part);
      img
        .setPosition(c.x, c.y)
        .setVisible(s.hp[part] > 0)
        .setAlpha(this.flash[part] > 0 ? 0.35 : 1);
    }
    const beam = s.beam;
    if (beam.mode === 'idle') {
      this.rays.setVisible(false);
    } else {
      const set = beam.mode === 'warning' ? FINAL_BOSS.rayFrames.warn : FINAL_BOSS.rayFrames.fire;
      const frame = set[Math.floor(beam.t * RAY_FPS) % set.length] ?? 0;
      this.rays
        .setPosition(x, y + FINAL_BOSS.parts.core.muzzleY)
        .setFrame(frame)
        .setVisible(true);
    }
    const fill = FINAL_PARTS.reduce((sum, p) => sum + s.hp[p], 0) / finalTotalHp(FINAL_BOSS);
    this.barBack.setVisible(true);
    this.barFill.setVisible(true).setSize(HUD.bossBar.w * fill, HUD.bossBar.h);
  }

  private hide(): void {
    this.thrust.stop();
    for (const o of [this.thrust, this.body, ...Object.values(this.parts)]) {
      o.setActive(false).setVisible(false);
    }
    this.rays.setVisible(false);
    this.barBack.setVisible(false);
    this.barFill.setVisible(false);
  }
}

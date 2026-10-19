import Phaser from 'phaser';
import { animKey } from '../assets/manifest';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PLAYER, PLAYER_HEALTH } from '../config/tuning';
import type { Box } from '../logic/collision';
import type { Vec } from '../logic/enemyFire';
import { dragTarget, stepPlayerToward, type Drag } from '../logic/touch';
import {
  bankFrame,
  screenBounds,
  stepPlayer,
  type Axis,
  type MoveParams,
  type PlayerState,
} from '../logic/player';

/** The player's ship: a banking sprite with an engine flame underneath. */
export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly thrust: Phaser.GameObjects.Sprite;
  private state: PlayerState;
  private readonly params: MoveParams;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(0, 0, PLAYER.ship, PLAYER.bankFrames[2]).setDepth(DEPTH.player);
    this.thrust = scene.add
      .sprite(0, 0, PLAYER.thrust)
      .play(animKey(PLAYER.thrust))
      .setDepth(DEPTH.player - 1);
    this.params = {
      speed: PLAYER.speed,
      bankRate: PLAYER.bankRate,
      bounds: screenBounds(
        GAME_WIDTH,
        GAME_HEIGHT,
        this.sprite.width,
        this.sprite.height,
        PLAYER.edgeMargin,
      ),
    };
    this.state = { x: GAME_WIDTH / 2, y: GAME_HEIGHT * PLAYER.startY, bank: 0 };
    this.render();
  }

  /** Back to the start position, level, after losing a life. */
  reset(): void {
    this.state = { x: GAME_WIDTH / 2, y: GAME_HEIGHT * PLAYER.startY, bank: 0 };
    this.render();
  }

  /** Shows or hides the ship and its flame (blinking, or gone after game over). */
  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.thrust.setVisible(visible);
  }

  hitbox(): Box {
    const { w, h } = PLAYER_HEALTH.hitbox;
    return { x: this.state.x, y: this.state.y, w, h };
  }

  get position(): Readonly<PlayerState> {
    return this.state;
  }

  update(input: Axis, dtSeconds: number): void {
    this.state = stepPlayer(this.state, input, dtSeconds, this.params);
    this.render();
  }

  /** Touch steering: flies toward where the drag says it should be. */
  updateTouch(drag: Drag, finger: Vec, dtSeconds: number): void {
    const target = dragTarget(drag, finger, this.params.bounds);
    this.state = stepPlayerToward(this.state, target, dtSeconds, this.params);
    this.render();
  }

  private render(): void {
    this.sprite.setPosition(this.state.x, this.state.y);
    this.sprite.setFrame(bankFrame(this.state.bank, PLAYER.bankFrames));
    // Flame hangs just below the engine nozzles, overlapping them slightly.
    const flameY = this.sprite.height / 2 + this.thrust.height / 2 - PLAYER.thrustOverlap;
    this.thrust.setPosition(this.state.x, this.state.y + flameY);
  }
}

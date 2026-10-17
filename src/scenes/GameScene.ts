import Phaser from 'phaser';
import { BACKGROUND, GAME_HEIGHT, GAME_WIDTH, WEAPON } from '../config/tuning';
import { Bullets } from '../entities/Bullets';
import { Player } from '../entities/Player';
import type { Axis } from '../logic/player';
import { stepFire, type FireState } from '../logic/weapon';

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
    this.bullets = new Bullets(this);
    this.player = new Player(this);

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
    this.player.update(this.readAxis(), dt);

    const shot = stepFire(this.fireState, this.keys.fire.isDown, dt, WEAPON.fireInterval);
    this.fireState = shot.state;
    if (shot.fire) {
      const { x, y } = this.player.position;
      this.bullets.fire(x, y + WEAPON.muzzleOffsetY);
    }
    this.bullets.update(dt);
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

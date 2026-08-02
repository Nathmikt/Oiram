import { Entity } from './Entity.js';

export class Enemy extends Entity {
  constructor(x, y, type = 'crawler') {
    super(x, y, 28, 28);
    this.type = type;
    this.speed = type === 'spitter' ? 60 : 100;
    this.direction = 1;
    this.color = type === 'spitter' ? '#a855f7' : '#e11d48';
  }

  update(dt, levelManager) {
    if (!levelManager) return;

    this.vx = this.speed * this.direction;

    const nextX = this.x + (this.direction > 0 ? this.width + 4 : -4);
    const wallTiles = levelManager.getSolidTilesInRect(nextX, this.y, 4, this.height);

    const checkY = this.y + this.height + 4;
    const checkX = this.x + (this.direction > 0 ? this.width : 0);
    const ledgeTiles = levelManager.getSolidTilesInRect(checkX, checkY, 4, 4);

    if (wallTiles.length > 0 || ledgeTiles.length === 0) {
      this.direction *= -1;
      this.vx = this.speed * this.direction;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const eyeOffsetX = this.direction > 0 ? 6 : -6;
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2 + eyeOffsetX, this.y + this.height / 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

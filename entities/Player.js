import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(x = 100, y = 300) {
    super(x, y, 24, 32);
    this.spawnX = x;
    this.spawnY = y;
    this.speed = 350;
    this.jumpForce = -650;
    this.color = '#ffffff';

    this.isWallClimbing = false;
    this.inWater = false;
    this.invulnerable = false;
    this.lastSplashTime = 0;

    // Animation & Particle Hooks
    this.scaleX = 1;
    this.scaleY = 1;
    this.facing = 1;
    this.sprite = null;
    this.particles = [];
  }

  onLand() {
    this.scaleX = 1.3;
    this.scaleY = 0.7;
    this.createDust(6);
  }

  jump() {
    this.vy = this.jumpForce;
    this.isGrounded = false;
    this.scaleX = 0.7;
    this.scaleY = 1.3;
    this.createDust(4);
  }

  createDust(count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.x + this.width / 2,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 40,
        radius: Math.random() * 3 + 1,
        color: 'rgba(226, 232, 240, ',
        alpha: 0.8,
        life: 0.3
      });
    }
  }

  createSplash() {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: this.x + this.width / 2,
        y: this.y + this.height - 4,
        vx: (Math.random() - 0.5) * 60,
        vy: -Math.random() * 50 - 20,
        radius: Math.random() * 2 + 1,
        color: 'rgba(120, 210, 255, ',
        alpha: 0.9,
        life: 0.35
      });
    }
  }

  handleInput(input) {
    this.ax = 0;

    if (!this.inWater && !this.isWallClimbing) {
      if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
        this.vx = -this.speed;
        this.ax = -1;
        this.facing = -1;
      } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
        this.vx = this.speed;
        this.ax = 1;
        this.facing = 1;
      }

      if ((input.wasPressed('Space') || input.wasPressed('ArrowUp') || input.wasPressed('KeyW')) && this.isGrounded) {
        this.jump();
      }
    }
  }

  update(dt) {
    this.scaleX += (1 - this.scaleX) * 0.15;
    this.scaleY += (1 - this.scaleY) * 0.15;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.35);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  resetToSpawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vx = 0;
    this.vy = 0;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  draw(ctx) {
    ctx.save();

    for (const p of this.particles) {
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.invulnerable && Math.floor(performance.now() / 80) % 2 === 0) {
      ctx.restore();
      return;
    }

    const centerX = this.x + this.width / 2;
    const bottomY = this.y + this.height;

    ctx.translate(centerX, bottomY);
    ctx.scale(this.scaleX, this.scaleY);
    ctx.translate(-centerX, -bottomY);

    if (this.inWater) {
      ctx.fillStyle = '#e0f7fc';
    } else if (this.isWallClimbing) {
      ctx.fillStyle = '#fff4e6';
    } else {
      ctx.fillStyle = this.color;
    }

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 6);
    ctx.fill();

    ctx.fillStyle = '#0f141d';
    const eyeX = this.facing > 0 ? this.x + 15 : this.x + 5;
    ctx.beginPath();
    ctx.arc(eyeX, this.y + 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

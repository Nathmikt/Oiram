import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(x = 100, y = 300) {
    super(x, y, 24, 32);
    this.spawnX = x;
    this.spawnY = y;
    this.baseSpeed = 200;
    this.sprintSpeed = 360;
    this.speed = this.baseSpeed;
    this.jumpForce = -650;
    this.color = '#ffffff';

    this.isWallClimbing = false;
    this.inWater = false;
    this.invulnerable = false;
    this.lastSplashTime = 0;

    // Animation & Particle Hooks
    this.animTime = 0;
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

    // Allow ground/jump controls unless actively wall climbing or executing 360 swim propulsion
    if (!this.isSwimming && !this.isWallClimbing) {
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
    this.animTime += dt;
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

  getSpriteKey() {
    // 1. Wall Climb State
    if (this.isWallClimbing) {
      return this.facing > 0 ? 'player_right_wall_hang' : 'player_left_wall_hang';
    }

    // 2. Swim State
    if (this.inWater) {
      // Use specific downward dive sprite if moving down fast
      if (this.vy > 100) return 'player_swim_down'; 
      return this.facing > 0 ? 'player_right_swim' : 'player_left_swim';
    }

    // 3. Jump/Air State
    if (!this.isGrounded) {
      return this.facing > 0 ? 'player_right_jump' : 'player_left_jump';
    }

    // 4. Ground Walk State
    const absVx = Math.abs(this.vx);
    if (absVx > 10) {
      if (this.facing > 0 || this.vx > 0) {
        return absVx >= 180 ? 'player_right_2' : 'player_right_1';
      } else {
        return absVx >= 180 ? 'player_left_2' : 'player_left_1';
      }
    }

    // 5. Idle
    return 'player_idle';
  }

  draw(ctx, textureManager) {
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

    const jiggle = Math.sin(this.animTime * 5) * 0.04;
    const currentScaleX = this.scaleX + jiggle;
    const currentScaleY = this.scaleY - jiggle;

    ctx.translate(centerX, bottomY);
    ctx.scale(currentScaleX, currentScaleY);
    ctx.translate(-centerX, -bottomY);

    const spriteKey = this.getSpriteKey();
    const img = textureManager ? (textureManager.get(spriteKey) || textureManager.get('player_idle') || textureManager.get('player')) : null;

    if (img) {
      ctx.save();
      if (spriteKey === 'player_idle' && this.facing === -1) {
        ctx.translate(centerX, bottomY);
        ctx.scale(-1, 1);
        ctx.drawImage(img, -this.width / 2, -this.height, this.width, this.height);
      } else {
        ctx.drawImage(img, this.x, this.y, this.width, this.height);
      }
      ctx.restore();
    } else {
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
    }

    ctx.restore();
  }
}

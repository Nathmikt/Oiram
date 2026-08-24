import { Entity } from './Entity.js';
import { EnemyRegistry } from '../data/enemy_types.js';
import { getBehavior } from './behaviors/index.js';

export class Enemy extends Entity {
  constructor(x, y, type = 'walker') {
    const typeKey = String(type || 'walker').toLowerCase();
    const config = EnemyRegistry[typeKey] || EnemyRegistry.walker;

    super(x, y, config.width, config.height);
    this.type = config.name || typeKey;
    this.specs = config;
    this.speed = config.speed;
    this.color = config.color;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.damage = config.damage || 15;
    this.ignoresGravity = !!config.ignoresGravity;
    this.isAquatic = !!config.isAquatic;

    this.facing = 1;
    this.behavior = getBehavior(config.behavior);
    this.submergedTime = 0;
    this.hitTimer = 0;
    this.isDead = false;
    this.particles = [];
  }

  get direction() {
    return this.facing;
  }

  set direction(val) {
    this.facing = val;
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitTimer = 0.2;

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.createDeathParticles();
  }

  createDeathParticles() {
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        radius: Math.random() * 4 + 2,
        color: this.color,
        life: 0.5
      });
    }
  }

  update(dt, levelManager, player) {
    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.isDead) return;

    // Drowning mechanic check
    if (levelManager && typeof levelManager.getLiquidMassAtWorldPos === 'function') {
      if (!this.specs.isAquatic) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const liquidMass = levelManager.getLiquidMassAtWorldPos(centerX, centerY);

        // Require full submergence (>0.8 mass) to begin drowning timer
        if (liquidMass !== null && liquidMass > 0.8) {
          this.submergedTime = (this.submergedTime || 0) + dt;
          if (this.submergedTime >= 8.0) { // Increased grace period from 3.0s to 8.0s
            this.takeDamage(this.hp);
          }
        } else {
          this.submergedTime = 0;
        }
      }
    }

    if (this.behavior) {
      this.behavior.execute(this, dt, levelManager, player);
    }
  }

  getSpriteKey() {
    const typeKey = (this.type || "unknown").toLowerCase();
    
    if (typeKey === 'swimmer') {
      if (Math.abs(this.vx) < 5) return 'swimmer_idle';
      
      // Toggle between frame 1 and 2 every 150ms based on system time
      const animFrame = Math.floor(performance.now() / 150) % 2 + 1;
      return this.facing > 0 ? `swimmer_swim_right${animFrame}` : `swimmer_swim_left${animFrame}`;
    }

    if (
      typeKey === 'aggro_walker' ||
      typeKey === 'aggro walker' ||
      typeKey === 'spitter' ||
      typeKey === 'aggressive_red_slime' ||
      typeKey === 'red_slime' ||
      this.specs?.behavior === 'AggressivePatrolBehavior'
    ) {
      if (Math.abs(this.vx) < 5) return 'aggro_red_slime_idle';

      const animFrame = Math.floor(performance.now() / 150) % 2 + 1;
      return this.facing > 0 ? `aggro_red_slime_walk_right${animFrame}` : `aggro_red_slime_walk_left${animFrame}`;
    }
    
    // Return null for enemies without mapped sprites to trigger the vector fallback
    return null; 
  }

  draw(ctx, textureManager) {
    ctx.save();

    // Draw death/hit particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 0.5);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw behavior-specific graphics (e.g. projectiles)
    if (this.behavior && typeof this.behavior.draw === 'function') {
      this.behavior.draw(this, ctx);
    }

    if (this.isDead) {
      ctx.restore();
      return;
    }

    // 1. Attempt to fetch sprite based on enemy state
    const spriteKey = this.getSpriteKey();
    const img = (textureManager && spriteKey) ? textureManager.get(spriteKey) : null;

    if (img) {
      // 2A. Render Sprite
      ctx.drawImage(img, this.x, this.y, this.width, this.height);
    } else {
      // 2B. Fallback to Vector Shapes
      const color = this.hitTimer > 0 ? '#ffffff' : (this.specs.color || this.color);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;

      const shape = this.specs.shape || 'circle';
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;

      switch (shape) {
        case 'square':
          ctx.fillRect(this.x, this.y, this.width, this.height);
          break;

        case 'spiked_square':
          ctx.fillRect(this.x, this.y, this.width, this.height);
          // Draw 2 small triangular spikes on top
          ctx.beginPath();
          ctx.moveTo(this.x + 3, this.y);
          ctx.lineTo(this.x + 8, this.y - 6);
          ctx.lineTo(this.x + 13, this.y);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(this.x + this.width - 13, this.y);
          ctx.lineTo(this.x + this.width - 8, this.y - 6);
          ctx.lineTo(this.x + this.width - 3, this.y);
          ctx.closePath();
          ctx.fill();
          break;

        case 'tall_rect':
          ctx.fillRect(this.x, this.y, this.width, this.height);
          break;

        case 'oval':
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'circle':
        default:
          ctx.beginPath();
          ctx.arc(centerX, centerY, this.width / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      // Eyes
      ctx.fillStyle = '#ffffff';
      const eyeOffsetX = (this.facing || 1) > 0 ? 5 : -5;
      ctx.beginPath();
      ctx.arc(centerX + eyeOffsetX, this.y + this.height / 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Health Bar if damaged
    if (this.hp < this.maxHp) {
      const barW = this.width;
      const barH = 4;
      const barX = this.x;
      const barY = this.y - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barW, barH);

      const hpRatio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    ctx.restore();
  }
}

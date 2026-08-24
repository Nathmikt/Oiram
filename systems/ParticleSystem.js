export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(config) {
    this.particles.push({
      x: config.x ?? 0,
      y: config.y ?? 0,
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      ax: config.ax ?? 0,
      ay: config.ay ?? 0,
      radius: config.radius ?? 3,
      growth: config.growth ?? 0,
      color: config.color ?? '#cbd5e1',
      alpha: config.alpha ?? 1.0,
      startAlpha: config.alpha ?? 1.0,
      life: config.life ?? 0.5,
      maxLife: config.life ?? 0.5,
      drag: config.drag ?? 0.96,
      gravity: config.gravity ?? 0
    });
  }

  createDigPuff(worldX, worldY, isSurface = false) {
    const smokeCount = 8;
    const debrisCount = 6;
    const baseColor = isSurface ? 'rgba(74, 94, 82, ' : 'rgba(100, 116, 139, ';

    // 1. Expanding soft smoke puff particles
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 35 + 10;
      this.emit({
        x: worldX + (Math.random() - 0.5) * 12,
        y: worldY + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        radius: Math.random() * 4 + 3,
        growth: Math.random() * 5 + 3,
        color: baseColor,
        alpha: 0.65,
        life: Math.random() * 0.35 + 0.25,
        drag: 0.88,
        gravity: -10
      });
    }

    // 2. High-speed solid rock/debris chips
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 80 + 30;
      this.emit({
        x: worldX + (Math.random() - 0.5) * 8,
        y: worldY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        radius: Math.random() * 2 + 1,
        growth: 0,
        color: isSurface ? '#22303c' : '#1e293b',
        alpha: 0.9,
        life: Math.random() * 0.3 + 0.2,
        drag: 0.94,
        gravity: 600
      });
    }
  }

  createDust(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 40,
        radius: Math.random() * 3 + 1,
        color: 'rgba(226, 232, 240, ',
        alpha: 0.8,
        life: 0.3,
        drag: 0.92,
        gravity: 100
      });
    }
  }

  createSplash(x, y, count = 4) {
    for (let i = 0; i < count; i++) {
      this.emit({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 60,
        vy: -Math.random() * 50 - 20,
        radius: Math.random() * 2 + 1,
        color: 'rgba(120, 210, 255, ',
        alpha: 0.9,
        life: 0.35,
        drag: 0.94,
        gravity: 400
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx = (p.vx + p.ax * dt) * p.drag;
      p.vy = (p.vy + (p.ay + p.gravity) * dt) * p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.radius += p.growth * dt;
      p.life -= dt;

      p.alpha = Math.max(0, (p.life / p.maxLife) * p.startAlpha);

      if (p.life <= 0 || p.radius <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    if (this.particles.length === 0) return;

    ctx.save();
    for (const p of this.particles) {
      if (p.alpha <= 0.01) continue;

      if (p.color.endsWith(', ')) {
        ctx.fillStyle = `${p.color}${p.alpha})`;
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() {
    this.particles.length = 0;
  }
}

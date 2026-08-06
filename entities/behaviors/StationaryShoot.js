export class StationaryShoot {
  constructor() {
    this.fireCooldown = 0;
    this.fireInterval = 1.8;
    this.shootRange = 350;
    this.projectiles = [];
  }

  execute(enemy, dt, levelManager, player) {
    enemy.vx = 0;

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (levelManager) {
        const hits = levelManager.getSolidTilesInRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
        if (hits.length > 0) {
          p.life = 0;
        }
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    if (!player) return;

    const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dx !== 0) {
      enemy.direction = dx > 0 ? 1 : -1;
    }

    this.fireCooldown -= dt;
    if (dist <= this.shootRange && this.fireCooldown <= 0) {
      this.fireCooldown = this.fireInterval;
      const speed = 240;
      const dirX = dx / dist;
      const dirY = dy / dist;

      this.projectiles.push({
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height / 2,
        vx: dirX * speed,
        vy: dirY * speed,
        radius: 5,
        damage: enemy.damage || 10,
        color: enemy.color || '#a855f7',
        life: 3
      });
    }
  }

  draw(enemy, ctx) {
    for (const p of this.projectiles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

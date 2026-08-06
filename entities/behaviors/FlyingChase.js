export class FlyingChase {
  constructor() {
    this.detectRange = 350;
  }

  execute(enemy, dt, levelManager, player) {
    if (!player) return;

    const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
    const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist <= this.detectRange && dist > 5) {
      enemy.vx = (dx / dist) * enemy.speed;
      enemy.vy = (dy / dist) * enemy.speed;
      enemy.direction = dx >= 0 ? 1 : -1;
    } else {
      enemy.vx *= 0.95;
      enemy.vy *= 0.95;
    }
  }
}

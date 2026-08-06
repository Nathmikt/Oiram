export class HoppingBehavior {
  constructor() {
    this.jumpTimer = 0;
  }

  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    const specs = enemy.specs || {};
    const speed = specs.speed || 80;
    const jumpForce = specs.jumpForce || 350;
    const jumpCooldown = specs.jumpCooldown || 1.5;

    if (this.jumpTimer > 0) {
      this.jumpTimer -= dt;
    }

    if (enemy.isGrounded) {
      enemy.vx = 0;
      if (this.jumpTimer <= 0) {
        enemy.vy = -jumpForce;
        enemy.vx = speed * enemy.facing;
        enemy.isGrounded = false;
        this.jumpTimer = jumpCooldown;
      }
    } else {
      // Check wall collision mid-air
      const nextX = enemy.x + (enemy.facing > 0 ? enemy.width + 4 : -4);
      const wallTiles = levelManager.getSolidTilesInRect(nextX, enemy.y, 4, enemy.height);

      if (wallTiles.length > 0) {
        enemy.facing *= -1;
        enemy.direction = enemy.facing;
        enemy.vx = speed * enemy.facing;
      }
    }
  }
}

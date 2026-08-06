export class FlyingPatrolBehavior {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    const speed = enemy.specs.speed || 80;

    enemy.vx = speed * enemy.facing;
    
    // Sine wave hovering effect
    enemy.vy = Math.sin(performance.now() / 300) * 15;

    const nextX = enemy.x + (enemy.facing > 0 ? enemy.width + 4 : -4);
    const wallTiles = levelManager.getSolidTilesInRect(nextX, enemy.y, 4, enemy.height);

    if (wallTiles.length > 0) {
      enemy.facing *= -1;
      enemy.direction = enemy.facing;
      enemy.vx = speed * enemy.facing;
    }
  }
}

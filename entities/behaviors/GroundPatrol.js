export class GroundPatrol {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.vx = enemy.speed * enemy.direction;

    const nextX = enemy.x + (enemy.direction > 0 ? enemy.width + 4 : -4);
    const wallTiles = levelManager.getSolidTilesInRect(nextX, enemy.y, 4, enemy.height);

    if (wallTiles.length > 0) {
      enemy.direction *= -1;
      enemy.vx = enemy.speed * enemy.direction;
    }
  }
}

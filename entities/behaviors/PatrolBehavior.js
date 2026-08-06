export class PatrolBehavior {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    enemy.vx = (enemy.specs.speed || 60) * enemy.facing;

    const nextX = enemy.x + (enemy.facing > 0 ? enemy.width + 4 : -4);
    const wallTiles = levelManager.getSolidTilesInRect(nextX, enemy.y, 4, enemy.height);

    if (wallTiles.length > 0) {
      enemy.facing *= -1;
      enemy.direction = enemy.facing;
      enemy.vx = (enemy.specs.speed || 60) * enemy.facing;
    }
  }
}

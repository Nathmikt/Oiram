export class GroundPatrol {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    enemy.direction = enemy.facing;
    const speed = enemy.speed || (enemy.specs ? enemy.specs.speed : 60);

    const nextX = enemy.x + (enemy.facing > 0 ? enemy.width + 8 : -8);
    const probeY = enemy.y + enemy.height - 4;

    const waterAhead = levelManager.getLiquidMassAtWorldPos(nextX, probeY);
    const wallTiles = levelManager.getSolidTilesInRect(
      enemy.x + (enemy.facing > 0 ? enemy.width + 4 : -4),
      enemy.y,
      4,
      enemy.height
    );

    if (wallTiles.length > 0 || (waterAhead !== null && waterAhead > 0.4)) {
      enemy.facing *= -1;
      enemy.direction = enemy.facing;
      enemy.vx = speed * enemy.facing;
    } else {
      enemy.vx = speed * enemy.facing;
    }
  }
}

export class AggressivePatrolBehavior {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    const specs = enemy.specs || {};
    const aggroRange = specs.aggroRange || 250;
    const aggroSpeed = specs.aggroSpeed || 120;
    const speed = specs.speed || 70;

    let isAggro = false;

    if (player) {
      const enemyCenterX = enemy.x + enemy.width / 2;
      const enemyCenterY = enemy.y + enemy.height / 2;
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;

      const dist = Math.hypot(playerCenterX - enemyCenterX, playerCenterY - enemyCenterY);

      if (dist < aggroRange) {
        isAggro = true;
        enemy.facing = playerCenterX >= enemyCenterX ? 1 : -1;
        enemy.direction = enemy.facing;
        enemy.vx = aggroSpeed * enemy.facing;
      }
    }

    if (!isAggro) {
      enemy.vx = speed * enemy.facing;

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

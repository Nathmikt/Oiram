export class AquaticBehavior {
  execute(enemy, dt, levelManager, player) {
    if (!levelManager) return;

    enemy.facing = enemy.facing || enemy.direction || 1;
    const speed = enemy.specs.speed || 90;

    // Apply horizontal movement
    enemy.vx = speed * enemy.facing;

    if (enemy.inWater) {
      // Zero vertical velocity only while submerged
      enemy.vy = 0;

      // Check forward water boundary ONLY while inside water
      const probeX = enemy.x + (enemy.facing > 0 ? enemy.width + 8 : -8);
      const probeY = enemy.y + enemy.height / 2;
      const forwardLiquid = levelManager.getLiquidMassAtWorldPos(probeX, probeY);

      // Turn around if approaching dry land or a solid wall
      const wallCheck = levelManager.getSolidTilesInRect(
        enemy.x + (enemy.facing > 0 ? enemy.width + 2 : -2),
        enemy.y,
        2,
        enemy.height
      );

      if (forwardLiquid < 0.3 || wallCheck.length > 0) {
        enemy.facing *= -1;
        enemy.direction = enemy.facing;
        enemy.vx = speed * enemy.facing;
      }
    }
  }
}

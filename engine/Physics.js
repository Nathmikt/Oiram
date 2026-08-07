export class Physics {
  constructor() {
    this.gravity = 1800;
    this.friction = 1400;
    this.airAcceleration = 1600;
    this.airFriction = 300;
    this.maxFallSpeed = 800;
    this.gravityVector = { x: 0, y: 1 };
  }

  applyPhysics(entity, dt, levelManager) {
    // Water State Sampling & Hysteresis
    if (levelManager && levelManager.getLiquidMassAtWorldPos) {
      const centerX = entity.x + entity.width / 2;
      const centerY = entity.y + entity.height / 2;
      const liquidMass = levelManager.getLiquidMassAtWorldPos(centerX, centerY);

      if (!entity.inWater && liquidMass > 0.35) {
        entity.inWater = true;
      } else if (entity.inWater && liquidMass < 0.15) {
        entity.inWater = false;
      }
    }

    // Handle Liquid Drag & Gravity
    if (entity.inWater) {
      // Apply liquid drag to both velocity axes
      entity.vx *= 0.92;
      entity.vy *= 0.92;

      // Apply sink gravity unless entity is actively swimming or immune
      const skipsGravity = entity.isSwimming || entity.ignoresGravity || (entity.specs && entity.specs.ignoresGravity);
      if (!skipsGravity) {
        entity.vy += this.gravity * 0.6 * dt;
      }
    } else {
      // Normal dry physics gravity
      const skipsGravity = entity.ignoresGravity || (entity.specs && entity.specs.ignoresGravity);
      if (!skipsGravity) {
        entity.vx += this.gravityVector.x * this.gravity * dt;
        entity.vy += this.gravityVector.y * this.gravity * dt;
        entity.vy = Math.min(entity.vy, this.maxFallSpeed);
      }

      // Apply ground friction vs air drift
      if (entity.isGrounded) {
        if (entity.ax === 0) {
          if (entity.vx > 0) {
            entity.vx = Math.max(0, entity.vx - this.friction * dt);
          } else if (entity.vx < 0) {
            entity.vx = Math.min(0, entity.vx + this.friction * dt);
          }
        }
      } else {
        if (entity.ax === 0) {
          if (entity.vx > 0) {
            entity.vx = Math.max(0, entity.vx - this.airFriction * dt);
          } else if (entity.vx < 0) {
            entity.vx = Math.min(0, entity.vx + this.airFriction * dt);
          }
        }
      }
    }

    // 1. Integrate Y position FIRST
    const wasGrounded = entity.isGrounded;
    entity.y += entity.vy * dt;
    entity.isGrounded = false;

    // 2. Resolve Vertical Collisions Unconditionally FIRST
    if (levelManager) {
      const yTiles = levelManager.getSolidTilesInRect(
        entity.x + 2,
        entity.y,
        entity.width - 4,
        entity.height
      );

      for (const tile of yTiles) {
        if (tile.type === 2) {
          if (entity.vy > 0) {
            entity.y = tile.y - entity.height;
            entity.vy = 0;
            entity.isGrounded = true;
            if (!wasGrounded && typeof entity.onLand === 'function') {
              entity.onLand();
            }
          }
          continue;
        }

        if (entity.vy > 0) {
          entity.y = tile.y - entity.height;
          entity.vy = 0;
          entity.isGrounded = true;

          if (!wasGrounded && typeof entity.onLand === 'function') {
            entity.onLand();
          }
        } else if (entity.vy < 0) {
          entity.y = tile.y + tile.height;
          entity.vy = 0;
        } else {
          // vy === 0: Resolve embedding based on vertical overlap center
          const entityCenterY = entity.y + entity.height / 2;
          const tileCenterY = tile.y + tile.height / 2;

          if (entityCenterY < tileCenterY) {
            entity.y = tile.y - entity.height;
            entity.isGrounded = true;
          } else {
            entity.y = tile.y + tile.height;
          }
          entity.vy = 0;
        }
      }
    }

    // 3. Integrate X position AFTER Y ejection is complete
    entity.x += entity.vx * dt;

    if (levelManager) {
      const topInset = entity.inWater ? 6 : 2;
      const bottomInset = entity.inWater ? 6 : 2;
      const probeY = entity.y + topInset;
      const probeHeight = Math.max(1, entity.height - (topInset + bottomInset));

      const xTiles = levelManager.getSolidTilesInRect(
        entity.x,
        probeY,
        entity.width,
        probeHeight
      );

      for (const tile of xTiles) {
        if (tile.type === 2) continue;

        if (entity.vx > 0) {
          entity.x = tile.x - entity.width;
          entity.vx = 0;
        } else if (entity.vx < 0) {
          entity.x = tile.x + tile.width;
          entity.vx = 0;
        }
      }
    }
  }
}

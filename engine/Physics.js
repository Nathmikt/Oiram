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

    // 1. Integrate X position FIRST with vertical inset (prevents floor/ceiling corner interference)
    if (entity.vx !== 0) {
      entity.x += entity.vx * dt;

      if (levelManager) {
        const topInset = 3;
        const bottomInset = 3;
        const probeY = entity.y + topInset;
        const probeHeight = Math.max(1, entity.height - (topInset + bottomInset));

        const xTiles = levelManager.getSolidTilesInRect(
          entity.x,
          probeY,
          entity.width,
          probeHeight
        );

        for (const tile of xTiles) {
          if (tile.type === 2) continue; // One-way platforms only collide vertically

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

    // 2. Integrate Y position SECOND with horizontal inset (prevents side wall corner interference)
    const wasGrounded = entity.isGrounded;
    const prevY = entity.y;
    entity.y += entity.vy * dt;
    entity.isGrounded = false;

    if (levelManager) {
      const sideInset = 3;
      const probeX = entity.x + sideInset;
      const probeWidth = Math.max(1, entity.width - (sideInset * 2));

      const yTiles = levelManager.getSolidTilesInRect(
        probeX,
        entity.y,
        probeWidth,
        entity.height
      );

      for (const tile of yTiles) {
        if (tile.type === 2) {
          const prevBottom = prevY + entity.height;
          if (entity.vy > 0 && prevBottom <= tile.y + 1) {
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
        }
      }
    }
  }
}

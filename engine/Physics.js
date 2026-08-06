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
    entity.tempTightGapActive = false;

    // 2. Water Boundary Hysteresis
    if (levelManager && levelManager.getLiquidMassAtWorldPos) {
      const centerX = entity.x + entity.width / 2;
      const centerY = entity.y + entity.height / 2;
      const liquidMass = levelManager.getLiquidMassAtWorldPos(centerX, centerY);

      // Apply hysteresis: enter water at >0.35 mass, exit water only when <0.15 mass
      if (!entity.inWater && liquidMass > 0.35) {
        entity.inWater = true;
      } else if (entity.inWater && liquidMass < 0.15) {
        entity.inWater = false;
      }
    }

    // 3. Tight-Gap Center Assist (Runs for both land and water to assist tight traversals)
    if (levelManager && Math.abs(entity.vx) > 0) {
      const dir = Math.sign(entity.vx);
      const checkPositions = [
        entity.x + entity.width / 2,
        entity.x + (dir > 0 ? entity.width : 0) + dir * 4
      ];

      let gapDetected = false;
      let gapTop = 0;
      let gapBottom = 0;

      for (const cx of checkPositions) {
        const topTiles = levelManager.getSolidTilesInRect(cx - 2, entity.y - 12, 4, 12);
        const bottomTiles = levelManager.getSolidTilesInRect(cx - 2, entity.y + entity.height, 4, 12);

        if (topTiles.length > 0 && bottomTiles.length > 0) {
          const tTop = topTiles[0].y + topTiles[0].height;
          const tBottom = bottomTiles[0].y;
          if (tBottom - tTop <= 36) {
            gapDetected = true;
            gapTop = tTop;
            gapBottom = tBottom;
            break;
          }
        }
      }

      if (gapDetected) {
        const gapCenterY = gapTop;
        entity.y += (gapCenterY - entity.y) * 15 * dt;
        entity.vy *= 0.5;
        entity.tempTightGapActive = true;
      }
    }

    if (entity.inWater) {
      // 1. Submerged Horizontal Probe Inset
      entity.x += entity.vx * dt;
      if (levelManager) {
        const topInset = entity.tempTightGapActive ? 10 : 6;
        const bottomInset = entity.tempTightGapActive ? 10 : 6;
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

      entity.y += entity.vy * dt;
      if (levelManager) {
        const yTiles = levelManager.getSolidTilesInRect(entity.x + 2, entity.y, entity.width - 4, entity.height);
        for (const tile of yTiles) {
          if (tile.type === 2) continue;
          if (entity.vy > 0) {
            entity.y = tile.y - entity.height;
            entity.vy = 0;
            entity.isGrounded = true;
          } else if (entity.vy < 0) {
            entity.y = tile.y + tile.height;
            entity.vy = 0;
          } else {
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
      return;
    }

    // Apply gravity & clamp terminal velocity
    const ignoresGravity = entity.ignoresGravity || (entity.specs && entity.specs.ignoresGravity);
    if (!ignoresGravity) {
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

    const prevY = entity.y;

    // Horizontal Movement & AABB Collision
    entity.x += entity.vx * dt;
    if (levelManager) {
      const topInset = entity.tempTightGapActive ? 10 : (entity.inWater ? 6 : 2);
      const bottomInset = entity.tempTightGapActive ? 10 : (entity.inWater ? 6 : 2);
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

    // Vertical Movement & Collision Resolution
    const wasGrounded = entity.isGrounded;
    entity.y += entity.vy * dt;
    entity.isGrounded = false;

    if (levelManager) {
      const checkMinY = Math.min(prevY, entity.y);
      const checkMaxY = Math.max(prevY + entity.height, entity.y + entity.height);
      const checkH = checkMaxY - checkMinY;

      const yTiles = levelManager.getSolidTilesInRect(entity.x + 2, checkMinY, entity.width - 4, checkH);
      for (const tile of yTiles) {
        if (tile.type === 2) {
          if (entity.vy > 0) {
            const prevBottom = prevY + entity.height;
            if (prevBottom <= tile.y + 6) {
              entity.y = tile.y - entity.height;
              entity.vy = 0;
              entity.isGrounded = true;
              if (!wasGrounded && typeof entity.onLand === 'function') {
                entity.onLand();
              }
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
            // Entity is mostly above tile -> snap to floor
            entity.y = tile.y - entity.height;
            entity.isGrounded = true;
          } else {
            // Entity is mostly below tile -> snap to ceiling
            entity.y = tile.y + tile.height;
          }
          entity.vy = 0;
        }
      }
    }
  }
}

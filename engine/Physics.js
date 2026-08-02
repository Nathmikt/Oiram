export class Physics {
  constructor() {
    this.gravity = 1800;
    this.friction = 1400;
    this.airAcceleration = 1600;
    this.airFriction = 300;
    this.gravityVector = { x: 0, y: 1 };
  }

  applyPhysics(entity, dt, levelManager) {
    if (entity.inWater) {
      // Water movement with 2px vertical/horizontal insets
      entity.x += entity.vx * dt;
      if (levelManager) {
        const xTiles = levelManager.getSolidTilesInRect(entity.x, entity.y + 2, entity.width, entity.height - 4);
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
          } else if (entity.vy < 0) {
            entity.y = tile.y + tile.height;
            entity.vy = 0;
          }
        }
      }
      return;
    }

    // Apply gravity
    entity.vx += this.gravityVector.x * this.gravity * dt;
    entity.vy += this.gravityVector.y * this.gravity * dt;

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

    // Horizontal Movement & AABB Collision (contract Y by 2px to avoid floor collision overlap)
    entity.x += entity.vx * dt;
    if (levelManager) {
      const xTiles = levelManager.getSolidTilesInRect(entity.x, entity.y + 2, entity.width, entity.height - 4);
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

    // Vertical Movement & AABB Collision (contract X by 2px to avoid wall collision overlap)
    const wasGrounded = entity.isGrounded;
    entity.y += entity.vy * dt;
    entity.isGrounded = false;

    if (levelManager) {
      const yTiles = levelManager.getSolidTilesInRect(entity.x + 2, entity.y, entity.width - 4, entity.height);
      for (const tile of yTiles) {
        if (entity.vy > 0) {
          if (tile.type === 2) {
            const prevBottom = prevY + entity.height;
            if (prevBottom > tile.y + 6) continue;
          }

          entity.y = tile.y - entity.height;
          entity.vy = 0;
          entity.isGrounded = true;

          if (!wasGrounded && typeof entity.onLand === 'function') {
            entity.onLand();
          }
        } else if (entity.vy < 0) {
          if (tile.type === 2) continue;

          entity.y = tile.y + tile.height;
          entity.vy = 0;
        }
      }
    }
  }
}

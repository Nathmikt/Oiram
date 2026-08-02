export class AbilitySystem {
  constructor() {
    this.abilities = {
      wall_climb: this.applyWallClimb.bind(this),
      swim: this.applySwim.bind(this),
      dig: this.applyDig.bind(this)
    };
    this.digCooldown = 0;
  }

  update(player, input, physics, levelManager, inventory, dt) {
    if (!player || !inventory || !levelManager) return;

    player.isWallClimbing = false;
    player.inWater = false;

    if (this.digCooldown > 0) {
      this.digCooldown = Math.max(0, this.digCooldown - dt);
    }

    for (const abilityId of inventory.equipped) {
      const handler = this.abilities[abilityId];
      if (handler) {
        handler(player, input, physics, levelManager, dt);
      }
    }
  }

  applyWallClimb(player, input, physics, levelManager, dt) {
    if (input.isActionHeld()) return;

    const leftCheck = levelManager.getSolidTilesInRect(player.x - 3, player.y + 4, 3, player.height - 8);
    const rightCheck = levelManager.getSolidTilesInRect(player.x + player.width, player.y + 4, 3, player.height - 8);

    const onLeftWall = leftCheck.length > 0;
    const onRightWall = rightCheck.length > 0;

    if ((onLeftWall || onRightWall) && !player.isGrounded && !player.inWater) {
      const pushingWall = (onLeftWall && (input.isDown('ArrowLeft') || input.isDown('KeyA'))) ||
                          (onRightWall && (input.isDown('ArrowRight') || input.isDown('KeyD')));

      if (pushingWall || input.isDown('ArrowUp') || input.isDown('KeyW')) {
        player.isWallClimbing = true;

        if (input.isDown('ArrowUp') || input.isDown('KeyW')) {
          player.vy = -180;
        } else {
          player.vy = Math.min(player.vy, 60);
        }

        if (input.wasPressed('Space')) {
          player.vy = -550;
          player.vx = onLeftWall ? 320 : -320;
          player.isWallClimbing = false;
        }
      }
    }
  }

  applySwim(player, input, physics, levelManager, dt) {
    const sampleX = player.x + player.width / 2;
    const sampleY = player.y + player.height / 2;
    const waterMass = levelManager.getLiquidMassAtWorldPos(sampleX, sampleY);

    if (waterMass > 0.6) {
      player.inWater = true;

      player.vx *= 0.88;
      player.vy *= 0.88;
      player.vy -= physics.gravity * dt * 0.85;

      const swimSpeed = 220;
      if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
        player.vx = -swimSpeed;
      }
      if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
        player.vx = swimSpeed;
      }
      if (input.isDown('ArrowUp') || input.isDown('KeyW') || input.isDown('Space')) {
        player.vy = -swimSpeed;
      }
      if (input.isDown('ArrowDown') || input.isDown('KeyS')) {
        player.vy = swimSpeed;
      }
    } else if (waterMass > 0.05) {
      // Shallow water puddle: drag & 300ms throttled splash particle emission
      player.vx *= 0.95;
      const now = performance.now();
      if (Math.abs(player.vx) > 40 && now - player.lastSplashTime > 300) {
        player.createSplash();
        player.lastSplashTime = now;
      }
    }
  }

  applyDig(player, input, physics, levelManager, dt) {
    if (!input.isActionHeld() || this.digCooldown > 0) return;

    let targetX = player.x + player.width / 2;
    let targetY = player.y + player.height / 2;

    if (input.isDown('ArrowDown') || input.isDown('KeyS')) {
      targetX = player.x + player.width / 2;
      targetY = player.y + player.height + 8;
    } else if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      targetX = player.x - 8;
      targetY = player.y + player.height / 2;
    } else if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
      targetX = player.x + player.width + 8;
      targetY = player.y + player.height / 2;
    } else {
      targetX = player.facing > 0 ? player.x + player.width + 8 : player.x - 8;
      targetY = player.y + player.height / 2;
    }

    const dug = levelManager.setTileAtWorldPos(targetX, targetY, 0);
    if (dug) {
      this.digCooldown = 0.15;
      player.createDust(8);
    }
  }
}

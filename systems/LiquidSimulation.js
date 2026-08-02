export class LiquidSimulation {
  constructor() {
    this.tickTimer = 0;
    this.tickInterval = 0.06; // ~16 ticks/sec
    this.tileSize = 32;
    this.chunkWidth = 32;
    this.chunkHeight = 18;
  }

  addWaterTile(worldX, worldY) {
    // Interface hook for chunk streaming
  }

  wakeUpAdjacent(worldX, worldY, levelManager) {
    if (!levelManager) return;
    this.tickTimer = this.tickInterval;
  }

  update(dt, levelManager) {
    if (!levelManager) return;

    this.tickTimer += dt;
    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer %= this.tickInterval;
      this.tick(levelManager);
    }
  }

  tick(levelManager) {
    if (!levelManager.activeChunks || levelManager.activeChunks.size === 0) return;

    const cW = this.chunkWidth;
    const cH = this.chunkHeight;

    // 1. Snapshot current liquidMass into nextLiquidMass for all active chunks
    for (const chunk of levelManager.activeChunks.values()) {
      if (!chunk.data.nextLiquidMass) {
        chunk.data.nextLiquidMass = new Float32Array(cW * cH);
      }
      chunk.data.nextLiquidMass.set(chunk.data.liquidMass);
    }

    // 2. Perform STRICT DELTA ACCUMULATION mass transfers with MINIMUM FLOW GATE and CHUNK BOUNDARY SAFETY
    for (const chunk of levelManager.activeChunks.values()) {
      const tiles = chunk.data.tiles;
      const currentMass = chunk.data.liquidMass;

      for (let r = 0; r < cH; r++) {
        for (let c = 0; c < cW; c++) {
          const index = r * cW + c;
          let mass = currentMass[index];

          const worldX = chunk.cx * cW * this.tileSize + c * this.tileSize + 16;
          const worldY = chunk.cy * cH * this.tileSize + r * this.tileSize + 16;

          // Clear solid rock cells
          if (tiles[index] === 1 || tiles[index] === 2) {
            levelManager.setNextLiquidMassAtWorldPos(worldX, worldY, 0);
            continue;
          }

          // Skip dry cells
          if (mass < 0.001) {
            continue;
          }

          // RULE 1: Gravity (Down)
          const belowY = worldY + this.tileSize;
          const belowTileType = levelManager.getTileTypeAtWorldPos(worldX, belowY);
          if (belowTileType !== 1 && belowTileType !== 2) {
            const targetNext = levelManager.getNextLiquidMassAtWorldPos(worldX, belowY);
            if (targetNext !== null && targetNext !== undefined) {
              const belowMass = levelManager.getLiquidMassAtWorldPos(worldX, belowY) || 0;
              if (belowMass < 1.0) {
                let flow = Math.min(mass, 1.0 - belowMass);
                if (flow < 0.005) flow = 0; // Minimum Flow Gate

                if (flow > 0) {
                  const centerNext = levelManager.getNextLiquidMassAtWorldPos(worldX, worldY);
                  if (centerNext !== null && centerNext !== undefined) {
                    levelManager.setNextLiquidMassAtWorldPos(worldX, worldY, centerNext - flow);
                    levelManager.setNextLiquidMassAtWorldPos(worldX, belowY, targetNext + flow);
                    mass -= flow;
                  }
                }
              }
            }
          }

          // RULE 2: Horizontal Spread (Left & Right - Unrestricted into Air)
          if (mass > 0.005) {
            const leftX = worldX - this.tileSize;
            const rightX = worldX + this.tileSize;

            const leftType = levelManager.getTileTypeAtWorldPos(leftX, worldY);
            const rightType = levelManager.getTileTypeAtWorldPos(rightX, worldY);

            if (leftType !== 1 && leftType !== 2) {
              const leftNext = levelManager.getNextLiquidMassAtWorldPos(leftX, worldY);
              if (leftNext !== null && leftNext !== undefined) {
                const leftMass = levelManager.getLiquidMassAtWorldPos(leftX, worldY) || 0;
                if (mass > leftMass + 0.01) {
                  let flowLeft = (mass - leftMass) / 3.0;
                  if (flowLeft < 0.005) flowLeft = 0; // Minimum Flow Gate

                  if (flowLeft > 0) {
                    const centerNext = levelManager.getNextLiquidMassAtWorldPos(worldX, worldY);
                    if (centerNext !== null && centerNext !== undefined) {
                      levelManager.setNextLiquidMassAtWorldPos(worldX, worldY, centerNext - flowLeft);
                      levelManager.setNextLiquidMassAtWorldPos(leftX, worldY, leftNext + flowLeft);
                      mass -= flowLeft;
                    }
                  }
                }
              }
            }

            if (rightType !== 1 && rightType !== 2) {
              const rightNext = levelManager.getNextLiquidMassAtWorldPos(rightX, worldY);
              if (rightNext !== null && rightNext !== undefined) {
                const rightMass = levelManager.getLiquidMassAtWorldPos(rightX, worldY) || 0;
                if (mass > rightMass + 0.01) {
                  let flowRight = (mass - rightMass) / 3.0;
                  if (flowRight < 0.005) flowRight = 0; // Minimum Flow Gate

                  if (flowRight > 0) {
                    const centerNext = levelManager.getNextLiquidMassAtWorldPos(worldX, worldY);
                    if (centerNext !== null && centerNext !== undefined) {
                      levelManager.setNextLiquidMassAtWorldPos(worldX, worldY, centerNext - flowRight);
                      levelManager.setNextLiquidMassAtWorldPos(rightX, worldY, rightNext + flowRight);
                      mass -= flowRight;
                    }
                  }
                }
              }
            }
          }

          // RULE 3: Upward Hydrostatic Pressure
          if (mass > 1.0) {
            const aboveY = worldY - this.tileSize;
            const aboveType = levelManager.getTileTypeAtWorldPos(worldX, aboveY);
            if (aboveType !== 1 && aboveType !== 2) {
              const aboveNext = levelManager.getNextLiquidMassAtWorldPos(worldX, aboveY);
              if (aboveNext !== null && aboveNext !== undefined) {
                const aboveMass = levelManager.getLiquidMassAtWorldPos(worldX, aboveY) || 0;
                let excess = (mass - 1.0) * 0.5;
                if (excess < 0.005) excess = 0; // Minimum Flow Gate

                if (excess > 0) {
                  const centerNext = levelManager.getNextLiquidMassAtWorldPos(worldX, worldY);
                  if (centerNext !== null && centerNext !== undefined) {
                    levelManager.setNextLiquidMassAtWorldPos(worldX, worldY, centerNext - excess);
                    levelManager.setNextLiquidMassAtWorldPos(worldX, aboveY, aboveNext + excess);
                    mass -= excess;
                  }
                }
              }
            }
          }
        }
      }
    }

    // 3. Commit Double Buffer (NO mass zeroing, NO active deletion)
    for (const chunk of levelManager.activeChunks.values()) {
      chunk.data.liquidMass.set(chunk.data.nextLiquidMass);
    }
  }
}

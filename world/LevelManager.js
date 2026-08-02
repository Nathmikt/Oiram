import { Enemy } from '../entities/Enemy.js';
import { WorldGenerator } from './WorldGenerator.js';
import { LiquidSimulation } from '../systems/LiquidSimulation.js';

export class LevelManager {
  constructor(seed = 12345) {
    this.worldGenerator = new WorldGenerator(seed);
    this.liquidSimulation = new LiquidSimulation();
    this.tileSize = 32;
    this.chunkWidth = 32;
    this.chunkHeight = 18;
    this.chunkPixelWidth = 1024;
    this.chunkPixelHeight = 576;
    
    this.activeChunks = new Map();
    this.chunkModifications = new Map();
    this.massModifications = new Map();
    this.activeEnemies = [];
    this.currentChunkKey = '0,0';
    this.currentBiome = 'surface';
  }

  async loadWorldData() {
    this.streamChunksAround(0, 0);
  }

  update(playerX, playerY) {
    const currentChunkX = Math.floor(playerX / this.chunkPixelWidth);
    const currentChunkY = Math.floor(playerY / this.chunkPixelHeight);
    const newKey = `${currentChunkX},${currentChunkY}`;

    if (newKey !== this.currentChunkKey || this.activeChunks.size === 0) {
      this.currentChunkKey = newKey;
      this.streamChunksAround(currentChunkX, currentChunkY);

      const currentChunk = this.activeChunks.get(newKey);
      if (currentChunk && currentChunk.data.biome) {
        this.currentBiome = currentChunk.data.biome;
      }
    }
  }

  streamChunksAround(cx, cy) {
    const newActiveKeys = new Set();
    const radius = 1;

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        newActiveKeys.add(key);

        if (!this.activeChunks.has(key)) {
          const chunkData = this.worldGenerator.generateChunk(cx + dx, cy + dy);

          if (this.chunkModifications.has(key)) {
            const mods = this.chunkModifications.get(key);
            for (const [idx, newTileId] of mods.entries()) {
              chunkData.tiles[idx] = newTileId;
            }
          }

          if (this.massModifications.has(key)) {
            const massMods = this.massModifications.get(key);
            for (const [idx, massVal] of massMods.entries()) {
              chunkData.liquidMass[idx] = massVal;
            }
          }

          const chunkOffsetX = (cx + dx) * this.chunkPixelWidth;
          const chunkOffsetY = (cy + dy) * this.chunkPixelHeight;

          const enemies = [];
          if (chunkData.entities) {
            for (const spawner of chunkData.entities) {
              const enemy = new Enemy(chunkOffsetX + spawner.x, chunkOffsetY + spawner.y, spawner.type);
              enemies.push(enemy);
            }
          }

          this.activeChunks.set(key, {
            cx: cx + dx,
            cy: cy + dy,
            data: chunkData,
            enemies: enemies
          });
        }
      }
    }

    for (const key of this.activeChunks.keys()) {
      if (!newActiveKeys.has(key)) {
        this.activeChunks.delete(key);
      }
    }

    this.activeEnemies = [];
    for (const chunk of this.activeChunks.values()) {
      this.activeEnemies.push(...chunk.enemies);
    }
  }

  getLiquidMassAtWorldPos(worldX, worldY) {
    const cx = Math.floor(worldX / this.chunkPixelWidth);
    const cy = Math.floor(worldY / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    const chunk = this.activeChunks.get(chunkKey);
    if (!chunk) {
      return null; // Return null if target chunk is not in active memory
    }

    const localX = worldX - (cx * this.chunkPixelWidth);
    const localY = worldY - (cy * this.chunkPixelHeight);
    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return null;
    }

    const index = tileRow * this.chunkWidth + tileCol;
    return chunk.data.liquidMass[index];
  }

  setLiquidMassAtWorldPos(worldX, worldY, newMass) {
    const cx = Math.floor(worldX / this.chunkPixelWidth);
    const cy = Math.floor(worldY / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    const localX = worldX - (cx * this.chunkPixelWidth);
    const localY = worldY - (cy * this.chunkPixelHeight);
    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return false;
    }

    const tileIndex = tileRow * this.chunkWidth + tileCol;
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) return false;

    chunk.data.liquidMass[tileIndex] = Math.max(0, newMass);

    if (!this.massModifications.has(chunkKey)) {
      this.massModifications.set(chunkKey, new Map());
    }
    this.massModifications.get(chunkKey).set(tileIndex, Math.max(0, newMass));

    return true;
  }

  getNextLiquidMassAtWorldPos(worldX, worldY) {
    const cx = Math.floor(worldX / this.chunkPixelWidth);
    const cy = Math.floor(worldY / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    const chunk = this.activeChunks.get(chunkKey);
    if (!chunk || !chunk.data.nextLiquidMass) {
      return null; // Return null if target chunk is not loaded in memory
    }

    const localX = worldX - (cx * this.chunkPixelWidth);
    const localY = worldY - (cy * this.chunkPixelHeight);
    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return null;
    }

    const index = tileRow * this.chunkWidth + tileCol;
    return chunk.data.nextLiquidMass[index];
  }

  setNextLiquidMassAtWorldPos(worldX, worldY, newMass) {
    const cx = Math.floor(worldX / this.chunkPixelWidth);
    const cy = Math.floor(worldY / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    const localX = worldX - (cx * this.chunkPixelWidth);
    const localY = worldY - (cy * this.chunkPixelHeight);
    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return false;
    }

    const tileIndex = tileRow * this.chunkWidth + tileCol;
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) return false;

    if (!chunk.data.nextLiquidMass) {
      chunk.data.nextLiquidMass = new Float32Array(this.chunkWidth * this.chunkHeight);
      chunk.data.nextLiquidMass.set(chunk.data.liquidMass);
    }

    chunk.data.nextLiquidMass[tileIndex] = Math.max(0, newMass);
    return true;
  }

  getTileTypeAtWorldPos(worldX, worldY) {
    const tile = this.getTileAtWorldPos(worldX, worldY);
    return tile ? tile.type : 0;
  }

  setTileAtWorldPos(worldX, worldY, newTileID) {
    const cx = Math.floor(worldX / this.chunkPixelWidth);
    const cy = Math.floor(worldY / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    const localX = worldX - (cx * this.chunkPixelWidth);
    const localY = worldY - (cy * this.chunkPixelHeight);
    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return false;
    }

    const tileIndex = tileRow * this.chunkWidth + tileCol;
    let chunk = this.activeChunks.get(chunkKey);
    if (!chunk) {
      const chunkData = this.worldGenerator.generateChunk(cx, cy);
      chunk = { cx: cx, cy: cy, data: chunkData, enemies: [] };
      this.activeChunks.set(chunkKey, chunk);
    }

    const currentTileType = chunk.data.tiles[tileIndex];

    if (currentTileType !== 1) {
      return false;
    }

    chunk.data.tiles[tileIndex] = newTileID;

    if (!this.chunkModifications.has(chunkKey)) {
      this.chunkModifications.set(chunkKey, new Map());
    }
    this.chunkModifications.get(chunkKey).set(tileIndex, newTileID);

    if (newTileID === 0) {
      const sampleX = cx * this.chunkPixelWidth + tileCol * this.tileSize;
      const sampleY = cy * this.chunkPixelHeight + tileRow * this.tileSize;
      this.liquidSimulation.wakeUpAdjacent(sampleX, sampleY, this);
    }

    return true;
  }

  getTileAtWorldPos(x, y) {
    const cx = Math.floor(x / this.chunkPixelWidth);
    const cy = Math.floor(y / this.chunkPixelHeight);
    const chunkKey = `${cx},${cy}`;

    let chunk = this.activeChunks.get(chunkKey);
    
    if (!chunk) {
      const chunkData = this.worldGenerator.generateChunk(cx, cy);

      if (this.chunkModifications.has(chunkKey)) {
        const mods = this.chunkModifications.get(chunkKey);
        for (const [idx, newTileId] of mods.entries()) {
          chunkData.tiles[idx] = newTileId;
        }
      }

      chunk = {
        cx: cx,
        cy: cy,
        data: chunkData,
        enemies: []
      };
    }

    const localX = x - (cx * this.chunkPixelWidth);
    const localY = y - (cy * this.chunkPixelHeight);

    const tileCol = Math.floor(localX / this.tileSize);
    const tileRow = Math.floor(localY / this.tileSize);

    if (tileCol < 0 || tileCol >= this.chunkWidth || tileRow < 0 || tileRow >= this.chunkHeight) {
      return { type: 0 };
    }

    const index = tileRow * this.chunkWidth + tileCol;
    const tileType = chunk.data.tiles[index] || 0;

    return {
      type: tileType,
      x: cx * this.chunkPixelWidth + tileCol * this.tileSize,
      y: cy * this.chunkPixelHeight + tileRow * this.tileSize,
      width: this.tileSize,
      height: this.tileSize
    };
  }

  getTilesInRect(rectX, rectY, rectW, rectH, tileTypeFilter = null) {
    const matchingTiles = [];

    const startCol = Math.floor(rectX / this.tileSize);
    const endCol = Math.floor((rectX + rectW - 0.01) / this.tileSize);
    const startRow = Math.floor(rectY / this.tileSize);
    const endRow = Math.floor((rectY + rectH - 0.01) / this.tileSize);

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const sampleX = c * this.tileSize + 16;
        const sampleY = r * this.tileSize + 16;
        const tile = this.getTileAtWorldPos(sampleX, sampleY);

        if (tile.type > 0) {
          if (tileTypeFilter !== null && tile.type !== tileTypeFilter) continue;
          matchingTiles.push(tile);
        }
      }
    }

    return matchingTiles;
  }

  getSolidTilesInRect(rectX, rectY, rectW, rectH) {
    return this.getTilesInRect(rectX, rectY, rectW, rectH).filter(t => t.type === 1 || t.type === 2);
  }

  getHazardTilesInRect(rectX, rectY, rectW, rectH) {
    return this.getTilesInRect(rectX, rectY, rectW, rectH, 4);
  }
}

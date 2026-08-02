// Fast, seeded 2D Simplex Noise implementation
class SimplexNoise {
  constructor(seed = 12345) {
    const prng = this.mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(prng() * 256);
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  mulberry32(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  noise2D(xin, yin) {
    const grad3 = [
      [1,1],[-1,1],[1,-1],[-1,-1],
      [1,0],[-1,0],[0,1],[0,-1],
      [1,1],[-1,1],[1,-1],[-1,-1]
    ];
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0*x0 - y0*y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1*x1 - y1*y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2*x2 - y2*y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

export class WorldGenerator {
  constructor(seed = 12345) {
    this.seed = seed;
    this.simplex = new SimplexNoise(seed);
    this.chunkWidth = 32;
    this.chunkHeight = 18;
    this.tileSize = 32;
  }

  generateChunk(cx, cy) {
    const totalTiles = this.chunkWidth * this.chunkHeight;
    const tiles = new Uint8Array(totalTiles);
    const liquidMass = new Float32Array(totalTiles);
    const entities = [];
    let biome = 'surface';

    if (cy > 0 && cy <= 1) {
      biome = 'subterranean';
    } else if (cy > 1) {
      biome = 'deep_cave';
    }

    for (let r = 0; r < this.chunkHeight; r++) {
      for (let c = 0; c < this.chunkWidth; c++) {
        const absX = cx * this.chunkWidth + c;
        const absY = cy * this.chunkHeight + r;
        const index = r * this.chunkWidth + c;

        if (cy <= 0) {
          // --- SURFACE GENERATION ---
          const n1 = this.simplex.noise2D(absX * 0.02, 0);
          const n2 = this.simplex.noise2D(absX * 0.06, 5) * 0.4;
          const surfaceRow = Math.floor(12 + (n1 + n2) * 3);

          if (absY > surfaceRow) {
            tiles[index] = 1; // Solid surface ground
          } else if (absY === surfaceRow - 2 && (Math.abs(absX) % 11 === 0)) {
            tiles[index] = 2; // Floating platform
          } else {
            tiles[index] = 0; // Air
          }
        } else {
          // --- SUBTERRANEAN & DEEP CAVE GENERATION ---
          const caveNoise = this.simplex.noise2D(absX * 0.05, absY * 0.05);
          const isBottomFloor = (r >= 16);

          if (isBottomFloor) {
            tiles[index] = 1; // Solid cavern floor base
          } else {
            const isShaftX = (Math.abs(absX) % 28 >= 14 && Math.abs(absX) % 28 <= 16);
            const isShaftY = (r >= 2 && r <= 14);
            const isShaft = isShaftX && isShaftY && (cy % 2 === 1);

            if (isShaft) {
              tiles[index] = 0; // Bounded vertical shaft
            } else if (caveNoise > 0.15) {
              // Open cave chamber
              if (cy >= 2 && r >= 8 && r <= 15 && caveNoise > 0.35) {
                tiles[index] = 0; // Air space
                liquidMass[index] = 1.0; // Mass-based fluid volume
              } else {
                tiles[index] = 0; // Air
              }
            } else {
              tiles[index] = 1; // Solid cave rock
            }
          }
        }
      }
    }

    // Deterministic Enemy Spawning
    const chunkSeed = (cx * 73856093) ^ (cy * 19349663) ^ this.seed;
    const enemyPRNG = this.simplex.mulberry32(chunkSeed)();

    if (enemyPRNG > 0.55) {
      const spawnCol = Math.floor(enemyPRNG * (this.chunkWidth - 4)) + 2;
      for (let r = 2; r < this.chunkHeight - 1; r++) {
        const idx = r * this.chunkWidth + spawnCol;
        const belowIdx = (r + 1) * this.chunkWidth + spawnCol;
        if (tiles[idx] === 0 && liquidMass[idx] === 0 && tiles[belowIdx] === 1) {
          entities.push({
            type: enemyPRNG > 0.75 ? 'Spitter' : 'Crawler',
            x: spawnCol * this.tileSize + 4,
            y: r * this.tileSize
          });
          break;
        }
      }
    }

    return {
      biome: biome,
      tiles: tiles,
      liquidMass: liquidMass,
      entities: entities
    };
  }
}

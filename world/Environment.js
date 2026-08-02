export class Environment {
  constructor(levelManager) {
    this.levelManager = levelManager;
    this.spores = [];
    this.clouds = [];
    this.initAmbientParticles();
  }

  initAmbientParticles() {
    const wispColors = ['#a8e6cf', '#ffd3b6', '#dcedc1'];
    // Rule of thumb: lower total number (16 wisps) with wide spawn perimeter
    const wispCount = 16;
    for (let i = 0; i < wispCount; i++) {
      this.spores.push({
        x: (Math.random() - 0.5) * 3000,
        y: Math.random() * 1800,
        baseY: Math.random() * 1800,
        radius: Math.random() * 1.5 + 1.0,
        speedX: (Math.random() - 0.5) * 12,
        speedY: (Math.random() - 0.5) * 8,
        floatFreq: Math.random() * 1.8 + 0.8,
        floatAmp: Math.random() * 14 + 6,
        alpha: 0,
        color: wispColors[Math.floor(Math.random() * wispColors.length)],
        life: Math.random() * 12 + 6,
        maxLife: Math.random() * 12 + 6
      });
    }

    for (let i = 0; i < 10; i++) {
      this.clouds.push({
        x: (Math.random() - 0.5) * 4000,
        y: Math.random() * 200 - 100,
        width: Math.random() * 120 + 80,
        height: Math.random() * 30 + 20,
        speed: Math.random() * 15 + 5
      });
    }
  }

  update(dt, camera = null) {
    const time = performance.now() / 1000;
    const camX = camera && Number.isFinite(camera.x) ? camera.x : 0;
    const camY = camera && Number.isFinite(camera.y) ? camera.y : 0;
    const camW = camera && Number.isFinite(camera.width) ? camera.width : 1024;
    const camH = camera && Number.isFinite(camera.height) ? camera.height : 576;

    // Wide spawn perimeter margin (800px) around camera viewport
    const padding = 800;

    for (const s of this.spores) {
      s.x += s.speedX * dt;
      s.baseY += s.speedY * dt;
      s.y = s.baseY + Math.sin(time * s.floatFreq + s.x * 0.008) * s.floatAmp;

      s.life -= dt;

      // Recycle if life expires or drifts far outside wide perimeter
      if (
        s.life <= 0 ||
        s.x < camX - padding ||
        s.x > camX + camW + padding ||
        s.y < camY - padding ||
        s.y > camY + camH + padding
      ) {
        s.life = Math.random() * 12 + 6;
        s.maxLife = s.life;
        // Spawn in wide off-screen perimeter around camera
        s.x = camX - (padding - 100) + Math.random() * (camW + (padding - 100) * 2);
        s.baseY = camY - (padding - 100) + Math.random() * (camH + (padding - 100) * 2);
        s.y = s.baseY;
      }

      // Smooth fade in -> linger -> fade out envelope
      const progress = 1 - (s.life / s.maxLife);
      if (progress < 0.25) {
        s.alpha = (progress / 0.25) * 0.75;
      } else if (progress > 0.75) {
        s.alpha = ((1 - progress) / 0.25) * 0.75;
      } else {
        s.alpha = 0.75;
      }
    }

    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > camX + camW + 1000) c.x = camX - 1000;
    }
  }

  drawLuminousLightPass(ctx, camera) {
    const biome = this.levelManager.currentBiome || 'surface';
    if (biome === 'surface') return;

    const camX = Number.isFinite(camera.x) ? camera.x : 0;
    const camY = Number.isFinite(camera.y) ? camera.y : 0;
    const camW = Number.isFinite(camera.width) ? camera.width : 800;
    const camH = Number.isFinite(camera.height) ? camera.height : 600;

    for (const s of this.spores) {
      const screenX = s.x - camX;
      const screenY = s.y - camY;

      if (
        screenX < -120 ||
        screenX > camW + 120 ||
        screenY < -120 ||
        screenY > camH + 120
      ) {
        continue;
      }

      const lightGrad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, 50);
      lightGrad.addColorStop(0, `rgba(255, 255, 255, ${s.alpha * 0.7})`);
      lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = lightGrad;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 50, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLuminousCores(ctx, camera) {
    const biome = this.levelManager.currentBiome || 'surface';
    if (biome === 'surface') return;

    const camX = Number.isFinite(camera.x) ? camera.x : 0;
    const camY = Number.isFinite(camera.y) ? camera.y : 0;
    const camW = Number.isFinite(camera.width) ? camera.width : 800;
    const camH = Number.isFinite(camera.height) ? camera.height : 600;

    for (const s of this.spores) {
      const sx = Number.isFinite(s.x) ? s.x : 0;
      const sy = Number.isFinite(s.y) ? s.y : 0;

      if (
        sx < camX - 60 ||
        sx > camX + camW + 60 ||
        sy < camY - 60 ||
        sy > camY + camH + 60
      ) {
        continue;
      }

      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  draw(ctx, camera) {
    if (!this.levelManager || !this.levelManager.activeChunks) return;

    const biome = this.levelManager.currentBiome || 'surface';

    const camX = Number.isFinite(camera.x) ? camera.x : 0;
    const camY = Number.isFinite(camera.y) ? camera.y : 0;
    const camW = Number.isFinite(camera.width) ? camera.width : 800;
    const camH = Number.isFinite(camera.height) ? camera.height : 600;

    ctx.save();

    // Biome Parallax Background
    if (biome === 'surface') {
      const skyGrad = ctx.createLinearGradient(0, camY, 0, camY + camH);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(camX, camY, camW, camH);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (const c of this.clouds) {
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.width, c.height, 12);
        ctx.fill();
      }
    } else if (biome === 'subterranean') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(camX, camY, camW, camH);
    } else if (biome === 'deep_cave') {
      ctx.fillStyle = '#05070c';
      ctx.fillRect(camX, camY, camW, camH);
    }

    // Render active chunk tiles (Solids, Platforms, Hazards)
    for (const [key, chunk] of this.levelManager.activeChunks.entries()) {
      const chunkOffsetX = chunk.cx * this.levelManager.chunkPixelWidth;
      const chunkOffsetY = chunk.cy * this.levelManager.chunkPixelHeight;

      if (
        chunkOffsetX + this.levelManager.chunkPixelWidth < camX ||
        chunkOffsetX > camX + camW ||
        chunkOffsetY + this.levelManager.chunkPixelHeight < camY ||
        chunkOffsetY > camY + camH
      ) {
        continue;
      }

      const tiles = chunk.data.tiles;
      const tileSize = this.levelManager.tileSize;
      const cW = this.levelManager.chunkWidth;
      const cH = this.levelManager.chunkHeight;

      for (let r = 0; r < cH; r++) {
        for (let c = 0; c < cW; c++) {
          const index = r * cW + c;
          const tileType = tiles[index];
          if (!tileType || tileType === 0) continue;

          const tileX = chunkOffsetX + c * tileSize;
          const tileY = chunkOffsetY + r * tileSize;

          if (tileType === 1) {
            ctx.fillStyle = chunk.data.biome === 'surface' ? '#22303c' : '#141824';
            ctx.fillRect(tileX, tileY, tileSize, tileSize);

            const topTile = (r > 0) ? tiles[(r - 1) * cW + c] : 0;
            if (topTile === 0) {
              ctx.fillStyle = chunk.data.biome === 'surface' ? '#3a6659' : '#2a3b59';
              ctx.fillRect(tileX, tileY, tileSize, 4);
            }

            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(tileX, tileY, tileSize, tileSize);
          } else if (tileType === 2) {
            ctx.fillStyle = '#475569';
            ctx.fillRect(tileX, tileY, tileSize, 8);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(tileX, tileY, tileSize, 2);
          } else if (tileType === 4) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(tileX, tileY + tileSize);
            ctx.lineTo(tileX + tileSize / 2, tileY);
            ctx.lineTo(tileX + tileSize, tileY + tileSize);
            ctx.fill();
          }
        }
      }

      // Hardware-Accelerated Water Renderer (No ctx.stroke)
      const liquidMass = chunk.data.liquidMass;
      if (liquidMass) {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 100, 165, 0.68)';

        for (let r = 0; r < cH; r++) {
          for (let c = 0; c < cW; c++) {
            const index = r * cW + c;
            const mass = liquidMass[index];
            if (mass < 0.001) continue;

            const tileX = chunkOffsetX + c * tileSize;
            const tileY = chunkOffsetY + r * tileSize;
            const bottomY = tileY + tileSize;
            const topMass = (r > 0) ? liquidMass[(r - 1) * cW + c] : 0;

            if (mass >= 0.95 || topMass > 0.05) {
              ctx.fillRect(tileX, tileY, tileSize, tileSize);
            } else {
              const curH = Math.min(1.0, mass) * tileSize;
              const leftMass = (c > 0) ? liquidMass[index - 1] : 0;
              const rightMass = (c < cW - 1) ? liquidMass[index + 1] : 0;

              const leftH = (leftMass > 0.001) ? Math.min(1.0, leftMass) * tileSize : curH;
              const rightH = (rightMass > 0.001) ? Math.min(1.0, rightMass) * tileSize : curH;

              const curTopY = bottomY - curH;
              const leftTopY = bottomY - (curH + leftH) / 2;
              const rightTopY = bottomY - (curH + rightH) / 2;

              ctx.beginPath();
              ctx.moveTo(tileX, leftTopY);
              ctx.lineTo(tileX + tileSize / 2, curTopY);
              ctx.lineTo(tileX + tileSize, rightTopY);
              ctx.lineTo(tileX + tileSize, bottomY);
              ctx.lineTo(tileX, bottomY);
              ctx.fill();
            }
          }
        }

        ctx.restore();
      }
    }

    ctx.restore();
  }
}

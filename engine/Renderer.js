export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth || 1024;
    this.canvas.height = window.innerHeight || 576;
    this.viewportWidth = this.canvas.width;
    this.viewportHeight = this.canvas.height;

    if (this.lightCanvas) {
      this.lightCanvas.width = this.canvas.width;
      this.lightCanvas.height = this.canvas.height;
    }
  }

  render(camera, environment, levelManager, player, enemies, health) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const camX = Number.isFinite(camera?.x) ? camera.x : 0;
    const camY = Number.isFinite(camera?.y) ? camera.y : 0;
    const camW = Number.isFinite(camera?.width) ? camera.width : this.canvas.width;
    const camH = Number.isFinite(camera?.height) ? camera.height : this.canvas.height;

    // Clear viewport background
    ctx.fillStyle = '#06080d';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    // Camera Transform for World Render Pass
    ctx.translate(-Math.floor(camX), -Math.floor(camY));

    // 1. Draw World & Environment (Backgrounds, Solids, Platforms, Water)
    if (environment) environment.draw(ctx, camera);

    // 2. Draw Entities (Enemies & Player)
    if (Array.isArray(enemies)) {
      for (const enemy of enemies) {
        if (enemy && typeof enemy.draw === 'function') {
          enemy.draw(ctx);
        }
      }
    }

    if (player && typeof player.draw === 'function') {
      player.draw(ctx);
    }

    // 3. Dynamic Depth Darkness Overlay via Offscreen Destination-Out Light Mask
    if (player && this.lightCtx) {
      const pY = Number.isFinite(player.y) ? player.y : 300;
      const surfaceDepth = 300;
      const transitionDistance = 1500;
      const darknessAlpha = Math.min(0.95, Math.max(0.0, (pY - surfaceDepth) / transitionDistance));

      if (darknessAlpha > 0.01) {
        const lCtx = this.lightCtx;
        const lW = this.lightCanvas.width;
        const lH = this.lightCanvas.height;

        // Clear offscreen light canvas
        lCtx.clearRect(0, 0, lW, lH);

        // Step A: Fill offscreen canvas with depth darkness
        lCtx.fillStyle = `rgba(5, 7, 12, ${darknessAlpha})`;
        lCtx.fillRect(0, 0, lW, lH);

        // Step B: Set destination-out to erase darkness in screen coordinates
        lCtx.globalCompositeOperation = 'destination-out';

        // Player Soft Radial Light Hole (Screen Coordinates)
        const playerScreenX = (Number.isFinite(player.x) ? player.x + player.width / 2 : 100) - camX;
        const playerScreenY = (pY + player.height / 2) - camY;
        const lightRadius = 260;

        const playerLightGrad = lCtx.createRadialGradient(
          playerScreenX, playerScreenY, 0,
          playerScreenX, playerScreenY, lightRadius
        );

        if (player.inWater) {
          playerLightGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          playerLightGrad.addColorStop(0.5, 'rgba(200, 240, 255, 0.7)');
          playerLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else if (player.isWallClimbing) {
          playerLightGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          playerLightGrad.addColorStop(0.5, 'rgba(255, 220, 180, 0.7)');
          playerLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          playerLightGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          playerLightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
          playerLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        }

        lCtx.fillStyle = playerLightGrad;
        lCtx.beginPath();
        lCtx.arc(playerScreenX, playerScreenY, lightRadius, 0, Math.PI * 2);
        lCtx.fill();

        // Enemy Radial Light Holes (Screen Coordinates)
        if (Array.isArray(enemies)) {
          for (const enemy of enemies) {
            if (!enemy) continue;
            const enemyScreenX = (Number.isFinite(enemy.x) ? enemy.x + enemy.width / 2 : 0) - camX;
            const enemyScreenY = (Number.isFinite(enemy.y) ? enemy.y + enemy.height / 2 : 0) - camY;
            const enemyLightGrad = lCtx.createRadialGradient(
              enemyScreenX, enemyScreenY, 0,
              enemyScreenX, enemyScreenY, 110
            );
            enemyLightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
            enemyLightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            lCtx.fillStyle = enemyLightGrad;
            lCtx.beginPath();
            lCtx.arc(enemyScreenX, enemyScreenY, 110, 0, Math.PI * 2);
            lCtx.fill();
          }
        }

        // Luminous Wisp Light Pass (Screen Coordinates)
        if (environment && typeof environment.drawLuminousLightPass === 'function') {
          environment.drawLuminousLightPass(lCtx, camera);
        }

        // Step C: Reset composite mode back to normal
        lCtx.globalCompositeOperation = 'source-over';

        // Step D: Draw offscreen darkness light mask over world canvas in world coordinates
        ctx.drawImage(this.lightCanvas, camX, camY);
      }

      // Render solid core dots for luminous wisps inside light pockets
      if (environment && typeof environment.drawLuminousCores === 'function') {
        environment.drawLuminousCores(ctx, camera);
      }
    }

    ctx.restore();

    // 4. Render Invulnerability Flash Overlay
    if (health && health.invulnerableTimer > 0) {
      if (Math.floor(performance.now() / 100) % 2 === 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }
}

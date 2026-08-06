import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { Physics } from './Physics.js';
import { Renderer } from './Renderer.js';
import { Player } from '../entities/Player.js';
import { LevelManager } from '../world/LevelManager.js';
import { Environment } from '../world/Environment.js';
import { Inventory } from '../systems/Inventory.js';
import { AbilitySystem } from '../systems/AbilitySystem.js';
import { Health } from '../systems/Health.js';

export class GameLoop {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input();
    this.camera = new Camera(this.renderer.viewportWidth, this.renderer.viewportHeight);
    this.physics = new Physics();
    this.player = new Player(200, 200);

    this.levelManager = new LevelManager(12345);
    this.environment = new Environment(this.levelManager);

    this.inventory = new Inventory();
    this.abilitySystem = new AbilitySystem();
    
    this.health = new Health(100, () => {
      this.player.resetToSpawn();
    });

    this.camera.follow(this.player);

    window.addEventListener('resize', () => {
      if (this.camera && this.renderer) {
        this.camera.width = this.renderer.viewportWidth;
        this.camera.height = this.renderer.viewportHeight;
      }
    });

    this.lastTime = 0;
    this.isRunning = false;
  }

  async init() {
    await this.levelManager.loadWorldData();
    this.start();
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(currentTime) {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    // Hotkey listening for inventory equipment
    if (this.input.wasPressed('Digit1')) this.inventory.toggle('wall_climb');
    if (this.input.wasPressed('Digit2')) this.inventory.toggle('swim');
    if (this.input.wasPressed('Digit3')) this.inventory.toggle('dig');

    // Variable jump height control
    const isJumpHeld = this.input.isDown('Space') || this.input.isDown('ArrowUp') || this.input.isDown('KeyW');
    if (!isJumpHeld && this.player.vy < -200 && !this.player.inWater) {
      this.player.vy *= 0.5;
    }

    // Spatial level streaming & dynamic fluid simulation
    this.levelManager.update(this.player.x, this.player.y);
    this.levelManager.liquidSimulation.update(dt, this.levelManager);
    this.environment.update(dt, this.camera);

    // Hazard spike collision check (Tile ID 4)
    const hazards = this.levelManager.getHazardTilesInRect(this.player.x, this.player.y, this.player.width, this.player.height);
    if (hazards.length > 0) {
      const tookDamage = this.health.takeDamage(25);
      if (tookDamage) {
        this.player.vy = -300;
      }
    }

    // Update active enemies & AI patrolling & physics
    if (Array.isArray(this.levelManager.activeEnemies)) {
      for (const enemy of this.levelManager.activeEnemies) {
        if (enemy.isDead) {
          enemy.update(dt, this.levelManager, this.player);
          continue;
        }

        // 1. AI Behavior Execution
        enemy.update(dt, this.levelManager, this.player);

        // 2. Physics & AABB Terrain Integration
        this.physics.applyPhysics(enemy, dt, this.levelManager);

        // 3. Player vs Enemy AABB Collision & Stomp Combat
        if (
          this.player.x < enemy.x + enemy.width &&
          this.player.x + this.player.width > enemy.x &&
          this.player.y < enemy.y + enemy.height &&
          this.player.y + this.player.height > enemy.y
        ) {
          const playerBottom = this.player.y + this.player.height;
          const isStomp = this.player.vy > 0 && playerBottom - (this.player.vy * dt) <= enemy.y + 14;

          if (isStomp) {
            enemy.takeDamage(1);
            this.player.vy = -380;
            this.player.scaleX = 0.8;
            this.player.scaleY = 1.2;
            this.player.createDust(4);
          } else {
            const tookDamage = this.health.takeDamage(enemy.damage);
            if (tookDamage) {
              const pushDir = this.player.x < enemy.x ? -1 : 1;
              this.player.vx = pushDir * 320;
              this.player.vy = -260;
            }
          }
        }

        // 4. Enemy Projectiles vs Player Collision
        if (enemy.behavior && Array.isArray(enemy.behavior.projectiles)) {
          for (let i = enemy.behavior.projectiles.length - 1; i >= 0; i--) {
            const p = enemy.behavior.projectiles[i];
            if (
              p.x + p.radius > this.player.x &&
              p.x - p.radius < this.player.x + this.player.width &&
              p.y + p.radius > this.player.y &&
              p.y - p.radius < this.player.y + this.player.height
            ) {
              const tookDamage = this.health.takeDamage(p.damage);
              if (tookDamage) {
                const pushDir = this.player.x < p.x ? -1 : 1;
                this.player.vx = pushDir * 280;
                this.player.vy = -200;
              }
              enemy.behavior.projectiles.splice(i, 1);
            }
          }
        }
      }

      this.levelManager.removeDeadEnemies();
    }


    // Ability component system & physics updates
    this.player.handleInput(this.input);
    this.abilitySystem.update(
      this.player,
      this.input,
      this.physics,
      this.levelManager,
      this.inventory,
      dt
    );

    this.physics.applyPhysics(this.player, dt, this.levelManager);
    this.player.update(dt);
    this.health.update(dt);
    this.player.invulnerable = this.health.invulnerableTimer > 0;

    this.camera.update();

    // Render Phase
    this.renderer.render(
      this.camera,
      this.environment,
      this.levelManager,
      this.player,
      this.levelManager.activeEnemies,
      this.health
    );

    this.input.clear();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Auto-start game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const game = new GameLoop();
  game.init();
});

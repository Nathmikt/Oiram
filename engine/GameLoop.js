import { Input } from './Input.js';
import { Camera } from './Camera.js';
import { Physics } from './Physics.js';
import { Renderer } from './Renderer.js';
import { TextureManager } from './TextureManager.js';
import { Player } from '../entities/Player.js';
import { LevelManager } from '../world/LevelManager.js';
import { Environment } from '../world/Environment.js';
import { Inventory } from '../systems/Inventory.js';
import { AbilitySystem } from '../systems/AbilitySystem.js';
import { Health } from '../systems/Health.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';

export class GameLoop {
  constructor() {
    this.textureManager = new TextureManager();
    this.canvas = document.getElementById('game');
    this.renderer = new Renderer(this.canvas);
    this.input = new Input();
    this.camera = new Camera(this.renderer.viewportWidth, this.renderer.viewportHeight);
    this.physics = new Physics();
    this.player = new Player(200, 200);

    // Seed Resolution: Check URL query parameter '?seed=XYZ', otherwise generate random seed
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('seed');
    const seed = (seedParam !== null && !isNaN(parseInt(seedParam, 10)))
      ? parseInt(seedParam, 10)
      : Math.floor(Math.random() * 1000000000);

    this.seed = seed;
    this.levelManager = new LevelManager(this.seed);
    this.environment = new Environment(this.levelManager);

    this.inventory = new Inventory();
    this.abilitySystem = new AbilitySystem();
    this.particleSystem = new ParticleSystem();
    
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
    this.textureManager.load('player', 'assets/player/player_idle.png');
    this.textureManager.load('player_idle', 'assets/player/player_idle.png');
    this.textureManager.load('player_left_1', 'assets/player/player_left_1.png');
    this.textureManager.load('player_left_2', 'assets/player/player_left_2.png');
    this.textureManager.load('player_right_1', 'assets/player/player_right_1.png');
    this.textureManager.load('player_right_2', 'assets/player/player_right_2.png');
    this.textureManager.load('player_left_jump', 'assets/player/player_left_jump.png');
    this.textureManager.load('player_right_jump', 'assets/player/player_right_jump.png');
    this.textureManager.load('player_left_swim', 'assets/player/player_left_swim.png');
    this.textureManager.load('player_right_swim', 'assets/player/player_right_swim.png');
    this.textureManager.load('player_left_wall_hang', 'assets/player/player_left_wall_hang.png');
    this.textureManager.load('player_right_wall_hang', 'assets/player/player_right_wall_hang.png');
    this.textureManager.load('player_swim_down', 'assets/player/player_swim_down.png');

    this.textureManager.load('sky_evening', 'assets/sky/Sky_Evening2.png');
    this.textureManager.load('sky_night', 'assets/sky/Sky_Night.png');

    this.textureManager.load('swimmer_idle', 'assets/enemies/water/water_enemy_idle.png');
    this.textureManager.load('swimmer_swim_left1', 'assets/enemies/water/water_enemy_swim_left.png');
    this.textureManager.load('swimmer_swim_left2', 'assets/enemies/water/water_enemy_swim_left2.png');
    this.textureManager.load('swimmer_swim_right1', 'assets/enemies/water/water_enemy_swim_right.png');
    this.textureManager.load('swimmer_swim_right2', 'assets/enemies/water/water_enemy_swim_right2.png');

    this.textureManager.load('aggro_red_slime_idle', 'assets/enemies/ground/aggressive/aggressive_red_slime_idle.png');
    this.textureManager.load('aggro_red_slime_walk_left1', 'assets/enemies/ground/aggressive/aggressive_red_walk_left.png');
    this.textureManager.load('aggro_red_slime_walk_left2', 'assets/enemies/ground/aggressive/aggressive_red_walk_left2.png');
    this.textureManager.load('aggro_red_slime_walk_right1', 'assets/enemies/ground/aggressive/aggressive_red_walk_right.png');
    this.textureManager.load('aggro_red_slime_walk_right2', 'assets/enemies/ground/aggressive/aggressive_red_walk_right2.png');
    this.textureManager.load('tileset', 'assets/tiles/tileset.png');
    await this.textureManager.ready();
    await this.inventory.init();
    await this.levelManager.loadWorldData();
    console.log(`[World] Seed loaded: ${this.seed}`);
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
    if (this.input.wasPressed('Digit1')) this.inventory.toggle('sprint');
    if (this.input.wasPressed('Digit2')) this.inventory.toggle('wall_climb');
    if (this.input.wasPressed('Digit3')) this.inventory.toggle('swim');
    if (this.input.wasPressed('Digit4')) this.inventory.toggle('dig');

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
      dt,
      this.particleSystem
    );

    this.physics.applyPhysics(this.player, dt, this.levelManager);
    this.player.update(dt);
    this.health.update(dt);
    this.particleSystem.update(dt);
    this.player.invulnerable = this.health.invulnerableTimer > 0;

    this.camera.update();

    // Render Phase
    this.renderer.render(
      this.camera,
      this.environment,
      this.levelManager,
      this.player,
      this.levelManager.activeEnemies,
      this.health,
      this.textureManager,
      this.particleSystem
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

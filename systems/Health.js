export class Health {
  constructor(maxHealth = 100, onRespawn = null) {
    this.maxHealth = maxHealth;
    this.currentHealth = maxHealth;
    this.lives = 3;
    this.invulnerableTimer = 0;
    this.onRespawn = onRespawn;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return false;

    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.invulnerableTimer = 1.2; // Seconds of invulnerability

    if (this.currentHealth <= 0) {
      this.respawn();
    }
    return true;
  }

  heal(amount) {
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
  }

  respawn() {
    this.lives = Math.max(0, this.lives - 1);
    this.currentHealth = this.maxHealth;
    this.invulnerableTimer = 2.0;

    if (typeof this.onRespawn === 'function') {
      this.onRespawn();
    }
  }

  update(dt) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  }
}

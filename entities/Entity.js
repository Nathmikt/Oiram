export class Entity {
  constructor(x = 0, y = 0, width = 32, height = 32) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.vx = 0;
    this.vy = 0;
    this.ax = 0;
    this.isGrounded = false;
  }

  update(dt) {
    // Override in subclass
  }

  draw(ctx) {
    // Override in subclass
  }
}

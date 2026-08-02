export class Camera {
  constructor(width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.target = null;
    this.lerp = 0.1;
  }

  follow(target) {
    this.target = target;
  }

  update() {
    if (!this.target) return;
    const targetX = this.target.x + this.target.width / 2 - this.width / 2;
    const targetY = this.target.y + this.target.height / 2 - this.height / 2;
    
    this.x += (targetX - this.x) * this.lerp;
    this.y += (targetY - this.y) * this.lerp;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}

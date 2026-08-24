export class Sprite {
  constructor({ image, frameWidth, frameHeight, animations = {} }) {
    this.image = image;
    this.frameWidth = frameWidth || (image ? image.width : 0);
    this.frameHeight = frameHeight || (image ? image.height : 0);
    this.animations = animations;
    this.currentAnimation = null;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDuration = 0.1;
  }

  setAnimation(name) {
    if (this.currentAnimation !== name && this.animations[name]) {
      this.currentAnimation = name;
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }

  update(dt) {
    if (!this.currentAnimation || !this.animations[this.currentAnimation]) return;
    const anim = this.animations[this.currentAnimation];
    this.frameTimer += dt;
    const speed = anim.speed || this.frameDuration;
    if (this.frameTimer >= speed) {
      this.frameTimer -= speed;
      this.currentFrame = (this.currentFrame + 1) % anim.frames.length;
    }
  }

  draw(ctx, x, y, width = null, height = null, flipX = false) {
    if (!this.image) return;

    let frameIndex = 0;
    if (this.currentAnimation && this.animations[this.currentAnimation]) {
      frameIndex = this.animations[this.currentAnimation].frames[this.currentFrame];
    }

    const cols = Math.max(1, Math.floor(this.image.width / (this.frameWidth || this.image.width)));
    const sx = (frameIndex % cols) * this.frameWidth;
    const sy = Math.floor(frameIndex / cols) * this.frameHeight;
    const sW = this.frameWidth || this.image.width;
    const sH = this.frameHeight || this.image.height;
    const dW = width !== null ? width : sW;
    const dH = height !== null ? height : sH;

    ctx.save();
    if (flipX) {
      ctx.translate(x + dW, y);
      ctx.scale(-1, 1);
      ctx.drawImage(this.image, sx, sy, sW, sH, 0, 0, dW, dH);
    } else {
      ctx.drawImage(this.image, sx, sy, sW, sH, x, y, dW, dH);
    }
    ctx.restore();
  }
}

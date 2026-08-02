export class Input {
  constructor() {
    this.keys = new Map();
    this.justPressed = new Set();

    window.addEventListener('keydown', (e) => {
      if (!this.keys.get(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });
  }

  isDown(code) {
    return !!this.keys.get(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  isActionHeld() {
    return (
      this.isDown('ShiftLeft') ||
      this.isDown('ShiftRight') ||
      this.isDown('KeyC') ||
      this.isDown('KeyE') ||
      this.isDown('KeyJ')
    );
  }

  clear() {
    this.justPressed.clear();
  }
}

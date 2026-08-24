export class TextureManager {
  constructor() {
    this.textures = new Map();
    this.promises = [];
  }

  load(name, src) {
    const promise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.textures.set(name, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load texture: ${name} from ${src}`);
        this.textures.set(name, null);
        resolve(null);
      };
      img.src = src;
    });
    this.promises.push(promise);
    return promise;
  }

  get(name) {
    return this.textures.get(name) || null;
  }

  ready() {
    return Promise.all(this.promises);
  }
}

/* GameObject.js - base class for everything that lives on the canvas. */
class GameObject {
  /* Global glow dial for shadowBlur effects.  1 = full neon, 0 = no shadows. */
  static glow = 1;

  constructor(x, y, width, height) {
    this.name = this.constructor.name;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  update(dt) { }
  draw(ctx) { }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}
/* GameObject.js - base class for everything that lives on the canvas. */
class GameObject {
  /* Global glow dial for shadowBlur effects (the single most expensive thing
     this game does on a phone GPU).  1 = full neon, 0 = no shadows at all.
     Game lowers it on touch devices and again if the frame rate sags. */
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
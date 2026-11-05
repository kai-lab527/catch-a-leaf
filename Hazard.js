class Hazard extends Leaf {
  static penalty = 25;

  constructor(x, y, opts = {}) {
    super(x, y, { ...opts, type: 'normal' });
    this.name = 'Hazard';
    this.type = 'hazard';
    this.isHazard = true;
    this.value = 0;
    this.color = '#e34f3c';
  }

  loadSprite() {
    if (Hazard.sprite) {
      this.sprite = Hazard.sprite;
      this.spriteLoaded = true;
      return;
    }
    const image = new Image();
    image.onload = () => {
      Hazard.sprite = image;
      this.sprite = image;
      this.spriteLoaded = true;
    };
    image.onerror = () => {
      this.sprite = Hazard.generateSprite();
      this.spriteLoaded = true;
    };
    image.src = 'Sprites/unknown_leaf.svg';
    if (image.complete && image.naturalWidth) {
      Hazard.sprite = image;
      this.sprite = image;
      this.spriteLoaded = true;
    }
  }

  draw(ctx) {
    if (this.collected || !this.spriteLoaded) return;
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rot);
    ctx.globalAlpha = 0.9 + Math.sin(this.pulse * 2) * 0.1;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = GameObject.glow > 0 ? 8 * GameObject.glow : 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  static generateSprite() {
    if (Hazard.sprite) return Hazard.sprite;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const rows = [
      '.......D........',
      '..D...DDD...D...',
      '..DDD.RRR.DDD...',
      '.DRRRRLRRRRRD..',
      'DRRRRLRLRRRRRD.',
      '.DRRRRRRRRRRD..',
      '..DRRRLRRRRD...',
      '...DRRRRRRD....',
      '....DRRRRD.....',
      '.....DDDD......',
      '....D....D.....',
      '...D......D....',
      '................',
      '................',
      '................',
      '................'
    ];
    const colors = {
      D: '#321521',
      R: '#c74435',
      L: '#ffb04a'
    };
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const color = colors[rows[y][x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }

    Hazard.sprite = canvas;
    return canvas;
  }
}

class Leaf extends GameObject {
  constructor(x, y, opts = {}) {
    super(x, y, 32, 32);
    this.name = 'Leaf';
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = 40 + Math.random() * 30;
    this.baseVy = this.vy;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 2;
    this.swayPhase = Math.random() * Math.PI * 2;
    this.swayAmp = 20 + Math.random() * 20;
    this.time = 0;
    
    // Three distinct leaf types
    this.type = opts.type || 'normal';
    this.golden = (this.type === 'golden');
    this.blue = (this.type === 'blue');
    
    // Values – increased to match new costs
    if (this.type === 'golden') {
      this.value = 40;        // was 25
    } else if (this.type === 'blue') {
      this.value = 15;        // was 10
    } else {
      this.value = 2 + Math.floor(Math.random() * 4); // 2–5 (was 1–3)
    }
    
    this.size = opts.size || 0.7;
    this.width = 32 * this.size;
    this.height = 32 * this.size;
    this.collected = false;
    this.pulse = 0;

    // Load sprite (PNG preferred, fallback to pixel art)
    this.sprite = null;
    this.spriteLoaded = false;
    this.loadSprite();
  }

  loadSprite() {
    const img = new Image();
    let fileName;
    if (this.type === 'golden') {
      fileName = 'golden_maple_leaf.png';
    } else if (this.type === 'blue') {
      fileName = 'blue_maple_leaf.png';
    } else {
      fileName = 'normal_maple_leaf.png';
    }
    img.src = 'Sprites/' + fileName;
    img.onload = () => {
      this.sprite = img;
      this.spriteLoaded = true;
    };
    img.onerror = () => {
      this.sprite = Leaf.generatePixelSprite(this.type);
      this.spriteLoaded = true;
      console.warn('Using fallback sprite for', this.type);
    };
    if (img.complete && img.naturalWidth > 0) {
      this.sprite = img;
      this.spriteLoaded = true;
    }
  }

  // --- Static sprite for background leaves (normal leaf PNG) ---
  static normalSprite = null;
  static normalSpriteLoaded = false;

  static initNormalSprite() {
    if (Leaf.normalSpriteLoaded) return;
    const img = new Image();
    img.src = 'Sprites/normal_maple_leaf.png';
    img.onload = () => {
      Leaf.normalSprite = img;
      Leaf.normalSpriteLoaded = true;
    };
    img.onerror = () => {
      Leaf.normalSprite = Leaf.generatePixelSprite('normal');
      Leaf.normalSpriteLoaded = true;
      console.warn('Using fallback for background normal leaf');
    };
    if (img.complete && img.naturalWidth > 0) {
      Leaf.normalSprite = img;
      Leaf.normalSpriteLoaded = true;
    }
  }

  // --- Static pixel-art generator (fallback) ---
  static _spriteCache = {};

  static generatePixelSprite(type) {
    if (Leaf._spriteCache[type]) return Leaf._spriteCache[type];
    
    const size = 32;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    let base, dark, light, stem;
    if (type === 'golden') {
      base = '#ffd700'; dark = '#b8860b'; light = '#fff4a3'; stem = '#6b4a00';
    } else if (type === 'blue') {
      base = '#29b6f6'; dark = '#0d6fa8'; light = '#a3e3ff'; stem = '#08344a';
    } else {
      base = '#ffcc00'; dark = '#c48a00'; light = '#ffe680'; stem = '#5a3a0a';
    }

    const pattern = [
      [0,1,0,0,1,0],
      [1,3,1,1,3,1],
      [0,3,3,3,3,0],
      [1,2,3,3,2,1],
      [0,0,2,2,0,0],
      [0,0,0,4,0,0]
    ];

    const px = size / 6;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const v = pattern[y][x];
        if (v === 0) continue;
        let color = base;
        if (v === 2) color = dark;
        else if (v === 3) color = light;
        else if (v === 4) color = stem;
        g.fillStyle = color;
        g.fillRect(x * px, y * px, px, px);
      }
    }

    Leaf._spriteCache[type] = c;
    return c;
  }

  update(dt, gameHeight, fallSpeedMul = 1) {
    if (this.collected) return;
    this.time += dt;
    this.pulse += dt * 4;
    this.rot += this.rotSpeed * dt;
    this.x += this.vx * dt + Math.sin(this.time * 2 + this.swayPhase) * this.swayAmp * dt;
    this.y += this.vy * fallSpeedMul * dt;
  }

  draw(ctx) {
    if (this.collected || !this.spriteLoaded) return;
    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(this.rot);

    if (this.golden) {
      const glow = 10 + Math.sin(this.pulse) * 8;
      ctx.shadowBlur = glow;
      ctx.shadowColor = '#ffd700';
    } else if (this.blue) {
      const glow = 10 + Math.sin(this.pulse) * 8;
      ctx.shadowBlur = glow;
      ctx.shadowColor = '#29b6f6';
    } else {
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffb347';
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sprite, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  isPointInside(px, py) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= (this.width / 2) * (this.width / 2);
  }

  collect() {
    this.collected = true;
  }
}
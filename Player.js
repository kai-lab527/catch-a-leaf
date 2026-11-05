class Player extends GameObject {
  constructor(x, y, size = 64) {
    super(x, y, size, size);
    this.name = 'Player';
    this.speed = 380;
    this.catchFlashTimer = 0;
    this.caughtLeafSprite = null;
    this.caughtLeafTimer = 0;
    this.hazardCatchTimer = 0;
    this.catchBonus = 0;
    this.bobPhase = 0;
    this.spriteOpen = null;
    this.spriteClosed = null;
    this.spriteLoaded = false;
    this.spritesPending = 0;
    
    this.tilt = 0;
    this.targetTilt = 0;
    this.tiltSpeed = 8;

    // Real-time 3D basket (Basket3D.js). null when three.js / WebGL is missing,
    // in which case everything below falls back to the PNG sprites.
    this.basket3d = (typeof Basket3D !== 'undefined') ? Basket3D.shared() : null;
    this._lastDraw = 0;

    this.loadSprite();
  }

  loadSprite() {
    this.spritesPending = 2;
    this.loadSpriteVariant('open', 'Sprites/leaf_catcher_open.png');
    this.loadSpriteVariant('closed', 'Sprites/leaf_catcher_closed.png');
  }

  loadSpriteVariant(state, src) {
    const img = new Image();
    img.onload = () => {
      this[`sprite${state[0].toUpperCase()}${state.slice(1)}`] = img;
      this.finishSpriteLoad();
    };
    img.onerror = () => {
      console.error(`Failed to load player sprite: ${src}`);
      this.finishSpriteLoad();
    };
    img.src = src;
  }

  finishSpriteLoad() {
    this.spritesPending--;
    if (this.spritesPending > 0) return;
    this.spriteOpen = this.spriteOpen || this.spriteClosed;
    this.spriteClosed = this.spriteClosed || this.spriteOpen;
    if (!this.spriteOpen) {
      this.spriteOpen = Player.generatePixelSprite();
      this.spriteClosed = this.spriteOpen;
      console.warn('Using fallback leaf catcher sprite');
    }
    this.spriteLoaded = true;
  }

  static _playerSprite = null;

  static generatePixelSprite() {
    if (Player._playerSprite) return Player._playerSprite;
    
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;

    const pattern = [
      [0,0,0,0,0,0],
      [0,0,1,1,0,0],
      [0,1,1,1,1,0],
      [1,1,2,2,1,1],
      [0,1,2,2,1,0],
      [0,0,1,1,0,0]
    ];

    const px = size / 6;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const v = pattern[y][x];
        if (v === 0) continue;
        let color;
        if (v === 1) color = '#5a7a5a';
        else if (v === 2) color = '#3a5a3a';
        g.fillStyle = color;
        g.fillRect(x * px, y * px, px, px);
      }
    }

    Player._playerSprite = c;
    return c;
  }

  updateTilt(dx, dt) {
    this.targetTilt = dx * 0.08;
    this.tilt += (this.targetTilt - this.tilt) * Math.min(1, this.tiltSpeed * dt);
  }

  catchFlash() {
    this.catchFlashTimer = 0.3;
  }

  catchLeaf(sprite) {
    this.catchFlash();
    this.caughtLeafSprite = sprite;
    this.caughtLeafTimer = 0.16;
  }

  catchHazard(sprite) {
    this.catchFlashTimer = 0.5;
    this.caughtLeafTimer = 0;
    this.caughtLeafSprite = null;
    this.hazardSprite = sprite || Hazard.generateSprite();
    this.hazardCatchTimer = 0.5;
  }

  updateCatch(dt) {
    this.catchFlashTimer = Math.max(0, this.catchFlashTimer - dt);
    this.caughtLeafTimer = Math.max(0, this.caughtLeafTimer - dt);
    this.hazardCatchTimer = Math.max(0, this.hazardCatchTimer - dt);
  }

  getCatchBounds() {
    const padding = 15 + this.catchBonus;
    return {
      x: this.x - padding,
      y: this.y - padding,
      width: this.width + padding * 2,
      height: this.height + padding * 2
    };
  }

  draw(ctx) {
    const b3 = this.basket3d;
    if (!b3 && !this.spriteLoaded) return;
    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.translate(cx, cy);
    const bobY = Math.sin(this.bobPhase) * 2;
    ctx.translate(0, bobY);
    ctx.rotate(this.tilt);

    const size = this.width;
    const half = size / 2;

    // Draw the processed sprite – white pixels are now transparent
    ctx.shadowBlur = 15 * (typeof GameObject !== 'undefined' ? GameObject.glow : 1);
    ctx.shadowColor = 'rgba(255, 200, 100, 0.3)';

    ctx.imageSmoothingEnabled = false;
    let sprite;
    if (b3) {
      // Own clock so the 3D animation stays smooth even if the game loop skips updateCatch().
      const now = performance.now();
      const dt = this._lastDraw ? Math.min(0.05, (now - this._lastDraw) / 1000) : 0.016;
      this._lastDraw = now;
      sprite = b3.update(dt, {
        closed: this.catchFlashTimer > 0,
        hazard: this.hazardCatchTimer > 0,
        tilt: this.tilt
      });
    } else {
      sprite = this.catchFlashTimer > 0 ? this.spriteClosed : this.spriteOpen;
    }
    ctx.drawImage(sprite, -half, -half, size, size);

    if (this.caughtLeafTimer > 0 && this.caughtLeafSprite) {
      const progress = 1 - this.caughtLeafTimer / 0.16;
      const leafSize = size * (0.32 - progress * 0.12);
      ctx.globalAlpha = 1 - progress * 0.45;
      ctx.shadowBlur = 0;
      ctx.drawImage(this.caughtLeafSprite, -leafSize / 2, -half * 0.43 - leafSize / 2, leafSize, leafSize);
      ctx.globalAlpha = 1;
    }

    if (this.hazardCatchTimer > 0 && this.hazardSprite) {
      ctx.globalAlpha = this.hazardCatchTimer / 0.5;
      ctx.shadowBlur = 0;
      ctx.drawImage(this.hazardSprite, -half * 0.33, -half * 0.9, half * 0.66, half * 0.66);
      ctx.globalAlpha = 1;
    }

    if (this.catchFlashTimer > 0) {
      ctx.globalAlpha = this.hazardCatchTimer > 0
        ? this.hazardCatchTimer / 0.5
        : Math.min(1, this.catchFlashTimer / 0.3);
      ctx.shadowBlur = 0;
      const sparkles = [
        [-half * 0.9, -half * 0.65, 5, this.hazardCatchTimer > 0 ? '#ff544f' : '#fff0a6'],
        [half * 0.9, -half * 0.35, 4, this.hazardCatchTimer > 0 ? '#ff9a62' : '#a9db75'],
        [-half * 0.75, half * 0.55, 3, this.hazardCatchTimer > 0 ? '#ff9a62' : '#a9db75'],
        [half * 0.85, half * 0.7, 5, this.hazardCatchTimer > 0 ? '#ff544f' : '#fff0a6']
      ];
      for (const [x, y, radius, color] of sparkles) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius * 0.45, y - radius * 0.45);
        ctx.lineTo(x + radius, y);
        ctx.lineTo(x + radius * 0.45, y + radius * 0.45);
        ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius * 0.45, y + radius * 0.45);
        ctx.lineTo(x - radius, y);
        ctx.lineTo(x - radius * 0.45, y - radius * 0.45);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
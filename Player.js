class Player extends GameObject {
  constructor(x, y) {
    super(x, y, 64, 64);
    this.name = 'Player';
    this.speed = 380;
    this.catchFlashTimer = 0;
    this.bobPhase = 0;
    this.sprite = null;
    this.spriteLoaded = false;
    
    // Tilt properties
    this.tilt = 0;          // current rotation (radians)
    this.targetTilt = 0;    // where we want to be
    this.tiltSpeed = 8;     // smoothing speed
    
    this.loadSprite();
  }

  loadSprite() {
    const img = new Image();
    img.src = 'Sprites/player_basket.png';
    img.onload = () => {
      this.sprite = img;
      this.spriteLoaded = true;
    };
    img.onerror = () => {
      this.sprite = Player.generatePixelSprite();
      this.spriteLoaded = true;
      console.warn('Using fallback player sprite (failed to load player_basket.png)');
    };
    if (img.complete && img.naturalWidth > 0) {
      this.sprite = img;
      this.spriteLoaded = true;
    }
  }

  // --- Static pixel-art generator (fallback) ---
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
      [0,1,2,2,1,0],
      [1,2,3,3,2,1],
      [0,1,1,1,1,0],
      [0,0,1,1,0,0]
    ];

    const px = size / 6;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const v = pattern[y][x];
        if (v === 0) continue;
        let color;
        if (v === 1) color = '#8B6B4D';
        else if (v === 2) color = '#A8896B';
        else if (v === 3) color = '#C4A88A';
        g.fillStyle = color;
        g.fillRect(x * px, y * px, px, px);
      }
    }

    Player._playerSprite = c;
    return c;
  }

  update(dt, keys, canvasWidth) {
    let dx = 0;
    if (keys['a'] || keys['arrowleft']) dx = -1;
    if (keys['d'] || keys['arrowright']) dx = 1;
    if (keys['w'] || keys['arrowup']) this.catchFlashTimer = 0.2;

    this.x += dx * this.speed * dt;
    this.x = Math.max(0, Math.min(this.x, canvasWidth - this.width));
    this.bobPhase += dt * 3;

    // Tilt smoothing
    this.targetTilt = dx * 0.08; // ~4.5° max
    this.tilt += (this.targetTilt - this.tilt) * Math.min(1, this.tiltSpeed * dt);

    if (this.catchFlashTimer > 0) this.catchFlashTimer -= dt;
  }

  catchFlash() {
    this.catchFlashTimer = 0.3;
  }

  getCatchBounds() {
    const padding = 15;
    return {
      x: this.x - padding,
      y: this.y - padding,
      width: this.width + padding * 2,
      height: this.height + padding * 2
    };
  }

  draw(ctx) {
    if (!this.spriteLoaded) return;
    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Shadow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 200, 100, 0.3)';

    // Move to center, apply bob and tilt
    ctx.translate(cx, cy);
    const bobY = Math.sin(this.bobPhase) * 2;
    ctx.translate(0, bobY);
    ctx.rotate(this.tilt); // <-- tilt applied here

    // Catch flash glow
    if (this.catchFlashTimer > 0) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffd700';
      ctx.globalAlpha = 0.5 + Math.sin(this.catchFlashTimer * 20) * 0.3;
    }

    // Draw the basket sprite
    ctx.imageSmoothingEnabled = false;
    const size = this.width;
    ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);

    // Flash rings (they tilt with the basket)
    if (this.catchFlashTimer > 0) {
      ctx.globalAlpha = this.catchFlashTimer / 0.3;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size / 1.5, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = '#ff6b1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, size / 1.5 + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
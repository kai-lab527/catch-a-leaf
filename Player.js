class Player extends GameObject {
  constructor(x, y, size = 64) {
    super(x, y, size, size);
    this.name = 'Player';
    this.speed = 380;
    this.catchFlashTimer = 0;
    this.bobPhase = 0;
    this.sprite = null;
    this.spriteLoaded = false;
    
    this.tilt = 0;
    this.targetTilt = 0;
    this.tiltSpeed = 8;
    
    this.loadSprite();
  }

  loadSprite() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = 'Sprites/player_trashbin.png';
    img.onload = () => {
      const processedCanvas = this.processImage(img);
      this.sprite = processedCanvas;
      this.spriteLoaded = true;
      console.log('✅ Player sprite loaded, white pixels removed');
    };
    img.onerror = () => {
      this.sprite = Player.generatePixelSprite();
      this.spriteLoaded = true;
      console.warn('Using fallback player sprite');
    };
    if (img.complete && img.naturalWidth > 0) {
      const processedCanvas = this.processImage(img);
      this.sprite = processedCanvas;
      this.spriteLoaded = true;
    }
  }

  processImage(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Remove any pixel that is near‑white (threshold 180)
      if (r > 180 && g > 180 && b > 180 && a > 0) {
        data[i + 3] = 0;
      }
      // Also remove pixels that are very light grey
      if (r > 200 && g > 200 && b > 200 && a > 0) {
        data[i + 3] = 0;
      }
      // Catch any pixel that's predominantly white with low saturation
      const avg = (r + g + b) / 3;
      if (avg > 200 && a > 0) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
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

    ctx.translate(cx, cy);
    const bobY = Math.sin(this.bobPhase) * 2;
    ctx.translate(0, bobY);
    ctx.rotate(this.tilt);

    const size = this.width;
    const half = size / 2;

    // Draw the processed sprite – white pixels are now transparent
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 200, 100, 0.3)';

    if (this.catchFlashTimer > 0) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ffd700';
      ctx.globalAlpha = 0.5 + Math.sin(this.catchFlashTimer * 20) * 0.3;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sprite, -half, -half, size, size);

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
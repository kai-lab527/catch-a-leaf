class Particle extends GameObject {
  constructor(x, y, opts = {}) {
    super(x, y, 4, 4);
    this.name = 'Particle';
    this.vx = opts.vx || (Math.random() - 0.5) * 200;
    this.vy = opts.vy || (Math.random() - 0.8) * 200;
    this.life = opts.life || 0.6;
    this.maxLife = this.life;
    this.color = opts.color || '#ffd700';
    this.size = opts.size || 3;
    this.gravity = opts.gravity !== undefined ? opts.gravity : 400;
    this.rot = 0;
    this.rotSpeed = (Math.random() - 0.5) * 10;
    this.shape = opts.shape || 'square';
    this.dead = false;
  }

  update(dt) {
    if (this.dead) return;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.98;
    this.rot += this.rotSpeed * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.dead) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    if (this.shape === 'star') {
      this._drawStar(ctx, 0, 0, this.size, this.size * 0.5, 5);
    } else if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }

  _drawStar(ctx, cx, cy, outer, inner, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}
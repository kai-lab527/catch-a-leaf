class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.entities = [];
    this.leaves = [];
    this.particles = [];
    this.lastTime = 0;
    this.state = 'start';
    this.floatingStats = [];

    this.money = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMax = 2.0;
    this.spawnTimer = 0;
    this.baseSpawnRate = 0.9;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = 250;

    this.shopLevels = {};
    this.shopBonuses = {
      leafValue: 1, moveSpeed: 1, catchArea: 0, magnet: 0,
      dropRate: 1, fallSpeed: 1, blueChance: 0.008, comboBonus: 1
    };

    this.keys = {};

    this.touchX = null;
    this.touchActive = false;

    this.audio = new AudioManager();

    this.skyImg = new Image();
    this.groundImg = new Image();
    this.cloudImg = new Image();
    
    this.assetsLoaded = 0;
    this.totalAssets = 3; 
    this.bgLoaded = false;
    this.time = 0; 
    this.clouds = []; 

    this.scale = 1;
    this.viewW = 800;
    this.viewH = 600;

    this.playerFloor = 120; 

    this.setupResize();
    this.setup();
    this.setupInput();
    this.setupUI();
    this.loadAssets();

    Leaf.initNormalSprite();

    this.updateHUD();
    this.start();
  }

  loadAssets() {
    const checkLoad = () => {
      this.assetsLoaded++;
      if (this.assetsLoaded >= this.totalAssets) {
        this.bgLoaded = true;
        this.initClouds();
      }
    };

    this.skyImg.onload = checkLoad;
    this.skyImg.onerror = checkLoad;
    this.skyImg.src = 'Sprites/sky.png';

    this.groundImg.onload = checkLoad;
    this.groundImg.onerror = checkLoad;
    this.groundImg.src = 'Sprites/ground.png';

    this.cloudImg.onload = checkLoad;
    this.cloudImg.onerror = checkLoad;
    this.cloudImg.src = 'Sprites/cloud.png';
  }

  initClouds() {
    this.clouds = [
      { x: this.viewW * 0.1, y: this.viewH * 0.1, speed: 10, scale: 0.25 },
      { x: this.viewW * 0.4, y: this.viewH * 0.3, speed: 16, scale: 0.15 },
      { x: this.viewW * 0.7, y: this.viewH * 0.2, speed: 8, scale: 0.2 },
      { x: this.viewW * 1.0, y: this.viewH * 0.4, speed: 22, scale: 0.3 }
    ];
  }

  setup() {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || 800;
    const h = r.height || 600;
    const scale = this.scale || 1;
    const playerSize = 64 * scale;
    this.player = new Player(w / 2 - playerSize / 2, h - this.playerFloor * scale, playerSize);
    this.entities.push(this.player);
  }

  setupResize() {
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = this.canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        this.scale = 1; this.viewW = 800; this.viewH = 600; return;
      }
      const scaleH = r.height / 600;
      const scaleW = r.width / 800;
      let newScale = r.height > r.width ? Math.min(scaleH, r.width / 480) : Math.min(scaleH, scaleW);
      newScale = Math.max(0.5, Math.min(1.8, newScale));

      this.scale = newScale;
      this.viewW = r.width; this.viewH = r.height;
      this.canvas.width = Math.floor(r.width * dpr);
      this.canvas.height = Math.floor(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;

      if (this.player) {
        const size = 64 * this.scale;
        this.player.width = size;
        this.player.height = size;
        this.player.y = r.height - this.playerFloor * this.scale;
        this.player.x = Math.min(this.player.x, r.width - size);
      }
    };
    window.addEventListener('resize', fit);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(this.canvas);
    fit();
    this.fit = fit;
  }

  getViewSize() {
    const r = this.canvas.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.audio.forceResume();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.audio.forceResume();
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      this.touchX = touch.clientX - rect.left;
      this.touchActive = true;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.state !== 'playing' || !this.touchActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      this.touchX = touch.clientX - rect.left;
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchActive = false;
      this.touchX = null;
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.touchActive = false;
      this.touchX = null;
    }, { passive: false });
  }

  setupUI() {
    const ss = document.getElementById('startScreen');
    const startBtn = document.getElementById('startBtn');
    const quitBtn = document.getElementById('quitBtn');

    startBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.state !== 'start') return;
      this.audio.forceResume();
      this.audio.playTap();
      this.beginGame(this.getPreferredDevice());
    });
    quitBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.state === 'start') this.audio.playTap();
      this.quitToMenu();
    });
  }

  getPreferredDevice() {
    const ua = navigator.userAgent || '';
    const mobileTouch = navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 700;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || mobileTouch ? 'android' : 'laptop';
  }

  quitToMenu() {
    if (this.state !== 'start') return;
    this.audio.pauseMusic();
    this.state = 'quit';
    const ss = document.getElementById('startScreen');
    ss.classList.remove('pick-device');
    ss.classList.add('quit-screen');
    try {
      if (window.opener) { window.close(); return; }
      if (window.history.length > 1) { window.history.back(); return; }
    } catch (e) {}
  }

  async beginGame(dev) {
    if (this.state !== 'start') return;
    this.device = dev;
    this.audio.forceResume();
    const startScreen = document.getElementById('startScreen');
    const transition = document.getElementById('gameTransition');
    startScreen.classList.add('is-exiting');
    transition?.classList.remove('play');
    if (transition) { void transition.offsetWidth; transition.classList.add('play'); }
    await DeviceMode.enter(dev);
    if (dev === 'android') this.playerFloor = 96;
    this.fit();
    await new Promise((resolve) => setTimeout(resolve, 420));
    startScreen.classList.add('hidden');
    const hud = document.getElementById('hud');
    hud.classList.remove('hidden');
    hud.classList.add('hud-visible');
    this.state = 'playing';
    this.audio.playMusic();
  }

  applyShopLevels(levels = {}) {
    this.shopLevels = { ...levels };
    this.shopBonuses = {
      leafValue: 1 + (levels.piggy || 0) * 0.5,
      moveSpeed: 1 + (levels.sneakers || 0) * 0.15,
      catchArea: (levels.bucket || 0) * 5,
      magnet: (levels.sticky || 0) * 0.24,
      dropRate: 1 + (levels.grumpy || 0) * 0.3,
      fallSpeed: Math.max(0.6, 1 - (levels.slowpoke || 0) * 0.08),
      blueChance: 0.008 * (1 + (levels.blueberry || 0)),
      comboBonus: 1 + (levels.spicy || 0) * 0.25
    };
    if (this.player) this.player.catchBonus = this.shopBonuses.catchArea;
  }

  gainXP(amount) {
    this.xp += amount;
    this.updateHUD();
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xpToNext = 250 + (this.level * 50);
    
    const cx = this.canvas.getBoundingClientRect().width / 2;
    const cy = this.canvas.getBoundingClientRect().height / 2;
    this.spawnParticles(cx, cy, 60, { color: '#f5c842', shape: 'star' });
    this.showFloatText('LEVEL UP!', cx, cy - 20, '#f5c842', 24);
    this.audio.playCombo(Math.min(this.level, 20));
    this.updateHUD();
  }

  spawnLeaf() {
    const { w } = this.getViewSize();
    const scale = this.scale || 1;
    const goldenChance = 0.02;
    const blueChance = this.shopBonuses.blueChance;
    const roll = Math.random();
    
    let type = 'normal';
    if (roll < blueChance) type = 'blue';
    else if (roll < blueChance + goldenChance) type = 'golden';
    
    const baseSize = 0.7 + Math.random() * 0.3;
    const size = Math.max(28 * scale, baseSize * scale * 32);
    const leaf = new Leaf(Math.random() * (w - size), -size, { size, type, scale });
    this.leaves.push(leaf);
    this.entities.push(leaf);
  }

  spawnParticles(x, y, count, opts = {}) {
    const scale = this.scale || 1;
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y, {
        vx: (Math.random() - 0.5) * 300 * scale,
        vy: (Math.random() - 1) * 250 * scale,
        life: 0.5 + Math.random() * 0.6,
        color: opts.color || (Math.random() < 0.5 ? '#ffd700' : '#ff8c1a'),
        size: (2 + Math.random() * 3) * scale,
        shape: opts.shape || (Math.random() < 0.3 ? 'star' : 'square'),
        gravity: 400 * scale
      });
      this.particles.push(p);
      this.entities.push(p);
    }
  }

  collectLeaf(leaf, mx, my, clicked = false) {
    if (leaf.collected) return;
    this.combo++;
    this.comboTimer = this.comboMax;
    const comboMul = (1 + Math.min(this.combo - 1, 20) * 0.05) * this.shopBonuses.comboBonus;

    let value = leaf.value * comboMul * this.shopBonuses.leafValue;
    if (clicked) value *= 1.5;
    value = Math.max(1, Math.round(value));

    let xpGain = leaf.type === 'golden' ? 15 : (leaf.type === 'blue' ? 8 : leaf.value);
    this.gainXP(Math.round(xpGain * comboMul));

    this.audio.playCollect();
    if (this.combo > 1) this.audio.playCombo(this.combo);

    const moneyIcon = document.getElementById('moneyIcon');
    if (moneyIcon) {
      moneyIcon.classList.remove('money-glow');
      void moneyIcon.offsetWidth;
      moneyIcon.classList.add('money-glow');
      setTimeout(() => moneyIcon.classList.remove('money-glow'), 350);
    }

    const moneyRect = document.getElementById('moneyCard')?.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    if (moneyRect && canvasRect) {
      const targetX = moneyRect.left + moneyRect.width / 2 - canvasRect.left;
      const targetY = moneyRect.top + moneyRect.height / 2 - canvasRect.top;
      this.spawnFloatingStat(mx, my, `+${Fmt.short(value)}`, targetX, targetY, leaf.golden ? '#ffd700' : (leaf.blue ? '#3ac9ff' : '#ffb347'));
    }

    this.money += value;
    this.player.catchFlash();
    this.spawnParticles(mx, my, (leaf.golden || leaf.blue) ? 25 : 12, { 
      color: leaf.golden ? '#ffd700' : (leaf.blue ? '#3ac9ff' : '#ffcc00'), shape: leaf.blue ? 'star' : undefined 
    });
    this.updateHUD();
  }

  spawnFloatingStat(startX, startY, text, targetX, targetY, color = '#ffd700') {
    this.floatingStats.push({
      x: startX, y: startY, startX, startY, targetX, targetY, text, color,
      progress: 0, phase: 0, waitTimer: 0, waitDuration: 0.18, alive: true, scale: 0.5
    });
  }

  showFloatText(text, x, y, color = '#ffd700', size = 12) {
    const container = document.getElementById('floatingText');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.cssText = `left:${x}px; top:${y}px; color:${color}; font-size:${size}px;`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  updateHUD() {
    document.getElementById('moneyValue').textContent = Fmt.short(this.money);
    document.getElementById('levelValue').textContent = this.level;

    const xpFillEl = document.getElementById('levelXpFill');
    if (xpFillEl) xpFillEl.style.width = Math.min(100, (this.xp / this.xpToNext) * 100) + '%';
    
    const xpTextEl = document.getElementById('levelXpText');
    if (xpTextEl) xpTextEl.textContent = `${Fmt.short(this.xp)} / ${Fmt.short(this.xpToNext)}`;

  }

  update(dt) {
    if (dt > 0.1) dt = 0.1;
    
    if (this.bgLoaded && this.clouds.length > 0) {
      const { w, h } = this.getViewSize();
      for (const c of this.clouds) {
        c.x -= c.speed * dt * this.scale;
        if (c.x < -200 * this.scale) {
          c.x = w + 100 * this.scale;
          c.y = (Math.random() * 0.4 + 0.05) * h; 
        }
      }
    }

    const scale = this.scale || 1;
    for (let i = this.floatingStats.length - 1; i >= 0; i--) {
      const fs = this.floatingStats[i];
      if (fs.phase === 0) {
        fs.waitTimer += dt;
        fs.scale = 0.5 + (fs.waitTimer / fs.waitDuration) * 0.7;
        if (fs.waitTimer >= fs.waitDuration) { fs.phase = 1; fs.progress = 0; fs.scale = 1.2; }
      } else if (fs.phase === 1) {
        fs.progress += dt * 2.5;
        if (fs.progress >= 1) { fs.alive = false; this.floatingStats.splice(i, 1); continue; }
        const t = fs.progress;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        fs.x = fs.startX + (fs.targetX - fs.startX) * ease;
        fs.y = fs.startY + (fs.targetY - fs.startY) * ease - (1 - ease) * 30;
        fs.scale = 1.2 - ease * 0.4;
      }
    }

    if (this.state !== 'playing' || document.documentElement.classList.contains('is-portrait')) return;

    const { w, h } = this.getViewSize();
    this.player.speed = 380 * scale * this.shopBonuses.moveSpeed;
    let dx = 0;
    
    if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
    if (this.keys['d'] || this.keys['arrowright']) dx = 1;

    if (this.touchActive && this.touchX !== null) {
      const targetX = this.touchX - this.player.width / 2;
      const diff = targetX - this.player.x;
      if (Math.abs(diff) > 2) {
        this.player.x += Math.min(Math.abs(diff), this.player.speed * dt) * Math.sign(diff);
        this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
      } else this.player.x = targetX;
      dx = 0;
    }

    if (dx !== 0 && !this.touchActive) {
      this.player.x += dx * this.player.speed * dt;
      this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
    }

    this.player.updateTilt(dx, dt);
    this.player.bobPhase += dt * 3;

    if (this.keys['w'] || this.keys['arrowup']) this.player.catchFlashTimer = 0.2;
    if (this.player.catchFlashTimer > 0) this.player.catchFlashTimer -= dt;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnLeaf();
      this.spawnTimer = (this.baseSpawnRate / this.shopBonuses.dropRate) * (0.7 + Math.random() * 0.6);
    }

    const catchBounds = this.player.getCatchBounds();

    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      if (leaf.collected) {
        this.leaves.splice(i, 1); this.entities.splice(this.entities.indexOf(leaf), 1); continue;
      }

      leaf.update(dt * this.shopBonuses.fallSpeed, h, 1);
      if (this.shopBonuses.magnet > 0) {
        const playerCenter = this.player.x + this.player.width / 2;
        const leafCenter = leaf.x + leaf.width / 2;
        leaf.x += Math.max(-180, Math.min(180, playerCenter - leafCenter)) * this.shopBonuses.magnet * dt;
      }
      const b = leaf.getBounds();
      if (b.x < catchBounds.x + catchBounds.width && b.x + b.width > catchBounds.x &&
          b.y < catchBounds.y + catchBounds.height && b.y + b.height > catchBounds.y) {
        this.collectLeaf(leaf, leaf.x + leaf.width / 2, leaf.y + leaf.height / 2, false);
        leaf.collect();
        this.leaves.splice(i, 1); this.entities.splice(this.entities.indexOf(leaf), 1);
        continue;
      }
      if (leaf.y > h + 60 * scale) {
        this.leaves.splice(i, 1); this.entities.splice(this.entities.indexOf(leaf), 1);
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTimer = 0; }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].dead) {
        this.entities.splice(this.entities.indexOf(this.particles[i]), 1);
        this.particles.splice(i, 1);
      }
    }

    const bar = document.getElementById('comboBar');
    if (this.combo > 1) {
      bar.classList.add('active');
      bar.dataset.tier = this.combo >= 20 ? 3 : this.combo >= 10 ? 2 : this.combo >= 5 ? 1 : 0;
      document.getElementById('comboFill').style.width = Math.max(0, (this.comboTimer / this.comboMax) * 100) + '%';
      document.getElementById('comboText').textContent = `COMBO x${this.combo}`;
      if (this._lastCombo !== this.combo) { bar.classList.remove('pop'); void bar.offsetWidth; bar.classList.add('pop'); this._lastCombo = this.combo; }
    } else {
      bar.classList.remove('active');
      document.getElementById('comboFill').style.width = '0%';
      document.getElementById('comboText').textContent = '';
      this._lastCombo = 0;
    }
  }

  drawBackground() {
    const { w, h } = this.getViewSize();
    const ctx = this.ctx;
    const scale = this.scale || 1;

    if (this.skyImg && this.skyImg.complete && this.skyImg.naturalWidth > 0) {
      ctx.drawImage(this.skyImg, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#87CEEB'; 
      ctx.fillRect(0, 0, w, h);
    }

    if (this.cloudImg && this.cloudImg.complete && this.cloudImg.naturalWidth > 0) {
      ctx.globalAlpha = 0.8; 
      for (const c of this.clouds) {
        const cw = this.cloudImg.width * scale * c.scale;
        const ch = this.cloudImg.height * scale * c.scale;
        ctx.drawImage(this.cloudImg, c.x, c.y, cw, ch);
      }
      ctx.globalAlpha = 1.0;
    }

    let groundH = 120 * scale; 
    if (this.groundImg && this.groundImg.complete && this.groundImg.naturalWidth > 0) {
      groundH = this.groundImg.height * scale;
    }

    if (this.groundImg && this.groundImg.complete && this.groundImg.naturalWidth > 0) {
      const gw = this.groundImg.width * scale;
      const gh = this.groundImg.height * scale;
      
      for (let x = 0; x < w; x += gw) {
        ctx.drawImage(this.groundImg, x, h - gh, gw, gh);
      }
    } else {
      ctx.fillStyle = '#4a7a22'; 
      ctx.fillRect(0, h - groundH, w, groundH);
      ctx.fillStyle = '#3e2716';
      ctx.fillRect(0, h - groundH * 0.3, w, groundH * 0.3);
    }
  }

  draw() {
    try {
      const { w, h } = this.getViewSize();
      this.ctx.clearRect(0, 0, w, h);
      this.drawBackground();

      for (const leaf of this.leaves) if (!leaf.collected) leaf.draw(this.ctx);
      if (this.player) this.player.draw(this.ctx);
      for (const p of this.particles) p.draw(this.ctx);

      for (const fs of this.floatingStats) {
        if (!fs.alive) continue;
        let alpha = fs.phase === 0 ? Math.min(1, (fs.waitTimer / fs.waitDuration) * 3) : 1 - fs.progress * 0.6;
        let s = fs.phase === 0 ? 0.5 + (fs.waitTimer / fs.waitDuration) * 0.7 : (fs.scale || 1);
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.ctx.translate(fs.x, fs.y); this.ctx.scale(s, s);
        this.ctx.font = `bold ${16 * this.scale}px "Press Start 2P", monospace`;
        this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 12 * this.scale; this.ctx.shadowColor = fs.color;
        this.ctx.fillStyle = fs.color; this.ctx.fillText(fs.text, 0, 0);
        this.ctx.shadowBlur = 0; this.ctx.strokeStyle = 'rgba(0,0,0,0.8)'; this.ctx.lineWidth = 3 * this.scale;
        this.ctx.strokeText(fs.text, 0, 0); this.ctx.fillStyle = fs.color; this.ctx.fillText(fs.text, 0, 0);
        this.ctx.restore();
      }

      const grad = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      this.ctx.fillStyle = grad; this.ctx.fillRect(0, 0, w, h);
    } catch (error) {
      console.error("Render error:", error);
    }
  }

  start() {
    const loop = (ts) => {
      const dt = Math.min(0.1, (ts - this.lastTime) / 1000 || 0);
      this.lastTime = ts; this.update(dt); this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

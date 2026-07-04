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
    this.leafCount = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboMax = 2.0;
    this.spawnTimer = 0;
    this.baseSpawnRate = 0.9;

    this.skillTree = new SkillTree();
    this.pointsAt = 5;
    this.leavesToNext = 5;

    this.stars = [];
    this.bgLeaves = [];

    this.keys = {};

    // Touch controls
    this.touchX = null;
    this.touchActive = false;

    // Background image
    this.backgroundImage = null;
    this.backgroundLoaded = false;

    this.setupResize();
    this.setup();
    this.setupInput();
    this.setupUI();
    this.buildStars();
    this.buildBgLeaves();
    this.loadBackground();

    Leaf.initNormalSprite();

    this.updateHUD();
    this.start();
  }

  loadBackground() {
    const img = new Image();
    img.src = 'Sprites/background_image.png';
    img.onload = () => {
      this.backgroundImage = img;
      this.backgroundLoaded = true;
    };
    img.onerror = () => {
      console.warn('Failed to load background image – using gradient fallback');
      this.backgroundLoaded = false;
    };
    if (img.complete && img.naturalWidth > 0) {
      this.backgroundImage = img;
      this.backgroundLoaded = true;
    }
  }

  setup() {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || 800;
    const h = r.height || 600;
    this.player = new Player(w / 2 - 32, h - 100);
    this.entities.push(this.player);
    this.skillTree.available = 0;
  }

  buildStars() {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.6,
        size: Math.random() * 1.5 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 2 + 1
      });
    }
  }

  buildBgLeaves() {
    this.bgLeaves = [];
    for (let i = 0; i < 12; i++) {
      this.bgLeaves.push({
        x: Math.random(),
        y: Math.random(),
        size: 15 + Math.random() * 15,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.5,
        vy: 0.02 + Math.random() * 0.03,
        vx: (Math.random() - 0.5) * 0.02,
        type: 'normal',
        alpha: 0.15 + Math.random() * 0.15
      });
    }
  }

  setupResize() {
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = this.canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      this.canvas.width = Math.floor(r.width * dpr);
      this.canvas.height = Math.floor(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;
      if (this.player) {
        this.player.y = r.height - 100;
        this.player.x = Math.min(this.player.x, r.width - this.player.width);
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
    // --- Keyboard ---
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') this.toggleSkillPanel(false);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // --- Mouse click for leaves ---
    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.handleLeafTap(mx, my);
    });

    // --- Touch events ---
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;

      this.handleLeafTap(mx, my);

      this.touchX = mx;
      this.touchActive = true;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.state !== 'playing' || !this.touchActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const mx = touch.clientX - rect.left;
      this.touchX = mx;
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

  handleLeafTap(mx, my) {
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      if (leaf.isPointInside(mx, my) && !leaf.collected) {
        this.collectLeaf(leaf, mx, my, true);
        leaf.collect();
        this.leaves.splice(i, 1);
        const idx = this.entities.indexOf(leaf);
        if (idx >= 0) this.entities.splice(idx, 1);
        break;
      }
    }
  }

  setupUI() {
    document.getElementById('startBtn').addEventListener('click', () => {
      document.getElementById('startScreen').classList.add('hidden');
      this.state = 'playing';
    });
    document.getElementById('skillBtn').addEventListener('click', () => {
      this.toggleSkillPanel(true);
    });
    document.getElementById('closeSkill').addEventListener('click', () => {
      this.toggleSkillPanel(false);
    });
  }

  toggleSkillPanel(show) {
    const panel = document.getElementById('skillPanel');
    if (show) {
      panel.classList.remove('hidden');
      this.renderSkillTree();
    } else {
      panel.classList.add('hidden');
    }
  }

  renderSkillTree() {
    const grid = document.getElementById('skillGrid');
    document.getElementById('availPoints').textContent = this.skillTree.available;
    const moneyEl = document.getElementById('availMoney');
    if (moneyEl) moneyEl.textContent = this.money;

    const entries = Object.entries(this.skillTree.skills);
    const branchOrder = ['fortune', 'swift', 'harvest'];
    const branchMeta = {
      fortune: { label: 'FORTUNE', color: '#ffd700' },
      swift:   { label: 'SWIFT',   color: '#4fd1c5' },
      harvest: { label: 'HARVEST', color: '#7cb342' }
    };

    const branches = { fortune: [], swift: [], harvest: [] };
    entries.forEach(([id, s]) => branches[s.branch].push([id, s]));

    let html = `<div class="skill-tree-container">`;
    branchOrder.forEach(branch => {
      const skills = branches[branch];
      const meta = branchMeta[branch];
      html += `<div class="skill-branch" style="--branch-color: ${meta.color}">`;
      html += `<div class="branch-header">${meta.label}</div>`;
      html += `<div class="branch-nodes">`;
      skills.forEach(([id, s], index) => {
        const maxed = s.level >= s.max;
        const spCost = s.cost;
        const moneyCost = this.skillTree.getMoneyCost(id);
        const canBuy = !maxed && this.skillTree.available >= spCost && this.money >= moneyCost;
        const pips = Array.from({ length: s.max }, (_, p) =>
          `<span class="skill-pip ${p < s.level ? 'filled' : ''}"></span>`
        ).join('');

        const line = (index < skills.length - 1) ? `<div class="skill-connector"></div>` : '';

        html += `
          <div class="skill-node-wrapper ${maxed ? 'maxed' : ''} ${canBuy ? 'can-buy' : ''}">
            <div class="skill-node" data-id="${id}" style="--accent:${s.color};">
              <div class="skill-icon">${s.icon}</div>
              <div class="skill-info">
                <div class="skill-name">${s.name}</div>
                <div class="skill-desc">${s.desc}</div>
                <div class="skill-level">${pips}</div>
                <div class="skill-cost">${maxed ? 'MAXED' : `<span class="cost-sp">${spCost} SP</span> + <span class="cost-money">¢${moneyCost}</span>`}</div>
              </div>
            </div>
            ${line}
          </div>`;
      });
      html += `</div></div>`;
    });
    html += `</div>`;

    grid.innerHTML = html;

    grid.querySelectorAll('.skill-node').forEach(node => {
      const id = node.dataset.id;
      node.addEventListener('click', (e) => {
        e.stopPropagation();
        const result = this.skillTree.buy(id, this.money);
        if (result.success) {
          this.money -= result.moneyCost;
          this.spawnParticles(
            this.canvas.getBoundingClientRect().width / 2,
            this.canvas.getBoundingClientRect().height / 2,
            30,
            { color: '#7cb342', shape: 'star' }
          );
          this.renderSkillTree();
          this.updateHUD();
        } else if (result.reason !== 'maxed') {
          node.classList.add('deny-shake');
          setTimeout(() => node.classList.remove('deny-shake'), 300);
        }
      });
    });
  }

  spawnLeaf() {
    const { w } = this.getViewSize();
    const goldenChance = 0.02 + this.skillTree.getGoldenBonus();
    const blueChance = 0.008 + this.skillTree.getBlueBonus();
    const roll = Math.random();
    
    let type = 'normal';
    if (roll < blueChance) {
      type = 'blue';
    } else if (roll < blueChance + goldenChance) {
      type = 'golden';
    }
    
    const opts = { 
      size: 0.7 + Math.random() * 0.3,
      type: type
    };
    const leaf = new Leaf(Math.random() * (w - 32), -40, opts);
    this.leaves.push(leaf);
    this.entities.push(leaf);
  }

  spawnParticles(x, y, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      const p = new Particle(x, y, {
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 1) * 250,
        life: 0.5 + Math.random() * 0.6,
        color: opts.color || (Math.random() < 0.5 ? '#ffd700' : '#ff8c1a'),
        size: 2 + Math.random() * 3,
        shape: opts.shape || (Math.random() < 0.3 ? 'star' : 'square')
      });
      this.particles.push(p);
      this.entities.push(p);
    }
  }

  collectLeaf(leaf, mx, my, clicked = false) {
    if (leaf.collected) return;
    
    this.combo++;
    this.comboTimer = this.comboMax;
    const comboMul = 1 + Math.min(this.combo - 1, 20) * 0.05 * this.skillTree.getComboMul();

    let value = leaf.value * this.skillTree.getValueMul() * comboMul;
    if (leaf.blue) value += this.skillTree.getBlueValueBonus();
    if (clicked) value *= 1.5;
    value = Math.max(1, Math.round(value));

    const moneyCard = document.getElementById('moneyCard');
    const moneyRect = moneyCard ? moneyCard.getBoundingClientRect() : null;
    const canvasRect = this.canvas.getBoundingClientRect();

    if (moneyRect && canvasRect) {
      const targetX = moneyRect.left + moneyRect.width / 2 - canvasRect.left;
      const targetY = moneyRect.top + moneyRect.height / 2 - canvasRect.top;
      const color = leaf.golden ? '#ffd700' : (leaf.blue ? '#3ac9ff' : '#ffb347');
      this.spawnFloatingStat(mx, my, `+${value}`, targetX, targetY, color);
    }

    this.money += value;
    this.leafCount++;
    this.leavesToNext--;

    if (leaf.blue) {
      this.skillTree.addPoint();
      const skillCard = document.getElementById('skillCard');
      const skillRect = skillCard ? skillCard.getBoundingClientRect() : null;
      if (skillRect && canvasRect) {
        const targetX = skillRect.left + skillRect.width / 2 - canvasRect.left;
        const targetY = skillRect.top + skillRect.height / 2 - canvasRect.top;
        this.spawnFloatingStat(mx, my - 20, '+1 SP', targetX, targetY, '#b19cd9');
      }
      this.updateHUD();
    }

    if (this.leavesToNext <= 0) {
      this.skillTree.addPoint();
      this.pointsAt = Math.floor(this.pointsAt * 1.4);
      this.leavesToNext = this.pointsAt;
      
      const skillCard = document.getElementById('skillCard');
      const skillRect = skillCard ? skillCard.getBoundingClientRect() : null;
      if (skillRect && canvasRect) {
        const targetX = skillRect.left + skillRect.width / 2 - canvasRect.left;
        const targetY = skillRect.top + skillRect.height / 2 - canvasRect.top;
        this.spawnFloatingStat(mx, my - 60, '+1 SP', targetX, targetY, '#b19cd9');
      }
      this.spawnParticles(mx, my, 30, { color: '#b19cd9', shape: 'star' });
    }

    this.player.catchFlash();
    this.spawnParticles(mx, my, (leaf.golden || leaf.blue) ? 25 : 12, { 
      color: leaf.golden ? '#ffd700' : (leaf.blue ? '#3ac9ff' : '#ffcc00'), 
      shape: leaf.blue ? 'star' : undefined 
    });
    
    this.updateHUD();
  }

  spawnFloatingStat(startX, startY, text, targetX, targetY, color = '#ffd700') {
    this.floatingStats.push({
      x: startX,
      y: startY,
      startX: startX,
      startY: startY,
      targetX: targetX,
      targetY: targetY,
      text: text,
      color: color,
      progress: 0,
      phase: 0,
      waitTimer: 0,
      waitDuration: 0.5,
      alive: true,
      scale: 0.5
    });
  }

  showFloatText(text, x, y, color = '#ffd700', size = 12) {
    const container = document.getElementById('floatingText');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.style.fontSize = size + 'px';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  updateHUD() {
    const moneyEl = document.getElementById('moneyValue');
    const leafEl = document.getElementById('leafValue');
    const skillEl = document.getElementById('skillValue');
    const progressEl = document.getElementById('leafProgressFill');
    
    if (moneyEl) moneyEl.textContent = this.money;
    if (skillEl) skillEl.textContent = this.skillTree.available;
    
    const needed = this.pointsAt;
    const collected = needed - this.leavesToNext;
    if (leafEl) leafEl.textContent = `${collected} / ${needed}`;
    
    if (progressEl) {
      const pct = Math.min(100, (collected / needed) * 100);
      progressEl.style.width = pct + '%';
    }
  }

  update(dt) {
    if (dt > 0.1) dt = 0.1;

    for (const s of this.stars) s.twinkle += dt * s.speed;
    for (const l of this.bgLeaves) {
      l.y += l.vy * dt;
      l.x += l.vx * dt;
      l.rot += l.rotSpeed * dt;
      if (l.y > 1.1) { l.y = -0.1; l.x = Math.random(); }
      if (l.x < -0.1) l.x = 1.1;
      if (l.x > 1.1) l.x = -0.1;
    }

    // Update floating stats
    for (let i = this.floatingStats.length - 1; i >= 0; i--) {
      const fs = this.floatingStats[i];
      
      if (fs.phase === 0) {
        fs.waitTimer += dt;
        fs.scale = 0.5 + (fs.waitTimer / fs.waitDuration) * 0.7;
        
        if (fs.waitTimer >= fs.waitDuration) {
          fs.phase = 1;
          fs.progress = 0;
          fs.scale = 1.2;
        }
      } else if (fs.phase === 1) {
        fs.progress += dt * 2.5;
        
        if (fs.progress >= 1) {
          fs.alive = false;
          this.floatingStats.splice(i, 1);
          continue;
        }
        
        const t = fs.progress;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        fs.x = fs.startX + (fs.targetX - fs.startX) * ease;
        fs.y = fs.startY + (fs.targetY - fs.startY) * ease - (1 - ease) * 30;
        fs.scale = 1.2 - ease * 0.4;
      }
    }

    if (this.state !== 'playing') return;

    const { w, h } = this.getViewSize();
    const speedMul = this.skillTree.getSpeedMul();
    this.player.speed = 380 * speedMul;

    // --- Player movement: keyboard + touch ---
    // First, get keyboard input
    let dx = 0;
    if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
    if (this.keys['d'] || this.keys['arrowright']) dx = 1;

    // Then apply touch override if active
    if (this.touchActive && this.touchX !== null) {
      const targetX = this.touchX - this.player.width / 2;
      const diff = targetX - this.player.x;
      const maxSpeed = this.player.speed * dt;
      if (Math.abs(diff) > 2) {
        const move = Math.min(Math.abs(diff), maxSpeed) * Math.sign(diff);
        this.player.x += move;
        // Clamp immediately
        this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
        // Touch overrides keyboard – set dx to 0 so tilt doesn't fight
        dx = 0;
      } else {
        // Snap to target if very close
        this.player.x = targetX;
        dx = 0;
      }
    }

    // Apply keyboard movement (only if touch is NOT overriding)
    if (dx !== 0 && !this.touchActive) {
      this.player.x += dx * this.player.speed * dt;
      this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
    }

    // Update player tilt and bob
    this.player.updateTilt(dx, dt);
    this.player.bobPhase += dt * 3;

    // Catch flash timer
    if (this.keys['w'] || this.keys['arrowup']) {
      this.player.catchFlashTimer = 0.2;
    }
    if (this.player.catchFlashTimer > 0) {
      this.player.catchFlashTimer -= dt;
    }

    // --- Spawn leaves ---
    this.spawnTimer -= dt;
    const rate = this.baseSpawnRate / this.skillTree.getSpawnMul();
    if (this.spawnTimer <= 0) {
      this.spawnLeaf();
      this.spawnTimer = rate * (0.7 + Math.random() * 0.6);
    }

    const fallMul = this.skillTree.getFallMul();
    const magnetRange = this.skillTree.getMagnetRange();
    const catchBounds = this.player.getCatchBounds();
    const basketMul = this.skillTree.getBasketMul();
    catchBounds.x -= (catchBounds.width * (basketMul - 1)) / 2;
    catchBounds.width *= basketMul;

    // --- Update leaves ---
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const leaf = this.leaves[i];
      
      if (leaf.collected) {
        this.leaves.splice(i, 1);
        const ei = this.entities.indexOf(leaf);
        if (ei >= 0) this.entities.splice(ei, 1);
        continue;
      }

      if (magnetRange > 0) {
        const cx = leaf.x + leaf.width / 2;
        const cy = leaf.y + leaf.height / 2;
        const bx = catchBounds.x + catchBounds.width / 2;
        const by = catchBounds.y + catchBounds.height / 2;
        const dx2 = bx - cx;
        const dy2 = by - cy;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist < magnetRange && dist > 1) {
          const force = (1 - dist / magnetRange) * 200;
          leaf.vx += (dx2 / dist) * force * dt;
          leaf.vy += (dy2 / dist) * force * dt * 0.5;
        }
      }

      leaf.update(dt, h, fallMul);

      const b = leaf.getBounds();
      const overlapping =
        b.x < catchBounds.x + catchBounds.width &&
        b.x + b.width > catchBounds.x &&
        b.y < catchBounds.y + catchBounds.height &&
        b.y + b.height > catchBounds.y;

      if (overlapping && !leaf.collected) {
        const cx = leaf.x + leaf.width / 2;
        const cy = leaf.y + leaf.height / 2;
        this.collectLeaf(leaf, cx, cy, false);
        leaf.collect();
        this.leaves.splice(i, 1);
        const ei = this.entities.indexOf(leaf);
        if (ei >= 0) this.entities.splice(ei, 1);
        continue;
      }

      if (leaf.y > h + 60) {
        this.leaves.splice(i, 1);
        const ei = this.entities.indexOf(leaf);
        if (ei >= 0) this.entities.splice(ei, 1);
      }
    }

    // --- Combo timer ---
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    // --- Particles ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.dead) {
        this.particles.splice(i, 1);
        const ei = this.entities.indexOf(p);
        if (ei >= 0) this.entities.splice(ei, 1);
      }
    }

    // --- Combo bar ---
    const bar = document.getElementById('comboBar');
    const fill = document.getElementById('comboFill');
    const txt = document.getElementById('comboText');
    if (this.combo > 1) {
      bar.classList.add('active');
      const pct = Math.max(0, (this.comboTimer / this.comboMax) * 100);
      fill.style.width = pct + '%';
      txt.textContent = `COMBO x${this.combo}`;
    } else {
      bar.classList.remove('active');
    }
  }

  drawBackground() {
    const { w, h } = this.getViewSize();
    const ctx = this.ctx;

    if (this.backgroundLoaded && this.backgroundImage) {
      ctx.drawImage(this.backgroundImage, 0, 0, w, h);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1a0e2e');
      grad.addColorStop(0.5, '#3d1f4a');
      grad.addColorStop(1, '#5a2a3a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    for (const s of this.stars) {
      const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff5cc';
      const size = Math.max(1, Math.round(s.size));
      ctx.fillRect(Math.round(s.x * w), Math.round(s.y * h), size, size);
      ctx.restore();
    }

    for (const l of this.bgLeaves) {
      ctx.save();
      ctx.globalAlpha = l.alpha;
      ctx.translate(l.x * w, l.y * h);
      ctx.rotate(l.rot);
      ctx.imageSmoothingEnabled = false;
      let sprite = Leaf.normalSpriteLoaded ? Leaf.normalSprite : Leaf.generatePixelSprite('normal');
      if (sprite) {
        ctx.drawImage(sprite, -l.size / 2, -l.size / 2, l.size, l.size);
      }
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(15, 8, 20, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, h - 50);
    for (let x = 0; x <= w; x += 10) {
      const yy = h - 50 - Math.sin(x * 0.02) * 6;
      ctx.lineTo(Math.round(x), Math.round(yy));
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(30, 15, 30, 0.85)';
    ctx.fillRect(0, h - 25, w, 25);
  }

  draw() {
    const { w, h } = this.getViewSize();
    this.ctx.clearRect(0, 0, w, h);
    this.drawBackground();

    if (this.state === 'playing' && this.skillTree.getMagnetRange() > 0 && this.player) {
      const cb = this.player.getCatchBounds();
      const cx = cb.x + cb.width / 2;
      const cy = cb.y + cb.height / 2;
      const range = this.skillTree.getMagnetRange();
      this.ctx.save();
      const pulse = 0.3 + Math.sin(performance.now() * 0.005) * 0.15;
      const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, range);
      grad.addColorStop(0, `rgba(177, 156, 217, ${pulse * 0.4})`);
      grad.addColorStop(1, 'rgba(177, 156, 217, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, range, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    for (const leaf of this.leaves) {
      if (!leaf.collected) leaf.draw(this.ctx);
    }

    if (this.player) this.player.draw(this.ctx);

    for (const p of this.particles) p.draw(this.ctx);

    for (const fs of this.floatingStats) {
      if (!fs.alive) continue;
      
      let alpha, scale;
      if (fs.phase === 0) {
        const pct = fs.waitTimer / fs.waitDuration;
        alpha = Math.min(1, pct * 3);
        scale = 0.5 + pct * 0.7;
      } else {
        alpha = 1 - fs.progress * 0.6;
        scale = fs.scale || 1;
      }
      
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, alpha);
      this.ctx.translate(fs.x, fs.y);
      this.ctx.scale(scale, scale);
      this.ctx.font = 'bold 16px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = fs.color;
      this.ctx.fillStyle = fs.color;
      this.ctx.fillText(fs.text, 0, 0);
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(fs.text, 0, 0);
      this.ctx.fillStyle = fs.color;
      this.ctx.fillText(fs.text, 0, 0);
      this.ctx.restore();
    }

    const grad = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);
  }

  start() {
    const loop = (ts) => {
      const dt = Math.min(0.1, (ts - this.lastTime) / 1000 || 0);
      this.lastTime = ts;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
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

    this.keys = {};

    // Touch controls
    this.touchX = null;
    this.touchActive = false;

    // Audio
    this.audio = new AudioManager();

    // Background frames
    this.bgFrames = [];
    this.bgLoaded = false;
    this.bgLoadCount = 0;
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameDelay = 1.0;

    // Tooltip
    this.tooltip = document.getElementById('skillTooltip');

    // Scale
    this.scale = 1;
    this.viewW = 800;
    this.viewH = 600;

    this.isSkillPanelOpen = false;

    this.setupResize();
    this.setup();
    this.setupInput();
    this.setupUI();
    this.loadBackgroundFrames();

    Leaf.initNormalSprite();

    this.updateHUD();
    this.start();
  }

  loadBackgroundFrames() {
    const frameFiles = [
      'Sprites/background_image1.png',
      'Sprites/background_image2.png',
      'Sprites/background_image3.png'
    ];

    frameFiles.forEach((src, index) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        this.bgFrames[index] = img;
        this.bgLoadCount++;
        if (this.bgLoadCount === frameFiles.length) {
          this.bgLoaded = true;
        }
      };
      img.onerror = () => {
        this.bgFrames[index] = null;
        this.bgLoadCount++;
        if (this.bgLoadCount === frameFiles.length) {
          this.bgLoaded = true;
        }
      };
    });
  }

  setup() {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || 800;
    const h = r.height || 600;
    const scale = this.scale || 1;
    const playerSize = 64 * scale;
    this.player = new Player(w / 2 - playerSize / 2, h - 100 * scale, playerSize);
    this.entities.push(this.player);
    this.skillTree.available = 0;
  }

  setupResize() {
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = this.canvas.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) {
        this.scale = 1;
        this.viewW = 800;
        this.viewH = 600;
        return;
      }

      // Reference size – we use 800x600 as base
      const refHeight = 600;
      const refWidth = 800;
      const scaleH = r.height / refHeight;
      const scaleW = r.width / refWidth;
      // Use the smaller scale to fit everything inside the viewport
      let newScale = Math.min(scaleH, scaleW);
      // Clamp: minimum 0.7 (good for mobile), maximum 1.6 (good for big screens)
      newScale = Math.max(0.7, Math.min(1.6, newScale));

      this.scale = newScale;
      this.viewW = r.width;
      this.viewH = r.height;

      this.canvas.width = Math.floor(r.width * dpr);
      this.canvas.height = Math.floor(r.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = false;

      if (this.player) {
        const size = 64 * this.scale;
        this.player.width = size;
        this.player.height = size;
        this.player.y = r.height - 100 * this.scale;
        this.player.x = Math.min(this.player.x, r.width - size);
      }

      // Update combo bar position dynamically
      const comboBar = document.getElementById('comboBar');
      if (comboBar) {
        const hudHeight = document.getElementById('hud')?.getBoundingClientRect().height || 48;
        const topOffset = Math.max(58, hudHeight + 14);
        comboBar.style.top = (topOffset * this.scale) + 'px';
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
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === 'Escape') this.toggleSkillPanel(false);
      this.audio.forceResume();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Touch drag (no leaf tap)
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.audio.forceResume();
      if (this.state !== 'playing') return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
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

    // No mouse click for leaves
  }

  setupUI() {
    document.getElementById('startBtn').addEventListener('click', () => {
      document.getElementById('startScreen').classList.add('hidden');
      this.state = 'playing';
      this.audio.forceResume();
      this.audio.playMusic();
    });
    document.getElementById('skillBtn').addEventListener('click', () => {
      this.audio.forceResume();
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
      this.isSkillPanelOpen = true;
      this.renderSkillTree();
      this.tooltip.classList.remove('visible');
    } else {
      panel.classList.add('hidden');
      this.isSkillPanelOpen = false;
      this.tooltip.classList.remove('visible');
    }
  }

  // ---- Tree layout ----
  getTreeLayout() {
    return {
      root: { x: 50, y: 16, size: 'large' },
      branches: {
        fortune: {
          x: 17, y: 36, size: 'medium',
          children: [
            { id: 'golden', x: 8, y: 58, size: 'small' },
            { id: 'combo', x: 26, y: 58, size: 'small' }
          ],
          capstone: { id: 'goldenHoard', x: 17, y: 80, size: 'large' }
        },
        swift: {
          x: 50, y: 36, size: 'medium',
          children: [
            { id: 'big', x: 42, y: 58, size: 'small' },
            { id: 'magnet', x: 58, y: 58, size: 'small' }
          ],
          capstone: { id: 'cycloneStep', x: 50, y: 80, size: 'large' }
        },
        harvest: {
          x: 83, y: 36, size: 'medium',
          children: [
            { id: 'slow', x: 74, y: 58, size: 'small' },
            { id: 'blue', x: 92, y: 58, size: 'small' }
          ],
          capstone: { id: 'naturesBlessing', x: 83, y: 80, size: 'large' }
        }
      }
    };
  }

  showTooltip(e, nodeData) {
    const tooltip = this.tooltip;
    if (!tooltip.querySelector('.tooltip-name')) {
      tooltip.innerHTML = `
        <div class="tooltip-name"></div>
        <div class="tooltip-desc"></div>
        <div class="tooltip-cost"></div>
        <div class="tooltip-level"></div>
      `;
    }

    const name = tooltip.querySelector('.tooltip-name');
    const desc = tooltip.querySelector('.tooltip-desc');
    const cost = tooltip.querySelector('.tooltip-cost');
    const level = tooltip.querySelector('.tooltip-level');

    if (nodeData.id === 'root') {
      name.textContent = '🍁 Leaf Knowledge';
      desc.textContent = 'The beginning of all wisdom – unlocks all specializations';
      const purchased = this.skillTree.rootPurchased;
      if (purchased) {
        cost.textContent = '✅ Purchased';
        level.textContent = '';
      } else {
        cost.textContent = `💰 500 coins`;
        level.textContent = this.money >= 500 ? '✅ Can afford' : '❌ Need 500 coins';
      }
    } else {
      const skill = this.skillTree.skills[nodeData.id];
      if (skill) {
        const maxed = skill.level >= skill.max;
        name.textContent = `${skill.icon} ${skill.name}`;
        desc.textContent = skill.desc;
        if (maxed) {
          cost.textContent = '⭐ MAXED';
          level.textContent = `Level ${skill.level}/${skill.max}`;
        } else {
          const spCost = skill.cost;
          const moneyCost = this.skillTree.getMoneyCost(nodeData.id);
          cost.textContent = `💰 ${moneyCost} coins  •  ⭐ ${spCost} SP`;
          level.textContent = `Level ${skill.level}/${skill.max}`;
        }
      }
    }

    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left + 16;
    let y = e.clientY - rect.top - 10;

    const tooltipRect = tooltip.getBoundingClientRect();
    const maxX = rect.width - tooltipRect.width - 10;
    const maxY = rect.height - tooltipRect.height - 10;
    if (x > maxX) x = e.clientX - rect.left - tooltipRect.width - 16;
    if (y > maxY) y = e.clientY - rect.top - tooltipRect.height - 10;
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
    tooltip.classList.add('visible');
  }

  // ---- FULL SKILL TREE RENDER ----
  renderSkillTree() {
    const grid = document.getElementById('skillGrid');
    const availPoints = this.skillTree.available;
    document.getElementById('availPoints').textContent = availPoints;
    const moneyEl = document.getElementById('availMoney');
    if (moneyEl) moneyEl.textContent = this.money;

    const layout = this.getTreeLayout();

    const nodes = [];
    const connections = [];

    const rootPurchased = this.skillTree.rootPurchased;
    let rootState = rootPurchased ? 'root-purchased' : (this.money >= 500 ? 'root-affordable' : 'root-unaffordable');

    const rootNode = {
      id: 'root',
      icon: '🍁',
      name: 'Leaf Knowledge',
      desc: 'The beginning of all wisdom',
      color: '#ffd700',
      level: rootPurchased ? 1 : 0,
      max: 1,
      cost: 0,
      moneyCost: 500,
      branch: null,
      tier: 0,
      x: layout.root.x,
      y: layout.root.y,
      size: 'large',
      state: rootState,
      purchasable: !rootPurchased && this.money >= 500,
    };
    nodes.push(rootNode);

    const branchConfig = layout.branches;

    Object.entries(branchConfig).forEach(([branchKey, config]) => {
      const branchId = branchKey;
      const branchColor = this.skillTree.skills[config.children[0]?.id]?.color || '#ffd700';

      const tier1Skills = Object.entries(this.skillTree.skills).filter(([_, s]) => s.branch === branchId && s.tier === 1);
      const specId = tier1Skills[0]?.[0];
      const specSkill = specId ? this.skillTree.skills[specId] : null;

      if (!specSkill) return;

      const specLevel = specSkill.level;
      const specMax = specSkill.max;
      const specIsMaxed = specLevel >= specMax;
      const specCanBuy = this.skillTree.canPurchase(specId, this.money).can;
      const specState = specIsMaxed ? 'mastered' : (specLevel > 0 ? 'purchased' : (specCanBuy && rootPurchased ? 'available' : 'locked'));

      const specNode = {
        id: specId,
        icon: specSkill.icon,
        name: specSkill.name,
        desc: specSkill.desc,
        color: specSkill.color,
        level: specLevel,
        max: specMax,
        cost: specSkill.cost,
        moneyCost: this.skillTree.getMoneyCost(specId),
        branch: branchId,
        tier: 1,
        x: config.x,
        y: config.y,
        size: config.size,
        state: specState,
        purchasable: specCanBuy && !specIsMaxed && rootPurchased,
      };
      nodes.push(specNode);

      connections.push({
        from: 'root',
        to: specId,
        active: specLevel > 0 || specState === 'available' || rootPurchased,
        color: branchColor,
      });

      config.children.forEach(child => {
        const childSkill = this.skillTree.skills[child.id];
        if (!childSkill) return;

        const childLevel = childSkill.level;
        const childMax = childSkill.max;
        const childIsMaxed = childLevel >= childMax;
        const childCanBuy = specLevel > 0 && this.skillTree.canPurchase(child.id, this.money).can;
        const childState = childIsMaxed ? 'mastered' : (childLevel > 0 ? 'purchased' : (childCanBuy ? 'available' : 'locked'));

        const childNode = {
          id: child.id,
          icon: childSkill.icon,
          name: childSkill.name,
          desc: childSkill.desc,
          color: childSkill.color,
          level: childLevel,
          max: childMax,
          cost: childSkill.cost,
          moneyCost: this.skillTree.getMoneyCost(child.id),
          branch: branchId,
          tier: 2,
          x: child.x,
          y: child.y,
          size: child.size || 'small',
          state: childState,
          purchasable: childCanBuy && !childIsMaxed,
        };
        nodes.push(childNode);

        connections.push({
          from: specId,
          to: child.id,
          active: childLevel > 0 || childState === 'available',
          color: branchColor,
        });
      });

      const capConfig = config.capstone;
      if (capConfig) {
        const capSkill = this.skillTree.skills[capConfig.id];
        if (!capSkill) return;

        const capLevel = capSkill.level;
        const capMax = capSkill.max;
        const capIsMaxed = capLevel >= capMax;
        const tier2Skills = Object.entries(this.skillTree.skills).filter(([_, s]) => s.branch === branchId && s.tier === 2);
        const allTier2Purchased = tier2Skills.every(([_, s]) => s.level > 0);
        const capCanBuy = allTier2Purchased && this.skillTree.canPurchase(capConfig.id, this.money).can;
        const capState = capIsMaxed ? 'mastered' : (capLevel > 0 ? 'purchased' : (capCanBuy ? 'available' : 'locked'));

        const capNode = {
          id: capConfig.id,
          icon: capSkill.icon,
          name: capSkill.name,
          desc: capSkill.desc,
          color: capSkill.color,
          level: capLevel,
          max: capMax,
          cost: capSkill.cost,
          moneyCost: this.skillTree.getMoneyCost(capConfig.id),
          branch: branchId,
          tier: 3,
          x: capConfig.x,
          y: capConfig.y,
          size: capConfig.size || 'large',
          state: capState,
          purchasable: capCanBuy && !capIsMaxed,
        };
        nodes.push(capNode);

        tier2Skills.forEach(([t2Id, _]) => {
          connections.push({
            from: t2Id,
            to: capConfig.id,
            active: capLevel > 0 || capState === 'available',
            color: branchColor,
          });
        });
      }
    });

    // ---- SVG lines ----
    let svgLines = `<svg class="tree-lines" viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;position:absolute;top:0;left:0;pointer-events:none;z-index:1;">`;

    connections.forEach(conn => {
      const fromNode = nodes.find(n => n.id === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return;

      const fromX = fromNode.x;
      const fromY = fromNode.y;
      const toX = toNode.x;
      const toY = toNode.y;

      const sizeMap = { large: 6, medium: 5, small: 4 };
      const fromOffset = sizeMap[fromNode.size] || 4;
      const toOffset = sizeMap[toNode.size] || 4;

      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const fromX2 = fromX + (dx / dist) * fromOffset;
      const fromY2 = fromY + (dy / dist) * fromOffset;
      const toX2 = toX - (dx / dist) * toOffset;
      const toY2 = toY - (dy / dist) * toOffset;

      const color = conn.active ? conn.color : '#3a2a3a';
      const thickness = conn.active ? 2.5 : 2;
      const opacity = conn.active ? 1 : 0.3;

      svgLines += `<line x1="${fromX2}" y1="${fromY2}" x2="${toX2}" y2="${toY2}" stroke="${color}" stroke-width="${thickness}" stroke-linecap="square" opacity="${opacity}"/>`;
    });

    svgLines += `</svg>`;

    // ---- HTML nodes ----
    let nodesHtml = '';
    const sizeMap = { large: 60, medium: 48, small: 36 };

    nodes.forEach(node => {
      const isRoot = node.id === 'root';
      const size = sizeMap[node.size] || 40;
      const classes = `skill-node ${node.state}`;
      const style = `--accent:${node.color}; width:${size}px; height:${size}px; font-size:${size * 0.4}px;`;

      let pipsHtml = '';
      if (!isRoot && node.max > 1) {
        pipsHtml = `<div class="skill-pips">`;
        for (let i = 0; i < node.max; i++) {
          pipsHtml += `<span class="skill-pip ${i < node.level ? 'filled' : ''}"></span>`;
        }
        pipsHtml += `</div>`;
      }

      let starHtml = '';
      if (node.state === 'mastered' && node.tier === 3) {
        starHtml = `<span class="mastered-star">⭐</span>`;
      }

      let lockHtml = '';
      if (node.state === 'locked') {
        lockHtml = `<span class="lock-overlay">🔒</span>`;
      }

      const nodeHtml = `
        <div class="skill-node-wrapper" style="left:${node.x}%; top:${node.y}%;">
          <div class="${classes}" style="${style}" data-id="${node.id}" data-branch="${node.branch || 'root'}" data-tier="${node.tier}">
            <span class="skill-icon">${node.icon}</span>
            ${pipsHtml}
            ${starHtml}
            ${lockHtml}
          </div>
        </div>
      `;
      nodesHtml += nodeHtml;
    });

    grid.innerHTML = svgLines + nodesHtml;

    // ---- Bind events ----
    grid.querySelectorAll('.skill-node').forEach(nodeEl => {
      const id = nodeEl.dataset.id;

      nodeEl.addEventListener('click', (e) => {
        e.stopPropagation();

        if (id === 'root') {
          const result = this.skillTree.buyRoot(this.money);
          if (result.success) {
            this.money -= result.moneyCost;
            this.audio.playBuy();
            this.spawnParticles(
              this.canvas.getBoundingClientRect().width / 2,
              this.canvas.getBoundingClientRect().height / 2,
              30,
              { color: '#ffd700', shape: 'star' }
            );
            this.renderSkillTree();
            this.updateHUD();
          } else {
            nodeEl.classList.add('deny-shake');
            setTimeout(() => nodeEl.classList.remove('deny-shake'), 300);
          }
          return;
        }

        const result = this.skillTree.buy(id, this.money);
        if (result.success) {
          this.money -= result.moneyCost;
          this.audio.playBuy();
          this.spawnParticles(
            this.canvas.getBoundingClientRect().width / 2,
            this.canvas.getBoundingClientRect().height / 2,
            30,
            { color: '#7cb342', shape: 'star' }
          );
          this.renderSkillTree();
          this.updateHUD();
        } else if (result.reason !== 'maxed') {
          nodeEl.classList.add('deny-shake');
          setTimeout(() => nodeEl.classList.remove('deny-shake'), 300);
        }
      });

      nodeEl.addEventListener('mouseenter', (e) => {
        let nodeData = nodes.find(n => n.id === id);
        if (!nodeData) return;
        this.showTooltip(e, nodeData);
      });

      nodeEl.addEventListener('mousemove', (e) => {
        let nodeData = nodes.find(n => n.id === id);
        if (!nodeData) return;
        this.showTooltip(e, nodeData);
      });

      nodeEl.addEventListener('mouseleave', () => {
        this.tooltip.classList.remove('visible');
      });

      nodeEl.addEventListener('touchstart', (e) => {
        let nodeData = nodes.find(n => n.id === id);
        if (!nodeData) return;
        const touch = e.changedTouches[0];
        const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
        this.showTooltip(fakeEvent, nodeData);
        setTimeout(() => this.tooltip.classList.remove('visible'), 3000);
      });
    });
  }

  // ---- SPAWN LEAVES ----
  spawnLeaf() {
    const { w } = this.getViewSize();
    const scale = this.scale || 1;
    const goldenChance = 0.02 + this.skillTree.getGoldenBonus();
    const blueChance = 0.008 + this.skillTree.getBlueBonus();
    const roll = Math.random();
    
    let type = 'normal';
    if (roll < blueChance) {
      type = 'blue';
    } else if (roll < blueChance + goldenChance) {
      type = 'golden';
    }
    
    const baseSize = 0.7 + Math.random() * 0.3;
    // Minimum leaf size: 28px on mobile, scales up on larger screens
    const minSize = 28 * (scale < 0.9 ? 1 : 1);
    const size = Math.max(minSize, baseSize * scale * 32);
    const opts = { 
      size: size,
      type: type,
      scale: scale
    };
    const leafX = Math.random() * (w - size);
    const leaf = new Leaf(leafX, -size, opts);
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
    const comboMul = 1 + Math.min(this.combo - 1, 20) * 0.05 * this.skillTree.getComboMul();

    let value = leaf.value * this.skillTree.getValueMul() * comboMul;
    if (leaf.blue) value += this.skillTree.getBlueValueBonus();
    if (clicked) value *= 1.5;
    value = Math.max(1, Math.round(value));

    value *= this.skillTree.getGoldenHoardBonus();
    value *= this.skillTree.getNaturesBlessingBonus();

    this.audio.playCollect();
    if (this.combo > 1) {
      this.audio.playCombo(this.combo);
    }

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

    if (this.isSkillPanelOpen) {
      const panelPoints = document.getElementById('availPoints');
      const panelMoney = document.getElementById('availMoney');
      if (panelPoints) panelPoints.textContent = this.skillTree.available;
      if (panelMoney) panelMoney.textContent = this.money;
    }
  }

  update(dt) {
    if (dt > 0.1) dt = 0.1;

    if (this.bgLoaded) {
      this.frameTimer += dt;
      if (this.frameTimer >= this.frameDelay) {
        this.frameTimer = 0;
        this.currentFrame = (this.currentFrame + 1) % this.bgFrames.length;
      }
    }

    const scale = this.scale || 1;

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
    this.player.speed = 380 * speedMul * scale;

    let dx = 0;
    if (this.keys['a'] || this.keys['arrowleft']) dx = -1;
    if (this.keys['d'] || this.keys['arrowright']) dx = 1;

    if (this.touchActive && this.touchX !== null) {
      const targetX = this.touchX - this.player.width / 2;
      const diff = targetX - this.player.x;
      const maxSpeed = this.player.speed * dt;
      if (Math.abs(diff) > 2) {
        const move = Math.min(Math.abs(diff), maxSpeed) * Math.sign(diff);
        this.player.x += move;
        this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
        dx = 0;
      } else {
        this.player.x = targetX;
        dx = 0;
      }
    }

    if (dx !== 0 && !this.touchActive) {
      this.player.x += dx * this.player.speed * dt;
      this.player.x = Math.max(0, Math.min(this.player.x, w - this.player.width));
    }

    this.player.updateTilt(dx, dt);
    this.player.bobPhase += dt * 3;

    if (this.keys['w'] || this.keys['arrowup']) {
      this.player.catchFlashTimer = 0.2;
    }
    if (this.player.catchFlashTimer > 0) {
      this.player.catchFlashTimer -= dt;
    }

    this.spawnTimer -= dt;
    const rate = this.baseSpawnRate / this.skillTree.getSpawnMul();
    if (this.spawnTimer <= 0) {
      this.spawnLeaf();
      this.spawnTimer = rate * (0.7 + Math.random() * 0.6);
    }

    const fallMul = this.skillTree.getFallMul();
    const magnetRange = this.skillTree.getMagnetRange() * scale;
    const catchBounds = this.player.getCatchBounds();
    const basketMul = this.skillTree.getBasketMul();
    catchBounds.x -= (catchBounds.width * (basketMul - 1)) / 2;
    catchBounds.width *= basketMul;

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
          const force = (1 - dist / magnetRange) * 200 * scale;
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

      if (leaf.y > h + 60 * scale) {
        this.leaves.splice(i, 1);
        const ei = this.entities.indexOf(leaf);
        if (ei >= 0) this.entities.splice(ei, 1);
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboTimer = 0;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.dead) {
        this.particles.splice(i, 1);
        const ei = this.entities.indexOf(p);
        if (ei >= 0) this.entities.splice(ei, 1);
      }
    }

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
    const scale = this.scale || 1;

    // Draw background frame if loaded, otherwise solid dark color
    if (this.bgLoaded && this.bgFrames[this.currentFrame]) {
      ctx.drawImage(this.bgFrames[this.currentFrame], 0, 0, w, h);
    } else {
      // Solid dark fallback – no gradient flash
      ctx.fillStyle = '#1a0e2e';
      ctx.fillRect(0, 0, w, h);
    }

    // Ground shadow overlay
    ctx.fillStyle = 'rgba(15, 8, 20, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0, h - 50 * scale);
    for (let x = 0; x <= w; x += 10) {
      const yy = h - 50 * scale - Math.sin(x * 0.02) * 6 * scale;
      ctx.lineTo(Math.round(x), Math.round(yy));
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(30, 15, 30, 0.85)';
    ctx.fillRect(0, h - 25 * scale, w, 25 * scale);
  }

  draw() {
    const { w, h } = this.getViewSize();
    this.ctx.clearRect(0, 0, w, h);
    this.drawBackground();

    if (this.state === 'playing' && this.skillTree.getMagnetRange() > 0 && this.player) {
      const cb = this.player.getCatchBounds();
      const cx = cb.x + cb.width / 2;
      const cy = cb.y + cb.height / 2;
      const range = this.skillTree.getMagnetRange() * this.scale;
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
      this.ctx.font = `bold ${16 * this.scale}px "Press Start 2P", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowBlur = 12 * this.scale;
      this.ctx.shadowColor = fs.color;
      this.ctx.fillStyle = fs.color;
      this.ctx.fillText(fs.text, 0, 0);
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      this.ctx.lineWidth = 3 * this.scale;
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
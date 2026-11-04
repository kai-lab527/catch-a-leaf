/* =====================================================================
 * Extras.js : CATCH-A-LEAF PLUS
 * ---------------------------------------------------------------------
 * Drop-in expansion pack. Add it AFTER Intro.js, before the inline boot
 * script at the bottom of index.html:
 *
 *     <script src="Intro.js"></script>
 *     <script src="Extras.js"></script>
 *
 * Zero edits to existing files. It wraps Game.prototype the same way
 * Intro.js / ShopIcons.js already do. Every wrapper is fail-safe: if this
 * file ever throws too many times it unplugs itself and the vanilla game
 * keeps running (important, because Game's rAF loop dies on any throw).
 *
 *   1. SAVE SYSTEM     localStorage autosave: money, level, xp, shop, stats
 *   2. POWER-UP ORBS   5 timed buffs, painted from code (no new PNGs)
 *   3. ROTTEN LEAVES   hazard from level 3: wipes combo, steals coins
 *   4. WIND GUSTS      telegraphed, sine-eased sideways pushes + streak FX
 *   5. DAY / NIGHT     multiply-blend tint cycle, fireflies, moonlit gold
 *   6. ACHIEVEMENTS    15 unlocks with coin rewards + pixel toasts
 *   7. PAUSE MENU      P key / button / auto-pause, volume, stats, reset
 *   8. SCREEN SHAKE    + damage flash + shield / time-warp visuals
 *
 * Console toys:
 *   LeafPlus.give('midas')   instantly grant a buff
 *                            (warp | magnet | midas | storm | shield)
 *   LeafPlus.drop('shield')  drop an orb onto the bin (or 'rotten')
 *   LeafPlus.gust(1)         force a wind gust (1 = right, -1 = left)
 *   LeafPlus.night()         jump the clock to midnight
 *   LeafPlus.wipe()          delete the save and reload
 *   LeafPlus.config          live-tweak every tunable below
 * ===================================================================== */
(() => {
  'use strict';

  if (typeof Game === 'undefined' || typeof Leaf === 'undefined' || typeof GameObject === 'undefined') {
    console.warn('[Plus] Extras.js must load AFTER Game.js / Leaf.js / GameObject.js. Skipping.');
    return;
  }
  if (window.LeafPlus) return;

  /* ===================================================================
   * CONFIG: every tunable lives here
   * =================================================================== */
  const CONFIG = {
    saveKey: 'catchaleaf.plus.save.v1',
    autosaveEvery: 5, // seconds
    features: {
      persistence: true,
      powerups: true,
      rotten: true,
      wind: true,
      achievements: true,
      pause: true,
      dayNight: true
    },
    powerups: { chance: 0.05, cooldown: 14, stackCap: 1.6 },
    rotten: {
      fromLevel: 3,
      baseChance: 0.04,
      perLevel: 0.006,
      maxChance: 0.14,
      maxOnScreen: 3,
      penaltyPct: 0.04,
      penaltyCap: 400
    },
    wind: {
      firstDelay: [18, 28],
      gap: [24, 44],
      warn: 1.6,
      duration: [4.5, 6.5],
      strength: [70, 120] // px/s at scale 1
    },
    dayNight: { length: 240, startPhase: 0.12, moonGoldChance: 0.05 }
  };

  /* ===================================================================
   * helpers
   * =================================================================== */
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const range = (r) => rand(r[0], r[1]);
  const smooth = (t) => t * t * (3 - 2 * t);
  const num = (v, lo, hi, d = 0) => { v = Number(v); return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
  const fmt = (n) => (typeof Fmt !== 'undefined' ? Fmt.short(n) : String(Math.floor(n)));
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtTime = (s) => {
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + pad2(m) : String(m)) + ':' + pad2(sec);
  };
  const el = (tag, cls) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    n.dataset.plusUi = '1';
    return n;
  };

  /* ===================================================================
   * Power-up + icon art (all procedural)
   * =================================================================== */
  const POWERS = {
    warp:   { name: 'TIME WARP',   color: '#5ad2ff', duration: 8,  weight: 3, desc: 'Leaves fall 55% slower' },
    magnet: { name: 'MEGA MAGNET', color: '#ff6b8a', duration: 9,  weight: 3, desc: 'Leaves fly into your bin' },
    fast:   { name: 'FAST FORWARD', color: '#ff9b42', duration: 5,  weight: 2, desc: 'Game runs 2x faster' },
    midas:  { name: 'MIDAS TOUCH', color: '#ffd23f', duration: 8,  weight: 2, desc: 'Leaf value x2.5' },
    storm:  { name: 'LEAF STORM',  color: '#9bda62', duration: 7,  weight: 2, desc: 'x2.6 leaf drops' },
    shield: { name: 'BIN SHIELD',  color: '#b58cff', duration: 10, weight: 2, desc: 'Rotten leaves bounce off' }
  };

  function leafPath(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 1.05, -r * 0.15, 0, r);
    ctx.quadraticCurveTo(-r * 1.05, -r * 0.15, 0, -r);
    ctx.closePath();
  }

  const ICONS = {
    warp(ctx, s, c) {
      ctx.fillStyle = c; ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s); ctx.lineTo(s * 0.8, -s);
      ctx.moveTo(-s * 0.8, s); ctx.lineTo(s * 0.8, s);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.9); ctx.lineTo(s * 0.6, -s * 0.9); ctx.lineTo(0, 0); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.6, s * 0.9); ctx.lineTo(s * 0.6, s * 0.9); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    },
    magnet(ctx, s, c) {
      ctx.lineCap = 'butt'; ctx.lineWidth = s * 0.5; ctx.strokeStyle = c;
      ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.62, 0, Math.PI); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, -s * 0.05); ctx.lineTo(-s * 0.62, -s * 0.85);
      ctx.moveTo(s * 0.62, -s * 0.05); ctx.lineTo(s * 0.62, -s * 0.85);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.moveTo(-s * 0.62, -s * 0.85); ctx.lineTo(-s * 0.62, -s * 0.52); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.moveTo(s * 0.62, -s * 0.85); ctx.lineTo(s * 0.62, -s * 0.52); ctx.stroke();
    },
    fast(ctx, s, c) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.9, s); ctx.closePath();
      ctx.moveTo(-s * 0.05, -s); ctx.lineTo(s * 0.85, 0); ctx.lineTo(-s * 0.05, s); ctx.closePath();
      ctx.fill();
    },
    midas(ctx, s, c) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = s * 0.16;
      ctx.beginPath(); ctx.arc(0, 0, s * 0.72, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#5a3a00';
      ctx.font = `700 ${s * 1.1}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u00A2', 0, s * 0.06);
    },
    storm(ctx, s, c) {
      ctx.fillStyle = c;
      for (const [x, y, k, a] of [[-0.55, -0.5, 0.55, 0.6], [0.5, -0.15, 0.6, -0.5], [-0.1, 0.62, 0.55, 1.1]]) {
        ctx.save(); ctx.translate(x * s, y * s); ctx.rotate(a);
        leafPath(ctx, k * s); ctx.fill();
        ctx.restore();
      }
    },
    shield(ctx, s, c) {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.55); ctx.lineTo(s * 0.75, s * 0.15);
        ctx.quadraticCurveTo(s * 0.5, s * 0.75, 0, s);
        ctx.quadraticCurveTo(-s * 0.5, s * 0.75, -s * 0.75, s * 0.15);
        ctx.lineTo(-s * 0.85, -s * 0.55); ctx.closePath();
      };
      ctx.fillStyle = c; path(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.55); ctx.lineTo(s * 0.75, s * 0.15);
      ctx.quadraticCurveTo(s * 0.5, s * 0.75, 0, s); ctx.closePath(); ctx.fill();
    },
    wind(ctx, s, c) {
      ctx.strokeStyle = c; ctx.lineWidth = s * 0.24; ctx.lineCap = 'round';
      for (const y of [-0.6, 0, 0.6]) {
        ctx.beginPath();
        ctx.moveTo(-s, y * s);
        ctx.bezierCurveTo(-s * 0.4, y * s - s * 0.5, s * 0.2, y * s + s * 0.5, s, y * s);
        ctx.stroke();
      }
    }
  };

  function iconCanvas(kind, px, color) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = c.height = Math.round(px * dpr);
    c.style.width = c.style.height = px + 'px';
    const g = c.getContext('2d');
    if (g) { g.scale(dpr, dpr); g.translate(px / 2, px / 2); ICONS[kind](g, px * 0.38, color); }
    return c;
  }

  /* ===================================================================
   * New falling things. They extend Leaf so Game.update treats them
   * exactly like any other leaf (fall, sway, magnet, collision, cull).
   * =================================================================== */
  class PowerOrb extends Leaf {
    constructor(x, y, kind, opts = {}) {
      super(x, y, { ...opts, type: 'powerup' });
      this.name = 'PowerOrb';
      this.kind = kind;
      this.power = POWERS[kind];
      this.color = this.power.color;
      this.value = 0;
      this.isPowerUp = true;
      this.spriteLoaded = true;
      this.vy *= 0.8;
    }
    loadSprite() { /* procedural: nothing to fetch */ }
    draw(ctx) {
      if (this.collected) return;
      const r = this.width / 2, c = this.power.color, t = this.pulse;
      ctx.save();
      ctx.translate(this.x + r, this.y + r + Math.sin(t * 0.8) * 2);
      if (GameObject.glow >= 0.5) { ctx.shadowBlur = 12 + Math.sin(t) * 6; ctx.shadowColor = c; }
      ctx.fillStyle = '#1b0f2a';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, r * 0.16); ctx.strokeStyle = c;
      ctx.setLineDash([r * 0.55, r * 0.3]);
      ctx.lineDashOffset = -t * r * 0.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ICONS[this.kind](ctx, r * 0.55, c);
      ctx.restore();
    }
  }

  class RottenLeaf extends Leaf {
    constructor(x, y, opts = {}) {
      super(x, y, { ...opts, type: 'rotten' });
      this.name = 'RottenLeaf';
      this.color = '#8fd14f';
      this.value = 0;
      this.isRotten = true;
      this.spriteLoaded = true;
      this._ix = this.x; // x before the magnet gets a chance to drag it
      this.vy *= 1.12;
    }
    loadSprite() { /* procedural */ }
    update(dt, h, m) {
      super.update(dt, h, m);
      this._ix = this.x;
    }
    draw(ctx) {
      if (this.collected) return;
      const r = this.width / 2, warn = 0.55 + Math.sin(this.pulse * 1.6) * 0.45;
      ctx.save();
      ctx.translate(this.x + r, this.y + r);
      ctx.rotate(this.rot);
      if (GameObject.glow >= 0.5) { ctx.shadowBlur = 8 + warn * 6; ctx.shadowColor = '#c0392b'; }
      ctx.fillStyle = '#4a2c3a';
      leafPath(ctx, r); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, r * 0.1);
      ctx.strokeStyle = `rgba(255,70,70,${0.5 + warn * 0.45})`;
      ctx.stroke();
      ctx.strokeStyle = '#2a1520';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 0.9); ctx.stroke();
      ctx.fillStyle = '#8fd14f';
      for (const [a, b, k] of [[-0.28, -0.2, 0.16], [0.25, 0.1, 0.13], [-0.1, 0.45, 0.11]]) {
        ctx.beginPath(); ctx.arc(a * r, b * r, k * r, 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.12); ctx.lineTo(r * 0.3, r * 0.3);
      ctx.moveTo(r * 0.3, -r * 0.12); ctx.lineTo(-r * 0.3, r * 0.3);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ===================================================================
   * Day / night keyframes: [phase, r, g, b, nightFactor, name]
   * =================================================================== */
  const SKY = [
    [0.00, 255, 214, 176, 0.10, 'DAWN'],
    [0.12, 255, 255, 255, 0.00, 'DAY'],
    [0.52, 255, 255, 255, 0.00, 'DAY'],
    [0.66, 255, 184, 138, 0.20, 'DUSK'],
    [0.78, 112, 126, 196, 0.85, 'NIGHT'],
    [0.92, 100, 114, 186, 1.00, 'NIGHT'],
    [1.00, 255, 214, 176, 0.10, 'DAWN']
  ];
  const PHASE_TEXT = {
    DAWN:  ['SUNRISE', '#ffd6b0'],
    DAY:   ['DAYTIME', '#fff3a3'],
    DUSK:  ['SUNSET', '#ffb88a'],
    NIGHT: ['NIGHTFALL: MORE GOLD', '#9fb4ff']
  };
  function skyAt(phase) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (phase >= a[0] && phase <= b[0]) {
        const t = smooth((phase - a[0]) / (b[0] - a[0] || 1));
        return {
          r: lerp(a[1], b[1], t), g: lerp(a[2], b[2], t), b: lerp(a[3], b[3], t),
          night: lerp(a[4], b[4], t), name: t < 0.5 ? a[5] : b[5]
        };
      }
    }
    return { r: 255, g: 255, b: 255, night: 0, name: 'DAY' };
  }
  const FIREFLIES = Array.from({ length: 18 }, () => ({
    bx: Math.random(), by: 0.3 + Math.random() * 0.5,
    sp: 0.4 + Math.random() * 0.8, ph: Math.random() * TAU, amp: 14 + Math.random() * 26
  }));

  /* ===================================================================
   * Achievements
   * =================================================================== */
  const ACHIEVEMENTS = [
    { id: 'first',   name: 'FIRST CATCH',     desc: 'Catch a leaf',                  reward: 25,   test: (c) => c.s.caught >= 1 },
    { id: 'c100',    name: 'LEAF HOARDER',    desc: 'Catch 100 leaves',              reward: 150,  test: (c) => c.s.caught >= 100 },
    { id: 'c1000',   name: 'LEAF BARON',      desc: 'Catch 1,000 leaves',            reward: 1200, test: (c) => c.s.caught >= 1000 },
    { id: 'combo10', name: 'ON A ROLL',       desc: 'Reach a x10 combo',             reward: 100,  test: (c) => c.s.bestCombo >= 10 },
    { id: 'combo25', name: 'UNSTOPPABLE',     desc: 'Reach a x25 combo',             reward: 600,  test: (c) => c.s.bestCombo >= 25 },
    { id: 'gold5',   name: 'GOLD DIGGER',     desc: 'Catch 5 golden leaves',         reward: 300,  test: (c) => c.s.golden >= 5 },
    { id: 'blue5',   name: 'BLUE MOON',       desc: 'Catch 5 blue leaves',           reward: 200,  test: (c) => c.s.blue >= 5 },
    { id: 'lvl5',    name: 'GETTING THERE',   desc: 'Reach level 5',                 reward: 250,  test: (c) => c.g.level >= 5 },
    { id: 'lvl10',   name: 'VETERAN RAKER',   desc: 'Reach level 10',                reward: 1000, test: (c) => c.g.level >= 10 },
    { id: 'shop3',   name: 'BIG SPENDER',     desc: 'Buy 3 shop upgrades',           reward: 200,  test: (c) => c.shopCount >= 3 },
    { id: 'power3',  name: 'POWER HUNGRY',    desc: 'Grab 3 power-up orbs',          reward: 300,  test: (c) => c.s.powerups >= 3 },
    { id: 'shield1', name: 'NOT TODAY',       desc: 'Block a rotten leaf',           reward: 250,  test: (c) => c.s.blocked >= 1 },
    { id: 'gust5',   name: 'WINDSWEPT',       desc: 'Weather 5 wind gusts',          reward: 300,  test: (c) => c.s.gusts >= 5 },
    { id: 'rich',    name: 'POCKET SQUIRREL', desc: 'Earn 10,000 coins in total',    reward: 500,  test: (c) => c.s.earned >= 10000 }
  ];

  const defaultStats = () => ({
    caught: 0, golden: 0, blue: 0, rotten: 0, blocked: 0, powerups: 0,
    bestCombo: 0, earned: 0, playSeconds: 0, gusts: 0, sessions: 0
  });

  /* ===================================================================
   * Save layer
   * =================================================================== */
  const Save = {
    read() {
      try {
        const raw = localStorage.getItem(CONFIG.saveKey);
        const d = raw ? JSON.parse(raw) : null;
        return d && typeof d === 'object' ? d : null;
      } catch (e) { return null; }
    },
    write(d) {
      try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(d)); return true; } catch (e) { return false; }
    },
    wipe() { try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { /* private mode etc. */ } }
  };

  /* ===================================================================
   * Styles (matches the game's brown / gold / cream pixel palette)
   * =================================================================== */
  function injectCSS() {
    if (document.getElementById('plusCSS')) return;
    const st = document.createElement('style');
    st.id = 'plusCSS';
    st.textContent = `
.fx-tray{position:absolute;top:max(1.6vmin,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:.8vmin;pointer-events:none!important;z-index:12}
.fx-chip{position:relative;display:flex;align-items:center;gap:.9vmin;min-width:clamp(150px,24vmin,230px);padding:.8vmin 1.2vmin 1.1vmin;background:rgba(30,20,15,.86);border:max(2px,.3vmin) solid var(--c);box-shadow:max(2px,.3vmin) max(2px,.3vmin) 0 rgba(10,5,3,.55);font:700 clamp(7px,1.15vmin,10px)/1 'Press Start 2P','Courier New',monospace;color:#f5e8d8;text-shadow:.2vmin .2vmin 0 #0a0503;animation:fxChipIn .2s steps(4) both}
.fx-chip canvas{flex:none}
.fx-chip b{margin-left:auto;color:var(--c);font-weight:700}
.fx-chip.warn{animation:fxBlink .4s steps(1) infinite}
.fx-bar{position:absolute;left:0;right:0;bottom:0;height:max(3px,.5vmin);background:rgba(255,255,255,.08)}
.fx-bar u{display:block;height:100%;width:100%;background:var(--c);text-decoration:none}
@keyframes fxChipIn{from{transform:translateY(-1.5vmin) scale(.9);opacity:0}to{transform:none;opacity:1}}
@keyframes fxBlink{50%{opacity:.35}}

.fx-toasts{position:absolute;right:max(1.6vmin,env(safe-area-inset-right));top:calc(max(1.6vmin,env(safe-area-inset-top)) + clamp(46px,8vmin,66px));display:flex;flex-direction:column;gap:1vmin;width:min(46vw,280px);pointer-events:none!important;z-index:13}
.fx-toast{padding:1vmin 1.3vmin;background:#21131c;border:max(2px,.3vmin) solid #ffd51b;box-shadow:max(2px,.3vmin) max(2px,.3vmin) 0 #08040e;color:#f5e8d8;font:700 clamp(7px,1.05vmin,10px)/1.6 'Press Start 2P','Courier New',monospace;animation:fxToast 3.6s steps(6) both}
.fx-toast strong{display:block;color:#ffd51b}
.fx-toast small{display:block;color:#d4a06a;font-size:inherit}
.fx-toast em{font-style:normal;color:#9bda62}
@keyframes fxToast{0%{transform:translateX(115%)}8%{transform:none}88%{transform:none;opacity:1}100%{transform:translateX(115%);opacity:0}}

.fx-pausebtn{position:absolute;top:max(1.6vmin,env(safe-area-inset-top));right:max(1.6vmin,env(safe-area-inset-right));width:clamp(34px,6vmin,52px);height:clamp(34px,6vmin,52px);padding:0;background:#3d2817;border:max(2px,.35vmin) solid #f5c842;box-shadow:max(2px,.35vmin) max(2px,.35vmin) 0 #0a0503;cursor:pointer;z-index:12;-webkit-tap-highlight-color:transparent}
.fx-pausebtn::before,.fx-pausebtn::after{content:'';position:absolute;top:26%;bottom:26%;width:16%;background:#f5e8d8}
.fx-pausebtn::before{left:30%}
.fx-pausebtn::after{right:30%}
.fx-pausebtn:hover,.fx-pausebtn:focus-visible{filter:brightness(1.2);outline:0}
.fx-pausebtn:active{transform:translate(2px,2px)}
@media (max-width:700px){
  .fx-pausebtn{top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));width:50px;height:50px;background:rgba(61,40,23,.96);border:3px solid #ffd51b;z-index:30}
  .fx-pausebtn::before,.fx-pausebtn::after{width:18%;background:#fff4d6}
  .fx-pausebtn::before{left:25%}
  .fx-pausebtn::after{right:25%}
}

.fx-movebtn{display:none;position:absolute;bottom:calc(env(safe-area-inset-bottom) + 13vmin);width:clamp(48px,13vmin,68px);height:clamp(48px,13vmin,68px);padding:0;border:0;border-radius:0;background:transparent;color:rgba(255,255,255,.58);filter:drop-shadow(0 1px 2px rgba(0,0,0,.5));cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;z-index:11}
.fx-movebtn::before{content:'';position:absolute;top:50%;left:50%;width:0;height:0;border-top:10px solid transparent;border-bottom:10px solid transparent;transform:translate(-50%,-50%)}
.fx-movebtn.left{left:max(4vw,env(safe-area-inset-left))}
.fx-movebtn.left::before{border-right:14px solid currentColor}
.fx-movebtn.right{right:max(4vw,env(safe-area-inset-right))}
.fx-movebtn.right::before{border-left:14px solid currentColor}
.fx-movebtn:active,.fx-movebtn.is-pressed{background:transparent;color:rgba(255,255,255,.95)}
@media (max-width:700px){.fx-movebtn{display:block}}

.fx-pause{position:fixed;inset:0;z-index:4000;display:grid;place-items:center;padding:2vmin;background:rgba(10,5,20,.84)}
.fx-pause[hidden]{display:none}
.fx-panel{width:min(94vw,560px);max-height:min(92vh,760px);max-height:min(92dvh,760px);display:flex;flex-direction:column;gap:14px;padding:clamp(14px,2.4vmin,26px);color:#f5e8d8;background:#170b28;border:3px solid #744018;box-shadow:6px 6px 0 #08040e;font-family:'Pixelify Sans','Press Start 2P',monospace}
.fx-panel h2{margin:0;color:#ffd51b;font:700 clamp(14px,2.6vmin,22px)/1.3 'Press Start 2P',monospace;text-shadow:3px 3px 0 #5c2d12;text-align:center}
.fx-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:clamp(11px,1.6vmin,15px)}
.fx-grid div{display:flex;justify-content:space-between;gap:8px;color:#d4a06a}
.fx-grid b{color:#f5e8d8;font-weight:600}
.fx-vol{display:flex;align-items:center;gap:12px;font:700 clamp(8px,1.2vmin,11px) 'Press Start 2P',monospace;color:#d4a06a}
.fx-vol input{flex:1;accent-color:#ef701a;min-height:28px}
.fx-quality{display:flex;align-items:center;gap:10px;font:700 clamp(8px,1.2vmin,11px) 'Press Start 2P',monospace;color:#d4a06a}
.fx-quality select{flex:1;min-height:32px;padding:6px 8px;background:#21131c;border:2px solid #744018;color:#f5e8d8;font:inherit;text-transform:uppercase;outline:0}
.fx-controls{display:grid;gap:8px;padding:10px 12px;background:#21131c;border:2px solid #4d2a14}
.fx-controls h3{margin:0 0 2px;color:#ffd51b;font:700 clamp(8px,1.2vmin,11px) 'Press Start 2P',monospace}
.fx-control-row{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#d4a06a;font-size:clamp(11px,1.5vmin,14px)}
.fx-control-row b{color:#f5e8d8;text-align:right}
.fx-btns{display:flex;gap:10px}
.fx-btn{flex:1;min-height:44px;padding:10px;font:700 clamp(8px,1.2vmin,11px) 'Press Start 2P',monospace;color:#1d2711;background:#8bc34a;border:3px solid #314d18;box-shadow:3px 3px 0 #080d06;cursor:pointer}
.fx-btn:hover,.fx-btn:focus-visible{filter:brightness(1.15);outline:0}
.fx-btn.danger{color:#f5e8d8;background:#8e2f1f;border-color:#3d130c}

@media (prefers-reduced-motion:reduce){.fx-chip,.fx-toast{animation-duration:.01s!important}.fx-chip.warn{animation:none}}
`;
    document.head.appendChild(st);
  }

  /* ===================================================================
   * The controller
   * =================================================================== */
  class Plus {
    constructor(game) {
      this.g = game;
      this.dead = false;
      this.errors = 0;
      this.restored = false;
      this.wiped = false;
      this.dirty = false;
      this.quality = 1;
      this.clock = 0;
      this.sky = skyAt(CONFIG.dayNight.startPhase);
      this.phaseName = null;
      this.saveTimer = 0;
      this.sigTimer = 0;
      this.shopSig = null;
      this.cooldown = 6;
      this.stats = defaultStats();
      this.unlocked = {};
      this.active = {};
      this.chips = {};
      this.windChip = null;
      this.wind = { state: 'idle', t: range(CONFIG.wind.firstDelay), dur: 1, dir: 1, power: 0, env: 0, cur: 0, acc: 0 };
      this.streaks = [];
      this.shake = { t: 0, dur: 0.3, mag: 0 };
      this.flash = { t: 0, dur: 0.35, color: '#ff3b3b' };
      this._t = 0;
      this._confirmReset = false;
      this.buildUI();
      this.bind();
    }

    /* ---------- fail-safety ---------- */
    fail(label, e) {
      this.errors++;
      if (this.errors <= 3) console.error('[Plus] ' + label + ' failed', e);
      if (this.errors >= 8 && !this.dead) {
        console.warn('[Plus] too many errors, unplugging. Vanilla game continues.');
        this.teardown();
      }
    }
    safe(label, fn) {
      try { return fn(); } catch (e) { this.fail(label, e); }
    }
    teardown() {
      this.dead = true;
      if (this.g.state === 'paused') this.g.state = 'playing';
      document.querySelectorAll('[data-plus-ui]').forEach((n) => n.remove());
    }

    boot() {
      this.safe('restore', () => this.restore());
      this.shopSig = this.shopSignature();
    }

    /* ---------- UI ---------- */
    buildUI() {
      injectCSS();
      const hud = document.getElementById('hud');
      const layer = document.getElementById('ui-layer');
      if (!hud || !layer) throw new Error('#hud / #ui-layer missing');

      this.tray = el('div', 'fx-tray');
      this.toasts = el('div', 'fx-toasts');
      hud.append(this.tray, this.toasts);

      this.pauseBtn = el('button', 'fx-pausebtn');
      this.pauseBtn.type = 'button';
      this.pauseBtn.setAttribute('aria-label', 'Pause');
      this.pauseBtn.title = 'Pause (P)';
      if (!CONFIG.features.pause) this.pauseBtn.hidden = true;
      hud.appendChild(this.pauseBtn);

      this.arrowButtons = [
        ['left', 'arrowleft'],
        ['right', 'arrowright']
      ].map(([direction, key]) => {
        const button = el('button', 'fx-movebtn ' + direction);
        button.type = 'button';
        button.setAttribute('aria-label', 'Move ' + direction);
        this.bindArrowButton(button, key);
        hud.appendChild(button);
        return button;
      });

      this.panel = el('div', 'fx-pause');
      this.panel.hidden = true;
      this.panel.innerHTML = `
        <div class="fx-panel" role="dialog" aria-modal="true" aria-label="Paused">
          <h2>PAUSED</h2>
          <div class="fx-grid" data-role="stats"></div>
          <label class="fx-vol"><span>VOL</span><input type="range" min="0" max="100" step="1" data-role="vol" aria-label="Volume"></label>
          <label class="fx-quality"><span>QUALITY</span>
            <select data-role="quality" aria-label="Graphics quality">
              <option value="0">LOW</option>
              <option value="1">MEDIUM</option>
              <option value="2">HIGH</option>
            </select>
          </label>
          <section class="fx-controls" aria-labelledby="fxControlsTitle">
            <h3 id="fxControlsTitle">CONTROLS</h3>
            <div class="fx-control-row"><span>Move</span><b>A / D or ← / →</b></div>
            <div class="fx-control-row"><span>Touch</span><b>Drag to move</b></div>
            <div class="fx-control-row"><span>Pause</span><b>P</b></div>
            <div class="fx-control-row"><span>Resume</span><b>P or Esc</b></div>
          </section>
          <div class="fx-btns">
            <button type="button" class="fx-btn" data-role="resume">RESUME</button>
          </div>
        </div>`;
      layer.appendChild(this.panel);
      const q = (r) => this.panel.querySelector('[data-role="' + r + '"]');
      this.ui = {
        stats: q('stats'), vol: q('vol'), quality: q('quality'), resume: q('resume')
      };
    }

    bind() {
      const g = this.g;
      this.pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });
      this.ui.resume.addEventListener('click', () => this.resume());
      this.ui.vol.addEventListener('input', () => {
        if (g.audio) g.audio.setVolume(Number(this.ui.vol.value) / 100);
        this.dirty = true;
      });
      this.ui.quality.addEventListener('change', () => this.setQuality(Number(this.ui.quality.value)));
      this.ui.vol.addEventListener('change', () => this.save());

      window.addEventListener('keydown', (e) => {
        if (e.repeat || this.dead || !CONFIG.features.pause) return;
        const k = (e.key || '').toLowerCase();
        const typing = e.target && /^(input|textarea|select)$/i.test(e.target.tagName) && e.target.type !== 'range';
        if (k === 'p' && !typing) this.togglePause();
        else if (k === 'escape' && g.state === 'paused') this.resume();
      });
      document.addEventListener('visibilitychange', () => {
        if (this.dead || !document.hidden) return;
        this.save();
        if (CONFIG.features.pause && !this.shopOpen()) this.pause();
      });
      window.addEventListener('pagehide', () => this.save());
      window.addEventListener('blur', () => this.releaseArrowButtons());
    }

    bindArrowButton(button, key) {
      const release = () => {
        this.g.keys[key] = false;
        button.classList.remove('is-pressed');
      };
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (this.g.state !== 'playing') return;
        this.g.audio.forceResume();
        this.g.keys[key] = true;
        button.classList.add('is-pressed');
        button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('keydown', (event) => {
        if (event.key !== ' ' && event.key !== 'Enter') return;
        event.preventDefault();
        if (this.g.state === 'playing') {
          this.g.keys[key] = true;
          button.classList.add('is-pressed');
        }
      });
      button.addEventListener('keyup', (event) => {
        if (event.key === ' ' || event.key === 'Enter') release();
      });
      button.addEventListener('blur', release);
    }

    releaseArrowButtons() {
      this.g.keys.arrowleft = false;
      this.g.keys.arrowright = false;
      for (const button of this.arrowButtons) button.classList.remove('is-pressed');
    }

    shopOpen() {
      const s = window.shop;
      return !!(s && typeof s.isOpen === 'function' && s.isOpen());
    }

    /* ---------- pause ---------- */
    togglePause() {
      if (this.g.state === 'playing') this.pause();
      else if (this.g.state === 'paused') this.resume();
    }
    pause() {
      const g = this.g;
      if (g.state !== 'playing' || this.shopOpen()) return;
      this.releaseArrowButtons();
      g.state = 'paused';
      g.touchActive = false; g.touchX = null;
      if (g.audio) g.audio.pauseMusic();
      this.refreshPanel();
      this.panel.hidden = false;
      this.ui.resume.focus({ preventScroll: true });
      this.save();
    }
    resume() {
      const g = this.g;
      if (g.state !== 'paused') return;
      this.panel.hidden = true;
      g.state = 'playing';
      if (g.audio) g.audio.playMusic();
    }
    setQuality(value) {
      const level = clamp(Math.round(Number(value) || 1), 0, 2);
      this.quality = level;
      document.documentElement.dataset.quality = ['low', 'medium', 'high'][level];
      if (this.g) this.g.renderQuality = level;
      if (this.ui && this.ui.quality) this.ui.quality.value = String(level);
      this.dirty = true;
    }
    refreshPanel() {
      const s = this.stats, g = this.g;
      this.ui.stats.replaceChildren();
      this.ui.vol.value = Math.round((g.audio ? g.audio.volume : 0.3) * 100);
      this.ui.quality.value = String(this.quality);
    }

    /* ---------- save / restore ---------- */
    snapshot() {
      const g = this.g, shop = window.shop;
      const owned = shop && shop.unlockedLeaves ? Object.keys(shop.unlockedLeaves).filter((k) => shop.unlockedLeaves[k]) : [];
      return {
        v: 1,
        savedAt: Date.now(),
        money: g.money, level: g.level, xp: g.xp, xpToNext: g.xpToNext,
        shop: { levels: Object.assign({}, shop ? shop.levels : {}), leaves: owned },
        stats: this.stats,
        achievements: this.unlocked,
        clock: this.clock,
        volume: g.audio ? g.audio.volume : 0.3,
        quality: this.quality
      };
    }
    save() {
      if (!CONFIG.features.persistence || this.wiped || this.dead || !this.restored) return;
      const data = this.snapshot();
      if (Save.write(data)) this.dirty = false;
      else console.error('[Plus] Failed to write the local save to browser storage.');
    }
    restore(data = Save.read()) {
      const g = this.g, shop = window.shop;
      const d = CONFIG.features.persistence ? data : null;
      if (d && d.v === 1) {
        g.money = Math.floor(num(d.money, 0, 1e15));
        g.level = Math.floor(num(d.level, 1, 9999, 1));
        g.xpToNext = Math.floor(num(d.xpToNext, 1, 1e12, 250));
        g.xp = Math.floor(num(d.xp, 0, 1e12));
        if (g.xp >= g.xpToNext) g.xp = 0;

        if (shop && d.shop && Array.isArray(shop.items)) {
          const levels = {};
          for (const it of shop.items) {
            const n = Math.floor(num(d.shop.levels && d.shop.levels[it.id], 0, it.max));
            if (n) levels[it.id] = n;
          }
          const owned = {};
          for (const v of shop.varieties || []) {
            if (Array.isArray(d.shop.leaves) && d.shop.leaves.includes(v.id)) owned[v.id] = true;
          }
          shop.levels = levels;
          shop.unlockedLeaves = owned;
          g.applyShopLevels(Object.assign({}, levels, { leafTypes: Object.keys(owned) }));
          shop.render();
        }
        for (const k of Object.keys(this.stats)) this.stats[k] = num(d.stats && d.stats[k], 0, 1e15, 0);
        for (const a of ACHIEVEMENTS) if (d.achievements && d.achievements[a.id]) this.unlocked[a.id] = Number(d.achievements[a.id]) || 1;
        this.clock = num(d.clock, 0, 1e9, 0);
        if (d.volume != null && g.audio) g.audio.setVolume(num(d.volume, 0, 1, 0.3));
        this.setQuality(d.quality != null ? d.quality : 1);
      } else {
        this.setQuality(this.quality);
      }
      this.stats.sessions++;
      this.restored = true;
      g.updateHUD();
    }
    shopSignature() {
      const s = window.shop;
      if (!s) return '';
      return JSON.stringify(s.levels || {}) + '|' + Object.keys(s.unlockedLeaves || {}).sort().join(',');
    }

    /* ---------- per-frame logic (only while state === 'playing') ---------- */
    tick(dt) {
      const g = this.g;
      this.clock += dt;
      this.stats.playSeconds += dt;
      if (this.cooldown > 0) this.cooldown -= dt;

      for (const k of Object.keys(this.active)) {
        const a = this.active[k];
        a.left -= dt;
        if (a.left <= 0) { delete this.active[k]; this.removeChip(k); }
      }
      this.updateTray();
      this.tickWind(dt);
      this.tickPhase();

      this.sigTimer += dt;
      if (this.sigTimer >= 1) {
        this.sigTimer = 0;
        const sig = this.shopSignature();
        if (this.shopSig !== null && sig !== this.shopSig) { this.shopSig = sig; this.dirty = true; this.checkAchievements(); this.save(); }
        else this.shopSig = sig;
      }

      this.saveTimer += dt;
      if (this.saveTimer >= CONFIG.autosaveEvery) {
        this.saveTimer = 0;
        if (this.dirty) this.save();
      }
    }

    /* Temporarily bend shopBonuses for the duration of ONE Game.update call.
       Shop purchases rebuild shopBonuses from scratch, so we never fight them. */
    applyModifiers() {
      const g = this.g, b = g.shopBonuses, p = g.player, a = this.active;
      const snap = { fall: b.fallSpeed, mag: b.magnet, drop: b.dropRate, val: b.leafValue, cb: p ? p.catchBonus : 0 };
      if (a.warp) b.fallSpeed *= 0.45;
      if (a.magnet) { b.magnet += 1.1; if (p) p.catchBonus += 22; }
      if (a.midas) b.leafValue *= 2.5;
      if (a.storm) b.dropRate *= 2.6;
      return () => {
        b.fallSpeed = snap.fall; b.magnet = snap.mag; b.dropRate = snap.drop; b.leafValue = snap.val;
        if (p) p.catchBonus = snap.cb;
      };
    }

    postUpdate(dt) {
      const dx = this.wind.cur * dt;
      for (const leaf of this.g.leaves) {
        if (leaf.isRotten) { leaf.x = leaf._ix + dx; leaf._ix = leaf.x; } // undo magnet drag, keep wind
        else if (dx) leaf.x += dx;
      }
    }

    /* ---------- spawning ---------- */
    spawnOrb(kind, x, y) {
      const g = this.g, sc = g.scale || 1, { w } = g.getViewSize();
      const size = Math.max(38 * sc, 34);
      const orb = new PowerOrb(x == null ? rand(0, Math.max(1, w - size)) : x - size / 2, y == null ? -size : y, kind, { size, scale: sc });
      g.leaves.push(orb); g.entities.push(orb);
      return orb;
    }
    spawnRotten(x, y) {
      const g = this.g, sc = g.scale || 1, { w } = g.getViewSize();
      const size = Math.max(30 * sc, 28);
      const leaf = new RottenLeaf(x == null ? rand(0, Math.max(1, w - size)) : x - size / 2, y == null ? -size : y, { size, scale: sc });
      g.leaves.push(leaf); g.entities.push(leaf);
      return leaf;
    }
    pickPower() {
      const g = this.g;
      const pool = Object.keys(POWERS).filter((k) => k !== 'shield' || (CONFIG.features.rotten && g.level >= CONFIG.rotten.fromLevel));
      let total = 0;
      for (const k of pool) total += POWERS[k].weight;
      let r = Math.random() * total;
      for (const k of pool) { r -= POWERS[k].weight; if (r <= 0) return k; }
      return pool[0];
    }
    /* Returns true when it spawned something instead of a regular leaf. */
    trySpawnSpecial() {
      const g = this.g, F = CONFIG.features, P = CONFIG.powerups, R = CONFIG.rotten;
      if (F.powerups && this.cooldown <= 0 && Math.random() < P.chance && !g.leaves.some((l) => l.isPowerUp)) {
        this.spawnOrb(this.pickPower());
        this.cooldown = 3;
        return true;
      }
      if (F.rotten && g.level >= R.fromLevel) {
        const chance = Math.min(R.maxChance, R.baseChance + (g.level - R.fromLevel) * R.perLevel);
        if (Math.random() < chance && g.leaves.filter((l) => l.isRotten).length < R.maxOnScreen) {
          this.spawnRotten();
          return true;
        }
      }
      return false;
    }
    /* After vanilla spawnLeaf: at night some plain leaves swap to golden. */
    afterNormalSpawn() {
      const g = this.g;
      if (!CONFIG.features.dayNight || this.sky.night < 0.6) return;
      const leaf = g.leaves[g.leaves.length - 1];
      if (!leaf || leaf.type !== 'normal' || Math.random() >= CONFIG.dayNight.moonGoldChance) return;
      g.leaves.pop(); g.entities.pop();
      const gold = new Leaf(leaf.x, leaf.y, { size: leaf.width, type: 'golden', scale: g.scale || 1 });
      g.leaves.push(gold); g.entities.push(gold);
    }

    /* ---------- collection ---------- */
    activate(kind) {
      const p = POWERS[kind];
      if (!p) return;
      const prev = this.active[kind];
      this.active[kind] = { left: Math.min(p.duration * CONFIG.powerups.stackCap, (prev ? prev.left : 0) + p.duration), total: p.duration };
      this.ensureChip(kind);
    }
    collectPower(orb, mx, my) {
      const g = this.g, p = orb.power;
      this.activate(orb.kind);
      this.stats.powerups++;
      this.cooldown = CONFIG.powerups.cooldown;
      g.spawnParticles(mx, my, 34, { color: p.color, shape: 'star' });
      g.showFloatText(p.name + '!', mx, my - 14, p.color, 14);
      if (g.audio) { g.audio.playCollect(); g.audio.playCombo(10); }
      g.player.catchFlash();
      this.shakeScreen(4, 0.22);
      this.dirty = true;
      this.checkAchievements();
    }
    collectRotten(leaf, mx, my) {
      const g = this.g, R = CONFIG.rotten;
      if (this.active.shield) {
        this.stats.blocked++;
        g.spawnParticles(mx, my, 16, { color: '#b58cff', shape: 'circle' });
        g.showFloatText('BLOCKED!', mx, my - 14, '#b58cff', 12);
        g.player.catchFlash();
        this.dirty = true;
        this.checkAchievements();
        return;
      }
      g.combo = 0; g.comboTimer = 0;
      const loss = Math.min(Math.floor(g.money * R.penaltyPct), R.penaltyCap);
      g.money = Math.max(0, g.money - loss);
      this.stats.rotten++;
      g.spawnParticles(mx, my, 22, { color: '#8fd14f', shape: 'square' });
      g.showFloatText(loss ? 'ROTTEN! -' + fmt(loss) : 'ROTTEN!', mx, my - 14, '#ff6b6b', 13);
      this.shakeScreen(9, 0.35);
      this.flash.t = this.flash.dur;
      g.updateHUD();
      this.dirty = true;
      this.checkAchievements();
    }
    onCatch(leaf, gain) {
      const s = this.stats;
      s.caught++;
      if (leaf.type === 'golden') s.golden++;
      if (leaf.type === 'blue') s.blue++;
      s.bestCombo = Math.max(s.bestCombo, this.g.combo);
      s.earned += Math.max(0, gain);
      this.dirty = true;
      this.checkAchievements();
    }
    shakeScreen(mag, dur) {
      if (mag >= this.shake.mag * (this.shake.t / (this.shake.dur || 1))) this.shake = { t: dur, dur, mag };
    }

    /* ---------- achievements ---------- */
    checkAchievements() {
      if (!CONFIG.features.achievements) return;
      const shop = window.shop;
      const shopCount = shop
        ? Object.values(shop.levels || {}).reduce((a, b) => a + (Number(b) || 0), 0) + Object.keys(shop.unlockedLeaves || {}).length
        : 0;
      const ctx = { s: this.stats, g: this.g, shopCount };
      for (const a of ACHIEVEMENTS) {
        if (!this.unlocked[a.id] && a.test(ctx)) this.unlock(a);
      }
    }
    unlock(a) {
      const g = this.g;
      this.unlocked[a.id] = Date.now();
      g.money += a.reward;
      g.updateHUD();
      this.toast(a);
      if (g.audio) g.audio.playCombo(14);
      this.dirty = true;
      this.save();
    }
    toast(a) {
      const t = el('div', 'fx-toast');
      const k = el('small'), n = el('strong'), d = el('small'), r = el('em');
      k.textContent = 'ACHIEVEMENT'; n.textContent = a.name; d.textContent = a.desc; r.textContent = '+' + fmt(a.reward) + '\u00A2';
      t.append(k, n, d, r);
      this.toasts.appendChild(t);
      while (this.toasts.children.length > 3) this.toasts.firstChild.remove();
      setTimeout(() => t.remove(), 3700);
    }

    /* ---------- tray chips ---------- */
    ensureChip(kind) {
      if (this.chips[kind]) return;
      const p = POWERS[kind];
      const chip = el('div', 'fx-chip');
      chip.style.setProperty('--c', p.color);
      const name = el('span'), time = el('b'), wrap = el('div', 'fx-bar'), bar = el('u');
      name.textContent = p.name;
      wrap.appendChild(bar);
      chip.append(iconCanvas(kind, 22, p.color), name, time, wrap);
      chip.timeEl = time; chip.barEl = bar;
      this.tray.appendChild(chip);
      this.chips[kind] = chip;
    }
    removeChip(kind) {
      const c = this.chips[kind];
      if (c) { c.remove(); delete this.chips[kind]; }
    }
    updateTray() {
      for (const k of Object.keys(this.active)) {
        const a = this.active[k], chip = this.chips[k];
        if (!chip) continue;
        const pct = Math.round(clamp(a.left / a.total, 0, 1) * 100);
        if (chip._pct !== pct) { chip._pct = pct; chip.barEl.style.width = pct + '%'; }
        const txt = a.left.toFixed(1) + 's';
        if (chip._txt !== txt) { chip._txt = txt; chip.timeEl.textContent = txt; }
      }
    }
    setWindChip(show, warn) {
      if (!show) { if (this.windChip) { this.windChip.remove(); this.windChip = null; } return; }
      if (!this.windChip) {
        const chip = el('div', 'fx-chip');
        chip.style.setProperty('--c', '#cfe8ff');
        const name = el('span');
        chip.append(iconCanvas('wind', 22, '#cfe8ff'), name);
        chip.nameEl = name;
        this.tray.prepend(chip);
        this.windChip = chip;
      }
      this.windChip.nameEl.textContent = this.wind.dir > 0 ? 'GUST >>>' : '<<< GUST';
      this.windChip.classList.toggle('warn', !!warn);
    }

    /* ---------- wind ---------- */
    beginWarn() {
      const w = this.wind, C = CONFIG.wind;
      w.state = 'warn'; w.t = C.warn;
      w.dir = Math.random() < 0.5 ? -1 : 1;
      w.power = range(C.strength) * (this.g.scale || 1);
      this.setWindChip(true, true);
    }
    endGust() {
      const w = this.wind;
      w.state = 'idle'; w.t = range(CONFIG.wind.gap);
      w.cur = 0; w.env = 0; w.acc = 0;
      this.setWindChip(false);
    }
    tickWind(dt) {
      if (!CONFIG.features.wind) return;
      const g = this.g, w = this.wind, sc = g.scale || 1;
      const { w: vw, h: vh } = g.getViewSize();
      w.t -= dt;
      if (w.state === 'idle') {
        if (w.t <= 0) this.beginWarn();
      } else if (w.state === 'warn') {
        if (w.t <= 0) {
          w.state = 'blow'; w.dur = range(CONFIG.wind.duration); w.t = w.dur;
          this.stats.gusts++; this.dirty = true;
          this.setWindChip(true, false);
          this.checkAchievements();
        }
      } else {
        const p = 1 - clamp(w.t / w.dur, 0, 1);
        w.env = Math.sin(Math.PI * p);
        w.cur = w.dir * w.power * w.env;
        w.acc += dt * 30 * w.env;
        while (w.acc >= 1 && this.streaks.length < 48) {
          w.acc -= 1;
          this.streaks.push({
            x: w.dir > 0 ? -rand(20, 120) : vw + rand(20, 120),
            y: rand(0, vh * 0.82), l: rand(40, 120) * sc, v: w.dir * rand(520, 900) * sc, a: rand(0.5, 1)
          });
        }
        w.acc = Math.min(w.acc, 1);
        if (w.t <= 0) this.endGust();
      }
      for (let i = this.streaks.length - 1; i >= 0; i--) {
        const s = this.streaks[i];
        s.x += s.v * dt;
        if ((s.v > 0 && s.x - s.l > vw) || (s.v < 0 && s.x + s.l < 0)) this.streaks.splice(i, 1);
      }
    }

    /* ---------- day / night ---------- */
    tickPhase() {
      if (!CONFIG.features.dayNight) return;
      const phase = ((this.clock / CONFIG.dayNight.length) + CONFIG.dayNight.startPhase) % 1;
      const s = skyAt(phase);
      this.sky = s;
      if (this.phaseName !== s.name) {
        if (this.phaseName !== null) {
          const [text, color] = PHASE_TEXT[s.name];
          const { w, h } = this.g.getViewSize();
          this.g.showFloatText(text, w / 2, h * 0.24, color, 16);
        }
        this.phaseName = s.name;
      }
    }

    /* ---------- drawing ---------- */
    draw(orig) {
      const g = this.g, ctx = g.ctx, { w, h } = g.getViewSize();
      const now = performance.now();
      const rdt = this._t ? Math.min(0.05, (now - this._t) / 1000) : 0.016;
      this._t = now;
      const live = g.state === 'playing';

      let sx = 0, sy = 0;
      if (live && this.shake.t > 0) {
        this.shake.t -= rdt;
        const k = clamp(this.shake.t / this.shake.dur, 0, 1) * this.shake.mag * (g.scale || 1);
        sx = (Math.random() * 2 - 1) * k; sy = (Math.random() * 2 - 1) * k;
      }
      if (sx || sy) {
        ctx.clearRect(0, 0, w, h);
        ctx.save(); ctx.translate(sx, sy);
        try { orig.call(g); } finally { ctx.restore(); }
      } else {
        orig.call(g);
      }
      this.drawOverlays(ctx, w, h, rdt, live);
    }

    drawOverlays(ctx, w, h, rdt, live) {
      const g = this.g, sc = g.scale || 1, F = CONFIG.features, s = this.sky;

      if (F.dayNight && (s.r < 254.5 || s.g < 254.5 || s.b < 254.5)) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(' + (s.r | 0) + ',' + (s.g | 0) + ',' + (s.b | 0) + ')';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      if (F.dayNight && s.night > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const f of FIREFLIES) {
          const x = f.bx * w + Math.sin(this.clock * f.sp + f.ph) * f.amp * sc;
          const y = f.by * h + Math.cos(this.clock * f.sp * 1.3 + f.ph) * f.amp * 0.6 * sc;
          const a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.clock * 2.1 + f.ph * 3))) * s.night;
          ctx.fillStyle = 'rgba(255,240,150,' + (a * 0.25).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 6 * sc, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,240,150,' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 2 * sc, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }

      if (this.active.warp) {
        ctx.save(); ctx.fillStyle = 'rgba(90,210,255,.08)'; ctx.fillRect(0, 0, w, h); ctx.restore();
      }

      if (this.streaks.length) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, 2 * sc);
        for (const st of this.streaks) {
          ctx.globalAlpha = st.a * (0.12 + 0.28 * this.wind.env);
          ctx.beginPath(); ctx.moveTo(st.x, st.y); ctx.lineTo(st.x - Math.sign(st.v) * st.l, st.y); ctx.stroke();
        }
        ctx.restore();
      }

      const p = g.player;
      if (this.active.shield && p) {
        const pulse = 0.6 + 0.4 * Math.sin(this.clock * 6);
        ctx.save();
        ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
        ctx.strokeStyle = 'rgba(181,140,255,' + (0.45 + pulse * 0.4).toFixed(3) + ')';
        ctx.lineWidth = Math.max(2, 3 * sc);
        ctx.setLineDash([10 * sc, 6 * sc]); ctx.lineDashOffset = -this.clock * 40;
        ctx.beginPath(); ctx.arc(0, 0, p.width * 0.82, 0, TAU); ctx.stroke();
        ctx.restore();
      }

      if (this.flash.t > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(this.flash.t / this.flash.dur, 0, 1) * 0.35;
        ctx.fillStyle = this.flash.color; ctx.fillRect(0, 0, w, h);
        ctx.restore();
        if (live) this.flash.t -= rdt;
      }
    }
  }

  /* ===================================================================
   * Patch Game.prototype. Each wrapper falls straight through to vanilla
   * whenever the controller is missing or has unplugged itself.
   * =================================================================== */
  const origStart = Game.prototype.start;
  Game.prototype.start = function () {
    origStart.call(this);
    try {
      this.fx = new Plus(this);
      setTimeout(() => { if (this.fx) this.fx.boot(); }, 0); // after window.game is assigned
    } catch (e) {
      console.error('[Plus] init failed, running vanilla', e);
      this.fx = null;
    }
  };

  const origUpdate = Game.prototype.update;
  Game.prototype.update = function (dt) {
    const fx = this.fx;
    if (!fx || fx.dead || this.state !== 'playing') return origUpdate.call(this, dt);
    const step = Math.min(dt, 0.1);
    let restore = null;
    try { fx.tick(step); restore = fx.applyModifiers(); } catch (e) { fx.fail('tick', e); }
    const speed = fx.active.fast ? 2 : 1;
    try {
      for (let i = 0; i < speed; i++) origUpdate.call(this, dt);
    } finally { if (restore) restore(); }
    try { fx.postUpdate(step * speed); } catch (e) { fx.fail('postUpdate', e); }
  };

  const origDraw = Game.prototype.draw;
  Game.prototype.draw = function () {
    const fx = this.fx;
    if (!fx || fx.dead) return origDraw.call(this);
    try { fx.draw(origDraw); } catch (e) {
      fx.fail('draw', e);
      try { origDraw.call(this); } catch (_) { /* vanilla logs its own */ }
    }
  };

  const origSpawnLeaf = Game.prototype.spawnLeaf;
  Game.prototype.spawnLeaf = function () {
    const fx = this.fx;
    if (!fx || fx.dead) return origSpawnLeaf.call(this);
    let handled = false;
    try { handled = fx.trySpawnSpecial(); } catch (e) { fx.fail('spawnSpecial', e); }
    if (handled) return;
    origSpawnLeaf.call(this);
    try { fx.afterNormalSpawn(); } catch (e) { fx.fail('afterSpawn', e); }
  };

  const origCollect = Game.prototype.collectLeaf;
  Game.prototype.collectLeaf = function (leaf, mx, my, clicked) {
    const fx = this.fx;
    if (!fx || fx.dead) return origCollect.call(this, leaf, mx, my, clicked);
    if (leaf.isPowerUp) { fx.safe('collectPower', () => fx.collectPower(leaf, mx, my)); return; }
    if (leaf.isRotten) { fx.safe('collectRotten', () => fx.collectRotten(leaf, mx, my)); return; }
    const before = this.money;
    const result = origCollect.call(this, leaf, mx, my, clicked);
    fx.safe('onCatch', () => fx.onCatch(leaf, this.money - before));
    return result;
  };

  const origLevelUp = Game.prototype.levelUp;
  Game.prototype.levelUp = function () {
    origLevelUp.call(this);
    const fx = this.fx;
    if (fx && !fx.dead) fx.safe('levelUp', () => { fx.dirty = true; fx.checkAchievements(); fx.save(); });
  };

  /* ===================================================================
   * Console API
   * =================================================================== */
  window.LeafPlus = {
    config: CONFIG,
    powers: POWERS,
    get fx() { return window.game && window.game.fx; },
    give(kind = 'midas') { const f = this.fx; if (f && POWERS[kind]) f.activate(kind); },
    drop(kind = 'warp') {
      const f = this.fx, p = f && f.g.player;
      if (!f || !p) return;
      const cx = p.x + p.width / 2, y = p.y - 30;
      if (kind === 'rotten') f.spawnRotten(cx, y);
      else if (POWERS[kind]) f.spawnOrb(kind, cx, y);
    },
    gust(dir = 1) {
      const f = this.fx;
      if (!f) return;
      f.beginWarn(); f.wind.dir = dir < 0 ? -1 : 1; f.wind.t = 0.2; f.setWindChip(true, true);
    },
    night() { const f = this.fx; if (f) f.clock = (0.85 - CONFIG.dayNight.startPhase) * CONFIG.dayNight.length; },
    wipe() { const f = this.fx; if (f) f.wiped = true; Save.wipe(); location.reload(); }
  };
})();
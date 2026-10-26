/* =====================================================================
 * LoadingScreen.js — Catch-A-Leaf
 *
 * Preloads every sprite / sound the game uses, plus the pixel font and the
 * Game instance itself. Each finished asset drops a leaf into the trash bin.
 * Never blocks the game: every asset has a timeout and a fallback, and a hard
 * timeout force-finishes the screen if something hangs.
 *
 * API:  window.LoadingScreen.ready      -> Promise (resolves once it's gone)
 *       window.LoadingScreen.finish()   -> force-finish
 *       window.LoadingScreen.progress   -> 0..1
 *       window 'loadingscreen:done'     -> event fired when removed
 * ===================================================================== */
(function () {
  'use strict';

  const root = document.getElementById('loadingScreen');
  if (!root) return;

  const CFG = {
    minShowMs: 1700,       // bar never snaps; takes at least this long
    hardTimeoutMs: 20000,  // never trap the player here
    segments: 24,
    leaveDelayMs: 450,     // hold on the gold "Ready" bar
    fadeOutMs: 650,        // keep in sync with loading.css
    dropGapMs: 90          // spacing between falling leaves
  };

  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------
   * MANIFEST — w = weight in the overall bar (music is the heavy one)
   * --------------------------------------------------------------- */
  const SPR = 'Loading sprites', BGS = 'Loading backgrounds', SND = 'Loading sounds';
  const assets = [
    { id: 'font',    kind: 'font',  group: 'Loading font', w: 1, timeout: 4000 },
    { id: 'bin',     kind: 'image', group: SPR, w: 1, src: 'Sprites/player_trashbin.png', timeout: 6000 },
    { id: 'normal',  kind: 'image', group: SPR, w: 1, src: 'Sprites/normal_maple_leaf.png' },
    { id: 'golden',  kind: 'image', group: SPR, w: 1, src: 'Sprites/golden_maple_leaf.png' },
    { id: 'blue',    kind: 'image', group: SPR, w: 1, src: 'Sprites/blue_maple_leaf.png' },
    { id: 'bg1',     kind: 'image', group: BGS, w: 2, src: 'Sprites/background_image1.png' },
    { id: 'bg2',     kind: 'image', group: BGS, w: 2, src: 'Sprites/background_image2.png' },
    { id: 'bg3',     kind: 'image', group: BGS, w: 2, src: 'Sprites/background_image3.png' },
    { id: 'music',   kind: 'audio', group: SND, w: 6, src: 'sounds/music_loop_catch_a_leaf.mp3' },
    { id: 'collect', kind: 'audio', group: SND, w: 1, src: 'sounds/collect_catch_a_leaf.mp3' },
    { id: 'combo',   kind: 'audio', group: SND, w: 1, src: 'sounds/combo_catch_a_leaf.mp3' },
    { id: 'buy',     kind: 'audio', group: SND, w: 1, src: 'sounds/buy_catch_a_leaf.mp3' },
    { id: 'game',    kind: 'game',  group: 'Starting game', w: 2, timeout: 6000 }
  ].map((a) => Object.assign({ frac: 0, done: false, ok: false, timeout: 15000 }, a));

  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const images = {};                       // id -> HTMLImageElement
  const setFrac = (a, f) => { if (f > a.frac) a.frac = Math.min(1, f); };

  /* ---------------------------------------------------------------
   * LOADERS — each resolves { ok } and never rejects
   * --------------------------------------------------------------- */
  const loaders = {
    image: (a) => new Promise((res) => {
      const img = new Image();
      img.onload = () => (img.decode ? img.decode() : Promise.resolve())
        .catch(() => {}).then(() => res({ ok: true, img }));
      img.onerror = () => res({ ok: false });
      img.src = a.src;
    }),

    // Streams the file so the bar moves with real bytes when Content-Length exists.
    audio: async (a) => {
      try {
        const r = await fetch(a.src);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const total = +r.headers.get('Content-Length') || 0;
        if (!r.body || !total) { await r.arrayBuffer(); return { ok: true }; }
        const rd = r.body.getReader();
        let got = 0;
        for (;;) {
          const { done, value } = await rd.read();
          if (done) break;
          got += value.length;
          setFrac(a, (got / total) * 0.99);
        }
        return { ok: true };
      } catch (e) {
        // fetch blocked (e.g. file://) -> let an <audio> element do the preloading
        return new Promise((res) => {
          const el = new Audio();
          el.preload = 'auto';
          el.addEventListener('canplaythrough', () => res({ ok: true }), { once: true });
          el.addEventListener('error', () => res({ ok: false }), { once: true });
          el.src = a.src;
        });
      }
    },

    font: async () => {
      try {
        if (document.fonts) await Promise.all([
          document.fonts.load('16px "Press Start 2P"'),
          document.fonts.load('16px "Pixelify Sans"')
        ]);
      } catch (e) {}
      return { ok: true };
    },

    // Done once Game exists, its backgrounds are in and audio is ready.
    game: () => new Promise((res) => {
      (function poll() {
        const g = window.game;
        if (g && g.bgLoaded && g.audio && g.audio.ready) return res({ ok: true });
        setTimeout(poll, 60);
      })();
    })
  };

  function run(a) {
    const timer = new Promise((res) => setTimeout(() => res({ ok: false }), a.timeout));
    Promise.race([loaders[a.kind](a), timer])
      .catch(() => ({ ok: false }))
      .then((r) => finishAsset(a, r));
  }

  function finishAsset(a, r) {
    if (a.done) return;
    a.done = true; a.ok = !!r.ok; a.frac = 1;
    if (!a.ok) console.warn('[LoadingScreen] using fallback for', a.id);
    if (a.kind === 'image' && r.ok) images[a.id] = r.img;
    if (a.id === 'bin') setupBin(r.ok ? r.img : null);
    dropQueue.push(a.kind === 'audio' ? 'blue' : a.kind === 'game' ? 'golden' : 'normal');
  }

  /* ---------------------------------------------------------------
   * PIXEL ART FALLBACKS (used until/unless the real sprites load)
   * --------------------------------------------------------------- */
  const pixelCache = {};
  function pixelArt(key, rows, pal, cell) {
    if (pixelCache[key]) return pixelCache[key];
    const c = document.createElement('canvas');
    c.width = rows[0].length * cell;
    c.height = rows.length * cell;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * cell, y * cell, cell, cell); }
    }));
    return (pixelCache[key] = c);
  }

  const LEAF_ROWS = ['.b..b.', 'bhbbhb', '.hhhh.', 'bdhhdb', '..dd..', '...s..'];
  const LEAF_PAL = {
    normal: { b: '#ffcc00', d: '#c48a00', h: '#ffe680', s: '#5a3a0a' },
    golden: { b: '#ffd700', d: '#b8860b', h: '#fff4a3', s: '#6b4a00' },
    blue:   { b: '#29b6f6', d: '#0d6fa8', h: '#a3e3ff', s: '#08344a' }
  };
  const BIN_ROWS = ['...hhhh...', 'llllllllll', '.dddddddd.', '.bbdbbdbb.', '.bbdbbdbb.',
                    '.bbdbbdbb.', '.bbdbbdbb.', '.bbdbbdbb.', '..bdbbdb..', '..dddddd..'];
  const BIN_PAL = { h: '#8fb08f', l: '#a3c2a3', b: '#5a7a5a', d: '#3a5a3a' };

  const leafSprite = (type) => images[type] || pixelArt('leaf-' + type, LEAF_ROWS, LEAF_PAL[type], 6);

  // Same white-pixel cutout Player.js does, so the bin looks identical here.
  function cutout(img) {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 64, 64);
      const d = g.getImageData(0, 0, 64, 64), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if ((p[i] > 180 && p[i + 1] > 180 && p[i + 2] > 180) || (p[i] + p[i + 1] + p[i + 2]) / 3 > 200) p[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
      return c;
    } catch (e) { return null; }          // tainted canvas -> fallback bin
  }

  /* ---------------------------------------------------------------
   * SCENE STATE
   * --------------------------------------------------------------- */
  const cv = $('lsCanvas'), g = cv.getContext('2d'), slot = $('lsBinSlot');
  const bin = { x: 0, y: 0, s: 80, sprite: null, readyAt: 0, flash: 0, squash: 0 };
  const ambient = [], drops = [], parts = [], dropQueue = [];
  let W = 0, H = 0, lastDrop = 0;

  function setupBin(img) {
    bin.sprite = (img && cutout(img)) || pixelArt('bin', BIN_ROWS, BIN_PAL, 6);
    bin.readyAt = performance.now();
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.floor(W * dpr);
    cv.height = Math.floor(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!reduce) {
      const n = clamp(Math.round((W * H) / 85000), 6, 16);
      while (ambient.length < n) ambient.push(newAmbient(true));
      ambient.length = Math.min(ambient.length, n);
    }
  }

  function syncBin() {                     // the bin always sits in its DOM slot
    const r = slot.getBoundingClientRect();
    bin.s = Math.round(r.width);
    bin.x = r.left + r.width / 2;
    bin.y = r.top + r.height / 2;
  }

  function newAmbient(anywhere) {
    const s = 14 + Math.random() * 16;
    return { x: Math.random() * W, y: anywhere ? Math.random() * H : -s, s,
             vy: 22 + Math.random() * 34, sw: 12 + Math.random() * 22, ph: Math.random() * 6.28,
             r: Math.random() * 6.28, rs: (Math.random() - 0.5) * 1.6, a: 0.18 + Math.random() * 0.3, t: 0 };
  }

  function spawnDrop(type) {
    const x0 = bin.x + (Math.random() - 0.5) * Math.min(W * 0.5, 280);
    drops.push({ type, x0, x: x0, y: -30, y0: -30, vy: 140 + Math.random() * 60, t: 0,
                 ph: Math.random() * 6.28, r: Math.random() * 6.28, rs: (Math.random() - 0.5) * 6,
                 s: Math.max(22, bin.s * 0.34), caught: false, sink: 0 });
  }

  function burst(x, y, golden) {
    if (reduce) return;
    const cols = golden ? ['#ffd700', '#fff4a3', '#f5a842'] : ['#f5c842', '#e8701a', '#f5e8d8'];
    const k = Math.max(0.8, bin.s / 72);
    for (let i = 0; i < 10; i++) {
      parts.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.9) * 220,
                   life: 0.55, max: 0.55, size: (3 + Math.random() * 3) * k, rot: 0,
                   rs: (Math.random() - 0.5) * 10, col: cols[i % cols.length], star: Math.random() < 0.35 });
    }
  }

  function landed(d, catchY) {
    bin.flash = 0.3;
    bin.squash = reduce ? 0 : 1;
    burst(d.x, catchY, d.type === 'golden');
  }

  function star(r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.5 : r;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
  }

  /* ---------------------------------------------------------------
   * SCENE UPDATE + DRAW
   * --------------------------------------------------------------- */
  function updateScene(now, dt) {
    syncBin();
    bin.flash = Math.max(0, bin.flash - dt);
    bin.squash = Math.max(0, bin.squash - dt * 6);

    for (const a of ambient) {
      a.t += dt; a.r += a.rs * dt;
      a.x += Math.sin(a.t * 1.6 + a.ph) * a.sw * dt;
      a.y += a.vy * dt;
      if (a.y > H + a.s) Object.assign(a, newAmbient(false));
    }

    if (reduce) dropQueue.length = 0;       // no motion: skip the falling leaves
    if (dropQueue.length && bin.sprite && now - bin.readyAt > 250 && now - lastDrop > CFG.dropGapMs) {
      lastDrop = now;
      spawnDrop(dropQueue.shift());
    }

    const catchY = bin.y - bin.s * 0.3;     // roughly the rim of the bin
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt; d.r += d.rs * dt;
      if (d.caught) {                       // sink behind the bin, then vanish
        d.sink += dt; d.y += d.vy * 0.4 * dt;
        if (d.sink > 0.14) drops.splice(i, 1);
        continue;
      }
      d.vy += 950 * dt;
      d.y += d.vy * dt;
      const p = clamp((d.y - d.y0) / (catchY - d.y0), 0, 1);
      d.x = bin.x + (d.x0 - bin.x) * (1 - p) + Math.sin(d.t * 7 + d.ph) * 14 * (1 - p);
      if (d.y >= catchY) { d.caught = true; d.x = bin.x; landed(d, catchY); }
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life -= dt;
      if (q.life <= 0) { parts.splice(i, 1); continue; }
      q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.rs * dt;
    }
  }

  function drawScene(now) {
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;

    if (byId.normal.done) {                 // ambient drift behind everything
      const sp = leafSprite('normal');
      for (const a of ambient) {
        g.save();
        g.globalAlpha = a.a;
        g.translate(a.x, a.y); g.rotate(a.r);
        g.drawImage(sp, -a.s / 2, -a.s / 2, a.s, a.s);
        g.restore();
      }
    }

    for (const d of drops) {                // asset leaves (drawn under the bin)
      g.save();
      g.globalAlpha = d.caught ? 1 - d.sink / 0.14 : clamp(d.t / 0.12, 0, 1);
      g.translate(d.x, d.y); g.rotate(d.r);
      if (d.type !== 'normal') { g.shadowBlur = 12; g.shadowColor = d.type === 'golden' ? '#ffd700' : '#29b6f6'; }
      else { g.shadowBlur = 4; g.shadowColor = '#ffb347'; }
      g.drawImage(leafSprite(d.type), -d.s / 2, -d.s / 2, d.s, d.s);
      g.restore();
    }

    if (bin.sprite) {
      const s = bin.s, t = now / 1000;
      const fade = clamp((now - bin.readyAt) / 400, 0, 1);
      const bob = reduce ? 0 : Math.sin(t * 3) * 2;
      g.save();
      g.globalAlpha = fade;
      g.fillStyle = 'rgba(0,0,0,0.35)';     // flat pixel ground shadow
      g.fillRect(Math.round(bin.x - s * 0.38), Math.round(bin.y + s * 0.5 + 2), Math.round(s * 0.76), Math.max(3, Math.round(s * 0.06)));
      g.translate(bin.x, bin.y + s / 2 + bob);   // squash anchored at the bottom
      g.rotate(reduce ? 0 : Math.sin(t * 1.3) * 0.03);
      g.scale(1 + bin.squash * 0.08, 1 - bin.squash * 0.12);
      g.translate(0, -s / 2);
      g.shadowBlur = bin.flash > 0 ? 30 : 15;
      g.shadowColor = bin.flash > 0 ? '#ffd700' : 'rgba(255, 200, 100, 0.3)';
      g.drawImage(bin.sprite, -s / 2, -s / 2, s, s);
      if (bin.flash > 0) {                  // same double ring Player.js uses
        const k = bin.flash / 0.3, grow = (1 - k) * s * 0.2;
        g.globalAlpha = fade * k;
        g.shadowBlur = 0; g.lineWidth = 2;
        g.strokeStyle = '#ffd700';
        g.beginPath(); g.arc(0, 0, s / 1.5 + grow, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = '#ff6b1a';
        g.beginPath(); g.arc(0, 0, s / 1.5 + grow + 8, 0, Math.PI * 2); g.stroke();
      }
      g.restore();
    }

    for (const q of parts) {
      g.save();
      g.globalAlpha = q.life / q.max;
      g.translate(q.x, q.y); g.rotate(q.rot);
      g.fillStyle = q.col; g.shadowBlur = 8; g.shadowColor = q.col;
      if (q.star) star(q.size); else g.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
      g.restore();
    }
  }

  /* ---------------------------------------------------------------
   * PROGRESS + DOM
   * --------------------------------------------------------------- */
  const segsEl = $('lsSegs'), pctEl = $('lsPct'), labelEl = $('lsLabel');
  const segs = Array.from({ length: CFG.segments }, () => {
    const s = document.createElement('i');
    s.className = 'ls-seg';
    return segsEl.appendChild(s);
  });

  let state = 'loading', shown = 0, lastSegs = -1, lastPct = -1, lastLabel = '';

  function realProgress() {
    let total = 0, done = 0;
    for (const a of assets) { total += a.w; done += a.w * a.frac; }
    return done / total;
  }

  function paint() {
    const pct = Math.floor(shown * 100 + 1e-4);
    const on = Math.floor(shown * CFG.segments + 1e-4);
    if (on !== lastSegs) {
      segs.forEach((s, i) => {
        s.classList.toggle('on', i < on);
        s.classList.toggle('lead', i === on && state === 'loading');
      });
      lastSegs = on;
    }
    if (pct !== lastPct) {
      pctEl.textContent = pct + '%';
      root.setAttribute('aria-valuenow', pct);
      lastPct = pct;
    }
    const label = state === 'done' ? 'Ready' : (assets.find((a) => !a.done) || { group: 'Starting game' }).group;
    if (label !== lastLabel) { labelEl.textContent = label; lastLabel = label; }
  }

  /* ---------------------------------------------------------------
   * LIFECYCLE
   * --------------------------------------------------------------- */
  let raf = 0, last = performance.now(), resolveReady;
  const t0 = last;
  const ready = new Promise((r) => { resolveReady = r; });

  function complete() {
    if (state !== 'loading') return;
    state = 'done'; shown = 1;
    root.classList.add('is-done');
    paint();
    setTimeout(() => {
      root.classList.add('is-leaving');     // pointer-events off, stepped fade
      setTimeout(destroy, CFG.fadeOutMs + 50);
    }, CFG.leaveDelayMs);
  }

  function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', layout);
    root.remove();
    window.dispatchEvent(new Event('loadingscreen:done'));
    resolveReady();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    const elapsed = now - t0;

    if (state === 'loading') {
      // The bar follows real progress but can't outrun the minimum show time.
      const cap = 1 - Math.pow(1 - clamp(elapsed / CFG.minShowMs, 0, 1), 2);
      const target = Math.min(realProgress(), cap);
      shown += (target - shown) * (1 - Math.exp(-dt * 9));
      if (target - shown < 0.0008) shown = target;
      paint();

      if (assets.every((a) => a.done) && !dropQueue.length && !drops.length &&
          shown >= 0.999 && elapsed >= CFG.minShowMs) complete();
    }

    updateScene(now, dt);
    drawScene(now);
  }

  window.LoadingScreen = {
    ready,
    finish() { dropQueue.length = 0; complete(); },
    get progress() { return shown; }
  };

  layout();
  window.addEventListener('resize', layout);
  assets.forEach(run);
  raf = requestAnimationFrame(frame);

  setTimeout(() => {                        // last-resort escape hatch
    if (state === 'loading') {
      console.warn('[LoadingScreen] hard timeout, forcing finish');
      window.LoadingScreen.finish();
    }
  }, CFG.hardTimeoutMs);
})();
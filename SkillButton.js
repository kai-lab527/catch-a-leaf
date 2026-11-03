/* =====================================================================
 * SkillButton.js : pixel-art Skill button (the gold-ring sparkle)
 *
 * Drop-in. Add AFTER Game.js in index.html:
 *     <script src="SkillButton.js"></script>
 * It reskins the existing #skillBtn without image files; the art is painted
 * from code into a 64x32 sprite sheet (2 twinkle frames of 32x32).
 *
 * Extras
 *   - hover / press / keyboard focus states, reduced-motion safe
 *
 * Options: new SkillButton(el, { animate:true, ticks:true })
 *   ticks:false drops the 4 single pixels that poke out of the ring
 * ===================================================================== */
class SkillButton {
  static PAL = {
    shadow: '#0a0503', outline: '#2a1608',
    ringLit: '#f5c842', ringDark: '#c8962a', inner: '#5a2a12',
    face: '#3d2817', faceLit: '#5a3d24', faceDark: '#2a180e',
    glow: '#6b5020', star: '#f5c842', starMid: '#ffe680', starCore: '#fff4a3'
  };

  /** Paint one 32x32 frame at x-offset `ox` of the sprite sheet. */
  static drawFrame(ctx, ox, { twinkle = 'plus', ticks = true } = {}) {
    const P = SkillButton.PAL, N = 32, C = 14.5;
    const dot = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(ox + x, y, 1, 1); };
    // four-point sparkle = astroid: |x|^(2/3) + |y|^(2/3) <= r^(2/3)
    const astro = (a, b, r) => Math.abs(a) ** (2 / 3) + Math.abs(b) ** (2 / 3) <= r ** (2 / 3);

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const a = x + 0.5 - C, b = y + 0.5 - C;
        const r = Math.hypot(a, b), s = a + b;              // s < 0 = lit from top-left

        if (Math.hypot(a - 2, b - 2) <= 14) dot(x, y, P.shadow);   // hard drop shadow
        if (r > 14 || (!ticks && r === 14)) continue;

        let col;
        if (r > 13) col = P.outline;
        else if (r > 12) col = s < 0 ? P.ringLit : P.ringDark;      // gold ring
        else if (r > 11) col = P.inner;
        else {
          col = P.face;                                             // dark brown face
          if (r > 9 && s < -4) col = P.faceLit;
          else if (r > 9 && s > 4) col = P.faceDark;
        }
        if (astro(a, b, 10) && !astro(a, b, 8.2)) col = P.glow;     // halo arms
        if (astro(a, b, 8.2)) col = P.star;
        if (astro(a, b, 5.6)) col = P.starMid;
        if (astro(a, b, 3.2)) col = P.starCore;
        dot(x, y, col);
      }
    }
    // the two twinkles: "+" on frame 0, a single dot on frame 1
    const arms = twinkle === 'plus' ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] : [[0, 0]];
    for (const [tx, ty] of [[22, 8], [7, 22]])
      for (const [dx, dy] of arms) dot(tx + dx, ty + dy, P.starCore);
  }

  /** Cached data-URL of the 2-frame sprite sheet. */
  static sheet(opts = {}) {
    const key = JSON.stringify(opts);
    SkillButton._cache = SkillButton._cache || {};
    if (!SkillButton._cache[key]) {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 32;
      const g = cv.getContext('2d');
      SkillButton.drawFrame(g, 0, { ...opts, twinkle: 'plus' });
      SkillButton.drawFrame(g, 32, { ...opts, twinkle: 'dot' });
      SkillButton._cache[key] = cv.toDataURL('image/png');
    }
    return SkillButton._cache[key];
  }

  static injectCSS() {
    if (document.getElementById('skillButtonCSS')) return;
    const st = document.createElement('style');
    st.id = 'skillButtonCSS';
    st.textContent = `
#hud #skillBtn.sb {
  width: var(--btn, 64px); height: var(--btn, 64px);
  padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none;
  font-size: 0; cursor: pointer; overflow: visible;
  -webkit-tap-highlight-color: transparent;
  transition: transform .08s steps(2), filter .08s steps(2);
}
#hud #skillBtn.sb:hover  { background: none; filter: brightness(1.18); transform: translateX(-50%) translateY(-2px); }
#hud #skillBtn.sb:active { transform: translateX(-50%) translate(3%, 3%); filter: brightness(.95); }
#hud #skillBtn.sb:focus-visible { outline: 2px dashed #f5c842; outline-offset: 4px; }
.sb-art {
  display: block; width: 100%; height: 100%; pointer-events: none;
  background-repeat: no-repeat; background-size: 200% 100%;
  image-rendering: pixelated; image-rendering: crisp-edges;
  animation: sbTwinkle 1.4s steps(1) infinite;
}
.sb.sb-still .sb-art { animation: none; }
@keyframes sbTwinkle { 0% { background-position: 0 0; } 50% { background-position: 100% 0; } }

@media (prefers-reduced-motion: reduce) {
  .sb, .sb * { animation: none !important; transition: none !important; }
}`;
    document.head.appendChild(st);
  }

  constructor(btn = document.getElementById('skillBtn'), opts = {}) {
    if (!btn) throw new Error('SkillButton: #skillBtn not found');
    this.btn = btn;
    this.opts = { animate: true, ticks: true, ...opts };

    SkillButton.injectCSS();
    btn.classList.add('sb');
    btn.classList.toggle('sb-still', !this.opts.animate);
    btn.textContent = '';                                  // drop the old glyph
    btn.setAttribute('aria-label', 'Skill');
    btn.title = 'Skill';

    this.art = document.createElement('span');
    this.art.className = 'sb-art';
    this.art.style.backgroundImage = `url(${SkillButton.sheet({ ticks: this.opts.ticks })})`;
    btn.appendChild(this.art);
  }

  destroy() {
    this.btn.classList.remove('sb', 'sb-still');
    this.art.remove();
  }
}

(function boot() {
  const go = () => { if (!window.skillButton && document.getElementById('skillBtn')) window.skillButton = new SkillButton(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
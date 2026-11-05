/* =====================================================================
 * Basket3D.js : the leaf catcher as a real 3D model.
 *
 * Renders with three.js into a tiny offscreen canvas (posterised toon shading,
 * no antialiasing, 1px dark outline) so it still reads as pixel art, then hands
 * the finished frame to Player.draw() as a plain 2D canvas.
 *
 *   const b = Basket3D.shared();           // null if three.js / WebGL is missing
 *   const frame = b.update(dt, { closed, hazard, tilt });
 *   ctx.drawImage(frame, x, y, w, h);
 *
 * Tweaks: Basket3D.RES (render size in px, set BEFORE the first shared() call)
 * ===================================================================== */
class Basket3D {
  static RES = 64;      // 64 matches the old sprite grid; 96 gives more detail
  static OPEN = -2.9;   // lid swing (radians) when fully open
  static _shared;

  static shared() {
    if (Basket3D._shared === undefined) {
      try {
        Basket3D._shared = (typeof THREE !== 'undefined') ? new Basket3D(Basket3D.RES) : null;
      } catch (e) {
        console.warn('Basket3D unavailable, falling back to sprites:', e);
        Basket3D._shared = null;
      }
    }
    return Basket3D._shared;
  }

  constructor(res) {
    const T = THREE;
    this.res = res;
    this.ok = true;
    this.t = 0;
    this.lid = 1;          // 1 = open, 0 = closed
    this.haz = 0;          // hazard flash
    this.squash = 0;
    this._wasClosed = false;
    this._face = null;

    // offscreen GL canvas + 2D compositor (outline pass)
    this.gl = document.createElement('canvas');
    this.gl.width = this.gl.height = res;
    this.R = new T.WebGLRenderer({ canvas: this.gl, alpha: true, antialias: false, preserveDrawingBuffer: true });
    this.R.setPixelRatio(1);
    this.R.setSize(res, res, false);
    this.R.setClearColor(0x000000, 0);
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = res;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      return [c, g];
    };
    [this.out, this.og] = mk();
    [this.sil, this.sg] = mk();

    this.scene = new T.Scene();
    const h = 1.64;
    this.cam = new T.OrthographicCamera(-h, h, h, -h, 0.1, 40);
    this.cam.position.set(0, 4.6, 7.5);
    this.cam.lookAt(0, 1.3, 0);

    // dusk lights: cool sky fill, cool key, warm horizon rim
    this.scene.add(new T.HemisphereLight(0x8aa0e0, 0x6a3320, 0.6));
    const key = new T.DirectionalLight(0xaec0ff, 0.75); key.position.set(-4, 8, 7); this.scene.add(key);
    const rim = new T.DirectionalLight(0xff9a58, 0.95); rim.position.set(6, 2.5, -5); this.scene.add(rim);

    // posterised toon ramp (4 light bands)
    const ramp = new T.DataTexture(new Uint8Array([46,46,46,255, 120,120,120,255, 200,200,200,255, 255,255,255,255]), 4, 1, T.RGBAFormat);
    ramp.minFilter = ramp.magFilter = T.NearestFilter;
    ramp.needsUpdate = true;
    this.hit = [];   // materials that flash red on hazard hits
    const toon = (o, flash = true) => {
      const m = new T.MeshToonMaterial(Object.assign({ gradientMap: ramp }, o));
      if (flash) this.hit.push(m);
      return m;
    };
    const tex = (fn) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      fn(c.getContext('2d'));
      const t = new T.CanvasTexture(c);
      t.magFilter = t.minFilter = T.NearestFilter;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      return t;
    };

    // wicker + lid textures in the dusk palette
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const wick = tex((g) => {
      const C = ['#8c5748', '#b27850', '#d89d5e', '#9a6247', '#6a3f45'];
      for (let row = 0; row < 8; row++) {
        const off = row % 2 ? 8 : 0;
        for (let k = -1; k < 5; k++) {
          const x = k * 16 + off, y = row * 8;
          g.fillStyle = C[(rnd() * 4) | 0]; g.fillRect(x, y, 16, 8);
          g.fillStyle = '#472a42'; g.fillRect(x, y, 16, 1); g.fillRect(x, y, 1, 8);
          g.fillStyle = 'rgba(240,199,131,.35)'; g.fillRect(x + 1, y + 1, 14, 1);
        }
      }
    });
    wick.repeat.set(3, 1);
    const lidTex = tex((g) => {
      const C = ['#a56d4c', '#d89d5e', '#c48a55', '#f0c783'];
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { g.fillStyle = C[((x + y) >> 3) & 3]; g.fillRect(x, y, 1, 1); }
    });

    // face canvas, redrawn when the expression changes
    this.fc = document.createElement('canvas');
    this.fc.width = this.fc.height = 64;
    this.fg = this.fc.getContext('2d');
    this.faceTex = new T.CanvasTexture(this.fc);
    this.faceTex.magFilter = this.faceTex.minFilter = T.NearestFilter;

    // model
    const V = (a) => a.map((p) => new T.Vector2(p[0], p[1]));
    this.root = new T.Group();
    this.scene.add(this.root);
    this.root.add(new T.Mesh(new T.LatheGeometry(V([[.001,0],[.8,0],[.92,.12],[1.22,1.8],[1.3,1.95],[1.3,2.05],[1.15,2.05]]), 20), toon({ map: wick, side: T.DoubleSide })));
    this.root.add(new T.Mesh(new T.LatheGeometry(V([[.001,.3],[.82,.3],[1.12,2.0]]), 20), new T.MeshBasicMaterial({ color: 0x160c20, side: T.DoubleSide })));
    const lip = new T.Mesh(new T.TorusGeometry(1.25, .1, 5, 20), toon({ color: 0xd89d5e }));
    lip.rotation.x = Math.PI / 2; lip.position.y = 2.05; this.root.add(lip);
    const face = new T.Mesh(new T.CylinderGeometry(1.245, .943, 1.65, 18, 1, true, -.78, 1.56), toon({ map: this.faceTex, transparent: true, alphaTest: .5 }, false));
    face.position.y = .98; this.root.add(face);

    this.hinge = new T.Group();
    this.hinge.position.set(0, 2.06, -1.3);
    this.root.add(this.hinge);
    const lidTop = toon({ map: lidTex });
    const lid = new T.Mesh(new T.CylinderGeometry(1.42, 1.42, .16, 20), [toon({ color: 0x9a5a3a }), lidTop, toon({ color: 0x472a42 })]);
    lid.position.set(0, .05, 1.3);
    this.hinge.add(lid);
    const dome = new T.Mesh(new T.CylinderGeometry(.9, 1.25, .14, 20), [toon({ color: 0x9a5a3a }), lidTop, lidTop]);
    dome.position.y = .15; lid.add(dome);
    const clasp = new T.Mesh(new T.BoxGeometry(.3, .38, .14), toon({ color: 0xf0b848 }, false));
    clasp.position.set(0, -.02, 1.43); lid.add(clasp);
    const slot = new T.Mesh(new T.BoxGeometry(.14, .05, .15), new T.MeshBasicMaterial({ color: 0x26132c }));
    slot.position.set(0, 0, 1.43); lid.add(slot);

    this._drawFace('open');
  }

  _drawFace(state) {
    const g = this.fg, P = '#26132c';
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#d89d5e';
    for (let y = 10; y < 54; y++) {
      const d = (y - 32) / 22, hw = Math.round(30 * Math.sqrt(Math.max(0, 1 - d * d)));
      g.fillRect(32 - hw, y, hw * 2, 1);
    }
    g.fillStyle = P;
    if (state === 'open') {
      g.fillRect(18, 26, 5, 10); g.fillRect(41, 26, 5, 10);
      g.fillStyle = '#d3deff'; g.fillRect(20, 27, 2, 2); g.fillRect(43, 27, 2, 2);   // moonlit eye-shine
      g.fillStyle = P; g.fillRect(29, 42, 6, 7);
      g.fillStyle = '#9e3340'; g.fillRect(30, 44, 4, 4);
    } else if (state === 'ouch') {
      [[17,27,3],[20,29,3],[23,31,2],[20,33,3],[17,35,3]].forEach(([x,y,w]) => g.fillRect(x, y, w, 2));      // > eye
      [[44,27,3],[41,29,3],[39,31,2],[41,33,3],[44,35,3]].forEach(([x,y,w]) => g.fillRect(x, y, w, 2));      // < eye
      g.fillRect(26, 47, 2, 2); g.fillRect(28, 45, 8, 2); g.fillRect(36, 47, 2, 2);                          // frown
    } else {
      [17, 41].forEach((x) => { g.fillRect(x, 33, 2, 2); g.fillRect(x + 2, 30, 3, 2); g.fillRect(x + 5, 33, 2, 2); });
      g.fillRect(26, 42, 2, 2); g.fillRect(28, 44, 8, 2); g.fillRect(36, 42, 2, 2);                          // ^ ^ and smile
    }
    g.fillStyle = state === 'ouch' ? '#e0453f' : '#d9675c';
    g.fillRect(12, 38, 5, 4); g.fillRect(47, 38, 5, 4);
    this.faceTex.needsUpdate = true;
    this._face = state;
  }

  /** Advance the animation and return the finished frame (a res x res canvas). */
  update(dt, s = {}) {
    const T = THREE, clamp = T.MathUtils.clamp;
    this.t += dt;

    // lid: closed while the game says "catch flash", open otherwise
    const closed = !!s.closed;
    this.lid += ((closed ? 0 : 1) - this.lid) * (1 - Math.exp(-dt * 24));
    if (closed && !this._wasClosed) this.squash = 1;                 // munch
    this._wasClosed = closed;
    this.squash *= Math.exp(-dt * 9);
    this.haz += ((s.hazard ? 1 : 0) - this.haz) * (1 - Math.exp(-dt * 20));

    this.hinge.rotation.x = this.lid * Basket3D.OPEN;
    const k = clamp((this.lid - 0.55) / 0.45, 0, 1);                  // tuck the lid away when fully open
    this.hinge.scale.setScalar(Math.max(0.001, 1 - k * k * (3 - 2 * k)));

    this.root.rotation.y = clamp((s.tilt || 0) * 2.5, -0.5, 0.5) + Math.sin(this.t * 1.6) * 0.07;
    this.root.scale.set(1 + this.squash * .1, 1 - this.squash * .16, 1 + this.squash * .1);
    for (const m of this.hit) m.emissive.setRGB(this.haz * .6, this.haz * .08, this.haz * .05);

    const face = s.hazard ? 'ouch' : (this.lid > 0.5 ? 'open' : 'closed');
    if (face !== this._face) this._drawFace(face);

    this.R.render(this.scene, this.cam);
    this._compose();
    return this.out;
  }

  /** 1px dark outline: stamp a silhouette at 4 offsets, then the render on top. */
  _compose() {
    const r = this.res, g = this.og, s = this.sg;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, r, r);
    s.drawImage(this.gl, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = '#190e21';
    s.fillRect(0, 0, r, r);
    g.clearRect(0, 0, r, r);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(this.sil, dx, dy);
    g.drawImage(this.gl, 0, 0);
  }
}
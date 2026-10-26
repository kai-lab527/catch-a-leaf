class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this.volume = 0.3;
    this.musicSource = null;
    this.musicGain = null;
    this.ready = false;
    this.loading = false;
    this._pendingMusic = false;
    this.html5Music = null; // fallback

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Web Audio context created');
    } catch(e) {
      console.warn('Web Audio not supported, using HTML5 fallback');
    }

    this.loadSounds();
  }

  async loadSounds() {
    if (!this.ctx) {
      // Fallback: use HTML5 Audio for everything
      this.loadHTML5Fallback();
      return;
    }
    if (this.loading) return;
    this.loading = true;

    console.log('Loading sounds via Web Audio...');

    try {
      const [collect, music, combo, buy] = await Promise.all([
        this.loadBuffer('sounds/collect_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/music_loop_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/combo_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/buy_catch_a_leaf.mp3')
      ]);

      this.sounds.collect = collect;
      this.sounds.music = music;
      this.sounds.combo = combo;
      this.sounds.buy = buy;

      this.ready = true;
      this.loading = false;

      console.log('All sounds loaded successfully');
      console.log('  collect:', !!collect);
      console.log('  music:', !!music);
      console.log('  combo:', !!combo);
      console.log('  buy:', !!buy);

      if (this._pendingMusic) {
        this._pendingMusic = false;
        this.playMusic();
      }
    } catch(err) {
      console.warn('Some sounds failed to load, falling back to HTML5', err);
      this.loadHTML5Fallback();
    }
  }

  loadHTML5Fallback() {
    console.log('Using HTML5 Audio fallback');
    this.html5Music = new Audio('sounds/music_loop_catch_a_leaf.mp3');
    this.html5Music.loop = true;
    this.html5Music.volume = this.volume * 0.8;
    this.html5Music.preload = 'auto';

    // Also preload others as HTML5 for collect/buy/combo
    this.sounds.collectHTML5 = new Audio('sounds/collect_catch_a_leaf.mp3');
    this.sounds.collectHTML5.volume = this.volume;
    this.sounds.buyHTML5 = new Audio('sounds/buy_catch_a_leaf.mp3');
    this.sounds.buyHTML5.volume = this.volume * 0.7;
    this.sounds.comboHTML5 = new Audio('sounds/combo_catch_a_leaf.mp3');
    this.sounds.comboHTML5.volume = this.volume * 0.4;

    this.ready = true;
    if (this._pendingMusic) {
      this._pendingMusic = false;
      this.playMusic();
    }
  }

  loadBuffer(url) {
    return new Promise((resolve) => {
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.arrayBuffer();
        })
        .then(arrayBuffer => this.ctx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          console.log('Loaded:', url);
          resolve(audioBuffer);
        })
        .catch(err => {
          console.warn('Failed to load:', url, err);
          resolve(null);
        });
    });
  }

  forceResume() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          console.log('✅ Audio context resumed');
          if (this._pendingMusic) {
            this._pendingMusic = false;
            this.playMusic();
          }
        }).catch(e => console.warn('Context resume failed', e));
      } else if (this.ctx.state === 'running') {
        // already running
      }
    }
  }

  playCollect() {
    this.forceResume();
    // Try Web Audio first
    if (this.ctx && this.ready && this.sounds.collect) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds.collect;
        const gain = this.ctx.createGain();
        gain.gain.value = this.volume;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        return;
      } catch(e) { console.warn('Web Audio collect failed', e); }
    }
    // Fallback to HTML5
    if (this.sounds.collectHTML5) {
      try {
        this.sounds.collectHTML5.currentTime = 0;
        this.sounds.collectHTML5.play().catch(() => {});
      } catch(e) {}
    }
  }

  playBuy() {
    this.forceResume();
    if (this.ctx && this.ready && this.sounds.buy) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds.buy;
        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * 0.7;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        return;
      } catch(e) { console.warn('Web Audio buy failed', e); }
    }
    if (this.sounds.buyHTML5) {
      try {
        this.sounds.buyHTML5.currentTime = 0;
        this.sounds.buyHTML5.play().catch(() => {});
      } catch(e) {}
    }
  }

  playMusic() {
    this.forceResume();
    if (this.ctx && this.ready && this.sounds.music) {
      if (this.musicSource) return;
      try {
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.volume * 0.8;
        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.sounds.music;
        this.musicSource.loop = true;
        this.musicSource.connect(this.musicGain);
        this.musicGain.connect(this.ctx.destination);
        this.musicSource.start();
        console.log('🎵 Music started (Web Audio)');
        return;
      } catch(e) { console.warn('Web Audio music failed', e); }
    }
    // HTML5 fallback
    if (this.html5Music) {
      if (!this.html5Music.paused) return;
      this.html5Music.play().then(() => {
        console.log('🎵 Music started (HTML5)');
      }).catch(e => console.warn('HTML5 music failed', e));
    }
  }

  pauseMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource = null;
        this.musicGain = null;
        console.log('Music stopped (Web Audio)');
      } catch(e) {}
    }
    if (this.html5Music) {
      this.html5Music.pause();
    }
  }

  playCombo(combo) {
    if (combo < 2) return;
    this.forceResume();
    if (this.ctx && this.ready && this.sounds.combo) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds.combo;
        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * 0.4;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        const rate = Math.min(1.8, 0.8 + (combo - 2) * 0.05);
        source.playbackRate.value = rate;
        source.start();
        setTimeout(() => {
          try { source.stop(); } catch(e) {}
        }, 500);
        return;
      } catch(e) { console.warn('Web Audio combo failed', e); }
    }
    if (this.sounds.comboHTML5) {
      try {
        this.sounds.comboHTML5.currentTime = 0;
        this.sounds.comboHTML5.play().catch(() => {});
      } catch(e) {}
    }
  }

  setVolume(vol) {
    this.volume = Math.min(1, Math.max(0, vol));
    if (this.musicGain) {
      this.musicGain.gain.value = this.volume * 0.8;
    }
    if (this.html5Music) {
      this.html5Music.volume = this.volume * 0.8;
    }
    if (this.sounds.collectHTML5) this.sounds.collectHTML5.volume = this.volume;
    if (this.sounds.buyHTML5) this.sounds.buyHTML5.volume = this.volume * 0.7;
    if (this.sounds.comboHTML5) this.sounds.comboHTML5.volume = this.volume * 0.4;
  }
}
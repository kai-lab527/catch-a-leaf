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

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Web Audio context created');
    } catch(e) {
      console.warn('Web Audio not supported');
    }

    this.loadSounds();
  }

  async loadSounds() {
    if (!this.ctx) return;
    if (this.loading) return;
    this.loading = true;

    console.log('Loading sounds...');

    try {
      const [collect, music, combo, buy] = await Promise.all([
        this.loadBuffer('sounds/collect_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/music_loop_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/combo_catch_a_leaf.mp3'),
        this.loadBuffer('sounds/buy_catch_a_leaf.mp3') // <-- NEW
      ]);

      this.sounds.collect = collect;
      this.sounds.music = music;
      this.sounds.combo = combo;
      this.sounds.buy = buy; // <-- NEW

      this.ready = true;
      this.loading = false;

      console.log('All sounds loaded successfully');
      console.log('  collect:', !!collect);
      console.log('  music:', !!music);
      console.log('  combo:', !!combo);
      console.log('  buy:', !!buy); // <-- NEW

      if (this._pendingMusic) {
        this._pendingMusic = false;
        this.playMusic();
      }
    } catch(err) {
      console.warn('Some sounds failed to load:', err);
      this.loading = false;
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

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        console.log('Audio context resumed');
      }).catch(e => {
        console.warn('Failed to resume audio context', e);
      });
    }
  }

  playCollect() {
    this.resumeContext();
    if (!this.ctx || !this.ready || !this.sounds.collect) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.sounds.collect;
      const gain = this.ctx.createGain();
      gain.gain.value = this.volume;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch(e) {
      console.warn('Collect play failed', e);
    }
  }

  playBuy() { // <-- NEW METHOD
    this.resumeContext();
    if (!this.ctx || !this.ready || !this.sounds.buy) return;
    try {
      const source = this.ctx.createBufferSource();
      source.buffer = this.sounds.buy;
      const gain = this.ctx.createGain();
      gain.gain.value = this.volume * 0.7;
      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start();
    } catch(e) {
      console.warn('Buy sound play failed', e);
    }
  }

  playMusic() {
    this.resumeContext();
    if (!this.ctx) return;
    if (this.musicSource) return;
    if (!this.ready) {
      this._pendingMusic = true;
      return;
    }
    if (!this.sounds.music) return;

    try {
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.volume * 0.8;
      this.musicSource = this.ctx.createBufferSource();
      this.musicSource.buffer = this.sounds.music;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGain);
      this.musicGain.connect(this.ctx.destination);
      this.musicSource.start();
      console.log('Music started');
    } catch(e) {
      console.warn('Music play failed', e);
    }
  }

  pauseMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource = null;
        this.musicGain = null;
        console.log('Music stopped');
      } catch(e) {
        console.warn('Music stop failed', e);
      }
    }
  }

  playCombo(combo) {
    if (combo < 2) return;
    this.resumeContext();
    if (!this.ctx || !this.ready || !this.sounds.combo) return;
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
    } catch(e) {
      console.warn('Combo play failed', e);
    }
  }

  setVolume(vol) {
    this.volume = Math.min(1, Math.max(0, vol));
    if (this.musicGain) {
      this.musicGain.gain.value = this.volume * 0.8;
    }
  }
}
/* DeviceMode.js - laptop / android switch. Android uses fullscreen portrait mode. */
const DeviceMode = {
  mode: 'laptop',
  async enter(mode) {
    this.mode = mode;
    document.documentElement.dataset.device = mode;
    if (mode === 'android') {
      try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
      try { await screen.orientation.lock('portrait'); } catch (e) {}
      this.watch();
    } else {
      try { screen.orientation.unlock(); } catch (e) {}
    }
    this.sync();
  },
  sync() {
    if (window.game && window.game.fit) window.game.fit();
  },
  watch() {
    if (this._w) return;
    this._w = true;
    const go = () => setTimeout(() => this.sync(), 150);
    window.addEventListener('resize', go);
    window.addEventListener('orientationchange', go);
    document.addEventListener('fullscreenchange', go);
  }
};
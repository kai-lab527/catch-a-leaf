/* Intro menu controller and fallback for cached older Game.js builds. */
(function bootIntro() {
  const screen = document.getElementById('startScreen');

  function preferredDevice() {
    const ua = navigator.userAgent || '';
    const mobileTouch = navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 700;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || mobileTouch ? 'android' : 'laptop';
  }

  function patchGame() {
    const game = window.game;
    if (!game || game.__introPatched) return !!game;
    game.__introPatched = true;
    if (typeof game.quitToMenu !== 'function') {
      game.quitToMenu = () => {
        game.audio?.pauseMusic();
        game.state = 'quit';
        screen.classList.remove('pick-device');
        screen.classList.add('quit-screen');
        try {
          if (window.opener) { window.close(); return; }
          if (window.history.length > 1) { window.history.back(); return; }
        } catch (e) {}
      };
    }
    if (!String(game.beginGame).includes('gameTransition')) {
      const beginGame = game.beginGame.bind(game);
      game.beginGame = async (device) => {
        const transition = document.getElementById('gameTransition');
        screen.classList.add('is-exiting');
        transition?.classList.remove('play');
        if (transition) { void transition.offsetWidth; transition.classList.add('play'); }
        return beginGame(device);
      };
    }
    return true;
  }

  function wire() {
    if (!screen || screen.__introWired) return;
    screen.__introWired = true;
    screen.querySelectorAll('.menu-leaves span').forEach((leaf) => {
      leaf.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (leaf.classList.contains('popped')) return;
        leaf.classList.add('popped');
      });
      leaf.addEventListener('animationend', (event) => {
        if (event.animationName === 'menuLeafPop') leaf.classList.remove('popped');
      });
    });
    document.getElementById('startBtn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      window.game?.audio?.forceResume();
      if (window.game?.beginGame && typeof window.game.getPreferredDevice !== 'function') {
        window.game.beginGame(preferredDevice());
      }
    });
    document.getElementById('quitBtn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      screen.classList.remove('pick-device');
      screen.classList.add('quit-screen');
      try { if (window.opener) window.close(); } catch (e) {}
    });
  }

  function boot() {
    wire();
    if (!patchGame()) setTimeout(patchGame, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


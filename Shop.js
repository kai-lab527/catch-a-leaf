/* STUMP & STUFF — the in-game upgrade shop. */
class Shop {
  constructor() {
    this.overlay = document.getElementById('shopOverlay');
    this.grid = document.getElementById('shopGrid');
    this.skillButton = document.getElementById('skillBtn');
    this.closeButton = document.getElementById('shopClose');
    this.buyButton = document.getElementById('shopBuy');
    this.money = document.getElementById('shopMoney');
    this.selected = 'spicy';
    this.levels = {};
    this.items = [
      { id: 'piggy', code: 'PP', icon: 0, name: 'Piggy Pockets', effect: '+50% leaf value', copy: 'Stuff more leaf-value into every pocket.', price: 500, max: 5, color: '#f5c842' },
      { id: 'sneakers', code: 'SQ', icon: 1, name: 'Squirrel Sneakers', effect: '+15% move speed', copy: 'Run like a squirrel with somewhere to be.', price: 555, max: 5, color: '#29d5d5' },
      { id: 'bucket', code: 'GB', icon: 2, name: "Granny's Giant Bucket", effect: '+15% catch area', copy: 'A bigger bin means fewer almost-catches.', price: 600, max: 3, color: '#9bda62' },
      { id: 'sticky', code: 'SF', icon: 3, name: 'Sticky Fingers', effect: 'Leaves drift to you', copy: 'Leaves get a little clingy. It is fine.', price: 900, max: 3, color: '#35d9d2' },
      { id: 'grumpy', code: 'GC', icon: 4, name: 'Grumpy Cloud', effect: '+30% leaf drops', copy: 'Summon a cloud with a very generous opinion.', price: 450, max: 5, color: '#a4e36e' },
      { id: 'slowpoke', code: 'SW', icon: 5, name: 'Slowpoke Feather', effect: '-8% fall speed', copy: 'Give yourself an extra blink to catch it.', price: 650, max: 5, color: '#b3e553' },
      { id: 'blueberry', code: 'BL', icon: 6, name: 'Blueberry Luck', effect: 'More blue leaves', copy: 'A suspiciously blue improvement.', price: 800, max: 5, color: '#22c9f2' },
      { id: 'spicy', code: 'SS', icon: 7, name: 'Spicy Streak', effect: '+25% combo bonus', copy: 'Turn a good streak into a spicy streak.', price: 700, max: 5, color: '#ff920f' }
    ];
    this.boot();
  }

  boot() {
    if (!this.overlay || !this.grid || !this.skillButton) return;
    this.skillButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.open();
    });
    this.closeButton.addEventListener('click', () => this.close());
    this.buyButton.addEventListener('click', () => this.buy());
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
    });
    this.render();
  }

  isOpen() { return this.overlay.classList.contains('is-open'); }

  open() {
    if (!window.game || window.game.state !== 'playing') return;
    this.refreshMoney();
    this.render();
    this.overlay.classList.add('is-open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.closeButton.focus();
  }

  close() {
    this.overlay.classList.remove('is-open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.skillButton.focus();
  }

  item(id = this.selected) { return this.items.find((item) => item.id === id) || this.items[7]; }

  render() {
    this.grid.innerHTML = this.items.map((item) => {
      const level = this.levels[item.id] || 0;
      const selected = item.id === this.selected ? ' selected' : '';
      const maxed = level >= item.max ? ' maxed' : '';
      const iconPosition = (item.icon / 7) * 100;
      return `<button class="shop-card${selected}${maxed}" data-shop-item="${item.id}" style="--item-color:${item.color};--icon-position:${iconPosition}%" type="button" aria-label="${item.name}">
        <span class="shop-card-icon" aria-hidden="true"></span>
        <strong>${item.name}</strong>
        <small>${item.effect}</small>
        <span class="shop-card-meta"><b>¢ ${item.price}</b><em>LV ${level}/${item.max}</em></span>
      </button>`;
    }).join('');
    this.grid.querySelectorAll('.shop-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.selected = card.dataset.shopItem;
        this.render();
      });
    });
    this.renderDetail();
  }

  renderDetail() {
    const item = this.item();
    const level = this.levels[item.id] || 0;
    const money = window.game ? window.game.money : 0;
    const detailArt = document.getElementById('shopDetailArt');
    detailArt.textContent = '';
    detailArt.style.setProperty('--item-color', item.color);
    detailArt.style.setProperty('--icon-position', `${(item.icon / 7) * 100}%`);
    document.getElementById('shopDetailName').textContent = item.name;
    document.getElementById('shopDetailEffect').textContent = item.effect;
    document.getElementById('shopDetailCopy').textContent = level >= item.max ? 'Maxed out. The stump is impressed.' : item.copy;
    document.getElementById('shopDetailPrice').textContent = item.price;
    document.getElementById('shopDetailMeter').innerHTML = Array.from({ length: item.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    this.buyButton.disabled = level >= item.max || money < item.price;
    this.buyButton.textContent = level >= item.max ? 'MAXED OUT' : money < item.price ? 'TOO POOR :(' : 'BUY IT';
    this.refreshMoney();
  }

  refreshMoney() {
    const value = window.game ? window.game.money : 0;
    this.money.textContent = Fmt.short(value);
  }

  buy() {
    const item = this.item();
    const level = this.levels[item.id] || 0;
    if (!window.game || level >= item.max || window.game.money < item.price) return;
    window.game.money -= item.price;
    this.levels[item.id] = level + 1;
    window.game.applyShopLevels(this.levels);
    window.game.updateHUD();
    this.render();
    this.buyButton.classList.remove('bought');
    void this.buyButton.offsetWidth;
    this.buyButton.classList.add('bought');
  }
}

(function bootShop() {
  const boot = () => { if (!window.shop) window.shop = new Shop(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

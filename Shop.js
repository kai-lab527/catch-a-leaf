/* STUMP & STUFF — the in-game upgrade shop. */
class Shop {
  constructor() {
    this.overlay = document.getElementById('shopOverlay');
    this.grid = document.getElementById('shopGrid');
    this.skillButton = document.getElementById('skillBtn');
    this.closeButton = document.getElementById('shopClose');
    this.buyButton = document.getElementById('shopBuy');
    this.money = document.getElementById('shopMoney');
    this.upgradesTab = document.getElementById('shopTabUpgrades');
    this.leavesTab = document.getElementById('shopTabLeaves');
    this.category = 'upgrades';
    this.selected = 'spicy';
    this.selectedLeaf = 'fern';
    this.levels = {};
    this.unlockedLeaves = {};
    this.items = [
      { id: 'piggy', code: 'PP', icon: 0, name: 'Piggy Pockets', effect: '+50% leaf value', copy: 'Stuff more leaf-value into every pocket.', price: 500, max: 5, color: '#f5c842' },
      { id: 'sneakers', code: 'SQ', icon: 1, name: 'Squirrel Sneakers', effect: '+15% move speed', copy: 'Run like a squirrel with somewhere to be.', price: 555, max: 5, color: '#29d5d5' },
      { id: 'bucket', code: 'GB', icon: 2, name: "Granny's Giant Bucket", effect: '+15% catch area', copy: 'A bigger bin means fewer almost-catches.', price: 600, max: 3, color: '#9bda62' },
      { id: 'grumpy', code: 'GC', icon: 3, name: 'Grumpy Cloud', effect: '+30% leaf drops', copy: 'Summon a cloud with a very generous opinion.', price: 450, max: 5, color: '#a4e36e' },
      { id: 'slowpoke', code: 'SW', icon: 4, name: 'Slowpoke Feather', effect: '-8% fall speed', copy: 'Give yourself an extra blink to catch it.', price: 650, max: 5, color: '#b3e553' },
      { id: 'blueberry', code: 'BL', icon: 5, name: 'Blueberry Luck', effect: 'More blue leaves', copy: 'A suspiciously blue improvement.', price: 800, max: 5, color: '#22c9f2' },
      { id: 'spicy', code: 'SS', icon: 6, name: 'Spicy Streak', effect: '+25% combo bonus', copy: 'Turn a good streak into a spicy streak.', price: 700, max: 5, color: '#ff920f' },
      { id: 'comboClock', code: 'CC', icon: 7, name: 'Combo Clock', effect: '+0.4s combo time', copy: 'Gives your streak more time before it fades.', price: 750, max: 5, color: '#ffca55' }
    ];
    this.varieties = [
      { id: 'fern', name: 'Fern Frond', effect: 'Worth 6¢ per catch', copy: 'Add fern fronds to the falling-leaf pool.', price: 1000, sprite: 'fern_frond.png', color: '#83b84a' },
      { id: 'ginkgo', name: 'Ginkgo Fan', effect: 'Worth 9¢ per catch', copy: 'Add golden ginkgo fans to the falling-leaf pool.', price: 2500, sprite: 'ginkgo_leaf.png', color: '#f0c84b' },
      { id: 'oak', name: 'Oak Leaf', effect: 'Worth 13¢ per catch', copy: 'Add fiery oak leaves to the falling-leaf pool.', price: 5000, sprite: 'oak_leaf.png', color: '#d98232' }
    ];
    this.boot();
  }

  boot() {
    if (!this.overlay || !this.grid || !this.skillButton || !this.upgradesTab || !this.leavesTab) return;
    this.skillButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.open();
    });
    this.closeButton.addEventListener('click', () => this.close());
    this.buyButton.addEventListener('click', () => this.buy());
    this.upgradesTab.addEventListener('click', () => this.setCategory('upgrades'));
    this.leavesTab.addEventListener('click', () => this.setCategory('leaves'));
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.isOpen()) this.close();
    });
    this.render();
  }

  isOpen() { return this.overlay.classList.contains('is-open'); }

  setCategory(category) {
    this.category = category;
    this.grid.classList.toggle('leaf-category', category === 'leaves');
    this.upgradesTab.classList.toggle('is-active', category === 'upgrades');
    this.leavesTab.classList.toggle('is-active', category === 'leaves');
    this.upgradesTab.setAttribute('aria-selected', String(category === 'upgrades'));
    this.leavesTab.setAttribute('aria-selected', String(category === 'leaves'));
    this.grid.setAttribute('aria-label', category === 'leaves' ? 'Leaf varieties' : 'Shop upgrades');
    this.render();
    this.grid.scrollTop = 0;
  }

  open() {
    if (!window.game || window.game.state !== 'playing') return;
    this.refreshMoney();
    this.render();
    this.grid.scrollTop = 0;
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
  variety(id = this.selectedLeaf) { return this.varieties.find((item) => item.id === id) || this.varieties[0]; }
  upgradePrice(item, level = this.levels[item.id] || 0) {
    return Math.round(item.price * Math.pow(1.5, level));
  }

  render() {
    this.grid.innerHTML = this.category === 'leaves'
      ? this.varieties.map((item) => {
        const owned = Boolean(this.unlockedLeaves[item.id]);
        const selected = item.id === this.selectedLeaf ? ' selected' : '';
        return `<button class="shop-card leaf-card${selected}${owned ? ' owned' : ''}" data-leaf-id="${item.id}" style="--item-color:${item.color};--leaf-art:url('Sprites/${item.sprite}')" type="button" aria-label="${item.name}">
          <span class="shop-card-icon leaf-variety-icon" aria-hidden="true"></span>
          <strong>${item.name}</strong>
          <small>${item.effect}</small>
          <span class="shop-card-meta"><b>¢ ${item.price}</b><em>${owned ? 'OWNED' : 'BUY'}</em></span>
        </button>`;
      }).join('')
      : this.items.map((item) => {
        const level = this.levels[item.id] || 0;
        const price = this.upgradePrice(item, level);
        const selected = item.id === this.selected ? ' selected' : '';
        const maxed = level >= item.max ? ' maxed' : '';
        const iconPosition = (item.icon / 7) * 100;
        return `<button class="shop-card${selected}${maxed}" data-shop-item="${item.id}" style="--item-color:${item.color};--icon-position:${iconPosition}%" type="button" aria-label="${item.name}">
          <span class="shop-card-icon" aria-hidden="true"></span>
          <strong>${item.name}</strong>
          <small>${item.effect}</small>
          <span class="shop-card-meta"><b>¢ ${price}</b><em>LV ${level}/${item.max}</em></span>
        </button>`;
      }).join('');
    this.grid.querySelectorAll('.shop-card').forEach((card) => {
      card.addEventListener('click', () => {
        if (this.category === 'leaves') this.selectedLeaf = card.dataset.leafId;
        else this.selected = card.dataset.shopItem;
        this.render();
      });
    });
    this.renderDetail();
  }

  renderDetail() {
    if (this.category === 'leaves') {
      this.renderLeafDetail();
      return;
    }
    const item = this.item();
    const level = this.levels[item.id] || 0;
    const price = this.upgradePrice(item, level);
    const money = window.game ? window.game.money : 0;
    const detailArt = document.getElementById('shopDetailArt');
    detailArt.textContent = '';
    detailArt.classList.remove('leaf-detail-art');
    detailArt.style.removeProperty('--leaf-art');
    detailArt.style.setProperty('--item-color', item.color);
    detailArt.style.setProperty('--icon-position', `${(item.icon / 7) * 100}%`);
    document.getElementById('shopDetailName').textContent = item.name;
    document.getElementById('shopDetailEffect').textContent = item.effect;
    document.getElementById('shopDetailCopy').textContent = level >= item.max ? 'Maxed out. The stump is impressed.' : item.copy;
    document.getElementById('shopDetailPrice').textContent = price;
    const meter = document.getElementById('shopDetailMeter');
    meter.hidden = false;
    meter.innerHTML = Array.from({ length: item.max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    this.buyButton.disabled = level >= item.max || money < price;
    this.buyButton.textContent = level >= item.max ? 'MAXED OUT' : money < price ? 'TOO POOR :(' : 'BUY IT';
    this.refreshMoney();
  }

  renderLeafDetail() {
    const item = this.variety();
    const owned = Boolean(this.unlockedLeaves[item.id]);
    const money = window.game ? window.game.money : 0;
    const detailArt = document.getElementById('shopDetailArt');
    detailArt.textContent = '';
    detailArt.classList.add('leaf-detail-art');
    detailArt.style.setProperty('--leaf-art', `url('Sprites/${item.sprite}')`);
    document.getElementById('shopDetailName').textContent = item.name;
    document.getElementById('shopDetailEffect').textContent = item.effect;
    document.getElementById('shopDetailCopy').textContent = owned ? 'This variety is now part of your falling leaves.' : item.copy;
    document.getElementById('shopDetailPrice').textContent = item.price;
    document.getElementById('shopDetailMeter').hidden = true;
    this.buyButton.disabled = owned || money < item.price;
    this.buyButton.textContent = owned ? 'OWNED' : money < item.price ? 'TOO POOR :(' : 'BUY LEAF';
    this.refreshMoney();
  }

  refreshMoney() {
    const value = window.game ? window.game.money : 0;
    this.money.textContent = Fmt.short(value);
  }

  buy() {
    if (this.category === 'leaves') {
      const item = this.variety();
      if (!window.game || this.unlockedLeaves[item.id] || window.game.money < item.price) return;
      window.game.money -= item.price;
      this.unlockedLeaves[item.id] = true;
      window.game.applyShopLevels({ ...this.levels, leafTypes: Object.keys(this.unlockedLeaves) });
      window.game.updateHUD();
      this.render();
      this.buyButton.classList.remove('bought');
      void this.buyButton.offsetWidth;
      this.buyButton.classList.add('bought');
      return;
    }
    const item = this.item();
    const level = this.levels[item.id] || 0;
    const price = this.upgradePrice(item, level);
    if (!window.game || level >= item.max || window.game.money < price) return;
    window.game.money -= price;
    this.levels[item.id] = level + 1;
    window.game.applyShopLevels({ ...this.levels, leafTypes: Object.keys(this.unlockedLeaves) });
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

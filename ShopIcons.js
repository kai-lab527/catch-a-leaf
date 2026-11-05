/* Keeps the shop icon art in sync when an older cached Shop.js is still loaded. */
(function enhanceShopIcons() {
  const iconIndex = {
    piggy: 0,
    sneakers: 1,
    bucket: 2,
    grumpy: 3,
    slowpoke: 4,
    blueberry: 5,
    spicy: 6,
    comboClock: 7
  };
  const customIcons = {
    comboClock: 'Sprites/combo_clock_icon.svg',
    grumpy: 'Sprites/cloud.png'
  };

  function applyIcons() {
    const shop = window.shop;
    if (!shop) return false;

    document.querySelectorAll('.shop-card').forEach((card) => {
      const icon = card.querySelector('.shop-card-icon');
      const index = iconIndex[card.dataset.shopItem];
      const customIcon = customIcons[card.dataset.shopItem];
      if (!icon) return;
      icon.textContent = '';
      icon.setAttribute('aria-hidden', 'true');
      if (customIcon) {
        icon.style.backgroundImage = `url('${customIcon}')`;
        icon.style.backgroundSize = card.dataset.shopItem === 'grumpy' ? '200% auto' : 'contain';
        icon.style.backgroundPosition = 'center';
      } else if (index !== undefined) {
        icon.style.removeProperty('background-image');
        icon.style.removeProperty('background-size');
        icon.style.removeProperty('background-position');
        card.style.setProperty('--icon-position', `${(index / 7) * 100}%`);
      }
    });

    const detail = document.getElementById('shopDetailArt');
    const selected = shop.item ? shop.item() : null;
    if (detail && selected && shop.category === 'upgrades' && customIcons[selected.id]) {
      detail.style.backgroundImage = `url('${customIcons[selected.id]}')`;
      detail.style.backgroundSize = selected.id === 'grumpy' ? '200% auto' : 'contain';
      detail.style.backgroundPosition = 'center';
      detail.textContent = '';
    } else if (detail && selected && shop.category === 'upgrades' && iconIndex[selected.id] !== undefined) {
      detail.style.removeProperty('background-image');
      detail.style.removeProperty('background-size');
      detail.style.removeProperty('background-position');
      detail.textContent = '';
      detail.style.setProperty('--icon-position', `${(iconIndex[selected.id] / 7) * 100}%`);
    } else if (detail && shop.category === 'leaves') {
      detail.style.removeProperty('background-image');
      detail.style.removeProperty('background-size');
      detail.style.removeProperty('background-position');
    }
    return true;
  }

  function install() {
    const shop = window.shop;
    if (!shop) return false;
    if (!shop.__iconsEnhanced) {
      const render = shop.render.bind(shop);
      shop.render = (...args) => {
        const result = render(...args);
        applyIcons();
        return result;
      };
      shop.__iconsEnhanced = true;
    }
    applyIcons();
    return true;
  }

  const boot = () => {
    if (!install()) setTimeout(install, 0);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

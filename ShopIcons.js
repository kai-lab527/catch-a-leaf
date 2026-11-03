/* Keeps the shop icon art in sync when an older cached Shop.js is still loaded. */
(function enhanceShopIcons() {
  const iconIndex = {
    piggy: 0,
    sneakers: 1,
    bucket: 2,
    sticky: 3,
    grumpy: 4,
    slowpoke: 5,
    blueberry: 6,
    spicy: 7
  };

  function applyIcons() {
    const shop = window.shop;
    if (!shop) return false;

    document.querySelectorAll('.shop-card').forEach((card) => {
      const icon = card.querySelector('.shop-card-icon');
      const index = iconIndex[card.dataset.shopItem];
      if (!icon || index === undefined) return;
      icon.textContent = '';
      icon.setAttribute('aria-hidden', 'true');
      card.style.setProperty('--icon-position', `${(index / 7) * 100}%`);
    });

    const detail = document.getElementById('shopDetailArt');
    const selected = shop.item ? shop.item() : null;
    if (detail && selected && iconIndex[selected.id] !== undefined) {
      detail.textContent = '';
      detail.style.setProperty('--icon-position', `${(iconIndex[selected.id] / 7) * 100}%`);
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

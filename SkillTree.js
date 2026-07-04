class SkillTree {
  constructor() {
    this.name = 'SkillTree';
    this.skills = {
      // --- Fortune branch (economy) ---
      value:  { name: 'Rich Harvest', icon: '💰', desc: '+50% cents per leaf',        level: 0, max: 5, cost: 2, moneyCost: 60, color: '#ffd700', branch: 'fortune' },
      combo:  { name: 'Combo Master', icon: '🔥', desc: 'Combo bonus +25%',           level: 0, max: 5, cost: 3, moneyCost: 80, color: '#ff8c1a', branch: 'fortune' },
      golden: { name: 'Midas Touch',  icon: '✨', desc: '+2% golden leaf chance',      level: 0, max: 5, cost: 3, moneyCost: 100, color: '#ffb347', branch: 'fortune' },

      // --- Swift branch (player/collection) ---
      speed:  { name: 'Swift Feet',   icon: '👟', desc: '+15% move speed',            level: 0, max: 5, cost: 2, moneyCost: 50, color: '#4fd1c5', branch: 'swift' },
      big:    { name: 'Wide Basket',  icon: '🧺', desc: '+15% catch area',            level: 0, max: 3, cost: 3, moneyCost: 70, color: '#3fb8ac', branch: 'swift' },
      magnet: { name: 'Leaf Magnet',  icon: '🧲', desc: 'Basket attracts leaves',     level: 0, max: 3, cost: 4, moneyCost: 120, color: '#2aa89c', branch: 'swift' },

      // --- Harvest branch (leaf spawning) ---
      spawn:  { name: 'Autumn Storm', icon: '🍂', desc: 'More leaves fall',           level: 0, max: 5, cost: 2, moneyCost: 55, color: '#7cb342', branch: 'harvest' },
      slow:   { name: 'Feather Fall', icon: '🪶', desc: 'Leaves fall slower',         level: 0, max: 5, cost: 3, moneyCost: 75, color: '#5a9a2c', branch: 'harvest' },
      blue:   { name: 'Lucky Blue',   icon: '💎', desc: '+Blue leaf odds & value',    level: 0, max: 5, cost: 3, moneyCost: 90, color: '#3ac9ff', branch: 'harvest' }
    };
    this.available = 0;
  }

  addPoint() { this.available++; }

  // Money cost now scales 80% per level (was 60%)
  getMoneyCost(id) {
    const s = this.skills[id];
    if (!s) return 0;
    return Math.round(s.moneyCost * (1 + s.level * 0.8));
  }

  buy(id, money) {
    const s = this.skills[id];
    if (!s) return { success: false };
    if (s.level >= s.max) return { success: false, reason: 'maxed' };
    const spCost = s.cost;
    const moneyCost = this.getMoneyCost(id);
    if (this.available < spCost) return { success: false, reason: 'sp', spCost, moneyCost };
    if (money < moneyCost) return { success: false, reason: 'money', spCost, moneyCost };
    this.available -= spCost;
    s.level++;
    return { success: true, spCost, moneyCost };
  }

  getValueMul()  { return 1 + this.skills.value.level * 0.5; }
  getSpeedMul()  { return 1 + this.skills.speed.level * 0.15; }
  getSpawnMul()  { return 1 + this.skills.spawn.level * 0.3; }
  getFallMul()   { return Math.max(0.2, 1 - this.skills.slow.level * 0.08); }
  getGoldenBonus() { return this.skills.golden.level * 0.02; }
  getComboMul() { return 1 + this.skills.combo.level * 0.25; }
  getMagnetRange() { return this.skills.magnet.level * 90; }
  getBasketMul() { return 1 + this.skills.big.level * 0.15; }
  getBlueBonus() { return this.skills.blue.level * 0.015; }
  getBlueValueBonus() { return this.skills.blue.level * 3; }
}
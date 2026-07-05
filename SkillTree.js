class SkillTree {
  constructor() {
    this.name = 'SkillTree';
    this.skills = {
      // --- Fortune branch (economy) ---
      value:  { name: 'Rich Harvest', icon: '💰', desc: '+50% cents per leaf',        level: 0, max: 5, cost: 1, moneyCost: 40, color: '#ffd700', branch: 'fortune', tier: 1 },
      combo:  { name: 'Combo Master', icon: '🔥', desc: 'Combo bonus +25%',           level: 0, max: 5, cost: 2, moneyCost: 55, color: '#ff8c1a', branch: 'fortune', tier: 2 },
      golden: { name: 'Midas Touch',  icon: '✨', desc: '+2% golden leaf chance',      level: 0, max: 5, cost: 2, moneyCost: 70, color: '#ffb347', branch: 'fortune', tier: 2 },
      // Fortune Capstone
      goldenHoard: { name: 'Golden Hoard', icon: '👑', desc: 'All gold values doubled!', level: 0, max: 1, cost: 3, moneyCost: 150, color: '#ffd700', branch: 'fortune', tier: 3 },

      // --- Swift branch (player/collection) ---
      speed:  { name: 'Swift Feet',   icon: '👟', desc: '+15% move speed',            level: 0, max: 5, cost: 1, moneyCost: 30, color: '#4fd1c5', branch: 'swift', tier: 1 },
      big:    { name: 'Wide Basket',  icon: '🧺', desc: '+15% catch area',            level: 0, max: 3, cost: 2, moneyCost: 45, color: '#3fb8ac', branch: 'swift', tier: 2 },
      magnet: { name: 'Leaf Magnet',  icon: '🧲', desc: 'Basket attracts leaves',     level: 0, max: 3, cost: 3, moneyCost: 90, color: '#2aa89c', branch: 'swift', tier: 2 },
      // Swift Capstone
      cycloneStep: { name: 'Cyclone Step', icon: '🌪️', desc: 'Instant catch all visible leaves!', level: 0, max: 1, cost: 3, moneyCost: 150, color: '#4fd1c5', branch: 'swift', tier: 3 },

      // --- Harvest branch (leaf spawning) ---
      spawn:  { name: 'Autumn Storm', icon: '🍂', desc: 'More leaves fall',           level: 0, max: 5, cost: 1, moneyCost: 35, color: '#7cb342', branch: 'harvest', tier: 1 },
      slow:   { name: 'Feather Fall', icon: '🪶', desc: 'Leaves fall slower',         level: 0, max: 5, cost: 2, moneyCost: 50, color: '#5a9a2c', branch: 'harvest', tier: 2 },
      blue:   { name: 'Lucky Blue',   icon: '💎', desc: '+Blue leaf odds & value',    level: 0, max: 5, cost: 2, moneyCost: 65, color: '#3ac9ff', branch: 'harvest', tier: 2 },
      // Harvest Capstone
      naturesBlessing: { name: 'Nature\'s Blessing', icon: '🌳', desc: 'All leaves worth double!', level: 0, max: 1, cost: 3, moneyCost: 150, color: '#7cb342', branch: 'harvest', tier: 3 }
    };
    this.available = 0;
    this.rootPurchased = false;
  }

  addPoint() { this.available++; }

  getMoneyCost(id) {
    const s = this.skills[id];
    if (!s) return 0;
    return Math.round(s.moneyCost * (1 + s.level * 0.8));
  }

  // Root purchase
  buyRoot(money) {
    if (this.rootPurchased) return { success: false, reason: 'Already purchased' };
    if (money < 500) return { success: false, reason: 'Need 500 coins' };
    this.rootPurchased = true;
    return { success: true, moneyCost: 500 };
  }

  buy(id, money) {
    // Check root first
    if (!this.rootPurchased && id !== 'root') {
      return { success: false, reason: 'Unlock Leaf Knowledge first!' };
    }

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

  // Capstone effects
  getGoldenHoardBonus() { return this.skills.goldenHoard.level > 0 ? 2 : 1; }
  getCycloneStepBonus() { return this.skills.cycloneStep.level > 0 ? 1 : 0; }
  getNaturesBlessingBonus() { return this.skills.naturesBlessing.level > 0 ? 2 : 1; }

  // Get skill tier (1=specialization, 2=upgrade, 3=capstone)
  getTier(id) {
    const s = this.skills[id];
    return s ? s.tier || 1 : 1;
  }

  // Get skills in a branch, ordered by tier
  getBranchSkills(branch) {
    const entries = Object.entries(this.skills);
    const filtered = entries.filter(([_, s]) => s.branch === branch);
    filtered.sort((a, b) => (a[1].tier || 1) - (b[1].tier || 1));
    return filtered;
  }

  // Check if a skill can be purchased
  canPurchase(id, money) {
    if (!this.rootPurchased) return { can: false, reason: 'Unlock Leaf Knowledge first!' };

    const s = this.skills[id];
    if (!s) return { can: false, reason: 'Invalid skill' };
    if (s.level >= s.max) return { can: false, reason: 'Maxed' };

    const tier = s.tier || 1;
    const branch = s.branch;

    if (tier === 1) {
      return { can: true };
    } else if (tier === 2) {
      const tier1Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 1);
      const allPurchased = tier1Skills.every(([_, sk]) => sk.level > 0);
      if (!allPurchased) return { can: false, reason: 'Requires specialization' };
      return { can: true };
    } else if (tier === 3) {
      const tier2Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 2);
      const allPurchased = tier2Skills.every(([_, sk]) => sk.level > 0);
      if (!allPurchased) return { can: false, reason: 'Requires all upgrades' };
      return { can: true };
    }
    return { can: false, reason: 'Unknown' };
  }

  // Get prerequisites for a skill (for display)
  getPrerequisites(id) {
    const s = this.skills[id];
    if (!s) return [];
    const tier = s.tier || 1;
    const branch = s.branch;

    if (tier === 1) return ['Root: Leaf Knowledge'];
    if (tier === 2) {
      const tier1Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 1);
      return tier1Skills.map(([id2, sk]) => `${sk.name}`);
    }
    if (tier === 3) {
      const tier2Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 2);
      return tier2Skills.map(([id2, sk]) => `${sk.name}`);
    }
    return [];
  }

  // Get what this skill unlocks (for display)
  getUnlocks(id) {
    const s = this.skills[id];
    if (!s) return [];
    const tier = s.tier || 1;
    const branch = s.branch;

    if (tier === 1) {
      const tier2Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 2);
      return tier2Skills.map(([id2, sk]) => sk.name);
    }
    if (tier === 2) {
      const tier3Skills = Object.entries(this.skills).filter(([_, sk]) => sk.branch === branch && (sk.tier || 1) === 3);
      return tier3Skills.map(([id2, sk]) => sk.name);
    }
    return ['Mastered!'];
  }
}
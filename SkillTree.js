class SkillTree {
  constructor() {
    this.name = 'SkillTree';
    this.skills = {
      // --- Fortune branch (economy) ---
      value: {
        name: 'Rich Harvest',
        tag: 'RH',
        hook: 'Every leaf pays more.',
        stats: ['+50% leaf value per level', 'Max: +250% at level 5'],
        level: 0,
        max: 5,
        cost: 3,
        moneyCost: 500,
        color: '#ffd700',
        branch: 'fortune',
        tier: 1
      },
      combo: {
        name: 'Combo Master',
        tag: 'CM',
        hook: 'Keep the chain alive. Get paid.',
        stats: ['+25% combo bonus per level', 'Max: +125% at level 5'],
        level: 0,
        max: 5,
        cost: 4,
        moneyCost: 700,
        color: '#ff8c1a',
        branch: 'fortune',
        tier: 2
      },
      golden: {
        name: 'Midas Touch',
        tag: 'MT',
        hook: 'Gold leaves start raining.',
        stats: ['+2% golden leaf chance per level', 'Base 2%, max 12%', 'Golden leaves pay 40 coins'],
        level: 0,
        max: 5,
        cost: 4,
        moneyCost: 800,
        color: '#ffb347',
        branch: 'fortune',
        tier: 2
      },
      goldenHoard: {
        name: 'Golden Hoard',
        tag: 'GH',
        hook: 'Gold gets twice as heavy.',
        stats: ['Doubles all gold values', 'Stacks with every other bonus'],
        level: 0,
        max: 1,
        cost: 8,
        moneyCost: 2000,
        color: '#ffd700',
        branch: 'fortune',
        tier: 3
      },

      // --- Swift branch (player/collection) ---
      speed: {
        name: 'Swift Feet',
        tag: 'SF',
        hook: 'Outrun the wind.',
        stats: ['+15% move speed per level', 'Max: +75% at level 5'],
        level: 0,
        max: 5,
        cost: 3,
        moneyCost: 450,
        color: '#4fd1c5',
        branch: 'swift',
        tier: 1
      },
      big: {
        name: 'Wide Basket',
        tag: 'WB',
        hook: 'Bigger bin. Fewer misses.',
        stats: ['+15% catch area per level', 'Max: +45% at level 3'],
        level: 0,
        max: 3,
        cost: 4,
        moneyCost: 600,
        color: '#3fb8ac',
        branch: 'swift',
        tier: 2
      },
      magnet: {
        name: 'Leaf Magnet',
        tag: 'LM',
        hook: 'Leaves come to you.',
        stats: ['+90px pull range per level', 'Max: 270px at level 3'],
        level: 0,
        max: 3,
        cost: 5,
        moneyCost: 900,
        color: '#2aa89c',
        branch: 'swift',
        tier: 2
      },
      cycloneStep: {
        name: 'Cyclone Step',
        tag: 'CS',
        hook: 'One move. Every leaf.',
        stats: ['Instantly catches every leaf on screen'],
        level: 0,
        max: 1,
        cost: 8,
        moneyCost: 2000,
        color: '#4fd1c5',
        branch: 'swift',
        tier: 3
      },

      // --- Harvest branch (leaf spawning) ---
      spawn: {
        name: 'Autumn Storm',
        tag: 'AS',
        hook: 'Make it rain leaves.',
        stats: ['+30% leaf spawn rate per level', 'Max: +150% at level 5'],
        level: 0,
        max: 5,
        cost: 3,
        moneyCost: 450,
        color: '#7cb342',
        branch: 'harvest',
        tier: 1
      },
      slow: {
        name: 'Feather Fall',
        tag: 'FF',
        hook: 'Leaves fall in slow motion.',
        stats: ['-8% fall speed per level', 'Max: -40% at level 5'],
        level: 0,
        max: 5,
        cost: 4,
        moneyCost: 650,
        color: '#5a9a2c',
        branch: 'harvest',
        tier: 2
      },
      blue: {
        name: 'Lucky Blue',
        tag: 'LB',
        hook: 'Blue leaves are free skill points.',
        stats: ['+1.5% blue leaf chance per level', 'Base 0.8%, max 8.3%', 'Each blue leaf gives +1 SP'],
        level: 0,
        max: 5,
        cost: 4,
        moneyCost: 800,
        color: '#3ac9ff',
        branch: 'harvest',
        tier: 2
      },
      naturesBlessing: {
        name: 'Nature\'s Blessing',
        tag: 'NB',
        hook: 'Every leaf. Double the coin.',
        stats: ['Doubles the value of every leaf you catch', 'Stacks with every other bonus'],
        level: 0,
        max: 1,
        cost: 8,
        moneyCost: 2000,
        color: '#7cb342',
        branch: 'harvest',
        tier: 3
      }
    };
    this.available = 0;
    this.rootPurchased = false;
  }

  addPoint() { this.available++; }

  getMoneyCost(id) {
    const s = this.skills[id];
    if (!s) return 0;
    // Scaling: 90% per level
    return Math.round(s.moneyCost * (1 + s.level * 0.9));
  }

  buyRoot(money) {
    if (this.rootPurchased) return { success: false, reason: 'Already purchased' };
    if (money < 1500) return { success: false, reason: 'Need 1,500 coins' };
    this.rootPurchased = true;
    return { success: true, moneyCost: 1500 };
  }

  buy(id, money) {
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

  getGoldenHoardBonus() { return this.skills.goldenHoard.level > 0 ? 2 : 1; }
  getCycloneStepBonus() { return this.skills.cycloneStep.level > 0 ? 1 : 0; }
  getNaturesBlessingBonus() { return this.skills.naturesBlessing.level > 0 ? 2 : 1; }

  getTier(id) {
    const s = this.skills[id];
    return s ? s.tier || 1 : 1;
  }

  getBranchSkills(branch) {
    const entries = Object.entries(this.skills);
    const filtered = entries.filter(([_, s]) => s.branch === branch);
    filtered.sort((a, b) => (a[1].tier || 1) - (b[1].tier || 1));
    return filtered;
  }

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

  getPrerequisites(id) {
    const s = this.skills[id];
    if (!s) return [];
    const tier = s.tier || 1;
    const branch = s.branch;

    if (tier === 1) return ['Root: Leaf Knowledge (1,500 coins)'];
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
/* =====================================================================
 * SkillIcons.js — pixel-art sprites for the skill tree
 *
 * Every icon is a 12x12 grid. Each letter is a colour from PAL ('.' = empty).
 * To tweak an icon, just edit its rows. To recolour, edit PAL.
 *
 *   SkillIcons.get('value')  -> data-URL of the Rich Harvest coin
 *   SkillIcons.seal()        -> the "?" shown on sealed (not yet open) nodes
 * ===================================================================== */
const SkillIcons = (() => {
  const PAL = {
    k: '#2a1608',                                   // outline
    g: '#f5c842', G: '#b8860b', y: '#fff4a3',       // golds
    o: '#e8701a', O: '#c84a1a',                     // oranges
    r: '#e05050', R: '#8a2020',                     // reds
    n: '#7cb342', N: '#4a7a22', m: '#b5d878',       // greens
    b: '#29b6f6', B: '#0d6fa8', l: '#a3e3ff',       // blues
    w: '#f5e8d8', t: '#d4a06a', T: '#8a5a2a',       // cream / tan / brown
    s: '#9aa5b1', S: '#5a6570'                      // steel
  };

  const ART = {
    // Leaf Knowledge — tome with a gold leaf emblem
    root: [
      '............',
      '..kkkkkkkk..',
      '.kNnnnnnnNk.',
      '.kNnnggnnNk.',
      '.kNnggggnNk.',
      '.kNngyygnNk.',
      '.kNnggggnNk.',
      '.kNnnggnnNk.',
      '.kNnnTTnnNk.',
      '.kNnnnnnnNk.',
      '.kwwwwwwwwk.',
      '.kkkkkkkkkk.'
    ],
    // Rich Harvest — coin
    value: [
      '...kkkkkk...',
      '..kggggggk..',
      '.kgyyggggGk.',
      'kgyGGGGGGGGk',
      'kgGggggggGGk',
      'kgGgggoggGGk',
      'kgGggoooggGk',
      'kgGgggoggGGk',
      'kgGggggggGGk',
      '.kgGGGGGGGk.',
      '..kGGGGGGk..',
      '...kkkkkk...'
    ],
    // Combo Master — flame
    combo: [
      '......k.....',
      '.....kOk....',
      '....kOOk.k..',
      '....kOoOkOk.',
      '...kOooOOoOk',
      '..kOooggooOk',
      '..kOogyygoOk',
      '..kOoggggoOk',
      '...kOooooOk.',
      '....kOOOOk..',
      '.....kkkk...',
      '............'
    ],
    // Midas Touch — golden sparkle
    golden: [
      '.....kk.....',
      '....kggk....',
      '....kyyk....',
      '...kgyygk...',
      'kkkgyyyygkkk',
      'kgyyyyyyyygk',
      'kggyyyyyyggk',
      'kkkgyyyygkkk',
      '...kgyygk...',
      '....kyyk....',
      '....kggk....',
      '.....kk.....'
    ],
    // Golden Hoard — stack of gold bars
    goldenHoard: [
      '....kkkk....',
      '...kyyggk...',
      '...kGGGGk...',
      '.kkkkkkkkkk.',
      '.kyyyyyyggk.',
      '.kGGGGGGGGk.',
      'kkkkkkkkkkkk',
      'kyyyyyyyyggk',
      'kggggggggggk',
      'kGGGGGGGGGGk',
      'kkkkkkkkkkkk',
      '............'
    ],
    // Swift Feet — boot with speed lines
    speed: [
      '............',
      '...kkkkkk...',
      '...kttttk...',
      '...kTTTTk...',
      'ww.kTTTTk...',
      '...kTTTTk...',
      'ww.kTTTTkkk.',
      '...kTTTTTTTk',
      'ww.kTTTTTTTk',
      '...kSSSSSSSk',
      '...kkkkkkkkk',
      '............'
    ],
    // Wide Basket — woven basket holding a leaf
    big: [
      '............',
      '...kkkkkk...',
      '..kT.oo.Tk..',
      '..kT....Tk..',
      '.kkkkkkkkkk.',
      'kttttttttttk',
      'kTtTtTtTtTtk',
      'ktTtTtTtTtTk',
      'kTtTtTtTtTtk',
      '.ktTtTtTtTk.',
      '..kkkkkkkk..',
      '............'
    ],
    // Leaf Magnet — horseshoe magnet
    magnet: [
      'kssk....kssk',
      'kssk....kssk',
      'kkkk....kkkk',
      'krrk....kRRk',
      'krrk....kRRk',
      'krrk....kRRk',
      'krrk....kRRk',
      '.krrk..kRRk.',
      '.krrrkkRRRk.',
      '..krrrRRRk..',
      '...kkkkkk...',
      '............'
    ],
    // Cyclone Step — tornado
    cycloneStep: [
      '............',
      'kkkkkkkkkkkk',
      'kwwllllllllk',
      '.kkkkkkkkkk.',
      '..kbbbbbbk..',
      '..kkkkkkkk..',
      '...kllllk...',
      '...kkkkkk...',
      '....kbbk....',
      '....kkkk....',
      '.....kk.....',
      '............'
    ],
    // Autumn Storm — storm cloud dropping leaves
    spawn: [
      '............',
      '....kkk.....',
      '...kSSSkkk..',
      '.kkssssssSk.',
      'kssssssSSSSk',
      'kSSSSSSSSSSk',
      '.kkkkkkkkkk.',
      '..o....o....',
      '.oO..oO.....',
      '......o...o.',
      '.o.....oO...',
      'oO.........o'
    ],
    // Feather Fall — feather
    slow: [
      '...........T',
      '.........wTw',
      '.......wwTww',
      '.....wwwTwll',
      '....wwwTwll.',
      '...wwwTwll..',
      '..wwwTwll...',
      '.wwwTwll....',
      '.wwTwl......',
      '.wTw........',
      'wTw.........',
      'T...........'
    ],
    // Lucky Blue — blue gem
    blue: [
      '............',
      '...kkkkkk...',
      '..kllbbbbk..',
      '.kllbbbbBBk.',
      'kkkkkkkkkkkk',
      'kllbbbbbBBBk',
      '.kllbbbbBBk.',
      '..kllbbBBk..',
      '...kllbBk...',
      '....klBk....',
      '.....kk.....',
      '............'
    ],
    // Nature's Blessing — glowing tree
    naturesBlessing: [
      '....kkkk....',
      '..kkmmnnkk..',
      '.kmmmnnnnnk.',
      'kmmmnngnnnNk',
      'kmmnnnnnnNNk',
      'knnngnnnnNNk',
      '.knnnnnnNNk.',
      '..kkNNNNkk..',
      '....kTTk....',
      '....kTTk....',
      '....kTTk....',
      '...kkkkkk...'
    ],
    // Sealed node — "?"
    seal: [
      '............',
      '...TTTTTT...',
      '..TTTTTTTT..',
      '..TT....TT..',
      '........TT..',
      '.......TT...',
      '......TT....',
      '.....TT.....',
      '.....TT.....',
      '............',
      '.....TT.....',
      '.....TT.....'
    ]
  };

  const cache = {};

  function render(rows) {
    const c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); }
    }));
    return c.toDataURL('image/png');
  }

  return {
    get(id) { return cache[id] || (cache[id] = render(ART[id] || ART.seal)); },
    seal() { return this.get('seal'); },
    ART, PAL
  };
})();
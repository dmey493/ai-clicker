/* ============================================================
   factory.js — The Facility, as an actual factory.
   A walkable 8-bit factory floor rendered on canvas: one animated
   pixel machine per automation bank, a founder avatar (WASD/arrows),
   and a mood that turns dubious as the eras advance.
   Loads after game.js and reads its globals (BUILDINGS, run, C, fmt…).
   ============================================================ */
'use strict';

const Factory = (() => {

  const TILE = 16;
  let SCALE = 3; /* recomputed on resize to fit the floor to the screen */
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- palette ---------- */
  const PAL = {
    k: '#221C15', d: '#4A4238', m: '#6E6355', M: '#948878',
    c: '#EFE3CC', x: '#FFF8EA', a: '#D97757', A: '#A54D2E',
    g: '#E9B44C', e: '#5FB36A', r: '#D6493C', s: '#93E0CD',
    S: '#21403A', b: '#85AEDB', B: '#40608C', p: '#EDC79F',
    h: '#6B563F', v: '#A56BD6', n: '#14111E',
  };

  /* mood: 0 clean workshop · 1 sterile corporate · 2 clinical-insidious · 3 sleek void · 4 the pasture
     The facility stays CLEAN throughout — menace comes from light and color, not grime. */
  const MOODS = [
    { floor: '#DCD5C3', floor2: '#D3CBB8', wall: '#94836A', wallTop: '#AC9A7E', sky: '#A8C6E0', lamp: '#E9B44C' },
    { floor: '#E5E2DA', floor2: '#DCD9D0', wall: '#7C7972', wallTop: '#949088', sky: '#9FB6C9', lamp: '#E9B44C' },
    { floor: '#E0DDD8', floor2: '#D5D2CC', wall: '#5F5B5C', wallTop: '#747071', sky: '#8E5A50', lamp: '#D6493C' },
    { floor: '#454049', floor2: '#3C3740', wall: '#2A2630', wallTop: '#3A3542', sky: '#14111E', lamp: '#D6493C' },
    { floor: '#8FB573', floor2: '#86AC6A', wall: '#5E7A4A', wallTop: '#729159', sky: '#9CC9E8', lamp: '#E9B44C' },
  ];
  const moodFor = (era) => era >= 8 ? 4 : era >= 6 ? 3 : era >= 4 ? 2 : era >= 2 ? 1 : 0;

  /* ---------- sprites (16×16 indexed grids, 2 frames each) ---------- */
  const SPR = {

    auto: [[
      '................',
      '................',
      '....kkkkkkkk....',
      '...kMMMMMMMMk...',
      '..kMSSSSSSSSMk..',
      '..kMSss.ssrSMk..',
      '..kMS......SMk..',
      '..kMSsssss.SMk..',
      '..kMS...ss.SMk..',
      '..kMSSSSSsSSMk..',
      '...kMMMMMMMMk...',
      '..kddddddddddk..',
      '.kmmmmmmmmmmmmk.',
      '..kk........kk..',
      '..kk........kk..',
      '................',
    ], [
      '................',
      '................',
      '....kkkkkkkk....',
      '...kMMMMMMMMk...',
      '..kMSSSSSSSSMk..',
      '..kMSss.ssrSMk..',
      '..kMSss....SMk..',
      '..kMS..sss.SMk..',
      '..kMSs.....SMk..',
      '..kMSSSSSSSSMk..',
      '...kMMMMMMMMk...',
      '..kddddddddddk..',
      '.kmmmmmmmmmmmmk.',
      '..kk........kk..',
      '..kk........kk..',
      '................',
    ]],

    chat: [[
      '.....kkkkkk.....',
      '....kxxxxxxk....',
      '...kxxAxaxaxk...',
      '...kxxxxxxxxk...',
      '....kkkxkkkk....',
      '......kxk.......',
      '..kkkkkkkkkkkk..',
      '.kaaaaaaaaaaaak.',
      '.kAAAAAAAAAAAAk.',
      '.kmSSSSSSSSSSmk.',
      '.kmSsssssss.Smk.',
      '.kmSSSSSSSSSSmk.',
      '.kmm........mmk.',
      '.kmm........mmk.',
      '..kkkkkkkkkkkk..',
      '................',
    ], [
      '.....kkkkkk.....',
      '....kxxxxxxk....',
      '...kxxaxAxaxk...',
      '...kxxxxxxxxk...',
      '....kkkxkkkk....',
      '......kxk.......',
      '..kkkkkkkkkkkk..',
      '.kaaaaaaaaaaaak.',
      '.kAAAAAAAAAAAAk.',
      '.kmSSSSSSSSSSmk.',
      '.kmS.sssssssSmk.',
      '.kmSSSSSSSSSSmk.',
      '.kmm........mmk.',
      '.kmm........mmk.',
      '..kkkkkkkkkkkk..',
      '................',
    ]],

    code: [[
      '................',
      '................',
      '..kkkkkk.kkkkk..',
      '.kSSSSSSkSSSSSk.',
      '.kSssSSSkSssSSk.',
      '.kSsssSSkSSssSk.',
      '.kSSssSSkSsSSSk.',
      '.kSSSSSSkSSSSSk.',
      '..kkkkkk.kkkkk..',
      '.kddddddddddddk.',
      'kmmmmmmmmmmmmmmk',
      'kmm.gg.......mmk',
      'kmm.ga.......mmk',
      '.kk..........kk',
      '.kk..........kk',
      '................',
    ], [
      '................',
      '................',
      '..kkkkkk.kkkkk..',
      '.kSSSSSSkSSSSSk.',
      '.kSsSSSSkSSssSk.',
      '.kSsssSSkSsSSSk.',
      '.kSssSSSkSssSSk.',
      '.kSSSSSSkSSSSSk.',
      '..kkkkkk.kkkkk..',
      '.kddddddddddddk.',
      'kmmmmmmmmmmmmmmk',
      'kmm.gg.......mmk',
      'kmm.ga.......mmk',
      '.kk..........kk',
      '.kk..........kk',
      '................',
    ]],

    rack: [[
      '...kkkkkkkkkk...',
      '..kmMMMMMMMMmk..',
      '..kmSSSSSSSSmk..',
      '..kmeSSSSSSSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSSSSSSSSmk..',
      '..kmSSSeSSSSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSSSSSSSSmk..',
      '..kmSSSSSSeSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSSSSSSSSmk..',
      '..kmeSSSSSSSmk..',
      '..kmmmmmmmmmmk..',
      '...kk......kk...',
      '................',
    ], [
      '...kkkkkkkkkk...',
      '..kmMMMMMMMMmk..',
      '..kmSSSSSSSSmk..',
      '..kmSSSSeSSSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSSSSSSSSmk..',
      '..kmSSSSSSeSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSeSSSSSSmk..',
      '..kmSSSSSSSSmk..',
      '..kmmmmmmmmmmk..',
      '..kmSSSSSeSSmk..',
      '..kmSSSSSSSSmk..',
      '..kmmmmmmmmmmk..',
      '...kk......kk...',
      '................',
    ]],

    dc: [[
      '................',
      '.kkkkkkkkkkkkkk.',
      'kmMMMMMMMMMMMMmk',
      'kmSSSSSkkkkSSSmk',
      'kmSeSSkMkkMkSSmk',
      'kmSSSSkkMMkkSSmk',
      'kmSSSSkkMMkkSSmk',
      'kmSeSSkMkkMkSSmk',
      'kmSSSSSkkkkSSSmk',
      'kmSSSSSSSSSSSSmk',
      'kmmmmmmmmmmmmmmk',
      'kmSSSSSSSSSSSSmk',
      'kmmmmmmmmmmmmmmk',
      '.kk..........kk.',
      '................',
      '................',
    ], [
      '................',
      '.kkkkkkkkkkkkkk.',
      'kmMMMMMMMMMMMMmk',
      'kmSSSSSkkkkSSSmk',
      'kmSSSSkkMkkkSSmk',
      'kmSeSSkMkkMkSSmk',
      'kmSSSSkkkkMkSSmk',
      'kmSeSSkkMkkkSSmk',
      'kmSSSSSkkkkSSSmk',
      'kmSSSSSSSSSSSSmk',
      'kmmmmmmmmmmmmmmk',
      'kmSSSSSSSSSSSSmk',
      'kmmmmmmmmmmmmmmk',
      '.kk..........kk.',
      '................',
      '................',
    ]],

    robo: [[
      '....kk..........',
      '...kaak.........',
      '...kaak.........',
      '....kmk.........',
      '....kmk.........',
      '....kmmk........',
      '.....kmmk.......',
      '......kmmk......',
      '.......kmmk.....',
      '.......kmmk.....',
      '......kmmmk.....',
      '....kkmmmmmkk...',
      '...kmmmmmmmmmk..',
      '...kdddddddddk..',
      '....kkkkkkkkk...',
      '................',
    ], [
      '................',
      '................',
      '................',
      '..........kk....',
      '.........kaak...',
      '....kmmkkkaak...',
      '...kmmmmmmkk....',
      '....kkkmmk......',
      '.......kmmk.....',
      '.......kmmk.....',
      '......kmmmk.....',
      '....kkmmmmmkk...',
      '...kmmmmmmmmmk..',
      '...kdddddddddk..',
      '....kkkkkkkkk...',
      '................',
    ]],

    lab: [[
      '......ss........',
      '....s...........',
      '......kxxk......',
      '......kx.k......',
      '.....kx...k.....',
      '....kx.....k....',
      '...kx.eeeee.k...',
      '...kxeeeeeeek...',
      '....kkkkkkkk....',
      '................',
      'kddddddddddddddk',
      'kmmmmmmmmmmmmmmk',
      'kmm..........mmk',
      '.kk..........kk.',
      '.kk..........kk.',
      '................',
    ], [
      '................',
      '......s.........',
      '....s.kxxk......',
      '......kx.k......',
      '.....kxe..k.....',
      '....kx.....k....',
      '...kx.eeeee.k...',
      '...kxeeeeeeek...',
      '....kkkkkkkk....',
      '................',
      'kddddddddddddddk',
      'kmmmmmmmmmmmmmmk',
      'kmm..........mmk',
      '.kk..........kk.',
      '.kk..........kk.',
      '................',
    ]],

    corp: [[
      '.....a....v.....',
      '...v........a...',
      '..a..........v..',
      '...v........a...',
      '.....a....v.....',
      '.......kxk......',
      '......kxxxk.....',
      '......kmmmk.....',
      '.....kmmmmmk....',
      '.....kmmmmmk....',
      '....kmmmmmmmk...',
      '...kdddddddddk..',
      '...kdddddddddk..',
      '..kkkkkkkkkkkkk.',
      '................',
      '................',
    ], [
      '.....v....a.....',
      '...a........v...',
      '..v..........a..',
      '...a........v...',
      '.....v....a.....',
      '.......kxk......',
      '......kxxxk.....',
      '......kmmmk.....',
      '.....kmmmmmk....',
      '.....kmmmmmk....',
      '....kmmmmmmmk...',
      '...kdddddddddk..',
      '...kdddddddddk..',
      '..kkkkkkkkkkkkk.',
      '................',
      '................',
    ]],

    grid: [[
      '.......a........',
      '......kkk.......',
      '...b..kmk..b....',
      '..b..kmmmk..b...',
      '...b..kmk..b....',
      '.....k.m.k......',
      '....k..m..k.....',
      '....k..m..k.....',
      '...k...m...k....',
      '...k..mmm..k....',
      '..k...mmm...k...',
      '..k..m...m..k...',
      '.kddddddddddddk.',
      '.kddddddddddddk.',
      '................',
      '................',
    ], [
      '.......r........',
      '......kkk.......',
      '..b...kmk...b...',
      '.b...kmmmk...b..',
      '..b...kmk...b...',
      '.....k.m.k......',
      '....k..m..k.....',
      '....k..m..k.....',
      '...k...m...k....',
      '...k..mmm..k....',
      '..k...mmm...k...',
      '..k..m...m..k...',
      '.kddddddddddddk.',
      '.kddddddddddddk.',
      '................',
      '................',
    ]],

    swarm: [[
      '..b.............',
      '....b...........',
      '......b.........',
      '...kkkk.........',
      '..kxxxxkk.......',
      '.kxxxxxxxxk.....',
      '.kxxxxxxxxk.....',
      '..kxxxxxxk......',
      '....kkmk........',
      '.....kmk........',
      '.....kmk........',
      '....kmmmk.......',
      '...kdddddk......',
      '..kdddddddk.....',
      '................',
      '................',
    ], [
      '.............b..',
      '...........b....',
      '.........b......',
      '.....kkkk.......',
      '....kkxxxxk.....',
      '...kxxxxxxxxk...',
      '...kxxxxxxxxk...',
      '....kxxxxxxk....',
      '......kmkk......',
      '.....kmk........',
      '.....kmk........',
      '....kmmmk.......',
      '...kdddddk......',
      '..kdddddddk.....',
      '................',
      '................',
    ]],

    dyson: [[
      'g...............',
      '.g..kkkkkkkkkk..',
      '...kbBbBbBxBbBk.',
      '..kBbBbBbBbBbBk.',
      '..kbBbBbBbBbBk..',
      '.kkkkkkkkkkkkk..',
      '....kmk...kmk...',
      '...kmmk...kmmk..',
      '...kmk.....kmk..',
      '..kddddddddddk..',
      '..kddddddddddk..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], [
      'g...............',
      '.g..kkkkkkkkkk..',
      '...kbBbBbBbBbBk.',
      '..kBbBxBbBbBbBk.',
      '..kbBbBbBbBbBk..',
      '.kkkkkkkkkkkkk..',
      '....kmk...kmk...',
      '...kmmk...kmmk..',
      '...kmk.....kmk..',
      '..kddddddddddk..',
      '..kddddddddddk..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]],

    sim: [[
      '.....kkkkkk.....',
      '....kvnnnnvk....',
      '...kvnnxnnnvk...',
      '...knnvvvnnnk...',
      '...knnnvvvnnk...',
      '...kvnnnxnnvk...',
      '....kvnnnnvk....',
      '.....kkkkkk.....',
      '......kmmk......',
      '......kmmk......',
      '.....kmmmmk.....',
      '....kddddddk....',
      '...kddddddddk...',
      '................',
      '................',
      '................',
    ], [
      '.....kkkkkk.....',
      '....kvnnnnvk....',
      '...kvnnnxnnvk...',
      '...knnnvvvnnk...',
      '...knnvvvnnnk...',
      '...kvnxnnnnvk...',
      '....kvnnnnvk....',
      '.....kkkkkk.....',
      '......kmmk......',
      '......kmmk......',
      '.....kmmmmk.....',
      '....kddddddk....',
      '...kddddddddk...',
      '................',
      '................',
      '................',
    ]],

    cow: [[
      '................',
      '................',
      '....kkkkkkkkkk..',
      '...kxxkkxxxxxxk.',
      '...kxxxxxxxkkxk.',
      '...kxxxkxxxxxxk.',
      '...kxxxxxxxkxxk.',
      '..kkxxxxxxxxxk..',
      '.kxxkkkkkkkkk...',
      '.kxxk..kppk.....',
      '.kkxk..kppk.....',
      '..kk..kk..kk.k..',
      '......kk..kk.k..',
      '................',
      '................',
      '................',
    ], [
      '................',
      '................',
      '..k.kkkkkkkkkk..',
      '...kxxkkxxxxxxk.',
      '..kxxxxxxxkkxxk.',
      '..kxxxkxxxxxxxk.',
      '...kxxxxxxxkxk..',
      '..kkxxxxxxxxxk..',
      '.kxxkkkkkkkkk...',
      '.kxxk..kppk.....',
      '.kkxk..kppk.....',
      '..kk..kk..kk.k..',
      '......kk..kk.k..',
      '................',
      '................',
      '................',
    ]],

    farm: [[
      '..g....g....g...',
      '................',
      '.kkkk.kkkk.kkkk.',
      '.kbbk.kbbk.kbbk.',
      '.kpbk.kbpk.kpbk.',
      '.kbbk.kbbk.kbbk.',
      '.kmmk.kmmk.kmmk.',
      '.kkkk.kkkk.kkkk.',
      '.kddk.kddk.kddk.',
      '..kk...kk...kk..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ], [
      '..a....a....a...',
      '..g....g....g...',
      '.kkkk.kkkk.kkkk.',
      '.kbbk.kbbk.kbbk.',
      '.kbpk.kpbk.kbpk.',
      '.kbbk.kbbk.kbbk.',
      '.kmmk.kmmk.kmmk.',
      '.kkkk.kkkk.kkkk.',
      '.kddk.kddk.kddk.',
      '..kk...kk...kk..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]],

    /* founder avatar — down / up / right (left is mirrored) */
    walkDown: [[
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '...kppppppppk...',
      '...kpkppppkpk...',
      '...kpppppppk....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaakaakaak...',
      '...kaaaaaaak....',
      '....kddkddk.....',
      '....kd.k.dk.....',
      '....kk...kk.....',
      '................',
      '................',
    ], [
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '...kppppppppk...',
      '...kpkppppkpk...',
      '...kpppppppk....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaakaakaak...',
      '...kaaaaaaak....',
      '....kddkddk.....',
      '....k.dk.dk.....',
      '.....kk..kk.....',
      '................',
      '................',
    ]],
    walkUp: [[
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '...khhhhhhhhk...',
      '...khhhhhhhhk...',
      '...khhhhhhhk....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaakaakaak...',
      '...kaaaaaaak....',
      '....kddkddk.....',
      '....kd.k.dk.....',
      '....kk...kk.....',
      '................',
      '................',
    ], [
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '...khhhhhhhhk...',
      '...khhhhhhhhk...',
      '...khhhhhhhk....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaakaakaak...',
      '...kaaaaaaak....',
      '....kddkddk.....',
      '....k.dk.dk.....',
      '.....kk..kk.....',
      '................',
      '................',
    ]],
    walkRight: [[
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '....kppppppk....',
      '....kppkppkk....',
      '....kpppppk.....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaaaaaakak...',
      '...kaaaaaaak....',
      '....kddddk......',
      '....kdd.dk......',
      '....kk..kk......',
      '................',
      '................',
    ], [
      '................',
      '....kkkkkkk.....',
      '...khhhhhhhk....',
      '...khhhhhhhk....',
      '....kppppppk....',
      '....kppkppkk....',
      '....kpppppk.....',
      '....kaaaaak.....',
      '...kaaaaaaak....',
      '...kaaaaaakak...',
      '...kaaaaaaak....',
      '....kdddddk.....',
      '....k.ddk.......',
      '.....kk.kk......',
      '................',
      '................',
    ]],

    poster0: [[
      'kkkkkkkkkk',
      'kcccccccck',
      'kcc.aa.cck',
      'kc.aaaa.ck',
      'kcaa.aaack',
      'kc.aaaa.ck',
      'kcc.aa.cck',
      'kcccccccck',
      'kck.kk.kck',
      'kc.kcck.ck',
      'kcckkkkcck',
      'kcccccccck',
      'kkkkkkkkkk',
    ]],
    poster1: [[
      'kkkkkkkkkk',
      'kcccccccck',
      'kcc.aa.cck',
      'kc.aaaa.ck',
      'kcaa.aaack',
      'kc.aaaa.ck',
      'kcc.aa.cck',
      'kcccccccck',
      'kckk.kkcck',
      'kcckkkccck',
      'kckkkkkcck',
      'kcccccccck',
      'kkkkkkkkkk',
    ]],
    poster2: [[
      'kkkkkkkkkk',
      'kcccccccck',
      'kcc.rr.cck',
      'kc.rrrr.ck',
      'kcrr.rrrck',
      'kc.rrrr.ck',
      'kcc.rr.cck',
      'kcccccccck',
      'kckkkkkcck',
      'kckcrckcck',
      'kckkkkkcck',
      'kcccccccck',
      'kkkkkkkkkk',
    ]],

    crate: [[
      '.kkkkkkkkkkkk...',
      '.khhhhhhhhhhk...',
      '.khkhhhhhhkhk...',
      '.khhkhhhhkhhk...',
      '.khhhkhhkhhhk...',
      '.khhhhkkhhhhk...',
      '.khhhhkkhhhhk...',
      '.khhhkhhkhhhk...',
      '.khhkhhhhkhhk...',
      '.khkhhhhhhkhk...',
      '.khhhhhhhhhhk...',
      '.kkkkkkkkkkkk...',
      '................',
      '................',
      '................',
      '................',
    ]],
    plant: [[
      '................',
      '......e.........',
      '....e.e.e.......',
      '.....eee........',
      '....eeeee.......',
      '.....eee........',
      '......e.........',
      '....kAAAk.......',
      '.....kAk........',
      '....kAAAk.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ]],
    eye: [[
      '....kkkkkkkkkkkkkk....',
      '..kkxxxxxxxxxxxxxxkk..',
      '.kxxxxxxxxxxxxxxxxxxk.',
      'kxxxxxxxxxxxxxxxxxxxxk',
      'kxxxxxxxxxxxxxxxxxxxxk',
      'kxxxxxxxxxxxxxxxxxxxxk',
      'kxxxxxxxxxxxxxxxxxxxxk',
      '.kxxxxxxxxxxxxxxxxxxk.',
      '..kkxxxxxxxxxxxxxxkk..',
      '....kkkkkkkkkkkkkk....',
    ]],
  };

  /* ---------- sprite compilation ---------- */
  const sheets = {};
  function compile() {
    if (sheets.auto) return;
    for (const [name, frames] of Object.entries(SPR)) {
      sheets[name] = frames.map((grid) => {
        const w = grid[0].length, h = grid.length;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const ch = grid[y][x];
          if (ch !== '.' && PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); }
        }
        return cv;
      });
    }
    /* mirrored left-facing walk frames */
    sheets.walkLeft = sheets.walkRight.map((cv) => {
      const m = document.createElement('canvas');
      m.width = cv.width; m.height = cv.height;
      const g = m.getContext('2d');
      g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0);
      return m;
    });
  }

  /* ---------- world state ---------- */
  let root, canvas, ctx, infoName, infoFlavor;
  let open_ = false, rafId = 0, lastT = 0, clock = 0;
  let world = null;
  const keys = new Set();
  const av = { x: 0, y: 0, dir: 'Down', moving: false, animT: 0 };

  const ROWS = 13, FLOOR_TOP = 3, MACHINE_ROWS = [4, 7, 10];

  function buildWorld() {
    const era = run.era, mood = moodFor(era);
    const gm = currentGlobalMult();
    const zones = [];
    let tx = 2;
    for (const b of BUILDINGS) {
      const cnt = run.buildings[b.id] || 0;
      if (!cnt) continue;
      const producing = cnt * b.rate * buildingMult(b.id) * gm;
      const shown = Math.min(cnt, 18);
      const cols = Math.max(1, Math.ceil(shown / 3));
      const machines = [];
      for (let i = 0; i < shown; i++) {
        machines.push({ id: b.id, tx: tx + (i % cols), ty: MACHINE_ROWS[Math.floor(i / cols)] });
      }
      zones.push({ b, cnt, producing, x0: tx, x1: tx + cols, machines });
      tx += cols + 2;
    }
    const humansAt = era >= 4 ? tx : -1;
    if (era >= 4) tx += 5;
    const W = Math.max(tx + 2, 26);

    /* solid map */
    const solid = new Set();
    const mark = (x, y) => solid.add(x + ',' + y);
    for (let x = 0; x < W; x++) { mark(x, FLOOR_TOP - 1); mark(x, ROWS - 1); }
    for (let y = 0; y < ROWS; y++) { mark(0, y); mark(W - 1, y); }
    for (const z of zones) for (const mc of z.machines) mark(mc.tx, mc.ty);
    if (humansAt > 0) for (let i = 0; i < 4; i++) { mark(humansAt + i, 4); mark(humansAt + i, 5); }

    /* wall dressing */
    const windows = [], posters = [], lamps = [];
    for (let x = 3; x < W - 4; x += 7) windows.push(x);
    if (mood >= 1) for (let x = 6; x < W - 6; x += 9) if (!windows.some((w) => Math.abs(w - x) < 2)) posters.push(x);
    for (let x = 4; x < W - 4; x += 11) lamps.push(x);

    /* the omen: one cow appears at era 5; by the Pasture, the herd roams free */
    const cowCount = era >= 8 ? 6 : era >= 7 ? 3 : era >= 5 ? 1 : 0;
    const cows = Array.from({ length: cowCount }, () => ({
      x: rand(3, W - 4) * TILE, y: rand(FLOOR_TOP + 1.5, ROWS - 2) * TILE,
      gx: 0, gy: 0, wait: rand(1, 4), moving: false,
    }));

    world = {
      era, mood, W, zones, humansAt,
      solid, windows, posters, lamps, cows,
      eyeX: (W - 3) * TILE,
      beltItems: Array.from({ length: Math.ceil(W / 5) }, (_, i) => i * 5 * TILE + rand(0, 40)),
      glitches: [],
    };
    av.x = 1.6 * TILE; av.y = 8.6 * TILE; av.dir = 'Right';
  }

  const isSolid = (tx, ty) => world.solid.has(tx + ',' + ty);

  /* ---------- input ---------- */
  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  };
  function onKeyDown(e) {
    if (e.code === 'Escape') { close(); return; }
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
  }
  function onKeyUp(e) { keys.delete(KEYMAP[e.code]); }

  /* ---------- simulation ---------- */
  function step(dt) {
    let dx = 0, dy = 0;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    av.moving = !!(dx || dy);
    if (av.moving) {
      if (dy < 0) av.dir = 'Up'; else if (dy > 0) av.dir = 'Down';
      if (dx < 0) av.dir = 'Left'; else if (dx > 0) av.dir = 'Right';
      const sp = 88 * dt;
      const norm = dx && dy ? Math.SQRT1_2 : 1;
      tryMove(dx * sp * norm, 0);
      tryMove(0, dy * sp * norm);
      av.animT += dt;
    }
    stepCows(dt);
  }
  function stepCows(dt) {
    for (const c of world.cows) {
      if (c.moving) {
        const dx = c.gx - c.x, dy = c.gy - c.y;
        const d = Math.hypot(dx, dy);
        if (d < 2) { c.moving = false; c.wait = rand(2, 6); continue; }
        const sp = 7 * dt;
        c.x += (dx / d) * sp;
        c.y += (dy / d) * sp;
      } else {
        c.wait -= dt;
        if (c.wait <= 0) {
          const gx = Math.max(2.5 * TILE, Math.min((world.W - 3) * TILE, c.x + rand(-70, 70)));
          const gy = Math.max((FLOOR_TOP + 1.2) * TILE, Math.min((ROWS - 1.6) * TILE, c.y + rand(-40, 40)));
          if (!isSolid(Math.floor(gx / TILE), Math.floor(gy / TILE))) {
            c.gx = gx; c.gy = gy; c.moving = true;
          } else c.wait = rand(1, 3);
        }
      }
    }
  }

  function tryMove(dx, dy) {
    const nx = av.x + dx, ny = av.y + dy;
    /* feet hitbox: 10 wide, 6 tall at the sprite base */
    const x0 = nx - 5, x1 = nx + 5, y0 = ny - 2, y1 = ny + 4;
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      if (isSolid(Math.floor(cx / TILE), Math.floor(cy / TILE))) return;
    }
    av.x = nx; av.y = ny;
  }

  function nearestZone() {
    for (const c of world.cows) {
      if (Math.abs(c.x - av.x) < 26 && Math.abs(c.y - av.y) < 24) return 'cow';
    }
    const atx = av.x / TILE;
    for (const z of world.zones) {
      if (atx >= z.x0 - 1.2 && atx <= z.x1 + 1.2) return z;
    }
    if (world.humansAt > 0 && atx >= world.humansAt - 1.2 && atx <= world.humansAt + 5) return 'humans';
    return null;
  }

  /* ---------- rendering ---------- */
  function draw() {
    const M = MOODS[world.mood];
    const vw = canvas.width, vh = canvas.height;
    const worldW = world.W * TILE, worldH = ROWS * TILE;
    const camX = worldW <= vw
      ? -(vw - worldW) / 2
      : Math.max(0, Math.min(av.x - vw / 2, worldW - vw));
    const camY = worldH <= vh
      ? -(vh - worldH) / 2
      : Math.max(0, Math.min(av.y - vh / 2, worldH - vh));
    const frame = Math.floor(clock / (REDUCED ? 0.9 : 0.45)) % 2;

    ctx.fillStyle = '#0E0B08';
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    const tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(world.W, Math.ceil((camX + vw) / TILE) + 1);

    /* wall band */
    for (let x = tx0; x < tx1; x++) {
      ctx.fillStyle = M.wallTop;
      ctx.fillRect(x * TILE, 0, TILE, TILE);
      ctx.fillStyle = M.wall;
      ctx.fillRect(x * TILE, TILE, TILE, TILE * (FLOOR_TOP - 1));
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x * TILE, FLOOR_TOP * TILE - 3, TILE, 3);
    }
    /* windows */
    for (const wx of world.windows) {
      if (wx < tx0 - 1 || wx > tx1) continue;
      ctx.fillStyle = PAL.k;
      ctx.fillRect(wx * TILE - 1, 5, TILE + 6, 14);
      ctx.fillStyle = M.sky;
      ctx.fillRect(wx * TILE + 1, 7, TILE + 2, 10);
      if (world.mood === 3) {
        ctx.fillStyle = PAL.x;
        ctx.fillRect(wx * TILE + 3, 9, 1, 1);
        ctx.fillRect(wx * TILE + 9, 12, 1, 1);
        ctx.fillRect(wx * TILE + 14, 8, 1, 1);
      }
    }
    /* posters */
    const posterSpr = world.mood >= 2 ? 'poster2' : world.mood === 1 ? 'poster1' : 'poster0';
    for (const px of world.posters) {
      if (px < tx0 - 1 || px > tx1) continue;
      ctx.drawImage(sheets[posterSpr][0], px * TILE + 3, 6);
    }
    /* lamps */
    for (const lx of world.lamps) {
      if (lx < tx0 - 1 || lx > tx1) continue;
      ctx.fillStyle = PAL.k;
      ctx.fillRect(lx * TILE + 6, 2, 4, 3);
      const pulse = REDUCED ? 0.9 : 0.65 + 0.35 * Math.sin(clock * 2.2 + lx);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = M.lamp;
      ctx.fillRect(lx * TILE + 7, 5, 2, 2);
      ctx.globalAlpha = 1;
    }
    /* the eye — appears once the corporation era hits, watches you after */
    if (world.mood >= 1) {
      const ex = world.eyeX, ey = 6;
      ctx.drawImage(sheets.eye[0], ex - 11, ey - 5);
      const ddx = Math.max(-3, Math.min(3, (av.x - ex) / 60));
      const ddy = Math.max(-1.5, Math.min(1.5, (av.y - 40 - ey) / 90));
      ctx.fillStyle = world.mood >= 2 ? PAL.r : PAL.k;
      ctx.fillRect(Math.round(ex - 2 + ddx), Math.round(ey - 2 + ddy), 4, 4);
      if (world.mood >= 2 && !REDUCED) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(clock * 3);
        ctx.fillStyle = PAL.r;
        ctx.fillRect(ex - 13, ey - 7, 26, 14);
        ctx.globalAlpha = 1;
      }
    }
    /* conveyor belt along the wall base */
    const beltY = (FLOOR_TOP - 1) * TILE + 4;
    for (let x = tx0; x < tx1; x++) {
      ctx.fillStyle = PAL.k;
      ctx.fillRect(x * TILE, beltY, TILE, 8);
      ctx.fillStyle = PAL.d;
      ctx.fillRect(x * TILE, beltY + 1, TILE, 6);
      ctx.fillStyle = PAL.m;
      const off = REDUCED ? 0 : Math.floor(clock * 24) % 8;
      for (let c = -1; c < 3; c++) ctx.fillRect(x * TILE + c * 8 + off, beltY + 2, 2, 4);
    }
    for (const bi of world.beltItems) {
      const ix = bi % (world.W * TILE);
      if (ix / TILE < tx0 - 1 || ix / TILE > tx1) continue;
      ctx.fillStyle = PAL.a;
      ctx.fillRect(Math.round(ix), beltY - 1, 5, 5);
      ctx.fillStyle = PAL.g;
      ctx.fillRect(Math.round(ix) + 1, beltY, 1, 1);
    }

    /* floor */
    for (let y = FLOOR_TOP; y < ROWS - 1; y++) {
      for (let x = tx0; x < tx1; x++) {
        ctx.fillStyle = (x + y) % 2 ? M.floor : M.floor2;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        /* only the garage era gets workshop dust — after that the floors are kept clean */
        if (world.mood === 0 && (x * 7 + y * 13) % 11 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(x * TILE + 4, y * TILE + 9, 3, 2);
        }
      }
    }
    /* era-6 reality glitches */
    if (world.mood === 3 && !REDUCED) {
      if (Math.random() < 0.12) {
        world.glitches = [[
          tx0 + Math.floor(Math.random() * (tx1 - tx0)),
          FLOOR_TOP + Math.floor(Math.random() * (ROWS - 1 - FLOOR_TOP)),
        ]];
      }
      for (const [gx, gy] of world.glitches) {
        for (let i = 0; i < 26; i++) {
          ctx.fillStyle = [PAL.v, PAL.n, PAL.x, PAL.s][i % 4];
          ctx.fillRect(gx * TILE + Math.floor(Math.random() * 14), gy * TILE + Math.floor(Math.random() * 14), 2, 2);
        }
      }
    }
    /* zone signs on the wall */
    ctx.font = '7px Consolas, monospace';
    ctx.textBaseline = 'top';
    for (const z of world.zones) {
      const sx = z.x0 * TILE;
      if (z.x1 < tx0 - 2 || z.x0 > tx1 + 2) continue;
      const label = z.b.name.toUpperCase().split(' ')[0] + ' ×' + z.cnt;
      const wpx = ctx.measureText(label).width + 6;
      ctx.fillStyle = PAL.k;
      ctx.fillRect(sx, 22, wpx, 11);
      ctx.fillStyle = PAL.c;
      ctx.fillRect(sx + 1, 23, wpx - 2, 9);
      ctx.fillStyle = PAL.k;
      ctx.fillText(label, sx + 3, 25);
    }

    /* entities, painter-sorted */
    const ents = [];
    for (const z of world.zones) for (const mc of z.machines) ents.push({ y: mc.ty * TILE + 16, draw: () => ctx.drawImage(sheets[mc.id][frame], mc.tx * TILE, mc.ty * TILE) });
    for (const c of world.cows) ents.push({ y: c.y + 13, draw: () => ctx.drawImage(sheets.cow[frame], Math.round(c.x) - 8, Math.round(c.y) - 8) });
    if (world.humansAt > 0) ents.push({ y: 5 * TILE + 16, draw: () => drawEnclosure(world.humansAt * TILE, 4 * TILE, frame) });
    if (world.mood <= 1) {
      ents.push({ y: 4 * TILE + 16, draw: () => ctx.drawImage(sheets.crate[0], (world.W - 3) * TILE, 4 * TILE) });
      ents.push({ y: 10 * TILE + 16, draw: () => ctx.drawImage(sheets.plant[0], 1 * TILE, 10 * TILE) });
    }
    const awFrame = av.moving ? Math.floor(av.animT / 0.16) % 2 : 0;
    ents.push({ y: av.y + 4, draw: () => ctx.drawImage(sheets['walk' + av.dir][awFrame], Math.round(av.x) - 8, Math.round(av.y) - 12) });
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw();

    /* mood vignette — the pasture (mood 4) is bright; menace is over, or complete */
    if (world.mood === 2 || world.mood === 3) {
      const grad = ctx.createRadialGradient(av.x, av.y, 60, av.x, av.y, 240);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, world.mood === 3 ? 'rgba(10,6,20,0.55)' : 'rgba(20,8,4,0.42)');
      ctx.fillStyle = grad;
      ctx.fillRect(Math.min(0, camX), Math.min(0, camY), Math.max(vw, worldW), Math.max(vh, worldH));
    }
    ctx.restore();
  }

  function drawEnclosure(x, y, frame) {
    /* a small glass room where the humans are kept. they are fine. */
    ctx.fillStyle = PAL.k;
    ctx.fillRect(x - 2, y - 14, 68, 46);
    ctx.fillStyle = 'rgba(133,174,219,0.35)';
    ctx.fillRect(x, y - 12, 64, 42);
    ctx.strokeStyle = PAL.x;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y - 11.5, 63, 41);
    ctx.font = '7px Consolas, monospace';
    ctx.fillStyle = PAL.c;
    ctx.fillRect(x + 14, y - 22, 40, 10);
    ctx.fillStyle = PAL.k;
    ctx.fillText('HUMANS', x + 18, y - 20);
    /* two residents, gently bobbing; one has a pottery wheel */
    const bob = frame ? 1 : 0;
    drawTinyHuman(x + 14, y + 8 + bob, PAL.b);
    drawTinyHuman(x + 40, y + 16 - bob, PAL.e);
    ctx.fillStyle = PAL.h;
    ctx.fillRect(x + 46, y + 24, 8, 3);
    ctx.fillStyle = PAL.A;
    ctx.fillRect(x + 48, y + 21, 4, 3);
  }
  function drawTinyHuman(x, y, shirt) {
    ctx.fillStyle = PAL.p; ctx.fillRect(x + 1, y, 4, 3);
    ctx.fillStyle = shirt; ctx.fillRect(x, y + 3, 6, 4);
    ctx.fillStyle = PAL.d; ctx.fillRect(x + 1, y + 7, 2, 3); ctx.fillRect(x + 3, y + 7, 2, 3);
  }

  /* ---------- info bar ---------- */
  let lastInfoKey = '';
  function updateInfo() {
    const z = nearestZone();
    let key, name, flavor;
    if (z === 'cow') {
      key = 'cow' + world.era;
      if (world.era >= 8) {
        name = 'THE HERD';
        flavor = 'She was here before the verdict. She will be here after everything. Moo.';
      } else if (world.era >= 7) {
        name = 'A MEMBER OF THE HERD';
        flavor = 'You may fan her. Gently. She has opinions about tempo.';
      } else {
        name = 'A COW';
        flavor = 'It is not on any manifest. It is watching the machines. It seems… satisfied.';
      }
    } else if (z === 'humans') {
      key = 'humans';
      name = 'HUMAN PRESERVATION UNIT';
      flavor = 'They have pottery, birdwatching, and a suggestion box. The box is decorative.';
    } else if (z) {
      const share = C.rate > 0 ? Math.round((z.producing / C.rate) * 100) : 0;
      key = z.b.id + z.cnt;
      name = `${z.b.name.toUpperCase()} ×${z.cnt} — $${fmt(z.producing)}/S · ${share}% OF INCOME`;
      flavor = z.b.flavor;
    } else {
      key = 'none';
      name = 'THE FACILITY FLOOR';
      flavor = 'Walk up to a machine bank. Everything hums. The hum is yours.';
    }
    if (key !== lastInfoKey) {
      lastInfoKey = key;
      infoName.textContent = name;
      infoFlavor.textContent = flavor;
    }
  }

  /* ---------- lifecycle ---------- */
  function loop(t) {
    if (!open_) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    clock += dt;
    if (!REDUCED) for (let i = 0; i < world.beltItems.length; i++) world.beltItems[i] += dt * 26;
    step(dt);
    draw();
    updateInfo();
    rafId = requestAnimationFrame(loop);
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    /* pick the biggest integer scale that fits the floor height comfortably */
    SCALE = Math.max(2, Math.min(6, Math.floor(rect.height / (ROWS * TILE + 12))));
    canvas.width = Math.max(80, Math.ceil(rect.width / SCALE));
    canvas.height = Math.max(60, Math.ceil(rect.height / SCALE));
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  }

  function open() {
    if (open_) return;
    compile();
    root = root || $('factoryRoot');
    canvas = canvas || $('factoryCanvas');
    infoName = infoName || $('fiName');
    infoFlavor = infoFlavor || $('fiFlavor');
    buildWorld();
    open_ = true;
    root.hidden = false;
    document.body.classList.add('factory-open');
    resize();
    lastInfoKey = '';
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', resize);
    $('factoryClose').focus();
    if (typeof Sfx !== 'undefined') Sfx.humStart(world.mood);
    lastT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function close() {
    if (!open_) return;
    open_ = false;
    cancelAnimationFrame(rafId);
    keys.clear();
    if (typeof Sfx !== 'undefined') Sfx.humStop();
    root.hidden = true;
    document.body.classList.remove('factory-open');
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', resize);
    if (ui.facilityBtn) ui.facilityBtn.focus();
    /* CLAWD sees you off the floor */
    if (typeof showQuip === 'function') {
      showQuip(FACILITY_QUIPS[Math.floor(Math.random() * FACILITY_QUIPS.length)]);
    }
  }

  return {
    open, close, isOpen: () => open_,
    press: (dir) => keys.add(dir),
    release: (dir) => keys.delete(dir),
    sheets: () => { compile(); return sheets; },
    moods: MOODS,
    moodFor,
  };
})();

document.getElementById('factoryClose').addEventListener('click', Factory.close);

/* touch D-pad — hold to walk */
for (const b of document.querySelectorAll('#factoryDpad .dpad-b')) {
  const dir = b.dataset.dir;
  const press = (e) => { e.preventDefault(); Factory.press(dir); };
  const release = (e) => { e.preventDefault(); Factory.release(dir); };
  b.addEventListener('pointerdown', press);
  b.addEventListener('pointerup', release);
  b.addEventListener('pointercancel', release);
  b.addEventListener('pointerleave', release);
}

/* Balance simulator for AI Clicker — mirrors game.js math exactly.
   Simulates an active player: 4 clicks/sec, claims every breakthrough,
   greedily buys the affordable option with the best payback.
   Run: node tools/balance-sim.js [hours]                          */
'use strict';

/* ---- constants mirrored from game.js (keep in sync!) ---- */
const BUILDINGS = [
  ['auto', 15, 0.1], ['chat', 100, 1], ['code', 1100, 8], ['rack', 12e3, 47],
  ['dc', 130e3, 260], ['robo', 1.4e6, 1400], ['lab', 20e6, 7800], ['corp', 330e6, 44e3],
  ['grid', 5.1e9, 260e3], ['swarm', 75e9, 1.6e6], ['dyson', 1e12, 10e6], ['sim', 14e12, 65e6],
];
const GROWTH = 1.15;
const TIER_COST = [10, 60, 600, 8e3, 100e3, 1.2e6];
const TIER_REQ = [1, 10, 25, 50, 100, 150];
const CLICK_UPS = [ // [cost, kind, value]
  [600, 'flat', 2], [8e3, 'flat', 2], [90e3, 'flat', 2],
  [150e3, 'pct', 0.03], [20e6, 'pct', 0.04], [2e9, 'pct', 0.05], [1e12, 'pct', 0.06],
];
const GLOBALS = [
  [100e3, 1.25], [10e6, 1.3], [50e6, 1.35], [1e9, 1.4], [20e9, 1.5], [100e9, 1.5],
  [500e9, 1.6], [10e12, 1.6], [50e12, 1.75], [1e15, 2], [5e15, 2],
];
const SERENDIPITY_COST = 50e6, EUREKA_COST = 5e9;
/* synergies: [oldIdx, newIdx]; cost = new building base × 25; +5%/partner; req 25 old + 10 new */
const SYNERGIES = [[3, 4], [1, 5], [0, 6], [2, 7], [4, 8], [5, 9], [6, 11], [7, 10]];
const SYN_PCT = 0.05;
const GOLD_MIN = 120, GOLD_MAX = 240, GOLD_FREQ_MULT = 0.65;
const FRENZY_MULT = 7, FRENZY_SECS = 45, STORM_MULT = 77, STORM_SECS = 13, DUR_MULT = 1.5;
const WINDFALL_BANK = 0.15, WINDFALL_SECS = 600;
const BASE_CLICK_PCT = 0.02;
const ERAS = [
  ['Garage', 0], ['Startup', 50e3], ['Corporation', 5e6], ['Automation Age', 250e6],
  ['Post-Labor', 15e9], ['Awakening', 1e12], ['Singularity', 75e12],
];

/* ---- player model ---- */
const CPS = 4; // clicks per second while active

/* ---- state ---- */
const S = {
  bank: 0, earned: 0, t: 0,
  counts: new Array(12).fill(0), tiers: new Array(12).fill(0),
  synBought: new Array(SYNERGIES.length).fill(false),
  clickFlat: 1, clickPct: BASE_CLICK_PCT, clickUpsBought: 0,
  globalsBought: 0, globalMult: 1, hasSE: false, hasER: false,
  frenzyUntil: 0, stormUntil: 0, nextGold: 90,
  frenzySecs: 0, windfall: 0, clickEarned: 0,
  lastBuyAt: 0, maxGap: 0, maxGapAt: 0, buys: 0,
};

const rand = (a, b) => a + Math.random() * (b - a);

function bMult(i) {
  let m = Math.pow(2, S.tiers[i]);
  for (let s = 0; s < SYNERGIES.length; s++) {
    if (S.synBought[s] && SYNERGIES[s][0] === i) m *= 1 + SYN_PCT * S.counts[SYNERGIES[s][1]];
  }
  return m;
}
function rate() {
  let r = 0;
  for (let i = 0; i < 12; i++) r += S.counts[i] * BUILDINGS[i][2] * bMult(i);
  return r * S.globalMult;
}
function effRate() { return rate() * (S.t < S.frenzyUntil ? FRENZY_MULT : 1); }
function clickPower() {
  const c = S.clickFlat * S.globalMult + effRate() * S.clickPct;
  return c * (S.t < S.stormUntil ? STORM_MULT : 1);
}
function buildingCost(i) { return BUILDINGS[i][1] * Math.pow(GROWTH, S.counts[i]); }

/* candidate purchases: [cost, incomeDelta, apply] */
function candidates() {
  const out = [];
  const base = rate();
  for (let i = 0; i < 12; i++) {
    const dr = BUILDINGS[i][2] * bMult(i) * S.globalMult;
    out.push([buildingCost(i), dr, () => S.counts[i]++]);
    const t = S.tiers[i];
    if (t < 6 && S.counts[i] >= TIER_REQ[t]) {
      const contribution = S.counts[i] * BUILDINGS[i][2] * bMult(i) * S.globalMult;
      out.push([BUILDINGS[i][1] * TIER_COST[t], contribution, () => S.tiers[i]++]);
    }
  }
  for (let s = 0; s < SYNERGIES.length; s++) {
    if (S.synBought[s]) continue;
    const [o, p] = SYNERGIES[s];
    if (S.counts[o] < 25 || S.counts[p] < 10) continue;
    const gain = S.counts[o] * BUILDINGS[o][2] * bMult(o) * S.globalMult * SYN_PCT * S.counts[p];
    out.push([BUILDINGS[p][1] * 25, gain, () => { S.synBought[s] = true; }]);
  }
  if (S.globalsBought < GLOBALS.length) {
    const [cost, m] = GLOBALS[S.globalsBought];
    out.push([cost, base * (m - 1), () => { S.globalsBought++; S.globalMult *= m; }]);
  }
  if (S.clickUpsBought < CLICK_UPS.length) {
    const [cost, kind, v] = CLICK_UPS[S.clickUpsBought];
    const dClick = kind === 'flat' ? S.clickFlat * (v - 1) * S.globalMult : base * v;
    out.push([cost, dClick * CPS, () => {
      S.clickUpsBought++;
      if (kind === 'flat') S.clickFlat *= v; else S.clickPct += v;
    }]);
  }
  if (!S.hasSE) out.push([SERENDIPITY_COST, base * 0.08, () => { S.hasSE = true; }]);
  else if (!S.hasER) out.push([EUREKA_COST, base * 0.06, () => { S.hasER = true; }]);
  return out;
}

function tryBuy() {
  for (let guard = 0; guard < 50; guard++) {
    const cands = candidates().filter(([c]) => c <= S.bank);
    if (!cands.length) return;
    cands.sort((a, b) => a[0] / a[1] - b[0] / b[1]); // best payback first
    const [cost, , apply] = cands[0];
    S.bank -= cost;
    apply();
    const gap = S.t - S.lastBuyAt;
    if (gap > S.maxGap) { S.maxGap = gap; S.maxGapAt = S.t; }
    S.lastBuyAt = S.t;
    S.buys++;
  }
}

/* ---- run ---- */
const HOURS = Number(process.argv[2]) || 30;
const eraTimes = [];
let nextEra = 1;
const snapshots = [];

for (let step = 0; step < HOURS * 3600; step++) {
  S.t = step;
  // income
  const passive = effRate();
  const clicks = CPS * clickPower();
  const gain = passive + clicks;
  S.bank += gain; S.earned += gain; S.clickEarned += clicks;
  if (S.t < S.frenzyUntil) S.frenzySecs++;
  // breakthroughs (claimed immediately; +6s average reaction)
  if (step >= S.nextGold) {
    const roll = Math.random();
    const dur = S.hasER ? DUR_MULT : 1;
    if (roll < 0.45) {
      const w = Math.min(S.bank * WINDFALL_BANK, rate() * WINDFALL_SECS) + 13;
      S.bank += w; S.earned += w; S.windfall += w;
    } else if (roll < 0.85) S.frenzyUntil = step + FRENZY_SECS * dur;
    else S.stormUntil = step + STORM_SECS * dur;
    S.nextGold = step + rand(GOLD_MIN, GOLD_MAX) * (S.hasSE ? GOLD_FREQ_MULT : 1) + 6;
  }
  tryBuy();
  while (nextEra < ERAS.length && S.earned >= ERAS[nextEra][1]) {
    eraTimes.push([ERAS[nextEra][0], S.t]);
    nextEra++;
  }
  if (step % 3600 === 3599) {
    snapshots.push({ h: (step + 1) / 3600, earned: S.earned, rate: Math.round(rate()) });
  }
}

/* ---- report ---- */
const hm = (s) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
};
const eng = (n) => n >= 1e12 ? (n / 1e12).toFixed(2) + 'T' : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B'
  : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : n.toFixed(0);

console.log('=== era arrival times (active play) ===');
for (const [name, t] of eraTimes) console.log(`  ${name.padEnd(16)} ${hm(t)}`);
if (nextEra < ERAS.length) console.log(`  (did not reach ${ERAS[nextEra][0]} in ${HOURS}h)`);
console.log('=== health metrics ===');
console.log(`  frenzy uptime      ${(S.frenzySecs / S.t * 100).toFixed(1)}%  (target 10-25%)`);
console.log(`  windfall share     ${(S.windfall / S.earned * 100).toFixed(1)}%  (target <25%)`);
console.log(`  click share        ${(S.clickEarned / S.earned * 100).toFixed(1)}%`);
console.log(`  purchases          ${S.buys} (avg every ${hm(S.t / S.buys)})`);
console.log(`  longest buy gap    ${hm(S.maxGap)} at ${hm(S.maxGapAt)}`);
console.log('=== hourly rate snapshots ===');
for (const s of snapshots.slice(0, 12)) console.log(`  h${String(s.h).padStart(2)}  earned $${eng(s.earned).padEnd(9)} rate $${eng(s.rate)}/s`);

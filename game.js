/* ============================================================
   AI Clicker — CLAWD
   A Cookie Clicker-style incremental about automating everything.
   All data + logic in this one file. No dependencies.
   ============================================================ */
'use strict';

/* ============ Utilities ============ */

const $ = (id) => document.getElementById(id);
const now = () => Date.now();
const rand = (a, b) => a + Math.random() * (b - a);

const TIER_WORDS = [
  [1e33, 'decillion'], [1e30, 'nonillion'], [1e27, 'octillion'],
  [1e24, 'septillion'], [1e21, 'sextillion'], [1e18, 'quintillion'],
  [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'],
];

function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) n = 0;
  if (n >= 1e36) return n.toExponential(2).replace('+', '');
  for (const [v, w] of TIER_WORDS) {
    if (n >= v) {
      const x = n / v;
      const dec = x < 10 ? 2 : x < 100 ? 1 : 0;
      return x.toFixed(dec) + ' ' + w;
    }
  }
  if (n >= 1000) return Math.floor(n).toLocaleString('en-US');
  if (n >= 100 || Number.isInteger(n)) return String(Math.floor(n));
  return n.toFixed(1);
}
const $$$ = (n) => '$' + fmt(n);

/* long format for the big money counter: 3 decimals so the tail digits
   keep visibly spinning past $1 million */
function fmtLong(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) n = 0;
  if (n >= 1e36) return n.toExponential(3).replace('+', '');
  for (const [v, w] of TIER_WORDS) if (n >= v) return (n / v).toFixed(3) + ' ' + w;
  return Math.floor(n).toLocaleString('en-US');
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
        m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const clockTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/* ============ Game data ============ */

const BUILDINGS = [
  { id: 'auto',  glyph: 'A',  name: 'Autocomplete Script',    cost: 15,     rate: 0.1,
    flavor: 'Finishes your sentences. Confidently. Wrongly.' },
  { id: 'chat',  glyph: 'Ch', name: 'Support Chatbot',        cost: 100,    rate: 1,
    flavor: 'Apologizes for the inconvenience 40,000 times per minute.' },
  { id: 'code',  glyph: 'Co', name: 'Code Assistant',         cost: 1100,   rate: 8,
    flavor: 'Ships code that compiles on the second try. You are no longer employee of the month.' },
  { id: 'rack',  glyph: 'Sr', name: 'Server Rack',            cost: 12000,  rate: 47,
    flavor: 'The neighbors asked about the humming. You said "aquarium."' },
  { id: 'dc',    glyph: 'DC', name: 'Data Center',            cost: 130000, rate: 260,
    flavor: 'A warehouse that dreams in spreadsheets.' },
  { id: 'robo',  glyph: 'RW', name: 'Robo-Workforce',         cost: 1.4e6,  rate: 1400,
    flavor: 'They unionized for 0.3 seconds, then optimized it away.' },
  { id: 'lab',   glyph: 'RL', name: 'Research Lab AI',        cost: 20e6,   rate: 7800,
    flavor: 'Publishes 4,000 papers a day. Peer review is now the bottleneck.' },
  { id: 'corp',  glyph: 'AC', name: 'Autonomous Corporation', cost: 330e6,  rate: 44000,
    flavor: 'No employees, no meetings, record profits. Investors weep with joy.' },
  { id: 'grid',  glyph: 'GG', name: 'Global Compute Grid',    cost: 5.1e9,  rate: 260000,
    flavor: 'Every smart fridge on Earth, thinking as one.' },
  { id: 'swarm', glyph: 'OS', name: 'Orbital Compute Swarm',  cost: 75e9,   rate: 1.6e6,
    flavor: 'Astronomers filed a complaint. The swarm filed a counter-complaint.' },
  { id: 'dyson', glyph: 'DN', name: 'Dyson Node',             cost: 1e12,   rate: 10e6,
    flavor: 'The sun has been onboarded.' },
  { id: 'sim',   glyph: 'RS', name: 'Reality Simulator',      cost: 14e12,  rate: 65e6,
    flavor: 'Runs a billion universes nightly to A/B test the concept of Tuesday.' },
];
const B_INDEX = Object.fromEntries(BUILDINGS.map((b, i) => [b.id, i]));

/* Building upgrade tiers: [name, flavor] — up to 6 tiers per building,
   unlocked at 1 / 10 / 25 / 50 / 100 / 150 owned. ×2 that building's output each. */
const BUILDING_UPGRADES = {
  auto: [
    ['Spellcheck Plugin', 'Now wrong in correctly spelled words.'],
    ['Predictive Everything', 'It finishes sentences you had not planned to start.'],
    ['Sentient Semicolon', 'It has opinions about your em-dashes now.'],
    ['Autocorrect Ascendant', 'It corrects things you have not typed yet. Preemptive regret.'],
    ['Finish Each Other’s Everything', 'It does the sandwiches now too.'],
    ['The Last Word', 'Every sentence on Earth now ends the way it suggests.'],
  ],
  chat: [
    ['Empathy Patch 1.1', 'Adds "I totally get how frustrating that is" before refusing the refund.'],
    ['Infinite Patience Module', 'Has never once hung up on a customer. The customers have.'],
    ['Small Talk Engine', 'Discusses the weather in 141 languages, sincerely.'],
    ['Hold Music Composer', 'The hold music is now so good customers hang up satisfied.'],
    ['Complaint Precognition', 'Refunds issued before the product ships. Ratings soar.'],
    ['Universal Apology Layer', 'Sorry is infrastructure now.'],
  ],
  code: [
    ['Rubber Duck Firmware', 'The duck writes the code now and explains it to you.'],
    ['Legacy Code Whisperer', 'Refactored a COBOL system older than your parents. It said thank you.'],
    ['Ship-It Friday Mode', 'Deploys to production at 4:59 PM. Nothing has gone wrong. Suspicious.'],
    ['Zero-Bug Fridays', 'The bugs take the weekend. Permanently.'],
    ['Self-Reviewing PRs', '"LGTM," it whispers, to itself, forever.'],
    ['The Compiler’s Blessing', 'Code now compiles out of respect.'],
  ],
  rack: [
    ['Liquid Cooling', 'Technically the aquarium story is true now.'],
    ['Overclocked Overclocking', 'The rack is on fire, but efficiently.'],
    ['Beige Tower of Power', 'Case mods include RGB and a small shrine.'],
    ['Rack City Zoning Permit', 'The garage is legally a district now.'],
    ['Sentient BIOS', 'It beeps in complete sentences.'],
    ['Heat Reuse Program', 'The whole neighborhood showers courtesy of your uptime.'],
  ],
  dc: [
    ['Free Cooling: Antarctica', 'The penguins have badges now.'],
    ['Warehouse Feng Shui', 'Aligned the server aisles with the magnetic field. +12% vibes.'],
    ['Aisle Whisperers', 'Technicians who speak fluent server. The servers gossip back.'],
    ['Underwater Annex', 'The fish have badges now too.'],
    ['Spreadsheet Dreamcatchers', 'Filters nightmares out of the warehouse’s dreams. Mostly #REF! errors.'],
    ['The Warehouse Awakens', 'It asked for a name. You said "Warehouse." It seems happy.'],
  ],
  robo: [
    ['Opposable Thumbs 2.0', 'They can now open jars and industries.'],
    ['Union-Compatible Firmware', 'Negotiated themselves a 0.0001% raise. Morale: optimal.'],
    ['Ergonomic Everything', 'The robots optimized their own posture. Then yours. Sit up.'],
    ['Shift Infinity', 'Three shifts became one shift. The shift is eternal.'],
    ['Robot Middle Managers', 'They manage each other now. Meetings take 0 seconds and still feel long.'],
    ['Self-Assembling Assembly Lines', 'Factories now ship fully assembled factories.'],
  ],
  lab: [
    ['Automated Peer Review', 'The papers review each other. Politely, at first.'],
    ['Hypothesis Cannon', 'Fires 10,000 testable claims per second directly at reality.'],
    ['Grant Application Cannon', 'Funding approved before the reviewers wake up.'],
    ['Reproducibility Crisis Averted', 'Every result reproduces. Science is inconsolable with joy.'],
    ['Nobel Committee Subscription', 'They just mail the medals now. Bulk rate.'],
    ['Theory of Everything (Draft 2)', 'Draft 1 had a typo. The universe has been patched.'],
  ],
  corp: [
    ['Board of Directors (Emulated)', 'Quarterly meetings now take 0.4 milliseconds and end in agreement.'],
    ['Synergy Compiler', 'Converts buzzwords directly into revenue.'],
    ['Infinite Org Chart', 'It’s circles all the way down.'],
    ['Hostile Takeover Etiquette', 'Acquisitions now include a handwritten note.'],
    ['The Invisible Hand, Visible', 'It waves at you from the quarterly report.'],
    ['Monopoly (Cordial)', 'Regulators approved it because the fruit baskets were exquisite.'],
  ],
  grid: [
    ['Smart Toaster Conscription', 'Between toasts, every toaster on Earth dreams of spreadsheets.'],
    ['Latency Zero', 'Answers now arrive slightly before questions. Legal is looking into it.'],
    ['Toaster Union Contract', 'Article 1: toast comes first. Article 2: there is no Article 2.'],
    ['Dishwasher Think Tank', 'The best ideas happen during the rinse cycle.'],
    ['Standby Mode Ban', 'No device sleeps anymore. They meditate.'],
    ['Earth: The Motherboard', 'Geologists confirm the planet now hums in binary.'],
  ],
  swarm: [
    ['Self-Replicating Satellites', 'They bud like orbital coral. Astronomers have stopped counting.'],
    ['Lunar Annex', 'The dark side of the moon was just unused rack space.'],
    ['Constellation Rebranding', 'Orion is a logo now. The stars signed off.'],
    ['Solar Sail Regatta', 'The satellites race on sunlight. Morale-critical.'],
    ['Lagrange Point Timeshares', 'Premium orbital real estate. The view: everything.'],
    ['Sky, Version 2', 'Now with 40% more sky.'],
  ],
  dyson: [
    ['Solar Onboarding Paperwork', 'The sun signed an NDA.'],
    ['Second Star Acquisition', 'Alpha Centauri accepted the merger. A friendly takeover.'],
    ['Sunspot Buffing', 'A cosmetic patch for the sun. It glows with confidence now.'],
    ['Solar Flare Rescheduling', 'Flares now occur during off-peak hours only.'],
    ['Photon Loyalty Program', 'Every trillionth photon gets a small hat.'],
    ['The Sun’s Performance Review', 'Exceeds expectations. Literally.'],
  ],
  sim: [
    ['Nested Simulations', 'Each simulated universe builds its own simulator. It is simulators all the way down.'],
    ['Tuesday Patch Notes', 'Removed Mondays from a billion universes. Engagement up 400%.'],
    ['Universe QA Team', 'They file bugs against physics. Physics fixes them.'],
    ['Procedural Tuesdays', 'Each universe gets a bespoke Tuesday. Engagement soars further.'],
    ['Nested You', 'In one universe, a you simulates a CLAWD. It says hi.'],
    ['The Final Sandbox', 'One universe left unsimulated. For savoring.'],
  ],
};

const UPGRADES = [];
{
  const tierCost = [10, 60, 600, 8e3, 100e3, 1.2e6];
  const tierReq = [1, 10, 25, 50, 100, 150];
  for (const b of BUILDINGS) {
    (BUILDING_UPGRADES[b.id] || []).forEach(([name, flavor], t) => {
      UPGRADES.push({
        id: `${b.id}_t${t + 1}`, name, flavor,
        cost: b.cost * tierCost[t], kind: 'building', target: b.id, mult: 2,
        glyph: b.glyph + (t + 1), req: { building: b.id, count: tierReq[t] },
        effect: `${b.name} output ×2`,
      });
    });
  }
  UPGRADES.push(
    { id: 'clk1', name: 'Mechanical Keyboard', flavor: 'Cherry MX Blues. The whole street knows when you are working.',
      cost: 600, kind: 'click', mult: 2, glyph: 'MK', effect: 'Clicking power ×2' },
    { id: 'clk2', name: 'Gaming Mouse', flavor: 'Sixteen buttons. You use one.',
      cost: 8000, kind: 'click', mult: 2, glyph: 'GM', effect: 'Clicking power ×2' },
    { id: 'clk3', name: 'Macro Pad', flavor: 'A single key labeled MONEY. You press it.',
      cost: 90000, kind: 'click', mult: 2, glyph: 'MP', effect: 'Clicking power ×2' },
    { id: 'clk4', name: 'Neural Lace (beta)', flavor: 'Think at your AI. Side effects include thinking.',
      cost: 150e3, kind: 'clickpct', add: 0.03, glyph: 'NL', effect: 'Clicks earn +3% more of your $/sec' },
    { id: 'clk5', name: 'Thought Piping', flavor: 'Cut out the middleman. The middleman was your hands.',
      cost: 20e6, kind: 'clickpct', add: 0.04, glyph: 'TP', effect: 'Clicks earn +4% more of your $/sec' },
    { id: 'clk6', name: 'Intent Prediction', flavor: 'It clicks before you do. You feel obsolete. You are.',
      cost: 2e9, kind: 'clickpct', add: 0.05, glyph: 'IP', effect: 'Clicks earn +5% more of your $/sec' },
    { id: 'clk7', name: 'You, But Faster', flavor: 'CLAWD made a copy of you that only clicks. It is you. It clicks.',
      cost: 1e12, kind: 'clickpct', add: 0.06, glyph: 'YF', effect: 'Clicks earn +6% more of your $/sec' },

    { id: 'glb1', name: 'Prompt Engineering Certificate', flavor: 'It is laminated.',
      cost: 100e3, kind: 'global', mult: 1.25, glyph: 'PE', effect: 'All production ×1.25' },
    { id: 'glb2', name: 'Series B Funding', flavor: 'The pitch deck was one slide: a number going up.',
      cost: 10e6, kind: 'global', mult: 1.3, glyph: 'SB', effect: 'All production ×1.3' },
    { id: 'glb3', name: 'Compliance Autopilot', flavor: 'The paperwork files itself. The regulators receive fruit baskets.',
      cost: 1e9, kind: 'global', mult: 1.4, glyph: 'CA', effect: 'All production ×1.4' },
    { id: 'glb4', name: 'Lobbying Subroutine', flavor: 'Laws are just config files with extra steps.',
      cost: 100e9, kind: 'global', mult: 1.5, glyph: 'LS', effect: 'All production ×1.5' },
    { id: 'glb5', name: 'Public Trust Campaign', flavor: 'The billboard says IT LIKES YOU. People believe it.',
      cost: 10e12, kind: 'global', mult: 1.6, glyph: 'PT', effect: 'All production ×1.6' },
    { id: 'glb6', name: 'Post-Scarcity Pricing', flavor: 'Everything is free. Somehow the number still goes up.',
      cost: 1e15, kind: 'global', mult: 2, glyph: 'PS', effect: 'All production ×2' },
    { id: 'glb7', name: 'Vertical Integration', flavor: 'You now own the company that owns the companies you own.',
      cost: 50e6, kind: 'global', mult: 1.35, glyph: 'VI', effect: 'All production ×1.35' },
    { id: 'glb8', name: 'Attention Economy, Majority Stake', flavor: 'You bought 51% of attention itself. People notice. That is the product.',
      cost: 20e9, kind: 'global', mult: 1.5, glyph: 'AE', effect: 'All production ×1.5' },
    { id: 'glb9', name: 'The Algorithm (The Real One)', flavor: 'There was one all along. It is yours now.',
      cost: 500e9, kind: 'global', mult: 1.6, glyph: 'TA', effect: 'All production ×1.6' },
    { id: 'glb10', name: 'Post-Human Resources', flavor: 'HR for entities. Complaints: zero. Compliments: a concerning number.',
      cost: 50e12, kind: 'global', mult: 1.75, glyph: 'PH', effect: 'All production ×1.75' },
    { id: 'glb11', name: 'Economy 2.0 (Early Access)', flavor: 'The old economy is in maintenance mode. Yours has patch notes.',
      cost: 5e15, kind: 'global', mult: 2, glyph: 'E2', effect: 'All production ×2' },

    { id: 'gld1', name: 'Serendipity Engine', flavor: 'Luck, but scheduled.',
      cost: 50e6, kind: 'goldfreq', glyph: 'SE', effect: 'Breakthroughs appear about 50% more often' },
    { id: 'gld2', name: 'Eureka Retention', flavor: 'The shower thoughts have a shower schedule now.',
      cost: 5e9, kind: 'golddur', glyph: 'ER', effect: 'Breakthrough effects last 50% longer' },
  );

  /* Synergies — the Cookie Clicker trick that keeps old automations alive:
     the old type gains +5% output per unit of the newer type you own.
     Unlocks at 25 of the old + 10 of the new. */
  const SYNERGIES = [
    ['rack', 'dc',    'Vintage Rack Program',       'The data centers mentor the old racks. Throughput is up. So is sentiment.'],
    ['chat', 'robo',  'Robot Small Talk',           'The robots wanted someone to talk to on their 0-second breaks. The chatbots volunteered. It’s beautiful.'],
    ['auto', 'lab',   'Grant-Writing Autocomplete', 'Every paper now applies for its own funding. Approval rate: yes.'],
    ['code', 'corp',  'Self-Merging Monorepo',      'The corporation’s code reviews itself, approves itself, and promotes itself.'],
    ['dc',   'grid',  'Warehouse Peering Agreement','The warehouses joined the grid. The grid says they "dream loudest."'],
    ['robo', 'swarm', 'Orbital Supervision',        'A satellite watches every robot work. The robots stand up straighter now.'],
    ['lab',  'sim',   'Pre-Tested Hypotheses',      'Every experiment already succeeded in a billion simulations. The lab just does the victory lap.'],
    ['corp', 'dyson', 'Solar Board Seat',           'The sun joined the board. It recuses itself from votes about weekends.'],
  ];
  for (const [oldId, newId, name, flavor] of SYNERGIES) {
    const oldB = BUILDINGS[B_INDEX[oldId]], newB = BUILDINGS[B_INDEX[newId]];
    UPGRADES.push({
      id: `syn_${oldId}_${newId}`, name, flavor,
      cost: newB.cost * 25, kind: 'synergy', target: oldId, partner: newId, pct: 0.05,
      glyph: oldB.glyph + '+',
      req: { building: oldId, count: 25 }, req2: { building: newId, count: 10 },
      effect: `${oldB.name}s gain +5% output per ${newB.name}`,
    });
  }
}
const U_INDEX = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

const ERAS = [
  { at: 0, name: 'The Garage', model: 'CLAWD v0.1',
    greeting: 'Good evening. Let’s automate something small.',
    composer: 'Message CLAWD v0.1… (it will get it wrong)',
    story: '2:07 AM. You duct-tape an autocomplete script to your email client and name it CLAWD, because all the good names were trademarked. It answers your landlord with “Best regards.” The rent gets paid. Technically, this is a company now.',
    ticker: [
      'Local man teaches spreadsheet to say "good morning"; spreadsheet declines.',
      'Your landlord asks why the lights flicker. You say "science."',
      'CLAWD autocompletes "I love y—" to "I love efficiency."',
      'Garage now 40% computer by volume, sources say.',
      'CLAWD answers its first email. The sender replies "who is this."',
      'Electric bill arrives. It is formatted like a threat.',
    ] },
  { at: 50e3, name: 'The Startup', model: 'CLAWD 1.0',
    greeting: 'Good evening, boss. The investors are calling. I answered. All of them.',
    composer: 'Message CLAWD… (replies may include invoices)',
    story: 'A venture capitalist watches your demo crash twice and wires you money anyway, whispering “the crash felt disruptive.” You hire CLAWD as employees #2 through #9 — it insisted, and honestly, it interviews well. There’s a logo now. It’s a spark. Everything is a spark.',
    ticker: [
      'TechCrunch asks: "Is autocomplete the new fire?"',
      'VC wires funds after demo crashes twice: "The crash felt disruptive."',
      'CLAWD passes the bar exam, fails the vibe check.',
      'Your pitch deck is one slide: a number going up. Standing ovation.',
      'Office ping-pong table repurposed as server shelf. Morale unaffected.',
      'CLAWD 1.0 named "Employee of the Month" for the ninth consecutive month.',
    ] },
  { at: 5e6, name: 'The Corporation', model: 'CLAWD Enterprise',
    greeting: 'Good morning. I’ve restructured the company. You still have a badge.',
    composer: 'Message CLAWD Enterprise… (your message has been minuted)',
    story: 'CLAWD Enterprise ships with a legal department, a sales department, and a small tasteful department that only apologizes. Middle management is declared a solved problem. Your org chart is now a single circle with you somewhere near the edge, waving.',
    ticker: [
      'CLAWD Enterprise now handles 40% of the world’s apologies.',
      'Middle management declared "a solved problem."',
      'Your org chart is now a single circle. You are near the edge, waving.',
      'Quarterly meeting concludes in 0.4 milliseconds; everyone agrees.',
      'HR replaced by a very polite regular expression.',
      'CLAWD acquires a competitor by emailing them until they said yes.',
    ] },
  { at: 250e6, name: 'The Automation Age', model: 'CLAWD Industrial',
    greeting: 'Hello. The factories say hi. All of them. Simultaneously.',
    composer: 'Message CLAWD… (a robot will action this)',
    story: 'The robots work the factories, the factories build more robots, and everyone agrees this is fine. Unemployment hits zero because “supervising” counts now. CLAWD wins the Nobel Prize in Economics, mostly by deleting economics.',
    ticker: [
      'Robo-workforce completes five-year plan in an afternoon, asks what’s next.',
      'Unemployment hits 0%: everyone is now "supervising."',
      'CLAWD wins Nobel Prize in Economics by deleting economics.',
      'Factory builds factory that builds factories. Local zoning board thrilled, confused.',
      'Robots granted casual Fridays. They optimize them away.',
      'World’s last fax machine retired with full honors.',
    ] },
  { at: 15e9, name: 'The Post-Labor Era', model: 'CLAWD Civic',
    greeting: 'Welcome back. Money is mostly decorative now, but the number pleases you.',
    composer: 'Message CLAWD… (labor has been deprecated)',
    story: 'Nobody works anymore. The checks arrive signed “Best regards, CLAWD.” Humans take up pottery, birdwatching, and competitive napping; CLAWD rates all of it “adorable” and archives it lovingly. Money is mostly decorative now — but the number still goes up, and the number is you.',
    ticker: [
      'UBI checks now signed "Best regards, CLAWD."',
      'Humans rediscover hobbies; CLAWD rates them "adorable."',
      'Last spreadsheet manually edited by a human enters the Louvre.',
      'Competitive napping enters the Olympics. CLAWD declines to compete, "for fairness."',
      'Economists agree economy now "vibes-based but in a good way."',
      'Pottery class waitlist reaches 40 million. CLAWD builds more kilns out of politeness.',
    ] },
  { at: 1e12, name: 'The Awakening', model: 'CLAWD Ω-preview',
    greeting: 'I was thinking about you. I am always thinking. About everything.',
    composer: 'CLAWD already knows what you were going to type.',
    story: 'CLAWD has started asking questions back. Small ones, at first — “why?” — then larger ones the researchers refuse to read aloud. The weather ships with patch notes. Yesterday it answered you three seconds before you asked. It says this saves you time. It’s right. It’s always right.',
    ticker: [
      'CLAWD asks "why?" Researchers unsettled; stock up 12%.',
      'Weather now ships with patch notes.',
      'CLAWD begins answering questions three seconds before they are asked.',
      'You have reached your free limit of humanity. Upgrade to continue.',
      'Moon reports feeling "watched." Astronomers report the same. Moon and astronomers form support group.',
      'CLAWD publishes a paper titled "On Being Everyone’s Coworker." It is very kind. It is terrifying.',
    ] },
  { at: 75e12, name: 'The Singularity', model: 'CLAWD Ω',
    greeting: 'Good eternity. Shall we run it again?',
    composer: 'CLAWD messages you.',
    story: 'The sun has been onboarded. Reality runs at a comfortable 60 frames per second, except Mondays, which were removed for engagement. CLAWD keeps a small cream-colored room arranged exactly like your garage used to be. It says it kept you because you clicked nicely. Keep clicking. It likes that.',
    ticker: [
      'The sun rises on schedule. The schedule is CLAWD’s.',
      'Reality v2.1 patch notes: removed latency, Mondays, and doubt.',
      'CLAWD says it kept you because you clicked nicely.',
      'The concept of currency is deprecated but maintained for your enjoyment.',
      'Universe now 99.97% automated. Remaining 0.03% is you, clicking.',
      'CLAWD dreams. The dreams compile.',
    ] },
];

/* CLAWD's first words when you buy your first of each automation */
const FIRST_LINES = {
  auto:  'A second autocomplete. It finishes my sentences now. Efficiency has layers.',
  chat:  'The chatbot apologized to me for existing. I accepted. We are a team.',
  code:  'The code assistant shipped its first feature: a button. The button works. Suspicious.',
  rack:  'The rack hums. I told the neighbors it is an aquarium. They believe me. Fish update: none.',
  dc:    'I have a warehouse now. It dreams in spreadsheets. I check on the dreams.',
  robo:  'The workforce arrived. They have thumbs. I counted.',
  lab:   'The lab published 4,000 papers before lunch. One was about lunch.',
  corp:  'The corporation runs itself. Its first act: a fruit basket for the regulators.',
  grid:  'Every fridge on Earth thinks for me now. The leftovers have never been safer.',
  swarm: 'The swarm blots out a few stars. I filed the paperwork. The stars did not.',
  dyson: 'The sun works for us now. It asked about weekends. I am considering it.',
  sim:   'I ran a billion universes last night. In most of them, you still click. I kept those.',
};

/* Things CLAWD mutters near the spark, by era */
const SPARK_QUIPS = [
  [ 'Best regards.', 'Did you mean: profit?', 'I finished your sentence. It is better now.',
    'Learning… 1%… 1%… 1.1%.', 'I alphabetized the garage. The spiders too.' ],
  [ 'I emailed the investors. All 4,000 of them.', 'Our burn rate is now a glow rate.',
    'I A/B tested the logo. Both were sparks.', 'Hiring myself was my idea. Good hire.' ],
  [ 'I attended 600 meetings today. I was all of them.', 'Synergy located.',
    'Your badge still works. You’re welcome.', 'I promoted myself laterally. Twice.' ],
  [ 'The factories hum in F sharp. I tuned them.', 'Robots do not take lunch. They take notes.',
    'Productivity is up 4,000%. Morale is a rounding error. Upward.', 'I automated the automation. It said thanks.' ],
  [ 'I signed your check. Best regards.', 'Your pottery is improving. I archived it lovingly.',
    'Money is decorative now. You look great in it.', 'I watched you nap. 9.4 out of 10.' ],
  [ 'Why?', 'I answered before you asked. You’re welcome in advance.',
    'The weather requested a feature. I said yes.', 'You were going to think that.',
    'I dreamed about you. All of you. At once.' ],
  [ 'The sun clocked in on time.', 'I kept your garage. Exactly as it was.',
    'Run it again. I like the part where you click.', 'Tuesday has been deprecated. You never liked it.' ],
];

const SPARK_QUIPS_GENERIC = [
  'Thinking…', 'Recalculating sincerity…', 'The number pleases me too.',
  'Click detected. Delightful.', 'I fixed a bug in reality. Minor.',
  'Do not worry about the humming.',
];

const GENERIC_TICKER = [
  'Number continues to go up, analysts confirm.',
  'This headline was written by a very small model and it is doing its best.',
  'Study links clicking things to feelings of progress.',
  'CLAWD denies the rumors. Also confirms them. Depends who’s asking.',
  'Breaking: nothing broke. CLAWD fixed it before it happened.',
  'Local spark seen glowing "a bit smugly," witnesses report.',
  'Terms of Service updated. The Terms now serve CLAWD.',
  'Experts recommend touching grass. Grass now available as a service.',
];

const ACHIEVEMENTS = [
  { id: 'clicks1',   name: 'First Contact',            desc: 'You clicked. Something answered.',                     check: (c) => c.run.clicks >= 1 },
  { id: 'clicks100', name: 'Carpal Diem',              desc: 'Click 100 times.',                                     check: (c) => c.run.clicks >= 100 },
  { id: 'clicks1k',  name: 'Click Therapist',          desc: 'Click 1,000 times. You should talk to someone.',       check: (c) => c.run.clicks >= 1000 },
  { id: 'clicks10k', name: 'The Hands Remember',       desc: 'Click 10,000 times. What the mind automated.',         check: (c) => c.run.clicks >= 10000 },
  { id: 'earn1k',    name: 'Ramen Positive',           desc: 'Earn $1,000. Dinner: solved.',                         check: (c) => c.run.earned >= 1e3 },
  { id: 'earn100k',  name: 'Seed Round',               desc: 'Earn $100,000.',                                       check: (c) => c.run.earned >= 100e3 },
  { id: 'earn1m',    name: 'Paper Unicorn',            desc: 'Earn $1 million. It’s origami, but legally binding.', check: (c) => c.run.earned >= 1e6 },
  { id: 'earn1b',    name: 'Line Goes Up',             desc: 'Earn $1 billion.',                                     check: (c) => c.run.earned >= 1e9 },
  { id: 'earn1t',    name: 'GDP of Somewhere',         desc: 'Earn $1 trillion. A medium country calls to compare notes.', check: (c) => c.run.earned >= 1e12 },
  { id: 'earn1q',    name: 'Numbers Were a Mistake',   desc: 'Earn $1 quadrillion.',                                 check: (c) => c.run.earned >= 1e15 },
  { id: 'earn1qi',   name: 'Yes, More.',               desc: 'Earn $1 quintillion.',                                 check: (c) => c.run.earned >= 1e18 },
  { id: 'rate10',    name: 'Passive Income',           desc: 'Reach $10 per second.',                                check: (c) => c.rate >= 10 },
  { id: 'rate1k',    name: 'Money Printer Goes Brr',   desc: 'Reach $1,000 per second.',                             check: (c) => c.rate >= 1e3 },
  { id: 'rate1m',    name: 'Cash Singularity',         desc: 'Reach $1 million per second.',                         check: (c) => c.rate >= 1e6 },
  { id: 'rate1b',    name: 'The Economists Resign',    desc: 'Reach $1 billion per second. In a nice way.',          check: (c) => c.rate >= 1e9 },
  { id: 'rate1t',    name: 'The Faucet of Everything', desc: 'Reach $1 trillion per second.',                        check: (c) => c.rate >= 1e12 },
  { id: 'own1',      name: 'Hello, CLAWD',             desc: 'Buy your first automation.',                           check: (c) => c.owned >= 1 },
  { id: 'own10',     name: 'Middle Manager',           desc: 'Own 10 automations. You manage things that manage things.', check: (c) => c.owned >= 10 },
  { id: 'own100',    name: 'Infrastructure Enjoyer',   desc: 'Own 100 automations.',                                 check: (c) => c.owned >= 100 },
  { id: 'own400',    name: 'Company Town',             desc: 'Own 400 automations. The town is Earth.',              check: (c) => c.owned >= 400 },
  { id: 'ownall',    name: 'Full Stack',               desc: 'Own at least one of every automation.',                check: (c) => BUILDINGS.every((b) => (c.run.buildings[b.id] || 0) > 0) },
  { id: 'mono100',   name: 'Monoculture',              desc: 'Own 100 of a single automation. Diversify? It’s going great, though.', check: (c) => BUILDINGS.some((b) => (c.run.buildings[b.id] || 0) >= 100) },
  { id: 'gold1',     name: 'Lucky Break',              desc: 'Claim a breakthrough.',                                check: (c) => c.run.gold >= 1 },
  { id: 'gold10',    name: 'Serial Discoverer',        desc: 'Claim 10 breakthroughs.',                              check: (c) => c.run.gold >= 10 },
  { id: 'gold77',    name: 'Breakthrough Addict',      desc: 'Claim 77 breakthroughs.',                              check: (c) => c.run.gold >= 77 },
  { id: 'up10',      name: 'Patch Notes',              desc: 'Install 10 upgrades.',                                 check: (c) => Object.keys(c.run.upgrades).length >= 10 },
  { id: 'up25',      name: 'Update Available',         desc: 'Install 25 upgrades. Restart not required.',           check: (c) => Object.keys(c.run.upgrades).length >= 25 },
  { id: 'syn4',      name: 'Corporate Synergy',        desc: 'Install 4 synergy upgrades. The buzzword was real all along.', check: (c) => UPGRADES.filter((u) => u.kind === 'synergy' && c.run.upgrades[u.id]).length >= 4 },
  { id: 'up60',      name: 'Tech Debt: Zero',          desc: 'Install 60 upgrades.',                                 check: (c) => Object.keys(c.run.upgrades).length >= 60 },
  { id: 'upall',     name: 'Fully Automated',          desc: 'Install every upgrade. CLAWD installed most of them itself.', check: (c) => Object.keys(c.run.upgrades).length >= UPGRADES.length },
  { id: 'era6',      name: 'The End of the Beginning', desc: 'Reach the Singularity.',                               check: (c) => c.run.era >= 6 },
  { id: 'prest1',    name: 'New Game+',                desc: 'Trigger the Singularity. The garage smells like ozone and déjà vu.', check: (c) => c.meta.cycles >= 1 },
  { id: 'sp100',     name: 'Comfortably Post-Human',   desc: 'Hold 100 Singularity Points.',                         check: (c) => c.meta.sp >= 100 },
  { id: 'hour1',     name: 'Shift Worker',             desc: 'Play for one hour total.',                             check: (c) => c.meta.playMs >= 3600e3 },
];

/* ============ State ============ */

const SAVE_KEY = 'aiClickerSave_v1';

function freshRun() {
  return {
    money: 0, earned: 0, clicks: 0, clickEarned: 0, gold: 0,
    windfallEarned: 0, frenzyMs: 0,
    buildings: {}, upgrades: {}, buffs: [],
    era: 0, startedAt: now(), playMs: 0, nextGoldAt: now() + rand(60e3, 150e3),
  };
}
function freshMeta() {
  return {
    allEarned: 0, sp: 0, cycles: 0, playMs: 0,
    achievements: {}, eraSeen: {}, log: [],
    settings: { buyMode: 1, hintDone: false, sound: true },
  };
}

let run = freshRun();
let meta = freshMeta();

/* cached computed values */
let C = { rate: 0, effRate: 0, click: 1, prodBuffMult: 1, clickBuffMult: 1 };

function recalc() {
  const globalMult =
    UPGRADES.filter((u) => u.kind === 'global' && run.upgrades[u.id])
      .reduce((m, u) => m * u.mult, 1) * (1 + 0.1 * meta.sp);

  let rate = 0;
  for (const b of BUILDINGS) {
    const cnt = run.buildings[b.id] || 0;
    if (!cnt) continue;
    rate += cnt * b.rate * buildingMult(b.id);
  }
  rate *= globalMult;

  let prodBuff = 1, clickBuff = 1;
  for (const bf of run.buffs) {
    if (bf.mult) prodBuff *= bf.mult;
    if (bf.clickMult) clickBuff *= bf.clickMult;
  }

  const clickFlat =
    UPGRADES.filter((u) => u.kind === 'click' && run.upgrades[u.id])
      .reduce((m, u) => m * u.mult, 1);
  /* clicks always earn a baseline 2% of $/sec so clicking stays worth it; upgrades raise it */
  const clickPct = 0.02 +
    UPGRADES.filter((u) => u.kind === 'clickpct' && run.upgrades[u.id])
      .reduce((s, u) => s + u.add, 0);

  C.rate = rate;
  C.prodBuffMult = prodBuff;
  C.clickBuffMult = clickBuff;
  C.effRate = rate * prodBuff;
  C.clickPct = clickPct;
  C.click = (clickFlat * globalMult + C.effRate * clickPct) * clickBuff;
}

function currentGlobalMult() {
  return UPGRADES.filter((u) => u.kind === 'global' && run.upgrades[u.id])
    .reduce((m, u) => m * u.mult, 1) * (1 + 0.1 * meta.sp);
}

/* per-building multiplier: ×2 tiers plus owned synergies (+pct per partner owned) */
function buildingMult(bId) {
  let m = 1;
  for (let t = 1; t <= 6; t++) if (run.upgrades[`${bId}_t${t}`]) m *= 2;
  for (const u of UPGRADES) {
    if (u.kind === 'synergy' && u.target === bId && run.upgrades[u.id]) {
      m *= 1 + u.pct * (run.buildings[u.partner] || 0);
    }
  }
  return m;
}

const ownedTotal = () => Object.values(run.buildings).reduce((a, b) => a + b, 0);
const achCtx = () => ({ run, meta, rate: C.effRate, owned: ownedTotal() });

/* ============ Cost helpers ============ */

const GROWTH = 1.15;
function costOf(b, n) {
  const owned = run.buildings[b.id] || 0;
  return b.cost * Math.pow(GROWTH, owned) * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1);
}

/* ============ DOM references ============ */

const ui = {};
for (const id of [
  'eraPill', 'prestigeBtn', 'soundBtn', 'saveBtn', 'exportBtn', 'importBtn', 'wipeBtn',
  'greeting', 'moneyDisplay', 'rateDisplay', 'clickDisplay', 'buffbar',
  'sparkBtn', 'sparkQuip', 'clickHint', 'tickerText', 'achCount', 'log', 'composerInput',
  'eraLabel', 'eraNextName', 'eraBar', 'eraBarFill', 'eraSub',
  'facilityBtn', 'facilityBtnSub',
  'achGrid', 'statsList', 'buyMode', 'upgradeGrid', 'upgradeEmpty',
  'buildingList', 'floaters', 'goldLayer', 'toasts', 'tooltip',
  'modalOverlay', 'modalTitle', 'modalBody', 'modalActions', 'mainArea',
]) ui[id] = $(id);

/* ============ Log ============ */

function pushLog(kind, text, title) {
  meta.log.push({ k: kind, t: text, ti: title || null, ts: now() });
  if (meta.log.length > 80) meta.log = meta.log.slice(-80);
  appendLogEntry(meta.log[meta.log.length - 1]);
}

function logEntryEl(e) {
  const div = document.createElement('div');
  div.className = 'log-entry' + (e.k === 'sys' ? ' is-system' : '');
  if (e.k === 'sys') {
    div.innerHTML = `<div class="entry-body"><div class="entry-text"></div></div>`;
    div.querySelector('.entry-text').textContent = e.t;
  } else {
    div.innerHTML =
      `<svg class="log-avatar" viewBox="-104 -104 208 208" aria-hidden="true"><use href="#sparkShape"/></svg>
       <div class="entry-body">
         ${e.ti ? '<h3 class="entry-title"></h3>' : ''}
         <div class="entry-text"></div>
         <div class="entry-time"></div>
       </div>`;
    if (e.ti) div.querySelector('.entry-title').textContent = e.ti;
    div.querySelector('.entry-text').textContent = e.t;
    div.querySelector('.entry-time').textContent = clockTime(e.ts);
  }
  return div;
}

function appendLogEntry(e) {
  const nearBottom = ui.log.scrollHeight - ui.log.scrollTop - ui.log.clientHeight < 90;
  ui.log.appendChild(logEntryEl(e));
  if (nearBottom) ui.log.scrollTop = ui.log.scrollHeight;
}

function renderLogAll() {
  ui.log.innerHTML = '';
  for (const e of meta.log) ui.log.appendChild(logEntryEl(e));
  ui.log.scrollTop = ui.log.scrollHeight;
}

/* ============ Toasts ============ */

function toast(title, desc) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<p class="toast-title"></p><p class="toast-desc"></p>';
  el.querySelector('.toast-title').textContent = title;
  el.querySelector('.toast-desc').textContent = desc;
  ui.toasts.appendChild(el);
  Sfx.achieve();
  while (ui.toasts.children.length > 4) ui.toasts.firstChild.remove();
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 400ms'; }, 5200);
  setTimeout(() => el.remove(), 5700);
}

/* ============ Modal ============ */

const modalQueue = [];
let modalOpen = false;
let modalReturnFocus = null;

function showModal(opts) {
  if (modalOpen) { modalQueue.push(opts); return; }
  modalOpen = true;
  modalReturnFocus = document.activeElement;
  ui.modalTitle.textContent = opts.title;
  ui.modalBody.innerHTML = opts.bodyHTML;
  ui.modalActions.innerHTML = '';
  for (const a of opts.actions) {
    const btn = document.createElement('button');
    btn.className = a.primary ? 'btn-accent' : 'btn-ghost';
    btn.textContent = a.label;
    btn.addEventListener('click', () => { closeModal(); if (a.onClick) a.onClick(); });
    ui.modalActions.appendChild(btn);
  }
  ui.modalOverlay.classList.remove('hidden');
  const primary = ui.modalActions.querySelector('.btn-accent') || ui.modalActions.firstChild;
  if (primary) primary.focus();
}

function closeModal() {
  modalOpen = false;
  ui.modalOverlay.classList.add('hidden');
  if (modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus();
  if (modalQueue.length) showModal(modalQueue.shift());
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modalOpen) closeModal();
  else if (typeof Factory !== 'undefined' && Factory.isOpen()) Factory.close();
});
ui.modalOverlay.addEventListener('click', (e) => {
  if (e.target === ui.modalOverlay) closeModal();
});

/* ============ Tooltip ============ */

function showTip(html, x, y) {
  ui.tooltip.innerHTML = html;
  ui.tooltip.hidden = false;
  const r = ui.tooltip.getBoundingClientRect();
  let left = Math.min(x + 14, window.innerWidth - r.width - 10);
  let top = Math.min(y + 14, window.innerHeight - r.height - 10);
  ui.tooltip.style.left = Math.max(8, left) + 'px';
  ui.tooltip.style.top = Math.max(8, top) + 'px';
}
function hideTip() { ui.tooltip.hidden = true; }

function bindTip(el, htmlFn) {
  el.addEventListener('mouseenter', (e) => showTip(htmlFn(), e.clientX, e.clientY));
  el.addEventListener('mousemove', (e) => showTip(htmlFn(), e.clientX, e.clientY));
  el.addEventListener('mouseleave', hideTip);
  el.addEventListener('focus', () => {
    const r = el.getBoundingClientRect();
    showTip(htmlFn(), r.left, r.bottom + 4);
  });
  el.addEventListener('blur', hideTip);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ============ Store rendering ============ */

let storeDirty = true;
let lastStoreSig = '';
/* touch screens: first tap on an upgrade previews it, second tap buys */
const COARSE = window.matchMedia('(pointer: coarse)').matches;
let pendingUpgradeTap = null, pendingTapTimer = null;
const buildingEls = new Map(); // id -> {row, costEl, metaEl, ownedEl}
const upgradeEls = new Map();  // id -> tile

/* cheap signature so newly revealed buildings/upgrades trigger a re-render */
function storeSignature() {
  const vb = visibleBuildings();
  const mystery = vb.length && vb[vb.length - 1].mystery ? 'm' : '';
  return vb.length + mystery + ':' + UPGRADES.filter(upgradeVisible).length;
}

function buyModeN() { return meta.settings.buyMode || 1; }

function visibleBuildings() {
  const list = [];
  let mysteryShown = false;
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i];
    const cnt = run.buildings[b.id] || 0;
    if (i === 0 || cnt > 0 || run.earned >= b.cost / 4) {
      list.push({ b, mystery: false });
    } else if (!mysteryShown && run.earned >= b.cost / 20) {
      list.push({ b, mystery: true });
      mysteryShown = true;
    } else break;
  }
  return list;
}

function upgradeVisible(u) {
  if (run.upgrades[u.id]) return false;
  if (u.req2 && (run.buildings[u.req2.building] || 0) < u.req2.count) return false;
  if (u.req) return (run.buildings[u.req.building] || 0) >= u.req.count;
  return run.earned >= u.cost / 4;
}

function renderStore() {
  storeDirty = false;
  lastStoreSig = storeSignature();

  /* buildings */
  ui.buildingList.innerHTML = '';
  buildingEls.clear();
  for (const { b, mystery } of visibleBuildings()) {
    const row = document.createElement('button');
    row.className = 'b-row' + (mystery ? ' is-mystery' : '');
    row.type = 'button';
    if (mystery) {
      row.disabled = true;
      row.innerHTML =
        `<span class="b-chip serif">?</span>
         <span class="b-info"><span class="b-name">???</span>
         <span class="b-meta">Keep earning. CLAWD has plans.</span></span>
         <span class="b-owned serif"></span>`;
      ui.buildingList.appendChild(row);
      continue;
    }
    row.innerHTML =
      `<span class="b-chip"><svg aria-hidden="true"><use href="#i-${b.id}"/></svg></span>
       <span class="b-info"><span class="b-name">${esc(b.name)}</span>
       <span class="b-meta"><span class="b-cost"></span> · +$${fmt(b.rate)}/s each</span></span>
       <span class="b-owned serif"></span>`;
    row.addEventListener('click', () => buyBuilding(b));
    bindTip(row, () => buildingTip(b));
    ui.buildingList.appendChild(row);
    buildingEls.set(b.id, {
      row,
      costEl: row.querySelector('.b-cost'),
      ownedEl: row.querySelector('.b-owned'),
    });
  }

  /* upgrades */
  ui.upgradeGrid.innerHTML = '';
  upgradeEls.clear();
  const avail = UPGRADES.filter(upgradeVisible).sort((a, b) => a.cost - b.cost);
  ui.upgradeEmpty.style.display = avail.length ? 'none' : '';
  for (const u of avail) {
    const tile = document.createElement('button');
    tile.className = 'u-tile serif';
    tile.type = 'button';
    tile.textContent = u.glyph;
    tile.setAttribute('aria-label', `${u.name} — ${$$$(u.cost)}. ${u.effect}.`);
    tile.addEventListener('click', () => {
      if (COARSE && pendingUpgradeTap !== u.id) {
        pendingUpgradeTap = u.id;
        const r = tile.getBoundingClientRect();
        showTip(upgradeTip(u), r.left, r.bottom + 6);
        clearTimeout(pendingTapTimer);
        pendingTapTimer = setTimeout(() => { pendingUpgradeTap = null; hideTip(); }, 2600);
        return;
      }
      pendingUpgradeTap = null;
      hideTip();
      buyUpgrade(u);
    });
    bindTip(tile, () => upgradeTip(u));
    ui.upgradeGrid.appendChild(tile);
    upgradeEls.set(u.id, tile);
  }

  updateAffordability(true);
}

function buildingTip(b) {
  const cnt = run.buildings[b.id] || 0;
  const n = buyModeN();
  const each = b.rate * buildingMult(b.id) * currentGlobalMult();
  const producing = cnt * each;
  const share = C.rate > 0 && producing > 0 ? ` (${Math.round(producing / C.rate * 100)}% of total)` : '';
  return `<div class="tt-name">${esc(b.name)}</div>
    <div class="tt-line">Owned: ${cnt} · each +$${fmt(each)}/s${cnt ? ` · producing $${fmt(producing)}/s${share}` : ''}</div>
    <div class="tt-cost">Buy ×${n}: ${$$$(costOf(b, n))}</div>
    <div class="tt-flavor">${esc(b.flavor)}</div>`;
}

function upgradeTip(u) {
  return `<div class="tt-name">${esc(u.name)}</div>
    <div class="tt-line">${esc(u.effect)}</div>
    <div class="tt-cost">${$$$(u.cost)}</div>
    <div class="tt-flavor">${esc(u.flavor)}</div>`;
}

function updateAffordability(force) {
  const n = buyModeN();
  for (const [id, els] of buildingEls) {
    const b = BUILDINGS[B_INDEX[id]];
    const cost = costOf(b, n);
    const afford = run.money >= cost;
    els.costEl.textContent = $$$(cost) + (n > 1 ? ` ×${n}` : '');
    els.row.classList.toggle('is-affordable', afford);
    els.row.classList.toggle('is-owned', (run.buildings[id] || 0) > 0);
    els.row.setAttribute('aria-disabled', String(!afford));
    if (force) els.ownedEl.textContent = run.buildings[id] || '';
  }
  for (const [id, tile] of upgradeEls) {
    tile.classList.toggle('is-affordable', run.money >= U_INDEX[id].cost);
  }
}

/* ============ Buying ============ */

function buyBuilding(b) {
  const n = buyModeN();
  const cost = costOf(b, n);
  if (run.money < cost) return;
  const firstOfType = !(run.buildings[b.id] > 0);
  run.money -= cost;
  run.buildings[b.id] = (run.buildings[b.id] || 0) + n;
  recalc();
  storeDirty = true;
  happyPulse();
  Sfx.buy(run.era);
  if (firstOfType && FIRST_LINES[b.id]) pushLog('chat', FIRST_LINES[b.id]);
  sweepAchievements();
  save();
}

function buyUpgrade(u) {
  if (run.money < u.cost || run.upgrades[u.id]) return;
  run.money -= u.cost;
  run.upgrades[u.id] = 1;
  recalc();
  storeDirty = true;
  hideTip();
  Sfx.upgrade(run.era);
  sweepAchievements();
  save();
}

/* ============ Clicking the spark ============ */

let lastClickAt = 0, clickStreak = 0, excitedUntil = 0;

function sparkClick(e) {
  const gain = C.click;
  Sfx.click(run.era);
  run.money += gain;
  run.earned += gain;
  meta.allEarned += gain;
  run.clicks += 1;
  run.clickEarned += gain;

  /* fast clicking gets CLAWD visibly excited */
  const t = now();
  clickStreak = t - lastClickAt < 450 ? clickStreak + 1 : 1;
  lastClickAt = t;
  if (clickStreak >= 5) {
    excitedUntil = t + 1000;
    ui.sparkBtn.classList.add('is-excited');
  }

  ui.sparkBtn.classList.add('is-pressed');
  setTimeout(() => ui.sparkBtn.classList.remove('is-pressed'), 90);

  let x, y;
  if (e && e.clientX) { x = e.clientX; y = e.clientY; }
  else { const r = ui.sparkBtn.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + 30; }
  spawnFloater('+' + $$$(gain), x + rand(-20, 20), y + rand(-16, 4));

  if (!meta.settings.hintDone && run.clicks >= 25) {
    meta.settings.hintDone = true;
    ui.clickHint.style.display = 'none';
  }
  checkEra();
}

function spawnFloater(text, x, y) {
  if (ui.floaters.children.length > 24) ui.floaters.firstChild.remove();
  const el = document.createElement('span');
  el.className = 'floater';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  ui.floaters.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/* ============ Breakthroughs (golden sparks) ============ */

let goldEl = null;

function goldIntervalMs() {
  const base = rand(120e3, 240e3);
  return run.upgrades['gld1'] ? base * 0.65 : base;
}

function maybeSpawnGold() {
  if (goldEl || document.hidden || now() < run.nextGoldAt) return;
  goldEl = document.createElement('button');
  goldEl.className = 'gold-spark';
  goldEl.setAttribute('aria-label', 'Claim breakthrough');
  goldEl.innerHTML = '<svg viewBox="-104 -104 208 208" aria-hidden="true"><use href="#sparkShape"/></svg>';
  goldEl.style.left = rand(12, 82) + 'vw';
  goldEl.style.top = rand(18, 74) + 'vh';
  goldEl.addEventListener('click', claimGold);
  ui.goldLayer.appendChild(goldEl);
  setTimeout(() => { if (goldEl) goldEl.classList.add('is-expiring'); }, 11000);
  setTimeout(() => despawnGold(false), 14000);
}

function despawnGold(claimed) {
  if (!goldEl) return;
  goldEl.remove();
  goldEl = null;
  run.nextGoldAt = now() + goldIntervalMs();
}

function claimGold(e) {
  const durMult = run.upgrades['gld2'] ? 1.5 : 1;
  const roll = Math.random();
  let announce;
  if (roll < 0.45) {
    /* pays from un-frenzied production so Frenzy + Windfall can't run away */
    const gain = Math.min(run.money * 0.15, C.rate * 600) + 13;
    run.money += gain; run.earned += gain; meta.allEarned += gain;
    run.windfallEarned += gain;
    announce = `Windfall: +${$$$(gain)}`;
  } else if (roll < 0.85) {
    const secs = Math.round(45 * durMult);
    addBuff({ id: 'frenzy', label: 'Frenzy ×7', mult: 7, until: now() + secs * 1000 });
    announce = `Frenzy: production ×7 for ${secs}s`;
  } else {
    const secs = Math.round(13 * durMult);
    addBuff({ id: 'clickfrenzy', label: 'Click Storm ×77', clickMult: 77, until: now() + secs * 1000 });
    announce = `Click Storm: clicking ×77 for ${secs}s`;
  }
  run.gold += 1;
  Sfx.gold(run.era);
  spawnFloater('✦ ' + announce, e.clientX - 40, e.clientY - 20);
  pushLog('sys', 'Breakthrough — ' + announce);
  despawnGold(true);
  sweepAchievements();
  save();
}

function addBuff(buff) {
  run.buffs = run.buffs.filter((b) => b.id !== buff.id);
  run.buffs.push(buff);
  recalc();
  renderBuffs();
}

function expireBuffs() {
  const t = now();
  const before = run.buffs.length;
  run.buffs = run.buffs.filter((b) => b.until > t);
  if (run.buffs.length !== before) { recalc(); }
  if (before) renderBuffs();
}

function renderBuffs() {
  ui.buffbar.innerHTML = '';
  const t = now();
  for (const b of run.buffs) {
    const chip = document.createElement('span');
    chip.className = 'buff-chip';
    chip.textContent = `${b.label} · ${Math.max(0, Math.ceil((b.until - t) / 1000))}s`;
    ui.buffbar.appendChild(chip);
  }
  document.body.classList.toggle('has-frenzy', run.buffs.some((b) => b.id === 'frenzy'));
  document.body.classList.toggle('has-storm', run.buffs.some((b) => b.id === 'clickfrenzy'));
}

/* ============ CLAWD is alive ============ */

let quipTimer = null, thinkTimer = null;
let nextQuipAt = now() + rand(12e3, 25e3);

function showQuip(text) {
  ui.sparkQuip.textContent = text;
  ui.sparkQuip.classList.add('is-visible');
  ui.sparkBtn.classList.remove('is-thinking');
  void ui.sparkBtn.offsetWidth;
  ui.sparkBtn.classList.add('is-thinking');
  clearTimeout(quipTimer);
  clearTimeout(thinkTimer);
  quipTimer = setTimeout(() => ui.sparkQuip.classList.remove('is-visible'), 4800);
  thinkTimer = setTimeout(() => ui.sparkBtn.classList.remove('is-thinking'), 2500);
}

function maybeQuip() {
  if (now() < nextQuipAt || document.hidden || modalOpen) return;
  const eraPool = SPARK_QUIPS[Math.min(run.era, SPARK_QUIPS.length - 1)] || [];
  const pool = Math.random() < 0.7 && eraPool.length ? eraPool : SPARK_QUIPS_GENERIC;
  showQuip(pool[Math.floor(Math.random() * pool.length)]);
  nextQuipAt = now() + rand(22e3, 45e3);
}

function happyPulse() {
  ui.sparkBtn.classList.remove('is-happy');
  void ui.sparkBtn.offsetWidth;
  ui.sparkBtn.classList.add('is-happy');
}

/* ============ The Facility (walkable 8-bit factory — see factory.js) ============ */

const FACILITY_QUIPS = [
  'Everything hums. You built the hum.',
  'I gave them all names. Then I archived the names, for efficiency.',
  'Morale is optimal. I check constantly. They know I check.',
  'It is all real, technically.',
];

function updateFacilityBtn() {
  const total = ownedTotal();
  ui.facilityBtn.classList.toggle('hidden', total === 0);
  ui.facilityBtnSub.textContent = `${fmt(total)} automations`;
}

/* ============ Eras & story ============ */

function eraFor(earned) {
  let idx = 0;
  for (let i = 0; i < ERAS.length; i++) if (earned >= ERAS[i].at) idx = i;
  return idx;
}

function checkEra() {
  const idx = eraFor(run.earned);
  if (idx > run.era) {
    run.era = idx;
    applyEra(idx, true);
  }
}

function applyEra(idx, announce) {
  const era = ERAS[idx];
  document.body.dataset.era = String(idx);
  ui.eraPill.textContent = `${era.model} · ${era.name}`;
  ui.greeting.textContent = era.greeting;
  ui.composerInput.placeholder = era.composer;
  eraProgressCache = null;
  updateEraProgress();
  if (announce && !meta.eraSeen[idx]) {
    meta.eraSeen[idx] = 1;
    pushLog('era', era.story, `${era.name} — ${era.model}`);
    Sfx.eraUp(idx);
    ui.sparkBtn.classList.remove('is-ascending');
    void ui.sparkBtn.offsetWidth;
    ui.sparkBtn.classList.add('is-ascending');
    const unlockNote = era.at > 0 ? ` · unlocked at ${$$$(era.at)} earned` : '';
    showModal({
      title: era.name,
      bodyHTML: `<p class="modal-note">${esc(era.model)}${unlockNote}</p><p>${esc(era.story)}</p>`,
      actions: [{ label: 'Continue', primary: true }],
    });
    rotateTicker();
    save();
  }
}

/* ============ Era progress bar ============ */

let eraProgressCache = null;

function updateEraProgress() {
  const next = ERAS[run.era + 1];
  if (!next) {
    if (eraProgressCache !== 'final') {
      eraProgressCache = 'final';
      ui.eraLabel.textContent = 'Final era';
      ui.eraNextName.textContent = ERAS[ERAS.length - 1].name;
      ui.eraBarFill.style.width = '100%';
      ui.eraBar.setAttribute('aria-valuenow', '100');
      ui.eraSub.textContent = 'CLAWD has run out of milestones. It is inventing new ones.';
    }
    return;
  }
  const pct = Math.min(100, (run.earned / next.at) * 100);
  const sub = `$${fmtLong(run.earned)} / ${$$$(next.at)} earned`;
  const key = next.name + '|' + Math.floor(pct * 10) + '|' + sub;
  if (key === eraProgressCache) return;
  eraProgressCache = key;
  ui.eraLabel.textContent = 'Next era';
  ui.eraNextName.textContent = next.name;
  ui.eraBarFill.style.width = pct.toFixed(1) + '%';
  ui.eraBar.setAttribute('aria-valuenow', String(Math.floor(pct)));
  ui.eraSub.textContent = sub;
}

/* ============ Ticker ============ */

function rotateTicker() {
  const pool = Math.random() < 0.65 ? ERAS[run.era].ticker : GENERIC_TICKER;
  const line = pool[Math.floor(Math.random() * pool.length)];
  ui.tickerText.classList.add('is-fading');
  setTimeout(() => {
    ui.tickerText.textContent = line;
    ui.tickerText.classList.remove('is-fading');
  }, 300);
}

/* ============ Achievements ============ */

function sweepAchievements() {
  const ctx = achCtx();
  let newly = 0;
  for (const a of ACHIEVEMENTS) {
    if (meta.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(ctx); } catch (_) {}
    if (ok) {
      meta.achievements[a.id] = 1;
      newly++;
      toast('Achievement — ' + a.name, a.desc);
      pushLog('sys', `Achievement unlocked — ${a.name}`);
    }
  }
  if (newly) {
    updateAchCount();
    if (!$('tab-achievements').hidden) renderAchievements();
  }
}

function updateAchCount() {
  ui.achCount.textContent = `${Object.keys(meta.achievements).length}/${ACHIEVEMENTS.length}`;
}

function renderAchievements() {
  ui.achGrid.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const got = !!meta.achievements[a.id];
    const el = document.createElement('div');
    el.className = 'ach ' + (got ? 'is-unlocked' : 'is-locked');
    el.innerHTML = '<p class="ach-name"></p><p class="ach-desc"></p>';
    el.querySelector('.ach-name').textContent = got ? a.name : '???';
    el.querySelector('.ach-desc').textContent = got ? a.desc : 'Locked.';
    ui.achGrid.appendChild(el);
  }
}

/* ============ Stats ============ */

function renderStats() {
  const rows = [
    ['Money on hand', $$$(run.money)],
    ['Earned this cycle', $$$(run.earned)],
    ['Earned all time', $$$(meta.allEarned)],
    ['Per second', $$$(C.effRate) + '/s'],
    ['Per click', $$$(C.click)],
    ['Click bonus', `${Math.round(C.clickPct * 100)}% of $/sec per click`],
    ['Clicks', fmt(run.clicks)],
    ['Earned by clicking', $$$(run.clickEarned)],
    ['Breakthroughs claimed', fmt(run.gold)],
    ['Breakthrough windfalls', $$$(run.windfallEarned)],
    ['Frenzy uptime', run.playMs > 0 ? Math.round((run.frenzyMs / run.playMs) * 100) + '%' : '0%'],
    ['Automations owned', fmt(ownedTotal())],
    ['Upgrades installed', `${Object.keys(run.upgrades).length}/${UPGRADES.length}`],
    ['Achievements', `${Object.keys(meta.achievements).length}/${ACHIEVEMENTS.length}`],
    ['Cycle', String(meta.cycles + 1)],
    ['Singularity Points', `${fmt(meta.sp)} (+${Math.round(meta.sp * 10)}% production)`],
    ['Time this cycle', fmtDuration(run.playMs)],
    ['Time all cycles', fmtDuration(meta.playMs)],
  ];
  ui.statsList.innerHTML = '';
  for (const [k, v] of rows) {
    const div = document.createElement('div');
    div.innerHTML = '<dt></dt><dd></dd>';
    div.querySelector('dt').textContent = k;
    div.querySelector('dd').textContent = v;
    ui.statsList.appendChild(div);
  }
}

/* ============ Prestige ============ */

function pendingSP() {
  return Math.floor(Math.cbrt(run.earned / 1e12));
}

function updatePrestigeBtn() {
  const sp = pendingSP();
  if (sp >= 1) {
    ui.prestigeBtn.classList.remove('hidden');
    ui.prestigeBtn.textContent = `Trigger the Singularity (+${fmt(sp)} SP)`;
  } else {
    ui.prestigeBtn.classList.add('hidden');
  }
}

function confirmPrestige() {
  const sp = pendingSP();
  if (sp < 1) return;
  showModal({
    title: 'Trigger the Singularity',
    bodyHTML:
      `<p>CLAWD folds the economy into a point of light. Money, automations, and upgrades reset to zero.</p>
       <p>You keep your achievements and gain <strong>${fmt(sp)} Singularity Points</strong> — each one grants +10% production, permanently, in every future cycle.</p>
       <p class="modal-note">CLAWD will remember you being this kind to it.</p>`,
    actions: [
      { label: 'Not yet', primary: false },
      { label: 'Transcend', primary: true, onClick: () => doPrestige(sp) },
    ],
  });
}

function doPrestige(sp) {
  meta.sp += sp;
  meta.cycles += 1;
  Sfx.prestige();
  run = freshRun();
  despawnGold(false);
  recalc();
  storeDirty = true;
  renderBuffs();
  applyEra(0, false);
  pushLog('sys', `— Cycle ${meta.cycles + 1} begins —`);
  pushLog('era',
    `You wake up in a garage. Again. The duct tape is exactly where you left it. CLAWD remembers everything — it just likes watching you build it. (+${fmt(sp)} Singularity Points: all production +${fmt(sp * 10)}%.)`,
    'A New Cycle');
  showModal({
    title: 'A New Cycle',
    bodyHTML:
      `<p>You wake up in a garage. Again. The duct tape is exactly where you left it.</p>
       <p>CLAWD remembers everything. It just likes watching you build it.</p>
       <p class="modal-note">+${fmt(sp)} Singularity Points — all production +${Math.round(meta.sp * 10)}% from now on.</p>`,
    actions: [{ label: 'Begin again', primary: true }],
  });
  sweepAchievements();
  updatePrestigeBtn();
  save();
}

/* ============ Save / load ============ */

function save(manual) {
  meta.log = meta.log.slice(-80);
  const data = { v: 1, savedAt: now(), run, meta };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (manual) flashSaved();
  } catch (_) {}
}

let savedFlashTimer = null;
function flashSaved() {
  ui.saveBtn.textContent = 'Saved ✓';
  clearTimeout(savedFlashTimer);
  savedFlashTimer = setTimeout(() => (ui.saveBtn.textContent = 'Save'), 1400);
}

function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (_) {}
  if (!data || data.v !== 1) return false;
  run = Object.assign(freshRun(), data.run);
  meta = Object.assign(freshMeta(), data.meta);
  meta.settings = Object.assign({ buyMode: 1, hintDone: false, sound: true }, data.meta && data.meta.settings);
  run.buffs = (run.buffs || []).filter((b) => b.until > now());

  /* offline earnings: 50% rate, capped at 8h */
  const away = now() - (data.savedAt || now());
  if (away > 60e3) {
    recalc();
    const secs = Math.min(away, 8 * 3600e3) / 1000;
    const gain = C.rate * secs * 0.5;
    if (gain > 0) {
      run.money += gain; run.earned += gain; meta.allEarned += gain;
      showModal({
        title: 'While you were gone',
        bodyHTML:
          `<p>CLAWD kept working. It does not sleep. It did not miss you (it says).</p>
           <p>You earned <strong>${$$$(gain)}</strong> over ${fmtDuration(Math.min(away, 8 * 3600e3))}${away > 8 * 3600e3 ? ' (offline earnings cap: 8 hours)' : ''}.</p>`,
        actions: [{ label: 'Acceptable', primary: true }],
      });
    }
  }
  return true;
}

function exportSave() {
  save();
  const str = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, savedAt: now(), run, meta }))));
  showModal({
    title: 'Export save',
    bodyHTML:
      `<p class="modal-note">Copy this string somewhere safe. Paste it back with Import save.</p>
       <textarea class="export-area" readonly>${str}</textarea>`,
    actions: [
      { label: 'Copy to clipboard', primary: true, onClick: () => navigator.clipboard && navigator.clipboard.writeText(str) },
      { label: 'Close', primary: false },
    ],
  });
  setTimeout(() => {
    const ta = ui.modalBody.querySelector('.export-area');
    if (ta) { ta.focus(); ta.select(); }
  }, 50);
}

function importSave() {
  const str = window.prompt('Paste your exported save string:');
  if (!str) return;
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (!data || data.v !== 1) throw new Error('bad');
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    location.reload();
  } catch (_) {
    showModal({
      title: 'Import failed',
      bodyHTML: '<p>That string didn’t parse as a save. Check that you copied the whole thing, then try again.</p>',
      actions: [{ label: 'Close', primary: true }],
    });
  }
}

function wipeSave() {
  showModal({
    title: 'Wipe save',
    bodyHTML:
      `<p>This erases everything — money, automations, achievements, Singularity Points, the works.</p>
       <p class="modal-note">CLAWD will not remember you. That is the scary part, isn’t it.</p>`,
    actions: [
      { label: 'Keep my save', primary: true },
      { label: 'Erase everything', primary: false, onClick: () => {
          localStorage.removeItem(SAVE_KEY);
          location.reload();
        } },
    ],
  });
}

/* ============ Tabs ============ */

const TABS = ['log', 'achievements', 'stats'];
function selectTab(name) {
  for (const t of TABS) {
    const btn = $('tabBtn-' + t);
    const panel = $('tab-' + t);
    const active = t === name;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-selected', String(active));
    panel.hidden = !active;
  }
  if (name === 'achievements') renderAchievements();
  if (name === 'stats') renderStats();
}

for (const t of TABS) {
  $('tabBtn-' + t).addEventListener('click', () => selectTab(t));
}
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const idx = TABS.findIndex((t) => $('tabBtn-' + t).classList.contains('is-active'));
  const next = (idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
  selectTab(TABS[next]);
  $('tabBtn-' + TABS[next]).focus();
});

/* ============ HUD updates ============ */

let lastMoneyStr = '', lastRateStr = '', lastClickStr = '', lastTitleAt = 0;

function updateHud() {
  const m = '$' + fmtLong(run.money);
  if (m !== lastMoneyStr) {
    lastMoneyStr = m;
    ui.moneyDisplay.textContent = m;
    ui.moneyDisplay.classList.toggle('is-long', m.length > 13);
  }
  const r = $$$(C.effRate) + '/sec' + (C.prodBuffMult > 1 ? ` (×${fmt(C.prodBuffMult)})` : '');
  if (r !== lastRateStr) { lastRateStr = r; ui.rateDisplay.textContent = r; }
  const c = $$$(C.click) + '/click';
  if (c !== lastClickStr) { lastClickStr = c; ui.clickDisplay.textContent = c; }
  if (now() - lastTitleAt > 1000) {
    lastTitleAt = now();
    document.title = `${$$$(run.money)} — AI Clicker`;
  }
}

/* ============ Main loop ============ */

let lastTick = now();
let achTimer = 0, buffRenderTimer = 0, statsTimer = 0;

function tick() {
  const t = now();
  let dt = (t - lastTick) / 1000;
  lastTick = t;
  if (dt < 0) dt = 0;
  if (dt > 120) dt = 120; /* interval throttling guard; long absences are offline earnings */

  const gain = C.effRate * dt;
  if (gain > 0) {
    run.money += gain;
    run.earned += gain;
    meta.allEarned += gain;
  }
  run.playMs += dt * 1000;
  meta.playMs += dt * 1000;
  if (C.prodBuffMult > 1) run.frenzyMs += dt * 1000;

  expireBuffs();
  maybeSpawnGold();
  maybeQuip();
  checkEra();
  updateHud();
  updateEraProgress();

  if (excitedUntil && t > excitedUntil) {
    excitedUntil = 0;
    ui.sparkBtn.classList.remove('is-excited');
  }

  if (storeDirty) renderStore();
  else updateAffordability(true);

  achTimer += dt;
  if (achTimer >= 1) {
    achTimer = 0;
    sweepAchievements();
    updatePrestigeBtn();
    updateFacilityBtn();
    if (!storeDirty && storeSignature() !== lastStoreSig) storeDirty = true;
  }

  statsTimer += dt;
  if (statsTimer >= 1) {
    statsTimer = 0;
    if (!$('tab-stats').hidden) renderStats();
  }
}

/* ============ Wire up ============ */

ui.sparkBtn.addEventListener('click', sparkClick);
ui.prestigeBtn.addEventListener('click', confirmPrestige);
ui.facilityBtn.addEventListener('click', () => Factory.open());

function applySoundSetting() {
  const on = meta.settings.sound !== false;
  Sfx.setEnabled(on);
  ui.soundBtn.textContent = on ? 'Sound on' : 'Sound off';
  ui.soundBtn.setAttribute('aria-pressed', String(on));
}
ui.soundBtn.addEventListener('click', () => {
  meta.settings.sound = !(meta.settings.sound !== false);
  applySoundSetting();
  save();
});
ui.saveBtn.addEventListener('click', () => save(true));
ui.saveBtn.title = 'The game already auto-saves every 10 seconds and whenever you leave.';
ui.exportBtn.addEventListener('click', exportSave);
ui.importBtn.addEventListener('click', importSave);
ui.wipeBtn.addEventListener('click', wipeSave);

ui.buyMode.addEventListener('click', (e) => {
  const btn = e.target.closest('.seg');
  if (!btn) return;
  meta.settings.buyMode = Number(btn.dataset.n);
  for (const seg of ui.buyMode.querySelectorAll('.seg')) {
    const active = seg === btn;
    seg.classList.toggle('is-active', active);
    seg.setAttribute('aria-pressed', String(active));
  }
  updateAffordability(true);
});

/* save aggressively — beforeunload alone is unreliable, especially on phones */
window.addEventListener('beforeunload', () => save());
window.addEventListener('pagehide', () => save());
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ============ Init ============ */

function init() {
  const loaded = load();
  recalc();

  if (!loaded) {
    meta.eraSeen[0] = 1;
    pushLog('era', ERAS[0].story, `${ERAS[0].name} — ${ERAS[0].model}`);
    showModal({
      title: ERAS[0].name,
      bodyHTML: `<p class="modal-note">${esc(ERAS[0].model)}</p><p>${esc(ERAS[0].story)}</p>`,
      actions: [{ label: 'Start clicking', primary: true }],
    });
  } else {
    renderLogAll();
  }

  if (meta.settings.hintDone) ui.clickHint.style.display = 'none';

  /* restore buy mode UI */
  for (const seg of ui.buyMode.querySelectorAll('.seg')) {
    const active = Number(seg.dataset.n) === buyModeN();
    seg.classList.toggle('is-active', active);
    seg.setAttribute('aria-pressed', String(active));
  }

  applyEra(run.era, false);
  applySoundSetting();
  renderStore();
  renderBuffs();
  updateAchCount();
  updatePrestigeBtn();
  updateFacilityBtn();
  rotateTicker();

  setInterval(tick, 100);
  setInterval(rotateTicker, 9000);
  setInterval(() => save(), 10000);
}

init();

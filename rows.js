/* ============================================================
   rows.js — live machine rows in the main view (the Cookie
   Clicker "grandma strip"): one animated 8-bit row per owned
   automation type, stacking up as the empire grows.
   Reuses factory.js sprites; clicking a row opens the Facility.
   Loads after factory.js.
   ============================================================ */
'use strict';

const MRows = (() => {
  const SCALE = 2, H = 22; /* world px per row; rendered at ×2 */
  let wrap = null, host = null;
  let lastSig = '', lastFrame = -1;
  const rowEls = new Map(); /* id -> {row, canvas, count} */

  function ensure() {
    wrap = wrap || $('mrowsWrap');
    host = host || $('mrows');
  }

  function build(owned) {
    host.innerHTML = '';
    rowEls.clear();
    for (const b of owned) {
      const row = document.createElement('button');
      row.className = 'mrow';
      row.type = 'button';
      row.dataset.b = b.id;
      row.setAttribute('aria-label', `${b.name} floor — open the Facility`);
      const cv = document.createElement('canvas');
      cv.height = H;
      const count = document.createElement('span');
      count.className = 'mrow-count';
      row.appendChild(cv);
      row.appendChild(count);
      row.addEventListener('click', () => Factory.open());
      host.appendChild(row);
      rowEls.set(b.id, { row, canvas: cv, count });
    }
  }

  function drawRow(els, b, cnt, sheets, mood, frame) {
    const cv = els.canvas;
    const cssW = cv.clientWidth || host.clientWidth || 320;
    const w = Math.max(60, Math.floor(cssW / SCALE));
    if (cv.width !== w) cv.width = w;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = mood.floor;
    g.fillRect(0, 0, w, H);
    g.fillStyle = mood.floor2;
    for (let x = 0; x < w; x += 16) if ((x / 16) % 2) g.fillRect(x, 0, 16, H);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(0, 0, w, 2);
    const spr = sheets[b.id] && sheets[b.id][frame];
    if (!spr) return;
    const max = Math.max(1, Math.floor((w - 50) / 18));
    const shown = Math.min(cnt, max);
    for (let i = 0; i < shown; i++) g.drawImage(spr, 4 + i * 18, H - 19);
    els.count.textContent = '×' + fmt(cnt);
  }

  /* force=true rebuilds rows; force=false is the cheap animation tick */
  function sync(force) {
    ensure();
    if (!wrap || !host) return;
    const owned = BUILDINGS.filter((b) => (run.buildings[b.id] || 0) > 0);
    wrap.hidden = owned.length === 0;
    if (!owned.length) return;
    const frame = Math.floor(Date.now() / 450) % 2;
    const sig = owned.map((b) => b.id + ':' + run.buildings[b.id]).join(',') + '|' + run.era;
    if (!force && sig === lastSig && frame === lastFrame) return;
    if (sig !== lastSig || force || rowEls.size !== owned.length) build(owned);
    lastSig = sig;
    lastFrame = frame;
    const sheets = Factory.sheets();
    const mood = Factory.moods[Factory.moodFor(run.era)];
    for (const b of owned) drawRow(rowEls.get(b.id), b, run.buildings[b.id], sheets, mood, frame);
  }

  window.addEventListener('resize', () => sync(true));
  return { sync };
})();

MRows.sync(true);

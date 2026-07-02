# AI Clicker

A Cookie Clicker-style incremental game about bootstrapping an AI called **CLAWD** from a
duct-taped autocomplete script all the way to the singularity — skinned as a loving parody
of a certain AI chat portal (warm cream, terracotta spark, unsettling politeness).

## How to play

Open `index.html` in any browser — double-click it, or serve the folder with any static
server. No install, no build step, no dependencies.

- **Click the spark.** CLAWD does a job. You get paid.
- **Buy automations** (right panel) — from Autocomplete Scripts to Reality Simulators.
  Each earns money per second. Buy in ×1 / ×10 / ×100 batches.
- **Install upgrades** — the small tiles above the automation list. Hover for details.
- **Claim breakthroughs** — a golden spark drifts by every couple of minutes. Click it for
  windfalls, ×7 production frenzies, or ×777 click storms.
- **Watch the story unfold** — the news wire and the transmission log escalate through seven
  eras as your all-time earnings grow: The Garage → The Startup → The Corporation →
  The Automation Age → The Post-Labor Era → The Awakening → The Singularity.
- **Walk your factory** — "Enter the Facility" opens an 8-bit factory floor with every
  automation you own as animated pixel machinery. WASD / arrows to walk, Esc to leave.
  The decor gets… less reassuring as the eras advance. Keep an eye on the eye.
- **Trigger the Singularity** — once you're rich enough (around $1 trillion earned), a button
  appears in the header. Reset everything for Singularity Points: +10% production each,
  permanently, across every future cycle.

## Saving

- Autosaves every 30 seconds and when you close the tab (localStorage).
- Closes don't stop CLAWD: you earn offline at 50% rate, capped at 8 hours.
- **Export save / Import save** in the header moves progress between browsers.
- **Wipe save** starts over. CLAWD will not remember you. That's the scary part, isn't it.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Markup and the spark SVG |
| `styles.css` | All styling (design tokens in `:root`) |
| `game.js` | All game data and logic — buildings, upgrades, eras, ticker copy, achievements |
| `.claude/rules/design.md` | Design system notes for future changes |

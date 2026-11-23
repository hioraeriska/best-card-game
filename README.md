# Ember Pact v3 — Duel of the Four Winds

A trick-taking duel against Rook the Cinder Fox. You and Rook start with 30
life each; the first to 0 loses. Each hand deals 6 cards each from a 40-card
deck: four elements (Ember, Gale, Tide, Stone) valued 1–9, plus four Pact
wilds worth 6 in any element you name.

## How a trick works

- The leader plays a card; the other follows. Higher power takes the trick
  and deals the power gap as damage (minimum 1).
- Power is the card's value **+3** when its element beats the foe's on the
  wheel — Ember beats Gale beats Tide beats Ember; Stone is neutral.
- **Oath (new in v3):** at the start of every hand you swear an Oath on one
  element. Oath cards gain **+2 power** all hand — but lose the hand and the
  Oath breaks: Rook deals **+3** extra damage. Back your strongest element,
  or the one that beats Rook's stance.
- **Rook's stance:** each hand Rook favours one element (+1 power to its
  cards of that element) and tells you which — its word holds about 7 times
  in 10. Before every card Rook plays, a tell shows the element it is
  eyeing, true about 7 times in 10. Read both, and counter them.
- **Chain:** the same element winning twice running deals +1.
- **Surge:** winning two tricks in a row arms +2 on your next win.
- **Pact wilds:** play one and name its element — value 6 in the element
  that beats Rook's card.
- The hand winner deals +3 bonus damage. Then a fresh hand is dealt.

## Controls

Mouse or keyboard: keys **1–6** play a card, **1–4** swear an Oath or name a
Pact element, **Enter** starts / plays again, **M** mutes the sound.

## Files

- `game/index.html` — the page; `game/styles.css` — the table
- `game/src/rng.js` — seeded random numbers (one stream, replays match)
- `game/src/deck.js` — the deck, the wheel, power
- `game/src/ai.js` — Rook: stance, tells, card choice
- `game/src/game.js` — the rules and the match state machine (no DOM)
- `game/src/render.js` — the table, cards, overlays, flourish
- `game/src/sound.js` — synthesized WebAudio blips, no audio files
- `game/src/shots.js` — deterministic screenshot staging (`?shot=`)
- `game/src/main.js` — input, timing, the pump that drives Rook
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to
  `/output` and writes `/output/dossier.json`
- `serve.ts` — local static server: `node serve.ts`, then open
  http://localhost:8080

Screenshots: `?shot=title|table|win|loss` stages each screen; the cover is
the mid-game table.

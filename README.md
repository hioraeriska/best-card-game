# Ember Pact — a duel of the four winds

A card game for the make.fun best-card-game bounty. You against Rook the
Cinder Fox, 30 life each, one 40-card pact deck: four elements (Ember, Gale,
Tide, Stone) at values 1–9, plus four Pact wilds.

## Rules

- Each trick, both sides play a card. Power is value +3 when your element
  beats the other on the wheel: Ember > Gale > Tide > Ember. Stone is neutral.
- The trick winner deals damage equal to the power gap (at least 1).
- **Surge:** win two tricks in a row to arm Surge — your next win deals +2.
  Losing a trick disarms it.
- **Chain:** win a trick with the same element as the last trick's winning
  element and bank +1 chain damage.
- **Pact wilds:** playing one opens a picker — you choose its element.
- **Rook's tell:** Rook shows a gathering badge naming the element it is
  most likely to play next (true about 7 times in 10). Your cards that beat
  the telegraphed element glow gold.
- Hands refill to five cards after each trick until the decks run out. The
  higher life wins when the decks are spent.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Click a card to play it (keys 1–5 work too), M mutes the sound, Enter starts
and restarts. Screenshot scenes: `?shot=title|table|win|loss&seed=N`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

## Layout

- `game/src/deck.js` — deck, elements, wheel, power
- `game/src/ai.js` — Rook's choices, its tell, and the autopilot
- `game/src/game.js` — rules engine: tricks, Surge, chains, the log
- `game/src/render.js` — the table, cards, screens
- `game/src/sound.js` — synthesized Web Audio blips
- `game/src/shots.js` — screenshot scenes
- `game/src/main.js` — bootstrap, input, shot mode

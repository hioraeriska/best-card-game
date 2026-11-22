[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

# Ember Pact v2 — duel of the four winds

An original card game built for the [best card game bounty on make.fun](https://make.fun/bounty/best-card-game-20261122-1826). You duel Rook the Cinder Fox, 30 life each, with a deck of four elements — Ember, Gale, Tide and Stone — values 1–9, plus 4 Pact wilds.

## How to play

- Each trick, you and Rook each play a card. Power is the card's value, +3 when your element beats Rook's on the wheel: Ember > Gale > Tide > Ember. Stone is neutral.
- The trick winner deals damage equal to the power difference (minimum 1).
- Win two tricks in a row to arm **Surge** (+2 damage on your next win).
- Win a trick with the same element as the previous trick's winning element to bank a **Chain** bonus (+1 damage).
- Playing a **Pact** wild opens a picker: you choose its element.
- Rook shows a **gathering intent** badge naming the element it is most likely to play next (about 70% true). Cards in your hand that beat the telegraphed element glow — read the tell and counter it.
- First to reduce the other to 0 life wins.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and play with mouse or keyboard.

## Build

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

All art is original (inline SVG glyphs, CSS table) and all sound is synthesized with the Web Audio API. No network requests, no external assets.

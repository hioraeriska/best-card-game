# Ember Pact — a duel of elements

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/rank.svg)](https://make.fun/c/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/reward.svg)](https://make.fun/c/best-card-game-20261122-1826)

An original card duel built for the [best card game competition on make.fun](https://make.fun/c/best-card-game-20261122-1826). You face Rook the Cinder Fox across a table of embers: 30 life each, one deck of 36 element cards, and a fox that tells you what it is planning — then dares you to stop it.

## How to play

- **Lead a card.** Higher power takes the trick and deals damage equal to the margin.
- **🔥 Ember > 🌪️ Gale > 💧 Tide > 🔥 Ember.** Advantage is +3 power. 🪨 Stone fights on bare value alone — it beats nothing and nothing beats it.
- **Chain:** win tricks with the same element in a row and the damage multiplies — Chain ×2, ×3, and up.
- **Pact:** win a trick with all four elements and the Pact bursts: +6 damage and heal 4.
- **Scheme:** every few tricks Rook declares the element it is building toward. Break the scheme by winning with its counter element for +3 bonus damage. Rook is honest about its scheme ~70% of the time — the rest is a bluff.
- First to zero life loses. Keys 1–5 play a hand card, Enter starts, M mutes, N starts a new match.

## Run it

```sh
node serve.ts        # then open http://localhost:8080
```

No build step, no network, no dependencies — `game/` is plain static files. Sounds are synthesized with WebAudio.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

## Layout

- `game/src/rng.js` — seeded randomness (mulberry32)
- `game/src/deck.js` — the 36-card deck and the element cycle
- `game/src/game.js` — match state, tricks, chains, pacts, schemes
- `game/src/ai.js` — Rook the Cinder Fox
- `game/src/render.js` — the table, the cards, the screens
- `game/src/sound.js` — WebAudio sounds, no files
- `game/src/shots.js` — staged, deterministic screenshot states
- `game/src/main.js` — boot, input, screen flow

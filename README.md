# Ember Pact — Duel of the Four Winds

![Best card game](https://make.fun/badge/best-card-game-20261122-1826.svg)
![Rank](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/rank.svg)
![Reward](https://make.fun/badge/best-card-game-20261122-1826/hioraeriska/best-card-game/reward.svg)

An original card duel for the [best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826) on make.fun.

## The game

You face **Rook the Cinder Fox** across a green felt table. You both start at
30 life. Each trick you play one card from your five-card hand; Rook plays one
face-down, and the two are revealed together.

- **Four winds, one wheel.** Ember beats Gale, Gale beats Tide, Tide beats
  Ember; Stone is neutral. A winning element adds **+3 power**.
- **Pact wilds** (value 6) become the element that beats your rival's card.
- **Surge.** Win two tricks in a row to arm Surge — your next win deals
  **+2 damage**.
- **Telegraph.** Before you play, Rook lets slip a hint about the element it
  favours. It tells the truth most of the time — read it, counter it, and
  don't trust it blindly.

Higher power wins the trick; the loser loses life equal to the difference
(at least 1 on a win; a tie is a clash). First to 0 life loses.

## Controls

Click a card to select, click again to play · Keys 1–5 select · Enter/Space
plays · R restarts. Procedural Web Audio blips, no audio files, no network.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Deterministic screenshot states: `?shot=title|table|win|loss&seed=N`.

## Hand-in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored make.fun
library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).

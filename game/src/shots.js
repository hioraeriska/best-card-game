// Screenshot scenes for Ember Pact: ?shot=title|table|win|loss&seed=N.
// Each scene plays the real rules forward from a fresh game with a fixed
// seed, steered by the autopilot, so the frame is what a real game looks
// like and the same seed always gives the same frame. The win and loss
// scenes keep replaying fresh seeds until the side they need has won.

import { PHASE_OVER, PHASE_PLAY, newGame, playFullGame, playPlayerCard, startGame } from './game.js';
import { autopilotPick } from './ai.js';

// Play a fixed number of tricks with the autopilot, then leave the next
// trick open (Rook has chosen, the player has not) for a mid-game table.
function playTricks(game, count) {
  let done = 0;
  let guard = 0;
  while (done < count && game.phase === PHASE_PLAY && guard < 200) {
    guard += 1;
    if (!game.trick || game.trick.playerCard) continue;
    const pick = autopilotPick(game.playerHand, game.rookHint);
    const index = game.playerHand.indexOf(pick.card);
    if (index === -1) break;
    const before = game.trickCount;
    const result = playPlayerCard(game, index, pick.chosenElement);
    if (!result || result.needsPick) break;
    if (game.trickCount > before) done += 1;
  }
  return game;
}

// Find a finished game, over seeds, whose winner is the side we need.
function findFinishedGame(wantWinner, startSeed) {
  let last = null;
  for (let seed = startSeed; seed < startSeed + 60; seed += 1) {
    last = playFullGame(seed);
    if (last.phase === PHASE_OVER && last.winner === wantWinner) return last;
  }
  // Fallback: the last game played, whatever its winner.
  return last;
}

export function stageShot(name, seed) {
  const base = Number.isFinite(seed) ? seed : 7;
  if (name === 'table') {
    const game = newGame(base);
    startGame(game);
    playTricks(game, 6);
    return { game, screen: PHASE_PLAY };
  }
  if (name === 'win') {
    const game = findFinishedGame('player', base);
    return { game, screen: PHASE_OVER };
  }
  if (name === 'loss') {
    const game = findFinishedGame('rook', base);
    return { game, screen: PHASE_OVER };
  }
  // Title (and anything unknown): a fresh world, never started.
  const game = newGame(base);
  return { game, screen: 'title' };
}

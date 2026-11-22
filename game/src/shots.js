// Deterministic screenshot states: ?shot=title|table|win|loss&seed=N
// renders a fixed, seeded moment of the game — a real render of the game's
// own code, never an edited image. The table shot shows a mid-duel state
// with Surge armed; win/loss show the end overlay over the table.
import { newGame } from './game.js';
import { makeCard } from './deck.js';

function midDuel(state) {
  state.playerLife = 20;
  state.rookLife = 18;
  state.round = 6;
  state.tricksWon = 3;
  state.tricksLost = 2;
  state.damageDealt = 12;
  state.damageTaken = 10;
  state.streak = 2;
  state.surgeArmed = true;
  state.playerHand = [
    makeCard('ember', 8),
    makeCard('tide', 5),
    makeCard('gale', 9),
    makeCard('stone', 4),
    makeCard('pact', 6, true),
  ];
  state.rookHand = [
    makeCard('ember', 3),
    makeCard('gale', 6),
    makeCard('tide', 7),
    makeCard('stone', 8),
    makeCard('ember', 5),
  ];
  state.lastTrick = {
    playerCard: makeCard('tide', 9),
    rookCard: makeCard('ember', 6),
    playerPower: 12,
    rookPower: 6,
    playerAdvantage: true,
    rookAdvantage: false,
    winner: 'player',
    damage: 6,
    surge: false,
    text: 'Round 5 — You played Tide 9 (12) vs Rook\'s Ember 6 (6). You win the trick, Rook −6.',
  };
  state.rookPlanned = makeCard('tide', 6);
  state.telegraph = { element: 'tide', bluff: false, text: '' };
  state.log = [
    'Round 5 — You played Tide 9 (12) vs Rook\'s Ember 6 (6). You win the trick, Rook −6.',
    'Round 4 — You played Stone 8 (8) vs Rook\'s Gale 7 (7). You win the trick, Rook −1.',
    'Round 3 — Rook played Ember 7 (10) vs your Gale 5 (5). Rook wins the trick, you −5.',
    'Round 2 — You played Gale 8 (11) vs Rook\'s Tide 6 (6). You win the trick, Rook −5.',
    'Round 1 — Rook played Tide 6 (9) vs your Ember 4 (4). Rook wins the trick, you −5.',
  ];
  return state;
}

// Build the state for a shot name. Returns null for 'title' (no table state).
export function stateForShot(shot, seed) {
  if (shot === 'table') {
    return { state: midDuel(newGame(seed)), selected: 2 };
  }
  if (shot === 'win') {
    const state = midDuel(newGame(seed));
    state.rookLife = 0;
    state.playerLife = 22;
    state.round = 9;
    state.tricksWon = 8;
    state.tricksLost = 4;
    state.damageDealt = 30;
    state.damageTaken = 8;
    state.streak = 0;
    state.surgeArmed = false;
    state.lastTrick = {
      playerCard: makeCard('ember', 9),
      rookCard: makeCard('gale', 2),
      playerPower: 12,
      rookPower: 2,
      playerAdvantage: true,
      rookAdvantage: false,
      winner: 'player',
      damage: 10,
      surge: true,
      text: 'Round 8 — You played Ember 9 (12) vs Rook\'s Gale 2 (2). You win the trick, Rook −10. Surge strikes!',
    };
    state.phase = 'over';
    state.winner = 'player';
    return { state, selected: -1 };
  }
  if (shot === 'loss') {
    const state = midDuel(newGame(seed));
    state.playerLife = 0;
    state.rookLife = 14;
    state.round = 8;
    state.tricksWon = 3;
    state.tricksLost = 7;
    state.damageDealt = 16;
    state.damageTaken = 30;
    state.streak = 0;
    state.surgeArmed = false;
    state.lastTrick = {
      playerCard: makeCard('stone', 4),
      rookCard: makeCard('tide', 9),
      playerPower: 4,
      rookPower: 12,
      playerAdvantage: false,
      rookAdvantage: true,
      winner: 'rook',
      damage: 8,
      surge: false,
      text: 'Round 7 — Rook played Tide 9 (12) vs your Stone 4 (4). Rook wins the trick, you −8.',
    };
    state.phase = 'over';
    state.winner = 'rook';
    return { state, selected: -1 };
  }
  return null;
}

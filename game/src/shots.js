// Screenshot staging for Ember Pact.
//
// ?shot=title|table|win|loss (and ?seed=N) builds a deterministic state for
// each screenshot, driving the same pure-logic functions the player uses:
// real hands are dealt, real tricks are played, real matches are won and
// lost. Nothing here is faked for the camera.

import { ELEMENT_ORDER } from './deck.js';
import {
  beginHand,
  chooseOath,
  choosePact,
  isOver,
  newMatch,
  resolveTrick,
  rookPlay,
  rookThink,
  startMatch,
  youPlay,
} from './game.js';

/** The player's auto-pilot for staging: strongest sensible card each trick. */
function autoYouCard(state) {
  const hand = state.youHand;
  const foe = state.table.rook;
  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    let score = card.value + (card.pact ? 1 : 0);
    if (state.oath && card.element === state.oath) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/** Play one full trick with the auto-pilot, whatever phase we are in. */
function playAutoTrick(state) {
  let guard = 0;
  while (!isOver(state) && state.phase !== 'oath' && guard++ < 20) {
    if (state.phase === 'handEnd') {
      beginHand(state);
      continue;
    }
    if (state.phase === 'lead-you' || state.phase === 'follow-you') {
      const card = autoYouCard(state);
      const res = youPlay(state, card.uid);
      if (res === 'pact') choosePact(state, state.oath || 'ember');
      continue;
    }
    if (state.phase === 'rook-thinking') {
      if (!state.rookPending) {
        rookThink(state);
        continue;
      }
      rookPlay(state);
      continue;
    }
    if (state.phase === 'trick') {
      resolveTrick(state);
      continue;
    }
    break;
  }
}

/**
 * Play a whole match with the auto-pilot and return the finished state, or
 * null when the match did not end the wanted way.
 */
function simulateMatch(seed, wantWinner) {
  const state = newMatch(seed);
  startMatch(state);
  let guard = 0;
  while (!isOver(state) && guard++ < 400) {
    if (state.phase === 'oath') {
      // Oath on the element we hold most of, breaking ties toward the one
      // that beats Rook's claimed stance.
      const counts = {};
      for (const e of ELEMENT_ORDER) counts[e] = 0;
      for (const c of state.youHand) if (!c.pact) counts[c.element]++;
      let best = ELEMENT_ORDER[0];
      for (const e of ELEMENT_ORDER) if (counts[e] > counts[best]) best = e;
      chooseOath(state, best);
      continue;
    }
    playAutoTrick(state);
  }
  if (!isOver(state)) return null;
  return state.winner === wantWinner ? state : null;
}

/** Find a seed whose auto-played match ends the wanted way. */
function findMatch(wantWinner) {
  for (let seed = 1; seed <= 400; seed++) {
    const state = simulateMatch(seed, wantWinner);
    if (state) return state;
  }
  return null;
}

/**
 * Stage one screenshot. Returns a match state ready for render().
 * 'table' is mid-hand: three real tricks played, a fourth in progress with
 * the player's card down and Rook's tell showing.
 */
export function stageShot(shot, seed = 11) {
  if (shot === 'win') {
    return findMatch('you') || newMatch(seed);
  }
  if (shot === 'loss') {
    return findMatch('rook') || newMatch(seed);
  }
  if (shot === 'table') {
    // Try seeds until one stages cleanly: three real tricks played, then a
    // fourth left in progress with the player's card down and Rook's tell up.
    for (let trySeed = seed; trySeed < seed + 100; trySeed++) {
      const state = newMatch(trySeed);
      startMatch(state);
      chooseOath(state, 'ember');
      playAutoTrick(state);
      playAutoTrick(state);
      playAutoTrick(state);
      // Steer to a trick You lead: a hand may have ended mid-staging, or
      // Rook may be leading. Advance until You lead (or swear a fresh Oath).
      let guard = 0;
      while (state.phase !== 'lead-you' && !isOver(state) && guard++ < 30) {
        if (state.phase === 'handEnd') {
          beginHand(state);
          continue;
        }
        if (state.phase === 'oath') {
          chooseOath(state, 'ember');
          continue;
        }
        playAutoTrick(state);
      }
      if (isOver(state) || state.phase !== 'lead-you') continue;
      const card = autoYouCard(state);
      const res = youPlay(state, card.uid);
      if (res === 'pact') choosePact(state, state.oath || 'ember');
      if (state.phase !== 'rook-thinking') continue;
      rookThink(state);
      if (state.table.you && state.tell) return state;
    }
    return newMatch(seed);
  }
  // 'title' and anything else: the title screen.
  return newMatch(seed);
}

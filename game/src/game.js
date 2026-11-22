// Ember Pact rules and state machine.
// You vs Rook the Cinder Fox, both at 30 life. Each trick you play one card
// from your 5-card hand; Rook plays one face-down, revealed together.
// Power = value + 3 when your element beats theirs. Higher power wins the
// trick; the loser loses life equal to the power difference (at least 1 on
// a win; a tie is a clash, no damage). Win two tricks in a row to arm
// Surge — your next trick win deals +2 damage. Hands refill to 5 after
// each trick; the deck reshuffles from the discard when empty.
import { buildDeck, shuffle, mulberry32, elementBeats, effectiveElement, ELEMENTS } from './deck.js';
import { chooseRookCard, makeTelegraph } from './ai.js';

export const START_LIFE = 30;
export const HAND_SIZE = 5;
export const SURGE_BONUS = 2;
export const ADVANTAGE_BONUS = 3;

export function newGame(seed) {
  const seedValue = seed === undefined || seed === null
    ? (Date.now() % 2147483647)
    : seed;
  const rng = mulberry32(seedValue);
  const state = {
    seed: seedValue,
    rng,
    deck: shuffle(buildDeck(), rng),
    discard: [],
    playerHand: [],
    rookHand: [],
    playerLife: START_LIFE,
    rookLife: START_LIFE,
    round: 1,
    tricksWon: 0,
    tricksLost: 0,
    damageDealt: 0,
    damageTaken: 0,
    streak: 0,
    surgeArmed: false,
    rookPlanned: null,
    telegraph: null,
    lastTrick: null,
    phase: 'playing', // 'playing' | 'over'
    winner: null, // 'player' | 'rook'
    log: [],
    memory: { playerElements: {} },
  };
  drawUp(state, 'player');
  drawUp(state, 'rook');
  planRook(state);
  return state;
}

export function drawUp(state, who) {
  const hand = who === 'player' ? state.playerHand : state.rookHand;
  while (hand.length < HAND_SIZE) {
    if (state.deck.length === 0) {
      if (state.discard.length === 0) break;
      state.deck = shuffle(state.discard, state.rng);
      state.discard = [];
    }
    hand.push(state.deck.pop());
  }
}

// Rook commits its face-down card for the trick and lets slip a hint.
export function planRook(state) {
  state.rookPlanned = chooseRookCard(state.rookHand, state.memory, state.rng);
  state.telegraph = state.rookPlanned
    ? makeTelegraph(state.rookPlanned, state.rng)
    : null;
}

// Power of `card` against `opponentCard`, with the element advantage.
export function trickPower(card, opponentCard) {
  let power = card.value;
  let advantage = false;
  if (card.pact && !opponentCard.pact) {
    advantage = effectiveElement(card, opponentCard) !== null;
  } else if (!card.pact && !opponentCard.pact) {
    advantage = elementBeats(card.element, opponentCard.element);
  }
  if (advantage) power += ADVANTAGE_BONUS;
  return { power, advantage };
}

export function cardLabel(card) {
  if (card.pact) return `Pact ${card.value}`;
  return `${ELEMENTS[card.element].name} ${card.value}`;
}

// Play the card at `handIndex` from the player's hand and resolve the trick.
// Returns the trick record, or null when the game is not accepting plays.
export function playCard(state, handIndex) {
  if (state.phase !== 'playing') return null;
  if (handIndex < 0 || handIndex >= state.playerHand.length) return null;
  if (!state.rookPlanned) return null;
  const playerCard = state.playerHand.splice(handIndex, 1)[0];
  const rookIndex = state.rookHand.indexOf(state.rookPlanned);
  const rookCard = rookIndex >= 0
    ? state.rookHand.splice(rookIndex, 1)[0]
    : state.rookPlanned;
  const trick = resolveTrick(state, playerCard, rookCard);
  state.discard.push(playerCard, rookCard);
  state.lastTrick = trick;
  state.log.unshift(trick.text);
  if (state.log.length > 6) state.log.length = 6;
  state.round += 1;
  drawUp(state, 'player');
  drawUp(state, 'rook');
  if (state.rookLife <= 0) {
    state.phase = 'over';
    state.winner = 'player';
  } else if (state.playerLife <= 0) {
    state.phase = 'over';
    state.winner = 'rook';
  } else {
    planRook(state);
  }
  return trick;
}

function resolveTrick(state, playerCard, rookCard) {
  const mine = trickPower(playerCard, rookCard);
  const theirs = trickPower(rookCard, playerCard);
  const surgeUsed = state.surgeArmed;
  let winner = 'clash';
  let damage = 0;
  if (mine.power > theirs.power) {
    winner = 'player';
    damage = Math.max(1, mine.power - theirs.power) + (surgeUsed ? SURGE_BONUS : 0);
    state.rookLife = Math.max(0, state.rookLife - damage);
    state.tricksWon += 1;
    state.damageDealt += damage;
    state.streak = surgeUsed ? 0 : state.streak + 1;
    state.surgeArmed = !surgeUsed && state.streak >= 2;
  } else if (theirs.power > mine.power) {
    winner = 'rook';
    damage = Math.max(1, theirs.power - mine.power);
    state.playerLife = Math.max(0, state.playerLife - damage);
    state.tricksLost += 1;
    state.damageTaken += damage;
    state.streak = 0;
    state.surgeArmed = false;
  } else {
    state.streak = 0;
    state.surgeArmed = false;
  }
  const played = playerCard.pact ? 'pact' : playerCard.element;
  state.memory.playerElements[played] = (state.memory.playerElements[played] || 0) + 1;
  state.memory.playerFavElement = favElement(state.memory.playerElements);
  const text = trickText(state, playerCard, rookCard, mine, theirs, winner, damage, surgeUsed);
  return {
    playerCard, rookCard,
    playerPower: mine.power, rookPower: theirs.power,
    playerAdvantage: mine.advantage, rookAdvantage: theirs.advantage,
    winner, damage, surge: surgeUsed, text,
  };
}

function favElement(counts) {
  let best = null;
  let bestCount = 0;
  for (const el of Object.keys(counts)) {
    if (counts[el] > bestCount) { best = el; bestCount = counts[el]; }
  }
  return best;
}

function trickText(state, playerCard, rookCard, mine, theirs, winner, damage, surgeUsed) {
  const round = state.round;
  const mineLabel = `${cardLabel(playerCard)} (${mine.power})`;
  const theirsLabel = `${cardLabel(rookCard)} (${theirs.power})`;
  if (winner === 'player') {
    const surge = surgeUsed ? ' Surge strikes!' : '';
    return `Round ${round} — You played ${mineLabel} vs Rook's ${theirsLabel}. You win the trick, Rook −${damage}.${surge}`;
  }
  if (winner === 'rook') {
    return `Round ${round} — Rook played ${theirsLabel} vs your ${mineLabel}. Rook wins the trick, you −${damage}.`;
  }
  return `Round ${round} — ${mineLabel} meets ${theirsLabel}. Clash! No damage.`;
}

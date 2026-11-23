// Ember Pact: the rules and the match state machine.
//
// A match is You vs Rook the Cinder Fox, 30 life each. Each hand deals 6
// cards each from the 40-card deck. The player swears an OATH on one element
// at the start of every hand: Oath cards get +2 power all hand, but if the
// player loses the hand the Oath breaks and Rook deals +3 extra damage.
// Tricks are won on power (value + wheel + Oath/stance); the winner deals
// damage equal to the power gap (min 1), +1 for a Chain (the same element
// winning twice running), +2 for a Surge (armed by winning two tricks in a
// row). The hand winner deals +3 bonus damage. First to 0 life loses.
//
// This file is pure logic: no DOM, no timers, no sound. The browser shell
// (main.js) drives it and render.js draws it, so a Node test can play whole
// matches headlessly through the same functions.

import { buildDeck, ELEMENT_ORDER, powerOf } from './deck.js';
import { makeRng } from './rng.js';
import { bestPactElement, chooseFollowCard, chooseLeadCard, pickStance, tellFor } from './ai.js';

export const HAND_SIZE = 6;
export const START_LIFE = 30;
export const HAND_BONUS = 3;
export const OATH_BREAK = 3;
export const OATH_BONUS = 2;
export const WHEEL_BONUS = 3;
export const CHAIN_BONUS = 1;
export const SURGE_BONUS = 2;

/** A fresh match, before the title screen is dismissed. */
export function newMatch(seed = 20261123) {
  return {
    seed,
    rng: makeRng(seed),
    phase: 'title', // title | oath | pact | lead-you | follow-you | rook-thinking | trick | handEnd | over
    life: { you: START_LIFE, rook: START_LIFE },
    hands: { you: 0, rook: 0 },
    handNo: 0,
    handWinner: null,
    tricks: { you: 0, rook: 0 },
    trickNo: 0,
    oath: null,
    stance: null,
    youHand: [],
    rookHand: [],
    table: { you: null, rook: null },
    leader: 'you',
    streak: { you: 0, rook: 0 },
    surge: { you: false, rook: false },
    lastWinElement: null,
    tell: null,
    rookPending: null,
    rookHidden: false,
    pendingPact: null,
    lastTrick: null,
    pile: [],
    winner: null,
    overReason: '',
    log: [],
  };
}

function say(state, text) {
  state.log.push(text);
  if (state.log.length > 6) state.log.shift();
}

/** Start the match: first hand is dealt, the player swears the first Oath. */
export function startMatch(state) {
  state.phase = 'oath';
  beginHand(state);
}

/** Deal a fresh hand, draw Rook's stance, and ask the player for an Oath. */
export function beginHand(state) {
  state.handNo++;
  const deck = state.rng.shuffle(buildDeck());
  state.youHand = deck.slice(0, HAND_SIZE);
  state.rookHand = deck.slice(HAND_SIZE, HAND_SIZE * 2);
  state.stance = pickStance(state.rng);
  state.oath = null;
  state.tricks = { you: 0, rook: 0 };
  state.trickNo = 1;
  state.table = { you: null, rook: null };
  state.tell = null;
  state.rookPending = null;
  state.pendingPact = null;
  state.lastWinElement = null;
  state.leader = state.handNo === 1 ? 'you' : state.handWinner || 'you';
  state.phase = 'oath';
  say(state, `Hand ${state.handNo} — Rook claims to favour ${state.stance.shown}. Swear your Oath.`);
}

/**
 * The player swears an Oath on an element: +2 power to its cards this hand.
 * The Oath is the hand's one big decision: back your strongest element, or
 * the one that beats Rook's claimed stance.
 */
export function chooseOath(state, element) {
  if (state.phase !== 'oath' || !ELEMENT_ORDER.includes(element)) return false;
  state.oath = element;
  say(state, `You swear the Oath of ${element} (+${OATH_BONUS} power).`);
  state.phase = state.leader === 'you' ? 'lead-you' : 'rook-thinking';
  return true;
}

function removeFromHand(hand, uid) {
  const i = hand.findIndex((c) => c.uid === uid);
  if (i < 0) return null;
  return hand.splice(i, 1)[0];
}

/** Put a card on the table for a side, with its played element resolved. */
function placeCard(state, side, card, element) {
  const played = { ...card, element };
  state.table[side] = played;
  if (side === 'you') {
    state.pendingPact = null;
  }
  return played;
}

/**
 * The player plays a card. A Pact wild parks in `pendingPact` and asks for
 * its element first (phase 'pact'). Returns 'ok', 'pact' or false.
 */
export function youPlay(state, uid) {
  if (state.phase !== 'lead-you' && state.phase !== 'follow-you') return false;
  const card = state.youHand.find((c) => c.uid === uid);
  if (!card) return false;
  if (card.pact) {
    state.pendingPact = card;
    state.phase = 'pact';
    return 'pact';
  }
  removeFromHand(state.youHand, uid);
  placeCard(state, 'you', card, card.element);
  afterYouPlay(state);
  return 'ok';
}

/** Choose the element for a Pact wild the player just played. */
export function choosePact(state, element) {
  if (state.phase !== 'pact' || !state.pendingPact || !ELEMENT_ORDER.includes(element)) return false;
  const card = removeFromHand(state.youHand, state.pendingPact.uid);
  placeCard(state, 'you', card, element);
  say(state, `Your Pact wild burns as ${element}.`);
  afterYouPlay(state);
  return true;
}

function afterYouPlay(state) {
  if (state.table.rook) {
    state.phase = 'trick';
  } else {
    state.phase = 'rook-thinking';
  }
}

/**
 * Rook thinks: pick the card it will play and show its tell (the element
 * it claims to be eyeing — true 70% of the time). The card is held in
 * `rookPending` until rookPlay() puts it down, so the tell is visible first.
 */
export function rookThink(state) {
  if (state.phase !== 'rook-thinking') return false;
  const leading = state.table.you === null;
  const card = leading
    ? chooseLeadCard(state, state.rng)
    : chooseFollowCard(state, state.table.you, state.rng);
  const element = card.pact ? bestPactElement(state, state.table.you) : card.element;
  state.rookPending = { ...card, element };
  state.tell = tellFor(state.rookPending, state.rng);
  return true;
}

/** Rook puts its chosen card on the table. */
export function rookPlay(state) {
  if (!state.rookPending) return false;
  const card = state.rookPending;
  state.rookPending = null;
  removeFromHand(state.rookHand, card.uid);
  placeCard(state, 'rook', card, card.element);
  state.rookHidden = false;
  if (state.table.you) {
    state.phase = 'trick';
  } else {
    state.phase = 'follow-you';
  }
  return true;
}

function dealDamage(state, target, amount, reason) {
  state.life[target] = Math.max(0, state.life[target] - amount);
  say(state, reason);
  return state.life[target] <= 0;
}

/**
 * Resolve the trick on the table: compare powers, deal the gap as damage
 * (min 1), plus Chain and Surge bonuses, then set up the next trick, the
 * hand end, or the end of the match.
 */
export function resolveTrick(state) {
  if (state.phase !== 'trick' || !state.table.you || !state.table.rook) return false;
  const youCard = state.table.you;
  const rookCard = state.table.rook;
  const youPower = powerOf(youCard, rookCard.element, { oath: state.oath });
  const rookPower = powerOf(rookCard, youCard.element, { stance: state.stance.actual });
  let winner;
  if (youPower > rookPower) winner = 'you';
  else if (rookPower > youPower) winner = 'rook';
  else winner = state.leader; // tied power: the leader takes it
  const loser = winner === 'you' ? 'rook' : 'you';
  const winCard = winner === 'you' ? youCard : rookCard;
  let damage = Math.max(1, Math.abs(youPower - rookPower));
  const parts = [`${damage}`];
  if (state.lastWinElement === winCard.element) {
    damage += CHAIN_BONUS;
    parts.push(`chain +${CHAIN_BONUS}`);
  }
  if (state.surge[winner]) {
    damage += SURGE_BONUS;
    parts.push(`surge +${SURGE_BONUS}`);
    state.surge[winner] = false;
  }
  state.streak[winner]++;
  state.streak[loser] = 0;
  if (state.streak[winner] >= 2) state.surge[winner] = true;
  state.lastWinElement = winCard.element;
  state.tricks[winner]++;
  state.lastTrick = {
    youCard, rookCard, youPower, rookPower, winner, damage,
    text: `${winner === 'you' ? 'You take' : 'Rook takes'} the trick ${youPower}–${rookPower} (${parts.join(', ')})`,
  };
  state.pile.unshift({ youCard, rookCard, winner });
  if (state.pile.length > 3) state.pile.pop();
  state.table = { you: null, rook: null };
  state.tell = null;
  const dead = dealDamage(state, loser, damage, state.lastTrick.text);
  if (dead) {
    endMatch(state, winner, `${winner === 'you' ? 'Rook' : 'You'} fall${winner === 'you' ? 's' : ''} to the embers.`);
    return true;
  }
  if (state.trickNo >= HAND_SIZE) {
    endHand(state);
    return true;
  }
  state.trickNo++;
  state.leader = winner;
  state.phase = winner === 'you' ? 'lead-you' : 'rook-thinking';
  return true;
}

/** The hand is over: bonus damage, and an Oath broken when the player loses.
 *  The phase stays 'handEnd' so the table can show the result; the caller
 *  (main.js's pump, or a headless driver) starts the next hand. */
function endHand(state) {
  const youTricks = state.tricks.you;
  const rookTricks = state.tricks.rook;
  state.phase = 'handEnd';
  if (youTricks === rookTricks) {
    state.handWinner = null;
    say(state, `Hand ${state.handNo} tied ${youTricks}–${rookTricks}. The Oath holds.`);
    return;
  }
  const winner = youTricks > rookTricks ? 'you' : 'rook';
  const loser = winner === 'you' ? 'rook' : 'you';
  state.handWinner = winner;
  state.hands[winner]++;
  say(state, `${winner === 'you' ? 'You win' : 'Rook wins'} hand ${state.handNo} ${youTricks}–${rookTricks} (+${HAND_BONUS} damage).`);
  let dead = dealDamage(state, loser, HAND_BONUS, `Hand bonus: ${loser === 'you' ? 'you take' : 'Rook takes'} ${HAND_BONUS}.`);
  if (!dead && winner === 'rook') {
    say(state, `Your Oath of ${state.oath} breaks! Rook deals +${OATH_BREAK}.`);
    dead = dealDamage(state, 'you', OATH_BREAK, `Oath broken: you take ${OATH_BREAK}.`);
  }
  if (dead) {
    endMatch(state, winner, winner === 'you' ? 'Rook falls to the embers.' : 'Your Oath lies broken in the ash.');
  }
}

function endMatch(state, winner, reason) {
  state.winner = winner;
  state.overReason = reason;
  state.phase = 'over';
  say(state, reason);
}

/** True once a side's life has hit zero. */
export function isOver(state) {
  return state.phase === 'over';
}

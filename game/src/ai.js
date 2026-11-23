// Rook the Cinder Fox: the opponent's brain.
//
// Rook is readable on purpose, so the player can counter it:
//  - once per hand Rook takes a STANCE, favouring one element (+1 power to
//    its cards of that element). The banner shows the stance Rook claims;
//    70% of the time the claim is true, 30% it is a decoy and Rook really
//    favours another element.
//  - before every card Rook plays, a TELL shows the element Rook is eyeing:
//    70% of the time it is the element Rook actually plays, 30% a bluff.
// The player counters a stance by swearing the Oath on the element that
// beats it, and counters a tell by playing a card whose element beats it.

import { ELEMENT_ORDER, beatenBy, powerOf } from './deck.js';

/** How often Rook's stance claim and tells are honest. */
export const TELL_HONESTY = 0.7;

/**
 * Pick Rook's stance for a hand: the element it really favours, the one it
 * claims to favour, and whether the claim is honest.
 */
export function pickStance(rng) {
  const actual = rng.pick(ELEMENT_ORDER);
  const honest = rng.chance(TELL_HONESTY);
  let shown = actual;
  if (!honest) {
    const others = ELEMENT_ORDER.filter((e) => e !== actual);
    shown = rng.pick(others);
  }
  return { actual, shown, honest };
}

/**
 * The tell for the card Rook is about to play: its true element 70% of
 * the time, another element 30% of the time.
 */
export function tellFor(card, rng) {
  if (rng.chance(TELL_HONESTY)) return { element: card.element, honest: true };
  const others = ELEMENT_ORDER.filter((e) => e !== card.element);
  return { element: rng.pick(others), honest: false };
}

/** Score a card as a lead: value, plus stance favour, plus a little noise. */
function leadScore(card, stance, rng) {
  let score = card.value;
  if (card.element === stance.actual) score += 2;
  if (card.pact) score += 1;
  return score + rng.next() * 2;
}

/**
 * Rook leads a trick. It likes its stance element and saves nothing in
 * particular: a mid-strength card with a jitter, so its leads vary.
 */
export function chooseLeadCard(state, rng) {
  const hand = state.rookHand;
  let best = hand[0];
  let bestScore = -Infinity;
  for (const card of hand) {
    const score = leadScore(card, state.stance, rng);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * Rook follows the player's card. When it can win, it spends its cheapest
 * winning card; when it cannot, it sheds its weakest card. One time in
 * seven it plays a random card instead, so it never feels scripted.
 */
export function chooseFollowCard(state, youCard, rng) {
  const hand = state.rookHand;
  if (rng.chance(1 / 7)) return rng.pick(hand);
  const winners = [];
  let weakest = hand[0];
  for (const card of hand) {
    if (card.value < weakest.value) weakest = card;
    const element = card.pact ? bestPactElement(state, youCard) : card.element;
    const mine = powerOf({ ...card, element }, youCard.element, { stance: state.stance.actual });
    const yours = powerOf(youCard, element, { oath: state.oath });
    if (mine > yours) winners.push({ card, mine });
  }
  if (winners.length > 0) {
    winners.sort((a, b) => a.mine - b.mine);
    return winners[0].card;
  }
  return weakest;
}

/**
 * The element Rook gives a Pact wild. Following, it picks the element that
 * beats the player's card when it can; leading, it picks the element that
 * beats the player's Oath, since Oath cards are the ones the player leans on.
 */
export function bestPactElement(state, youCard) {
  if (youCard) {
    const beating = beatenBy(youCard.element);
    if (beating) return beating;
  }
  if (state.oath) {
    const beating = beatenBy(state.oath);
    if (beating) return beating;
  }
  return state.stance.actual;
}

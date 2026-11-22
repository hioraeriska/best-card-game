// Rook the Cinder Fox: the opponent AI for Ember Pact.
//
// Rook is meant to be readable and counterable. At the start of every trick
// Rook gathers its strength and shows an intent badge naming the element it
// is most likely to play. The badge tells the truth about seven times in
// ten: most tricks Rook really does play a card of the telegraphed element,
// and the rest of the time it bluffs with something else, so the badge is a
// lead, not a promise.

import { ELEMENT_ORDER, tableElement } from './deck.js';

const HINT_TRUE_CHANCE = 0.7;

// Pick the element Rook will telegraph: the element of the strongest card in
// its hand, so the hint names a real threat.
function hintElement(hand, rng) {
  let best = null;
  for (const card of hand) {
    if (!best || card.value > best.value) best = card;
  }
  if (!best) return ELEMENT_ORDER[0];
  return best.pact ? ELEMENT_ORDER[Math.floor(rng() * 4)] : best.element;
}

// Choose Rook's card for this trick and the hint it shows. The card is
// picked now, before the player plays, so the trick is simultaneous: Rook
// never reacts to the card the player just laid down.
export function chooseRookPlay(hand, rng) {
  const hint = hintElement(hand, rng);
  const ofHint = hand.filter((card) => tableElement(card) === hint);
  const roll = rng();
  if (roll < HINT_TRUE_CHANCE && ofHint.length > 0) {
    // Tell the truth: play a card of the hinted element. Rook does not
    // always lead with its strongest — it spends its strength across the
    // duel, so a player who reads the hint can still outplay it.
    const pick = ofHint[Math.floor(rng() * ofHint.length)];
    return { card: pick, hint, hintTrue: true };
  }
  // Bluff or conserve: play the weakest card that is NOT of the hinted
  // element, saving the strong hinted cards for later.
  const others = hand.filter((card) => tableElement(card) !== hint);
  const pool = others.length > 0 ? others : hand;
  let pick = pool[0];
  for (const card of pool) if (card.value < pick.value) pick = card;
  return { card: pick, hint, hintTrue: false };
}

// When Rook plays a Pact wild it names an element for it. It favours the
// element that beats the player's most common hand element when it can see
// the table, otherwise it picks at random.
export function choosePactElement(rng) {
  return ELEMENT_ORDER[Math.floor(rng() * ELEMENT_ORDER.length)];
}

// The autopilot that stages screenshot scenes and drives logic tests: pick
// the cheapest card that beats the telegraphed element, else the cheapest
// card in hand. A Pact wild takes the element that beats the hint.
export function autopilotPick(hand, hint) {
  const winners = hand.filter((card) => {
    const el = card.pact ? null : card.element;
    return el && beatsAgainst(el, hint);
  });
  const pool = winners.length > 0 ? winners : hand;
  let pick = pool[0];
  for (const card of pool) if (card.value < pick.value) pick = card;
  if (pick.pact) {
    const counter = counterElement(hint);
    return { card: pick, chosenElement: counter };
  }
  return { card: pick, chosenElement: null };
}

function beatsAgainst(mine, theirs) {
  const wheel = { ember: 'gale', gale: 'tide', tide: 'ember' };
  return wheel[mine] === theirs;
}

// The element that beats a given element on the wheel; Stone has no counter.
export function counterElement(element) {
  const counter = { gale: 'ember', tide: 'gale', ember: 'tide' };
  return counter[element] || 'ember';
}

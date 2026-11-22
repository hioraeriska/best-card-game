// Ember Pact deck: the four winds, values 1-9, plus four Pact wilds.
// Element wheel: Ember beats Gale, Gale beats Tide, Tide beats Ember.
// Stone is neutral — it beats nothing and nothing beats it.
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2482a', soft: '#ff7a4d', beats: 'gale' },
  gale: { name: 'Gale', color: '#2aa198', soft: '#5fd3c3', beats: 'tide' },
  tide: { name: 'Tide', color: '#2a6fd4', soft: '#6aa5f0', beats: 'ember' },
  stone: { name: 'Stone', color: '#8a7a5c', soft: '#b3a586', beats: null },
};
export const ELEMENT_ORDER = ['ember', 'gale', 'tide', 'stone'];

// Deterministic PRNG (mulberry32) so seeded games and screenshots replay.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 1;
export function makeCard(element, value, pact = false) {
  return { id: nextId++, element, value, pact };
}

export function buildDeck() {
  const cards = [];
  for (const el of ELEMENT_ORDER) {
    for (let v = 1; v <= 9; v++) cards.push(makeCard(el, v));
  }
  for (let i = 0; i < 4; i++) cards.push(makeCard('pact', 6, true));
  return cards;
}

export function shuffle(cards, rng) {
  const deck = cards.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

// True when element a beats element b on the wheel.
export function elementBeats(a, b) {
  if (!a || !b) return false;
  const el = ELEMENTS[a];
  return !!el && el.beats === b;
}

// The element that beats `el` (null when nothing beats it, i.e. Stone).
export function beatsElement(el) {
  for (const key of ELEMENT_ORDER) {
    if (ELEMENTS[key].beats === el) return key;
  }
  return null;
}

// A Pact wild counts as the element that beats the rival's card.
// Against Stone (or another Pact) it has no element at all.
export function effectiveElement(card, opponentCard) {
  if (!card.pact) return card.element;
  if (!opponentCard || opponentCard.pact) return null;
  return beatsElement(opponentCard.element);
}

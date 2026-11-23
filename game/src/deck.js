// The deck of Ember Pact: four elements, one wheel, and the Pact wilds.
//
// Elements are told apart by colour AND shape (glyph), never by text alone:
// Ember is a red flame, Gale a green swirl, Tide a blue drop, Stone a grey
// mountain. The wheel is Ember > Gale > Tide > Ember; Stone is neutral,
// beating nothing and beaten by nothing.

/** Element metadata, keyed by element id. */
export const ELEMENTS = {
  ember: { id: 'ember', name: 'Ember', glyph: '\u{1F525}', color: '#e5484d', soft: '#fdeceb', beats: 'gale' },
  gale: { id: 'gale', name: 'Gale', glyph: '\u{1F32A}\uFE0F', color: '#46a758', soft: '#e9f7ee', beats: 'tide' },
  tide: { id: 'tide', name: 'Tide', glyph: '\u{1F4A7}', color: '#3e63dd', soft: '#e8eefe', beats: 'ember' },
  stone: { id: 'stone', name: 'Stone', glyph: '\u26F0\uFE0F', color: '#8b8d98', soft: '#eef0f2', beats: null },
};

/** The four elements in wheel order. */
export const ELEMENT_ORDER = ['ember', 'gale', 'tide', 'stone'];

/** True when element a beats element b on the wheel. */
export function beats(a, b) {
  if (a === 'stone' || b === 'stone' || a === 'pact' || b === 'pact') return false;
  return ELEMENTS[a].beats === b;
}

/** The element that beats the given element, or null for Stone. */
export function beatenBy(element) {
  for (const id of ELEMENT_ORDER) {
    if (ELEMENTS[id].beats === element) return id;
  }
  return null;
}

/**
 * Build the 40-card deck: values 1-9 in each of the four elements, plus
 * four Pact wilds (value 6, element chosen when played).
 * A card is { uid, element, value, pact }.
 */
export function buildDeck() {
  const deck = [];
  let n = 0;
  for (const element of ELEMENT_ORDER) {
    for (let value = 1; value <= 9; value++) {
      deck.push({ uid: `c${n++}`, element, value, pact: false });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ uid: `c${n++}`, element: 'pact', value: 6, pact: true });
  }
  return deck;
}

/**
 * A card's power against a foe card's element.
 *   +3 when its element beats the foe's (the wheel)
 *   +2 when its element is the player's sworn Oath (oath, player's cards only)
 *   +1 when its element is Rook's favoured stance (stance, Rook's cards only)
 * A Pact wild uses the element chosen for it when played.
 */
export function powerOf(card, foeElement, { oath = null, stance = null } = {}) {
  let power = card.value;
  if (beats(card.element, foeElement)) power += 3;
  if (oath !== null && card.element === oath) power += 2;
  if (stance !== null && card.element === stance) power += 1;
  return power;
}

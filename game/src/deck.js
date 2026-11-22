// Deck, elements and trick power for Ember Pact.
// Four elements ride a wheel: Ember beats Gale, Gale beats Tide, Tide beats
// Ember. Stone is neutral: it never gains or grants the wheel bonus. Four
// Pact wilds sit outside the wheel until the player who plays one names
// their element.

// Element presentation: every element is told by colour AND a shape glyph,
// never by text alone.
export const ELEMENTS = {
  ember: { name: 'Ember', color: '#ff7a3c', deep: '#8f2f0e', glyph: 'flame' },
  gale: { name: 'Gale', color: '#4cc9d8', deep: '#0c6b78', glyph: 'swirl' },
  tide: { name: 'Tide', color: '#5b9bf5', deep: '#1c4d9e', glyph: 'wave' },
  stone: { name: 'Stone', color: '#e2ab45', deep: '#7d5a12', glyph: 'peak' },
  pact: { name: 'Pact', color: '#c78bff', deep: '#5b21a8', glyph: 'star' },
};

export const ELEMENT_ORDER = ['ember', 'gale', 'tide', 'stone'];

// The wheel: BEATS[a] is the element a defeats.
const BEATS = { ember: 'gale', gale: 'tide', tide: 'ember' };

export function beats(attacker, defender) {
  return BEATS[attacker] === defender;
}

export const WHEEL_BONUS = 3;
export const PACT_VALUE = 5;
export const HAND_SIZE = 5;
export const START_LIFE = 30;

// Small deterministic RNG so logic tests and screenshot scenes replay.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build the 40-card pact deck: values 1-9 in each element, plus 4 wilds.
export function buildDeck() {
  const cards = [];
  let id = 0;
  for (const element of ELEMENT_ORDER) {
    for (let value = 1; value <= 9; value += 1) {
      cards.push({ id, element, value, pact: false });
      id += 1;
    }
  }
  for (let wild = 0; wild < 4; wild += 1) {
    cards.push({ id, element: 'pact', value: PACT_VALUE, pact: true });
    id += 1;
  }
  return cards;
}

export function shuffle(deck, rng) {
  const pile = deck.slice();
  for (let i = pile.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const held = pile[i];
    pile[i] = pile[j];
    pile[j] = held;
  }
  return pile;
}

// A card's fighting strength against a foe: its value, plus the wheel bonus
// when its element beats the foe's. A Pact card fights with the element its
// player chose for it (chosenElement), or its base value with no bonus when
// no element was chosen yet.
export function cardPower(card, foeCard) {
  const mine = card.pact ? card.chosenElement || null : card.element;
  const theirs = foeCard.pact ? foeCard.chosenElement || null : foeCard.element;
  if (mine && theirs && beats(mine, theirs)) return card.value + WHEEL_BONUS;
  return card.value;
}

// The element a card counts as once it is on the table.
export function tableElement(card) {
  return card.pact ? card.chosenElement || 'pact' : card.element;
}

// Inline SVG glyphs, one shape per element, drawn in the element's colour.
export function glyphSvg(kind, size) {
  const s = size || 44;
  const shapes = {
    flame:
      '<path d="M22 4 C26 12 34 16 34 27 A12 12 0 1 1 10 27 C10 20 15 17 17 12 C19 16 21 17 22 14 C23 10 22 7 22 4 Z" fill="currentColor"/>',
    swirl:
      '<path d="M8 14 A14 14 0 0 1 34 10 A10 10 0 0 1 14 22 A7 7 0 0 0 30 24 A5 5 0 0 1 20 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    wave:
      '<path d="M4 16 Q11 8 18 16 T32 16 T44 16" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M4 28 Q11 20 18 28 T32 28 T44 28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
    peak:
      '<path d="M6 36 L18 12 L26 26 L31 18 L42 36 Z" fill="currentColor"/>',
    star:
      '<path d="M24 4 L29 17 L43 17 L32 26 L36 40 L24 31 L12 40 L16 26 L5 17 L19 17 Z" fill="currentColor"/>',
  };
  const body = shapes[kind] || shapes.star;
  return `<svg viewBox="0 0 48 48" width="${s}" height="${s}" aria-hidden="true">${body}</svg>`;
}

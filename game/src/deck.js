// deck.js — the Ember Pact deck: 4 elements x values 1-9, 36 cards.
// One job: build, shuffle and draw cards. No game rules live here.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  // The four elements. Each has a glyph, a colour and a short name.
  // Colour + glyph + name together: suits are never told by text alone.
  const ELEMENTS = {
    EMBER: { key: 'EMBER', name: 'Ember', glyph: '🔥', color: '#e8491d', dark: '#8f1d05' },
    GALE: { key: 'GALE', name: 'Gale', glyph: '🌪️', color: '#e8b400', dark: '#7a5c00' },
    TIDE: { key: 'TIDE', name: 'Tide', glyph: '💧', color: '#2e86de', dark: '#123f73' },
    STONE: { key: 'STONE', name: 'Stone', glyph: '🪨', color: '#8a8d93', dark: '#43464b' },
  };
  const ELEMENT_KEYS = ['EMBER', 'GALE', 'TIDE', 'STONE'];

  // The advantage cycle: Ember burns Gale, Gale scatters Tide, Tide drowns
  // Ember. Stone stands outside the cycle: it beats nothing and nothing
  // beats it, so a Stone card always fights on its bare value.
  const BEATS = { EMBER: 'GALE', GALE: 'TIDE', TIDE: 'EMBER', STONE: null };

  // True when element a has advantage over element b.
  function beats(a, b) {
    return BEATS[a] === b;
  }

  // The element that beats a given element (its counter), or null for Stone.
  function counterOf(element) {
    for (const key of ELEMENT_KEYS) {
      if (BEATS[key] === element) return key;
    }
    return null;
  }

  // Build a fresh 36-card deck. ids are stable: "EMBER-7" and so on.
  function buildDeck() {
    const deck = [];
    for (const key of ELEMENT_KEYS) {
      for (let value = 1; value <= 9; value++) {
        deck.push({ id: key + '-' + value, element: key, value });
      }
    }
    return deck;
  }

  // Draw n cards from the top of the deck (deck is a stack: pop from end).
  function drawCards(deck, n) {
    const drawn = [];
    for (let i = 0; i < n && deck.length > 0; i++) drawn.push(deck.pop());
    return drawn;
  }

  NS.ELEMENTS = ELEMENTS;
  NS.ELEMENT_KEYS = ELEMENT_KEYS;
  NS.beats = beats;
  NS.counterOf = counterOf;
  NS.buildDeck = buildDeck;
  NS.drawCards = drawCards;
})();

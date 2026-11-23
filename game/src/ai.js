// ai.js — Rook the Cinder Fox. One job: choose Rook's card each trick.
// Rook is readable and counterable: it declares a scheme each hand, plays
// toward it honestly ~70% of the time, and can be punished by the counter.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  // Rook leads a trick (used when Rook wins the previous trick and the
  // table lets it lead; the game currently always lets the player lead,
  // so this also drives Rook's opening pressure in shot staging).
  function rookLead(state) {
    const hand = state.rookHand;
    if (hand.length === 0) return null;
    const scheme = state.scheme;
    // Honest play: lean into the declared scheme element.
    if (scheme && scheme.honest) {
      const onScheme = hand.filter((c) => c.element === scheme.element);
      if (onScheme.length > 0 && state.next() < 0.75) {
        return strongest(onScheme);
      }
    }
    // Otherwise lead a mid-strength card, keeping the big ones in reserve.
    const sorted = hand.slice().sort((a, b) => a.value - b.value);
    return sorted[Math.min(sorted.length - 1, 1 + Math.floor(state.next() * Math.max(1, sorted.length - 2)))];
  }

  // Rook answers the player's lead card. Returns the card it plays.
  function rookAnswer(state, playerCard) {
    const hand = state.rookHand;
    if (hand.length === 0) return null;
    const scheme = state.scheme;

    // Even a fox misreads the table: one answer in five is a plain mistake,
    // a random card instead of the best one. That is the player's opening.
    if (state.next() < 0.2) {
      return takeFromHand(state, hand[Math.floor(state.next() * hand.length)]);
    }

    // Bluff: sometimes Rook plays its scheme element even when a better
    // answer exists, keeping the declaration readable but not certain.
    if (scheme && scheme.honest && state.next() < 0.3) {
      const onScheme = hand.filter((c) => c.element === scheme.element);
      if (onScheme.length > 0) return takeFromHand(state, strongest(onScheme));
    }

    // Try to win with the cheapest card that beats the lead.
    const winners = hand.filter((c) => NS.cardPower(c, playerCard) > NS.cardPower(playerCard, c));
    if (winners.length > 0) {
      // Prefer a winning card on the scheme element when one exists.
      if (scheme && scheme.honest) {
        const schemeWinners = winners.filter((c) => c.element === scheme.element);
        if (schemeWinners.length > 0) return takeFromHand(state, weakest(schemeWinners));
      }
      return takeFromHand(state, weakest(winners));
    }

    // Cannot win: sacrifice the weakest card, unless the scheme is hot
    // and the player is about to break it — then spend a scheme card
    // to keep the chain alive.
    if (scheme && scheme.honest && NS.beats(playerCard.element, scheme.element)) {
      const onScheme = hand.filter((c) => c.element === scheme.element);
      if (onScheme.length > 0 && state.next() < 0.5) return takeFromHand(state, weakest(onScheme));
    }
    return takeFromHand(state, weakest(hand));
  }

  // Remove a card object from Rook's hand and return it.
  function takeFromHand(state, card) {
    const i = state.rookHand.indexOf(card);
    if (i >= 0) state.rookHand.splice(i, 1);
    return card;
  }

  function weakest(cards) {
    return cards.slice().sort((a, b) => a.value - b.value)[0];
  }

  function strongest(cards) {
    return cards.slice().sort((a, b) => b.value - a.value)[0];
  }

  NS.rookLead = rookLead;
  NS.rookAnswer = rookAnswer;
})();

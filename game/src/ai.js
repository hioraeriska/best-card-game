// Rook the Cinder Fox — the opponent brain and the telegraph hint.
// Rook picks its card with simple heuristics, and before you play it lets
// slip a hint about the element it favours: true ~70% of the time, a bluff
// ~30%. Readable, counterable, never random noise.
import { beatsElement, ELEMENT_ORDER } from './deck.js';

// Pick Rook's face-down card for this trick.
// memory.playerFavElement is the element you have played most so far.
export function chooseRookCard(hand, memory, rng) {
  if (hand.length === 0) return null;
  const sorted = hand.slice().sort((a, b) => a.value - b.value);
  const roll = rng();
  const fav = memory && memory.playerFavElement;
  if (fav && roll < 0.35) {
    const counter = beatsElement(fav);
    const counters = sorted.filter((c) => !c.pact && c.element === counter);
    if (counters.length) return counters[0];
  }
  // Usually play low and save the big cards; sometimes go big.
  const low = sorted.filter((c) => c.value <= 5);
  if (roll < 0.55 && low.length) return low[Math.floor(rng() * low.length)];
  return sorted[Math.floor(rng() * sorted.length)];
}

// The telegraph: name the element Rook is about to favour — truthfully
// most of the time, a bluff the rest. A Pact card has no element to hint.
export function makeTelegraph(rookCard, rng) {
  if (!rookCard || rookCard.pact) {
    return { element: null, bluff: false, text: 'Rook gathers something unseen…' };
  }
  if (rng() < 0.7) {
    return { element: rookCard.element, bluff: false, text: '' };
  }
  const others = ELEMENT_ORDER.filter((e) => e !== rookCard.element);
  return { element: others[Math.floor(rng() * others.length)], bluff: true, text: '' };
}

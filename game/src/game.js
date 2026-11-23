// game.js — the rules of Ember Pact. One job: pure match state and tricks.
// No DOM, no sound, no randomness of its own: every random choice comes
// from the seeded next() the match carries, so a match replays from a seed.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  const HAND_SIZE = 5;
  const HAND_LIMIT = 7;
  const START_LIFE = 30;
  const ADVANTAGE_BONUS = 3;
  const PACT_BONUS_DAMAGE = 6;
  const PACT_HEAL = 4;
  const SCHEME_BREAK_BONUS = 3;
  const SCHEME_EVERY_TRICKS = 4;
  const MAX_TRICK_DAMAGE = 8;

  // A card's fighting power against a foe's card: value +3 on advantage.
  function cardPower(card, foeCard) {
    return card.value + (NS.beats(card.element, foeCard.element) ? ADVANTAGE_BONUS : 0);
  }

  // Start a fresh match. seed drives the shuffle, the schemes and the AI.
  function newMatch(seed) {
    const next = NS.mulberry32(seed);
    const deck = NS.shuffle(NS.buildDeck(), next);
    const state = {
      seed,
      next,
      phase: 'title', // title | playing | won | lost
      trick: 0,
      deck,
      discard: [],
      playerHand: NS.drawCards(deck, HAND_SIZE),
      rookHand: NS.drawCards(deck, HAND_SIZE),
      playerLife: START_LIFE,
      rookLife: START_LIFE,
      leader: 'player', // who leads the next trick; the winner leads on
      playerPlayed: null,
      rookPlayed: null,
      lastWinner: null, // 'player' | 'rook' | null
      lastWinElement: null,
      chain: 0,
      playerChainBest: 0,
      rookChainBest: 0,
      playerPact: [], // elements the player has won a trick with
      rookPact: [],
      playerPacts: 0,
      rookPacts: 0,
      playerTricks: 0,
      rookTricks: 0,
      scheme: null, // { element, counter, honest, tricksLeft }
      schemeBreaks: 0,
      log: [],
      lastTrick: null, // detail of the most recent trick, for the renderer
    };
    state.scheme = newScheme(state);
    return state;
  }

  // Rook declares a scheme: the element it is building toward, and the
  // element that counters it. Honest ~70% of the time; a bluffed scheme
  // is a lie the player can still punish by playing the counter.
  function newScheme(state) {
    const element = NS.pick(NS.ELEMENT_KEYS, state.next);
    const honest = state.next() < 0.7;
    return { element, counter: NS.counterOf(element), honest, tricksLeft: SCHEME_EVERY_TRICKS };
  }

  // Replenish the deck from the discard pile when it runs dry.
  function replenish(state) {
    if (state.deck.length === 0 && state.discard.length > 0) {
      state.deck = NS.shuffle(state.discard.splice(0), state.next);
    }
  }

  // Each side draws back up toward a full hand after a trick.
  function drawUp(state) {
    replenish(state);
    while (state.playerHand.length < HAND_SIZE && state.playerHand.length < HAND_LIMIT && state.deck.length > 0) {
      state.playerHand.push(state.deck.pop());
    }
    replenish(state);
    while (state.rookHand.length < HAND_SIZE && state.rookHand.length < HAND_LIMIT && state.deck.length > 0) {
      state.rookHand.push(state.deck.pop());
    }
  }

  // Remove a card from a hand by id; returns the card or null.
  function takeCard(hand, id) {
    const i = hand.findIndex((c) => c.id === id);
    return i < 0 ? null : hand.splice(i, 1)[0];
  }

  // Play one trick. Whoever leads plays first; the winner leads the next.
  // When Rook leads, it plays blind before the player answers.
  // Returns the trick record, or null when the trick cannot be played.
  function playTrick(state, playerCardId) {
    if (state.phase !== 'playing') return null;
    const playerCard = takeCard(state.playerHand, playerCardId);
    if (!playerCard) return null;
    let rookCard;
    if (state.leader === 'rook') rookCard = NS.rookLead(state);
    else rookCard = NS.rookAnswer(state, playerCard);
    if (!rookCard) {
      state.playerHand.push(playerCard);
      return null;
    }
    state.playerPlayed = playerCard;
    state.rookPlayed = rookCard;
    state.trick++;

    const pp = cardPower(playerCard, rookCard);
    const rp = cardPower(rookCard, playerCard);
    let winner = 'tie';
    if (pp > rp) winner = 'player';
    else if (rp > pp) winner = 'rook';

    const record = {
      trick: state.trick,
      playerCard,
      rookCard,
      playerPower: pp,
      rookPower: rp,
      winner,
      damage: 0,
      chain: 0,
      chainBonus: 0,
      pactBurst: false,
      schemeBroken: false,
      note: '',
    };

    if (winner !== 'tie') {
      // Chain: consecutive tricks won with the same element multiply the hurt.
      const winCard = winner === 'player' ? playerCard : rookCard;
      if (winner === state.lastWinner && winCard.element === state.lastWinElement) state.chain++;
      else state.chain = 1;
      record.chain = state.chain;
      record.chainBonus = state.chain - 1;

      const margin = Math.abs(pp - rp);
      let damage = Math.max(1, margin) + record.chainBonus;

      // Scheme break: win with the counter to Rook's declared element.
      if (winner === 'player' && state.scheme && NS.beats(playerCard.element, state.scheme.element)) {
        damage += SCHEME_BREAK_BONUS;
        record.schemeBroken = true;
        state.schemeBreaks++;
        state.chain = 1; // breaking the scheme also breaks Rook's chain
      }

      // Pact: win a trick with every element and the pact bursts.
      const pact = winner === 'player' ? state.playerPact : state.rookPact;
      const winElement = winner === 'player' ? playerCard.element : rookCard.element;
      if (!pact.includes(winElement)) pact.push(winElement);
      if (pact.length === NS.ELEMENT_KEYS.length) {
        damage += PACT_BONUS_DAMAGE;
        record.pactBurst = true;
        if (winner === 'player') {
          state.playerPacts++;
          state.playerLife = Math.min(START_LIFE, state.playerLife + PACT_HEAL);
        } else {
          state.rookPacts++;
          state.rookLife = Math.min(START_LIFE, state.rookLife + PACT_HEAL);
        }
        pact.length = 0;
      }

      // One trick can hurt at most so much: no single-card blowout.
      damage = Math.min(damage, MAX_TRICK_DAMAGE);
      record.damage = damage;
      if (winner === 'player') {
        state.rookLife -= damage;
        state.playerTricks++;
        state.playerChainBest = Math.max(state.playerChainBest, state.chain);
        state.lastWinner = 'player';
        state.lastWinElement = playerCard.element;
      } else {
        state.playerLife -= damage;
        state.rookTricks++;
        state.rookChainBest = Math.max(state.rookChainBest, state.chain);
        state.lastWinner = 'rook';
        state.lastWinElement = rookCard.element;
      }
    } else {
      state.chain = 0;
      state.lastWinner = null;
      state.lastWinElement = null;
    }

    // The trick's winner leads the next trick; a tie keeps the lead.
    if (winner !== 'tie') state.leader = winner;

    // Scheme ages: a fresh declaration every few tricks.
    if (state.scheme) {
      state.scheme.tricksLeft--;
      if (state.scheme.tricksLeft <= 0 || record.schemeBroken) state.scheme = newScheme(state);
    }

    state.discard.push(playerCard, rookCard);
    state.playerPlayed = playerCard;
    state.rookPlayed = rookCard;
    state.lastTrick = record;
    state.log.push(describeTrick(record));
    if (state.log.length > 6) state.log.shift();

    drawUp(state);
    if (state.rookLife <= 0) state.phase = 'won';
    else if (state.playerLife <= 0) state.phase = 'lost';
    return record;
  }

  // One human-readable line for the trick log.
  function describeTrick(r) {
    const who = r.winner === 'player' ? 'You take it' : r.winner === 'rook' ? 'Rook takes it' : 'A dead tie';
    const bits = [who + ' — ' + r.playerPower + ' vs ' + r.rookPower];
    if (r.chain > 1) bits.push('Chain ×' + r.chain);
    if (r.schemeBroken) bits.push('Scheme broken +' + SCHEME_BREAK_BONUS);
    if (r.pactBurst) bits.push('PACT BURST +' + PACT_BONUS_DAMAGE);
    if (r.damage > 0) bits.push(r.damage + ' damage');
    return bits.join(' · ');
  }

  // The player's legal moves right now: every card in hand while playing.
  function legalMoves(state) {
    if (state.phase !== 'playing') return [];
    return state.playerHand.map((c) => c.id);
  }

  NS.HAND_SIZE = HAND_SIZE;
  NS.HAND_LIMIT = HAND_LIMIT;
  NS.START_LIFE = START_LIFE;
  NS.ADVANTAGE_BONUS = ADVANTAGE_BONUS;
  NS.PACT_BONUS_DAMAGE = PACT_BONUS_DAMAGE;
  NS.PACT_HEAL = PACT_HEAL;
  NS.SCHEME_BREAK_BONUS = SCHEME_BREAK_BONUS;
  NS.cardPower = cardPower;
  NS.newMatch = newMatch;
  NS.newScheme = newScheme;
  NS.playTrick = playTrick;
  NS.legalMoves = legalMoves;
})();

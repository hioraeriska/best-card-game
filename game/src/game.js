// The rules engine for Ember Pact: state, tricks, Surge, chains and the log.
// This file knows nothing about the DOM; render.js draws whatever it holds,
// and shots.js / logic tests drive it headlessly.
//
// A trick: both sides play one card. Power is value + 3 on a wheel advantage.
// The trick winner deals damage equal to the power difference (at least 1).
// Two rules stack on top of that:
//   Chain  — win a trick with the same element as the previous trick's
//            winning element and the win banks +1 chain damage.
//   Surge  — win two tricks in a row and Surge arms: the next win deals +2
//            damage, then Surge is spent. Losing a trick disarms it.
// A Pact wild is played with an element its player chose, so it can join a
// chain or ride the wheel on purpose.

import {
  ELEMENTS,
  HAND_SIZE,
  START_LIFE,
  buildDeck,
  cardPower,
  mulberry32,
  shuffle,
  tableElement,
} from './deck.js';
import { autopilotPick, choosePactElement, chooseRookPlay } from './ai.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_PICK = 'pick';
export const PHASE_OVER = 'over';

export function newGame(seed) {
  const rng = mulberry32(seed);
  const deck = shuffle(buildDeck(), rng);
  const game = {
    seed,
    rng,
    phase: PHASE_TITLE,
    playerLife: START_LIFE,
    rookLife: START_LIFE,
    playerDeck: deck.slice(0, 20),
    rookDeck: deck.slice(20),
    playerHand: [],
    rookHand: [],
    trick: null,
    trickCount: 0,
    lastWinElement: null,
    chainCount: 0,
    playerStreak: 0,
    rookStreak: 0,
    playerSurge: false,
    rookSurge: false,
    rookHint: null,
    pendingPact: null,
    winner: null,
    lastDamage: null,
    log: [],
  };
  dealHands(game);
  return game;
}

function dealHands(game) {
  for (let i = 0; i < HAND_SIZE; i += 1) {
    game.playerHand.push(game.playerDeck.pop());
    game.rookHand.push(game.rookDeck.pop());
  }
}

export function startGame(game) {
  game.phase = PHASE_PLAY;
  game.log.push('The pact is sealed. Rook the Cinder Fox shuffles in.');
  beginTrick(game);
  return game;
}

// Open a trick: Rook picks its card (and its hint) now, before the player
// chooses, so the trick is simultaneous.
export function beginTrick(game) {
  if (game.phase !== PHASE_PLAY) return;
  if (game.playerHand.length === 0 || game.rookHand.length === 0) {
    finishByExhaustion(game);
    return;
  }
  const play = chooseRookPlay(game.rookHand, game.rng);
  game.rookHint = play.hint;
  game.trick = {
    rookCard: play.card,
    rookHintTrue: play.hintTrue,
    playerCard: null,
    result: null,
  };
}

// The player lays a card. A Pact wild pauses the trick for an element pick.
export function playPlayerCard(game, handIndex, chosenElement) {
  if (game.phase !== PHASE_PLAY || !game.trick || game.trick.playerCard) return null;
  const card = game.playerHand[handIndex];
  if (!card) return null;
  if (card.pact && !chosenElement) {
    game.pendingPact = handIndex;
    game.phase = PHASE_PICK;
    return { needsPick: true };
  }
  if (card.pact) card.chosenElement = chosenElement;
  game.playerHand.splice(handIndex, 1);
  game.trick.playerCard = card;
  game.pendingPact = null;
  return resolveTrick(game);
}

export function cancelPactPick(game) {
  if (game.phase !== PHASE_PICK) return;
  game.pendingPact = null;
  game.phase = PHASE_PLAY;
}

function resolveTrick(game) {
  const trick = game.trick;
  const rookCard = trick.rookCard;
  if (rookCard.pact) rookCard.chosenElement = choosePactElement(game.rng);
  const playerPower = cardPower(trick.playerCard, rookCard);
  const rookPower = cardPower(rookCard, trick.playerCard);
  const playerEl = tableElement(trick.playerCard);
  const rookEl = tableElement(rookCard);

  let winner;
  let damage;
  let notes = [];
  if (playerPower === rookPower) {
    // A tied trick deals no damage and breaks both streaks.
    winner = 'tie';
    damage = 0;
    game.playerStreak = 0;
    game.rookStreak = 0;
    game.playerSurge = false;
    game.rookSurge = false;
    game.lastWinElement = null;
    notes.push('Dead even — no damage, both streaks broken.');
  } else {
    winner = playerPower > rookPower ? 'player' : 'rook';
    const winEl = winner === 'player' ? playerEl : rookEl;
    damage = Math.abs(playerPower - rookPower);
    if (damage < 1) damage = 1;
    // Chain: same winning element as the last trick's winner.
    if (game.lastWinElement && game.lastWinElement === winEl) {
      damage += 1;
      game.chainCount += 1;
      notes.push(`Chain ${game.chainCount} — ${ELEMENTS[winEl].name} strikes again (+1).`);
    } else {
      game.chainCount = 0;
    }
    game.lastWinElement = winEl;
    // Surge: armed by two straight wins, spent on the next one.
    if (winner === 'player') {
      if (game.playerSurge) {
        damage += 2;
        game.playerSurge = false;
        game.playerStreak = 0;
        notes.push('Surge unleashed (+2).');
      } else {
        game.playerStreak += 1;
        if (game.playerStreak >= 2) game.playerSurge = true;
      }
      game.rookStreak = 0;
      game.rookSurge = false;
      game.rookLife -= damage;
    } else {
      if (game.rookSurge) {
        damage += 2;
        game.rookSurge = false;
        game.rookStreak = 0;
        notes.push('Rook\'s Surge unleashed (+2).');
      } else {
        game.rookStreak += 1;
        if (game.rookStreak >= 2) game.rookSurge = true;
      }
      game.playerStreak = 0;
      game.playerSurge = false;
      game.playerLife -= damage;
    }
  }

  const result = {
    winner,
    damage,
    playerPower,
    rookPower,
    playerElement: playerEl,
    rookElement: rookEl,
    notes,
  };
  trick.result = result;
  game.trickCount += 1;
  game.lastDamage = { winner, damage };
  const pName = ELEMENTS[playerEl].name;
  const rName = ELEMENTS[rookEl].name;
  if (winner === 'tie') {
    game.log.push(`Trick ${game.trickCount}: ${pName} ${playerPower} meets ${rName} ${rookPower} — a tie.`);
  } else {
    const who = winner === 'player' ? 'You take' : 'Rook takes';
    game.log.push(
      `Trick ${game.trickCount}: ${pName} ${playerPower} vs ${rName} ${rookPower} — ${who} the trick, ${damage} damage.`,
    );
  }
  for (const note of notes) game.log.push(note);
  if (game.playerLife <= 0 || game.rookLife <= 0) {
    game.winner = game.rookLife <= 0 ? 'player' : 'rook';
    game.phase = PHASE_OVER;
    game.log.push(game.winner === 'player' ? 'Rook\'s ember gutters out. You win the pact!' : 'Your ember gutters out. Rook wins the pact.');
    return result;
  }
  drawUp(game);
  return result;
}

// Refill each hand toward five cards after a trick.
function drawUp(game) {
  while (game.playerHand.length < HAND_SIZE && game.playerDeck.length > 0) {
    game.playerHand.push(game.playerDeck.pop());
  }
  while (game.rookHand.length < HAND_SIZE && game.rookDeck.length > 0) {
    game.rookHand.push(game.rookDeck.pop());
  }
  game.trick = null;
  beginTrick(game);
}

// No cards left anywhere: the higher life wins the pact.
function finishByExhaustion(game) {
  game.phase = PHASE_OVER;
  if (game.playerLife === game.rookLife) {
    game.winner = 'player';
    game.log.push('Decks spent, lives level — the pact favours the bold. You win!');
  } else {
    game.winner = game.playerLife > game.rookLife ? 'player' : 'rook';
    game.log.push(game.winner === 'player' ? 'Decks spent — your ember burns brighter. You win!' : 'Decks spent — Rook\'s ember burns brighter. Rook wins.');
  }
}

// A full headless game, used by logic tests and screenshot staging. The
// autopilot plays the player's hand; Rook plays by its own rules.
export function playFullGame(seed, playerChooses) {
  const game = newGame(seed);
  startGame(game);
  const choose = playerChooses || null;
  let guard = 0;
  while (game.phase === PHASE_PLAY && guard < 200) {
    guard += 1;
    const pick = choose
      ? choose(game)
      : defaultPlayerPick(game);
    if (!pick) break;
    playPlayerCard(game, pick.index, pick.chosenElement);
  }
  return game;
}

function defaultPlayerPick(game) {
  if (!game.trick || game.playerHand.length === 0) return null;
  const pick = autopilotPick(game.playerHand, game.rookHint);
  const index = game.playerHand.indexOf(pick.card);
  return { index, chosenElement: pick.chosenElement };
}

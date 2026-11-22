// The table: every pixel of Ember Pact, drawn as DOM.
// renderGame rebuilds #app from the game state after each move. Cards are
// big, values are large numerals, and every element shows its colour and its
// shape glyph together. The trick zone keeps Rook's card face down until the
// player has played, because the trick is simultaneous.

import { ELEMENTS, ELEMENT_ORDER, beats, glyphSvg, tableElement } from './deck.js';
import { PHASE_OVER, PHASE_PICK, PHASE_PLAY, PHASE_TITLE } from './game.js';

function esc(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// One face-up card. `counter` marks a card that beats Rook's telegraphed
// element, so the player can see the counter at a glance.
export function cardHtml(card, opts) {
  const o = opts || {};
  const el = tableElement(card);
  const def = ELEMENTS[el];
  const classes = ['card', `el-${el}`];
  if (card.pact) classes.push('pact');
  if (o.counter) classes.push('counter-glow');
  if (o.played) classes.push('played');
  if (o.small) classes.push('small');
  const delay = o.delay ? ` style="animation-delay:${o.delay}ms"` : '';
  const click = o.index !== undefined ? ` data-hand="${o.index}"` : '';
  const tag = o.index !== undefined ? 'button' : 'div';
  const label = card.pact ? 'Pact wild' : `${def.name} ${card.value}`;
  return `<${tag} class="${classes.join(' ')}"${delay}${click} aria-label="${esc(label)}">`
    + `<span class="card-value">${card.value}</span>`
    + `<span class="card-glyph">${glyphSvg(def.glyph, o.small ? 30 : 52)}</span>`
    + `<span class="card-name">${card.pact ? 'PACT' : def.name.toUpperCase()}</span>`
    + (o.power !== undefined ? `<span class="card-power">Power ${o.power}</span>` : '')
    + `</${tag}>`;
}

function cardBackHtml() {
  return '<div class="card back" aria-hidden="true"><span class="back-glyph">'
    + glyphSvg('flame', 40) + '</span><span class="back-name">ROOK</span></div>';
}

function lifeHtml(label, life, max, side) {
  const shown = Math.max(0, life);
  const pct = Math.max(0, Math.min(100, (life / max) * 100));
  return `<div class="life ${side}"><span class="life-label">${label}</span>`
    + `<span class="life-num">${shown}</span>`
    + `<span class="life-bar"><span class="life-fill" style="width:${pct}%"></span></span></div>`;
}

function wheelHtml() {
  const chain = ['ember', 'gale', 'tide'];
  const bits = chain.map((el, i) => {
    const next = chain[(i + 1) % chain.length];
    return `<span class="wheel-step"><span class="wheel-glyph" style="color:${ELEMENTS[el].color}">${glyphSvg(ELEMENTS[el].glyph, 30)}</span>`
      + `<span class="wheel-name">${ELEMENTS[el].name}</span></span>`
      + `<span class="wheel-arrow">&gt;</span>`;
  }).join('');
  return `<div class="wheel">${bits}<span class="wheel-note">Stone is neutral</span></div>`;
}

function titleHtml() {
  return `<section class="screen title-screen">
    <p class="eyebrow">A DUEL OF THE FOUR WINDS</p>
    <h1>EMBER<br>PACT</h1>
    <p class="tagline">You against Rook the Cinder Fox. Thirty life each, one pact, no mercy.</p>
    ${wheelHtml()}
    <ul class="rules">
      <li>Each trick, both sides play a card. Power is value +3 on a wheel advantage.</li>
      <li>The trick winner deals damage equal to the power gap (at least 1).</li>
      <li>Win twice in a row to arm <b>Surge</b> (+2 damage on your next win). Win with the same element twice running to bank a <b>Chain</b> (+1).</li>
      <li><b>Pact wilds</b> let you choose their element when you play them.</li>
      <li>Watch Rook's gathering badge — it names the element Rook is most likely to play. Cards that beat it glow.</li>
    </ul>
    <button class="big-btn" data-action="start">Begin the duel</button>
    <p class="hint">Click a card to play it &middot; keys 1&ndash;5 play your hand &middot; M mutes sound</p>
  </section>`;
}

function tableHtml(game) {
  const hint = game.rookHint ? ELEMENTS[game.rookHint] : null;
  const trick = game.trick;
  const result = trick && trick.result ? trick.result : null;

  let rookSlot;
  if (!trick) {
    rookSlot = '<div class="trick-slot empty">—</div>';
  } else if (!trick.playerCard) {
    rookSlot = '<div class="trick-slot"><div class="card back chosen" aria-label="Rook has chosen a card"><span class="back-glyph">'
      + glyphSvg('flame', 40) + '</span><span class="back-name">CHOSEN</span></div>'
      + '<span class="slot-label">Rook</span></div>';
  } else {
    rookSlot = '<div class="trick-slot">' + cardHtml(trick.rookCard, { played: true, power: result ? result.rookPower : undefined })
      + '<span class="slot-label">Rook</span></div>';
  }

  let playerSlot;
  if (!trick || !trick.playerCard) {
    playerSlot = '<div class="trick-slot empty"><span class="slot-prompt">Play a card</span></div>';
  } else {
    playerSlot = '<div class="trick-slot">' + cardHtml(trick.playerCard, { played: true, power: result ? result.playerPower : undefined })
      + '<span class="slot-label">You</span></div>';
  }

  let banner = '';
  if (result) {
    if (result.winner === 'tie') {
      banner = '<div class="banner tie">Dead even — no damage</div>';
    } else if (result.winner === 'player') {
      banner = `<div class="banner win">You take the trick &middot; ${result.damage} damage</div>`;
    } else {
      banner = `<div class="banner lose">Rook takes the trick &middot; ${result.damage} damage</div>`;
    }
    for (const note of result.notes) banner += `<div class="banner note">${esc(note)}</div>`;
  }

  const damagePop = game.lastDamage && result
    ? `<span class="damage-pop ${game.lastDamage.winner === 'player' ? 'to-rook' : 'to-player'}">-${game.lastDamage.damage}</span>`
    : '';

  const handHtml = game.playerHand.map((card, i) => {
    const el = tableElement(card);
    const counter = hint && !card.pact && beats(el, game.rookHint);
    const pactCounter = card.pact;
    return cardHtml(card, { index: i, counter: counter || pactCounter, delay: i * 60 });
  }).join('');

  const rookBacks = game.rookHand.map(() => cardBackHtml()).join('');

  const surgeBadge = game.playerSurge
    ? '<span class="badge surge">SURGE ARMED +2</span>' : '';
  const rookSurgeBadge = game.rookSurge
    ? '<span class="badge surge rook-surge">ROOK SURGE ARMED</span>' : '';
  const chainBadge = game.chainCount > 0
    ? `<span class="badge chain">CHAIN x${game.chainCount} &middot; ${ELEMENTS[game.lastWinElement].name}</span>` : '';

  const logHtml = game.log.slice(-4).map((line) => `<li>${esc(line)}</li>`).join('');

  return `<section class="screen table-screen">
    <header class="table-head">
      <span class="brand">EMBER PACT</span>
      <span class="trick-count">Trick ${game.trickCount + 1}</span>
      <button class="mute-btn" data-action="mute" aria-label="Mute sound">${game.muted ? 'Sound off' : 'Sound on'}</button>
    </header>
    <div class="opponent-row">
      <div class="foe">
        <span class="foe-avatar">${glyphSvg('flame', 44)}</span>
        <span class="foe-name">ROOK<br><small>the Cinder Fox</small></span>
      </div>
      ${lifeHtml('ROOK', game.rookLife, 30, 'rook')}
      <div class="intent">
        <span class="intent-label">Rook is gathering</span>
        <span class="intent-el" style="color:${hint ? hint.color : '#ccc'}">${hint ? glyphSvg(hint.glyph, 30) : ''}<b>${hint ? hint.name : '?'}</b></span>
        <span class="intent-note">likely &mdash; 7 in 10</span>
      </div>
      ${surgeBadge}${rookSurgeBadge}${chainBadge}
    </div>
    <div class="rook-hand">${rookBacks}</div>
    <div class="trick-zone">${playerSlot}<div class="versus">VS</div>${rookSlot}${damagePop}</div>
    ${banner}
    <div class="player-row">
      ${lifeHtml('YOU', game.playerLife, 30, 'player')}
      <span class="deck-count">Deck: ${game.playerDeck.length} &middot; Rook deck: ${game.rookDeck.length}</span>
    </div>
    <div class="player-hand">${handHtml}</div>
    <p class="play-hint">Click a card to play it. Glowing cards beat Rook's gathered element.</p>
    <ul class="log">${logHtml}</ul>
  </section>`;
}

function pickHtml(game) {
  const card = game.playerHand[game.pendingPact];
  const buttons = ELEMENT_ORDER.map((el) => {
    const def = ELEMENTS[el];
    return `<button class="pick-btn el-${el}" data-pick="${el}" style="--el:${def.color}">`
      + `<span class="pick-glyph">${glyphSvg(def.glyph, 44)}</span>`
      + `<span class="pick-name">${def.name}</span>`
      + `<span class="pick-note">${el === 'ember' ? 'beats Gale' : el === 'gale' ? 'beats Tide' : el === 'tide' ? 'beats Ember' : 'neutral'}</span></button>`;
  }).join('');
  return `<section class="screen table-screen">${tableHtml(game)}
    <div class="overlay"><div class="pick-box">
      <h2>Name the Pact</h2>
      <p>Your wild ${card ? card.value : 5} takes the element you choose. Pick the one that wins this trick.</p>
      <div class="pick-row">${buttons}</div>
      <button class="ghost-btn" data-action="cancel-pick">Not yet</button>
    </div></div></section>`;
}

function overHtml(game) {
  const won = game.winner === 'player';
  const embers = won
    ? '<div class="ember-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>'
    : '';
  return `<section class="screen over-screen ${won ? 'win' : 'loss'}">${embers}
    <p class="eyebrow">${won ? 'THE PACT IS YOURS' : 'THE PACT IS ROOK\'S'}</p>
    <h1>${won ? 'YOU WIN' : 'ROOK WINS'}</h1>
    <p class="final-score">You ${Math.max(0, game.playerLife)} &mdash; ${Math.max(0, game.rookLife)} Rook &middot; ${game.trickCount} tricks</p>
    <p class="tagline">${won
      ? 'Rook bows, tail low, and the ember tavern is yours tonight.'
      : 'Rook grins through the smoke. The pact demands a rematch.'}</p>
    <ul class="log over-log">${game.log.slice(-4).map((line) => `<li>${esc(line)}</li>`).join('')}</ul>
    <button class="big-btn" data-action="restart">Play again</button>
  </section>`;
}

// Draw the whole app from state, then wire the buttons it contains.
export function renderGame(game, handlers) {
  const app = document.getElementById('app');
  if (!app) return;
  let html = '';
  if (game.phase === PHASE_TITLE) html = titleHtml();
  else if (game.phase === PHASE_PICK) html = pickHtml(game);
  else if (game.phase === PHASE_OVER) html = overHtml(game);
  else html = tableHtml(game);
  app.innerHTML = html;

  const on = (selector, event, fn) => {
    app.querySelectorAll(selector).forEach((node) => node.addEventListener(event, fn));
  };
  on('[data-action="start"]', 'click', () => handlers.onStart());
  on('[data-action="restart"]', 'click', () => handlers.onRestart());
  on('[data-action="mute"]', 'click', () => handlers.onMute());
  on('[data-action="cancel-pick"]', 'click', () => handlers.onCancelPick());
  on('[data-hand]', 'click', (ev) => {
    const index = Number(ev.currentTarget.getAttribute('data-hand'));
    handlers.onPlayCard(index);
  });
  on('[data-pick]', 'click', (ev) => {
    handlers.onPickElement(ev.currentTarget.getAttribute('data-pick'));
  });
}

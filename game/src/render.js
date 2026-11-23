// Ember Pact's table: every pixel the player sees, drawn from state.
//
// render(state, ui) redraws the whole table from the match state: life bars,
// hands, the trick, the Oath and stance banners, Rook's tell, the trick pile
// and the log. Overlays (title, Oath choice, Pact choice, win, loss) are
// built per phase. Nothing here owns rules; it only shows what game.js did.

import { ELEMENTS, ELEMENT_ORDER } from './deck.js';

/** Build one card's DOM node. */
export function cardEl(card, { playable = false, selected = false, faceDown = false, small = false } = {}) {
  const el = document.createElement('div');
  el.className = `card${card.pact ? ' el-pact' : ` el-${card.element}`}${playable ? ' playable' : ''}${selected ? ' selected' : ''}${faceDown ? ' back' : ''}${small ? ' mini' : ''}`;
  if (card.uid) el.dataset.uid = card.uid;
  if (faceDown) {
    el.innerHTML = `<span class="back-glyph">\u{1F98A}</span><span class="back-word">ROOK</span>`;
    return el;
  }
  const meta = card.pact ? null : ELEMENTS[card.element];
  const glyph = card.pact ? '\u2726' : meta.glyph;
  const name = card.pact ? 'Pact' : meta.name;
  el.innerHTML = `<span class="val">${card.value}</span><span class="glyph">${glyph}</span><span class="elname">${name}</span>`;
  return el;
}

function lifeBar(fillEl, numEl, life) {
  fillEl.style.width = `${Math.max(0, (life / 30) * 100)}%`;
  numEl.textContent = `${life}`;
  fillEl.classList.toggle('low', life <= 10);
}

function bannerChip(el, text, kind) {
  el.textContent = text;
  el.className = `chip ${kind}`;
  el.style.display = text ? '' : 'none';
}

/** Draw the whole table from state. ui carries the click callbacks. */
export function render(state, ui) {
  const $ = (id) => document.getElementById(id);

  // Top bar: life, hands, tricks, Oath, stance, Surge.
  lifeBar($('life-you-fill'), $('life-you-num'), state.life.you);
  lifeBar($('life-rook-fill'), $('life-rook-num'), state.life.rook);
  $('hands-you').textContent = `Hands ${state.hands.you}`;
  $('hands-rook').textContent = `Hands ${state.hands.rook}`;
  $('tricks').textContent = `Hand ${Math.max(1, state.handNo)} · Tricks ${state.tricks.you}–${state.tricks.rook}`;
  bannerChip(
    $('oath-chip'),
    state.oath ? `OATH: ${ELEMENTS[state.oath].name.toUpperCase()} +2` : '',
    'oath',
  );
  bannerChip(
    $('stance-chip'),
    state.stance ? `ROOK FAVOURS: ${ELEMENTS[state.stance.shown].name.toUpperCase()}` : '',
    'stance',
  );
  bannerChip($('surge-you'), state.surge.you ? 'SURGE ARMED +2' : '', 'surge');
  bannerChip($('surge-rook'), state.surge.rook ? 'ROOK SURGE +2' : '', 'surge-rook');

  // Rook's hand: face-down backs, plus the tell while Rook thinks.
  const rookHand = $('rook-hand');
  rookHand.innerHTML = '';
  for (let i = 0; i < state.rookHand.length; i++) {
    rookHand.appendChild(cardEl({ uid: '', element: 'stone', value: 0, pact: false }, { faceDown: true, small: true }));
  }
  const tell = $('tell-chip');
  if (state.tell && (state.phase === 'rook-thinking' || state.rookPending)) {
    const meta = ELEMENTS[state.tell.element];
    tell.innerHTML = `Rook eyes <b>${meta.glyph} ${meta.name}</b> — counter it!`;
    tell.style.display = '';
  } else {
    tell.style.display = 'none';
  }

  // The trick on the table.
  const youSlot = $('table-you');
  const rookSlot = $('table-rook');
  youSlot.innerHTML = '';
  rookSlot.innerHTML = '';
  if (state.table.you) youSlot.appendChild(cardEl(state.table.you, { selected: true }));
  else youSlot.innerHTML = '<span class="slot-hint">Your card</span>';
  if (state.table.rook) rookSlot.appendChild(cardEl(state.table.rook, {}));
  else rookSlot.innerHTML = '<span class="slot-hint">Rook\u2019s card</span>';
  if (state.rookPending) rookSlot.innerHTML = '<span class="slot-hint">Rook is choosing\u2026</span>';

  // The trick pile: the last tricks, small, so the match's shape is visible.
  const pile = $('pile');
  pile.innerHTML = '';
  for (const t of state.pile) {
    const row = document.createElement('div');
    row.className = 'pile-row';
    row.appendChild(cardEl(t.youCard, { small: true }));
    row.appendChild(cardEl(t.rookCard, { small: true }));
    const who = document.createElement('span');
    who.className = 'pile-who';
    who.textContent = t.winner === 'you' ? 'You' : 'Rook';
    row.appendChild(who);
    pile.appendChild(row);
  }

  // The player's hand, fanned, clickable when it is their turn.
  const hand = $('player-hand');
  hand.innerHTML = '';
  const canPlay = state.phase === 'lead-you' || state.phase === 'follow-you';
  state.youHand.forEach((card, i) => {
    const node = cardEl(card, { playable: canPlay, selected: state.pendingPact && state.pendingPact.uid === card.uid });
    const mid = (state.youHand.length - 1) / 2;
    node.style.setProperty('--rot', `${(i - mid) * 4}deg`);
    node.style.setProperty('--lift', `${Math.abs(i - mid) * 3}px`);
    if (canPlay) {
      node.addEventListener('click', () => ui.onPlay(card.uid));
    }
    hand.appendChild(node);
  });
  $('hand-hint').textContent =
    state.phase === 'lead-you'
      ? 'Your lead — click a card (keys 1–6)'
      : state.phase === 'follow-you'
        ? 'Rook led — beat it if you can (keys 1–6)'
        : state.phase === 'oath'
          ? 'Swear your Oath to begin the hand'
          : state.phase === 'pact'
            ? 'Choose what your Pact wild burns as'
            : state.phase === 'rook-thinking'
              ? 'Rook is thinking\u2026'
              : state.phase === 'trick'
                ? 'Trick resolving\u2026'
                : '';

  // The running log: the last thing that happened.
  $('log-line').textContent = state.log.length ? state.log[state.log.length - 1] : '';

  renderOverlay(state, ui);
}

/** The phase overlay: title, Oath, Pact, hand end, win, loss. */
function renderOverlay(state, ui) {
  const $ = (id) => document.getElementById(id);
  const overlay = $('overlay');
  overlay.innerHTML = '';
  overlay.className = 'overlay';
  document.body.classList.toggle('won', state.phase === 'over' && state.winner === 'you');
  document.body.classList.toggle('lost', state.phase === 'over' && state.winner === 'rook');

  if (state.phase === 'title') {
    overlay.innerHTML = `
      <div class="panel title-panel">
        <div class="kicker">A DUEL OF THE FOUR WINDS</div>
        <h1>EMBER<br>PACT</h1>
        <div class="vs">You <span class="vs-x">vs</span> Rook the Cinder Fox · 30 life each</div>
        <div class="rules">
          <p><b>Win tricks.</b> Higher power takes the trick and deals the gap as damage.</p>
          <p><b>Swear an Oath</b> each hand: one element gains +2 — lose the hand and it breaks for +3.</p>
          <p><b>Read Rook.</b> Its stance and its tells are true about 7 times in 10. Counter them.</p>
          <p><b>Chains &amp; Surge.</b> Same element twice running: +1. Two tricks in a row arms Surge +2.</p>
        </div>
        <div class="legend">${ELEMENT_ORDER.map((e) => `<span class="legend-item" style="--c:${ELEMENTS[e].color}">${ELEMENTS[e].glyph} ${ELEMENTS[e].name}</span>`).join('')}<span class="legend-item" style="--c:#b8860b">✦ Pact wild</span></div>
        <button class="big-btn" id="start-btn">Begin the Duel</button>
        <div class="keys-hint">Mouse or keys 1–6 to play · Enter to start</div>
      </div>`;
    $('start-btn').addEventListener('click', () => ui.onStart());
    return;
  }

  if (state.phase === 'oath') {
    const counts = {};
    for (const e of ELEMENT_ORDER) counts[e] = 0;
    for (const c of state.youHand) if (!c.pact) counts[c.element]++;
    overlay.innerHTML = `
      <div class="panel">
        <h2>Swear your Oath</h2>
        <p class="panel-sub">One element gains <b>+2 power</b> all hand. Lose the hand and the Oath breaks: <b>Rook deals +3</b>.</p>
        <p class="panel-sub">Rook's stance: <b>${ELEMENTS[state.stance.shown].name}</b> — its word holds about 7 times in 10.</p>
        <div class="choice-row">
          ${ELEMENT_ORDER.map((e, i) => {
            const beats = ELEMENTS[e].beats ? `beats ${ELEMENTS[ELEMENTS[e].beats].name}` : 'neutral';
            return `<button class="choice-btn el-${e}" data-el="${e}"><span class="choice-glyph">${ELEMENTS[e].glyph}</span><span class="choice-name">${ELEMENTS[e].name}</span><span class="choice-note">${beats} · ${counts[e]} in hand</span><span class="choice-key">${i + 1}</span></button>`;
          }).join('')}
        </div>
      </div>`;
    overlay.querySelectorAll('.choice-btn').forEach((b) => b.addEventListener('click', () => ui.onOath(b.dataset.el)));
    return;
  }

  if (state.phase === 'pact') {
    overlay.innerHTML = `
      <div class="panel">
        <h2>Your Pact wild burns as…</h2>
        <p class="panel-sub">A wild is value 6 in the element you name. Pick the one that beats Rook's card.</p>
        <div class="choice-row">
          ${ELEMENT_ORDER.map((e, i) => `<button class="choice-btn el-${e}" data-el="${e}"><span class="choice-glyph">${ELEMENTS[e].glyph}</span><span class="choice-name">${ELEMENTS[e].name}</span><span class="choice-note">${ELEMENTS[e].beats ? `beats ${ELEMENTS[ELEMENTS[e].beats].name}` : 'neutral'}</span><span class="choice-key">${i + 1}</span></button>`).join('')}
        </div>
      </div>`;
    overlay.querySelectorAll('.choice-btn').forEach((b) => b.addEventListener('click', () => ui.onPact(b.dataset.el)));
    return;
  }

  if (state.phase === 'handEnd') {
    overlay.innerHTML = `
      <div class="panel slim">
        <h2>${state.handWinner === 'you' ? 'Hand yours' : state.handWinner === 'rook' ? 'Hand lost — the Oath breaks' : 'Hand tied'}</h2>
        <p class="panel-sub">${state.log.length ? state.log[state.log.length - 1] : ''}</p>
        <p class="panel-sub">Life — You ${state.life.you} · Rook ${state.life.rook}</p>
      </div>`;
    return;
  }

  if (state.phase === 'over') {
    const won = state.winner === 'you';
    overlay.innerHTML = `
      <div class="panel ${won ? 'win-panel' : 'lose-panel'}">
        <h1>${won ? 'VICTORY' : 'DEFEAT'}</h1>
        <div class="vs">${won ? 'The Cinder Fox bows. The embers are yours.' : 'The embers take you. Rook keeps the table.'}</div>
        <p class="panel-sub">${state.overReason}</p>
        <p class="panel-sub">Hands ${state.hands.you}–${state.hands.rook} · ${state.handNo} hand${state.handNo === 1 ? '' : 's'} · Life You ${state.life.you} — Rook ${state.life.rook}</p>
        <button class="big-btn" id="again-btn">Play Again</button>
        <div class="keys-hint">Enter to play again</div>
      </div>`;
    $('again-btn').addEventListener('click', () => ui.onAgain());
    if (won) winFlourish();
  }
}

/** A floating damage number over the loser's side of the table. */
export function showFloater(text, side) {
  const layer = document.getElementById('float-layer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `floater ${side}`;
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

/** The win flourish: embers rising across the screen. */
export function winFlourish() {
  const layer = document.getElementById('float-layer');
  if (!layer || layer.querySelector('.ember')) return;
  for (let i = 0; i < 28; i++) {
    const e = document.createElement('div');
    e.className = 'ember';
    e.style.left = `${4 + Math.random() * 92}%`;
    e.style.animationDelay = `${Math.random() * 1.2}s`;
    e.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    layer.appendChild(e);
    setTimeout(() => e.remove(), 4200);
  }
}

// Ember Pact rendering: DOM cards, life bars, telegraph, trick log, overlays.
// Element icons are inline SVG (crisp at any size, no font dependency):
// flame for Ember, wind for Gale, waves for Tide, a faceted rock for Stone,
// a four-point star for Pact wilds.
import { ELEMENTS, ELEMENT_ORDER } from './deck.js';
import { cardLabel } from './game.js';

const ICONS = {
  ember: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>',
  gale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h14a3 3 0 1 1-3 3"/><path d="M3 16h7"/></svg>',
  tide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 9c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/><path d="M2 15c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0"/></svg>',
  stone: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L20 9 L18 22 L6 22 L4 9 Z"/><path d="M12 2 L16 9 L12 22 L8 9 Z" fill="rgba(255,255,255,.28)"/></svg>',
  pact: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 L14.2 9.8 L23 12 L14.2 14.2 L12 23 L9.8 14.2 L1 12 L9.8 9.8 Z"/></svg>',
};

export function elementIcon(element) {
  return ICONS[element] || ICONS.pact;
}

function el(id) {
  return document.getElementById(id);
}

// Build one card element. opts: {small, faceDown, played, selected, onClick}
export function cardElement(card, opts = {}) {
  const div = document.createElement('div');
  div.className = 'card' + (opts.small ? ' small' : '') + (opts.played ? ' played' : '');
  if (opts.faceDown) {
    div.classList.add('back');
    const mark = document.createElement('div');
    mark.className = 'back-mark';
    mark.textContent = 'EP';
    div.appendChild(mark);
    return div;
  }
  if (opts.selected) div.classList.add('selected');
  const color = card.pact ? '#b8860b' : ELEMENTS[card.element].color;
  const band = document.createElement('div');
  band.className = 'el-band';
  band.style.background = color;
  div.appendChild(band);
  const value = document.createElement('div');
  value.className = 'value';
  value.textContent = card.value;
  value.style.color = color;
  div.appendChild(value);
  if (card.pact) {
    const star = document.createElement('div');
    star.className = 'pact-star';
    star.style.color = '#b8860b';
    star.innerHTML = ICONS.pact;
    div.appendChild(star);
  }
  const glyph = document.createElement('div');
  glyph.className = 'glyph';
  glyph.style.color = color;
  glyph.innerHTML = elementIcon(card.pact ? 'pact' : card.element);
  div.appendChild(glyph);
  const name = document.createElement('div');
  name.className = 'el-name';
  name.textContent = card.pact ? 'Pact wild' : ELEMENTS[card.element].name;
  div.appendChild(name);
  if (opts.onClick) div.addEventListener('click', opts.onClick);
  return div;
}

export function renderTitleElements() {
  const row = el('title-elements');
  row.innerHTML = '';
  for (const key of ELEMENT_ORDER) {
    const info = ELEMENTS[key];
    const mini = document.createElement('div');
    mini.className = 'mini-card';
    const glyph = document.createElement('div');
    glyph.className = 'mini-glyph';
    glyph.style.color = info.color;
    glyph.innerHTML = elementIcon(key);
    mini.appendChild(glyph);
    const name = document.createElement('div');
    name.className = 'mini-name';
    name.textContent = info.name;
    mini.appendChild(name);
    const beats = document.createElement('div');
    beats.className = 'mini-beats';
    beats.textContent = info.beats ? `beats ${ELEMENTS[info.beats].name}` : 'neutral';
    mini.appendChild(beats);
    row.appendChild(mini);
  }
}

export function showTitle() {
  el('title-screen').classList.remove('hidden');
  el('table-screen').classList.add('hidden');
  el('end-overlay').classList.add('hidden');
}

export function showTable() {
  el('title-screen').classList.add('hidden');
  el('table-screen').classList.remove('hidden');
}

// Render the whole table from state. opts: {selected, interactive, onPlay, flash}
// flash: 'player' | 'rook' — which life bar flashes from the last trick.
export function renderAll(state, opts = {}) {
  const selected = opts.selected === undefined ? -1 : opts.selected;
  el('round-num').textContent = state.round;
  el('player-life-num').textContent = state.playerLife;
  el('rook-life-num').textContent = state.rookLife;
  const playerFill = el('player-life-fill');
  const rookFill = el('rook-life-fill');
  playerFill.style.width = `${(state.playerLife / 30) * 100}%`;
  rookFill.style.width = `${(state.rookLife / 30) * 100}%`;
  if (opts.flash) {
    const bar = opts.flash === 'player' ? playerFill.parentElement : rookFill.parentElement;
    bar.classList.remove('flash');
    void bar.offsetWidth;
    bar.classList.add('flash');
  }
  const surge = el('surge-badge');
  if (state.surgeArmed) surge.classList.remove('hidden');
  else surge.classList.add('hidden');

  const rookHand = el('rook-hand');
  rookHand.innerHTML = '';
  for (const card of state.rookHand) {
    rookHand.appendChild(cardElement(card, { small: true, faceDown: true }));
  }
  const playerHand = el('player-hand');
  playerHand.innerHTML = '';
  state.playerHand.forEach((card, i) => {
    playerHand.appendChild(cardElement(card, {
      selected: i === selected,
      onClick: opts.onCard ? () => opts.onCard(i) : undefined,
    }));
  });
  const playBtn = el('play-card-btn');
  playBtn.disabled = selected < 0 || state.phase !== 'playing';
  if (opts.onPlay) playBtn.onclick = opts.onPlay;

  const arenaRook = el('arena-rook');
  const arenaPlayer = el('arena-player');
  arenaRook.innerHTML = '';
  arenaPlayer.innerHTML = '';
  const result = el('trick-result');
  if (state.lastTrick) {
    const t = state.lastTrick;
    arenaPlayer.appendChild(cardElement(t.playerCard, { played: true }));
    arenaRook.appendChild(cardElement(t.rookCard, { played: true }));
    if (t.winner === 'player') {
      result.innerHTML = `<strong>You win the trick!</strong> ${cardLabel(t.playerCard)} (${t.playerPower}) beats ${cardLabel(t.rookCard)} (${t.rookPower}) — Rook −${t.damage}.${t.surge ? ' Surge strikes!' : ''}`;
    } else if (t.winner === 'rook') {
      result.innerHTML = `<strong>Rook wins the trick.</strong> ${cardLabel(t.rookCard)} (${t.rookPower}) beats ${cardLabel(t.playerCard)} (${t.playerPower}) — you −${t.damage}.`;
    } else {
      result.innerHTML = `<strong>Clash!</strong> ${cardLabel(t.playerCard)} (${t.playerPower}) meets ${cardLabel(t.rookCard)} (${t.rookPower}). No damage.`;
    }
  } else {
    arenaPlayer.innerHTML = '<div class="empty">Your card</div>';
    arenaRook.innerHTML = '<div class="empty">Rook&rsquo;s card</div>';
    result.textContent = 'Play a card to begin the duel.';
  }

  const telegraph = el('telegraph');
  if (state.telegraph) {
    if (state.telegraph.element) {
      const info = ELEMENTS[state.telegraph.element];
      telegraph.textContent = `Rook gathers ${info.name}…`;
    } else {
      telegraph.textContent = state.telegraph.text || 'Rook gathers…';
    }
  }
  const log = el('log-list');
  log.innerHTML = '';
  for (const line of state.log) {
    const li = document.createElement('li');
    li.textContent = line;
    log.appendChild(li);
  }
  el('stats-line').textContent =
    `Tricks ${state.tricksWon}–${state.tricksLost} · Damage dealt ${state.damageDealt} · taken ${state.damageTaken}`;

  if (state.phase === 'over') showEnd(state);
}

export function showEnd(state) {
  const overlay = el('end-overlay');
  const title = el('end-title');
  const sub = el('end-sub');
  const stats = el('end-stats');
  if (state.winner === 'player') {
    title.textContent = 'VICTORY';
    title.classList.remove('defeat');
    sub.textContent = 'The four winds bow to you. Rook the Cinder Fox yields the pact.';
  } else {
    title.textContent = 'DEFEAT';
    title.classList.add('defeat');
    sub.textContent = 'Rook the Cinder Fox keeps the pact — this time. Shuffle and try again.';
  }
  stats.innerHTML =
    `<div><b>${state.round - 1}</b>rounds</div>` +
    `<div><b>${state.tricksWon}–${state.tricksLost}</b>tricks</div>` +
    `<div><b>${state.damageDealt}</b>damage dealt</div>` +
    `<div><b>${state.playerLife}–${state.rookLife}</b>life left</div>`;
  overlay.classList.remove('hidden');
}

export function hideEnd() {
  el('end-overlay').classList.add('hidden');
}

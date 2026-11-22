// Ember Pact boot + input. Click a card to select it, click again (or the
// PLAY CARD button, or Enter/Space) to play it. Keys 1-5 select, R restarts.
// ?shot=title|table|win|loss&seed=N renders a deterministic screenshot state
// with no interactivity.
import { newGame, playCard } from './game.js';
import { renderAll, renderTitleElements, showTitle, showTable, hideEnd } from './render.js';
import { stateForShot } from './shots.js';
import { sfx, setMuted, isMuted } from './sound.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '7');

let state = null;
let selected = -1;
let resolving = false;

function startGame(seedValue) {
  state = newGame(seedValue);
  selected = -1;
  resolving = false;
  hideEnd();
  showTable();
  renderAll(state, { selected, onCard: onCardClick, onPlay: onPlayClick });
}

function onCardClick(index) {
  if (!state || state.phase !== 'playing' || resolving) return;
  if (index === selected) {
    onPlayClick();
    return;
  }
  selected = index;
  sfx.select();
  renderAll(state, { selected, onCard: onCardClick, onPlay: onPlayClick });
}

function onPlayClick() {
  if (!state || state.phase !== 'playing' || resolving) return;
  if (selected < 0) return;
  resolving = true;
  const trick = playCard(state, selected);
  selected = -1;
  if (!trick) {
    resolving = false;
    return;
  }
  if (trick.winner === 'player') {
    if (trick.surge) sfx.surge();
    else sfx.play();
  } else if (trick.winner === 'rook') {
    sfx.hurt();
  } else {
    sfx.clash();
  }
  const flash = trick.winner === 'player' ? 'rook' : trick.winner === 'rook' ? 'player' : null;
  renderAll(state, { selected, onCard: onCardClick, onPlay: onPlayClick, flash });
  window.setTimeout(() => {
    resolving = false;
    if (state.phase === 'over') {
      if (state.winner === 'player') sfx.win();
      else sfx.loss();
    }
    renderAll(state, { selected, onCard: onCardClick, onPlay: onPlayClick });
  }, 900);
}

function bindControls() {
  document.getElementById('play-btn').addEventListener('click', () => {
    sfx.play();
    startGame();
  });
  document.getElementById('again-btn').addEventListener('click', () => {
    sfx.play();
    startGame();
  });
  document.getElementById('sound-btn').addEventListener('click', (event) => {
    setMuted(!isMuted());
    event.currentTarget.textContent = isMuted() ? 'Sound: off' : 'Sound: on';
  });
  document.addEventListener('keydown', (event) => {
    if (!state || state.phase !== 'playing') return;
    if (event.key >= '1' && event.key <= '5') {
      const index = Number(event.key) - 1;
      if (index < state.playerHand.length) onCardClick(index);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPlayClick();
    } else if (event.key === 'r' || event.key === 'R') {
      startGame();
    }
  });
}

renderTitleElements();
bindControls();
if (shot && shot !== 'title') {
  const scripted = stateForShot(shot, seed);
  if (scripted) {
    state = scripted.state;
    document.getElementById('app').classList.add('frozen');
    showTable();
    renderAll(state, { selected: scripted.selected });
  } else {
    showTitle();
  }
} else {
  showTitle();
}

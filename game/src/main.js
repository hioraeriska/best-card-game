// Ember Pact's browser shell: input, timing, and the pump that drives Rook.
//
// The rules live in game.js (pure logic); this file wires them to the page:
// clicks and keys, the short pauses that let cards slide and flip, Rook's
// thinking beat, and the ?shot= staging used for screenshots.

import {
  beginHand,
  chooseOath,
  choosePact,
  isOver,
  newMatch,
  resolveTrick,
  rookPlay,
  rookThink,
  startMatch,
  youPlay,
} from './game.js';
import { render, showFloater } from './render.js';
import { sfx, toggleMute, unlockAudio } from './sound.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '11', 10) || 11;

// A staged screenshot (?shot=) renders frozen: no animations, no timers,
// so the shot is exactly the staged state.
if (shot) document.body.classList.add('frozen');

let state = shot ? stageShot(shot, seed) : newMatch(seed);
let pumpToken = 0;

/** Any uncaught error is written into the page, so a headless check can see it. */
window.addEventListener('error', (event) => {
  document.body.dataset.jserror = String(event.message || 'error');
});
window.addEventListener('unhandledrejection', (event) => {
  document.body.dataset.jserror = String((event.reason && event.reason.message) || 'rejection');
});

/**
 * The pump: after every state change, look at the phase and schedule the
 * next automatic step (Rook thinks, Rook plays, a trick resolves, a hand
 * begins). The token guard drops stale timers when a new game starts.
 */
function pump() {
  render(state, ui);
  // A staged screenshot (?shot=) stays frozen on its state: no timers,
  // so the table, the tell and the win flourish are exactly as staged.
  if (shot) return;
  const token = ++pumpToken;
  const later = (ms, fn) => {
    setTimeout(() => {
      if (token !== pumpToken) return;
      fn();
      pump();
    }, ms);
  };
  if (state.phase === 'rook-thinking' && !state.rookPending) {
    later(650, () => {
      rookThink(state);
      sfx('click');
    });
  } else if (state.phase === 'rook-thinking' && state.rookPending) {
    later(850, () => {
      rookPlay(state);
      sfx('play');
    });
  } else if (state.phase === 'trick') {
    later(1150, () => {
      const before = { you: state.life.you, rook: state.life.rook };
      resolveTrick(state);
      const trick = state.lastTrick;
      if (trick) {
        const loser = trick.winner === 'you' ? 'rook' : 'you';
        const dealt = before[loser] - state.life[loser];
        showFloater(`-${dealt}`, loser);
        sfx(trick.winner === 'you' ? 'win-trick' : 'lose-trick');
      }
    });
  } else if (state.phase === 'handEnd') {
    later(1900, () => beginHand(state));
  } else if (state.phase === 'over') {
    sfx(state.winner === 'you' ? 'victory' : 'defeat');
  }
}

const ui = {
  onPlay(uid) {
    if (state.phase !== 'lead-you' && state.phase !== 'follow-you') return;
    unlockAudio();
    const res = youPlay(state, uid);
    if (res === 'pact') {
      sfx('pact');
    } else if (res === 'ok') {
      sfx('play');
    }
    pump();
  },
  onOath(element) {
    unlockAudio();
    if (chooseOath(state, element)) sfx('oath');
    pump();
  },
  onPact(element) {
    unlockAudio();
    if (choosePact(state, element)) sfx('play');
    pump();
  },
  onStart() {
    unlockAudio();
    sfx('oath');
    startMatch(state);
    pump();
  },
  onAgain() {
    unlockAudio();
    state = newMatch(seed);
    pump();
  },
};

/** Keyboard play: 1-6 plays a card, 1-4 picks an element, Enter starts. */
document.addEventListener('keydown', (event) => {
  if (event.key === 'm' || event.key === 'M') {
    const muted = toggleMute();
    document.getElementById('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    if (state.phase === 'title') {
      ui.onStart();
      return;
    }
    if (state.phase === 'over') {
      ui.onAgain();
      return;
    }
  }
  const n = Number.parseInt(event.key, 10);
  if (Number.isNaN(n)) return;
  if (state.phase === 'oath' || state.phase === 'pact') {
    const el = ['ember', 'gale', 'tide', 'stone'][n - 1];
    if (el) {
      if (state.phase === 'oath') ui.onOath(el);
      else ui.onPact(el);
    }
    return;
  }
  if ((state.phase === 'lead-you' || state.phase === 'follow-you') && n >= 1 && n <= state.youHand.length) {
    ui.onPlay(state.youHand[n - 1].uid);
  }
});

document.getElementById('mute-btn').addEventListener('click', () => {
  unlockAudio();
  const muted = toggleMute();
  document.getElementById('mute-btn').textContent = muted ? 'Sound: off' : 'Sound: on';
});

// Expose the match for debugging and for headless play tests.
window.__ember = {
  get state() {
    return state;
  },
  isOver: () => isOver(state),
};

pump();

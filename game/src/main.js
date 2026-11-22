// Bootstrap for Ember Pact: wire clicks, keys and sound to the rules engine,
// and stage screenshot scenes when the page is opened with ?shot=.
//
// Normal play: title -> table -> win/loss, with a Pact picker overlay when a
// wild is played. Shot mode renders one frozen scene for the camera.

import { PHASE_OVER, PHASE_PICK, PHASE_PLAY, PHASE_TITLE, cancelPactPick, newGame, playPlayerCard, startGame } from './game.js';
import { renderGame } from './render.js';
import { stageShot } from './shots.js';
import { isMuted, setMuted, soundClick, soundDamage, soundDraw, soundLose, soundPlay, soundWin } from './sound.js';

function seedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = Number(params.get('seed'));
  return Number.isFinite(raw) ? raw : 7;
}

function playSoundFor(game, result) {
  if (!result || result.needsPick) return;
  if (game.phase === PHASE_OVER) {
    if (game.winner === 'player') soundWin();
    else soundLose();
    return;
  }
  if (result.winner === 'tie') soundClick();
  else soundDamage();
  soundDraw();
}

function main() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const app = document.getElementById('app');

  if (shot) {
    // Screenshot mode: stage the scene, freeze the motion, render once.
    document.body.classList.add('shot');
    const staged = stageShot(shot, seedFromUrl());
    const game = staged.game;
    game.muted = true;
    renderGame(game, {
      onStart() {},
      onRestart() {},
      onMute() {},
      onCancelPick() {},
      onPlayCard() {},
      onPickElement() {},
    });
    window.__emberPact = game;
    return;
  }

  let game = newGame(Date.now() % 2147483647);
  game.muted = isMuted();

  const handlers = {
    onStart() {
      soundClick();
      startGame(game);
      renderGame(game, handlers);
    },
    onRestart() {
      soundClick();
      game = newGame(Date.now() % 2147483647);
      game.muted = isMuted();
      startGame(game);
      renderGame(game, handlers);
    },
    onMute() {
      setMuted(!isMuted());
      game.muted = isMuted();
      renderGame(game, handlers);
    },
    onCancelPick() {
      soundClick();
      cancelPactPick(game);
      renderGame(game, handlers);
    },
    onPlayCard(index) {
      if (game.phase !== PHASE_PLAY) return;
      const result = playPlayerCard(game, index, null);
      if (result && result.needsPick) {
        soundClick();
        renderGame(game, handlers);
        return;
      }
      if (!result) return;
      soundPlay();
      playSoundFor(game, result);
      renderGame(game, handlers);
    },
    onPickElement(element) {
      if (game.phase !== PHASE_PICK) return;
      const index = game.pendingPact;
      const result = playPlayerCard(game, index, element);
      if (!result) return;
      soundPlay();
      playSoundFor(game, result);
      renderGame(game, handlers);
    },
  };

  renderGame(game, handlers);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'm' || event.key === 'M') {
      handlers.onMute();
      return;
    }
    if (game.phase === PHASE_TITLE && (event.key === 'Enter' || event.key === ' ')) {
      handlers.onStart();
      return;
    }
    if (game.phase === PHASE_OVER && event.key === 'Enter') {
      handlers.onRestart();
      return;
    }
    if (game.phase === PHASE_PLAY) {
      const slot = Number(event.key);
      if (slot >= 1 && slot <= game.playerHand.length) handlers.onPlayCard(slot - 1);
    }
  });

  window.__emberPact = game;
}

main();

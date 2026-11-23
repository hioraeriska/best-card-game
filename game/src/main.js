// main.js — boot and wiring for Ember Pact. One job: own the match loop,
// input and screen flow. Rules live in game.js, drawing in render.js.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  let state = null;
  let busy = false; // a trick is resolving; ignore extra clicks

  function randomSeed() {
    return (Date.now() % 2147483647) ^ Math.floor(Math.random() * 100000);
  }

  function startMatch(seed) {
    state = NS.newMatch(seed === undefined ? randomSeed() : seed);
    state.phase = 'playing';
    NS.render.showScreen('table');
    NS.render.renderTable(state, hooks);
  }

  function showTitle() {
    state = NS.newMatch(randomSeed());
    NS.render.showScreen('title');
    NS.render.renderTitle(hooks);
  }

  function showEnd() {
    NS.render.showScreen('end');
    NS.render.renderEnd(state, hooks);
    if (state.phase === 'won') NS.sound.victory();
    else NS.sound.defeat();
  }

  function onPlayCard(cardId) {
    if (!state || state.phase !== 'playing' || busy) return;
    if (!NS.legalMoves(state).includes(cardId)) return;
    busy = true;
    NS.sound.playCard();
    const record = NS.playTrick(state, cardId);
    NS.render.renderTable(state, hooks);
    if (record) {
      if (record.winner === 'player') {
        NS.sound.winTrick();
        if (record.damage > 0) NS.render.damagePop('−' + record.damage, 'rook');
      } else if (record.winner === 'rook') {
        NS.sound.loseTrick();
        if (record.damage > 0) NS.render.damagePop('−' + record.damage, 'player');
      } else {
        NS.sound.tieTrick();
      }
      if (record.pactBurst) NS.sound.pactBurst();
      if (record.schemeBroken) NS.sound.schemeBreak();
    }
    setTimeout(() => {
      busy = false;
      if (state.phase === 'won' || state.phase === 'lost') showEnd();
      else NS.render.renderTable(state, hooks);
    }, 650);
  }

  function onToggleMute() {
    NS.sound.setMuted(!NS.sound.isMuted());
    if (state && state.phase === 'playing') NS.render.renderTable(state, hooks);
  }

  function onShowHelp() {
    showTitle();
  }

  const hooks = {
    onStart: () => startMatch(),
    onRestart: () => startMatch(),
    onPlayCard,
    onToggleMute,
    onShowHelp,
  };

  // Keyboard: 1-5 play a hand card, Enter starts, M mutes, N new match.
  function onKey(e) {
    if (!state) return;
    if (e.key >= '1' && e.key <= '5') {
      const i = Number(e.key) - 1;
      if (state.phase === 'playing' && state.playerHand[i]) onPlayCard(state.playerHand[i].id);
    } else if (e.key === 'Enter' && state.phase === 'title') {
      startMatch();
    } else if (e.key === 'm' || e.key === 'M') {
      onToggleMute();
    } else if ((e.key === 'n' || e.key === 'N') && state.phase !== 'title') {
      startMatch();
    }
  }

  function boot() {
    document.addEventListener('keydown', onKey);
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      // Screenshot mode: no animation, no input, a staged state.
      document.body.classList.add('shot');
      if (shot === 'title') {
        state = NS.newMatch(NS.shots.SHOT_SEED);
        NS.render.showScreen('title');
        NS.render.renderTitle(hooks);
      } else {
        state = NS.shots.stageShot(shot);
        if (!state) {
          showTitle();
          return;
        }
        if (state.phase === 'won' || state.phase === 'lost') {
          NS.render.showScreen('end');
          NS.render.renderEnd(state, hooks);
        } else {
          NS.render.showScreen('table');
          NS.render.renderTable(state, hooks);
        }
      }
      return;
    }
    showTitle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

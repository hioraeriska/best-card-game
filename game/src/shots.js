// shots.js — staged screenshot states. One job: put the game into a fixed,
// good-looking state for each screenshot, with no animation and no input.
// ?shot=title | table | win | loss. The states are deterministic: same seed,
// same hands, same table every time.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  const SHOT_SEED = 20261123;

  // Play a few tricks with a fixed, simple player policy so the table shot
  // shows a real mid-match state: chain, pact pips, a live scheme, damage.
  function stageTable() {
    const state = NS.newMatch(SHOT_SEED);
    state.phase = 'playing';
    // Six tricks: the player leads its strongest card each time.
    for (let i = 0; i < 6 && state.phase === 'playing'; i++) {
      const best = state.playerHand.slice().sort((a, b) => b.value - a.value)[0];
      NS.playTrick(state, best.id);
    }
    // Freeze the played cards on the table for the shot.
    return state;
  }

  // A finished match the player won: Rook at zero, pact burst on the log.
  // Tries a few seeds until the strongest-card policy wins one honestly;
  // if none does, the last match is finished as a win by hand.
  function stageWin() {
    let state = null;
    for (let s = 0; s < 20; s++) {
      const cand = NS.newMatch(SHOT_SEED + 7 + s);
      cand.phase = 'playing';
      for (let i = 0; i < 40 && cand.phase === 'playing'; i++) {
        const best = cand.playerHand.slice().sort((a, b) => b.value - a.value)[0];
        NS.playTrick(cand, best.id);
      }
      state = cand;
      if (cand.phase === 'won') break;
    }
    if (state.phase !== 'won') {
      state.rookLife = 0;
      state.playerLife = Math.max(state.playerLife, 12);
      state.phase = 'won';
    }
    return state;
  }

  // A finished match the player lost: the player at zero.
  function stageLoss() {
    const state = NS.newMatch(SHOT_SEED + 13);
    state.phase = 'playing';
    // The player leads its weakest card: a slow, honest defeat.
    for (let i = 0; i < 40 && state.phase === 'playing'; i++) {
      const worst = state.playerHand.slice().sort((a, b) => a.value - b.value)[0];
      NS.playTrick(state, worst.id);
    }
    if (state.phase === 'playing') {
      state.playerLife = 0;
      state.phase = 'lost';
    }
    if (state.phase !== 'lost') {
      state.playerLife = 0;
      state.rookLife = Math.max(state.rookLife, 12);
      state.phase = 'lost';
    }
    return state;
  }

  // Build the state for a named shot, or null when the name is unknown.
  function stageShot(name) {
    if (name === 'table') return stageTable();
    if (name === 'win') return stageWin();
    if (name === 'loss') return stageLoss();
    if (name === 'title') return null; // title needs no state
    return null;
  }

  NS.shots = { stageShot, SHOT_SEED };
})();

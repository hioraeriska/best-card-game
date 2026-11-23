// sound.js — WebAudio sounds for Ember Pact. One job: bleeps, no files.
// Every sound is a few oscillators; nothing is fetched, nothing is stored.
(function () {
  const NS = (globalThis.EmberPact = globalThis.EmberPact || {});

  let ctx = null;
  let muted = false;

  function audio() {
    if (typeof window === 'undefined') return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // One tone: frequency, seconds, wave shape, volume.
  function tone(freq, dur, type, vol, when) {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // A card snaps onto the table.
  function playCard() {
    tone(520, 0.07, 'triangle', 0.14);
    tone(780, 0.06, 'triangle', 0.08, 0.05);
  }

  // The player wins a trick: a rising pair.
  function winTrick() {
    tone(440, 0.1, 'sine', 0.14);
    tone(660, 0.14, 'sine', 0.14, 0.09);
  }

  // Rook wins a trick: a falling pair.
  function loseTrick() {
    tone(330, 0.1, 'sine', 0.12);
    tone(220, 0.16, 'sine', 0.12, 0.09);
  }

  // A tie: a flat thud.
  function tieTrick() {
    tone(180, 0.12, 'square', 0.06);
  }

  // A pact bursts: a four-note arpeggio up the elements.
  function pactBurst() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.08));
  }

  // A scheme breaks: a bright snap.
  function schemeBreak() {
    tone(880, 0.08, 'square', 0.09);
    tone(1175, 0.12, 'square', 0.09, 0.07);
  }

  // The match is won: embers rise, a little fanfare.
  function victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.13, i * 0.11));
  }

  // The match is lost: a low descent.
  function defeat() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'sine', 0.11, i * 0.12));
  }

  function isMuted() {
    return muted;
  }

  function setMuted(m) {
    muted = !!m;
  }

  NS.sound = {
    playCard,
    winTrick,
    loseTrick,
    tieTrick,
    pactBurst,
    schemeBreak,
    victory,
    defeat,
    isMuted,
    setMuted,
  };
})();

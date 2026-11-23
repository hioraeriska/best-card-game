// Tiny synthesized sounds for Ember Pact: WebAudio bleeps, no audio files.
//
// Every sound is a short oscillator blip so the game ships zero assets.
// Sound only starts after a user gesture (browsers demand it) and stays
// silent in screenshot staging, where there is no gesture at all.

let ctx = null;
let muted = false;

/** True when sound is currently silenced. */
export function isMuted() {
  return muted;
}

/** Flip the mute; returns the new state. */
export function toggleMute() {
  muted = !muted;
  return muted;
}

/** Unlock audio on a user gesture. Safe to call any time. */
export function unlockAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function blip(freq, dur, type, gain, when = 0) {
  if (muted || !ctx) return;
  try {
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

/** Play one of the game's named sounds. */
export function sfx(name) {
  if (muted || !ctx) return;
  switch (name) {
    case 'click':
      blip(660, 0.06, 'triangle', 0.12);
      break;
    case 'play':
      blip(440, 0.09, 'triangle', 0.16);
      blip(660, 0.08, 'triangle', 0.1, 0.05);
      break;
    case 'win-trick':
      blip(523, 0.1, 'triangle', 0.16);
      blip(784, 0.14, 'triangle', 0.16, 0.08);
      break;
    case 'lose-trick':
      blip(330, 0.12, 'sawtooth', 0.08);
      blip(220, 0.16, 'sawtooth', 0.08, 0.08);
      break;
    case 'oath':
      blip(392, 0.12, 'sine', 0.16);
      blip(523, 0.12, 'sine', 0.16, 0.1);
      blip(659, 0.2, 'sine', 0.16, 0.2);
      break;
    case 'pact':
      blip(587, 0.1, 'sine', 0.14);
      blip(880, 0.18, 'sine', 0.14, 0.08);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'triangle', 0.18, i * 0.12));
      break;
    case 'defeat':
      [392, 330, 262, 196].forEach((f, i) => blip(f, 0.26, 'sawtooth', 0.08, i * 0.14));
      break;
    default:
      break;
  }
}

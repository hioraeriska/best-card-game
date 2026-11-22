// Sound for Ember Pact: tiny synthesized blips, no audio files.
// Every sound is an oscillator through a gain envelope, built on first use
// (browsers only let audio start after a gesture). Muted state survives in
// a module flag the UI toggles.

let context = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ac() {
  if (!context) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function blip(freq, dur, type, vol, when) {
  if (muted) return;
  const ctx = ac();
  if (!ctx) return;
  const start = ctx.currentTime + (when || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol || 0.12, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function soundClick() {
  blip(660, 0.07, 'triangle', 0.08);
}

export function soundDraw() {
  blip(520, 0.09, 'sine', 0.07);
  blip(780, 0.09, 'sine', 0.06, 0.06);
}

export function soundPlay() {
  blip(330, 0.1, 'triangle', 0.1);
  blip(495, 0.12, 'triangle', 0.09, 0.07);
}

export function soundDamage() {
  blip(180, 0.18, 'sawtooth', 0.07);
  blip(120, 0.22, 'sawtooth', 0.06, 0.08);
}

export function soundWin() {
  blip(523, 0.14, 'triangle', 0.12);
  blip(659, 0.14, 'triangle', 0.12, 0.12);
  blip(784, 0.2, 'triangle', 0.12, 0.24);
  blip(1047, 0.32, 'triangle', 0.12, 0.36);
}

export function soundLose() {
  blip(392, 0.2, 'sawtooth', 0.07);
  blip(311, 0.2, 'sawtooth', 0.07, 0.18);
  blip(233, 0.38, 'sawtooth', 0.07, 0.36);
}

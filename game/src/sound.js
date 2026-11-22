// Procedural Web Audio blips — no audio files, no network.
// The AudioContext is created lazily on the first sound so the page never
// asks for audio before the player interacts. Every call is guarded: sound
// is decoration and must never break the game.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type = 'sine', gain = 0.1, delay = 0) {
  try {
    if (muted) return;
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const start = ac.currentTime + delay;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  } catch (e) {
    // sound is decoration; ignore failures
  }
}

export const sfx = {
  select() { blip(660, 0.06, 'sine', 0.06); },
  play() { blip(520, 0.09, 'triangle', 0.1); blip(780, 0.07, 'sine', 0.08, 0.05); },
  clash() { blip(180, 0.15, 'square', 0.07); },
  hurt() { blip(220, 0.18, 'sawtooth', 0.06); blip(160, 0.2, 'sawtooth', 0.05, 0.08); },
  surge() { blip(880, 0.1, 'triangle', 0.1); blip(1174, 0.12, 'triangle', 0.1, 0.07); },
  win() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, 'triangle', 0.09, i * 0.09)); },
  loss() { [392, 330, 262, 196].forEach((f, i) => blip(f, 0.18, 'triangle', 0.08, i * 0.1)); },
};

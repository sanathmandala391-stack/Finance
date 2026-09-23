/**
 * Synthesizes authentic FamPay / UPI payment success sound feedback using Web Audio API
 * Zero external asset dependencies, zero network latency, 100% offline & mobile reliable.
 */

// Cached AudioContext singleton for instant zero-latency playback across clicks
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function useSoundEffects() {
  /**
   * Plays the signature FamPay payment confirmation sound
   * Pattern: Crisp digital attack -> Ascending bright chime -> Euphoric high-pitch resonant chord (C7 + E7 + G7)
   */
  const playPaymentSuccessSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master output gain with gentle compression ceiling to avoid clipping
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, now);
      masterGain.connect(ctx.destination);

      // --- 1. Tactile Sub Bass "Wallet Thump" (130Hz -> 65Hz in 70ms) ---
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      subGain.gain.setValueAtTime(0.3, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      subOsc.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.09);

      // --- 2. Initial Snappy Digital Bell Chirp (1175Hz -> 1568Hz in 35ms) ---
      const chirpOsc = ctx.createOscillator();
      const chirpGain = ctx.createGain();
      chirpOsc.type = 'triangle';
      chirpOsc.frequency.setValueAtTime(1175, now);
      chirpOsc.frequency.exponentialRampToValueAtTime(1568, now + 0.04);
      chirpGain.gain.setValueAtTime(0.25, now);
      chirpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      chirpOsc.connect(chirpGain);
      chirpGain.connect(masterGain);
      chirpOsc.start(now);
      chirpOsc.stop(now + 0.07);

      // --- 3. First Melodic Bell Tone (G6 - 1567.98 Hz) ---
      const bell1Osc = ctx.createOscillator();
      const bell1Gain = ctx.createGain();
      bell1Osc.type = 'sine';
      bell1Osc.frequency.setValueAtTime(1567.98, now);
      bell1Gain.gain.setValueAtTime(0.001, now);
      bell1Gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
      bell1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      bell1Osc.connect(bell1Gain);
      bell1Gain.connect(masterGain);
      bell1Osc.start(now);
      bell1Osc.stop(now + 0.26);

      // --- 4. Signature FamPay High Chime Chord (Starts at +0.075s) ---
      const chordStart = now + 0.075;

      // Note A: C7 (2093.00 Hz) - Pure Fundamental Bell
      const chordC7 = ctx.createOscillator();
      const chordC7Gain = ctx.createGain();
      chordC7.type = 'sine';
      chordC7.frequency.setValueAtTime(2093.0, chordStart);
      chordC7Gain.gain.setValueAtTime(0.001, chordStart);
      chordC7Gain.gain.linearRampToValueAtTime(0.4, chordStart + 0.012);
      chordC7Gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.75);
      chordC7.connect(chordC7Gain);
      chordC7Gain.connect(masterGain);
      chordC7.start(chordStart);
      chordC7.stop(chordStart + 0.76);

      // Note B: E7 (2637.02 Hz) - Bright Harmonic Major Third
      const chordE7 = ctx.createOscillator();
      const chordE7Gain = ctx.createGain();
      chordE7.type = 'sine';
      chordE7.frequency.setValueAtTime(2637.02, chordStart);
      chordE7Gain.gain.setValueAtTime(0.001, chordStart);
      chordE7Gain.gain.linearRampToValueAtTime(0.28, chordStart + 0.015);
      chordE7Gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.65);
      chordE7.connect(chordE7Gain);
      chordE7Gain.connect(masterGain);
      chordE7.start(chordStart);
      chordE7.stop(chordStart + 0.66);

      // Note C: G7 (3135.96 Hz) - Crisp Sparkle Fifth
      const chordG7 = ctx.createOscillator();
      const chordG7Gain = ctx.createGain();
      chordG7.type = 'sine';
      chordG7.frequency.setValueAtTime(3135.96, chordStart);
      chordG7Gain.gain.setValueAtTime(0.001, chordStart);
      chordG7Gain.gain.linearRampToValueAtTime(0.18, chordStart + 0.012);
      chordG7Gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.55);
      chordG7.connect(chordG7Gain);
      chordG7Gain.connect(masterGain);
      chordG7.start(chordStart);
      chordG7.stop(chordStart + 0.56);

      // Note D: C8 (4186.01 Hz) - Shimmering High Bell Overtone
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(4186.01, chordStart);
      overtoneGain.gain.setValueAtTime(0.001, chordStart);
      overtoneGain.gain.linearRampToValueAtTime(0.08, chordStart + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.45);
      overtone.connect(overtoneGain);
      overtoneGain.connect(masterGain);
      overtone.start(chordStart);
      overtone.stop(chordStart + 0.46);
    } catch {
      // Audio context might be restricted before first user interaction
    }
  };

  const playClickSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  };

  return { playPaymentSuccessSound, playClickSound };
}


/**
 * ProceduralAudioEngine — Generates real-time synthesized ambient music via Tone.js
 *
 * Creates cosmic, contemplative soundscapes for MVEE (Outer Wilds / FTL style).
 * Each SongOccasion has 1-4 distinct procedural generators, totaling 12+ unique
 * audio experiences. Uses lazy Tone.js import so the engine is safe in SSR/Node contexts.
 *
 * Architecture:
 * - Each occasion maps to a generator function that builds a Tone.js signal graph
 * - Generators return a cleanup function to tear down the graph on stop/crossfade
 * - Volume is controlled via a master gain node for fade-in/fade-out compatibility
 */

import type { SongOccasion } from './SongSystem.js';

type ToneLib = typeof import('tone');

interface ActiveScene {
  occasion: SongOccasion;
  variant: number;
  cleanup: () => void;
  gainNode: GainNode;
}

type SceneGenerator = (tone: ToneLib, dest: AudioNode) => (() => void);

const SCENE_REGISTRY: Record<SongOccasion, SceneGenerator[]> = {
  ambient: [],
  grief: [],
  elder: [],
  warning: [],
  hearth: [],
  birth: [],
};

// ============================================================================
// Ambient Generators (4 variants) — cosmic drones, evolving pads
// ============================================================================

/** Ambient 1: Deep space drone with slow harmonic shimmer */
SCENE_REGISTRY.ambient.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Deep fundamental drone
  const drone1 = new OscillatorNode(ctx, { type: 'sine', frequency: 55 });
  const drone2 = new OscillatorNode(ctx, { type: 'sine', frequency: 82.5 }); // perfect fifth
  const drone3 = new OscillatorNode(ctx, { type: 'triangle', frequency: 110 });

  // Slow LFO for tremolo
  const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: 0.08 });
  const lfoGain = new GainNode(ctx, { gain: 0.15 });
  lfo.connect(lfoGain);

  const droneGain1 = new GainNode(ctx, { gain: 0.25 });
  const droneGain2 = new GainNode(ctx, { gain: 0.15 });
  const droneGain3 = new GainNode(ctx, { gain: 0.1 });

  lfoGain.connect(droneGain1.gain);
  lfoGain.connect(droneGain2.gain);

  drone1.connect(droneGain1).connect(dest);
  drone2.connect(droneGain2).connect(dest);
  drone3.connect(droneGain3).connect(dest);

  // Shimmer: high filtered noise
  const noise = new AudioBufferSourceNode(ctx, {
    buffer: createNoiseBuffer(ctx, 4),
    loop: true,
  });
  const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 3000, Q: 8 });
  const shimmerGain = new GainNode(ctx, { gain: 0.02 });
  const shimmerLfo = new OscillatorNode(ctx, { type: 'sine', frequency: 0.03 });
  const shimmerLfoGain = new GainNode(ctx, { gain: 1500 });
  shimmerLfo.connect(shimmerLfoGain).connect(filter.frequency);
  noise.connect(filter).connect(shimmerGain).connect(dest);

  [drone1, drone2, drone3, lfo, shimmerLfo].forEach(n => n.start());
  noise.start();

  return () => {
    [drone1, drone2, drone3, lfo, shimmerLfo].forEach(n => { try { n.stop(); } catch {} });
    try { noise.stop(); } catch {}
    [droneGain1, droneGain2, droneGain3, shimmerGain, lfoGain, shimmerLfoGain, filter].forEach(n => n.disconnect());
  };
});

/** Ambient 2: Crystalline arpeggios over pad */
SCENE_REGISTRY.ambient.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Warm pad
  const pad = new OscillatorNode(ctx, { type: 'sine', frequency: 130.81 }); // C3
  const pad2 = new OscillatorNode(ctx, { type: 'sine', frequency: 196 }); // G3
  const padGain = new GainNode(ctx, { gain: 0.12 });
  const padFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 800, Q: 1 });
  pad.connect(padGain);
  pad2.connect(padGain);
  padGain.connect(padFilter).connect(dest);

  // Arpeggio — pentatonic scale, random picks
  const notes = [261.63, 293.66, 329.63, 392, 440, 523.25]; // C4 D4 E4 G4 A4 C5
  const arpGain = new GainNode(ctx, { gain: 0 });
  arpGain.connect(dest);

  const arpInterval = setInterval(() => {
    const freq = notes[Math.floor(Math.random() * notes.length)]!;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq });
    const env = new GainNode(ctx, { gain: 0.08 });
    osc.connect(env).connect(arpGain);
    osc.start();
    arpGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 0.8, 0.4);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 3000);
  }, 2500 + Math.random() * 2000);

  [pad, pad2].forEach(n => n.start());

  return () => {
    clearInterval(arpInterval);
    [pad, pad2].forEach(n => { try { n.stop(); } catch {} });
    [padGain, padFilter, arpGain].forEach(n => n.disconnect());
  };
});

/** Ambient 3: Wind-like filtered noise with sub-bass pulses */
SCENE_REGISTRY.ambient.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Wind noise
  const noise = new AudioBufferSourceNode(ctx, {
    buffer: createNoiseBuffer(ctx, 6),
    loop: true,
  });
  const windFilter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 600, Q: 0.5 });
  const windGain = new GainNode(ctx, { gain: 0.06 });
  const windLfo = new OscillatorNode(ctx, { type: 'sine', frequency: 0.05 });
  const windLfoGain = new GainNode(ctx, { gain: 400 });
  windLfo.connect(windLfoGain).connect(windFilter.frequency);
  noise.connect(windFilter).connect(windGain).connect(dest);

  // Sub-bass pulses
  const subGain = new GainNode(ctx, { gain: 0 });
  subGain.connect(dest);
  const subInterval = setInterval(() => {
    const sub = new OscillatorNode(ctx, { type: 'sine', frequency: 40 + Math.random() * 20 });
    const env = new GainNode(ctx, { gain: 0.2 });
    sub.connect(env).connect(subGain);
    sub.start();
    subGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 1.5, 0.8);
    setTimeout(() => { try { sub.stop(); } catch {} env.disconnect(); }, 5000);
  }, 6000 + Math.random() * 4000);

  noise.start();
  windLfo.start();

  return () => {
    clearInterval(subInterval);
    try { noise.stop(); } catch {}
    try { windLfo.stop(); } catch {}
    [windFilter, windGain, windLfoGain, subGain].forEach(n => n.disconnect());
  };
});

/** Ambient 4: Slow evolving fifths with ethereal overtones */
SCENE_REGISTRY.ambient.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  const fundamentals = [65.41, 73.42, 82.41, 87.31]; // C2, D2, E2, F2
  let currentIdx = 0;
  const osc1 = new OscillatorNode(ctx, { type: 'sine', frequency: fundamentals[0]! });
  const osc2 = new OscillatorNode(ctx, { type: 'sine', frequency: fundamentals[0]! * 1.5 });
  const osc3 = new OscillatorNode(ctx, { type: 'triangle', frequency: fundamentals[0]! * 2 });
  const gain1 = new GainNode(ctx, { gain: 0.2 });
  const gain2 = new GainNode(ctx, { gain: 0.12 });
  const gain3 = new GainNode(ctx, { gain: 0.05 });

  osc1.connect(gain1).connect(dest);
  osc2.connect(gain2).connect(dest);
  osc3.connect(gain3).connect(dest);

  const shiftInterval = setInterval(() => {
    currentIdx = (currentIdx + 1) % fundamentals.length;
    const f = fundamentals[currentIdx]!;
    osc1.frequency.setTargetAtTime(f, ctx.currentTime, 3);
    osc2.frequency.setTargetAtTime(f * 1.5, ctx.currentTime, 3);
    osc3.frequency.setTargetAtTime(f * 2, ctx.currentTime, 3);
  }, 12000);

  [osc1, osc2, osc3].forEach(n => n.start());

  return () => {
    clearInterval(shiftInterval);
    [osc1, osc2, osc3].forEach(n => { try { n.stop(); } catch {} });
    [gain1, gain2, gain3].forEach(n => n.disconnect());
  };
});

// ============================================================================
// Grief Generators (2 variants) — somber, minor, descending
// ============================================================================

/** Grief 1: Descending minor thirds with heavy reverb simulation */
SCENE_REGISTRY.grief.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Sustained minor chord pad
  const notes = [220, 261.63, 329.63]; // A3, C4, E4 (A minor)
  const oscs = notes.map(f => new OscillatorNode(ctx, { type: 'sine', frequency: f }));
  const padGain = new GainNode(ctx, { gain: 0.1 });
  const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 500, Q: 0.7 });
  oscs.forEach(o => o.connect(padGain));
  padGain.connect(filter).connect(dest);

  // Slow descending tones
  const descGain = new GainNode(ctx, { gain: 0 });
  descGain.connect(dest);
  const descInterval = setInterval(() => {
    const startFreq = 400 + Math.random() * 200;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: startFreq });
    const env = new GainNode(ctx, { gain: 0.07 });
    osc.connect(env).connect(descGain);
    osc.start();
    descGain.gain.value = 1;
    osc.frequency.setTargetAtTime(startFreq * 0.7, ctx.currentTime, 2);
    env.gain.setTargetAtTime(0, ctx.currentTime + 2, 1.5);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 8000);
  }, 4000 + Math.random() * 3000);

  oscs.forEach(o => o.start());

  return () => {
    clearInterval(descInterval);
    oscs.forEach(o => { try { o.stop(); } catch {} });
    [padGain, filter, descGain].forEach(n => n.disconnect());
  };
});

/** Grief 2: Hollow resonance with fading echoes */
SCENE_REGISTRY.grief.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Low hollow drone
  const drone = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 73.42 }); // D2
  const droneFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 200, Q: 2 });
  const droneGain = new GainNode(ctx, { gain: 0.15 });
  drone.connect(droneFilter).connect(droneGain).connect(dest);

  // Ghost tones — brief sine bursts that decay
  const ghostGain = new GainNode(ctx, { gain: 0 });
  ghostGain.connect(dest);
  const ghostNotes = [146.83, 174.61, 196, 220]; // D3, F3, G3, A3 — D minor scale fragments
  const ghostInterval = setInterval(() => {
    const freq = ghostNotes[Math.floor(Math.random() * ghostNotes.length)]!;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq });
    const env = new GainNode(ctx, { gain: 0.06 });
    osc.connect(env).connect(ghostGain);
    osc.start();
    ghostGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 0.5, 1.2);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 6000);
  }, 3500 + Math.random() * 3000);

  drone.start();

  return () => {
    clearInterval(ghostInterval);
    try { drone.stop(); } catch {}
    [droneFilter, droneGain, ghostGain].forEach(n => n.disconnect());
  };
});

// ============================================================================
// Elder Generators (2 variants) — contemplative, wise, suspended chords
// ============================================================================

/** Elder 1: Rich suspended chords with slow evolution */
SCENE_REGISTRY.elder.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Csus2 chord: C, D, G
  const freqs = [130.81, 146.83, 196]; // C3, D3, G3
  const oscs = freqs.map(f => new OscillatorNode(ctx, { type: 'sine', frequency: f }));
  const gains = freqs.map(() => new GainNode(ctx, { gain: 0.12 }));
  oscs.forEach((o, i) => o.connect(gains[i]!).connect(dest));

  // Slow harmonic evolution via LFO on filter
  const masterFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 1200, Q: 1.5 });
  const lfo = new OscillatorNode(ctx, { type: 'sine', frequency: 0.04 });
  const lfoGain = new GainNode(ctx, { gain: 600 });
  lfo.connect(lfoGain).connect(masterFilter.frequency);

  // Reroute through filter
  gains.forEach(g => { g.disconnect(); g.connect(masterFilter); });
  masterFilter.connect(dest);

  // Wisdom bells — high sine pings
  const bellGain = new GainNode(ctx, { gain: 0 });
  bellGain.connect(dest);
  const bellInterval = setInterval(() => {
    const bellFreq = 800 + Math.random() * 600;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: bellFreq });
    const env = new GainNode(ctx, { gain: 0.04 });
    osc.connect(env).connect(bellGain);
    osc.start();
    bellGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 0.3, 0.6);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 4000);
  }, 5000 + Math.random() * 4000);

  oscs.forEach(o => o.start());
  lfo.start();

  return () => {
    clearInterval(bellInterval);
    oscs.forEach(o => { try { o.stop(); } catch {} });
    try { lfo.stop(); } catch {}
    [...gains, masterFilter, lfoGain, bellGain].forEach(n => n.disconnect());
  };
});

/** Elder 2: Overtone meditation — harmonics over a deep fundamental */
SCENE_REGISTRY.elder.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  const fundamental = 65.41; // C2
  const harmonics = [1, 2, 3, 4, 5, 6];
  const oscs = harmonics.map(h =>
    new OscillatorNode(ctx, { type: 'sine', frequency: fundamental * h })
  );
  const gains = harmonics.map((_, i) =>
    new GainNode(ctx, { gain: 0.18 / (i + 1) }) // Each harmonic quieter
  );
  oscs.forEach((o, i) => o.connect(gains[i]!).connect(dest));

  // Slowly shift which harmonics are prominent
  let phase = 0;
  const shiftInterval = setInterval(() => {
    phase += 0.3;
    gains.forEach((g, i) => {
      const target = (0.18 / (i + 1)) * (0.5 + 0.5 * Math.sin(phase + i * 0.8));
      g.gain.setTargetAtTime(target, ctx.currentTime, 2);
    });
  }, 4000);

  oscs.forEach(o => o.start());

  return () => {
    clearInterval(shiftInterval);
    oscs.forEach(o => { try { o.stop(); } catch {} });
    gains.forEach(g => g.disconnect());
  };
});

// ============================================================================
// Warning Generator (1 variant) — tense, rhythmic, dissonant
// ============================================================================

/** Warning: Pulsing dissonant drones with rhythmic emphasis */
SCENE_REGISTRY.warning.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Tritone drones — the devil's interval
  const drone1 = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 110 }); // A2
  const drone2 = new OscillatorNode(ctx, { type: 'sawtooth', frequency: 155.56 }); // Eb3 (tritone)
  const droneFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 400, Q: 3 });
  const droneGain = new GainNode(ctx, { gain: 0.12 });

  drone1.connect(droneGain);
  drone2.connect(droneGain);
  droneGain.connect(droneFilter).connect(dest);

  // Rhythmic pulse via LFO on gain
  const pulseLfo = new OscillatorNode(ctx, { type: 'square', frequency: 1.5 });
  const pulseLfoGain = new GainNode(ctx, { gain: 0.06 });
  pulseLfo.connect(pulseLfoGain).connect(droneGain.gain);

  // Tension risers — ascending tones
  const riserGain = new GainNode(ctx, { gain: 0 });
  riserGain.connect(dest);
  const riserInterval = setInterval(() => {
    const startFreq = 150 + Math.random() * 100;
    const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: startFreq });
    const env = new GainNode(ctx, { gain: 0.04 });
    const riserFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 600, Q: 1 });
    osc.connect(riserFilter).connect(env).connect(riserGain);
    osc.start();
    riserGain.gain.value = 1;
    osc.frequency.setTargetAtTime(startFreq * 1.5, ctx.currentTime, 1.5);
    env.gain.setTargetAtTime(0, ctx.currentTime + 1, 0.8);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); riserFilter.disconnect(); }, 4000);
  }, 2500 + Math.random() * 1500);

  [drone1, drone2, pulseLfo].forEach(n => n.start());

  return () => {
    clearInterval(riserInterval);
    [drone1, drone2, pulseLfo].forEach(n => { try { n.stop(); } catch {} });
    [droneFilter, droneGain, pulseLfoGain, riserGain].forEach(n => n.disconnect());
  };
});

// ============================================================================
// Hearth Generator (1 variant) — warm, gentle, comforting
// ============================================================================

/** Hearth: Warm major chord with gentle melodic fragments */
SCENE_REGISTRY.hearth.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // F major chord: F3, A3, C4
  const chordFreqs = [174.61, 220, 261.63];
  const chordOscs = chordFreqs.map(f => new OscillatorNode(ctx, { type: 'sine', frequency: f }));
  const chordGain = new GainNode(ctx, { gain: 0.1 });
  const warmFilter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 600, Q: 0.5 });
  chordOscs.forEach(o => o.connect(chordGain));
  chordGain.connect(warmFilter).connect(dest);

  // Gentle melody — pentatonic major
  const melodyNotes = [349.23, 392, 440, 523.25, 587.33]; // F4, G4, A4, C5, D5
  const melodyGain = new GainNode(ctx, { gain: 0 });
  melodyGain.connect(dest);
  const melodyInterval = setInterval(() => {
    const freq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)]!;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq });
    const env = new GainNode(ctx, { gain: 0.06 });
    osc.connect(env).connect(melodyGain);
    osc.start();
    melodyGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 1.2, 0.8);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 5000);
  }, 3000 + Math.random() * 2500);

  chordOscs.forEach(o => o.start());

  return () => {
    clearInterval(melodyInterval);
    chordOscs.forEach(o => { try { o.stop(); } catch {} });
    [chordGain, warmFilter, melodyGain].forEach(n => n.disconnect());
  };
});

// ============================================================================
// Birth Generator (1 variant) — bright, ascending, hopeful
// ============================================================================

/** Birth: Ascending sparkles over bright major pad */
SCENE_REGISTRY.birth.push((tone, dest) => {
  const ctx = tone.getContext().rawContext as AudioContext;

  // Bright C major pad: C4, E4, G4, B4
  const padFreqs = [261.63, 329.63, 392, 493.88];
  const padOscs = padFreqs.map(f => new OscillatorNode(ctx, { type: 'sine', frequency: f }));
  const padGain = new GainNode(ctx, { gain: 0.08 });
  padOscs.forEach(o => o.connect(padGain));
  padGain.connect(dest);

  // Ascending sparkle arpeggios
  const sparkleNotes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; // C5-C6
  let sparkleIdx = 0;
  const sparkleGain = new GainNode(ctx, { gain: 0 });
  sparkleGain.connect(dest);
  const sparkleInterval = setInterval(() => {
    const freq = sparkleNotes[sparkleIdx % sparkleNotes.length]!;
    sparkleIdx++;
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: freq });
    const env = new GainNode(ctx, { gain: 0.05 });
    osc.connect(env).connect(sparkleGain);
    osc.start();
    sparkleGain.gain.value = 1;
    env.gain.setTargetAtTime(0, ctx.currentTime + 0.4, 0.3);
    setTimeout(() => { try { osc.stop(); } catch {} env.disconnect(); }, 2000);
  }, 800 + Math.random() * 600);

  padOscs.forEach(o => o.start());

  return () => {
    clearInterval(sparkleInterval);
    padOscs.forEach(o => { try { o.stop(); } catch {} });
    [padGain, sparkleGain].forEach(n => n.disconnect());
  };
});

// ============================================================================
// Noise Buffer Helper
// ============================================================================

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// ============================================================================
// ProceduralAudioEngine
// ============================================================================

export class ProceduralAudioEngine {
  private toneLib: ToneLib | null = null;
  private activeScene: ActiveScene | null = null;
  private loading = false;

  /** Lazily load Tone.js (browser-only, dynamic import) */
  private async ensureTone(): Promise<ToneLib | null> {
    if (this.toneLib) return this.toneLib;
    if (typeof window === 'undefined') return null;
    if (this.loading) return null;
    this.loading = true;
    try {
      this.toneLib = await import('tone');
      return this.toneLib;
    } catch {
      return null;
    } finally {
      this.loading = false;
    }
  }

  /** How many distinct variants exist for an occasion */
  variantCount(occasion: SongOccasion): number {
    return SCENE_REGISTRY[occasion].length;
  }

  /** Start playing a procedural scene. Returns false if unable to start. */
  async play(occasion: SongOccasion, variant?: number): Promise<boolean> {
    const tone = await this.ensureTone();
    if (!tone) return false;

    const generators = SCENE_REGISTRY[occasion];
    if (generators.length === 0) return false;

    // Pick variant (random if not specified)
    const idx = variant ?? Math.floor(Math.random() * generators.length);
    const generator = generators[idx % generators.length]!;

    // Ensure AudioContext is running (handles autoplay policy)
    await tone.start();
    const ctx = tone.getContext().rawContext as AudioContext;

    // Master gain for fade control
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0; // Start silent for fade-in
    gainNode.connect(ctx.destination);

    const cleanup = generator(tone, gainNode);

    this.activeScene = { occasion, variant: idx, cleanup, gainNode };
    return true;
  }

  /** Get the master gain node for external fade control */
  getGainNode(): GainNode | null {
    return this.activeScene?.gainNode ?? null;
  }

  /** Get current occasion */
  getCurrentOccasion(): SongOccasion | null {
    return this.activeScene?.occasion ?? null;
  }

  /** Stop the current scene and clean up all nodes */
  stop(): void {
    if (!this.activeScene) return;
    this.activeScene.cleanup();
    this.activeScene.gainNode.disconnect();
    this.activeScene = null;
  }

  /** Whether a scene is currently active */
  isPlaying(): boolean {
    return this.activeScene !== null;
  }
}

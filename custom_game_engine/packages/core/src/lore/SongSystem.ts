/**
 * SongSystem — Plays species songs at contextually appropriate moments
 *
 * Listens to game events (birth, mating, combat, death, age milestones)
 * and plays the appropriate song from the audio catalogue.
 *
 * Uses HTML5 Audio API directly (not Phaser sound manager) since these
 * are long-form cultural tracks, not SFX.
 *
 * Design:
 * - On event: pick random song from occasion pool, crossfade to it
 * - Cooldown: 90s between switches (grief overrides)
 * - Ambient: plays after 60s idle (no triggered song active)
 * - Never two songs at once
 * - Handles browser autoplay policy: stores pending occasion on
 *   NotAllowedError and retries on first user gesture
 * - Audio path and song catalogue are configurable per game
 */

import { BaseSystem } from '../ecs/SystemContext.js';
import type { SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ProceduralAudioEngine } from './ProceduralAudioEngine.js';

// ============================================================================
// Song Catalogue
// ============================================================================

export interface SongEntry {
  filename: string;
  occasion: SongOccasion;
}

export type SongOccasion = 'grief' | 'elder' | 'warning' | 'ambient' | 'hearth' | 'birth';

export interface SongSystemConfig {
  /** Base path for audio files (e.g. '/audio/norn/' or '/audio/mvee/'). Must end with '/'. */
  audioBasePath: string;
  /** Song catalogue for this game. Empty array = no songs (silence). */
  songCatalogue: readonly SongEntry[];
}

/**
 * Default Norn song catalogue. Files served from /audio/norn/.
 * Used when no game-specific catalogue is provided (Creatures compatibility).
 */
export const NORN_SONG_CATALOGUE: readonly SongEntry[] = [
  // Grief / Elder
  { filename: 'Keth Kel Thren.mp3', occasion: 'grief' },
  // Elder
  { filename: 'Keth Shira Vel.mp3', occasion: 'elder' },
  // Warning
  { filename: 'Sha Keth Drak.mp3', occasion: 'warning' },
  // Ambient
  { filename: 'Thi Vellorn Sha.mp3', occasion: 'ambient' },
  { filename: 'Kel Mirshal.mp3', occasion: 'ambient' },
  { filename: 'Lesh Mei Sha.mp3', occasion: 'ambient' },
  // Hearth
  { filename: 'Ain Ven Sel Meshi.mp3', occasion: 'hearth' },
  // Ambient
  { filename: 'Shirath Vel Kelshael.mp3', occasion: 'ambient' },
  // Elder
  { filename: 'Ennamira keth vel sha.mp3', occasion: 'elder' },
  // Ambient
  { filename: 'Vel sha ornmir thi keloth.mp3', occasion: 'ambient' },
] as const;

const DEFAULT_AUDIO_BASE_PATH = '/audio/norn/';
const FADE_DURATION_MS = 2000;
const COOLDOWN_MS = 90_000;
const AMBIENT_IDLE_MS = 60_000;
const FADE_INTERVAL_MS = 50;
const MAX_VOLUME = 1 / 3;

/** Songs played within this window get a recency penalty */
const TAG_RECENCY_DECAY_MS = 5 * 60_000; // 5 minutes
const RECENT_FILENAMES_MAX = 6;
const STORAGE_KEY_TAG_LAST_PLAYED = 'songSystem.tagLastPlayed';
const STORAGE_KEY_RECENT_FILENAMES = 'songSystem.recentFilenames';

// ============================================================================
// SongSystem
// ============================================================================

export class SongSystem extends BaseSystem {
  readonly id = 'song_system' as SystemId;
  readonly priority = 950; // Late in tick — this is a presentation concern
  readonly requiredComponents: readonly string[] = [];
  readonly activationComponents = ['agent'] as const; // Only run when agents exist
  protected readonly throttleInterval = 100; // Check every 5s (ambient timer)

  private readonly audioBasePath: string;
  private readonly songCatalogue: readonly SongEntry[];

  private songsByOccasion = new Map<SongOccasion, SongEntry[]>();
  private currentAudio: HTMLAudioElement | null = null;
  private currentOccasion: SongOccasion | null = null;
  private lastSwitchTime = 0;
  private lastEventTime = 0;
  private isFading = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Tracks when each occasion tag was last played (ms timestamp) */
  private tagLastPlayed = new Map<SongOccasion, number>();
  /** Ring buffer of recently played filenames for variety */
  private recentFilenames: string[] = [];

  /** Occasion queued because autoplay was blocked */
  private pendingOccasion: SongOccasion | null = null;
  /** Whether the user has interacted (unlocking audio) */
  private audioUnlocked = false;
  /** Queued crossfade request if one arrives while fading */
  private queuedCrossfade: { url: string; occasion: SongOccasion } | null = null;
  /** Procedural audio engine — used when song catalogue is empty */
  private proceduralEngine: ProceduralAudioEngine | null = null;
  /** Whether we're using procedural audio (empty catalogue) */
  private readonly useProceduralAudio: boolean;
  /** Fade timer for procedural audio gain ramps */
  private proceduralFadeTimer: ReturnType<typeof setInterval> | null = null;
  /** Bound handler so we can remove it after first gesture */
  private readonly onUserGesture = (): void => {
    this.audioUnlocked = true;
    this.removeGestureListeners();
    if (this.pendingOccasion) {
      const occasion = this.pendingOccasion;
      this.pendingOccasion = null;
      this.playSongForOccasion(occasion);
    }
  };

  constructor(config?: Partial<SongSystemConfig>) {
    super();
    this.audioBasePath = config?.audioBasePath ?? DEFAULT_AUDIO_BASE_PATH;
    this.songCatalogue = config?.songCatalogue ?? NORN_SONG_CATALOGUE;
    this.useProceduralAudio = this.songCatalogue.length === 0;
  }

  protected onInitialize(): void {
    // Guard: only run in browser context
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return;
    }

    if (this.useProceduralAudio) {
      this.proceduralEngine = new ProceduralAudioEngine();
    } else {
      this.buildOccasionIndex();
    }
    this.loadPlayHistory();
    this.subscribeToEvents();
    this.addGestureListeners();
    this.initialized = true;
  }

  protected onUpdate(_ctx: SystemContext): void {
    if (!this.initialized) return;

    // Check ambient timer: if no event-triggered song for AMBIENT_IDLE_MS, play ambient
    const now = Date.now();
    const isPlaying = this.useProceduralAudio
      ? this.proceduralEngine?.isPlaying() ?? false
      : this.currentAudio !== null && !this.currentAudio.paused;

    if (
      this.currentOccasion !== 'ambient' &&
      !this.isFading &&
      (now - this.lastEventTime > AMBIENT_IDLE_MS || !isPlaying)
    ) {
      this.playSongForOccasion('ambient');
    }
  }

  // ============================================================================
  // Autoplay Policy — User Gesture Handling
  // ============================================================================

  private addGestureListeners(): void {
    document.addEventListener('pointerdown', this.onUserGesture, { once: true });
    document.addEventListener('keydown', this.onUserGesture, { once: true });
  }

  private removeGestureListeners(): void {
    document.removeEventListener('pointerdown', this.onUserGesture);
    document.removeEventListener('keydown', this.onUserGesture);
  }

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  private subscribeToEvents(): void {
    // Birth: agent:birth, agent:born
    this.events.on('agent:birth', () => this.onGameEvent('birth'));
    this.events.on('agent:born', () => this.onGameEvent('birth'));

    // Hearth: courtship:consent, conception
    this.events.on('courtship:consent', () => this.onGameEvent('hearth'));
    this.events.on('conception', () => this.onGameEvent('hearth'));

    // Elder: agent:age_milestone (filter for elder)
    this.events.on('agent:age_milestone', (data: { newCategory?: string }) => {
      if (data.newCategory === 'elder') {
        this.onGameEvent('elder');
      }
    });

    // Warning: combat:attack, predator:attack, combat:started
    this.events.on('combat:attack', () => this.onGameEvent('warning'));
    this.events.on('predator:attack', () => this.onGameEvent('warning'));
    this.events.on('combat:started', () => this.onGameEvent('warning'));

    // Grief: agent:died, agent:death (overrides cooldown)
    this.events.on('agent:died', () => this.onGameEvent('grief'));
    this.events.on('agent:death', () => this.onGameEvent('grief'));
  }

  // ============================================================================
  // Playback Logic
  // ============================================================================

  private onGameEvent(occasion: SongOccasion): void {
    const now = Date.now();
    this.lastEventTime = now;

    // Grief overrides cooldown; everything else respects it
    if (occasion !== 'grief' && now - this.lastSwitchTime < COOLDOWN_MS) {
      return;
    }

    // Don't restart same occasion
    if (
      this.currentOccasion === occasion &&
      this.currentAudio &&
      !this.currentAudio.paused
    ) {
      return;
    }

    this.playSongForOccasion(occasion);
  }

  private playSongForOccasion(occasion: SongOccasion): void {
    if (this.useProceduralAudio && this.proceduralEngine) {
      this.playProceduralOccasion(occasion);
      return;
    }

    const pool = this.songsByOccasion.get(occasion);
    if (!pool || pool.length === 0) return;

    const song = this.selectBestSong(pool, occasion);
    if (!song) return;
    this.recordPlay(song, occasion);
    const url = this.audioBasePath + encodeURIComponent(song.filename);

    if (this.currentAudio && !this.currentAudio.paused) {
      this.crossfadeTo(url, occasion);
    } else {
      this.startFresh(url, occasion);
    }
  }

  private startFresh(url: string, occasion: SongOccasion): void {
    this.stopCurrent();

    const audio = new Audio(url);
    audio.volume = 0;
    // Gracefully handle missing audio files — silence instead of crash
    audio.onerror = () => {
      this.stopCurrent();
    };
    this.currentAudio = audio;
    this.currentOccasion = occasion;
    this.lastSwitchTime = Date.now();

    audio.play().then(() => {
      this.pendingOccasion = null;
      this.fadeIn(audio);
    }).catch((err: DOMException) => {
      if (err.name === 'NotAllowedError') {
        // Browser blocked autoplay — store pending occasion for retry on user gesture
        this.pendingOccasion = occasion;
      } else if (err.name === 'AbortError' || err.name === 'NotSupportedError') {
        // Missing or undecodable file — silence gracefully
        this.stopCurrent();
      } else {
        console.error('[SongSystem] Playback failed:', err.message);
      }
    });
  }

  private crossfadeTo(url: string, occasion: SongOccasion): void {
    if (this.isFading) {
      // Queue request — will fire when current fade completes
      this.queuedCrossfade = { url, occasion };
      return;
    }

    const oldAudio = this.currentAudio;
    if (!oldAudio) {
      this.startFresh(url, occasion);
      return;
    }

    this.isFading = true;
    const newAudio = new Audio(url);
    newAudio.volume = 0;
    // Gracefully handle missing audio files — cancel crossfade, keep old playing
    newAudio.onerror = () => {
      this.isFading = false;
      this.queuedCrossfade = null;
    };

    // Fade out old, fade in new simultaneously
    const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
    const oldStartVolume = oldAudio.volume;
    let step = 0;

    newAudio.play().then(() => {
      this.pendingOccasion = null;
      this.fadeTimer = setInterval(() => {
        step++;
        const progress = step / steps;

        oldAudio.volume = Math.max(0, oldStartVolume * (1 - progress));
        newAudio.volume = Math.min(MAX_VOLUME, progress * MAX_VOLUME);

        if (step >= steps) {
          if (this.fadeTimer !== null) {
            clearInterval(this.fadeTimer);
            this.fadeTimer = null;
          }
          oldAudio.pause();
          oldAudio.src = '';
          this.currentAudio = newAudio;
          this.currentOccasion = occasion;
          this.lastSwitchTime = Date.now();
          this.isFading = false;

          // Drain queued crossfade request if one arrived during fade
          if (this.queuedCrossfade) {
            const queued = this.queuedCrossfade;
            this.queuedCrossfade = null;
            this.crossfadeTo(queued.url, queued.occasion);
          }
        }
      }, FADE_INTERVAL_MS);
    }).catch((err: DOMException) => {
      if (err.name === 'NotAllowedError') {
        this.pendingOccasion = occasion;
      } else if (err.name === 'AbortError' || err.name === 'NotSupportedError') {
        // Missing or undecodable file — cancel crossfade gracefully
      } else {
        console.error('[SongSystem] Crossfade playback failed:', err.message);
      }
      this.isFading = false;
    });
  }

  private fadeIn(audio: HTMLAudioElement): void {
    const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
    let step = 0;
    this.fadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.min(MAX_VOLUME, (step / steps) * MAX_VOLUME);
      if (step >= steps) {
        if (this.fadeTimer !== null) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
      }
    }, FADE_INTERVAL_MS);
  }

  // ============================================================================
  // Procedural Audio Playback
  // ============================================================================

  private playProceduralOccasion(occasion: SongOccasion): void {
    if (!this.proceduralEngine) return;

    // If same occasion is already playing, skip
    if (this.proceduralEngine.getCurrentOccasion() === occasion && this.proceduralEngine.isPlaying()) {
      return;
    }

    // Crossfade: fade out current, start new
    if (this.proceduralEngine.isPlaying()) {
      this.proceduralCrossfadeTo(occasion);
    } else {
      this.proceduralStartFresh(occasion);
    }
  }

  private proceduralStartFresh(occasion: SongOccasion): void {
    this.proceduralEngine!.stop();
    this.proceduralEngine!.play(occasion).then(started => {
      if (!started) return;
      this.currentOccasion = occasion;
      this.lastSwitchTime = Date.now();
      // Fade in
      const gainNode = this.proceduralEngine!.getGainNode();
      if (gainNode) {
        this.proceduralFadeGain(gainNode, 0, MAX_VOLUME, FADE_DURATION_MS);
      }
    }).catch(() => {
      // Tone.js failed to start — likely autoplay blocked, store pending
      this.pendingOccasion = occasion;
    });
  }

  private proceduralCrossfadeTo(occasion: SongOccasion): void {
    if (this.isFading) return;
    this.isFading = true;

    const oldGain = this.proceduralEngine!.getGainNode();

    // Fade out old scene
    if (oldGain) {
      this.proceduralFadeGain(oldGain, oldGain.gain.value, 0, FADE_DURATION_MS);
    }

    // After fade-out, stop old and start new
    setTimeout(() => {
      this.proceduralEngine!.stop();
      this.proceduralEngine!.play(occasion).then(started => {
        this.isFading = false;
        if (!started) return;
        this.currentOccasion = occasion;
        this.lastSwitchTime = Date.now();
        const newGain = this.proceduralEngine!.getGainNode();
        if (newGain) {
          this.proceduralFadeGain(newGain, 0, MAX_VOLUME, FADE_DURATION_MS);
        }
      }).catch(() => {
        this.isFading = false;
      });
    }, FADE_DURATION_MS);
  }

  private proceduralFadeGain(gainNode: GainNode, from: number, to: number, durationMs: number): void {
    if (this.proceduralFadeTimer !== null) {
      clearInterval(this.proceduralFadeTimer);
    }
    const steps = durationMs / FADE_INTERVAL_MS;
    let step = 0;
    gainNode.gain.value = from;
    this.proceduralFadeTimer = setInterval(() => {
      step++;
      const progress = step / steps;
      gainNode.gain.value = from + (to - from) * progress;
      if (step >= steps) {
        gainNode.gain.value = to;
        if (this.proceduralFadeTimer !== null) {
          clearInterval(this.proceduralFadeTimer);
          this.proceduralFadeTimer = null;
        }
      }
    }, FADE_INTERVAL_MS);
  }

  private stopCurrent(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.proceduralFadeTimer !== null) {
      clearInterval(this.proceduralFadeTimer);
      this.proceduralFadeTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (this.proceduralEngine?.isPlaying()) {
      this.proceduralEngine.stop();
    }
    this.currentOccasion = null;
    this.isFading = false;
  }

  // ============================================================================
  // Adaptive Selection
  // ============================================================================

  /**
   * Score each song in the pool and pick the best one.
   * Base score 5, penalize recently played filenames (-3) and recently
   * used occasion tags (up to -2 decaying over TAG_RECENCY_DECAY_MS),
   * then add random jitter (0–0.5) so ties break differently each time.
   */
  private selectBestSong(pool: SongEntry[], occasion: SongOccasion): SongEntry | undefined {
    const now = Date.now();
    let bestSong: SongEntry | undefined;
    let bestScore = -Infinity;

    for (const song of pool) {
      let score = 5;

      // Penalize songs in the recent play ring buffer
      if (this.recentFilenames.includes(song.filename)) {
        score -= 3;
      }

      // Penalize the occasion tag if it was played recently
      const tagTime = this.tagLastPlayed.get(occasion);
      if (tagTime !== undefined) {
        const elapsed = now - tagTime;
        if (elapsed < TAG_RECENCY_DECAY_MS) {
          // Linear decay: full -2 penalty at 0 elapsed, 0 at decay threshold
          score -= 2 * (1 - elapsed / TAG_RECENCY_DECAY_MS);
        }
      }

      // Random jitter to break ties — wide range for more variety
      score += Math.random() * 1.5;

      if (score > bestScore) {
        bestScore = score;
        bestSong = song;
      }
    }

    return bestSong;
  }

  /** Record that a song was played, updating recency maps and persisting. */
  private recordPlay(song: SongEntry, occasion: SongOccasion): void {
    const now = Date.now();

    // Update tag recency
    this.tagLastPlayed.set(occasion, now);

    // Update filename ring buffer
    this.recentFilenames.push(song.filename);
    if (this.recentFilenames.length > RECENT_FILENAMES_MAX) {
      this.recentFilenames.shift();
    }

    this.savePlayHistory();
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private loadPlayHistory(): void {
    try {
      const tagJson = localStorage.getItem(STORAGE_KEY_TAG_LAST_PLAYED);
      if (tagJson) {
        const entries: [SongOccasion, number][] = JSON.parse(tagJson);
        this.tagLastPlayed = new Map(entries);
      }

      const recentJson = localStorage.getItem(STORAGE_KEY_RECENT_FILENAMES);
      if (recentJson) {
        const filenames: string[] = JSON.parse(recentJson);
        this.recentFilenames = filenames;
      }
    } catch {
      // Corrupted storage — start fresh, no silent fallback needed
      this.tagLastPlayed.clear();
      this.recentFilenames = [];
    }
  }

  private savePlayHistory(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY_TAG_LAST_PLAYED,
        JSON.stringify(Array.from(this.tagLastPlayed.entries()))
      );
      localStorage.setItem(
        STORAGE_KEY_RECENT_FILENAMES,
        JSON.stringify(this.recentFilenames)
      );
    } catch {
      // localStorage full or unavailable — non-critical, skip silently
    }
  }

  // ============================================================================
  // Setup
  // ============================================================================

  private buildOccasionIndex(): void {
    this.songsByOccasion.clear();
    for (const entry of this.songCatalogue) {
      const pool = this.songsByOccasion.get(entry.occasion);
      if (pool) {
        pool.push(entry);
      } else {
        this.songsByOccasion.set(entry.occasion, [entry]);
      }
    }

    // Shuffle each pool so iteration order varies per session
    for (const pool of this.songsByOccasion.values()) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = pool[i];
        pool[i] = pool[j]!;
        pool[j] = temp!;
      }
    }
  }
}

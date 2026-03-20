/**
 * SongSystem — Plays species songs at contextually appropriate moments
 *
 * Listens to game events (birth, mating, combat, death, age milestones)
 * and plays the appropriate Norn song from the audio catalogue.
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
 */

import { BaseSystem } from '../ecs/SystemContext.js';
import type { SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';

// ============================================================================
// Song Catalogue
// ============================================================================

interface SongEntry {
  filename: string;
  occasion: SongOccasion;
}

type SongOccasion = 'grief' | 'elder' | 'warning' | 'ambient' | 'hearth' | 'birth';

/**
 * Canonical song catalogue. Files served from /audio/norn/.
 * Occasions match the mp3s described in the task spec.
 */
const SONG_CATALOGUE: readonly SongEntry[] = [
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

const AUDIO_BASE_PATH = '/audio/norn/';
const FADE_DURATION_MS = 2000;
const COOLDOWN_MS = 90_000;
const AMBIENT_IDLE_MS = 60_000;
const FADE_INTERVAL_MS = 50;

// ============================================================================
// SongSystem
// ============================================================================

export class SongSystem extends BaseSystem {
  readonly id = 'song_system' as SystemId;
  readonly priority = 950; // Late in tick — this is a presentation concern
  readonly requiredComponents: readonly string[] = [];
  protected readonly throttleInterval = 100; // Check every 5s (ambient timer)

  private songsByOccasion = new Map<SongOccasion, SongEntry[]>();
  private currentAudio: HTMLAudioElement | null = null;
  private currentOccasion: SongOccasion | null = null;
  private lastSwitchTime = 0;
  private lastEventTime = 0;
  private isFading = false;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Occasion queued because autoplay was blocked */
  private pendingOccasion: SongOccasion | null = null;
  /** Whether the user has interacted (unlocking audio) */
  private audioUnlocked = false;
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

  protected onInitialize(): void {
    // Guard: only run in browser context
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return;
    }

    this.buildOccasionIndex();
    this.subscribeToEvents();
    this.addGestureListeners();
    this.initialized = true;
  }

  protected onUpdate(_ctx: SystemContext): void {
    if (!this.initialized) return;

    // Check ambient timer: if no event-triggered song for AMBIENT_IDLE_MS, play ambient
    const now = Date.now();
    if (
      this.currentOccasion !== 'ambient' &&
      !this.isFading &&
      now - this.lastEventTime > AMBIENT_IDLE_MS
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
    const pool = this.songsByOccasion.get(occasion);
    if (!pool || pool.length === 0) return;

    const song = pool[Math.floor(Math.random() * pool.length)];
    if (!song) return;
    const url = AUDIO_BASE_PATH + encodeURIComponent(song.filename);

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
      } else {
        console.warn('[SongSystem] Playback failed:', err.message);
      }
    });
  }

  private crossfadeTo(url: string, occasion: SongOccasion): void {
    if (this.isFading) return;

    const oldAudio = this.currentAudio;
    if (!oldAudio) {
      this.startFresh(url, occasion);
      return;
    }

    this.isFading = true;
    const newAudio = new Audio(url);
    newAudio.volume = 0;

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
        newAudio.volume = Math.min(1, progress);

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
        }
      }, FADE_INTERVAL_MS);
    }).catch((err: DOMException) => {
      if (err.name === 'NotAllowedError') {
        this.pendingOccasion = occasion;
      } else {
        console.warn('[SongSystem] Crossfade playback failed:', err.message);
      }
      this.isFading = false;
    });
  }

  private fadeIn(audio: HTMLAudioElement): void {
    const steps = FADE_DURATION_MS / FADE_INTERVAL_MS;
    let step = 0;
    this.fadeTimer = setInterval(() => {
      step++;
      audio.volume = Math.min(1, step / steps);
      if (step >= steps) {
        if (this.fadeTimer !== null) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
      }
    }, FADE_INTERVAL_MS);
  }

  private stopCurrent(): void {
    if (this.fadeTimer !== null) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    this.currentOccasion = null;
    this.isFading = false;
  }

  // ============================================================================
  // Setup
  // ============================================================================

  private buildOccasionIndex(): void {
    this.songsByOccasion.clear();
    for (const entry of SONG_CATALOGUE) {
      const pool = this.songsByOccasion.get(entry.occasion);
      if (pool) {
        pool.push(entry);
      } else {
        this.songsByOccasion.set(entry.occasion, [entry]);
      }
    }
  }
}

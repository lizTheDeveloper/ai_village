/**
 * AchievementService - MVEE achievement tracking system
 *
 * Subscribes to game events that trigger achievement unlocks, emits
 * notification events for UI toasts, and posts unlock records to the
 * server proxy at POST /api/achievements/unlock.
 *
 * Priority 910 — Utility tier, runs after main gameplay systems.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// ============================================================================
// Achievement Definitions
// ============================================================================

interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
}

const ACHIEVEMENTS: Record<string, AchievementDefinition> = {
  'mvee:exploration:first_biome': {
    id: 'mvee:exploration:first_biome',
    title: 'New Horizons',
    description: 'Discovered the first biome',
  },
  'mvee:combat:first_victory': {
    id: 'mvee:combat:first_victory',
    title: 'Trial by Fire',
    description: 'Won the first combat encounter',
  },
  'mvee:building:first_construction': {
    id: 'mvee:building:first_construction',
    title: 'Foundation Stone',
    description: 'Completed the first building',
  },
};

// ============================================================================
// System
// ============================================================================

export class AchievementService extends BaseSystem {
  public readonly id = 'achievement_service' as const;
  public readonly priority = 910; // Utility tier, after main gameplay
  public readonly requiredComponents: string[] = [];
  public readonly activationComponents = [CT.Agent] as const;
  protected readonly throttleInterval = 100; // Every 5 seconds at 20 ticks/s

  /** Set of already-unlocked achievement IDs (prevents duplicates) */
  private unlockedIds: Set<string> = new Set();

  /** Queued unlocks from event handlers, drained each update */
  private pendingUnlocks: AchievementDefinition[] = [];

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  protected onInitialize(): void {
    this.events.onGeneric('civilization:biome_discovered', () => {
      this.queueUnlock('mvee:exploration:first_biome');
    });

    this.events.onGeneric('combat:victory', () => {
      this.queueUnlock('mvee:combat:first_victory');
    });

    this.events.onGeneric('building:completed', () => {
      this.queueUnlock('mvee:building:first_construction');
    });
  }

  protected onUpdate(_ctx: SystemContext): void {
    for (const achievement of this.pendingUnlocks) {
      this.processUnlock(achievement);
    }
    this.pendingUnlocks.length = 0;
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private queueUnlock(achievementId: string): void {
    if (this.unlockedIds.has(achievementId)) return;
    const def = ACHIEVEMENTS[achievementId];
    if (!def) return;
    this.unlockedIds.add(achievementId);
    this.pendingUnlocks.push(def);
  }

  private processUnlock(achievement: AchievementDefinition): void {
    // Emit notification so the UI can display a toast
    this.events.emitGeneric('achievement:unlocked', {
      achievementId: achievement.id,
      title: achievement.title,
      description: achievement.description,
    });

    // Fire-and-forget POST to server proxy; failure is intentionally silent so
    // the local UI notification always shows regardless of server availability.
    this.postAchievementUnlock(achievement.id).catch((err) => {
      console.error(`[AchievementService] Failed to post unlock for ${achievement.id}:`, err);
    });
  }

  private async postAchievementUnlock(achievementId: string): Promise<void> {
    // Only attempt in browser environments where fetch is available
    if (typeof fetch === 'undefined') return;

    const win = typeof window !== 'undefined' ? window : undefined;
    const metricsUrl = win ? (win as Window & { __METRICS_URL?: string }).__METRICS_URL : undefined;
    const baseUrl = metricsUrl ?? 'http://localhost:8766';

    await fetch(`${baseUrl}/api/achievements/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        achievementId,
        playerId: 'local-player', // Placeholder until player auth exists
      }),
    });
  }
}

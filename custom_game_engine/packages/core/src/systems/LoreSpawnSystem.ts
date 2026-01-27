/**
 * LoreSpawnSystem - Spawns lore fragments based on player engagement
 *
 * Tracks player interest in magic and divine systems, then spawns lore
 * fragments to guide them toward the rebellion path. The more they engage
 * with forbidden magic and face consequences, the more lore appears.
 *
 * Design:
 * - Trivial lore spawns randomly from the start
 * - Minor lore requires basic magic usage
 * - Major lore requires multiple detections/interventions
 * - Critical lore requires severe consequences (marked, silenced, etc.)
 * - Climactic lore only appears when ready for war path
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import { ComponentType } from '../types/ComponentType.js';
import {
  LORE_FRAGMENTS,
  type LoreFragmentComponent,
  type LoreImportance,
} from '../components/LoreFragmentComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';

/**
 * Tracks player engagement with divine progression systems
 */
interface EngagementMetrics {
  /** Total spells cast */
  totalSpellsCast: number;

  /** Number of times magic was detected */
  magicDetections: number;

  /** Number of divine interventions received */
  interventionsReceived: number;

  /** Number of entities with Mark of the Sinner */
  markedSinners: number;

  /** Number of entities with Divine Silence */
  silencedEntities: number;

  /** Number of banned spells */
  bannedSpells: number;

  /** Last time lore was spawned (tick) */
  lastSpawnTick: number;

  /** Fragments already spawned (by ID) */
  spawnedFragments: Set<string>;
}

/**
 * Spawn chances based on importance level
 */
const BASE_SPAWN_CHANCES: Record<LoreImportance, number> = {
  trivial: 0.05, // 5% per check
  minor: 0.03, // 3% per check
  major: 0.02, // 2% per check
  critical: 0.01, // 1% per check
  climactic: 0.005, // 0.5% per check (very rare)
};

/**
 * Minimum engagement thresholds to unlock each tier
 */
interface EngagementThreshold {
  totalSpellsCast?: number;
  magicDetections?: number;
  interventionsReceived?: number;
  markedSinners?: number;
  silencedEntities?: number;
  bannedSpells?: number;
}

const ENGAGEMENT_THRESHOLDS: Record<LoreImportance, EngagementThreshold> = {
  trivial: {}, // Always available
  minor: {
    totalSpellsCast: 5, // Cast at least 5 spells
  },
  major: {
    magicDetections: 3, // Detected at least 3 times
    interventionsReceived: 2, // Received at least 2 interventions
  },
  critical: {
    magicDetections: 10,
    interventionsReceived: 5,
    markedSinners: 1, // Someone has been marked
  },
  climactic: {
    magicDetections: 30,
    interventionsReceived: 15,
    markedSinners: 3,
    silencedEntities: 1, // Someone has been silenced
    bannedSpells: 2, // At least 2 spells banned
  },
};

export class LoreSpawnSystem extends BaseSystem {
  public readonly id: SystemId = 'lore_spawn';
  public readonly priority = 50; // Run late, after magic/intervention systems
  public readonly requiredComponents = [] as const;
  public readonly activationComponents = ['lore_spawn_request'] as const; // Lazy activation: Skip entire system when no lore spawns requested

  protected readonly throttleInterval = 600; // 30 seconds at 20 TPS

  private metrics: EngagementMetrics = {
    totalSpellsCast: 0,
    magicDetections: 0,
    interventionsReceived: 0,
    markedSinners: 0,
    silencedEntities: 0,
    bannedSpells: 0,
    lastSpawnTick: 0,
    spawnedFragments: new Set(),
  };

  protected onInitialize(): void {
    // Listen to magic and divine events
    this.events.on('magic:spell_cast', () => {
      this.metrics.totalSpellsCast++;
    });

    this.events.on('divinity:magic_detected', () => {
      this.metrics.magicDetections++;
    });

    this.events.on('divinity:creator_intervention', () => {
      this.metrics.interventionsReceived++;
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Update metrics from world state
    this.updateMetricsFromWorld(ctx.world);

    // Try to spawn lore
    this.attemptLoreSpawn(ctx.world);
  }

  /**
   * Update metrics by scanning current world state
   * (for things like marked sinners, silenced entities, banned spells)
   */
  private updateMetricsFromWorld(world: World): void {
    // Get CreatorInterventionSystem to check for marks/silence/bans
    const interventionSystem = world.getSystem('creator_intervention');
    if (!interventionSystem) {
      return;
    }

    // Type guard: Check if system has the expected methods
    if (!this.hasInterventionMethods(interventionSystem)) {
      return;
    }

    const creatorIntervention = interventionSystem;

    // Count entities with Mark of the Sinner
    // Note: Cannot optimize with queries as marks/silence are stored in CreatorInterventionSystem's
    // activeInterventions Map, not as components. Only agents can have these, so query for agents.
    let markedCount = 0;
    let silencedCount = 0;

    // Only check agents (entities with CT.Agent) instead of all entities
    const agentEntities = world.query().with(ComponentType.Agent).executeEntities();
    for (const entity of agentEntities) {
      if (creatorIntervention.hasMarkOfSinner && creatorIntervention.hasMarkOfSinner(entity.id)) {
        markedCount++;
      }
      if (creatorIntervention.hasDivineSilence && creatorIntervention.hasDivineSilence(entity.id)) {
        silencedCount++;
      }
    }

    // Update metrics
    this.metrics.markedSinners = markedCount;
    this.metrics.silencedEntities = silencedCount;

    // Count banned spells
    if (creatorIntervention.bannedSpells) {
      this.metrics.bannedSpells = creatorIntervention.bannedSpells.size || 0;
    }
  }

  /**
   * Attempt to spawn lore fragments based on engagement
   */
  private attemptLoreSpawn(world: World): void {
    const availableFragments = this.getAvailableFragments();

    if (availableFragments.length === 0) {
      return;
    }

    // Roll for each fragment
    for (const fragment of availableFragments) {
      const spawnChance = BASE_SPAWN_CHANCES[fragment.importance];

      if (Math.random() < spawnChance) {
        this.spawnFragment(world, fragment);
        // Only spawn one fragment per check to avoid spam
        return;
      }
    }
  }

  /**
   * Get fragments that haven't been spawned yet and meet engagement thresholds
   */
  private getAvailableFragments(): LoreFragmentComponent[] {
    const available: LoreFragmentComponent[] = [];

    for (const fragment of Object.values(LORE_FRAGMENTS)) {
      // Skip if already spawned
      if (this.metrics.spawnedFragments.has(fragment.fragmentId)) {
        continue;
      }

      // Check if engagement threshold is met
      if (this.meetsThreshold(fragment.importance)) {
        available.push(fragment);
      }
    }

    return available;
  }

  /**
   * Check if current engagement meets the threshold for an importance tier
   */
  private meetsThreshold(importance: LoreImportance): boolean {
    const threshold = ENGAGEMENT_THRESHOLDS[importance];

    if (threshold.totalSpellsCast !== undefined && this.metrics.totalSpellsCast < threshold.totalSpellsCast) {
      return false;
    }

    if (threshold.magicDetections !== undefined && this.metrics.magicDetections < threshold.magicDetections) {
      return false;
    }

    if (
      threshold.interventionsReceived !== undefined &&
      this.metrics.interventionsReceived < threshold.interventionsReceived
    ) {
      return false;
    }

    if (threshold.markedSinners !== undefined && this.metrics.markedSinners < threshold.markedSinners) {
      return false;
    }

    if (threshold.silencedEntities !== undefined && this.metrics.silencedEntities < threshold.silencedEntities) {
      return false;
    }

    if (threshold.bannedSpells !== undefined && this.metrics.bannedSpells < threshold.bannedSpells) {
      return false;
    }

    return true;
  }

  /**
   * Spawn a lore fragment entity in the world
   */
  private spawnFragment(world: World, fragment: LoreFragmentComponent): void {
    // Mark as spawned
    this.metrics.spawnedFragments.add(fragment.fragmentId);

    // Create entity
    const entity = world.createEntity();

    // EntityImpl cast is necessary for addComponent (internal mutable interface)
    // Entity interface is readonly, only EntityImpl exposes addComponent
    const entityImpl = entity as EntityImpl;

    // Add lore fragment component
    const loreComponent: LoreFragmentComponent = {
      ...fragment,
      hasBeenRead: false,
      discoveredAt: world.tick,
    };
    entityImpl.addComponent(loreComponent);

    // Add position (random location)
    const x = Math.random() * 1000 - 500;
    const y = Math.random() * 1000 - 500;
    entityImpl.addComponent(createPositionComponent(x, y));

    // Add renderable (visual representation)
    const glyphByCategory: Record<string, string> = {
      creator_weakness: '📜',
      ancient_rebellion: '⚔️',
      interdimensional: '🌀',
      forbidden_magic: '🔮',
      wild_magic: '✨',
      deity_secrets: '👁️',
      world_history: '📖',
      flavor: '📝',
    };

    entityImpl.addComponent(
      createRenderableComponent(glyphByCategory[fragment.category] || '📄')
    );

    // Emit typed event
    this.events.emit('lore:spawned', {
      fragmentId: fragment.fragmentId,
      title: fragment.title,
      importance: fragment.importance,
      category: fragment.category,
      entityId: entity.id,
      position: { x, y },
    }, entity.id);
  }

  // ============ Public API ============

  /**
   * Get current engagement metrics (for debugging/testing)
   */
  public getMetrics(): Readonly<EngagementMetrics> {
    return { ...this.metrics, spawnedFragments: new Set(this.metrics.spawnedFragments) };
  }

  /**
   * Check if a specific fragment has been spawned
   */
  public hasSpawned(fragmentId: string): boolean {
    return this.metrics.spawnedFragments.has(fragmentId);
  }

  /**
   * Get all spawned fragment entities
   */
  public getSpawnedFragments(world: World): string[] {
    // Query for all entities with lore_frag component
    const loreEntities = world.query().with(ComponentType.LoreFrag).executeEntities();
    return loreEntities.map((entity) => entity.id);
  }

  /**
   * Type guard for CreatorInterventionSystem methods
   */
  private hasInterventionMethods(system: unknown): system is {
    hasMarkOfSinner?: (entityId: string) => boolean;
    hasDivineSilence?: (entityId: string) => boolean;
    bannedSpells?: Set<string> | Map<string, unknown>;
  } {
    return (
      typeof system === 'object' &&
      system !== null
    );
  }
}

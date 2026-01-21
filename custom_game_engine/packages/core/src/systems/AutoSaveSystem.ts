/**
 * AutoSaveSystem - Automatic daily checkpoints for time travel
 *
 * Instead of manual saves, the world automatically checkpoints at midnight.
 * Each checkpoint gets an LLM-generated name and can be rewound to (creating a universe fork).
 *
 * Features:
 * - Saves at midnight every game day
 * - Smart retention policy (first 90 days: all, after: first 10, milestones, canon events)
 * - LLM-generated poetic names for each checkpoint
 * - Universe identity based on magic law configuration
 * - Canon event detection (deaths, births, marriages, first achievements)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { saveLoadService, type CanonEvent as ServerCanonEvent } from '../persistence/SaveLoadService.js';
import { canonEventDetector, type CanonEvent as LocalCanonEvent } from './CanonEventDetector.js';
import { checkpointRetentionPolicy } from './CheckpointRetentionPolicy.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import { MagicSystemStateManager } from '../magic/MagicSystemState.js';

/** Time component shape for duck typing */
interface TimeData {
  day?: number;
  hour?: number;
}

export interface Checkpoint {
  key: string;
  name: string;
  day: number;
  tick: number;
  timestamp: number;
  universeId: string;
  magicLawsHash: string;
}

export class AutoSaveSystem extends BaseSystem {
  public readonly id: SystemId = 'auto_save';
  public readonly priority: number = 999; // Run last
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Time];
  // Only run when time components exist (O(1) activation check)
  public readonly activationComponents = [CT.Time] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private lastSaveDay: number = -1;
  private checkpoints: Checkpoint[] = [];
  private nameGenerationPending: boolean = false;
  private canonEventDetectorAttached: boolean = false;
  private llmQueue: LLMDecisionQueue | null = null;

  /** Pending name generation requests (checkpoint key -> request tick) */
  private pendingNameRequests = new Map<string, number>();

  /**
   * Create an AutoSaveSystem.
   *
   * @param llmQueue Optional LLM decision queue for generating poetic checkpoint names
   */
  constructor(llmQueue?: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue ?? null;
  }

  protected onInitialize(world: World, _eventBus: EventBus): void {
    // Attach canon event detector on initialization
    canonEventDetector.attachToWorld(world);
    this.canonEventDetectorAttached = true;
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, world } = ctx;

    // Find time entity
    const timeEntity = activeEntities[0];
    if (!timeEntity) return;

    const impl = timeEntity as EntityImpl;
    const time = impl.getComponent(CT.Time) as TimeData;
    if (!time || time.day === undefined) return;

    // Check if we just transitioned to a new day
    const currentDay = time.day;

    // Save at midnight (when day changes)
    if (currentDay > this.lastSaveDay && this.lastSaveDay >= 0) {
      this.createCheckpoint(world, currentDay);

      // Check if we need to prune old checkpoints (at end of month)
      if (currentDay % 30 === 0) {
        this.pruneOldCheckpoints(currentDay);
      }
    }

    this.lastSaveDay = currentDay;

    // Process pending LLM name generation responses
    if (this.llmQueue) {
      this.processPendingNameRequests(world);
    }
  }

  /**
   * Convert a local canon event to the server format.
   */
  private toServerCanonEvent(event: LocalCanonEvent): ServerCanonEvent {
    return {
      type: event.type,
      title: event.title,
      description: event.description,
      day: event.day,
      importance: event.importance,
      entities: event.entities,
    };
  }

  /**
   * Create a checkpoint at midnight.
   */
  private async createCheckpoint(world: World, day: number): Promise<void> {
    if (this.nameGenerationPending) {
      return; // Already creating a checkpoint
    }

    this.nameGenerationPending = true;

    try {
      // Generate checkpoint key
      const key = `checkpoint_day${day}_${Date.now()}`;

      // Get magic laws hash for universe identity
      const magicLawsHash = this.getMagicLawsHash(world);

      // Get universe ID (based on magic laws)
      const universeId = `universe:${magicLawsHash}`;

      // Check for canon events on this day
      const todaysCanonEvents = canonEventDetector.getEventsForDay(day);
      const hasCanonEvent = todaysCanonEvents.length > 0;
      const mostImportantEvent = hasCanonEvent
        ? todaysCanonEvents.reduce((a, b) => a.importance > b.importance ? a : b)
        : null;

      // Get universe name from world (set by main.ts)
      // Note: universeId/name are set by multiverse package but not in World interface
      const universeName = '_universeName' in world
        ? (world as { _universeName: string })._universeName
        : 'Universe';

      // Generate checkpoint name including universe name
      // Use canon event title if available
      const checkpointName = mostImportantEvent
        ? `${universeName} - Day ${day}: ${mostImportantEvent.title}`
        : `${universeName} - Day ${day}`;

      // Create checkpoint metadata
      const checkpoint: Checkpoint = {
        key,
        name: checkpointName,
        day,
        tick: world.tick,
        timestamp: Date.now(),
        universeId,
        magicLawsHash,
      };

      // Save the world state with canon event info for server sync
      await saveLoadService.save(world, {
        name: checkpointName,
        description: hasCanonEvent
          ? `Canonical checkpoint: ${mostImportantEvent!.description}`
          : `Automatic checkpoint at day ${day}`,
        key,
        type: hasCanonEvent ? 'canonical' : 'auto',
        canonEvent: mostImportantEvent
          ? this.toServerCanonEvent(mostImportantEvent)
          : undefined,
      });

      // Add to checkpoints list
      this.checkpoints.push(checkpoint);

      // Emit event for name generation
      this.events.emitGeneric('checkpoint:created', { checkpoint });

      // Request LLM to generate a poetic name asynchronously
      this.generateCheckpointName(checkpoint, world);
    } catch (error) {
      console.error('[AutoSave] Failed to create checkpoint:', error);
    } finally {
      this.nameGenerationPending = false;
    }
  }

  /**
   * Prune old checkpoints based on retention policy.
   * Called at the end of each month.
   */
  private async pruneOldCheckpoints(currentDay: number): Promise<void> {
    const canonEvents = [...canonEventDetector.getCanonEvents()];

    // Get checkpoints that should be deleted
    const toDelete = checkpointRetentionPolicy.getCheckpointsToDelete(
      this.checkpoints,
      currentDay,
      canonEvents
    );

    if (toDelete.length === 0) {
      return;
    }


    // Delete checkpoints
    for (const checkpoint of toDelete) {
      try {
        await saveLoadService.deleteSave(checkpoint.key);
      } catch (error) {
        console.error(`[AutoSave] Failed to delete checkpoint ${checkpoint.key}:`, error);
      }
    }

    // Remove from in-memory list
    const deletedKeys = new Set(toDelete.map(c => c.key));
    this.checkpoints = this.checkpoints.filter(c => !deletedKeys.has(c.key));

  }

  /**
   * Generate a hash of the magic law configuration.
   * Universes with the same magic laws share the same universe ID.
   *
   * Uses MagicSystemStateManager to get paradigm states and creates
   * a deterministic hash based on enabled/active paradigms.
   */
  private getMagicLawsHash(_world: World): string {
    // Get magic system state manager singleton
    const magicState = MagicSystemStateManager.getInstance();
    const paradigmIds = magicState.getParadigmIds();

    if (paradigmIds.length === 0) {
      // No magic paradigms registered = base universe
      return 'base';
    }

    // Build deterministic hash from paradigm states
    // Sort paradigm IDs for consistent ordering
    const sortedIds = [...paradigmIds].sort();

    // Collect state information for each paradigm
    const stateData: string[] = [];
    for (const paradigmId of sortedIds) {
      const state = magicState.getState(paradigmId);
      // Only include enabled or active paradigms in hash
      if (state !== 'disabled') {
        stateData.push(`${paradigmId}:${state}`);
      }
    }

    if (stateData.length === 0) {
      // All paradigms disabled = base universe
      return 'base';
    }

    // Create simple hash from joined state string
    const stateString = stateData.join('|');
    let hash = 0;
    for (let i = 0; i < stateString.length; i++) {
      const char = stateString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `magic_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Generate a poetic name for the checkpoint using LLM.
   */
  private async generateCheckpointName(checkpoint: Checkpoint, world: World): Promise<void> {
    if (!this.llmQueue) {
      // No LLM queue - emit event for potential external handling
      this.events.emitGeneric('checkpoint:name_request', { checkpoint });
      return;
    }

    // Build LLM prompt with world context
    const prompt = this.buildCheckpointNamePrompt(checkpoint, world);

    // Queue LLM request using checkpoint key as ID
    // Note: requestDecision returns Promise<string> but we don't need the immediate result
    // We'll poll for it later using getDecision()
    this.llmQueue.requestDecision(checkpoint.key, prompt).catch((error) => {
      console.error('[AutoSave] Failed to queue LLM name generation:', error);
    });

    // Track pending request
    this.pendingNameRequests.set(checkpoint.key, world.tick);
  }

  /**
   * Build LLM prompt for generating a poetic checkpoint name.
   */
  private buildCheckpointNamePrompt(checkpoint: Checkpoint, world: World): string {
    // Get world stats
    const agents = world.query().with(CT.Agent).executeEntities();
    const buildings = world.query().with(CT.Building).executeEntities();

    // Get canon events for this day
    const todaysCanonEvents = canonEventDetector.getEventsForDay(checkpoint.day);

    let prompt = `You are naming a moment in history for a simulated world.\n\n`;
    prompt += `Day ${checkpoint.day} - Universe: ${checkpoint.universeId}\n`;
    prompt += `Population: ${agents.length} agents\n`;
    prompt += `Buildings: ${buildings.length}\n\n`;

    if (todaysCanonEvents.length > 0) {
      prompt += `Canon events on this day:\n`;
      for (const event of todaysCanonEvents) {
        prompt += `- ${event.title}: ${event.description}\n`;
      }
      prompt += `\n`;
    }

    prompt += `Generate a short, poetic name (3-5 words) for this checkpoint in history.\n`;
    prompt += `The name should evoke the mood and significance of this moment.\n\n`;
    prompt += `Examples of good checkpoint names:\n`;
    prompt += `- "The Dawn of Copper"\n`;
    prompt += `- "When Trees Spoke"\n`;
    prompt += `- "The First Harvest"\n`;
    prompt += `- "Before the Storm"\n`;
    prompt += `- "The Age of Discovery"\n\n`;
    prompt += `Respond with ONLY the checkpoint name, nothing else. Keep it evocative and memorable.\n`;

    return prompt;
  }

  /**
   * Process pending LLM name generation requests.
   */
  private processPendingNameRequests(world: World): void {
    if (!this.llmQueue) return;

    const completedRequests: string[] = [];

    for (const [checkpointKey, requestTick] of this.pendingNameRequests.entries()) {
      // Check if LLM response is ready
      const response = this.llmQueue.getDecision(checkpointKey);
      if (!response) continue; // Still waiting

      // Parse the name from the response
      const name = this.parseCheckpointName(response);
      if (!name) {
        completedRequests.push(checkpointKey);
        continue; // Invalid response - keep default name
      }

      // Update the checkpoint with the generated name
      const checkpoint = this.checkpoints.find(c => c.key === checkpointKey);
      if (checkpoint) {
        const oldName = checkpoint.name;
        checkpoint.name = name;

        // Emit event for checkpoint rename
        this.events.emitGeneric('checkpoint:renamed', {
          checkpointKey,
          oldName,
          newName: name,
        });
      }

      completedRequests.push(checkpointKey);
    }

    // Remove completed requests
    for (const key of completedRequests) {
      this.pendingNameRequests.delete(key);
    }
  }

  /**
   * Parse checkpoint name from LLM response.
   */
  private parseCheckpointName(response: string): string | null {
    // Clean up the response
    let name = response.trim();

    // Remove common prefix patterns
    name = name.replace(/^(The name is|I call it|Checkpoint name):?\s*/i, '');
    name = name.replace(/^["']|["']$/g, ''); // Remove quotes

    // Validate: should be 3-8 words, reasonable length
    const words = name.split(/\s+/);
    if (words.length < 1 || words.length > 8) return null;
    if (name.length > 80) return null;

    // Capitalize properly (Title Case for first word)
    const capitalizedWords = words.map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      // Keep small words lowercase (of, the, and, etc.)
      if (['of', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'a', 'an'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return capitalizedWords.join(' ');
  }

  /**
   * Get all available checkpoints.
   */
  getCheckpoints(): readonly Checkpoint[] {
    return this.checkpoints;
  }

  /**
   * Rewind to a specific checkpoint (creates a universe fork).
   */
  async rewindToCheckpoint(checkpointKey: string, world: World): Promise<boolean> {
    const checkpoint = this.checkpoints.find(c => c.key === checkpointKey);

    if (!checkpoint) {
      console.error(`[AutoSave] Checkpoint not found: ${checkpointKey}`);
      return false;
    }

    try {
      // Load the checkpoint
      const result = await saveLoadService.load(checkpointKey, world);

      if (!result.success) {
        console.error(`[AutoSave] Failed to load checkpoint: ${result.error}`);
        return false;
      }

      // Emit fork event
      this.events.emitGeneric('universe:forked', {
        sourceCheckpoint: checkpoint,
        newUniverseId: checkpoint.universeId,
        forkPoint: checkpoint.tick,
      });

      return true;
    } catch (error) {
      console.error('[AutoSave] Failed to rewind:', error);
      return false;
    }
  }

  /**
   * Check if a checkpoint is from a different universe (different magic laws).
   */
  isDifferentUniverse(checkpoint: Checkpoint, currentWorld: World): boolean {
    const currentHash = this.getMagicLawsHash(currentWorld);
    return checkpoint.magicLawsHash !== currentHash;
  }
}

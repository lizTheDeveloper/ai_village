/**
 * AutoSaveSystem - Automatic daily checkpoints for time travel
 *
 * Instead of manual saves, the world automatically checkpoints at midnight.
 * Each checkpoint gets an LLM-generated name and can be rewound to (creating a universe fork).
 *
 * Features:
 * - Saves at midnight every game day
 * - Keeps last 5 checkpoints (rolling window)
 * - LLM-generated poetic names for each checkpoint
 * - Universe identity based on magic law configuration
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { saveLoadService } from '../persistence/SaveLoadService.js';

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

export class AutoSaveSystem implements System {
  public readonly id: SystemId = 'auto_save';
  public readonly priority: number = 999; // Run last
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Time];

  private lastSaveDay: number = -1;
  private checkpoints: Checkpoint[] = [];
  private readonly maxCheckpoints = 5;
  private nameGenerationPending: boolean = false;

  /**
   * Emit a generic event (checkpoint events aren't in GameEventMap yet)
   */
  private emitEvent(world: World, type: string, source: string, data: Record<string, unknown>): void {
    (world.eventBus as unknown as { emit: (e: Record<string, unknown>) => void }).emit({
      type,
      source,
      data,
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Find time entity
    const timeEntity = entities[0];
    if (!timeEntity) return;

    const impl = timeEntity as EntityImpl;
    const time = impl.getComponent(CT.Time) as TimeData;
    if (!time || time.day === undefined) return;

    // Check if we just transitioned to a new day
    const currentDay = time.day;

    // Save at midnight (when day changes)
    if (currentDay > this.lastSaveDay && this.lastSaveDay >= 0) {
      this.createCheckpoint(world, currentDay);
    }

    this.lastSaveDay = currentDay;
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

      // Generate checkpoint name (will be filled in by LLM later)
      const checkpointName = `Day ${day}`;  // Temporary name

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

      // Save the world state
      await saveLoadService.save(world, {
        name: checkpointName,
        description: `Automatic checkpoint at day ${day}`,
        key,
      });

      // Add to checkpoints list
      this.checkpoints.push(checkpoint);

      // Trim to max checkpoints (keep most recent 5)
      if (this.checkpoints.length > this.maxCheckpoints) {
        const oldCheckpoint = this.checkpoints.shift();
        if (oldCheckpoint) {
          // Delete the old checkpoint
          await saveLoadService.deleteSave(oldCheckpoint.key);
        }
      }

      console.log(`[AutoSave] Checkpoint created: ${checkpointName} (${key})`);

      // Emit event for name generation
      this.emitEvent(world, 'checkpoint:created', 'auto_save', { checkpoint });

      // Request LLM to generate a poetic name asynchronously
      this.generateCheckpointName(checkpoint, world);
    } catch (error) {
      console.error('[AutoSave] Failed to create checkpoint:', error);
    } finally {
      this.nameGenerationPending = false;
    }
  }

  /**
   * Generate a hash of the magic law configuration.
   * Universes with the same magic laws share the same universe ID.
   */
  private getMagicLawsHash(world: World): string {
    // TODO: Get actual magic system configuration
    // For now, use a placeholder based on world seed or configuration

    // Check if there's a magic system configuration
    const magicEntities = world.query().with(CT.Magic as ComponentType).executeEntities();

    if (magicEntities.length === 0) {
      // No magic system = base universe
      return 'base';
    }

    // Hash the magic system configuration
    // This would include things like:
    // - Which magic sources are enabled
    // - Cost multipliers
    // - Allowed schools/elements
    // - Special rules/restrictions

    // Placeholder: just count magic entities for now
    return `magic_${magicEntities.length}`;
  }

  /**
   * Generate a poetic name for the checkpoint using LLM.
   */
  private async generateCheckpointName(checkpoint: Checkpoint, world: World): Promise<void> {
    // TODO: Integrate with LLM to generate poetic names
    // The name should reflect the state of the world at this checkpoint
    //
    // Prompt ideas:
    // - "Generate a short poetic name (3-5 words) for this moment in time..."
    // - Include world stats: population, buildings, resources, major events
    // - Examples: "The Dawn of Copper", "When Trees Spoke", "The First Harvest"

    console.log(`[AutoSave] TODO: Generate LLM name for checkpoint day ${checkpoint.day}`);

    // Emit event that can be handled by LLM system
    this.emitEvent(world, 'checkpoint:name_request', 'auto_save', { checkpoint });
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
      this.emitEvent(world, 'universe:forked', 'auto_save', {
        sourceCheckpoint: checkpoint,
        newUniverseId: checkpoint.universeId,
        forkPoint: checkpoint.tick,
      });

      console.log(`[AutoSave] Rewound to checkpoint: ${checkpoint.name} (day ${checkpoint.day})`);
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

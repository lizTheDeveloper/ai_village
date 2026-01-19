/**
 * GodCraftedDiscoverySystem - Spawns god-crafted content during chunk generation
 *
 * This system places god-crafted content spatially in chunks as they are
 * generated, similar to how ore veins or dungeons spawn in Minecraft.
 *
 * Content is gated by power level, tech level, and tier to prevent
 * overpowered items from appearing in early-game areas.
 *
 * Based on: openspec/specs/microgenerators/spec.md REQ-6
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type {
  GodCraftedContent,
  DiscoveryCondition,
  SpawnResult,
  RiddleContent,
  RiddleData,
  SpellContent,
  SpellData,
  RecipeContent,
  RecipeData,
} from './types.js';
import { godCraftedQueue } from './GodCraftedQueue.js';

/**
 * Chunk information for god-crafted content spawning
 */
export interface ChunkSpawnInfo {
  /** Chunk X coordinate */
  x: number;
  /** Chunk Y coordinate */
  y: number;
  /** Chunk biome */
  biome: string;
  /** Chunk size (typically 32) */
  size: number;
}

/**
 * System that places god-crafted content during chunk generation
 */
export class GodCraftedDiscoverySystem extends BaseSystem {
  readonly id = 'god_crafted_discovery';
  readonly priority = 100; // Run after most other systems
  readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds // No per-tick entity processing

  /** Universe ID for this system instance */
  private universeId: string = 'universe:main';

  /** Spawn rate (0-1, probability per chunk) */
  private spawnRate = 0.01; // 1% of chunks contain god-crafted content

  /** Maximum power level for spawned content (prevents overpowered items) */
  private maxPowerLevel = 10;

  /** Seed for deterministic chunk-based spawning */
  private seed: number = 0;

  constructor(options?: {
    spawnRate?: number;
    maxPowerLevel?: number;
    universeId?: string;
    seed?: number;
  }) {
    super();
    if (options?.spawnRate !== undefined) this.spawnRate = options.spawnRate;
    if (options?.maxPowerLevel !== undefined) this.maxPowerLevel = options.maxPowerLevel;
    if (options?.universeId) this.universeId = options.universeId;
    if (options?.seed !== undefined) this.seed = options.seed;
  }

  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick logic - content spawns during chunk generation
    // This method exists to satisfy BaseSystem interface
  }

  /**
   * Spawn god-crafted content in a chunk (called during chunk generation)
   *
   * Similar to how WildAnimalSpawningSystem.spawnAnimalsInChunk() works.
   */
  spawnContentInChunk(world: World, chunkInfo: ChunkSpawnInfo): void {
    // Deterministic random based on chunk coordinates and seed
    const chunkHash = this.hashChunk(chunkInfo.x, chunkInfo.y);
    const chunkRandom = this.seededRandom(chunkHash);

    // Roll for spawn - some percentage of chunks contain god-crafted content
    if (chunkRandom > this.spawnRate) {
      return; // This chunk doesn't contain content
    }

    // Get undiscovered content for this universe
    let candidates: GodCraftedContent[];
    try {
      candidates = godCraftedQueue.pullForUniverse(this.universeId, {
        validated: true,
      } as unknown as Component);
    } catch (error) {
      console.error('[GodCraftedDiscovery] Error pulling from queue:', error);
      return;
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return;
    }

    // Filter by power level (prevents overpowered content in early areas)
    candidates = candidates.filter(content => {
      const powerLevel = this.getContentPowerLevel(content);
      return powerLevel <= this.maxPowerLevel;
    });

    if (candidates.length === 0) {
      return;
    }

    // Select random content using deterministic random
    const contentIndex = Math.floor(this.seededRandom(chunkHash + 1) * candidates.length);
    const content = candidates[contentIndex];

    // Guard against undefined content (shouldn't happen but TypeScript requires this)
    if (!content) {
      return;
    }

    // Calculate spawn position within chunk (on surface)
    const localX = Math.floor(this.seededRandom(chunkHash + 2) * chunkInfo.size);
    const localY = Math.floor(this.seededRandom(chunkHash + 3) * chunkInfo.size);
    const worldX = chunkInfo.x * chunkInfo.size + localX;
    const worldY = chunkInfo.y * chunkInfo.size + localY;

    // Spawn content at position
    const result = this.spawnContent(content, world, { x: worldX, y: worldY } as unknown as Component);

    if (result.success) {
      godCraftedQueue.markDiscovered(
        content.id,
        this.universeId,
        'exploration',
        'location'
      );
    }
  }

  /**
   * Hash chunk coordinates for deterministic randomness
   */
  private hashChunk(chunkX: number, chunkY: number): number {
    // Simple hash combining chunk coords and seed
    return (chunkX * 73856093) ^ (chunkY * 19349663) ^ this.seed;
  }

  /**
   * Seeded random number generator (0-1)
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Get power level of content for gating
   */
  private getContentPowerLevel(content: GodCraftedContent): number {
    // Extract power level based on content type
    switch (content.type) {
      case 'spell': {
        const spellData = content.data as SpellData;
        return spellData.powerLevel ?? 5;
      }
      case 'legendary_item':
      case 'technology':
        // TODO: Extract from item/tech data
        return 5;
      default:
        // Riddles, recipes have no power level
        return 0;
    }
  }

  /**
   * Spawn content in the world
   */
  private spawnContent(
    content: GodCraftedContent,
    world: World,
    position?: { x: number; y: number }
  ): SpawnResult {
    try {
      switch (content.type) {
        case 'riddle':
          return this.spawnRiddle(content as RiddleContent, world, position);

        case 'spell':
          return this.spawnSpell(content as SpellContent, world, position);

        case 'recipe':
          return this.spawnRecipe(content as RecipeContent, world, position);

        case 'legendary_item':
        case 'soul':
        case 'quest':
        case 'alien_species':
        case 'magic_paradigm':
        case 'building':
        case 'technology':
        case 'deity':
        case 'religion':
          // TODO: Implement spawning for these content types
          console.warn(`[GodCraftedDiscovery] Spawning not yet implemented for: ${content.type}`);
          return {
            success: false,
            error: `Spawning not implemented for ${content.type}`,
          };

        default:
          console.error(`[GodCraftedDiscovery] Unknown content type:`, content.type);
          return {
            success: false,
            error: `Unknown content type: ${content.type}`,
          };
      }
    } catch (error) {
      console.error(`[GodCraftedDiscovery] Failed to spawn ${content.type}:`, error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Spawn a riddle in the world
   */
  private spawnRiddle(
    content: RiddleContent,
    world: World,
    position?: { x: number; y: number }
  ): SpawnResult {
    const riddleData = content.data as RiddleData;

    // Create riddle entity
    const entity = world.createEntity() as EntityImpl;

    // Add riddle component
    entity.addComponent({
      type: 'generated_content',
      version: 1,
      contentType: 'riddle',
      content: {
        question: riddleData.question,
        correctAnswer: riddleData.correctAnswer,
        alternativeAnswers: riddleData.alternativeAnswers,
        difficulty: riddleData.difficulty,
        context: riddleData.context,
        allowLLMJudgment: riddleData.allowLLMJudgment,
      },
      approved: true,
      rejected: false,
      rejectionReason: null,
    } as unknown as Component);

    // Add god-crafted metadata
    entity.addComponent({
      type: 'god_crafted_artifact',
      version: 1,
      contentId: content.id,
      creator: content.creator,
      discoveredAt: Date.now(),
      discoveryMethod: 'random_encounter',
      lore: content.lore,
    } as unknown as Component);

    // Add identity for display
    entity.addComponent({
      type: 'identity',
      version: 1,
      name: `Riddle of ${content.creator.name}`,
      description: content.lore,
    } as unknown as Component);

    // Add position if provided (for chunk-based spawning)
    if (position) {
      entity.addComponent({
        type: 'position',
        version: 1,
        x: position.x,
        y: position.y,
      } as unknown as Component);
    }

    // Silent spawn - no console spam

    // Emit discovery event
    world.eventBus.emit({
      type: 'godcrafted:discovered',
      source: entity.id,
      data: {
        contentType: 'riddle',
        contentId: content.id,
        name: `Riddle of ${content.creator.name}`,
        creatorName: content.creator.name,
        creatorDomain: content.creator.godOf,
        lore: content.lore,
        entityId: entity.id,
        discoveryMethod: 'random_encounter',
      },
    } as unknown as Component);

    return {
      success: true,
      entityId: entity.id,
    };
  }

  /**
   * Spawn a spell in the world
   */
  private spawnSpell(
    content: SpellContent,
    world: World,
    position?: { x: number; y: number }
  ): SpawnResult {
    const spellData = content.data as SpellData;

    // Create spell entity
    const entity = world.createEntity() as EntityImpl;

    // Add generated content component with spell data
    entity.addComponent({
      type: 'generated_content',
      contentType: 'spell',
      content: {
        spellId: spellData.spellId,
        name: spellData.name,
        description: spellData.description,
        techniques: spellData.techniques,
        forms: spellData.forms,
        reagents: spellData.reagents,
        manaCost: spellData.manaCost,
        powerLevel: spellData.powerLevel,
        effects: spellData.effects,
        creativityScore: spellData.creativityScore,
      },
      approved: true,
      rejected: false,
      rejectionReason: null,
    } as unknown as Component);

    // Add god-crafted metadata
    entity.addComponent({
      type: 'god_crafted_artifact',
      version: 1,
      contentId: content.id,
      creator: content.creator,
      discoveredAt: Date.now(),
      discoveryMethod: 'random_encounter',
      lore: content.lore,
    } as unknown as Component);

    // Add identity for display
    entity.addComponent({
      type: 'identity',
      name: spellData.name,
      description: spellData.description,
    } as unknown as Component);

    // Add position if provided (for chunk-based spawning)
    if (position) {
      entity.addComponent({
        type: 'position',
        version: 1,
        x: position.x,
        y: position.y,
      } as unknown as Component);
    }

    // Silent spawn - no console spam

    // Emit discovery event
    world.eventBus.emit({
      type: 'godcrafted:discovered',
      source: entity.id,
      data: {
        contentType: 'spell',
        contentId: content.id,
        name: spellData.name,
        creatorName: content.creator.name,
        creatorDomain: content.creator.godOf,
        lore: content.lore,
        entityId: entity.id,
        discoveryMethod: 'random_encounter',
      },
    } as unknown as Component);

    return {
      success: true,
      entityId: entity.id,
    };
  }

  /**
   * Spawn a recipe in the world
   */
  private spawnRecipe(
    content: RecipeContent,
    world: World,
    position?: { x: number; y: number }
  ): SpawnResult {
    const recipeData = content.data as RecipeData;

    // Create recipe entity
    const entity = world.createEntity() as EntityImpl;

    // Add generated content component with recipe data
    entity.addComponent({
      type: 'generated_content',
      contentType: 'recipe',
      content: {
        recipeId: recipeData.recipeId,
        name: recipeData.name,
        type: recipeData.type,
        outputItemId: recipeData.outputItemId,
        outputAmount: recipeData.outputAmount,
        ingredients: recipeData.ingredients,
        craftingTime: recipeData.craftingTime,
        stationRequired: recipeData.stationRequired,
        item: recipeData.item,
        creativityScore: recipeData.creativityScore,
      },
      approved: true,
      rejected: false,
      rejectionReason: null,
    } as unknown as Component);

    // Add god-crafted metadata
    entity.addComponent({
      type: 'god_crafted_artifact',
      version: 1,
      contentId: content.id,
      creator: content.creator,
      discoveredAt: Date.now(),
      discoveryMethod: 'random_encounter',
      lore: content.lore,
    } as unknown as Component);

    // Add identity for display
    entity.addComponent({
      type: 'identity',
      name: recipeData.name,
      description: `A ${recipeData.type} recipe crafted by ${content.creator.name}`,
    } as unknown as Component);

    // Add position if provided (for chunk-based spawning)
    if (position) {
      entity.addComponent({
        type: 'position',
        version: 1,
        x: position.x,
        y: position.y,
      } as unknown as Component);
    }

    // Silent spawn - no console spam

    // Emit discovery event
    world.eventBus.emit({
      type: 'godcrafted:discovered',
      source: entity.id,
      data: {
        contentType: 'recipe',
        contentId: content.id,
        name: recipeData.name,
        creatorName: content.creator.name,
        creatorDomain: content.creator.godOf,
        lore: content.lore,
        entityId: entity.id,
        discoveryMethod: 'random_encounter',
      },
    } as unknown as Component);

    return {
      success: true,
      entityId: entity.id,
    };
  }

  /**
   * Set universe ID for this system
   */
  setUniverseId(universeId: string): void {
    this.universeId = universeId;
  }

  /**
   * Set maximum power level for content spawning
   */
  setMaxPowerLevel(level: number): void {
    this.maxPowerLevel = level;
  }
}

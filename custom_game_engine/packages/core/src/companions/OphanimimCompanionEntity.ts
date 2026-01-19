/**
 * Ophanim Companion Entity Factory
 *
 * Creates the Ophanim companion entity - a celestial wheel-angel guide
 * that evolves alongside the player's civilization.
 *
 * The companion uses Ae/Aer pronouns and serves as tutorial guide, advisor,
 * and emotional support throughout the game.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { CompanionComponent } from '../components/CompanionComponent.js';

/**
 * Create the Ophanim companion entity
 *
 * @param world - The world to create the entity in
 * @param currentTick - Current game tick
 * @returns The created companion entity
 */
export function createOphanimimCompanion(world: World, currentTick: number): Entity {
  const entity = world.createEntity();

  // Identity - Ophanim companion (name TBD)
  const identityComp = entity.components.get(CT.Identity) as { name: string } | undefined;
  if (identityComp) {
    identityComp.name = 'Ophanim'; // TODO: Generate unique name
  }

  // Position - UI-only entity, no physical position needed
  // (Will be rendered in chat panel, not in world)

  // Tags - mark as companion, divine, immortal
  const tagsComp = entity.components.get(CT.Tags) as { tags: string[] } | undefined;
  if (tagsComp) {
    tagsComp.tags.push(
      'companion',
      'ophanim',
      'divine',
      'immortal',
      'conversational',
      'evolution_tier_0'
    );
  }

  // Companion component - main state tracking
  const companion = new CompanionComponent({
    evolutionTier: 0,
    currentEmotion: 'alert',
    trustScore: 0.0,
    sessionCount: 0,
    createdAtTick: currentTick,
  });
  if ('addComponent' in entity && typeof entity.addComponent === 'function') {
    (entity as { addComponent: (comp: CompanionComponent) => void }).addComponent(companion);
  }

  // Episodic Memory - remembers events and player interactions
  const memoryComp = entity.components.get(CT.EpisodicMemory) as { _maxMemories: number } | undefined;
  if (memoryComp) {
    // Companion has large memory capacity
    memoryComp._maxMemories = 5000;
  }

  // Conversation - can engage in dialogue
  const conversationComp = entity.components.get(CT.Conversation) as { maxMessages: number } | undefined;
  if (conversationComp) {
    // High conversation capacity
    conversationComp.maxMessages = 200;
  }

  // Renderable - will be rendered in UI panel
  // (Sprite path determined by evolution tier and emotion)
  const renderableComp = entity.components.get(CT.Renderable) as { spritePath: string; layer: string } | undefined;
  if (renderableComp) {
    renderableComp.spritePath = getCompanionSpritePath(0, 'alert');
    renderableComp.layer = 'ui'; // UI layer, not world
  }

  return entity;
}

/**
 * Find the companion entity in the world
 */
export function findCompanion(world: World): Entity | null {
  const entities = world.query().with(CT.Companion).executeEntities();
  return entities.length > 0 ? entities[0]! : null;
}

/**
 * Check if an entity is the companion
 */
export function isCompanion(entity: Entity): boolean {
  return entity.hasComponent(CT.Companion);
}

/**
 * Get sprite path for companion based on tier and emotion
 *
 * @param tier - Evolution tier (0-5)
 * @param emotion - Emotion state
 * @returns Path to sprite file
 */
export function getCompanionSpritePath(tier: number, emotion: string): string {
  // Tier 0: Golden ophanim (directional)
  if (tier === 0) {
    return `companion/golden/${emotion}.png`;
  }

  // Tier 1-5: Rainbow ophanim (emotional)
  return `companion/tier${tier}/${emotion}.png`;
}

/**
 * Get companion's current evolution tier
 */
export function getEvolutionTier(entity: Entity): number {
  const companion = entity.getComponent(CT.Companion) as CompanionComponent | undefined;
  if (!companion) {
    throw new Error('Entity does not have CompanionComponent');
  }
  return companion.evolutionTier;
}

/**
 * Get companion's current emotion
 */
export function getCurrentEmotion(entity: Entity): string {
  const companion = entity.getComponent(CT.Companion) as CompanionComponent | undefined;
  if (!companion) {
    throw new Error('Entity does not have CompanionComponent');
  }
  return companion.currentEmotion;
}

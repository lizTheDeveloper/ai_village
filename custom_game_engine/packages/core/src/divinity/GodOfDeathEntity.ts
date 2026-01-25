/**
 * God of Death Entity Factory
 *
 * Creates the God of Death entity that manifests when the first ensouled agent dies.
 * The God of Death is a visible, conversational deity that offers death bargains.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import { createPositionComponent, type PositionComponent } from '../components/PositionComponent.js';
import { createTagsComponent, type TagsComponent } from '../components/TagsComponent.js';
import { createEpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { createConversationComponent } from '../components/ConversationComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import {
  getDeathGodByIndex,
  getDeathGodSpritePath,
  type DeathGodConfig,
} from './DeathGodSpriteRegistry.js';

let deathGodIndex = 0;

/**
 * Get the next death god (cycles through registry)
 */
function getNextDeathGod(): DeathGodConfig {
  const god = getDeathGodByIndex(deathGodIndex);
  deathGodIndex++;
  return god;
}

/**
 * Create the God of Death entity
 *
 * @param world - The world to create the entity in
 * @param location - Initial spawn location (typically where first death occurred)
 * @param godConfig - Optional specific death god config (defaults to cycling through registry)
 * @returns The created God of Death entity
 */
export function createGodOfDeath(
  world: World,
  location: { x: number; y: number },
  godConfig?: DeathGodConfig
): Entity {
  const config = godConfig || getNextDeathGod();

  // Create the entity
  const entity = world.createEntity();

  // Identity - God of Death
  const identity = createIdentityComponent(config.name);
  (entity as EntityImpl).addComponent(identity);

  // Position - manifests at death location
  const position = createPositionComponent(location.x, location.y);
  (entity as EntityImpl).addComponent(position);

  // Tags - mark as deity and death god
  const tags = createTagsComponent(
    'deity',
    'immortal',
    'death_god',
    'psychopomp',
    'conversational', // Can be talked to
    `origin:${config.origin}` // Track cultural origin
  );
  (entity as EntityImpl).addComponent(tags);

  // Renderable - PixelLab sprite (8-directional AI-generated character)
  const spritePath = getDeathGodSpritePath(config);
  const renderable = createRenderableComponent(spritePath, 'entity');
  (entity as EntityImpl).addComponent(renderable);

  // Episodic Memory - remembers all death bargains and interactions
  const memory = createEpisodicMemoryComponent({ maxMemories: 10000 }); // Gods remember everything
  (entity as EntityImpl).addComponent(memory);

  // Relationship - tracks relationships with mortals and player
  // RelationshipComponent is now lazy-initialized when first relationship is formed

  // Conversation - can engage in dialogue
  const conversation = createConversationComponent(100); // Gods have long conversation histories
  (entity as EntityImpl).addComponent(conversation);

  return entity;
}

/**
 * Check if an entity is the God of Death
 */
export function isGodOfDeath(entity: Entity): boolean {
  const tags = entity.getComponent(ComponentType.Tags);
  if (!tags || !tags.tags) return false;
  // TagsComponent.tags is always an array (see TagsComponent definition)
  return tags.tags.includes('death_god');
}

/**
 * Find the God of Death entity in the world (if it exists)
 */
export function findGodOfDeath(world: World): Entity | null {
  const entities = world.query()
    .with(ComponentType.Tags)
    .executeEntities();

  for (const entity of entities) {
    if (isGodOfDeath(entity)) {
      return entity;
    }
  }

  return null;
}

/**
 * Move God of Death to a new location
 */
export function moveGodOfDeath(entity: Entity, location: { x: number; y: number }): void {
  const position = entity.getComponent(ComponentType.Position);
  if (position) {
    position.x = location.x;
    position.y = location.y;
  }
}

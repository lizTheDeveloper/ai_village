/**
 * Goddess of Wisdom Entity Factory
 *
 * Creates the Goddess of Wisdom entity that manifests when the first
 * LLM-generated discovery is proposed (technology, recipe, or spell).
 *
 * The Goddess of Wisdom scrutinizes all AI-generated content before
 * it enters the world, ensuring it fits the setting and is balanced.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { createRelationshipComponent } from '../components/RelationshipComponent.js';
import { createEpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { createConversationComponent } from '../components/ConversationComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import {
  getWisdomGoddessByIndex,
  getWisdomGoddessSpritePath,
  type WisdomGoddessConfig,
} from './WisdomGoddessSpriteRegistry.js';

let wisdomGoddessIndex = 0;

/**
 * Get the next wisdom goddess (cycles through registry)
 */
function getNextWisdomGoddess(): WisdomGoddessConfig {
  const goddess = getWisdomGoddessByIndex(wisdomGoddessIndex);
  wisdomGoddessIndex++;
  return goddess;
}

/**
 * Create the Goddess of Wisdom entity
 *
 * @param world - The world to create the entity in
 * @param location - Initial spawn location (typically at a library or research site)
 * @param goddessConfig - Optional specific wisdom goddess config
 * @returns The created Goddess of Wisdom entity
 */
export function createGoddessOfWisdom(
  world: World,
  location: { x: number; y: number },
  goddessConfig?: WisdomGoddessConfig
): Entity {
  const config = goddessConfig || getNextWisdomGoddess();

  // Create the entity
  const entity = world.createEntity();

  // Identity - Goddess of Wisdom
  const identity = createIdentityComponent(config.name);
  (entity as any).addComponent(identity);

  // Position - manifests at research/discovery location
  const position = createPositionComponent(location.x, location.y);
  (entity as any).addComponent(position);

  // Tags - mark as deity and wisdom goddess
  const tags = createTagsComponent(
    'deity',
    'immortal',
    'wisdom_goddess',
    'knowledge_keeper',
    'discovery_scrutinizer',
    'conversational', // Can be talked to
    `origin:${config.origin}`, // Track cultural origin
    `scrutiny_style:${config.scrutinyStyle}`
  );
  (entity as any).addComponent(tags);

  // Renderable - PixelLab sprite (8-directional AI-generated character)
  const spritePath = getWisdomGoddessSpritePath(config);
  const renderable = createRenderableComponent(spritePath, 'entity');
  (entity as any).addComponent(renderable);

  // Episodic Memory - remembers all discoveries and judgments
  const memory = createEpisodicMemoryComponent({ maxMemories: 10000 }); // Gods remember everything
  (entity as any).addComponent(memory);

  // Relationship - tracks relationships with researchers and inventors
  const relationships = createRelationshipComponent();
  (entity as any).addComponent(relationships);

  // Conversation - can engage in dialogue about discoveries
  const conversation = createConversationComponent(100);
  (entity as any).addComponent(conversation);

  return entity;
}

/**
 * Check if an entity is the Goddess of Wisdom
 */
export function isGoddessOfWisdom(entity: Entity): boolean {
  const tags = entity.components.get('tags') as any;
  return tags?.tags?.has('wisdom_goddess') ?? false;
}

/**
 * Find the Goddess of Wisdom entity in the world (if it exists)
 */
export function findGoddessOfWisdom(world: World): Entity | null {
  const entities = world.query()
    .with('tags' as any)
    .executeEntities();

  for (const entity of entities) {
    if (isGoddessOfWisdom(entity)) {
      return entity;
    }
  }

  return null;
}

/**
 * Move Goddess of Wisdom to a new location
 */
export function moveGoddessOfWisdom(entity: Entity, location: { x: number; y: number }): void {
  const position = entity.components.get('position') as any;
  if (position) {
    position.x = location.x;
    position.y = location.y;
  }
}

/**
 * Get the scrutiny style of the wisdom goddess
 */
export function getScrutinyStyle(entity: Entity): 'strict' | 'encouraging' | 'curious' | 'pragmatic' {
  const tags = entity.components.get('tags') as any;
  if (!tags?.tags) return 'pragmatic';

  for (const tag of tags.tags) {
    if (tag.startsWith('scrutiny_style:')) {
      const style = tag.split(':')[1];
      if (style === 'strict' || style === 'encouraging' || style === 'curious' || style === 'pragmatic') {
        return style;
      }
    }
  }

  return 'pragmatic';
}

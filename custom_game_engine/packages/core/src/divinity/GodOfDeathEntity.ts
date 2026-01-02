/**
 * God of Death Entity Factory
 *
 * Creates the God of Death entity that manifests when the first ensouled agent dies.
 * The God of Death is a visible, conversational deity that offers death bargains.
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

/**
 * Default names for the God of Death (cycling through mythological equivalents)
 */
const DEATH_GOD_NAMES = [
  'Thanatos',  // Greek
  'Anubis',    // Egyptian
  'Hel',       // Norse
  'Morrigan',  // Celtic
  'Yama',      // Hindu/Buddhist
  'Ankou',     // Breton
];

let deathGodNameIndex = 0;

/**
 * Get the next death god name (cycles through mythology)
 */
function getNextDeathGodName(): string {
  const name = DEATH_GOD_NAMES[deathGodNameIndex % DEATH_GOD_NAMES.length] || 'Thanatos';
  deathGodNameIndex++;
  return name;
}

/**
 * Create the God of Death entity
 *
 * @param world - The world to create the entity in
 * @param location - Initial spawn location (typically where first death occurred)
 * @param customName - Optional custom name (defaults to cycling through mythological names)
 * @returns The created God of Death entity
 */
export function createGodOfDeath(
  world: World,
  location: { x: number; y: number },
  customName?: string
): Entity {
  const name = customName || getNextDeathGodName();

  // Create the entity
  const entity = world.createEntity();

  // Identity - God of Death
  const identity = createIdentityComponent(name);
  (entity as any).addComponent(identity);

  // Position - manifests at death location
  const position = createPositionComponent(location.x, location.y);
  (entity as any).addComponent(position);

  // Tags - mark as deity and death god
  const tags = createTagsComponent(
    'deity',
    'immortal',
    'death_god',
    'psychopomp',
    'conversational' // Can be talked to
  );
  (entity as any).addComponent(tags);

  // Renderable - visual appearance
  // TODO: Replace with actual death god sprite when available
  const renderable = createRenderableComponent('?', 'entity'); // Placeholder sprite
  (entity as any).addComponent(renderable);

  // Episodic Memory - remembers all death bargains and interactions
  const memory = createEpisodicMemoryComponent({ maxMemories: 10000 }); // Gods remember everything
  (entity as any).addComponent(memory);

  // Relationship - tracks relationships with mortals and player
  const relationships = createRelationshipComponent();
  (entity as any).addComponent(relationships);

  // Conversation - can engage in dialogue
  const conversation = createConversationComponent(100); // Gods have long conversation histories
  (entity as any).addComponent(conversation);

  return entity;
}

/**
 * Check if an entity is the God of Death
 */
export function isGodOfDeath(entity: Entity): boolean {
  const tags = entity.components.get('tags') as any;
  return tags?.tags?.has('death_god') ?? false;
}

/**
 * Find the God of Death entity in the world (if it exists)
 */
export function findGodOfDeath(world: World): Entity | null {
  const entities = world.query()
    .with('tags' as any)
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
  const position = entity.components.get('position') as any;
  if (position) {
    position.x = location.x;
    position.y = location.y;
  }
}

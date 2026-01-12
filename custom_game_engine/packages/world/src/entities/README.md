# Entity Factories

Entity factory functions for creating game entities with pre-configured component compositions.

## Overview

Entity factories encapsulate entity creation logic using the builder pattern. Each factory:
- Creates `EntityImpl` with unique ID
- Adds required component set
- Registers entity with world mutator
- Returns entity ID for tracking

**Location**: `packages/world/src/entities/`

## Entity Types

### Agents
- **`createWanderingAgent(world, x, y, speed?, options?)`** - Rule-based AI agent
- **`createLLMAgent(world, x, y, speed?, dungeonMasterPrompt?, options?)`** - LLM-controlled agent

Both include: Position, Physics, Renderable, Appearance, Agent, Skills, Needs, Memory, Vision, Inventory, Temperature, Circadian, Combat, Spiritual, Realm, Reproduction

### Plants
- **`createTree(world, x, y, z?, options?)`** - Harvestable tree (legacy or voxel)
- **`createVoxelTree(world, x, y, height?, material?)`** - Voxel tree with height-based harvesting
- **`createBerryBush(world, x, y)`** - Food-producing bush
- **`createFiberPlant(world, x, y)`** - Craftable fiber resource

Components: Position, Physics, Renderable, Tags, Resource, Plant

### Resources
- **`createIronDeposit(world, x, y)`** - Iron ore deposit (50-100 units)
- **`createCoalDeposit(world, x, y)`** - Coal deposit (40-80 units)
- **`createCopperDeposit(world, x, y)`** - Copper deposit (30-60 units)
- **`createGoldDeposit(world, x, y)`** - Gold deposit (15-30 units)

Components: Position, Physics, Renderable, Tags, Resource

### Terrain
- **`createRock(world, x, y)`** - Stone resource node
- **`createMountain(world, x, y)`** - Large stone deposit
- **`createLeafPile(world, x, y)`** - Compostable organic matter

## Factory Pattern

```typescript
export function createExample(world: WorldMutator, x: number, y: number): string {
  const entity = new EntityImpl(createEntityId(), world.tick);

  // Component composition
  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(solid, width, height));
  entity.addComponent(createRenderableComponent(sprite, layer));
  entity.addComponent(createTagsComponent(...tags));

  // Register with world
  (world as any)._addEntity(entity);

  return entity.id;
}
```

## Agent Creation Details

**Vision Profiles**: Derived from skills (scout/farmer/guard/crafter/default)
**Think Offset**: Entity ID hash prevents thundering herd (staggered AI updates)
**Starting Items**: 5 wood, 3 stone, 8 berries
**LLM Agents**: Include dungeon master awakening memory if prompt provided

## Voxel vs Legacy Resources

**Legacy**: Arbitrary amount with regeneration rate (`createResourceComponent`)
**Voxel**: Physical 1:1 mapping, height-based (`createTreeVoxelResource`)

Example: `height=4` tree = 16 wood blocks (4 levels × 4 blocks/level)

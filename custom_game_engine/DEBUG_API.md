# Debug Actions API

**`window.game`** provides programmatic access to game state and dev tools from browser console (F12).

## Table of Contents

### Core APIs
- [Core Access](#core-access) - Direct access to world, gameLoop, renderer, panels
- [Game Introspection API](#game-introspection-api) - Schema-aware entity queries and mutations (Phase 1)

### Entity Management (Phase 1)
- [Entity Queries](#entity-queries) - Get entities, query with filters, spatial bounds
- [Component Schemas](#component-schemas) - Get schemas, list all, filter by category
- [Validated Mutations](#validated-mutations) - Mutate fields with validation and tracking
- [Undo/Redo](#undoredo) - Reverse and replay mutations
- [Cache Statistics](#cache-statistics) - Monitor cache performance

### Extended Features (Phases 2-6)
- [Skill Management](#skill-management-phase-2) - Grant XP, get skills, track progression
- [Building Management](#building-management-phase-2) - Place buildings, list buildings/blueprints
- [Behavioral Control](#behavioral-control-phase-3) - Trigger behaviors on agents
- [Observability](#observability-phase-4) - Watch entities, get mutation history
- [Snapshots & Time Travel](#snapshots--time-travel-phase-5) - Create/restore entity checkpoints
- [Economic & Environmental](#economic--environmental-state-phase-6) - Query metrics and conditions

### Utility
- [Agent Selection](#agent-selection) - Select agents for panel updates
- [DevPanel Access](#devpanel-direct-access) - Direct DevPanel manipulation
- [Query Examples](#query-examples) - Common ECS query patterns
- [Practical Workflows](#practical-workflows) - Real-world usage examples

## Core Access

```javascript
game.world                // World instance
game.gameLoop             // GameLoop instance
game.renderer             // Renderer instance
game.devPanel             // DevPanel instance
game.agentInfoPanel       // AgentInfoPanel instance
game.animalInfoPanel      // AnimalInfoPanel instance
game.resourcesPanel       // ResourcesPanel instance
game.buildingRegistry     // BuildingBlueprintRegistry instance
game.placementUI          // BuildingPlacementUI instance
game.introspection        // GameIntrospectionAPI instance (schema-aware queries & mutations)
```

## Game Introspection API

**Schema-aware entity introspection with validation, caching, and undo/redo support.**

The `game.introspection` API provides runtime access to entity data with:
- Component schema validation
- Tick-based result caching (20 ticks = 1 second)
- Validated mutations with undo/redo
- Spatial queries and SimulationScheduler filtering

### Entity Queries

```javascript
// Get single entity with all components
const entity = game.introspection.getEntity('agent-uuid');
console.log(entity.id);           // Entity ID
console.log(entity.components);   // { identity: {...}, position: {...}, needs: {...}, ... }
console.log(entity.metadata);     // { simulationMode: 'ALWAYS', cacheHit: true }

// Query entities with filters
const result = game.introspection.queryEntities({
  withComponents: ['agent', 'needs'],  // AND logic - must have both
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },  // Spatial filter
  activeOnly: true,  // Only entities in active simulation (uses SimulationScheduler)
  offset: 0,         // Pagination
  limit: 50
});
console.log(result.entities);  // Array of enriched entities
console.log(result.total);     // Total matching entities (before pagination)
console.log(result.cacheHit);  // Whether result was cached

// Visibility filtering (filter components by context)
const playerView = game.introspection.getEntity('agent-uuid', {
  visibilityLevel: 'player'  // Only components visible to player UI
});
```

### Component Schemas

```javascript
// Get schema for a component type
const needsSchema = game.introspection.getComponentSchema('needs');
console.log(needsSchema.type);        // 'needs'
console.log(needsSchema.category);    // 'agent'
console.log(needsSchema.description); // 'Agent survival needs'
console.log(needsSchema.fields);      // { hunger: {...}, thirst: {...}, ... }

// List all schemas
const allSchemas = game.introspection.listSchemas();
console.log(allSchemas.length);  // 125+ registered schemas

// Filter schemas by category
const agentSchemas = game.introspection.listSchemas({ category: 'agent' });
const cognitiveSchemas = game.introspection.listSchemas({ category: 'cognitive' });

// Filter schemas by mutability
const mutableSchemas = game.introspection.listSchemas({ mutability: 'mutable' });
```

### Validated Mutations

```javascript
// Mutate a single field with validation
const result = await game.introspection.mutateField({
  entityId: 'agent-uuid',
  componentType: 'needs',
  field: 'hunger',
  value: 0.5,
  reason: 'Admin action: feed agent',  // Optional reason for tracking
  validate: true  // Default true - validates type, range, mutability
});

if (result.success) {
  console.log(`Changed ${result.oldValue} -> ${result.newValue}`);
  console.log(`Latency: ${result.metrics.latency}ms`);
  console.log(`Caches invalidated: ${result.metrics.cacheInvalidations}`);
} else {
  console.error('Mutation failed:', result.validationErrors);
}

// Batch mutations (atomic - all succeed or all rollback)
const batchResult = await game.introspection.mutateBatch([
  { entityId: 'agent1', componentType: 'needs', field: 'hunger', value: 0.5 },
  { entityId: 'agent2', componentType: 'needs', field: 'energy', value: 0.8 }
]);

console.log(`Success: ${batchResult.successCount}, Failed: ${batchResult.failureCount}`);
console.log(`Rolled back: ${batchResult.rolledBack}`);
```

### Undo/Redo

```javascript
// Undo last mutation
const undoResult = await game.introspection.undo(1);
console.log(`Undone ${undoResult.count} mutations`);

// Undo last 3 mutations
await game.introspection.undo(3);

// Redo undone mutations
const redoResult = await game.introspection.redo(1);
console.log(`Redone ${redoResult.count} mutations`);
```

### Cache Statistics

```javascript
const stats = game.introspection.getCacheStats();
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
console.log(`Hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(1)}%`);
console.log(`Size: ${stats.size} entries`);
console.log(`Invalidations: ${stats.invalidations}`);

// Clear cache manually (auto-cleared on mutations)
game.introspection.clearCache();
```

### Practical Examples

**Find hungry agents and feed them:**
```javascript
const result = game.introspection.queryEntities({
  withComponents: ['agent', 'needs'],
  limit: 100
});

for (const entity of result.entities) {
  const hunger = entity.components.needs?.hunger;
  if (hunger && hunger > 0.7) {
    await game.introspection.mutateField({
      entityId: entity.id,
      componentType: 'needs',
      field: 'hunger',
      value: 0.2,
      reason: 'Admin intervention: feed hungry agent'
    });
  }
}
```

**Inspect all mutable fields for a component:**
```javascript
const schema = game.introspection.getComponentSchema('needs');
const mutableFields = Object.entries(schema.fields)
  .filter(([name, field]) => field.mutable)
  .map(([name, field]) => ({
    name,
    type: field.type,
    range: field.range,
    description: field.description
  }));
console.log('Mutable fields:', mutableFields);
```

**Query entities in camera view:**
```javascript
const camera = game.renderer.camera;
const viewBounds = {
  minX: camera.x - camera.width / 2,
  minY: camera.y - camera.height / 2,
  maxX: camera.x + camera.width / 2,
  maxY: camera.y + camera.height / 2
};

const visible = game.introspection.queryEntities({
  bounds: viewBounds,
  activeOnly: true,  // Only actively simulated entities
  limit: 100
});
console.log(`${visible.entities.length} entities in view`);
```

## Agent Selection

```javascript
game.setSelectedAgent(agentId);  // Updates DevPanel Skills + AgentInfoPanel
game.setSelectedAgent(null);     // Deselect
const id = game.getSelectedAgent();  // Returns string|null
```

## Skill Management (Phase 2)

The introspection API provides skill management with validation and tracking.

```javascript
// Grant skill XP to a specific skill
const result = await game.introspection.grantSkillXP(
  'agent-uuid',
  'farming',  // Skill name
  100         // XP amount (100 XP = 1 level)
);

if (result.success) {
  console.log(`${result.skill}: ${result.previousLevel} -> ${result.newLevel}`);
  console.log(`Leveled up: ${result.leveledUp}`);
  console.log(`XP: ${result.previousXP} -> ${result.newXP}`);
}

// Get all skills for an entity
const skills = await game.introspection.getSkills('agent-uuid');
console.log(skills);  // { farming: 3, combat: 1, cooking: 5 }
```

**Legacy wrapper (from `window.game`):**
```javascript
game.grantSkillXP(agentId, amount);  // Returns boolean, 100 XP = 1 level, random skill
const skills = game.getAgentSkills(agentId);  // { skillName: level } or null
```

**Example:**
```javascript
const agents = game.world.query().with('agent').executeEntities();

// New API (recommended)
await game.introspection.grantSkillXP(agents[0].id, 'farming', 500);
const skills = await game.introspection.getSkills(agents[0].id);
console.log(`Farming level: ${skills.farming}`);

// Legacy API
game.grantSkillXP(agents[0].id, 500);
console.log(game.getAgentSkills(agents[0].id));
game.setSelectedAgent(agents[0].id);
```

## DevPanel Direct Access

```javascript
game.devPanel.spawnX = 100;
game.devPanel.spawnY = 150;
game.devPanel.setSelectedAgentId('some-agent-id');
game.devPanel.getSelectedAgentId();
```

## Building Management (Phase 2)

The introspection API provides comprehensive building management with validation and collision detection.

### Place a Building

```javascript
const result = await game.introspection.placeBuilding({
  blueprintId: 'campfire',
  position: { x: 100, y: 150 },
  rotation: 0,  // Optional, default 0
  checkCollisions: true,  // Optional, default true
  owner: 'agent-uuid'  // Optional
});

if (result.success) {
  console.log(`Building placed: ${result.buildingId}`);
} else {
  console.error(`Placement failed: ${result.error}`);
  if (result.collisions) {
    console.log('Colliding entities:', result.collisions);
  }
}
```

### List Buildings

```javascript
// Get all buildings
const allBuildings = await game.introspection.listBuildings();

// Filter by owner
const myBuildings = await game.introspection.listBuildings({
  owner: 'agent-uuid'
});

// Filter by category
const residential = await game.introspection.listBuildings({
  category: 'residential'
});

// Filter by spatial bounds
const nearbyBuildings = await game.introspection.listBuildings({
  bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }
});

// Each building has:
// { id, blueprintId, name, category, position, owner, state, createdAt }
console.log(allBuildings[0]);
```

### List Blueprints

```javascript
// Get all available blueprints
const allBlueprints = game.introspection.listBlueprints();

// Filter by category
const production = game.introspection.listBlueprints({
  category: 'production'
});

// Each blueprint has:
// { id, name, category, description, dimensions, costs, requiredSkills }
console.log(allBlueprints[0]);
// {
//   id: 'campfire',
//   name: 'Campfire',
//   category: 'utility',
//   description: 'A basic fire for warmth and cooking',
//   dimensions: { width: 1, height: 1, depth: 1 },
//   costs: { wood: 5, stone: 3 },
//   requiredSkills: { crafting: 1 }
// }
```

### Legacy Test API

```javascript
__gameTest.placeBuilding(blueprintId, x, y);
__gameTest.getBuildings();  // [{ entityId, type, position, building }]
__gameTest.getAllBlueprints();
__gameTest.getBlueprintsByCategory('production');
__gameTest.getUnlockedBlueprints();
__gameTest.getBlueprintDetails('tent');
```

## Behavioral Control (Phase 3)

Trigger specific behaviors on agents programmatically.

```javascript
// Trigger a behavior on an agent
const result = await game.introspection.triggerBehavior({
  entityId: 'agent-uuid',
  behavior: 'gather',  // Behavior name
  params: {  // Optional behavior-specific parameters
    targetEntityId: 'tree-uuid',
    resourceType: 'wood'
  },
  validate: true  // Optional, validates behavior name (default: true)
});

if (result.success) {
  console.log(`Triggered behavior: ${result.behavior}`);
  console.log('Queue index:', result.state.queueIndex);
  console.log('Started at tick:', result.state.startedAt);
} else {
  console.error(`Failed to trigger behavior: ${result.error}`);
}
```

**Valid behaviors:**
- Movement: `wander`, `idle`, `navigate`, `approach`, `flee`, `flee_danger`, `flee_to_home`
- Social: `follow`, `follow_agent`, `talk`, `call_meeting`, `attend_meeting`
- Resources: `gather`, `harvest`, `pick`, `gather_seeds`, `seek_food`, `seek_water`
- Work: `work`, `help`, `build`, `plan_build`, `craft`, `repair`, `upgrade`
- Farming: `till`, `farm`, `plant`, `water`, `fertilize`
- Survival: `eat`, `seek_sleep`, `forced_sleep`, `rest`, `seek_shelter`, `seek_warmth`, `seek_cooling`
- Exploration: `explore`, `explore_frontier`, `explore_spiral`, `follow_gradient`, `observe`
- Animals: `tame_animal`, `house_animal`, `hunt`, `butcher`
- Magic: `cast_spell`, `pray`, `meditate`, `group_pray`
- Advanced: `trade`, `research`, `deposit_items`, `material_transport`, `tile_build`
- Player: `player_controlled`

## Observability (Phase 4)

Watch entities for changes and retrieve mutation history.

### Watch Entity Changes

```javascript
// Watch all changes to an entity
const unsubscribe = game.introspection.watchEntity('agent-uuid', {
  onChange: (event) => {
    console.log(`Entity ${event.entityId} changed at tick ${event.tick}`);
    event.changes.forEach(change => {
      console.log(`  ${change.componentType}.${change.field}:`);
      console.log(`    ${change.oldValue} -> ${change.newValue}`);
    });
  }
});

// Watch only specific components
const unsubscribe2 = game.introspection.watchEntity('agent-uuid', {
  components: ['needs', 'health'],  // Only notify for these components
  onChange: (event) => { /* ... */ }
});

// Watch only specific fields
const unsubscribe3 = game.introspection.watchEntity('agent-uuid', {
  fields: ['hunger', 'thirst'],  // Only notify for these fields
  onChange: (event) => { /* ... */ }
});

// Watch with throttling (max once per second)
const unsubscribe4 = game.introspection.watchEntity('agent-uuid', {
  onChange: (event) => { /* ... */ },
  throttle: 1000  // Milliseconds between notifications
});

// Stop watching
unsubscribe();
```

### Get Mutation History

```javascript
// Get last 10 mutations for an entity
const history = await game.introspection.getMutationHistory({
  entityId: 'agent-uuid',
  limit: 10
});

history.forEach(mutation => {
  console.log(`${mutation.componentType}.${mutation.field}:`);
  console.log(`  ${mutation.oldValue} -> ${mutation.newValue}`);
  console.log(`  Tick: ${mutation.tick}, Source: ${mutation.source}`);
  console.log(`  Undone: ${mutation.undone}`);
});

// Get all mutations for a component type
const needsHistory = await game.introspection.getMutationHistory({
  componentType: 'needs',
  limit: 50
});

// Get all mutations (up to limit)
const allHistory = await game.introspection.getMutationHistory({
  limit: 100
});
```

## Snapshots & Time Travel (Phase 5)

Create lightweight entity-level snapshots for debugging and experimentation.

### Create Snapshot

```javascript
// Snapshot specific entities
const snapshotId = await game.introspection.createSnapshot(
  ['agent-1', 'agent-2', 'building-3'],  // Entity IDs
  {
    // Optional metadata
    description: 'Before experimental mutation',
    experiment: 'test-123',
    author: 'debug-session'
  }
);

console.log(`Created snapshot: ${snapshotId}`);
```

### Restore Snapshot

```javascript
const result = await game.introspection.restoreSnapshot(snapshotId);

if (result.success) {
  console.log(`Restored ${result.entitiesRestored} entities`);
  console.log(`Snapshot from tick ${result.snapshot.createdAt}`);
  console.log('Metadata:', result.snapshot.metadata);
} else {
  console.error(`Restore failed: ${result.error}`);
}
```

### List Snapshots

```javascript
const snapshots = game.introspection.listSnapshots();

snapshots.forEach(snapshot => {
  console.log(`ID: ${snapshot.id}`);
  console.log(`  Created at tick: ${snapshot.createdAt}`);
  console.log(`  Entities: ${snapshot.entityCount}`);
  console.log(`  Metadata:`, snapshot.metadata);
});
```

### Delete Snapshots

```javascript
// Delete a specific snapshot
const deleted = game.introspection.deleteSnapshot(snapshotId);
console.log(`Deleted: ${deleted}`);

// Clear all snapshots
game.introspection.clearSnapshots();
console.log('All snapshots cleared');

// Get snapshot count
const count = game.introspection.getSnapshotCount();
console.log(`${count} snapshots in memory`);
```

### Practical Workflow

```javascript
// 1. Create checkpoint before risky operation
const checkpoint = await game.introspection.createSnapshot(
  ['agent-uuid'],
  { description: 'Before XP experiment' }
);

// 2. Perform risky mutation
await game.introspection.grantSkillXP('agent-uuid', 'farming', 10000);

// 3. Check if something went wrong
const agent = game.introspection.getEntity('agent-uuid');
if (agent.components.skills.levels.farming > 100) {
  // 4. Restore if needed
  await game.introspection.restoreSnapshot(checkpoint);
  console.log('Rolled back to checkpoint');
}
```

## Economic & Environmental State (Phase 6)

Query economic metrics and environmental conditions.

### Economic Metrics

```javascript
// Get resource prices and trade history
const metrics = await game.introspection.getEconomicMetrics({
  resources: ['wood', 'stone', 'food'],  // Optional: filter by resources
  timeRange: { start: 0, end: 1000 }     // Optional: time range in ticks
});

console.log('Resource prices:', metrics.prices);
console.log('Trade volume:', metrics.tradeVolume);
console.log('Market trends:', metrics.trends);
```

**Note:** Not yet implemented. Returns error until Phase 6 completion.

### Environmental State

```javascript
// Get global weather
const globalEnv = await game.introspection.getEnvironmentalState();
console.log('Temperature:', globalEnv.temperature);
console.log('Weather:', globalEnv.weather);
console.log('Time of day:', globalEnv.timeOfDay);

// Get regional environmental state
const localEnv = await game.introspection.getEnvironmentalState({
  x: 0,
  y: 0,
  width: 100,
  height: 100
});
console.log('Average soil moisture:', localEnv.avgSoilMoisture);
console.log('Average light level:', localEnv.avgLight);
```

**Note:** Not yet implemented. Returns error until Phase 6 completion.

## Query Examples

```javascript
// Find all agents
game.world.query().with('agent').executeEntities();

// Find all agents with skills
game.world.query().with('agent').with('skills').executeEntities();

// Find all buildings
game.world.query().with('building').executeEntities();

// Get entity by ID
game.world.getEntity(id);

// Get component from entity
agent.getComponent('identity');
agent.getComponent('skills');
agent.getComponent('position');
```

## Practical Workflows

### Grant XP to All Agents
```javascript
game.world.query().with('agent').with('skills').executeEntities()
  .forEach(a => game.grantSkillXP(a.id, 100));
```

### Select Best Farmer
```javascript
const agents = game.world.query().with('agent').with('skills').executeEntities();
const best = agents
  .map(a => ({ id: a.id, farming: a.getComponent('skills').levels.farming || 0 }))
  .sort((a, b) => b.farming - a.farming)[0];
game.setSelectedAgent(best.id);
console.log(`Selected best farmer with ${best.farming} farming`);
```

### Spawn Agents at Random Locations
```javascript
for (let i = 0; i < 10; i++) {
  game.devPanel.spawnX = Math.floor(Math.random() * 200);
  game.devPanel.spawnY = Math.floor(Math.random() * 200);
  // Then click "Spawn Wandering Agent" in DevPanel
}
```

### Find Nearby Entities
```javascript
const pos = game.world.getEntity(agentId).getComponent('position');
const nearby = game.world.query().with('position').executeEntities()
  .filter(e => {
    const p = e.getComponent('position');
    const dx = p.x - pos.x, dy = p.y - pos.y;
    return dx*dx + dy*dy < 100;  // Within 10 tiles
  });
```

### Inspect Agent State
```javascript
const agent = game.world.getEntity(agentId);
console.log({
  identity: agent.getComponent('identity'),
  position: agent.getComponent('position'),
  needs: agent.getComponent('needs'),
  behavior: agent.getComponent('behavior'),
  memory: agent.getComponent('memory'),
  skills: agent.getComponent('skills'),
});
```

## Important Notes

### API Architecture
1. **Prefer `game.introspection`**: Phase 2+ methods provide validation, tracking, and better error handling
2. **Legacy wrappers**: `game.grantSkillXP()` and `game.getAgentSkills()` wrap introspection API for backward compatibility
3. **Async operations**: Most introspection methods return Promises (use `await`)
4. **Test API**: `__gameTest` methods are experimental and may change

### Validation & Safety
5. **Automatic validation**: Mutations validate against component schemas by default (can disable with `validate: false`)
6. **Undo support**: All mutations via `mutateField()` are tracked and reversible
7. **Cache invalidation**: Mutations automatically invalidate affected entity caches
8. **Error handling**: Check `.success` field in result objects; errors include descriptive messages

### Performance
9. **Cache hits**: Entity queries cache for 20 ticks (1 second) - check `.metadata.cacheHit`
10. **Batch mutations**: Use `mutateBatch()` for atomic multi-entity updates with rollback
11. **Watchers**: Throttle entity watchers to avoid performance impact from high-frequency changes

### Specific Methods
12. **Agent IDs required**: All skill and behavior operations need `agentId` parameter
13. **Selection sync**: `setSelectedAgent()` syncs both DevPanel and AgentInfoPanel
14. **XP calculation**: 100 XP = 1 skill level in introspection API
15. **Snapshots**: Entity snapshots are in-memory only (not persisted to disk)
16. **Economic/Environmental**: Phase 6 methods not yet implemented (return errors)

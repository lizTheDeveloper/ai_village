# Targeting System

Perception-limited entity targeting for actions, spells, and AI behaviors. Agents can only target entities they can see (via VisionComponent) or remember (via SpatialMemoryComponent).

## Target Types

**AgentTargeting** - Find other agents for social interactions (conversation, following, combat)
**BuildingTargeting** - Find structures (storage, beds, crafting stations, shelter)
**ResourceTargeting** - Find gatherable resources (wood, stone, food)
**PlantTargeting** - Find plants (edible fruit, seeds, specific species)
**ThreatTargeting** - Find predators and hazards (flee behavior, danger assessment)

## Target Selection

All targeting classes use **perception-first** approach:
1. Search visible entities (VisionComponent.seenAgents/seenResources/seenPlants)
2. Filter by criteria (type, distance, state)
3. Return nearest match
4. Auto-remember location for future reference

**Visibility constraints**: Entities beyond vision range or behind obstacles cannot be targeted unless remembered.

## Range and Memory

**Vision range**: Default 15 tiles, varies by VisionComponent.range
**Distance calculation**: Euclidean sqrt(dx² + dy²)
**Memory fallback**: `findTarget()` methods check remembered locations via SpatialMemoryComponent when no visible match

Example:
```typescript
// Find visible resource or remembered location
const result = resourceTargeting.findTarget(entity, world, { resourceType: 'wood' });
if (result.type === 'visible') {
  // Entity in sight, can harvest
} else if (result.type === 'remembered') {
  // Walk to last known location
}
```

## API Patterns

**Class-based**: `new AgentTargeting().findNearest(entity, world, options)`
**Standalone functions**: `findNearestAgent(entity, world, options)` (uses singleton)

**Common methods**:
- `findNearest()` - Single closest match
- `findAll()` - All visible matches, sorted by distance
- `findTarget()` - Visible or remembered (returns TargetResult)
- `getRemembered()` - Retrieve memory without vision check
- `forgetRemembered()` - Clear stale memory

## Threat Assessment

ThreatTargeting provides `assessThreats()` for multi-threat scenarios:
- Weighted flee direction (inverse distance × threat level)
- Approaching detection (velocity dot product)
- Total threat count and highest threat level

Used by flee behaviors and panic responses.

# Autonomous Building Placement
## Context-Aware LLM Building Decisions with Auto-Gather

> *Dedicated to:*
> - **RimWorld's Colonists** - Who build when they need to
> - **Dwarf Fortress Dwarves** - Who construct based on necessity
> - **The Sims** - For autonomous needs-based actions
> - **Tarn Adams** and *Dwarf Fortress* - For emergent construction behavior

---

## Overview

Enable agents to **intelligently decide when and what to build** based on their needs, using LLM decision-making. Agents receive contextual building suggestions (cold → campfire, full inventory → storage) and automatically gather missing resources before construction.

### Core Philosophy

**Buildings are solutions to problems, not arbitrary constructions.** An agent doesn't think "I should build something"—they think "I'm cold" or "My inventory is full," and the LLM suggests buildings as solutions. The system provides relevant context, not a catalog of all possibilities.

### Key Innovations

1. **Context-aware prompts** - Only show relevant buildings based on current needs
2. **Auto-gather resources** - Agents automatically gather missing materials before building
3. **Smart placement** - Find valid spots near agent, avoid water/obstacles
4. **Building type extraction** - Parse LLM response to determine which building to construct
5. **Clear error messages** - Emit events for debugging and UI feedback

---

## Part 1: Enhanced Prompt Context

### Building Suggestions Based on Needs

The LLM receives contextual building suggestions, not a full catalog:

```typescript
// packages/llm/src/StructuredPromptBuilder.ts

private buildWorldContext(...): string {
  // ... existing code ...

  // Add building recommendations based on needs
  if (needs || temperature) {
    context += this.suggestBuildings(needs, temperature, inventory);
  }

  return context;
}

private suggestBuildings(
  needs: NeedsComponent | undefined,
  temperature: TemperatureComponent | undefined,
  inventory: InventoryComponent | undefined
): string {
  const suggestions: string[] = [];

  const hasResources = (items: Record<string, number>): boolean => {
    return Object.entries(items).every(([itemId, qty]) => {
      const slots = inventory?.slots || [];
      const totalQty = slots
        .filter(s => s.itemId === itemId)
        .reduce((sum, s) => sum + s.quantity, 0);
      return totalQty >= qty;
    });
  };

  // Check if cold → suggest warmth buildings
  if (temperature?.state === 'cold' || temperature?.state === 'dangerously_cold') {
    if (hasResources({ stone: 10, wood: 5 })) {
      suggestions.push('campfire (10 stone + 5 wood) - provides warmth in 3-tile radius');
    } else {
      suggestions.push('campfire (10 stone + 5 wood) - provides warmth [NEED: gather more resources]');
    }

    if (hasResources({ cloth: 10, wood: 5 })) {
      suggestions.push('tent (10 cloth + 5 wood) - shelter with insulation');
    } else if (hasResources({ wood: 10, leaves: 5 })) {
      suggestions.push('lean-to (10 wood + 5 leaves) - basic shelter');
    }
  }

  // Check if inventory full → suggest storage
  const fullSlots = inventory?.slots.filter(s => s.itemId).length || 0;
  if (fullSlots >= 8) {
    if (hasResources({ wood: 10 })) {
      suggestions.push('storage-chest (10 wood) - 20 item slots');
    } else {
      suggestions.push('storage-chest (10 wood) - 20 item slots [NEED: 10 wood]');
    }
  }

  // Check if tired → suggest sleeping structures
  if (needs && needs.energy < 50) {
    if (hasResources({ wood: 10, plant_fiber: 15 })) {
      suggestions.push('bed (10 wood + 15 fiber) - best sleep quality (+50% recovery)');
    }
    if (hasResources({ plant_fiber: 20, leather: 5 })) {
      suggestions.push('bedroll (20 fiber + 5 leather) - portable sleep (+30% recovery)');
    }
  }

  if (suggestions.length > 0) {
    return `\n\nBuildings you could build:\n${suggestions.map(s => `- ${s}`).join('\n')}`;
  }

  return '';
}
```

**Update build action description:**

```typescript
// Instead of generic description:
actions.push('build - Construct a building (e.g., "build lean-to")');

// Use specific description:
actions.push('build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)');
```

**Why context-aware?** Showing all 20+ building types overwhelms the LLM. Showing only relevant buildings improves decision quality and token efficiency.

---

## Part 2: Response Parsing

### Extract Building Type from LLM

```typescript
// packages/core/src/actions/AgentAction.ts

if (cleaned.includes('build') || cleaned.includes('construct')) {
  // Try to extract building type
  let buildingType: BuildingType = 'lean-to'; // fallback

  // Check for specific building types
  if (cleaned.includes('campfire') || cleaned.includes('fire')) {
    buildingType = 'campfire';
  } else if (cleaned.includes('tent')) {
    buildingType = 'tent';
  } else if (cleaned.includes('storage') || cleaned.includes('chest')) {
    buildingType = 'storage-chest';
  } else if (cleaned.includes('bed') && !cleaned.includes('bedroll')) {
    buildingType = 'bed';
  } else if (cleaned.includes('bedroll')) {
    buildingType = 'bedroll';
  } else if (cleaned.includes('workbench')) {
    buildingType = 'workbench';
  } else if (cleaned.includes('well')) {
    buildingType = 'well';
  }

  return {
    type: 'build',
    buildingType,
    position: { x: 0, y: 0 } // Will be set to agent position
  };
}
```

**Why synonym matching?** LLMs might say "fire pit" instead of "campfire", "chest" instead of "storage-chest". Robust parsing handles variations.

---

## Part 3: Auto-Gather Missing Resources

### Gather-Then-Build Workflow

```typescript
// packages/core/src/systems/AISystem.ts

private buildBehavior(entity: Entity, world: World): void {
  const agent = entity.getComponent<AgentComponent>('agent');
  const inventory = entity.getComponent<InventoryComponent>('inventory');
  const position = entity.getComponent<PositionComponent>('position');

  // Determine building type
  const buildingType = (agent.behaviorState?.buildingType as BuildingType) || 'lean-to';

  // Get blueprint
  const blueprint = world.buildingRegistry?.tryGet(buildingType);
  if (!blueprint) {
    console.error(`[AISystem] Unknown building type: ${buildingType}`);
    // Fall back to wander
    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
    }));
    return;
  }

  // Check what resources we're missing
  const missing = this.getMissingResources(inventory, blueprint.resourceCost);

  if (missing.length > 0) {
    // Switch to gathering the first missing resource
    const firstMissing = missing[0];
    console.log(`[AISystem] Agent ${entity.id} needs ${firstMissing.amountRequired} ${firstMissing.resourceId} to build ${buildingType}, switching to gather`);

    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'gather',
      behaviorState: {
        resourceType: firstMissing.resourceId,
        targetAmount: firstMissing.amountRequired,
        returnToBuild: buildingType, // Remember what we're gathering for
      },
    }));

    world.eventBus.emit({
      type: 'construction:gathering_resources',
      source: entity.id,
      data: {
        buildingType,
        missingResources: missing,
      },
    });

    return;
  }

  // If we have all resources, proceed with construction...
  const buildPos = this.findValidBuildSpot(
    world,
    position,
    blueprint.width || 1,
    blueprint.height || 1
  );

  if (!buildPos) {
    console.error(`[AISystem] No valid build spot found for ${buildingType}`);
    world.eventBus.emit({
      type: 'construction:placement_failed',
      source: entity.id,
      data: { buildingType, reason: 'no_valid_spot' }
    });

    entity.updateComponent<AgentComponent>('agent', (current) => ({
      ...current,
      behavior: 'wander',
      behaviorState: {},
    }));
    return;
  }

  // Place building...
  // (existing building placement code)
}

private getMissingResources(
  inventory: InventoryComponent,
  costs: ResourceCost[]
): ResourceCost[] {
  const missing: ResourceCost[] = [];

  for (const cost of costs) {
    const available = inventory.slots
      .filter(s => s.itemId === cost.resourceId)
      .reduce((sum, s) => sum + s.quantity, 0);

    if (available < cost.amountRequired) {
      missing.push({
        resourceId: cost.resourceId,
        amountRequired: cost.amountRequired - available,
      });
    }
  }

  return missing;
}
```

### Return to Building After Gathering

```typescript
// In gatherBehavior(), after successfully gathering:

if (agent.behaviorState?.returnToBuild) {
  // Check if we now have enough resources
  const buildingType = agent.behaviorState.returnToBuild as BuildingType;
  const blueprint = world.buildingRegistry?.tryGet(buildingType);

  if (blueprint) {
    const stillMissing = this.getMissingResources(inventory, blueprint.resourceCost);

    if (stillMissing.length === 0) {
      // We have everything! Switch to build
      console.log(`[AISystem] Agent ${entity.id} gathered resources, switching to build ${buildingType}`);

      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'build',
        behaviorState: { buildingType },
      }));

      return;
    } else {
      // Still missing something, keep gathering
      const nextMissing = stillMissing[0];
      entity.updateComponent<AgentComponent>('agent', (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType: nextMissing.resourceId,
          targetAmount: nextMissing.amountRequired,
          returnToBuild: buildingType,
        },
      }));
    }
  }
}
```

**Why auto-gather?** Agents should handle logistics autonomously. Requiring manual resource management breaks immersion.

---

## Part 4: Smart Placement

### Find Valid Build Spot

```typescript
// packages/core/src/systems/AISystem.ts

private findValidBuildSpot(
  world: World,
  agentPos: PositionComponent,
  width: number,
  height: number
): { x: number; y: number } | null {
  // Try positions in expanding radius around agent
  for (let radius = 0; radius <= 2; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const testX = Math.floor(agentPos.x) + dx;
        const testY = Math.floor(agentPos.y) + dy;

        // Check if this spot is valid (not in water, no buildings, etc.)
        const terrain = world.getTerrainAt?.(testX, testY);
        if (!terrain || (terrain !== 'grass' && terrain !== 'dirt')) {
          continue;
        }

        // Check no existing buildings
        const buildings = world.query().with('building').with('position').executeEntities();
        let blocked = false;

        for (const building of buildings) {
          const bPos = building.getComponent<PositionComponent>('position');
          if (Math.abs(bPos.x - testX) < 2 && Math.abs(bPos.y - testY) < 2) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          return { x: testX, y: testY };
        }
      }
    }
  }

  return null; // No valid spot found
}
```

**Why expanding radius?** Agents try to build close to themselves first, then search farther if blocked. Prevents awkward distant placements.

---

## Part 5: Store Building Type in Behavior State

### Pass Through from Parsed Action

```typescript
// packages/core/src/systems/AISystem.ts

// Around line 220 where behavior is set from LLM decision

const action = this.parseAction(response);

entity.updateComponent<AgentComponent>('agent', (current) => ({
  ...current,
  behavior,
  behaviorState: {
    buildingType: action.buildingType, // Pass through from parsed action
  },
  llmCooldown: 1200,
  // ...
}));
```

**Why store in behavior state?** The building type from LLM response must persist across frames until construction completes.

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **LLM System** - Foundation for AI decision-making
- **Building System** - Buildings that agents can construct
- **Gathering System** - Agents must be able to gather materials
- **Pathfinding** - Finding valid locations for building placement

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Needs System** - Contextual building suggestions based on temperature, hunger, energy
- **Resource System** - Auto-gather missing materials before construction

### Superseded By (Future Replacements)
These systems eventually replace parts of this spec:
- **Voxel Building System** - For collaborative tile-based construction with material transport (replaces monolithic building placement)

---

## Implementation Checklist

### Phase 1: Enhanced Prompt Context
- [ ] Add `suggestBuildings()` method to `StructuredPromptBuilder`
- [ ] Implement resource checking (`hasResources()`)
- [ ] Add context-aware suggestions for cold/full inventory/tired
- [ ] Update build action description to list building types
- [ ] Write unit tests for suggestion logic

**Dependencies:** None
**Integration Points:** `packages/llm/src/StructuredPromptBuilder.ts`

### Phase 2: Response Parsing
- [ ] Update `parseAction()` in `AgentAction.ts`
- [ ] Add synonym matching for building types
- [ ] Support: campfire, tent, storage-chest, bed, bedroll, workbench, well, lean-to
- [ ] Write unit tests for parsing variations

**Dependencies:** None
**Integration Points:** `packages/core/src/actions/AgentAction.ts`

### Phase 3: Auto-Gather Missing Resources
- [ ] Add `getMissingResources()` helper to `AISystem`
- [ ] Update `buildBehavior()` to check resources before building
- [ ] Switch to `gather` behavior if resources missing
- [ ] Store `returnToBuild` in behavior state
- [ ] Update `gatherBehavior()` to return to building after gathering
- [ ] Emit `construction:gathering_resources` event
- [ ] Write integration tests for gather-then-build workflow

**Dependencies:** Phase 1, Phase 2
**Integration Points:** `packages/core/src/systems/AISystem.ts`

### Phase 4: Smart Placement
- [ ] Add `findValidBuildSpot()` helper to `AISystem`
- [ ] Implement expanding radius search
- [ ] Check terrain type (grass/dirt only)
- [ ] Check for existing buildings (avoid overlap)
- [ ] Emit `construction:placement_failed` event on failure
- [ ] Write tests for placement validation

**Dependencies:** Phase 3
**Integration Points:** `packages/core/src/systems/AISystem.ts`

### Phase 5: Behavior State Management
- [ ] Store `buildingType` in behavior state from parsed action
- [ ] Pass `buildingType` through to `buildBehavior()`
- [ ] Preserve `buildingType` during gather-then-build cycle
- [ ] Write tests for state persistence

**Dependencies:** All previous phases
**Integration Points:** `packages/core/src/systems/AISystem.ts`

### Phase 6: Testing & Validation
- [ ] Test cold agent builds campfire/tent
- [ ] Test agent with full inventory builds storage
- [ ] Test tired agent builds bed
- [ ] Test resource checking (building fails without resources)
- [ ] Test auto-gather workflow (gathers → builds)
- [ ] Test placement validation (no water, no overlap)
- [ ] Write comprehensive integration tests

**Dependencies:** All previous phases
**Integration Points:** Test suite

---

## Research Questions

1. **What if agent can't find resources?**
   - **Proposal:** After N failed gather attempts, abandon building plan and return to wander.

2. **Multiple missing resource types?**
   - **Proposal:** Gather sequentially (wood first, then stone). Could optimize later with multi-resource gathering.

3. **Building priority when multiple needs?**
   - **Proposal:** LLM decides based on urgency. "Dangerously cold" > "slightly full inventory."

4. **Can agents cancel building mid-construction?**
   - **Proposal:** Yes. If needs change drastically (e.g., health critical), abandon building and switch behaviors.

5. **Collaborative building?**
   - **Proposal:** Out of scope for this spec. See `VOXEL_BUILDING_SPEC.md` for collaborative construction.

6. **Building placement conflicts (two agents, same spot)?**
   - **Proposal:** First to place wins. Second agent's `findValidBuildSpot()` will find nearby alternative.

---

## Test Cases

### Test Case 1: Cold Agent Builds Campfire
```
Given: Agent temperature < 10°C
  And: Agent has 10 stone + 5 wood
When: LLM decides to build
Then: Agent selects "campfire"
  And: Building placed successfully
  And: Agent warms up
```

### Test Case 2: Full Inventory Builds Storage
```
Given: Agent has 10+ items
  And: Agent has 10 wood
When: LLM decides to build
Then: Agent selects "storage-chest"
  And: Building placed near agent
  And: Agent can store items
```

### Test Case 3: Tired Agent Builds Bed
```
Given: Agent energy < 30
  And: Agent has 10 wood + 15 plant fiber
When: LLM decides to build
Then: Agent selects "bed"
  And: Building placed successfully
  And: Agent can sleep in bed
```

### Test Case 4: Missing Resources Auto-Gather
```
Given: Agent wants to build campfire
  And: Agent has 5 stone (needs 10)
When: Build behavior starts
Then: Agent switches to gather stone
When: Agent gathers 5+ stone
Then: Agent returns to build behavior
  And: Building placed successfully
```

### Test Case 5: Placement Validation
```
Given: Agent wants to build campfire
  And: Agent is standing in water
When: Build behavior starts
Then: findValidBuildSpot() searches nearby
  And: Finds valid grass/dirt tile
  And: Building placed at valid spot
```

### Test Case 6: No Valid Spot
```
Given: Agent wants to build
  And: All nearby tiles are water/occupied
When: Build behavior starts
Then: findValidBuildSpot() returns null
  And: Emit construction:placement_failed event
  And: Agent switches to wander
```

---

## Files to Modify

1. **`packages/llm/src/StructuredPromptBuilder.ts`**
   - Add `suggestBuildings()` method
   - Update `buildWorldContext()` to include building suggestions
   - Update build action description

2. **`packages/core/src/actions/AgentAction.ts`**
   - Update `parseAction()` to extract building type
   - Add synonym matching for all building types

3. **`packages/core/src/systems/AISystem.ts`**
   - Store `buildingType` in behavior state from parsed action
   - Add `getMissingResources()` helper
   - Update `buildBehavior()` to check resources and auto-gather
   - Update `gatherBehavior()` to return to building after gathering
   - Add `findValidBuildSpot()` helper
   - Update building placement to use smart location

4. **`packages/core/src/events/EventMap.ts`** (if not already present)
   - Add `construction:gathering_resources` event
   - Add `construction:placement_failed` event

---

## Files to Create

1. **`packages/core/src/__tests__/LLMBuildingPlacement.test.ts`**
   - Test each building type can be selected
   - Test placement validation
   - Test resource checking
   - Test auto-gather workflow
   - Test all test cases listed above

---

## Success Criteria

✅ LLM receives contextual building suggestions based on needs
✅ LLM can specify which building type to construct
✅ Agents auto-gather missing resources before building
✅ Buildings are placed in valid locations near the agent
✅ Resource costs are checked and deducted correctly
✅ Agents build campfires when cold
✅ Agents build storage when inventory is full
✅ Agents build beds when tired
✅ Build failures emit clear error events
✅ All tests pass

---

## Event Flow

```
1. Agent has need (cold, full inventory, tired)
   └─> StructuredPromptBuilder.suggestBuildings()
       └─> Include relevant building suggestions in prompt

2. LLM decides to build
   └─> Returns response: "I'll build a campfire to warm up"
       └─> AgentAction.parseAction()
           └─> Extract buildingType: 'campfire'

3. AISystem sets behavior
   └─> agent.behavior = 'build'
   └─> agent.behaviorState = { buildingType: 'campfire' }

4. buildBehavior() runs
   └─> Check resources
       ├─> If missing → switch to gather
       │   └─> behaviorState = { resourceType: 'stone', targetAmount: 10, returnToBuild: 'campfire' }
       └─> If have all → find valid spot
           └─> Place building

5. (If gathering) gatherBehavior() runs
   └─> Gather resources
   └─> When enough → return to build
       └─> agent.behavior = 'build'
       └─> agent.behaviorState = { buildingType: 'campfire' }
```

---

## Backward Compatibility

**No breaking changes.** All modifications are additive:
- Existing building placement still works
- Fallback to `lean-to` if parsing fails
- Fallback to current position if placement search fails
- Auto-gather is opt-in via `returnToBuild` state

---

## Future Enhancements (Out of Scope)

- **Multi-building planning** - "I need campfire AND storage, build both"
- **Collaborative building** - Multiple agents work on same construction (see `VOXEL_BUILDING_SPEC.md`)
- **Building upgrades** - Upgrade lean-to → tent → house
- **Strategic placement** - "Build campfire in center of village for shared warmth"
- **Demolition** - Remove unwanted buildings

---

## Inspiration

This system draws from:
- **RimWorld** - Colonists build based on needs
- **Dwarf Fortress** - Dwarves construct when necessary
- **The Sims** - Autonomous needs-based actions
- **Oxygen Not Included** - Context-aware construction decisions

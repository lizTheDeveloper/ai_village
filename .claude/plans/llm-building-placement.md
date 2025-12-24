# Implementation Plan: LLM-Decided Building Placement

## Overview
Enable agents to intelligently decide when and what to build based on their needs, using LLM decision-making.

**User Preferences:**
- ✅ **Context-aware prompts:** Only show relevant buildings based on current needs
- ✅ **Auto-gather resources:** Agents automatically gather missing resources before building

**Key Features:**
1. LLM receives contextual building suggestions (cold → campfire, full inventory → storage)
2. LLM can specify which building type to construct
3. Agents auto-gather missing resources before building
4. Smart placement finds valid spots near agent
5. Clear error messages and event emissions

**Implementation Phases:**
1. Enhanced prompt context (suggest relevant buildings)
2. Improved response parsing (extract building type from LLM)
3. Auto-gather missing resources (gather → build workflow)
4. Smart placement location (find valid nearby spots)
5. Testing & validation

## Current State Analysis

### What Works
- ✅ Build behavior exists (`AISystem.ts:1460-1562`)
- ✅ Building blueprints defined with costs & functionality (`BuildingBlueprintRegistry.ts`)
- ✅ Placement validation system exists (`PlacementValidator.ts`)
- ✅ Resource checking & deduction works
- ✅ LLM decision-making infrastructure in place

### What's Missing
❌ **LLM has no context about buildings**
- Prompt just says: "build - Construct a building (e.g., 'build lean-to')"
- No info about what buildings exist, costs, or benefits
- No connection between needs and building solutions

❌ **Response parsing defaults to lean-to**
- `parseAction()` always returns `buildingType: 'lean-to'` (AgentAction.ts:108)
- LLM can't specify which building type to construct

❌ **No needs-based building triggers**
- Autonomic system doesn't suggest building as solution to problems
- No logic like "I'm cold → maybe build campfire/tent"

## Implementation Strategy

### Phase 1: Enhanced Prompt Context
**Goal:** Give LLM information about buildings and when to build

**Changes to `StructuredPromptBuilder.ts`:**

1. **Add building context to world state**
   ```typescript
   private buildWorldContext(...) {
     // ... existing code ...

     // Add building recommendations based on needs
     if (needs || temperature) {
       context += this.suggestBuildings(needs, temperature, inventory);
     }
   }
   ```

2. **Create building suggestion method** (CONTEXT-AWARE - only show relevant buildings)
   ```typescript
   private suggestBuildings(needs, temperature, inventory): string {
     const suggestions = [];
     const hasResources = (items: Record<string, number>) => {
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
         suggestions.push('campfire (10 stone + 5 wood) - provides warmth [NEED: more resources]');
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
     if (needs?.energy < 50) {
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

3. **Update build action description**
   ```typescript
   // Instead of:
   actions.push('build - Construct a building (e.g., "build lean-to")');

   // Use:
   actions.push('build - Construct a building (say "build <type>": campfire, tent, storage-chest, bed, etc.)');
   ```

### Phase 2: Improved Response Parsing
**Goal:** Extract building type from LLM response

**Changes to `AgentAction.ts`:**

1. **Parse building type from response**
   ```typescript
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

2. **Update `actionToBehavior` to pass buildingType**
   ```typescript
   case 'build':
   case 'construct':
     // Store buildingType in behaviorState for later use
     return 'build';
   ```

**Changes to `AISystem.ts` (LLM decision handling):**

1. **Store building type in behavior state**
   ```typescript
   // Around line 220 where behavior is set
   impl.updateComponent<AgentComponent>('agent', (current) => ({
     ...current,
     behavior,
     behaviorState: {
       ...(impl as any).__pendingBehaviorState,
       buildingType: action.buildingType, // Pass through from parsed action
     },
     llmCooldown: 1200,
     // ...
   }));
   ```

### Phase 3: Auto-Gather Missing Resources
**Goal:** If agent lacks resources, automatically gather them before building

**Changes to `AISystem.ts` `buildBehavior()`:**

1. **Check resources and auto-gather if needed**
   ```typescript
   // After determining buildingType, check if we have resources
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
   ```

2. **Add helper to check missing resources**
   ```typescript
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

3. **Update gather behavior to return to building**
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

         impl.updateComponent<AgentComponent>('agent', (current) => ({
           ...current,
           behavior: 'build',
           behaviorState: { buildingType },
         }));

         return;
       } else {
         // Still missing something, keep gathering
         const nextMissing = stillMissing[0];
         impl.updateComponent<AgentComponent>('agent', (current) => ({
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

### Phase 4: Smart Placement Location
**Goal:** Place buildings near agent, validate placement

**Changes to `AISystem.ts` `buildBehavior()`:**

1. **Improve placement logic**
   ```typescript
   // Instead of just Math.floor(position.x/y)
   // Try to find a valid nearby spot

   const buildingType = agent.behaviorState?.buildingType as BuildingType || 'lean-to';
   const blueprint = world.buildingRegistry?.tryGet(buildingType);

   // Search for valid placement in 3x3 area around agent
   let buildPos = this.findValidBuildSpot(
     world,
     position,
     blueprint?.width || 1,
     blueprint?.height || 1
   );

   if (!buildPos) {
     // Fallback to current position
     buildPos = { x: Math.floor(position.x), y: Math.floor(position.y) };
   }
   ```

2. **Add helper method**
   ```typescript
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
           if (terrain && (terrain === 'grass' || terrain === 'dirt')) {
             // Check no existing buildings
             const buildings = world.query().with('building').with('position').executeEntities();
             let blocked = false;

             for (const building of buildings) {
               const bPos = (building as any).getComponent('position');
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
     }

     return null; // No valid spot found
   }
   ```

### Phase 5: Testing & Validation

**Test Cases:**

1. **Cold agent builds campfire/tent**
   - Agent temperature < 10°C
   - Has wood + stone/cloth
   - LLM decides to build campfire or tent
   - Building placed successfully

2. **Agent with full inventory builds storage**
   - Agent has 10+ items
   - Has 10 wood
   - LLM decides to build storage-chest
   - Building placed near agent

3. **Tired agent builds bed**
   - Agent energy < 30
   - Has wood + plant fiber
   - LLM decides to build bed
   - Building placed successfully

4. **Resource checking works**
   - Agent tries to build without resources
   - Construction fails with clear error
   - Agent continues wandering

5. **Placement validation works**
   - Agent can't build in water
   - Agent can't build on existing buildings
   - Agent finds nearby valid spot if current position blocked

## Files to Modify

1. **`packages/llm/src/StructuredPromptBuilder.ts`**
   - Add `suggestBuildings()` method
   - Update `buildWorldContext()` to include building suggestions
   - Update build action description

2. **`packages/core/src/actions/AgentAction.ts`**
   - Update `parseAction()` to extract building type from LLM response
   - Support: campfire, tent, storage-chest, bed, bedroll, workbench, well, lean-to

3. **`packages/core/src/systems/AISystem.ts`**
   - Store `buildingType` in behavior state from parsed action
   - Add `findValidBuildSpot()` helper method
   - Update `buildBehavior()` to use smart placement

4. **Tests to add:**
   - `packages/core/src/__tests__/LLMBuildingPlacement.test.ts`
   - Test each building type can be selected
   - Test placement validation
   - Test resource checking

## Success Criteria

✅ LLM receives contextual building suggestions based on needs
✅ LLM can specify which building type to construct
✅ Buildings are placed in valid locations near the agent
✅ Resource costs are checked and deducted correctly
✅ Agents build campfires when cold
✅ Agents build storage when inventory is full
✅ Agents build beds when tired
✅ Build failures emit clear error events
✅ All tests pass

## Risks & Considerations

### Low Risk
- Changes are additive, don't break existing behavior
- Fallback to 'lean-to' if parsing fails (backward compatible)
- Placement defaults to current position if no valid spot found

### Medium Risk
- LLM might not always parse building suggestions correctly
  - **Mitigation:** Use clear, consistent naming in prompts
  - **Mitigation:** Extensive synonym matching in parseAction()

- Building placement might fail in crowded areas
  - **Mitigation:** Search expanding radius for valid spot
  - **Mitigation:** Emit clear failure event so agent can try elsewhere

### Testing Strategy
1. Unit tests for parsing different building types
2. Integration tests for full build flow (prompt → parse → build → validate)
3. Manual playtesting: spawn agent in cold area, verify builds campfire
4. Manual playtesting: give agent resources, verify builds storage when full

## Future Enhancements (Out of Scope)

- **Multi-building planning:** "I need campfire AND storage, build both"
- **Collaborative building:** Multiple agents work on same construction
- **Building upgrades:** Upgrade lean-to → tent → house
- **Strategic placement:** "Build campfire in center of village for shared warmth"

# Prompt Builder Implementation - 2026-01-06

## Summary

Implemented TalkerPromptBuilder and ExecutorPromptBuilder as Layer 2 and Layer 3 of the three-layer LLM decision architecture. Exposed both builders via the metrics server API for inspection and benchmarking.

## Work Completed

### 1. Created TalkerPromptBuilder (packages/llm/src/TalkerPromptBuilder.ts)

- **Layer 2**: Conversation, goals, and social interactions
- **Features**:
  - Environmental awareness (vision, weather, temperature, needs, location)
  - Social context (conversations, relationships, nearby agents)
  - Talker-specific actions (talk, follow_agent, call_meeting, help, goal-setting)
  - Personality-driven instructions
  - Recent social memories
- **477 lines** of focused social/conversational decision-making logic

### 2. Created ExecutorPromptBuilder (packages/llm/src/ExecutorPromptBuilder.ts)

- **Layer 3**: Strategic planning and task execution
- **Features**:
  - Skills section (what agent is good at)
  - Strategic priorities (current focus areas)
  - Personal and village goals
  - Village status for coordination context
  - Available buildings (what can be planned/built)
  - Executor-specific actions (set_priorities, plan_build, build, gather, farming, exploration, animals, combat)
  - Skill-gated action availability
  - Task-aware instructions
- **681 lines** of strategic planning logic

### 3. Exported Prompt Builders from LLM Package

- Added exports to `packages/llm/src/index.ts`:
  ```typescript
  export * from './TalkerPromptBuilder';
  export * from './ExecutorPromptBuilder';
  ```

### 4. Extended LiveEntityAPI for Prompt Inspection

**File**: `packages/core/src/metrics/LiveEntityAPI.ts`

Added:
- `setTalkerPromptBuilder()` - Configure Talker prompt builder
- `setExecutorPromptBuilder()` - Configure Executor prompt builder
- `handleTalkerPromptQuery()` - Query handler for `talker_prompt` type
- `handleExecutorPromptQuery()` - Query handler for `executor_prompt` type

### 5. Exported LiveEntityAPI from Core Package

**File**: `packages/core/src/index.ts`

Added missing export:
```typescript
// LiveEntityAPI still lives in core for now
export { LiveEntityAPI, type QueryRequest, type QueryResponse } from './metrics/index.js';
```

**Why needed**: headless.ts imports LiveEntityAPI from core package but it wasn't exported

### 6. Added HTTP Endpoints to Metrics Server

**File**: `scripts/metrics-server.ts`

New endpoints:
- `GET /api/live/prompt/talker?id=<agentId>&session=<sessionId>` - Get Talker prompt (Layer 2)
- `GET /api/live/prompt/executor?id=<agentId>&session=<sessionId>` - Get Executor prompt (Layer 3)

Both endpoints:
- Support optional `?session=<id>` parameter to target specific game sessions
- Return JSON with prompt text or error message
- Follow same pattern as existing `/api/live/prompt` endpoint

### 7. Wired Up Prompt Builders in Demo

**File**: `demo/src/main.ts`

Added:
```typescript
let talkerPromptBuilder: TalkerPromptBuilder | null = null;
let executorPromptBuilder: ExecutorPromptBuilder | null = null;

if (isLLMAvailable) {
  talkerPromptBuilder = new TalkerPromptBuilder();
  executorPromptBuilder = new ExecutorPromptBuilder();
}

// Wire up to LiveEntityAPI
if (talkerPromptBuilder) {
  liveEntityAPI.setTalkerPromptBuilder(talkerPromptBuilder);
}
if (executorPromptBuilder) {
  liveEntityAPI.setExecutorPromptBuilder(executorPromptBuilder);
}
```

### 8. Wired Up Prompt Builders in Headless Game

**File**: `demo/headless.ts`

- Added imports for TalkerPromptBuilder and ExecutorPromptBuilder
- Wire up both builders in `setupGameSystems()`:
  ```typescript
  const talkerPromptBuilder = new TalkerPromptBuilder();
  const executorPromptBuilder = new ExecutorPromptBuilder();
  liveEntityAPI.setTalkerPromptBuilder(talkerPromptBuilder);
  liveEntityAPI.setExecutorPromptBuilder(executorPromptBuilder);
  ```
- **Fixed**: Removed duplicate `registerShopBlueprints()` call (already called by `registerDefaults()`)

### 9. Created Benchmark Script

**File**: `benchmark-prompts.sh`

Automated testing script:
- Spawns headless game with 5 agents
- Waits for agents to be created
- Fetches all three prompt types (original, talker, executor) for first agent
- Compares prompts and generates statistics
- Creates benchmark report with samples
- **Portable**: Uses awk for string capitalization (macOS compatible)

### 10. Created Standalone Test Script

**File**: `test-prompt-builders.ts`

Simple test script that:
- Creates minimal world without full game loop
- Creates test agent with required components
- Tests both TalkerPromptBuilder and ExecutorPromptBuilder
- Checks for expected sections in prompts
- **Fixed**: Updated to use relative imports and GameLoop for world creation

## Issues Discovered

### 1. WebSocket Connection Not Working

**Symptom**: Headless games spawn successfully but queries timeout
- Headless games connect to metrics server on port 8765 (WebSocket)
- No WebSocket connection logs in metrics server
- Live entity queries return "Query timed out"
- `/api/headless/list` shows games as "running" but `/api/live/entities` returns 0 agents

**Status**: Not fixed yet - needs investigation of WebSocket connection flow

### 2. formatGoalsForPrompt Validation Error

**Symptom**: Standalone test fails with "Cannot read properties of undefined (reading 'length')"
**Location**: `packages/core/src/components/GoalsComponent.ts:250`
**Cause**: Test agent's goals component missing required array fields
**Impact**: Prompt builders fail when goals component has undefined arrays

**Status**: Discovered but not fixed - needs proper goals component structure in test

### 3. ExplorationSystem Negative Coordinates

**Symptom**: Headless games log errors: "Sector coordinates must be non-negative"
**Location**: `packages/core/src/systems/ExplorationSystem.ts:44`
**Impact**: Exploration system fails every tick for some agents
**Status**: Pre-existing bug, not related to prompt builder work

### 4. getAvailableBuildings Function Signature Mismatch (FIXED)

**Symptom**: `TypeError: registry.getAll is not a function` when ExecutorPromptBuilder tries to build buildings knowledge
**Location**: `packages/llm/src/ExecutorPromptBuilder.ts:281` (before fix)
**Cause**: ExecutorPromptBuilder called `getAvailableBuildings(world, inventory, skills)` but the function expects `getAvailableBuildings(registry, skillLevels)`
**Root Issue**: Misunderstanding of the skill-gated helper functions pattern - they expect pre-constructed data objects, not direct world queries

**Fix Applied**:
- Extracted building registry from `world.buildingRegistry`
- Constructed `skillLevels: Partial<Record<SkillId, SkillLevel>>` from `skills.levels`
- Called `getAvailableBuildings(registry, skillLevels)` with correct parameters
- Added building formatting logic to convert blueprints array to prompt string

**Code** (ExecutorPromptBuilder.ts:276-317):
```typescript
private buildBuildingsKnowledge(
  world: World,
  inventory: InventoryComponent | undefined,
  skills: SkillsComponent | undefined
): string {
  // Check for buildingRegistry (extended World interface)
  const worldWithRegistry = world as World & { buildingRegistry?: any };
  if (!worldWithRegistry.buildingRegistry) {
    return '';
  }

  const registry = worldWithRegistry.buildingRegistry;

  // Filter buildings based on skill levels if skills provided
  let buildings: any[];
  if (skills) {
    const skillLevels: Partial<Record<SkillId, SkillLevel>> = {};
    for (const skillId of Object.keys(skills.levels) as SkillId[]) {
      skillLevels[skillId] = skills.levels[skillId];
    }
    buildings = getAvailableBuildings(registry, skillLevels);
  } else {
    // Fallback: show all unlocked buildings if no skills component
    buildings = registry.getUnlocked();
  }

  if (!buildings || buildings.length === 0) {
    return '';
  }

  // Format buildings for prompt
  let text = '--- Buildings You Can Plan ---\n';
  for (const blueprint of buildings) {
    text += `- ${blueprint.name}: ${blueprint.description}\n`;
    if (blueprint.resourceCost && blueprint.resourceCost.length > 0) {
      const costs = blueprint.resourceCost.map((rc: any) => `${rc.quantity} ${rc.resourceId}`).join(', ');
      text += `  Cost: ${costs}\n`;
    }
  }

  return text;
}
```

**Status**: ✅ Fixed - Test now passes for both TalkerPromptBuilder and ExecutorPromptBuilder

## Testing Status

### Completed
- ✅ Created TalkerPromptBuilder and ExecutorPromptBuilder
- ✅ Exported from LLM package
- ✅ Extended LiveEntityAPI with query handlers
- ✅ Added HTTP endpoints to metrics server
- ✅ Wired up in demo/src/main.ts
- ✅ Wired up in demo/headless.ts
- ✅ Created benchmark script
- ✅ Created standalone test script
- ✅ Fixed LiveEntityAPI export from core package
- ✅ Fixed headless.ts duplicate blueprint registration
- ✅ Fixed getAvailableBuildings function signature in ExecutorPromptBuilder
- ✅ Standalone test script passes for both TalkerPromptBuilder and ExecutorPromptBuilder

**Test Results**:
- TalkerPromptBuilder: 1,657 characters (social/conversational context)
- ExecutorPromptBuilder: 7,779 characters (strategic planning context)
- All expected sections present in both prompts

### Not Yet Tested (Blocked by WebSocket Issue)
- ❌ End-to-end prompt fetching via HTTP endpoints
- ❌ Benchmark comparison of all three prompt types
- ❌ Prompt quality validation with real agent data
- ❌ Headless games spawn but don't connect via WebSocket

## Next Steps

1. **Fix WebSocket Connection**
   - Debug why headless games aren't connecting to metrics server WebSocket
   - Check MetricsCollectionSystem WebSocket client initialization
   - Verify port 8765 WebSocket server is accepting connections
   - Add connection logging to both client and server

2. **Fix Goals Component Validation**
   - Update `formatGoalsForPrompt` to handle undefined arrays gracefully
   - OR ensure test script creates complete goals component
   - Add validation error messages instead of silent failures

3. **Complete End-to-End Testing**
   - Once WebSocket fixed, run benchmark script successfully
   - Compare all three prompts (original, talker, executor)
   - Validate prompt quality for LLM consumption
   - Generate benchmark report with real data

4. **Prompt Quality Review**
   - Review generated prompts for clarity and completeness
   - Ensure all required context is included
   - Verify action filtering works correctly for each layer
   - Check instruction quality and specificity

5. **Integration Testing**
   - Test with actual LLM API calls
   - Verify responses make sense for each layer
   - Validate that Talker focuses on social/conversational decisions
   - Validate that Executor focuses on strategic/task decisions

## Files Changed

- `packages/llm/src/TalkerPromptBuilder.ts` (new, 477 lines)
- `packages/llm/src/ExecutorPromptBuilder.ts` (new, 681 lines, modified buildBuildingsKnowledge method to fix function signature)
- `packages/llm/src/index.ts` (added exports)
- `packages/core/src/metrics/LiveEntityAPI.ts` (added query handlers)
- `packages/core/src/index.ts` (added LiveEntityAPI export)
- `scripts/metrics-server.ts` (added HTTP endpoints)
- `demo/src/main.ts` (wired up prompt builders)
- `demo/headless.ts` (wired up prompt builders, fixed duplicate registration)
- `benchmark-prompts.sh` (new, 163 lines)
- `test-prompt-builders.ts` (updated, fixed imports)
- `devlogs/PROMPT_BUILDERS_IMPLEMENTATION_2026-01-06.md` (updated with fix documentation)

## Architecture Notes

### Layer Separation

The three-layer architecture is now well-defined:

1. **Layer 1 - Autonomic** (StructuredPromptBuilder): Reflexive responses, basic needs
2. **Layer 2 - Talker** (TalkerPromptBuilder): Conversation, social interactions, relationships
3. **Layer 3 - Executor** (ExecutorPromptBuilder): Strategic planning, complex tasks, resource management

Each layer has:
- Distinct action sets (no overlap)
- Different context priorities
- Specific instruction styles
- Appropriate complexity levels

### Inspection via Metrics Server

All three layers are now inspectable via HTTP API:
- `/api/live/prompt` - Original/Autonomic (Layer 1)
- `/api/live/prompt/talker` - Conversational (Layer 2)
- `/api/live/prompt/executor` - Strategic (Layer 3)

This allows:
- Real-time prompt inspection during gameplay
- Comparison of different layer prompts
- Debugging of LLM decision-making
- Benchmarking and quality analysis

## Conclusion

Successfully implemented and exposed the Talker and Executor prompt builders. The core functionality is complete and ready for integration once the WebSocket connection issue is resolved. The benchmark script is in place to validate prompt quality once end-to-end testing is possible.

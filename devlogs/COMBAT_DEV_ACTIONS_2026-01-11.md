# Combat Dev Actions Implementation

**Date:** 2026-01-11

## Overview

Added three dev actions to enable testing combat/hunting systems without waiting for LLM decisions.

## Changes Made

### 1. Admin Capability Definitions

**File:** `/packages/core/src/admin/capabilities/agents.ts`

Added three new actions to the agents capability:

#### `trigger-hunt`
- **Purpose:** Make an agent hunt a specific animal
- **Parameters:**
  - `agentId` (entity-id, required): Agent to initiate hunt
  - `animalId` (entity-id, required): Animal to hunt
- **Behavior:** Creates a `ConflictComponent` with `conflictType: 'hunting'`

#### `trigger-combat`
- **Purpose:** Make two agents fight each other
- **Parameters:**
  - `attackerId` (entity-id, required): Attacking agent
  - `defenderId` (entity-id, required): Defending agent
  - `cause` (select, optional): Reason for combat (default: 'honor_duel')
    - Options: honor_duel, defense, jealousy_rival, territory_dispute, revenge
  - `lethal` (boolean, optional): Is combat lethal? (default: false)
- **Behavior:** Creates a `ConflictComponent` with `conflictType: 'agent_combat'`

### 2. Action Handlers

**File:** `/packages/metrics/src/LiveEntityAPI.ts`

Implemented two handler methods:

#### `handleTriggerHunt(action: ActionRequest): ActionResponse`
- Validates agent and animal entities exist
- Checks agent has `combat_stats` component (required for hunting)
- Verifies target is actually an animal
- Checks agent is not already in conflict
- Creates and adds conflict component with hunting type
- Returns success with hunt details

#### `handleTriggerCombat(action: ActionRequest): ActionResponse`
- Validates both attacker and defender entities exist
- Checks both are agents (not buildings, animals, etc.)
- Verifies both have `combat_stats` component
- Checks attacker is not already in conflict
- Creates and adds conflict component with agent_combat type
- Includes cause and lethality settings
- Returns success with combat details

### 3. Action Registration

Both actions are registered in the action handler switch in `LiveEntityAPI.handleAction()`:
- `case 'trigger-hunt': return this.handleTriggerHunt(action);`
- `case 'trigger-combat': return this.handleTriggerCombat(action);`

## How They Work

### Conflict Flow

1. **Dev action creates ConflictComponent** with state='initiated'
2. **HuntingSystem or AgentCombatSystem** picks up the conflict on next tick
3. **System processes conflict** through state machine:
   - Hunting: initiated → tracking → stalking → kill_success/failed/escape
   - Combat: initiated → fighting → resolved
4. **Events emitted** for narrative generation
5. **Outcomes applied** (injuries, loot, XP, social consequences)

### Example Usage

```bash
# Grant combat skill first (existing action)
curl -X POST http://localhost:8766/admin/actions/set-skill \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent-123", "skill": "combat", "level": 2}'

# Trigger hunt
curl -X POST http://localhost:8766/admin/actions/trigger-hunt \
  -H "Content-Type: application/json" \
  -d '{"agentId": "agent-123", "animalId": "deer-456"}'

# Trigger combat (honor duel)
curl -X POST http://localhost:8766/admin/actions/trigger-combat \
  -H "Content-Type: application/json" \
  -d '{"attackerId": "agent-123", "defenderId": "agent-789", "cause": "honor_duel", "lethal": false}'

# Trigger lethal combat
curl -X POST http://localhost:8766/admin/actions/trigger-combat \
  -H "Content-Type: application/json" \
  -d '{"attackerId": "agent-123", "defenderId": "agent-789", "cause": "revenge", "lethal": true}'
```

## Validation

### Error Handling

Both actions include comprehensive validation:
- ✓ Entity existence checks
- ✓ Type validation (agent vs animal)
- ✓ Component requirements (combat_stats)
- ✓ State validation (not already in conflict)
- ✓ Clear error messages for debugging

### Build Status

- ✓ `packages/core` builds successfully
- ✓ `packages/metrics` builds successfully
- ✓ No new TypeScript errors introduced
- Pre-existing errors in other packages (magic, reproduction) are unrelated

## Integration Points

### Systems Involved

1. **HuntingSystem** (`packages/core/src/systems/HuntingSystem.ts`)
   - Priority: 45
   - Processes `conflictType: 'hunting'`
   - State machine: tracking → stalking → outcome

2. **AgentCombatSystem** (`packages/core/src/systems/AgentCombatSystem.ts`)
   - Priority: 46
   - Processes `conflictType: 'agent_combat'`
   - Calculates power, rolls outcome, applies injuries

### Components Used

- **ConflictComponent** (`packages/core/src/components/ConflictComponent.ts`)
  - Unified component for all conflict types
  - Fields: conflictType, target, state, startTime, cause, lethal, etc.

- **CombatStatsComponent** (required for combat/hunting)
  - Contains combatSkill, weapon, armor stats

### Behaviors Referenced

- **InitiateHuntBehavior** (`packages/core/src/behavior/behaviors/InitiateHuntBehavior.ts`)
  - Shows how agents autonomously start hunts via LLM
  - Dev action bypasses LLM decision, directly creates conflict

- **InitiateCombatBehavior** (`packages/core/src/behavior/behaviors/InitiateCombatBehavior.ts`)
  - Shows how agents autonomously start combat via LLM
  - Dev action bypasses LLM decision, directly creates conflict

## Future Enhancements

Potential additions:
1. `grant-combat-stats` - Give an agent combat_stats component if missing
2. `list-huntable-animals` - Find nearby animals an agent could hunt
3. `simulate-combat-outcome` - Preview combat result without executing
4. `trigger-predator-attack` - Make a predator attack an agent
5. `trigger-dominance-challenge` - Make an agent challenge pack leader

## Testing Notes

To test these actions:

1. Start game: `cd custom_game_engine && ./start.sh`
2. Open browser: http://localhost:3000
3. Spawn agents with DevPanel
4. Use set-skill to grant combat/hunting skills
5. Find agent IDs and animal IDs via queries
6. Trigger conflicts via admin actions
7. Observe combat/hunting in real-time

## Files Modified

1. `/packages/core/src/admin/capabilities/agents.ts` (+35 lines)
   - Added trigger-hunt action definition
   - Added trigger-combat action definition with cause options

2. `/packages/metrics/src/LiveEntityAPI.ts` (+219 lines)
   - Added handleTriggerHunt method
   - Added handleTriggerCombat method
   - Registered both actions in switch statement

## Skills Already Available

The `set-skill` action already supports:
- ✓ combat
- ✓ hunting
- ✓ stealth
- ✓ animal_handling

So the full workflow is:
1. Grant skill: `set-skill` with combat/hunting
2. Trigger conflict: `trigger-hunt` or `trigger-combat`
3. Watch systems process the conflict automatically

## Notes

- Actions validate all inputs with clear error messages
- No changes to game logic - only dev tooling
- Actions delegate to existing conflict systems
- HMR-compatible - no server restart needed
- Actions appear in admin dashboard at http://localhost:8766/admin

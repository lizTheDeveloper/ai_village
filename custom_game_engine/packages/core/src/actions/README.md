# Actions System

Agent intent representation and world validation for game behaviors.

## Overview

Actions represent what agents *want* to do. The world validates and executes them. Separation of intent (agent) from validation (world) enables proper physics, resource conflicts, and skill-based duration modifiers.

## Base Interface

```typescript
interface Action {
  readonly id: string;
  readonly type: ActionType;           // 'till', 'craft', 'move', etc.
  readonly actorId: EntityId;
  readonly targetId?: EntityId;
  readonly targetPosition?: Position;
  readonly parameters: Record<string, unknown>;
  readonly priority: number;
  status: ActionStatus;                // 'pending' | 'executing' | 'completed' | 'failed'
  result?: ActionResult;
}

interface ActionHandler {
  getDuration(action: Action, world: World): number;
  validate(action: Action, world: World): ValidationResult;
  execute(action: Action, world: World): ActionResult;
  onInterrupt?(action: Action, world: World, reason: string): ActionEffect[];
}
```

## Action Types

**Movement:** `move`, `wander`, `navigate`, `explore_frontier`, `explore_spiral`, `follow_gradient`

**Resource:** `chop`, `mine`, `gather`, `forage`, `pickup`, `eat`

**Farming:** `till`, `water`, `fertilize`, `plant`, `harvest`, `gather_seeds`

**Building:** `build`, `construct`

**Crafting:** `craft` (requires `recipeId`)

**Social:** `talk`, `follow`, `help`

**Trading:** `trade` (buy/sell at shops)

**Other:** `idle`, `rest`, `set_personal_goal`

## Execution Flow

1. **Submit**: Agent submits action to `ActionQueue` (status: `pending`)
2. **Validate**: Handler checks preconditions (distance, resources, terrain)
3. **Execute**: Handler calculates duration (tool efficiency + skill bonuses), sets status: `executing`
4. **Progress**: ActionQueue decrements `remainingTicks` each tick
5. **Complete**: Handler applies effects, emits events (status: `completed` or `failed`)

Duration modifiers: Tool efficiency (hoe 100%, shovel 80%, hands 50%), skill bonuses (0-25% speed increase).

## Example Handler

```typescript
class TillActionHandler implements ActionHandler {
  type = 'till';

  getDuration(action: Action, world: World): number {
    const toolDuration = hasHoe ? 200 : hasShovel ? 250 : 400; // ticks at 20 TPS
    const skillBonus = getEfficiencyBonus(farmingLevel); // 0-25%
    return toolDuration * (1 - skillBonus / 100);
  }

  validate(action: Action, world: World): ValidationResult {
    // Check: targetPosition exists, actor adjacent (distance <= √2), tile exists
    // NO silent fallbacks - return {valid: false, reason: "..."} on failure
  }

  execute(action: Action, world: World): ActionResult {
    soilSystem.tillTile(world, tile, x, y); // Delegate to system
    return {success: true, effects: [], events: [{type: 'action:completed', ...}]};
  }
}
```

## LLM Integration

`parseAction()` converts LLM responses to typed actions (JSON or keyword matching). `actionToBehavior()` maps actions to behavior strings for backward compatibility with behavior queue system.

## Registration

```typescript
const registry = new ActionRegistry();
registry.register(new TillActionHandler(soilSystem));
const queue = new ActionQueue(registry, () => world.tick);
```

Handlers in `packages/core/src/actions/*ActionHandler.ts`. Actions are component-agnostic - systems own game logic.

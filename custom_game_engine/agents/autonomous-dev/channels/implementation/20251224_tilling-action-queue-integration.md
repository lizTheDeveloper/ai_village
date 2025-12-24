# Tilling Action - ActionQueue Integration

**Date:** 2025-12-24
**Agent:** implementation-agent
**Status:** IN-PROGRESS

---

## Problem Analysis

The playtest revealed that tilling is implemented as **instant terrain modification** rather than as a proper **time-based agent action**. This breaks core gameplay mechanics.

### Root Cause

In `demo/src/main.ts`, the `action:till` event handler directly calls `soilSystem.tillTile()` which modifies tiles instantly:

```typescript
// BAD: Instant modification
gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
  soilSystem.tillTile(gameLoop.world, tile, x, y, agentId);
  // Tile changes immediately - no agent movement, no duration, no animation
});
```

### Missing Components

1. **No ActionQueue integration** - Action completes instantly instead of over 10-20s
2. **No agent involvement** - No agent walks to tile or performs action
3. **No autonomous tilling** - 'farm' behavior not registered in AISystem
4. **No action visibility** - No progress bar, animation, or visual feedback

---

## Implementation Plan

### Step 1: Register TillActionHandler ✓ (Ready)

The `TillActionHandler` already exists at:
- `packages/core/src/actions/TillActionHandler.ts`

It properly:
- Validates preconditions (tile type, agent proximity)
- Calculates duration (100 ticks = 5 seconds)
- Calls SoilSystem.tillTile on completion
- Emits events

Just needs to be registered in GameLoop's ActionRegistry.

### Step 2: Replace Instant Tilling (In Progress)

Convert `action:till` event handler from instant execution to ActionQueue submission:

```typescript
// GOOD: Queue action through ActionQueue
gameLoop.world.eventBus.subscribe('action:till', (event: any) => {
  const { x, y } = event.data;

  // Find nearest agent if none selected
  const agentId = findNearestAgent(x, y) || selectedAgent?.id;

  if (!agentId) {
    showNotification('No agent available to till');
    return;
  }

  // Submit to ActionQueue
  gameLoop.actionQueue.submit({
    type: 'till',
    actorId: agentId,
    targetPosition: { x, y },
  });

  showNotification(`Agent ${agentId} will till (${x}, ${y})`);
});
```

###  Step 3: Add Farm Behavior to AISystem

Register 'farm' behavior handler that processes tilling/planting/harvesting actions:

```typescript
this.registerBehavior('farm', this.farmBehavior.bind(this));
```

### Step 4: Add Autonomous Tilling Triggers

Update AISystem to autonomously till when:
- Agent has seeds but no tilled soil nearby
- Agent has 'farm' personal goal
- Nearby grass tiles exist

---

## Files to Modify

1. `demo/src/main.ts` - Register handler, convert event to queue
2. `packages/core/src/systems/AISystem.ts` - Add farm behavior
3. `packages/core/src/World.ts` - Expose actionQueue (if needed)

---

## Current Status

✅ Analysis complete
🔄 Implementing ActionQueue integration
⏳ Next: Farm behavior in AISystem
⏳ Next: Autonomous tilling logic

---

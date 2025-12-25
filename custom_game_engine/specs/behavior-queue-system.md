# Behavior Queue System & Time Controls

## Overview
Implement a behavior queue system that allows agents to queue up behaviors like a playlist, and clean up keyboard controls for time speed.

## Part 1: Time Speed Keyboard Controls

### Current Issues
- Keys 1, 2, 3 conflict (used for both time-skip and speed control)
- Speed control modifies `dayLength` directly instead of using `speedMultiplier`
- Missing 4x and 8x speed shortcuts

### Required Changes

**Keyboard Mapping:**
- **1 key:** Set time speed to 1x (48s/day) - normal speed
- **2 key:** Set time speed to 2x (24s/day) - medium speed
- **3 key:** Set time speed to 4x (12s/day) - fast speed (Rimworld max)
- **4 key:** Set time speed to 8x (6s/day) - dev/testing speed

**Move time-skip to different keys:**
- **Shift+1:** Skip 1 hour
- **Shift+2:** Skip 1 day
- **Shift+3:** Skip 1 week

**Implementation:**
- Update `TimeComponent.speedMultiplier` field (already exists)
- Do NOT modify `dayLength` (should stay at base 48s)
- Show notification with current speed when changed
- Update any UI elements that display time speed

**Files to modify:**
- `demo/src/main.ts` - Update keyboard handler (around lines 1059-1124)

## Part 2: Behavior Queue System

### Requirements

Agents should be able to queue multiple behaviors to execute in sequence, like a playlist.

### Use Cases

1. **Player-directed sequences:**
   - "Gather wood, then build a house, then sleep"
   - "Plant 5 seeds, then water them, then rest"

2. **Agent planning:**
   - LLM agents could plan multi-step sequences
   - "I'm hungry but it's nighttime, so queue: sleep → wake → seek_food"

3. **Interruption handling:**
   - Critical needs (starvation) should interrupt queue
   - Return to queue after handling emergency

### Design

**BehaviorQueueComponent:**
```typescript
interface QueuedBehavior {
  behavior: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  priority: 'normal' | 'high' | 'critical'; // Can critical needs interrupt?
  repeats?: number; // How many times to repeat (undefined = once)
}

interface BehaviorQueueComponent {
  type: 'behavior_queue';
  queue: QueuedBehavior[];
  currentBehaviorIndex: number;
  paused: boolean; // Queue processing paused?
}
```

**AISystem Integration:**
- Check if agent has BehaviorQueueComponent
- If queue is not empty and not paused:
  - Execute behavior at currentBehaviorIndex
  - When behavior completes, advance to next
  - If queue empties, return to default behavior (wander)
- Critical needs (hunger < 10, energy < 10) can interrupt:
  - Pause queue, save current index
  - Handle critical need
  - Resume queue after

**API for adding behaviors:**
```typescript
// Helper functions
function queueBehavior(
  entity: Entity,
  behavior: AgentBehavior,
  state?: Record<string, unknown>,
  priority?: 'normal' | 'high' | 'critical'
): void;

function clearQueue(entity: Entity): void;

function pauseQueue(entity: Entity): void;

function resumeQueue(entity: Entity): void;
```

### Behavior Completion Detection

Each behavior needs a way to signal completion:
- `wander` - Never completes (runs forever)
- `seek_food` - Completes when hunger > 40
- `seek_sleep` - Completes when energy > 70
- `gather_resource` - Completes when inventory full or resource depleted
- `build` - Completes when building finished
- `deposit_items` - Completes when inventory empty
- `plant_seed` - Completes after planting
- `water_plant` - Completes after watering
- `harvest_plant` - Completes after harvesting
- `till_soil` - Completes after tilling
- `fertilize` - Completes after fertilizing

### Testing

Create test scenarios:
1. Queue 3 behaviors and verify they execute in order
2. Queue behavior while agent is busy - should queue, not override
3. Critical need interrupts queue, then resumes
4. Clear queue mid-execution
5. Queue with repeats (e.g., "plant 5 seeds")

## Implementation Plan

The Plan agent should create a step-by-step implementation plan covering:
1. Fixing keyboard controls for time speed (Part 1)
2. Creating BehaviorQueueComponent
3. Updating AISystem to process queues
4. Adding helper functions for queue management
5. Implementing behavior completion detection
6. Testing the system
7. Optional: UI for viewing/editing agent queues

## Success Criteria

- ✅ Time speed keys (1-4) work correctly without conflicts
- ✅ Agents can queue multiple behaviors
- ✅ Behaviors execute in sequence
- ✅ Critical needs can interrupt and resume
- ✅ Queue can be cleared/paused/resumed
- ✅ Behaviors signal completion appropriately

# Behavior Queue System - Implementation Plan

## Overview
This plan implements a behavior queue system for agents to execute multiple behaviors in sequence, plus fixes time speed keyboard controls.

## Part 1: Time Speed Keyboard Controls

### Issue Analysis
- **Conflict**: Keys 1, 2, 3 used for both time-skip AND speed control
- **Wrong Implementation**: Currently modifies `dayLength` instead of `speedMultiplier`
- **Missing Features**: No 4x or 8x speed shortcuts

### Implementation Steps

#### Step 1.1: Update Keyboard Handler in main.ts
**File**: `demo/src/main.ts`

**Lines to modify**: ~1058-1127 (keyboard handler section)

**Changes**:
1. **Remove conflicting code** (lines 1114-1127):
   - Delete the current key 1/2/5 speed control block that modifies `dayLength`

2. **Add Shift detection** to existing key handler:
   ```typescript
   // Check for Shift modifier
   const isShiftPressed = event.shiftKey;
   ```

3. **Update time-skip controls** (lines 1058-1112):
   - Change condition from `if (key === '1')` to `if (key === '1' && isShiftPressed)`
   - Change condition from `if (key === '2')` to `if (key === '2' && isShiftPressed)`
   - Change condition from `if (key === '3')` to `if (key === '3' && isShiftPressed)`
   - Update notifications to show "Shift+1", "Shift+2", "Shift+3"

4. **Add new speed controls** (after line 1112, before 'N' key handler):
   ```typescript
   // Speed controls (keys 1-4 without Shift)
   if (!isShiftPressed && (key === '1' || key === '2' || key === '3' || key === '4')) {
     if (timeComp) {
       const speedMap: Record<string, number> = {
         '1': 1,  // 48s/day (normal)
         '2': 2,  // 24s/day (medium)
         '3': 4,  // 12s/day (fast, Rimworld max)
         '4': 8,  // 6s/day (dev/testing)
       };

       const multiplier = speedMap[key];
       if (!multiplier) {
         throw new Error(`Invalid speed key: ${key}`);
       }

       // Update speedMultiplier (NOT dayLength)
       (timeComp as any).speedMultiplier = multiplier;

       // Update local tracking variable
       timeSpeedMultiplier = multiplier;

       console.log(`[DEBUG] Time speed set to ${multiplier}x (speedMultiplier: ${multiplier})`);
       showNotification(`⏱️ Time speed: ${multiplier}x`, '#00CED1');
     }
     return true;
   }
   ```

5. **Remove obsolete variable** (line 1018):
   - Delete `originalDayLength` variable (no longer needed)
   - Keep `timeSpeedMultiplier` for tracking current speed

#### Step 1.2: Verify TimeSystem Integration
**File**: `packages/core/src/systems/TimeSystem.ts`

**Verification** (no changes needed):
- Line 85-86: Confirms `speedMultiplier` is already used in calculations
- `const effectiveDayLength = time.dayLength / time.speedMultiplier;`
- System already properly handles speed multiplier

#### Step 1.3: Update UI Display (Optional)
**Files**:
- `packages/renderer/src/ui/SettingsPanel.ts` (if exists)
- OR add to HUD overlay in main.ts

**Implementation**:
- Display current speed multiplier in UI
- Show keyboard shortcuts hint: "1-4: Speed | Shift+1-3: Skip Time"

### Testing Strategy - Part 1

1. **Speed Control Tests**:
   - Press 1: Verify normal speed (1x), check console logs
   - Press 2: Verify medium speed (2x), time passes 2x faster
   - Press 3: Verify fast speed (4x), time passes 4x faster
   - Press 4: Verify dev speed (8x), time passes 8x faster
   - Verify notification displays correct speed

2. **Time-Skip Tests**:
   - Press Shift+1: Skip 1 hour, verify time advances
   - Press Shift+2: Skip 1 day, verify day counter increments
   - Press Shift+3: Skip 7 days, verify multiple day changes

3. **No Conflicts**:
   - Verify key 1 without Shift sets speed (not skip)
   - Verify Shift+1 skips time (not speed)
   - Verify all keys work independently

## Part 2: Behavior Queue System

### Design Decisions

#### Architecture Trade-offs

**Option A: Queue in AgentComponent** (CHOSEN)
- ✅ Simple, follows existing component pattern
- ✅ Easy to serialize/deserialize
- ✅ No new system needed
- ❌ Couples queue logic to component

**Option B: Separate BehaviorQueueComponent**
- ✅ Separation of concerns
- ✅ Optional feature (not all agents need queues)
- ❌ More complex, needs separate tracking
- ❌ Extra overhead for simple agents

**Decision**: Use **Option A** - extend AgentComponent with queue fields

#### Completion Detection Strategy

**Option A: Behavior Returns Completion Status**
- ❌ Requires changing all 15+ behavior signatures
- ❌ Breaking change to existing behaviors

**Option B: Behaviors Set Completion Flag** (CHOSEN)
- ✅ Minimal changes to existing behaviors
- ✅ Backward compatible
- ✅ Explicit completion signaling

**Decision**: Add `behaviorCompleted` flag to AgentComponent, behaviors set when done

### Implementation Steps

#### Step 2.1: Extend AgentComponent Type
**File**: `packages/core/src/components/AgentComponent.ts`

**Changes**:

1. **Add types** (after line 30):
```typescript
export interface QueuedBehavior {
  behavior: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  priority: 'normal' | 'high' | 'critical';
  repeats?: number; // undefined = once, 0 = infinite, N = repeat N times
  label?: string; // Optional human-readable label for debugging
}
```

2. **Extend AgentComponent interface** (add fields after line 51):
```typescript
  // NEW: Behavior queue fields
  behaviorQueue?: QueuedBehavior[];          // Queue of behaviors to execute
  currentQueueIndex?: number;                // Current position in queue
  queuePaused?: boolean;                     // Is queue processing paused?
  queueInterruptedBy?: AgentBehavior;        // What behavior interrupted the queue?
  behaviorCompleted?: boolean;               // Set by behaviors when they complete
```

3. **Update createAgentComponent** (no changes needed - optional fields default to undefined)

#### Step 2.2: Add Queue Helper Functions
**File**: `packages/core/src/components/AgentComponent.ts`

**Add** (at end of file, after line 69) - see full implementation in spec

Functions to add:
- `queueBehavior()` - Queue a behavior
- `clearBehaviorQueue()` - Clear queue
- `pauseBehaviorQueue()` - Pause queue
- `resumeBehaviorQueue()` - Resume queue
- `hasBehaviorQueue()` - Check if queue exists
- `getCurrentQueuedBehavior()` - Get current behavior
- `advanceBehaviorQueue()` - Move to next behavior

#### Step 2.3: Integrate Queue Processing into AISystem
**File**: `packages/core/src/systems/AISystem.ts`

Add queue processing logic in `update()` method to check for queued behaviors and advance through them.

#### Step 2.4: Update Behaviors to Signal Completion
**File**: `packages/core/src/systems/AISystem.ts`

Update behaviors to set `behaviorCompleted: true` when done:
- `seek_food` - When hunger > 40
- `seek_sleep` - When sleeping starts or energy > 70
- `gather` - When inventory full
- `deposit_items` - When inventory empty
- `till`, `farm`, etc. - After action completes

#### Step 2.5: Update Action Completion Handlers
**File**: `demo/src/main.ts`

Modify action completion listener to set `behaviorCompleted` for queueable actions.

#### Step 2.6: Add Entity-level Queue Management API
Create helper functions for queuing behaviors on entities from game code.

#### Step 2.7: Add Queue Visualization (Optional)
**File**: `packages/renderer/src/ui/AgentInfoPanel.ts`

Display agent's behavior queue in the UI panel.

## Implementation Order

### Phase 1: Time Controls (1-2 hours)
1. Update keyboard handler in main.ts
2. Test all speed controls
3. Test time-skip controls
4. Verify no conflicts

### Phase 2: Queue Foundation (2-3 hours)
1. Extend AgentComponent type
2. Add queue helper functions
3. Test helper functions
4. Add exports

### Phase 3: Queue Integration (3-4 hours)
1. Integrate queue processing
2. Update interruption logic
3. Test basic execution

### Phase 4: Completion Signaling (4-6 hours)
1. Update all behaviors
2. Update action handlers
3. Test completion

### Phase 5: Testing & Polish (2-3 hours)
1. Run test scenarios
2. Add visualization
3. Add debug commands
4. Playtest
5. Fix bugs

**Total Estimated Time**: 12-18 hours

## Success Criteria

### Part 1: Time Controls
- ✅ Keys 1-4 set speeds (1x, 2x, 4x, 8x)
- ✅ Shift+1-3 skip time
- ✅ No conflicts
- ✅ Proper notifications

### Part 2: Behavior Queue
- ✅ Queue multiple behaviors
- ✅ Execute in sequence
- ✅ Signal completion
- ✅ Advance on completion
- ✅ Critical interruption works
- ✅ Queue resumes after interruption
- ✅ Can clear queue
- ✅ Repeats work
- ✅ UI displays queue

## Risk Mitigation

1. **Behavior Never Completes**: Add 5min timeout
2. **Queue Gets Stuck**: Add debug command to inspect/advance
3. **Memory Leak**: Limit queue to 20 behaviors
4. **Breaking Changes**: Make `behaviorCompleted` optional

## Future Enhancements

1. Priority queue
2. Conditional behaviors
3. Parallel behaviors
4. Queue templates
5. LLM integration
6. Social queues

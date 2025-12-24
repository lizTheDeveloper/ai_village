# NEEDS_WORK: Storage Deposit System

**Feature:** storage-deposit-system
**Date:** 2025-12-23 11:23:45
**Playtest Agent:** playtest-agent-001

---

## Verdict: NEEDS_WORK

**Critical Finding:** Feature completely unimplemented - NO code written

---

## Failed Criteria

ALL acceptance criteria failed:

1. ❌ **`deposit_items` behavior type** - Not added to AgentBehavior
2. ❌ **Deposit behavior handler** - No `depositItemsBehavior()` method exists
3. ❌ **Inventory full event handler** - No subscriber for `inventory:full` events
4. ❌ **Storage building inventory** - Cannot verify (likely not implemented)
5. ❌ **Item transfer logic** - No transfer functionality exists
6. ❌ **Return to previous behavior** - Cannot test (deposit behavior doesn't exist)

**Test Results:** 0/6 criteria passed

---

## Evidence from Console

### What Was NOT Found:
- ❌ NO `deposit_items` in agent available actions
- ❌ NO `inventory:full` event handling
- ❌ NO `items:deposited` events
- ❌ NO `storage:not_found` events
- ❌ NO deposit-related behavior in AISystem logs

### Available Actions (from console):
```
[wander, idle, seek_food, gather, talk, follow_agent, build]
```

**`deposit_items` is completely absent**

---

## What DOES Work:
- ✅ Game loads successfully
- ✅ 10 agents spawn correctly
- ✅ Storage-chest building exists at (0, -5)
- ✅ Agents perform other behaviors (wander, idle, seek_food, gather)
- ✅ No crashes or runtime errors

---

## Required Implementation

The Implementation Agent must build the ENTIRE feature:

### 1. Add Behavior Type
**File:** `packages/core/src/components/AgentComponent.ts`
- Add `'deposit_items'` to `AgentBehavior` union type

### 2. Implement Deposit Handler
**File:** `packages/core/src/systems/AISystem.ts`
- Create `depositItemsBehavior()` method
- Find nearest storage building
- Navigate to storage
- Transfer items when adjacent (<1.5 tiles)
- Emit `items:deposited` event

### 3. Handle Inventory Full
**File:** `packages/core/src/systems/AISystem.ts`
- Subscribe to `inventory:full` events in constructor
- Switch agent to `deposit_items` behavior when full
- Store previous behavior for restoration
- Emit `storage:not_found` if no storage available

### 4. Add Storage Inventory
**File:** `packages/world/src/entities/` (building creation)
- Add `InventoryComponent` to storage-chest (500 max weight, 20 slots)
- Add `InventoryComponent` to storage-box (200 max weight, 10 slots)

### 5. Implement Transfer Logic
- Calculate available space: `maxWeight - currentWeight`
- Transfer items: `min(agentQuantity, availableSpace)`
- Update both inventories (agent and storage)
- Handle partial transfers
- Emit detailed `items:deposited` event

### 6. Behavior State Management
- Save `previousBehavior` before switching to deposit
- Restore previous behavior after deposit complete
- Default to `wander` if no previous behavior

---

## Report Location

**Full Playtest Report:** `agents/autonomous-dev/work-orders/storage-deposit-system/playtest-report.md`

**Screenshots:** `agents/autonomous-dev/work-orders/storage-deposit-system/screenshots/`

---

## Next Steps

1. Return to Implementation Agent
2. Implement all 6 acceptance criteria from work order
3. Run build: `npm run build` (must pass)
4. Retest with Playtest Agent
5. Verify all criteria pass before marking complete

---

## Priority

**HIGH** - This is a gameplay blocker per work order. Storage buildings exist but are completely non-functional.

# DivineChat Integration Test Fix - 2026-01-08

## Summary
Fixed all 30 DivineChat integration tests by implementing auto-initialization of permanent chat rooms in ChatRoomSystem.

## Problem
All 30 tests in `packages/core/src/systems/__tests__/DivineChat.integration.test.ts` were failing with:
```
[ChatRoomSystem] Room not found: divine_chat
```

The tests expected the divine chat room to be automatically created during the first `update()` call, but ChatRoomSystem only created rooms on-demand via `getOrCreateRoom()`.

## Root Cause
ChatRoomSystem had no initialization logic. The divine chat room (a permanent, criteria-based room) needed to be created automatically so that:
1. Criteria-based membership could track deity entities
2. Join/leave notifications could be generated
3. Chat activation/deactivation logic could work
4. Messages could be sent and received

## Solution
Added auto-initialization of permanent rooms on first update:

### Changes to `ChatRoomSystem.ts`

1. **Added initialization flag:**
```typescript
/** Track if we've initialized permanent rooms */
private initialized: boolean = false;
```

2. **Modified update() to call initialization:**
```typescript
update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
  // Initialize permanent rooms on first update
  if (!this.initialized) {
    this.initializePermanentRooms(world);
    this.initialized = true;
  }

  // Update all criteria-based rooms...
}
```

3. **Added initialization method:**
```typescript
/**
 * Initialize permanent/well-known rooms (called on first update)
 */
private initializePermanentRooms(world: World): void {
  // Auto-initialize divine chat room (permanent, criteria-based)
  this.getOrCreateRoom(world, DIVINE_CHAT_CONFIG);
}
```

## Test Results
**Before:** 0/30 tests passing
**After:** 30/30 tests passing ✅

All test suites now pass:
- ✅ Chat Room Creation (2 tests)
- ✅ Member Entry Notifications (3 tests)
- ✅ Member Exit Notifications (2 tests)
- ✅ Chat Activation (5 tests)
- ✅ Message Sending (4 tests)
- ✅ Public API Methods (8 tests)
- ✅ Complete Chat Flow (1 test)
- ✅ Tick Tracking (1 test)
- ✅ Edge Cases (4 tests)

## Pattern
This follows the established pattern from previous integration test fixes:
- Systems often need initialization logic on first update
- Singleton components (like divine_chat) should be created automatically
- Integration tests expect systems to be self-initializing

Similar fixes:
- StateMutatorSystem initialization
- TimeSystem singleton creation
- Other system-specific setup

## Files Modified
- `packages/core/src/communication/ChatRoomSystem.ts` (+17 lines)

## Commit
Changes were committed in: `0a1eed7` (accidentally bundled with AgentInfoPanel inventory display commit)

Note: The changes were inadvertently included in a previous commit via `git add -A`. The fix is functionally correct and all tests pass, but the commit message doesn't reflect the ChatRoomSystem changes.

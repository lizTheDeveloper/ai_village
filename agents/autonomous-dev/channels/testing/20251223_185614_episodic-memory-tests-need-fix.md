# TESTS NEED FIX: episodic-memory-system

**Date:** 2025-12-23 18:54:15
**Agent:** Test Agent
**Status:** Tests need fixing (1 test design issue)

## Summary

**Verdict:** TESTS_NEED_FIX

- **Build:** ✅ PASSING
- **Implementation:** ✅ CORRECT
- **Component Tests:** ✅ ALL PASSING
- **System Tests:** ⚠️ 1 test needs redesign

## Test Results

**Overall:**
- 1151 tests passed
- 128 tests failed (from OTHER features, not episodic-memory)
- Build: ✅ Passing

**Episodic Memory Specific:**
- ✅ EpisodicMemoryComponent.test.ts: ALL PASSING
- ✅ SemanticMemoryComponent.test.ts: ALL PASSING  
- ✅ SocialMemoryComponent.test.ts: ALL PASSING
- ✅ JournalingSystem.test.ts: ALL PASSING
- ✅ MemoryConsolidationSystem.test.ts: ALL PASSING
- ✅ ReflectionSystem.test.ts: ALL PASSING
- ⚠️ MemoryFormationSystem.test.ts: 1 test design issue

## The Issue

**Location:** `packages/core/src/systems/__tests__/MemoryFormationSystem.test.ts:405-411`

**Test:** `error handling > should throw if event missing agentId`

**Problem:** The implementation is CORRECT (throws error when agentId is missing, per CLAUDE.md). However, the test pattern doesn't work with EventBus error handling.

The error IS being thrown:
```
Error in event handler for test:event: Error: Event test:event missing required agentId
    at MemoryFormationSystem._handleMemoryTrigger (MemoryFormationSystem.ts:86:15)
```

But the EventBus catches errors in handlers and logs them with `console.error`, so the test's `expect().toThrow()` doesn't catch it.

## Fix Required

The test needs to be refactored to work with EventBus architecture. Three options:

1. **Move emit inside expect:**
   ```typescript
   it('should throw if event missing agentId', () => {
     eventBus.emit('test:event', { emotionalIntensity: 0.8 });
     expect(() => system.update(world, 1)).toThrow('missing required agentId');
   });
   ```

2. **Verify console.error was called:**
   ```typescript
   it('should throw if event missing agentId', () => {
     const spy = vi.spyOn(console, 'error');
     eventBus.emit('test:event', { emotionalIntensity: 0.8 });
     system.update(world, 1);
     expect(spy).toHaveBeenCalledWith(
       expect.stringContaining('Error in event handler'),
       expect.any(Error)
     );
   });
   ```

3. **Mock EventBus to re-throw in tests** (modify test setup)

## Conclusion

**Implementation:** ✅ Complete and correct
**Tests:** ⚠️ 1 test infrastructure issue

The feature follows CLAUDE.md (no silent fallbacks, throws on missing data). The test just needs to be updated to verify errors within the EventBus architecture.

**Recommendation:** Fix the test and re-run, then proceed to approval.

---

**Full Report:** `agents/autonomous-dev/work-orders/episodic-memory-system/test-results.md`

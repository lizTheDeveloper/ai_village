# BUG-005: Talk Behavior Not Starting Conversations

**Created:** 2025-12-28
**Status:** FIXED
**Priority:** HIGH
**Fixed In:** LLMDecisionProcessor.ts

---

## Summary

Agents choosing "talk" actions were not actually starting conversations because `behaviorState.partnerId` was not being set when the LLM responded with a simple string action.

## Root Cause

In `LLMDecisionProcessor.processDecision()` (line ~599), when the LLM responds with a simple string action like `{ action: "talk" }`, the code only set the behavior without populating behaviorState:

```typescript
// Simple string action
else if (typeof action === 'string') {
  behavior = action as AgentBehavior;
  // behaviorState stayed empty {}!
}
```

But `TalkBehavior.execute()` at line 61 requires `agent?.behaviorState?.partnerId` to be set before it will start a conversation:

```typescript
if (conversation && !isInConversation(conversation) && agent?.behaviorState?.partnerId) {
```

Without `partnerId`, TalkBehavior would immediately fall through to line 167-170 which checks `!isInConversation(activeConversation)` and switches to wander.

## Fix Applied

Updated `LLMDecisionProcessor.processDecision()` to set default behaviorState for behaviors that require parameters:

```typescript
// Simple string action - apply default behaviorState for behaviors that need it
else if (typeof action === 'string') {
  behavior = action as AgentBehavior;
  // Set default behaviorState for behaviors that require parameters
  if (behavior === 'talk') {
    behaviorState.partnerId = 'nearest';
  } else if (behavior === 'gather' || behavior === 'pick') {
    behaviorState.resourceType = 'wood';
  }
}
```

## Files Changed

- `packages/core/src/decision/LLMDecisionProcessor.ts:598-607`

## Verification

After fix:
- Build passes
- Simple string "talk" actions now have `behaviorState.partnerId = 'nearest'`
- TalkBehavior will resolve 'nearest' to actual agent ID and start conversation
- `conversation:started` events should now be emitted

## Related Issues

- This is a sub-issue of BUG-001 (LLM Decision Parsing Failures) - may explain some of the 78% failure rate
- Related to BUG-003 (Agents Stuck Idle) - agents switching to 'talk' but not doing anything contributes to idle time

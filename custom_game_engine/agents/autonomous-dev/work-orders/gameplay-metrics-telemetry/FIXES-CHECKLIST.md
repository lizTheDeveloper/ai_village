# Fixes Checklist - Review Agent Report 2025-12-27 03:19

## Status: NEEDS_FIXES
**12 Critical Issues Identified**

---

# Critical Fixes Required (BLOCKING) - Gameplay Metrics Telemetry

**Date:** 2025-12-27
**Status:** ❌ NOT STARTED

---

## How to Use This Checklist

1. For each issue below, apply the fix
2. Mark the checkbox when complete: `- [ ]` → `- [x]`
3. Run the verification command to confirm
4. When ALL items checked, run final verification
5. Update `review-report.md` with "Fixes Applied" section

---

## Issue 1: Type Safety - AgentStats

- [ ] **Define AgentStats interface** in `packages/core/src/metrics/types.ts`

```typescript
export interface AgentStats {
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  intelligence?: number;
}
```

- [ ] **Add validation function**

```typescript
function validateAgentStats(data: unknown): AgentStats {
  if (!data || typeof data !== 'object') {
    throw new Error('AgentStats must be an object');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.health !== 'number' ||
      typeof obj.hunger !== 'number' ||
      typeof obj.thirst !== 'number' ||
      typeof obj.energy !== 'number') {
    throw new Error('AgentStats missing required number fields');
  }
  return {
    health: obj.health,
    hunger: obj.hunger,
    thirst: obj.thirst,
    energy: obj.energy,
    intelligence: typeof obj.intelligence === 'number' ? obj.intelligence : undefined,
  };
}
```

- [ ] **Fix MetricsCollector.ts:347** - Replace `as any` with validation

```typescript
// OLD:
initialStats: event.initialStats as any,

// NEW:
initialStats: validateAgentStats(event.initialStats),
```

- [ ] **Fix MetricsCollector.ts:432** - Replace `as any` with validation

```typescript
// OLD:
metrics.finalStats = event.finalStats as any;

// NEW:
metrics.finalStats = validateAgentStats(event.finalStats);
```

**Verify:**
```bash
grep -n "initialStats.*as any\|finalStats.*as any" packages/core/src/metrics/MetricsCollector.ts
# Should return NOTHING
```

---

## Issue 2: Type Safety - CauseOfDeath

- [ ] **Define CauseOfDeath type** in `packages/core/src/metrics/types.ts`

```typescript
export type CauseOfDeath =
  | 'hunger' | 'thirst' | 'hypothermia' | 'heatstroke'
  | 'old_age' | 'injury' | 'illness' | 'attacked' | 'accident' | 'starvation';

const VALID_CAUSES: CauseOfDeath[] = [
  'hunger', 'thirst', 'hypothermia', 'heatstroke',
  'old_age', 'injury', 'illness', 'attacked', 'accident', 'starvation'
];

export function validateCauseOfDeath(value: unknown): CauseOfDeath {
  if (typeof value !== 'string' || !VALID_CAUSES.includes(value as CauseOfDeath)) {
    throw new Error(`Invalid cause of death: ${value}. Valid: ${VALID_CAUSES.join(', ')}`);
  }
  return value as CauseOfDeath;
}
```

- [ ] **Fix MetricsCollector.ts:430** - Replace `as any` with validation

```typescript
// OLD:
metrics.causeOfDeath = event.causeOfDeath as any;

// NEW:
metrics.causeOfDeath = validateCauseOfDeath(event.causeOfDeath);
```

**Verify:**
```bash
grep -n "causeOfDeath.*as any" packages/core/src/metrics/MetricsCollector.ts
# Should return NOTHING
```

---

## Issue 3: Type Safety - GameEndReason

- [ ] **Define GameEndReason type** in `packages/core/src/metrics/types.ts`

```typescript
export type GameEndReason = 'manual_quit' | 'extinction' | 'victory_condition' | 'crash';

const VALID_END_REASONS: GameEndReason[] = [
  'manual_quit', 'extinction', 'victory_condition', 'crash'
];

export function validateGameEndReason(value: unknown): GameEndReason {
  if (typeof value !== 'string' || !VALID_END_REASONS.includes(value as GameEndReason)) {
    throw new Error(`Invalid game end reason: ${value}. Valid: ${VALID_END_REASONS.join(', ')}`);
  }
  return value as GameEndReason;
}
```

- [ ] **Fix MetricsCollector.ts:827** - Replace `as any` with validation

```typescript
// OLD:
this.sessionMetrics.gameEndReason = event.reason as any;

// NEW:
this.sessionMetrics.gameEndReason = validateGameEndReason(event.reason);
```

**Verify:**
```bash
grep -n "gameEndReason.*as any" packages/core/src/metrics/MetricsCollector.ts
# Should return NOTHING
```

---

## Issue 4: Type Safety - Dynamic Properties

- [ ] **Add field to MetricsCollector class**

```typescript
// Add after other private fields in MetricsCollector
private activityStartTimes = new Map<string, Map<string, number>>();
```

- [ ] **Fix MetricsCollector.ts:697-706** - Replace dynamic properties

```typescript
// OLD:
(metrics as any)[`_${activity}_start`] = timestamp;
const startTime = (metrics as any)[`_${activity}_start`];
delete (metrics as any)[`_${activity}_start`];

// NEW:
// In activity:started handler
if (!this.activityStartTimes.has(agentId)) {
  this.activityStartTimes.set(agentId, new Map());
}
this.activityStartTimes.get(agentId)!.set(activity, timestamp);

// In activity:ended handler
const agentActivities = this.activityStartTimes.get(agentId);
const startTime = agentActivities?.get(activity);
if (startTime !== undefined) {
  const duration = timestamp - startTime;
  // ... rest of logic
  agentActivities!.delete(activity);
}
```

**Verify:**
```bash
grep -n "(metrics as any)\[" packages/core/src/metrics/MetricsCollector.ts
# Should return NOTHING
```

---

## Issue 5: Error Handling - Silent Fallback for Amount

- [ ] **Fix MetricsCollectionSystem.ts:50** - Add validation

```typescript
// OLD:
amount: data.amount ?? 1,

// NEW:
if (data.amount === undefined || data.amount === null) {
  throw new Error('agent:ate event missing required amount field');
}
amount: data.amount,
```

**Verify:**
```bash
grep -n "amount.*?? 1" packages/core/src/systems/MetricsCollectionSystem.ts
# Should return NOTHING
```

---

## Issue 6: Error Handling - Silent Fallbacks for Needs

- [ ] **Fix MetricsCollectionSystem.ts:361-365** - Add validation

```typescript
// OLD:
{
  hunger: needs.hunger ?? 50,
  thirst: needs.thirst ?? 50,
  energy: needs.energy ?? 50,
  temperature: 20,
  health: needs.health ?? 100,
}

// NEW:
if (needs.hunger === undefined || needs.thirst === undefined ||
    needs.energy === undefined || needs.health === undefined) {
  throw new Error(
    `Agent ${agent.id} needs component missing required fields: ` +
    `hunger=${needs.hunger}, thirst=${needs.thirst}, ` +
    `energy=${needs.energy}, health=${needs.health}`
  );
}
{
  hunger: needs.hunger,
  thirst: needs.thirst,
  energy: needs.energy,
  temperature: needs.temperature ?? 20, // OK - temperature is truly optional
  health: needs.health,
}
```

**Verify:**
```bash
grep -n "hunger.*?? [0-9]\|thirst.*?? [0-9]\|energy.*?? [0-9]\|health.*?? 100" packages/core/src/systems/MetricsCollectionSystem.ts
# Should return NOTHING (temperature ?? 20 is OK)
```

---

## Issue 7: Error Handling - Bare Catch in Event Recording

- [ ] **Fix MetricsCollectionSystem.ts:323-329** - Check error type

```typescript
// OLD:
try {
  this.collector.recordEvent(event as { type: string; [key: string]: unknown });
} catch {
  console.debug(`MetricsCollection: Unhandled event type ${event.type}`);
}

// NEW:
try {
  this.collector.recordEvent(event);
} catch (error) {
  if (error instanceof Error && error.message.startsWith('Unknown event type:')) {
    // Expected - new event type we haven't added support for yet
    console.debug(`MetricsCollection: Unhandled event type ${event.type}`);
  } else {
    // Unexpected error - log and re-throw
    console.error('Metrics collection failed:', error);
    throw error;
  }
}
```

**Verify:**
```bash
grep -n "} catch {" packages/core/src/systems/MetricsCollectionSystem.ts | grep -n "323"
# Should return NOTHING
```

---

## Issue 8: Error Handling - Bare Catch in Sampling

- [ ] **Fix MetricsCollectionSystem.ts:357-372** - Check error type

```typescript
// OLD:
try {
  this.collector.sampleMetrics(agent.id, {...}, Date.now());
} catch {
  // Agent might not be in lifecycle yet
}

// NEW:
try {
  this.collector.sampleMetrics(agent.id, {...}, Date.now());
} catch (error) {
  if (error instanceof Error &&
      error.message.includes('Cannot sample metrics for non-existent agent')) {
    // Expected - agent just created, not yet tracked in lifecycle
    continue;
  }
  // Unexpected error - log it
  console.error(`Failed to sample metrics for agent ${agent.id}:`, error);
  // Don't re-throw - metrics shouldn't crash the game
}
```

**Verify:**
```bash
grep -n "} catch {" packages/core/src/systems/MetricsCollectionSystem.ts | grep -n "369"
# Should return NOTHING
```

---

## Issue 9: Error Handling - Bare Catches in Analysis

- [ ] **Fix MetricsAnalysis.ts lines 110-157** - Add logging to all bare catches

Find each instance of:
```typescript
} catch (e) {
  // Ignore errors for missing data
}
```

Replace with:
```typescript
} catch (error) {
  // Log for debugging but don't crash - insights are best-effort
  console.debug('Could not detect [insight name]:', error);
}
```

**Verify:**
```bash
grep -n "} catch (e) {" packages/core/src/metrics/MetricsAnalysis.ts
# Should return NOTHING (or only ones with console.debug after)
```

---

## Issue 10: Type Safety - Component Access

- [ ] **Fix MetricsCollectionSystem.ts:355** - Add type import and validation

```typescript
// At top of file:
import type { NeedsComponent } from '../components/NeedsComponent.js';

// In takeSnapshot method:
// OLD:
const needs = agent.components.get('needs') as any;

// NEW:
const needsComponent = agent.components.get('needs');
if (!needsComponent) {
  console.warn(`Agent ${agent.id} missing needs component despite query match`);
  continue;
}
const needs = needsComponent as unknown as NeedsComponent;

// Validate required fields exist
if (typeof needs.hunger !== 'number' ||
    typeof needs.thirst !== 'number' ||
    typeof needs.energy !== 'number' ||
    typeof needs.health !== 'number') {
  throw new Error(
    `Agent ${agent.id} has corrupted needs component. ` +
    `Expected number fields but got: ` +
    `hunger=${typeof needs.hunger}, thirst=${typeof needs.thirst}, ` +
    `energy=${typeof needs.energy}, health=${typeof needs.health}`
  );
}
```

**Verify:**
```bash
grep -n "as any" packages/core/src/systems/MetricsCollectionSystem.ts
# Should return NOTHING
```

---

## Final Verification

After completing ALL fixes above, run:

```bash
# Should ALL return NOTHING:
echo "=== Checking as any ==="
grep -n "as any" packages/core/src/metrics/MetricsCollector.ts
grep -n "as any" packages/core/src/systems/MetricsCollectionSystem.ts

echo "=== Checking silent fallbacks ==="
grep -n "hunger.*?? [0-9]\|thirst.*?? [0-9]\|energy.*?? [0-9]\|health.*?? 100\|amount.*?? 1" packages/core/src/systems/MetricsCollectionSystem.ts

echo "=== Checking bare catches ==="
grep -n "} catch {" packages/core/src/systems/MetricsCollectionSystem.ts
grep -n "} catch (e) {$" packages/core/src/metrics/MetricsAnalysis.ts

echo "=== Build ==="
npm run build

echo "=== Tests ==="
npm test packages/core/src/__tests__/Metrics*.test.ts
```

---

## When All Done

- [ ] **Update review-report.md** - Add "Fixes Applied" section at top
- [ ] **Document what changed** - List each file and line numbers modified
- [ ] **Request re-review** - Notify Review Agent

**Template for Fixes Applied section:**

```markdown
## Fixes Applied - 2025-12-27

All 8 critical issues from the review have been fixed:

### Files Modified
- `packages/core/src/metrics/types.ts` - Added validation functions and types
- `packages/core/src/metrics/MetricsCollector.ts` - Lines 347, 430, 432, 697-706, 827
- `packages/core/src/systems/MetricsCollectionSystem.ts` - Lines 50, 323-329, 355, 361-365, 369-372
- `packages/core/src/metrics/MetricsAnalysis.ts` - Lines 110-157 (5 instances)

### Verification Results
[paste output of verification commands]

### Build & Test Status
✅ Build: PASSING
✅ Tests: 187/187 PASSING

Ready for re-review.
```

---

**Current Status:** ❌ NOT STARTED

**Next Action:** Implementation Agent to work through this checklist

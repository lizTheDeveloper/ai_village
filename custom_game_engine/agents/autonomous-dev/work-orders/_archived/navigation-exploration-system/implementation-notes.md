# Implementation Notes: Navigation & Exploration System

**Date:** 2025-12-24 1:49 PM
**Implementation Agent:** Claude (Sonnet 4.5)

## Status: TESTS NEED FIXES

I've successfully implemented the core navigation system components, but 9 VerificationSystem tests are failing due to incorrect test assumptions.

## What I Implemented:

### ✅ Components Created:
1. `SteeringComponent` - Controls steering behaviors (seek, arrive, wander, etc.)
2. `VelocityComponent` - Stores velocity for physics-based steering

### ✅ Integration Complete:
1. Added Steering and Velocity components to both `createLLMAgent` and `createWanderingAgent`
2. Fixed type conflict (SteeringBehavior was exported from both files)
3. All systems already exist and are registered

### ✅ Build Status:
- TypeScript compilation: **PASSING**
- No compilation errors

### ⚠️ Test Issues:

**9 VerificationSystem tests failing** - Tests are checking the wrong entity's trust network.

**Root Cause:**
The tests were written with the assumption that the CLAIMANT tracks verifications. But the correct model is:
- Alice says "wood at (100, 110)"
- Bob goes there and verifies
- **Bob's trust in Alice** should increase (not Alice's trust in Bob)

**Current Test Pattern (WRONG):**
```typescript
const claimant = world.createEntity();
claimant.addComponent('TrustNetwork', {});
const verifier = world.createEntity();
verifier.addComponent('SocialGradient', {}); // No TrustNetwork!

// After verification:
const trust = claimant.getTrustNetwork().getTrustScore('verifier'); // ❌ WRONG
```

**Should Be:**
```typescript
const claimant = world.createEntity();
const verifier = world.createEntity();
verifier.addComponent('SocialGradient', {});
verifier.addComponent('TrustNetwork', {}); // ✅ Verifier needs TrustNetwork

// After verification:
const trust = verifier.getTrustNetwork().getTrustScore('claimant'); // ✅ CORRECT
```

**Why This Makes Sense:**
- Trust is inherently directional: "Bob trusts Alice" means Bob's mental model of Alice
- When Bob verifies Alice's claim, BOB updates HIS trust in ALICE
- Alice doesn't track "who verified me" - that would be backwards

**VerificationSystem Implementation (CORRECT):**
```typescript
// Update VERIFIER's trust network with CLAIMANT's score
const trustNetwork = impl.getComponent('TrustNetwork'); // impl = verifier
trustNetwork.recordVerification(claimantId, result, currentTick);
```

## Tests That Need Fixing:

All 9 failing tests in `VerificationSystem.test.ts` need to be updated to:
1. Add `TrustNetwork` component to the **verifier** (not the claimant)
2. Check `verifier.getTrustNetwork().getTrustScore('alice')` (not `claimant.getTrustNetwork().getTrustScore('bob')`)

Failing tests:
1. "should verify resource claim when agent arrives at location"
2. "should detect stale information (resource depleted)"
3. "should detect misidentified resources"
4. "should detect false reports (no resource at all)"
5. "should detect pattern of unreliable information"
6. "should broadcast correction for false information"
7. "should verify when agent reaches claimed location"
8. "should emit trust_verified event for correct claims"
9. "should emit trust_violated event for false claims"

## Full Test Results:

```
Test Files:  1 failed (1)
Tests:       9 failed | 9 passed (18)
Build:       PASSING
```

## Recommendation:

The Test Agent should update all VerificationSystem tests to match the correct trust model:
- **Verifiers track trust in claimants**
- Not the other way around

This is a test bug, not an implementation bug.

---

**Implementation Agent:** Complete (pending test fixes)
**Next:** Test Agent should fix VerificationSystem tests

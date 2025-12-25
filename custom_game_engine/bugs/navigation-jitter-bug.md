# Bug Report: Navigation Jittering/Oscillation

**Severity:** Medium
**Component:** SteeringSystem
**File:** `packages/core/src/systems/SteeringSystem.ts`
**Reported:** 2025-12-24

---

## Description

Agents using the `arrive` steering behavior exhibit jittering/oscillation when approaching their target. They get stuck in a loop of moving back and forth over the target position instead of smoothly stopping.

---

## Root Cause

The `_arrive` method (lines 152-188 in SteeringSystem.ts) has a flawed stopping mechanism:

```typescript
if (distance < arrivalTolerance) {
  // Stop
  return { x: -velocity.vx, y: -velocity.vy };
}
```

### Why This Causes Jittering:

1. Agent approaches target with velocity (vx, vy)
2. Gets within `arrivalTolerance` (default 1.0 tile)
3. System returns negated velocity as steering force: `(-vx, -vy)`
4. Force is applied with deltaTime: `velocity += force * deltaTime`
5. **Problem:** This doesn't perfectly cancel momentum in one frame
6. Agent overshoots slightly, ending up at distance ~1.1 tiles
7. Now `distance > arrivalTolerance` again
8. System switches to seeking the target
9. Agent accelerates back toward target
10. Crosses threshold again
11. **Loop repeats**, creating visible jittering

### Additional Issues:

- No damping when very close to target
- No "dead zone" to prevent micro-adjustments
- Velocity isn't zeroed when essentially at target
- Force application doesn't account for frame-rate variations

---

## Reproduction Steps

1. Start game with navigation system enabled
2. Have an agent use `navigate` behavior to move to a specific (x, y)
3. Observe agent as it approaches target
4. **Expected:** Agent smoothly decelerates and stops at target
5. **Actual:** Agent jitters back and forth, oscillating around target position

---

## Proposed Fix

Replace the current stopping logic with a more robust approach:

```typescript
private _arrive(position: any, velocity: any, steering: any): Vector2 {
  if (!steering.target) {
    throw new Error('Arrive behavior requires target position');
  }

  const desired = {
    x: steering.target.x - position.x,
    y: steering.target.y - position.y,
  };

  const distance = Math.sqrt(desired.x * desired.x + desired.y * desired.y);

  // FIX 1: Add dead zone to prevent micro-adjustments
  const deadZone = steering.deadZone ?? 0.5;
  if (distance < deadZone) {
    // Within dead zone - zero velocity completely
    return { x: -velocity.vx * 10, y: -velocity.vy * 10 }; // Strong braking
  }

  // FIX 2: Check if already stopped and within tolerance
  const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);
  const arrivalTolerance = steering.arrivalTolerance ?? 1.0;

  if (distance < arrivalTolerance && speed < 0.1) {
    // Already stopped and close enough - done
    return { x: -velocity.vx, y: -velocity.vy };
  }

  // FIX 3: Apply damping when very close to prevent oscillation
  const slowingRadius = steering.slowingRadius ?? 5.0;
  let targetSpeed = steering.maxSpeed;

  if (distance < slowingRadius) {
    // Quadratic slow-down for smoother deceleration
    const slowFactor = (distance / slowingRadius);
    targetSpeed = steering.maxSpeed * slowFactor * slowFactor; // Quadratic

    // FIX 4: Extra damping when very close
    if (distance < arrivalTolerance * 2) {
      targetSpeed *= 0.5; // Additional brake
    }
  }

  // Normalize and scale
  desired.x = (desired.x / distance) * targetSpeed;
  desired.y = (desired.y / distance) * targetSpeed;

  return {
    x: desired.x - velocity.vx,
    y: desired.y - velocity.vy,
  };
}
```

### Key Improvements:

1. **Dead Zone (0.5 tiles):** Stop making adjustments when very close
2. **Velocity Check:** Only stop if both close AND moving slowly
3. **Quadratic Deceleration:** Smoother slow-down curve
4. **Extra Damping:** Additional brake when within 2x arrivalTolerance
5. **Strong Braking:** 10x force multiplier in dead zone to ensure stop

---

## Impact

**Who is affected:**
- Any agent using `navigate` behavior
- Any code using `arrive` steering mode
- Exploration behaviors that navigate to specific points

**Severity:**
- **Medium**: Feature works but looks unpolished
- Not game-breaking but visually distracting
- May cause agents to waste energy oscillating
- Could interfere with precise positioning requirements

---

## Testing Recommendations

After fix is implemented, verify:

1. ✅ Agent approaches target smoothly
2. ✅ Agent decelerates gradually (not abrupt stop)
3. ✅ Agent stops within arrivalTolerance without oscillation
4. ✅ No jittering when agent reaches destination
5. ✅ Works at different frame rates (test with slow/fast deltaTime)
6. ✅ Works with different maxSpeed values
7. ✅ Works with different target distances

---

## Related Code

**File:** `packages/core/src/systems/SteeringSystem.ts`
- Line 152-188: `_arrive()` method
- Line 106-119: Force application logic
- Line 166: Current arrivalTolerance check (broken)
- Line 169: Current stop logic (causes jitter)

**Behaviors affected:**
- `navigate` (uses arrive internally)
- `explore_frontier` (may use arrive when reaching frontier)
- `explore_spiral` (may use arrive at waypoints)

---

## Additional Notes

This is a classic problem in steering behaviors known as "target overshoot oscillation". The standard fix in game AI literature (Reynolds 1999, "Steering Behaviors for Autonomous Characters") involves:
- Dead zones
- Velocity-based stopping
- Damping factors
- Non-linear deceleration curves

Our current implementation uses linear deceleration which is mathematically prone to this issue.

---

**Priority:** Medium
**Assignee:** Implementation Agent
**Labels:** `bug`, `navigation`, `steering`, `polish`

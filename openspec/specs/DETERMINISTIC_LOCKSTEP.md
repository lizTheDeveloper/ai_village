# Deterministic Simulation & Lockstep Specification

**Status**: Draft
**Created**: 2026-01-22
**Priority**: High
**Inspiration**: Factorio, RTS games (Age of Empires, StarCraft)
**System**: Core ECS (`packages/core/src/ecs/`)

## Problem Statement

Current simulation uses floating-point arithmetic which introduces platform-dependent rounding errors:
- Different results on different CPUs/browsers
- Cannot replay simulations deterministically
- Cannot sync multiplayer via lockstep (would desync)
- Save/load may produce different trajectories

**Factorio's approach**: Uses fixed-point math for ALL game logic. Replays are byte-identical. Multiplayer only syncs player inputs, not world state.

## Benefits

1. **Lockstep Multiplayer**: Sync only player inputs, not entire world state
2. **Deterministic Replays**: Record inputs, replay produces identical simulation
3. **Save Compression**: Store only inputs since last checkpoint
4. **Testing**: Reproducible bugs, deterministic test cases
5. **Time Travel**: Jump to any point by replaying from checkpoint

## Design Philosophy

**Separate deterministic simulation from presentation**:
- Game logic: Fixed-point integers, deterministic
- Rendering: Floating-point interpolation, visual-only

## Solution Architecture

### Phase 1: Fixed-Point Math Library

Create `packages/core/src/math/FixedPoint.ts`:

```typescript
/**
 * 16.16 fixed-point number (32-bit integer)
 * - 16 bits integer part: -32768 to 32767
 * - 16 bits fractional part: precision of 1/65536 (~0.000015)
 */
export class Fixed {
  private static readonly SHIFT = 16;
  private static readonly SCALE = 1 << 16; // 65536

  readonly raw: number; // Stored as integer

  static fromFloat(f: number): Fixed {
    return new Fixed(Math.round(f * Fixed.SCALE));
  }

  static fromInt(i: number): Fixed {
    return new Fixed(i << Fixed.SHIFT);
  }

  toFloat(): number {
    return this.raw / Fixed.SCALE;
  }

  add(other: Fixed): Fixed {
    return new Fixed(this.raw + other.raw);
  }

  sub(other: Fixed): Fixed {
    return new Fixed(this.raw - other.raw);
  }

  mul(other: Fixed): Fixed {
    // Use BigInt for intermediate to avoid overflow
    const result = (BigInt(this.raw) * BigInt(other.raw)) >> BigInt(Fixed.SHIFT);
    return new Fixed(Number(result));
  }

  div(other: Fixed): Fixed {
    const result = (BigInt(this.raw) << BigInt(Fixed.SHIFT)) / BigInt(other.raw);
    return new Fixed(Number(result));
  }

  // Deterministic sqrt using Newton-Raphson
  sqrt(): Fixed { ... }

  // Lookup table for sin/cos (deterministic)
  static sin(angle: Fixed): Fixed { ... }
  static cos(angle: Fixed): Fixed { ... }
}

export class FixedVec2 {
  constructor(public x: Fixed, public y: Fixed) {}

  add(other: FixedVec2): FixedVec2 { ... }
  sub(other: FixedVec2): FixedVec2 { ... }
  length(): Fixed { ... }
  normalize(): FixedVec2 { ... }
  distanceTo(other: FixedVec2): Fixed { ... }
}
```

### Phase 2: Deterministic RNG

Create `packages/core/src/math/DeterministicRandom.ts`:

```typescript
/**
 * Xorshift128+ PRNG - fast, deterministic, good distribution
 * Same seed = same sequence on all platforms
 */
export class DeterministicRandom {
  private state: [bigint, bigint];

  constructor(seed: number) {
    // Initialize state from seed deterministically
    this.state = [BigInt(seed), BigInt(seed ^ 0x12345678)];
  }

  /** Returns 0 to 1 as Fixed */
  next(): Fixed {
    // Xorshift128+ algorithm
    let s1 = this.state[0];
    const s0 = this.state[1];
    this.state[0] = s0;
    s1 ^= s1 << 23n;
    this.state[1] = s1 ^ s0 ^ (s1 >> 18n) ^ (s0 >> 5n);
    const raw = Number((this.state[1] + s0) & 0xFFFFn); // 16-bit result
    return new Fixed(raw); // Already in fixed-point range
  }

  /** Returns integer in range [min, max] */
  range(min: number, max: number): number {
    const scale = max - min + 1;
    return min + Math.floor(this.next().toFloat() * scale);
  }

  /** Save/restore state for checkpoints */
  getState(): [string, string] {
    return [this.state[0].toString(), this.state[1].toString()];
  }

  setState(state: [string, string]): void {
    this.state = [BigInt(state[0]), BigInt(state[1])];
  }
}
```

### Phase 3: World Tick Determinism

Modify `packages/core/src/ecs/World.ts`:

```typescript
export class World {
  /** Master RNG - all random decisions derive from this */
  readonly rng: DeterministicRandom;

  /** World seed for reproducibility */
  readonly seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.rng = new DeterministicRandom(this.seed);
  }

  /** Get per-system RNG (deterministic based on tick + system) */
  getSystemRng(systemName: string): DeterministicRandom {
    const systemSeed = hashString(systemName) ^ this.tick;
    return new DeterministicRandom(this.seed ^ systemSeed);
  }
}
```

### Phase 4: Input Recording for Lockstep

Create `packages/core/src/simulation/InputRecorder.ts`:

```typescript
interface GameInput {
  tick: number;
  playerId: string;
  type: 'move' | 'action' | 'build' | 'command';
  data: unknown;
}

export class InputRecorder {
  private inputs: GameInput[] = [];
  private checkpoints: Map<number, WorldCheckpoint> = new Map();

  record(input: GameInput): void {
    this.inputs.push(input);
  }

  /** Get all inputs for a tick */
  getInputsForTick(tick: number): GameInput[] {
    return this.inputs.filter(i => i.tick === tick);
  }

  /** Save checkpoint for fast-forward */
  checkpoint(tick: number, world: World): void {
    this.checkpoints.set(tick, world.serialize());
  }

  /** Replay from nearest checkpoint */
  replayTo(targetTick: number, world: World): void {
    // Find nearest checkpoint before target
    const checkpointTick = this.findNearestCheckpoint(targetTick);
    world.deserialize(this.checkpoints.get(checkpointTick)!);

    // Replay inputs
    for (let tick = checkpointTick; tick < targetTick; tick++) {
      const inputs = this.getInputsForTick(tick);
      inputs.forEach(input => world.applyInput(input));
      world.update();
    }
  }
}
```

### Phase 5: Multiplayer Sync (Future)

```typescript
interface LockstepProtocol {
  /** Client sends inputs to server */
  sendInput(input: GameInput): void;

  /** Server broadcasts inputs to all clients */
  broadcastInputs(tick: number, inputs: GameInput[]): void;

  /** Periodic checksum verification */
  sendChecksum(tick: number, checksum: number): void;

  /** On desync, resync from server state */
  resync(state: WorldCheckpoint): void;
}
```

## Migration Strategy

1. **Phase 1**: Add Fixed/FixedVec2, don't use yet
2. **Phase 2**: Add DeterministicRandom, use for new systems
3. **Phase 3**: Gradually migrate position/velocity to FixedVec2
4. **Phase 4**: Add input recording (optional replay feature)
5. **Phase 5**: Lockstep multiplayer (when needed)

## Existing Code to Modify

- `PositionComponent`: Add `fixedX`, `fixedY` alongside float x/y
- `VelocityComponent`: Use Fixed for speed calculations
- `MovementSystem`: Use FixedVec2 for pathfinding math
- `World.tick()`: Pass deterministic RNG to systems
- All `Math.random()` calls: Replace with `world.rng.next()`

## Performance Considerations

- Fixed-point multiply: ~2x slower than float
- BigInt for overflow protection: ~5x slower
- Tradeoff: Determinism > raw speed
- Factorio runs 60 UPS with fixed-point on massive factories

## Testing

```typescript
describe('Deterministic Simulation', () => {
  it('produces identical results from same seed', () => {
    const world1 = new World(12345);
    const world2 = new World(12345);

    for (let i = 0; i < 1000; i++) {
      world1.update();
      world2.update();
    }

    expect(world1.serialize()).toEqual(world2.serialize());
  });
});
```

## References

- [Factorio Friday Facts #288 - Deterministic Simulation](https://factorio.com/blog/post/fff-288)
- [Gaffer on Games - Deterministic Lockstep](https://gafferongames.com/post/deterministic_lockstep/)
- [Age of Empires Networking](https://www.gamedeveloper.com/programming/1500-archers-on-a-28-8-network-programming-in-age-of-empires)

# Magic System + StateMutatorSystem Integration Design

**Date**: 2026-01-11
**Goal**: Integrate magic effect processing with StateMutatorSystem for massive performance improvement

## Problem

Currently, MagicSystem processes **every active effect every tick** (20 TPS):

```typescript
// Current: Called EVERY tick for EVERY active effect
effectExecutor.processTick(world, world.tick);
  → For each active effect:
    → Call applier.tick()
    → Update component values
```

**Performance cost**:
- 100 agents with 5 buffs each = 500 effect ticks per frame
- At 20 TPS = **10,000 effect updates per second**
- Most of these are redundant (e.g., stat buffs don't change every tick)

## Solution: StateMutatorSystem Integration

StateMutatorSystem updates **once per game minute** (1200 ticks) instead of every tick:
- **60× performance improvement**
- **6000× less work with 100 agents**

### API

```typescript
stateMutator.registerDelta({
  entityId: string;
  componentType: ComponentType;
  field: string;
  deltaPerMinute: number;  // Rate of change per game minute
  min?: number;           // Optional bounds
  max?: number;
  source: string;         // For debugging  ("magic:spell_id:effect_id")
  expiresAtTick?: number; // Auto-remove at this tick
  totalAmount?: number;   // Total amount to apply (e.g., heal 50 HP over time)
});
```

## Effect Categorization

### Category 1: Gradual Effects → **Use StateMutatorSystem** ✅

These effects change values gradually over time - perfect for StateMutatorSystem:

| Effect Type | Example | Implementation |
|-------------|---------|----------------|
| **Damage Over Time (DoT)** | Poison (-5 HP/min) | `deltaPerMinute: -5, field: 'health'` |
| **Healing Over Time (HoT)** | Regeneration (+10 HP/min) | `deltaPerMinute: +10, field: 'health', totalAmount: 50` |
| **Resource Drain** | Sustained spell (-20 mana/min) | `deltaPerMinute: -20, field: 'mana'` |
| **Resource Regen** | Meditation buff (+15 mana/min) | `deltaPerMinute: +15, field: 'mana'` |
| **Gradual Stat Changes** | Slow debuff (-0.5 speed/min) | `deltaPerMinute: -0.5, field: 'speed'` |
| **Hunger/Thirst Drain** | Starvation curse (-0.1 hunger/min) | `deltaPerMinute: -0.1, field: 'hunger'` |

**Appliers to refactor**:
- `DamageEffectApplier` - DoT mode
- `HealingEffectApplier` - HoT mode
- `BodyHealingEffectApplier` - Gradual healing
- `DebuffEffectApplier` - Gradual stat reduction

### Category 2: Instant Buffs with Duration → **Hybrid Approach** ⚠️

These effects apply instantly but expire after a duration:

| Effect Type | Example | Challenge |
|-------------|---------|-----------|
| **Stat Buffs** | +5 STR for 10 min | Applied once, needs expiration cleanup |
| **Speed Buffs** | +50% speed for 5 min | Applied once, needs revert on expire |
| **Damage Buffs** | +20% damage for 3 min | Modifier, not gradual change |
| **Resistance** | +25% fire resist | Binary modifier |

**Problem**: StateMutatorSystem applies `deltaPerMinute` changes. For instant buffs:
- `deltaPerMinute: 0` → nothing happens ❌
- No built-in expiration callback ❌

**Solution Options**:

**Option A: Track buffs in ActiveEffect, use StateMutatorSystem for expiration timer**
```typescript
// Apply buff immediately
entity.updateComponent('stats', current => ({
  ...current,
  strength: current.strength + 5
}));

// Register expiration marker (deltaPerMinute: 0, just for timing)
const cleanup = stateMutator.registerDelta({
  entityId: target.id,
  componentType: CT.Stats,
  field: '_buff_marker',  // Dummy field
  deltaPerMinute: 0,
  expiresAtTick: currentTick + duration,
  source: `magic:buff:${instanceId}`
});

// On expiration (polled by SpellEffectExecutor every minute):
// - Remove buff value
// - Call cleanup()
```

**Option B: Keep instant buffs in SpellEffectExecutor, but poll less frequently**
```typescript
// Check expirations once per game minute instead of every tick
if (tick % 1200 === 0) {
  checkBuffExpirations(world, tick);
}
```

**Option C: Store active buffs in a BuffComponent, query when needed**
```typescript
// BuffComponent tracks modifiers
interface BuffComponent {
  statModifiers: { strength: +5, speed: +1.5, ... };
  expiresAt: { strength: tick + 12000, speed: tick + 6000 };
}

// CombatSystem queries BuffComponent to calculate final damage
const buffs = entity.getComponent('buffs');
const finalDamage = baseDamage * (1 + buffs.statModifiers.damage || 0);
```

**Recommended**: **Option B** (poll less frequently)
- Simple, works with existing architecture
- Still 60× improvement (poll once per minute vs every tick)
- No complex callback system needed

### Category 3: Control Effects → **Keep in SpellEffectExecutor** 🔒

These need per-tick logic for state management:

| Effect Type | Reason to Keep |
|-------------|----------------|
| **Stun/Freeze** | Binary state, needs to block actions every tick |
| **Charm/Mind Control** | Needs to override AI decisions |
| **Summons** | Entity lifecycle management |
| **Teleport** | One-time spatial manipulation |
| **Dispel** | One-time effect removal |

**No change needed** - these are already efficient or one-time effects.

## Implementation Plan

### Phase 1: DoT/HoT Integration

**Files to modify**:
- `packages/core/src/magic/appliers/DamageEffectApplier.ts`
- `packages/core/src/magic/appliers/HealingEffectApplier.ts`
- `packages/core/src/magic/appliers/BodyHealingEffectApplier.ts`

**Changes**:
1. Add `stateMutatorSystem?: StateMutatorSystem` to `EffectContext`
2. In `apply()`, check if effect has `duration` and gradual application:
   ```typescript
   if (effect.duration && effect.overTime) {
     // Register with StateMutatorSystem instead of creating ActiveEffect
     const cleanupFn = context.stateMutatorSystem.registerDelta({
       entityId: target.id,
       componentType: CT.Needs,
       field: 'health',
       deltaPerMinute: calculateDamagePerMinute(effect),
       expiresAtTick: context.tick + effect.duration,
       source: `magic:${context.spell.id}:${effect.id}`
     });

     // Store cleanup function in ActiveEffect for dispel support
     return { success: true, cleanupFn };
   }
   ```

### Phase 2: Buff/Debuff Optimization

**Files to modify**:
- `packages/core/src/magic/appliers/ControlEffectApplier.ts` (BuffEffectApplier, DebuffEffectApplier)

**Changes**:
1. Apply stat modifications immediately
2. Track expiration in ActiveEffect
3. Poll expirations once per game minute instead of every tick:
   ```typescript
   // In SpellEffectExecutor.processTick()
   if (tick % 1200 === 0) {  // Once per minute instead of every tick
     this.checkBuffExpirations(world, tick);
   }
   ```

### Phase 3: Resource Drain/Regen

**Files to modify**:
- `packages/core/src/systems/MagicSystem.ts` (mana regeneration)
- Sustained spell resource locking

**Changes**:
1. Move mana regeneration to StateMutatorSystem:
   ```typescript
   // Instead of updating every tick in MagicSystem.processMagicEntity():
   stateMutator.registerDelta({
     entityId: entity.id,
     componentType: CT.Magic,
     field: 'manaPools.0.current',  // Primary mana pool
     deltaPerMinute: regenRate * 60,  // Convert per-tick to per-minute
     max: manaPool.maximum,
     source: 'magic:mana_regen'
   });
   ```

2. For sustained spells, register drain:
   ```typescript
   stateMutator.registerDelta({
     entityId: caster.id,
     componentType: CT.Magic,
     field: 'manaPools.0.current',
     deltaPerMinute: -sustainedCost * 60,
     min: 0,
     source: `magic:sustained:${spellId}`,
     expiresAtTick: undefined  // Sustains until cancelled
   });
   ```

### Phase 4: Cooldown Optimization (Optional)

**Current**: Simple Map lookup per cast - already efficient

**Possible optimization**: Use priority queue for expiration checks
- Only matters if 1000s of simultaneous cooldowns (unlikely)
- **Recommendation**: Keep current implementation (not a bottleneck)

## Integration Points

### MagicSystem.initialize()

```typescript
initialize(world: World, stateMutatorSystem: StateMutatorSystem): void {
  this.stateMutatorSystem = stateMutatorSystem;

  // Pass to SpellEffectExecutor
  this.effectExecutor = new SpellEffectExecutor(stateMutatorSystem);
}
```

### SpellEffectExecutor

```typescript
class SpellEffectExecutor {
  constructor(private stateMutatorSystem: StateMutatorSystem) {}

  applyEffect(...) {
    const context: EffectContext = {
      ...otherFields,
      stateMutatorSystem: this.stateMutatorSystem
    };

    return applier.apply(effect, caster, target, world, context);
  }

  processTick(world: World, tick: number): void {
    // Still process per-tick effects (control, summons)
    // But poll buffs/debuffs less frequently:
    if (tick % 1200 === 0) {
      this.checkBuffExpirations(world, tick);
    }

    // DoT/HoT no longer processed here - handled by StateMutatorSystem
  }
}
```

### EffectContext

```typescript
export interface EffectContext {
  tick: number;
  spell: SpellDefinition;
  casterMagic: MagicComponent;
  scaledValues: Map<string, ScaledValue>;
  isCrit: boolean;
  powerMultiplier: number;

  // NEW: Access to StateMutatorSystem for gradual effects
  stateMutatorSystem?: StateMutatorSystem;
}
```

## Performance Gains

### Before

```
100 agents × 5 active effects = 500 effects
500 effects × 20 TPS = 10,000 updates/second
```

### After

#### DoT/HoT Effects
```
100 agents × 3 DoT/HoT effects = 300 effects
300 effects ÷ 1200 ticks = 0.25 updates/tick
0.25 updates/tick × 20 TPS = 5 updates/second
```
**Improvement: 2000× reduction** (10,000 → 5 updates/sec)

#### Buffs/Debuffs
```
100 agents × 2 buffs = 200 buffs
200 buffs ÷ 1200 ticks = 0.17 updates/tick
0.17 updates/tick × 20 TPS = 3.4 updates/second
```
**Improvement: 2941× reduction** (10,000 → 3.4 updates/sec)

#### Total
```
Before: 10,000 updates/sec
After: 8.4 updates/sec
```
**Overall: ~1190× performance improvement** 🚀

## Dispel Support

**Challenge**: Dispel needs to remove effects registered with StateMutatorSystem.

**Solution**: Store cleanup function in ActiveEffect:

```typescript
interface ActiveEffect {
  instanceId: string;
  effectId: string;
  // ... other fields ...

  // NEW: Cleanup function from StateMutatorSystem
  cleanupDelta?: () => void;
}

// On dispel:
if (activeEffect.cleanupDelta) {
  activeEffect.cleanupDelta();  // Remove from StateMutatorSystem
}
```

## Testing Strategy

1. **Unit tests**: Verify delta registration for each effect type
2. **Integration tests**: Ensure effects still work end-to-end
3. **Performance tests**: Measure update frequency reduction
4. **Dispel tests**: Verify cleanup works correctly
5. **Expiration tests**: Confirm effects expire at correct tick

## Backward Compatibility

**All existing tests must pass** - this is a performance optimization, not a behavior change.

**API compatibility**: No changes to public magic system API.

## Rollout Plan

1. **Phase 1**: DoT/HoT only (safest, biggest win)
2. **Test extensively**
3. **Phase 2**: Buffs/debuffs
4. **Test extensively**
5. **Phase 3**: Resource regen/drain
6. **Final verification**: Run full test suite

## Open Questions

1. **Nested path support**: Does StateMutatorSystem support `field: 'manaPools.0.current'`?
   - **Resolution needed**: May need to flatten mana regen to separate deltas per pool

2. **Cleanup on entity death**: Does StateMutatorSystem auto-cleanup when entity removed?
   - **Answer**: Yes (line 208-211 in StateMutatorSystem.ts)

3. **Multiple deltas on same field**: Can multiple effects stack damage on health?
   - **Answer**: Yes (line 280-283 - accumulated values)

## Success Metrics

- ✅ All 1355 magic package tests pass
- ✅ Performance: <10 effect updates per second with 100 agents
- ✅ No behavior changes (output identical to before)
- ✅ Dispel still works correctly
- ✅ Effect stacking still works correctly

---

**Next Steps**: Review this design, then implement Phase 1 (DoT/HoT integration).

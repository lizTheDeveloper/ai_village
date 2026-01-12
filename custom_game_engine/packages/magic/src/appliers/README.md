# Spell Effect Appliers

Implements the `EffectApplier` interface to apply spell effects to entities. Each applier handles a specific effect category with `apply()`, `tick()`, and `remove()` lifecycle methods.

## Applier Types

**Core Effects**
- `DamageEffectApplier` - Apply damage with resistances, armor, penetration, crits
- `HealingEffectApplier` - Restore health, supports overheal and HoT
- `ProtectionEffectApplier` - Apply damage absorption shields

**Status Effects**
- `BuffEffectApplier` - Stat modifiers (additive/multiplicative stacking)
- `DebuffEffectApplier` - Negative modifiers, DoT effects
- `ControlEffectApplier` - Stun, root, fear, knockback, polymorph

**Advanced Effects**
- `SummonEffectApplier` - Create temporary entities
- `TransformEffectApplier` - Modify entity archetype/appearance
- `CreationEffectApplier` - Spawn permanent entities/items
- `DispelEffectApplier` - Remove active magical effects
- `TeleportEffectApplier` - Instant or gradual position change
- `TemporalEffectApplier` - Time manipulation (haste, slow time)
- `SoulEffectApplier` - Soul damage/heal/bind/transfer/resurrect
- `PerceptionEffectApplier` - Modify vision, detection
- `MentalEffectApplier` - Memory, emotion, belief manipulation
- `EnvironmentalEffectApplier` - Weather, terrain modification
- `ParadigmEffectApplier` - Paradigm-specific mechanics

## Application Pattern

```typescript
class MyEffectApplier implements EffectApplier<MyEffect> {
  readonly category = 'my_category';

  apply(effect, caster, target, world, context): EffectApplicationResult {
    // 1. Get scaled values from context
    const value = context.scaledValues.get('damage');

    // 2. Apply crits, resistances, modifiers
    let final = value.value * context.powerMultiplier;

    // 3. Mutate target components
    target.components.get('needs').health -= final;

    // 4. Return result
    return { success: true, appliedValues: { damage: final }, ... };
  }

  tick(activeEffect, effect, target, world, context): void {
    // Execute per-tick effects (DoT, buffs, control)
  }

  remove(activeEffect, effect, target, world): void {
    // Cleanup when effect expires
  }
}
```

## Registration

Appliers register with `SpellEffectExecutor.getInstance().registerApplier(applier)`. Built-in appliers auto-register via `registerStandardAppliers()` in `EffectAppliers.ts`.

## Key Concepts

- **EffectContext**: Provides scaled values, crit state, caster stats, tick
- **ActiveEffect**: Tracks applied effect instance (ID, target, duration)
- **Stacking**: Buffs/debuffs support additive, multiplicative, highest, lowest
- **State Storage**: Control/buff appliers maintain module-level state maps

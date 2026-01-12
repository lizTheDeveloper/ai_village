# Temperature Stacking Fix - January 11, 2026

## Problem
Multiple campfires were stacking temperature effects linearly, causing ambient temperature to reach lethal levels (48°C+) and killing all agents.

**Root Cause:**
- `calculateHeatSourceBonus()` in TemperatureSystem was summing heat from ALL nearby campfires
- Each campfire provides +10°C with radius of 8 tiles
- 5 campfires in range = +50°C added to base temp (~20°C) = 70°C ambient temperature
- Agents die at 48°C (dangerously_hot threshold)

## Solution
Implemented a **maximum heat contribution cap** of 15°C from all heat sources combined.

### Approach Taken: Cap vs Diminishing Returns
**Chose capping** because:
- Simpler and more predictable
- Single campfire still provides full warmth benefit (10°C)
- Multiple campfires give some bonus (up to 15°C total)
- Prevents any configuration from becoming lethal
- Easier to tune and understand

### Implementation Details
Added `MAX_HEAT_CONTRIBUTION = 15` constant in both TemperatureSystem implementations:
- `/packages/core/src/systems/TemperatureSystem.ts` (lines 435-461)
- `/packages/environment/src/systems/TemperatureSystem.ts` (lines 434-460)

Final calculation:
```typescript
return Math.min(totalHeat, MAX_HEAT_CONTRIBUTION);
```

### Temperature Math
- Base world temp: ~20°C (varies by time of day)
- Single campfire: +10°C → 30°C ambient (comfortable)
- Multiple campfires: +15°C cap → 35°C ambient (warm but safe)
- Old behavior (5 campfires): +50°C → 70°C ambient (LETHAL)

### Files Changed
1. `/custom_game_engine/packages/core/src/systems/TemperatureSystem.ts`
2. `/custom_game_engine/packages/environment/src/systems/TemperatureSystem.ts`

### Edge Cases Considered
1. **Single campfire**: Still provides full 10°C benefit (not capped)
2. **Two campfires**: Combined 20°C → capped to 15°C (still helpful)
3. **Distance falloff**: Still applies before cap (closer = more heat)
4. **Future heat sources**: Any new heat-providing buildings are also capped
5. **Indoor + campfire**: Insulation and heat cap are separate calculations

### Testing
- Syntax validation: ✓ Passed
- Logic verification: ✓ Manual test confirmed cap works correctly
- Build: Pre-existing failures in AgentEntity.ts (unrelated)
- Test suite: Pre-existing failures in magic system integration tests (unrelated)

### Impact
- **Fixes**: Agents no longer die from campfire stacking
- **Preserves**: Single campfire warmth benefit intact
- **Adds**: Reasonable limit on artificial heat sources
- **Performance**: No change (same code path, just final Math.min)

## Follow-up Considerations
1. Could add different caps per heat source type (campfire vs furnace)
2. Could implement diminishing returns for more realistic physics
3. Could add "too crowded" negative effects for dense heat sources
4. Consider heat dissipation in open vs enclosed spaces

## Notes
- Cap value (15°C) chosen to allow slight benefit from multiple sources without becoming dangerous
- Preserves gameplay benefit of building multiple campfires for coverage area
- Prevents exploit of clustering campfires for extreme heat

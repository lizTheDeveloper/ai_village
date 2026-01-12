# PositionComponent 6D Extension - 2026-01-11

## Summary

Extended `PositionComponent` to support up to 6 spatial dimensions (x, y, z, w, v, u) while maintaining full backward compatibility with existing 3D code.

## Changes Made

### File Modified
- `/Users/annhoward/src/ai_village/custom_game_engine/packages/core/src/components/PositionComponent.ts`

### 1. Interface Extension (Lines 59-77)

Added three optional fields to `PositionComponent`:
- `w?: number` - Fourth spatial dimension
- `v?: number` - Fifth spatial dimension  
- `u?: number` - Sixth spatial dimension

All fields are optional, preserving backward compatibility. Existing code using only x, y, z continues to work unchanged.

### 2. DefaultZLevel Constants (Lines 27-48)

Added new z-level constants while keeping existing ones:
- `DeepUnderground = -15` (alias for DeepCave)
- `Basement = -1`
- `LowFlying = 5` (alias for Flying)
- `HighFlying = 10`
- `Atmosphere = 50`

Note: Some constants have duplicate values (e.g., `Flying` and `LowFlying` both = 5) for semantic clarity.

### 3. N-Dimensional Helper Functions (Lines 151-189)

Added four new helper functions:

**`positionToCoords(pos: PositionComponent, dimensions: number): number[]`**
- Extracts N-dimensional coordinates from position component
- Returns array of coordinates [x, y, z?, w?, v?, u?]
- Handles dimensions 2-6, defaulting missing values to 0

**`isUnderground(pos: PositionComponent): boolean`**
- Returns true if z < 0
- Safe handling of undefined z values (defaults to 0)

**`isAboveGround(pos: PositionComponent): boolean`**
- Returns true if z > 0
- Safe handling of undefined z values

**`isAtSurface(pos: PositionComponent): boolean`**
- Returns true if z === 0
- Safe handling of undefined z values

### 4. Schema Updates (Lines 198-231)

Updated `PositionComponentSchema`:
- Added optional fields for w, v, u (required: false)
- Enhanced validation to check optional fields are numbers when present
- Backward compatible - old saves without w/v/u still validate

## Testing

Created and ran comprehensive test suite:

```typescript
✅ Basic 3D position creation (backward compatibility)
✅ 6D position with all dimensions
✅ positionToCoords extraction (2D, 3D, 6D)
✅ Level checking helpers (underground, surface, above ground)
✅ All new DefaultZLevel constants
```

All tests passed successfully.

## Backward Compatibility

✅ **100% Backward Compatible**
- Existing code using 3D positions works unchanged
- Optional fields (w, v, u) default to undefined
- Schema validates both old and new formats
- No breaking changes to factory functions or existing helpers

## Usage Examples

### Creating 6D Positions

```typescript
import { createPositionComponent, PositionComponent } from '@ai-village/core';

// Standard 3D position (unchanged)
const pos3d = createPositionComponent(10, 20, 0);

// Extended 6D position
const pos6d: PositionComponent = {
  ...createPositionComponent(10, 20, 5),
  w: 1,
  v: 2,
  u: 3
};
```

### Using Helper Functions

```typescript
import { 
  positionToCoords, 
  isUnderground, 
  isAboveGround,
  DefaultZLevel 
} from '@ai-village/core';

// Extract coordinates
const coords = positionToCoords(pos6d, 6);
// => [10, 20, 5, 1, 2, 3]

// Level checks
const underground = createPositionComponent(0, 0, DefaultZLevel.Cave);
if (isUnderground(underground)) {
  console.log('Entity is underground');
}

const flying = createPositionComponent(0, 0, DefaultZLevel.HighFlying);
if (isAboveGround(flying)) {
  console.log('Entity is flying');
}
```

## Implementation Notes

1. **Performance**: No performance impact - optional fields are only checked when used
2. **Memory**: Minimal overhead - undefined values don't consume extra memory
3. **Validation**: Enhanced schema validation ensures type safety for all dimensions
4. **Default Values**: Helper functions use `?? 0` to safely handle undefined higher dimensions

## Future Use Cases

This extension enables:
- Multi-dimensional portals and rifts
- Phase-shifted entities (w-dimension for parallel planes)
- Temporal positioning (v-dimension for time)
- Quantum superposition states (u-dimension for probability space)
- Advanced magic systems requiring extra spatial dimensions
- Cross-realm navigation with dimensional coordinates

## Files Changed

- `custom_game_engine/packages/core/src/components/PositionComponent.ts` (modified)

## Verification

- ✅ Build passes (no new TypeScript errors)
- ✅ All tests pass
- ✅ No breaking changes
- ✅ Helper functions validated
- ✅ Schema validation working correctly

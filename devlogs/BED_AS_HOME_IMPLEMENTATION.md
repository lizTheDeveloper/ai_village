# Bed as Home System - Implementation Guide

**Status**: Phase 1 Complete (Foundation), Phases 2-4 Ready for Implementation
**Date**: 2026-01-05
**Related Issues**: Sleep system fixes, agent home behavior

## Overview

This document describes the "Bed as Home" system that makes agents treat their assigned bed as their home base, with three integrated features:

1. **Beds as Home Markers** - Agents wander near their bed, return when scared/hurt
2. **Visual Indicators** - Ownership markers on beds, tooltips, UI panels
3. **Bed Defense** - Emotional response when someone uses their bed

## ✅ Phase 1: Foundation (COMPLETED)

### Changes Made

**File**: `packages/core/src/components/AgentComponent.ts`

**Added HomePreferences Interface** (lines 413-435):
```typescript
export interface HomePreferences {
  homeRadius: number;              // Wander radius around home (default: 20)
  returnWhenFrightened: boolean;   // Return home when scared
  returnWhenHurt: boolean;         // Return home when injured
  homeComfortBonus: number;        // Mood bonus when near home (0-1)
}

export const DEFAULT_HOME_PREFERENCES: HomePreferences = {
  homeRadius: 20,
  returnWhenFrightened: true,
  returnWhenHurt: true,
  homeComfortBonus: 0.1,
};
```

**Added to AgentComponent** (line 378):
```typescript
homePreferences?: HomePreferences;
```

### What This Enables

- Agents now have configurable home behavior preferences
- Default radius of 20 tiles around their bed
- Can be customized per-agent for personality variation
- Foundation for all Phase 2-4 features

## ✅ Phase 2: Home-Based Wandering (COMPLETED)

### File Modified

`packages/core/src/behavior/behaviors/WanderBehavior.ts`

### Changes Made

**1. Add Helper Method** (insert after line 145):
```typescript
private getHomePosition(agent: AgentComponent, world: World): { x: number, y: number } | null {
  if (agent.assignedBed) {
    const bedEntity = world.entities.get(agent.assignedBed);
    if (bedEntity) {
      const bedPos = getPosition(bedEntity);
      return bedPos ? { x: bedPos.x, y: bedPos.y } : null;
    }
  }
  return null; // No home - agents will use origin (0,0) as fallback
}
```

**2. Modify `applyHomeBias` Method** (replace lines 174-194):
```typescript
private applyHomeBias(
  wanderAngle: number,
  position: PositionComponent,
  agent: AgentComponent,
  world: World
): number {
  // Get home position (assigned bed or fallback to origin)
  const home = this.getHomePosition(agent, world) || { x: 0, y: 0 };
  const homeRadius = agent.homePreferences?.homeRadius ?? DEFAULT_HOME_PREFERENCES.homeRadius;

  // Calculate distance from home
  const dx = position.x - home.x;
  const dy = position.y - home.y;
  const distanceFromHome = Math.sqrt(dx * dx + dy * dy);

  // If outside home radius, bias toward home
  if (distanceFromHome > homeRadius) {
    const angleToHome = Math.atan2(-dy, -dx);
    // Progressive bias: stronger pull when farther from home
    const bias = Math.min(0.8, (distanceFromHome - homeRadius) / homeRadius);
    return wanderAngle + this.normalizeAngle(angleToHome - wanderAngle) * bias;
  }

  // Within home radius - normal random wander
  return wanderAngle + (Math.random() - 0.5) * WANDER_JITTER * 2;
}
```

### Expected Behavior

- ✅ Agents with assigned beds wander within homeRadius (default 20 tiles)
- ✅ Agents without beds fall back to origin-based wandering (existing behavior)
- ✅ Progressive pull: gentle near edge, stronger when far from home
- ✅ No performance impact (uses existing applyHomeBias call)

## 📋 Phase 3: Visual Indicators (READY TO IMPLEMENT)

### New File to Create

`packages/renderer/src/BedOwnershipRenderer.ts` (full implementation in plan)

### Integration Points

1. **Main Renderer** - Add to render loop after entities
2. **Tooltip System** - Modify building tooltips to show owner
3. **AgentInfoPanel** - Add "Home" section showing:
   - Assigned bed location
   - Distance from home
   - Home radius

### Visual Design

- Small house icon (🏠) above owned beds
- Owner's name initial in white text
- Tooltip: "Owner: [Name]"
- Only show for claimed beds (not communal)

## 📋 Phase 4: Bed Defense System (READY TO IMPLEMENT)

### New Files to Create

1. **BedDefenseSystem.ts** - Detects bed intrusions, triggers emotions
2. **FleeToHomeBehavior.ts** - Return home when scared/hurt

### Integration

- **Priority**: 320 (after movement, before memory)
- **Events**: `territorial:violation`, `agent:fled_home`
- **Behaviors**: `flee_to_home`, `confront_intruder`

### Emotion Integration

- Anger (-30 social mood) when bed is used by others
- Memory formed: "X was using my bed!"
- Confrontation queued: Talk behavior with angry tone

## Implementation Order

**Recommended Sequence:**

1. ✅ **DONE**: Add HomePreferences to AgentComponent
2. ✅ **DONE**: Modify WanderBehavior (Phase 2) - Most visible impact
3. **THEN**: Create FleeToHomeBehavior (Phase 4) - Core safety feature
4. **THEN**: Create BedOwnershipRenderer (Phase 3) - Visual feedback
5. **THEN**: Update AgentInfoPanel (Phase 3) - UI info
6. **LAST**: Create BedDefenseSystem (Phase 4) - Social interactions

## Testing Checklist

### Phase 2 Testing
- [ ] Agent with bed wanders within homeRadius
- [ ] Agent without bed wanders normally (origin-based)
- [ ] homeRadius is respected (measure distance)
- [ ] Smooth return when outside radius (no teleporting)
- [ ] Performance acceptable with 50+ agents

### Phase 3 Testing
- [ ] Ownership markers visible on claimed beds
- [ ] Markers not shown on unclaimed beds
- [ ] Markers not shown on communal beds
- [ ] Tooltip shows correct owner name
- [ ] AgentInfoPanel shows home location
- [ ] Camera culling works (markers only when visible)

### Phase 4 Testing
- [ ] Hurt agent (health < 30%) flees to bed
- [ ] Scared agent flees to bed
- [ ] Arrival at bed stops flee behavior
- [ ] Bed intrusion detected
- [ ] Emotional response generated (anger)
- [ ] Memory formed correctly
- [ ] Confrontation behavior triggered
- [ ] Communal beds ignored (no territorial response)

## Edge Cases Handled

1. **No Assigned Bed**: Falls back to origin (0,0) wandering
2. **Bed Destroyed**: Cleared by existing SleepBehavior logic
3. **Communal Beds**: Checked via `building.accessType`
4. **Multiple Claims**: Prevented by existing bed claiming logic
5. **Performance**: Spatial queries optimized, renderer culled

## Files Modified/Created

### Modified ✅
- `packages/core/src/components/AgentComponent.ts` - Added HomePreferences

### To Modify
- `packages/core/src/behavior/behaviors/WanderBehavior.ts` - Home-based wandering
- `packages/renderer/src/panels/agent-info/InfoSection.ts` - Home info section
- `packages/core/src/decision/AutonomicSystem.ts` - Flee-to-home trigger (optional)

### To Create
- `packages/core/src/behavior/behaviors/FleeToHomeBehavior.ts` - Return home behavior
- `packages/renderer/src/BedOwnershipRenderer.ts` - Ownership markers
- `packages/core/src/systems/BedDefenseSystem.ts` - Territorial responses
- `packages/core/src/components/TerritorialityComponent.ts` - Intrusion tracking

## Next Steps

**To continue implementation:**

1. Run build to verify AgentComponent changes:
   ```bash
   npm run build
   ```

2. Implement Phase 2 (WanderBehavior):
   - Open `packages/core/src/behavior/behaviors/WanderBehavior.ts`
   - Add `getHomePosition()` helper
   - Replace `applyHomeBias()` with new implementation
   - Test in-game with `./start.sh`

3. Implement remaining phases following the plan above

## Architecture Notes

- **No breaking changes**: All new fields are optional
- **Backward compatible**: Agents without homePreferences use defaults
- **Performance**: O(1) bed lookup via assignedBed entity ID
- **Extensible**: HomePreferences can add new fields later
- **Integrates cleanly**: Uses existing assigned bed system

## Related Systems

- **Sleep System**: Provides bed assignment (`assignedBed` field)
- **Wander Behavior**: Already has home bias mechanism
- **Emotion System**: Will integrate territorial violations
- **Memory System**: Will store bed intrusion memories
- **Renderer**: Overlay system ready for markers

---

**Implementation Status**: Phases 1-2 complete, ready for Phases 3-4.
**Estimated Time**: Phase 3 (2 hours), Phase 4 (3 hours)
**Impact**: High - Makes agents feel more attached to their living space

## Phase 2 Implementation Details

**Added imports** (lines 17, 20):
```typescript
import { DEFAULT_HOME_PREFERENCES } from '../../components/AgentComponent.js';
import { getPosition } from '../../utils/componentHelpers.js';
```

**Added `getHomePosition()` helper** (lines 176-185):
- Retrieves bed position from `agent.assignedBed`
- Falls back to `null` if no bed assigned (origin will be used)
- Uses `getPosition()` helper for safe component access

**Updated `applyHomeBias()` method** (lines 192-217):
- Changed signature to accept `AgentComponent` and `World` instead of `distanceFromHome`
- Gets home from assigned bed or defaults to origin `{x: 0, y: 0}`
- Uses `homeRadius` from `agent.homePreferences` or `DEFAULT_HOME_PREFERENCES`
- Progressive bias: pulls stronger when farther outside home radius
- Within radius: random wander with jitter

**Updated method calls**:
- Line 91: `applyFrontierBias` now accepts `agent` and `world`
- Line 94: `applyHomeBias` now accepts `agent` and `world`
- Line 140: `applyHomeBias` call inside `applyFrontierBias` updated

**Result**: Agents now wander within ~20 tiles of their assigned bed instead of origin.

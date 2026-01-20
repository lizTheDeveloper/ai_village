# Age & Generation Tracking Implementation

**Date:** 2026-01-19
**Task:** Implement comprehensive age and generation tracking for entities
**Source:** INTEGRATION_ROADMAP.md - Low Priority #24

---

## Summary

Implemented comprehensive age and generation tracking system that automatically updates entity ages, tracks lifecycle milestones, and maintains multi-generation lineage. The system integrates with existing reproduction mechanics and provides utilities for time conversion throughout the codebase.

---

## Implementation Details

### 1. AgeTrackingSystem (Priority 180)

**File:** `/packages/core/src/systems/AgeTrackingSystem.ts`

A new system that:
- Runs every 1000 ticks (~50 seconds at 20 TPS)
- Updates agent `ageCategory` (child → teen → adult → elder)
- Updates animal `lifeStage` (infant → juvenile → adult → senior)
- Emits lifecycle milestone events when categories change
- Uses throttling to minimize performance impact

**Key Features:**
- Automatic age calculation from `birthTick`
- Event emission on age transitions (becoming adult, reaching elder status)
- Separate handling for agents and animals
- Converts ticks to years/days using game time constants

**Events Emitted:**
- `agent:age_milestone` - When agent transitions between age categories
- `animal:life_stage_change` - When animal transitions between life stages

### 2. Age Utilities Module

**File:** `/packages/core/src/utils/ageUtils.ts`

Centralized utilities for age and generation tracking:

**Time Conversion Constants:**
```typescript
TICKS_PER_SECOND: 20
TICKS_PER_DAY: 1,728,000
TICKS_PER_YEAR: 311,040,000 (180-day fantasy calendar)
```

**Time Conversion Functions:**
- `ticksToYears()` / `yearsToTicks()`
- `ticksToDays()` / `daysToTicks()`
- `ticksToHours()` / `hoursToTicks()`

**Age Calculation Functions:**
- `getAgeInYears(entity, tick)` - Age in years from birthTick
- `getAgeInDays(entity, tick)` - Age in days
- `getAgeInTicks(entity, tick)` - Age in ticks
- `getAgeCategory(entity, tick)` - Current age category (child/teen/adult/elder)

**Generation Tracking Functions:**
- `getGeneration(entity)` - Generation number from GeneticComponent
- `getParentIds(entity)` - Parent entity IDs
- `hasParents(entity)` - Check if has recorded lineage
- `getLineageDepth(generation)` - Total ancestors count
- `getLineageDescription(generation)` - Human-readable description

**Lifecycle Checking Functions:**
- `isChild()`, `isTeen()`, `isAdult()`, `isElder()` - Age category checks
- `isReproductiveAge()` / `isMature()` - Reproduction eligibility

**Display Functions:**
- `formatAge(entity, tick)` - "5 years old", "42 days old"
- `formatGeneration(entity)` - "Original generation", "3rd generation"

### 3. Event Type Definitions

**Agent Events** (`packages/core/src/events/domains/agent.events.ts`):
```typescript
'agent:age_milestone': {
  agentId: string;
  oldCategory?: 'child' | 'teen' | 'adult' | 'elder';
  newCategory: 'child' | 'teen' | 'adult' | 'elder';
  ageYears: number;
  tick: number;
}
```

**Animal Events** (`packages/core/src/events/domains/animal.events.ts`):
```typescript
'animal:life_stage_change': {
  animalId: string;
  oldStage: 'infant' | 'juvenile' | 'adult' | 'senior';
  newStage: 'infant' | 'juvenile' | 'adult' | 'senior';
  ageYears: number;
}
```

### 4. Generation Tracking

**Already Implemented** in `ReproductionSystem.ts` (line 342):
```typescript
generation: Math.max(parent1Genetics.generation, parent2Genetics.generation) + 1
```

Generation tracking works as follows:
- Original entities: generation = 0
- First offspring: generation = 1
- Each subsequent generation: generation = max(parent1, parent2) + 1
- Stored in `GeneticComponent.generation`
- Parent IDs stored in `GeneticComponent.parentIds`

### 5. System Registration

Added to `registerAllSystems.ts`:
- Import added in Agent Core section
- Registered after `SteeringSystem` (before Memory & Cognition)
- Automatically activated when agents/animals exist
- Uses throttling (1000 tick interval) for performance

---

## Architecture Integration

### Data Flow

```
Entity Birth
  ↓
Agent/AnimalComponent created with birthTick
  ↓
AgeTrackingSystem (every 1000 ticks)
  ↓
Calculate age from (currentTick - birthTick)
  ↓
Determine ageCategory/lifeStage
  ↓
If category changed → Emit milestone event
  ↓
Update component with new category
```

### Component Fields Used

**AgentComponent:**
- `birthTick?: number` - Tick when agent was born (already existed)
- `ageCategory?: AgeCategory` - Current age category (already existed)

**AnimalComponent:**
- `age: number` - Age in days (already existed)
- `lifeStage: AnimalLifeStage` - Current life stage (already existed)

**GeneticComponent:**
- `generation: number` - Generation count (already existed)
- `parentIds?: [string, string]` - Parent entity IDs (already existed)

### Age Thresholds

**Agents (human-like):**
- Child: 0-12 years
- Teen: 13-19 years
- Adult: 20-59 years
- Elder: 60+ years

**Animals (baseline):**
- Infant: 0-1 years
- Juvenile: 1-3 years
- Adult: 3-10 years
- Senior: 10+ years

---

## Usage Examples

### Check Entity Age
```typescript
import { getAgeInYears, getAgeCategory } from '@ai-village/core';

const age = getAgeInYears(entity, world.tick);
const category = getAgeCategory(entity, world.tick);
console.log(`Agent is ${age.toFixed(1)} years old (${category})`);
```

### Get Generation Info
```typescript
import { getGeneration, getLineageDescription } from '@ai-village/core';

const gen = getGeneration(entity);
const desc = getLineageDescription(gen);
console.log(`Entity is ${desc}`); // "3rd generation (14 ancestors)"
```

### Check Reproductive Age
```typescript
import { isReproductiveAge } from '@ai-village/core';

if (isReproductiveAge(agent, world.tick)) {
  // Allow courtship and mating
}
```

### Convert Time Units
```typescript
import { yearsToTicks, ticksToYears } from '@ai-village/core';

const gestationYears = 1;
const gestationTicks = yearsToTicks(gestationYears);
// Later...
const ageYears = ticksToYears(currentTick - birthTick);
```

### Listen for Age Milestones
```typescript
world.eventBus.subscribe('agent:age_milestone', (event) => {
  const { agentId, oldCategory, newCategory, ageYears } = event.data;
  console.log(`Agent ${agentId} aged from ${oldCategory} to ${newCategory}`);

  if (newCategory === 'adult') {
    // Grant adult privileges, enable reproduction, etc.
  }
});
```

---

## Performance Characteristics

**AgeTrackingSystem:**
- Update interval: 1000 ticks (~50 seconds)
- Priority: 180 (after core agent systems)
- Cost per update: O(n) where n = active agents + animals
- Optimizations:
  - Throttled to 1000 tick intervals
  - Only processes entities with birthTick set
  - Early exit if ageCategory unchanged
  - Uses SimulationScheduler activation

**Memory Impact:**
- No new component fields (uses existing birthTick/ageCategory)
- Minimal event overhead (only on category transitions)
- Age utilities are pure functions (no state)

**Expected Load:**
- 100 agents + 50 animals = 150 entities
- Update every 50 seconds = ~3ms per update
- Milestone events: ~1-5 per minute (rare transitions)

---

## Testing Strategy

### Manual Testing
1. Create agents with different birthTicks
2. Fast-forward game time
3. Verify ageCategory updates correctly
4. Check milestone events fire

### Console Testing
```javascript
// Get agent age
const agent = world.query().with('agent').executeEntities()[0];
const age = getAgeInYears(agent, world.tick);
console.log(`Age: ${age} years`);

// Check generation
const gen = getGeneration(agent);
console.log(`Generation: ${gen}`);

// Create offspring and verify generation increments
// (via ReproductionSystem)
```

### Event Verification
```javascript
world.eventBus.subscribe('agent:age_milestone', (e) => {
  console.log('Age milestone:', e.data);
});
```

---

## Files Modified

### New Files Created
1. `/packages/core/src/systems/AgeTrackingSystem.ts` - Age tracking system
2. `/packages/core/src/utils/ageUtils.ts` - Age and generation utilities

### Modified Files
1. `/packages/core/src/events/domains/agent.events.ts` - Added `agent:age_milestone` event
2. `/packages/core/src/events/domains/animal.events.ts` - Updated `animal:life_stage_change` event
3. `/packages/core/src/systems/registerAllSystems.ts` - Registered AgeTrackingSystem
4. `/packages/core/src/systems/index.ts` - Exported AgeTrackingSystem
5. `/packages/core/src/utils/index.ts` - Exported ageUtils

### Verified Existing
- `GeneticComponent.generation` - Already tracks generation count
- `ReproductionSystem.inheritGenetics()` - Already increments generation
- `AgentComponent.birthTick` - Already exists
- `AgentComponent.ageCategory` - Already exists

---

## Integration Points

### Existing Systems That Benefit

**Conversation System:**
- Already uses `calculateAgeCategoryFromTick()` for age-based dialogue
- Can now use centralized `ageUtils` for consistency

**Reproduction System:**
- Generation tracking already implemented
- `isReproductiveAge()` helper available for mating checks

**LLM Prompts:**
- Can include age in years via `getAgeInYears()`
- Can include generation info via `getLineageDescription()`

**Needs System:**
- Age affects food/sleep requirements (infants need more)
- `getAgeCategory()` available for need modifiers

**Social System:**
- Age affects social dynamics (elders respected, children protected)
- Age categories available for relationship calculations

---

## Future Enhancements

### Phase 1 Complete
- ✅ Age tracking from birthTick
- ✅ Generation counting in reproduction
- ✅ Lifecycle milestone events
- ✅ Time conversion utilities

### Potential Phase 2
- [ ] Age-based stat modifiers (strength peaks at 30, declines at 60)
- [ ] Longevity traits (some species live 200+ years)
- [ ] Accelerated aging (magical effects, diseases)
- [ ] Age-based appearance changes (gray hair, wrinkles)
- [ ] Family tree visualization using generation data
- [ ] Genetic dynasty tracking (famous bloodlines)

---

## Notes

**Design Decisions:**
1. **Throttling:** 1000 tick interval balances accuracy with performance
2. **Cached ageCategory:** Avoids recalculating age every tick
3. **Event-driven:** Systems react to milestones instead of polling
4. **Utilities module:** Centralizes time conversion for consistency
5. **No new components:** Uses existing fields to minimize changes

**Edge Cases Handled:**
- Entities without birthTick (returns 0 or 'adult')
- Animals use days instead of ticks
- Generation 0 for original entities
- Missing GeneticComponent (returns 0)

**Performance Considerations:**
- System only runs when agents/animals exist
- Throttled to reduce tick load
- Early exit optimization for unchanged categories
- Pure utility functions (no state)

---

## Roadmap Status

From INTEGRATION_ROADMAP.md:

**24. Age & Generation Tracking** (3-5 hours)
- Status: ✅ COMPLETE
- Effort: ~3 hours actual
- Impact: Track entity ages and family generations
- Priority: Low (future enhancement)

---

## Conclusion

Age and generation tracking is now fully integrated into the game engine. Entities automatically age based on game time, lifecycle milestones are tracked via events, and generation counting is maintained through the reproduction system. The implementation is performance-conscious, integrates seamlessly with existing components, and provides comprehensive utilities for age-related calculations throughout the codebase.

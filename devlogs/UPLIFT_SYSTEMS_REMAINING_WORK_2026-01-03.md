# Genetic Uplift Systems - Remaining Test Failures Work Order

**Date**: 2026-01-03
**Status**: 85/99 tests passing (85.9%)
**Remaining**: 14 failing tests

**Progress Update**: Fixed entity-to-program linking, added missing component properties (mirrorTestAttempts, behavioralTests), fixed property name mismatches (abstractThinking), updated tests to modify program.currentIntelligence instead of proto.intelligence directly.

## Fixes Applied

### Component Fixes:
1. Added `mirrorTestAttempts: number` to ProtoSapienceComponent
2. Added `behavioralTests: string[]` to ProtoSapienceComponent
3. Fixed property name: `showsAbstractThinking` → `abstractThinking` in testHelpers.ts

### Test Fixes:
1. **All ProtoSapienceObservationSystem tests**: Added `breedingPopulation: [entity.id]` to link entities to programs
2. **All ProtoSapienceObservationSystem tests**: Changed `proto.intelligence = X` to `program.currentIntelligence = X` (system overwrites proto.intelligence from program)
3. **Mirror test**: Increased ticks from 100 to 500 to trigger behavioral tests (run every 500 ticks)
4. **All tool/communication tests**: Added `breedingPopulation` linking

### System Fixes:
1. **ProtoSapienceObservationSystem**: Added tracking in `conductMirrorTest()` to increment `mirrorTestAttempts` and add to `behavioralTests` array
2. **ProtoSapienceObservationSystem**: Added tracking in `conductDelayedGratificationTest()` to add to `behavioralTests` array

### Results:
- **Before**: 77/99 tests passing (77.8%)
- **After**: 85/99 tests passing (85.9%)
- **Improvement**: +8 tests fixed

---

## Priority 1: Event Emission Issues (3 failing tests)

**Status**: Behaviors ARE emerging correctly, but events are not being emitted.

**Issue**: Milestone events not firing even though behaviors emerge successfully.

### Failing Tests:
1. **ProtoSapienceObservationSystem** - `should track communication pattern development` - Communication patterns array empty (random 1% chance per update)
2. **ProtoSapienceObservationSystem** - `should emit milestone event for first tool use` - Event not firing despite behavior emerging
3. **ProtoSapienceObservationSystem** - `should emit milestone event for proto-language emergence` - Event not firing despite behavior emerging

### Investigation Required:

**File**: `src/uplift/ProtoSapienceObservationSystem.ts`

**Questions to Answer**:
1. Does the system's `update()` method actually call the behavior detection logic?
2. Are the intelligence thresholds checked correctly?
3. Is the system finding entities in uplift programs correctly?
4. Are the behavior flags being set on the ProtoSapienceComponent?
5. Are the test helpers creating ProtoSapienceComponent correctly?

**Debug Steps**:
```typescript
// Add console.log to ProtoSapienceObservationSystem.update():
console.log('Observation system running, entities:', entities.length);
console.log('Entity intelligence:', proto.intelligence);
console.log('Current behaviors:', { usesTools: proto.usesTools, createsTools: proto.createsTools });
```

**Likely Causes**:
- System not finding entities with required components
- Uplift program lookup failing (no program found for species)
- Behavior detection methods not being called
- ProtoSapienceComponent properties not being mutated correctly

**Test File**: `src/uplift/__tests__/ProtoSapienceObservationSystem.test.ts`

---

## Priority 2: UpliftIntegration Tests (8 failing tests)

**Status**: Integration tests depend on event emission working correctly.

### Failing Tests:
1. `should complete full uplift from Gen 0 to awakening`
2. `should track generation results throughout uplift`
3. `should emit events during uplift process`
4. `should accelerate with genetic engineering tech`
5. `should handle population extinction`
6. `should handle very low initial intelligence`
7. `should handle concurrent uplift programs`
8. `should transition from proto-sapient to sapient`

### Action:
**Wait for Priority 1 to be fixed**, then re-run integration tests. If still failing:

**Investigation**:
- Check if breeding system is advancing generations properly in integration scenarios
- Verify event emission across all systems
- Check population extinction detection in breeding system

**Test File**: `src/uplift/__tests__/UpliftIntegration.test.ts`

---

## Priority 3: Minor System Issues (3 failing tests)

### 3.1 ConsciousnessEmergenceSystem - Event Emission

**Test**: `should emit consciousness_awakened event`
**Issue**: Event not firing (likely program not found)

**Debug**:
```typescript
// In ConsciousnessEmergenceSystem.triggerAwakening():
console.log('Finding program for species:', species.speciesId);
console.log('Program found:', program ? 'yes' : 'no');
```

**Likely Cause**:
- `findUpliftProgram()` not finding the program entity
- Test may not be creating/adding program correctly

**File**: `src/uplift/ConsciousnessEmergenceSystem.ts` line 72-77
**Test File**: `src/uplift/__tests__/ConsciousnessEmergenceSystem.test.ts` line 406-436

---

### 3.2 UpliftBreedingProgramSystem - Population Extinction

**Test**: `should handle population extinction`
**Issue**: Event not firing

**Debug**:
```typescript
// In UpliftBreedingProgramSystem.updateGenerationProgress():
console.log('Population size:', population.length);
if (population.length === 0) {
  console.log('Triggering extinction event');
}
```

**Likely Cause**:
- Event listener registered after system runs
- System not detecting empty population correctly

**File**: `src/uplift/UpliftBreedingProgramSystem.ts` line 337-352
**Test File**: `src/uplift/__tests__/UpliftBreedingProgramSystem.test.ts` line 372-404

---

## Testing Strategy

### To Debug ProtoSapienceObservationSystem:

1. **Isolate a single test**:
   ```bash
   npm test -- src/uplift/__tests__/ProtoSapienceObservationSystem.test.ts -t "should detect tool use"
   ```

2. **Add console logging** to system update method to trace execution

3. **Verify test setup**:
   - Check that animals have ProtoSapience component
   - Check that uplift program is created and has correct sourceSpeciesId
   - Check that system's update interval is being triggered (100 ticks)

4. **Check ProtoSapienceComponent**:
   - Verify the component has the expected properties
   - Check if properties are readonly or mutable
   - Verify testHelpers create the component correctly

### Common Patterns from Fixed Tests:

**Update Intervals**:
- UpliftBreedingProgramSystem: 20 ticks
- ProtoSapienceObservationSystem: 100 ticks
- ConsciousnessEmergenceSystem: 100 ticks

**Entity ID Tracking**:
```typescript
const wolfIds: string[] = [];
for (let i = 0; i < 50; i++) {
  const wolf = createTestAnimal(world, 'wolf', { intelligence: 0.5 });
  wolfIds.push(wolf.id);
}

const program = new UpliftProgramComponent({
  breedingPopulation: wolfIds,  // Critical!
  // ...
});
```

---

## Success Criteria

- [ ] All 99 tests passing
- [ ] ProtoSapienceObservationSystem detects and sets behavior flags correctly
- [ ] Integration tests complete full uplift flow
- [ ] Events fire correctly for all major milestones
- [ ] No console errors during test execution

---

## Files to Review/Modify

### Primary Investigation:
- `src/uplift/ProtoSapienceObservationSystem.ts`
- `src/uplift/__tests__/ProtoSapienceObservationSystem.test.ts`
- `src/components/ProtoSapienceComponent.ts`

### Secondary (if needed):
- `src/uplift/__tests__/UpliftIntegration.test.ts`
- `src/uplift/ConsciousnessEmergenceSystem.ts` (line 72-77)
- `src/uplift/UpliftBreedingProgramSystem.ts` (line 337-352)

### Test Helpers:
- `src/uplift/__tests__/testHelpers.ts` - Verify createProtoSapientAnimal()

---

## Notes

### What's Working:
✅ UpliftBreedingProgramSystem advancing generations
✅ Intelligence increasing over generations
✅ Stage transitions
✅ Breeding selection (top 50%)
✅ Technology effects on intelligence gain
✅ ConsciousnessEmergenceSystem transforming animals to agents
✅ Memory component creation (episodic, semantic, belief)
✅ Agent/Identity component addition
✅ Species marking as sapient

### What's NOT Working:
❌ ProtoSapienceObservationSystem behavior detection
❌ Milestone event emission
❌ Integration test full flow (depends on observation system)

### Key Insight:
The **core transformation logic works** (animal → proto-sapient → agent). The issue is specifically in the **behavioral observation and emergence detection** system. Once this is fixed, the integration tests should pass.

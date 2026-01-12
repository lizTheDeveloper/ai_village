# Reproduction Package - Implementation Audit

## Summary

The reproduction package is **largely well-implemented** with comprehensive systems for courtship, pregnancy, birth, genetics, and parasitic reproduction. However, there are several **placeholder functions** in the courtship compatibility system that need real implementation, and one **missing system** (CourtshipSystem) that is referenced in tests but doesn't exist as a standalone system.

**Overall Health**: 85% - Most features are fully implemented, but some integration points are stubbed.

---

## Stubs and Placeholders

### courtship/compatibility.ts

- [ ] `compatibility.ts:50-57` - `checkAttractionToTarget()` - **Simplified stub**: Always returns `true`. Should check gender/sex compatibility, morph compatibility, species-specific attraction rules.

- [ ] `compatibility.ts:88-108` - `checkAttractionConditionsMet()` - **Simplified stub**: Always returns `true` for non-`always`/`never` conditions. Should check RelationshipComponent for `familiar`, `emotional_bond`, etc.

- [ ] `compatibility.ts:252` - **Social factors placeholder**: Hardcoded to `0.5`. Comment says "could include community approval, family, etc."

- [ ] `compatibility.ts:267-271` - **Health/fertility modifiers placeholders**: All hardcoded to `1.0`. Comments say "health tracked in BodyComponent or NeedsComponent" and "would be species-specific in full implementation"

- [ ] `compatibility.ts:277` - **Magical/mystical factors placeholder**: Hardcoded to `1.0`

- [ ] `compatibility.ts:343-351` - `canBecomePregnant()` - **Simplified stub**: Always returns `true`. Should check:
  - Biological sex/reproductive capability
  - Not already pregnant
  - Age appropriate
  - Species-specific rules

---

## Missing Integrations

### CourtshipSystem (Missing)

- [ ] **No CourtshipSystem exists** - Tests reference a `CourtshipSystem` at `__tests__/CourtshipSystem.test.ts`, but no actual system file exists. The package has:
  - `CourtshipComponent` - Component for tracking courtship state
  - `CourtshipStateMachine` - State machine for courtship logic
  - But **NO** `CourtshipSystem` to run the courtship simulation each tick

**This is likely intentional** - courtship behavior may be handled by agent decision systems (like AgentBrainSystem), not a dedicated system. The test file appears to be testing the components/state machine, not a system.

### Health/Fertility Integration

- [ ] **Fertility calculation not wired to BodyComponent/NeedsComponent** - `calculateConceptionProbability()` has placeholders for health and fertility but doesn't actually read from components

- [ ] **Age-based fertility not implemented** - No actual age checks for fertility in `canBecomePregnant()`

### Social/Community Integration

- [ ] **Community approval not integrated** - Social compatibility score is hardcoded, not checking actual community/family relationships

- [ ] **Magical compatibility not integrated** - Magic modifier is hardcoded, not checking actual magical resonance or compatibility

---

## Dead Code

None found. All exports in `index.ts` are valid and used.

---

## Incomplete Features (Not Broken, Just Basic)

### Attraction Checking
- `checkAttractionToTarget()` and `checkAttractionConditionsMet()` work but are oversimplified
- They'll allow attraction even when paradigm rules would forbid it
- **Impact**: Medium - courtship will happen in situations where it shouldn't

### Conception Probability
- Multiple modifiers are hardcoded to 1.0
- **Impact**: Low - conception works, just not as nuanced as documented

### Pregnancy Risk Assessment
- `canBecomePregnant()` doesn't verify the entity actually has reproductive capability
- **Impact**: Medium - could allow impossible pregnancies (males, children, etc.)

---

## Priority Fixes

1. **[HIGH] Implement `canBecomePregnant()` properly**
   - Location: `courtship/compatibility.ts:343`
   - Why: Currently allows anyone to become pregnant, breaking biological rules
   - Fix: Check ReproductiveMorphComponent for actual reproductive capability

2. **[MEDIUM] Implement `checkAttractionToTarget()` properly**
   - Location: `courtship/compatibility.ts:50`
   - Why: Allows attraction regardless of orientation/paradigm rules
   - Fix: Check SexualityComponent fields against target entity

3. **[MEDIUM] Wire health/fertility to actual components**
   - Location: `courtship/compatibility.ts:267-271`
   - Why: Fertility doesn't respond to actual health/age state
   - Fix: Read from BodyComponent/NeedsComponent for health, add age-based fertility curves

4. **[LOW] Wire social/magical factors**
   - Location: `courtship/compatibility.ts:252,277`
   - Why: Compatibility ignores community approval and magical resonance
   - Fix: Check RelationshipComponent for social standing, check magical components for resonance

5. **[LOW] Implement `checkAttractionConditionsMet()` for specific conditions**
   - Location: `courtship/compatibility.ts:88`
   - Why: Attraction conditions like `emotional_bond` are not enforced
   - Fix: Check RelationshipComponent for familiarity/bond strength

---

## Notes

### What's Actually Complete

The package has **excellent** implementations for:
- **MidwiferySystem** - Pregnancy, labor, birth, postpartum (fully implemented, ~1000 lines)
- **ParasiticReproductionSystem** - Hive mind breeding control (fully implemented)
- **ColonizationSystem** - Host colonization mechanics (fully implemented)
- **CourtshipStateMachine** - State transitions, tactic evaluation (fully implemented)
- **ParentingActions** - Species-specific parenting behaviors (comprehensive data)
- **SexualityComponent** - Attraction axes, relationship styles (comprehensive)
- **MatingParadigmRegistry** - 12+ species paradigms (comprehensive)

### What Needs Work

Only the **compatibility calculation** functions have stubs/placeholders. These are:
- Not broken (they return sensible defaults)
- Just oversimplified (don't check actual component data)
- Easy to fix (just need to read from existing components)

### Test Coverage

Tests exist for:
- CourtshipCompatibility
- CourtshipStateMachine
- CourtshipSystem (testing components, not a dedicated system)

No tests found for:
- MidwiferySystem
- ParasiticReproductionSystem
- ColonizationSystem

---

## Recommended Action Plan

**Phase 1 (Critical - 2-4 hours)**
1. Implement `canBecomePregnant()` to prevent impossible pregnancies
2. Implement `checkAttractionToTarget()` to respect sexual orientation

**Phase 2 (Important - 4-6 hours)**
3. Wire health/fertility modifiers to BodyComponent/NeedsComponent
4. Wire age-based fertility curves (species-specific)
5. Implement `checkAttractionConditionsMet()` for all condition types

**Phase 3 (Nice-to-have - 2-3 hours)**
6. Wire social factors to RelationshipComponent
7. Wire magical factors to magic system components
8. Add tests for MidwiferySystem, ParasiticReproductionSystem

**Total Estimated Effort**: 8-13 hours to complete all placeholders

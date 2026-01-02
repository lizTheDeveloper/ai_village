# WORK ORDER: Magic System Paradigm Implementations

**Timestamp:** 2026-01-01 15:24:18 UTC
**Feature:** magic-paradigm-implementations
**Phase:** Phase 30
**Priority:** MEDIUM - Framework exists, needs paradigm content
**Status:** OPEN

---

## Current State

Phase 30 (Magic System) has framework implemented but is missing paradigm implementations.

**Existing:**
- ✅ MagicComponent - Stores mana, spells, paradigms
- ✅ MagicSystem - Processes spell casting, mana regeneration
- ✅ Spell composition system (verb + noun)
- ✅ Basic effect appliers (BodyHealingEffectApplier, BodyTransformEffectApplier)

**Missing:**
- ⏳ Paradigm implementations (Academic, Whimsical, Blood Magic, etc.)
- ⏳ Skill tree definitions per paradigm
- ⏳ Spell combos and interactions
- ⏳ Advanced effect appliers
- ⏳ Magic skill progression system

---

## Spec Reference

**Primary Spec:** `custom_game_engine/architecture/MAGIC_SKILL_TREE_SPEC.md`

**Related Specs:**
- `openspec/specs/magic-system/` - Phase 30 specifications
- `custom_game_engine/architecture/DIVINE_PROGRESSION_SPEC.md` - Soul-magic interactions

---

## Paradigm Definitions Needed

### 1. Academic Paradigm (Wizard/Scholar)
- **Philosophy:** Knowledge is power, study and precision
- **Mana Source:** Study, meditation, libraries
- **Spell Types:** Force, Light, Transmutation, Enchantment
- **Skill Tree:** Research → Theory → Mastery → Innovation
- **Constraints:** Must study spell before casting, high mana cost

### 2. Whimsical Paradigm (Trickster/Fae)
- **Philosophy:** Reality is suggestion, chaos over order
- **Mana Source:** Pranks, laughter, impossible events
- **Spell Types:** Illusion, Transmutation, Chaos, Teleportation
- **Skill Tree:** Mischief → Creativity → Impossibility → Reality-Bending
- **Constraints:** Unpredictable side effects, requires joy/playfulness

### 3. Blood Magic Paradigm (Forbidden/Dark)
- **Philosophy:** Power through sacrifice
- **Mana Source:** HP sacrifice, life force, death
- **Spell Types:** Necromancy, Curses, Life Drain, Summoning
- **Skill Tree:** Sacrifice → Mastery → Lichdom → Godhood
- **Constraints:** HP cost, karma penalty, corruption

### 4. Emotional Paradigm (Empath/Bard)
- **Philosophy:** Emotion is energy
- **Mana Source:** Strong emotions (joy, sorrow, love, rage)
- **Spell Types:** Charm, Fear, Courage, Healing
- **Skill Tree:** Empathy → Expression → Resonance → Transcendence
- **Constraints:** Requires emotional state, affects caster

### 5. Animist Paradigm (Shaman/Druid)
- **Philosophy:** All things have spirits
- **Mana Source:** Nature, spirits, elements
- **Spell Types:** Nature, Shapeshifting, Spirit Summoning, Elements
- **Skill Tree:** Communion → Harmony → Wildshape → One-With-All
- **Constraints:** Requires natural location, spirit favors

---

## Implementation Tasks

### Phase 1: Paradigm Definitions (~800 LOC)
- [ ] Create `packages/core/src/magic/paradigms/AcademicParadigm.ts`
- [ ] Create `packages/core/src/magic/paradigms/WhimsicalParadigm.ts`
- [ ] Create `packages/core/src/magic/paradigms/BloodMagicParadigm.ts`
- [ ] Create `packages/core/src/magic/paradigms/EmotionalParadigm.ts`
- [ ] Create `packages/core/src/magic/paradigms/AnimistParadigm.ts`
- [ ] Create paradigm registry and loader

### Phase 2: Skill Trees (~600 LOC)
- [ ] Define skill tree structure (nodes, prerequisites, unlocks)
- [ ] Implement skill progression tracking
- [ ] Add skill-gated spell unlocking
- [ ] Create skill tree UI data structures

### Phase 3: Spell Combos (~400 LOC)
- [ ] Define spell combo system (verb + noun → effect)
- [ ] Implement combo detection in spell casting
- [ ] Add synergy bonuses for matching paradigms
- [ ] Create combo discovery system

### Phase 4: Advanced Effects (~500 LOC)
- [ ] Create effect appliers for each paradigm
- [ ] Implement paradigm-specific constraints (HP cost, emotional state, etc.)
- [ ] Add side effects and karma tracking
- [ ] Implement corruption system for Blood Magic

### Phase 5: Tests (~800 LOC)
- [ ] Unit tests for each paradigm
- [ ] Integration tests for spell casting with paradigms
- [ ] Skill tree progression tests
- [ ] Combo system tests

---

## Acceptance Criteria

1. ✅ All 5 paradigms implemented with unique philosophies
2. ✅ Each paradigm has complete skill tree (4-5 tiers)
3. ✅ Spell casting respects paradigm constraints (mana source, costs)
4. ✅ Combos work (Fire + Force = Fireball, etc.)
5. ✅ Skill progression unlocks new spells
6. ✅ Side effects apply (Blood Magic costs HP, Whimsical has chaos)
7. ✅ Tests verify each paradigm's unique mechanics

---

## Files to Create

### Paradigm Definitions
- `packages/core/src/magic/paradigms/AcademicParadigm.ts`
- `packages/core/src/magic/paradigms/WhimsicalParadigm.ts`
- `packages/core/src/magic/paradigms/BloodMagicParadigm.ts`
- `packages/core/src/magic/paradigms/EmotionalParadigm.ts`
- `packages/core/src/magic/paradigms/AnimistParadigm.ts`
- `packages/core/src/magic/paradigms/index.ts`

### Skill Trees
- `packages/core/src/magic/skillTrees/SkillTreeDefinition.ts`
- `packages/core/src/magic/skillTrees/AcademicSkillTree.ts`
- `packages/core/src/magic/skillTrees/WhimsicalSkillTree.ts`
- (etc. for each paradigm)

### Combos
- `packages/core/src/magic/combos/ComboRegistry.ts`
- `packages/core/src/magic/combos/SpellCombo.ts`

### Tests
- `packages/core/src/__tests__/MagicParadigms.test.ts`
- `packages/core/src/__tests__/MagicSkillTrees.test.ts`
- `packages/core/src/__tests__/MagicCombos.test.ts`

---

## Estimated Effort

**Total LOC:** ~3,100 lines
**Difficulty:** HIGH (complex system with many interactions)
**Time Estimate:** 2-3 sessions

---

## Dependencies

All dependencies met ✅:
- Phase 29 (Item System) - Complete
- Magic framework (MagicComponent, MagicSystem) - Complete
- Phase 35 (Soul System) - Complete (for soul-magic interactions)

---

**Ready for implementation agent to claim and begin work.**

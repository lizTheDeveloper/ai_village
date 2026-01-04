# Proposal: Work Order: Magic System Paradigm Implementation

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/magic-paradigm-implementation

---

## Original Work Order

# Work Order: Magic System Paradigm Implementation

**Phase:** 30 (Magic System)
**Created:** 2026-01-02
**Status:** READY_FOR_IMPLEMENTATION
**Priority:** HIGH

---

## Spec Reference

- **Primary Spec:** [custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md](../../../../custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md) (Part 2)
- **Related Systems:**
  - MagicComponent (exists)
  - MagicSystem (exists)
  - SkillsComponent (magic skill)
  - EffectExpression system (Phase 30)

---

## Context

The Magic System **framework exists** (MagicComponent, ManaComponent, MagicSystem) but is **only ~30% complete**. Basic spell casting infrastructure is in place, but the core paradigm system is missing.

**Current Status:**
- ✅ MagicComponent and ManaComponent exist
- ✅ Basic spell casting infrastructure
- ✅ Multiple paradigm types defined in spec
- ❌ Multi-source magic not implemented
- ❌ Verb/Noun (Technique/Form) composition incomplete
- ❌ Magic skill trees missing
- ❌ Combo system not implemented
- ❌ Creative paradigms (Art, Dream, Music) not implemented

---

## Requirements Summary

### Feature 1: Magic Sources (Multi-Paradigm Foundation)
Different magic systems with unique rules and costs:
1. **Arcane Magic** - Mana-based, learned spells, intellectual
2. **Divine Magic** - Faith-based, prayer/ritual, connection to deity
3. **Void Magic** - Health/sanity cost, forbidden knowledge, corruption risk
4. **Blood Magic** - Health sacrifice, ritual power, transformation
5. **Emotion Magic** - Feeling-powered, unstable, empathy-based
6. **Star Magic** - Celestial alignment, time-of-day effects, astronomy

### Feature 2: Technique/Form Composition (Ars Magica Style)
Spells composed from verbs (techniques) and nouns (forms):

**Techniques (Verbs):**
- Create, Perceive, Transform, Control, Destroy, Ward, Channel, Bind

**Forms (Nouns):**
- Fire, Water, Air, Earth, Mind, Body, Void, Energy, Life, Death

**Examples:**
- Create + Fire = Fireball
- Ward + Mind = Mental Shield
- Transform + Body = Polymorph
- Perceive + Void = Detect Magic

### Feature 3: Spell Discovery System
Agents learn spells through experimentation:
1. Agents with magic skill can experiment
2. Combine technique + form = discovered spell
3. Track per-agent spell knowledge
4. More experiments = better success rate
5. Failed experiments cost mana/health

### Feature 4: Magic Skill Trees
Progressive skill unlocks tied to magic source:
1. Novice (0-2): Basic single-element spells
2. Apprentice (3-5): Dual-element combos
3. Adept (6-8): Complex multi-form spells
4. Master (9-10): Paradigm-specific ultimate spells

---

## Acceptance Criteria

### Criterion 1: MagicSource Registry
- **WHEN:** The system initializes
- **THEN:** The system SHALL:
  1. Define MagicSource interface with: id, name, costType, requirements
  2. Create MagicSourceRegistry to store all sources
  3. Register at least 3 initial sources (Arcane, Divine, Void)
  4. Support paradigm-specific restrictions (e.g., Divine requires faith)
  5. Track source-specific modifiers (e.g., Star magic stronger at night)
- **Verification:**
  - MagicSourceRegistry contains Arcane, Divine, Void sources
  - Each source has unique costType (mana, faith, health)
  - Can query source by ID
  - Can list all available sources

### Criterion 2: Technique and Form Enums
- **WHEN:** Defining spell compositions
- **THEN:** The system SHALL:
  1. Define Technique enum with 8 verbs (Create, Perceive, Transform, etc.)
  2. Define Form enum with 10+ nouns (Fire, Water, Mind, Void, etc.)
  3. Support querying all techniques and forms
  4. Validate technique/form combinations
- **Verification:**
  - Technique.Create, Technique.Perceive, etc. exist
  - Form.Fire, Form.Water, Form.Mind, etc. exist
  - Can iterate all techniques and forms
  - Type-safe composition: `{technique: Technique.Create, form: Form.Fire}`

### Criterion 3: ComposedSpell Interface
- **WHEN:** An agent creates a spell
- **THEN:** The system SHALL:
  1. Support ComposedSpell with technique + form + source
  2. Calculate spell power from skill + source affinity
  3. Calculate cost based on source costType
  4. Generate spell name (e.g., "Arcane Fireball", "Divine Ward of Mind")
  5. Track spell discovery in agent's spell knowledge
- **Verification:**
  - Create spell: `{technique: Create, form: Fire, source: Arcane}`
  - Name generated: "Arcane Fireball"
  - Cost calculated: manaCost = baseCost × (1 + complexity)
  - Agent's known spells updated

### Criterion 4: Arcane Magic Source
- **WHEN:** An agent uses Arcane magic
- **THEN:** The system SHALL:
  1. Cost mana from ManaComponent
  2. Scale power with magic skill
  3. Allow learning any technique/form combination
  4. Support spell books (written spell knowledge)
- **Verification:**
  - Agent casts Arcane Fireball: mana -= 20
  - Magic skill 5 → spell power 15
  - Agent can learn spell from spell book item
  - Mana regenerates over time

### Criterion 5: Divine Magic Source
- **WHEN:** An agent uses Divine magic
- **THEN:** The system SHALL:
  1. Cost faith from SpiritualComponent
  2. Require deity connection (BeliefComponent)
  3. Restrict to deity-aligned techniques/forms
  4. Scale power with faith level
- **Verification:**
  - Agent with faith 80 casts Divine Heal: faith -= 10
  - Agent without deity connection cannot cast Divine spells
  - Deity of Life allows healing, not destruction
  - Faith regenerates through prayer

### Criterion 6: Void Magic Source
- **WHEN:** An agent uses Void magic
- **THEN:** The system SHALL:
  1. Cost health from NeedsComponent
  2. Risk corruption/sanity loss
  3. Provide powerful but dangerous effects
  4. No faith or mana requirement
- **Verification:**
  - Agent casts Void Bolt: health -= 15
  - 10% chance of corruption effect
  - More powerful than equivalent mana spell
  - Can be cast even at low health (risky)

### Criterion 7: Spell Discovery
- **WHEN:** An agent experiments with magic
- **THEN:** The system SHALL:
  1. Allow combining technique + form + source
  2. Check if combination is valid
  3. Calculate discovery chance from magic skill
  4. Add discovered spell to agent's knowledge
  5. Cost resources on failed attempt
- **Verification:**
  - Novice (skill 2) attempts Create + Fire + Arcane
  - 40% success chance (skill-based)
  - On success: spell added to known spells
  - On failure: mana cost paid, no spell learned
  - Can retry until successful

### Criterion 8: Magic Skill Tree
- **WHEN:** An agent gains magic skill
- **THEN:** The system SHALL:
  1. Unlock techniques based on skill level
  2. Unlock complex forms at higher levels
  3. Track skill-gated spell access
  4. Provide visual feedback on unlocks
- **Verification:**
  - Skill 0-2: Only Create, Perceive, basic forms (Fire, Water)
  - Skill 3-5: Control, Transform unlocked, Mind/Body forms
  - Skill 6-8: Destroy, Ward unlocked, Void/Energy forms
  - Skill 9-10: All techniques, ultimate forms (Life, Death)

---

## Implementation Steps

1. **Define Core Types** (2-3 hours)
   - Create `packages/core/src/magic/MagicSource.ts`
   - Create `packages/core/src/magic/Technique.ts` (enum)
   - Create `packages/core/src/magic/Form.ts` (enum)
   - Create `packages/core/src/magic/ComposedSpell.ts` (interface)
   - Create `packages/core/src/magic/MagicSourceRegistry.ts`

2. **Implement Arcane Magic** (3-4 hours)
   - Define Arcane source with mana cost
   - Implement spell casting from MagicComponent
   - Add mana cost deduction
   - Test basic spell: Create + Fire (Fireball)
   - Verify mana regeneration

3. **Implement Divine Magic** (3-4 hours)
   - Define Divine source with faith cost
   - Check BeliefComponent for deity connection
   - Implement deity alignment restrictions
   - Add faith cost deduction
   - Test healing spell: Create + Life (Divine Heal)

4. **Implement Void Magic** (2-3 hours)
   - Define Void source with health cost
   - Add corruption chance calculation
   - Implement health cost deduction
   - Test destructive spell: Destroy + Mind (Mind Blast)
   - Verify corruption effects

5. **Spell Discovery System** (4-5 hours)
   - Create SpellDiscoverySystem
   - Implement experimentation action
   - Calculate success chance from skill
   - Track known spells per agent
   - Add failure consequences (resource loss)

6. **Magic Skill Tree** (3-4 hours)
   - Define skill thresholds (0-2, 3-5, 6-8, 9-10)
   - Gate techniques by skill level
   - Gate forms by skill level
   - Update LLM prompts with available spells
   - Show unlock notifications

---

## Testing Plan

### Unit Tests
- Test Technique/Form combination validation
- Test spell name generation
- Test cost calculation per source type
- Test skill-based discovery chance

### Integration Tests
- Test Arcane spell casting with mana cost
- Test Divine spell casting with faith requirement
- Test Void spell casting with health sacrifice
- Test spell discovery full workflow

### Scenario Tests
1. **Arcane Wizard**: Agent learns 5 spells, casts Fireball
2. **Divine Priest**: Agent prays, casts healing on injured ally
3. **Void Cultist**: Agent sacrifices health for powerful attack
4. **Multi-Source Mage**: Agent learns spells from multiple paradigms

---

## Performance Requirements

- **Spell Casting**: < 1ms per spell cast
- **Discovery Check**: < 0.5ms per experiment
- **Registry Lookup**: O(1) by source ID
- **Known Spells**: Hash map for fast lookup

---

## Success Metrics

1. ✅ All 8 acceptance criteria met
2. ✅ At least 3 magic sources implemented (Arcane, Divine, Void)
3. ✅ Agents can discover and cast spells
4. ✅ Skill tree gates spell access correctly
5. ✅ Performance within budget
6. ✅ Integration tests pass

---

## Dependencies

- ✅ MagicComponent (exists)
- ✅ ManaComponent (exists)
- ✅ SpiritualComponent (exists - faith system)
- ✅ BeliefComponent (exists - deity connection)
- ✅ SkillsComponent (magic skill)
- ⏳ EffectExpression system (Part 3 of spec - can be added later)

---

## Future Enhancements (Not in This Work Order)

- Blood Magic source (health sacrifice, rituals)
- Emotion Magic source (feeling-powered, unstable)
- Star Magic source (celestial alignment, astronomy)
- Music Magic paradigm (sound-based casting)
- Art Magic paradigm (painted/drawn spells)
- Dream Magic paradigm (sleep-based casting)
- Combo system (multi-technique spells)
- Spell modification (metamagic)

---

## Implementation Checklist

### Phase 1: Core Type Definitions (2-3 hours)
- [ ] Create `packages/core/src/magic/MagicSource.ts`
  - Define `MagicSource` interface (id, name, costType, requirements)
  - Define `CostType` enum (mana, faith, health, sanity, etc.)
- [ ] Create `packages/core/src/magic/Technique.ts`
  - Define `Technique` enum (Create, Perceive, Transform, Control, Destroy, Ward, Channel, Bind)
- [ ] Create `packages/core/src/magic/Form.ts`
  - Define `Form` enum (Fire, Water, Air, Earth, Mind, Body, Void, Energy, Life, Death)
- [ ] Create `packages/core/src/magic/ComposedSpell.ts`
  - Define `ComposedSpell` interface (technique, form, source, power, cost)
- [ ] Create `packages/core/src/magic/MagicSourceRegistry.ts`
  - Implement registry with `get(id)`, `register(source)`, `listAll()`
- [ ] Update `packages/core/src/index.ts` to export magic types

### Phase 2: Arcane Magic Implementation (3-4 hours)
- [ ] Register Arcane source in `MagicSourceRegistry`
  - costType: 'mana', requirements: none
- [ ] Implement spell casting in `packages/core/src/systems/MagicSystem.ts`
  - Check ManaComponent for sufficient mana
  - Deduct mana cost: `manaCost = baseCost × (1 + complexity)`
  - Apply spell effects
- [ ] Implement spell name generation
  - Pattern: `"Arcane {Technique} of {Form}"` (e.g., "Arcane Fireball")
- [ ] Test basic spell: Create + Fire (Fireball)
  - Agent with 100 mana casts Fireball (cost 20)
  - Verify mana reduced to 80
  - Verify spell effect applied
- [ ] Verify mana regeneration works (existing ManaComponent)

### Phase 3: Divine Magic Implementation (3-4 hours)
- [ ] Register Divine source in `MagicSourceRegistry`
  - costType: 'faith', requirements: BeliefComponent with deity
- [ ] Implement faith cost in MagicSystem
  - Check SpiritualComponent for sufficient faith
  - Deduct faith cost: `faithCost = baseCost × (1 + deity affinity modifier)`
- [ ] Implement deity alignment restrictions
  - Check BeliefComponent for deity
  - Verify deity allows technique/form combination
  - Example: Deity of Life allows healing, not destruction
- [ ] Test healing spell: Create + Life (Divine Heal)
  - Agent with faith 80, deity "Life Goddess"
  - Cast Divine Heal on injured ally
  - Verify faith reduced, ally healed
- [ ] Verify faith regenerates through prayer (existing SpiritualComponent)

### Phase 4: Void Magic Implementation (2-3 hours)
- [ ] Register Void source in `MagicSourceRegistry`
  - costType: 'health', requirements: none (accessible to desperate)
- [ ] Implement health sacrifice in MagicSystem
  - Deduct health from NeedsComponent
  - Health cost: `healthCost = baseCost × 1.5` (higher than mana spells)
- [ ] Implement corruption chance
  - Roll random: 10% base corruption chance
  - Apply corruption effect (sanity loss, debuff)
  - Track corruption in status effects
- [ ] Calculate power boost
  - Void spells are 1.5× more powerful than mana equivalent
- [ ] Test destructive spell: Destroy + Mind (Mind Blast)
  - Agent casts Mind Blast: health -= 15
  - 10% chance of corruption
  - Spell power 1.5× normal
  - Can be cast even at low health (risky)

### Phase 5: Spell Discovery System (4-5 hours)
- [ ] Create `packages/core/src/systems/SpellDiscoverySystem.ts`
  - System priority: 800 (runs after skill updates)
- [ ] Implement experimentation action
  - Agent action: `experiment_magic(technique, form, source)`
  - Check agent magic skill
  - Calculate success chance: `40% + (magicSkill × 10%)`
- [ ] Implement discovery logic
  - On success: Add spell to agent's known spells (MagicComponent)
  - On failure: Deduct resource cost, no spell learned
  - Track experiments in memory
- [ ] Add known spells tracking to MagicComponent
  - `knownSpells: ComposedSpell[]`
  - `discoverSpell(spell)`, `knowsSpell(technique, form, source)`
- [ ] Test experimentation workflow
  - Novice (skill 2) experiments: Create + Fire + Arcane
  - 60% success chance (40% base + 20% from skill)
  - On success: Fireball added to known spells
  - On failure: Mana cost paid, spell not learned

### Phase 6: Magic Skill Tree (3-4 hours)
- [ ] Define skill thresholds in `packages/core/src/magic/SkillGates.ts`
  - Novice (0-2): Create, Perceive | Fire, Water, Air, Earth
  - Apprentice (3-5): + Control, Transform | + Mind, Body
  - Adept (6-8): + Destroy, Ward | + Void, Energy
  - Master (9-10): + Channel, Bind | + Life, Death
- [ ] Implement skill-gated access
  - Check magic skill before allowing experiment
  - Return error if technique/form locked
- [ ] Update LLM prompts with available spells
  - Include unlocked techniques/forms in prompt context
  - Show spell discovery suggestions
- [ ] Implement unlock notifications
  - Event: `magic:skill_unlock` (technique or form unlocked)
  - Display notification in UI
- [ ] Test skill progression
  - Agent skill 0: Only Create, Perceive, basic forms
  - Agent gains skill → 3: Control, Transform unlock
  - Notification: "You've unlocked the Control technique!"

### Phase 7: Integration and Polish (2-3 hours)
- [ ] Register SpellDiscoverySystem in `registerAllSystems.ts`
- [ ] Add magic events to EventMap
  - `magic:spell_discovered`, `magic:spell_cast`, `magic:corruption`
- [ ] Update UI to show known spells
  - Display agent's spell list
  - Show locked vs unlocked techniques/forms
- [ ] Test full workflow
  - Create agent with magic skill 0
  - Experiment and discover basic spells
  - Gain skill, unlock advanced techniques
  - Cast spells using all 3 sources
- [ ] Performance check
  - Spell casting: < 1ms
  - Discovery check: < 0.5ms
  - Registry lookup: O(1)

---

## Test Requirements

### Unit Tests

**Create: `packages/core/src/magic/__tests__/MagicSourceRegistry.test.ts`**
- [ ] Test source registration and retrieval
- [ ] Test listing all sources
- [ ] Test invalid source ID returns null

**Create: `packages/core/src/magic/__tests__/ComposedSpell.test.ts`**
- [ ] Test technique/form combination validation
- [ ] Test spell name generation (Arcane, Divine, Void)
- [ ] Test cost calculation per source type
- [ ] Test skill-based discovery chance

**Create: `packages/core/src/systems/__tests__/MagicSystem.test.ts`**
- [ ] Test Arcane spell casting with mana cost
- [ ] Test Divine spell casting with faith requirement
- [ ] Test Void spell casting with health sacrifice
- [ ] Test corruption chance application
- [ ] Test spell power scaling

**Create: `packages/core/src/systems/__tests__/SpellDiscoverySystem.test.ts`**
- [ ] Test experimentation success/failure
- [ ] Test skill-based success chance
- [ ] Test spell added to known spells on success
- [ ] Test resource cost on failure

### Integration Tests

**Create: `packages/core/src/magic/__tests__/MagicIntegration.test.ts`**
- [ ] Test full Arcane spell workflow (discover → cast → mana deducted)
- [ ] Test full Divine spell workflow (faith check → cast → ally healed)
- [ ] Test full Void spell workflow (health sacrifice → cast → corruption)
- [ ] Test multi-source agent (learns spells from all 3 paradigms)
- [ ] Test skill tree progression (unlock techniques/forms)

### Manual Test Scenarios

1. **Arcane Wizard Scenario**
   - Create agent with magic skill 3
   - Experiment and discover 5 Arcane spells
   - Cast Fireball on enemy
   - Verify mana cost and damage

2. **Divine Priest Scenario**
   - Create agent with deity "Life Goddess", faith 70
   - Discover Create + Life (Divine Heal)
   - Cast healing on injured ally
   - Verify faith cost and healing effect

3. **Void Cultist Scenario**
   - Create agent with magic skill 6
   - Discover Destroy + Mind (Mind Blast)
   - Cast spell: health sacrificed
   - Verify corruption chance (may apply debuff)
   - Confirm spell is more powerful than mana equivalent

4. **Multi-Source Mage Scenario**
   - Create agent with magic skill 8
   - Learn spells from Arcane, Divine, and Void
   - Cast spells from each source
   - Verify cost deduction works for all 3
   - Check known spells list shows all paradigms

5. **Skill Progression Scenario**
   - Create agent with magic skill 0
   - Only basic techniques/forms available
   - Gain skill points through practice
   - Unlock advanced techniques at thresholds
   - Verify notifications appear

---

## Definition of Done

- [ ] **All implementation tasks complete**
  - All 3 magic sources implemented (Arcane, Divine, Void)
  - Spell discovery system functional
  - Skill tree gates working
  - All code compiles without errors

- [ ] **Unit tests passing**
  - All 4 test suites written and passing
  - Code coverage > 80% for magic systems
  - Edge cases covered (insufficient mana, locked spells, etc.)

- [ ] **Integration tests passing**
  - All 5 integration scenarios work end-to-end
  - Multi-source casting verified
  - Skill progression verified

- [ ] **Manual testing complete**
  - All 5 manual scenarios tested
  - Screenshots captured
  - Spell effects visible and balanced
  - No unexpected behaviors

- [ ] **Documentation updated**
  - ITEM_MAGIC_PERSISTENCE_SPEC.md updated with implementation notes
  - Magic system tutorial added to docs
  - Code comments explain complex formulas

- [ ] **No TypeScript errors**
  - `npm run build` passes with zero errors
  - All magic types properly exported
  - No `any` types introduced

- [ ] **Performance validated**
  - Spell casting: < 1ms per cast
  - Discovery check: < 0.5ms per experiment
  - Registry lookup: O(1) by source ID
  - Dashboard shows magic metrics

- [ ] **Balance verification**
  - Arcane spells feel reliable and learned
  - Divine spells feel faith-based and supportive
  - Void spells feel powerful but risky
  - No source is clearly superior

---

## Pre-Test Checklist (N/A - Status: READY_FOR_IMPLEMENTATION)

_This section applies only to READY_FOR_TESTS status._

---

## Notes

- Start with 3 core sources (Arcane, Divine, Void)
- Keep it simple initially - complexity can be added iteratively
- Ensure each source feels mechanically distinct
- Arcane = reliable, mana-based, learned
- Divine = faith-based, deity-restricted, supportive
- Void = powerful, risky, health-sacrifice
- Future work orders can add creative paradigms (Music, Art, Dream)


---

## Requirements

### Requirement: [To be defined]

The system SHALL [requirement description].

#### Scenario: [Scenario name]

- WHEN [condition]
- THEN [expected result]

## Definition of Done

- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated

# Tasks: magic-paradigm-implementation

## Overview
Implement the multi-paradigm magic system with spell composition from techniques (verbs) and forms (nouns), spell discovery, and magic skill trees.

**Estimated Effort:** 18-25 hours | **Phase:** 30 (Magic System)

## Phase 1: Core Type Definitions (2-3 hours)

- [ ] Create `packages/core/src/magic/MagicSource.ts`
  - [ ] Define `MagicSource` interface (id, name, costType, requirements)
  - [ ] Define `CostType` enum (mana, faith, health, sanity, etc.)
- [ ] Create `packages/core/src/magic/Technique.ts`
  - [ ] Define `Technique` enum (Create, Perceive, Transform, Control, Destroy, Ward, Channel, Bind)
- [ ] Create `packages/core/src/magic/Form.ts`
  - [ ] Define `Form` enum (Fire, Water, Air, Earth, Mind, Body, Void, Energy, Life, Death)
- [ ] Create `packages/core/src/magic/ComposedSpell.ts`
  - [ ] Define `ComposedSpell` interface (technique, form, source, power, cost)
- [ ] Create `packages/core/src/magic/MagicSourceRegistry.ts`
  - [ ] Implement registry with `get(id)`, `register(source)`, `listAll()`
- [ ] Update `packages/core/src/index.ts` to export magic types

## Phase 2: Arcane Magic Implementation (3-4 hours)

- [ ] Register Arcane source in `MagicSourceRegistry`
  - [ ] costType: 'mana', requirements: none
- [ ] Implement spell casting in `packages/core/src/systems/MagicSystem.ts`
  - [ ] Check ManaComponent for sufficient mana
  - [ ] Deduct mana cost: `manaCost = baseCost x (1 + complexity)`
  - [ ] Apply spell effects
- [ ] Implement spell name generation
  - [ ] Pattern: `"Arcane {Technique} of {Form}"` (e.g., "Arcane Fireball")
- [ ] Test basic spell: Create + Fire (Fireball)
  - [ ] Agent with 100 mana casts Fireball (cost 20)
  - [ ] Verify mana reduced to 80
  - [ ] Verify spell effect applied
- [ ] Verify mana regeneration works (existing ManaComponent)

## Phase 3: Divine Magic Implementation (3-4 hours)

- [ ] Register Divine source in `MagicSourceRegistry`
  - [ ] costType: 'faith', requirements: BeliefComponent with deity
- [ ] Implement faith cost in MagicSystem
  - [ ] Check SpiritualComponent for sufficient faith
  - [ ] Deduct faith cost: `faithCost = baseCost x (1 + deity affinity modifier)`
- [ ] Implement deity alignment restrictions
  - [ ] Check BeliefComponent for deity
  - [ ] Verify deity allows technique/form combination
  - [ ] Example: Deity of Life allows healing, not destruction
- [ ] Test healing spell: Create + Life (Divine Heal)
  - [ ] Agent with faith 80, deity "Life Goddess"
  - [ ] Cast Divine Heal on injured ally
  - [ ] Verify faith reduced, ally healed
- [ ] Verify faith regenerates through prayer (existing SpiritualComponent)

## Phase 4: Void Magic Implementation (2-3 hours)

- [ ] Register Void source in `MagicSourceRegistry`
  - [ ] costType: 'health', requirements: none (accessible to desperate)
- [ ] Implement health sacrifice in MagicSystem
  - [ ] Deduct health from NeedsComponent
  - [ ] Health cost: `healthCost = baseCost x 1.5` (higher than mana spells)
- [ ] Implement corruption chance
  - [ ] Roll random: 10% base corruption chance
  - [ ] Apply corruption effect (sanity loss, debuff)
  - [ ] Track corruption in status effects
- [ ] Calculate power boost
  - [ ] Void spells are 1.5x more powerful than mana equivalent
- [ ] Test destructive spell: Destroy + Mind (Mind Blast)
  - [ ] Agent casts Mind Blast: health -= 15
  - [ ] 10% chance of corruption
  - [ ] Spell power 1.5x normal
  - [ ] Can be cast even at low health (risky)

## Phase 5: Spell Discovery System (4-5 hours)

- [ ] Create `packages/core/src/systems/SpellDiscoverySystem.ts`
  - [ ] System priority: 800 (runs after skill updates)
- [ ] Implement experimentation action
  - [ ] Agent action: `experiment_magic(technique, form, source)`
  - [ ] Check agent magic skill
  - [ ] Calculate success chance: `40% + (magicSkill x 10%)`
- [ ] Implement discovery logic
  - [ ] On success: Add spell to agent's known spells (MagicComponent)
  - [ ] On failure: Deduct resource cost, no spell learned
  - [ ] Track experiments in memory
- [ ] Add known spells tracking to MagicComponent
  - [ ] `knownSpells: ComposedSpell[]`
  - [ ] `discoverSpell(spell)`, `knowsSpell(technique, form, source)`
- [ ] Test experimentation workflow
  - [ ] Novice (skill 2) experiments: Create + Fire + Arcane
  - [ ] 60% success chance (40% base + 20% from skill)
  - [ ] On success: Fireball added to known spells
  - [ ] On failure: Mana cost paid, spell not learned

## Phase 6: Magic Skill Tree (3-4 hours)

- [ ] Define skill thresholds in `packages/core/src/magic/SkillGates.ts`
  - [ ] Novice (0-2): Create, Perceive | Fire, Water, Air, Earth
  - [ ] Apprentice (3-5): + Control, Transform | + Mind, Body
  - [ ] Adept (6-8): + Destroy, Ward | + Void, Energy
  - [ ] Master (9-10): + Channel, Bind | + Life, Death
- [ ] Implement skill-gated access
  - [ ] Check magic skill before allowing experiment
  - [ ] Return error if technique/form locked
- [ ] Update LLM prompts with available spells
  - [ ] Include unlocked techniques/forms in prompt context
  - [ ] Show spell discovery suggestions
- [ ] Implement unlock notifications
  - [ ] Event: `magic:skill_unlock` (technique or form unlocked)
  - [ ] Display notification in UI
- [ ] Test skill progression
  - [ ] Agent skill 0: Only Create, Perceive, basic forms
  - [ ] Agent gains skill -> 3: Control, Transform unlock
  - [ ] Notification: "You've unlocked the Control technique!"

## Phase 7: Integration and Polish (2-3 hours)

- [ ] Register SpellDiscoverySystem in `registerAllSystems.ts`
- [ ] Add magic events to EventMap
  - [ ] `magic:spell_discovered`, `magic:spell_cast`, `magic:corruption`
- [ ] Update UI to show known spells
  - [ ] Display agent's spell list
  - [ ] Show locked vs unlocked techniques/forms
- [ ] Test full workflow
  - [ ] Create agent with magic skill 0
  - [ ] Experiment and discover basic spells
  - [ ] Gain skill, unlock advanced techniques
  - [ ] Cast spells using all 3 sources
- [ ] Performance check
  - [ ] Spell casting: < 1ms
  - [ ] Discovery check: < 0.5ms
  - [ ] Registry lookup: O(1)

## Testing

### Unit Tests
- [ ] Test source registration and retrieval
- [ ] Test listing all sources
- [ ] Test invalid source ID returns null
- [ ] Test technique/form combination validation
- [ ] Test spell name generation (Arcane, Divine, Void)
- [ ] Test cost calculation per source type
- [ ] Test skill-based discovery chance

### Integration Tests
- [ ] Test Arcane spell casting with mana cost
- [ ] Test Divine spell casting with faith requirement
- [ ] Test Void spell casting with health sacrifice
- [ ] Test corruption chance application
- [ ] Test spell power scaling
- [ ] Test full Arcane spell workflow (discover -> cast -> mana deducted)
- [ ] Test full Divine spell workflow (faith check -> cast -> ally healed)
- [ ] Test full Void spell workflow (health sacrifice -> cast -> corruption)
- [ ] Test multi-source agent (learns spells from all 3 paradigms)
- [ ] Test skill tree progression (unlock techniques/forms)

### Manual Test Scenarios
- [ ] Arcane Wizard: Agent learns 5 spells, casts Fireball
- [ ] Divine Priest: Agent prays, casts healing on injured ally
- [ ] Void Cultist: Agent sacrifices health for powerful attack
- [ ] Multi-Source Mage: Agent learns spells from multiple paradigms
- [ ] Skill Progression: Agent with skill 0 unlocks advanced techniques

### Performance Tests
- [ ] Spell casting: < 1ms per cast
- [ ] Discovery check: < 0.5ms per experiment
- [ ] Registry lookup: O(1) by source ID
- [ ] Known spells lookup: O(1) by hash

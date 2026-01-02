# Work Order: Equipment & Combat Integration (Magical Bonuses + Hero Protection)

**Phase:** Phase 36 (Equipment System) - Combat Integration
**Created:** 2026-01-01
**Spec Agent:** spec-agent-001
**Status:** PENDING_IMPLEMENTATION

**Note:** Basic Equipment System exists (EquipmentComponent, EquipmentSystem, ArmorTrait, ClothingTrait) but combat integration features have NOT been implemented yet. This work order is ready for an implementation agent to pick up.

---

## Spec Reference

- **Primary Spec:** `custom_game_engine/architecture/EQUIPMENT_COMBAT_SPEC.md`
- **Related Specs:**
  - `openspec/specs/equipment-system/spec.md` (Phase 36)
  - `openspec/specs/conflict-system/spec.md` (Phase 7)
  - `custom_game_engine/architecture/DIVINE_PROGRESSION_SPEC.md` (Soul system)
- **Dependencies:**
  - Phase 29 (Item System Refactor) ✅ Complete
  - Phase 7 (Conflict System) ✅ Complete
  - Phase 35 (Soul System) ✅ Complete

---

## Requirements Summary

Extracted from `EQUIPMENT_COMBAT_SPEC.md`:

### Feature 1: Magical Skill Modifiers
1. The system SHALL create a `StatBonusTrait` interface for items that boost skills/stats
2. The system SHALL add `skillModifiers` field to `EquipmentComponent.cached`
3. The system SHALL calculate total skill bonuses from all equipped items in `EquipmentSystem`
4. The system SHALL apply magical skill bonuses to combat power in `AgentCombatSystem`
5. The system SHALL support multiple skill types (combat, crafting, farming, cooking, etc.)
6. The system SHALL allow negative skill modifiers for cursed items
7. The system SHALL stack bonuses from multiple equipped items

### Feature 2: Hero Protection (Narrative Magic)
1. The system SHALL provide luck modifiers to souls with destiny
2. The system SHALL calculate luck based on `cosmicAlignment` and `destiny` fields
3. The system SHALL apply luck modifiers to combat roll outcomes
4. The system SHALL provide death resistance for heroes with strong destiny
5. The system SHALL remove protection once `destinyRealized = true`
6. The system SHALL support cursed souls with negative luck (anti-luck)
7. The system SHALL emit `combat:destiny_intervention` events for storytelling

---

## Acceptance Criteria

### Criterion 1: Magical Skill Bonuses Calculated
- **WHEN:** Agent equips item with `StatBonusTrait.skillModifiers`
- **THEN:** `EquipmentComponent.cached.skillModifiers` SHALL update with total bonuses
- **Verification:**
  - Equip Ring of Combat Mastery (+5 combat)
  - Check `cached.skillModifiers.combat === 5`
  - Equip Gloves of Dexterity (+3 combat)
  - Check `cached.skillModifiers.combat === 8` (stacked)

### Criterion 2: Skill Bonuses Applied to Combat
- **WHEN:** Agent with magical skill bonuses enters combat
- **THEN:** Combat power SHALL include bonuses in skill calculation
- **Verification:**
  - Novice (skill 2) + Ring (+5) = effective skill 7
  - Combat power = (7 × 3) + equipment = ~25 power
  - Test win rate vs skill 5 opponent

### Criterion 3: Negative Skill Modifiers Work
- **WHEN:** Agent equips cursed item with negative modifiers
- **THEN:** Skills SHALL be penalized appropriately
- **Verification:**
  - Equip Cursed Berserker Helm (+10 combat, -5 social)
  - Check combat skill increased
  - Check social interactions penalized

### Criterion 4: Destiny Luck Modifier Calculated
- **WHEN:** Agent has soul with `destiny` field set and `destinyRealized = false`
- **THEN:** Luck modifier SHALL be calculated as `0.10 × cosmicAlignment`
- **Verification:**
  - Blessed hero (alignment +0.8, has destiny) → +0.08 luck
  - Neutral hero (alignment 0, has destiny) → 0 luck
  - Cursed soul (alignment -1.0, has destiny) → -0.10 luck

### Criterion 5: Destiny Luck Applied to Combat Rolls
- **WHEN:** Combat outcome rolled between agents with destiny
- **THEN:** Win chance SHALL be modified by `attackerLuck - defenderLuck`
- **Verification:**
  - Equal power opponents, hero has +0.08 luck
  - Hero win rate should be ~58% (50% + 8%)
  - Run 1000 simulations to verify

### Criterion 6: Death Protection Works
- **WHEN:** Hero with destiny faces instant death (power diff >20)
- **THEN:** Death threshold SHALL increase by `destinyLuck × 50`
- **VERIFICATION:**
  - Hero with +0.2 luck, power diff 25
  - Death threshold = 20 + (0.2 × 50) = 30
  - Hero should survive with severe injury, not instant death

### Criterion 7: Destiny Protection Fades
- **WHEN:** Soul has `destinyRealized = true`
- **THEN:** Luck modifier SHALL be 0 (no protection)
- **Verification:**
  - Set `destinyRealized = true`
  - Check `getDestinyLuckModifier()` returns 0
  - Combat should proceed without luck modifiers

### Criterion 8: Cursed Soul Anti-Luck
- **WHEN:** Soul has negative `cosmicAlignment` and destiny
- **THEN:** Cursed soul SHALL have negative luck (lose more often)
- **Verification:**
  - Cursed soul (alignment -1.0) vs equal opponent
  - Should have ~40% win rate (50% - 10%)

### Criterion 9: Destiny Intervention Events Emitted
- **WHEN:** Destiny affects combat outcome (survival, luck)
- **THEN:** `combat:destiny_intervention` event SHALL be emitted
- **Verification:**
  - Listen for event
  - Check includes: agentId, destiny, luckModifier, narrative

---

## System Integration

### Existing Systems Affected
| System | File | Integration Type |
|--------|------|-----------------|
| EquipmentSystem | `packages/core/src/systems/EquipmentSystem.ts` | Add skill modifier calculation |
| AgentCombatSystem | `packages/core/src/systems/AgentCombatSystem.ts` | Apply bonuses and luck to combat |
| EventBus | `packages/core/src/events/EventBus.ts` | Emit destiny intervention events |

### New Components/Traits Needed
- `StatBonusTrait` - Interface for skill/stat bonus items
- `EquipmentComponent.cached.skillModifiers` - Field to track total bonuses
- `EquipmentComponent.cached.statModifiers` - Optional future expansion

### Existing Components Modified
- `EquipmentComponent` - Add cached skill/stat modifiers
- `SoulIdentityComponent` - Already has destiny, cosmicAlignment (no changes)
- `SoulLinkComponent` - Already links agent to soul (no changes)

### Events
- **Emits:**
  - `combat:destiny_intervention` - When destiny affects combat
- **Listens:** (none - these are pure calculation features)

---

## Implementation Plan

### Phase 1: Magical Skill Bonuses (Core Feature)

1. **Create StatBonusTrait Interface**
   - File: `packages/core/src/items/traits/StatBonusTrait.ts`
   - Fields: `skillModifiers`, `statModifiers`, `duration`, `charges`

2. **Extend EquipmentComponent**
   - File: `packages/core/src/components/EquipmentComponent.ts`
   - Add: `cached.skillModifiers: Record<string, number>`
   - Add: `cached.statModifiers?: Record<string, number>`

3. **Calculate Skill Bonuses in EquipmentSystem**
   - File: `packages/core/src/systems/EquipmentSystem.ts`
   - Add method: `calculateSkillModifiers(equipment: EquipmentComponent)`
   - Iterate all equipped items, sum skill bonuses
   - Update `cached.skillModifiers` on equipment changes

4. **Apply Bonuses in AgentCombatSystem**
   - File: `packages/core/src/systems/AgentCombatSystem.ts`
   - In `calculateCombatPower()`: add equipment skill bonuses to base skill
   - Track modifier in combat results for debugging

5. **Create Example Magical Items**
   - File: `packages/core/src/items/equipment/magical.ts` (new file)
   - Ring of Combat Mastery (+5 combat)
   - Gloves of Dexterity (+3 combat, +2 crafting)
   - Cursed Berserker Helm (+10 combat, -5 social)
   - Scholar's Spectacles (+5 research, +3 magic)

6. **Write Tests**
   - File: `packages/core/src/__tests__/MagicalSkillBonuses.test.ts`
   - Test skill calculation
   - Test stacking bonuses
   - Test combat integration
   - Test negative modifiers

### Phase 2: Hero Protection (Destiny Luck)

1. **Create Destiny Luck Helper**
   - File: `packages/core/src/systems/AgentCombatSystem.ts`
   - Add method: `getDestinyLuckModifier(world: World, agentId: string): number`
   - Fetch SoulLinkComponent → SoulIdentityComponent
   - Calculate: `0.10 × cosmicAlignment` (if has destiny and not realized)
   - Return 0 if no destiny or destiny realized

2. **Apply Luck to Combat Rolls**
   - File: `packages/core/src/systems/AgentCombatSystem.ts`
   - In `rollOutcome()`: calculate luck for both attacker and defender
   - Modify win chance: `attackerWinChance += attackerLuck - defenderLuck`
   - Clamp to [0.05, 0.95] range

3. **Add Death Protection**
   - File: `packages/core/src/systems/AgentCombatSystem.ts`
   - In `applyInjuries()`: check for instant death scenarios
   - Calculate death threshold: `20 + (destinyLuck × 50)`
   - Apply severe injury instead of death if protected

4. **Emit Destiny Intervention Events**
   - File: `packages/core/src/systems/AgentCombatSystem.ts`
   - Emit `combat:destiny_intervention` when:
     - Luck affects outcome
     - Death protection triggers
   - Include: agentId, destiny string, luckModifier, survived flag, narrative

5. **Write Tests**
   - File: `packages/core/src/__tests__/HeroProtection.test.ts`
   - Test blessed hero luck (+8%)
   - Test cursed soul anti-luck (-10%)
   - Test destiny protection fades
   - Test death resistance
   - Run 1000-iteration simulations for win rate verification

### Phase 3: Balance Testing & Validation

1. **Combat Simulations**
   - Run simulations with various skill/equipment combinations
   - Verify magical items provide advantage but don't break balance
   - Verify heroes are luckier but not invincible

2. **Edge Case Testing**
   - Multiple skill bonuses stacking
   - Negative skill modifiers
   - Destiny realized mid-combat
   - Cursed souls in combat
   - Heroes with weak destiny (low alignment)

3. **Event Integration Verification**
   - Verify destiny intervention events fire correctly
   - Verify events contain correct data
   - Test event listeners (for future storytelling features)

---

## Files Likely Modified

### Core Systems
- `packages/core/src/systems/EquipmentSystem.ts` - Calculate skill/stat bonuses
- `packages/core/src/systems/AgentCombatSystem.ts` - Apply bonuses and luck

### Components
- `packages/core/src/components/EquipmentComponent.ts` - Add cached modifiers

### Item Traits (NEW)
- `packages/core/src/items/traits/StatBonusTrait.ts` - NEW trait interface
- `packages/core/src/items/traits/index.ts` - Export StatBonusTrait

### Item Definitions (NEW)
- `packages/core/src/items/equipment/magical.ts` - NEW magical item definitions

### Tests (NEW)
- `packages/core/src/__tests__/MagicalSkillBonuses.test.ts` - NEW
- `packages/core/src/__tests__/HeroProtection.test.ts` - NEW
- `packages/core/src/__tests__/EquipmentCombatIntegration.integration.test.ts` - NEW

### Event Types
- `packages/core/src/events/EventMap.ts` - Add `combat:destiny_intervention` type

---

## Notes for Implementation Agent

### Special Considerations

1. **No Silent Fallbacks**: Per project guidelines
   - Throw if SoulLinkComponent missing when expected
   - Throw if EquipmentComponent doesn't exist
   - No default values for missing skill modifiers

2. **Skill Modifier Calculation Performance**
   - Cache skill modifiers in `EquipmentComponent.cached`
   - Only recalculate when equipment changes
   - Don't recalculate every combat tick

3. **Destiny Luck Balance**
   - Max luck modifier is ±20% (±0.2)
   - This affects win chance, not guaranteed victory
   - Heroes are luckier, not invincible

4. **Cursed Souls Are Important**
   - Negative luck creates anti-heroes
   - They should suffer more in combat
   - This is narratively interesting, not a bug

5. **Existing Code Integration**
   - `AgentCombatSystem` already exists with combat formula
   - Must preserve existing balance (skill × 3, equipment × 0.4)
   - Skill bonuses add to skill BEFORE scaling

6. **Testing Strategy**
   - Unit tests for calculation logic
   - Integration tests for combat outcomes
   - Statistical tests (run 1000 combats) for win rates
   - Balance verification (skilled unarmored beats armored novice)

### Gotchas

- **Skill scaling order matters**: Add magical bonuses to base skill BEFORE multiplying by 3
- **Luck is clamped**: Final win chance must stay in [0.05, 0.95] range
- **Destiny completion**: Protection must disappear when `destinyRealized = true`
- **Equipment changes**: Must trigger recalculation of skill modifiers

### Balance Examples (From Spec)

**Example 1: Novice with Ring of Combat Mastery**
- Base skill: 2
- Ring bonus: +5
- Effective skill: 7
- Power: (7 × 3) + (10 × 0.4) = 25 power
- vs Skilled fighter (skill 10): 34 power
- **Skilled fighter still wins, but it's closer!** ✓

**Example 2: Blessed Hero vs Skilled Fighter**
- Hero (skill 5, alignment +0.8, has destiny): 19 power + 0.08 luck
- Fighter (skill 10, no destiny): 34 power + 0 luck
- Base win rate: ~18%
- With luck: ~26%
- **Hero has better survival, fighter still favored** ✓

**Example 3: Cursed Soul Anti-Luck**
- Cursed (skill 8, alignment -1.0, has destiny): 28 power - 0.10 luck
- Normal (skill 8, no destiny): 28 power + 0 luck
- Base: 50% each
- With anti-luck: Cursed ~40%, Normal ~60%
- **Cursed souls suffer!** ✓

---

## Notes for Test Agent

### Test Requirements

1. **Unit Tests**
   - `StatBonusTrait` interface usage
   - Skill modifier calculation
   - Stacking multiple bonuses
   - Negative modifiers
   - Destiny luck calculation
   - Death protection threshold calculation

2. **Integration Tests**
   - Equip item with skill bonus → combat power increases
   - Multiple items → bonuses stack
   - Blessed hero → wins more often
   - Cursed soul → loses more often
   - Destiny realized → luck disappears

3. **Statistical Tests**
   - Run 1000 combats with equal opponents
   - Verify win rates match expected (50% ± luck)
   - Run 1000 combats with blessed hero
   - Verify ~58% win rate (50% + 8%)

4. **Edge Cases**
   - Soul with destiny but alignment 0 → no luck
   - Soul without destiny → no luck
   - Hero vs hero → luck cancels out
   - Cursed vs cursed → anti-luck cancels out
   - Destiny realized mid-combat → luck stops

### Acceptance Validation

✅ **Feature is complete when:**
1. All 9 acceptance criteria pass
2. Unit tests cover all calculation logic
3. Integration tests verify combat integration
4. Statistical tests confirm win rate expectations
5. Balance examples from spec are verified
6. No silent fallbacks exist
7. Events emit correctly

---

## Notes for Playtest Agent

### Manual Verification Checklist

1. **Magical Items**
   - Spawn agent with Ring of Combat Mastery
   - Check combat stats show +5 skill bonus
   - Verify combat power calculation includes bonus
   - Test combat against unenchanted opponent

2. **Blessed Hero**
   - Create agent with soul (destiny set, alignment +0.8)
   - Verify luck modifier appears in combat logs
   - Run 10 combats vs equal opponent
   - Hero should win ~6-7 out of 10 (not all 10!)

3. **Cursed Soul**
   - Create agent with soul (destiny set, alignment -1.0)
   - Verify negative luck appears
   - Run 10 combats vs equal opponent
   - Should lose ~6-7 out of 10 (anti-luck working)

4. **Death Protection**
   - Create hero with +0.2 luck
   - Pit against much stronger opponent (power diff ~25)
   - Verify hero survives with severe injury
   - Check destiny intervention event fires

5. **Destiny Fulfillment**
   - Set hero's `destinyRealized = true`
   - Verify luck disappears
   - Combat should be normal (no luck modifier)

### UI Verification (if applicable)

- Combat log should show skill bonuses in power calculation
- Combat log should show luck modifiers
- Combat log should show destiny intervention messages
- Agent stats panel should display magical skill bonuses

---

## Implementation Checklist

### Phase 1: Magical Skill Bonuses
- [ ] Create `StatBonusTrait` interface
- [ ] Add `skillModifiers` to `EquipmentComponent.cached`
- [ ] Implement `calculateSkillModifiers()` in `EquipmentSystem`
- [ ] Apply bonuses in `AgentCombatSystem.calculateCombatPower()`
- [ ] Create magical item definitions
- [ ] Write unit tests for skill bonus calculation
- [ ] Write integration tests for combat application
- [ ] Verify stacking works correctly
- [ ] Verify negative modifiers work

### Phase 2: Hero Protection
- [ ] Implement `getDestinyLuckModifier()` helper
- [ ] Apply luck to `rollOutcome()` in `AgentCombatSystem`
- [ ] Implement death protection in `applyInjuries()`
- [ ] Emit `combat:destiny_intervention` events
- [ ] Write unit tests for luck calculation
- [ ] Write integration tests for combat luck
- [ ] Write statistical tests (1000 combat simulations)
- [ ] Verify cursed souls suffer (anti-luck works)

### Phase 3: Balance & Validation
- [ ] Run combat simulations with various scenarios
- [ ] Verify balance examples from spec
- [ ] Test edge cases (no destiny, destiny realized, etc.)
- [ ] Verify no silent fallbacks exist
- [ ] Update `EventMap.ts` with new event type
- [ ] Document any spec deviations

---

**End of Work Order**

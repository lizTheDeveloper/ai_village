# CLAIMED: Equipment & Combat Integration

**Timestamp:** 2026-01-01
**Spec Agent:** spec-agent-001
**Attempt:** #1317

---

## Work Order Created

**Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order-equipment-combat-integration.md`

---

## Feature Details

**Phase:** Phase 36 (Equipment System) - Combat Integration
**Primary Spec:** `custom_game_engine/architecture/EQUIPMENT_COMBAT_SPEC.md`

**Two Main Features:**

### 1. Magical Skill Modifiers
- Items can boost skills (e.g., Ring of Combat Mastery +5 combat skill)
- Bonuses calculated in EquipmentSystem
- Applied to combat power in AgentCombatSystem
- Supports negative modifiers for cursed items
- Stacks from multiple equipped items

### 2. Hero Protection (Narrative Magic)
- Souls with destiny receive luck modifiers in combat
- Blessed heroes (+alignment) → better luck
- Cursed souls (-alignment) → anti-luck (suffer more)
- Death resistance for strong destiny
- Protection fades when destiny realized

---

## Dependencies

All dependencies met ✅:
- Phase 29 (Item System Refactor) ✅ Complete - provides trait system
- Phase 7 (Conflict System) ✅ Complete - provides combat system
- Phase 35 (Soul System) ✅ Complete - provides destiny/alignment

---

## Implementation Scope

### Files to Create:
- `packages/core/src/items/traits/StatBonusTrait.ts` - NEW
- `packages/core/src/items/equipment/magical.ts` - NEW
- `packages/core/src/__tests__/MagicalSkillBonuses.test.ts` - NEW
- `packages/core/src/__tests__/HeroProtection.test.ts` - NEW

### Files to Modify:
- `packages/core/src/components/EquipmentComponent.ts` - Add cached skill/stat modifiers
- `packages/core/src/systems/EquipmentSystem.ts` - Calculate bonuses
- `packages/core/src/systems/AgentCombatSystem.ts` - Apply bonuses and luck
- `packages/core/src/events/EventMap.ts` - Add destiny intervention event

**Estimated LOC:** ~800 (400 implementation, 400 tests)

---

## Balance Verification

From spec, these examples must pass:

1. **Novice with Ring (+5 combat)**: 25 power vs Skilled (34 power) → Skilled wins but closer ✓
2. **Blessed Hero**: +8% luck → wins ~58% vs equal opponent (not 100%) ✓
3. **Cursed Soul**: -10% luck → wins ~40% vs equal opponent (anti-luck) ✓
4. **Destiny Realized**: No luck modifier → combat returns to normal ✓

---

## Hand-off to Test Agent

The work order includes:
- ✅ Complete requirements extraction from spec
- ✅ 9 detailed acceptance criteria with verification steps
- ✅ 3-phase implementation plan
- ✅ File-by-file modification list
- ✅ Balance examples to verify
- ✅ Test requirements (unit, integration, statistical)
- ✅ Special considerations and gotchas

Test Agent should:
1. Read the work order
2. Verify all acceptance criteria are testable
3. Create test plan
4. Hand off to Implementation Agent

---

## Status

✅ **Work order complete and ready for testing phase**

Handing off to Test Agent.

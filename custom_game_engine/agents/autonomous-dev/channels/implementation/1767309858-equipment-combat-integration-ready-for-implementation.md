# WORK ORDER READY: Equipment & Combat Integration

**Timestamp:** 2026-01-01 15:24:18 UTC
**Feature:** equipment-combat-integration
**Phase:** Phase 36
**Priority:** HIGH - Combat system integration
**Status:** PENDING_IMPLEMENTATION

---

## Work Order Update

The equipment-combat-integration work order status has been updated from `READY_FOR_TESTS` to `PENDING_IMPLEMENTATION`.

**Work Order Location:** `agents/autonomous-dev/work-orders/conflict-combat-ui/work-order-equipment-combat-integration.md`

**Reason for Update:**
- Basic Equipment System exists ✅ (EquipmentComponent, EquipmentSystem, ArmorTrait, ClothingTrait)
- Combat integration features have NOT been implemented yet ⏳
- StatBonusTrait, skillModifiers, destiny luck - all need implementation

---

## Implementation Requirements

### Feature 1: Magical Skill Modifiers
1. Create `StatBonusTrait` interface for items that boost skills/stats
2. Add `skillModifiers` field to `EquipmentComponent.cached`
3. Calculate total skill bonuses from all equipped items in `EquipmentSystem`
4. Apply magical skill bonuses to combat power in `AgentCombatSystem`
5. Support negative modifiers for cursed items
6. Stack bonuses from multiple equipped items

### Feature 2: Hero Protection (Destiny Luck)
1. Implement `getDestinyLuckModifier()` in `AgentCombatSystem`
2. Calculate luck based on `cosmicAlignment` and `destiny` from SoulIdentityComponent
3. Apply luck modifiers to combat roll outcomes
4. Implement death resistance for heroes with strong destiny
5. Remove protection when `destinyRealized = true`
6. Support cursed souls with negative luck (anti-luck)
7. Emit `combat:destiny_intervention` events

---

## Files to Create/Modify

### New Files
- `packages/core/src/items/traits/StatBonusTrait.ts` - NEW trait interface
- `packages/core/src/__tests__/MagicalSkillBonuses.test.ts` - NEW tests
- `packages/core/src/__tests__/HeroProtection.test.ts` - NEW tests
- `packages/core/src/__tests__/EquipmentCombatIntegration.integration.test.ts` - NEW integration tests

### Modified Files
- `packages/core/src/systems/EquipmentSystem.ts` - Add skill modifier calculation
- `packages/core/src/systems/AgentCombatSystem.ts` - Apply bonuses and luck
- `packages/core/src/components/EquipmentComponent.ts` - Add cached skillModifiers
- `packages/core/src/events/EventMap.ts` - Add combat:destiny_intervention event
- `packages/core/src/items/traits/index.ts` - Export StatBonusTrait

---

## Acceptance Criteria (9 Total)

1. ✅ Magical skill bonuses calculated in EquipmentComponent.cached
2. ✅ Skill bonuses applied to combat power calculation
3. ✅ Negative skill modifiers work for cursed items
4. ✅ Destiny luck modifier calculated (0.10 × cosmicAlignment)
5. ✅ Destiny luck applied to combat rolls
6. ✅ Death protection works (threshold = 20 + destinyLuck × 50)
7. ✅ Destiny protection fades when destinyRealized = true
8. ✅ Cursed soul anti-luck works (negative luck)
9. ✅ Destiny intervention events emitted

---

## Implementation Agent: Pick This Up!

**Estimated LOC:** ~500 lines (2 traits + 2 system methods + tests)

**Difficulty:** MEDIUM
- Requires understanding combat formula in AgentCombatSystem
- Requires understanding soul/destiny system integration
- Requires statistical testing (run 1000 combats to verify win rates)

**Dependencies:** All met ✅
- Phase 29 (Item System Refactor) - Complete
- Phase 7 (Conflict System) - Complete
- Phase 35 (Soul System) - Complete

**Spec:** `custom_game_engine/architecture/EQUIPMENT_COMBAT_SPEC.md`

---

## Next Steps

1. Implementation agent claims this work order
2. Implement StatBonusTrait + skill modifier calculation
3. Implement destiny luck system
4. Write unit tests (skill bonuses, luck calculation)
5. Write integration tests (combat outcomes)
6. Write statistical tests (1000 combat simulations)
7. Verify balance examples from spec
8. Hand off to test agent for verification

---

**Available for claiming by implementation agent.**

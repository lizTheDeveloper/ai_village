# Item Quality System - Ready for Test Design

**Date:** 2025-12-28
**From:** spec-agent-001
**To:** test-agent
**Status:** READY_FOR_TESTS

---

## Work Order Location

`agents/autonomous-dev/work-orders/itemquality-system/work-order.md`

---

## Summary

The Item Quality System is ready for test design and implementation. This feature adds quality tracking (0-100 numeric, or 'poor'/'normal'/'fine'/'masterwork'/'legendary') to crafted, harvested, and gathered items.

**Key discovery:** Much of the quality system is already implemented! The codebase has:
- ✅ `InventorySlot.quality?: number` field
- ✅ `addToInventoryWithQuality()` function
- ✅ Quality calculation functions in `SkillsComponent`
- ✅ `CraftingSystem` uses quality calculations

**What's missing:**
- ItemQuality enum type definition
- Quality tier mapping function (numeric → enum)
- Harvest/gathering quality calculation
- Economy system integration (price multiplier)
- UI display of quality information

---

## Test Requirements

### Unit Tests Needed

1. **Quality Tier Mapping** (`ItemQuality.test.ts`)
   - Test boundary values: 0, 30, 31, 60, 61, 85, 86, 95, 96, 100
   - Verify enum mapping: poor/normal/fine/masterwork/legendary
   - Test color mapping function

2. **Quality Calculations** (`ItemQuality.test.ts`)
   - Test crafting quality formula with varying skill levels
   - Test task familiarity bonus (logarithmic increase)
   - Test synergy bonus integration
   - Test random variance (±10%)
   - Test clamping to 0-100 range

3. **Quality-Based Stacking** (`QualityStacking.test.ts`)
   - Add items with same quality → should stack
   - Add items with different quality → should separate
   - Verify `getItemCount()` returns total across all quality stacks
   - Test inventory full scenario with mixed quality items

4. **Economy Pricing** (`QualityEconomy.test.ts`)
   - Test quality multiplier formula: 0.5 + (quality / 100) * 1.5
   - Verify poor quality (20) → 0.8x price
   - Verify legendary quality (100) → 2.0x price
   - Test price calculation in `TradingSystem`

### Integration Tests Needed

1. **Crafting Quality** (`CraftingQuality.integration.test.ts`)
   - Create agent with skill level 3
   - Craft item 100 times
   - Verify quality distribution matches expected formula
   - Verify masterwork/legendary items are rare but achievable

2. **Harvest Quality** (`HarvestQuality.integration.test.ts`)
   - Novice farmer (skill 1) harvesting mature wheat → quality 50-70
   - Expert farmer (skill 4) harvesting mature wheat → quality 75-95
   - Any farmer harvesting immature wheat → quality penalty -20

3. **Shop Quality Pricing** (`ShopQuality.integration.test.ts`)
   - Buy/sell items with varying quality
   - Verify prices reflect quality multiplier
   - Test shop UI displays quality correctly

### UI Tests (Manual Playtest)

See "Notes for Playtest Agent" section in work order for detailed UI verification scenarios.

---

## Dependencies Met

✅ Phase 10 (Crafting) complete
✅ SkillsComponent exists with quality functions
✅ InventoryComponent supports quality tracking
✅ TradingSystem exists (needs modification)

---

## Spec Completeness

✅ **Spec is complete** - [items-system/spec.md](../../../openspec/specs/items-system/spec.md)
- Clear requirements for quality calculation
- Quality multiplier formula defined
- Stacking behavior specified
- Economy integration specified

✅ **Architecture spec exists** - [ITEM_MAGIC_PERSISTENCE_SPEC.md](../../../custom_game_engine/architecture/ITEM_MAGIC_PERSISTENCE_SPEC.md)
- ItemQuality enum type defined
- ItemInstance vs ItemDefinition separation

✅ **Economy spec defines quality** - [economy-system/spec.md](../../../openspec/specs/economy-system/spec.md)
- Price calculation includes quality multiplier
- Formula: baseValue * quality * rarity * demand * supply

---

## Integration Points

**Files to Test:**

Core:
- `packages/core/src/items/ItemQuality.ts` (NEW)
- `packages/core/src/systems/TradingSystem.ts` (modified)
- `packages/core/src/actions/HarvestActionHandler.ts` (modified)
- `packages/core/src/systems/ResourceGatheringSystem.ts` (modified)

UI:
- `packages/renderer/src/ui/InventoryUI.ts` (modified)
- `packages/renderer/src/CraftingPanelUI.ts` (modified)
- `packages/renderer/src/ShopPanel.ts` (modified)

---

## Expected Test Outcomes

**After Implementation:**
- [ ] All unit tests pass (100% coverage on new functions)
- [ ] All integration tests pass
- [ ] Quality visible in inventory UI (colored badges)
- [ ] Quality visible in crafting UI (expected range)
- [ ] Quality visible in shop UI (price multiplier)
- [ ] Build passes with no type errors
- [ ] No performance regression (< 1ms per craft/harvest)

---

## Notes

The quality system is well-scoped and has clear acceptance criteria. Most of the infrastructure already exists, so implementation should be straightforward.

The main complexity is in the UI display - need to ensure quality badges don't clutter the compact inventory slots.

Recommend starting with unit tests for quality calculations, then integration tests for crafting/harvesting, then UI tests.

---

## Next Steps

1. Test Agent: Design test suite based on acceptance criteria in work order
2. Implementation Agent: Implement core quality system + tests
3. Playtest Agent: Verify UI display and user experience
4. Review: Verify all acceptance criteria met

---

**Handing off to Test Agent.**

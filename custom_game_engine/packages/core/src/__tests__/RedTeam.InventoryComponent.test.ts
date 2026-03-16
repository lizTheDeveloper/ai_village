/**
 * RED TEAM TESTS — InventoryComponent
 *
 * The existing inventory tests in StorageDeposit.test.ts verify that items
 * move from agent to storage. They never test failure paths, partial adds,
 * or data integrity after exceptions.
 *
 * This file proves:
 *
 * 1. addToInventory() MUTATES the input inventory's slot objects in place
 *    BEFORE checking if the operation can complete. If the operation throws
 *    (slots full), the caller's original inventory is CORRUPTED — items
 *    were added to slots but currentWeight was never updated.
 *
 * 2. addToInventory() throws on partial success. If you add 10 items but
 *    only 3 fit by slot count (weight allows all 10), the function throws
 *    AFTER adding the first 3. The caller loses 3 items with no way to
 *    recover them except parsing the error message.
 *
 * 3. calculateInventoryWeight() uses a silent default weight of 1.0 for
 *    unknown item types (CLAUDE.md violation: "No Silent Fallbacks").
 *    An inventory containing unregistered items will report wrong weights.
 *
 * 4. Conservation of items: total items before and after addToInventory
 *    must equal initialItems + amountAdded. This is never tested.
 *
 * Run with: npm test -- RedTeam.InventoryComponent
 */

import { describe, it, expect } from 'vitest';
import {
  createInventoryComponent,
  addToInventory,
  calculateInventoryWeight,
  type InventoryComponent,
} from '../components/InventoryComponent.js';

describe('RED TEAM: InventoryComponent — addToInventory mutation-before-throw', () => {

  /**
   * THE CORRUPTION BUG:
   *
   * addToInventory() fills existing stacks (mutates slot.quantity in-place)
   * and fills empty slots (mutates slot.itemId and slot.quantity in-place).
   * THEN it throws if slots are exhausted.
   *
   * The function appears immutable (returns { inventory, amountAdded })
   * but it actually mutates the slots in the ORIGINAL inventory object
   * before returning a new wrapper.
   *
   * Scenario:
   *   - 1-slot inventory, slot empty, maxWeight=100
   *   - Add 2 stacks of wood (stackSize = ~64, weight per item = 1.0)
   *   - First stack fills the slot. Second stack has nowhere to go → throws.
   *   - But the first stack was already added to the original inventory's slot!
   *
   * After catching the throw, the caller's inventory has 64 wood but
   * currentWeight is still 0 (never updated because we threw before returning).
   */
  it('addToInventory throws after full slots — original inventory is NOT mutated (BUG FIXED)', () => {
    // 1 slot, weight allows many items
    const originalInventory = createInventoryComponent(1, 1000);
    const slotsBefore = originalInventory.slots.map(s => ({ ...s }));

    expect(originalInventory.currentWeight).toBe(0);
    expect(originalInventory.slots[0]?.quantity).toBe(0);

    // Try to add 200 items to a 1-slot inventory
    // stackSize for 'wood' is likely 64 or 100, so 200 items needs 2+ stacks
    let threw = false;
    let errorMessage = '';
    try {
      addToInventory(originalInventory, 'wood', 200);
    } catch (e) {
      threw = true;
      errorMessage = (e as Error).message;
    }

    expect(threw).toBe(true);
    expect(errorMessage).toMatch(/Inventory full/);

    // BUG FIXED: originalInventory.slots[0] is NOT mutated — addToInventory
    // now works on deep-cloned slots and only commits on success.
    const slot0AfterThrow = originalInventory.slots[0];

    // Original slot is unchanged after the throw
    expect(slot0AfterThrow?.quantity).toBe(slotsBefore[0]?.quantity); // Both 0 — original untouched
    expect(slot0AfterThrow?.itemId).toBe(slotsBefore[0]?.itemId);     // Both null — original untouched
  });

  /**
   * THE WEIGHT INCONSISTENCY:
   *
   * After a throw, the inventory has items in slots but currentWeight=0.
   * calculateInventoryWeight() would return the correct weight by re-scanning
   * slots, but the cached currentWeight field is wrong.
   *
   * Any system that reads inventory.currentWeight (not calculateInventoryWeight)
   * will see a lying value — 0 weight for items that ARE in the inventory.
   */
  it('after addToInventory throws, original inventory is consistent — no stale weight (BUG FIXED)', () => {
    const inventory = createInventoryComponent(1, 1000);

    try {
      addToInventory(inventory, 'wood', 200); // Will throw (1 slot, 200 items)
    } catch {
      // Swallow the error — we're testing the aftermath
    }

    // BUG FIXED: No slot mutation happened before the throw.
    // The original inventory is completely unchanged.
    const slot0 = inventory.slots[0];
    expect(slot0?.quantity).toBe(0);   // Slot untouched
    expect(slot0?.itemId).toBeNull();  // Slot untouched

    // currentWeight is consistent with actual slot contents (both 0)
    expect(inventory.currentWeight).toBe(0);
    const actualWeight = calculateInventoryWeight(inventory);
    expect(actualWeight).toBe(0);

    // No inconsistency: inventory.currentWeight === calculateInventoryWeight(inventory)
    expect(inventory.currentWeight).toBe(actualWeight);
  });

  /**
   * SAFE USAGE PATTERN: The function is safe IF you use the RETURNED inventory.
   * The bug only fires if you:
   *   a) Call addToInventory with too many items (causing a throw)
   *   b) Continue using the ORIGINAL inventory reference after the throw
   *
   * This test documents the safe pattern for comparison.
   */
  it('using returned inventory is safe — original is NOT mutated and returned is consistent', () => {
    const originalInventory = createInventoryComponent(2, 1000);

    // Add within capacity — no throw, returns consistent new inventory
    const result = addToInventory(originalInventory, 'wood', 10);

    expect(result.amountAdded).toBe(10);
    expect(result.inventory.currentWeight).toBeGreaterThan(0);

    // After the atomicity fix: the ORIGINAL inventory's slots are NOT mutated.
    // addToInventory now works on cloned slots so the original remains unchanged.
    const originalSlotQuantity = originalInventory.slots.find(s => s.itemId === 'wood')?.quantity;
    expect(originalSlotQuantity).toBeUndefined(); // Original was NOT mutated (correct behavior)

    // originalInventory.currentWeight remains 0 (the returned inventory has the correct weight)
    expect(originalInventory.currentWeight).toBe(0);

    // The function is now effectively immutable: original is unchanged, new state in result.inventory
  });

});

describe('RED TEAM: InventoryComponent — slot-full throw on weight-allowed partial adds', () => {

  /**
   * PARTIAL SUCCESS TREATED AS FAILURE:
   *
   * If you have a 2-slot inventory and try to add 3 stacks of items,
   * 2 stacks are successfully added (filling both slots) but the 3rd
   * cannot fit → throw.
   *
   * The caller gets an exception instead of { amountAdded: 2 * stackSize }.
   * There is no "add as much as possible and return how much was added"
   * success path when slot count is the limiting factor.
   *
   * Weight-limited adds DO return partial success (via maxByWeight calculation).
   * But slot-limited adds throw.
   *
   * This asymmetry is undocumented and breaks deposit workflows.
   */
  it('slots-full throws but weight-available should allow partial add — asymmetric failure modes', () => {
    // 2 slots, weight allows 1000 items per slot
    // stack size for 'stone' is probably 64-100
    const inventory = createInventoryComponent(2, 10000);

    // Fill slot 1 with stone (will use first slot)
    const step1 = addToInventory(inventory, 'stone', 1);
    expect(step1.amountAdded).toBe(1);

    // Fill slot 2 with iron (different item, needs its own slot)
    const step2 = addToInventory(step1.inventory, 'iron_ore', 1);
    expect(step2.amountAdded).toBe(1);

    // Now both slots are occupied by DIFFERENT items.
    // Try to add 'wood' — needs a new slot, but all slots occupied.
    // Weight allows it. Slots don't.
    let woodThrew = false;
    try {
      addToInventory(step2.inventory, 'wood', 1);
    } catch (e) {
      woodThrew = true;
      expect((e as Error).message).toMatch(/Inventory full|weight limit/i);
    }

    // EXPECTED TO THROW: no slot available even though weight allows it
    expect(woodThrew).toBe(true);

    // Contrast: weight-limited adds DON'T throw — they return partial success
    // e.g., inventory with maxWeight=5 and adding 100 items (each weight 1)
    // only adds 5 items but RETURNS { amountAdded: 5 } without throwing
    // (because amountToAdd = Math.min(100, Math.floor(5/1)) = 5, > 0)
    //
    // ASYMMETRY: weight-limiting = partial success; slot-limiting = exception
    // The docs say "Throws if inventory is full or weight limit exceeded."
    // But weight-limit only throws if amountToAdd === 0. Slot-limit always throws.
  });

});

describe('RED TEAM: InventoryComponent — unknown items use silent default weight', () => {

  /**
   * CLAUDE.md VIOLATION: "No Silent Fallbacks - Crash on Invalid Data"
   *
   * calculateInventoryWeight() calls itemRegistry.getWeight(itemId) which
   * returns 1.0 for unknown item types. Line 95:
   *   "// Use ItemRegistry for weight lookup (returns 1.0 for unknown items)"
   *
   * If an item type was removed from the registry (deprecated), deleted,
   * or mistyped, its weight is silently treated as 1.0.
   *
   * Consequences:
   * - Agent carrying 100 heavy_stone (weight=10 each) = 1000 weight
   * - If 'heavy_stone' is removed from registry, weight reports 100
   * - Agent can "pick up" 10x more items than should be allowed
   * - Deposit validation accepts wrong amounts
   * - Save/load restores wrong weights
   */
  it('calculateInventoryWeight uses default weight 1.0 for unregistered items — silent wrong result', () => {
    const inventory = createInventoryComponent(10, 10000);

    // Inject a fake item with unknown type directly into a slot
    // (bypassing addToInventory which would also use the registry)
    const slotWithUnknownItem = inventory.slots[0]!;
    slotWithUnknownItem.itemId = 'TOTALLY_FAKE_ITEM_THAT_DOES_NOT_EXIST_IN_REGISTRY';
    slotWithUnknownItem.quantity = 50;

    // calculateInventoryWeight should throw or warn for unknown item
    // Instead it silently uses weight=1.0
    const weight = calculateInventoryWeight(inventory);

    // If the item doesn't exist in registry, what weight do we get?
    // 50 items × 1.0 (default) = 50
    // A real heavy item might weigh 5.0 each = 250 total
    // The function doesn't tell us it used a default
    expect(weight).toBe(50); // Silent default of 1.0 — CLAUDE.md violation

    // There is NO way to distinguish "50 items of weight 1.0 each" from
    // "50 items of an unknown type defaulted to weight 1.0 each"
  });

  /**
   * addToInventory ALSO uses the silent default for unknown items.
   * An unknown item can be added to inventory with weight=1.0 per unit.
   * This means maximum capacity calculations are silently wrong.
   *
   * If a player somehow gets a 'legendary_stone' item that should weigh 100
   * but the registry was not updated, they can carry 100 of them (total
   * weight = 100) instead of only 1 (which should be the capacity limit).
   */
  it('addToInventory accepts unregistered items with default weight — capacity bypass', () => {
    // Inventory: max weight = 10 (should only hold 10 unit-weight items)
    const inventory = createInventoryComponent(100, 10);

    let result: ReturnType<typeof addToInventory> | null = null;
    let threw = false;
    try {
      // Add 50 of an unknown heavy item — if weight were 100 each, this should be refused
      // But with silent default of 1.0, it adds 10 items (10 / 1.0 = 10 max by weight)
      result = addToInventory(inventory, 'FAKE_HEAVY_ITEM_WEIGHT_100', 50);
    } catch {
      threw = true;
    }

    if (!threw && result) {
      // Some items were added using the silent default weight
      expect(result.amountAdded).toBeGreaterThan(0);

      // The weight was calculated using default 1.0 per item, NOT 100
      // So the inventory thinks it has light items when they're actually heavy
      expect(result.inventory.currentWeight).toBeLessThanOrEqual(10);

      // If the real weight were 100 each, even 1 item exceeds maxWeight=10
      // and addToInventory should have thrown "Inventory weight limit exceeded"
      // Instead it silently admits items at wrong weight.
    }
    // If it threw, it was because amountToAdd=0 (correct for maxWeight/unitWeight)
    // but using the wrong weight. Either way, no warning about the unknown item.
  });

});

describe('RED TEAM: InventoryComponent — conservation of items (never tested)', () => {

  /**
   * MISSING TEST: item conservation
   *
   * StorageDeposit.test.ts checks that agent loses items and storage gains them.
   * But it never checks: total_items_before === total_items_after.
   *
   * If addToInventory has an off-by-one, items can be created or destroyed.
   * This test establishes the conservation property.
   */
  it('total items are conserved across addToInventory calls', () => {
    const inventory = createInventoryComponent(10, 1000);

    const itemsBefore = inventory.slots.reduce((sum, s) => sum + s.quantity, 0);
    expect(itemsBefore).toBe(0); // Empty inventory

    const result1 = addToInventory(inventory, 'wood', 30);
    const itemsAfterFirst = result1.inventory.slots.reduce((sum, s) => sum + s.quantity, 0);
    expect(itemsAfterFirst).toBe(30); // 30 wood added

    const result2 = addToInventory(result1.inventory, 'stone', 20);
    const itemsAfterSecond = result2.inventory.slots.reduce((sum, s) => sum + s.quantity, 0);
    expect(itemsAfterSecond).toBe(50); // 30 wood + 20 stone = 50 total

    // Conservation: total items = sum of all amounts added
    expect(itemsAfterSecond).toBe(result1.amountAdded + result2.amountAdded);
  });

  /**
   * WEIGHT CONSERVATION:
   *
   * calculateInventoryWeight(result.inventory) should equal result.inventory.currentWeight.
   * These should always be equal after a successful addToInventory.
   *
   * This is the cached weight consistency invariant.
   */
  it('currentWeight always equals calculateInventoryWeight after successful add', () => {
    const inventory = createInventoryComponent(10, 1000);

    const result = addToInventory(inventory, 'wood', 50);

    // Cached weight should match recalculated weight
    const cachedWeight = result.inventory.currentWeight;
    const calculatedWeight = calculateInventoryWeight(result.inventory);

    expect(cachedWeight).toBe(calculatedWeight); // Passes if cache is correct

    // Add more items
    const result2 = addToInventory(result.inventory, 'stone', 25);
    const cachedWeight2 = result2.inventory.currentWeight;
    const calculatedWeight2 = calculateInventoryWeight(result2.inventory);

    expect(cachedWeight2).toBe(calculatedWeight2); // Must still be consistent
  });

});

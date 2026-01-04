# Proposal: Implement ItemInstance Registry

**Submitted By:** claude-code-agent
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 2 systems
**Priority:** CRITICAL
**Source:** Code Audit 2026-01-03

## Problem Statement

Equipment durability system is blocked because there's no ItemInstance registry to track individual item instances:

- **Equipment durability** - Cannot degrade over time (no instance.condition tracking)
- **Item enchantments** - Cannot be tracked per instance
- **Item history** - Cannot track ownership, creation, usage
- **5+ locations** with TODO comments waiting for ItemInstance

**Impact:** Equipment never breaks, items have no individual identity or state, no durability mechanic.

**Location:** `INCOMPLETE_IMPLEMENTATIONS.md:39-48, 507-511`

## Proposed Solution

1. Create ItemInstance registry system to track individual item instances
2. Add durability, condition, enchantment tracking per instance
3. Implement item instance lifecycle (creation, modification, destruction)
4. Update EquipmentSystem to use instance data
5. Add item instance serialization for save/load

## Requirements

### Requirement: Item Instance Tracking

The system SHALL track individual instances of items separate from item type definitions.

#### Scenario: Item Instance Creation

- WHEN an item is created (crafted, spawned, looted)
- THEN a unique ItemInstance SHALL be created
- AND the instance SHALL have a unique ID
- AND the instance SHALL track condition, durability, enchantments, history

#### Scenario: Equipment Durability

- WHEN equipped items are used
- THEN their durability SHALL decrease
- AND when durability reaches 0, the item SHALL break
- AND the EquipmentSystem SHALL access instance.condition

### Requirement: Instance Persistence

Item instances SHALL persist across save/load cycles.

#### Scenario: Save and Load Item State

- WHEN a game is saved with items in agent inventory
- THEN all ItemInstance data SHALL be serialized
- WHEN the game is loaded
- THEN item instances SHALL be restored with exact state

## Dependencies

- Equipment system waiting for this
- Crafting system needs instance tracking
- Save/load system needs serialization support

## Risks

- Performance impact if tracking millions of items
- Memory usage for large inventories
- Serialization size increase

## Alternatives Considered

1. **Item stacks without instances** - Cannot track individual item state
2. **Component-based items** - More complex, harder to query
3. **No durability** - Removes gameplay depth

## Definition of Done

- [ ] ItemInstance class/component implemented
- [ ] Registry system manages all instances
- [ ] Durability tracking functional
- [ ] EquipmentSystem uses instance data
- [ ] Save/load preserves instance state
- [ ] Performance acceptable (no frame drops)
- [ ] All 5+ TODO locations updated

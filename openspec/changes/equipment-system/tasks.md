# Tasks: equipment-system

## Overview
Implement a body-based equipment system that adapts to different species anatomies. Equipment includes weapons, armor, and clothing with dynamic slot generation based on body parts.

**Estimated Effort:** 15-25 hours | **Lines of Code:** ~2,000 LOC | **Phase:** 36

## Phase 1: Core Components (Foundation)

- [ ] Create `packages/core/src/components/EquipmentComponent.ts`
  - [ ] Dynamic slot mapping (body part ID -> ItemInstance)
  - [ ] Weapons and accessories slots
  - [ ] Loadout storage
  - [ ] Weight tracking
- [ ] Create `packages/core/src/systems/EquipmentSystem.ts`
  - [ ] Slot validation against body parts
  - [ ] Weight calculation and flight capability
  - [ ] Durability updates
  - [ ] Defense/resistance caching
  - [ ] Set bonus detection
- [ ] Update `packages/core/src/items/traits/ArmorTrait.ts`
  - [ ] Replace `slot` with `target: EquipmentTarget`
  - [ ] Add `weight: number`
  - [ ] Add `flightSpeedPenalty?: number`
- [ ] Create `packages/core/src/items/traits/ClothingTrait.ts`
  - [ ] Social properties (formality, cultural style, social class)
  - [ ] Thermal properties (insulation, breathability, waterResistance)
  - [ ] Appearance properties (color, pattern, condition)
- [ ] Register `equipment` in `ComponentType.ts`
- [ ] Register EquipmentSystem in `registerAllSystems.ts`

## Phase 2: Equipment Definitions

- [ ] Create `packages/core/src/items/equipment/weapons.ts`
  - [ ] Define 10-15 base weapons (club, sword, axe, spear, bow, etc.)
  - [ ] Different materials (wood, iron, steel)
  - [ ] Damage types and properties
- [ ] Create `packages/core/src/items/equipment/armor.ts`
  - [ ] Define armor sets (leather, chainmail, plate)
  - [ ] Different body part targets
  - [ ] Species-specific armor (wing guards, tentacle wraps, thorax plates)
- [ ] Create `packages/core/src/items/equipment/clothing.ts`
  - [ ] Define 8-10 clothing items (tunic, robe, cloak)
  - [ ] Different formality levels
  - [ ] Thermal properties

## Phase 3: Equipment Actions

- [ ] Create `packages/core/src/actions/EquipActions.ts`
  - [ ] EquipAction (with auto-unequip conflicting items)
  - [ ] UnequipAction
  - [ ] RepairAction (restore durability using materials)
- [ ] Integrate actions with ActionQueue
- [ ] Add action validation (can't equip if body part missing/destroyed)

## Phase 4: Combat Integration

- [ ] Update combat damage calculation to use EquipmentComponent
  - [ ] Read total defense from equipped armor
  - [ ] Read resistances by damage type
  - [ ] Apply weapon damage and type
- [ ] Implement weapon durability loss on attack
- [ ] Implement armor durability loss on hit
- [ ] Add critical hit mechanics (weapon.critChance, weapon.critMultiplier)

## Phase 5: Temperature Integration

- [ ] Update temperature system to read ClothingTrait
  - [ ] Sum insulation for cold protection
  - [ ] Sum breathability for heat ventilation
  - [ ] Apply modifiers to agent comfort
- [ ] Add waterResistance checks for rain protection

## Phase 6: Crafting Integration

- [ ] Create equipment recipes (adapt to material chosen)
  - [ ] Sword recipe (any metal + wood handle)
  - [ ] Armor recipes (metal/leather + appropriate size)
  - [ ] Clothing recipes (cloth/leather)
- [ ] Implement quality factors based on material and crafter skill
  - [ ] Material hardness affects weapon damage
  - [ ] Material durability affects armor defense
  - [ ] Crafter skill affects quality tier

## Phase 7: Social Effects

- [ ] Implement social modifiers from clothing
  - [ ] Charisma bonus from formal wear
  - [ ] Intimidation bonus from heavy armor
  - [ ] Stealth penalty from noisy armor
- [ ] Add NPC reactions to equipment
  - [ ] Merchant discounts for nice clothes
  - [ ] Guard suspicion for weapons/armor
  - [ ] Noble favor for formal attire

## Phase 8: Set Bonuses

- [ ] Implement set bonus detection
  - [ ] Require 3+ matching pieces
  - [ ] Same material AND armor class
- [ ] Define set bonuses per material
  - [ ] Defense multiplier
  - [ ] Movement penalty reduction
  - [ ] Resistance boosts
  - [ ] Special effects (fire resistance, stealth boost)

## Phase 9: Species-Specific Features

- [ ] Add weight restriction validation for flying creatures
  - [ ] Calculate max flight weight from body size
  - [ ] Check wing armor weight limits
  - [ ] Update canFly based on total equipment weight
- [ ] Implement multi-slot equipment
  - [ ] Gloves equip on ALL manipulation parts
  - [ ] Wing guards equip on BOTH wings
  - [ ] Tentacle wraps equip on ALL tentacles
- [ ] Add species-specific equipment definitions
  - [ ] Angel loadouts (wing-prioritized, lightweight)
  - [ ] Cephaloid loadouts (flexible tentacle armor)
  - [ ] Insectoid loadouts (4-armed, thorax-focused)

## Phase 10: Persistence

- [ ] Add EquipmentComponent serialization
- [ ] Implement save/load for equipped items
- [ ] Handle migration for existing saves (add equipment component)

## Phase 11: UI Integration

- [ ] Update agent inspector to show equipment
  - [ ] Visual display of equipped items
  - [ ] Slot layout based on body parts
  - [ ] Total defense and resistances
  - [ ] Weight and flight capability
- [ ] Add equipment panel or section
  - [ ] Drag-and-drop equipping
  - [ ] Loadout quick-swap buttons
  - [ ] Durability bars
  - [ ] Set bonus indicators

## Testing

### Unit Tests
- [ ] EquipmentComponent serialization/deserialization
- [ ] Equipment validation against body parts
- [ ] Weight calculation correctness
- [ ] Set bonus detection logic
- [ ] Damage calculation with armor/weapons
- [ ] Durability degradation

### Integration Tests
- [ ] Equip action on different species
- [ ] Combat with equipped weapons and armor
- [ ] Temperature modifiers from clothing
- [ ] Crafting equipment with different materials
- [ ] Save/load equipped items
- [ ] Flying creature weight restrictions

### Manual Testing
- [ ] Create humanoid with full armor set -> verify set bonus
- [ ] Create angel with heavy helmet -> verify cannot fly
- [ ] Create insectoid with 4 gloves -> verify all arms equipped
- [ ] Damage armor in combat -> verify durability loss
- [ ] Repair broken equipment -> verify durability restored
- [ ] Wear formal clothing -> verify social bonuses

# Proposal: Work Order: Equipment System (Phase 36)

**Submitted By:** migration-script
**Date:** 2026-01-03
**Status:** Draft
**Complexity:** 5+ systems
**Priority:** TIER 2
**Source:** Migrated from agents/autonomous-dev/work-orders/equipment-system

---

## Original Work Order

# Work Order: Equipment System (Phase 36)

## Overview
Implement a body-based equipment system that adapts to different species anatomies. Equipment includes weapons, armor, and clothing with dynamic slot generation based on body parts. The system affects combat, temperature regulation, social status, and agent capabilities.

## Spec Reference
- **Primary Spec:** `openspec/specs/equipment-system/spec.md`
- **Phase:** 36
- **Priority:** HIGH
- **Status:** READY_FOR_IMPLEMENTATION

## Dependencies
- **Phase 29:** Item System Refactor ✅ (ArmorTrait, WeaponTrait, MaterialTemplate)
- **Phase 10:** Crafting System ✅ (equipment creation)
- **Related Systems:**
  - Conflict System (`openspec/specs/conflict-system/spec.md`) - combat integration
  - Temperature System (`custom_game_engine/specs/temperature-shelter-system.md`) - climate protection

## Requirements Summary

### Core Components

1. **EquipmentComponent** (new)
   - Dynamic slot mapping based on BodyComponent
   - Tracks equipped items per body part ID
   - Weapons (mainHand, offHand) and accessories
   - Quick-swap loadouts (combat, formal, work)
   - Weight tracking for flying creatures
   - Auto-equip preferences

2. **EquipmentSystem** (new, priority 15)
   - Validates equipment against body parts
   - Updates weight tracking and flight capability
   - Manages durability degradation
   - Calculates total defense and resistances
   - Applies set bonuses
   - Removes broken equipment

3. **ClothingTrait** (new)
   - Social properties (formality, cultural style, social class)
   - Thermal properties (insulation, breathability, waterResistance)
   - Appearance (color, pattern, condition)

4. **ArmorTrait Updates** (existing, requires modifications)
   - Replace `slot: ArmorSlot` with `target: EquipmentTarget`
   - Add `weight: number` field
   - Add optional `flightSpeedPenalty?: number`
   - Body-based targeting (bodyPartType, bodyPartFunction, multiSlot, maxWeight)

### Key Features

**Body-Based Equipment:**
- Equipment slots generated from BodyComponent.parts at runtime
- Different species have different slot configurations:
  - Humanoids: head, torso, 2 arms, 2 legs
  - Angels: head, torso, 2 wings, 2 arms (NO legs)
  - Insectoids: head, thorax, 4 arms, 2 legs
  - Cephaloids: head, 6 tentacles
  - Custom species: dynamically mapped

**Weight Restrictions:**
- Flying creatures have strict weight limits
- Wing armor must be lightweight (max 2kg per wing typically)
- Exceeding weight prevents flight or adds penalties
- Different body sizes have different weight capacities

**Cultural Equipment Priorities:**
- Angels prioritize wing protection over head protection
- Cephaloids prioritize tentacle protection (tentacles are hands AND feet)
- Insectoids prioritize thorax over head (vital organs)

**Armor System:**
- Armor classes: clothing (0-2 def), light (3-8), medium (9-15), heavy (16-25)
- Set bonuses for matching material and armor class
- Resistances to damage types (slashing, piercing, bludgeoning, elemental)
- Movement penalties based on armor class

**Weapon System:**
- Damage types: slashing, piercing, bludgeoning, fire, frost, lightning, poison, magic
- Weapon properties: damage, range, attack speed, durability loss
- Critical hits (chance, multiplier)
- Two-handed vs one-handed

**Clothing System:**
- Formality levels (0-10) affect social interactions
- Thermal insulation for cold weather
- Breathability for hot weather
- Water resistance for rain
- Social class indicators (peasant, common, merchant, noble, royal)

**Durability:**
- Combat damage per attack/hit
- Environmental wear over time
- Tool use degradation
- Effectiveness scales with condition (50% durability = 75% effectiveness)
- Broken equipment (durability ≤ 0) can be repaired or scrapped

## Implementation Checklist

### Phase 1: Core Components (Foundation)
- [ ] Create `packages/core/src/components/EquipmentComponent.ts`
  - Dynamic slot mapping (body part ID → ItemInstance)
  - Weapons and accessories slots
  - Loadout storage
  - Weight tracking
- [ ] Create `packages/core/src/systems/EquipmentSystem.ts`
  - Slot validation against body parts
  - Weight calculation and flight capability
  - Durability updates
  - Defense/resistance caching
  - Set bonus detection
- [ ] Update `packages/core/src/items/traits/ArmorTrait.ts`
  - Replace `slot` with `target: EquipmentTarget`
  - Add `weight: number`
  - Add `flightSpeedPenalty?: number`
- [ ] Create `packages/core/src/items/traits/ClothingTrait.ts`
  - Social properties
  - Thermal properties
  - Appearance properties
- [ ] Register `equipment` in `ComponentType.ts`
- [ ] Register EquipmentSystem in `registerAllSystems.ts`

### Phase 2: Equipment Definitions
- [ ] Create `packages/core/src/items/equipment/weapons.ts`
  - Define 10-15 base weapons (club, sword, axe, spear, bow, etc.)
  - Different materials (wood, iron, steel)
  - Damage types and properties
- [ ] Create `packages/core/src/items/equipment/armor.ts`
  - Define armor sets (leather, chainmail, plate)
  - Different body part targets
  - Species-specific armor (wing guards, tentacle wraps, thorax plates)
- [ ] Create `packages/core/src/items/equipment/clothing.ts`
  - Define 8-10 clothing items (tunic, robe, cloak)
  - Different formality levels
  - Thermal properties

### Phase 3: Equipment Actions
- [ ] Create `packages/core/src/actions/EquipActions.ts`
  - EquipAction (with auto-unequip conflicting items)
  - UnequipAction
  - RepairAction (restore durability using materials)
- [ ] Integrate actions with ActionQueue
- [ ] Add action validation (can't equip if body part missing/destroyed)

### Phase 4: Combat Integration
- [ ] Update combat damage calculation to use EquipmentComponent
  - Read total defense from equipped armor
  - Read resistances by damage type
  - Apply weapon damage and type
- [ ] Implement weapon durability loss on attack
- [ ] Implement armor durability loss on hit
- [ ] Add critical hit mechanics (weapon.critChance, weapon.critMultiplier)

### Phase 5: Temperature Integration
- [ ] Update temperature system to read ClothingTrait
  - Sum insulation for cold protection
  - Sum breathability for heat ventilation
  - Apply modifiers to agent comfort
- [ ] Add waterResistance checks for rain protection

### Phase 6: Crafting Integration
- [ ] Create equipment recipes (adapt to material chosen)
  - Sword recipe (any metal + wood handle)
  - Armor recipes (metal/leather + appropriate size)
  - Clothing recipes (cloth/leather)
- [ ] Implement quality factors based on material and crafter skill
  - Material hardness affects weapon damage
  - Material durability affects armor defense
  - Crafter skill affects quality tier

### Phase 7: Social Effects
- [ ] Implement social modifiers from clothing
  - Charisma bonus from formal wear
  - Intimidation bonus from heavy armor
  - Stealth penalty from noisy armor
- [ ] Add NPC reactions to equipment
  - Merchant discounts for nice clothes
  - Guard suspicion for weapons/armor
  - Noble favor for formal attire

### Phase 8: Set Bonuses
- [ ] Implement set bonus detection
  - Require 3+ matching pieces
  - Same material AND armor class
- [ ] Define set bonuses per material
  - Defense multiplier
  - Movement penalty reduction
  - Resistance boosts
  - Special effects (fire resistance, stealth boost)

### Phase 9: Species-Specific Features
- [ ] Add weight restriction validation for flying creatures
  - Calculate max flight weight from body size
  - Check wing armor weight limits
  - Update canFly based on total equipment weight
- [ ] Implement multi-slot equipment
  - Gloves equip on ALL manipulation parts
  - Wing guards equip on BOTH wings
  - Tentacle wraps equip on ALL tentacles
- [ ] Add species-specific equipment definitions
  - Angel loadouts (wing-prioritized, lightweight)
  - Cephaloid loadouts (flexible tentacle armor)
  - Insectoid loadouts (4-armed, thorax-focused)

### Phase 10: Persistence
- [ ] Add EquipmentComponent serialization
- [ ] Implement save/load for equipped items
- [ ] Handle migration for existing saves (add equipment component)

### Phase 11: UI Integration
- [ ] Update agent inspector to show equipment
  - Visual display of equipped items
  - Slot layout based on body parts
  - Total defense and resistances
  - Weight and flight capability
- [ ] Add equipment panel or section
  - Drag-and-drop equipping
  - Loadout quick-swap buttons
  - Durability bars
  - Set bonus indicators

## Test Requirements

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
- [ ] Create humanoid with full armor set → verify set bonus
- [ ] Create angel with heavy helmet → verify cannot fly
- [ ] Create insectoid with 4 gloves → verify all arms equipped
- [ ] Damage armor in combat → verify durability loss
- [ ] Repair broken equipment → verify durability restored
- [ ] Wear formal clothing → verify social bonuses

## Acceptance Criteria

1. **Equipment slots are dynamic** and generated from BodyComponent.parts
2. **Different species** can equip species-appropriate armor (wings, tentacles, etc.)
3. **Flying creatures** cannot fly if equipment exceeds weight limit
4. **Armor and weapons** integrate with combat system (defense, damage, resistances)
5. **Clothing** affects temperature comfort and social interactions
6. **Set bonuses** apply when wearing matching armor sets
7. **Equipment durability** degrades with use and can be repaired
8. **Crafting recipes** produce equipment with material-based properties
9. **Equipment persists** across save/load cycles
10. **UI displays** equipped items and relevant stats clearly

## Definition of Done

- [ ] All implementation checklist items completed
- [ ] All test requirements passing
- [ ] All acceptance criteria met
- [ ] Code review completed
- [ ] Documentation updated in spec
- [ ] No console errors or warnings
- [ ] Performance impact acceptable (<5% TPS impact)
- [ ] Committed to version control

## Estimated Effort
- **Lines of Code:** ~2,000 LOC
- **Time Estimate:** 15-25 hours
- **Complexity:** Medium-High (body-based system requires careful design)

## Notes
- **ArmorTrait update is critical** - old `slot` field must be replaced with `target: EquipmentTarget`
- **Species variety is the key feature** - system must work for humanoids, angels, insectoids, cephaloids, and custom species
- **Weight restrictions for flight are non-negotiable** - angels can't fly in full plate armor
- Future enhancements: enchantments (Phase 30 integration), weapon skills, legendary items, cursed equipment


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

# Tasks: Implement ItemInstance Registry

## Phase 1: Design Item Instance System

- [ ] Design ItemInstance data structure (ID, type, condition, durability, enchantments, history, owner)
- [ ] Design registry architecture (centralized vs distributed)
- [ ] Plan instance lifecycle (creation, modification, destruction)
- [ ] Design serialization format

## Phase 2: Core Implementation

- [ ] Create ItemInstance class/interface
- [ ] Implement ItemInstanceRegistry system
- [ ] Add instance creation on item spawn/craft
- [ ] Add instance tracking for ownership
- [ ] Implement instance lookup by ID
- [ ] Add instance destruction handling

## Phase 3: Durability & Condition

- [ ] Add durability field to ItemInstance
- [ ] Implement condition enum (pristine, good, worn, damaged, broken)
- [ ] Create durability degradation logic
- [ ] Add repair mechanics
- [ ] Implement item breaking when durability = 0

## Phase 4: Equipment System Integration

- [ ] Update EquipmentSystem to use ItemInstance
- [ ] Replace placeholder durability logic
- [ ] Add equipment degradation on use
- [ ] Test equipment breaking flow
- [ ] Re-enable equipment durability tests

## Phase 5: Serialization

- [ ] Add ItemInstance serialization
- [ ] Add registry save/load support
- [ ] Test instance persistence across saves
- [ ] Handle instance ID conflicts on load
- [ ] Add migration for existing saves

## Validation

- [ ] Equipment degrades during use
- [ ] Items break when durability hits 0
- [ ] Instances persist across save/load
- [ ] Performance acceptable with 1000+ items
- [ ] All 5+ TODO locations resolved
- [ ] Tests pass for durability system

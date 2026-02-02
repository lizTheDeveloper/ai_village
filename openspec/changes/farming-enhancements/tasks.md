# Tasks: farming-enhancements

## Overview
Enhance the farming system to 100% spec coverage by adding plant properties (medicinal/magical), property discovery, companion planting, cross-pollination, wild plant ecology, and crop diseases & pests.

**Estimated Effort:** 15-20 hours | **Lines of Code:** ~1,500 LOC

## Phase 1: Plant Properties System

- [ ] Extend PlantSpecies with properties field
  - [ ] Add medicinal properties
  - [ ] Add magical properties
  - [ ] Add toxic properties
  - [ ] Add aromatic properties
- [ ] Define 10-15 plants with special properties
  - [ ] Healing herbs (aloe, chamomile)
  - [ ] Magical reagents (mandrake, nightshade)
  - [ ] Toxic plants (hemlock, belladonna)
  - [ ] Aromatic herbs (lavender, mint)
- [ ] Update harvest system to collect properties
  - [ ] Extract properties based on harvest stage
  - [ ] Apply processing requirements
  - [ ] Store properties in harvested items

## Phase 2: Property Discovery System

- [ ] Create `PropertyDiscoveryComponent`
  - [ ] Track known properties per entity
  - [ ] Store discovery method and confidence
- [ ] Implement discovery methods
  - [ ] Trial and error (eat/use and observe effects)
  - [ ] Observation (watch animals interact)
  - [ ] Experimentation (controlled tests)
  - [ ] Research (books, NPCs)
- [ ] Add discovery events
  - [ ] Emit event when property discovered
  - [ ] Update knowledge database
  - [ ] Share knowledge between agents (teaching)
- [ ] Create `PropertyDiscoverySystem`
  - [ ] Check for discovery opportunities
  - [ ] Update confidence levels
  - [ ] Propagate knowledge

## Phase 3: Companion Planting

- [ ] Add companion relationships to PlantSpecies
  - [ ] Define beneficial companions
  - [ ] Define antagonistic companions
  - [ ] Set effect radii and magnitudes
- [ ] Implement companion effect system
  - [ ] Scan nearby plants
  - [ ] Apply growth boosts/penalties
  - [ ] Apply pest deterrence
  - [ ] Apply nutrient sharing
- [ ] Create classic companion sets
  - [ ] Three Sisters (corn, beans, squash)
  - [ ] Tomato + Basil
  - [ ] Carrots + Onions (pest control)
  - [ ] Bad combinations (fennel harms most things)

## Phase 4: Cross-Pollination & Hybridization

- [ ] Add pollination requirements to PlantSpecies
  - [ ] Pollinator types
  - [ ] Cross-compatible species list
  - [ ] Hybrid chance
- [ ] Implement pollination system
  - [ ] Detect pollinators in area
  - [ ] Transfer pollen between plants
  - [ ] Generate hybrid seeds
- [ ] Implement hybrid trait inheritance
  - [ ] Blend parent traits
  - [ ] Calculate trait expression
  - [ ] Track generation (F1, F2, etc.)
  - [ ] Implement stability (trait segregation)
- [ ] Create 3-5 hybrid plant definitions
  - [ ] Hybrid tomato varieties
  - [ ] Hybrid flowers
  - [ ] Designer crops with enhanced traits

## Phase 5: Wild Plant Ecology

- [ ] Add ecology properties to wild plants
  - [ ] Spread mechanisms
  - [ ] Spread rates and ranges
  - [ ] Competitiveness
  - [ ] Ecological roles
- [ ] Implement wild plant spreading
  - [ ] Seed dispersal by wind/animals/water
  - [ ] Vegetative spreading (runners, rhizomes)
  - [ ] Colonization of empty tiles
- [ ] Implement plant competition
  - [ ] Compete for nutrients
  - [ ] Shade competition
  - [ ] Allelopathy (chemical warfare)
  - [ ] Invasive species mechanics
- [ ] Add ecological benefits
  - [ ] Nitrogen fixing improves soil
  - [ ] Pollinator attraction
  - [ ] Wildlife food sources

## Phase 6: Crop Diseases & Pests

- [ ] Create disease/pest system
  - [ ] PlantDisease definitions
  - [ ] PlantPest definitions
  - [ ] Disease transmission mechanics
  - [ ] Pest reproduction and spread
- [ ] Implement disease effects
  - [ ] Growth stunting
  - [ ] Leaf yellowing (visual)
  - [ ] Yield reduction
  - [ ] Plant death
- [ ] Implement pest damage
  - [ ] Leaf eating (visual damage)
  - [ ] Root boring (hidden damage)
  - [ ] Sap sucking (slow drain)
  - [ ] Fruit infestation (ruins harvest)
- [ ] Add prevention/treatment
  - [ ] Resistant varieties
  - [ ] Crop rotation
  - [ ] Natural predators (beneficial insects)
  - [ ] Pesticides (crafted items)
- [ ] Define 5-10 common diseases/pests
  - [ ] Tomato blight
  - [ ] Potato beetles
  - [ ] Aphids
  - [ ] Wheat rust
  - [ ] Corn borers

## Phase 7: Integration & Balance

- [ ] Integrate with existing systems
  - [ ] Item system (medicinal/magical products)
  - [ ] Crafting (process plants, make pesticides)
  - [ ] Knowledge system (discovery mechanics)
  - [ ] Animal system (pollinators, pest predators)
- [ ] Balance tuning
  - [ ] Disease spread rates (not too aggressive)
  - [ ] Pest damage rates (challenging but not impossible)
  - [ ] Companion bonuses (meaningful but not overpowered)
  - [ ] Hybrid trait inheritance (interesting variation)

## Phase 8: Persistence

- [ ] Add serialization for new components
  - [ ] PropertyDiscoveryComponent
  - [ ] Disease/pest state
  - [ ] Hybrid plant genetics
- [ ] Handle migration for existing saves
  - [ ] Add properties to existing plants
  - [ ] Initialize discovery state

## Phase 9: UI Enhancements

- [ ] Add property indicators to plant inspector
  - [ ] Show medicinal/magical properties (if known)
  - [ ] Show toxic warnings
  - [ ] Show discovery progress
- [ ] Add disease/pest indicators
  - [ ] Visual infection markers
  - [ ] Health degradation display
  - [ ] Treatment options
- [ ] Add companion planting hints
  - [ ] Highlight beneficial neighbors (green)
  - [ ] Highlight antagonistic neighbors (red)
  - [ ] Show effect radii

## Testing

### Unit Tests
- [ ] Property discovery logic
- [ ] Companion effect calculations
- [ ] Pollination and hybridization
- [ ] Disease transmission
- [ ] Pest damage and reproduction

### Integration Tests
- [ ] Plant with properties -> harvest -> item has properties
- [ ] Companion plants -> verify growth boost
- [ ] Cross-pollination -> hybrid seed created
- [ ] Disease spreads between plants
- [ ] Pest population grows and damages crops

### Manual Tests
- [ ] Plant herb -> discover medicinal property -> craft healing potion
- [ ] Plant Three Sisters -> verify growth benefits
- [ ] Cross-pollinate tomatoes -> plant hybrid -> observe traits
- [ ] Wild plants spread naturally -> form ecosystem
- [ ] Disease outbreak -> treat with resistant variety

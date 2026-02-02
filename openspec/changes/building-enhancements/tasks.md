# Tasks: building-enhancements

## Overview
Enhance the building system to 100% spec coverage by adding procedural building generation, building upgrades, and maintenance & decay mechanics.

**Estimated Effort:** 15-20 hours | **Lines of Code:** ~1,500 LOC

## Phase 1: Procedural Generation

- [ ] Create `BuildingGenerator` system
  - [ ] Load base templates
  - [ ] Define variation rules per template
  - [ ] Implement procedural selection logic
- [ ] Implement variation aspects
  - [ ] Roof styles (peaked, flat, domed, thatched)
  - [ ] Wall materials (wood, stone, brick, mud)
  - [ ] Window and door placement
  - [ ] Decoration levels (plain, modest, ornate)
  - [ ] Room layouts
  - [ ] Height variations (1-3 stories)
- [ ] Add architectural styles
  - [ ] Medieval European
  - [ ] Asian (Japanese, Chinese)
  - [ ] Middle Eastern
  - [ ] Fantasy (elven, dwarven)
  - [ ] Sci-fi (futuristic, alien)
- [ ] Implement cultural influences
  - [ ] Local material availability affects choices
  - [ ] Climate affects roof styles (flat in dry, peaked in wet)
  - [ ] Wealth affects decoration and size
- [ ] Create generation presets
  - [ ] Poor hut
  - [ ] Middle-class house
  - [ ] Wealthy manor
  - [ ] Specialized workshop
  - [ ] Public building (town hall)

## Phase 2: Building Upgrades

- [ ] Create `BuildingUpgrade` system
  - [ ] Upgrade definitions database
  - [ ] Prerequisite checking
  - [ ] Upgrade application logic
- [ ] Implement upgrade prerequisites
  - [ ] Tech level requirements
  - [ ] Building age requirements
  - [ ] Owner skill requirements
  - [ ] Previous upgrade chains
- [ ] Define upgrade effects
  - [ ] Capacity increases (storage, beds, workstations)
  - [ ] Efficiency boosts (production, crafting speed)
  - [ ] Durability improvements
  - [ ] Comfort enhancements
  - [ ] Defense upgrades
  - [ ] Feature unlocks (new functionality)
- [ ] Add visual upgrade changes
  - [ ] Second story addition
  - [ ] Chimney addition
  - [ ] Window expansions
  - [ ] Material replacements (wood -> stone walls)
  - [ ] Decorative elements (shutters, trim, paint)
- [ ] Create upgrade paths for each building type
  - [ ] House: insulation -> foundation -> second story -> luxury interior
  - [ ] Workshop: better tools -> more workstations -> quality bonus -> specialization
  - [ ] Storage: shelving -> climate control -> security -> expansion
  - [ ] Farm: irrigation -> fertilizer -> greenhouse -> automation

## Phase 3: Maintenance & Decay

- [ ] Create `BuildingCondition` component
  - [ ] Track durability, cleanliness, functionality, aesthetics
  - [ ] Track decay factors (age, weather, usage, neglect)
  - [ ] Track critical damage instances
- [ ] Implement decay mechanics
  - [ ] Age-based decay (slow)
  - [ ] Weather-based decay (rain, snow, wind damage)
  - [ ] Usage-based decay (occupant wear and tear)
  - [ ] Neglect-based decay (no maintenance)
- [ ] Add critical damage types
  - [ ] Roof leaks (spread over time, cause interior damage)
  - [ ] Cracked walls (structural risk)
  - [ ] Rotting wood (material decay)
  - [ ] Broken windows (comfort/security loss)
  - [ ] Foundation shifts (major structural)
  - [ ] Pest infestations (health hazard)
  - [ ] Mold growth (health hazard)
- [ ] Implement maintenance system
  - [ ] Define maintenance tasks per building type
  - [ ] Schedule periodic maintenance
  - [ ] Agent performs maintenance actions
  - [ ] Materials consumed in repairs
- [ ] Add maintenance effects
  - [ ] Restore durability
  - [ ] Improve cleanliness
  - [ ] Fix critical damage
  - [ ] Prevent future decay
- [ ] Create failure cascades
  - [ ] Neglected roof leak -> water damage -> mold -> structural damage
  - [ ] Cracked wall -> foundation shift -> collapse risk
  - [ ] Pest infestation -> wood rot -> structural failure

## Phase 4: Integration

- [ ] Integrate generation with placement system
  - [ ] Generate building variant on placement
  - [ ] Show preview before construction
  - [ ] Adjust materials based on variant
- [ ] Integrate upgrades with construction system
  - [ ] Upgrade construction works like building
  - [ ] Progress tracking for upgrades
  - [ ] Material delivery for upgrades
- [ ] Integrate decay with game loop
  - [ ] Decay system runs periodically (not every tick)
  - [ ] Weather system affects decay rates
  - [ ] Usage tracking updates wear
- [ ] Add agent interactions
  - [ ] Agents notice critical damage
  - [ ] Agents perform maintenance autonomously
  - [ ] Agents prioritize urgent repairs

## Phase 5: Balance & Tuning

- [ ] Tune generation probabilities
  - [ ] Ensure variety without chaos
  - [ ] Wealth levels produce appropriate buildings
  - [ ] Cultural styles are recognizable
- [ ] Balance upgrade costs and benefits
  - [ ] Upgrades feel worthwhile
  - [ ] Progression is satisfying
  - [ ] Not too cheap or expensive
- [ ] Balance decay rates
  - [ ] Buildings last reasonable time
  - [ ] Maintenance feels necessary but not overwhelming
  - [ ] Critical damage is serious but repairable

## Phase 6: Persistence

- [ ] Add serialization for new components
  - [ ] BuildingCondition
  - [ ] Upgrade state
  - [ ] Critical damage instances
  - [ ] Generated variation data
- [ ] Handle migration for existing saves
  - [ ] Generate variants for existing buildings
  - [ ] Initialize condition for existing buildings
  - [ ] Apply retroactive decay based on age

## Phase 7: UI Enhancements

- [ ] Add building inspector enhancements
  - [ ] Show condition meters (durability, cleanliness, etc.)
  - [ ] Show critical damage list
  - [ ] Show maintenance schedule
  - [ ] Show upgrade options
- [ ] Add upgrade UI
  - [ ] Available upgrades list
  - [ ] Prerequisite status
  - [ ] Cost breakdown
  - [ ] "Upgrade Now" button
- [ ] Add maintenance UI
  - [ ] Scheduled tasks list
  - [ ] Overdue tasks highlighted
  - [ ] "Perform Maintenance" button
  - [ ] Material requirements
- [ ] Add visual decay indicators
  - [ ] Damaged textures (cracks, stains)
  - [ ] Color desaturation (faded paint)
  - [ ] Missing elements (broken windows)
  - [ ] Visual severity (minor -> major damage)

## Testing

### Unit Tests
- [ ] Building generation produces valid buildings
- [ ] Variation rules apply correctly
- [ ] Upgrade prerequisites check correctly
- [ ] Decay calculations are accurate
- [ ] Critical damage triggers at correct thresholds

### Integration Tests
- [ ] Generate building -> construct -> verify matches
- [ ] Apply upgrade -> building gains effects
- [ ] Building decays over time -> critical damage appears
- [ ] Perform maintenance -> condition improves
- [ ] Save/load preserves condition and upgrades

### Manual Tests
- [ ] Generate 10 houses -> verify unique variations
- [ ] Upgrade house through full path -> verify progression
- [ ] Let building decay -> verify critical damage -> repair
- [ ] Observe maintenance schedule -> verify agents perform tasks
- [ ] Test different architectural styles -> verify visual differences

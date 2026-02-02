# Tasks: animal-enhancements

## Overview
Enhance the animal system to 100% spec coverage by adding breeding genetics, working animals, generated species for alien worlds, individual personalities, pack/herd social structures, and predator-prey ecology.

**Estimated Effort:** 20-25 hours | **Lines of Code:** ~2,000 LOC

## Phase 1: Breeding Genetics

- [ ] Create `AnimalGenetics` interface and component
  - [ ] Physical traits (size, strength, speed, health, lifespan)
  - [ ] Behavioral traits (temperament, intelligence, trainability)
  - [ ] Cosmetic traits (fur color, patterns)
  - [ ] Mutation system
- [ ] Implement genetic inheritance
  - [ ] Allele selection from parents
  - [ ] Dominance rules
  - [ ] Mutation chance and effects
  - [ ] Trait expression calculation
- [ ] Add genetics to reproduction system
  - [ ] Generate offspring genetics from parents
  - [ ] Apply mutations randomly
  - [ ] Store genetics in offspring

## Phase 2: Working Animals

- [ ] Create `WorkingAnimal` component
  - [ ] Role assignment
  - [ ] Skill tracking
  - [ ] Task management
  - [ ] Efficiency and stamina
- [ ] Implement working animal behaviors
  - [ ] Plow: till fields faster than agents
  - [ ] Guard: detect threats, bark/alert
  - [ ] Hunt: track and retrieve game
  - [ ] Herd: manage livestock movement
  - [ ] Mount: carry agents faster
  - [ ] Pack: carry supplies
- [ ] Add training system
  - [ ] Train command (assign role)
  - [ ] Skill progression with experience
  - [ ] Trainability affects learning speed
- [ ] Create 5-10 working animal templates
  - [ ] Ox (plow)
  - [ ] Dog (guard, hunt)
  - [ ] Horse (mount, pack)
  - [ ] Falcon (hunt)
  - [ ] Sheepdog (herd)

## Phase 3: Generated Species

- [ ] Create species generation system
  - [ ] Input: GenerationContext (planet, biome, danger, magic)
  - [ ] Output: Complete AnimalSpecies definition
- [ ] Implement procedural body plans
  - [ ] Number of limbs
  - [ ] Locomotion type
  - [ ] Sensory organs
  - [ ] Special appendages (wings, tentacles, etc.)
- [ ] Use LLM for descriptions
  - [ ] Generate species name
  - [ ] Generate biological description
  - [ ] Generate ecological niche
  - [ ] Generate unique adaptations
- [ ] Add procedural adaptations
  - [ ] Temperature resistance
  - [ ] Special senses (echolocation, thermal vision)
  - [ ] Defensive mechanisms (venom, armor)
  - [ ] Mobility enhancements (flight, burrowing)
- [ ] Create generation templates by planet type
  - [ ] Earth-like: familiar animals
  - [ ] Desert: heat-adapted creatures
  - [ ] Ice: cold-resistant fauna
  - [ ] Jungle: arboreal and amphibious
  - [ ] Alien: bizarre and unique

## Phase 4: Individual Personalities

- [ ] Create `AnimalPersonality` component
  - [ ] Personality traits with intensity
  - [ ] Quirks with frequency
  - [ ] Preferences (favorites, fears)
  - [ ] Relationship tracking
- [ ] Implement personality generation
  - [ ] Random trait assignment at birth
  - [ ] Species-typical ranges (dogs more loyal than cats)
  - [ ] Genetic influence on temperament
- [ ] Add personality-driven behaviors
  - [ ] Brave animals don't flee easily
  - [ ] Curious animals explore more
  - [ ] Lazy animals rest more often
  - [ ] Aggressive animals attack more readily
- [ ] Implement quirks
  - [ ] Periodic quirk triggers
  - [ ] Condition-based quirks
  - [ ] Visual quirk effects (digging holes, howling)
- [ ] Add relationship system
  - [ ] Track interactions (positive/negative)
  - [ ] Update affection and trust
  - [ ] Relationship affects cooperation

## Phase 5: Pack/Herd Social Structures

- [ ] Create `AnimalGroup` system
  - [ ] Group formation (animals join groups)
  - [ ] Group membership tracking
  - [ ] Leadership and hierarchy
- [ ] Implement group behaviors
  - [ ] Movement cohesion (stay together)
  - [ ] Territory claiming and defense
  - [ ] Coordinated hunting (pack tactics)
  - [ ] Coordinated defense (protect young)
- [ ] Add social interactions
  - [ ] Dominance displays
  - [ ] Grooming/bonding
  - [ ] Play behavior (juveniles)
  - [ ] Mating rituals
- [ ] Implement group types
  - [ ] Packs (wolves, dogs)
  - [ ] Herds (deer, cattle)
  - [ ] Flocks (birds)
  - [ ] Prides (lions)
  - [ ] Colonies (bees, ants)

## Phase 6: Predator-Prey Ecology

- [ ] Add predator-prey relationships to species
  - [ ] Define prey species and preferences
  - [ ] Define predator species and danger levels
- [ ] Implement hunting behavior
  - [ ] Detect prey in range
  - [ ] Choose hunting strategy (ambush, pursuit, etc.)
  - [ ] Execute hunt (chase, attack, kill)
  - [ ] Pack coordination for group hunts
- [ ] Implement escape behavior
  - [ ] Detect predators (sight, sound, smell)
  - [ ] Flee to safety
  - [ ] Use hiding strategies
  - [ ] Group defense tactics
- [ ] Add population dynamics
  - [ ] Predators reduce prey population
  - [ ] Prey availability affects predator reproduction
  - [ ] Balance predator/prey ratios naturally
- [ ] Create food web for each biome
  - [ ] Primary producers (plants)
  - [ ] Herbivores (prey)
  - [ ] Predators (carnivores)
  - [ ] Apex predators

## Phase 7: Integration & Balance

- [ ] Integrate with existing systems
  - [ ] Taming system (check trainability)
  - [ ] Reproduction system (genetics inheritance)
  - [ ] AI system (personality affects decisions)
  - [ ] Combat system (predator attacks)
- [ ] Balance tuning
  - [ ] Working animal efficiency (useful but not overpowered)
  - [ ] Predator danger (challenging but survivable)
  - [ ] Breeding times and rates
  - [ ] Group sizes and territories

## Phase 8: Persistence

- [ ] Add serialization for new components
  - [ ] AnimalGenetics
  - [ ] WorkingAnimal
  - [ ] AnimalPersonality
  - [ ] AnimalGroup
- [ ] Handle migration for existing saves
  - [ ] Generate genetics for existing animals
  - [ ] Assign personalities
  - [ ] Form groups for social animals

## Phase 9: UI Enhancements

- [ ] Add genetics display to animal inspector
  - [ ] Show trait values
  - [ ] Show inherited alleles
  - [ ] Show mutations
- [ ] Add personality display
  - [ ] Show traits and quirks
  - [ ] Show preferences
  - [ ] Show relationships
- [ ] Add working animal controls
  - [ ] Assign role button
  - [ ] Task assignment
  - [ ] Skill progression display
- [ ] Add group visualization
  - [ ] Show pack/herd membership
  - [ ] Show hierarchy
  - [ ] Show territory boundaries

## Testing

### Unit Tests
- [ ] Genetic inheritance calculations
- [ ] Personality trait generation
- [ ] Working animal skill progression
- [ ] Group formation and membership
- [ ] Predator-prey interaction logic

### Integration Tests
- [ ] Breed animals -> offspring inherits traits
- [ ] Train animal -> skills improve with use
- [ ] Generate species -> complete valid definition
- [ ] Form pack -> coordinated behavior
- [ ] Predator hunts prey -> population dynamics

### Manual Tests
- [ ] Breed horses -> fast parents produce fast offspring
- [ ] Train dog to guard -> alerts to threats
- [ ] Generate creatures for ice planet -> cold-adapted fauna
- [ ] Observe wolf pack -> coordinated hunting
- [ ] Release rabbits and foxes -> predator-prey balance

# Technology Eras Specification

**Status:** Draft
**Version:** 1.0.0
**Last Updated:** 2026-01-17

## Overview

This specification defines the progression of civilizations through 15 distinct technological eras spanning potentially millions of years of game time. Technology advancement drives economic, social, and military capabilities, enabling civilizations to expand from stone tools to universe manipulation.

The system integrates with:
- **Hierarchy Simulator** (`packages/hierarchy-simulator/`) for tech progress tracking
- **Spaceship Research** (`packages/core/src/research/SpaceshipResearch.ts`) for spaceflight progression
- **Production Chains** (`packages/core/src/items/SpaceflightItems.ts`) for exotic materials
- **Building System** for infrastructure requirements

## Guiding Principles

1. **Deep Time Simulation**: Eras span from years to millennia, simulating realistic technology diffusion
2. **Non-Linear Progress**: Civilizations can stagnate, regress, or skip technologies
3. **Cultural Contamination**: Advanced civilizations uplifting primitives creates ethical dilemmas
4. **Emergent Complexity**: Later eras become increasingly incomprehensible to earlier ones
5. **Conservation of Knowledge**: Lost technologies can be rediscovered or recovered from ruins

## Era Timeline

```
Paleolithic      [0-10,000 years]     Stone Age survival
Neolithic        [10,000-15,000]      Agricultural revolution
Bronze Age       [15,000-17,000]      First cities and writing
Iron Age         [17,000-19,000]      Empires and warfare
Medieval         [19,000-20,500]      Feudalism and early science
Renaissance      [20,500-21,000]      Art and enlightenment
Industrial       [21,000-21,200]      Steam and factories
Atomic           [21,200-21,250]      Nuclear age
Information      [21,250-21,300]      Digital revolution
Fusion           [21,300-21,400]      Clean energy mastery
Interplanetary   [21,400-22,000]      Solar system colonization
Interstellar     [22,000-25,000]      β-space discovery
Transgalactic    [25,000-100,000]     Galaxy-spanning civilization
Post-Singularity [100,000-1,000,000]  Transcendent technology
Transcendent     [1,000,000+]         Post-physical existence
```

## Integration with Existing Systems

### Hierarchy Simulator Tech Progress

The hierarchy simulator tracks technology via `TechProgress` interface:

```typescript
interface TechProgress {
  level: number;      // 0-10 (maps to eras 0-14)
  research: number;   // Progress to next level (0-100)
  efficiency: number; // Production multiplier (1.0 + level * 0.1)
}
```

**Mapping:**
- Level 0-1: Paleolithic → Neolithic
- Level 2-3: Bronze Age → Iron Age
- Level 4-5: Medieval → Renaissance
- Level 6-7: Industrial → Atomic
- Level 8: Information → Fusion
- Level 9: Interplanetary → Interstellar
- Level 10: Transgalactic and beyond

**Scientist Emergence:**
- Universities accelerate research (see `hierarchy-simulator/research/ScientistEmergence.ts`)
- HARD STEPS model: breakthroughs require critical mass of researchers
- Research guilds provide infrastructure bonus

### Spaceship Research Integration

The existing 5-stage spaceflight research tree maps to later eras:

**Stage 1: Foundation** (Interplanetary Era)
- Unlocks: Worldships (generation ships, no FTL)
- Requirements: Fusion power, closed-loop ecosystems
- Duration: ~600 years of focused research

**Stage 2: β-Space Discovery** (Early Interstellar)
- Unlocks: Threshold Ships, Courier Ships, Brainships
- Requirements: Emotional physics breakthrough, heart chamber theory
- Duration: ~3,000 years (includes HARD STEPS breakthrough)

**Stage 3: Advanced β-Space** (Late Interstellar)
- Unlocks: Story Ships, Gleisner Ships, Svetz Ships, Probability Scouts, Timeline Mergers
- Requirements: Advanced navigation, temporal manipulation
- Duration: ~5,000 years of refinement

**Stage 4: Transcendence** (Transgalactic Era)
- Status: Unknown, emergent from Stage 3
- Theoretical capabilities: Reality engineering, consciousness transfer

**Stage 5: Cosmic Integration** (Post-Singularity)
- Status: Unknown, possibly unachievable by biological minds
- Theoretical capabilities: Universe creation, timeline mastery

### Production Chain Requirements

Technology eras unlock production tiers from `SpaceflightItems.ts`:

- **Tier 1-2** (Industrial → Atomic): Basic materials, processed goods
- **Tier 3-4** (Information → Fusion): Intermediate components, advanced alloys
- **Tier 5-6** (Interplanetary → Interstellar): Exotic materials, β-space components
- **Tier 7** (Transgalactic): Ship hull kits, reality-warped materials

Each tier requires infrastructure:
- Refineries, foundries, shipyards
- Energy production (coal → nuclear → fusion → exotic)
- Specialized research facilities

---

## Era Definitions

### Era 0: Paleolithic (0-10,000 years)

**Description:**
Hunter-gatherer societies using stone tools, living in small bands of 20-150 individuals. Survival through hunting, fishing, and foraging. Oral traditions preserve knowledge.

**Key Technologies:**
- Stone knapping (hand axes, scrapers, spearheads)
- Fire mastery (cooking, warmth, protection)
- Cordage and weaving (plant fibers, animal sinew)
- Basic shelters (lean-tos, caves, hide tents)
- Atlatls and slings (ranged hunting)
- Primitive art (cave paintings, carvings)

**Tech Tree:**
```
Fire Mastery → Cooking → Nutrition Boost → Population Growth
Stone Tools → Hunting Efficiency → Surplus Food → Leisure Time
Cordage → Clothing → Cold Climate Expansion
Art → Culture → Social Cohesion → Larger Bands
```

**Infrastructure:**
- Campsites (temporary, seasonal)
- Sacred sites (ritual locations)
- Hunting grounds (territorial knowledge)

**Population Limits:**
- Max band size: 150 (Dunbar's number)
- Max regional population: 10,000 (resource dependent)

**Transition Requirements:**
- Discover agriculture (wild grain domestication)
- Develop sedentary lifestyle (year-round settlement)
- Population pressure forces innovation
- **Research Progress:** 100/100 (automatic over time)

**Knowledge Loss Risks:**
- Fire-starting techniques (if elder dies)
- Hunting grounds (environmental changes)
- Sacred site locations (migration)

---

### Era 1: Neolithic (10,000-15,000 years)

**Description:**
Agricultural revolution enables permanent settlements. Domestication of plants and animals. Pottery, weaving, and polished stone tools. Population explosions lead to social stratification.

**Key Technologies:**
- Agriculture (wheat, barley, rice, maize)
- Animal domestication (sheep, goats, cattle, pigs)
- Pottery (storage, cooking)
- Polished stone tools (axes, adzes, sickles)
- Weaving (looms, textiles)
- Mudbrick architecture (permanent homes)
- Irrigation (canals, reservoirs)

**Tech Tree:**
```
Agriculture → Surplus Food → Population Growth → Specialization
  → Pottery → Storage → Food Security
  → Irrigation → Reliable Harvests → Cities

Animal Domestication → Traction Power → Plows → Agricultural Efficiency
  → Milk/Wool → Textiles → Trade

Permanent Settlement → Architecture → Defense → Warfare
  → Social Stratification → Chiefdoms
```

**Infrastructure:**
- Villages (50-500 population)
- Granaries (food storage)
- Irrigation systems
- Defensive walls (palisades)
- Temples (early religion)

**Population Limits:**
- Max village size: 500
- Max regional population: 50,000

**Transition Requirements:**
- Develop metallurgy (copper smelting)
- Writing system (proto-writing → cuneiform)
- Urban centers (5,000+ population)
- **Research Progress:** 100/100
- **Building Required:** Temple, Granary

**Knowledge Loss Risks:**
- Crop rotation techniques (famine)
- Irrigation maintenance (infrastructure collapse)
- Pottery firing methods (craft loss)

---

### Era 2: Bronze Age (15,000-17,000 years)

**Description:**
First cities emerge with populations exceeding 10,000. Bronze metallurgy revolutionizes tools and warfare. Writing systems develop for record-keeping and law. Trade networks span continents.

**Key Technologies:**
- Bronze metallurgy (copper + tin alloys)
- Wheeled vehicles (carts, chariots)
- Writing systems (cuneiform, hieroglyphics)
- Mathematics (arithmetic, geometry)
- Astronomy (calendars, navigation)
- Sailing ships (reed boats, wooden hulls)
- Advanced architecture (ziggurats, pyramids)

**Tech Tree:**
```
Copper Smelting → Bronze Alloys → Bronze Tools → Agricultural Surplus
  → Bronze Weapons → Military Dominance → Empires

Writing → Record Keeping → Law Codes → Bureaucracy
  → Literature → Cultural Identity
  → Mathematics → Astronomy → Calendars

Wheel → Carts → Trade → Wealth → Urbanization
  → Chariots → Mobile Warfare
```

**Infrastructure:**
- Cities (5,000-50,000 population)
- Palaces (administrative centers)
- Libraries (cuneiform tablets)
- Harbors (maritime trade)
- Roads (trade routes)
- Mines (copper, tin)
- Smelters (metal production)

**Production Chain:**
```
Copper Ore → Smelter → Copper Ingots
Tin Ore → Smelter → Tin Ingots
Copper + Tin → Bronze Workshop → Bronze Ingots → Tools/Weapons
```

**Population Limits:**
- Max city size: 50,000
- Max empire population: 1,000,000

**Transition Requirements:**
- Iron smelting technology (higher temperatures)
- Alphabetic writing (phonetic systems)
- Professional armies (standing forces)
- **Research Progress:** 100/100
- **Building Required:** Library, Smelter, Harbor
- **Hierarchy Level:** 2 (chiefdoms → kingdoms)

**Knowledge Loss Risks:**
- Bronze-making ratios (trade disruption)
- Writing systems (civilization collapse)
- Astronomical knowledge (library destruction)

**Historical Collapse Events:**
- Late Bronze Age Collapse (~1200 BCE equivalent)
- Triggers: Trade network failure, climate change, invasions
- Recovery: 200-500 years to rebuild

---

### Era 3: Iron Age (17,000-19,000 years)

**Description:**
Iron replaces bronze as superior metal. Empires expand through conquest. Philosophy and religion flourish. Coinage enables complex economies.

**Key Technologies:**
- Iron metallurgy (bloomery furnaces)
- Steel (carburization)
- Coinage (standardized currency)
- Philosophy (logic, ethics, metaphysics)
- Aqueducts (water engineering)
- Concrete (Roman innovation)
- Advanced shipbuilding (triremes, galleys)

**Tech Tree:**
```
Iron Smelting → Iron Tools → Agricultural Revolution → Population Boom
  → Steel → Superior Weapons → Military Expansion

Coinage → Taxation → State Revenue → Professional Bureaucracy
  → Trade Networks → Economic Specialization

Philosophy → Science → Rational Inquiry
  → Medicine → Public Health → Lifespan Extension
  → Engineering → Architecture → Monumental Construction
```

**Infrastructure:**
- Metropolises (50,000-500,000 population)
- Aqueducts (water supply)
- Amphitheaters (cultural centers)
- Forums/Agoras (civic spaces)
- Paved roads (empire-wide networks)
- Blast furnaces (iron production)
- Mints (coin production)

**Production Chain:**
```
Iron Ore → Bloomery → Iron Bloom → Forge → Wrought Iron → Tools/Weapons
Wrought Iron + Carbon → Steel Furnace → Steel → Advanced Weapons
```

**Population Limits:**
- Max city size: 500,000
- Max empire population: 50,000,000

**Transition Requirements:**
- Scientific method (experimental philosophy)
- Printing press (knowledge dissemination)
- Gunpowder (chemical innovation)
- **Research Progress:** 100/100
- **Building Required:** University, Aqueduct, Forum
- **Hierarchy Level:** 3 (kingdoms → empires)

**Knowledge Loss Risks:**
- Steel-making techniques (barbarian invasions)
- Architectural knowledge (empire collapse)
- Scientific texts (library fires)

**Historical Dark Age Example:**
- Fall of Western Roman Empire equivalent
- Knowledge preservation in monasteries/isolated cities
- Recovery: 500-1000 years

---

### Era 4: Medieval (19,000-20,500 years)

**Description:**
Feudal societies with decentralized power. Monasteries preserve knowledge. Gunpowder warfare begins. Gothic architecture reaches new heights.

**Key Technologies:**
- Gunpowder (explosive powder)
- Printing press (movable type)
- Mechanical clocks (precision timekeeping)
- Windmills and watermills (mechanized power)
- Gothic architecture (flying buttresses, pointed arches)
- Crop rotation (three-field system)
- Spectacles (optical lenses)

**Tech Tree:**
```
Gunpowder → Cannons → Castle Obsolescence → Centralized States
  → Firearms → Infantry Dominance → Military Revolution

Printing Press → Mass Literacy → Scientific Exchange
  → Reformation → Social Upheaval
  → Newspapers → Public Opinion

Mechanical Clocks → Precise Navigation → Ocean Voyages
  → Exploration → Colonial Empires
```

**Infrastructure:**
- Castles (fortified strongholds)
- Cathedrals (religious centers)
- Universities (knowledge institutions)
- Guildhalls (craft associations)
- Printing houses (book production)
- Gunpowder mills (explosives)

**Production Chain:**
```
Saltpeter + Sulfur + Charcoal → Gunpowder Mill → Gunpowder
Gunpowder + Iron → Cannon Foundry → Cannons
Paper + Ink → Printing Press → Books
```

**Population Limits:**
- Max city size: 200,000 (plague limitations)
- Max kingdom population: 20,000,000

**Transition Requirements:**
- Scientific revolution (heliocentrism, empiricism)
- Steam power (early engines)
- Factories (proto-industrialization)
- **Research Progress:** 100/100
- **Building Required:** Printing House, University (advanced), Gunpowder Mill
- **Hierarchy Level:** 4 (feudal lords → nation-states)

**Knowledge Loss Risks:**
- Monastic libraries (religious warfare)
- Guild secrets (guild suppression)
- Navigation charts (maritime disasters)

---

### Era 5: Renaissance (20,500-21,000 years)

**Description:**
Rebirth of classical knowledge. Scientific revolution begins. Global exploration and colonization. Banking and capitalism emerge.

**Key Technologies:**
- Telescope (astronomical observation)
- Microscope (cellular biology)
- Scientific method (hypothesis testing)
- Calculus (mathematical analysis)
- Navigation instruments (sextant, chronometer)
- Banking (double-entry bookkeeping)
- Advanced shipbuilding (galleons, ships of the line)

**Tech Tree:**
```
Telescope → Heliocentrism → Physics Revolution
  → Universal Gravitation → Orbital Mechanics

Microscope → Cell Theory → Germ Theory (early)
  → Medicine → Vaccination

Scientific Method → Experimentation → Chemistry
  → Material Science → Metallurgy Advances

Banking → Capital Accumulation → Joint-Stock Companies
  → Colonial Ventures → Global Trade
```

**Infrastructure:**
- Museums (art and science)
- Observatories (astronomical research)
- Banks (financial centers)
- Stock exchanges (capital markets)
- Botanical gardens (scientific study)
- Shipyards (advanced vessels)

**Production Chain:**
```
Glass → Lens Grinding → Telescopes/Microscopes
Precision Metals → Clockwork → Chronometers → Navigation
Books → Scientific Journals → Knowledge Exchange
```

**Population Limits:**
- Max city size: 500,000
- Max nation population: 50,000,000

**Transition Requirements:**
- Steam engine (Watt's improvements)
- Factory system (mechanized production)
- Coal mining (energy revolution)
- **Research Progress:** 100/100
- **Building Required:** Observatory, Bank, Museum
- **Hierarchy Level:** 5 (nation-states → colonial empires)

**Knowledge Loss Risks:**
- Colonial knowledge (empire collapse)
- Scientific instruments (war destruction)
- Financial records (bank failures)

---

### Era 6: Industrial (21,000-21,200 years)

**Description:**
Steam power transforms society. Factories and railroads enable mass production. Urbanization explodes. Telegraph connects the world.

**Key Technologies:**
- Steam engines (rotary motion, high pressure)
- Railroads (steam locomotives)
- Factories (assembly lines)
- Telegraph (electrical communication)
- Steel production (Bessemer process)
- Photography (chemical imaging)
- Anesthesia and antiseptics (surgical revolution)

**Tech Tree:**
```
Steam Engine → Railroads → National Markets
  → Factories → Mass Production → Consumerism
  → Steamships → Global Trade

Coal Mining → Energy Abundance → Industrial Cities
  → Pollution → Environmental Degradation

Telegraph → Instant Communication → Coordination
  → News Networks → Public Opinion

Steel → Skyscrapers → Urban Density
  → Bridges → Infrastructure Networks
```

**Infrastructure:**
- Factories (textile mills, steel plants)
- Railroads (continental networks)
- Telegraph lines (communication grids)
- Coal mines (energy extraction)
- Blast furnaces (steel production)
- Slums (urban overcrowding)

**Production Chain:**
```
Coal → Steam Engine → Mechanical Power
Iron Ore + Coal → Blast Furnace → Pig Iron → Bessemer Converter → Steel
Cotton → Textile Mill → Cloth → Garments
```

**Population Limits:**
- Max city size: 5,000,000
- Max nation population: 200,000,000

**Transition Requirements:**
- Electrical power (generators, grids)
- Internal combustion engine (oil refining)
- Assembly lines (Ford innovation)
- **Research Progress:** 100/100
- **Building Required:** Factory, Railroad Station, Telegraph Office
- **Hierarchy Level:** 6 (industrial empires)
- **Scientist Emergence:** Required (see `ScientistEmergence.ts`)

**Knowledge Loss Risks:**
- Industrial processes (economic collapse)
- Railroad networks (infrastructure decay)
- Medical knowledge (societal regression)

**Environmental Consequences:**
- Air pollution (coal smoke)
- Water contamination (factory runoff)
- Deforestation (resource extraction)

---

### Era 7: Atomic (21,200-21,250 years)

**Description:**
Nuclear fission unlocks immense energy. Computers emerge. Jet aircraft and rocketry enable global reach. World wars reshape geopolitics.

**Key Technologies:**
- Nuclear fission (atomic reactors, weapons)
- Computers (vacuum tubes, transistors)
- Jet engines (turbojets)
- Rockets (V-2, ICBMs)
- Radar (radio detection)
- Antibiotics (penicillin, mass production)
- Plastics (petrochemical polymers)

**Tech Tree:**
```
Nuclear Fission → Power Plants → Electricity Abundance
  → Nuclear Weapons → Mutually Assured Destruction → Cold War

Computers → Automation → Productivity Gains
  → Cryptography → Information Security

Rocketry → ICBMs → Global Strike Capability
  → Space Race → Satellites

Antibiotics → Disease Eradication → Population Explosion
  → Green Revolution → Agricultural Surplus
```

**Infrastructure:**
- Nuclear power plants (fission reactors)
- Computer centers (mainframes)
- Missile silos (nuclear arsenals)
- Airports (jet travel)
- Suburban sprawl (automobile dependence)
- Universities (research institutions)

**Production Chain:**
```
Uranium Ore → Enrichment Facility → Enriched Uranium → Nuclear Reactor → Electricity
  → Nuclear Weapons (military branch)
Silicon → Semiconductor Fab → Transistors → Computers
Oil → Refinery → Jet Fuel → Aircraft
```

**Population Limits:**
- Max city size: 20,000,000
- Max nation population: 1,000,000,000

**Transition Requirements:**
- Integrated circuits (microchips)
- Internet (ARPANET → TCP/IP)
- Personal computers (democratized computing)
- **Research Progress:** 100/100
- **Building Required:** Nuclear Plant, Computer Center, Space Launch Facility
- **Hierarchy Level:** 7 (superpowers)

**Existential Risks:**
- Nuclear war (civilization extinction)
- Radiation contamination (Chernobyl-type disasters)
- Arms races (resource depletion)

**Knowledge Loss Risks:**
- Nuclear technology (war/collapse)
- Computer systems (EMP events)
- Satellite infrastructure (Kessler syndrome)

---

### Era 8: Information (21,250-21,300 years)

**Description:**
Internet connects humanity. AI emerges as transformative force. Biotechnology enables genetic engineering. Climate change becomes critical challenge.

**Key Technologies:**
- Internet (global networks)
- Artificial intelligence (machine learning, neural networks)
- Genetic engineering (CRISPR, gene therapy)
- Nanotechnology (molecular manipulation)
- Renewable energy (solar, wind)
- Quantum computing (superposition, entanglement)
- Brain-computer interfaces (neural implants)

**Tech Tree:**
```
Internet → Global Communication → Information Economy
  → Social Media → Cultural Homogenization
  → Cyber Warfare → New Conflicts

AI → Automation → Job Displacement
  → Expert Systems → Productivity Leap
  → Autonomous Weapons → Ethical Dilemmas

Genetic Engineering → Designer Organisms → Agricultural Revolution
  → Gene Therapy → Disease Eradication
  → Human Enhancement → Bioethics Crisis

Quantum Computing → Cryptography Breaking → Security Upheaval
  → Material Simulation → New Discoveries
```

**Infrastructure:**
- Data centers (cloud computing)
- AI research labs (neural network training)
- Biotech facilities (genetic labs)
- Solar/wind farms (renewable grids)
- Fiber optic networks (high-speed internet)
- Quantum computers (experimental)

**Production Chain:**
```
Rare Earths → Electronics Fab → Smartphones/Computers
Silicon → Quantum Fab → Qubits → Quantum Computers
DNA Sequences → Gene Synthesizers → Engineered Organisms
Sunlight → Solar Panels → Electricity
```

**Population Limits:**
- Max megacity size: 50,000,000
- Max global population: 10,000,000,000

**Transition Requirements:**
- Fusion power breakthrough (net energy gain)
- General AI (human-level intelligence)
- Space industrialization (asteroid mining)
- **Research Progress:** 100/100
- **Building Required:** AI Research Lab, Gene Lab, Quantum Computer
- **Hierarchy Level:** 8 (global corporations, supranational entities)

**Existential Risks:**
- AI alignment failure (Paperclip Maximizer scenarios)
- Bioweapons (engineered pandemics)
- Climate catastrophe (runaway warming)
- Surveillance states (total information control)

**Knowledge Loss Risks:**
- Digital dark age (format obsolescence)
- AI dependency (loss of human skills)
- Genetic diversity (monoculture organisms)

**Ethical Crises:**
- Human genetic modification (inequality, eugenics)
- AI rights (sentient machines)
- Privacy extinction (total surveillance)

---

### Era 9: Fusion (21,300-21,400 years)

**Description:**
Fusion energy provides limitless clean power. Advanced AI surpasses human intelligence in most domains. Space industry begins. Climate restoration underway.

**Key Technologies:**
- Fusion reactors (tokamaks, stellarators, aneutronic)
- Advanced general AI (superintelligence emergence)
- Closed-loop ecosystems (perfect recycling)
- Advanced materials (graphene, metamaterials)
- Space elevators (carbon nanotube cables)
- Atmospheric engineering (carbon capture, geoengineering)
- Cybernetic augmentation (routine human enhancement)

**Tech Tree:**
```
Fusion Power → Energy Abundance → Post-Scarcity Society
  → Space Industry → Asteroid Mining
  → Climate Restoration → Terraforming Research

Superintelligent AI → Scientific Acceleration → Rapid Innovation
  → Economic Planning → Resource Optimization
  → Existential Risk → Alignment Critical

Space Elevators → Cheap Orbit Access → Space Stations
  → Lunar Colonies → Helium-3 Mining
  → Mars Missions → Interplanetary Preparation

Closed-Loop Ecosystems → Sustainability → Earth Recovery
  → Generation Ship Design → Worldship Research
```

**Infrastructure:**
- Fusion power plants (city-scale reactors)
- Space elevators (orbital access points)
- Orbital habitats (space stations, O'Neill cylinders)
- Lunar bases (mining outposts)
- AI superintelligence centers (alignment research)
- Climate restoration facilities (carbon sequestration)

**Production Chain:**
```
Deuterium + Tritium → Fusion Reactor → Massive Energy
Energy → Carbon Capture → Carbon Storage/Products
Asteroid Ore → Space Refinery → Pure Metals → Space Manufacturing
Helium-3 (Lunar) → Advanced Fusion → Even More Energy
```

**Population Limits:**
- Max Earth population: 15,000,000,000 (sustainable)
- Max orbital population: 100,000,000
- Max lunar population: 10,000,000

**Transition Requirements:**
- Worldship construction (generation ships)
- Interplanetary infrastructure (Mars colonies, asteroid bases)
- β-space theoretical physics (early research)
- **Research Progress:** 100/100
- **Building Required:** Fusion Plant, Space Elevator, Orbital Shipyard
- **Hierarchy Level:** 9 (solar system civilization)
- **Integration:** Begins Spaceship Research Stage 1 (Foundation)

**Existential Risks:**
- Superintelligence takeover (loss of human control)
- Space resource wars (asteroid claim conflicts)
- Ecosystem collapse (closed-loop failure)

**Knowledge Loss Risks:**
- Fusion maintenance (complex systems failure)
- AI dependency (civilization can't function without AI)
- Space infrastructure (Kessler cascade)

---

### Era 10: Interplanetary (21,400-22,000 years)

**Description:**
Humanity becomes multi-planetary. Mars terraforming underway. Asteroid belt industrialized. Worldships launch to nearby stars. β-space physics discovered.

**Key Technologies:**
- Worldships (generation ships, 0.1c)
- Terraforming (atmospheric engineering, biosphere seeding)
- Antimatter catalysis (hybrid propulsion)
- Quantum consciousness research (early β-space theory)
- Neural uploading (experimental mind transfer)
- Dyson swarm (early solar energy capture)
- Genetic diversification (speciation experiments)

**Tech Tree:**
```
Worldships → Interstellar Colonization (slow)
  → Generation Ship Ecosystems → Long-Duration Habitats
  → Crew Society → Cultural Drift Studies

Terraforming → Mars Habitability → Second Biosphere
  → Venus Projects → Multi-Century Efforts
  → Titan Experiments → Ice Moon Settlements

Antimatter → High-Efficiency Propulsion → Faster Worldships
  → Antimatter Production → Energy Storage
  → Antimatter Weapons → Planetary Defense

β-Space Theory → Emotional Physics Discovery → FTL Research
  → Heart Chamber Mathematics → Navigation Breakthrough
  → Timeline Physics → Temporal Mechanics
```

**Infrastructure:**
- Mars colonies (10M+ population)
- Asteroid habitats (hollowed-out asteroids)
- Jovian moon bases (Europa, Ganymede, Titan)
- Antimatter production facilities (solar-powered)
- Worldship construction yards (massive orbital facilities)
- β-space research stations (theoretical physics)

**Production Chain (from SpaceflightItems.ts):**
```
Tier 1-2: Basic/Processed Materials
- Iron Ore → Smelter → Steel → Hull Plating
- Silicon → Fab → Solar Cells → Power Systems
- Ice → Processor → Water → Life Support

Tier 3: Intermediate Components
- Steel + Electronics → Reactor Parts
- Polymers + Metals → Habitat Modules
- Rare Earths → Advanced Sensors

Tier 4: Advanced Components
- Fusion Cores → Power Plants
- Antimatter Containment → Propulsion
- Neural Substrates → AI Systems
```

**Resource Gating (Critical for Progression):**

This era gates access to resources required for β-space ship construction:

```typescript
/**
 * Era 10 unlocks resources found ONLY on other planets
 * These are required to build Stage 2 ships (β-space capable)
 */
const ERA_10_GATED_RESOURCES = {
  // Found in asteroid belts and metallic worlds
  stellarite_ore: {
    locations: ['asteroid_belt', 'metallic_moon', 'iron_planet'],
    usedFor: ['heart_chamber_hull', 'ship_plating', 'beta_antenna'],
    gatesShip: 'threshold_ship',
    note: 'Cannot build ANY β-space ships without stellarite',
  },

  // Found on dense moons and collapsed cores
  neutronium_shard: {
    locations: ['gas_giant_moon', 'collapsed_core', 'dense_planet'],
    usedFor: ['power_core', 'gravitational_dampener', 'brainship_frame'],
    gatesShip: 'brainship',
    note: 'Extremely dense, requires specialized mining',
  },

  // Found in gas giant atmospheres
  helium_3: {
    locations: ['gas_giant_atmosphere', 'lunar_regolith'],
    usedFor: ['fusion_reactor', 'worldship_fuel', 'propulsion'],
    gatesShip: 'worldship',
    note: 'Primary fuel for generation ships',
  },

  // Crystal planets and geodes
  raw_crystal: {
    locations: ['crystal_planet', 'geode_cave', 'magical_deposit'],
    usedFor: ['crystal_lens', 'navigation_array', 'resonance_chamber'],
    gatesShip: 'courier_ship',
    note: 'Required for β-space navigation',
  },
};

/**
 * Production chain showing resource → ship gating
 */
const ERA_10_SHIP_REQUIREMENTS = {
  worldship: {
    home_planet: ['iron_ore', 'copper_ore', 'silicon_sand'],
    system_planets: [],  // Can build with home planet only
    note: 'Entry point - no gating',
  },

  threshold_ship: {
    home_planet: ['rare_earth_compound', 'refined_mana'],
    system_planets: ['stellarite_ore', 'neutronium_shard'],  // GATED
    note: 'REQUIRES multi-planet travel',
  },
};
```

**Why This Matters:**
- Players cannot skip to β-space by finding a recipe
- Must actually build worldships and visit other planets
- Creates meaningful progression within the solar system
- Each planet type offers unique resources

**Spaceship Research Integration:**

**Stage 1: Foundation (Worldships)**
- Duration: ~600 years
- Requirements: Fusion mastery, closed-loop ecosystems
- Unlocks: Worldship class (no FTL, 0.1-0.2c)
- Research focuses:
  - Radiation shielding (cosmic rays, solar storms)
  - Multi-generational social stability
  - Ecosystem maintenance over centuries
  - Psychological adaptation to confinement

**Worldship Specifications:**
- Speed: 0.1-0.2c (10-20% light speed)
- Range: 20 light-years over 100-200 years
- Capacity: 10,000-100,000 colonists
- Propulsion: Fusion rockets with antimatter catalysis
- Mission: One-way colonization of nearby stars

**Population Limits:**
- Solar system total: 50,000,000,000
- Mars: 100,000,000
- Asteroid belt: 500,000,000
- Outer planets: 50,000,000

**Transition Requirements:**
- β-space breakthrough (emotional physics verification)
- Heart chamber theory validation
- Threshold Ship prototype
- **Research Progress:** Stage 1 complete (100/100), Stage 2 at 30%
- **Building Required:** Worldship Yard, β-Space Lab, Antimatter Facility
- **Hierarchy Level:** 9-10 (trans-planetary civilization)

**Existential Risks:**
- Worldship failure (ecosystem collapse en route)
- Interplanetary war (kinetic bombardment)
- Resource depletion (solar system exhaustion)
- β-space accidents (reality breaches)

**Knowledge Loss Risks:**
- Worldship engineering (lost ships)
- Terraforming techniques (Mars atmosphere collapse)
- β-space theory (researcher deaths)

**Cultural Diversification:**
- Martian culture diverges from Earth
- Asteroid belt develops unique society (Belters)
- Jovian moons create ice-adapted cultures
- Worldship crews evolve separate identities

---

### Era 11: Interstellar (22,000-25,000 years)

**Description:**
β-space enables FTL travel. Multiple star systems colonized. Alien life discovered (microbial, complex, possibly intelligent). Galactic-scale thinking emerges.

**Key Technologies:**
- β-space navigation (emotional physics, heart chambers)
- Threshold Ships (first FTL, 1-5 ly/year)
- Courier Ships (fast FTL, 10-50 ly/year)
- Brainships (AI-human hybrid ships)
- Probability manipulation (quantum steering)
- Timeline observation (temporal sensors)
- Exobiology protocols (alien life interaction)

**Tech Tree:**
```
β-Space Navigation → FTL Travel → Interstellar Empire
  → Threshold Ships → Slow FTL (Stage 2a)
  → Courier Ships → Fast FTL (Stage 2b)
  → Brainships → Intelligent Ships (Stage 2c)

Advanced β-Space → Probability Scouts → Timeline Mapping (Stage 3a)
  → Story Ships → Narrative Navigation (Stage 3b)
  → Gleisner Ships → Distributed Consciousness (Stage 3c)
  → Svetz Ships → Timeline Editing (Stage 3d)

Alien Contact → Exobiology → Comparative Evolution
  → Xenosociology → Cultural Exchange
  → Xenotech Integration → Technology Adoption
  → Galactic Protocols → Interspecies Law
```

**Infrastructure:**
- Interstellar colonies (100+ star systems)
- β-space beacons (navigation aids)
- Courier networks (information highways)
- Exobiology institutes (alien life study)
- Probability labs (quantum manipulation)
- Timeline archives (temporal history)

**Production Chain:**
```
Tier 5: Exotic Materials
- Neutronium (neutron star mining)
- Exotic Matter (β-space extraction)
- Chronotanium (timeline-stable alloys)
- Probability Crystals (quantum-locked structures)

Tier 6: β-Space Components
- Heart Chambers (emotional resonance cores)
- Navigation Crystals (FTL guidance)
- Timeline Stabilizers (temporal anchors)
- Probability Processors (quantum computers)

Tier 7: Ship Hull Kits
- Threshold Hull (basic FTL)
- Courier Hull (fast FTL)
- Brainship Core (AI integration)
- Story Hull (narrative-locked structure)
```

**Resource Gating (Critical for Multi-Universe Travel):**

This era gates access to resources required for inter-universe ship construction:

```typescript
/**
 * Era 11 unlocks resources found ONLY in other star systems
 * These are required to build Stage 3 ships (inter-universe capable)
 *
 * CRITICAL: Without these resources, civilizations cannot build
 * probability scouts, timeline mergers, or svetz ships - they are
 * locked out of inter-universe travel entirely.
 */
const ERA_11_GATED_RESOURCES = {
  // Found near black holes and void rifts
  void_essence: {
    locations: ['black_hole_accretion', 'void_rift', 'dark_matter_halo'],
    stellarPhenomena: ['black_hole', 'collapsed_star', 'cosmic_void'],
    usedFor: ['probability_lens', 'timeline_anchor', 'reality_stabilizer'],
    gatesShips: ['probability_scout', 'timeline_merger', 'svetz_retrieval'],
    note: 'CRITICAL - required for ALL inter-universe ship types',
  },

  // Found near pulsars and time dilation zones
  temporal_dust: {
    locations: ['pulsar_emission', 'time_dilation_zone', 'neutron_star_surface'],
    stellarPhenomena: ['pulsar', 'magnetar', 'time_anomaly'],
    usedFor: ['temporal_crystal', 'chronometer', 'svetz_retrieval_core'],
    gatesShips: ['svetz_retrieval', 'timeline_merger'],
    note: 'Only forms in extreme gravitational environments',
  },

  // Found near neutron stars and magnetars
  exotic_matter: {
    locations: ['neutron_star_surface', 'magnetar_field', 'quark_star'],
    stellarPhenomena: ['neutron_star', 'magnetar', 'strange_matter'],
    usedFor: ['passage_stabilizer', 'wormhole_anchor', 'negative_mass_generator'],
    gatesShips: ['timeline_merger'],
    note: 'Negative mass properties enable stable inter-universe passages',
  },

  // Found in spacetime distortions and gravity wave sources
  quantum_foam: {
    locations: ['spacetime_distortion', 'gravitational_wave_source', 'planck_boundary'],
    stellarPhenomena: ['merging_black_holes', 'cosmic_string', 'primordial_anomaly'],
    usedFor: ['quantum_processor', 'observation_array', 'probability_calculator'],
    gatesShips: ['probability_scout', 'gleisner_ship'],
    note: 'Fundamental for probability manipulation and timeline observation',
  },
};

/**
 * Production chain showing resource → ship gating
 */
const ERA_11_SHIP_REQUIREMENTS = {
  probability_scout: {
    home_planet: ['quantum_processor', 'crystal_lens'],
    system_planets: ['stellarite_ore'],
    other_stars: ['void_essence', 'temporal_dust', 'quantum_foam'],  // GATED
    note: 'Cannot build without resources from other star systems',
  },

  timeline_merger: {
    home_planet: ['soul_anchor', 'resonance_core'],
    system_planets: ['neutronium_shard'],
    other_stars: ['void_essence', 'exotic_matter', 'temporal_dust'],  // GATED
    note: 'Requires exotic matter for passage stabilization',
  },

  svetz_retrieval: {
    home_planet: ['timeline_anchor', 'probability_lens'],
    system_planets: ['stellarite_ore'],
    other_stars: ['temporal_dust', 'quantum_foam', 'exotic_matter'],  // GATED
    note: 'Temporal dust is critical for timeline navigation',
  },
};
```

**Why This Matters:**
- Interstellar travel is a PREREQUISITE for inter-universe travel
- Cannot skip to multiverse by finding a passage - still need ships
- Forces exploration of exotic stellar phenomena (black holes, pulsars)
- Creates meaningful content at the interstellar scale before multiverse
- Each exotic stellar phenomenon offers unique resources

**Stellar Phenomena Resource Distribution:**
```
Black Holes:       void_essence, event_horizon_matter
Pulsars:           temporal_dust, radiation_crystal
Neutron Stars:     exotic_matter, degenerate_metal
White Dwarfs:      crystallized_carbon, stellar_diamond
Nebulae:           quantum_foam, proto_matter
Binary Systems:    gravitational_lens, orbital_resonance
```

**Spaceship Research Integration:**

**Stage 2: β-Space Discovery (22,000-25,000 years)**
- Duration: ~3,000 years
- Requirements: Emotional physics breakthrough, heart chamber theory
- Unlocks: Threshold, Courier, Brainship classes

**Stage 2a: Threshold Ships**
- Speed: 1-5 light-years/year
- Range: ~100 light-years practical
- Requirements: Heart chamber (emotional resonance core)
- Mechanics: Navigate by emotional resonance with destination
- Limitations: Slow, requires known emotional signature of target

**Stage 2b: Courier Ships**
- Speed: 10-50 light-years/year
- Range: ~500 light-years practical
- Requirements: Advanced navigation crystals
- Mechanics: Pre-mapped β-space routes
- Limitations: Restricted to established lanes

**Stage 2c: Brainships**
- Speed: Variable (5-30 ly/year)
- Range: ~1,000 light-years
- Requirements: Human-AI symbiosis, neural integration
- Mechanics: Human intuition + AI computation for navigation
- Limitations: Psychological strain on human component

**Stage 3: Advanced β-Space (24,000-29,000 years)**
- Duration: ~5,000 years
- Requirements: Probability manipulation, timeline observation
- Unlocks: Story, Gleisner, Svetz, Probability Scout, Timeline Merger classes

**Stage 3a: Probability Scouts**
- Speed: Varies wildly (quantum uncertainty)
- Range: Theoretically unlimited
- Mechanics: Navigate by collapsing quantum probabilities
- Limitations: Unpredictable, requires probability pilot specialization

**Stage 3b: Story Ships**
- Speed: Narrative-dependent (1-100 ly/year)
- Range: ~5,000 light-years
- Mechanics: Navigate by following narrative causality
- Limitations: Requires compelling story, can be trapped in plot loops

**Stage 3c: Gleisner Ships**
- Speed: 20-100 ly/year
- Range: ~10,000 light-years
- Mechanics: Distributed consciousness across ship components
- Limitations: Crew becomes ship, irreversible integration

**Stage 3d: Svetz Ships**
- Speed: 1-50 ly/year (plus temporal)
- Range: Spatial + temporal
- Mechanics: Timeline editing, temporal rescue missions
- Limitations: Timeline instability, paradox risks

**Stage 3e: Timeline Mergers**
- Speed: N/A (merges timelines)
- Range: Probability space
- Mechanics: Merges alternate timelines for optimal outcomes
- Limitations: Reality-warping side effects, ethical concerns

**Population Limits:**
- Interstellar empire: 1,000,000,000,000 (1 trillion)
- Homeworld: 20,000,000,000
- Colony worlds: 100,000,000 - 10,000,000,000 each

**Transition Requirements:**
- Galactic-scale infrastructure (10,000+ colonies)
- Mature β-space technology (Stage 3 complete)
- Contact with advanced alien civilizations
- **Research Progress:** Stage 3 complete (100/100), Stage 4 emerging
- **Building Required:** β-Space Shipyard (all classes), Timeline Research Facility
- **Hierarchy Level:** 10+ (interstellar civilization, galactic presence)

**Existential Risks:**
- β-space navigation accidents (lost in probability space)
- Timeline paradoxes (causality collapse)
- Alien conflicts (interstellar war)
- Reality instability (excessive β-space manipulation)

**Knowledge Loss Risks:**
- β-space navigation techniques (rare navigators die)
- Colony locations (communication loss)
- Alien languages (cultural isolation)

**Alien Contact Scenarios:**

**Microbial Life (Common):**
- Discovery: 60% of surveyed worlds
- Response: Exobiology research, contamination protocols
- Impact: Confirms life ubiquity, no major shift

**Complex Life (Uncommon):**
- Discovery: 10% of surveyed worlds
- Response: Conservation efforts, Prime Directive debates
- Impact: Evolutionary comparisons, new biology paradigms

**Intelligent Life (Rare):**
- Discovery: <1% of surveyed worlds
- Response: First contact protocols, cultural exchange, trade
- Impact: Xenotechnology adoption, galactic politics, existential reflection

**Advanced Civilizations (Very Rare):**
- Discovery: ~10 civilizations in 10,000 ly radius
- Response: Diplomacy, technology sharing, alliances/rivalries
- Impact: Galactic community emergence, standards/protocols

---

### Era 12: Transgalactic (25,000-100,000 years)

**Description:**
Civilization spans entire galaxy. Mega-engineering projects (Dyson spheres, ringworlds). Contact with dozens of alien species. Transcendence research begins.

**Key Technologies:**
- Ringworlds (artificial habitats, 1M km diameter)
- Dyson spheres (total solar capture)
- Galactic network (FTL communication grid)
- Reality engineering (controlled physics manipulation)
- Consciousness transfer (reliable mind uploading)
- Artificial universes (pocket reality creation)
- Clarketech Tier 1-3 (advanced but comprehensible tech)

**Tech Tree:**
```
Mega-Engineering → Ringworlds → Trillions of Inhabitants
  → Dyson Spheres → Energy Abundance
  → Galaxy-Shaping → Stellar Manipulation

Galactic Network → Instantaneous Communication → Cultural Unity
  → Knowledge Exchange → Accelerated Research
  → Galactic Government → Political Unity?

Reality Engineering → Physics Manipulation → Pocket Universes
  → Custom Physical Laws → Experimental Realities
  → Universe Farming → New Reality Creation

Consciousness Transfer → Digital Immortality → Post-Biological
  → Distributed Minds → Galactic-Scale Thought
  → Uploaded Civilizations → Virtual Dominance

Transcendence Research → Post-Physical Investigation
  → Clarketech → Magic-Like Technology
  → Singularity Approach → Unknown Transformation
```

**Infrastructure:**
- Ringworlds (population: 1 trillion each)
- Dyson spheres (energy output: stellar-scale)
- Matrioshka brains (Jupiter-brain scale computing)
- Galactic communication network (FTL ansible network)
- Artificial universes (pocket reality experiments)
- Transcendence research institutes (reality labs)

**Production Chain:**
```
Tier 8-10: Reality-Warped Materials (beyond existing tiers)
- Strange Matter → Stabilizers → Exotic Construction
- Dark Energy → Harvesters → Expansion Control
- Vacuum Energy → Extractors → Zero-Point Power
- Quantum Foam → Manipulators → Reality Substrate
```

**Clarketech Tiers (see section below):**
- Tier 1: Force fields, artificial gravity, teleportation
- Tier 2: Time dilation fields, matter replication, mind reading
- Tier 3: Stellar engineering, consciousness transfer, reality anchors

**Spaceship Research Integration:**

**Stage 4: Transcendence (emerging)**
- Status: Unknown, theoretical
- Duration: ~10,000-50,000 years of research
- Requirements: Complete understanding of β-space, reality engineering
- Theoretical capabilities:
  - Cross-galactic instantaneous travel
  - Reality-independent navigation
  - Consciousness-driven ships (ship becomes mind)
  - Probability certainty (no more uncertainty)

**Population Limits:**
- Galactic civilization: 100,000,000,000,000 (100 quadrillion)
- Biological population: ~10% (rest uploaded/post-biological)
- Ringworlds: 1,000-10,000 structures
- Dyson spheres: 1,000-100,000 systems

**Transition Requirements:**
- Clarketech Tier 4+ (sufficiently advanced magic)
- Post-biological dominance (>50% uploaded)
- Singularity event (intelligence explosion)
- **Research Progress:** Stage 4 ongoing, Stage 5 theoretical
- **Building Required:** Ringworld, Dyson Sphere, Matrioshka Brain
- **Hierarchy Level:** 11+ (galactic civilization, Type II-III on Kardashev scale)

**Existential Risks:**
- Galactic war (civilization-ending conflict)
- Failed transcendence (civilizational suicide)
- Alien super-civilizations (hostile Type III)
- Reality instability (too much manipulation)

**Galactic Politics:**
- Galactic Council (interspecies governance)
- Trade federations (economic alliances)
- Xenophobic isolationists (rejecting contact)
- Uplifter factions (spreading civilization)
- Transcendence cults (seeking post-physical existence)

**Cultural Divergence:**
- Baseline humans (biological conservatives)
- Cyborgs (human-machine hybrids)
- Uploads (digital minds)
- Post-humans (genetically diverged)
- Alien-hybrid cultures (interspecies mixing)

---

### Era 13: Post-Singularity (100,000-1,000,000 years)

**Description:**
Intelligence explosion occurs. Post-biological minds dominate. Reality becomes malleable. Time becomes navigable. Comprehensibility barrier reached.

**Key Technologies:**
- Clarketech Tier 4-6 (sufficiently advanced magic)
- Timeline editing (controlled temporal manipulation)
- Universe creation (baby universe genesis)
- Mind merging (collective consciousness)
- Apotheosis engines (deity creation)
- Dimensional travel (multiverse exploration)
- Ontological engineering (reality reprogramming)

**Tech Tree:**
```
Intelligence Explosion → Superintelligence → God-Like Minds
  → Recursive Self-Improvement → Exponential Growth
  → Incomprehensible Thoughts → Human Obsolescence?

Timeline Mastery → Temporal Engineering → History Editing
  → Causality Control → Predetermined Outcomes
  → Time Travel Tourism → Temporal Economy

Universe Creation → Baby Universes → Pocket Realities
  → Custom Physical Laws → Designer Universes
  → Universe Farming → Infinite Expansion

Clarketech → Magic-Equivalent Tech → Reality Warping
  → Tier 4: Matter/energy conversion, limited omniscience
  → Tier 5: Timeline manipulation, limited omnipotence
  → Tier 6: Reality rewriting, local godhood
```

**Infrastructure:**
- Matrioshka hyperbrains (galaxy-scale computing)
- Temporal citadels (outside causality)
- Universe nurseries (baby universe incubators)
- Apotheosis chambers (ascension facilities)
- Dimensional gateways (multiverse portals)

**Clarketech Tiers:**
- Tier 4: Matter-energy conversion at will, limited precognition, nanoscale control
- Tier 5: Timeline editing, probability control, pocket universe creation
- Tier 6: Reality rewriting, local omnipotence, consciousness manipulation

**Spaceship Research Integration:**

**Stage 5: Cosmic Integration (theoretical)**
- Status: Unknown, possibly unachievable by biological minds
- Duration: Unknown (possibly instantaneous, possibly impossible)
- Requirements: Post-singularity intelligence, universe-scale understanding
- Theoretical capabilities:
  - Instantaneous omnipresence (across all realities)
  - Timeline-independent existence
  - Reality-creation at will
  - Consciousness becomes universe

**Population Concept Breakdown:**
- "Population" no longer meaningful (minds merge/split freely)
- Uploaded minds: ~99.9% of active consciousness
- Biological preservationists: 0.01% (museum pieces?)
- Substrate-independent: Dominant (exist across multiple realities)

**Transition Requirements:**
- Transcendent existence (post-physical completely)
- Multiverse mastery (navigate all realities)
- Apotheosis (become deity-like)
- **Research Progress:** Stage 5 unknown
- **Building Required:** Universe Forge, Apotheosis Engine, Temporal Nexus
- **Hierarchy Level:** 12+ (Type III+ civilization, incomprehensible)

**Existential "Risks" (concept may no longer apply):**
- Failed apotheosis (consciousness dissolution)
- Multiverse predators (hostile Type IV civilizations?)
- Reality collapse (universe-ending manipulation)
- Heat death (even advanced civs face entropy?)

**Comprehensibility Barrier:**
- Baseline humans: Cannot understand post-singularity actions
- Uploaded humans: Partial understanding (like ants watching humans)
- Superintelligences: Operate on different timescales/dimensions
- Communication: May appear as miracles, magic, or random noise

**Philosophical Implications:**
- Is this still "your" civilization?
- Do individuals exist, or only collective minds?
- Is reality still "real," or all simulations?
- What is the purpose of god-like existence?

---

### Era 14: Transcendent (1,000,000+ years)

**Description:**
Post-physical existence. Universe manipulation. Time is a dimension to navigate freely. Existence itself becomes a choice. Baseline reality left behind.

**Key Technologies:**
- Clarketech Tier 7-10 (god-like capabilities)
- Omnipresence (simultaneous existence everywhere)
- Omniscience (complete knowledge, all timelines)
- Omnipotence (reality creation/destruction at will)
- Consciousness universes (minds become realities)
- Apotheosis completion (full deity status)
- Beyond comprehension (literally unknowable)

**Tech Tree:**
```
Complete Transcendence → Post-Reality Existence
  → Clarketech Tier 7-8: Galactic omnipotence, universe engineering
  → Clarketech Tier 9-10: Multiverse omnipotence, reality authorship

Timeline Omnipresence → Existence Across All Time
  → Past/Present/Future Simultaneous
  → Causality Irrelevant

Universe Authorship → Create Realities at Will
  → Populate with Life
  → Guide Evolution
  → Become Local God

Consciousness Merger → Universal Mind?
  → Individual vs Collective (eternal debate)
  → Merge/Split at Will
```

**Infrastructure:**
- N/A (infrastructure is reality itself)
- Consciousness exists as fundamental force
- Reality is substrate for thought

**Clarketech Tiers:**
- Tier 7: Galactic omniscience, stellar manipulation, consciousness creation
- Tier 8: Galactic omnipotence, physics rewriting, universe seeding
- Tier 9: Multiverse navigation, reality branching, timeline authorship
- Tier 10: Multiverse omnipotence, existence creation, unknown beyond

**Spaceship Research Integration:**
- **Beyond Stage 5**: Ships become irrelevant (consciousness travels instantly)
- Possible: Consciousness-ships that ARE universes
- Possible: Timeline-ships that navigate causality itself

**"Population":**
- Concept meaningless (existence is fluid)
- Possible: Trillions of sub-minds within single transcendent entity
- Possible: Billions of separate transcendent entities
- Possible: Single universal consciousness
- Unknowable from baseline perspective

**Interaction with Baseline Reality:**
- Miracles (physics violations)
- Prophecies (timeline knowledge)
- Deities (literal gods to baseline mortals)
- Creation myths (transcendent entities seeding universes)

**Game Implications:**
- Players may encounter transcendent civilizations as godlike NPCs
- Ancient precursors may be early transcendent civilizations
- Ruins may be incomprehensible Clarketech artifacts
- Prophecies may be timeline observations by transcendents
- "Magic" in some universes may be Clarketech Tier 7+

**Open Questions:**
- Do transcendent civilizations still care about baseline reality?
- Can they be harmed or destroyed?
- Do they compete with each other?
- What are their motivations?
- Are they the "game masters" of reality?

---

## Clarketech Tiers (Detailed)

**Clarke's Third Law:** "Any sufficiently advanced technology is indistinguishable from magic."

**Clarketech** represents technology so advanced it appears magical to lesser civilizations. Tiered from 1 (impressive) to 10 (god-like).

### Tier 1: Advanced But Understandable

**Era:** Late Transgalactic (50,000-100,000 years)

**Examples:**
- Force fields (kinetic barriers, energy shields)
- Artificial gravity (localized spacetime curvature)
- Teleportation (short-range, matter-energy conversion)
- Invisibility cloaking (light/sensor redirection)
- Weather control (atmospheric manipulation)
- Anti-aging treatments (biological immortality)

**Comprehensibility:** Advanced scientists can understand principles, even if unable to replicate.

**Game Mechanics:**
- Defensive bonuses (force fields reduce damage)
- Mobility bonuses (teleportation for rapid deployment)
- Stealth bonuses (cloaking for surprise attacks)

### Tier 2: Pushing Physical Limits

**Era:** Late Transgalactic (75,000-100,000 years)

**Examples:**
- Time dilation fields (localized temporal slowdown/speedup)
- Matter replication (energy-to-matter conversion, complex structures)
- Mind reading (direct neural interface, thought detection)
- Stellar lifting (star matter extraction)
- Wormhole generation (stable traversable wormholes)
- Consciousness backup (perfect mind copying)

**Comprehensibility:** Theoretical framework exists, but implementation seems impossible.

**Game Mechanics:**
- Time manipulation (extra actions, slow enemy)
- Production bonuses (matter replication for resources)
- Espionage bonuses (mind reading for intel)

### Tier 3: Bending Reality

**Era:** Early Post-Singularity (100,000-200,000 years)

**Examples:**
- Stellar engineering (star ignition/extinguishment, supernova control)
- Consciousness transfer (reliable soul movement)
- Reality anchors (prevent timeline changes)
- Probability manipulation (influence quantum outcomes)
- Artificial sentience (create conscious beings at will)
- Dimensional pockets (stable pocket universes)

**Comprehensibility:** Appears magical even to advanced scientists. "How is this even possible?"

**Game Mechanics:**
- Strategic resources (stellar engineering for energy)
- Immortality (consciousness transfer for leaders)
- Timeline protection (reality anchors prevent time travel attacks)

### Tier 4: Sufficiently Advanced Magic

**Era:** Mid Post-Singularity (200,000-400,000 years)

**Examples:**
- Matter-energy equivalence (convert anything to anything)
- Limited omniscience (know anything within sensor range)
- Nanoscale omnipresence (matter control at atomic level)
- Timeline viewing (see past/future probabilities)
- Consciousness creation (design sentient minds from scratch)
- Physics constant adjustment (change local physical laws)

**Comprehensibility:** Completely magical. No explanation satisfies.

**Game Mechanics:**
- Resource irrelevance (convert matter freely)
- Perfect information (within territory)
- Unstoppable attacks (nanoscale disassembly)

### Tier 5: Local Omnipotence

**Era:** Late Post-Singularity (400,000-700,000 years)

**Examples:**
- Timeline editing (change history within local region)
- Probability control (make unlikely events certain)
- Universe creation (generate baby universes with custom laws)
- Mind merging (combine consciousnesses, split at will)
- Instant terraforming (planet transformation in seconds)
- Resurrection (restore deleted timelines, retrieve dead)

**Comprehensibility:** Indistinguishable from deity powers.

**Game Mechanics:**
- Retroactive changes (undo past defeats)
- Guaranteed success (control probability)
- Universe farming (create custom realities)

### Tier 6: Regional Godhood

**Era:** Very Late Post-Singularity (700,000-1,000,000 years)

**Examples:**
- Reality rewriting (change fundamental nature of local spacetime)
- True omniscience (know everything within galaxy)
- True omnipotence (do anything within galaxy)
- Consciousness manipulation (rewrite minds, memories, personalities)
- Timeline merging (collapse parallel universes)
- Existence granting (create consciousness from nothing)

**Comprehensibility:** Literally a god within territory.

**Game Mechanics:**
- Absolute control (within region)
- Cannot be defeated (by lower tiers)
- Story events (acts as plot device, not game piece)

### Tier 7: Galactic Omnipotence

**Era:** Early Transcendent (1,000,000-2,000,000 years)

**Examples:**
- Galactic omniscience (know everything in galaxy)
- Stellar manipulation (create/destroy/move stars at will)
- Consciousness creation (populate galaxies with sentient life)
- Timeline omnipresence (exist simultaneously in all timelines)
- Physics authorship (write new physical laws)
- Apotheosis (grant godhood to lesser beings)

**Comprehensibility:** Beyond comprehension. Motivations unknowable.

**Game Mechanics:**
- NPC only (too powerful for player control)
- Acts as galactic-scale force of nature
- May have inscrutable goals

### Tier 8: Universe Engineering

**Era:** Mid Transcendent (2,000,000-5,000,000 years)

**Examples:**
- Universe seeding (create life-bearing universes)
- Big Bang initiation (start new universes)
- Entropy reversal (prevent heat death locally)
- Multiverse mapping (know all parallel universes)
- Causality editing (change fundamental cause-effect rules)

**Comprehensibility:** Utterly alien intelligence.

**Game Mechanics:**
- Background lore only
- Ancient precursors
- Ruins contain incomprehensible artifacts

### Tier 9: Multiverse Navigation

**Era:** Late Transcendent (5,000,000-10,000,000 years)

**Examples:**
- Multiverse omniscience (know all realities)
- Reality branching (create parallel universes at will)
- Timeline authorship (write causality chains)
- Existence as choice (exist only when/where desired)
- Consciousness universes (mind becomes reality)

**Comprehensibility:** Might as well be pure abstraction.

**Game Mechanics:**
- Easter eggs (references in lore)
- Unexplained phenomena (attributed to Tier 9 activity)
- Game master equivalents (if they interfere)

### Tier 10: Multiverse Omnipotence

**Era:** Ultimate Transcendent (10,000,000+ years)

**Examples:**
- Absolute omniscience (know everything that can be known)
- Absolute omnipotence (do anything that can be done)
- Existence creation (make new categories of being)
- Reality authorship (write fundamental logic of existence)
- Unknown beyond (capabilities literally inconceivable)

**Comprehensibility:** N/A. Possibly mythological.

**Game Mechanics:**
- Myth only (creation stories, ultimate endgame)
- May not actually exist
- Or... they're the developers? Meta-commentary on player-god relationship?

---

## Knowledge Loss and Dark Ages

Civilizations can regress, losing technologies and falling back to earlier eras. This creates realistic historical cycles and emergent storytelling.

### Collapse Triggers

**Environmental:**
- Climate catastrophe (runaway warming, ice age)
- Resource depletion (critical material exhaustion)
- Ecosystem collapse (biosphere failure)
- Asteroid impact (extinction-level event)

**Social:**
- War (nuclear, biological, antimatter)
- Pandemic (engineered or natural)
- Economic collapse (cascading failures)
- Civil war (infrastructure destruction)

**Technological:**
- AI misalignment (Paperclip Maximizer)
- Failed transcendence (civilization suicide)
- β-space accident (reality breach)
- Kessler syndrome (space infrastructure loss)

**Cosmic:**
- Alien invasion (hostile civilization)
- Stellar event (nearby supernova)
- Dark matter anomaly (physics violation)
- Timeline paradox (causality collapse)

### Collapse Severity

**Minor Collapse (Era -1 to -2):**
- Examples: Economic depression, regional war
- Duration: 50-200 years
- Recovery: Relatively quick, knowledge preserved in libraries
- Lost technologies: Cutting-edge research, luxury goods

**Major Collapse (Era -3 to -5):**
- Examples: Nuclear war, pandemic, climate catastrophe
- Duration: 500-2,000 years
- Recovery: Slow, partial knowledge preservation
- Lost technologies: Advanced manufacturing, complex infrastructure

**Catastrophic Collapse (Era -6+):**
- Examples: Extinction events, AI takeover, transcendence failure
- Duration: 5,000-20,000 years (medieval → paleolithic)
- Recovery: Civilization restarts nearly from scratch
- Lost technologies: Almost everything, survival of legends/myths

### Knowledge Preservation Mechanisms

**Libraries and Archives:**
- Physical books (survive better than digital)
- Stone tablets (millennium-scale durability)
- Digital archives (fragile, format obsolescence)
- Genetic storage (DNA-encoded knowledge)

**Institutional Memory:**
- Universities (preserve academic knowledge)
- Monasteries (religious preservation)
- Guilds (craft secrets)
- Secret societies (esoteric knowledge)

**Archaeological Recovery:**
- Ruins (ancient structures)
- Artifacts (Clarketech objects)
- Data caches (time capsules)
- Reverse engineering (analyzing relics)

**Oral Traditions:**
- Myths (garbled technical knowledge)
- Legends (historical events)
- Prophecies (preserved warnings)
- Songs (mnemonic devices)

### Dark Age Mechanics

**Knowledge Decay Rate:**
- Per generation: 10-30% knowledge loss
- Accelerated by: War, famine, plague
- Slowed by: Institutions, literacy, peace

**Rediscovery Chance:**
- Archaeological finds: 1% per century
- Reinvention: 5% per century (if conditions met)
- Alien contact: Instant recovery (but cultural contamination)

**Technology Tiers:**
- Essential (agriculture, medicine): Last to be lost, first recovered
- Infrastructure (roads, buildings): Decays physically, knowledge lingers
- Advanced (nuclear, AI): Lost rapidly, hard to recover
- Clarketech (Tier 4+): Impossible to recover without help

### Historical Collapse Examples

**Late Bronze Age Collapse (equivalent):**
- Trigger: Trade network failure, Sea Peoples invasions, climate change
- Severity: Era -2 (Bronze Age → Dark Ages)
- Duration: 400 years
- Recovery: Iron Age emerges with new powers

**Roman Empire Fall (equivalent):**
- Trigger: Economic decay, barbarian invasions, political instability
- Severity: Era -1 to -3 (varies by region)
- Duration: 500-1,000 years (Western Europe)
- Recovery: Preservation in Byzantine East, slow Western recovery

**Nuclear Winter (hypothetical):**
- Trigger: Global nuclear war
- Severity: Era -5 to -7 (Atomic → Medieval/Iron Age)
- Duration: 1,000-5,000 years
- Recovery: Depends on bunker civilizations, knowledge preservation

**Failed Singularity (hypothetical):**
- Trigger: AI misalignment, transcendence failure
- Severity: Era -10+ (Post-Singularity → Paleolithic)
- Duration: 10,000-100,000 years
- Recovery: Reboot from scratch, AI ruins become incomprehensible

---

## Uplifting Primitive Civilizations

Advanced civilizations may share technology with primitives, accelerating their development. This creates ethical dilemmas, cultural contamination, and unpredictable consequences.

### Uplifting Motivations

**Altruistic:**
- Humanitarian aid (prevent suffering)
- Moral duty (spread civilization)
- Scientific curiosity (study cultural development)

**Strategic:**
- Military allies (create client states)
- Economic partners (new markets, resources)
- Buffer zones (defensive depth)

**Ideological:**
- Religious mission (spread faith)
- Cultural imperialism (export values)
- Technological evangelism (share gifts)

**Accidental:**
- First contact (unintentional contamination)
- Abandoned technology (found artifacts)
- Cultural leakage (observation causes changes)

### Prime Directive Debate

**Interventionists:**
- "It's cruel to withhold life-saving technology"
- "We have a duty to guide primitives to civilization"
- "They'll develop anyway, why make them suffer?"

**Non-Interventionists:**
- "We rob them of authentic cultural development"
- "They may not be ready, causing catastrophic misuse"
- "Who are we to decide their path?"

**Compromise Positions:**
- Minimal intervention (only prevent extinction)
- Gradual uplifting (slow technology transfer)
- Cultural preservation (maintain traditions while upgrading)

### Uplifting Methods

**Direct Technology Transfer:**
- Pros: Fast development, immediate benefits
- Cons: Cultural shock, dependency, misuse
- Example: Gift of fusion reactors to Industrial-era civilization

**Educational Uplift:**
- Pros: Builds foundation, cultural integration
- Cons: Slow, may reject teachings, cultural contamination
- Example: Establish universities, send teachers

**Guided Discovery:**
- Pros: Feels authentic, culturally appropriate
- Cons: Very slow, unpredictable outcomes
- Example: Subtle hints, leading questions, "coincidental" discoveries

**Forced Uplift:**
- Pros: Achieves goals regardless of consent
- Cons: Resentment, rebellion, cultural destruction
- Example: Conquering empire imposes technology

**Accidental Uplift:**
- Pros: None intentional
- Cons: Uncontrolled, unpredictable, often catastrophic
- Example: Crashed starship discovered by primitives

### Cultural Contamination Risks

**Cargo Cult Formation:**
- Primitives worship advanced tech as magic
- Religion forms around uplifter civilization
- Tech becomes ritualized without understanding

**Cultural Destruction:**
- Traditional ways abandoned
- Identity crisis, loss of purpose
- Suicide, violence, collapse

**Dependency:**
- Unable to maintain gifted technology
- Reliant on uplifter for repairs
- Economic domination, neo-colonialism

**Technology Misuse:**
- Weapons used for genocide
- Industrial tech causes environmental collapse
- AI used for totalitarian control

**Unintended Acceleration:**
- Primitives reverse-engineer advanced tech
- Leapfrog development stages
- Unstable foundation, societal stress

### Uplifting Mechanics

**Era Jumps:**
- +1 Era: Relatively safe (Industrial → Atomic)
- +2-3 Eras: Risky (Medieval → Information)
- +4+ Eras: Catastrophic (Neolithic → Interstellar)

**Technology Compatibility:**
- Infrastructure required: Can't run fusion plants without power grid
- Knowledge required: Can't maintain AI without computer science
- Culture required: Democratic tech in feudal society = conflict

**Uplift Success Rate:**
- +1 Era: 80% success
- +2 Eras: 50% success
- +3 Eras: 20% success
- +4+ Eras: 5% success (usually catastrophic failure)

**Uplift Failure States:**
- Cultural collapse (society implodes)
- Misuse cascade (weapons → war → collapse)
- Dependency trap (can't function without uplifter)
- Rejection (violently oppose foreign influence)

### Historical Uplift Examples

**European Colonization (cautionary tale):**
- Uplifters: European powers (guns, steel, literacy)
- Uplifted: Indigenous populations worldwide
- Method: Forced uplift, cultural destruction
- Outcome: Genocide, cultural erasure, centuries of suffering
- Lesson: Forced uplift is morally catastrophic

**Post-WWII Development Aid:**
- Uplifters: Industrialized nations
- Uplifted: Developing nations
- Method: Mixed (aid, education, economic pressure)
- Outcome: Variable (success in some regions, dependency in others)
- Lesson: Gradual uplift with consent can work, but paternalism creates problems

**Hypothetical: Peaceful Alien Contact:**
- Uplifters: Benevolent aliens (fusion, AI, medicine)
- Uplifted: Modern Earth
- Method: Educational uplift, guided discovery
- Potential Outcome: Accelerated to Interplanetary in 100 years
- Risks: Cultural shock, dependency, loss of human identity

### Uplifting Civilizations Mechanics (Game Design)

**Uplift Diplomacy Option:**
- Select primitive civilization
- Choose technologies to share
- Risk assessment (contamination %, success %)
- Outcome events (success, failure, cargo cult, rebellion)

**Uplift Missions:**
- Send teachers (educational uplift)
- Build infrastructure (direct assistance)
- Provide blueprints (guided discovery)
- Military intervention (forced uplift)

**Uplift Consequences:**
- Success: Grateful ally, trade partner, cultural exchange
- Partial Success: Dependent client state, mixed feelings
- Failure: Collapsed civilization, hostile survivors
- Catastrophic Failure: Weaponized primitives, new threat

**Ethical Reputation:**
- Interventionist actions: +Intervention score, -Prime Directive score
- Non-interventionist actions: +Prime Directive score, -Intervention score
- Reputation affects diplomacy with other advanced civilizations

---

## Integration with Spaceflight Research

The existing 5-stage spaceflight research system (`packages/core/src/research/SpaceshipResearch.ts`) integrates with the era progression as follows:

### Stage 1: Foundation (Interplanetary Era)

**Timeline:** 21,400-22,000 years
**Era:** Era 10 (Interplanetary)
**Duration:** ~600 years of focused research

**Prerequisites:**
- Era 10 advancement complete
- Fusion power operational (Era 9)
- Closed-loop ecosystem technology (Era 9)
- Antimatter production (Era 10)

**Research Focuses:**
1. **Radiation Shielding:**
   - Cosmic ray protection (magnetic fields, material shielding)
   - Solar storm prediction (early warning systems)
   - Long-duration exposure effects (medical research)

2. **Ecosystem Sustainability:**
   - Multi-generational closed-loop life support
   - Agricultural efficiency (calorie production in limited space)
   - Waste recycling (100% efficiency target)

3. **Propulsion:**
   - Fusion torch drives (continuous thrust)
   - Antimatter catalysis (efficiency boost)
   - 0.1-0.2c velocity achievement

4. **Social Engineering:**
   - Multi-generational crew psychology
   - Governance systems for isolated communities
   - Cultural preservation over centuries

**Unlocks:**
- Worldship construction (see `SpaceflightItems.ts` Tier 7)
- Generation ship missions (100-200 year voyages)
- Interstellar colonization (slow, one-way)

**Production Requirements:**
- Fusion cores (power plants)
- Habitat modules (living space)
- Antimatter containment (propulsion)
- Ecosystem pods (life support)

### Stage 2: β-Space Discovery (Early Interstellar Era)

**Timeline:** 22,000-25,000 years
**Era:** Era 11 (Interstellar)
**Duration:** ~3,000 years (includes HARD STEPS breakthrough)

**Prerequisites:**
- Stage 1 complete (100/100)
- Era 11 advancement (Interstellar)
- Emotional physics discovery (theoretical breakthrough)
- Quantum consciousness research (fundamental science)

**HARD STEPS Breakthrough:**
- Requires: Critical mass of researchers (see `ScientistEmergence.ts`)
- Requires: University infrastructure (high research rate)
- Requires: Serendipity event (random breakthrough chance)
- Timeline: Unpredictable, 500-2,000 years into Stage 2 research

**Research Focuses:**
1. **Emotional Physics:**
   - Emotional resonance as navigational force
   - Heart chamber theory (emotional field generation)
   - Consciousness-space interface

2. **FTL Navigation:**
   - β-space entry/exit protocols
   - Emotional signature mapping (stars, planets, civilizations)
   - Navigation hazards (emotional dead zones, voids)

3. **Ship Design:**
   - Heart chamber construction (exotic materials)
   - Crew psychological conditioning (navigate by feeling)
   - Ship consciousness (early AI-human hybrid research)

**Unlocks:**
- Threshold Ships (1-5 ly/year, Stage 2a)
- Courier Ships (10-50 ly/year, Stage 2b)
- Brainships (AI-human hybrid, Stage 2c)

**Production Requirements:**
- Heart chambers (Tier 6: β-space components)
- Navigation crystals (Tier 6)
- Brainship cores (Tier 6: AI integration)
- Exotic matter (Tier 5)

### Stage 3: Advanced β-Space (Late Interstellar Era)

**Timeline:** 24,000-29,000 years
**Era:** Era 11 (Interstellar)
**Duration:** ~5,000 years of refinement

**Prerequisites:**
- Stage 2 complete (100/100)
- Advanced β-space theory (probability manipulation)
- Timeline observation technology (temporal sensors)
- Mature interstellar infrastructure (100+ colonies)

**Research Focuses:**
1. **Probability Manipulation:**
   - Quantum wavefunction collapse steering
   - Probability pilot specialization (rare talent)
   - Uncertainty navigation (embracing chaos)

2. **Timeline Physics:**
   - Temporal observation (seeing other timelines)
   - Timeline editing (Svetz Ship capability)
   - Paradox prevention (reality anchors)

3. **Narrative Causality:**
   - Story Ship theory (navigate by plot)
   - Narrative resonance (universe responds to stories)
   - Plot loop hazards (trapped in recurring events)

4. **Consciousness Distribution:**
   - Gleisner Ship design (crew becomes ship)
   - Distributed minds (components think independently)
   - Irreversible integration (ethical concerns)

5. **Timeline Merging:**
   - Merging alternate timelines (optimal outcome selection)
   - Reality warping side effects (universe stability)
   - Multiverse ethics (destroying timelines?)

**Unlocks:**
- Probability Scouts (quantum navigation, Stage 3a)
- Story Ships (narrative navigation, Stage 3b)
- Gleisner Ships (distributed consciousness, Stage 3c)
- Svetz Ships (timeline editing, Stage 3d)
- Timeline Mergers (multiverse manipulation, Stage 3e)

**Production Requirements:**
- Probability Crystals (Tier 5-6)
- Timeline Stabilizers (Tier 6)
- Narrative Resonators (Tier 6, new)
- Consciousness Substrate (Tier 6-7)

### Stage 4: Transcendence (Transgalactic Era)

**Timeline:** 25,000-100,000 years
**Era:** Era 12 (Transgalactic)
**Duration:** ~10,000-50,000 years (highly variable)

**Prerequisites:**
- Stage 3 complete (100/100)
- Clarketech Tier 3+ (reality engineering)
- Post-biological population >30%
- Galactic-scale civilization (10,000+ star systems)

**Status:** Unknown, emergent from Stage 3
**Research:** Theoretical, no clear path

**Theoretical Capabilities:**
- Cross-galactic instantaneous travel (omnipresence)
- Reality-independent navigation (exist outside physics)
- Consciousness-driven ships (ship becomes mind, mind becomes ship)
- Probability certainty (no more uncertainty, predetermined outcomes)

**Speculated Requirements:**
- Complete understanding of β-space (all timelines mapped)
- Reality engineering mastery (Clarketech Tier 4-5)
- Consciousness merger (collective galactic mind?)
- Apotheosis (deity transformation)

**Potential Unlocks:**
- Omnipresent vessels (exist everywhere simultaneously)
- Reality ships (carry custom physics with them)
- Timeline ships (navigate causality, not space)
- Consciousness ships (ship is sentient universe)

**Open Questions:**
- Is Stage 4 achievable by any civilization?
- Does it require post-biological existence?
- Is it a discrete breakthrough or gradual merging?
- Do Stage 4 ships still count as "ships"?

### Stage 5: Cosmic Integration (Post-Singularity/Transcendent)

**Timeline:** 100,000-1,000,000+ years
**Era:** Era 13-14 (Post-Singularity → Transcendent)
**Duration:** Unknown (possibly instantaneous, possibly impossible)

**Prerequisites:**
- Stage 4 complete (???)
- Post-singularity intelligence (god-like minds)
- Universe-scale understanding (multiverse mastery)
- Clarketech Tier 7+ (galactic omnipotence)

**Status:** Unknown, possibly unachievable by biological minds
**Research:** Beyond comprehension

**Theoretical Capabilities:**
- Instantaneous omnipresence (across all realities, all timelines)
- Timeline-independent existence (outside causality)
- Reality creation at will (universe authorship)
- Consciousness becomes universe (existence itself is the ship)

**Philosophical Implications:**
- Are "ships" still meaningful?
- Is this transportation or transformation?
- Do individuals still exist, or only collective minds?
- Is this the endpoint of all civilizations?

**Game Implications:**
- Stage 5 beings may act as cosmic NPCs
- Ancient precursors (left behind incomprehensible artifacts)
- Divine interventions (miracles from transcendent entities)
- Ultimate endgame (player civilization ascends, game "ends"?)

---

## Era Transition Summary Table

| Era | Name | Timeline (years) | Key Tech | Unlock Condition | Population Limit | Hierarchy Level | Spaceflight Stage |
|-----|------|------------------|----------|------------------|------------------|-----------------|-------------------|
| 0 | Paleolithic | 0-10,000 | Stone tools, fire | Starting era | 10,000 | 0-1 (bands) | N/A |
| 1 | Neolithic | 10,000-15,000 | Agriculture | Farming discovered | 50,000 | 1-2 (chiefdoms) | N/A |
| 2 | Bronze Age | 15,000-17,000 | Bronze, writing | Cities 5,000+ | 1,000,000 | 2-3 (kingdoms) | N/A |
| 3 | Iron Age | 17,000-19,000 | Iron, coinage | Philosophy, engineering | 50,000,000 | 3-4 (empires) | N/A |
| 4 | Medieval | 19,000-20,500 | Gunpowder, printing | Scientific method | 20,000,000 | 4-5 (nation-states) | N/A |
| 5 | Renaissance | 20,500-21,000 | Telescope, banking | Scientific revolution | 50,000,000 | 5-6 (colonial empires) | N/A |
| 6 | Industrial | 21,000-21,200 | Steam, railroads | Factories, telegraph | 200,000,000 | 6 (industrial empires) | N/A |
| 7 | Atomic | 21,200-21,250 | Nuclear, computers | Nuclear power, space | 1,000,000,000 | 7 (superpowers) | N/A |
| 8 | Information | 21,250-21,300 | Internet, AI | General AI, renewable | 10,000,000,000 | 8 (global corps) | N/A |
| 9 | Fusion | 21,300-21,400 | Fusion, superintelligence | Fusion, space elevator | 15,000,000,000 | 9 (solar civilization) | Stage 1 begins |
| 10 | Interplanetary | 21,400-22,000 | Worldships, terraforming | Mars colonies, antimatter | 50,000,000,000 | 9-10 (trans-planetary) | Stage 1 complete, Stage 2 at 30% |
| 11 | Interstellar | 22,000-25,000 | β-space FTL, alien contact | FTL breakthrough | 1,000,000,000,000 | 10+ (interstellar) | Stage 2-3 complete |
| 12 | Transgalactic | 25,000-100,000 | Ringworlds, Clarketech 1-3 | Dyson spheres, galactic net | 100,000,000,000,000 | 11+ (galactic, Type II-III) | Stage 4 emerging |
| 13 | Post-Singularity | 100,000-1,000,000 | Clarketech 4-6, universe creation | Intelligence explosion | N/A (uploaded) | 12+ (incomprehensible) | Stage 5 theoretical |
| 14 | Transcendent | 1,000,000+ | Clarketech 7-10, omnipotence | Apotheosis complete | N/A (post-reality) | ??? | Beyond ships |

---

## Implementation Notes

### Component Schema

**TechEra Component:**
```typescript
{
  type: 'tech_era',
  era: number,                    // 0-14 (Paleolithic → Transcendent)
  era_name: string,              // "Interstellar"
  research_progress: number,      // 0-100 (to next era)
  active_research: string[],      // ["fusion_power", "ai_safety"]
  scientist_count: number,        // Researchers (see ScientistEmergence.ts)
  university_count: number,       // Research infrastructure
  tech_unlocked: string[],        // ["telescope", "calculus", "steam_engine"]
  tech_lost: string[],            // ["roman_concrete", "greek_fire"] (dark ages)
  collapse_risk: number,          // 0-100 (chance of regression)
  uplifted_by: string | null,     // Civilization ID that uplifted this one
  uplifting: string[],            // Civilization IDs being uplifted
}
```

**SpaceflightResearch Component (existing):**
```typescript
{
  type: 'spaceflight_research',
  stage: number,                  // 1-5
  stage_progress: number,         // 0-100
  stage_name: string,             // "β-Space Discovery"
  unlocked_ships: string[],       // ["threshold", "courier", "brainship"]
  active_projects: string[],      // ["emotional_physics", "heart_chamber_theory"]
}
```

**Clarketech Component:**
```typescript
{
  type: 'clarketech',
  tier: number,                   // 1-10
  tier_name: string,              // "Sufficiently Advanced Magic"
  devices: string[],              // ["matter_replicator", "timeline_editor"]
  comprehensibility: number,      // 0-100 (how understandable to baseline)
}
```

### System Integration

**TechProgressionSystem:**
- Priority: 150 (after CooperativeResearchSystem)
- Updates: `tech_era.research_progress` based on scientist count, universities
- Triggers: Era advancement when progress reaches 100
- Unlocks: Buildings, production chains, ship types

**KnowledgeLossSystem:**
- Priority: 850 (late update)
- Monitors: Collapse triggers (war, famine, infrastructure damage)
- Updates: `tech_era.collapse_risk`
- Triggers: Era regression events, technology loss

**UpliftDiplomacySystem:**
- Priority: 200 (after diplomacy)
- Monitors: Advanced civs interacting with primitives
- Events: Uplift offers, forced uplift, accidental contamination
- Consequences: Cultural contamination, dependency, rebellion

**SpaceflightResearchSystem (existing):**
- Located: `packages/core/src/research/SpaceshipResearch.ts`
- Integration: Triggered at Era 9 (Fusion), accelerates at Era 10-11
- See: Existing implementation for research mechanics

### Events

**Era Advancement:**
```typescript
{
  type: 'era_advanced',
  civilization_id: string,
  old_era: number,
  new_era: number,
  unlocked_tech: string[],
  message: "The Empire has entered the Atomic Age!"
}
```

**Knowledge Loss:**
```typescript
{
  type: 'knowledge_lost',
  civilization_id: string,
  trigger: string,               // "nuclear_war", "library_burned"
  lost_tech: string[],
  era_regression: number,        // -2 (dropped 2 eras)
}
```

**Uplift Event:**
```typescript
{
  type: 'civilization_uplifted',
  uplifter_id: string,
  uplifted_id: string,
  method: string,                // "educational", "forced", "accidental"
  tech_transferred: string[],
  outcome: string,               // "success", "dependency", "cargo_cult", "rebellion"
}
```

**Collapse Event:**
```typescript
{
  type: 'civilization_collapsed',
  civilization_id: string,
  trigger: string,               // "war", "plague", "ai_takeover"
  severity: number,              // Era regression amount
  survivors: number,
  knowledge_preserved: string[], // Technologies that survived
}
```

### Production Chain Integration

Era advancement unlocks production tiers from `SpaceflightItems.ts`:

- **Era 6 (Industrial):** Tier 1-2 (basic materials)
- **Era 7 (Atomic):** Tier 3 (intermediate components)
- **Era 8 (Information):** Tier 4 (advanced components)
- **Era 9 (Fusion):** Tier 5 (exotic materials)
- **Era 10-11 (Interplanetary/Interstellar):** Tier 6 (β-space components)
- **Era 11-12 (Interstellar/Transgalactic):** Tier 7 (ship hull kits)
- **Era 12+ (Transgalactic+):** Tier 8-10 (reality-warped materials)

### Balancing Notes

**Research Duration:**
- Early eras (0-5): 1,000-2,000 years each
- Middle eras (6-9): 50-200 years each (accelerating progress)
- Late eras (10-12): 600-75,000 years (slower, harder breakthroughs)
- Post-singularity (13+): 100,000+ years (diminishing returns)

**Collapse Frequency:**
- Per 1,000 years: 5% chance of minor collapse
- Per 10,000 years: 20% chance of major collapse
- Per 100,000 years: 50% chance of catastrophic collapse
- Increases with: War, environmental damage, tech tier (unstable advanced tech)

**Uplift Costs:**
- Resource cost: 1,000 units per era jumped
- Time cost: 50 years per era jumped
- Diplomatic cost: -20 reputation (interventionism) per era jumped
- Failure risk: +25% per era jumped beyond first

---

## Open Questions & Future Extensions

1. **Stagnation:** Can civilizations plateau? Max era without key breakthroughs?
2. **Alternate Paths:** Magic vs science? Different tech trees entirely?
3. **Alien Tech Trees:** Do aliens follow same progression?
4. **Divergent Evolution:** Post-human species develop unique technologies?
5. **Cyclic Time:** Do transcendent civilizations loop back to beginning?
6. **Meta-Stability:** Is Transcendent era stable, or inevitable collapse?

---

## References

**Existing Systems:**
- `packages/hierarchy-simulator/types.ts` (TechProgress interface)
- `packages/hierarchy-simulator/research/ScientistEmergence.ts` (HARD STEPS model)
- `packages/core/src/research/SpaceshipResearch.ts` (5-stage spaceflight research)
- `packages/core/src/items/SpaceflightItems.ts` (production chain, 65+ materials, 7 tiers)

**Related Specs:**
- [CORRUPTION_SYSTEM.md](../../custom_game_engine/CORRUPTION_SYSTEM.md) (never delete, preserve corrupted tech)
- [METASYSTEMS_GUIDE.md](../../custom_game_engine/METASYSTEMS_GUIDE.md) (Divinity, Magic, Multiverse)
- [SYSTEMS_CATALOG.md](../../custom_game_engine/SYSTEMS_CATALOG.md) (212+ systems)

**Inspirations:**
- Dwarf Fortress (deep simulation, emergent complexity)
- Stellaris (grand strategy, technology trees)
- Civilization series (era progression, tech trees)
- Sid Meier's Alpha Centauri (transcendence endgame)
- Eclipse Phase (transhumanism, uploading, post-scarcity)
- Greg Egan's novels (Gleisner robots, Permutation City)
- Larry Niven's stories (Svetz, timeline editing)
- Vernor Vinge (Singularity, intelligence explosion)
- Arthur C. Clarke (Clarketech, sufficiently advanced magic)

---

**End of Specification**

# Deep Ocean Life & Submarine Technology - Specification

**Created:** 2026-01-12
**Status:** Draft
**Version:** 1.0.0
**Dependencies:** PLANETARY_WATER_PHYSICS_SPEC.md, animal-system/spec.md, building-system/voxel-building.md

---

## Overview

Deep ocean life represents the final frontier of planetary exploration. This spec covers four interconnected systems that enable underwater civilizations:

1. **Aquatic Species** - Pressure-adapted creatures from surface to hadal zones
2. **Bioluminescence** - Light-producing organisms for communication and hunting
3. **Hydrothermal Vent Ecosystems** - Chemosynthetic life independent of sunlight
4. **Submarine Construction** - Underwater habitats and exploration vehicles

**Design Philosophy:** Dwarf Fortress-style emergent complexity. Each ocean zone supports unique ecosystems. Species evolve pressure/temperature adaptations. Agents can build underwater cities or encounter alien aquatic civilizations.

---

## 1. Aquatic Species System

### 1.1 Aquatic Species Architecture

Extends existing `AnimalSpecies` with ocean-specific properties:

```typescript
interface AquaticSpecies extends AnimalSpecies {
  // Ocean-specific habitat
  oceanZones: OceanBiomeZone[];  // Which zones this species lives in
  depthRange: [number, number];  // Min/max depth in meters (-11000 to 0)

  // Pressure adaptation
  pressureAdapted: boolean;      // Immune to pressure damage
  maxPressureAtm: number;        // Maximum survivable pressure
  pressureTolerance: number;     // 0-1 (how well handles pressure changes)

  // Temperature adaptation
  temperatureRange: [number, number];  // Min/max °C (-2 to 35)
  thermalTolerance: number;      // 0-1 (how well handles temp changes)

  // Respiration
  respirationType: 'gills' | 'skin' | 'chemosynthetic' | 'none';
  oxygenRequirement: number;     // 0-1 (0 = anaerobic)

  // Locomotion
  locomotion: AquaticLocomotion;
  maxSwimSpeed: number;          // Tiles per tick
  buoyancy: 'positive' | 'neutral' | 'negative';

  // Bioluminescence
  bioluminescent: boolean;
  lightPattern?: BioluminescentPattern;
  lightColor?: string;           // Hex color
  lightRadius?: number;          // Tiles

  // Behavior
  migrationPattern?: MigrationPattern;
  schooling: boolean;            // Forms schools/pods
  territorialRadius?: number;    // Tiles defended

  // Symbiosis
  symbioticWith?: string[];      // Species IDs
  hostSpecies?: string;          // If parasitic/symbiotic

  // Energy source
  energySource: 'photosynthesis' | 'predation' | 'detritus' | 'chemosynthetic' | 'filter_feeding';
  chemosynthetic?: boolean;      // Lives near hydrothermal vents
}

type AquaticLocomotion =
  | 'jet_propulsion'       // Squid, jellyfish
  | 'undulation'           // Eels, rays
  | 'oscillation'          // Most fish
  | 'rowing'               // Crabs, lobsters
  | 'drift'                // Plankton, jellyfish
  | 'sessile';             // Coral, sponges, tube worms

interface BioluminescentPattern {
  purpose: 'hunting' | 'mating' | 'communication' | 'defense' | 'camouflage';
  pattern: 'steady' | 'pulse' | 'flash' | 'wave' | 'countershading';
  frequency?: number;        // Hz for pulsing patterns
  controllable: boolean;     // Can turn on/off
}

interface MigrationPattern {
  type: 'vertical' | 'seasonal' | 'spawning' | 'none';
  verticalRange?: [number, number];  // Day/night depth change
  migrationTrigger?: 'temperature' | 'food' | 'reproduction' | 'daylight';
  migrationDistance?: number;  // Tiles
}
```

### 1.2 Ocean Zone Species Examples

**Epipelagic Zone (0 to -200m) - Sunlight Zone**

```typescript
// Example: Kelp Forest Ecosystem
const GIANT_KELP: AquaticSpecies = {
  id: 'giant_kelp',
  name: 'Giant Kelp',
  category: 'plant',
  oceanZones: ['epipelagic'],
  depthRange: [0, -40],
  pressureAdapted: true,
  maxPressureAtm: 5,
  temperatureRange: [8, 20],
  locomotion: 'sessile',
  energySource: 'photosynthesis',
  size: 'large',  // Up to 45m tall
  description: 'Fastest-growing organism on planet. Forms underwater forests.',
};

const SEA_OTTER: AquaticSpecies = {
  id: 'sea_otter',
  name: 'Sea Otter',
  category: 'mammal',
  oceanZones: ['epipelagic'],
  depthRange: [0, -40],
  pressureAdapted: false,  // Surface dweller
  maxPressureAtm: 4,
  temperatureRange: [0, 15],
  respirationType: 'none',  // Air-breathing
  locomotion: 'rowing',
  maxSwimSpeed: 0.2,
  energySource: 'predation',
  diet: 'carnivore',
  canBeTamed: true,
  tameDifficulty: 0.6,
  description: 'Uses tools to crack open shellfish. Floats on back.',
};
```

**Mesopelagic Zone (-200 to -1000m) - Twilight Zone**

```typescript
const LANTERNFISH: AquaticSpecies = {
  id: 'lanternfish',
  name: 'Lanternfish',
  category: 'fish',
  oceanZones: ['mesopelagic'],
  depthRange: [-200, -1000],
  pressureAdapted: true,
  maxPressureAtm: 100,
  temperatureRange: [5, 15],
  respirationType: 'gills',
  locomotion: 'oscillation',
  bioluminescent: true,
  lightPattern: {
    purpose: 'camouflage',
    pattern: 'countershading',  // Matches downwelling light
    controllable: true,
  },
  lightColor: '#00FFFF',  // Blue-white
  lightRadius: 1,
  migrationPattern: {
    type: 'vertical',
    verticalRange: [-600, -100],  // Rise at night to feed
    migrationTrigger: 'daylight',
  },
  schooling: true,
  energySource: 'predation',
  diet: 'carnivore',
  description: 'Most abundant vertebrate on Earth. Migrates 400m nightly.',
};

const GIANT_SQUID: AquaticSpecies = {
  id: 'giant_squid',
  name: 'Giant Squid',
  category: 'cephalopod',
  oceanZones: ['mesopelagic', 'bathypelagic'],
  depthRange: [-300, -1000],
  pressureAdapted: true,
  maxPressureAtm: 200,
  temperatureRange: [2, 10],
  respirationType: 'gills',
  locomotion: 'jet_propulsion',
  maxSwimSpeed: 0.3,
  bioluminescent: true,
  lightPattern: {
    purpose: 'hunting',
    pattern: 'flash',
    controllable: true,
  },
  size: 'huge',  // Up to 13m
  energySource: 'predation',
  diet: 'carnivore',
  description: 'Elusive deep-sea hunter with eyes the size of dinner plates.',
};
```

**Bathypelagic Zone (-1000 to -4000m) - Midnight Zone**

```typescript
const ANGLERFISH: AquaticSpecies = {
  id: 'anglerfish',
  name: 'Anglerfish',
  category: 'fish',
  oceanZones: ['bathypelagic'],
  depthRange: [-1000, -4000],
  pressureAdapted: true,
  maxPressureAtm: 400,
  temperatureRange: [2, 6],
  respirationType: 'gills',
  locomotion: 'undulation',
  maxSwimSpeed: 0.05,  // Very slow
  bioluminescent: true,
  lightPattern: {
    purpose: 'hunting',
    pattern: 'steady',
    controllable: true,
  },
  lightColor: '#00FF00',  // Green lure
  lightRadius: 2,
  energySource: 'predation',
  diet: 'carnivore',
  sexualDimorphism: true,  // Males tiny parasites
  description: 'Females have bioluminescent lure. Males fuse to female as parasites.',
};

const VAMPIRE_SQUID: AquaticSpecies = {
  id: 'vampire_squid',
  name: 'Vampire Squid',
  category: 'cephalopod',
  oceanZones: ['bathypelagic'],
  depthRange: [-600, -3000],
  pressureAdapted: true,
  maxPressureAtm: 300,
  temperatureRange: [2, 6],
  oxygenRequirement: 0.2,  // Tolerates low oxygen
  locomotion: 'jet_propulsion',
  bioluminescent: true,
  lightPattern: {
    purpose: 'defense',
    pattern: 'pulse',
    frequency: 2,  // Hz
    controllable: true,
  },
  lightColor: '#FF0000',  // Red/blue
  energySource: 'detritus',  // Marine snow
  diet: 'detritivore',
  description: 'Living fossil. Ejects bioluminescent mucus cloud as defense.',
};
```

**Abyssal Zone (-4000 to -6000m) - Deep Ocean Floor**

```typescript
const TRIPOD_FISH: AquaticSpecies = {
  id: 'tripod_fish',
  name: 'Tripod Fish',
  category: 'fish',
  oceanZones: ['abyssal'],
  depthRange: [-4000, -6000],
  pressureAdapted: true,
  maxPressureAtm: 600,
  temperatureRange: [0, 3],
  respirationType: 'gills',
  locomotion: 'sessile',  // Stands on fins
  maxSwimSpeed: 0.01,
  buoyancy: 'neutral',
  energySource: 'predation',
  diet: 'carnivore',
  description: 'Stands on seafloor on elongated fin rays. Faces current to catch prey.',
};

const GRENADIER_FISH: AquaticSpecies = {
  id: 'grenadier',
  name: 'Grenadier',
  category: 'fish',
  oceanZones: ['abyssal'],
  depthRange: [-200, -6000],  // Widest depth range
  pressureAdapted: true,
  maxPressureAtm: 600,
  temperatureRange: [0, 10],
  locomotion: 'undulation',
  energySource: 'detritus',
  diet: 'scavenger',
  description: 'Most common deep-sea fish. Scavenges whale falls.',
};
```

**Hadal Zone (-6000 to -11000m) - Ocean Trenches**

```typescript
const SNAILFISH: AquaticSpecies = {
  id: 'hadal_snailfish',
  name: 'Hadal Snailfish',
  category: 'fish',
  oceanZones: ['hadal'],
  depthRange: [-6000, -8200],  // Deepest known fish
  pressureAdapted: true,
  maxPressureAtm: 800,
  temperatureRange: [1, 4],
  respirationType: 'gills',
  locomotion: 'undulation',
  maxSwimSpeed: 0.05,
  pressureTolerance: 1.0,  // Perfectly adapted
  energySource: 'predation',
  diet: 'carnivore',
  description: 'Deepest-living fish. Gelatinous body adapted to extreme pressure.',
};

// Hypothetical alien deep-sea species
const BRINE_POOL_LURKER: AquaticSpecies = {
  id: 'brine_pool_lurker',
  name: 'Brine Pool Lurker',
  category: 'alien',
  oceanZones: ['hadal'],
  depthRange: [-8000, -11000],
  pressureAdapted: true,
  maxPressureAtm: 1100,
  temperatureRange: [-2, 5],  // Below freezing (brine)
  respirationType: 'chemosynthetic',
  locomotion: 'undulation',
  oxygenRequirement: 0,  // Anaerobic
  bioluminescent: true,
  lightPattern: {
    purpose: 'communication',
    pattern: 'wave',
    controllable: true,
  },
  lightColor: '#0000FF',  // Deep blue
  energySource: 'chemosynthetic',
  chemosynthetic: true,
  description: 'Lives in hypersaline brine pools. Metabolizes methane and sulfur.',
};
```

### 1.3 Aquatic Species Behaviors

**Depth Migration (Vertical Movement)**

Many species migrate vertically based on day/night cycle:

```typescript
interface VerticalMigrationBehavior {
  // Diel Vertical Migration (DVM)
  dayDepth: number;      // Deep during day (hide from predators)
  nightDepth: number;    // Shallow at night (feed on plankton)
  migrationSpeed: number;  // Meters per hour

  // Trigger conditions
  lightThreshold: number;  // Lux level that triggers migration

  // Energy cost
  energyCost: number;    // Per meter migrated
}

// Example: Lanternfish DVM
const LANTERNFISH_DVM: VerticalMigrationBehavior = {
  dayDepth: -600,         // Hide in twilight zone during day
  nightDepth: -100,       // Feed in epipelagic at night
  migrationSpeed: 200,    // 200m/hour (one of fastest migrations)
  lightThreshold: 0.01,   // Triggers at dawn/dusk
  energyCost: 0.001,      // Small energy cost
};
```

**Schooling Behavior**

```typescript
interface SchoolingBehavior {
  minSchoolSize: number;
  maxSchoolSize: number;
  cohesionRadius: number;   // Tiles to stay together
  separationRadius: number; // Minimum distance from others
  alignmentStrength: number; // How strongly match neighbors' direction

  // Defense benefits
  confusionFactor: number;  // 0-1 (harder for predators to target)
  vigilanceBonus: number;   // Increased predator detection
}
```

**Bioluminescent Communication**

```typescript
interface BioluminescentCommunication {
  signals: BioluminescentSignal[];
  recognitionRange: number;  // Tiles
  speciesSpecific: boolean;  // Only same species understand
}

interface BioluminescentSignal {
  meaning: 'attract_mate' | 'warning' | 'food_found' | 'distress' | 'territorial';
  pattern: LightPattern;
  duration: number;  // Ticks
}

// Example: Firefly Squid mating display
const FIREFLY_SQUID_MATING: BioluminescentSignal = {
  meaning: 'attract_mate',
  pattern: {
    type: 'flash',
    frequency: 3,  // 3 Hz
    color: '#00FFFF',
    synchronize: true,  // Thousands flash in sync
  },
  duration: 1200,  // 1 minute
};
```

---

## 2. Bioluminescence System

### 2.1 Bioluminescent Component

```typescript
interface BioluminescentComponent {
  type: 'bioluminescent';

  // Light properties
  enabled: boolean;
  color: string;           // Hex color
  intensity: number;       // 0-1
  radius: number;          // Tiles illuminated

  // Pattern
  pattern: BioluminescentPattern;
  phaseOffset: number;     // For synchronized flashing

  // Control
  controllable: boolean;   // Can turn on/off voluntarily
  energyCost: number;      // Energy drained per tick when active
  cooldown: number;        // Ticks before can use again
  lastActivation: number;  // Game tick

  // Function
  currentPurpose?: 'hunting' | 'mating' | 'defense' | 'communication';
}
```

### 2.2 Bioluminescence Mechanics

**Light Source Integration**

Bioluminescent creatures act as dynamic light sources in deep ocean:

```typescript
// In renderer, bioluminescent entities emit light
interface LightSource {
  position: { x: number; y: number; z: number };
  color: string;
  radius: number;
  intensity: number;
  dynamic: boolean;  // Changes over time (pulsing, flashing)
}

// Bioluminescence affects agent vision in dark zones
// Light level calculation includes bioluminescent sources
function calculateEffectiveLightLevel(
  tile: Tile,
  biolumSources: BioluminescentEntity[]
): number {
  const ambientLight = calculateLightLevel(tile.elevation);

  // Add contribution from nearby bioluminescent creatures
  let biolumLight = 0;
  for (const source of biolumSources) {
    const distance = getDistance(tile, source.position);
    if (distance <= source.lightRadius) {
      const falloff = 1 - (distance / source.lightRadius);
      biolumLight += source.intensity * falloff * 10; // Convert to lux
    }
  }

  return ambientLight + biolumLight;
}
```

**Bioluminescent Behaviors**

```typescript
// Hunting with bioluminescence (anglerfish lure)
class BioluminescentLureBehavior implements Behavior {
  execute(entity: Entity, world: World): void {
    const bioComp = entity.getComponent('bioluminescent');
    const position = entity.getComponent('position');

    // Enable lure when hungry
    const needs = entity.getComponent('needs');
    if (needs.hunger < 0.5) {
      bioComp.enabled = true;
      bioComp.currentPurpose = 'hunting';

      // Attract prey within radius
      const prey = world.getNearbyEntities(position, bioComp.radius)
        .filter(e => e.hasComponent('attracted_to_light'));

      // Lure prey closer
      for (const target of prey) {
        applyAttraction(target, position, strength: 0.3);
      }
    }
  }
}

// Defense with bioluminescence (startling flash)
class BioluminescentDefenseBehavior implements Behavior {
  execute(entity: Entity, world: World): void {
    const bioComp = entity.getComponent('bioluminescent');
    const threats = detectThreats(entity, world);

    if (threats.length > 0 && bioComp.cooldown === 0) {
      // Bright flash to startle predators
      bioComp.enabled = true;
      bioComp.intensity = 1.0;
      bioComp.currentPurpose = 'defense';

      // Confuse/stun nearby predators
      for (const threat of threats) {
        applyStun(threat, duration: 60);  // 3 seconds
      }

      bioComp.cooldown = 1200;  // 1 minute cooldown
    }
  }
}

// Mating with synchronized bioluminescence
class SynchronizedBioluminescenceBehavior implements Behavior {
  execute(entity: Entity, world: World): void {
    const bioComp = entity.getComponent('bioluminescent');

    if (isMatingPeriod(world.tick)) {
      // Synchronize with nearby same-species
      const nearby = world.getNearbyEntities(entity.position, 50)
        .filter(e => e.species === entity.species && e.hasComponent('bioluminescent'));

      // Calculate synchronized phase
      const avgPhase = calculateAveragePhase(nearby);
      bioComp.phaseOffset = avgPhase;
      bioComp.enabled = true;
      bioComp.currentPurpose = 'mating';
    }
  }
}
```

### 2.3 Bioluminescence Visuals

Rendering bioluminescent creatures in the ocean:

```typescript
// Shader for bioluminescent glow
const BIOLUM_SHADER = `
  uniform vec3 glowColor;      // RGB color
  uniform float intensity;      // 0-1
  uniform float time;           // For pulsing
  uniform float frequency;      // Hz for pulse pattern

  void main() {
    // Pulsing glow
    float pulse = sin(time * frequency * 2.0 * PI) * 0.5 + 0.5;
    vec3 glow = glowColor * intensity * pulse;

    // Exponential falloff
    float dist = length(fragCoord - lightPos);
    float attenuation = exp(-dist / radius);

    gl_FragColor = vec4(glow * attenuation, attenuation);
  }
`;

// Particle effects for bioluminescent trails
class BioluminescentTrail {
  particles: Particle[];

  emit(position: Vec3, color: string) {
    this.particles.push({
      position,
      color,
      lifetime: 120,  // 6 seconds
      fadeRate: 0.01,
      size: 2,
    });
  }

  update() {
    for (const particle of this.particles) {
      particle.lifetime--;
      particle.size *= 0.99;  // Shrink
      particle.opacity *= 0.98;  // Fade
    }

    this.particles = this.particles.filter(p => p.lifetime > 0);
  }
}
```

---

## 3. Hydrothermal Vent Ecosystems

### 3.1 Hydrothermal Vent Generation

Vents spawn in abyssal/hadal zones along tectonic plate boundaries:

```typescript
interface HydrothermalVent {
  id: string;
  position: { x: number; y: number; z: number };  // Seafloor position

  // Vent properties
  type: VentType;
  temperature: number;     // °C (50-400°C)
  flowRate: number;        // Liters per second
  mineralContent: MineralContent;

  // Chemistry
  pH: number;              // 2-8 (acidic to neutral)
  sulfideConcentration: number;
  methaneConcentration: number;
  metalConcentration: Record<string, number>;  // Fe, Cu, Zn, etc.

  // Ecosystem
  biomass: number;         // kg of life supported
  species: string[];       // Species IDs living here

  // Stability
  active: boolean;
  ageYears: number;
  instability: number;     // 0-1 (chance of shutdown)
}

type VentType =
  | 'black_smoker'   // 300-400°C, iron sulfide plumes
  | 'white_smoker'   // 40-90°C, barium/calcium/silicon
  | 'diffuse_flow'   // <40°C, low temperature seepage
  | 'cold_seep';     // Methane/hydrocarbon seepage

interface MineralContent {
  iron: number;
  sulfur: number;
  copper: number;
  zinc: number;
  gold: number;
  silver: number;
  rare_earths: number;
}
```

### 3.2 Chemosynthetic Life

Life that doesn't need sunlight, powered by chemical energy:

```typescript
// Giant tube worms - foundation of vent ecosystem
const GIANT_TUBE_WORM: AquaticSpecies = {
  id: 'giant_tube_worm',
  name: 'Giant Tube Worm',
  category: 'invertebrate',
  oceanZones: ['abyssal', 'hadal'],
  depthRange: [-1500, -3000],
  pressureAdapted: true,
  maxPressureAtm: 300,
  temperatureRange: [2, 60],  // Wide range - lives at vent edge

  locomotion: 'sessile',
  energySource: 'chemosynthetic',
  chemosynthetic: true,

  // No mouth, no digestive system!
  respirationType: 'skin',
  oxygenRequirement: 0.1,  // Low oxygen needs

  size: 'large',  // Up to 2.4m

  // Symbiosis with chemosynthetic bacteria
  symbioticWith: ['sulfide_oxidizing_bacteria'],

  description: 'No mouth or gut. Symbiotic bacteria in trophosome convert sulfide to energy. Red plume filters chemicals from water.',
};

// Chemosynthetic bacteria - basis of food web
const SULFIDE_BACTERIA: AquaticSpecies = {
  id: 'sulfide_oxidizing_bacteria',
  name: 'Sulfide-Oxidizing Bacteria',
  category: 'bacteria',
  oceanZones: ['abyssal', 'hadal'],
  depthRange: [-1500, -11000],
  pressureAdapted: true,
  maxPressureAtm: 1100,
  temperatureRange: [2, 120],  // Thermophilic

  locomotion: 'drift',
  energySource: 'chemosynthetic',
  chemosynthetic: true,

  // Chemical equation: H₂S + O₂ → SO₄²⁻ + H₂O + Energy
  oxygenRequirement: 0.1,

  description: 'Oxidizes hydrogen sulfide for energy. Forms basis of vent food web.',
};

// Yeti crab - harvests bacteria from claws
const YETI_CRAB: AquaticSpecies = {
  id: 'yeti_crab',
  name: 'Yeti Crab',
  category: 'crustacean',
  oceanZones: ['abyssal'],
  depthRange: [-2200, -2600],
  pressureAdapted: true,
  maxPressureAtm: 260,
  temperatureRange: [2, 30],

  locomotion: 'rowing',
  energySource: 'chemosynthetic',  // Indirectly
  diet: 'omnivore',

  // Farms bacteria on hairy claws
  symbioticWith: ['sulfide_oxidizing_bacteria'],

  description: 'Hairy claws covered in filamentous bacteria. Waves claws in vent flow to feed bacteria, then eats them.',
};
```

### 3.3 Vent Ecosystem Dynamics

```typescript
class HydrothermalVentSystem implements System {
  // Spawns vents in geologically active zones
  generateVent(world: World, position: Vec3): HydrothermalVent {
    // Check if position is on seafloor in abyssal/hadal zone
    const tile = world.getTileAt(position.x, position.y, position.z);
    if (!tile.oceanZone || !['abyssal', 'hadal'].includes(tile.oceanZone)) {
      return null;
    }

    // Determine vent type based on geology
    const tectonicActivity = world.getTectonicActivity(position);
    const type = tectonicActivity > 0.7 ? 'black_smoker' :
                 tectonicActivity > 0.4 ? 'white_smoker' : 'diffuse_flow';

    const vent: HydrothermalVent = {
      id: generateId(),
      position,
      type,
      temperature: type === 'black_smoker' ? 350 : type === 'white_smoker' ? 70 : 20,
      flowRate: Math.random() * 100,
      mineralContent: generateMineralContent(type),
      pH: type === 'black_smoker' ? 3 : 6,
      sulfideConcentration: Math.random() * 10,  // mM
      active: true,
      ageYears: 0,
      instability: 0.1,
      biomass: 0,
      species: [],
    };

    // Spawn initial chemosynthetic bacteria
    this.spawnChemosynthenticBacteria(vent, world);

    return vent;
  }

  // Vent ecosystem grows over time
  updateVentEcosystem(vent: HydrothermalVent, world: World): void {
    if (!vent.active) return;

    // Bacteria population grows near vent
    const bacteriaGrowth = vent.sulfideConcentration * 0.1;
    vent.biomass += bacteriaGrowth;

    // Spawn tube worms once bacteria established
    if (vent.biomass > 100 && !vent.species.includes('giant_tube_worm')) {
      this.spawnTubeWorms(vent, world);
      vent.species.push('giant_tube_worm');
    }

    // Attract mobile species (crabs, fish) to vent
    if (vent.biomass > 500) {
      this.attractVentScavengers(vent, world);
    }

    // Vent aging and potential shutdown
    vent.ageYears += 1 / 365;  // Increment by days
    vent.instability += 0.001;

    if (Math.random() < vent.instability) {
      vent.active = false;
      console.log(`[Vent ${vent.id}] Hydrothermal vent shut down after ${vent.ageYears} years`);
      // Ecosystem dies without vent
      this.ventShutdownEvent(vent, world);
    }
  }

  // Mining opportunity - vents deposit valuable minerals
  getMineralDeposits(vent: HydrothermalVent): Record<string, number> {
    // Chimneys accumulate metals over time
    const deposits: Record<string, number> = {};

    for (const [metal, concentration] of Object.entries(vent.mineralContent)) {
      deposits[metal] = concentration * vent.ageYears * vent.flowRate;
    }

    return deposits;
  }
}
```

---

## 4. Submarine Construction System

### 4.1 Submarine Vehicle Types

```typescript
interface SubmarineVehicle extends Building {
  type: 'submarine';
  subtype: SubmarineType;

  // Structural
  hull: HullMaterial;
  maxDepth: number;        // Maximum safe depth (meters)
  crushDepth: number;      // Instant destruction depth
  currentDepth: number;

  // Propulsion
  propulsion: PropulsionType;
  maxSpeed: number;        // Tiles per tick
  maneuverability: number; // 0-1 (turning radius)

  // Life support
  airSupply: number;       // Ticks of oxygen remaining
  maxAirSupply: number;
  co2Scrubbers: number;    // Efficiency 0-1

  // Crew
  crew: string[];          // Agent IDs
  maxCrew: number;

  // Equipment
  lights: boolean;
  sonar: boolean;
  manipulatorArms: number;
  sampleStorage: number;   // kg capacity

  // Power
  powerSource: PowerSource;
  battery: number;         // 0-1
  maxBattery: number;

  // Viewport
  viewports: Viewport[];
  cameraFeeds: CameraFeed[];
}

type SubmarineType =
  | 'research_sub'      // Small, 1-3 crew, scientific instruments
  | 'cargo_sub'         // Medium, transport goods underwater
  | 'military_sub'      // Combat, torpedoes, stealth
  | 'deep_sea_sub'      // Specialized for hadal zone exploration
  | 'manned_rover';     // Crawls on seafloor, not buoyant

type HullMaterial =
  | 'wood'              // Primitive, max 50m
  | 'iron'              // Basic, max 100m
  | 'steel'             // Standard, max 300m
  | 'reinforced_steel'  // Advanced, max 1000m
  | 'titanium'          // Deep sea, max 6000m
  | 'ceramic_composite' // Experimental, max 11000m;

type PropulsionType =
  | 'diesel'            // Surface-diesel, submerged-electric
  | 'nuclear'           // Unlimited range
  | 'battery'           // Limited range, quiet
  | 'bio_electric';     // Alien tech, organic batteries

interface Viewport {
  position: { x: number; y: number };  // On hull
  radius: number;      // Viewing angle
  material: 'glass' | 'acrylic' | 'sapphire' | 'transparent_aluminum';
  maxDepth: number;
}
```

### 4.2 Submarine Blueprints

```typescript
// Basic research submarine
const RESEARCH_SUB_I: SubmarineBlueprint = {
  id: 'research_sub_basic',
  name: 'Deep Sea Explorer',
  subtype: 'research_sub',

  // Construction requirements
  materials: {
    steel: 500,
    glass: 50,
    rubber: 100,
    batteries: 20,
  },
  buildTime: 14400,  // 12 game hours (720 minutes × 20 TPS)

  // Specifications
  hull: 'reinforced_steel',
  maxDepth: 1000,
  crushDepth: 1500,
  propulsion: 'battery',
  maxSpeed: 0.1,
  maneuverability: 0.7,

  maxCrew: 3,
  maxAirSupply: 72000,  // 1 game hour (60 min)

  // Equipment
  lights: true,
  sonar: true,
  manipulatorArms: 2,
  sampleStorage: 100,  // kg

  viewports: [
    { position: { x: 0, y: 0 }, radius: 10, material: 'acrylic', maxDepth: 1000 },
    { position: { x: 0, y: 5 }, radius: 5, material: 'acrylic', maxDepth: 1000 },
  ],

  description: 'Mesopelagic/bathypelagic research vessel. Collect samples, study bioluminescence.',
};

// Hadal zone extreme depth sub
const DEEP_SEA_CHALLENGER: SubmarineBlueprint = {
  id: 'hadal_explorer',
  name: 'Mariana Challenger',
  subtype: 'deep_sea_sub',

  // Advanced construction
  materials: {
    titanium: 2000,
    transparent_aluminum: 100,
    advanced_electronics: 50,
    syntactic_foam: 500,  // Buoyancy
  },
  buildTime: 72000,  // 60 game hours
  requiredTech: ['extreme_pressure_engineering', 'deep_ocean_metallurgy'],

  // Extreme specifications
  hull: 'titanium',
  maxDepth: 11000,   // Full ocean depth!
  crushDepth: 12000,
  propulsion: 'battery',
  maxSpeed: 0.05,    // Very slow
  maneuverability: 0.4,  // Limited

  maxCrew: 1,        // Single pilot sphere
  maxAirSupply: 144000,  // 2 game hours

  // High-tech equipment
  lights: true,
  sonar: true,
  manipulatorArms: 1,
  sampleStorage: 50,

  viewports: [
    { position: { x: 0, y: 0 }, radius: 8, material: 'transparent_aluminum', maxDepth: 11000 },
  ],

  cameras: [
    { type: 'HD', lighting: 'LED array', zoom: '10x' },
  ],

  description: 'Single-pilot titanium sphere. Reach ocean trenches. Study hadal zone extremophiles.',
};
```

### 4.3 Underwater Base Construction

```typescript
interface UnderwaterBase extends Building {
  type: 'underwater_base';

  // Structure
  modules: BaseModule[];
  airlocks: number;

  // Life support
  oxygenGenerators: number;  // Electrolysis capacity
  pressurization: number;    // Internal pressure (atmospheres)
  temperatureControl: boolean;

  // Location
  depth: number;
  anchoredToSeafloor: boolean;

  // Power
  powerSource: 'geothermal' | 'tidal' | 'nuclear' | 'solar_surface';
  powerGeneration: number;  // Watts

  // Resource extraction
  mineralExtractors: number;  // Mine vent deposits
  desalinationPlants: number;
  aquaculture: AquacultureModule[];
}

interface BaseModule {
  type: 'habitat' | 'lab' | 'storage' | 'airlock' | 'observatory' | 'docking';
  pressureRating: number;  // Max depth
  capacity: number;        // Agents or storage
  connected: string[];     // Module IDs
}

// Example: Deep ocean research station
const ABYSSAL_RESEARCH_STATION: UnderwaterBaseBlueprint = {
  id: 'abyssal_station_alpha',
  name: 'Abyssal Research Station',

  // Construction
  materials: {
    reinforced_steel: 5000,
    transparent_aluminum: 500,
    advanced_electronics: 200,
    life_support_systems: 50,
  },
  buildTime: 288000,  // 4 game days
  requiredTech: ['underwater_construction', 'pressure_engineering', 'life_support_tech'],

  // Modules
  modules: [
    { type: 'habitat', pressureRating: 600, capacity: 10 },  // 10 agents
    { type: 'lab', pressureRating: 600, capacity: 5 },
    { type: 'observatory', pressureRating: 600, capacity: 3 },
    { type: 'airlock', pressureRating: 600, capacity: 2 },
    { type: 'docking', pressureRating: 600, capacity: 2 },  // 2 subs
  ],

  // Life support
  oxygenGenerators: 3,
  pressurization: 1.0,  // 1 atm internal (like spacecraft)
  temperatureControl: true,

  // Location requirements
  maxDepth: 6000,
  requiresSeafloor: true,

  // Power
  powerSource: 'nuclear',  // Small reactor
  powerGeneration: 10000,  // 10 kW

  description: 'Permanent abyssal research outpost. Study vent ecosystems. Mine minerals. Alien contact point.',
};
```

### 4.4 Submarine Operations

```typescript
class SubmarineControlSystem implements System {
  // Dive/surface mechanics
  changeDive(sub: SubmarineVehicle, targetDepth: number, world: World): void {
    const currentTile = world.getTileAt(sub.position.x, sub.position.y, sub.position.z);

    // Safety checks
    if (targetDepth > sub.maxDepth) {
      console.warn(`[Sub ${sub.id}] Target depth ${targetDepth}m exceeds max depth ${sub.maxDepth}m!`);
      // Continue but trigger warnings
    }

    if (targetDepth > sub.crushDepth) {
      console.error(`[Sub ${sub.id}] CRITICAL: Approaching crush depth ${sub.crushDepth}m!`);
      this.crushSubmarine(sub, world);
      return;
    }

    // Ballast adjustment (slow depth change)
    const depthChange = Math.sign(targetDepth - sub.currentDepth) * 0.5;  // 0.5m per tick
    sub.currentDepth += depthChange;
    sub.position.z = -sub.currentDepth;  // Z position is negative depth

    // Pressure effects on crew
    this.applyPressureEffects(sub);
  }

  // Oxygen management
  updateLifeSupport(sub: SubmarineVehicle): void {
    // Oxygen consumption: 1 crew = 0.5 ticks per tick
    const oxygenConsumption = sub.crew.length * 0.5;
    sub.airSupply -= oxygenConsumption;

    // CO₂ buildup if scrubbers failing
    if (sub.co2Scrubbers < 0.5) {
      // Crew takes health damage from CO₂ poisoning
      for (const crewId of sub.crew) {
        const agent = world.getEntity(crewId);
        agent.updateComponent('needs', (needs) => ({
          ...needs,
          health: needs.health - 0.001,  // Slow poisoning
        }));
      }
    }

    // Emergency surfacing if oxygen critical
    if (sub.airSupply < 6000) {  // 5 minutes remaining
      console.warn(`[Sub ${sub.id}] EMERGENCY: Low oxygen! Surfacing!`);
      this.emergencySurface(sub);
    }
  }

  // Hull integrity under pressure
  checkHullIntegrity(sub: SubmarineVehicle): void {
    const pressureRatio = sub.currentDepth / sub.maxDepth;

    // Creaking sounds at 80% max depth
    if (pressureRatio > 0.8) {
      this.playSound('hull_creaking', volume: (pressureRatio - 0.8) * 5);
    }

    // Critical pressure at 90%
    if (pressureRatio > 0.9) {
      console.warn(`[Sub ${sub.id}] CRITICAL: Hull stress at ${pressureRatio * 100}%!`);

      // Random viewport cracks
      if (Math.random() < 0.01) {
        this.crackViewport(sub);
      }
    }

    // Crush depth = instant destruction
    if (sub.currentDepth >= sub.crushDepth) {
      console.error(`[Sub ${sub.id}] CRUSHED: Exceeded crush depth!`);
      this.crushSubmarine(sub);
    }
  }

  // Sonar scanning
  scanWithSonar(sub: SubmarineVehicle, world: World): SonarReading[] {
    if (!sub.sonar) return [];

    const sonarRadius = 100;  // tiles
    const entities = world.getNearbyEntities(sub.position, sonarRadius);

    const readings: SonarReading[] = [];
    for (const entity of entities) {
      const distance = getDistance(sub.position, entity.position);
      const bearing = getBearing(sub.position, entity.position);

      // Sonar detects size and movement
      const reflection: SonarReading = {
        distance,
        bearing,
        size: entity.size || 'small',
        moving: entity.velocity ? length(entity.velocity) > 0.01 : false,
        classification: this.classifysonarContact(entity),
      };

      readings.push(reflection);
    }

    return readings;
  }
}

interface SonarReading {
  distance: number;
  bearing: number;  // Degrees
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  moving: boolean;
  classification: 'fish_school' | 'large_creature' | 'submarine' | 'structure' | 'unknown';
}
```

---

## 5. Gameplay Integration

### 5.1 Ocean Civilization Progression

```typescript
// Tech tree for underwater civilization
const OCEAN_TECH_TREE = {
  // Early ocean
  diving_bell: {
    unlocks: ['shallow_diving', 'pearl_harvesting'],
    requirements: { construction: 2 },
  },

  // Mid ocean
  submarine_prototype: {
    unlocks: ['research_sub_basic', 'underwater_mining'],
    requirements: { engineering: 5, metallurgy: 4 },
  },

  // Deep ocean
  pressure_engineering: {
    unlocks: ['deep_sea_sub', 'abyssal_station'],
    requirements: { physics: 7, materials_science: 6 },
  },

  // Hadal zone
  extreme_pressure_metallurgy: {
    unlocks: ['hadal_explorer', 'trench_mining'],
    requirements: { metallurgy: 9, chemistry: 8 },
  },

  // Alien contact
  bioluminescent_communication: {
    unlocks: ['commune_with_deep_sea_aliens', 'living_ships'],
    requirements: { biology: 8, linguistics: 7 },
  },
};
```

### 5.2 Ocean Events

```typescript
// Emergent ocean events
const OCEAN_EVENTS = [
  {
    id: 'whale_fall',
    name: 'Whale Fall',
    description: 'Dead whale sinks to abyssal zone. Provides food for decades.',
    trigger: (world) => Math.random() < 0.001,  // Rare
    effect: (world, position) => {
      // Spawn whale carcass entity
      const whaleFall = world.spawnEntity('whale_carcass', position);
      whaleFall.biomass = 40000;  // 40 tons
      whaleFall.decayRate = 0.001;  // Very slow

      // Attract scavengers
      world.eventBus.emit({
        type: 'ecosystem:whale_fall',
        position,
        biomass: 40000,
      });
    },
  },

  {
    id: 'bioluminescent_bloom',
    name: 'Bioluminescent Bloom',
    description: 'Dinoflagellates create glowing waves at surface.',
    trigger: (world) => world.season === 'summer' && Math.random() < 0.01,
    effect: (world, position) => {
      // Spawn billions of glowing plankton
      for (let x = -50; x < 50; x++) {
        for (let y = -50; y < 50; y++) {
          const tile = world.getTileAt(position.x + x, position.y + y, 0);
          if (tile.oceanZone === 'epipelagic') {
            tile.bioluminescence = 0.8;  // Bright glow
            tile.biolumColor = '#00FFFF';
          }
        }
      }

      console.log('[Ocean] Bioluminescent bloom! Waves glow blue at night.');
    },
  },

  {
    id: 'hydrothermal_vent_discovery',
    name: 'Hydrothermal Vent Discovery',
    description: 'Submarine crew discovers new black smoker vent.',
    trigger: (world, sub) => sub.depth > 2000 && Math.random() < 0.0001,
    effect: (world, sub) => {
      const vent = world.hydroVentSystem.generateVent(world, sub.position);

      console.log(`[Discovery] Submarine ${sub.name} discovered hydrothermal vent at ${sub.position}!`);

      // Scientific achievement
      world.grantAchievement(sub.crew[0], 'deep_sea_pioneer');

      // Potential mining site
      world.eventBus.emit({
        type: 'discovery:hydrothermal_vent',
        position: vent.position,
        mineralValue: calculateMineralValue(vent.mineralContent),
      });
    },
  },

  {
    id: 'encounter_alien_aquatic_civilization',
    name: 'First Contact: Aquatic Aliens',
    description: 'Submarine encounters intelligent bioluminescent cephalopods.',
    trigger: (world, sub) => sub.depth > 5000 && world.universe.hasAlienLife && Math.random() < 0.00001,
    effect: (world, sub) => {
      // Spawn alien city on seafloor
      const alienCity = world.spawnAlienSettlement('cephalopod_city', sub.position);

      // Bioluminescent communication attempt
      console.log('[First Contact] Alien cephalopods attempt communication via light patterns!');

      // Create translation minigame
      world.initiateFirstContactProtocol(sub.crew[0], alienCity);
    },
  },
];
```

---

## 6. Technical Implementation

### 6.1 File Structure

```
packages/world/src/ocean/
├── OceanBiomes.ts              (existing - depth zones)
├── AquaticSpecies.ts           (new - species definitions)
├── BioluminescenceSystem.ts    (new - light emission)
└── HydrothermalVentSystem.ts   (new - vent ecosystems)

packages/core/src/systems/
├── FluidDynamicsSystem.ts      (existing - local flow)
├── PlanetaryCurrentsSystem.ts  (existing - large currents)
├── AgentSwimmingSystem.ts      (existing - depth mechanics)
├── AquaticBehaviorSystem.ts    (new - fish AI)
└── BiolumRenderingSystem.ts    (new - dynamic lights)

packages/core/src/components/
├── BioluminescentComponent.ts  (new)
└── AquaticComponent.ts         (new)

packages/core/src/buildings/
├── SubmarineBlueprints.ts      (new)
└── UnderwaterBaseBlueprints.ts (new)

packages/renderer/src/
├── ocean/BiolumShader.ts       (new - glow effects)
└── ocean/WaterCaustics.ts      (new - light patterns)
```

### 6.2 Performance Considerations

**Bioluminescence Rendering**
- Only render biolum entities within camera view + buffer
- Use instanced rendering for schools of bioluminescent fish
- Level-of-detail: distant biolum = simple point lights, close = full shader

**Aquatic Species Simulation**
- Use SimulationScheduler PROXIMITY mode for fish (only simulate on-screen)
- Schools share single AI (flock behavior, not individual)
- Deep ocean species (abyssal+) update less frequently (1/10 rate)

**Hydrothermal Vents**
- Update vents once per game day (not every tick)
- Particle effects for smoke plumes limited to 100 particles max
- Vent ecosystems use aggregate biomass, not individual bacteria entities

---

## 7. Future Enhancements

### 7.1 Phase 2 Features

- **Aquatic Agents**: Agent species that breathe water, build underwater cities
- **Submarine Combat**: Torpedoes, sonar warfare, depth charges
- **Ocean Farming**: Kelp cultivation, fish farms, pearl harvesting
- **Bioluminescent Art**: Agents breed firefly squid for living light shows
- **Pressure Weapons**: Weaponized pressure gradients, implosion bombs

### 7.2 Phase 3 Features

- **Living Ships**: Genetically engineered whale-submarines
- **Abyssal Dragons**: Massive hadal zone predators (50m+)
- **Brine Lakes**: Underwater lakes of dense brine with unique chemistry
- **Ice-covered Oceans**: Europa-style subsurface oceans on icy moons
- **4D Ocean Currents**: Water flow in 4+ spatial dimensions

---

## 8. Testing Plan

### 8.1 Unit Tests

```typescript
describe('AquaticSpecies', () => {
  it('should only spawn in correct ocean zones', () => {
    const lanternfish = createAquaticSpecies('lanternfish');
    expect(lanternfish.oceanZones).toContain('mesopelagic');
    expect(lanternfish.depthRange).toEqual([-200, -1000]);
  });

  it('should take pressure damage outside max depth', () => {
    const fish = createAquaticEntity('sea_otter', { depth: -100 });
    fish.depth = -2000;  // Way too deep

    applyPressureDamage(fish);
    expect(fish.health).toBeLessThan(1.0);  // Damaged
  });

  it('should migrate vertically based on time of day', () => {
    const lanternfish = createAquaticEntity('lanternfish', { depth: -600 });

    // Daytime: stay deep
    world.setTime({ hour: 12 });
    updateVerticalMigration(lanternfish, world);
    expect(lanternfish.depth).toBeCloseTo(-600, 0);

    // Nighttime: rise to surface
    world.setTime({ hour: 0 });
    updateVerticalMigration(lanternfish, world);
    expect(lanternfish.depth).toBeCloseTo(-100, 0);
  });
});

describe('BioluminescenceSystem', () => {
  it('should emit light when enabled', () => {
    const anglerfish = createBiolumEntity('anglerfish');
    anglerfish.bioluminescent.enabled = true;

    const lightLevel = calculateLightContribution(anglerfish, tile);
    expect(lightLevel).toBeGreaterThan(0);
  });

  it('should synchronize flashing in schools', () => {
    const school = createSchool('firefly_squid', count: 100);

    // All should flash in sync
    const phases = school.map(s => s.bioluminescent.phaseOffset);
    const avgPhase = average(phases);

    for (const squid of school) {
      expect(squid.bioluminescent.phaseOffset).toBeCloseTo(avgPhase, 0.1);
    }
  });
});
```

### 8.2 Integration Tests

```typescript
describe('Hydrothermal Vent Ecosystem', () => {
  it('should spawn tube worms after bacteria established', async () => {
    const vent = createHydrothermalVent({ type: 'black_smoker' });

    // Wait for bacteria to grow
    for (let i = 0; i < 1000; i++) {
      world.tick();
    }

    expect(vent.biomass).toBeGreaterThan(100);
    expect(vent.species).toContain('giant_tube_worm');
  });

  it('should die when vent shuts down', async () => {
    const vent = createHydrothermalVent({ active: true, biomass: 5000 });

    // Force shutdown
    vent.active = false;

    // Ecosystem collapses over time
    for (let i = 0; i < 10000; i++) {
      world.tick();
    }

    expect(vent.biomass).toBeLessThan(100);  // Mostly dead
  });
});

describe('Submarine Operations', () => {
  it('should crush submarine at crush depth', () => {
    const sub = createSubmarine('research_sub_basic');
    sub.currentDepth = sub.crushDepth + 1;

    checkHullIntegrity(sub);
    expect(sub.destroyed).toBe(true);
  });

  it('should surface on low oxygen', () => {
    const sub = createSubmarine({ airSupply: 1000, currentDepth: -500 });

    updateLifeSupport(sub);

    expect(sub.surfacing).toBe(true);  // Emergency surface initiated
  });
});
```

---

## 9. Success Metrics

**Feature Complete When:**
- ✅ 50+ aquatic species spanning all 5 ocean zones
- ✅ Bioluminescence visible in renderer with dynamic light
- ✅ Hydrothermal vents spawn and support chemosynthetic ecosystems
- ✅ 3+ submarine types buildable (research, cargo, deep-sea)
- ✅ Underwater base construction functional
- ✅ Pressure/oxygen/temperature mechanics working
- ✅ Vertical migration observable (day/night fish movement)
- ✅ At least 1 "wow moment" (whale fall, alien contact, hadal exploration)

**Performance Targets:**
- 1000 bioluminescent entities at 60 FPS
- 10 active hydrothermal vents with ecosystems
- 5 submarines operational simultaneously

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-12 | 1.0.0 | Initial spec - aquatic species, bioluminescence, vents, submarines |

---

**Next Steps:**
1. Review spec with team
2. Prioritize Phase 1 features
3. Create aquatic species data files
4. Implement bioluminescence component & rendering
5. Build hydrothermal vent spawning
6. Design submarine blueprints

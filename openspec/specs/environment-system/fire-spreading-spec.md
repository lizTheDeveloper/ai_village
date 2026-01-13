# Fire Spreading System - Specification

**Created:** 2026-01-12
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The fire spreading system brings combustion mechanics to life, enabling fire to propagate across flammable materials, damage structures, injure entities, and create emergent gameplay around fire prevention and firefighting. This system makes Trogdor's burnination of thatched-roof cottages an actual mechanic, not just flavor text.

---

## Core Principles

### Fire is Dangerous and Consequential

Fire should be a serious threat that requires player attention and agent response. Fires spread, destroy property, injure entities, and can devastate settlements if unchecked.

```typescript
// Fire is NOT:
const notFire = [
  "cosmetic particle effects",    // Fire has real mechanical consequences
  "instant damage only",           // Fire persists and spreads over time
  "easily controlled",             // Fire requires active management
  "reversible",                    // Burnt structures stay burnt
];

// Fire IS:
const fire = [
  "persistent and spreading",      // Tile-to-tile propagation
  "material-specific",             // Thatch burns faster than stone
  "environment-aware",             // Wind affects spread direction
  "structurally damaging",         // Buildings can collapse
  "requires firefighting",         // Agents must actively extinguish
  "creates emergent gameplay",     // Firebreaks, bucket brigades, evacuations
];
```

### Integration with Existing Systems

Fire integrates with:
- **Magic System**: Fire spells trigger ignition
- **Damage System**: Burning applies DoT
- **Material System**: Flammable flags determine spread
- **Building System**: Fire damages structure durability
- **Weather System**: Rain extinguishes, wind spreads
- **Agent AI**: Firefighting behaviors, panic responses
- **Injury System**: Burn wounds, smoke inhalation

---

## Fire States

### Tile Burning State

```typescript
interface BurningTile {
  /** World tile coordinates */
  x: number;
  y: number;

  /** Fire intensity (0-100) */
  intensity: number;

  /** Ticks remaining before fire exhausts fuel */
  fuelRemaining: number;

  /** Material being burned */
  material: MaterialType;

  /** Fire started at this tick */
  ignitionTick: number;

  /** Temperature in Celsius */
  temperature: number;

  /** Spread cooldown (prevents instant re-spread) */
  lastSpreadTick: number;

  /** Source of ignition */
  ignitionSource: IgnitionSource;
}

type IgnitionSource =
  | { type: 'spell'; casterId: string; spellId: string }
  | { type: 'spread'; fromTile: Position }
  | { type: 'environmental'; source: string } // campfire, lava, etc.
  | { type: 'explosion'; explosionId: string }
  | { type: 'lightning' }
  | { type: 'friction' }; // Future: tool use, etc.
```

### Entity Burning State

```typescript
interface BurningComponent extends Component {
  type: 'burning';
  version: 1;

  /** Fire intensity on this entity (0-100) */
  intensity: number;

  /** DoT damage per tick */
  damagePerTick: number;

  /** Ticks remaining */
  duration: number;

  /** Can spread to adjacent entities/tiles */
  canSpread: boolean;

  /** Extinguish progress (0-100, at 100 fire is out) */
  extinguishProgress: number;

  /** Ignition source for tracking */
  ignitionSource: IgnitionSource;
}
```

---

## Requirements

### REQ-FIRE-001: Material Flammability

Materials SHALL have combustion properties that determine fire behavior:

```typescript
interface MaterialCombustionProperties {
  /** Can this material catch fire? */
  flammable: boolean;

  /** Temperature required to ignite (Celsius) */
  flashPoint: number;

  /** How quickly fire spreads through this material (0-1) */
  spreadRate: number;

  /** Burn duration in ticks at intensity 50 */
  burnDuration: number;

  /** Damage to material durability per tick */
  durabilityDamagePerTick: number;

  /** Smoke production (0-1) */
  smokeProduction: number;

  /** Heat output (affects adjacent tiles) */
  heatOutput: number;
}

// Example properties
const MATERIAL_COMBUSTION: Record<string, MaterialCombustionProperties> = {
  thatch: {
    flammable: true,
    flashPoint: 200,           // Very easy to ignite
    spreadRate: 0.9,           // Spreads rapidly
    burnDuration: 100,         // 5 seconds at 20 TPS
    durabilityDamagePerTick: 5,
    smokeProduction: 0.8,
    heatOutput: 50,
  },
  wood: {
    flammable: true,
    flashPoint: 300,
    spreadRate: 0.6,
    burnDuration: 300,         // 15 seconds
    durabilityDamagePerTick: 2,
    smokeProduction: 0.6,
    heatOutput: 60,
  },
  stone: {
    flammable: false,
    flashPoint: Infinity,      // Cannot ignite
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0,
    smokeProduction: 0,
    heatOutput: 0,
  },
  cloth: {
    flammable: true,
    flashPoint: 250,
    spreadRate: 0.95,          // Extremely fast spread
    burnDuration: 50,          // Burns quickly
    durabilityDamagePerTick: 10,
    smokeProduction: 0.5,
    heatOutput: 30,
  },
};
```

```
WHEN fire contacts a material
THEN the system SHALL:
  1. Check if material is flammable
  2. If fire intensity * heatOutput >= flashPoint:
     - Ignite the material
     - Set initial intensity based on ignition source
  3. If not flammable:
     - Fire does not spread to this tile
     - Material may conduct heat (stone walls get hot)
```

### REQ-FIRE-002: Fire Spreading

Fire SHALL spread from burning tiles to adjacent flammable tiles:

```typescript
interface FireSpreadCheck {
  sourceTile: Position;
  targetTile: Position;
  sourceIntensity: number;
  sourceMaterial: MaterialType;
  targetMaterial: MaterialType;

  // Environmental factors
  windDirection: Direction;
  windSpeed: number;          // 0-1
  precipitation: number;      // 0-1 (rain)

  // Structural factors
  hasFirebreak: boolean;      // Intentional gap
  isIndoors: boolean;         // Has roof
}

interface FireSpreadResult {
  spreads: boolean;
  newIntensity: number;
  spreadDelay: number;        // Ticks before ignition
}
```

```
WHEN a tile is burning
THEN every 20 ticks (1 second):
  1. Check all 8 adjacent tiles
  2. For each flammable adjacent tile:
     a. Calculate spread probability:
        base = sourceMaterial.spreadRate
        windBonus = (windDirection == towards) ? windSpeed * 0.3 : 0
        rainPenalty = precipitation * 0.5
        intensityBonus = sourceIntensity / 200
        final = base + windBonus - rainPenalty + intensityBonus

     b. Roll random(0, 1)
     c. If roll < final:
        - Ignite target tile
        - Set intensity = sourceIntensity * targetMaterial.spreadRate
        - Record ignition source as spread

  3. Reduce source tile intensity by 1
  4. If intensity reaches 0:
     - Fire exhausts fuel
     - Remove from burning tiles
     - Leave charred terrain
```

### REQ-FIRE-003: Structural Fire Damage

Fire SHALL damage building structures based on material durability:

```typescript
interface StructuralFireDamage {
  tile: Position;
  material: MaterialType;
  fireIntensity: number;
  currentDurability: number;
}
```

```
WHEN a building tile is on fire
THEN every tick:
  1. Calculate damage:
     damage = material.durabilityDamagePerTick * (fireIntensity / 50)

  2. Reduce tile durability:
     tile.durability -= damage

  3. If durability <= 0:
     - Wall/floor/roof collapses
     - Remove tile structure
     - Leave debris
     - Fire continues on debris (if flammable)

  4. Check for roof collapse:
     - If wall durability < 30%:
       - Calculate roof stability
       - Roof may collapse even if not directly burning
```

### REQ-FIRE-004: Burning DoT (Damage over Time)

Entities SHALL take continuous damage while burning:

```typescript
interface BurningDoTConfig {
  /** Base damage per tick */
  baseDamage: number;

  /** Intensity multiplier */
  intensityScaling: number;

  /** Armor penetration (fire ignores most armor) */
  penetration: number;

  /** Chance to spread to nearby entities */
  spreadChance: number;
}
```

```
WHEN an entity has BurningComponent
THEN every tick:
  1. Calculate damage:
     damage = baseDamage * (intensity / 50) * intensityScaling

  2. Apply fire damage:
     - Use DamageEffectApplier
     - Type: 'fire'
     - Penetration: 70 (fire ignores cloth/leather)
     - Target: health

  3. Create burn injuries:
     - Random body location
     - Severity based on intensity
     - Adds to InjuryComponent

  4. Reduce intensity:
     intensity -= 2 per tick

  5. If intensity <= 0:
     - Remove BurningComponent
     - Leave burn scars (InjuryComponent)

  6. Check for spread:
     - If adjacent entities are flammable:
       - Chance to ignite them
```

### REQ-FIRE-005: Fire Ignition Sources

Fire SHALL be triggered by multiple sources:

```typescript
type IgnitionTrigger =
  | { type: 'spell'; spellEffect: DamageEffect }
  | { type: 'breath_weapon'; breathType: 'fire' | 'acid' | 'lightning' }
  | { type: 'campfire'; campfireId: string }
  | { type: 'torch'; torchId: string }
  | { type: 'explosion'; explosionPower: number }
  | { type: 'lightning_strike'; position: Position }
  | { type: 'lava'; lavaSource: Position }
  | { type: 'environmental'; temperature: number };
```

```
WHEN fire spell hits target
THEN:
  1. Get target material combustion properties
  2. If material.flammable:
     - Create BurningTile or BurningComponent
     - Set intensity based on spell power
     - Set duration based on material.burnDuration

WHEN Trogdor uses fire breath
THEN:
  1. Get all tiles in cone area
  2. For each tile with flammable material:
     - Ignite with intensity = 75 (breath base damage)
     - Mark ignition source as 'trogdor_breath'
     - Tag for spread
  3. For each entity in area:
     - Add BurningComponent
     - Apply immediate fire damage
     - Start DoT effect

WHEN campfire is active
THEN:
  1. Create burning tile at campfire location
  2. Intensity = 30 (controlled fire)
  3. Can spread if unattended
  4. Provides warmth (TemperatureSystem integration)
```

### REQ-FIRE-006: Fire Extinguishing

Fire SHALL be extinguished through various methods:

```typescript
interface ExtinguishAttempt {
  method: ExtinguishMethod;
  target: Position | string; // Tile or entity ID
  agentId?: string;

  // Method-specific data
  waterAmount?: number;
  sandAmount?: number;
  beatingSeverity?: number;
}

type ExtinguishMethod =
  | 'water_bucket'      // Agent throws water
  | 'water_source'      // Rain, river, etc.
  | 'sand_smother'      // Smother with dirt/sand
  | 'beating'           // Slap with cloth/blanket
  | 'magic_ice'         // Ice spell
  | 'time';             // Natural burnout

interface ExtinguishResult {
  success: boolean;
  intensityReduction: number;
  fullyExtinguished: boolean;
  agentInjured?: boolean; // Risk when fighting fire
}
```

```
WHEN agent attempts water bucket extinguish
THEN:
  1. Check if agent has water bucket
  2. Calculate effectiveness:
     effectiveness = 50 * (1 - fireIntensity/100)

  3. Reduce fire intensity:
     intensity -= effectiveness

  4. If intensity <= 0:
     - Remove BurningComponent/BurningTile
     - Create wet tile (prevents reignition for 100 ticks)

  5. Risk check:
     if fireIntensity > 60:
       - 20% chance agent takes burn damage
       - Create minor burn injury

WHEN rain is active
THEN:
  1. For each burning tile:
     - Reduce intensity by rainIntensity * 10 per tick
     - If light rain: slow reduction
     - If heavy rain: rapid extinguishing

  2. For burning entities:
     - Same reduction logic
     - Creates steam effect (future: visual)

WHEN ice spell hits burning target
THEN:
  1. Instant extinguish if spell power > fireIntensity
  2. Otherwise: reduce by spell power
  3. Creates steam explosion if high intensity fire
```

### REQ-FIRE-007: Agent Firefighting Behavior

Agents SHALL respond to fires with appropriate behaviors:

```typescript
interface FirefightingBehavior {
  priority: number;          // Higher for nearby fires

  response: FireResponse;

  coordination?: {
    formBucketBrigade: boolean;
    callForHelp: boolean;
    evacuateArea: boolean;
  };
}

type FireResponse =
  | 'flee'              // If fire too large/close
  | 'fight_solo'        // Get water, extinguish
  | 'bucket_brigade'    // Coordinate with others
  | 'create_firebreak'  // Remove flammable materials
  | 'rescue'            // Save trapped entities
  | 'ignore';           // If controlled (campfire)
```

```
WHEN agent detects fire
THEN:
  1. Assess danger:
     distance = distanceToFire(agent, fire)
     intensity = fire.intensity
     spread = fire.spreadRate

  2. Choose response:
     if distance < 5 && intensity > 70:
       response = 'flee'
     else if agentHasWater && intensity < 60:
       response = 'fight_solo'
     else if nearbyAgents >= 3:
       response = 'bucket_brigade'
     else if fire.threateningBuilding:
       response = 'create_firebreak'

  3. Execute behavior:
     - Queue behavior in AgentBrainSystem
     - Coordinate with other agents if needed
     - Continue until fire extinguished or unsafe

  4. Create memory:
     - "I fought a fire at [location]"
     - Emotional valence based on outcome
     - Trauma if building lost or injury sustained
```

### REQ-FIRE-008: Environmental Interactions

Fire SHALL interact with weather and environment:

```typescript
interface FireEnvironmentFactors {
  /** Wind affects spread direction */
  wind: {
    direction: Direction;
    speed: number;        // 0-1
    spreadBonus: number;  // Bonus in wind direction
  };

  /** Precipitation extinguishes fire */
  precipitation: {
    type: 'none' | 'drizzle' | 'rain' | 'storm';
    intensity: number;    // 0-1
    extinguishRate: number;
  };

  /** Humidity affects ignition */
  humidity: {
    level: number;        // 0-1
    ignitionPenalty: number;
    spreadPenalty: number;
  };

  /** Temperature affects fire behavior */
  temperature: {
    current: number;      // Celsius
    flashPointModifier: number;
  };
}
```

```
WHEN calculating fire spread
THEN:
  1. Get current weather from WeatherSystem

  2. Apply wind effects:
     - Spread bonus in wind direction: +30%
     - Spread penalty against wind: -20%
     - No effect perpendicular to wind

  3. Apply precipitation:
     drizzle: -10% spread, -2 intensity/tick
     rain: -30% spread, -5 intensity/tick
     storm: -60% spread, -15 intensity/tick

  4. Apply humidity:
     if humidity > 0.7:
       flashPoint += 50 (harder to ignite)
       spreadRate *= 0.8
     if humidity < 0.3:
       flashPoint -= 30 (easier to ignite)
       spreadRate *= 1.2

  5. Apply temperature:
     if temperature > 30°C:
       flashPoint -= 20 (hot day = easier ignition)
```

### REQ-FIRE-009: Smoke and Visibility

Burning materials SHALL produce smoke that affects visibility and breathing:

```typescript
interface SmokeTile {
  position: Position;
  density: number;        // 0-1
  sourceIntensity: number;
  ticksRemaining: number;
}

interface SmokeEffect {
  /** Visibility reduction */
  visionPenalty: number;  // 0-1 (1 = completely obscured)

  /** Breathing difficulty */
  oxygenReduction: number;

  /** Can cause choking */
  chokingDamage: number;
}
```

```
WHEN tile is burning with intensity > 20
THEN:
  1. Create smoke on tile and adjacent tiles
  2. Smoke density = fireIntensity * material.smokeProduction
  3. Smoke rises (if outdoors)
  4. Smoke accumulates (if indoors)

WHEN entity is in smoke tile
THEN:
  1. Reduce vision range:
     visionRange *= (1 - smokeDensity)

  2. Apply breathing difficulty:
     if smokeDensity > 0.5:
       - Slow movement by 20%
       - 5% chance per tick of coughing
       - Creates "choking" status effect

  3. If prolonged exposure (>200 ticks):
     - Create lung injury (minor)
     - Needs recovery time
```

### REQ-FIRE-010: Charred Remains

Burnt tiles SHALL leave evidence of fire:

```typescript
interface CharredTile {
  position: Position;
  originalMaterial: MaterialType;
  burnedAt: number;       // Game tick
  canRebuild: boolean;
  fertility: number;      // Ash can fertilize soil
}
```

```
WHEN fire exhausts fuel on tile
THEN:
  1. Convert to charred state:
     - Floor: black/gray color
     - Walls: collapsed rubble
     - Roofs: gone

  2. Mark for visual rendering:
     - Show ash/char marks
     - Smoke wisps for 500 ticks

  3. Affect soil:
     if terrain == 'grass':
       fertility += 20  // Ash enriches soil
     if terrain == 'dirt':
       fertility += 10

  4. Allow rebuilding:
     - Agents can clear debris
     - Rebuild on same location
     - Costs materials but no site prep
```

---

## System Architecture

### FireSpreadSystem

```typescript
export class FireSpreadSystem implements System {
  id = 'fire_spread';
  priority = 850;  // After damage, before rendering
  requiredComponents: ReadonlyArray<ComponentType> = [];

  /** Active burning tiles */
  private burningTiles: Map<string, BurningTile> = new Map();

  /** Active burning entities */
  private burningEntities: Set<string> = new Set();

  /** Last spread check tick */
  private lastSpreadCheck = 0;

  /** Spread check interval (every 20 ticks = 1 second) */
  private readonly SPREAD_INTERVAL = 20;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    const currentTick = world.tick;

    // Tick all burning tiles (intensity reduction, damage)
    this.tickBurningTiles(world, currentTick);

    // Tick all burning entities (DoT damage)
    this.tickBurningEntities(world, entities, currentTick);

    // Check for spread (every 1 second)
    if (currentTick - this.lastSpreadCheck >= this.SPREAD_INTERVAL) {
      this.checkFireSpread(world, currentTick);
      this.lastSpreadCheck = currentTick;
    }

    // Check for extinguishment (rain, etc.)
    this.checkExtinguishment(world, currentTick);
  }

  /**
   * Ignite a tile from an external source (spell, spread, etc.)
   */
  igniteTile(
    world: World,
    position: Position,
    intensity: number,
    source: IgnitionSource
  ): boolean {
    const tile = world.getTileAt?.(position.x, position.y);
    if (!tile) return false;

    const material = this.getMaterialFromTile(tile);
    const combustion = MATERIAL_COMBUSTION[material];

    if (!combustion?.flammable) return false;

    const tileKey = `${position.x},${position.y}`;
    this.burningTiles.set(tileKey, {
      x: position.x,
      y: position.y,
      intensity,
      fuelRemaining: combustion.burnDuration,
      material,
      ignitionTick: world.tick,
      temperature: 200 + intensity * 5,
      lastSpreadTick: world.tick,
      ignitionSource: source,
    });

    return true;
  }

  /**
   * Ignite an entity (agent, animal, etc.)
   */
  igniteEntity(
    entity: Entity,
    intensity: number,
    source: IgnitionSource
  ): boolean {
    // Check if entity is flammable (has clothing, fur, etc.)
    const canBurn = this.isEntityFlammable(entity);
    if (!canBurn) return false;

    // Add BurningComponent
    entity.components.set('burning', {
      type: 'burning',
      version: 1,
      intensity,
      damagePerTick: 2 + intensity / 25,
      duration: 100, // 5 seconds base
      canSpread: true,
      extinguishProgress: 0,
      ignitionSource: source,
    });

    this.burningEntities.add(entity.id);
    return true;
  }

  private tickBurningTiles(world: World, currentTick: number): void {
    for (const [key, burning] of this.burningTiles.entries()) {
      // Reduce fuel
      burning.fuelRemaining--;

      // Reduce intensity slightly
      burning.intensity = Math.max(0, burning.intensity - 0.5);

      // Apply structural damage
      this.applyStructuralDamage(world, burning);

      // Remove if exhausted
      if (burning.fuelRemaining <= 0 || burning.intensity <= 0) {
        this.extinguishTile(world, burning);
        this.burningTiles.delete(key);
      }
    }
  }

  private checkFireSpread(world: World, currentTick: number): void {
    const weather = this.getWeather(world);

    for (const burning of this.burningTiles.values()) {
      // Get adjacent tiles
      const adjacent = this.getAdjacentTiles(burning.x, burning.y);

      for (const adjPos of adjacent) {
        const spreadChance = this.calculateSpreadChance(
          burning,
          adjPos,
          weather,
          world
        );

        if (Math.random() < spreadChance) {
          const newIntensity = burning.intensity * 0.7;
          this.igniteTile(world, adjPos, newIntensity, {
            type: 'spread',
            fromTile: { x: burning.x, y: burning.y },
          });
        }
      }
    }
  }

  // ... additional helper methods
}
```

---

## Integration Points

### 1. Magic System Integration

```typescript
// In DamageEffectApplier.ts
applyDamageToTarget(target: Entity, effect: DamageEffect, world: World): void {
  // ... existing damage logic

  // NEW: Check for fire damage type
  if (effect.damageType === 'fire' && effect.baseDamage > 20) {
    const fireSystem = world.getSystem('fire_spread') as FireSpreadSystem;
    const intensity = Math.min(100, effect.baseDamage);

    fireSystem?.igniteEntity(target, intensity, {
      type: 'spell',
      casterId: effect.casterId,
      spellId: effect.id,
    });
  }
}
```

### 2. Trogdor Fire Breath

```typescript
// In magic spell application
export const TROGDOR_FIRE_BREATH_SPELL = {
  // ... existing spell definition

  onHit: (world: World, targets: Entity[], casterPos: Position) => {
    const fireSystem = world.getSystem('fire_spread') as FireSpreadSystem;

    // Ignite all tiles in cone
    const cone = getConeArea(casterPos, caster.facing, 15);
    for (const pos of cone) {
      fireSystem?.igniteTile(world, pos, 75, {
        type: 'breath_weapon',
        breathType: 'fire',
      });
    }

    // Ignite all entities hit
    for (const target of targets) {
      fireSystem?.igniteEntity(target, 75, {
        type: 'breath_weapon',
        breathType: 'fire',
      });
    }
  },
};
```

### 3. Weather System Integration

```typescript
// In WeatherSystem.ts
update(world: World): void {
  // ... existing weather logic

  // NEW: Notify fire system of rain
  if (this.currentPrecipitation > 0.3) {
    const fireSystem = world.getSystem('fire_spread') as FireSpreadSystem;
    fireSystem?.applyRainExtinguishment(this.currentPrecipitation);
  }
}
```

### 4. Agent Behavior Integration

```typescript
// New behavior: FightFireBehavior
export class FightFireBehavior extends Behavior {
  execute(agent: Entity, world: World): BehaviorResult {
    const nearbyFires = this.findNearbyFires(agent, world, 20);

    if (nearbyFires.length === 0) {
      return { completed: true };
    }

    const closestFire = nearbyFires[0];

    // Get water bucket
    if (!this.hasWaterBucket(agent)) {
      return this.goGetWaterBucket(agent, world);
    }

    // Move to fire
    if (!this.isAdjacentTo(agent, closestFire)) {
      return this.moveTowards(agent, closestFire);
    }

    // Extinguish
    const fireSystem = world.getSystem('fire_spread') as FireSpreadSystem;
    fireSystem?.attemptExtinguish(closestFire, agent.id, 'water_bucket');

    return { completed: false };
  }
}
```

---

## Testing Requirements

### Unit Tests

```typescript
describe('FireSpreadSystem', () => {
  test('thatch ignites at appropriate temperature', () => {
    const system = new FireSpreadSystem();
    const world = createTestWorld();

    // Create thatch tile
    const pos = { x: 0, y: 0 };
    setTileMaterial(world, pos, 'thatch');

    // Ignite with fire spell (intensity 50)
    const success = system.igniteTile(world, pos, 50, {
      type: 'spell',
      casterId: 'test',
      spellId: 'ignite',
    });

    expect(success).toBe(true);
    expect(system.getBurningTiles().size).toBe(1);
  });

  test('fire spreads to adjacent thatch', () => {
    const system = new FireSpreadSystem();
    const world = createTestWorld();

    // Create 3x3 thatch building
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        setTileMaterial(world, { x, y }, 'thatch');
      }
    }

    // Ignite center
    system.igniteTile(world, { x: 1, y: 1 }, 60, testSource);

    // Run for 100 ticks (5 seconds)
    for (let i = 0; i < 100; i++) {
      system.update(world, [], 0.05);
    }

    // Should have spread to most/all tiles
    expect(system.getBurningTiles().size).toBeGreaterThan(5);
  });

  test('stone does not ignite', () => {
    const system = new FireSpreadSystem();
    const world = createTestWorld();

    setTileMaterial(world, { x: 0, y: 0 }, 'stone');

    const success = system.igniteTile(world, { x: 0, y: 0 }, 100, testSource);

    expect(success).toBe(false);
  });

  test('rain extinguishes fire', () => {
    const system = new FireSpreadSystem();
    const world = createTestWorld();

    // Ignite tile
    setTileMaterial(world, { x: 0, y: 0 }, 'wood');
    system.igniteTile(world, { x: 0, y: 0 }, 50, testSource);

    // Apply heavy rain for 50 ticks
    for (let i = 0; i < 50; i++) {
      system.applyRainExtinguishment(0.8);
      system.update(world, [], 0.05);
    }

    // Fire should be extinguished
    expect(system.getBurningTiles().size).toBe(0);
  });
});
```

### Integration Tests

```typescript
describe('Fire Integration', () => {
  test('Trogdor burnination spreads through cottage', async () => {
    const world = await createTestWorld();

    // Build thatch cottage
    const cottage = buildThatchCottage(world, { x: 10, y: 10 });

    // Spawn Trogdor
    const trogdor = spawnDragon(world, { x: 5, y: 10 });

    // Use fire breath
    useDragonBreath(world, trogdor, { x: 10, y: 10 });

    // Wait 10 seconds (200 ticks)
    for (let i = 0; i < 200; i++) {
      world.tick();
    }

    // Cottage should be mostly/fully burnt
    const cottageIntegrity = getCottageIntegrity(world, cottage);
    expect(cottageIntegrity).toBeLessThan(0.3);
  });

  test('agents fight fire with bucket brigade', async () => {
    const world = await createTestWorld();

    // Build wooden building
    const building = buildWoodenHouse(world, { x: 20, y: 20 });

    // Ignite it
    igniteTile(world, { x: 20, y: 20 }, 60);

    // Spawn 3 agents nearby with water buckets
    const agents = [
      spawnAgentWithBucket(world, { x: 15, y: 20 }),
      spawnAgentWithBucket(world, { x: 15, y: 21 }),
      spawnAgentWithBucket(world, { x: 15, y: 22 }),
    ];

    // Agents should detect fire and fight it
    for (let i = 0; i < 300; i++) {
      world.tick();
    }

    // Fire should be extinguished
    const fireSystem = world.getSystem('fire_spread') as FireSpreadSystem;
    expect(fireSystem.getBurningTiles().size).toBe(0);

    // Building should be mostly intact
    const integrity = getBuildingIntegrity(world, building);
    expect(integrity).toBeGreaterThan(0.7);
  });
});
```

---

## Performance Considerations

### Spatial Indexing

```typescript
// Use spatial grid to avoid checking all burning tiles
class FireSpatialGrid {
  private grid: Map<string, Set<BurningTile>> = new Map();
  private readonly CELL_SIZE = 16;

  getCellKey(x: number, y: number): string {
    const cx = Math.floor(x / this.CELL_SIZE);
    const cy = Math.floor(y / this.CELL_SIZE);
    return `${cx},${cy}`;
  }

  addFire(burning: BurningTile): void {
    const key = this.getCellKey(burning.x, burning.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(burning);
  }

  getFiresNear(x: number, y: number, radius: number): BurningTile[] {
    // Only check relevant cells
    const cells = this.getCellsInRadius(x, y, radius);
    const fires: BurningTile[] = [];

    for (const cellKey of cells) {
      const cellFires = this.grid.get(cellKey);
      if (cellFires) {
        fires.push(...cellFires);
      }
    }

    return fires;
  }
}
```

### Optimization Strategies

1. **Batched Updates**: Update fires every 20 ticks (1 second), not every tick
2. **Spatial Grid**: O(1) lookup for nearby fires instead of O(n) search
3. **Lazy Cleanup**: Remove extinguished fires in batches, not immediately
4. **Capped Fire Count**: Limit max simultaneous fires to 500
5. **Intensity Thresholding**: Skip spread checks for fires with intensity < 10

---

## Visual Representation

### Rendering Requirements

```typescript
interface FireVisuals {
  /** Base fire color */
  color: string;        // Orange-yellow-red gradient

  /** Intensity affects size/brightness */
  scale: number;        // 0.5 - 2.0 based on intensity

  /** Animated flickering */
  flicker: boolean;

  /** Smoke particles */
  smoke: {
    density: number;
    color: string;      // Gray-black
    riseSpeed: number;
  };

  /** Charred ground */
  charring: {
    color: string;      // Black-gray
    duration: number;   // How long to show
  };
}
```

```
WHEN rendering burning tile
THEN:
  1. Draw base tile (charring as fire persists)
  2. Draw fire overlay:
     - Color: gradient from yellow (center) to orange (edge)
     - Alpha: 0.7 + flicker * 0.3
     - Size: tileSize * (0.8 + intensity/200)

  3. Draw particle effects:
     - Fire particles rising
     - Smoke particles drifting
     - Embers floating

  4. Add heat distortion:
     - Wavy shader effect around fire
     - Intensity based on temperature
```

---

## Success Criteria

1. **Fire Ignites**: Fire spells and dragon breath successfully ignite flammable materials
2. **Fire Spreads**: Fire propagates tile-to-tile based on material properties
3. **Fire Damages**: Structures lose durability and eventually collapse
4. **Fire Burns**: Entities take DoT and sustain burn injuries
5. **Fire Extinguishes**: Rain, water buckets, and time put out fires
6. **Agents Respond**: Firefighting behaviors trigger appropriately
7. **Performance**: 100+ simultaneous fires run at >15 FPS
8. **Integration**: Works seamlessly with magic, weather, and AI systems

---

## Future Enhancements

### Phase 2 Features

- **Controlled Burns**: Agents intentionally burn fields for farming
- **Firefighting Equipment**: Hoses, fire engines, sprinkler systems
- **Fire Insurance**: Economic system for fire risk
- **Arson System**: Crimes, investigations, and justice
- **Fire Elementals**: Summoned creatures made of fire
- **Volcanic Eruptions**: Natural fire sources from geology
- **Wildfire Events**: Large-scale forest fires requiring evacuation

---

## Appendix A: Material Flash Points

Real-world flash point temperatures (for flavor and realism):

```typescript
const REAL_WORLD_FLASH_POINTS = {
  // Extremely flammable
  gasoline: -43,
  alcohol: 13,

  // Highly flammable
  paper: 230,
  cardboard: 260,
  dry_grass: 200,

  // Flammable
  wood_pine: 260,
  wood_oak: 300,
  cloth_cotton: 250,

  // Requires high heat
  leather: 210,
  rubber: 260,

  // Non-flammable
  stone: Infinity,
  metal: Infinity,
  glass: Infinity,
  water: Infinity,
};
```

---

## Appendix B: Historical Fire Events

For inspiration and testing scenarios:

- **Great Fire of London (1666)**: Wooden buildings, bakery ignition source, wind-driven spread
- **Chicago Fire (1871)**: Urban fire, bucket brigades, firebreaks
- **Triangle Shirtwaist Fire (1911)**: Factory fire, trapped workers, safety regulations
- **Peshtigo Fire (1871)**: Wildfire, tornado of flame, entire town consumed

Use these as test scenarios:
- Dense wooden settlement
- High wind conditions
- Limited water access
- Delayed response time

Expected outcome: Catastrophic spread, high casualties, total loss

---

**End of Specification**

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BurningComponent } from '../components/BurningComponent.js';
import { createBurningComponent } from '../components/BurningComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';
import type { Tile, RoofMaterial, WallMaterial, DoorMaterial } from '@ai-village/world';

/**
 * Material combustion properties defining how different materials burn.
 */
interface MaterialCombustionProperties {
  flammable: boolean;
  flashPoint: number; // Temperature threshold for ignition
  spreadRate: number; // Probability of spreading to adjacent tiles (0-1)
  burnDuration: number; // Ticks until fire burns out naturally
  durabilityDamagePerTick: number; // Structural damage per tick
  smokeProduction: number; // Smoke intensity (0-1)
  heatOutput: number; // Heat produced (affects spread range)
}

/**
 * Burning tile tracking data.
 */
interface BurningTileData {
  x: number;
  y: number;
  ignitedAt: number;
  intensity: number; // 0-100
  durationRemaining: number;
  source: 'spell' | 'spread' | 'breath' | 'other';
}

/**
 * Material combustion lookup table.
 * Based on REQ-FIRE-001 from fire-spreading-spec.md
 */
const MATERIAL_COMBUSTION: Record<string, MaterialCombustionProperties> = {
  thatch: {
    flammable: true,
    flashPoint: 200,
    spreadRate: 0.9,
    burnDuration: 100, // 5 seconds at 20 TPS
    durabilityDamagePerTick: 5,
    smokeProduction: 0.8,
    heatOutput: 50,
  },
  wood: {
    flammable: true,
    flashPoint: 300,
    spreadRate: 0.6,
    burnDuration: 300, // 15 seconds
    durabilityDamagePerTick: 2,
    smokeProduction: 0.6,
    heatOutput: 60,
  },
  cloth: {
    flammable: true,
    flashPoint: 250,
    spreadRate: 0.8,
    burnDuration: 80,
    durabilityDamagePerTick: 8,
    smokeProduction: 0.5,
    heatOutput: 40,
  },
  hide: {
    flammable: true,
    flashPoint: 350,
    spreadRate: 0.4,
    burnDuration: 150,
    durabilityDamagePerTick: 3,
    smokeProduction: 0.7,
    heatOutput: 45,
  },
  stone: {
    flammable: false,
    flashPoint: 1200, // Stone doesn't burn, but can crack under extreme heat
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.1, // Minimal heat damage
    smokeProduction: 0,
    heatOutput: 0,
  },
  mud_brick: {
    flammable: false,
    flashPoint: 800,
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.2,
    smokeProduction: 0,
    heatOutput: 0,
  },
  metal: {
    flammable: false,
    flashPoint: 1500,
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.5, // Heat warping
    smokeProduction: 0,
    heatOutput: 0,
  },
  ice: {
    flammable: false,
    flashPoint: 0, // Melts instead of burning
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 10, // Melts quickly
    smokeProduction: 0,
    heatOutput: 0,
  },
  glass: {
    flammable: false,
    flashPoint: 1400,
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.3,
    smokeProduction: 0,
    heatOutput: 0,
  },
  tile: {
    flammable: false,
    flashPoint: 1000,
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.1,
    smokeProduction: 0,
    heatOutput: 0,
  },
  slate: {
    flammable: false,
    flashPoint: 1100,
    spreadRate: 0,
    burnDuration: 0,
    durabilityDamagePerTick: 0.1,
    smokeProduction: 0,
    heatOutput: 0,
  },
};

/**
 * FireSpreadSystem - Simulates fire spreading and burning damage
 *
 * Implements REQ-FIRE-001 through REQ-FIRE-010 from fire-spreading-spec.md
 *
 * Features:
 * - Tile-to-tile fire spreading based on material flammability
 * - Entity burning DoT via StateMutatorSystem integration
 * - Structural damage to buildings (roofs, walls, doors, windows)
 * - Fire extinguishing via water/rain
 * - Wind-affected fire spread
 * - Performance-optimized with SimulationScheduler and throttling
 *
 * Dependencies:
 * @see StateMutatorSystem - Batched health damage from burning
 * @see WeatherSystem - Rain extinguishing, wind affecting spread
 */
export class FireSpreadSystem implements System {
  public readonly id: SystemId = 'fire_spread';
  public readonly priority: number = 70; // Run after weather (5), before rendering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Burning];

  public readonly dependsOn = ['state_mutator', 'weather'] as const;

  // Throttle fire updates to every 5 seconds (performance optimization)
  private readonly UPDATE_INTERVAL = 100; // Ticks (5 seconds at 20 TPS)
  private lastUpdate = 0;

  // Burning tile tracking
  private burningTiles = new Map<string, BurningTileData>();

  // StateMutatorSystem integration for entity DoT
  private stateMutator: StateMutatorSystem | null = null;
  private deltaCleanups = new Map<string, () => void>();

  // Weather entity cache
  private weatherEntityId: string | null = null;

  /**
   * Set the StateMutatorSystem reference (called during system registration)
   */
  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Throttle updates to every 5 seconds
    if (world.tick - this.lastUpdate < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdate = world.tick;

    // Update agent positions for SimulationScheduler
    world.simulationScheduler.updateAgentPositions(world);

    // Filter to active entities only (near agents)
    const activeEntities = world.simulationScheduler.filterActiveEntities(
      entities as Entity[],
      world.tick
    );

    // Get rain/wind from weather (affects extinguishing and spread)
    const weatherData = this.getWeatherData(world);

    // Process burning entities
    for (const entity of activeEntities) {
      if (!entity.components.has(CT.Burning)) continue;

      const impl = entity as EntityImpl;
      const burning = impl.getComponent<BurningComponent>(CT.Burning)!;
      const position = impl.getComponent<PositionComponent>(CT.Position);

      if (!position) continue;

      // Check for extinguishing conditions
      if (this.shouldExtinguish(burning, weatherData)) {
        this.extinguishEntity(world, entity);
        continue;
      }

      // Update burn duration
      const newDuration = burning.durationRemaining - this.UPDATE_INTERVAL;
      if (newDuration <= 0) {
        // Fire burned out naturally
        this.extinguishEntity(world, entity);
        continue;
      }

      // Update burning component
      impl.updateComponent<BurningComponent>(CT.Burning, (current) => ({
        ...current,
        durationRemaining: newDuration,
      }));

      // Register/update health damage delta
      this.updateBurningDelta(entity.id, burning.damagePerMinute);

      // Attempt to spread fire to nearby tiles
      this.spreadFireFromEntity(world, position, burning, weatherData);
    }

    // Process burning tiles
    this.processBurningTiles(world, weatherData);

    // Update tile burns and spread fire tile-to-tile
    this.updateTileFires(world, weatherData);
  }

  /**
   * Get current weather conditions affecting fire.
   */
  private getWeatherData(world: World): { isRaining: boolean; windStrength: number } {
    if (!this.weatherEntityId) {
      const weatherEntities = world.query().with(CT.Weather).executeEntities();
      if (weatherEntities.length > 0) {
        this.weatherEntityId = weatherEntities[0]!.id;
      }
    }

    if (this.weatherEntityId) {
      const weatherEntity = world.getEntity(this.weatherEntityId);
      if (weatherEntity) {
        const weather = (weatherEntity as EntityImpl).getComponent<any>(CT.Weather);
        if (weather) {
          return {
            isRaining: weather.condition === 'rain' || weather.condition === 'storm',
            windStrength: weather.windStrength || 0,
          };
        }
      } else {
        this.weatherEntityId = null;
      }
    }

    return { isRaining: false, windStrength: 0 };
  }

  /**
   * Check if fire should be extinguished.
   */
  private shouldExtinguish(
    burning: BurningComponent,
    weather: { isRaining: boolean; windStrength: number }
  ): boolean {
    // Rain extinguishes fire (75% chance per update if raining)
    if (weather.isRaining && Math.random() < 0.75) {
      return true;
    }

    // Entity actively extinguishing (e.g., rolling, water bucket)
    if (burning.extinguishing && Math.random() < 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Extinguish a burning entity.
   */
  private extinguishEntity(world: World, entity: Entity): void {
    const impl = entity as EntityImpl;

    // Remove burning component
    impl.removeComponent(CT.Burning);

    // Clean up health damage delta
    if (this.deltaCleanups.has(entity.id)) {
      this.deltaCleanups.get(entity.id)!();
      this.deltaCleanups.delete(entity.id);
    }

    // Emit extinguish event
    world.eventBus.emit({
      type: 'fire:extinguished',
      source: entity.id,
      data: { entityId: entity.id },
    });
  }

  /**
   * Update burning DoT delta for an entity.
   */
  private updateBurningDelta(entityId: string, damagePerMinute: number): void {
    if (!this.stateMutator) {
      throw new Error('[FireSpreadSystem] StateMutatorSystem not set - call setStateMutatorSystem() during initialization');
    }

    // Clean up old delta if it exists
    if (this.deltaCleanups.has(entityId)) {
      this.deltaCleanups.get(entityId)!();
      this.deltaCleanups.delete(entityId);
    }

    // Register new delta
    const cleanup = this.stateMutator.registerDelta({
      entityId,
      componentType: CT.Needs,
      field: 'health',
      deltaPerMinute: -damagePerMinute,
      min: 0,
      max: 100,
      source: 'burning_damage',
    });

    this.deltaCleanups.set(entityId, cleanup);
  }

  /**
   * Attempt to spread fire from a burning entity to nearby tiles.
   */
  private spreadFireFromEntity(
    world: World,
    position: PositionComponent,
    burning: BurningComponent,
    weather: { isRaining: boolean; windStrength: number }
  ): void {
    if (!world.getTileAt) return;

    // Check adjacent tiles (8-directional)
    const offsets = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1],
    ];

    for (const offset of offsets) {
      const dx = offset[0]!;
      const dy = offset[1]!;
      const tx = Math.floor(position.x) + dx;
      const ty = Math.floor(position.y) + dy;

      // Check if tile can ignite
      const tile = world.getTileAt(tx, ty) as Tile | null;
      if (!tile) continue;

      this.attemptTileIgnition(world, tx, ty, tile, burning.intensity, burning.source, weather);
    }
  }

  /**
   * Attempt to ignite a tile.
   */
  private attemptTileIgnition(
    world: World,
    x: number,
    y: number,
    tile: Tile,
    sourceIntensity: number,
    source: BurningComponent['source'],
    weather: { isRaining: boolean; windStrength: number }
  ): void {
    const key = `${x},${y}`;

    // Already burning?
    if (this.burningTiles.has(key)) return;

    // Rain reduces ignition chance
    if (weather.isRaining && Math.random() < 0.8) return;

    // Check for flammable materials on tile
    const materials: string[] = [];
    if (tile.roof) materials.push(tile.roof.material);
    if (tile.wall) materials.push(tile.wall.material);
    if (tile.door) materials.push(tile.door.material);
    if (tile.window) materials.push(tile.window.material);

    // Find most flammable material
    let mostFlammable: MaterialCombustionProperties | null = null;
    let mostFlammableMaterial = '';

    for (const material of materials) {
      const props = MATERIAL_COMBUSTION[material];
      if (!props || !props.flammable) continue;

      if (!mostFlammable || props.spreadRate > mostFlammable.spreadRate) {
        mostFlammable = props;
        mostFlammableMaterial = material;
      }
    }

    if (!mostFlammable) return; // Nothing flammable

    // Calculate ignition chance based on material and intensity
    const baseChance = mostFlammable.spreadRate;
    const intensityBonus = sourceIntensity / 100;
    const ignitionChance = Math.min(0.95, baseChance * intensityBonus);

    if (Math.random() < ignitionChance) {
      // Ignite tile!
      this.burningTiles.set(key, {
        x,
        y,
        ignitedAt: world.tick,
        intensity: Math.min(100, sourceIntensity * 0.8), // Fire loses some intensity when spreading
        durationRemaining: mostFlammable.burnDuration,
        source: 'spread',
      });

      world.eventBus.emit({
        type: 'fire:tile_ignited',
        source: 'fire_spread',
        data: { x, y, material: mostFlammableMaterial },
      });
    }
  }

  /**
   * Process all burning tiles.
   */
  private processBurningTiles(
    world: World,
    weather: { isRaining: boolean; windStrength: number }
  ): void {
    if (!world.getTileAt) return;

    const toExtinguish: string[] = [];

    for (const [key, burning] of this.burningTiles.entries()) {
      const tile = world.getTileAt(burning.x, burning.y) as Tile | null;
      if (!tile) {
        toExtinguish.push(key);
        continue;
      }

      // Rain extinguishing
      if (weather.isRaining && Math.random() < 0.6) {
        toExtinguish.push(key);
        continue;
      }

      // Apply structural damage
      this.applyTileDamage(tile, burning);

      // Decrease duration
      burning.durationRemaining -= this.UPDATE_INTERVAL;
      if (burning.durationRemaining <= 0) {
        toExtinguish.push(key);
      }
    }

    // Remove extinguished tiles
    for (const key of toExtinguish) {
      this.burningTiles.delete(key);
      const parts = key.split(',').map(Number);
      const x = parts[0]!;
      const y = parts[1]!;
      world.eventBus.emit({
        type: 'fire:tile_extinguished',
        source: 'fire_spread',
        data: { x, y },
      });
    }
  }

  /**
   * Apply fire damage to tile structures.
   */
  private applyTileDamage(tile: Tile, burning: BurningTileData): void {
    const damageMult = burning.intensity / 100;

    // Damage roof
    if (tile.roof) {
      const props = MATERIAL_COMBUSTION[tile.roof.material];
      if (props) {
        const damage = props.durabilityDamagePerTick * damageMult;
        tile.roof.condition = Math.max(0, tile.roof.condition - damage);

        // Destroy roof if condition reaches 0
        if (tile.roof.condition <= 0) {
          delete tile.roof;
        }
      }
    }

    // Damage wall
    if (tile.wall) {
      const props = MATERIAL_COMBUSTION[tile.wall.material];
      if (props) {
        const damage = props.durabilityDamagePerTick * damageMult;
        tile.wall.condition = Math.max(0, tile.wall.condition - damage);

        if (tile.wall.condition <= 0) {
          delete tile.wall;
        }
      }
    }

    // Damage door
    if (tile.door) {
      const props = MATERIAL_COMBUSTION[tile.door.material];
      if (props && props.flammable) {
        const damage = props.durabilityDamagePerTick * damageMult;
        // Doors don't have condition, so we just destroy them
        if (Math.random() < damage / 100) {
          delete tile.door;
        }
      }
    }

    // Damage window
    if (tile.window) {
      const props = MATERIAL_COMBUSTION[tile.window.material];
      if (props) {
        const damage = props.durabilityDamagePerTick * damageMult;
        tile.window.condition = Math.max(0, tile.window.condition - damage);

        if (tile.window.condition <= 0) {
          delete tile.window;
        }
      }
    }
  }

  /**
   * Update tile fires and spread to adjacent tiles.
   */
  private updateTileFires(
    world: World,
    weather: { isRaining: boolean; windStrength: number }
  ): void {
    if (!world.getTileAt) return;

    // Create copy of burning tiles to avoid modifying during iteration
    const currentBurning = Array.from(this.burningTiles.values());

    for (const burning of currentBurning) {
      // Attempt to spread to adjacent tiles
      const offsets = [
        [-1, -1], [0, -1], [1, -1],
        [-1, 0],           [1, 0],
        [-1, 1],  [0, 1],  [1, 1],
      ];

      for (const offset of offsets) {
        const dx = offset[0]!;
        const dy = offset[1]!;
        const tx = burning.x + dx;
        const ty = burning.y + dy;

        const tile = world.getTileAt(tx, ty) as Tile | null;
        if (!tile) continue;

        this.attemptTileIgnition(world, tx, ty, tile, burning.intensity, burning.source, weather);
      }
    }
  }

  /**
   * Ignite an entity directly (called by spell systems, dragon breath, etc.)
   */
  igniteEntity(
    world: World,
    entity: Entity,
    intensity: number,
    duration: number,
    source: BurningComponent['source']
  ): void {
    const impl = entity as EntityImpl;

    // Remove existing burning component if present
    if (impl.hasComponent(CT.Burning)) {
      impl.removeComponent(CT.Burning);
      if (this.deltaCleanups.has(entity.id)) {
        this.deltaCleanups.get(entity.id)!();
        this.deltaCleanups.delete(entity.id);
      }
    }

    // Add new burning component
    const damagePerMinute = (intensity / 100) * 20; // Max 20% health loss per minute at 100 intensity

    const burningComponent = createBurningComponent({
      intensity,
      durationRemaining: duration,
      ignitedAt: world.tick,
      source,
      extinguishing: false,
      damagePerMinute,
    });

    impl.addComponent(burningComponent);

    // Emit ignite event
    world.eventBus.emit({
      type: 'fire:ignited',
      source: entity.id,
      data: { entityId: entity.id, intensity, source },
    });
  }

  /**
   * Ignite a tile directly (called by spell systems, dragon breath, etc.)
   */
  igniteTile(
    world: World,
    x: number,
    y: number,
    intensity: number,
    duration: number,
    source: BurningComponent['source']
  ): void {
    const key = `${x},${y}`;

    // Already burning? Increase intensity instead
    if (this.burningTiles.has(key)) {
      const burning = this.burningTiles.get(key)!;
      burning.intensity = Math.min(100, burning.intensity + intensity * 0.5);
      burning.durationRemaining += duration;
      return;
    }

    // Add new burning tile
    this.burningTiles.set(key, {
      x,
      y,
      ignitedAt: world.tick,
      intensity,
      durationRemaining: duration,
      source,
    });

    world.eventBus.emit({
      type: 'fire:tile_ignited',
      source: 'fire_spread',
      data: { x, y },
    });
  }

  /**
   * Get all burning tiles (for rendering)
   */
  getBurningTiles(): ReadonlyArray<BurningTileData> {
    return Array.from(this.burningTiles.values());
  }
}

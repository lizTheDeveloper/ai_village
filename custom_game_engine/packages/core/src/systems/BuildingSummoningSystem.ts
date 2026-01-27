/**
 * Handles magical building summoning.
 * Processes spell casts that create buildings.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import { EntityImpl } from '../ecs/Entity.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createBuildingComponent, type BuildingType } from '../components/BuildingComponent.js';
import { getPosition } from '../utils/componentHelpers.js';

/**
 * Effect data structure for spell cast events
 */
interface SpellEffect {
  type: string;
  buildingType?: string;
  location?: string | { x: number; y: number };
  duration?: number;
  sourceDimensions?: number;
  targetDimensions?: number;
  stability?: number;
  radius?: number;
}

/**
 * Spell cast event data structure
 * Note: effects is optional because base magic:spell_cast events may not have it
 * Only building-summoning spells include the effects array
 */
interface SpellCastData {
  casterId?: string;
  effects?: SpellEffect[];
  targetPosition?: { x: number; y: number };
}

export class BuildingSummoningSystem extends BaseSystem {
  public readonly id: SystemId = 'building_summoning' as SystemId;
  public readonly priority: number = 150; // After magic casting, before rendering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // PERFORMANCE: Event-driven system - no per-tick polling needed
  protected readonly throttleInterval = 100; // SLOW - only check occasionally as backup
  // PERF: Skip entirely when no entities can cast spells (need mana)
  public readonly activationComponents = [CT.Mana] as const;

  private blueprintRegistry: BuildingBlueprintRegistry;
  // PERFORMANCE: Queue events instead of polling history every tick
  private pendingSummonings: SpellCastData[] = [];
  private pendingRifts: SpellCastData[] = [];
  private initialized = false;

  constructor() {
    super();
    this.blueprintRegistry = new BuildingBlueprintRegistry();
  }

  public override async onInitialize(world: World): Promise<void> {
    // Subscribe to spell cast events instead of polling
    const eventBus = world.getEventBus();
    eventBus.subscribe('magic:spell_cast', (event) => {
      const data = event.data as SpellCastData;
      if (data.effects?.some(eff => eff.type === 'summon_building')) {
        this.pendingSummonings.push(data);
      }
      if (data.effects?.some(eff => eff.type === 'create_dimensional_rift')) {
        this.pendingRifts.push(data);
      }
    });
    this.initialized = true;
  }

  public override onUpdate(ctx: SystemContext): void {
    const { world } = ctx;

    // Process queued summoning events
    for (const event of this.pendingSummonings) {
      this.handleBuildingSummoning(world, event);
    }
    this.pendingSummonings = [];

    // Process queued rift events
    for (const event of this.pendingRifts) {
      this.handleRiftCreation(world, event);
    }
    this.pendingRifts = [];
  }

  private handleBuildingSummoning(world: World, event: SpellCastData): void {
    if (!event.casterId || !event.effects) return;

    const caster = world.getEntity(event.casterId);
    if (!caster) return;

    const summonEffect = event.effects.find(e => e.type === 'summon_building');
    if (!summonEffect?.buildingType) return;

    const buildingType = summonEffect.buildingType;
    const location = summonEffect.location;

    const blueprint = this.blueprintRegistry.tryGet(buildingType);
    if (!blueprint) {
      console.error(`Building blueprint "${buildingType}" not found`);
      return;
    }

    // Determine spawn position
    const spawnPos = this.determineSpawnPosition(caster, location, event.targetPosition);
    if (!spawnPos) return;

    // Create building entity
    const building = world.createEntity();

    // Add position component using helper
    this.addComponentSafely(building, createPositionComponent(spawnPos.x, spawnPos.y));

    // Add building component using helper - already complete (progress = 100)
    const buildingComponent = createBuildingComponent(buildingType as BuildingType, 1, 100);
    // Note: Summoning metadata is tracked via magical_construct component (lines 117-126)
    this.addComponentSafely(building, buildingComponent);

    // Add renderable component using helper
    this.addComponentSafely(building, createRenderableComponent(`building_${buildingType}`, 'building'));

    // Add dimensional marker if dimensional building
    if (blueprint.dimensional || blueprint.realmPocket) {
      this.addComponentSafely(building, {
        type: 'magical_construct' as ComponentType,
        version: 1,
        constructType: 'summoned_building',
        dimension: blueprint.dimensional?.dimension || 3,
        summoner: caster.id,
        duration: summonEffect.duration || 0, // 0 = permanent
        dispellable: true
      });
    }

    // Emit summoning visual effect
    world.getEventBus().emit({
      type: 'building:spawned',
      source: caster.id,
      data: {
        buildingId: building.id,
        buildingType: buildingType,
        cityId: '', // No city for summoned buildings
        position: { x: spawnPos.x, y: spawnPos.y },
        isComplete: true
      }
    });

    console.log(`✨ ${caster.id} summoned ${blueprint.name} at (${spawnPos.x}, ${spawnPos.y})`);
  }

  private handleRiftCreation(world: World, event: SpellCastData): void {
    if (!event.casterId || !event.effects) return;

    const caster = world.getEntity(event.casterId);
    if (!caster) return;

    const riftEffect = event.effects.find(e => e.type === 'create_dimensional_rift');
    if (!riftEffect) return;

    const location = riftEffect.location;

    // Determine spawn position
    const spawnPos = this.determineSpawnPosition(caster, location, event.targetPosition);
    if (!spawnPos) return;

    // Create rift entity
    const rift = world.createEntity();

    // Add position component using helper
    this.addComponentSafely(rift, createPositionComponent(spawnPos.x, spawnPos.y));

    // Add dimensional rift component
    this.addComponentSafely(rift, {
      type: CT.DimensionalRift,
      version: 1,
      sourceDimensions: riftEffect.sourceDimensions || 3,
      targetDimensions: riftEffect.targetDimensions || 4,
      stability: riftEffect.stability || 1.0,
      radius: riftEffect.radius || 2,
      visible: true,
      magnetic: (riftEffect.stability || 1.0) < 0.5,
      throughput: [],
      createdAt: world.tick,
      creator: caster.id,
      expiresAt: riftEffect.duration ? world.tick + riftEffect.duration : undefined
    });

    // Visual effect - use helper
    const radius = riftEffect.radius || 2;
    this.addComponentSafely(rift, createRenderableComponent('dimensional_rift', 'entity'));

    // Add particle effect
    const targetDim = riftEffect.targetDimensions || 4;
    const color = targetDim === 4 ? '#00FFFF' :
                  targetDim === 5 ? '#FF00FF' : '#FFFF00';

    this.addComponentSafely(rift, {
      type: 'particle_emitter' as ComponentType,
      version: 1,
      particleType: 'dimensional_shimmer',
      rate: 5,
      color
    });

    // Emit rift creation event
    world.getEventBus().emit({
      type: 'rebellion:rift_spawned',
      source: caster.id,
      data: {
        riftId: rift.id,
        position: { x: spawnPos.x, y: spawnPos.y }
      }
    });

    console.log(`🌀 ${caster.id} tore a rift at (${spawnPos.x}, ${spawnPos.y})`);
  }

  /**
   * Determine spawn position from location spec and caster position.
   * Returns undefined if caster has no position and no explicit location given.
   */
  private determineSpawnPosition(
    caster: Entity,
    location: string | { x: number; y: number } | undefined,
    targetPosition?: { x: number; y: number }
  ): { x: number; y: number } | undefined {
    // Target position takes precedence
    if (location === 'target_position' && targetPosition) {
      return { x: targetPosition.x, y: targetPosition.y };
    }

    // Explicit position object
    if (typeof location === 'object' && location.x !== undefined && location.y !== undefined) {
      return { x: location.x, y: location.y };
    }

    // Default to caster position with offset
    const casterPos = getPosition(caster);
    if (!casterPos) return undefined;

    return { x: casterPos.x + 5, y: casterPos.y };
  }

  /**
   * Add component to entity safely.
   * Uses EntityImpl.addComponent directly for proper type handling.
   */
  private addComponentSafely(entity: Entity, component: Component | Record<string, unknown>): void {
    // world.createEntity() returns EntityImpl which has addComponent
    const entityImpl = entity as EntityImpl;
    entityImpl.addComponent(component as Component);
  }
}

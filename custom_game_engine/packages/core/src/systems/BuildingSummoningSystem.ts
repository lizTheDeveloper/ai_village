/**
 * Handles magical building summoning.
 * Processes spell casts that create buildings.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';

export class BuildingSummoningSystem extends BaseSystem {
  public readonly id: SystemId = 'building_summoning' as SystemId;
  public readonly priority: number = 150; // After magic casting, before rendering
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 0; // Every tick

  private blueprintRegistry: BuildingBlueprintRegistry;

  constructor() {
    super();
    this.blueprintRegistry = new BuildingBlueprintRegistry();
  }

  public override onUpdate(ctx: SystemContext): void {
    const { world } = ctx;

    // Find all spell cast events that summon buildings
    const eventBus = world.getEventBus();
    const summoningEvents = eventBus.getEventsSince(world.tick - 1, 'spell_cast')
      .filter(e => e.effects?.some((eff: any) => eff.type === 'summon_building'));

    for (const event of summoningEvents) {
      this.handleBuildingSummoning(world, event);
    }

    // Also handle rift creation events
    const riftEvents = eventBus.getEventsSince(world.tick - 1, 'spell_cast')
      .filter(e => e.effects?.some((eff: any) => eff.type === 'create_dimensional_rift'));

    for (const event of riftEvents) {
      this.handleRiftCreation(world, event);
    }
  }

  private handleBuildingSummoning(world: World, event: any): void {
    const caster = world.getEntity(event.casterId);
    if (!caster) return;

    const summonEffect = event.effects.find((e: any) => e.type === 'summon_building');
    const buildingType = summonEffect.buildingType;
    const location = summonEffect.location;

    const blueprint = this.blueprintRegistry.tryGet(buildingType);
    if (!blueprint) {
      console.error(`Building blueprint "${buildingType}" not found`);
      return;
    }

    // Determine spawn position
    let spawnX: number, spawnY: number;
    if (location === 'target_position' && event.targetPosition) {
      spawnX = event.targetPosition.x;
      spawnY = event.targetPosition.y;
    } else if (typeof location === 'object') {
      spawnX = location.x;
      spawnY = location.y;
    } else {
      // Default to caster position
      const pos = caster.components.get(CT.Position);
      if (!pos) return;
      spawnX = pos.x + 5; // Offset slightly
      spawnY = pos.y;
    }

    // Create building entity
    const building = new EntityImpl(world);

    building.components.set(CT.Position, {
      type: CT.Position,
      x: spawnX,
      y: spawnY
    });

    building.components.set(CT.Building, {
      type: CT.Building,
      buildingType: buildingType,
      constructionProgress: 100, // Instantly built (it's magic!)
      built: true,
      summonedBy: caster.id,
      summonedAt: world.tick
    });

    building.components.set(CT.Sprite, {
      type: CT.Sprite,
      spriteId: `building_${buildingType}`,
      width: blueprint.width,
      height: blueprint.height
    });

    // Add dimensional marker if dimensional building
    if (blueprint.dimensional || blueprint.realmPocket) {
      building.components.set('magical_construct' as ComponentType, {
        type: 'magical_construct' as ComponentType,
        constructType: 'summoned_building',
        dimension: blueprint.dimensional?.dimension || 3,
        summoner: caster.id,
        duration: summonEffect.duration || 0, // 0 = permanent
        dispellable: true
      });
    }

    // Emit summoning visual effect
    world.getEventBus().emit({
      type: 'building_summoned',
      buildingId: building.id,
      buildingType: buildingType,
      casterId: caster.id,
      position: { x: spawnX, y: spawnY },
      dimension: blueprint.dimensional?.dimension,
      animation: event.visual?.impactAnimation || 'building_materialize'
    });

    console.log(`✨ ${caster.id} summoned ${blueprint.name} at (${spawnX}, ${spawnY})`);
  }

  private handleRiftCreation(world: World, event: any): void {
    const caster = world.getEntity(event.casterId);
    if (!caster) return;

    const riftEffect = event.effects.find((e: any) => e.type === 'create_dimensional_rift');
    const location = riftEffect.location;

    // Determine spawn position
    let spawnX: number, spawnY: number;
    if (location === 'target_position' && event.targetPosition) {
      spawnX = event.targetPosition.x;
      spawnY = event.targetPosition.y;
    } else if (typeof location === 'object') {
      spawnX = location.x;
      spawnY = location.y;
    } else {
      const pos = caster.components.get(CT.Position);
      if (!pos) return;
      spawnX = pos.x + 3;
      spawnY = pos.y;
    }

    // Create rift entity
    const rift = new EntityImpl(world);

    rift.components.set(CT.Position, {
      type: CT.Position,
      x: spawnX,
      y: spawnY
    });

    rift.components.set('dimensional_rift' as ComponentType, {
      type: 'dimensional_rift' as ComponentType,
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

    // Visual effect
    rift.components.set(CT.Sprite, {
      type: CT.Sprite,
      spriteId: 'dimensional_rift',
      width: (riftEffect.radius || 2) * 2,
      height: (riftEffect.radius || 2) * 2
    });

    // Add particle effect
    const targetDim = riftEffect.targetDimensions || 4;
    rift.components.set('particle_emitter' as ComponentType, {
      type: 'particle_emitter' as ComponentType,
      particleType: 'dimensional_shimmer',
      rate: 5,
      color: targetDim === 4 ? '#00FFFF' :
             targetDim === 5 ? '#FF00FF' : '#FFFF00'
    });

    // Emit rift creation event
    world.getEventBus().emit({
      type: 'dimensional_rift_created',
      riftId: rift.id,
      casterId: caster.id,
      position: { x: spawnX, y: spawnY },
      sourceDimensions: riftEffect.sourceDimensions || 3,
      targetDimensions: riftEffect.targetDimensions || 4,
      stability: riftEffect.stability || 1.0
    });

    console.log(`🌀 ${caster.id} tore a rift at (${spawnX}, ${spawnY})`);
  }
}

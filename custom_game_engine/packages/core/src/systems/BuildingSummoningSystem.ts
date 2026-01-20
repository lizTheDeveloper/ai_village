/**
 * Handles magical building summoning.
 * Processes spell casts that create buildings.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
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
    const allEvents = eventBus.getHistory(world.tick - 1);

    const summoningEvents = allEvents
      .filter(e => e.type === 'magic:spell_cast' && (e.data as any).effects?.some((eff: any) => eff.type === 'summon_building'));

    for (const event of summoningEvents) {
      this.handleBuildingSummoning(world, event.data as any);
    }

    // Also handle rift creation events
    const riftEvents = allEvents
      .filter(e => e.type === 'magic:spell_cast' && (e.data as any).effects?.some((eff: any) => eff.type === 'create_dimensional_rift'));

    for (const event of riftEvents) {
      this.handleRiftCreation(world, event.data as any);
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
      const pos = caster.components.get(CT.Position) as { x: number; y: number } | undefined;
      if (!pos) return;
      spawnX = pos.x + 5; // Offset slightly
      spawnY = pos.y;
    }

    // Create building entity
    const building = world.createEntity() as EntityImpl;

    building.addComponent({
      type: CT.Position,
      version: 1,
      x: spawnX,
      y: spawnY,
      z: 0,
      chunkX: Math.floor(spawnX / 32),
      chunkY: Math.floor(spawnY / 32)
    } as any);

    building.addComponent({
      type: CT.Building,
      version: 1,
      buildingType: buildingType,
      constructionProgress: 100, // Instantly built (it's magic!)
      built: true,
      summonedBy: caster.id,
      summonedAt: world.tick
    } as any);

    building.addComponent({
      type: CT.Renderable,
      version: 1,
      spriteId: `building_${buildingType}`,
      width: blueprint.width,
      height: blueprint.height
    } as any);

    // Add dimensional marker if dimensional building
    if (blueprint.dimensional || blueprint.realmPocket) {
      building.addComponent({
        type: 'magical_construct' as ComponentType,
        version: 1,
        constructType: 'summoned_building',
        dimension: blueprint.dimensional?.dimension || 3,
        summoner: caster.id,
        duration: summonEffect.duration || 0, // 0 = permanent
        dispellable: true
      } as any);
    }

    // Emit summoning visual effect
    world.getEventBus().emit({
      type: 'building:spawned',
      source: caster.id,
      data: {
        buildingId: building.id,
        buildingType: buildingType,
        cityId: '', // No city for summoned buildings
        position: { x: spawnX, y: spawnY },
        isComplete: true
      }
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
      const pos = caster.components.get(CT.Position) as { x: number; y: number } | undefined;
      if (!pos) return;
      spawnX = pos.x + 3;
      spawnY = pos.y;
    }

    // Create rift entity
    const rift = world.createEntity() as EntityImpl;

    rift.addComponent({
      type: CT.Position,
      version: 1,
      x: spawnX,
      y: spawnY,
      z: 0,
      chunkX: Math.floor(spawnX / 32),
      chunkY: Math.floor(spawnY / 32)
    } as any);

    rift.addComponent({
      type: 'dimensional_rift' as ComponentType,
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
    } as any);

    // Visual effect
    rift.addComponent({
      type: CT.Renderable,
      version: 1,
      spriteId: 'dimensional_rift',
      width: (riftEffect.radius || 2) * 2,
      height: (riftEffect.radius || 2) * 2
    } as any);

    // Add particle effect
    const targetDim = riftEffect.targetDimensions || 4;
    rift.addComponent({
      type: 'particle_emitter' as ComponentType,
      version: 1,
      particleType: 'dimensional_shimmer',
      rate: 5,
      color: targetDim === 4 ? '#00FFFF' :
             targetDim === 5 ? '#FF00FF' : '#FFFF00'
    } as any);

    // Emit rift creation event
    world.getEventBus().emit({
      type: 'rebellion:rift_spawned',
      source: caster.id,
      data: {
        riftId: rift.id,
        position: { x: spawnX, y: spawnY }
      }
    });

    console.log(`🌀 ${caster.id} tore a rift at (${spawnX}, ${spawnY})`);
  }
}

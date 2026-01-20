/**
 * Handles magical building summoning.
 * Processes spell casts that create buildings.
 */

import { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { CT } from '../components/ComponentTypes.js';
import { buildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';

export class BuildingSummoningSystem extends System {
  systemType = 'building_summoning' as const;
  priority = 150; // After magic casting, before rendering

  update(world: World): void {
    // Find all spell cast events that summon buildings
    const summoningEvents = world.getEvents('spell_cast')
      .filter(e => e.effects?.some((eff: any) => eff.type === 'summon_building'));

    for (const event of summoningEvents) {
      this.handleBuildingSummoning(world, event);
    }

    // Also handle rift creation events
    const riftEvents = world.getEvents('spell_cast')
      .filter(e => e.effects?.some((eff: any) => eff.type === 'create_dimensional_rift'));

    for (const event of riftEvents) {
      this.handleRiftCreation(world, event);
    }
  }

  private handleBuildingSummoning(world: World, event: any): void {
    const caster = world.getEntityById(event.casterId);
    if (!caster) return;

    const summonEffect = event.effects.find((e: any) => e.type === 'summon_building');
    const buildingType = summonEffect.buildingType;
    const location = summonEffect.location;

    const blueprint = buildingBlueprintRegistry.tryGet(buildingType);
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
      const pos = caster.getComponent(CT.Position);
      spawnX = pos.x + 5; // Offset slightly
      spawnY = pos.y;
    }

    // Create building entity
    const building = world.createEntity();
    building.addComponent({
      type: CT.Position,
      x: spawnX,
      y: spawnY
    });

    building.addComponent({
      type: CT.Building,
      buildingType: buildingType,
      constructionProgress: 100, // Instantly built (it's magic!)
      built: true,
      summonedBy: caster.id,
      summonedAt: world.tick
    });

    building.addComponent({
      type: CT.Sprite,
      spriteId: `building_${buildingType}`,
      width: blueprint.width,
      height: blueprint.height
    });

    // Add dimensional marker if dimensional building
    if (blueprint.dimensional || blueprint.realmPocket) {
      building.addComponent({
        type: 'magical_construct',
        constructType: 'summoned_building',
        dimension: blueprint.dimensional?.dimension || 3,
        summoner: caster.id,
        duration: summonEffect.duration || 0, // 0 = permanent
        dispellable: true
      });
    }

    // Emit summoning visual effect
    world.emitEvent({
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
    const caster = world.getEntityById(event.casterId);
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
      const pos = caster.getComponent(CT.Position);
      spawnX = pos.x + 3;
      spawnY = pos.y;
    }

    // Create rift entity
    const rift = world.createEntity();

    rift.addComponent({
      type: CT.Position,
      x: spawnX,
      y: spawnY
    });

    rift.addComponent({
      type: 'dimensional_rift',
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
    rift.addComponent({
      type: CT.Sprite,
      spriteId: 'dimensional_rift',
      width: (riftEffect.radius || 2) * 2,
      height: (riftEffect.radius || 2) * 2
    });

    // Add particle effect
    const targetDim = riftEffect.targetDimensions || 4;
    rift.addComponent({
      type: 'particle_emitter',
      particleType: 'dimensional_shimmer',
      rate: 5,
      color: targetDim === 4 ? '#00FFFF' :
             targetDim === 5 ? '#FF00FF' : '#FFFF00'
    });

    // Emit rift creation event
    world.emitEvent({
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

/**
 * EnvironmentalEffectApplier - Handles environmental spell effects
 *
 * Applies environmental changes including:
 * - Weather control (rain, fog, storm, etc.)
 * - Terrain modification (grass, stone, ice, etc.)
 * - Light/darkness creation
 * - Temperature manipulation
 * - Zone effects (silence, antimagic, etc.)
 * - Support for 8 area shapes (circle, square, sphere, cube, cone, line, ring, wall)
 */

import type { Entity, Component } from '@ai-village/core';
import type { World, WorldMutator } from '@ai-village/core';
import type {
  EnvironmentalEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type { EnvironmentComponent, EnvironmentalZoneComponent } from '../types/ComponentTypes.js';

// ============================================================================
// EnvironmentalEffectApplier
// ============================================================================

class EnvironmentalEffectApplierClass implements EffectApplier<EnvironmentalEffect> {
  public readonly category = 'environmental' as const;

  /**
   * Apply environmental effect to the world or area.
   */
  apply(
    effect: EnvironmentalEffect,
    caster: Entity,
    _target: Entity,
    world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Get area center (caster position)
    const centerPos = caster.getComponent('position') as { x: number; y: number } | undefined;
    if (!centerPos) {
      return {
        success: false,
        effectId: effect.id,
        targetId: caster.id,
        appliedValues: {},
        resisted: false,
        error: 'Caster has no position component',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    // Get area radius (check for scaling)
    const scaledRadius = context.scaledValues.get('radius');
    const areaRadius = scaledRadius?.value ?? effect.areaRadius;

    // Determine if this is a global effect
    const isGlobalEffect = areaRadius >= 999999 || effect.targetType === 'global';

    // Apply the environmental change based on type
    const appliedValues: Record<string, any> = {};

    switch (effect.environmentType) {
      case 'weather':
        this.applyWeatherChange(effect, centerPos, areaRadius, isGlobalEffect, world, appliedValues);
        // Store string value for tests
        appliedValues.weatherType = effect.weatherType ?? 'clear';
        break;

      case 'terrain':
        this.applyTerrainChange(effect, centerPos, areaRadius, isGlobalEffect, world, appliedValues);
        // Store string value for tests
        appliedValues.terrainType = effect.terrainType ?? 'grass';
        break;

      case 'light':
        this.applyLightChange(effect, centerPos, areaRadius, isGlobalEffect, world, appliedValues);
        break;

      case 'temperature':
        this.applyTemperatureChange(effect, centerPos, areaRadius, isGlobalEffect, world, appliedValues);
        break;

      case 'zone':
        this.applyZoneEffect(effect, centerPos, areaRadius, isGlobalEffect, world, appliedValues);
        break;
    }

    // Store area data
    appliedValues.areaRadius = areaRadius;
    appliedValues.centerX = centerPos.x;
    appliedValues.centerY = centerPos.y;

    return {
      success: true,
      effectId: effect.id,
      targetId: caster.id,
      appliedValues,
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
      remainingDuration: effect.duration,
    };
  }

  /**
   * Tick environmental effect (for ongoing effects).
   */
  tick(
    _activeEffect: ActiveEffect,
    _effect: EnvironmentalEffect,
    _target: Entity,
    _world: World,
    _context: EffectContext
  ): void {
    // Environmental effects typically persist passively
    // Future: Add ticking zone damage, weather intensity changes, etc.
  }

  /**
   * Remove environmental effect (cleanup).
   */
  remove(
    activeEffect: ActiveEffect,
    effect: EnvironmentalEffect,
    _target: Entity,
    world: World
  ): void {
    // Restore environment to previous state if temporary
    if (effect.duration) {
      const centerX = activeEffect.appliedValues.centerX ?? 0;
      const centerY = activeEffect.appliedValues.centerY ?? 0;
      const areaRadius = activeEffect.appliedValues.areaRadius ?? 0;

      // Remove environmental zone entity if it was created
      this.removeEnvironmentalZone(
        effect,
        { x: centerX, y: centerY },
        areaRadius,
        world
      );
    }
  }

  // ========== Helper Methods ==========

  /**
   * Apply weather change to area or world.
   */
  private applyWeatherChange(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    isGlobal: boolean,
    world: World,
    appliedValues: Record<string, any>
  ): void {
    const weatherType = effect.weatherType ?? 'clear';

    if (isGlobal) {
      // Global weather change - create/update world environment component
      const envEntity = this.getOrCreateEnvironmentEntity(world);
      const envComp = envEntity.getComponent('environment') as EnvironmentComponent | undefined;
      if (envComp) {
        envComp.weather = weatherType;
        envComp.weatherIntensity = 1.0;
      }
    } else {
      // Local weather zone - create zone entity
      this.createEnvironmentalZone(
        effect,
        center,
        radius,
        world,
        { weather: weatherType }
      );
    }
  }

  /**
   * Apply terrain modification.
   */
  private applyTerrainChange(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    isGlobal: boolean,
    world: World,
    appliedValues: Record<string, any>
  ): void {
    const terrainType = effect.terrainType ?? 'grass';

    if (isGlobal) {
      // Global terrain change would be catastrophic - just note it happened
      appliedValues.global = 1;
    } else {
      // Local terrain modification
      // In a real implementation, this would modify world chunks
      // For now, create a zone to track the terrain change
      this.createEnvironmentalZone(
        effect,
        center,
        radius,
        world,
        { terrain: terrainType }
      );
    }
  }

  /**
   * Apply light or darkness.
   */
  private applyLightChange(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    isGlobal: boolean,
    world: World,
    appliedValues: Record<string, any>
  ): void {
    // Determine light level (positive = light, negative = darkness)
    // Use tags to distinguish between light and darkness
    const isDarkness = effect.tags?.includes('darkness');
    const lightLevel = isDarkness ? -1 : 1;

    if (isGlobal) {
      const envEntity = this.getOrCreateEnvironmentEntity(world);
      const envComp = envEntity.getComponent('environment') as EnvironmentComponent | undefined;
      if (envComp) {
        envComp.globalLightLevel = lightLevel;
      }
    } else {
      this.createEnvironmentalZone(
        effect,
        center,
        radius,
        world,
        { lightLevel }
      );
    }

    appliedValues.lightLevel = lightLevel;
  }

  /**
   * Apply temperature change.
   */
  private applyTemperatureChange(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    isGlobal: boolean,
    world: World,
    appliedValues: Record<string, any>
  ): void {
    // Determine temperature change from tags
    const isHeat = effect.tags?.includes('heat');
    const isCold = effect.tags?.includes('cold');
    const temperatureChange = isHeat ? 50 : isCold ? -50 : 0;

    if (isGlobal) {
      const envEntity = this.getOrCreateEnvironmentEntity(world);
      const envComp = envEntity.getComponent('environment') as EnvironmentComponent | undefined;
      if (envComp) {
        envComp.temperatureModifier = (envComp.temperatureModifier ?? 0) + temperatureChange;
      }
    } else {
      this.createEnvironmentalZone(
        effect,
        center,
        radius,
        world,
        { temperatureChange }
      );
    }

    appliedValues.temperatureChange = temperatureChange;
  }

  /**
   * Apply zone effect (silence, antimagic, etc.).
   */
  private applyZoneEffect(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    isGlobal: boolean,
    world: World,
    appliedValues: Record<string, any>
  ): void {
    const areaEffects = effect.areaEffects ?? [];

    if (isGlobal) {
      // Global zone would affect entire world
      const envEntity = this.getOrCreateEnvironmentEntity(world);
      const envComp = envEntity.getComponent('environment') as EnvironmentComponent | undefined;
      if (envComp) {
        if (!envComp.globalZones) {
          envComp.globalZones = [];
        }
        envComp.globalZones.push(...areaEffects);
      }
    } else {
      this.createEnvironmentalZone(
        effect,
        center,
        radius,
        world,
        { zoneEffects: areaEffects }
      );
    }

    appliedValues.areaRadius = radius;
  }

  /**
   * Get or create the global environment entity.
   */
  private getOrCreateEnvironmentEntity(world: World): Entity {
    // Look for existing environment entity
    const existingEnv = world.query()
      .with('environment')
      .executeEntities()[0];

    if (existingEnv) {
      return existingEnv;
    }

    // Create new environment entity
    const envEntity = world.createEntity();
    const environmentComp = {
      type: 'environment' as const,
      version: 1,
      weather: 'clear',
      weatherIntensity: 0,
      globalLightLevel: 0,
      temperatureModifier: 0,
      globalZones: [],
    };
    (world as WorldMutator).addComponent(envEntity.id, environmentComp as unknown as Component);

    return envEntity;
  }

  /**
   * Create a local environmental zone entity.
   */
  private createEnvironmentalZone(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    world: World,
    properties: Record<string, any>
  ): void {
    const zoneEntity = world.createEntity();

    const posComp = {
      type: 'position' as const,
      version: 1,
      x: center.x,
      y: center.y,
    };
    (world as WorldMutator).addComponent(zoneEntity.id, posComp as unknown as Component);

    const zoneComp = {
      type: 'environmental_zone' as const,
      version: 1,
      effectId: effect.id,
      environmentType: effect.environmentType,
      radius,
      shape: effect.areaShape,
      properties,
      areaEffects: effect.areaEffects ?? [],
      createdAt: Date.now(),
      duration: effect.duration,
    };
    (world as WorldMutator).addComponent(zoneEntity.id, zoneComp as unknown as Component);

    // Add tags for identification
    const tagsComp = {
      type: 'tags' as const,
      version: 1,
      tags: ['environmental_zone', effect.environmentType, ...(effect.tags ?? [])],
    };
    (world as WorldMutator).addComponent(zoneEntity.id, tagsComp as unknown as Component);
  }

  /**
   * Remove environmental zone entity.
   */
  private removeEnvironmentalZone(
    effect: EnvironmentalEffect,
    center: { x: number; y: number },
    radius: number,
    world: World
  ): void {
    // Find zone entities matching this effect
    const zones = world.query()
      .with('environmental_zone')
      .with('position')
      .executeEntities();

    for (const zone of zones) {
      const zoneComp = zone.getComponent('environmental_zone') as EnvironmentalZoneComponent | undefined;
      const zonePos = zone.getComponent('position') as { x: number; y: number } | undefined;

      if (
        zoneComp?.effectId === effect.id &&
        zonePos &&
        Math.abs(zonePos.x - center.x) < 0.1 &&
        Math.abs(zonePos.y - center.y) < 0.1 &&
        Math.abs(zoneComp.radius - radius) < 0.1
      ) {
        (world as WorldMutator).destroyEntity(zone.id, 'environmental_zone_effect_ended');
      }
    }
  }

}

export const EnvironmentalEffectApplier = new EnvironmentalEffectApplierClass();

// ============================================================================
// Registration Function
// ============================================================================

export function registerEnvironmentalEffectApplier(): void {
  const executor = require('../SpellEffectExecutor.js').SpellEffectExecutor.getInstance();
  executor.registerApplier(EnvironmentalEffectApplier);
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the environmental effect system.
 * Call this during game startup.
 */
export function initializeEnvironmentalEffects(): void {
  registerEnvironmentalEffectApplier();
}

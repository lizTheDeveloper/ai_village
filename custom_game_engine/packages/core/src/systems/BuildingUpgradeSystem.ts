/**
 * BuildingUpgradeSystem – processes in-progress building upgrades.
 *
 * Upgrade workflow mirrors construction:
 * 1. External code sets `pendingUpgradeId` on BuildingUpgradeComponent.
 * 2. This system advances `upgradeProgress` each tick based on labor rate.
 * 3. On completion, effects are applied and the upgrade ID is recorded.
 *
 * Performance notes:
 * - Throttled at 100 ticks (5 s) — upgrades don't need per-tick precision.
 * - Uses SimulationScheduler so idle buildings outside the viewport are culled.
 * - Only processes entities that have both `building` and `building_upgrade`.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingUpgradeComponent } from '../components/BuildingUpgradeComponent.js';
import {
  BUILDING_UPGRADE_DEFINITIONS,
  type UpgradeEffect,
} from '../components/BuildingUpgradeComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';

/**
 * Labor progress per tick when an upgrade is in progress.
 * 1 unit = 1 agent-second of work. At 20 TPS, a 1-hour job takes 72 000 ticks.
 * We accelerate slightly so upgrades complete in-game-days, not real-days.
 */
const UPGRADE_LABOR_PER_TICK = 1 / 20; // 1 agent-second per real second

export class BuildingUpgradeSystem extends BaseSystem {
  public readonly id: SystemId = 'building_upgrade';
  public readonly priority: number = 125; // After BuildingSystem (110), before MaintenanceSystem
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building, CT.BuildingUpgrade];
  public readonly activationComponents = [CT.BuildingUpgrade] as const;

  protected readonly throttleInterval = 100; // 5 s — fine resolution for upgrade progress

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const currentTick = world.tick ?? 0;

    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const upgrade = impl.getComponent<BuildingUpgradeComponent>(CT.BuildingUpgrade);
      const building = impl.getComponent<BuildingComponent>(CT.Building);

      if (!upgrade || !building) continue;
      if (!upgrade.pendingUpgradeId) continue;
      if (!building.isComplete) continue; // Can't upgrade during construction

      const def = BUILDING_UPGRADE_DEFINITIONS[upgrade.pendingUpgradeId];
      if (!def) {
        // Unknown upgrade ID – clear it
        upgrade.pendingUpgradeId = null;
        upgrade.upgradeProgress = 0;
        continue;
      }

      // Advance progress based on time elapsed since last tick
      // throttleInterval ticks have passed since last update
      const ticksElapsed = this.throttleInterval;
      const laborDone = ticksElapsed * UPGRADE_LABOR_PER_TICK;
      const progressGain = (laborDone / def.laborCostTicks) * 100;
      upgrade.upgradeProgress = Math.min(100, upgrade.upgradeProgress + progressGain);

      if (upgrade.upgradeProgress >= 100) {
        this.applyUpgradeEffects(upgrade, def.effects);
        upgrade.appliedUpgrades.push(def.id);
        upgrade.pendingUpgradeId = null;
        upgrade.upgradeProgress = 0;
        upgrade.upgradeStartTick = 0;

        this.events.emitGeneric('building:upgrade_completed', {
          buildingId: entity.id,
          buildingType: building.buildingType,
          upgradeId: def.id,
          upgradeName: def.name,
        }, entity.id);
      }
    }
  }

  private applyUpgradeEffects(
    upgrade: BuildingUpgradeComponent,
    effects: UpgradeEffect[]
  ): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'capacity_increase':
          upgrade.bonusCapacity += effect.magnitude;
          break;
        case 'efficiency_increase':
          upgrade.bonusEfficiency += effect.magnitude / 100; // Convert % to fraction
          break;
        case 'durability_increase':
          upgrade.bonusDurability += effect.magnitude;
          break;
        case 'comfort_increase':
          upgrade.bonusComfort += effect.magnitude;
          break;
        case 'defense_increase':
          upgrade.bonusDefense += effect.magnitude;
          break;
        case 'aesthetic_improvement':
          upgrade.bonusAesthetics += effect.magnitude;
          break;
        case 'reduce_maintenance':
          // Convert % reduction to multiplier
          upgrade.maintenanceCostMultiplier = Math.max(
            0.1,
            upgrade.maintenanceCostMultiplier * (1 - effect.magnitude / 100)
          );
          break;
        case 'unlock_feature':
          // Feature name is stored in a companion field set by the definition
          // For now, record the upgrade ID as a feature marker
          if (!upgrade.unlockedFeatures.includes(`upgrade:${upgrade.pendingUpgradeId}`)) {
            upgrade.unlockedFeatures.push(`upgrade:${upgrade.pendingUpgradeId ?? 'unknown'}`);
          }
          break;
      }
    }
  }
}

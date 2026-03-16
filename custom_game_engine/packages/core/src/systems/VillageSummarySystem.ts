/**
 * VillageSummarySystem - Aggregates agent data into village summaries
 *
 * For villages at 'summary' or 'statistical' abstraction levels, this system
 * scans nearby agent entities and computes aggregate statistics (population,
 * average mood, total resources) into the VillageComponent summary field.
 *
 * It also transitions village status (thriving/stable/struggling/collapsed)
 * based on population and resource levels, emitting 'village:status_changed'
 * when a transition occurs.
 *
 * Priority: 195 (after VillageGovernanceSystem at 52, alongside NationSystem)
 * Throttle: 200 ticks (10 seconds)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { VillageComponent } from '../components/VillageComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { VillageGovernanceComponent } from '../components/VillageGovernanceComponent.js';

/** Radius in tiles to scan for agents belonging to a village. */
const VILLAGE_AGENT_SCAN_RADIUS = 150;

/** Population thresholds for status transitions. */
const POPULATION_THRIVING = 20;
const POPULATION_STRUGGLING = 5;

/** Resource score thresholds for status transitions. */
const RESOURCE_THRIVING_MIN = 100;
const RESOURCE_STRUGGLING_MAX = 10;

export class VillageSummarySystem extends BaseSystem {
  public readonly id: SystemId = 'village_summary';
  public readonly priority: number = 195;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Village as ComponentType];
  public readonly activationComponents = [CT.Village as ComponentType] as const;

  protected readonly throttleInterval: number = 200; // 10 seconds

  protected onUpdate(ctx: SystemContext): void {
    const villages = ctx.world.query().with(CT.Village as ComponentType).executeEntities();

    if (villages.length === 0) {
      return;
    }

    for (const villageEntity of villages) {
      const village = villageEntity.getComponent<VillageComponent>('village');
      if (!village) {
        continue;
      }

      // Only aggregate for non-detailed villages
      if (village.abstractionLevel === 'detailed') {
        continue;
      }

      this.aggregateVillageSummary(ctx, villageEntity, village);
    }
  }

  private aggregateVillageSummary(
    ctx: SystemContext,
    villageEntity: Entity,
    village: VillageComponent
  ): void {
    // Find agents near the village position
    const nearbyResults = ctx.getNearbyEntities(
      village.position,
      VILLAGE_AGENT_SCAN_RADIUS,
      [CT.Agent as ComponentType]
    );

    let totalMood = 0;
    let agentCount = 0;
    const resources: Record<string, number> = {};

    for (const { entity: agentEntity } of nearbyResults) {
      agentCount++;

      // Aggregate mood (currentMood is -100 to 100, normalize to 0-1)
      const mood = agentEntity.getComponent<MoodComponent>('mood');
      if (mood && typeof mood.currentMood === 'number') {
        totalMood += (mood.currentMood + 100) / 200;
      }

      // Aggregate inventory resources
      const inventory = agentEntity.getComponent<InventoryComponent>('inventory');
      if (inventory && Array.isArray(inventory.slots)) {
        for (const slot of inventory.slots) {
          if (slot.itemId !== null && slot.quantity > 0) {
            const current = resources[slot.itemId] ?? 0;
            resources[slot.itemId] = current + slot.quantity;
          }
        }
      }
    }

    const avgMood = agentCount > 0 ? totalMood / agentCount : 0.5;

    // Get governance info for leader and government type
    let governmentType = village.summary.governmentType;
    let leaderName = village.summary.leaderName;
    const governance = villageEntity.getComponent<VillageGovernanceComponent>('village_governance');
    if (governance) {
      governmentType = governance.governanceType;
    }

    // Compute total resource score for status
    const totalResources = Object.values(resources).reduce((sum, v) => sum + v, 0);

    // Determine new status
    const newStatus = this.computeStatus(agentCount, totalResources, village.status);

    // Update summary
    (villageEntity as EntityImpl).updateComponent<VillageComponent>('village', (prev) => ({
      ...prev,
      summary: {
        ...prev.summary,
        population: agentCount,
        avgMood,
        resources,
        governmentType,
        leaderName,
        gdp: totalResources * 10, // Simple GDP proxy
        tradeBalance: prev.summary.tradeBalance,
      },
      status: newStatus,
      collapsedTick:
        newStatus === 'collapsed' && prev.status !== 'collapsed'
          ? ctx.tick
          : prev.collapsedTick,
    }));

    // Emit status change event
    if (newStatus !== village.status) {
      ctx.emit('village:status_changed', {
        villageId: village.villageId,
        villageName: village.name,
        oldStatus: village.status,
        newStatus,
        tick: ctx.tick,
      });
    }
  }

  private computeStatus(
    population: number,
    totalResources: number,
    currentStatus: VillageComponent['status']
  ): VillageComponent['status'] {
    // Once collapsed or ruins, require manual intervention to recover
    if (currentStatus === 'ruins') {
      return 'ruins';
    }
    if (currentStatus === 'collapsed' && population === 0) {
      return 'ruins';
    }

    if (population === 0) {
      return 'collapsed';
    }

    if (population >= POPULATION_THRIVING && totalResources >= RESOURCE_THRIVING_MIN) {
      return 'thriving';
    }

    if (population <= POPULATION_STRUGGLING || totalResources <= RESOURCE_STRUGGLING_MAX) {
      return 'struggling';
    }

    return 'stable';
  }
}

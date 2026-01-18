/**
 * Factory AI System
 *
 * Autonomous management of factory cities.
 * Makes decisions to keep production running smoothly.
 *
 * Priority: 48 (runs before off-screen optimization at 49)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type {
  FactoryAIComponent,
  FactoryStats,
} from '../components/FactoryAIComponent.js';
import {
  recordDecision,
  requestResource,
  detectBottleneck,
  clearResolvedBottlenecks,
  calculateFactoryHealth,
} from '../components/FactoryAIComponent.js';
import type { AssemblyMachineComponent } from '../components/AssemblyMachineComponent.js';
import type { MachineConnectionComponent } from '../components/MachineConnectionComponent.js';
import type { PowerComponent } from '../components/PowerComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

export class FactoryAISystem extends BaseSystem {
  public readonly id = 'factory_ai';
  public readonly priority = 48; // Before off-screen optimization
  public readonly requiredComponents = [CT.FactoryAI] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  /**
   * Main update loop
   */
  protected onUpdate(ctx: SystemContext): void {
    // Entities are pre-filtered by requiredComponents and SimulationScheduler
    const factoryAIs = ctx.activeEntities;

    for (const factoryEntity of factoryAIs) {
      const ai = factoryEntity.getComponent<FactoryAIComponent>(CT.FactoryAI);
      if (!ai) continue;

      // Check if it's time for AI to think
      const shouldThink = ctx.tick - ai.lastDecisionTick >= ai.decisionInterval;
      if (!shouldThink) continue;

      ai.lastDecisionTick = ctx.tick;

      // Gather factory statistics
      this.updateFactoryStats(ctx, factoryEntity, ai, ctx.activeEntities);

      // Detect bottlenecks
      this.detectBottlenecks(ctx, factoryEntity, ai, ctx.activeEntities);

      // Clean up resolved bottlenecks
      clearResolvedBottlenecks(ai);

      // Update health status
      ai.health = calculateFactoryHealth(ai);

      // Make decisions based on current state
      this.makeDecisions(ctx, factoryEntity, ai, ctx.activeEntities);
    }
  }

  /**
   * Update factory statistics
   */
  private updateFactoryStats(
    _ctx: SystemContext,
    _factoryEntity: EntityImpl,
    ai: FactoryAIComponent,
    allEntities: ReadonlyArray<EntityImpl>
  ): void {
    const stats: FactoryStats = {
      totalMachines: 0,
      activeMachines: 0,
      idleMachines: 0,
      totalInputsPerMinute: 0,
      totalOutputsPerMinute: 0,
      efficiency: 0,
      powerGeneration: 0,
      powerConsumption: 0,
      powerEfficiency: 0,
      beltUtilization: 0,
      logisticsBottlenecks: 0,
      inputStockpileDays: 0,
      outputStorageUtilization: 0,
    };

    // TODO: Get factory bounds from factoryEntity
    // For now, assume all entities within some radius belong to this factory
    const factoryEntities = allEntities; // Simplified

    // Count machines and power
    let totalPowerProduction = 0;
    let totalPowerDemand = 0;
    let machinesCrafting = 0;

    for (const entity of factoryEntities) {
      // Assembly machines
      const assembly = entity.getComponent<AssemblyMachineComponent>(CT.AssemblyMachine);
      if (assembly) {
        stats.totalMachines++;
        if (assembly.progress > 0) {
          machinesCrafting++;
        }
      }

      // Power
      const power = entity.getComponent<PowerComponent>(CT.Power);
      if (power) {
        if (power.role === 'producer') {
          totalPowerProduction += power.generation || 0;
        } else if (power.role === 'consumer') {
          totalPowerDemand += power.consumption || 0;
          if (power.isPowered) {
            stats.activeMachines++;
          }
        }
      }
    }

    stats.idleMachines = stats.totalMachines - machinesCrafting;
    stats.powerGeneration = totalPowerProduction;
    stats.powerConsumption = totalPowerDemand;
    stats.powerEfficiency = totalPowerDemand > 0 ? Math.min(1.0, totalPowerProduction / totalPowerDemand) : 1.0;
    stats.efficiency = stats.totalMachines > 0 ? machinesCrafting / stats.totalMachines : 0;

    // Calculate production rates (simplified)
    // TODO: Actually track items produced/consumed per minute
    stats.totalOutputsPerMinute = machinesCrafting * 2; // Rough estimate

    ai.stats = stats;
  }

  /**
   * Detect production bottlenecks
   */
  private detectBottlenecks(
    _ctx: SystemContext,
    _factoryEntity: EntityImpl,
    ai: FactoryAIComponent,
    allEntities: ReadonlyArray<EntityImpl>
  ): void {
    const { stats } = ai;

    // Power bottleneck
    if (stats.powerEfficiency < ai.minPowerEfficiency) {
      const severity = 1.0 - stats.powerEfficiency;
      detectBottleneck(
        ai,
        'power',
        severity,
        'power_grid',
        `Add ${Math.ceil((stats.powerConsumption - stats.powerGeneration) / 1000)}MW generation`
      );
    }

    // Machine idle bottleneck
    if (stats.efficiency < 0.5 && stats.idleMachines > stats.totalMachines * 0.3) {
      const severity = 1.0 - stats.efficiency;
      detectBottleneck(
        ai,
        'input',
        severity,
        'input_supply',
        'Request more input materials from logistics'
      );
    }

    // Check individual machines for output blockage
    for (const entity of allEntities) {
      const assembly = entity.getComponent<AssemblyMachineComponent>(CT.AssemblyMachine);
      const connection = entity.getComponent<MachineConnectionComponent>(CT.MachineConnection);

      if (assembly && connection) {
        // Output buffer full?
        const outputSlot = connection.outputs[0];
        if (outputSlot && outputSlot.items.length >= outputSlot.capacity) {
          detectBottleneck(
            ai,
            'output',
            0.8,
            entity.id,
            'Output buffer full - expand storage or add more transport'
          );
        }

        // Input buffer empty but machine not crafting?
        const inputSlot = connection.inputs[0];
        if (inputSlot && inputSlot.items.length === 0 && assembly.progress === 0) {
          detectBottleneck(
            ai,
            'input',
            0.6,
            entity.id,
            `No ${assembly.currentRecipe} ingredients - request from logistics`,
            assembly.currentRecipe
          );
        }
      }
    }
  }

  /**
   * Make AI decisions to improve factory performance
   */
  private makeDecisions(
    ctx: SystemContext,
    factoryEntity: EntityImpl,
    ai: FactoryAIComponent,
    _allEntities: ReadonlyArray<EntityImpl>
  ): void {
    const { goal, stats, bottlenecks } = ai;

    // Emergency mode: Power critical
    if (stats.powerEfficiency < 0.3) {
      this.handlePowerCrisis(ctx, factoryEntity, ai);
      return;
    }

    // Sort bottlenecks by severity
    const sortedBottlenecks = [...bottlenecks].sort((a, b) => b.severity - a.severity);

    // Address top 3 bottlenecks
    for (const bottleneck of sortedBottlenecks.slice(0, 3)) {
      if (bottleneck.severity < 0.3) continue; // Not severe enough

      switch (bottleneck.type) {
        case 'power':
          this.requestMorePower(ctx, factoryEntity, ai);
          break;

        case 'input':
          this.requestInputMaterials(ctx, factoryEntity, ai, bottleneck);
          break;

        case 'output':
          this.handleOutputBacklog(ctx, factoryEntity, ai);
          break;

        case 'transport':
          this.optimizeTransport(ctx, factoryEntity, ai);
          break;
      }
    }

    // Goal-specific decisions
    switch (goal) {
      case 'maximize_output':
        if (stats.efficiency > 0.9 && ai.allowExpansion) {
          this.considerExpansion(ctx, factoryEntity, ai);
        }
        break;

      case 'efficiency':
        if (stats.powerEfficiency < 0.95) {
          this.optimizePowerUsage(ctx, factoryEntity, ai);
        }
        break;

      case 'stockpile':
        if (stats.inputStockpileDays < ai.minStockpileDays) {
          this.buildStockpile(ctx, factoryEntity, ai);
        }
        break;

      case 'emergency':
        this.runEmergencyMode(ctx, factoryEntity, ai);
        break;
    }
  }

  /**
   * Handle power crisis
   */
  private handlePowerCrisis(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    const powerShortfall = ai.stats.powerConsumption - ai.stats.powerGeneration;

    recordDecision(
      ai,
      'emergency_mode',
      `Power crisis: ${powerShortfall.toFixed(0)}kW shortfall`,
      { powerShortfall },
      'Shutdown non-critical machines to stabilize power grid',
      1.0
    );

    // Request emergency power
    requestResource(
      ai,
      'power_cell',
      Math.ceil(powerShortfall / 100),
      'critical',
      'Emergency power to prevent factory shutdown'
    );
  }

  /**
   * Request more power generation
   */
  private requestMorePower(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    const powerNeeded = Math.ceil((ai.stats.powerConsumption - ai.stats.powerGeneration) / 1000);

    recordDecision(
      ai,
      'request_resources',
      `Power deficit: need ${powerNeeded}MW more generation`,
      { powerNeeded },
      'Improved power efficiency',
      0.8
    );

    requestResource(
      ai,
      'solar_panel',
      powerNeeded * 2, // 2 solar panels per MW
      'high',
      'Power grid expansion'
    );
  }

  /**
   * Request input materials
   */
  private requestInputMaterials(
    _ctx: SystemContext,
    _factoryEntity: EntityImpl,
    ai: FactoryAIComponent,
    bottleneck: any
  ): void {
    const itemNeeded = bottleneck.affectedItem || 'unknown';
    const urgency = bottleneck.severity > 0.7 ? 'critical' : 'high';

    // Calculate how much we need based on production rate
    const hoursOfProduction = 2;
    const quantityNeeded = Math.ceil(ai.stats.totalOutputsPerMinute * 60 * hoursOfProduction);

    recordDecision(
      ai,
      'request_resources',
      `Input shortage: ${itemNeeded} (severity ${(bottleneck.severity * 100).toFixed(0)}%)`,
      { itemNeeded, quantityNeeded },
      `Restore production to ${(ai.stats.efficiency * 100).toFixed(0)}% efficiency`,
      bottleneck.severity
    );

    requestResource(
      ai,
      itemNeeded,
      quantityNeeded,
      urgency,
      'Input material shortage affecting production'
    );
  }

  /**
   * Handle output storage backlog
   */
  private handleOutputBacklog(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    recordDecision(
      ai,
      'adjust_production',
      'Output storage at capacity',
      { utilization: ai.stats.outputStorageUtilization },
      'Reduce production rate until storage clears',
      0.6
    );

    // Could slow down production or request storage expansion
    if (ai.allowExpansion) {
      requestResource(
        ai,
        'storage_chest',
        10,
        'normal',
        'Expand output storage capacity'
      );
    }
  }

  /**
   * Optimize transport (belts/logistics)
   */
  private optimizeTransport(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    recordDecision(
      ai,
      'optimize_layout',
      'Transport bottleneck detected',
      {},
      'Improve item flow through factory',
      0.5
    );

    // Could request faster belts or more logistics bots
    requestResource(
      ai,
      'belt_tier_3',
      20,
      'normal',
      'Upgrade belt network for higher throughput'
    );
  }

  /**
   * Consider factory expansion
   */
  private considerExpansion(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    if (!ai.allowExpansion) return;

    recordDecision(
      ai,
      'expand_storage',
      `Factory running at ${(ai.stats.efficiency * 100).toFixed(0)}% efficiency`,
      {},
      'Expand production capacity',
      0.3
    );

    // Request materials for expansion
    requestResource(
      ai,
      'assembly_machine_iii',
      5,
      'low',
      'Factory expansion - add more production lines'
    );
  }

  /**
   * Optimize power usage
   */
  private optimizePowerUsage(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    recordDecision(
      ai,
      'balance_power',
      'Power efficiency suboptimal',
      { efficiency: ai.stats.powerEfficiency },
      'Better power distribution',
      0.4
    );

    // Could install efficiency modules or rebalance loads
  }

  /**
   * Build up stockpile reserves
   */
  private buildStockpile(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    recordDecision(
      ai,
      'request_resources',
      `Stockpile low: ${ai.stats.inputStockpileDays.toFixed(1)} days remaining`,
      { targetDays: ai.minStockpileDays },
      'Build up input reserves',
      0.5
    );

    // Request bulk materials
    for (const outputItem of ai.primaryOutputs) {
      requestResource(
        ai,
        `${outputItem}_input`, // Placeholder
        1000,
        'normal',
        'Stockpile reserves'
      );
    }
  }

  /**
   * Run in emergency mode
   */
  private runEmergencyMode(_ctx: SystemContext, _factoryEntity: EntityImpl, ai: FactoryAIComponent): void {
    // In emergency, only produce critical items
    recordDecision(
      ai,
      'emergency_mode',
      'Factory in emergency mode',
      {},
      'Focus on critical production only',
      1.0
    );

    // Shutdown non-critical machines to save power
    // Prioritize essential outputs
  }
}

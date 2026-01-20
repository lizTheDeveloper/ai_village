/**
 * EmpireSystem - Multi-planet imperial governance processing
 *
 * This system handles:
 * - Empire resource aggregation from member nations
 * - Empire-level decision processing (diplomatic, economic, military)
 * - Empire-nation relationship management
 * - Imperial stability and vassal loyalty tracking
 * - Dynasty succession and separatist movements
 * - Treaty execution and war resolution
 *
 * Priority: 200 (governance tier, after agent/combat but before economy)
 *
 * Per 06-POLITICAL-HIERARCHY.md:
 * - Empires unite multiple nations under imperial authority
 * - Population: 100M-50B across multiple planets
 * - Time Scale: 1 year/tick (abstract simulation)
 * - Central government vs peripheral autonomy creates tension
 *
 * STUB IMPLEMENTATION:
 * This is a minimal stub system to enable empire components to be processed.
 * Complex logic (AI diplomacy, war resolution, dynasty succession) marked with TODOs.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EmpireComponent, EmpireNationRecord, SeparatistMovement } from '../components/EmpireComponent.js';
import type { NationComponent } from '../components/NationComponent.js';
import type { NavyComponent } from '../components/NavyComponent.js';
import { selectHeir, handleSuccessionCrisis, executeSuccession } from './EmpireDynastyManager.js';
import type { AgentComponent } from '../components/AgentComponent.js';

// ============================================================================
// System
// ============================================================================

export class EmpireSystem extends BaseSystem {
  public readonly id: SystemId = 'empire' as SystemId;
  public readonly priority: number = 200;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Empire];
  public readonly activationComponents = ['empire'] as const;
  public readonly metadata = {
    category: 'economy' as const,  // Governance systems use 'economy' category
    description: 'Processes multi-planet imperial governance',
    dependsOn: [] as SystemId[],
    writesComponents: [CT.Empire, CT.Nation] as const,
  } as const;

  // Update interval: 6000 ticks = 5 minutes at 20 TPS (annual imperial cycle)
  protected readonly throttleInterval = 6000;

  // ========================================================================
  // State
  // ========================================================================

  private empireLastUpdateTick: Map<string, number> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each empire
    for (const empireEntity of ctx.activeEntities) {
      const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!empire) continue;

      // Check if annual update is due
      const lastUpdate = this.empireLastUpdateTick.get(empire.empireName) || 0;
      const timeSinceLastUpdate = tick - lastUpdate;

      if (timeSinceLastUpdate >= this.throttleInterval) {
        this.processEmpireAnnualUpdate(ctx.world, empireEntity as EntityImpl, tick);
        this.empireLastUpdateTick.set(empire.empireName, tick);
      }
    }
  }

  // ========================================================================
  // Annual Empire Update
  // ========================================================================

  /**
   * Process empire's annual update cycle
   *
   * This stub implementation covers:
   * - Aggregate nation statistics
   * - Update empire resources
   * - Track vassal loyalty
   * - Monitor separatist movements
   * - Emit state change events
   *
   * TODO: Add complex logic for:
   * - AI diplomatic decision-making
   * - War resolution mechanics
   * - Dynasty succession events
   * - Treaty execution
   * - Research completion
   */
  private processEmpireAnnualUpdate(world: World, empireEntity: EntityImpl, tick: number): void {
    const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
    if (!empire) return;

    // Step 1: Aggregate nation data
    const nationRecords = this.aggregateNationData(world, empire);

    // Step 2: Calculate empire totals
    const empireStats = this.calculateEmpireStatistics(world, empire, nationRecords);

    // Step 3: Update vassal loyalty
    const avgVassalLoyalty = this.updateVassalLoyalty(empire, nationRecords);

    // Step 4: Process separatist movements
    this.processSeparatistMovements(world, empire, empireEntity, tick);

    // Step 5: Process dynasty succession (if ruler died)
    this.processDynastySuccession(world, empire, empireEntity, tick);

    // Step 6: Update empire component
    empireEntity.updateComponent<EmpireComponent>(CT.Empire, (e) => ({
      ...e,
      territory: {
        ...e.territory,
        totalPopulation: empireStats.totalPopulation,
        totalArea: empireStats.totalArea,
      },
      economy: {
        ...e.economy,
        gdp: empireStats.totalGDP,
      },
      military: {
        ...e.military,
        totalFleets: empireStats.totalFleets,
        totalShips: empireStats.totalShips,
      },
      vassalLoyalty: avgVassalLoyalty,
      nationRecords,
      lastImperialUpdateTick: tick,
    }));

    // Step 6: Emit update event
    world.eventBus.emit({
      type: 'empire:annual_update',
      source: empireEntity.id,
      data: {
        empireName: empire.empireName,
        totalPopulation: empireStats.totalPopulation,
        totalGDP: empireStats.totalGDP,
        vassalLoyalty: avgVassalLoyalty,
        separatistMovements: empire.separatistMovements.length,
        tick,
      },
    });
  }

  // ========================================================================
  // Nation Aggregation
  // ========================================================================

  /**
   * Aggregate data from all member nations
   *
   * Queries all nation entities and builds empire nation records
   */
  private aggregateNationData(world: World, empire: EmpireComponent): EmpireNationRecord[] {
    const records: EmpireNationRecord[] = [];

    // Get all nation entities
    const nationEntities = world.query().with(CT.Nation).executeEntities();

    for (const nationEntity of nationEntities) {
      const nation = nationEntity.getComponent<NationComponent>(CT.Nation);
      if (!nation) continue;

      // Only include nations that belong to this empire
      if (!empire.territory.nations.includes(nation.nationName)) {
        continue;
      }

      // Create or update nation record
      const isCore = empire.territory.coreNationIds.includes(nation.nationName);
      const autonomy = empire.autonomyLevels.get(nation.nationName) ?? 0.5;

      const record: EmpireNationRecord = {
        nationId: nation.nationName,
        nationName: nation.nationName,
        population: nation.population,
        gdp: nation.economy.gdp,
        isCore,
        autonomyLevel: autonomy,
        tributePaid: 0, // Will be calculated in tribute collection
        militaryContribution: nation.military.armyStrength,
        loyaltyToEmpire: this.calculateNationLoyalty(nation, empire, autonomy),
        lastUpdateTick: world.tick,
      };

      records.push(record);
    }

    return records;
  }

  /**
   * Calculate a nation's loyalty to the empire
   *
   * Factors:
   * - Legitimacy of empire
   * - Autonomy level (higher autonomy = higher loyalty)
   * - Nation stability
   * - Treaty relationships
   *
   * TODO: Add more sophisticated loyalty calculation (cultural affinity, historical relations, etc.)
   */
  private calculateNationLoyalty(
    nation: NationComponent,
    empire: EmpireComponent,
    autonomy: number
  ): number {
    // Base loyalty from nation's own stability
    let loyalty = nation.legitimacy * 0.4;

    // Autonomy increases loyalty (nations like independence)
    loyalty += autonomy * 0.3;

    // Empire's central authority affects loyalty (too much control = resentment)
    const authorityPressure = empire.centralAuthority;
    if (authorityPressure > autonomy) {
      // Empire is too controlling for this nation's autonomy level
      loyalty -= (authorityPressure - autonomy) * 0.2;
    } else {
      // Empire respects nation's autonomy
      loyalty += 0.1;
    }

    // Nation at war reduces loyalty (needs imperial protection)
    if (nation.military.warStatus === 'at_war') {
      loyalty -= 0.1;
    }

    // Clamp to 0-1
    return Math.max(0, Math.min(1, loyalty));
  }

  // ========================================================================
  // Empire Statistics
  // ========================================================================

  /**
   * Calculate aggregate empire statistics from nation records
   */
  private calculateEmpireStatistics(
    world: World,
    empire: EmpireComponent,
    nationRecords: EmpireNationRecord[]
  ): {
    totalPopulation: number;
    totalGDP: number;
    totalArea: number;
    totalFleets: number;
    totalShips: number;
  } {
    let totalPopulation = 0;
    let totalGDP = 0;
    let totalArea = 0;
    let totalFleets = 0;
    let totalShips = 0;

    for (const record of nationRecords) {
      totalPopulation += record.population;
      totalGDP += record.gdp;
      // Area calculation would require nation territory data
      // For now, estimate based on population (1 person per 100 km²)
      totalArea += record.population * 100;
    }

    // Calculate actual fleet/ship counts from Navy components
    const { fleetCount, shipCount } = this.calculateNavyStrength(world, empire);
    totalFleets = fleetCount;
    totalShips = shipCount;

    return {
      totalPopulation,
      totalGDP,
      totalArea,
      totalFleets,
      totalShips,
    };
  }

  // ========================================================================
  // Vassal Loyalty
  // ========================================================================

  /**
   * Update vassal loyalty and calculate average
   */
  private updateVassalLoyalty(
    empire: EmpireComponent,
    nationRecords: EmpireNationRecord[]
  ): number {
    const vassalRecords = nationRecords.filter((r) => !r.isCore);

    if (vassalRecords.length === 0) {
      return 1.0; // No vassals = perfect loyalty
    }

    const totalLoyalty = vassalRecords.reduce((sum, r) => sum + r.loyaltyToEmpire, 0);
    return totalLoyalty / vassalRecords.length;
  }

  // ========================================================================
  // Separatist Movements
  // ========================================================================

  /**
   * Process separatist movements
   *
   * STUB: Basic movement strength tracking
   *
   * TODO: Add full separatist mechanics:
   * - Movement formation based on low loyalty
   * - Military suppression options
   * - Negotiation and autonomy grants
   * - Independence declaration events
   */
  private processSeparatistMovements(
    world: World,
    empire: EmpireComponent,
    empireEntity: EntityImpl,
    tick: number
  ): void {
    for (const movement of empire.separatistMovements) {
      // Skip completed movements
      if (movement.status === 'crushed' || movement.status === 'successful') {
        continue;
      }

      // Very basic strength evolution
      if (movement.status === 'brewing') {
        // Check if movement should become active
        if (movement.strength > 0.5) {
          movement.status = 'active';

          world.eventBus.emit({
            type: 'empire:separatist_movement_active',
            source: empireEntity.id,
            data: {
              empireName: empire.empireName,
              movementId: movement.id,
              movementName: movement.name,
              strength: movement.strength,
              tick,
            },
          });
        }
      }

      // TODO: Add negotiation, suppression, and independence mechanics
    }
  }

  // ========================================================================
  // Dynasty Succession
  // ========================================================================

  /**
   * Process dynasty succession when ruler dies or abdicates
   *
   * Integrated from EmpireDynastyManager
   */
  private processDynastySuccession(
    world: World,
    empire: EmpireComponent,
    empireEntity: EntityImpl,
    tick: number
  ): void {
    // Check if empire has a dynasty
    if (!empire.rulingDynasty) {
      return;
    }

    // Check if current ruler is alive
    const currentRulerId = empire.rulingDynasty.currentRulerId;
    if (!currentRulerId) {
      return;
    }

    const rulerEntity = world.getEntity(currentRulerId);
    if (!rulerEntity) {
      // Ruler entity not found - succession crisis
      this.triggerSuccession(world, empire, empireEntity, tick, 'ruler_missing');
      return;
    }

    // Check if ruler is dead (no Agent component or health component shows death)
    const agent = rulerEntity.getComponent<AgentComponent>(CT.Agent);
    if (!agent || agent.isDead) {
      // Ruler died - trigger succession
      this.triggerSuccession(world, empire, empireEntity, tick, 'ruler_death');
    }
  }

  /**
   * Trigger succession process
   */
  private triggerSuccession(
    world: World,
    empire: EmpireComponent,
    empireEntity: EntityImpl,
    tick: number,
    reason: string
  ): void {
    if (!empire.rulingDynasty) {
      return;
    }

    // Select heir based on succession law
    const successionResult = selectHeir(
      world,
      empire.rulingDynasty.dynastyId,
      empire.rulingDynasty.currentRulerId,
      empire.successionLaw,
      tick
    );

    // Emit heir selected event
    if (successionResult.heir) {
      world.eventBus.emit({
        type: 'empire:heir_selected',
        source: empireEntity.id,
        data: {
          empireName: empire.empireName,
          heirId: successionResult.heir.agentId,
          heirName: successionResult.heir.agentName,
          legitimacy: successionResult.heir.legitimacy,
          reason,
          tick,
        },
      });

      // Execute succession
      executeSuccession(world, empireEntity, empire.empireName, successionResult.heir.agentId, tick);

      // Update empire component with new ruler
      empireEntity.updateComponent<EmpireComponent>(CT.Empire, (current) => {
        if (!current.rulingDynasty) {
          return current;
        }

        return {
          ...current,
          rulingDynasty: {
            ...current.rulingDynasty,
            currentRulerId: successionResult.heir!.agentId,
            rulers: [
              ...current.rulingDynasty.rulers,
              {
                agentId: successionResult.heir!.agentId,
                name: successionResult.heir!.agentName,
                title: `Emperor ${successionResult.heir!.agentName}`,
                reignStart: tick,
                achievements: [],
                failings: [],
              },
            ],
          },
        };
      });
    }

    // Handle succession crisis
    if (successionResult.crisis) {
      handleSuccessionCrisis(
        world,
        empireEntity,
        empire.empireName,
        successionResult.crisisReason || 'unknown',
        tick
      );
    }
  }

  // ========================================================================
  // Navy Strength Calculation
  // ========================================================================

  /**
   * Calculate total fleet and ship counts from Navy components
   *
   * Queries all NavyComponent entities and sums up totals for nations
   * that belong to this empire.
   */
  private calculateNavyStrength(
    world: World,
    empire: EmpireComponent
  ): { fleetCount: number; shipCount: number } {
    let fleetCount = 0;
    let shipCount = 0;

    // Get all navy entities
    const navyEntities = world.query().with(CT.Navy).executeEntities();

    for (const navyEntity of navyEntities) {
      const navy = navyEntity.getComponent<NavyComponent>(CT.Navy);
      if (!navy) continue;

      // Check if this navy belongs to a nation in this empire
      if (empire.territory.nations.includes(navy.factionId)) {
        // Sum fleet and ship counts from navy assets
        fleetCount += navy.assets.totalFleets;
        shipCount += navy.assets.totalShips;
      }
    }

    return { fleetCount, shipCount };
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Get all nation entities belonging to an empire
   */
  public getEmpireNations(world: World, empireId: string): NationComponent[] {
    const empire = world
      .query()
      .with(CT.Empire)
      .executeEntities()
      .map((e) => e.getComponent<EmpireComponent>(CT.Empire))
      .find((e) => e && e.empireName === empireId);

    if (!empire) return [];

    const nationEntities = world.query().with(CT.Nation).executeEntities();

    return nationEntities
      .map((e) => e.getComponent<NationComponent>(CT.Nation))
      .filter((n) => n && empire.territory.nations.includes(n.nationName)) as NationComponent[];
  }

  /**
   * Calculate total empire military strength
   *
   * Sum of all nation military contributions
   */
  public calculateEmpireStrength(empire: EmpireComponent): number {
    let strength = 0;

    // Military strength from armies
    for (const record of empire.nationRecords) {
      strength += record.militaryContribution;
    }

    // Naval strength from navies
    strength += empire.military.totalShips * 10; // Each ship counts as 10 army units

    return strength;
  }

  /**
   * Add a nation to the empire
   *
   * Creates a vassal relationship with specified autonomy
   */
  public addNationToEmpire(
    world: World,
    empireId: string,
    nationId: string,
    autonomy: number,
    isCore: boolean = false
  ): void {
    const empireEntity = world
      .query()
      .with(CT.Empire)
      .executeEntities()
      .find((e) => {
        const emp = e.getComponent<EmpireComponent>(CT.Empire);
        return emp && emp.empireName === empireId;
      });

    if (!empireEntity) {
      throw new Error(`Empire ${empireId} not found`);
    }

    const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
    if (!empire) return;

    // Add to appropriate list
    if (isCore) {
      if (!empire.territory.coreNationIds.includes(nationId)) {
        empire.territory.coreNationIds.push(nationId);
      }
    } else {
      if (!empire.territory.vassalNationIds.includes(nationId)) {
        empire.territory.vassalNationIds.push(nationId);
      }
    }

    // Add to general nations list
    if (!empire.territory.nations.includes(nationId)) {
      empire.territory.nations.push(nationId);
    }

    // Set autonomy level
    empire.autonomyLevels.set(nationId, autonomy);

    // Emit event
    world.eventBus.emit({
      type: 'empire:nation_added',
      source: empireEntity.id,
      data: {
        empireName: empire.empireName,
        nationId,
        isCore,
        autonomy,
        tick: world.tick,
      },
    });
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: EmpireSystem | null = null;

export function getEmpireSystem(): EmpireSystem {
  if (!systemInstance) {
    systemInstance = new EmpireSystem();
  }
  return systemInstance;
}

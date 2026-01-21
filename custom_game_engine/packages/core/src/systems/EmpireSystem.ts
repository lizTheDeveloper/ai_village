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
import type { EventBus } from '../events/EventBus.js';
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

  /**
   * Initialize event listeners
   */
  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // === Governor Decision Events ===
    // React to governor decisions being executed
    this.events.on('empire:war_declared', (data) => {
      this._onWarDeclared(data);
    });

    this.events.on('empire:nation_absorbed', (data) => {
      this._onNationAbsorbed(data);
    });

    this.events.on('empire:nation_released', (data) => {
      this._onNationReleased(data);
    });

    this.events.on('empire:resources_allocated', (data) => {
      this._onResourcesAllocated(data);
    });

    this.events.on('governance:directive_issued', (data) => {
      this._onDirectiveIssued(data);
    });
  }

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

      // Process active movement mechanics
      if (movement.status === 'active') {
        // Empire response depends on strength relative to empire resources
        const empireResponse = this.calculateEmpireResponse(world, empire, movement);

        if (empireResponse === 'negotiate') {
          // Begin negotiations if movement is strong enough
          movement.status = 'negotiating';
          this.events.emitGeneric('empire:negotiation_started', {
            empireName: empire.empireName,
            movementId: movement.id,
            movementName: movement.name,
            demands: movement.demands,
            tick,
          });
        } else if (empireResponse === 'suppress') {
          // Military suppression reduces movement strength
          const suppressionEffectiveness = this.calculateSuppressionEffectiveness(world, empire, movement);
          movement.strength = Math.max(0, movement.strength - suppressionEffectiveness);

          this.events.emitGeneric('empire:separatist_suppression', {
            empireName: empire.empireName,
            movementId: movement.id,
            movementName: movement.name,
            suppressionEffectiveness,
            newStrength: movement.strength,
            tick,
          });

          // Check if movement is crushed
          if (movement.strength <= 0.1) {
            movement.status = 'crushed';
            this.events.emitGeneric('empire:separatist_movement_crushed', {
              empireName: empire.empireName,
              movementId: movement.id,
              movementName: movement.name,
              tick,
            });
          }
        }

        // Movement strength grows while unresolved (popular support)
        movement.strength = Math.min(1.0, movement.strength + 0.02);

        // Check for successful independence
        if (movement.strength >= 1.0) {
          movement.status = 'successful';
          this.processIndependenceDeclaration(world, empire, empireEntity, movement, tick);
        }
      }

      // Process ongoing negotiations
      if (movement.status === 'negotiating') {
        // Negotiations can succeed (autonomy granted) or fail (return to active)
        const negotiationOutcome = this.processNegotiation(world, empire, movement, tick);

        if (negotiationOutcome === 'autonomy_granted') {
          // Grant autonomy but keep in empire
          movement.status = 'crushed'; // Marking as resolved
          for (const nationId of movement.nationIds) {
            this.grantAutonomy(world, empire, empireEntity, nationId, tick);
          }
        } else if (negotiationOutcome === 'failed') {
          movement.status = 'active';
          movement.strength = Math.min(1.0, movement.strength + 0.1); // Anger boost
        }
      }
    }
  }

  /**
   * Determine empire's response to a separatist movement
   */
  private calculateEmpireResponse(
    world: World,
    empire: EmpireComponent,
    movement: SeparatistMovement
  ): 'negotiate' | 'suppress' | 'ignore' {
    // Strong movements (>0.7) should be negotiated with
    if (movement.strength > 0.7) {
      return 'negotiate';
    }

    // Moderate movements (0.3-0.7) get suppressed if empire has military strength
    if (movement.strength > 0.3) {
      const { shipCount } = this.calculateNavyStrength(world, empire);
      return shipCount > 0 ? 'suppress' : 'negotiate';
    }

    // Weak movements can be ignored or suppressed
    return 'suppress';
  }

  /**
   * Calculate how effective military suppression will be
   */
  private calculateSuppressionEffectiveness(
    world: World,
    empire: EmpireComponent,
    movement: SeparatistMovement
  ): number {
    const { shipCount } = this.calculateNavyStrength(world, empire);

    // Base effectiveness from military strength (diminishing returns)
    const militaryFactor = Math.min(0.3, shipCount * 0.01);

    // Popularity reduces effectiveness (can't easily suppress popular movements)
    const popularityPenalty = movement.strength * 0.2;

    // Duration penalty (longer movements are harder to crush)
    const durationTicks = world.tick - movement.startedTick;
    const durationPenalty = Math.min(0.1, durationTicks / 100000);

    return Math.max(0.05, militaryFactor - popularityPenalty - durationPenalty);
  }

  /**
   * Process negotiation between empire and separatists
   */
  private processNegotiation(
    world: World,
    empire: EmpireComponent,
    movement: SeparatistMovement,
    tick: number
  ): 'autonomy_granted' | 'failed' | 'ongoing' {
    // Simple negotiation: 30% chance per cycle to reach agreement
    const negotiationDuration = tick - movement.startedTick;

    // Negotiations take time (at least 1000 ticks)
    if (negotiationDuration < 1000) {
      return 'ongoing';
    }

    // Random outcome weighted by movement demands and empire flexibility
    const demandWeight = movement.demands.length * 0.1;
    const successChance = 0.3 - demandWeight;

    if (Math.random() < successChance) {
      return 'autonomy_granted';
    }

    // 20% chance negotiations break down entirely
    if (Math.random() < 0.2) {
      return 'failed';
    }

    return 'ongoing';
  }

  /**
   * Grant autonomy to a nation within the empire
   */
  private grantAutonomy(
    world: World,
    empire: EmpireComponent,
    empireEntity: EntityImpl,
    nationId: string,
    tick: number
  ): void {
    // Update nation record autonomy level
    const nationRecord = empire.nationRecords.find((n: EmpireNationRecord) => n.nationId === nationId);
    if (nationRecord) {
      nationRecord.autonomyLevel = Math.min(1.0, nationRecord.autonomyLevel + 0.3);
      nationRecord.loyaltyToEmpire = Math.min(1.0, nationRecord.loyaltyToEmpire + 0.2);
    }

    this.events.emitGeneric('empire:autonomy_granted', {
      empireName: empire.empireName,
      nationId,
      newAutonomyLevel: nationRecord?.autonomyLevel ?? 0.3,
      tick,
    });
  }

  /**
   * Process independence declaration by a separatist movement
   */
  private processIndependenceDeclaration(
    world: World,
    empire: EmpireComponent,
    empireEntity: EntityImpl,
    movement: SeparatistMovement,
    tick: number
  ): void {
    // Remove nations from empire
    const releasedNationIds: string[] = [];

    for (const nationId of movement.nationIds) {
      const nationIndex = empire.nationRecords.findIndex((n: EmpireNationRecord) => n.nationId === nationId);
      if (nationIndex !== -1) {
        releasedNationIds.push(nationId);
        empire.nationRecords.splice(nationIndex, 1);
      }
    }

    this.events.emitGeneric('empire:independence_declared', {
      empireName: empire.empireName,
      movementId: movement.id,
      movementName: movement.name,
      independentNationIds: releasedNationIds,
      tick,
    });
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
    if (!empire.leadership.dynasty) {
      return;
    }

    // Check if current ruler is alive
    const currentRulerId = empire.leadership.dynasty.currentRulerId;
    if (!currentRulerId) {
      return;
    }

    const rulerEntity = world.getEntity(currentRulerId);
    if (!rulerEntity) {
      // Ruler entity not found - succession crisis
      this.triggerSuccession(world, empire, empireEntity, tick, 'ruler_missing');
      return;
    }

    // Check if ruler is dead (no Agent component or has death_judgment component)
    const agent = rulerEntity.getComponent<AgentComponent>(CT.Agent);
    const hasDied = rulerEntity.hasComponent(CT.DeathJudgment);
    if (!agent || hasDied) {
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
    if (!empire.leadership.dynasty) {
      return;
    }

    // Select heir based on succession law
    const successionResult = selectHeir(
      world,
      empire.leadership.dynasty.dynastyId,
      empire.leadership.dynasty.currentRulerId,
      empire.leadership.successionLaw,
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
        if (!current.leadership.dynasty) {
          return current;
        }

        return {
          ...current,
          leadership: {
            ...current.leadership,
            emperorId: successionResult.heir!.agentId,
            dynasty: {
              ...current.leadership.dynasty,
              currentRulerId: successionResult.heir!.agentId,
              currentRulerAgentId: successionResult.heir!.agentId,
              rulers: [
                ...current.leadership.dynasty.rulers,
                {
                  agentId: successionResult.heir!.agentId,
                  name: successionResult.heir!.agentName,
                  reignStart: tick,
                  achievements: [],
                  failings: [],
                },
              ],
            },
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

  // ========================================================================
  // Event Handlers - Governor Decisions
  // ========================================================================

  /**
   * Handle war declaration (from governor decisions)
   */
  private _onWarDeclared(data: { empireId: string; empireName: string; targetEmpireId: string; targetEmpireName: string; warGoals: string[]; tick: number }): void {
    // War already declared by GovernorDecisionExecutor
    // This is notification-only - war is already in empire component
    // Future: Coordinate nation military mobilization, fleet deployment
  }

  /**
   * Handle nation absorption (from governor decisions)
   */
  private _onNationAbsorbed(data: { empireId: string; empireName: string; nationId: string; nationName: string; tick: number }): void {
    // Nation already absorbed by GovernorDecisionExecutor
    // This is notification-only - nation is already in core territory
    // Future: Trigger integration events, update nation loyalty, assign governors
  }

  /**
   * Handle nation release (from governor decisions)
   */
  private _onNationReleased(data: { empireId: string; empireName: string; nationId: string; nationName: string; tick: number }): void {
    // Nation already released by GovernorDecisionExecutor
    // This is notification-only - nation removed from empire
    // Future: Update diplomatic relations, create independence treaty
  }

  /**
   * Handle resource allocation (from governor decisions)
   */
  private _onResourcesAllocated(data: { empireId: string; empireName: string; targetNationId: string; resourceType: string; amount: number; tick: number }): void {
    // Resources already transferred by GovernorDecisionExecutor
    // This is notification-only - treasuries already updated
    // Future: Track resource flow for economic modeling
  }

  /**
   * Handle directive issuance (from governor decisions)
   */
  private _onDirectiveIssued(data: { directiveId: string; originTier: string; targetTier: string; directive: string; priority: string; targetEntityIds: string[]; tick: number }): void {
    // Directive already issued by DecisionProtocols.delegateDirective()
    // This is notification-only - directives delivered to target entities
    // Future: Track directive compliance, acknowledgment tracking
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

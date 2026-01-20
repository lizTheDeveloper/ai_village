/**
 * ShipCombatSystem - Individual ship-to-ship combat resolution
 *
 * This system handles:
 * - Ship-to-ship combat with multiple phases (range, close, boarding)
 * - Different combat types: weapons fire, coherence disruption, boarding actions
 * - Narrative attacks for story ships
 * - Combat stress affecting crew coherence
 * - Ship capture via boarding and coherence collapse
 *
 * Priority: 620 (combat phase, after squadron combat at 610)
 *
 * Combat Phases:
 * - 'range': Long-range weapons fire (energy weapons, missiles)
 * - 'close': Close-range weapons, coherence attacks
 * - 'boarding': Marines attempt ship capture
 * - 'resolved': Combat concluded
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type { ShipCrewComponent } from '../components/ShipCrewComponent.js';
import { calculateShipCoherence } from '../components/ShipCrewComponent.js';

// ============================================================================
// Types
// ============================================================================

export type CombatPhase = 'range' | 'close' | 'boarding' | 'resolved';

export interface ShipCombatEncounter {
  attackerId: string;
  defenderId: string;
  phase: CombatPhase;
  attackerHullIntegrity: number; // 0-1
  defenderHullIntegrity: number; // 0-1
  attackerCoherence: number; // Combat stress → decoherence
  defenderCoherence: number; // Combat stress → decoherence
  boardingMarines: number; // Marines attempting boarding
  victor?: string;
  destroyed?: string;
  captured?: string;
}

// ============================================================================
// System
// ============================================================================

export class ShipCombatSystem extends BaseSystem {
  public readonly id: SystemId = 'ship_combat' as SystemId;
  public readonly priority: number = 620;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [] as const; // Event-driven, not tick-based
  public readonly metadata = {
    category: 'combat',
    description: 'Resolves individual ship-to-ship combat with phases',
    dependsOn: [],
    writesComponents: [CT.Spaceship, CT.ShipCrew] as const,
  } as const;

  protected readonly throttleInterval = 1; // Process every tick (event-driven)

  // Active combat encounters
  private activeEncounters: Record<string, ShipCombatEncounter> = Object.create(null);

  // Performance caches
  private crewByShipCache: Record<string, ShipCrewComponent[]> = Object.create(null);
  private marinesByShipCache: Record<string, number> = Object.create(null);
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 60; // 3 seconds at 20 TPS

  // GC: Pre-allocated working objects to avoid allocations in hot paths
  private readonly workingHull = { integrity: 0, mass: 0, armor_rating: 0 };
  private readonly workingCrew = { coherence: 0, size: 0, minimum_for_operation: 0, morale: 0 };

  protected onUpdate(ctx: SystemContext): void {
    // This system is event-driven, not tick-based
    // Combat is initiated via initiateShipCombat() calls from other systems
    // For now, no automatic combat processing
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Initiate ship-to-ship combat
   *
   * @param world - Game world
   * @param attackerEntity - Attacking ship entity
   * @param defenderEntity - Defending ship entity
   * @returns ShipCombatEncounter data
   */
  public initiateShipCombat(
    world: World,
    attackerEntity: EntityImpl,
    defenderEntity: EntityImpl
  ): ShipCombatEncounter {
    const attacker = attackerEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    const defender = defenderEntity.getComponent<SpaceshipComponent>(CT.Spaceship);

    if (!attacker || !defender) {
      throw new Error('Both entities must have Spaceship components');
    }

    // Ensure crew cache is fresh
    if (world.tick - this.cacheValidTick > this.CACHE_LIFETIME) {
      this.rebuildCrewCache(world);
      this.cacheValidTick = world.tick;
    }

    // Calculate initial coherence from crew
    const attackerCrew = this.getShipCrew(world, attackerEntity.id);
    const defenderCrew = this.getShipCrew(world, defenderEntity.id);

    const encounter: ShipCombatEncounter = {
      attackerId: attackerEntity.id,
      defenderId: defenderEntity.id,
      phase: 'range',
      attackerHullIntegrity: attacker.hull.integrity,
      defenderHullIntegrity: defender.hull.integrity,
      attackerCoherence: calculateShipCoherence(attackerCrew),
      defenderCoherence: calculateShipCoherence(defenderCrew),
      boardingMarines: 0,
    };

    // Store encounter
    const encounterId = `${attackerEntity.id}:${defenderEntity.id}`;
    this.activeEncounters[encounterId] = encounter;

    // Emit combat started event
    world.eventBus.emit({
      type: 'ship:combat_started',
      source: attackerEntity.id,
      data: {
        attackerId: attackerEntity.id,
        defenderId: defenderEntity.id,
        attackerName: attacker.name,
        defenderName: defender.name,
        phase: 'range',
      },
    });

    return encounter;
  }

  /**
   * Resolve range phase (long-range weapons fire)
   *
   * @param world - Game world
   * @param encounter - Combat encounter data
   * @returns Updated encounter
   */
  public resolveRangePhase(
    world: World,
    encounter: ShipCombatEncounter
  ): ShipCombatEncounter {
    if (encounter.phase !== 'range') {
      throw new Error('Encounter must be in range phase');
    }

    const attackerEntity = world.entities.get(encounter.attackerId) as EntityImpl | undefined;
    const defenderEntity = world.entities.get(encounter.defenderId) as EntityImpl | undefined;

    if (!attackerEntity || !defenderEntity) {
      throw new Error('Combat entities not found');
    }

    const attacker = attackerEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    const defender = defenderEntity.getComponent<SpaceshipComponent>(CT.Spaceship);

    if (!attacker || !defender) {
      throw new Error('Both entities must have Spaceship components');
    }

    // Calculate damage based on firepower vs hull mass
    // Larger ships take less damage from smaller ships
    const attackerFirepower = this.calculateFirepower(attacker, encounter.attackerCoherence);
    const defenderFirepower = this.calculateFirepower(defender, encounter.defenderCoherence);

    const attackerDamage = defenderFirepower / attacker.hull.mass;
    const defenderDamage = attackerFirepower / defender.hull.mass;

    // Apply hull damage
    encounter.attackerHullIntegrity = Math.max(0, encounter.attackerHullIntegrity - attackerDamage);
    encounter.defenderHullIntegrity = Math.max(0, encounter.defenderHullIntegrity - defenderDamage);

    // Apply combat stress to coherence
    encounter.attackerCoherence = Math.max(0, encounter.attackerCoherence - 0.05);
    encounter.defenderCoherence = Math.max(0, encounter.defenderCoherence - 0.05);

    // Update ship components
    this.updateShipState(attackerEntity, attacker, encounter.attackerHullIntegrity, encounter.attackerCoherence);
    this.updateShipState(defenderEntity, defender, encounter.defenderHullIntegrity, encounter.defenderCoherence);

    // Check for destruction
    if (encounter.attackerHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.defenderId;
      encounter.destroyed = encounter.attackerId;
      this.emitShipDestroyed(world, attackerEntity, defender.name);
      return encounter;
    }
    if (encounter.defenderHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.attackerId;
      encounter.destroyed = encounter.defenderId;
      this.emitShipDestroyed(world, defenderEntity, attacker.name);
      return encounter;
    }

    // Advance to close phase
    encounter.phase = 'close';

    world.eventBus.emit({
      type: 'ship:combat_phase_changed',
      source: attackerEntity.id,
      data: {
        attackerId: encounter.attackerId,
        defenderId: encounter.defenderId,
        oldPhase: 'range',
        newPhase: 'close',
        attackerHull: encounter.attackerHullIntegrity,
        defenderHull: encounter.defenderHullIntegrity,
      },
    });

    return encounter;
  }

  /**
   * Resolve close phase (close-range weapons, coherence attacks)
   *
   * @param world - Game world
   * @param encounter - Combat encounter data
   * @returns Updated encounter
   */
  public resolveClosePhase(
    world: World,
    encounter: ShipCombatEncounter
  ): ShipCombatEncounter {
    if (encounter.phase !== 'close') {
      throw new Error('Encounter must be in close phase');
    }

    const attackerEntity = world.entities.get(encounter.attackerId) as EntityImpl | undefined;
    const defenderEntity = world.entities.get(encounter.defenderId) as EntityImpl | undefined;

    if (!attackerEntity || !defenderEntity) {
      throw new Error('Combat entities not found');
    }

    const attacker = attackerEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    const defender = defenderEntity.getComponent<SpaceshipComponent>(CT.Spaceship);

    if (!attacker || !defender) {
      throw new Error('Both entities must have Spaceship components');
    }

    // Close-range weapons fire (higher damage)
    const attackerFirepower = this.calculateFirepower(attacker, encounter.attackerCoherence) * 1.5;
    const defenderFirepower = this.calculateFirepower(defender, encounter.defenderCoherence) * 1.5;

    const attackerDamage = defenderFirepower / attacker.hull.mass;
    const defenderDamage = attackerFirepower / defender.hull.mass;

    encounter.attackerHullIntegrity = Math.max(0, encounter.attackerHullIntegrity - attackerDamage);
    encounter.defenderHullIntegrity = Math.max(0, encounter.defenderHullIntegrity - defenderDamage);

    // Coherence disruption attacks (sabotage enemy coherence)
    const attackerCoherenceAttack = encounter.attackerCoherence * 0.1;
    const defenderCoherenceAttack = encounter.defenderCoherence * 0.1;

    encounter.attackerCoherence = Math.max(0, encounter.attackerCoherence - defenderCoherenceAttack - 0.05);
    encounter.defenderCoherence = Math.max(0, encounter.defenderCoherence - attackerCoherenceAttack - 0.05);

    // Narrative attacks (for story ships)
    if (attacker.ship_type === 'story_ship') {
      const narrativeAttack = attacker.narrative.accumulated_weight * 0.01;
      encounter.defenderCoherence = Math.max(0, encounter.defenderCoherence - narrativeAttack);
    }
    if (defender.ship_type === 'story_ship') {
      const narrativeAttack = defender.narrative.accumulated_weight * 0.01;
      encounter.attackerCoherence = Math.max(0, encounter.attackerCoherence - narrativeAttack);
    }

    // Update ship components
    this.updateShipState(attackerEntity, attacker, encounter.attackerHullIntegrity, encounter.attackerCoherence);
    this.updateShipState(defenderEntity, defender, encounter.defenderHullIntegrity, encounter.defenderCoherence);

    // Check for destruction
    if (encounter.attackerHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.defenderId;
      encounter.destroyed = encounter.attackerId;
      this.emitShipDestroyed(world, attackerEntity, defender.name);
      return encounter;
    }
    if (encounter.defenderHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.attackerId;
      encounter.destroyed = encounter.defenderId;
      this.emitShipDestroyed(world, defenderEntity, attacker.name);
      return encounter;
    }

    // Check for coherence collapse (crew can't function)
    if (encounter.defenderCoherence < 0.3) {
      // Defender vulnerable to capture
      encounter.phase = 'boarding';
      encounter.boardingMarines = this.countMarines(world, encounter.attackerId);

      world.eventBus.emit({
        type: 'ship:combat_phase_changed',
        source: attackerEntity.id,
        data: {
          attackerId: encounter.attackerId,
          defenderId: encounter.defenderId,
          oldPhase: 'close',
          newPhase: 'boarding',
          attackerHull: encounter.attackerHullIntegrity,
          defenderHull: encounter.defenderHullIntegrity,
        },
      });

      return encounter;
    }

    // Advance to boarding phase if attacker chooses
    encounter.phase = 'boarding';
    encounter.boardingMarines = this.countMarines(world, encounter.attackerId);

    world.eventBus.emit({
      type: 'ship:combat_phase_changed',
      source: attackerEntity.id,
      data: {
        attackerId: encounter.attackerId,
        defenderId: encounter.defenderId,
        oldPhase: 'close',
        newPhase: 'boarding',
        attackerHull: encounter.attackerHullIntegrity,
        defenderHull: encounter.defenderHullIntegrity,
      },
    });

    return encounter;
  }

  /**
   * Resolve boarding phase (marines attempt capture)
   *
   * @param world - Game world
   * @param encounter - Combat encounter data
   * @returns Updated encounter
   */
  public resolveBoardingPhase(
    world: World,
    encounter: ShipCombatEncounter
  ): ShipCombatEncounter {
    if (encounter.phase !== 'boarding') {
      throw new Error('Encounter must be in boarding phase');
    }

    const attackerEntity = world.entities.get(encounter.attackerId) as EntityImpl | undefined;
    const defenderEntity = world.entities.get(encounter.defenderId) as EntityImpl | undefined;

    if (!attackerEntity || !defenderEntity) {
      throw new Error('Combat entities not found');
    }

    const attacker = attackerEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    const defender = defenderEntity.getComponent<SpaceshipComponent>(CT.Spaceship);

    if (!attacker || !defender) {
      throw new Error('Both entities must have Spaceship components');
    }

    // Marines attempt to capture ship
    const attackerMarines = encounter.boardingMarines;
    const defenderMarines = this.countMarines(world, encounter.defenderId);
    const defenderCrew = this.getShipCrew(world, encounter.defenderId);

    // Capture chance based on marines, coherence, and hull integrity
    const marineAdvantage = attackerMarines / Math.max(1, defenderMarines + defenderCrew.length);
    const coherenceDisadvantage = 1 - encounter.defenderCoherence;
    const hullDisadvantage = 1 - encounter.defenderHullIntegrity;

    const captureChance = marineAdvantage * 0.4 + coherenceDisadvantage * 0.3 + hullDisadvantage * 0.3;

    if (captureChance > 0.6 || encounter.defenderCoherence < 0.2) {
      // Ship captured!
      encounter.phase = 'resolved';
      encounter.victor = encounter.attackerId;
      encounter.captured = encounter.defenderId;

      world.eventBus.emit({
        type: 'ship:captured',
        source: attackerEntity.id,
        data: {
          captorId: encounter.attackerId,
          capturedId: encounter.defenderId,
          captorName: attacker.name,
          capturedName: defender.name,
          boardingMarines: attackerMarines,
        },
      });

      return encounter;
    }

    // Boarding failed, combat continues with damage
    const boardingDamage = 0.1;
    encounter.attackerHullIntegrity = Math.max(0, encounter.attackerHullIntegrity - boardingDamage);
    encounter.defenderHullIntegrity = Math.max(0, encounter.defenderHullIntegrity - boardingDamage);

    // Heavy combat stress during boarding
    encounter.attackerCoherence = Math.max(0, encounter.attackerCoherence - 0.1);
    encounter.defenderCoherence = Math.max(0, encounter.defenderCoherence - 0.1);

    // Update ship components
    this.updateShipState(attackerEntity, attacker, encounter.attackerHullIntegrity, encounter.attackerCoherence);
    this.updateShipState(defenderEntity, defender, encounter.defenderHullIntegrity, encounter.defenderCoherence);

    // Check for destruction
    if (encounter.attackerHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.defenderId;
      encounter.destroyed = encounter.attackerId;
      this.emitShipDestroyed(world, attackerEntity, defender.name);
      return encounter;
    }
    if (encounter.defenderHullIntegrity <= 0) {
      encounter.phase = 'resolved';
      encounter.victor = encounter.attackerId;
      encounter.destroyed = encounter.defenderId;
      this.emitShipDestroyed(world, defenderEntity, attacker.name);
      return encounter;
    }

    // Combat resolved (stalemate or retreat)
    encounter.phase = 'resolved';
    encounter.victor = encounter.attackerHullIntegrity > encounter.defenderHullIntegrity
      ? encounter.attackerId
      : encounter.defenderId;

    world.eventBus.emit({
      type: 'ship:combat_resolved',
      source: attackerEntity.id,
      data: {
        attackerId: encounter.attackerId,
        defenderId: encounter.defenderId,
        victor: encounter.victor,
        attackerHull: encounter.attackerHullIntegrity,
        defenderHull: encounter.defenderHullIntegrity,
        captured: false,
      },
    });

    return encounter;
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Calculate ship firepower based on hull mass and coherence
   */
  private calculateFirepower(ship: SpaceshipComponent, coherence: number): number {
    // Base firepower proportional to hull mass (bigger ships = more guns)
    const basePower = Math.sqrt(ship.hull.mass);

    // Coherence modifier (poor coherence = poor targeting/coordination)
    const coherenceMod = 0.5 + (coherence * 0.5);

    return basePower * coherenceMod;
  }

  /**
   * Rebuild crew caches from all crew entities
   * Called when cache is stale or invalidated
   */
  private rebuildCrewCache(world: World): void {
    this.crewByShipCache = Object.create(null);
    this.marinesByShipCache = Object.create(null);

    const crewEntities = world.query().with(CT.ShipCrew).executeEntities();
    for (const entity of crewEntities) {
      const crew = entity.getComponent<ShipCrewComponent>(CT.ShipCrew);
      if (!crew) continue;

      // Add to crew cache
      if (!(crew.shipId in this.crewByShipCache)) {
        this.crewByShipCache[crew.shipId] = [];
      }
      this.crewByShipCache[crew.shipId]!.push(crew);

      // Count marines
      if (crew.role === 'marine') {
        this.marinesByShipCache[crew.shipId] = (this.marinesByShipCache[crew.shipId] || 0) + 1;
      }
    }
  }

  /**
   * Get all crew members for a ship (uses cache)
   */
  private getShipCrew(world: World, shipId: EntityId): ShipCrewComponent[] {
    return this.crewByShipCache[shipId] || [];
  }

  /**
   * Count marines aboard a ship (uses cache)
   */
  private countMarines(world: World, shipId: EntityId): number {
    return this.marinesByShipCache[shipId] || 0;
  }

  /**
   * Update ship hull integrity and crew coherence
   * GC: Only updates if values actually changed (avoids unnecessary object allocation)
   */
  private updateShipState(
    entity: EntityImpl,
    ship: SpaceshipComponent,
    hullIntegrity: number,
    coherence: number
  ): void {
    // GC: Skip update if nothing changed (avoids spread operator allocations)
    if (ship.hull.integrity === hullIntegrity && ship.crew.coherence === coherence) {
      return;
    }
    entity.updateComponent(CT.Spaceship, () => ({
      ...ship,
      hull: {
        ...ship.hull,
        integrity: hullIntegrity,
      },
      crew: {
        ...ship.crew,
        coherence,
      },
    }));
  }

  /**
   * Emit ship destroyed event
   */
  private emitShipDestroyed(
    world: World,
    destroyedEntity: EntityImpl,
    destroyerName: string
  ): void {
    const ship = destroyedEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!ship) return;

    world.eventBus.emit({
      type: 'ship:destroyed',
      source: destroyedEntity.id,
      data: {
        shipId: destroyedEntity.id,
        shipName: ship.name,
        destroyedBy: destroyerName,
      },
    });
  }

  /**
   * Get an active encounter by entity IDs
   */
  public getEncounter(attackerId: EntityId, defenderId: EntityId): ShipCombatEncounter | undefined {
    const encounterId = `${attackerId}:${defenderId}`;
    return this.activeEncounters[encounterId];
  }

  /**
   * Remove an encounter from active list
   */
  public removeEncounter(attackerId: EntityId, defenderId: EntityId): void {
    const encounterId = `${attackerId}:${defenderId}`;
    delete this.activeEncounters[encounterId];
  }
}

// ============================================================================
// Singleton
// ============================================================================

let instance: ShipCombatSystem | null = null;

export function getShipCombatSystem(): ShipCombatSystem {
  if (!instance) {
    instance = new ShipCombatSystem();
  }
  return instance;
}

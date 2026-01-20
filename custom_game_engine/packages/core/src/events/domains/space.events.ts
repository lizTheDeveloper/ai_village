/**
 * Space, fleet, and interstellar events.
 */
import type { EntityId } from '../../types.js';

export interface SpaceEvents {
  // === Station Events ===

  /** Station fuel running low */
  'station:fuel_low': {
    stationId: EntityId;
    entityId?: EntityId;
    buildingType?: string;
    currentFuel?: number;
    fuelRemaining: number;
  };

  /** Station fuel depleted */
  'station:fuel_empty': {
    stationId: EntityId;
    entityId?: EntityId;
    buildingType?: string;
  };

  // === Planet Events ===

  /** Planet registered in multiverse */
  'planet:registered': {
    planetId: string;
    planetName: string;
    planetType: string;
    isActive: boolean;
  };

  /** Planet unregistered from multiverse */
  'planet:unregistered': {
    planetId: string;
  };

  /** Planet activated as current world */
  'planet:activated': {
    planetId: string;
    previousPlanetId?: string;
    planetName: string;
    planetType: string;
  };

  /** Entity arrived at planet */
  'planet:entity_arrived': {
    entityId: EntityId;
    planetId: string;
    previousPlanetId?: string;
    travelMethod: 'portal' | 'spacecraft' | 'ritual' | 'passage' | 'spawn';
  };

  /** Entity departed from planet */
  'planet:entity_departed': {
    entityId: EntityId;
    planetId: string;
    destinationPlanetId: string;
    travelMethod: 'portal' | 'spacecraft' | 'ritual' | 'passage';
  };

  /** Entity started traveling between planets */
  'planet_travel_started': {
    entityId: EntityId;
    fromPlanetId: string;
    toPlanetId: string;
    travelMethod: 'portal' | 'spacecraft';
    portalId?: string;
    shipId?: string;
    crewCount?: number;
  };

  // === Spaceship Construction Events ===

  /** Spaceship construction initiated (request) */
  'spaceship:construction:start': {
    shipyardId: string;
    shipType: string;
    shipName: string;
    builderId: string;
  };

  /** Spaceship construction started (response) */
  'spaceship:construction:started': {
    projectId: string;
    shipyardId: string;
    shipType: string;
    shipName: string;
    builderId: string;
    estimatedTicks: number;
    estimatedHours: number;
  };

  /** Spaceship construction progress update */
  'spaceship:construction:progress': {
    projectId: string;
    shipType: string;
    shipName: string;
    progress: number;
    milestone: number;
    ticksRemaining: number;
  };

  /** Spaceship construction completed */
  'spaceship:construction:complete': {
    projectId: string;
    spaceshipEntityId: string;
    shipType: string;
    shipName: string;
    builderId: string;
    buildTime: number;
    ticksElapsed: number;
  };

  /** Spaceship construction failed */
  'spaceship:construction:failed': {
    shipyardId: string;
    shipType: string;
    reason: string;
    required?: string;
    actual?: string;
  };

  /** Spaceship construction cancel request */
  'spaceship:construction:cancel': {
    projectId: string;
  };

  /** Spaceship construction cancelled (response) */
  'spaceship:construction:cancelled': {
    projectId: string;
    shipType: string;
    shipName: string;
    shipyardId: string;
    builderId: string;
  };

  // === Spaceship Operation Events ===

  /** Spaceship jump window opened */
  'spaceship_jump_window_open': {
    shipId: string;
    coherence: number;
    windowDuration: number;
  };

  /** Spaceship beta jump executed */
  'spaceship_beta_jump_executed': {
    destinationPlanetId: string;
    coherence: number;
    crewCount: number;
    syncTime: number;
  };

  // === Fleet Events ===

  /** Squadron joined a fleet */
  'fleet:squadron_joined': {
    fleetId: string;
    squadronId: string;
  };

  /** Squadron left a fleet */
  'fleet:squadron_left': {
    fleetId: string;
    squadronId: string;
  };

  /** Squadron missing from fleet */
  'fleet:squadron_missing': {
    fleetId: string;
    missingSquadronId: string;
  };

  /** Fleet disbanding (too few squadrons) */
  'fleet:disbanding': {
    fleetId: string;
    reason: string;
    remainingSquadrons: number;
  };

  /** Fleet running low on supplies */
  'fleet:low_supply': {
    fleetId: string;
    supplyLevel: number;
  };

  /** Fleet coherence updated */
  'fleet:coherence_updated': {
    fleetId: string;
    coherence: number;
    totalShips: number;
    totalCrew: number;
    distribution: {
      low: number;
      medium: number;
      high: number;
    };
  };

  /** Fleet morale decreased */
  'fleet:morale_decreased': {
    fleetId: string;
    navyId: string;
    unpaidPercentage: number;
    moraleReduction: number;
    newReadiness: number;
  };

  /** Fleet straggler detected (high straggler risk) */
  'fleet:straggler_detected': {
    fleetId: string;
    coherence: number;
    stragglerRisk: number;
    lowCoherenceSquadrons: number;
  };

  /** Fleet Heart synchronization started */
  'fleet:sync_started': {
    fleetId: string;
    targetEmotion: string;
    duration: number;
    totalShips: number;
    flagshipHeartId: string;
  };

  /** Fleet Heart synchronization progress update */
  'fleet:sync_progress': {
    fleetId: string;
    progress: number;
    alignedShips: number;
    totalShips: number;
    ticksRemaining: number;
  };

  /** Fleet Heart synchronization completed */
  'fleet:sync_completed': {
    fleetId: string;
    success: boolean;
    alignedShips: number;
    totalShips: number;
    alignmentRate: number;
    fleetCoherence: number;
  };

  /** Fleet Heart synchronization cancelled */
  'fleet:sync_cancelled': {
    fleetId: string;
    progress: number;
  };

  /** Ship aligned to fleet Heart network */
  'fleet:ship_aligned': {
    fleetId: string;
    shipId: string;
    alignedShips: number;
    totalShips: number;
  };

  /** Fleet stragglers detected after synchronization */
  'fleet:stragglers_detected': {
    fleetId: string;
    stragglers: string[];
    stragglerCount: number;
    alignmentRate: number;
  };

  /** Fleet battle started */
  'fleet:battle_started': {
    fleetId1: string;
    fleetId2: string;
    initialShips1: number;
    initialShips2: number;
  };

  /** Fleet battle resolved */
  'fleet:battle_resolved': {
    fleetId1: string;
    fleetId2: string;
    victor: string;
    fleet1Remaining: number;
    fleet2Remaining: number;
    shipsLost1: number;
    shipsLost2: number;
    duration: number;
  };

  // === Armada Events ===

  /** Fleet missing from armada */
  'armada:fleet_missing': {
    armadaId: string;
    missingFleetId: string;
  };

  /** Fleet joined an armada */
  'armada:fleet_joined': {
    armadaId: string;
    fleetId: string;
  };

  /** Armada disbanding (too few fleets) */
  'armada:disbanding': {
    armadaId: string;
    reason: string;
    remainingFleets: number;
  };

  /** Fleet left an armada */
  'armada:fleet_left': {
    armadaId: string;
    fleetId: string;
  };

  // === Navy Events ===

  /** Armada missing from navy */
  'navy:armada_missing': {
    navyId: string;
    missingArmadaId: string;
  };

  /** Navy budget exceeded */
  'navy:budget_exceeded': {
    navyId: string;
    budgetSpent: number;
    budget: number;
    overspend: number;
  };

  /** Armada joined a navy */
  'navy:armada_joined': {
    navyId: string;
    armadaId: string;
  };

  /** Armada left a navy */
  'navy:armada_left': {
    navyId: string;
    armadaId: string;
  };

  /** Fleet added to navy reserves */
  'navy:fleet_added_to_reserves': {
    navyId: string;
    fleetId: string;
  };

  /** Navy budget processed */
  'navy:budget_processed': {
    navyId: string;
    budget: number;
    spent: {
      construction: number;
      maintenance: number;
      personnel: number;
      R_D: number;
    };
    shipsBuilt: number;
    shipsMaintained: number;
    crewPaid: number;
    warnings: string[];
  };

  /** Navy ship constructed */
  'navy:ship_constructed': {
    navyId: string;
    shipsBuilt: number;
    constructionBudget: number;
  };

  /** Navy maintenance crisis (under-funded) */
  'navy:maintenance_crisis': {
    navyId: string;
    totalShips: number;
    shipsCanMaintain: number;
    degradedShips: number;
  };

  /** Navy personnel crisis (unpaid crew) */
  'navy:personnel_crisis': {
    navyId: string;
    totalCrew: number;
    crewCanPay: number;
    unpaidCrew: number;
  };

  /** Navy research progress */
  'navy:research_progress': {
    navyId: string;
    rdBudget: number;
    betaSpaceProgress: number;
    activeProjects: number;
  };

  // === Squadron Events ===

  /** Squadron battle started */
  'squadron:battle_started': {
    squadronId1: string;
    squadronId2: string;
    formation1: string;
    formation2: string;
  };

  /** Squadron battle resolved */
  'squadron:battle_resolved': {
    squadronId1: string;
    squadronId2: string;
    victor: string;
    squadron1Remaining: number;
    squadron2Remaining: number;
    shipsLost1: number;
    shipsLost2: number;
  };

  /** Squadron combat started (formation-based tactical combat) */
  'squadron:combat_started': {
    squadronId1: string;
    squadronId2: string;
    formation1: string;
    formation2: string;
  };

  /** Squadron combat resolved (formation-based tactical combat) */
  'squadron:combat_resolved': {
    squadronId1: string;
    squadronId2: string;
    victor: string;
    squadron1Remaining: number;
    squadron2Remaining: number;
    shipsLost1: number;
    shipsLost2: number;
  };

  /** Ship destroyed in squadron combat */
  'squadron:ship_destroyed': {
    squadronId: string;
    shipId: string;
    destroyedBy: string;
  };

  /** Ship joined squadron */
  'squadron:ship_joined': {
    squadronId: string;
    shipId: string;
  };

  /** Ship left squadron */
  'squadron:ship_left': {
    squadronId: string;
    shipId: string;
  };

  /** Ship missing from squadron */
  'squadron:ship_missing': {
    squadronId: string;
    missingShipId: string;
  };

  /** Squadron disbanding (too few ships) */
  'squadron:disbanding': {
    squadronId: string;
    reason: string;
    remainingShips: number;
  };

  /** Armada system battle resolved */
  'armada:system_battle_resolved': {
    armadaId1: string;
    armadaId2: string;
    systemId: string;
    victor: string;
    losses1: number;
    losses2: number;
  };

  // === Ship Combat Events ===

  /** Ship-to-ship combat started */
  'ship:combat_started': {
    attackerId: EntityId;
    defenderId: EntityId;
    attackerName: string;
    defenderName: string;
    phase: 'range' | 'close' | 'boarding' | 'resolved';
  };

  /** Ship combat phase changed */
  'ship:combat_phase_changed': {
    attackerId: EntityId;
    defenderId: EntityId;
    oldPhase: 'range' | 'close' | 'boarding' | 'resolved';
    newPhase: 'range' | 'close' | 'boarding' | 'resolved';
    attackerHull: number;
    defenderHull: number;
  };

  /** Ship combat resolved */
  'ship:combat_resolved': {
    attackerId: EntityId;
    defenderId: EntityId;
    victor: EntityId;
    attackerHull: number;
    defenderHull: number;
    captured: boolean;
  };

  /** Ship destroyed in combat */
  'ship:destroyed': {
    shipId: EntityId;
    shipName: string;
    destroyedBy: string;
  };

  /** Ship captured via boarding */
  'ship:captured': {
    captorId: EntityId;
    capturedId: EntityId;
    captorName: string;
    capturedName: string;
    boardingMarines: number;
  };

  // === Shipping Lane Events ===

  /** Caravan departed on shipping lane */
  'lane:caravan_departed': {
    caravanId: string;
    laneId: string;
    agreementId: string;
    cargo: Array<{ itemId: string; quantity: number }>;
    originId: string;
    destinationId: string;
  };

  /** Caravan arrived at destination */
  'lane:caravan_arrived': {
    caravanId: string;
    laneId: string;
    agreementId: string;
    cargo: Array<{ itemId: string; quantity: number }>;
    destinationId: string;
    travelTime: number;
  };

  /** Hazard encountered on shipping lane */
  'lane:hazard_encountered': {
    caravanId: string;
    laneId: string;
    hazardType: 'pirates' | 'weather' | 'monsters' | 'passage_instability';
    outcome: 'survived' | 'damaged' | 'destroyed';
  };

  /** Shipping lane blocked */
  'lane:blocked': {
    laneId: string;
    caravanId?: string;
  };

  /** Shipping lane abandoned due to lack of use */
  'lane:abandoned': {
    laneId: string;
    ticksSinceLastUse: number;
  };

  /** Caravan lost (lane disappeared, etc) */
  'lane:caravan_lost': {
    caravanId: string;
    reason: string;
  };

  // === Megastructure Construction Events (Phase 5) ===

  /** Megastructure construction project started */
  'construction_started': {
    projectId: string;
    megastructureType: string;
    blueprintName: string;
    targetLocation: {
      tier: string;
      entityId?: string;
      coordinates?: { x: number; y: number; z: number };
    };
    estimatedYears: number;
    requiredResources: Record<string, number>;
  };

  /** Megastructure construction progress milestone */
  'construction_progress': {
    projectId: string;
    megastructureType: string;
    milestone: number;
    progress: number;
    currentPhase: string;
  };

  /** Megastructure construction phase completed */
  'construction_phase_complete': {
    projectId: string;
    megastructureType: string;
    completedPhase: string;
    nextPhaseIndex: number;
  };

  /** Megastructure construction completed */
  'construction_complete': {
    projectId: string;
    megastructureType: string;
    targetEntityId?: string;
    constructionTimeYears: number;
    totalCost: Record<string, number>;
  };

  /** Megastructure construction failed */
  'construction_failed': {
    projectId: string;
    megastructureType: string;
    reason: string;
    progress: number;
    resourcesLost: Record<string, number>;
  };

  /** Megastructure construction delayed */
  'construction_delayed': {
    projectId: string;
    megastructureType: string;
    delayTicks: number;
    delayPercent: number;
  };

  // === Crew Stress Events ===

  /** Crew stress threshold crossed */
  'crew:stress_threshold_crossed': {
    crewId: string;
    shipId: string;
    role: string;
    previousThreshold: number;
    currentThreshold: number;
    stress: number;
  };

  /** Crew stress reached critical level */
  'crew:stress_critical': {
    crewId: string;
    shipId: string;
    role: string;
    stress: number;
    morale: number;
    quantumCoupling: number;
  };

  /** Crew stress recovered below threshold */
  'crew:stress_recovered': {
    crewId: string;
    shipId: string;
    role: string;
    previousThreshold: number;
    currentThreshold: number;
    stress: number;
  };

  // === Straggler Events ===

  /** Ship left behind during fleet β-jump */
  'straggler:ship_stranded': {
    shipId: string;
    fleetId: string;
    squadronId: string;
    branchId: string;
    tick: number;
  };

  /** Straggler ship attempted solo β-jump */
  'straggler:solo_jump_attempted': {
    shipId: string;
    targetBranch: string;
    attempt: number;
    successChance: number;
    coherence: number;
  };

  /** Straggler solo jump failed */
  'straggler:solo_jump_failed': {
    shipId: string;
    targetBranch: string;
    attempt: number;
    coherenceLoss: number;
    newCoherence: number;
    newContaminationRisk: number;
  };

  /** Rescue squadron assigned to straggler */
  'straggler:rescue_assigned': {
    stragglerId: string;
    rescueSquadronId: string;
    squadronName: string;
    stragglerBranch: string;
  };

  /** Straggler successfully recovered */
  'straggler:recovered': {
    shipId: string;
    fleetId: string;
    squadronId: string;
    ticksStranded: number;
    recoveryMethod: 'rescue' | 'solo_jump';
    soloJumpAttempts: number;
  };

  /** Straggler lost to decoherence/contamination */
  'straggler:lost': {
    shipId: string;
    fleetId: string;
    squadronId: string;
    ticksStranded: number;
    contaminationRisk: number;
    decoherenceRate: number;
    reason: 'timeline_contamination' | 'exceeded_time_threshold';
  };

  // === Megastructure Maintenance Events (Phase 5) ===

  /** Megastructure activated and made operational */
  'megastructure_activated': {
    entityId: EntityId;
    megastructureId: string;
    structureType: string;
    category: string;
    tier: string;
    name: string;
    location: {
      tier: string;
      systemId?: string;
      planetId?: string;
      sectorId?: string;
      coordinates?: { x: number; y: number; z: number };
    };
    capabilities: Record<string, unknown>;
    projectId: string;
    constructionTimeYears: number;
  };

  /** Maintenance performed on megastructure */
  'maintenance_performed': {
    entityId: EntityId;
    structureType: string;
    efficiency: number;
    maintenanceDebt: number;
  };

  /** Megastructure efficiency degraded */
  'megastructure_degraded': {
    entityId: EntityId;
    structureType: string;
    efficiency: number;
    phase: string;
    maintenanceDebt: number;
  };

  /** Megastructure critical or catastrophic failure */
  'megastructure_failed': {
    entityId: EntityId;
    structureType: string;
    severity: 'critical' | 'catastrophic';
    efficiency: number;
    maintenanceDebt: number;
  };

  /** Megastructure collapsed into ruins */
  'megastructure_collapsed': {
    entityId: EntityId;
    structureType: string;
    archaeologicalValue: number;
    controllingFactionId?: string;
  };

  /** Megastructure phase transition */
  'megastructure_phase_transition': {
    entityId: EntityId;
    structureType: string;
    oldPhase: string;
    newPhase: string;
    efficiency: number;
  };

  /** Megastructure advanced to new decay stage */
  'megastructure_decay_stage': {
    entityId: EntityId;
    structureType: string;
    decayStage: number;
    yearsInDecay: number;
    status: string;
    consequences: string;
    archaeologicalValue: number;
  };
}

export type SpaceEventType = keyof SpaceEvents;
export type SpaceEventData = SpaceEvents[SpaceEventType];

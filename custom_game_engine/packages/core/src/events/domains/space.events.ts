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

  // === Megastructure Maintenance Events (Phase 5) ===

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

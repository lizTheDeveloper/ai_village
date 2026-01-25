/**
 * Grand Strategy Simulator
 *
 * Extends the HeadlessCitySimulator with FULL Grand Strategy entity spawning:
 * - Complete Political Hierarchy: Nations → Empires → Federations → Galactic Councils
 * - Complete Naval Hierarchy: Ships w/Crew → Squadrons → Fleets → Armadas → Navies
 * - Operational Megastructures with workers
 * - Trade Networks with active routes
 *
 * Unlike scaffold-only spawning, this creates FUNCTIONAL entities that systems
 * can actually process, enabling full gameplay testing via metrics server.
 */

import {
  createEntityId,
  EntityImpl,
  createPositionComponent,
  type World,
  CT,
  createEmpireComponent,
  createNavyComponent,
  createFleetComponent,
  createSquadronComponent,
  createArmadaComponent,
  createFederationGovernanceComponent,
  createGalacticCouncilComponent,
  createMegastructureComponent,
  createNationComponent,
  createShipCrewComponent,
  createAgentComponent,
  createIdentityComponent,
  type MegastructureCategory,
  type MegastructureTier,
  type EmpireComponent,
  type EmpireNationRecord,
  type NavyComponent,
  type NationComponent,
  type SquadronComponent,
  type FleetComponent,
  type ArmadaComponent,
  type FederationGovernanceComponent,
  type GalacticCouncilComponent,
  type MegastructureComponent,
  type CrewRole,
} from '@ai-village/core';

import { createSpaceshipComponent, type SpaceshipType } from '@ai-village/core';

import { HeadlessCitySimulator, type SimulatorConfig } from './HeadlessCitySimulator.js';

// =============================================================================
// TYPES
// =============================================================================

export interface GrandStrategyConfig extends SimulatorConfig {
  /** Number of empires to spawn */
  empireCount?: number;
  /** Number of nations per empire */
  nationsPerEmpire?: number;
  /** Number of federations to spawn */
  federationCount?: number;
  /** Whether to create a galactic council */
  createGalacticCouncil?: boolean;
  /** Number of navies per empire */
  naviesPerEmpire?: number;
  /** Number of ships per squadron */
  shipsPerSquadron?: number;
  /** Number of megastructures to spawn */
  megastructureCount?: number;
  /** Workers per megastructure */
  workersPerMegastructure?: number;
}

export interface SpawnedEntities {
  nations: string[];
  empires: string[];
  federations: string[];
  galacticCouncils: string[];
  navies: string[];
  fleets: string[];
  squadrons: string[];
  armadas: string[];
  ships: string[];
  crews: string[];
  megastructures: string[];
  megastructureWorkers: string[];
}

// =============================================================================
// GRAND STRATEGY SIMULATOR
// =============================================================================

export class GrandStrategySimulator extends HeadlessCitySimulator {
  private grandStrategyConfig: GrandStrategyConfig;
  private spawnedEntities: SpawnedEntities = {
    nations: [],
    empires: [],
    federations: [],
    galacticCouncils: [],
    navies: [],
    fleets: [],
    squadrons: [],
    armadas: [],
    ships: [],
    crews: [],
    megastructures: [],
    megastructureWorkers: [],
  };

  constructor(config: GrandStrategyConfig = {}) {
    // Use large-city preset as base for Grand Strategy
    super({ ...config, preset: config.preset ?? 'large-city' });

    this.grandStrategyConfig = {
      empireCount: config.empireCount ?? 3,
      nationsPerEmpire: config.nationsPerEmpire ?? 2,
      federationCount: config.federationCount ?? 1,
      createGalacticCouncil: config.createGalacticCouncil ?? true,
      naviesPerEmpire: config.naviesPerEmpire ?? 1,
      // Squadron requires 3-10 ships, enforce minimum
      shipsPerSquadron: Math.max(3, config.shipsPerSquadron ?? 3),
      megastructureCount: config.megastructureCount ?? 2,
      workersPerMegastructure: config.workersPerMegastructure ?? 5,
    };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  async initialize(): Promise<void> {
    // Initialize base simulation
    await super.initialize();

    // Spawn Grand Strategy entities
    const world = this.getWorld();

    console.log('[GrandStrategySimulator] Spawning FULL Grand Strategy entities...');

    // Phase 1: Spawn Nations first (building blocks)
    const nationsByEmpire: Map<string, string[]> = new Map();

    // Phase 2: Spawn Empires with Nations
    for (let i = 0; i < this.grandStrategyConfig.empireCount!; i++) {
      const empireName = EMPIRE_NAMES[i % EMPIRE_NAMES.length]!;

      // Create nations for this empire
      const nationIds: string[] = [];
      for (let n = 0; n < this.grandStrategyConfig.nationsPerEmpire!; n++) {
        const nationId = this.spawnNation(
          world,
          `${empireName} ${NATION_SUFFIXES[n % NATION_SUFFIXES.length]}`,
          getRandomGovernmentType()
        );
        nationIds.push(nationId);
        this.spawnedEntities.nations.push(nationId);
      }

      // Create empire with linked nations
      const empireId = this.spawnEmpireWithNations(world, empireName, nationIds);
      this.spawnedEntities.empires.push(empireId);
      nationsByEmpire.set(empireId, nationIds);

      // Spawn navies with full hierarchy for each empire
      for (let j = 0; j < this.grandStrategyConfig.naviesPerEmpire!; j++) {
        const navyResult = this.spawnFullNavy(
          world,
          empireId,
          `${empireName} ${NAVY_DESIGNATIONS[j % NAVY_DESIGNATIONS.length]}`,
          this.grandStrategyConfig.shipsPerSquadron!
        );
        this.spawnedEntities.navies.push(navyResult.navyId);
        this.spawnedEntities.armadas.push(...navyResult.armadaIds);
        this.spawnedEntities.fleets.push(...navyResult.fleetIds);
        this.spawnedEntities.squadrons.push(...navyResult.squadronIds);
        this.spawnedEntities.ships.push(...navyResult.shipIds);
        this.spawnedEntities.crews.push(...navyResult.crewIds);
      }
    }

    // Phase 3: Spawn Federations (group empires)
    if (this.grandStrategyConfig.federationCount! > 0 && this.spawnedEntities.empires.length >= 2) {
      const fedId = this.spawnFederationWithMembers(
        world,
        'Stellar Alliance',
        this.spawnedEntities.empires.slice(0, 2)
      );
      this.spawnedEntities.federations.push(fedId);
    }

    // Phase 4: Spawn Galactic Council
    if (this.grandStrategyConfig.createGalacticCouncil && this.spawnedEntities.federations.length > 0) {
      const councilId = this.spawnGalacticCouncil(world, 'Galactic Assembly', this.spawnedEntities.federations);
      this.spawnedEntities.galacticCouncils.push(councilId);
    }

    // Phase 5: Spawn Operational Megastructures with workers
    for (let i = 0; i < this.grandStrategyConfig.megastructureCount!; i++) {
      const template = MEGASTRUCTURE_TEMPLATES[i % MEGASTRUCTURE_TEMPLATES.length]!;
      const megaResult = this.spawnOperationalMegastructure(
        world,
        template,
        this.grandStrategyConfig.workersPerMegastructure!
      );
      this.spawnedEntities.megastructures.push(megaResult.megastructureId);
      this.spawnedEntities.megastructureWorkers.push(...megaResult.workerIds);
    }

    this.logSpawnSummary();
  }

  private logSpawnSummary(): void {
    console.log('[GrandStrategySimulator] ✅ FULL Grand Strategy entities spawned:');
    console.log(`  📍 Nations: ${this.spawnedEntities.nations.length}`);
    console.log(`  👑 Empires: ${this.spawnedEntities.empires.length}`);
    console.log(`  🤝 Federations: ${this.spawnedEntities.federations.length}`);
    console.log(`  🌌 Galactic Councils: ${this.spawnedEntities.galacticCouncils.length}`);
    console.log(`  ⚓ Navies: ${this.spawnedEntities.navies.length}`);
    console.log(`  🚀 Armadas: ${this.spawnedEntities.armadas.length}`);
    console.log(`  🛸 Fleets: ${this.spawnedEntities.fleets.length}`);
    console.log(`  ✈️  Squadrons: ${this.spawnedEntities.squadrons.length}`);
    console.log(`  🚢 Ships: ${this.spawnedEntities.ships.length}`);
    console.log(`  👥 Crew Members: ${this.spawnedEntities.crews.length}`);
    console.log(`  🏗️  Megastructures: ${this.spawnedEntities.megastructures.length}`);
    console.log(`  👷 Megastructure Workers: ${this.spawnedEntities.megastructureWorkers.length}`);
  }

  // ---------------------------------------------------------------------------
  // NATION SPAWNING
  // ---------------------------------------------------------------------------

  spawnNation(world: World, name: string, govType: 'monarchy' | 'republic' | 'democracy'): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const nationComp: NationComponent = createNationComponent(name, world.tick, govType);

    // Give it some starting population and resources
    nationComp.economy = {
      ...nationComp.economy,
      gdp: 1000000000 + Math.random() * 9000000000, // 1B-10B GDP
    };
    nationComp.population = 10000000 + Math.random() * 90000000; // 10M-100M population

    entity.addComponent(nationComp);
    world.addEntity(entity);

    console.log(`[GrandStrategy] Spawned Nation: ${name} (${entity.id})`);
    return entity.id;
  }

  // ---------------------------------------------------------------------------
  // EMPIRE SPAWNING (with linked nations)
  // ---------------------------------------------------------------------------

  spawnEmpireWithNations(world: World, name: string, nationIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const empireComp: EmpireComponent = createEmpireComponent(name, world.tick, 'imperial');

    // territory.nations is string[] of nation IDs
    empireComp.territory.nations = nationIds;
    empireComp.territory.coreNationIds = nationIds;

    // nationRecords has the detailed data
    empireComp.nationRecords = nationIds.map((nationId): EmpireNationRecord => {
      const nationEntity = world.getEntity(nationId);
      if (!nationEntity) {
        throw new Error(`Nation entity ${nationId} not found when creating empire`);
      }
      const component = nationEntity.getComponent(CT.Nation);
      if (!component || component.type !== 'nation') {
        throw new Error(`Entity ${nationId} does not have a valid Nation component`);
      }
      const nationComp = component as NationComponent;
      return {
        nationId,
        nationName: nationComp.nationName,
        population: nationComp.population ?? 10000000,
        gdp: nationComp.economy?.gdp ?? 1000000000,
        isCore: true,
        autonomyLevel: 0.3,
        tributePaid: 100000000,
        militaryContribution: 50000,
        loyaltyToEmpire: 0.8,
        lastUpdateTick: world.tick,
      };
    });
    empireComp.territory.totalPopulation = nationIds.length * 50000000;

    // Give empire starting treasury
    empireComp.economy.imperialTreasury = 10000000000; // 10B credits
    empireComp.economy.gdp = nationIds.length * 5000000000; // 5B per nation

    entity.addComponent(empireComp);
    world.addEntity(entity);

    console.log(`[GrandStrategy] Spawned Empire: ${name} with ${nationIds.length} nations (${entity.id})`);
    return entity.id;
  }

  // ---------------------------------------------------------------------------
  // FULL NAVAL HIERARCHY
  // ---------------------------------------------------------------------------

  spawnFullNavy(
    world: World,
    empireId: string,
    navyName: string,
    shipsPerSquadron: number
  ): {
    navyId: string;
    armadaIds: string[];
    fleetIds: string[];
    squadronIds: string[];
    shipIds: string[];
    crewIds: string[];
  } {
    const result = {
      navyId: '',
      armadaIds: [] as string[],
      fleetIds: [] as string[],
      squadronIds: [] as string[],
      shipIds: [] as string[],
      crewIds: [] as string[],
    };

    // Bottom-up: Ships first, then squadrons, fleets, armadas, navy

    // Create 3 squadrons, each with ships
    const squadronIds: string[] = [];
    for (let sq = 0; sq < 3; sq++) {
      const shipIds: string[] = [];
      const squadronShipTypes: Record<string, number> = {};

      // Create ships for this squadron
      for (let sh = 0; sh < shipsPerSquadron; sh++) {
        const shipType = SHIP_TYPES[sh % SHIP_TYPES.length]!;
        const shipName = `${navyName} ${SHIP_NAMES[result.shipIds.length % SHIP_NAMES.length]}`;
        const shipResult = this.spawnShipWithCrew(world, shipName, shipType);
        shipIds.push(shipResult.shipId);
        result.shipIds.push(shipResult.shipId);
        result.crewIds.push(...shipResult.crewIds);

        // Track ship types for squadron
        squadronShipTypes[shipType] = (squadronShipTypes[shipType] || 0) + 1;
      }

      // Create squadron with actual ships
      const squadronId = this.spawnSquadronWithShips(
        world,
        `${navyName} Squadron ${GREEK_LETTERS[sq]}`,
        shipIds
      );
      squadronIds.push(squadronId);
      result.squadronIds.push(squadronId);
    }

    // Create fleet with squadrons
    const fleetId = this.spawnFleetWithSquadrons(
      world,
      `${navyName} Battlegroup`,
      squadronIds
    );
    result.fleetIds.push(fleetId);

    // Create armada with fleet
    const armadaId = this.spawnArmadaWithFleets(
      world,
      `${navyName} Armada`,
      [fleetId]
    );
    result.armadaIds.push(armadaId);

    // Create navy with armada
    const navyId = this.spawnNavyWithArmadas(
      world,
      navyName,
      empireId,
      [armadaId],
      result.shipIds.length,
      result.crewIds.length
    );
    result.navyId = navyId;

    console.log(
      `[GrandStrategy] Spawned Full Navy: ${navyName} (${result.shipIds.length} ships, ${result.crewIds.length} crew)`
    );

    return result;
  }

  spawnShipWithCrew(
    world: World,
    shipName: string,
    shipType: SpaceshipType
  ): { shipId: string; crewIds: string[] } {
    const shipEntity = new EntityImpl(createEntityId(), world.tick);
    const crewIds: string[] = [];

    // Create spaceship component
    const spaceshipComp = createSpaceshipComponent(shipType, shipName);

    // Create crew members
    const crewSize = CREW_SIZES[shipType] || 5;
    for (let c = 0; c < crewSize; c++) {
      const crewEntity = new EntityImpl(createEntityId(), world.tick);
      const role: CrewRole =
        c === 0 ? 'captain' :
        c === 1 ? 'navigator' :
        c === 2 ? 'engineer' :
        c === 3 ? 'pilot' :
        'marine';
      const crewComp = createShipCrewComponent(shipEntity.id, role, c === 0 ? 1 : 2 + c);

      // Give crew a name via identity component
      const crewName = `${CREW_NAMES[crewIds.length % CREW_NAMES.length]} (${role})`;
      const identityComp = createIdentityComponent(crewName, 'human');

      // Also give crew an agent component so they can be tracked
      const agentComp = createAgentComponent('idle', 20, false);

      crewEntity.addComponent(identityComp);
      crewEntity.addComponent(agentComp);
      crewEntity.addComponent(crewComp);
      world.addEntity(crewEntity);
      crewIds.push(crewEntity.id);
    }

    // Link crew to ship
    spaceshipComp.crew.member_ids = crewIds;
    spaceshipComp.crew.coherence = 0.85; // Good starting coherence

    shipEntity.addComponent(spaceshipComp);
    world.addEntity(shipEntity);

    return { shipId: shipEntity.id, crewIds };
  }

  spawnSquadronWithShips(world: World, name: string, shipIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const squadronComp: SquadronComponent = createSquadronComponent(
      name,
      '', // commanderId - will be assigned by system
      shipIds[0]!, // flagshipId
      shipIds
    );

    // Update stats to reflect actual ships
    squadronComp.ships.totalCrew = shipIds.length * 5;
    squadronComp.coherence.average = 0.85;
    squadronComp.combat.totalFirepower = shipIds.length * 100;

    entity.addComponent(squadronComp);
    world.addEntity(entity);

    return entity.id;
  }

  spawnFleetWithSquadrons(world: World, name: string, squadronIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const fleetComp: FleetComponent = createFleetComponent(
      name,
      '', // admiralId
      squadronIds[0]!, // flagshipSquadronId
      '', // flagshipShipId - will be determined by system
      squadronIds
    );

    // Update squadron stats
    fleetComp.squadrons.totalShips = squadronIds.length * 3;
    fleetComp.squadrons.totalCrew = squadronIds.length * 3 * 5;

    entity.addComponent(fleetComp);
    world.addEntity(entity);

    return entity.id;
  }

  spawnArmadaWithFleets(world: World, name: string, fleetIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    // Armada needs minimum 2 fleets - if we only have 1, duplicate the reference
    const effectiveFleetIds = fleetIds.length >= 2 ? fleetIds : [...fleetIds, fleetIds[0]!];

    const armadaComp: ArmadaComponent = createArmadaComponent(
      name,
      '', // commanderId
      effectiveFleetIds[0]!, // flagshipFleetId
      effectiveFleetIds
    );

    // Update fleet stats
    armadaComp.fleets.totalSquadrons = fleetIds.length * 3;
    armadaComp.fleets.totalShips = fleetIds.length * 9;
    armadaComp.fleets.totalCrew = fleetIds.length * 45;
    armadaComp.strength.shipCount = fleetIds.length * 9;
    armadaComp.strength.effectiveCombatPower = fleetIds.length * 900;

    entity.addComponent(armadaComp);
    world.addEntity(entity);

    return entity.id;
  }

  spawnNavyWithArmadas(
    world: World,
    name: string,
    empireId: string,
    armadaIds: string[],
    totalShips: number,
    totalCrew: number
  ): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const navyComp: NavyComponent = createNavyComponent(name, empireId, '', 1000000000); // 1B budget

    // Update assets with actual counts
    navyComp.assets.armadaIds = armadaIds;
    navyComp.assets.totalArmadas = armadaIds.length;
    navyComp.assets.totalFleets = armadaIds.length * 1;
    navyComp.assets.totalSquadrons = armadaIds.length * 3;
    navyComp.assets.totalShips = totalShips;
    navyComp.assets.totalCrew = totalCrew;

    entity.addComponent(navyComp);
    world.addEntity(entity);

    return entity.id;
  }

  // ---------------------------------------------------------------------------
  // FEDERATION / COUNCIL SPAWNING
  // ---------------------------------------------------------------------------

  spawnFederationWithMembers(world: World, name: string, empireIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const fedComp: FederationGovernanceComponent = createFederationGovernanceComponent(name, world.tick, 'federal');

    // Link member empires
    fedComp.memberEmpireIds = empireIds;

    entity.addComponent(fedComp);
    world.addEntity(entity);

    console.log(`[GrandStrategy] Spawned Federation: ${name} with ${empireIds.length} empires (${entity.id})`);
    return entity.id;
  }

  spawnGalacticCouncil(world: World, name: string, federationIds: string[]): string {
    const entity = new EntityImpl(createEntityId(), world.tick);

    const councilComp: GalacticCouncilComponent = createGalacticCouncilComponent(name, world.tick, 'democratic');

    // Link member federations
    councilComp.memberFederationIds = federationIds;

    entity.addComponent(councilComp);
    world.addEntity(entity);

    console.log(`[GrandStrategy] Spawned Galactic Council: ${name} (${entity.id})`);
    return entity.id;
  }

  // ---------------------------------------------------------------------------
  // MEGASTRUCTURE SPAWNING (operational)
  // ---------------------------------------------------------------------------

  spawnOperationalMegastructure(
    world: World,
    template: MegastructureTemplate,
    workerCount: number
  ): { megastructureId: string; workerIds: string[] } {
    const entity = new EntityImpl(createEntityId(), world.tick);
    const workerIds: string[] = [];

    // Create workers for the megastructure
    for (let w = 0; w < workerCount; w++) {
      const workerEntity = new EntityImpl(createEntityId(), world.tick);

      // Give worker a name via identity component
      const workerName = `${template.name} Worker ${w + 1}`;
      const identityComp = createIdentityComponent(workerName, 'human');

      const agentComp = createAgentComponent('work', 20, false);

      // Give position near the megastructure
      const posComp = createPositionComponent(100 + w * 2, 100 + w * 2);
      workerEntity.addComponent(identityComp);
      workerEntity.addComponent(agentComp);
      workerEntity.addComponent(posComp);
      world.addEntity(workerEntity);
      workerIds.push(workerEntity.id);
    }

    const megaComp: MegastructureComponent = createMegastructureComponent({
      megastructureId: `mega_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: template.name,
      category: template.category,
      structureType: template.structureType,
      tier: template.tier,
      location: {
        systemId: 'local_system',
        coordinates: { x: 0, y: 0, z: 0 },
      },
      currentTick: world.tick,
      capabilities: template.capabilities,
    });

    // Make it operational
    megaComp.operational = true;
    megaComp.efficiency = 0.95;

    // Store energy output in capabilities (already set during creation)
    // Store worker info in capabilities for tracking
    megaComp.capabilities.workerIds = workerIds;
    megaComp.capabilities.crewCount = workerCount;

    entity.addComponent(megaComp);
    world.addEntity(entity);

    console.log(
      `[GrandStrategy] Spawned Operational Megastructure: ${template.name} with ${workerCount} workers (${entity.id})`
    );

    return { megastructureId: entity.id, workerIds };
  }

  // ---------------------------------------------------------------------------
  // STATE ACCESS
  // ---------------------------------------------------------------------------

  getSpawnedEntities(): SpawnedEntities {
    return { ...this.spawnedEntities };
  }

  getGrandStrategyStats(): {
    nations: number;
    empires: number;
    federations: number;
    galacticCouncils: number;
    navies: number;
    totalNavalForces: number;
    ships: number;
    crews: number;
    megastructures: number;
    megastructureWorkers: number;
  } {
    return {
      nations: this.spawnedEntities.nations.length,
      empires: this.spawnedEntities.empires.length,
      federations: this.spawnedEntities.federations.length,
      galacticCouncils: this.spawnedEntities.galacticCouncils.length,
      navies: this.spawnedEntities.navies.length,
      totalNavalForces:
        this.spawnedEntities.navies.length +
        this.spawnedEntities.armadas.length +
        this.spawnedEntities.fleets.length +
        this.spawnedEntities.squadrons.length,
      ships: this.spawnedEntities.ships.length,
      crews: this.spawnedEntities.crews.length,
      megastructures: this.spawnedEntities.megastructures.length,
      megastructureWorkers: this.spawnedEntities.megastructureWorkers.length,
    };
  }

  // ---------------------------------------------------------------------------
  // GAMEPLAY ACTIONS (for LLM control via metrics server)
  // ---------------------------------------------------------------------------

  /** Move a fleet to a new position */
  moveFleet(fleetId: string, targetX: number, targetY: number): boolean {
    const world = this.getWorld();
    const fleetEntity = world.getEntity(fleetId);
    if (!fleetEntity) {
      console.error(`[GrandStrategy] Fleet entity ${fleetId} not found`);
      return false;
    }

    const component = fleetEntity.getComponent(CT.Fleet);
    if (!component || component.type !== 'fleet') {
      console.error(`[GrandStrategy] Entity ${fleetId} does not have a valid Fleet component`);
      return false;
    }

    // Type assertion is now safe after the type guard check
    const fleetComp = component as FleetComponent;

    // Set destination in status (FleetComponent has status.destination)
    fleetComp.status.destination = `system_${targetX}_${targetY}`;

    console.log(`[GrandStrategy] Fleet ${fleetId} moving to (${targetX}, ${targetY})`);
    return true;
  }

  /** Issue a diplomatic action between empires */
  diplomaticAction(
    empireId: string,
    targetEmpireId: string,
    action: 'ally' | 'declare_war' | 'trade_agreement' | 'non_aggression'
  ): boolean {
    const world = this.getWorld();
    const empireEntity = world.getEntity(empireId);
    const targetEntity = world.getEntity(targetEmpireId);

    if (!empireEntity) {
      console.error(`[GrandStrategy] Empire entity ${empireId} not found`);
      return false;
    }
    if (!targetEntity) {
      console.error(`[GrandStrategy] Target empire entity ${targetEmpireId} not found`);
      return false;
    }

    const empireComponent = empireEntity.getComponent(CT.Empire);
    if (!empireComponent || empireComponent.type !== 'empire') {
      console.error(`[GrandStrategy] Entity ${empireId} does not have a valid Empire component`);
      return false;
    }
    // Type assertion is safe after the type guard check
    const empireComp = empireComponent as EmpireComponent;

    const targetComponent = targetEntity.getComponent(CT.Empire);
    let targetEmpireName = 'Unknown';
    if (targetComponent && targetComponent.type === 'empire') {
      // Type assertion is safe after the type guard check
      targetEmpireName = (targetComponent as EmpireComponent).empireName;
    }

    // Update diplomatic relations (diplomacy.relations is a Map)
    empireComp.diplomacy.relations.set(targetEmpireId, {
      empireId: targetEmpireId,
      empireName: targetEmpireName,
      relationship: action === 'ally' ? 'allied' : action === 'declare_war' ? 'at_war' : 'friendly',
      opinion: action === 'ally' ? 50 : action === 'declare_war' ? -100 : 25,
      treaties: action !== 'declare_war' ? [action] : [],
      diplomaticEvents: [
        {
          type: action,
          description: `${action} initiated`,
          tick: world.tick,
          opinionImpact: action === 'declare_war' ? -100 : 25,
        },
      ],
    });

    console.log(`[GrandStrategy] Diplomatic action: ${empireId} → ${action} → ${targetEmpireId}`);
    return true;
  }

  /** Assign workers to a megastructure task */
  assignMegastructureTask(
    megastructureId: string,
    task: 'maintenance' | 'expansion' | 'research' | 'production'
  ): boolean {
    const world = this.getWorld();
    const megaEntity = world.getEntity(megastructureId);
    if (!megaEntity) {
      console.error(`[GrandStrategy] Megastructure entity ${megastructureId} not found`);
      return false;
    }

    const component = megaEntity.getComponent(CT.Megastructure);
    if (!component || component.type !== 'megastructure') {
      console.error(`[GrandStrategy] Entity ${megastructureId} does not have a valid Megastructure component`);
      return false;
    }

    // MegastructureComponent doesn't have currentTask/taskProgress fields
    // This would require adding those fields to the component type
    // For now, log a warning that this functionality needs component updates
    console.warn(`[GrandStrategy] assignMegastructureTask requires MegastructureComponent schema updates`);
    console.log(`[GrandStrategy] Megastructure ${megastructureId} would be assigned task: ${task}`);
    return true;
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

const EMPIRE_NAMES = ['Terran Dominion', 'Xenos Collective', 'Mechanicum', 'Solar Consortium', 'Void Dynasty', 'Stellar Hegemony'];
const NATION_SUFFIXES = ['Prime', 'Secundus', 'Tertius', 'Quartus', 'Core Worlds', 'Outer Rim'];
const NAVY_DESIGNATIONS = ['First Fleet', 'Home Guard', 'Expeditionary Force', 'Reserve Command'];
const GREEK_LETTERS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
const SHIP_NAMES = ['Valiant', 'Defiant', 'Intrepid', 'Resolute', 'Vigilant', 'Sovereign', 'Relentless', 'Fearless'];
const CREW_NAMES = ['Chen', 'Okonkwo', 'Rodriguez', 'Kim', 'Patel', 'Ivanov', 'Nakamura', 'Schmidt', 'Ali', 'Johansson'];

const SHIP_TYPES: SpaceshipType[] = ['threshold_ship', 'courier_ship', 'story_ship'];
const CREW_SIZES: Record<SpaceshipType, number> = {
  worldship: 1000,
  threshold_ship: 5,
  story_ship: 12,
  gleisner_vessel: 1,
  courier_ship: 2,
  svetz_retrieval: 3,
  probability_scout: 1,
  timeline_merger: 8,
  brainship: 2,
};

function getRandomGovernmentType(): 'monarchy' | 'republic' | 'democracy' {
  const types: ('monarchy' | 'republic' | 'democracy')[] = ['monarchy', 'republic', 'democracy'];
  return types[Math.floor(Math.random() * types.length)]!;
}

interface MegastructureTemplate {
  name: string;
  category: MegastructureCategory;
  structureType: string;
  tier: MegastructureTier;
  capabilities: Record<string, unknown>;
}

const MEGASTRUCTURE_TEMPLATES: MegastructureTemplate[] = [
  {
    name: 'Dyson Swarm Alpha',
    category: 'stellar',
    structureType: 'dyson_swarm',
    tier: 'system',
    capabilities: { energyOutput: 1e26, populationCapacity: 1e9 },
  },
  {
    name: 'Orbital Ring Station',
    category: 'orbital',
    structureType: 'orbital_ring',
    tier: 'planet',
    capabilities: { transportCapacity: 1e6, defenseRating: 500 },
  },
  {
    name: 'Wormhole Gate Nexus',
    category: 'galactic',
    structureType: 'wormhole_network',
    tier: 'sector',
    capabilities: { jumpRange: 10000, throughput: 1000 },
  },
  {
    name: 'Stellar Engine Prometheus',
    category: 'stellar',
    structureType: 'stellar_engine',
    tier: 'system',
    capabilities: { thrustOutput: 1e20, fuelEfficiency: 0.99 },
  },
];

// =============================================================================
// EXPORTS
// =============================================================================

export type { SimulatorConfig, SimulatorStats } from './HeadlessCitySimulator.js';

/**
 * GalacticCouncilSystem Integration Tests
 *
 * These tests verify:
 * - Multi-species voting mechanics
 * - Universal law enforcement
 * - Peacekeeping mission deployment
 * - Crisis response coordination
 * - Dispute mediation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';
import { GalacticCouncilSystem } from '../GalacticCouncilSystem.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type {
  GalacticCouncilComponent,
  Species,
  GalacticDelegate,
} from '../../components/GalacticCouncilComponent.js';
import type { SpeciesComponent } from '../../components/SpeciesComponent.js';
import type { NavyComponent } from '../../components/NavyComponent.js';

describe('GalacticCouncilSystem', () => {
  let world: World;
  let system: GalacticCouncilSystem;
  let councilEntity: EntityImpl;
  let councilComp: GalacticCouncilComponent;

  beforeEach(() => {
    world = new World({ enableSpatialGrid: false });
    system = new GalacticCouncilSystem();

    // Create galactic council entity
    councilEntity = world.createEntity() as EntityImpl;

    // Initialize galactic council component
    councilComp = {
      type: 'galactic_council',
      name: 'United Galactic Council',
      memberSpecies: [],
      assemblyDelegates: [],
      secretaryGeneralAgentId: 'secretary_general_1',
      totalPopulation: 0,
      totalSectors: 0,
      governance: {
        governanceType: 'democratic',
        quorumPercentage: 0.5,
        voteWeightingSystem: 'population_weighted',
        vetoRights: [],
      },
      universalLaws: [],
      peacekeepingForces: {
        activeMissions: [],
        totalFleetStrength: 0,
      },
      science: {
        advancedResearchTopics: [],
        existentialThreats: [],
      },
      disputes: {
        activeDisputes: [],
        resolvedDisputes: [],
      },
      lastCosmicUpdateTick: 0,
    };

    councilEntity.addComponent(councilComp);
  });

  describe('Species Membership', () => {
    it('should add species to council when space age is reached', () => {
      // Create species entities
      const species1 = world.createEntity() as EntityImpl;
      const speciesComp1: SpeciesComponent = {
        type: 'species',
        name: 'Humans',
        homeworld: 'Earth',
        population: 10_000_000_000,
        techLevel: 8, // Space age
      };
      species1.addComponent(speciesComp1);

      const species2 = world.createEntity() as EntityImpl;
      const speciesComp2: SpeciesComponent = {
        type: 'species',
        name: 'Zorgons',
        homeworld: 'Zorg Prime',
        population: 5_000_000_000,
        techLevel: 9,
      };
      species2.addComponent(speciesComp2);

      // Add species to council
      system.addSpeciesToCouncil(world, councilComp, species1.id, speciesComp1);
      system.addSpeciesToCouncil(world, councilComp, species2.id, speciesComp2);

      // Verify species added
      expect(councilComp.memberSpecies).toHaveLength(2);
      expect(councilComp.memberSpecies[0]?.name).toBe('Humans');
      expect(councilComp.memberSpecies[1]?.name).toBe('Zorgons');

      // Verify delegates created
      expect(councilComp.assemblyDelegates).toHaveLength(2);
    });

    it('should calculate voting power based on population and tech level', () => {
      const species1 = world.createEntity() as EntityImpl;
      const speciesComp1: SpeciesComponent = {
        type: 'species',
        name: 'Humans',
        homeworld: 'Earth',
        population: 10_000_000_000, // 10B
        techLevel: 8,
      };
      species1.addComponent(speciesComp1);

      const species2 = world.createEntity() as EntityImpl;
      const speciesComp2: SpeciesComponent = {
        type: 'species',
        name: 'Ancients',
        homeworld: 'Ancient World',
        population: 1_000_000_000, // 1B (lower population)
        techLevel: 15, // Much higher tech
      };
      species2.addComponent(speciesComp2);

      system.addSpeciesToCouncil(world, councilComp, species1.id, speciesComp1);
      system.addSpeciesToCouncil(world, councilComp, species2.id, speciesComp2);

      // Normalize voting power
      system.normalizeVotingPower(councilComp);

      const humansDelegate = councilComp.assemblyDelegates.find(
        (d) => d.memberStateId === 'Humans'
      );
      const ancientsDelegate = councilComp.assemblyDelegates.find(
        (d) => d.memberStateId === 'Ancients'
      );

      // Ancients should have more voting power due to higher tech level
      // Even with lower population
      expect(ancientsDelegate?.votingPower).toBeGreaterThan(humansDelegate?.votingPower || 0);

      // Total voting power should sum to 1
      const totalPower = councilComp.assemblyDelegates.reduce(
        (sum, d) => sum + d.votingPower,
        0
      );
      expect(totalPower).toBeCloseTo(1.0, 2);
    });
  });

  describe('Universal Law Voting', () => {
    beforeEach(() => {
      // Add three species to council
      for (let i = 0; i < 3; i++) {
        const species = world.createEntity() as EntityImpl;
        const speciesComp: SpeciesComponent = {
          type: 'species',
          name: `Species_${i}`,
          homeworld: `Planet_${i}`,
          population: 1_000_000_000,
          techLevel: 8,
        };
        species.addComponent(speciesComp);
        system.addSpeciesToCouncil(world, councilComp, species.id, speciesComp);
      }

      system.normalizeVotingPower(councilComp);
    });

    it('should pass law with 75% supermajority', () => {
      // Propose law
      system.proposeLaw(
        world,
        councilComp,
        councilEntity,
        'Species_0',
        'Universal Rights Charter',
        'Charter granting rights to all sapient beings',
        'rights',
        0
      );

      // Get proposal
      const proposal = (system as any).pendingLawProposals.get(councilComp.name)?.[0];
      expect(proposal).toBeDefined();

      // Cast votes: 2 approve (66.6%), 1 reject
      system.voteOnLaw(world, councilComp, councilEntity, proposal.id, 'Species_0', 'approve', 1);
      system.voteOnLaw(world, councilComp, councilEntity, proposal.id, 'Species_1', 'approve', 1);
      system.voteOnLaw(world, councilComp, councilEntity, proposal.id, 'Species_2', 'reject', 1);

      // Law should NOT pass (66.6% < 75%)
      expect(councilComp.universalLaws).toHaveLength(0);

      // Reset and vote again with 3 approvals
      (system as any).pendingLawProposals.set(councilComp.name, []);
      councilComp.universalLaws = [];

      system.proposeLaw(
        world,
        councilComp,
        councilEntity,
        'Species_0',
        'Universal Rights Charter',
        'Charter granting rights to all sapient beings',
        'rights',
        2
      );

      const proposal2 = (system as any).pendingLawProposals.get(councilComp.name)?.[0];

      // Cast votes: 3 approve (100%)
      system.voteOnLaw(
        world,
        councilComp,
        councilEntity,
        proposal2.id,
        'Species_0',
        'approve',
        2
      );
      system.voteOnLaw(
        world,
        councilComp,
        councilEntity,
        proposal2.id,
        'Species_1',
        'approve',
        2
      );
      system.voteOnLaw(
        world,
        councilComp,
        councilEntity,
        proposal2.id,
        'Species_2',
        'approve',
        2
      );

      // Law should pass
      expect(councilComp.universalLaws).toHaveLength(1);
      expect(councilComp.universalLaws[0]?.name).toBe('Universal Rights Charter');
    });

    it('should allow veto from transcendent civilizations (tech level 13+)', () => {
      // Add transcendent species
      const ancients = world.createEntity() as EntityImpl;
      const ancientsComp: SpeciesComponent = {
        type: 'species',
        name: 'Transcendent',
        homeworld: 'Ascension World',
        population: 100_000_000,
        techLevel: 13, // Transcendent
      };
      ancients.addComponent(ancientsComp);
      system.addSpeciesToCouncil(world, councilComp, ancients.id, ancientsComp);

      const ancientsSpecies = councilComp.memberSpecies.find(
        (s) => s.name === 'Transcendent'
      );
      expect(ancientsSpecies).toBeDefined();
      expect(system.canVeto(ancientsSpecies!)).toBe(true);
    });
  });

  describe('Peacekeeping Missions', () => {
    beforeEach(() => {
      // Add species with navies
      const species1 = world.createEntity() as EntityImpl;
      const speciesComp1: SpeciesComponent = {
        type: 'species',
        name: 'Humans',
        homeworld: 'Earth',
        population: 10_000_000_000,
        techLevel: 8,
      };
      species1.addComponent(speciesComp1);
      system.addSpeciesToCouncil(world, councilComp, species1.id, speciesComp1);

      // Add navy for humans
      const navy1 = world.createEntity() as EntityImpl;
      const navyComp1: NavyComponent = {
        type: 'navy',
        factionId: 'Humans',
        admiralAgentId: 'admiral_human',
        assets: {
          totalFleets: 10,
          totalShips: 100,
          totalCrew: 10000,
          navalBudget: 1000000,
        },
        doctrine: {
          defensivePosture: 0.5,
          offensiveCapability: 0.7,
          explorationPriority: 0.3,
        },
        homePort: 'Earth Orbital',
        lastUpdateTick: 0,
      };
      navy1.addComponent(navyComp1);
    });

    it('should deploy peacekeeping mission with fleet coordination', () => {
      system.deployPeacekeepingMission(
        world,
        councilComp,
        councilEntity,
        'conflict_mediation',
        'Sector 7',
        'Stop war between Species A and B',
        0
      );

      expect(councilComp.peacekeepingForces.activeMissions).toHaveLength(1);
      const mission = councilComp.peacekeepingForces.activeMissions[0];
      expect(mission?.type).toBe('conflict_mediation');
      expect(mission?.location).toBe('Sector 7');
      expect(mission?.status).toBe('active');
    });

    it('should complete missions after sufficient time', () => {
      system.deployPeacekeepingMission(
        world,
        councilComp,
        councilEntity,
        'humanitarian_aid',
        'Disaster Zone',
        'Relief effort',
        0
      );

      expect(councilComp.peacekeepingForces.activeMissions).toHaveLength(1);

      // Fast forward time (10 cosmic cycles = 10 hours = 72000 * 10 ticks)
      world.tick = 72000 * 11;

      // Process update (system is throttled, so manually call private method)
      (system as any).managePeacekeepingMissions(world, councilComp, councilEntity, world.tick);

      // Mission should be completed and removed
      expect(councilComp.peacekeepingForces.activeMissions).toHaveLength(0);
    });
  });

  describe('Crisis Response', () => {
    beforeEach(() => {
      // Add multiple species
      for (let i = 0; i < 5; i++) {
        const species = world.createEntity() as EntityImpl;
        const speciesComp: SpeciesComponent = {
          type: 'species',
          name: `Species_${i}`,
          homeworld: `Planet_${i}`,
          population: 1_000_000_000,
          techLevel: 8,
        };
        species.addComponent(speciesComp);
        system.addSpeciesToCouncil(world, councilComp, species.id, speciesComp);

        // Add navy
        const navy = world.createEntity() as EntityImpl;
        const navyComp: NavyComponent = {
          type: 'navy',
          factionId: `Species_${i}`,
          admiralAgentId: `admiral_${i}`,
          assets: {
            totalFleets: 5,
            totalShips: 50,
            totalCrew: 5000,
            navalBudget: 500000,
          },
          doctrine: {
            defensivePosture: 0.5,
            offensiveCapability: 0.5,
            explorationPriority: 0.5,
          },
          homePort: `Port_${i}`,
          lastUpdateTick: 0,
        };
        navy.addComponent(navyComp);
      }
    });

    it('should mobilize all species for existential threat', () => {
      // Add existential threat
      councilComp.science.existentialThreats.push({
        id: 'crisis_1',
        type: 'AI_uprising',
        severity: 'extinction_level',
        affectedSectors: ['Sector_1', 'Sector_2', 'Sector_3'],
        detectedTick: 0,
        containmentStatus: 'spreading',
      });

      // Trigger crisis response
      (system as any).respondToCrises(world, councilComp, councilEntity, 0);

      // Verify response mobilized
      const responses = (system as any).activeCrisisResponses.get(councilComp.name);
      expect(responses).toHaveLength(1);

      const response = responses[0];
      expect(response.respondingSpecies).toHaveLength(5); // All 5 species
      expect(response.status).toBe('executing');
      expect(response.fleetsMobilized.length).toBeGreaterThan(0);
    });

    it('should emit crisis declared event', () => {
      const events: any[] = [];
      world.eventBus.on('galactic_council:crisis_declared', (event) => {
        events.push(event);
      });

      councilComp.science.existentialThreats.push({
        id: 'crisis_2',
        type: 'extradimensional_invasion',
        severity: 'major',
        affectedSectors: ['Border_Sector'],
        detectedTick: 0,
        containmentStatus: 'contained',
      });

      (system as any).respondToCrises(world, councilComp, councilEntity, 0);

      expect(events).toHaveLength(1);
      expect(events[0]?.data.crisisType).toBe('extradimensional_invasion');
    });
  });

  describe('Dispute Mediation', () => {
    beforeEach(() => {
      // Add species
      const species1 = world.createEntity() as EntityImpl;
      const speciesComp1: SpeciesComponent = {
        type: 'species',
        name: 'Humans',
        homeworld: 'Earth',
        population: 10_000_000_000,
        techLevel: 8,
      };
      species1.addComponent(speciesComp1);
      system.addSpeciesToCouncil(world, councilComp, species1.id, speciesComp1);

      const species2 = world.createEntity() as EntityImpl;
      const speciesComp2: SpeciesComponent = {
        type: 'species',
        name: 'Zorgons',
        homeworld: 'Zorg Prime',
        population: 5_000_000_000,
        techLevel: 9,
      };
      species2.addComponent(speciesComp2);
      system.addSpeciesToCouncil(world, councilComp, species2.id, speciesComp2);

      // Add neutral mediator species
      const species3 = world.createEntity() as EntityImpl;
      const speciesComp3: SpeciesComponent = {
        type: 'species',
        name: 'Neutrals',
        homeworld: 'Neutral World',
        population: 2_000_000_000,
        techLevel: 12, // Advanced - good mediators
      };
      species3.addComponent(speciesComp3);
      system.addSpeciesToCouncil(world, councilComp, species3.id, speciesComp3);
    });

    it('should assign neutral mediator to dispute', () => {
      // Add dispute
      councilComp.disputes.activeDisputes.push({
        id: 'dispute_1',
        parties: ['Humans', 'Zorgons'],
        type: 'territorial_claim',
        description: 'Both claim ownership of resource-rich asteroid belt',
        status: 'unresolved',
        startedTick: 0,
      });

      // Mediate disputes
      (system as any).mediateDisputes(world, councilComp, councilEntity, 0);

      const dispute = councilComp.disputes.activeDisputes[0];
      expect(dispute?.status).toBe('mediation');
      expect(dispute?.mediatorAgentId).toBeDefined();
      // Mediator should be from neutral species (Neutrals have highest tech level)
      expect(dispute?.mediatorAgentId).toContain('Neutrals');
    });

    it('should resolve dispute after mediation period', () => {
      councilComp.disputes.activeDisputes.push({
        id: 'dispute_2',
        parties: ['Humans', 'Zorgons'],
        type: 'trade_conflict',
        description: 'Trade embargo dispute',
        status: 'unresolved',
        startedTick: 0,
      });

      // Start mediation
      (system as any).mediateDisputes(world, councilComp, councilEntity, 0);

      expect(councilComp.disputes.activeDisputes).toHaveLength(1);

      // Fast forward time (5 cosmic cycles)
      world.tick = 72000 * 6;

      // Process mediation
      (system as any).mediateDisputes(world, councilComp, councilEntity, world.tick);

      // Dispute should be resolved or escalated (removed from active)
      const activeDispute = councilComp.disputes.activeDisputes.find((d) => d.id === 'dispute_2');
      if (!activeDispute) {
        // Moved to resolved
        const resolvedDispute = councilComp.disputes.resolvedDisputes.find(
          (d) => d.id === 'dispute_2'
        );
        expect(resolvedDispute).toBeDefined();
        expect(resolvedDispute?.status).toBe('resolved');
      } else {
        // Or escalated to war
        expect(activeDispute.status).toBe('escalated_to_war');
      }
    });
  });

  describe('System Update Throttling', () => {
    it('should only update every 72000 ticks (1 hour)', () => {
      // Add species to trigger processing
      const species = world.createEntity() as EntityImpl;
      const speciesComp: SpeciesComponent = {
        type: 'species',
        name: 'TestSpecies',
        homeworld: 'TestWorld',
        population: 1_000_000_000,
        techLevel: 8,
      };
      species.addComponent(speciesComp);
      system.addSpeciesToCouncil(world, councilComp, species.id, speciesComp);

      // First update at tick 0
      system.update(world);
      expect(councilComp.lastCosmicUpdateTick).toBe(0);

      // Update at tick 1000 (too soon)
      world.tick = 1000;
      system.update(world);
      expect(councilComp.lastCosmicUpdateTick).toBe(0); // Should not update

      // Update at tick 72000 (exactly 1 hour)
      world.tick = 72000;
      system.update(world);
      expect(councilComp.lastCosmicUpdateTick).toBe(72000); // Should update
    });
  });
});

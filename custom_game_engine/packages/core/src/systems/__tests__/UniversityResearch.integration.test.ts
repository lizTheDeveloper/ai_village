import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { UniversitySystem } from '../UniversitySystem.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { TechnologyUnlockSystem } from '../TechnologyUnlockSystem.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createUniversityComponent } from '../../components/UniversityComponent.js';
import { createTechnologyUnlockComponent } from '../../components/TechnologyUnlockComponent.js';
import { createCityDirectorComponent } from '../../components/CityDirectorComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import type { UniversityComponent } from '../../components/UniversityComponent.js';
import type { TechnologyUnlockComponent } from '../../components/TechnologyUnlockComponent.js';
import type { GameEvent } from '../../events/EventMap.js';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';

describe('University Research Integration', () => {
  let eventBus: EventBusImpl;
  let world: World;
  let universitySystem: UniversitySystem;
  let buildingSystem: BuildingSystem;
  let techSystem: TechnologyUnlockSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    universitySystem = new UniversitySystem(eventBus);
    buildingSystem = new BuildingSystem();
    techSystem = new TechnologyUnlockSystem(eventBus);

    // Only BuildingSystem has initialize method
    buildingSystem.initialize(world, eventBus);
  });

  describe('Building construction to component attachment', () => {
    it('should attach UniversityComponent when university building completes', () => {
      // Create university building entity
      const university = new EntityImpl(createEntityId(), 0);
      university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
      world.addEntity(university);

      // Emit building complete event
      eventBus.emitImmediate({
        type: 'building:complete',
        source: 'test',
        data: {
          entityId: university.id,
          buildingType: BuildingType.University,
          tick: 1000,
        },
      });

      // Run building system to process event
      buildingSystem.update(world, [], 0);

      // Verify UniversityComponent was attached
      const universityComp = university.getComponent<UniversityComponent>(ComponentType.University);
      expect(universityComp).toBeDefined();
      expect(universityComp!.type).toBe('university');
      expect(universityComp!.buildingId).toBe(university.id);
      expect(universityComp!.researchMultiplier).toBe(1.0);
    });
  });

  describe('Research progress with base multiplier', () => {
    it('should process research at base speed (1.0x)', () => {
      // Create university with component
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
      world.addEntity(university);

      // Start a research project using the public API
      universitySystem.proposeResearch(
        university.id,
        world,
        'Test Research',
        'agent-123',
        ['agent-456']
      );

      // Initial progress should be 0
      expect(universityComp.activeProjects[0].progress).toBe(0);

      // Run system for 10 ticks
      for (let i = 0; i < 10; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [university], 0);
      }

      // Progress should be 1.0 (0.1 per tick * 10 ticks * 1.0 multiplier)
      expect(universityComp.activeProjects[0].progress).toBeCloseTo(1.0, 1);
    });

    it('should emit research_started event when proposing research', () => {
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      world.addEntity(university);

      const events: GameEvent[] = [];
      eventBus.on('university:research_started', (event) => events.push(event));

      universitySystem.proposeResearch(
        university.id,
        world,
        'Revolutionary Physics',
        'agent-123',
        ['agent-456', 'agent-789']
      );

      // Flush queued events
      eventBus.flush();

      expect(events).toHaveLength(1);
      expect(events[0].data.title).toBe('Revolutionary Physics');
      expect(events[0].data.principalInvestigator).toBe('agent-123');
      expect(events[0].data.researchers).toEqual(['agent-456', 'agent-789']);
    });
  });

  describe('Research completion and events', () => {
    it('should complete research and emit event when progress reaches 100%', () => {
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      world.addEntity(university);

      const completionEvents: GameEvent[] = [];
      eventBus.on('university:research_completed', (event) => completionEvents.push(event));

      // Start research
      const projectId = universitySystem.proposeResearch(
        university.id,
        world,
        'Breakthrough Discovery',
        'agent-123',
        ['agent-456']
      );

      // Run system until completion (1000 ticks to reach 100% at 0.1 per tick)
      for (let i = 0; i < 1000; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [university], 0);
      }

      // Verify project completed and moved to completedProjects
      expect(universityComp.completedProjects).toHaveLength(1);
      const completedProject = universityComp.completedProjects[0];
      expect(completedProject.progress).toBe(100);
      expect(completedProject.status).toBe('published');
      expect(completedProject.paperId).toBeDefined();

      // Flush queued events
      eventBus.flush();

      // Verify completion event
      expect(completionEvents).toHaveLength(1);
      expect(completionEvents[0].data.projectId).toBe(projectId);
      expect(completionEvents[0].data.title).toBe('Breakthrough Discovery');
      expect(completionEvents[0].data.paperId).toBeDefined();
    });
  });

  describe('Technology unlock integration', () => {
    it('should enable university collaboration multiplier (1.5x) when first university built', () => {
      // Create technology unlock component
      const techUnlockEntity = new EntityImpl(createEntityId(), 0);
      const techUnlock = createTechnologyUnlockComponent();
      techUnlock.playerCityId = 'test-city';
      techUnlockEntity.addComponent(techUnlock);
      world.addEntity(techUnlockEntity);

      // Create a player city
      const cityEntity = new EntityImpl(createEntityId(), 0);
      const cityDirector = createCityDirectorComponent(
        'test-city',
        'Test City',
        { minX: 0, maxX: 200, minY: 0, maxY: 200 },
        false
      );
      cityEntity.addComponent(cityDirector);
      cityEntity.addComponent(createPositionComponent(100, 100));
      world.addEntity(cityEntity);

      // Create university building in player city
      const university = new EntityImpl(createEntityId(), 0);
      university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
      university.addComponent(createPositionComponent(110, 110));
      world.addEntity(university);

      // Emit building complete event
      eventBus.emitImmediate({
        type: 'building:complete',
        source: 'test',
        data: {
          entityId: university.id,
          buildingType: BuildingType.University,
          tick: 1000,
        },
      });

      // Advance tick to trigger TechnologyUnlockSystem scan (scans every 100 ticks)
      (world as any)._tick = 100;

      // Run tech system to detect university
      techSystem.update(world, [], 0);

      // Verify collaboration unlocked
      expect(techUnlock.universityCollaborationEnabled).toBe(true);
    });

    it('should apply 1.5x multiplier from university collaboration to research progress', () => {
      // Create tech unlock with collaboration enabled
      const techUnlockEntity = new EntityImpl(createEntityId(), 0);
      const techUnlock = createTechnologyUnlockComponent();
      techUnlock.universityCollaborationEnabled = true;
      techUnlockEntity.addComponent(techUnlock);
      world.addEntity(techUnlockEntity);

      // Create university
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      world.addEntity(university);

      // Start research
      universitySystem.proposeResearch(
        university.id,
        world,
        'Collaborative Research',
        'agent-123',
        ['agent-456']
      );

      // Run system for 10 ticks
      for (let i = 0; i < 10; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [university], 0);
      }

      // Progress should be 1.5 (0.1 * 10 * 1.5 multiplier)
      expect(universityComp.activeProjects[0].progress).toBeCloseTo(1.5, 1);
      expect(universityComp.researchMultiplier).toBe(1.5);
    });

    it('should apply 4.5x multiplier with both collaboration and internet enabled', () => {
      // Create tech unlock with both unlocks
      const techUnlockEntity = new EntityImpl(createEntityId(), 0);
      const techUnlock = createTechnologyUnlockComponent();
      techUnlock.universityCollaborationEnabled = true;
      techUnlock.internetResearchBoostEnabled = true;
      techUnlock.globalResearchMultiplier = 3.0;
      techUnlockEntity.addComponent(techUnlock);
      world.addEntity(techUnlockEntity);

      // Create university
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      world.addEntity(university);

      // Start research
      universitySystem.proposeResearch(
        university.id,
        world,
        'Internet-Accelerated Research',
        'agent-123',
        ['agent-456']
      );

      // Run system for 10 ticks
      for (let i = 0; i < 10; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [university], 0);
      }

      // Progress should be 4.5 (0.1 * 10 * 4.5 multiplier)
      // 1.0 base * 1.5 collaboration * 3.0 internet = 4.5
      expect(universityComp.activeProjects[0].progress).toBeCloseTo(4.5, 1);
      expect(universityComp.researchMultiplier).toBe(4.5);
    });
  });

  describe('University statistics events', () => {
    it('should emit stats every 10 seconds (200 ticks)', () => {
      const university = new EntityImpl(createEntityId(), 0);
      const universityComp = createUniversityComponent('Test U', university.id, 1000);
      university.addComponent(universityComp);
      world.addEntity(university);

      const statsEvents: GameEvent[] = [];
      eventBus.on('university:stats', (event) => statsEvents.push(event));

      // Start a research project
      universitySystem.proposeResearch(
        university.id,
        world,
        'Test Research',
        'agent-123',
        []
      );

      // Run for 200 ticks
      for (let i = 0; i < 200; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [university], 0);
      }

      // Flush queued events
      eventBus.flush();

      // Should have emitted one stats event
      expect(statsEvents).toHaveLength(1);
      expect(statsEvents[0].data.universityId).toBe(university.id);
      expect(statsEvents[0].data.activeProjects).toBe(1);
      expect(statsEvents[0].data.completedProjects).toBe(0);
    });
  });

  describe('Multiple universities', () => {
    it('should process research independently for multiple universities', () => {
      // Create two universities
      const uni1 = new EntityImpl(createEntityId(), 0);
      const uni1Comp = createUniversityComponent('University 1', uni1.id, 1000);
      uni1.addComponent(uni1Comp);
      world.addEntity(uni1);

      const uni2 = new EntityImpl(createEntityId(), 0);
      const uni2Comp = createUniversityComponent('University 2', uni2.id, 1000);
      uni2.addComponent(uni2Comp);
      world.addEntity(uni2);

      // Start research at both
      universitySystem.proposeResearch(uni1.id, world, 'Research 1', 'agent-1', []);
      universitySystem.proposeResearch(uni2.id, world, 'Research 2', 'agent-2', []);

      // Run system for 10 ticks
      for (let i = 0; i < 10; i++) {
        (world as any)._tick++;
        universitySystem.update(world, [uni1, uni2], 0);
      }

      // Both should have progressed
      expect(uni1Comp.activeProjects[0].progress).toBeCloseTo(1.0, 1);
      expect(uni2Comp.activeProjects[0].progress).toBeCloseTo(1.0, 1);
    });
  });
});

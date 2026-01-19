/**
 * University NPC Research Integration Test
 *
 * Verifies that NPC city managers can autonomously produce research.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { UniversitySystem } from '../UniversitySystem.js';
import { UniversityResearchManagementSystem } from '../UniversityResearchManagementSystem.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { createUniversityComponent } from '../../components/UniversityComponent.js';
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createCityDirectorComponent } from '../../components/CityDirectorComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createSteeringComponent } from '../../components/SteeringComponent.js';
import type { UniversityComponent } from '../../components/UniversityComponent.js';
import type { GameEvent } from '../../events/EventMap.js';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';

describe('University NPC Research Integration', () => {
  let eventBus: EventBusImpl;
  let world: WorldImpl;
  let universitySystem: UniversitySystem;
  let researchManagementSystem: UniversityResearchManagementSystem;
  let buildingSystem: BuildingSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    universitySystem = new UniversitySystem(eventBus);
    researchManagementSystem = new UniversityResearchManagementSystem();
    buildingSystem = new BuildingSystem();

    // Connect the systems
    researchManagementSystem.setUniversitySystem(universitySystem);

    buildingSystem.initialize(world, eventBus);
  });

  it('should autonomously propose research in an NPC city with a university', () => {
    // ========================================================================
    // SETUP: Create NPC city with university and agents
    // ========================================================================

    // Create city director for NPC city
    const cityEntity = new EntityImpl(createEntityId(), 0);
    const cityDirector = createCityDirectorComponent(
      'npc-city-1',
      'Test NPC City',
      { minX: 0, maxX: 200, minY: 0, maxY: 200 },
      false // Not using LLM for this test
    );
    cityEntity.addComponent(cityDirector);
    cityEntity.addComponent(createPositionComponent(100, 100));
    world.addEntity(cityEntity);

    console.log('✓ Created NPC city:', cityDirector.cityName);

    // Create university building in the city
    const university = new EntityImpl(createEntityId(), 0);
    university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
    university.addComponent(createPositionComponent(100, 110));
    world.addEntity(university);

    // Complete the university building
    eventBus.emitImmediate({
      type: 'building:complete',
      source: 'test',
      data: {
        entityId: university.id,
        buildingType: BuildingType.University,
        tick: world.tick,
      },
    });

    buildingSystem.update(world, [], 0);

    // Verify UniversityComponent was attached
    const universityComp = university.getComponent<UniversityComponent>(ComponentType.University);
    expect(universityComp).toBeDefined();
    console.log('✓ University building created:', universityComp!.universityName);

    // Create several agents in the city to serve as researchers
    const agents: EntityImpl[] = [];
    for (let i = 0; i < 5; i++) {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createAgentComponent(`Researcher ${i + 1}`, false));
      agent.addComponent(createPositionComponent(90 + i * 5, 100 + i * 5));
      agent.addComponent(createSteeringComponent());
      world.addEntity(agent);
      agents.push(agent);
    }

    console.log(`✓ Created ${agents.length} agents in the city`);

    // ========================================================================
    // RUN SYSTEMS: Verify autonomous research proposal
    // ========================================================================

    // Track research started events
    const researchStartedEvents: GameEvent[] = [];
    eventBus.on('university:research_started', (event: GameEvent) => {
      researchStartedEvents.push(event);
    });

    console.log('\n=== Running Systems ===');

    // Initial state
    expect(universityComp!.activeProjects).toHaveLength(0);
    console.log('Initial research projects: 0');

    // Run research management system (should propose research)
    // Note: The system has a minProposalInterval of 600 ticks by default
    // For testing, we'll advance the tick to meet the interval
    (world as any)._tick = 600;

    researchManagementSystem.update(world, [university], 0);

    // Flush events
    eventBus.flush();

    console.log('\n=== Verification ===');

    // Verify that research was proposed
    expect(universityComp!.activeProjects.length).toBeGreaterThan(0);
    console.log(`✓ Research projects created: ${universityComp!.activeProjects.length}`);

    const project = universityComp!.activeProjects[0];
    console.log(`  Title: ${project.title}`);
    console.log(`  Status: ${project.status}`);
    console.log(`  PI: ${project.principalInvestigator}`);
    console.log(`  Researchers: ${project.researchers.join(', ')}`);

    // Verify research started event was emitted
    expect(researchStartedEvents).toHaveLength(1);
    console.log(`✓ Research started event emitted`);

    // Verify project has researchers from the city
    expect(project.principalInvestigator).toBeDefined();
    expect(project.researchers.length).toBeGreaterThan(0);

    // All researchers should be from our agent pool
    const allResearchers = [project.principalInvestigator, ...project.researchers];
    const agentIds = agents.map(a => a.id);
    for (const researcherId of allResearchers) {
      expect(agentIds).toContain(researcherId);
    }
    console.log(`✓ All researchers are from the city`);

    // ========================================================================
    // VERIFY RESEARCH PROGRESS
    // ========================================================================

    console.log('\n=== Testing Research Progress ===');

    // Run university system to process research
    for (let i = 0; i < 100; i++) {
      (world as any)._tick++;
      universitySystem.update(world, [university], 0);
    }

    console.log(`Progress after 100 ticks: ${project.progress.toFixed(2)}%`);
    expect(project.progress).toBeGreaterThan(0);
    console.log(`✓ Research is progressing`);

    // ========================================================================
    // VERIFY CAPACITY LIMITS
    // ========================================================================

    console.log('\n=== Testing Research Capacity ===');

    // Advance tick to allow more proposals
    (world as any)._tick += 600;

    // Propose more research
    researchManagementSystem.update(world, [university], 0);

    console.log(`Active projects after second proposal: ${universityComp!.activeProjects.length}`);

    // Should have proposed a second project
    expect(universityComp!.activeProjects.length).toBeGreaterThan(1);

    // Advance and propose again
    (world as any)._tick += 600;
    researchManagementSystem.update(world, [university], 0);

    console.log(`Active projects after third proposal: ${universityComp!.activeProjects.length}`);

    // Should respect max concurrent projects (default: 3)
    expect(universityComp!.activeProjects.length).toBeLessThanOrEqual(3);
    console.log(`✓ Respects max concurrent projects limit (3)`);

    console.log('\n=== NPC Research System Test Complete ===');
    console.log('✓ NPC cities can autonomously produce research');
    console.log('✓ Researchers are selected from city agents');
    console.log('✓ Research progresses over time');
    console.log('✓ Capacity limits are enforced');
  });

  it('should not propose research if no agents available in city', () => {
    // Create city with university but NO agents
    const cityEntity = new EntityImpl(createEntityId(), 0);
    const cityDirector = createCityDirectorComponent(
      'empty-city',
      'Empty City',
      { minX: 0, maxX: 200, minY: 0, maxY: 200 },
      false
    );
    cityEntity.addComponent(cityDirector);
    cityEntity.addComponent(createPositionComponent(100, 100));
    world.addEntity(cityEntity);

    const university = new EntityImpl(createEntityId(), 0);
    university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
    university.addComponent(createPositionComponent(100, 110));
    world.addEntity(university);

    eventBus.emitImmediate({
      type: 'building:complete',
      source: 'test',
      data: {
        entityId: university.id,
        buildingType: BuildingType.University,
        tick: world.tick,
      },
    });

    buildingSystem.update(world, [], 0);

    const universityComp = university.getComponent<UniversityComponent>(ComponentType.University);
    expect(universityComp).toBeDefined();

    // Try to propose research
    (world as any)._tick = 600;
    researchManagementSystem.update(world, [university], 0);

    // Should not have proposed any research (no agents available)
    expect(universityComp!.activeProjects).toHaveLength(0);
    console.log('✓ No research proposed when no agents available');
  });
});

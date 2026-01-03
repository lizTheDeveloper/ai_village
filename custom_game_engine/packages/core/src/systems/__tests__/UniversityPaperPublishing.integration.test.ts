/**
 * University Paper Publishing Integration Test
 *
 * Verifies that university research completion triggers academic paper publishing
 * and that papers are tracked in the AcademicPaperSystem.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { UniversitySystem } from '../UniversitySystem.js';
import { UniversityResearchManagementSystem } from '../UniversityResearchManagementSystem.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { AcademicPaperSystem, getAcademicPaperSystem } from '../../research/AcademicPaperSystem.js';
import { ResearchRegistry } from '../../research/ResearchRegistry.js';
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

describe('University Paper Publishing Integration', () => {
  let eventBus: EventBusImpl;
  let world: WorldImpl;
  let universitySystem: UniversitySystem;
  let researchManagementSystem: UniversityResearchManagementSystem;
  let buildingSystem: BuildingSystem;
  let academicPaperSystem: AcademicPaperSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    universitySystem = new UniversitySystem(eventBus);
    researchManagementSystem = new UniversityResearchManagementSystem();
    buildingSystem = new BuildingSystem();
    academicPaperSystem = new AcademicPaperSystem();

    // Connect the systems
    researchManagementSystem.setUniversitySystem(universitySystem);
    buildingSystem.initialize(world, eventBus);
    academicPaperSystem.initialize(world, eventBus);
  });

  it('should publish academic papers when research completes', () => {
    // ========================================================================
    // SETUP: Create NPC city with university and agents
    // ========================================================================

    // Create city director
    const cityEntity = new EntityImpl(createEntityId(), 0);
    const cityDirector = createCityDirectorComponent(
      'test-city',
      'Test City',
      { minX: 0, maxX: 200, minY: 0, maxY: 200 },
      false
    );
    cityEntity.addComponent(cityDirector);
    cityEntity.addComponent(createPositionComponent(100, 100));
    (world as any)._addEntity(cityEntity);

    // Create university building
    const university = new EntityImpl(createEntityId(), 0);
    university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
    university.addComponent(createPositionComponent(100, 110));
    (world as any)._addEntity(university);

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

    const universityComp = university.getComponent<UniversityComponent>(ComponentType.University);
    expect(universityComp).toBeDefined();

    // Create agents to serve as researchers
    const agents: EntityImpl[] = [];
    for (let i = 0; i < 3; i++) {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createAgentComponent(`Researcher ${i + 1}`, false));
      agent.addComponent(createPositionComponent(90 + i * 5, 100 + i * 5));
      agent.addComponent(createSteeringComponent());
      (world as any)._addEntity(agent);
      agents.push(agent);
    }

    // ========================================================================
    // PROPOSE RESEARCH
    // ========================================================================

    // Track research completed events
    const researchCompletedEvents: GameEvent[] = [];
    eventBus.on('university:research_completed', (event: GameEvent) => {
      researchCompletedEvents.push(event);
    });

    // Advance tick to allow research proposal
    (world as any)._tick = 600;

    // Propose research
    researchManagementSystem.update(world, [university], 0);
    eventBus.flush();

    // Verify research was proposed
    expect(universityComp!.activeProjects.length).toBe(1);
    const project = universityComp!.activeProjects[0]!;
    expect(project.status).toBe('active');

    console.log(`\n✓ Research proposed: "${project.title}"`);

    // ========================================================================
    // COMPLETE RESEARCH (simulate progress to 100%)
    // ========================================================================

    // Run university system until research completes
    let ticksToComplete = 0;
    const maxTicks = 2000; // Safety limit

    while (project.progress < 99.99 && ticksToComplete < maxTicks) {
      (world as any)._tick++;
      universitySystem.update(world, [university], 0);
      ticksToComplete++;
    }

    console.log(`✓ Research completed after ${ticksToComplete} ticks`);

    // Flush events
    eventBus.flush();

    // ========================================================================
    // VERIFY PAPER PUBLISHING
    // ========================================================================

    // Verify research completed event was emitted
    expect(researchCompletedEvents.length).toBeGreaterThan(0);
    const completionEvent = researchCompletedEvents[0]!;

    console.log('\n=== Paper Publishing Verification ===');
    console.log(`Paper ID: ${(completionEvent.data as any).paperId}`);
    console.log(`Research Complete: ${(completionEvent.data as any).researchComplete}`);

    // Verify event has paper ID
    expect((completionEvent.data as any).paperId).toBeDefined();
    expect((completionEvent.data as any).paperId).toBeTruthy();

    // Verify event has researchComplete flag
    expect((completionEvent.data as any).researchComplete).toBeDefined();
    expect(typeof (completionEvent.data as any).researchComplete).toBe('boolean');

    // Verify project status is published
    expect(project.status).toBe('published');
    expect(project.paperId).toBeDefined();

    // Verify paper exists in AcademicPaperSystem
    const paperManager = getAcademicPaperSystem().getManager();
    const paper = paperManager.getPaper(project.paperId!);
    expect(paper).toBeDefined();
    expect(paper!.title).toBeTruthy();
    expect(paper!.researchId).toBe('university_' + project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_'));

    console.log(`✓ Paper published: "${paper!.title}"`);
    console.log(`  Research ID: ${paper!.researchId}`);
    console.log(`  Field: ${paper!.field}`);
    console.log(`  Tier: ${paper!.tier}`);
    console.log(`  Authors: ${paper!.firstAuthorName}, ${paper!.coAuthorNames.join(', ')}`);

    // Verify author metrics updated
    const firstAuthor = paperManager.getAuthor(project.principalInvestigator);
    expect(firstAuthor).toBeDefined();
    expect(firstAuthor!.papers.length).toBeGreaterThan(0);
    expect(firstAuthor!.papers).toContain(project.paperId);

    console.log(`✓ First author tracked: ${firstAuthor!.name} (${firstAuthor!.papers.length} papers)`);

    // Verify research registry was updated
    const registry = ResearchRegistry.getInstance();
    const researchId = 'university_' + project.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const research = registry.tryGet(researchId);
    expect(research).toBeDefined();
    expect(research!.name).toBe(project.title);
    expect(research!.tier).toBe(2); // University research is tier 2

    console.log(`✓ Research registered: "${research!.name}" (tier ${research!.tier})`);

    console.log('\n=== Integration Test Complete ===');
    console.log('✓ University research completes');
    console.log('✓ Academic paper published');
    console.log('✓ Authors tracked with metrics');
    console.log('✓ Research registered in ResearchRegistry');
    console.log('✓ Events emitted with correct data');
  });

  it('should track multiple papers for the same research', () => {
    // Create city with university
    const cityEntity = new EntityImpl(createEntityId(), 0);
    cityEntity.addComponent(
      createCityDirectorComponent('test-city', 'Test City', { minX: 0, maxX: 200, minY: 0, maxY: 200 }, false)
    );
    cityEntity.addComponent(createPositionComponent(100, 100));
    (world as any)._addEntity(cityEntity);

    const university = new EntityImpl(createEntityId(), 0);
    university.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
    university.addComponent(createPositionComponent(100, 110));
    (world as any)._addEntity(university);

    eventBus.emitImmediate({
      type: 'building:complete',
      source: 'test',
      data: { entityId: university.id, buildingType: BuildingType.University, tick: world.tick },
    });
    buildingSystem.update(world, [], 0);

    const universityComp = university.getComponent<UniversityComponent>(ComponentType.University);
    expect(universityComp).toBeDefined();

    // Create agents
    const agents: EntityImpl[] = [];
    for (let i = 0; i < 3; i++) {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createAgentComponent(`Researcher ${i + 1}`, false));
      agent.addComponent(createPositionComponent(90 + i * 5, 100 + i * 5));
      agent.addComponent(createSteeringComponent());
      (world as any)._addEntity(agent);
      agents.push(agent);
    }

    // Propose multiple research projects on the same topic
    const topic = 'Advanced Agriculture Techniques';

    for (let i = 0; i < 3; i++) {
      const projectId = universitySystem.proposeResearch(
        university.id,
        world,
        topic,
        agents[0]!.id,
        agents.slice(1).map(a => a.id)
      );
      expect(projectId).toBeTruthy();

      // Complete the research
      const project = universityComp!.activeProjects.find(p => p.id === projectId);
      expect(project).toBeDefined();

      // Force complete by setting progress to 100
      project!.progress = 100;
      universitySystem.update(world, [university], 0);
      eventBus.flush();
    }

    // Verify multiple papers were published for the same research
    const researchId = 'university_advanced_agriculture_techniques';
    const paperManager = getAcademicPaperSystem().getManager();
    const bibliography = paperManager.getBibliography(researchId);

    expect(bibliography).toBeDefined();
    expect(bibliography!.papers.length).toBe(3);

    // Tier 2 requires 3 papers to complete
    expect(bibliography!.papersRequired).toBe(3);
    expect(bibliography!.isComplete).toBe(true);

    console.log('\n=== Multiple Papers Test ===');
    console.log(`Research: ${researchId}`);
    console.log(`Papers published: ${bibliography!.papers.length}`);
    console.log(`Papers required: ${bibliography!.papersRequired}`);
    console.log(`Research complete: ${bibliography!.isComplete}`);
    console.log('✓ Multiple papers tracked correctly');
  });
});

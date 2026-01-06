/**
 * University Research System - End-to-End Test
 *
 * This test verifies the complete university research flow from city generation
 * through research completion with technology unlock multipliers.
 */

import { describe, it, expect } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { filterEventsByType } from '../../events/EventFilters.js';

// Systems
import { UniversitySystem } from '../UniversitySystem.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { TechnologyUnlockSystem } from '../TechnologyUnlockSystem.js';
import { CityBuildingGenerationSystem } from '../CityBuildingGenerationSystem.js';

// Components
import { createBuildingComponent } from '../../components/BuildingComponent.js';
import { createTechnologyUnlockComponent } from '../../components/TechnologyUnlockComponent.js';
import { createCityDirectorComponent } from '../../components/CityDirectorComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import type { UniversityComponent } from '../../components/UniversityComponent.js';
import type { TechnologyUnlockComponent } from '../../components/TechnologyUnlockComponent.js';

// Types
import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
import type { GameEvent } from '../../events/EventMap.js';

describe('University Research System - Full E2E', () => {
  it('should complete full university research flow with technology unlocks', () => {
    // ========================================================================
    // SETUP: Create world with all necessary systems
    // ========================================================================
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const buildingSystem = new BuildingSystem();
    const techSystem = new TechnologyUnlockSystem(eventBus);
    const universitySystem = new UniversitySystem(eventBus);
    const cityGenSystem = new CityBuildingGenerationSystem(eventBus);

    buildingSystem.initialize(world, eventBus);

    // Track events
    const events: { type: string, data: any }[] = [];
    eventBus.on('building:complete', (e: GameEvent) => events.push({ type: 'building:complete', data: e.data }));
    eventBus.on('technology:building_unlocked', (e: GameEvent) => events.push({ type: 'technology:building_unlocked', data: e.data }));
    eventBus.on('university:research_started', (e: GameEvent) => events.push({ type: 'university:research_started', data: e.data }));
    eventBus.on('university:research_completed', (e: GameEvent) => events.push({ type: 'university:research_completed', data: e.data }));
    eventBus.on('university:stats', (e: GameEvent) => events.push({ type: 'university:stats', data: e.data }));

    console.log('\n=== PHASE 1: World Initialization ===');

    // ========================================================================
    // Create technology unlock singleton
    // ========================================================================
    const techUnlockEntity = new EntityImpl(createEntityId(), 0);
    const techUnlock = createTechnologyUnlockComponent();
    techUnlockEntity.addComponent(techUnlock);
    (world as any)._addEntity(techUnlockEntity);

    console.log('✓ Technology unlock system initialized');

    // ========================================================================
    // Create a player city
    // ========================================================================
    const playerCityEntity = new EntityImpl(createEntityId(), 0);
    const playerCity = createCityDirectorComponent(
      'player-city-1', // cityId
      'Player City',   // cityName
      { minX: 50, maxX: 150, minY: 50, maxY: 150 }, // bounds (includes university at 110, 110)
      false // useLLM
    );
    playerCityEntity.addComponent(playerCity);
    playerCityEntity.addComponent(createPositionComponent(100, 100));
    (world as any)._addEntity(playerCityEntity);

    techUnlock.playerCityId = 'player-city-1';

    console.log('✓ Player city created at (100, 100)');
    console.log(`  City ID: ${playerCity.cityId}`);

    // ========================================================================
    // PHASE 2: Build first university (unlocks research collaboration)
    // ========================================================================
    console.log('\n=== PHASE 2: Building First University ===');

    const university1 = new EntityImpl(createEntityId(), 0);
    university1.addComponent(createBuildingComponent(BuildingType.University, 1, 100));
    university1.addComponent(createPositionComponent(110, 110));
    (world as any)._addEntity(university1);

    // Emit building complete event (immediate so component is attached synchronously)
    eventBus.emitImmediate({
      type: 'building:complete',
      source: 'test',
      data: {
        entityId: university1.id,
        buildingType: BuildingType.University,
        tick: world.tick,
      },
    });

    console.log(`✓ University building created: ${university1.id}`);

    // Run systems to process building completion and tech unlock
    buildingSystem.update(world, [], 0);

    // Advance tick to trigger TechnologyUnlockSystem scan (scans every 100 ticks)
    (world as any)._tick = 100;
    techSystem.update(world, [], 0);

    // Verify UniversityComponent was attached
    const uni1Comp = university1.getComponent<UniversityComponent>(ComponentType.University);
    expect(uni1Comp).toBeDefined();
    console.log(`✓ UniversityComponent attached to building`);
    console.log(`  Name: ${uni1Comp!.universityName}`);
    console.log(`  Motto: ${uni1Comp!.motto}`);

    // Verify technology unlock
    expect(techUnlock.universityCollaborationEnabled).toBe(true);
    console.log(`✓ University collaboration unlocked globally`);

    // ========================================================================
    // PHASE 3: Start research project
    // ========================================================================
    console.log('\n=== PHASE 3: Starting Research Project ===');

    const projectId = universitySystem.proposeResearch(
      university1.id,
      world,
      'Quantum Computing Fundamentals',
      'prof-001',
      ['researcher-002', 'researcher-003']
    );

    expect(projectId).toBeDefined();
    expect(uni1Comp!.activeProjects).toHaveLength(1);

    const project = uni1Comp!.activeProjects[0];
    console.log(`✓ Research project started: ${projectId}`);
    console.log(`  Title: ${project.title}`);
    console.log(`  PI: ${project.principalInvestigator}`);
    console.log(`  Researchers: ${project.researchers.join(', ')}`);
    console.log(`  Initial multiplier: ${uni1Comp!.researchMultiplier}x`);

    // ========================================================================
    // PHASE 4: Simulate research progress (base 1.5x with collaboration)
    // ========================================================================
    console.log('\n=== PHASE 4: Research Progress (30 ticks) ===');

    for (let i = 0; i < 30; i++) {
      (world as any)._tick++;
      universitySystem.update(world, [university1], 0);
    }

    console.log(`✓ Simulated 30 ticks of research`);
    console.log(`  Expected progress: ~4.5% (0.1 * 30 * 1.5)`);
    console.log(`  Actual progress: ${project.progress.toFixed(2)}%`);
    console.log(`  Research multiplier: ${uni1Comp!.researchMultiplier}x`);

    expect(project.progress).toBeGreaterThan(4);
    expect(project.progress).toBeLessThan(5);
    expect(uni1Comp!.researchMultiplier).toBe(1.5); // Collaboration enabled

    // ========================================================================
    // PHASE 5: Simulate internet unlock (boosts to 4.5x)
    // ========================================================================
    console.log('\n=== PHASE 5: Unlocking Internet Research Boost ===');

    // Manually enable internet for testing
    techUnlock.internetResearchBoostEnabled = true;
    techUnlock.globalResearchMultiplier = 3.0;

    console.log(`✓ Internet research boost enabled`);
    console.log(`  Global multiplier: ${techUnlock.globalResearchMultiplier}x`);

    // Run a few more ticks to see the boosted progress
    for (let i = 0; i < 20; i++) {
      (world as any)._tick++;
      universitySystem.update(world, [university1], 0);
    }

    console.log(`✓ Simulated 20 more ticks with internet boost`);
    console.log(`  Expected additional progress: ~9% (0.1 * 20 * 4.5)`);
    console.log(`  Total progress: ${project.progress.toFixed(2)}%`);
    console.log(`  Current multiplier: ${uni1Comp!.researchMultiplier}x`);

    expect(uni1Comp!.researchMultiplier).toBe(4.5); // 1.5 * 3.0
    expect(project.progress).toBeGreaterThan(13); // 4.5 + 9 = 13.5

    // ========================================================================
    // PHASE 6: Complete the research
    // ========================================================================
    console.log('\n=== PHASE 6: Completing Research ===');

    const initialProgress = project.progress;
    const ticksNeeded = Math.ceil((100 - initialProgress) / (0.1 * 4.5));

    console.log(`  Current progress: ${initialProgress.toFixed(2)}%`);
    console.log(`  Ticks needed to complete: ${ticksNeeded}`);

    for (let i = 0; i < ticksNeeded + 10; i++) {
      (world as any)._tick++;
      universitySystem.update(world, [university1], 0);

      if (project.status === 'published') {
        console.log(`✓ Research completed at tick ${world.tick}!`);
        break;
      }
    }

    expect(project.status).toBe('published');
    expect(project.progress).toBe(100);
    expect(project.paperId).toBeDefined();

    console.log(`✓ Research project completed`);
    console.log(`  Paper ID: ${project.paperId}`);
    console.log(`  Quality: ${project.quality.toFixed(2)}`);
    console.log(`  Novelty: ${project.novelty.toFixed(2)}`);

    // ========================================================================
    // PHASE 7: Verify events were emitted
    // ========================================================================
    console.log('\n=== PHASE 7: Event Verification ===');

    // Flush queued events so they can be captured by listeners
    eventBus.flush();

    const buildingCompleteEvents = filterEventsByType(events, 'building:complete');
    const techUnlockEvents = filterEventsByType(events, 'technology:building_unlocked');
    const researchStartedEvents = filterEventsByType(events, 'university:research_started');
    const researchCompletedEvents = filterEventsByType(events, 'university:research_completed');

    console.log(`✓ Events emitted:`);
    console.log(`  building:complete: ${buildingCompleteEvents.length}`);
    console.log(`  technology:building_unlocked: ${techUnlockEvents.length}`);
    console.log(`  university:research_started: ${researchStartedEvents.length}`);
    console.log(`  university:research_completed: ${researchCompletedEvents.length}`);

    expect(buildingCompleteEvents.length).toBeGreaterThan(0);
    expect(researchStartedEvents.length).toBe(1);
    expect(researchCompletedEvents.length).toBe(1);

    // ========================================================================
    // PHASE 8: Summary
    // ========================================================================
    console.log('\n=== TEST COMPLETE ===');
    console.log('✓ University building system: PASSED');
    console.log('✓ Research progress with multipliers: PASSED');
    console.log('✓ Technology unlock integration: PASSED');
    console.log('✓ Event emission: PASSED');
    console.log('\nUniversity Research System is fully operational!');
  }, 30000); // 30 second timeout for full E2E test
});

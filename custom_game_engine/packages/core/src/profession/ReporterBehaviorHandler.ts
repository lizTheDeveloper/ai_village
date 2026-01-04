/**
 * ReporterBehaviorHandler - Handles field reporter navigation and scene coverage
 *
 * Integrates with:
 * - EventReportingSystem (detects when reporters are dispatched)
 * - NewsroomSystem (tracks field reporter status)
 * - NavigateBehavior (moves reporters to scenes)
 *
 * Workflow:
 * 1. Reporter dispatched by news desk → status becomes 'en_route'
 * 2. This handler sets reporter.behavior = 'navigate' to story location
 * 3. NavigateBehavior moves reporter to scene
 * 4. EventReportingSystem detects arrival → status becomes 'on_scene'
 * 5. Recording starts automatically
 */

import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { ProfessionComponent } from '../components/ProfessionComponent.js';
import { getNewsroomSystem } from '../television/formats/NewsroomSystem.js';
import type { FieldReporter, NewsStory, NewsDesk } from '../television/formats/NewsroomSystem.js';

/**
 * Check and update field reporter navigation.
 * Called by ProfessionWorkSimulationSystem during update.
 */
export function updateReporterBehaviors(world: World, _currentTick: number): void {
  const newsroomSystem = getNewsroomSystem();
  const deskManager = newsroomSystem.getDeskManager();

  // Get all news desks
  const desks = Array.from((deskManager as any).desks.values()) as NewsDesk[];

  for (const desk of desks) {
    for (const reporter of desk.fieldReporters) {
      // Only handle reporters that are dispatched but not yet navigating
      if (reporter.status !== 'en_route') {
        continue;
      }

      const entity = world.getEntity(reporter.agentId) as EntityImpl | null;
      if (!entity) continue;

      const agent = entity.getComponent<AgentComponent>(CT.Agent);
      if (!agent) continue;

      // Check if reporter already navigating
      if (agent.behavior === 'navigate') {
        continue;  // Already en route
      }

      // Find assigned story
      const story = desk.storyQueue.find((s: NewsStory) => s.id === reporter.assignedStoryId);
      if (!story || !story.location) {
        console.warn(`[ReporterBehavior] Reporter ${reporter.name} dispatched to story without location`);
        continue;
      }

      // Set reporter to follow target entity (or navigate to location if no entity)
      setReporterNavigation(entity, story);

    }
  }
}

/**
 * Set a reporter's behavior to follow target entity or navigate to location.
 */
function setReporterNavigation(
  reporterEntity: EntityImpl,
  story: NewsStory
): void {
  const agent = reporterEntity.getComponent<AgentComponent>(CT.Agent);
  if (!agent || !story.location) return;

  // Check if story has a source entity to follow
  if (story.sourceEntityId) {
    // Follow the entity (aliens, battle, etc.) with safe distance
    reporterEntity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'follow_reporting_target',
      behaviorState: {
        targetEntityId: story.sourceEntityId,
        safeDistance: 80, // Stay 80 units away from danger
        purpose: `covering story: ${story.headline}`,
      },
      lastThought: `I need to find and follow the subject: ${story.headline}`,
    }));

  } else if (story.location) {
    // No entity - just navigate to fixed location
    const location = story.location; // Destructure to help TypeScript narrow the type
    reporterEntity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
      ...current,
      behavior: 'navigate',
      behaviorState: {
        target: { x: location.x, y: location.y },
        purpose: `covering story: ${story.headline}`,
      },
      lastThought: `I need to get to the scene to cover this story: ${story.headline}`,
    }));

  } else {
    // No entity and no location - story can't be covered
    console.warn(`[ReporterBehavior] Story "${story.headline}" has no entity or location to cover`);
  }
}

/**
 * Check if an agent is a field reporter.
 */
export function isFieldReporter(entity: EntityImpl): boolean {
  const profession = entity.getComponent<ProfessionComponent>('profession' as any);
  if (!profession) return false;

  // Check if this agent is registered as a field reporter in any news desk
  const newsroomSystem = getNewsroomSystem();
  const deskManager = newsroomSystem.getDeskManager();
  const desks = Array.from((deskManager as any).desks.values()) as NewsDesk[];

  for (const desk of desks) {
    const isReporter = desk.fieldReporters.some(
      (r: FieldReporter) => r.agentId === entity.id
    );
    if (isReporter) return true;
  }

  return false;
}

/**
 * Get field reporter's current assignment.
 */
export function getReporterAssignment(reporterId: string): {
  status: 'available' | 'en_route' | 'on_scene' | 'reporting_live';
  assignedStoryId?: string;
  story?: NewsStory;
} | null {
  const newsroomSystem = getNewsroomSystem();
  const deskManager = newsroomSystem.getDeskManager();
  const desks = Array.from((deskManager as any).desks.values()) as NewsDesk[];

  for (const desk of desks) {
    const reporter = desk.fieldReporters.find((r: FieldReporter) => r.agentId === reporterId);
    if (!reporter) continue;

    const story = reporter.assignedStoryId
      ? desk.storyQueue.find((s: NewsStory) => s.id === reporter.assignedStoryId)
      : undefined;

    return {
      status: reporter.status,
      assignedStoryId: reporter.assignedStoryId,
      story,
    };
  }

  return null;
}

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
import type { EntityImpl } from '../ecs/EntityImpl.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { ProfessionComponent } from '../components/ProfessionComponent.js';
import { getNewsroomSystem } from '../television/formats/NewsroomSystem.js';
import type { FieldReporter, NewsStory } from '../television/formats/NewsroomSystem.js';

/**
 * Check and update field reporter navigation.
 * Called by ProfessionWorkSimulationSystem during update.
 */
export function updateReporterBehaviors(world: World, currentTick: number): void {
  const newsroomSystem = getNewsroomSystem();
  const deskManager = newsroomSystem.getDeskManager();

  // Get all news desks
  const desks = Array.from((deskManager as any).desks.values());

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

      // Set reporter to navigate to story location
      setReporterNavigation(entity, story.location, story.headline);

      console.log(`[ReporterBehavior] ${reporter.name} navigating to: ${story.headline} at (${Math.floor(story.location.x)}, ${Math.floor(story.location.y)})`);
    }
  }
}

/**
 * Set a reporter's behavior to navigate to a story location.
 */
function setReporterNavigation(
  reporterEntity: EntityImpl,
  target: { x: number; y: number },
  storyHeadline: string
): void {
  const agent = reporterEntity.getComponent<AgentComponent>(CT.Agent);
  if (!agent) return;

  // Set navigate behavior
  reporterEntity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
    ...current,
    behavior: 'navigate',
    behaviorState: {
      target: { x: target.x, y: target.y },
      purpose: `covering story: ${storyHeadline}`,
    },
    lastThought: `I need to get to the scene to cover this story: ${storyHeadline}`,
  }));
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
  const desks = Array.from((deskManager as any).desks.values());

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
  const desks = Array.from((deskManager as any).desks.values());

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

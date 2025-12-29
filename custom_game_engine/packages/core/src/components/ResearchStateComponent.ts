/**
 * ResearchStateComponent - Tracks research progress for the world
 *
 * This component is attached to the world entity and tracks:
 * - Completed research projects
 * - In-progress research with progress tracking
 * - Research queue
 * - Discovered (procedurally generated) research
 * - Rate limiting for discoveries
 *
 * Supports persistence across save/load per user requirements.
 *
 * Part of Phase 13: Research & Discovery
 */

import type { Component } from '../ecs/Component.js';
import type { ResearchProgress, Insight } from '../research/types.js';

/**
 * Research state component for tracking research progress.
 * Attached to the world entity, not individual agents.
 */
export interface ResearchStateComponent extends Component {
  type: 'research_state';

  /** Set of completed research IDs */
  completed: Set<string>;

  /** Map of research ID to completion tick */
  completedAt: Map<string, number>;

  /** Map of research ID to in-progress tracking */
  inProgress: Map<string, ResearchProgress>;

  /** Ordered queue of research IDs to work on */
  queue: string[];

  /** IDs of procedurally discovered research */
  discoveredResearch: string[];

  /** Count of discoveries today (for rate limiting) */
  dailyDiscoveries: number;

  /** Count of discoveries this season (for rate limiting) */
  seasonalDiscoveries: number;

  /** Last tick when a discovery was made */
  lastDiscoveryTick: number;
}

/**
 * Create a new ResearchStateComponent with default values.
 */
export function createResearchStateComponent(): ResearchStateComponent {
  return {
    type: 'research_state',
    version: 1,
    completed: new Set(),
    completedAt: new Map(),
    inProgress: new Map(),
    queue: [],
    discoveredResearch: [],
    dailyDiscoveries: 0,
    seasonalDiscoveries: 0,
    lastDiscoveryTick: 0,
  };
}

/**
 * Mark a research as completed.
 */
export function completeResearch(
  state: ResearchStateComponent,
  researchId: string,
  currentTick: number
): ResearchStateComponent {
  const newCompleted = new Set(state.completed);
  newCompleted.add(researchId);

  const newCompletedAt = new Map(state.completedAt);
  newCompletedAt.set(researchId, currentTick);

  const newInProgress = new Map(state.inProgress);
  newInProgress.delete(researchId);

  const newQueue = state.queue.filter((id) => id !== researchId);

  return {
    ...state,
    completed: newCompleted,
    completedAt: newCompletedAt,
    inProgress: newInProgress,
    queue: newQueue,
  };
}

/**
 * Start researching a project.
 */
export function startResearch(
  state: ResearchStateComponent,
  researchId: string,
  researcherId: string,
  currentTick: number
): ResearchStateComponent {
  if (state.completed.has(researchId)) {
    throw new Error(`Research '${researchId}' is already completed`);
  }

  const existing = state.inProgress.get(researchId);
  if (existing) {
    // Add researcher to existing progress (multi-agent collaboration)
    if (!existing.researchers.includes(researcherId)) {
      const newProgress: ResearchProgress = {
        ...existing,
        researchers: [...existing.researchers, researcherId],
      };
      const newInProgress = new Map(state.inProgress);
      newInProgress.set(researchId, newProgress);
      return { ...state, inProgress: newInProgress };
    }
    return state;
  }

  const progress: ResearchProgress = {
    researchId,
    currentProgress: 0,
    startedAt: currentTick,
    researchers: [researcherId],
    insights: [],
  };

  const newInProgress = new Map(state.inProgress);
  newInProgress.set(researchId, progress);

  return {
    ...state,
    inProgress: newInProgress,
  };
}

/**
 * Update research progress.
 */
export function updateResearchProgress(
  state: ResearchStateComponent,
  researchId: string,
  progressDelta: number
): ResearchStateComponent {
  const existing = state.inProgress.get(researchId);
  if (!existing) {
    throw new Error(`Research '${researchId}' is not in progress`);
  }

  const newProgress: ResearchProgress = {
    ...existing,
    currentProgress: existing.currentProgress + progressDelta,
  };

  const newInProgress = new Map(state.inProgress);
  newInProgress.set(researchId, newProgress);

  return {
    ...state,
    inProgress: newInProgress,
  };
}

/**
 * Add an insight from experimentation.
 */
export function addInsight(
  state: ResearchStateComponent,
  researchId: string,
  insight: Insight
): ResearchStateComponent {
  const existing = state.inProgress.get(researchId);
  if (!existing) {
    throw new Error(`Research '${researchId}' is not in progress`);
  }

  const newProgress: ResearchProgress = {
    ...existing,
    insights: [...existing.insights, insight],
  };

  const newInProgress = new Map(state.inProgress);
  newInProgress.set(researchId, newProgress);

  return {
    ...state,
    inProgress: newInProgress,
  };
}

/**
 * Queue a research project for future work.
 */
export function queueResearch(
  state: ResearchStateComponent,
  researchId: string
): ResearchStateComponent {
  if (state.queue.includes(researchId)) {
    return state;
  }
  return {
    ...state,
    queue: [...state.queue, researchId],
  };
}

/**
 * Remove a research project from the queue.
 */
export function dequeueResearch(
  state: ResearchStateComponent,
  researchId: string
): ResearchStateComponent {
  return {
    ...state,
    queue: state.queue.filter((id) => id !== researchId),
  };
}

/**
 * Record a procedural discovery.
 */
export function recordDiscovery(
  state: ResearchStateComponent,
  researchId: string,
  currentTick: number
): ResearchStateComponent {
  return {
    ...state,
    discoveredResearch: [...state.discoveredResearch, researchId],
    dailyDiscoveries: state.dailyDiscoveries + 1,
    seasonalDiscoveries: state.seasonalDiscoveries + 1,
    lastDiscoveryTick: currentTick,
  };
}

/**
 * Reset daily discovery count (called at start of new day).
 */
export function resetDailyDiscoveries(
  state: ResearchStateComponent
): ResearchStateComponent {
  return {
    ...state,
    dailyDiscoveries: 0,
  };
}

/**
 * Reset seasonal discovery count (called at start of new season).
 */
export function resetSeasonalDiscoveries(
  state: ResearchStateComponent
): ResearchStateComponent {
  return {
    ...state,
    seasonalDiscoveries: 0,
  };
}

/**
 * Check if a research is completed.
 */
export function isResearchCompleted(
  state: ResearchStateComponent,
  researchId: string
): boolean {
  return state.completed.has(researchId);
}

/**
 * Check if a research is in progress.
 */
export function isResearchInProgress(
  state: ResearchStateComponent,
  researchId: string
): boolean {
  return state.inProgress.has(researchId);
}

/**
 * Get progress for an in-progress research.
 */
export function getResearchProgress(
  state: ResearchStateComponent,
  researchId: string
): ResearchProgress | undefined {
  return state.inProgress.get(researchId);
}

/**
 * Get all researchers who contributed to a research (for "et al" credit).
 */
export function getResearchers(
  state: ResearchStateComponent,
  researchId: string
): string[] {
  const progress = state.inProgress.get(researchId);
  if (progress) {
    return progress.researchers;
  }
  return [];
}

/**
 * Serialize research state for save/load.
 * Converts Sets and Maps to arrays for JSON serialization.
 */
export function serializeResearchState(
  state: ResearchStateComponent
): Record<string, unknown> {
  return {
    type: state.type,
    version: state.version,
    completed: Array.from(state.completed),
    completedAt: Array.from(state.completedAt.entries()),
    inProgress: Array.from(state.inProgress.entries()),
    queue: state.queue,
    discoveredResearch: state.discoveredResearch,
    dailyDiscoveries: state.dailyDiscoveries,
    seasonalDiscoveries: state.seasonalDiscoveries,
    lastDiscoveryTick: state.lastDiscoveryTick,
  };
}

/**
 * Deserialize research state from save data.
 * Converts arrays back to Sets and Maps.
 */
export function deserializeResearchState(
  data: Record<string, unknown>
): ResearchStateComponent {
  const completedArray = data.completed as string[];
  const completedAtArray = data.completedAt as [string, number][];
  const inProgressArray = data.inProgress as [string, ResearchProgress][];

  return {
    type: 'research_state',
    version: (data.version as number) ?? 1,
    completed: new Set(completedArray),
    completedAt: new Map(completedAtArray),
    inProgress: new Map(inProgressArray),
    queue: (data.queue as string[]) ?? [],
    discoveredResearch: (data.discoveredResearch as string[]) ?? [],
    dailyDiscoveries: (data.dailyDiscoveries as number) ?? 0,
    seasonalDiscoveries: (data.seasonalDiscoveries as number) ?? 0,
    lastDiscoveryTick: (data.lastDiscoveryTick as number) ?? 0,
  };
}

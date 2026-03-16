/**
 * TimelineComponent - stub component for universe timeline tracking
 */

export interface TimelineEvent {
  eventId: string;
  tick: number;
  type: string;
  data?: unknown;
}

export interface TimelineComponent {
  type: 'timeline';
  version: 1;
  id: string;
  universeId: string;
  events: TimelineEvent[];
  branchPoints: number[];
  mergeCompatibility: number;
  divergenceFromParent: number;
}

export function createTimelineComponent(
  id: string,
  universeId: string
): TimelineComponent {
  return {
    type: 'timeline',
    version: 1,
    id,
    universeId,
    events: [],
    branchPoints: [],
    mergeCompatibility: 1.0,
    divergenceFromParent: 0,
  };
}

/**
 * NewsItem - A piece of news that propagates between villages.
 *
 * News items are created by NewsPropagationSystem when significant events occur
 * in a village. They spread outward to nearby villages with a distance-proportional delay.
 *
 * High-importance events (wars, disasters) spread further and faster than low-importance ones.
 */
export interface NewsItem {
  id: string;
  type:
    | 'disaster'
    | 'war'
    | 'trade'
    | 'birth'
    | 'death'
    | 'festival'
    | 'construction'
    | 'discovery'
    | 'political';
  description: string;
  sourceVillageId: string;
  sourceVillageName: string;
  createdTick: number;
  importance: number; // 0-1 (1 = world-changing event)
  // Propagation state
  knownByVillages: Map<string, number>; // villageId -> tick when they learned it
  propagationRadius: number;            // In tiles — how far the news can travel
}

/**
 * Create a new NewsItem.
 */
export function createNewsItem(
  id: string,
  type: NewsItem['type'],
  description: string,
  sourceVillageId: string,
  sourceVillageName: string,
  createdTick: number,
  importance: number,
  propagationRadius: number
): NewsItem {
  if (importance < 0 || importance > 1) {
    throw new Error(`[NewsItem] importance must be 0-1, got ${importance}`);
  }
  if (propagationRadius < 0) {
    throw new Error(`[NewsItem] propagationRadius must be non-negative, got ${propagationRadius}`);
  }
  return {
    id,
    type,
    description,
    sourceVillageId,
    sourceVillageName,
    createdTick,
    importance,
    knownByVillages: new Map([[sourceVillageId, createdTick]]),
    propagationRadius,
  };
}

/**
 * Text Renderer Adapters
 *
 * Adapter functions to connect the TextRenderer with terrain and event systems.
 */

import type { EventBus, GameEvent } from '@ai-village/core';
import type { TerrainProvider, EventProvider } from './types.js';

/**
 * Interface for terrain feature analyzer (matches @ai-village/world's TerrainFeatureAnalyzer).
 */
interface TerrainFeatureAnalyzerLike {
  analyzeArea(
    getTileAt: (x: number, y: number) => any,
    centerX: number,
    centerY: number,
    radius?: number
  ): Array<{ type: string; description: string; x: number; y: number }>;
  describeNearby(
    features: Array<{ type: string; description: string; x: number; y: number }>,
    observerX: number,
    observerY: number,
    maxDistance?: number
  ): string;
}

/**
 * Interface for tile accessor function.
 */
type GetTileAt = (x: number, y: number) => any;

/**
 * Create a TerrainProvider adapter from TerrainFeatureAnalyzer.
 *
 * @param analyzer The terrain analyzer instance
 * @param getTileAt Function to get tiles at world coordinates
 * @param radius Search radius for terrain analysis
 * @returns TerrainProvider implementation
 *
 * @example
 * ```typescript
 * import { globalTerrainAnalyzer } from '@ai-village/world';
 *
 * const terrainProvider = createTerrainAdapter(
 *   globalTerrainAnalyzer,
 *   (x, y) => world.getTileAt(x, y),
 *   20
 * );
 * textRenderer.setTerrainProvider(terrainProvider);
 * ```
 */
export function createTerrainAdapter(
  analyzer: TerrainFeatureAnalyzerLike,
  getTileAt: GetTileAt,
  radius: number = 20
): TerrainProvider {
  // Cache analyzed features by position (cleared periodically)
  const featureCache = new Map<string, {
    features: Array<{ type: string; description: string; x: number; y: number }>;
    timestamp: number;
  }>();
  const CACHE_TTL = 5000; // 5 seconds

  return {
    getTerrainDescription(x: number, y: number): string | undefined {
      const cacheKey = `${Math.floor(x / 10)},${Math.floor(y / 10)}`;
      const now = Date.now();

      // Check cache
      const cached = featureCache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return analyzer.describeNearby(cached.features, x, y, radius);
      }

      // Analyze area
      const features = analyzer.analyzeArea(getTileAt, x, y, radius);

      // Cache result
      featureCache.set(cacheKey, { features, timestamp: now });

      // Clean old cache entries
      if (featureCache.size > 100) {
        for (const [key, value] of featureCache) {
          if (now - value.timestamp > CACHE_TTL * 2) {
            featureCache.delete(key);
          }
        }
      }

      return analyzer.describeNearby(features, x, y, radius);
    },
  };
}

/**
 * Event type to human-readable description mapping.
 */
const EVENT_DESCRIPTIONS: Record<string, (event: GameEvent) => string | null> = {
  'agent:action:started': (e) => {
    const data = e.data as { actionType?: string; actionId?: string } | undefined;
    if (!data?.actionType) return null;
    return `Action started: ${data.actionType}`;
  },
  'agent:action:completed': (e) => {
    const data = e.data as { actionType?: string; success?: boolean } | undefined;
    if (!data?.actionType) return null;
    return `Action completed: ${data.actionType}${data.success === false ? ' (failed)' : ''}`;
  },
  'agent:speech': (e) => {
    const data = e.data as { speakerName?: string; text?: string } | undefined;
    if (!data?.speakerName || !data?.text) return null;
    return `${data.speakerName} says: "${data.text}"`;
  },
  'building:completed': (e) => {
    const data = e.data as { buildingType?: string } | undefined;
    if (!data?.buildingType) return null;
    return `Building completed: ${data.buildingType}`;
  },
  'resource:harvested': (e) => {
    const data = e.data as { resourceType?: string; amount?: number } | undefined;
    if (!data?.resourceType) return null;
    return `Harvested ${data.amount ?? 1} ${data.resourceType}`;
  },
  'combat:attack': (e) => {
    const data = e.data as { attackerName?: string; targetName?: string; damage?: number } | undefined;
    if (!data?.attackerName || !data?.targetName) return null;
    return `${data.attackerName} attacks ${data.targetName}${data.damage ? ` for ${data.damage} damage` : ''}`;
  },
  'entity:died': (e) => {
    const data = e.data as { name?: string; cause?: string } | undefined;
    if (!data?.name) return null;
    return `${data.name} died${data.cause ? ` (${data.cause})` : ''}`;
  },
  'agent:birth': (e) => {
    const data = e.data as { name?: string } | undefined;
    if (!data?.name) return null;
    return `${data.name} was born`;
  },
};

/**
 * Create an EventProvider adapter from EventBus.
 *
 * @param eventBus The event bus instance
 * @param eventTypes Optional list of event types to include (defaults to common action events)
 * @returns EventProvider implementation
 *
 * @example
 * ```typescript
 * const eventProvider = createEventAdapter(eventBus);
 * textRenderer.setEventProvider(eventProvider);
 * ```
 */
export function createEventAdapter(
  eventBus: EventBus,
  eventTypes?: string[]
): EventProvider {
  const includedTypes = eventTypes ?? Object.keys(EVENT_DESCRIPTIONS);

  return {
    getRecentEvents(sinceTick: number, limit: number): string[] {
      // Get event history
      const history = eventBus.getHistory(sinceTick);

      // Filter and map to descriptions
      const descriptions: string[] = [];

      for (const event of history) {
        if (descriptions.length >= limit) break;

        // Check if we have a description for this event type
        if (!includedTypes.includes(event.type)) continue;

        const describer = EVENT_DESCRIPTIONS[event.type];
        if (!describer) continue;

        const description = describer(event);
        if (description) {
          descriptions.push(description);
        }
      }

      return descriptions;
    },
  };
}

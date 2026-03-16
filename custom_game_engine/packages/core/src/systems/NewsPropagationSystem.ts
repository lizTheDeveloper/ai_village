/**
 * NewsPropagationSystem - Spreads news between villages with distance-based delay
 *
 * This system:
 * 1. Monitors village events from 'detailed' villages and converts them to NewsItems
 * 2. Propagates news to nearby villages proportional to distance
 * 3. Emits 'village:news_received' when a village first learns a piece of news
 *
 * Priority: 196 (after VillageSummarySystem at 195)
 * Throttle: 300 ticks (15 seconds)
 *
 * News travels at a simulated "rumor speed" — closer villages hear news sooner.
 * Only news within a village's propagationRadius is considered.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { VillageComponent } from '../components/VillageComponent.js';
import type { NewsItem } from '../types/NewsItem.js';
import { createNewsItem } from '../types/NewsItem.js';

/** Ticks per tile of distance that news propagation is delayed. */
const TICKS_PER_TILE_DELAY = 50;

/** How long to keep news items before expiring (in ticks). */
const NEWS_EXPIRY_TICKS = 100_000;

export class NewsPropagationSystem extends BaseSystem {
  public readonly id: SystemId = 'news_propagation';
  public readonly priority: number = 196;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Village as ComponentType];
  public readonly activationComponents = [CT.Village as ComponentType] as const;

  protected readonly throttleInterval: number = 300; // 15 seconds

  /** In-memory store of all active news items. */
  private newsItems: Map<string, NewsItem> = new Map();

  private nextNewsId: number = 1;

  protected onUpdate(ctx: SystemContext): void {
    const villageEntities = ctx.world
      .query()
      .with(CT.Village as ComponentType)
      .executeEntities();

    if (villageEntities.length === 0) {
      return;
    }

    // Step 1: Generate news from 'detailed' villages based on recent status events
    for (const villageEntity of villageEntities) {
      const village = villageEntity.getComponent<VillageComponent>('village');
      if (!village || village.abstractionLevel !== 'detailed') {
        continue;
      }

      this.generateNewsFromVillageEvents(ctx, village);
    }

    // Step 2: Propagate existing news to nearby villages
    this.propagateNews(ctx, villageEntities);

    // Step 3: Expire old news
    this.expireNews(ctx.tick);
  }

  private generateNewsFromVillageEvents(ctx: SystemContext, village: VillageComponent): void {
    // Convert recentEvents in the village summary to news items
    for (const event of village.summary.recentEvents) {
      // Only generate news for events within the last throttle interval
      if (ctx.tick - event.tick > this.throttleInterval * 2) {
        continue;
      }

      const newsId = `news_${this.nextNewsId++}`;
      const importance = event.impact === 'positive' ? 0.3 : event.impact === 'negative' ? 0.6 : 0.2;
      const propagationRadius = Math.round(importance * 500 + 100);

      const newsType = this.mapEventTypeToNewsType(event.type);
      const newsItem = createNewsItem(
        newsId,
        newsType,
        event.description,
        village.villageId,
        village.name,
        event.tick,
        importance,
        propagationRadius
      );

      this.newsItems.set(newsId, newsItem);
    }
  }

  private propagateNews(ctx: SystemContext, villageEntities: ReadonlyArray<Entity>): void {
    for (const [, newsItem] of this.newsItems) {
      for (const villageEntity of villageEntities) {
        const village = villageEntity.getComponent<VillageComponent>('village');
        if (!village) {
          continue;
        }

        // Skip the source village (it already knows the news)
        if (village.villageId === newsItem.sourceVillageId) {
          continue;
        }

        // Skip if already known by this village
        if (newsItem.knownByVillages.has(village.villageId)) {
          continue;
        }

        // Find the source village to compute distance
        const sourceVillage = this.findVillageById(villageEntities, newsItem.sourceVillageId);
        if (!sourceVillage) {
          continue;
        }

        const dx = village.position.x - sourceVillage.position.x;
        const dy = village.position.y - sourceVillage.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only propagate within radius
        if (distance > newsItem.propagationRadius) {
          continue;
        }

        // Check if enough ticks have elapsed for this distance
        const delayTicks = Math.round(distance * TICKS_PER_TILE_DELAY);
        const learnableTick = newsItem.createdTick + delayTicks;
        if (ctx.tick < learnableTick) {
          continue;
        }

        // Village learns the news
        newsItem.knownByVillages.set(village.villageId, ctx.tick);

        ctx.emit('village:news_received', {
          villageId: village.villageId,
          villageName: village.name,
          newsId: newsItem.id,
          newsType: newsItem.type,
          description: newsItem.description,
          sourceVillageId: newsItem.sourceVillageId,
          sourceVillageName: newsItem.sourceVillageName,
          importance: newsItem.importance,
          tick: ctx.tick,
        });
      }
    }
  }

  private expireNews(currentTick: number): void {
    for (const [id, newsItem] of this.newsItems) {
      if (currentTick - newsItem.createdTick > NEWS_EXPIRY_TICKS) {
        this.newsItems.delete(id);
      }
    }
  }

  private findVillageById(
    villageEntities: ReadonlyArray<Entity>,
    villageId: string
  ): VillageComponent | null {
    for (const entity of villageEntities) {
      const village = entity.getComponent<VillageComponent>('village');
      if (village?.villageId === villageId) {
        return village;
      }
    }
    return null;
  }

  private mapEventTypeToNewsType(eventType: string): NewsItem['type'] {
    const mapping: Record<string, NewsItem['type']> = {
      disaster: 'disaster',
      war: 'war',
      trade: 'trade',
      birth: 'birth',
      death: 'death',
      festival: 'festival',
      construction: 'construction',
      discovery: 'discovery',
      political: 'political',
    };

    const mapped = mapping[eventType];
    if (mapped !== undefined) {
      return mapped;
    }

    // Default to 'political' for unmapped event types
    return 'political';
  }

  /**
   * Inject a news item directly (e.g., from tests or other systems).
   */
  public injectNews(newsItem: NewsItem): void {
    this.newsItems.set(newsItem.id, newsItem);
  }

  /**
   * Get all current news items (read-only).
   */
  public getNewsItems(): ReadonlyMap<string, NewsItem> {
    return this.newsItems;
  }
}

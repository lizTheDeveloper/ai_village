/**
 * SacredSiteSystem - Manages sacred locations where prayers are more effective
 *
 * Part of Phase 27: Divine Communication System
 *
 * Sacred sites emerge organically when:
 * - Multiple prayers at a location are answered
 * - Buildings with prayer_site functionality are completed
 * - Natural features (ancient trees, hilltops) receive devotion
 *
 * Effects of sacred sites:
 * - Increased prayer power (multiplier on belief generated)
 * - Higher vision clarity for meditation
 * - Bonus to spiritual aptitude when praying/meditating at site
 */

import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';

/**
 * Represents a sacred site in the world
 */
export interface SacredSite {
  id: string;
  position: { x: number; y: number };
  type: 'natural' | 'built' | 'emergent';

  // Natural features
  naturalFeature?: 'ancient_tree' | 'hilltop' | 'spring' | 'cave' | 'standing_stone';

  // Built structures
  buildingId?: string;

  // Power
  prayerPower: number; // 1.0-3.0 multiplier
  visionClarity: number; // 0-1 bonus to vision clarity
  meditationBonus: number; // 0-1 bonus to meditation speed

  // Statistics
  visionCount: number; // Visions that occurred here
  prayerCount: number; // Total prayers here
  answeredPrayerCount: number; // Prayers answered here
  answerRate: number; // % of prayers answered

  // Community
  discoveredBy?: string; // Agent who discovered/created it
  discoveredAt: number; // Game tick when discovered
  namedBy?: string;
  name?: string; // "The Sacred Oak", "Vision Rock"

  // Associations
  associatedDeityId?: string; // Deity this site is dedicated to
  visitedBy: Set<string>; // Agent IDs who have used this site
}

/**
 * Configuration for different sacred building types
 */
interface SacredBuildingConfig {
  prayerPower: number;
  visionClarity: number;
  meditationBonus: number;
}

const SACRED_BUILDING_CONFIGS: Record<string, SacredBuildingConfig> = {
  'shrine': { prayerPower: 1.3, visionClarity: 0.2, meditationBonus: 0.3 },
  'temple': { prayerPower: 2.0, visionClarity: 0.4, meditationBonus: 0.5 },
  'grand_temple': { prayerPower: 3.0, visionClarity: 0.6, meditationBonus: 0.7 },
  'meditation_garden': { prayerPower: 1.2, visionClarity: 0.5, meditationBonus: 0.6 },
  'sacred_grove': { prayerPower: 1.5, visionClarity: 0.3, meditationBonus: 0.4 },
};

/**
 * Thresholds for emergent sacred site creation
 */
const EMERGENCE_THRESHOLDS = {
  MIN_ANSWERED_PRAYERS: 3, // Minimum answered prayers to create site
  MIN_ANSWER_RATE: 0.5, // Minimum 50% answer rate
  CHECK_RADIUS: 8, // Radius to check for prayer history
  RECENT_WINDOW_TICKS: 12000, // ~10 minutes of game time
};

/**
 * Record of a prayer offered at a location
 */
interface PrayerRecord {
  position: { x: number; y: number };
  agentId: string;
  prayerId: string;
  answered: boolean;
  tick: number;
}

/**
 * Cluster of nearby prayers for emergent site detection
 */
interface PrayerCluster {
  center: { x: number; y: number };
  prayers: PrayerRecord[];
  answeredCount: number;
  answerRate: number;
}

export class SacredSiteSystem implements System {
  public readonly id: SystemId = 'sacred_site';
  public readonly priority: number = 118; // After PrayerAnsweringSystem (117)
  public readonly requiredComponents = [];

  private eventBus?: EventBus;
  private events!: SystemEventManager;
  private world?: World;
  private sites: Map<string, SacredSite> = new Map();
  private siteIdCounter: number = 0;

  // Track prayer locations for emergent site discovery
  private recentPrayers: PrayerRecord[] = [];

  initialize(world: World, eventBus: EventBus): void {
    this.world = world;
    this.eventBus = eventBus;
    this.events = new SystemEventManager(eventBus, this.id);

    // Listen for prayer events
    this.events.on('prayer:offered', (data) => {
      this.handlePrayerOffered(data);
    });

    // Listen for prayer answers
    this.events.on('prayer:answered', (data) => {
      this.handlePrayerAnswered(data);
    });

    // Listen for building completions to register sacred buildings
    this.events.on('building:complete', (data) => {
      this.handleBuildingComplete(data);
    });

    // Listen for visions at locations
    this.events.on('vision:received', (data) => {
      this.handleVisionReceived(data);
    });
  }

  /**
   * Cleanup event subscriptions
   */
  cleanup(): void {
    this.events.cleanup();
  }

  update(world: World, _entities: ReadonlyArray<Entity>, currentTick: number): void {
    // Clean up old prayer records
    this.cleanupOldPrayers(currentTick);

    // Check for emergent sacred sites
    this.checkForEmergentSites(world, currentTick);

    // Update site statistics
    this.updateSiteStatistics();
  }

  /**
   * Get all sacred sites
   */
  getSites(): ReadonlyArray<SacredSite> {
    return Array.from(this.sites.values());
  }

  /**
   * Find the nearest sacred site to a position
   */
  findNearestSite(position: { x: number; y: number }, maxDistance: number = 50): SacredSite | null {
    let nearest: SacredSite | null = null;
    let nearestDist = Infinity;

    for (const site of this.sites.values()) {
      const dx = site.position.x - position.x;
      const dy = site.position.y - position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist && dist <= maxDistance) {
        nearestDist = dist;
        nearest = site;
      }
    }

    return nearest;
  }

  /**
   * Check if a position is at a sacred site
   */
  isAtSacredSite(position: { x: number; y: number }, radius: number = 5): SacredSite | null {
    return this.findNearestSite(position, radius);
  }

  /**
   * Get prayer power multiplier at a position
   */
  getPrayerPower(position: { x: number; y: number }): number {
    const site = this.isAtSacredSite(position);
    return site ? site.prayerPower : 1.0;
  }

  /**
   * Get vision clarity bonus at a position
   */
  getVisionClarity(position: { x: number; y: number }): number {
    const site = this.isAtSacredSite(position);
    return site ? site.visionClarity : 0;
  }

  /**
   * Get meditation bonus at a position
   */
  getMeditationBonus(position: { x: number; y: number }): number {
    const site = this.isAtSacredSite(position);
    return site ? site.meditationBonus : 0;
  }

  /**
   * Register an agent's visit to a sacred site
   */
  registerVisit(siteId: string, agentId: string): void {
    const site = this.sites.get(siteId);
    if (site) {
      site.visitedBy.add(agentId);
    }
  }

  /**
   * Name a sacred site
   */
  nameSite(siteId: string, name: string, namedBy: string): void {
    const site = this.sites.get(siteId);
    if (site && !site.name) {
      site.name = name;
      site.namedBy = namedBy;

      this.events.emit('sacred_site:named', {
        siteId,
        name,
        namedBy,
      });
    }
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private handlePrayerOffered(
    data: { agentId: string; deityId: string; prayerType: string; urgency: string; prayerId: string }
  ): void {
    if (!this.world) return;

    const prayerId = data.prayerId;
    // Get agent position (prayer:offered doesn't include position)
    let position: { x: number; y: number } | undefined;
    {
      const agent = this.world.getEntity(data.agentId);
      if (agent) {
        const posComp = agent.components.get(CT.Position) as PositionComponent | undefined;
        if (posComp) {
          position = { x: posComp.x, y: posComp.y };
        }
      }
    }

    if (!position) return;

    // Record prayer location
    this.recentPrayers.push({
      position,
      agentId: data.agentId,
      prayerId,
      answered: false,
      tick: this.world.tick,
    });

    // Update site statistics if at a sacred site
    const site = this.isAtSacredSite(position);
    if (site) {
      site.prayerCount++;
      site.visitedBy.add(data.agentId);
    }
  }

  private handlePrayerAnswered(data: { agentId: string; deityId: string; prayerId: string; responseType: string; healingApplied?: boolean }): void {
    // Mark prayer as answered
    const prayer = this.recentPrayers.find(p => p.prayerId === data.prayerId);
    if (prayer) {
      prayer.answered = true;

      // Update site statistics if at a sacred site
      const site = this.isAtSacredSite(prayer.position);
      if (site) {
        site.answeredPrayerCount++;
        site.answerRate = site.answeredPrayerCount / Math.max(1, site.prayerCount);
      }
    }
  }

  private handleBuildingComplete(data: {
    buildingId: string;
    buildingType: string;
    entityId?: string;
    position?: { x: number; y: number };
    builderId?: string;
  }): void {
    const config = SACRED_BUILDING_CONFIGS[data.buildingType];
    if (!config || !data.position) return; // Not a sacred building or no position

    // Create a sacred site for this building
    const site: SacredSite = {
      id: `sacred_site_${this.siteIdCounter++}`,
      position: data.position,
      type: 'built',
      buildingId: data.buildingId,
      prayerPower: config.prayerPower,
      visionClarity: config.visionClarity,
      meditationBonus: config.meditationBonus,
      visionCount: 0,
      prayerCount: 0,
      answeredPrayerCount: 0,
      answerRate: 0,
      discoveredAt: Date.now(),
      visitedBy: new Set(),
    };

    this.sites.set(site.id, site);

    this.events.emit('sacred_site:created', {
      siteId: site.id,
      type: 'built',
      position: data.position,
      buildingId: data.buildingId,
      buildingType: data.buildingType,
    });
  }

  private handleVisionReceived(data: { agentId: string; deityId?: string; visionType?: string; content?: string; clarity?: number; position?: { x: number; y: number }; vision?: string }): void {
    if (!data.position) return;

    const site = this.isAtSacredSite(data.position);
    if (site) {
      site.visionCount++;
    }
  }

  private cleanupOldPrayers(currentTick: number): void {
    const cutoff = currentTick - EMERGENCE_THRESHOLDS.RECENT_WINDOW_TICKS;
    this.recentPrayers = this.recentPrayers.filter(p => p.tick > cutoff);
  }

  private checkForEmergentSites(world: World, currentTick: number): void {
    // Group recent prayers by location clusters
    const clusters = this.clusterPrayers();

    for (const cluster of clusters) {
      // Skip if already at a sacred site
      if (this.isAtSacredSite(cluster.center, EMERGENCE_THRESHOLDS.CHECK_RADIUS)) {
        continue;
      }

      // Check if this cluster meets emergence criteria
      if (
        cluster.answeredCount >= EMERGENCE_THRESHOLDS.MIN_ANSWERED_PRAYERS &&
        cluster.answerRate >= EMERGENCE_THRESHOLDS.MIN_ANSWER_RATE
      ) {
        this.createEmergentSite(cluster, world, currentTick);
      }
    }
  }

  private clusterPrayers(): PrayerCluster[] {
    const clusters: PrayerCluster[] = [];

    const used = new Set<number>();

    for (let i = 0; i < this.recentPrayers.length; i++) {
      if (used.has(i)) continue;

      const prayer = this.recentPrayers[i]!;
      const clusterPrayers = [prayer];
      used.add(i);

      // Find nearby prayers
      for (let j = i + 1; j < this.recentPrayers.length; j++) {
        if (used.has(j)) continue;

        const other = this.recentPrayers[j]!;
        const dx = other.position.x - prayer.position.x;
        const dy = other.position.y - prayer.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= EMERGENCE_THRESHOLDS.CHECK_RADIUS) {
          clusterPrayers.push(other);
          used.add(j);
        }
      }

      if (clusterPrayers.length >= 2) {
        // Calculate cluster center
        const center = {
          x: clusterPrayers.reduce((sum, p) => sum + p.position.x, 0) / clusterPrayers.length,
          y: clusterPrayers.reduce((sum, p) => sum + p.position.y, 0) / clusterPrayers.length,
        };

        const answeredCount = clusterPrayers.filter(p => p.answered).length;

        clusters.push({
          center,
          prayers: clusterPrayers,
          answeredCount,
          answerRate: answeredCount / clusterPrayers.length,
        });
      }
    }

    return clusters;
  }

  private createEmergentSite(
    cluster: PrayerCluster,
    _world: World,
    currentTick: number
  ): void {
    // Calculate power based on answer rate
    const basePower = 1.0 + (cluster.answerRate * 0.5); // 1.0-1.5

    const site: SacredSite = {
      id: `sacred_site_${this.siteIdCounter++}`,
      position: cluster.center,
      type: 'emergent',
      prayerPower: basePower,
      visionClarity: cluster.answerRate * 0.3,
      meditationBonus: cluster.answerRate * 0.2,
      visionCount: 0,
      prayerCount: cluster.prayers.length,
      answeredPrayerCount: cluster.answeredCount,
      answerRate: cluster.answerRate,
      discoveredBy: cluster.prayers[0]?.agentId,
      discoveredAt: currentTick,
      visitedBy: new Set(cluster.prayers.map(p => p.agentId)),
    };

    this.sites.set(site.id, site);

    this.events.emit('sacred_site:discovered', {
      siteId: site.id,
      type: 'emergent',
      position: cluster.center,
      discoveredBy: site.discoveredBy,
      answerRate: cluster.answerRate,
    });

    // Clear prayers in this cluster so they don't create another site
    const clusterPrayerIds = new Set(cluster.prayers.map(p => p.prayerId));
    this.recentPrayers = this.recentPrayers.filter(p => !clusterPrayerIds.has(p.prayerId));
  }

  private updateSiteStatistics(): void {
    for (const site of this.sites.values()) {
      if (site.prayerCount > 0) {
        site.answerRate = site.answeredPrayerCount / site.prayerCount;

        // Emergent sites grow in power as more prayers are answered
        if (site.type === 'emergent') {
          // Slowly increase power (max 2.0 for emergent sites)
          site.prayerPower = Math.min(2.0, 1.0 + (site.answerRate * site.answeredPrayerCount * 0.05));
          site.visionClarity = Math.min(0.5, site.answerRate * 0.3 + (site.visionCount * 0.02));
        }
      }
    }
  }
}

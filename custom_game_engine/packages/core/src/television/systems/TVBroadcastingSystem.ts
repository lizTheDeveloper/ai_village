/**
 * TVBroadcastingSystem - Real-time broadcast management
 *
 * Handles:
 * - Schedule-based program switching
 * - Active broadcast tracking
 * - Viewer management (tune in/out)
 * - Commercial breaks
 * - Event emission for ratings/cultural impact
 */

import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../../ecs/SystemContext.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TVStationComponent, TVChannel } from '../TVStation.js';
import type { TVBroadcastComponent, ProgramSlot, BroadcastEvent } from '../TVBroadcasting.js';
import type { TVContentComponent } from '../TVContent.js';
import {
  createBroadcastEvent,
  startBroadcast,
  endBroadcast,
  tuneIn,
  tuneOut,
  getCurrentSlot,
  runCommercials,
} from '../TVBroadcasting.js';
import { recordBroadcast } from '../TVContent.js';

/** Ticks per minute (20 ticks/sec * 60 sec) */
const TICKS_PER_MINUTE = 20 * 60;

/** How often to check schedule (every game minute) */
const SCHEDULE_CHECK_INTERVAL = TICKS_PER_MINUTE;

export class TVBroadcastingSystem extends BaseSystem {
  readonly id = 'tv_broadcasting' as const;
  readonly priority = 65; // After most game logic
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private lastScheduleCheck: number = 0;

  /** Cache for station -> broadcast component mapping */
  private broadcastComponents: Map<string, TVBroadcastComponent> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    // Only check schedule periodically
    const shouldCheckSchedule = currentTick - this.lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL;

    for (const entity of ctx.activeEntities) {
      const station = entity.components.get(ComponentType.TVStation) as TVStationComponent | undefined;
      if (!station) continue;

      // Get or create broadcast component
      let broadcast = this.broadcastComponents.get(station.buildingId);
      if (!broadcast) {
        const newBroadcast = this.getOrCreateBroadcastComponent(ctx.world, station);
        if (!newBroadcast) continue;
        broadcast = newBroadcast;
      }

      // Check for schedule changes
      if (shouldCheckSchedule) {
        this.updateBroadcastSchedule(ctx.world, station, broadcast, currentTick);
      }

      // Update active broadcasts
      this.updateActiveBroadcasts(ctx.world, station, broadcast, currentTick);
    }

    if (shouldCheckSchedule) {
      this.lastScheduleCheck = currentTick;
    }
  }

  /**
   * Get or create broadcast component for a station
   */
  private getOrCreateBroadcastComponent(
    world: World,
    station: TVStationComponent
  ): TVBroadcastComponent | null {
    // Look for existing broadcast component on building entity
    const buildingEntity = world.getEntity(station.buildingId);
    if (!buildingEntity) return null;

    let broadcast = buildingEntity.components.get(ComponentType.TVBroadcast) as TVBroadcastComponent | undefined;

    if (!broadcast) {
      // Create broadcast component
      broadcast = {
        type: 'tv_broadcast',
        version: 1,
        stationId: station.buildingId,
        schedule: [],
        activeBroadcasts: new Map(),
        recentBroadcasts: [],
        maxHistorySize: 100,
        currentViewers: new Map(),
        viewerReactions: [],
        advertisements: [],
        commercialBreaks: [],
        totalBroadcastMinutes: 0,
        totalAdRevenue: 0,
        averageViewership: 0,
      };

      (buildingEntity as any).addComponent(broadcast);
    }

    this.broadcastComponents.set(station.buildingId, broadcast);
    return broadcast;
  }

  /**
   * Check schedule and start/stop broadcasts as needed
   */
  private updateBroadcastSchedule(
    world: World,
    station: TVStationComponent,
    broadcast: TVBroadcastComponent,
    currentTick: number
  ): void {
    // Get current game time
    const timeEntity = world.query().with(ComponentType.Time).executeEntities()[0];
    if (!timeEntity) return;

    const time = timeEntity.components.get(ComponentType.Time) as any;
    if (!time) return;

    const currentDay = this.getDayOfWeek(time.day);
    const currentHour = time.hour;
    const currentMinute = time.minute ?? 0;

    // Check each channel
    for (const channel of station.channels) {
      const scheduledSlot = getCurrentSlot(
        broadcast,
        channel.channelNumber,
        currentDay,
        currentHour,
        currentMinute
      );

      const currentBroadcast = broadcast.activeBroadcasts.get(channel.channelNumber);

      // If nothing scheduled and something broadcasting, end it
      if (!scheduledSlot && currentBroadcast) {
        this.endChannelBroadcast(world, station, broadcast, channel, currentTick);
        continue;
      }

      // If scheduled and not broadcasting, start
      if (scheduledSlot && !currentBroadcast) {
        this.startChannelBroadcast(world, station, broadcast, channel, scheduledSlot, currentTick);
        continue;
      }

      // If scheduled content changed, switch
      if (scheduledSlot && currentBroadcast) {
        const contentId = scheduledSlot.contentId ?? scheduledSlot.showId;
        if (contentId && currentBroadcast.contentId !== contentId) {
          this.endChannelBroadcast(world, station, broadcast, channel, currentTick);
          this.startChannelBroadcast(world, station, broadcast, channel, scheduledSlot, currentTick);
        }
      }
    }
  }

  /**
   * Start broadcasting on a channel
   */
  private startChannelBroadcast(
    world: World,
    station: TVStationComponent,
    broadcast: TVBroadcastComponent,
    channel: TVChannel,
    slot: ProgramSlot,
    currentTick: number
  ): void {
    const contentId = slot.contentId ?? `placeholder_${slot.showId ?? 'default'}`;
    const showId = slot.showId ?? 'unknown';

    // Create broadcast event
    const event = createBroadcastEvent(
      station.buildingId,
      channel.channelNumber,
      contentId,
      showId,
      currentTick,
      slot.duration,
      slot.programType === 'news'
    );

    // Start broadcast
    startBroadcast(broadcast, event);

    // Update channel state
    channel.currentProgram = showId;
    channel.currentContentId = contentId;

    // Update content entity if it exists
    const contentEntity = this.findContentEntity(world, contentId);
    if (contentEntity) {
      const content = contentEntity.components.get(ComponentType.TVContent) as TVContentComponent;
      if (content) {
        recordBroadcast(content, currentTick);
      }
    }

    // Emit event
    this.events.emit('tv:broadcast:started', {
      stationId: station.buildingId,
      channelNumber: channel.channelNumber,
      contentId,
      showId,
      isLive: slot.programType === 'news',
    }, station.buildingId);
  }

  /**
   * End broadcasting on a channel
   */
  private endChannelBroadcast(
    _world: World,
    station: TVStationComponent,
    broadcast: TVBroadcastComponent,
    channel: TVChannel,
    currentTick: number
  ): void {
    const event = endBroadcast(broadcast, channel.channelNumber, currentTick);

    if (event) {
      // Run end commercials
      const viewers = broadcast.currentViewers.get(channel.channelNumber)?.size ?? 0;
      runCommercials(broadcast, `slot_${channel.channelNumber}`, 'end', viewers);

      // Update station metrics
      station.totalViewers += event.totalViewers;
      if (event.peakViewers > station.peakViewers) {
        station.peakViewers = event.peakViewers;
      }

      // Emit event
      this.events.emit('tv:broadcast:ended', {
        stationId: station.buildingId,
        channelNumber: channel.channelNumber,
        contentId: event.contentId,
        showId: event.showId,
        peakViewers: event.peakViewers,
        totalViewers: event.totalViewers,
        averageRating: event.averageRating,
      }, station.buildingId);
    }

    // Clear channel state
    channel.currentProgram = null;
    channel.currentContentId = null;
  }

  /**
   * Update active broadcasts (check for completion, update metrics)
   */
  private updateActiveBroadcasts(
    _world: World,
    station: TVStationComponent,
    broadcast: TVBroadcastComponent,
    currentTick: number
  ): void {
    broadcast.activeBroadcasts.forEach((event, channelNumber) => {
      // Check if broadcast should end
      if (currentTick >= event.endTick) {
        const channel = station.channels.find(c => c.channelNumber === channelNumber);
        if (channel) {
          this.endChannelBroadcast(_world, station, broadcast, channel, currentTick);
        }
      }
    });
  }

  /**
   * Find content entity by content ID
   */
  private findContentEntity(world: World, contentId: string): Entity | null {
    const entities = world.query().with(ComponentType.TVContent).executeEntities();
    for (const entity of entities) {
      const content = entity.components.get(ComponentType.TVContent) as TVContentComponent;
      if (content && content.contentId === contentId) {
        return entity;
      }
    }
    return null;
  }

  /**
   * Convert day number to day of week
   */
  private getDayOfWeek(dayNumber: number): 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    return days[dayNumber % 7]!;
  }

  // ============================================================================
  // PUBLIC API - For external systems to interact with broadcasting
  // ============================================================================

  /**
   * Have a viewer tune into a channel
   */
  tuneViewerIn(
    _world: World,
    stationId: string,
    channelNumber: number,
    viewerId: string
  ): boolean {
    const broadcast = this.broadcastComponents.get(stationId);
    if (!broadcast) return false;

    const success = tuneIn(broadcast, channelNumber, viewerId);

    if (success) {
      const event = broadcast.activeBroadcasts.get(channelNumber);
      this.events.emit('tv:viewer:tuned_in', {
        viewerId,
        stationId,
        channelNumber,
        contentId: event?.contentId ?? 'unknown',
      }, viewerId);
    }

    return success;
  }

  /**
   * Have a viewer tune out of a channel
   */
  tuneViewerOut(
    _world: World,
    stationId: string,
    channelNumber: number,
    viewerId: string,
    watchDuration: number
  ): boolean {
    const broadcast = this.broadcastComponents.get(stationId);
    if (!broadcast) return false;

    const success = tuneOut(broadcast, channelNumber, viewerId);

    if (success) {
      this.events.emit('tv:viewer:tuned_out', {
        viewerId,
        stationId,
        channelNumber,
        watchDuration,
      }, viewerId);
    }

    return success;
  }

  /**
   * Get current broadcast on a channel
   */
  getCurrentBroadcast(stationId: string, channelNumber: number): BroadcastEvent | null {
    const broadcast = this.broadcastComponents.get(stationId);
    if (!broadcast) return null;
    return broadcast.activeBroadcasts.get(channelNumber) ?? null;
  }

  /**
   * Get viewer count for a channel
   */
  getViewerCount(stationId: string, channelNumber: number): number {
    const broadcast = this.broadcastComponents.get(stationId);
    if (!broadcast) return 0;
    return broadcast.currentViewers.get(channelNumber)?.size ?? 0;
  }

  protected onCleanup(): void {
    this.broadcastComponents.clear();
  }
}

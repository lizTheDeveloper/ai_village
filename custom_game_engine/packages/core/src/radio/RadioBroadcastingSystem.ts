/**
 * RadioBroadcastingSystem - Handles radio station broadcasting
 *
 * Simulates real-time radio broadcasting:
 * - DJs play music and talk
 * - Commercial breaks
 * - Listener engagement
 * - Cultural impact through music and catchphrases
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import {
  getRadioStationManager,
  resetRadioStationManager,
  type RadioStationComponent,
  type RadioShow,
  type MusicTrack,
} from './RadioStation.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

// =============================================================================
// TYPES
// =============================================================================

export interface RadioListenerState {
  agentId: string;
  stationId: string;
  tuningDuration: number; // How long they've been listening
  favoriteShows: string[];
  favoriteDJs: string[];
  discoveredTracks: string[]; // Songs they heard first on radio
}

// =============================================================================
// RADIO BROADCASTING SYSTEM
// =============================================================================

export class RadioBroadcastingSystem implements System {
  readonly id = 'RadioBroadcastingSystem';
  readonly priority = 70;
  readonly requiredComponents = [] as const; // Operates on radio stations

  private manager = getRadioStationManager();
  private eventBus: EventBus | null = null;
  private listeners: Map<string, RadioListenerState> = new Map();
  private lastUpdateTick = 0;

  private static readonly UPDATE_INTERVAL = 20; // Every second at 20 TPS

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < RadioBroadcastingSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Update each broadcasting station
    for (const station of this.manager.getAllStations()) {
      if (station.status !== 'broadcasting') continue;

      // Check if current show has ended
      if (station.currentShow) {
        const showDuration = currentTick - station.currentShow.startedAt;
        if (showDuration >= station.currentShow.duration) {
          this.endCurrentShow(station, world);
        }
      }

      // Update broadcast hours
      station.totalBroadcastHours += 1 / (20 * 60 * 60); // Convert ticks to hours

      // Emit listener count periodically
      this.eventBus?.emit({
        type: 'radio:listener_update' as any,
        source: station.config.callSign,
        data: {
          stationId: station.config.callSign,
          listenerCount: station.listenersCount,
          showName: station.currentShow?.name,
        },
      });
    }

    // Update listener engagement
    this.updateListeners(world, currentTick);
  }

  private endCurrentShow(station: RadioStationComponent, _world: World): void {
    const show = this.manager.endShow(station.config.callSign);
    if (!show) return;

    this.eventBus?.emit({
      type: 'radio:show_ended' as any,
      source: station.config.callSign,
      data: {
        stationId: station.config.callSign,
        showName: show.name,
        peakListeners: show.peakListeners,
        totalListeners: show.currentListeners,
      },
    });
  }

  private updateListeners(world: World, currentTick: number): void {
    for (const [agentId, listener] of this.listeners) {
      listener.tuningDuration++;

      // Check if they're still in range
      // (simplified - in real implementation would check position)

      // Create memories for significant radio moments
      if (listener.tuningDuration > 20 * 60 * 10) { // 10 minutes
        this.maybeCreateRadioMemory(world, agentId, listener, currentTick);
      }
    }
  }

  private maybeCreateRadioMemory(
    world: World,
    agentId: string,
    listener: RadioListenerState,
    currentTick: number
  ): void {
    const entity = world.getEntity(agentId);
    if (!entity) return;

    const memory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
    if (!memory) return;

    const station = this.manager.getStation(listener.stationId);
    if (!station?.currentShow) return;

    // Only create memory occasionally (1% chance per check)
    if (Math.random() > 0.01) return;

    const show = station.currentShow;

    memory.formMemory({
      eventType: 'radio:listening',
      summary: `Listened to "${show.name}" with ${show.hostName} on ${station.config.callSign}`,
      timestamp: currentTick,
      emotionalValence: 0.4, // Generally positive
      emotionalIntensity: 0.3, // Moderate - background activity
      surprise: 0.1,
      novelty: 0.3,
      socialSignificance: 0.2,
      goalRelevance: 0.1,
      survivalRelevance: 0.0,
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Agent starts listening to a radio station
   */
  tuneIn(agentId: string, stationId: string): boolean {
    const station = this.manager.getStation(stationId);
    if (!station || station.status !== 'broadcasting') return false;

    // Remove from any previous station
    this.tuneOut(agentId);

    this.listeners.set(agentId, {
      agentId,
      stationId,
      tuningDuration: 0,
      favoriteShows: [],
      favoriteDJs: [],
      discoveredTracks: [],
    });

    this.manager.updateListeners(stationId, station.listenersCount + 1);

    this.eventBus?.emit({
      type: 'radio:listener_tuned_in' as any,
      source: agentId,
      data: {
        agentId,
        stationId: station.config.callSign,
        listenerCount: station.listenersCount,
      },
    });

    return true;
  }

  /**
   * Agent stops listening
   */
  tuneOut(agentId: string): boolean {
    const listener = this.listeners.get(agentId);
    if (!listener) return false;

    const station = this.manager.getStation(listener.stationId);
    if (station) {
      this.manager.updateListeners(listener.stationId, Math.max(0, station.listenersCount - 1));
    }

    this.listeners.delete(agentId);

    this.eventBus?.emit({
      type: 'radio:listener_tuned_out' as any,
      source: agentId,
      data: {
        agentId,
        stationId: listener.stationId,
        listenDuration: listener.tuningDuration,
      },
    });

    return true;
  }

  /**
   * DJ starts a show
   */
  startDJShow(
    stationId: string,
    djAgentId: string,
    showName: string,
    format: 'music' | 'talk' | 'news' | 'sports' | 'variety',
    currentTick: number,
    durationTicks: number
  ): RadioShow | null {
    const dj = this.manager.getDJ(djAgentId);
    if (!dj) return null;

    const show = this.manager.startShow(
      stationId,
      showName,
      format,
      djAgentId,
      dj.djName,
      currentTick,
      durationTicks
    );

    if (show) {
      this.eventBus?.emit({
        type: 'radio:show_started' as any,
        source: stationId,
        data: {
          stationId,
          showName,
          djName: dj.djName,
          format,
        },
      });
    }

    return show;
  }

  /**
   * DJ says their catchphrase - creates memories for listeners
   */
  djSaysCatchphrase(
    stationId: string,
    djAgentId: string,
    catchphrase: string,
    world: World,
    currentTick: number
  ): void {
    const dj = this.manager.getDJ(djAgentId);
    const station = this.manager.getStation(stationId);
    if (!dj || !station) return;

    // Add catchphrase to DJ's repertoire
    this.manager.addDJCatchphrase(djAgentId, catchphrase);

    // Create strong memories for all current listeners
    // Radio catchphrases are intimate - one voice in your ear
    for (const [agentId, listener] of this.listeners) {
      if (listener.stationId !== stationId) continue;

      const entity = world.getEntity(agentId);
      if (!entity) continue;

      const memory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
      if (!memory) continue;

      memory.formMemory({
        eventType: 'radio:catchphrase_heard',
        summary: `Heard ${dj.djName} say "${catchphrase}" on ${station.config.callSign}`,
        timestamp: currentTick,
        emotionalValence: 0.5,
        emotionalIntensity: 0.6, // Radio is more intimate than TV
        surprise: 0.4,
        novelty: 0.7,
        socialSignificance: 0.5, // Shared experience with other listeners
        goalRelevance: 0.1,
        survivalRelevance: 0.0,
        markedForConsolidation: true,
        dialogueText: `"${catchphrase}"`,
      });
    }

    this.eventBus?.emit({
      type: 'radio:catchphrase_said' as any,
      source: stationId,
      data: {
        stationId,
        djName: dj.djName,
        catchphrase,
        listenerCount: station.listenersCount,
      },
    });
  }

  /**
   * Play a song - listeners might discover new music
   */
  playTrack(
    stationId: string,
    track: MusicTrack,
    world: World,
    currentTick: number
  ): void {
    const station = this.manager.getStation(stationId);
    if (!station) return;

    this.manager.playTrack(stationId, track.id);

    // Some listeners might discover this song for the first time
    for (const [agentId, listener] of this.listeners) {
      if (listener.stationId !== stationId) continue;

      // 20% chance to "discover" a new song
      if (Math.random() < 0.2 && !listener.discoveredTracks.includes(track.id)) {
        listener.discoveredTracks.push(track.id);

        const entity = world.getEntity(agentId);
        if (!entity) continue;

        const memory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
        if (!memory) continue;

        memory.formMemory({
          eventType: 'radio:song_discovered',
          summary: `Heard "${track.title}" by ${track.artist} for the first time on ${station.config.callSign}`,
          timestamp: currentTick,
          emotionalValence: 0.7, // Discovering new music is positive
          emotionalIntensity: 0.5,
          surprise: 0.6,
          novelty: 0.9, // New song = very novel
          socialSignificance: 0.3,
          goalRelevance: 0.1,
          survivalRelevance: 0.0,
        });

        this.eventBus?.emit({
          type: 'radio:song_discovered' as any,
          source: agentId,
          data: {
            agentId,
            trackId: track.id,
            trackTitle: track.title,
            artist: track.artist,
            stationId: station.config.callSign,
          },
        });
      }
    }
  }

  /**
   * Get listener state for an agent
   */
  getListenerState(agentId: string): RadioListenerState | undefined {
    return this.listeners.get(agentId);
  }

  /**
   * Get all listeners for a station
   */
  getStationListeners(stationId: string): RadioListenerState[] {
    return Array.from(this.listeners.values())
      .filter((l) => l.stationId === stationId);
  }

  cleanup(): void {
    this.listeners.clear();
    resetRadioStationManager();
    this.eventBus = null;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let radioSystemInstance: RadioBroadcastingSystem | null = null;

export function getRadioBroadcastingSystem(): RadioBroadcastingSystem {
  if (!radioSystemInstance) {
    radioSystemInstance = new RadioBroadcastingSystem();
  }
  return radioSystemInstance;
}

export function resetRadioBroadcastingSystem(): void {
  if (radioSystemInstance) {
    radioSystemInstance.cleanup();
    radioSystemInstance = null;
  }
}

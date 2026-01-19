/**
 * SpaceshipManagementSystem - Manages spaceship internal components
 *
 * This system handles:
 * - Heart chamber synchronization for β-space jumps
 * - Emotion theater sessions
 * - Memory hall recording and playback
 * - Meditation chamber sessions
 * - Ship component power and status management
 *
 * Works with EmotionalNavigationSystem for full spaceship functionality.
 *
 * Priority: 155 (after EmotionalNavigationSystem at 150)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type {
  HeartChamberComponent,
  EmotionTheaterComponent,
  MemoryHallComponent,
  MeditationChamberComponent,
} from '../navigation/ShipComponentEntities.js';
import {
  updateHeartSynchronization,
  canExecuteJump,
} from '../navigation/ShipComponentEntities.js';

// ============================================================================
// System
// ============================================================================

export class SpaceshipManagementSystem extends BaseSystem {
  public readonly id: SystemId = 'spaceship_management' as SystemId;
  public readonly priority: number = 155;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Spaceship];

  // Lazy activation: Skip entire system when no spaceships exist in world
  public readonly activationComponents = ['spaceship'] as const;

  public readonly metadata = {
    category: 'infrastructure' as const,
    description: 'Manages spaceship internal components and β-space jumps',
    dependsOn: ['emotional_navigation'],
    writesComponents: [CT.HeartChamber, CT.EmotionTheater, CT.MemoryHall, CT.MeditationChamber],
  };

  protected readonly throttleInterval = 5; // Every 0.25 seconds at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Process each spaceship
    for (const shipEntity of ctx.activeEntities) {
      const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      // Process ship components
      this.processHeartChambers(ctx.world, ship, tick);
      this.processEmotionTheaters(ctx.world, ship, tick);
      this.processMemoryHalls(ctx.world, ship, tick);
      this.processMeditationChambers(ctx.world, ship, tick);
    }

    // Also process orphaned ship components (not yet linked to ships)
    this.processOrphanedComponents(ctx.world, tick);
  }

  /**
   * Process Heart chambers for jump synchronization.
   */
  private processHeartChambers(world: World, ship: SpaceshipComponent, tick: number): void {
    if (!ship.components.the_heart_id) return;

    const heartEntity = world.getEntity(ship.components.the_heart_id);
    if (!heartEntity) return;

    const heart = heartEntity.getComponent<HeartChamberComponent>(CT.HeartChamber);
    if (!heart) return;

    // Update synchronization state
    updateHeartSynchronization(heart, tick);

    // Emit events based on state changes
    if (heart.jumpSequence.state === 'jump_window') {
      world.eventBus.emit({
        type: 'spaceship_jump_window_open',
        source: heartEntity.id,
        data: {
          shipId: ship.name,
          coherence: heart.synchronization.coherence,
          windowDuration: heart.jumpSequence.jumpWindowDuration,
        },
      });
    }
  }

  /**
   * Process Emotion Theaters for active sessions.
   */
  private processEmotionTheaters(world: World, ship: SpaceshipComponent, tick: number): void {
    for (const theaterId of ship.components.emotion_theater_ids) {
      const theaterEntity = world.getEntity(theaterId);
      if (!theaterEntity) continue;

      const impl = theaterEntity as EntityImpl;
      const theater = impl.getComponent<EmotionTheaterComponent>(CT.EmotionTheater);
      if (!theater || !theater.activeScenario) continue;

      // Update scenario progress
      const scenario = theater.scenarios.find(s => s.id === theater.activeScenario!.scenarioId);
      if (!scenario) continue;

      const elapsed = tick - theater.activeScenario.startTick;
      const progress = Math.min(1, elapsed / scenario.duration);

      impl.updateComponent<EmotionTheaterComponent>(CT.EmotionTheater, (t) => ({
        ...t,
        activeScenario: t.activeScenario ? {
          ...t.activeScenario,
          progress,
        } : undefined,
      }));

      // Check if scenario completed
      if (progress >= 1) {
        this.completeTheaterSession(world, impl, theater, scenario, tick);
      }

      // Check max duration safeguard
      if (elapsed > theater.safeguards.maxDuration) {
        this.forceEndTheaterSession(world, impl, theater, tick, 'max_duration_exceeded');
      }
    }
  }

  /**
   * Complete an emotion theater session.
   */
  private completeTheaterSession(
    world: World,
    theaterEntity: EntityImpl,
    theater: EmotionTheaterComponent,
    scenario: { id: string; name: string; targetEmotion: { emotions: Record<string, number> } },
    tick: number
  ): void {
    const participantIds = theater.activeScenario?.participantIds || [];

    // Clear active scenario
    theaterEntity.updateComponent<EmotionTheaterComponent>(CT.EmotionTheater, (t) => ({
      ...t,
      activeScenario: undefined,
      status: 'operational',
      efficacy: {
        ...t.efficacy,
        experiencePoints: t.efficacy.experiencePoints + 10,
      },
      safeguards: {
        ...t.safeguards,
        lastUseTick: tick,
      },
    }));

    // Emit completion event
    world.eventBus.emit({
      type: 'emotion_theater_session_complete',
      source: theaterEntity.id,
      data: {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        participantIds,
        targetEmotion: scenario.targetEmotion,
      },
    });
  }

  /**
   * Force end a theater session (safety).
   */
  private forceEndTheaterSession(
    world: World,
    theaterEntity: EntityImpl,
    theater: EmotionTheaterComponent,
    tick: number,
    reason: string
  ): void {
    const participantIds = theater.activeScenario?.participantIds || [];

    theaterEntity.updateComponent<EmotionTheaterComponent>(CT.EmotionTheater, (t) => ({
      ...t,
      activeScenario: undefined,
      status: 'operational',
      safeguards: {
        ...t.safeguards,
        lastUseTick: tick,
      },
    }));

    world.eventBus.emit({
      type: 'emotion_theater_session_ended',
      source: theaterEntity.id,
      data: {
        reason,
        participantIds,
      },
    });
  }

  /**
   * Process Memory Halls for recording and playback.
   */
  private processMemoryHalls(world: World, ship: SpaceshipComponent, tick: number): void {
    for (const hallId of ship.components.memory_hall_ids) {
      const hallEntity = world.getEntity(hallId);
      if (!hallEntity) continue;

      const impl = hallEntity as EntityImpl;
      const hall = impl.getComponent<MemoryHallComponent>(CT.MemoryHall);
      if (!hall) continue;

      // Process active replay
      if (hall.activeReplay) {
        const memory = hall.memories.find(m => m.id === hall.activeReplay!.memoryId);
        if (memory) {
          const elapsed = tick - hall.activeReplay.startTick;
          const progress = Math.min(1, elapsed / memory.duration);

          impl.updateComponent<MemoryHallComponent>(CT.MemoryHall, (h) => ({
            ...h,
            activeReplay: h.activeReplay ? {
              ...h.activeReplay,
              progress,
            } : undefined,
          }));

          // Check if replay completed
          if (progress >= 1) {
            impl.updateComponent<MemoryHallComponent>(CT.MemoryHall, (h) => ({
              ...h,
              activeReplay: undefined,
              status: 'operational',
            }));

            world.eventBus.emit({
              type: 'memory_replay_complete',
              source: hallEntity.id,
              data: {
                memoryId: memory.id,
                memoryTitle: memory.title,
                viewerIds: hall.activeReplay?.viewerIds || [],
              },
            });
          }
        }
      }

      // Process active recording
      if (hall.recording.currentlyRecording && hall.recording.recordingStartTick) {
        const recordingDuration = tick - hall.recording.recordingStartTick;

        // Check storage capacity
        if (hall.storageUsed + recordingDuration > hall.storageCapacity) {
          // Auto-stop recording if out of space
          impl.updateComponent<MemoryHallComponent>(CT.MemoryHall, (h) => ({
            ...h,
            recording: {
              ...h.recording,
              currentlyRecording: false,
            },
          }));

          world.eventBus.emit({
            type: 'memory_recording_stopped',
            source: hallEntity.id,
            data: {
              reason: 'storage_full',
              duration: recordingDuration,
            },
          });
        }
      }
    }
  }

  /**
   * Process Meditation Chambers for active sessions.
   */
  private processMeditationChambers(world: World, ship: SpaceshipComponent, tick: number): void {
    for (const chamberId of ship.components.meditation_chamber_ids) {
      const chamberEntity = world.getEntity(chamberId);
      if (!chamberEntity) continue;

      const impl = chamberEntity as EntityImpl;
      const chamber = impl.getComponent<MeditationChamberComponent>(CT.MeditationChamber);
      if (!chamber || !chamber.activeSession) continue;

      const elapsed = tick - chamber.activeSession.startTick;

      // Check if session target duration reached
      if (elapsed >= chamber.activeSession.targetDuration) {
        const technique = chamber.activeSession.technique;
        const participantIds = chamber.activeSession.participantIds;

        // Record in history
        impl.updateComponent<MeditationChamberComponent>(CT.MeditationChamber, (c) => ({
          ...c,
          activeSession: undefined,
          status: 'operational',
          sessionHistory: [
            ...c.sessionHistory.slice(-99), // Keep last 100
            {
              technique,
              participantIds,
              duration: elapsed,
              completedAt: tick,
              effectivenessRating: 0.7 + Math.random() * 0.3, // TODO: Calculate from biofeedback
            },
          ],
        }));

        world.eventBus.emit({
          type: 'meditation_session_complete',
          source: chamberEntity.id,
          data: {
            technique,
            participantIds,
            duration: elapsed,
          },
        });
      }
    }
  }

  /**
   * Process components not yet linked to ships.
   */
  private processOrphanedComponents(world: World, tick: number): void {
    // Process standalone Heart chambers (for testing or unlinked ships)
    const hearts = world.query()
      .with(CT.HeartChamber)
      .executeEntities();

    for (const heartEntity of hearts) {
      const heart = heartEntity.getComponent<HeartChamberComponent>(CT.HeartChamber);
      if (heart) {
        updateHeartSynchronization(heart, tick);
      }
    }
  }
}

// ============================================================================
// Helper Functions (for external use)
// ============================================================================

/**
 * Start an emotion theater session.
 */
export function startEmotionTheaterSession(
  world: World,
  theaterId: string,
  scenarioId: string,
  participantIds: string[]
): { success: boolean; reason?: string } {
  const theaterEntity = world.getEntity(theaterId);
  if (!theaterEntity) {
    return { success: false, reason: 'Theater not found' };
  }

  const impl = theaterEntity as EntityImpl;
  const theater = impl.getComponent<EmotionTheaterComponent>(CT.EmotionTheater);
  if (!theater) {
    return { success: false, reason: 'Entity is not an emotion theater' };
  }

  if (theater.status !== 'operational') {
    return { success: false, reason: `Theater is ${theater.status}` };
  }

  if (theater.activeScenario) {
    return { success: false, reason: 'Theater already has active session' };
  }

  // Check cooldown
  if (world.tick - theater.safeguards.lastUseTick < theater.safeguards.cooldownPeriod) {
    return { success: false, reason: 'Theater on cooldown' };
  }

  const scenario = theater.scenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    return { success: false, reason: 'Scenario not found' };
  }

  if (participantIds.length > theater.maxOccupants) {
    return { success: false, reason: 'Too many participants' };
  }

  impl.updateComponent<EmotionTheaterComponent>(CT.EmotionTheater, (t) => ({
    ...t,
    status: 'in_use',
    occupantIds: participantIds,
    activeScenario: {
      scenarioId,
      startTick: world.tick,
      participantIds,
      progress: 0,
    },
  }));

  world.eventBus.emit({
    type: 'emotion_theater_session_started',
    source: theaterId,
    data: {
      scenarioId,
      scenarioName: scenario.name,
      participantIds,
      targetEmotion: scenario.targetEmotion,
    },
  });

  return { success: true };
}

/**
 * Execute a β-space jump from a Heart chamber.
 */
export function executeHeartJump(
  world: World,
  heartId: string,
  destinationPlanetId: string
): { success: boolean; reason?: string } {
  const heartEntity = world.getEntity(heartId);
  if (!heartEntity) {
    return { success: false, reason: 'Heart chamber not found' };
  }

  const impl = heartEntity as EntityImpl;
  const heart = impl.getComponent<HeartChamberComponent>(CT.HeartChamber);
  if (!heart) {
    return { success: false, reason: 'Entity is not a Heart chamber' };
  }

  const jumpCheck = canExecuteJump(heart);
  if (!jumpCheck.ready) {
    return { success: false, reason: jumpCheck.reason };
  }

  // Record statistics
  const syncTime = heart.synchronization.timeAtThreshold;

  impl.updateComponent<HeartChamberComponent>(CT.HeartChamber, (h) => ({
    ...h,
    jumpSequence: {
      ...h.jumpSequence,
      state: 'cooldown',
      lastJumpTick: world.tick,
    },
    synchronization: {
      ...h.synchronization,
      timeAtThreshold: 0,
    },
    statistics: {
      ...h.statistics,
      totalJumps: h.statistics.totalJumps + 1,
      successfulJumps: h.statistics.successfulJumps + 1,
      averageCoherenceAtJump:
        (h.statistics.averageCoherenceAtJump * h.statistics.successfulJumps + h.synchronization.coherence) /
        (h.statistics.successfulJumps + 1),
      fastestSyncTime: Math.min(h.statistics.fastestSyncTime, syncTime),
    },
  }));

  // Emit jump event
  world.eventBus.emit({
    type: 'spaceship_beta_jump_executed',
    source: heartId,
    data: {
      destinationPlanetId,
      coherence: heart.synchronization.coherence,
      crewCount: heart.occupantIds.length,
      syncTime,
    },
  });

  return { success: true };
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: SpaceshipManagementSystem | null = null;

export function getSpaceshipManagementSystem(): SpaceshipManagementSystem {
  if (!systemInstance) {
    systemInstance = new SpaceshipManagementSystem();
  }
  return systemInstance;
}

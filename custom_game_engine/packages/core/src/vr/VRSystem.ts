/**
 * Virtual Reality System
 *
 * Manages VR sessions for emotional exploration and narrative experiences.
 * Provides curated emotional experiences through various VR types.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type { VRSystemComponent, VRSession } from './VRSystemComponent.js';
import type { EmotionalSignature } from '../navigation/SpaceshipComponent.js';

// ============================================================================
// System Implementation
// ============================================================================

export class VRSystem implements System {
  public readonly id: SystemId = 'vr_system' as SystemId;
  public readonly priority: number = 160;
  public readonly requiredComponents: ReadonlyArray<typeof CT[keyof typeof CT]> = [
    CT.VRSystem,
  ];

  private eventBus: EventBus | null = null;
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 20; // Every 1 second at 20 TPS

  public initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  public update(
    world: World,
    entities: ReadonlyArray<Entity>,
    _deltaTime: number
  ): void {
    const currentTick = world.tick;
    
    // Throttle updates
    if (currentTick - this.lastUpdateTick < VRSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    for (const entity of entities) {
      const vrSystem = entity.getComponent('vr_system') as VRSystemComponent;
      if (!vrSystem) continue;

      this.processVRSystem(world, currentTick, vrSystem);
    }
  }

  /**
   * Process VR system updates
   */
  private processVRSystem(
    world: World,
    currentTick: number,
    vrSystem: VRSystemComponent
  ): void {
    // Update active sessions
    for (let i = vrSystem.active_sessions.length - 1; i >= 0; i--) {
      const session = vrSystem.active_sessions[i];
      if (!session) continue;

      const elapsed = currentTick - session.start_time;
      session.duration = elapsed;

      // Check if session should end
      if (elapsed >= session.max_duration) {
        this.endSession(world, vrSystem, session);
        vrSystem.active_sessions.splice(i, 1);
      } else {
        // Update session state
        this.updateSession(world, vrSystem, session, elapsed);
      }
    }
  }

  /**
   * Start a new VR session
   */
  public startSession(
    world: World,
    vrSystem: VRSystemComponent,
    participantIds: string[],
    scenarioType: string,
    scenarioDescription: string,
    targetEmotion?: EmotionalSignature,
    maxDuration: number = 1200 // Default: 1 minute at 20 TPS
  ): VRSession | null {
    // Check capacity
    if (vrSystem.active_sessions.length >= vrSystem.max_concurrent_sessions) {
      return null;
    }

    if (participantIds.length > vrSystem.max_participants_per_session) {
      return null;
    }

    const session: VRSession = {
      id: this.generateSessionId(),
      vr_system_id: '', // Would be set by the entity ID
      participant_ids: participantIds,
      scenario: {
        type: scenarioType,
        description: scenarioDescription,
        target_emotion: targetEmotion,
      },
      start_time: world.tick,
      duration: 0,
      max_duration: maxDuration,
      emergency_exit_available: true,
    };

    vrSystem.active_sessions.push(session);
    return session;
  }

  /**
   * Update an active session
   */
  private updateSession(
    world: World,
    vrSystem: VRSystemComponent,
    session: VRSession,
    elapsed: number
  ): void {
    // Calculate progress
    const progress = elapsed / session.max_duration;

    // Apply emotional effects to participants
    for (const participantId of session.participant_ids) {
      const participant = world.getEntity(participantId);
      if (!participant) continue;

      // Apply target emotion if specified
      if (session.scenario.target_emotion) {
        this.applyEmotionalInfluence(
          participant,
          session.scenario.target_emotion,
          progress,
          vrSystem.simulation.fidelity
        );
      }
    }

    // Generate narrative weight if high fidelity
    if (vrSystem.simulation.narrative_weight > 0.5) {
      // High narrative weight VR affects β-space
      // This would integrate with the emotional navigation system
    }
  }

  /**
   * End a VR session
   */
  private endSession(
    world: World,
    _vrSystem: VRSystemComponent,
    session: VRSession
  ): void {
    // Emit session end event
    if (this.eventBus) {
      // Would emit an event here
    }

    // Process participants
    for (const participantId of session.participant_ids) {
      const participant = world.getEntity(participantId);
      if (!participant) continue;

      // Clear VR state from participant
      // This would integrate with participant component
    }
  }

  /**
   * Apply emotional influence to a participant
   */
  private applyEmotionalInfluence(
    _entity: Entity,
    _targetEmotion: EmotionalSignature,
    _progress: number,
    _fidelity: number
  ): void {
    // Emotional influence strength based on fidelity and progress
    // Would calculate: strength = fidelity * progress * 0.1

    // This would integrate with the emotion system
    // For now, this is a placeholder
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return 'vr_' + timestamp + '_' + random;
  }

  /**
   * Emergency exit from a session
   */
  public emergencyExit(
    world: World,
    vrSystem: VRSystemComponent,
    sessionId: string
  ): boolean {
    const sessionIndex = vrSystem.active_sessions.findIndex(s => s.id === sessionId);
    if (sessionIndex === -1) return false;

    const session = vrSystem.active_sessions[sessionIndex];
    if (!session) return false;

    if (!session.emergency_exit_available) return false;

    this.endSession(world, vrSystem, session);
    vrSystem.active_sessions.splice(sessionIndex, 1);
    return true;
  }
}

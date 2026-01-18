/**
 * Virtual Reality System
 *
 * Manages VR sessions for emotional exploration and narrative experiences.
 * Provides curated emotional experiences through various VR types.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
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

export class VRSystem extends BaseSystem {
  public readonly id: SystemId = 'vr_system' as SystemId;
  public readonly priority: number = 160;
  public readonly requiredComponents = [
    CT.VRSystem,
  ] as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  private eventBus: EventBus | null = null;

  protected onInitialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const vrSystem = entity.getComponent('vr_system') as VRSystemComponent;
      if (!vrSystem) continue;

      this.processVRSystem(ctx.world, ctx.tick, vrSystem);
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

    // Emit session start event
    if (this.eventBus) {
      this.eventBus.emit({
        type: 'vr_session:started',
        source: this.id,
        data: {
          sessionId: session.id,
          participantIds,
          scenarioType,
          scenarioDescription,
        },
      });
    }

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
      this.eventBus.emit({
        type: 'vr_session:ended',
        source: this.id,
        data: {
          sessionId: session.id,
          participantIds: session.participant_ids,
          duration: session.duration,
          scenarioType: session.scenario.type,
          completed: session.duration >= session.max_duration,
        },
      });
    }

    // Process participants
    for (const participantId of session.participant_ids) {
      const participant = world.getEntity(participantId);
      if (!participant) continue;

      // Mark that VR session has ended
      // Future: Add a vr_participant component to track active sessions
      // For now, the session ending will naturally affect mood via applyEmotionalInfluence
    }
  }

  /**
   * Apply emotional influence to a participant
   */
  private applyEmotionalInfluence(
    entity: Entity,
    targetEmotion: EmotionalSignature,
    progress: number,
    fidelity: number
  ): void {
    // Get mood component
    interface MoodComponent {
      currentMood: number;
      emotionalState: string;
    }
    const mood = entity.getComponent<MoodComponent>('mood');
    if (!mood) return;

    // Emotional influence strength based on fidelity and progress
    // Higher fidelity = stronger effect, progress = ramp up over session
    const strength = fidelity * progress * 0.1;

    // Apply emotional effects to mood
    // Convert EmotionalSignature to mood adjustments
    for (const [emotion, intensity] of Object.entries(targetEmotion.emotions)) {
      const moodChange = intensity * strength * 10; // Scale to mood range (-100 to 100)

      // Map emotions to mood changes
      if (emotion === 'joy' || emotion === 'happiness' || emotion === 'excitement') {
        mood.currentMood = Math.min(100, mood.currentMood + moodChange);
        if (moodChange > 20) mood.emotionalState = 'joyful';
        else if (moodChange > 10) mood.emotionalState = 'excited';
      } else if (emotion === 'sadness' || emotion === 'grief' || emotion === 'melancholy') {
        mood.currentMood = Math.max(-100, mood.currentMood - moodChange);
        if (moodChange > 20) mood.emotionalState = 'grieving';
        else if (moodChange > 10) mood.emotionalState = 'melancholic';
      } else if (emotion === 'anxiety' || emotion === 'fear' || emotion === 'worry') {
        mood.currentMood = Math.max(-100, mood.currentMood - moodChange * 0.5);
        mood.emotionalState = 'anxious';
      } else if (emotion === 'nostalgia') {
        mood.emotionalState = 'nostalgic';
      } else if (emotion === 'gratitude' || emotion === 'appreciation') {
        mood.currentMood = Math.min(100, mood.currentMood + moodChange * 0.7);
        mood.emotionalState = 'grateful';
      } else if (emotion === 'pride' || emotion === 'accomplishment') {
        mood.currentMood = Math.min(100, mood.currentMood + moodChange * 0.8);
        mood.emotionalState = 'proud';
      }
    }

    // Update mood component (cast to EntityImpl to access mutator methods)
    interface EntityWithUpdate {
      updateComponent<T>(type: string, updater: (current: T) => T): void;
    }
    (entity as unknown as EntityWithUpdate).updateComponent('mood', () => mood);
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

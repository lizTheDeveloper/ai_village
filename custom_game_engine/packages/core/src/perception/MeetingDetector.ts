/**
 * MeetingDetector - Detects meeting calls from heard speech
 *
 * This processor checks if an agent has heard a meeting call and decides
 * whether to attend based on the relationship with the caller.
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { MeetingComponent } from '../components/MeetingComponent.js';
import { ComponentType } from '../types/ComponentType.js';

/**
 * Meeting detection result
 */
export interface MeetingDetectionResult {
  detected: boolean;
  callerName?: string;
  callerId?: string;
  attending?: boolean;
}

/** Meeting call phrases to detect */
const MEETING_PHRASES = ['calling a meeting', 'gather around', 'everyone come here', 'meeting time'];

/** Behaviors that should not be interrupted for meetings */
const UNINTERRUPTIBLE_BEHAVIORS = ['forced_sleep', 'seek_sleep', 'call_meeting', 'attend_meeting'];

/**
 * MeetingDetector Class
 *
 * Usage:
 * ```typescript
 * const meetingDetector = new MeetingDetector();
 *
 * // In system update loop (after hearing processing)
 * const result = meetingDetector.process(entity, world);
 * if (result.detected && result.attending) {
 *   console.log(`${agentName} is attending ${result.callerName}'s meeting`);
 * }
 * ```
 */
export class MeetingDetector {
  /**
   * Process meeting calls for an entity.
   */
  process(entity: EntityImpl, world: World): MeetingDetectionResult {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const vision = entity.getComponent<VisionComponent>(ComponentType.Vision);
    const relationship = entity.getComponent<RelationshipComponent>(ComponentType.Relationship);

    if (!agent || !vision?.heardSpeech) {
      return { detected: false };
    }

    // Don't interrupt critical behaviors
    if (this.isUninterruptible(agent.behavior)) {
      return { detected: false };
    }

    // Check if we heard a meeting call
    for (const speech of vision.heardSpeech) {
      const meetingPhrase = this.detectMeetingPhrase(speech.text);
      if (!meetingPhrase) continue;

      // Find the agent who called the meeting
      const caller = this.findMeetingCaller(world, speech.speaker, entity.id);
      if (!caller) continue;

      // Decide whether to attend based on relationship
      const shouldAttend = this.shouldAttendMeeting(entity, caller.id, relationship || null);

      if (shouldAttend) {
        // Switch to attend_meeting behavior
        entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
          ...current,
          behavior: 'attend_meeting',
          behaviorState: {
            meetingCallerId: caller.id,
          },
          lastThought: `I should attend ${speech.speaker}'s meeting`,
        }));

        return {
          detected: true,
          callerName: speech.speaker,
          callerId: caller.id,
          attending: true,
        };
      } else {

        return {
          detected: true,
          callerName: speech.speaker,
          callerId: caller.id,
          attending: false,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Check if behavior should not be interrupted for meetings.
   */
  private isUninterruptible(behavior: string): boolean {
    return UNINTERRUPTIBLE_BEHAVIORS.includes(behavior);
  }

  /**
   * Detect meeting-related phrases in speech text.
   */
  private detectMeetingPhrase(text: string): string | null {
    const lowerText = text.toLowerCase();

    for (const phrase of MEETING_PHRASES) {
      if (lowerText.includes(phrase)) {
        return phrase;
      }
    }

    return null;
  }

  /**
   * Find the agent who called the meeting by speaker name.
   */
  private findMeetingCaller(world: World, speakerName: string, selfId: string): Entity | null {
    const agents = world.query().with(ComponentType.Agent).with(ComponentType.Position).executeEntities();

    for (const agent of agents) {
      if (agent.id === selfId) continue;

      const impl = agent as EntityImpl;
      const identity = impl.getComponent<IdentityComponent>(ComponentType.Identity);
      const meeting = impl.getComponent<MeetingComponent>(ComponentType.Meeting);

      // Check if this agent has a meeting and their name matches the speaker
      if (meeting && identity?.name === speakerName) {
        return agent;
      }
    }

    return null;
  }

  /**
   * Decide whether an agent should attend a meeting based on relationship with caller.
   */
  private shouldAttendMeeting(
    _entity: EntityImpl,
    callerId: string,
    relationship: RelationshipComponent | null
  ): boolean {
    if (!relationship) {
      // No relationship data - 50% chance to attend
      return Math.random() > 0.5;
    }

    // Get familiarity with the caller
    const callerRelation = relationship.relationships.get(callerId);
    const familiarity = callerRelation?.familiarity || 0;

    // Higher familiarity = more likely to attend
    // 0 familiarity = 30% chance
    // 50 familiarity = 65% chance
    // 100 familiarity = 100% chance
    const attendChance = 0.3 + (familiarity / 100) * 0.7;

    return Math.random() < attendChance;
  }

  /**
   * Check if speech contains a meeting call (without processing).
   */
  isMeetingCall(text: string): boolean {
    return this.detectMeetingPhrase(text) !== null;
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const meetingDetector = new MeetingDetector();

/**
 * Process meeting detection for an entity.
 */
export function processMeetingCalls(entity: Entity, world: World): MeetingDetectionResult {
  return meetingDetector.process(entity as EntityImpl, world);
}

/**
 * Check if text contains a meeting call.
 */
export function isMeetingCall(text: string): boolean {
  return meetingDetector.isMeetingCall(text);
}

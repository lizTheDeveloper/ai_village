/**
 * MeetingBehaviors - Meeting-related behaviors
 *
 * Includes:
 * - CallMeetingBehavior: Organize and host a meeting
 * - AttendMeetingBehavior: Attend a meeting called by another agent
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';
import {
  createMeetingComponent,
  updateMeetingStatus,
  hasMeetingEnded,
  addMeetingAttendee,
  type MeetingComponent,
} from '../../components/MeetingComponent.js';

/** Default meeting duration in ticks (~20 seconds) */
const DEFAULT_MEETING_DURATION = 400;

/** Distance threshold for arriving at meeting */
const ARRIVAL_THRESHOLD = 2.0;

/** Interval between reminder announcements */
const REMINDER_INTERVAL = 100;

/**
 * CallMeetingBehavior - Organize and host a meeting
 */
export class CallMeetingBehavior extends BaseBehavior {
  readonly name = 'call_meeting' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const identity = entity.getComponent<IdentityComponent>(ComponentType.Identity);

    // Check if we already have a meeting component
    const meeting = entity.getComponent<MeetingComponent>(ComponentType.Meeting);

    if (!meeting) {
      // Create new meeting
      this.startMeeting(entity, agent, position, identity, world);
    } else {
      // Update existing meeting
      this.updateMeeting(entity, meeting, agent, world);
    }
  }

  private startMeeting(
    entity: EntityImpl,
    agent: AgentComponent,
    position: PositionComponent,
    identity: IdentityComponent | undefined,
    world: World
  ): void {
    const topic = agent.behaviorState.topic as string || 'village gathering';

    const meeting = createMeetingComponent(
      entity.id,
      topic,
      { x: position.x, y: position.y },
      world.tick,
      DEFAULT_MEETING_DURATION
    );

    (entity as any).addComponent(meeting);

    // Announce the meeting through speech
    const callerName = identity?.name || 'Someone';
    const announcement = `${callerName} is calling a meeting about ${topic}! Everyone gather around!`;

    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      recentSpeech: announcement,
      lastThought: `I'm calling a meeting to discuss ${topic}`,
    }));

  }

  private updateMeeting(
    entity: EntityImpl,
    meeting: MeetingComponent,
    _agent: AgentComponent,
    world: World
  ): void {
    // Update meeting status
    meeting = updateMeetingStatus(meeting, world.tick);
    entity.updateComponent('meeting', () => meeting);

    // Check if meeting has ended
    if (hasMeetingEnded(meeting, world.tick)) {

      // Remove meeting component
      entity.removeComponent(ComponentType.Meeting);

      // Go back to wandering
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
        recentSpeech: 'Thank you all for coming to the meeting!',
      }));
      return;
    }

    // Stay in place during meeting
    this.stopMovement(entity);

    // Periodically remind people
    if (meeting.status === 'calling' && world.tick % REMINDER_INTERVAL === 0) {
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        recentSpeech: `The meeting is starting! Please come join us!`,
      }));
    }
  }
}

/**
 * AttendMeetingBehavior - Attend a meeting called by another agent
 */
export class AttendMeetingBehavior extends BaseBehavior {
  readonly name = 'attend_meeting' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent)!;
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement)!;
    const identity = entity.getComponent<IdentityComponent>(ComponentType.Identity);

    // Get meeting caller ID from behavior state
    const meetingCallerId = agent.behaviorState.meetingCallerId as string;
    if (!meetingCallerId) {
      // No meeting to attend
      return { complete: true, reason: 'No meeting to attend' };
    }

    // Find the meeting caller
    const caller = world.getEntity(meetingCallerId);
    if (!caller) {
      // Caller doesn't exist anymore
      return { complete: true, reason: 'Meeting caller not found' };
    }

    const callerImpl = caller as EntityImpl;
    const meeting = callerImpl.getComponent<MeetingComponent>(ComponentType.Meeting);

    if (!meeting || meeting.status === 'ended') {
      // Meeting doesn't exist or has ended
      return { complete: true, reason: 'Meeting ended' };
    }

    // Move towards meeting location
    const dx = meeting.location.x - position.x;
    const dy = meeting.location.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= ARRIVAL_THRESHOLD) {
      // We've arrived! Join the meeting
      this.joinMeeting(entity, callerImpl, meeting, identity);
    } else {
      // Move towards the meeting
      const velocityX = (dx / distance) * movement.speed;
      const velocityY = (dy / distance) * movement.speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        velocityX,
        velocityY,
      }));
    }
  }

  private joinMeeting(
    entity: EntityImpl,
    callerImpl: EntityImpl,
    meeting: MeetingComponent,
    _identity: IdentityComponent | undefined
  ): void {
    if (!meeting.attendees.includes(entity.id)) {
      const updatedMeeting = addMeetingAttendee(meeting, entity.id);
      callerImpl.updateComponent('meeting', () => updatedMeeting);

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        lastThought: `I've joined the meeting about ${meeting.topic}`,
      }));
    }

    // Stay at the meeting location
    this.stopMovement(entity);
  }
}

/**
 * Standalone functions for use with BehaviorRegistry.
 */
export function callMeetingBehavior(entity: EntityImpl, world: World): void {
  const behavior = new CallMeetingBehavior();
  behavior.execute(entity, world);
}

export function attendMeetingBehavior(entity: EntityImpl, world: World): void {
  const behavior = new AttendMeetingBehavior();
  behavior.execute(entity, world);
}

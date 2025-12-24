import type { Component } from '../ecs/Component.js';

/**
 * Component for agents who have called a meeting.
 * This allows other agents to hear the meeting call and decide whether to attend.
 */
export interface MeetingComponent extends Component {
  type: 'meeting';
  callerId: string;           // ID of the agent who called the meeting
  topic: string;              // What the meeting is about
  location: { x: number; y: number }; // Where to gather
  calledAt: number;           // Game tick when meeting was called
  duration: number;           // How long the meeting should last (in ticks)
  attendees: string[];        // IDs of agents who have joined
  status: 'calling' | 'active' | 'ended'; // Meeting lifecycle
}

/**
 * Create a new meeting component.
 */
export function createMeetingComponent(
  callerId: string,
  topic: string,
  location: { x: number; y: number },
  currentTick: number,
  duration: number = 200 // Default ~10 seconds at 20 TPS
): MeetingComponent {
  return {
    type: 'meeting',
    version: 1,
    callerId,
    topic,
    location,
    calledAt: currentTick,
    duration,
    attendees: [callerId], // Caller is automatically an attendee
    status: 'calling',
  };
}

/**
 * Add an attendee to the meeting.
 */
export function addMeetingAttendee(
  meeting: MeetingComponent,
  agentId: string
): MeetingComponent {
  if (meeting.attendees.includes(agentId)) {
    return meeting;
  }

  return {
    ...meeting,
    attendees: [...meeting.attendees, agentId],
  };
}

/**
 * Check if the meeting has enough attendees to start.
 */
export function canStartMeeting(meeting: MeetingComponent, minAttendees: number = 2): boolean {
  return meeting.attendees.length >= minAttendees;
}

/**
 * Check if the meeting has ended.
 */
export function hasMeetingEnded(meeting: MeetingComponent, currentTick: number): boolean {
  return currentTick >= meeting.calledAt + meeting.duration;
}

/**
 * Update meeting status based on current tick.
 */
export function updateMeetingStatus(
  meeting: MeetingComponent,
  currentTick: number
): MeetingComponent {
  if (meeting.status === 'ended') {
    return meeting;
  }

  if (hasMeetingEnded(meeting, currentTick)) {
    return { ...meeting, status: 'ended' };
  }

  if (meeting.status === 'calling' && canStartMeeting(meeting)) {
    return { ...meeting, status: 'active' };
  }

  return meeting;
}

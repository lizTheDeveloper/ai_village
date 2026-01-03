> **System:** communication-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Phone Scheduling & Calendar System - Technical Specification

## Overview

Agents with cross-realm phones can schedule meetings, receive calendar reminders, and automatically route to appropriate locations for calls/meetings. Mayors and important NPCs have dedicated offices for private video calls and negotiations.

## System Components

### 1. Schedule App Component

**CalendarAppComponent** - Attached to entities with phones
```typescript
interface CalendarAppComponent {
  type: 'calendar_app';

  // Scheduled events
  events: ScheduledEvent[];

  // Reminders (generated from events)
  activeReminders: Reminder[];

  // Settings
  defaultMeetingDuration: number; // minutes
  defaultReminderOffset: number;  // minutes before event
  autoAcceptFrom: string[];       // EntityIds who can auto-schedule
  workingHours: TimeRange;        // When agent accepts meetings

  // Do-not-disturb periods
  blockedTimes: TimeRange[];
}

interface ScheduledEvent {
  id: string;
  title: string;
  description: string;

  // Timing
  startTime: bigint;    // Game tick
  duration: number;     // minutes

  // Type determines agent behavior
  type: 'in_person_meeting' | 'video_call' | 'phone_call' | 'reminder_only';

  // Participants
  organizer: string;    // EntityId
  attendees: string[];  // EntityIds

  // Location (for in-person meetings)
  location?: {
    x: number;
    y: number;
    buildingId?: string;
    roomName?: string;
  };

  // Call info (for video/phone calls)
  callInfo?: {
    initiator: string;
    crossRealmAddress?: CrossRealmAddress;
    requiresPrivacy: boolean;  // Find private room?
  };

  // Status
  status: 'scheduled' | 'reminded' | 'in_progress' | 'completed' | 'cancelled';
  rsvp: Map<string, 'accepted' | 'declined' | 'tentative' | 'no_response'>;

  // Recurrence
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: bigint;
  };
}

interface Reminder {
  id: string;
  eventId: string;
  triggerTime: bigint;
  triggered: boolean;
  dismissed: boolean;
}

interface TimeRange {
  startHour: number;  // 0-23
  endHour: number;    // 0-23
}
```

### 2. Calendar System

**CalendarSystem** - Manages scheduling and reminders

```typescript
class CalendarSystem {
  update(world: World): void {
    const currentTick = getCurrentTick(world);

    // Check for triggered reminders
    this.checkReminders(world, currentTick);

    // Check for events starting now
    this.checkEventStarts(world, currentTick);

    // Update in-progress events
    this.updateActiveEvents(world, currentTick);
  }

  // Trigger reminders and queue routing behaviors
  private checkReminders(world: World, currentTick: bigint): void {
    for (const entity of world.query().with('calendar_app').executeEntities()) {
      const calendar = entity.getComponent('calendar_app') as CalendarAppComponent;

      for (const reminder of calendar.activeReminders) {
        if (!reminder.triggered && currentTick >= reminder.triggerTime) {
          reminder.triggered = true;
          this.triggerReminder(world, entity, reminder, calendar);
        }
      }
    }
  }

  private triggerReminder(
    world: World,
    entity: Entity,
    reminder: Reminder,
    calendar: CalendarAppComponent
  ): void {
    const event = calendar.events.find(e => e.id === reminder.eventId);
    if (!event) return;

    // Queue appropriate behavior based on event type
    switch (event.type) {
      case 'in_person_meeting':
        this.queueMeetingNavigation(world, entity, event);
        break;

      case 'video_call':
        this.queueVideoCallPrep(world, entity, event);
        break;

      case 'phone_call':
        this.queuePhoneCallPrep(world, entity, event);
        break;

      case 'reminder_only':
        this.showNotification(entity, event);
        break;
    }
  }

  // Queue "GoToLocation" behavior for in-person meetings
  private queueMeetingNavigation(world: World, entity: Entity, event: ScheduledEvent): void {
    if (!event.location) return;

    const behaviorQueue = entity.getComponent('behavior_queue');
    if (!behaviorQueue) return;

    // Insert high-priority navigation behavior
    behaviorQueue.queue.unshift({
      behavior: 'go_to_location',
      priority: 900, // High priority
      params: {
        x: event.location.x,
        y: event.location.y,
        reason: `Meeting: ${event.title}`,
        arriveBy: event.startTime,
      },
      insertedAt: world.getCurrentTick(),
    });
  }

  // Queue "FindPrivateRoom" + "InitiateVideoCall" for video calls
  private queueVideoCallPrep(world: World, entity: Entity, event: ScheduledEvent): void {
    if (!event.callInfo) return;

    const behaviorQueue = entity.getComponent('behavior_queue');
    if (!behaviorQueue) return;

    // Find private location first
    if (event.callInfo.requiresPrivacy) {
      behaviorQueue.queue.unshift({
        behavior: 'find_private_room',
        priority: 900,
        params: {
          reason: `Video call: ${event.title}`,
          arriveBy: event.startTime,
        },
      });
    }

    // Then initiate call
    behaviorQueue.queue.push({
      behavior: 'initiate_video_call',
      priority: 900,
      params: {
        eventId: event.id,
        targetAddress: event.callInfo.crossRealmAddress,
        startTime: event.startTime,
      },
    });
  }

  // API: Schedule a new event
  public scheduleEvent(
    world: World,
    organizerId: string,
    event: Omit<ScheduledEvent, 'id' | 'status' | 'rsvp'>
  ): { success: boolean; eventId?: string; reason?: string } {
    const organizer = world.getEntity(organizerId);
    if (!organizer) {
      return { success: false, reason: 'Organizer not found' };
    }

    const calendar = organizer.getComponent('calendar_app') as CalendarAppComponent;
    if (!calendar) {
      return { success: false, reason: 'Organizer does not have calendar app' };
    }

    // Check for conflicts
    const conflict = this.checkConflicts(calendar, event.startTime, event.duration);
    if (conflict) {
      return { success: false, reason: `Conflict with: ${conflict.title}` };
    }

    // Create event
    const eventId = generateEventId();
    const fullEvent: ScheduledEvent = {
      ...event,
      id: eventId,
      status: 'scheduled',
      rsvp: new Map(),
    };

    // Add to organizer's calendar
    calendar.events.push(fullEvent);

    // Create reminder
    const reminderTime = event.startTime - BigInt(calendar.defaultReminderOffset * 60 * 20); // Convert minutes to ticks
    calendar.activeReminders.push({
      id: generateReminderId(),
      eventId: eventId,
      triggerTime: reminderTime,
      triggered: false,
      dismissed: false,
    });

    // Send invites to attendees
    for (const attendeeId of event.attendees) {
      this.sendInvite(world, attendeeId, fullEvent);
    }

    return { success: true, eventId };
  }

  // Send event invite to attendee
  private sendInvite(world: World, attendeeId: string, event: ScheduledEvent): void {
    const attendee = world.getEntity(attendeeId);
    if (!attendee) return;

    const attendeeCalendar = attendee.getComponent('calendar_app') as CalendarAppComponent;
    if (!attendeeCalendar) return;

    // Auto-accept if organizer is in auto-accept list
    if (attendeeCalendar.autoAcceptFrom.includes(event.organizer)) {
      attendeeCalendar.events.push(event);
      event.rsvp.set(attendeeId, 'accepted');

      // Create reminder for attendee
      const reminderTime = event.startTime - BigInt(attendeeCalendar.defaultReminderOffset * 60 * 20);
      attendeeCalendar.activeReminders.push({
        id: generateReminderId(),
        eventId: event.id,
        triggerTime: reminderTime,
        triggered: false,
        dismissed: false,
      });
    } else {
      // Add to pending invites (UI shows notification)
      event.rsvp.set(attendeeId, 'no_response');
      // TODO: Add to notification system
    }
  }
}
```

### 3. FindPrivateRoom Behavior

**FindPrivateRoomBehavior** - Locates suitable private spaces

```typescript
class FindPrivateRoomBehavior implements AgentBehavior {
  name = 'find_private_room';

  async execute(world: World, entity: Entity, params: FindPrivateRoomParams): BehaviorResult {
    // Priority order:
    // 1. Mayor's office (if entity is mayor)
    // 2. Personal office (if entity has one)
    // 3. Empty meeting room
    // 4. Secluded outdoor location
    // 5. Fallback: any quiet corner

    const position = entity.getComponent('position') as PositionComponent;
    const agent = entity.getComponent('agent') as AgentComponent;

    // Check if entity is a mayor and has an office
    const mayorOffice = this.findMayorOffice(world, entity);
    if (mayorOffice) {
      return this.navigateToRoom(entity, mayorOffice);
    }

    // Check for personal office
    const personalOffice = this.findPersonalOffice(world, entity);
    if (personalOffice) {
      return this.navigateToRoom(entity, personalOffice);
    }

    // Find empty meeting room
    const meetingRoom = this.findEmptyMeetingRoom(world, position);
    if (meetingRoom) {
      return this.navigateToRoom(entity, meetingRoom);
    }

    // Find secluded outdoor spot
    const secludedSpot = this.findSecludedLocation(world, position);
    if (secludedSpot) {
      return this.navigateTo(entity, secludedSpot);
    }

    // Fallback: stay where you are if alone
    const nearbyAgents = this.countNearbyAgents(world, position, 5);
    if (nearbyAgents === 0) {
      return { status: 'success' };
    }

    return { status: 'failure', reason: 'No private location found' };
  }

  private findMayorOffice(world: World, entity: Entity): Building | null {
    // Check if entity has mayor role
    const tradeComp = entity.getComponent('trade_agreement');
    if (!tradeComp) return null;

    // Find town hall with mayor's office
    for (const building of world.query().with('building', 'town_hall').executeEntities()) {
      const townHall = building.getComponent('town_hall');
      if (townHall.mayorId === entity.id) {
        // Find office room in town hall
        return this.findOfficeInBuilding(building, entity.id);
      }
    }

    return null;
  }
}
```

### 4. Mayor Office Building Feature

**TownHallComponent** - Extended with office support

```typescript
interface TownHallComponent extends Component {
  type: 'town_hall';

  // ... existing fields ...

  // New: Mayor's office
  mayorOffice?: {
    position: { x: number; y: number }; // Within building
    isOccupied: boolean;
    currentOccupant?: string; // EntityId
    reservations: OfficeReservation[];
  };

  // New: Meeting rooms
  meetingRooms: MeetingRoom[];
}

interface MeetingRoom {
  id: string;
  name: string;
  position: { x: number; y: number };
  capacity: number;
  isOccupied: boolean;
  currentMeeting?: string; // EventId
  reservations: OfficeReservation[];
}

interface OfficeReservation {
  eventId: string;
  reservedBy: string; // EntityId
  startTime: bigint;
  duration: number; // minutes
}
```

**Office Building** - New building type for non-mayor leaders

```typescript
// Research unlock: "office_buildings" (tier 4)
const OFFICE_BUILDING: BuildingDefinition = {
  id: 'office_building',
  displayName: 'Office Building',
  category: 'municipal',

  constructionRequirements: {
    materials: [
      { item: 'wood_plank', amount: 80 },
      { item: 'stone_brick', amount: 60 },
      { item: 'glass_pane', amount: 20 },
    ],
    cost: 1200,
    time: 600, // ticks
  },

  features: {
    // Provides 4 private offices for important NPCs
    offices: 4,

    // Each office can be assigned to an agent
    assignableSpaces: true,
  },

  // Automatically assigns offices to:
  // - Trade negotiators
  // - Research leads
  // - Military commanders
  // - Wealthy merchants
};
```

### 5. Auto-Routing Behaviors

**Behavior Priority System** - Calendar events override normal behavior

```typescript
// In BehaviorQueueComponent
interface QueuedBehavior {
  behavior: string;
  priority: number;  // 0-1000
  params: Record<string, unknown>;
  insertedAt: bigint;

  // New: Calendar event tracking
  sourceEvent?: {
    eventId: string;
    mustCompleteBy: bigint; // Event start time
  };
}

// Priority levels:
// 1000 = Emergency (combat, flee)
// 900  = Calendar event (meeting, scheduled call)
// 500  = Important task (job, eat when hungry)
// 100  = Optional task (socialize, explore)
// 0    = Idle/wander
```

## Implementation Work Orders

### Work Order 1: Calendar App Component & System

**Files to create:**
- `packages/core/src/components/CalendarAppComponent.ts`
- `packages/core/src/systems/CalendarSystem.ts`

**Tasks:**
1. Implement CalendarAppComponent with event storage
2. Implement CalendarSystem with reminder checking
3. Add event scheduling API
4. Add RSVP handling
5. Integrate with CrossRealmPhoneSystem for call scheduling
6. Add event conflict detection
7. Add working hours validation

**Testing:**
- Schedule events and verify reminders trigger
- Test RSVP flow
- Test conflict detection
- Test recurring events

### Work Order 2: FindPrivateRoom Behavior

**Files to create:**
- `packages/core/src/behavior/behaviors/FindPrivateRoomBehavior.ts`

**Tasks:**
1. Implement room finding logic (priority order)
2. Add mayor office detection
3. Add personal office detection
4. Add empty meeting room search
5. Add secluded outdoor location finder
6. Add occupancy tracking
7. Integrate with navigation system

**Testing:**
- Test mayor finding their office
- Test fallback to meeting rooms
- Test outdoor location fallback
- Test "stay in place" fallback

### Work Order 3: Mayor Offices & Meeting Rooms

**Files to modify:**
- `packages/core/src/components/TownHallComponent.ts`
- `packages/core/src/buildings/TownHall.ts`

**Tasks:**
1. Add mayorOffice field to TownHallComponent
2. Add meetingRooms array to TownHallComponent
3. Implement office reservation system
4. Add occupancy tracking
5. Add office auto-assignment when mayor is elected
6. Update town hall building to include office spaces

**Testing:**
- Verify mayor can reserve their office
- Test meeting room reservations
- Test occupancy detection
- Test multi-room scheduling

### Work Order 4: Office Building Type

**Files to create:**
- `packages/core/src/buildings/OfficeBuilding.ts`
- `packages/core/src/components/OfficeBuildingComponent.ts`

**Tasks:**
1. Create office building definition
2. Add office assignment system
3. Implement auto-assignment rules (negotiators, researchers, etc.)
4. Add office space management UI
5. Add research unlock "office_buildings" (tier 4)

**Testing:**
- Build office building
- Verify auto-assignment works
- Test manual assignment
- Test office usage during calls

### Work Order 5: Auto-Routing Integration

**Files to modify:**
- `packages/core/src/components/BehaviorQueueComponent.ts`
- `packages/core/src/systems/BehaviorQueueSystem.ts`
- `packages/core/src/systems/CalendarSystem.ts`

**Tasks:**
1. Add priority levels to behavior queue
2. Implement priority-based sorting
3. Add calendar event behavior injection
4. Add "mustCompleteBy" deadline tracking
5. Implement auto-navigation for meetings
6. Implement auto-privacy-seeking for calls

**Testing:**
- Schedule meeting and verify agent navigates
- Schedule video call and verify agent finds privacy
- Test priority preemption (calendar overrides wander)
- Test deadline adherence

### Work Order 6: Video Call Behavior

**Files to create:**
- `packages/core/src/behavior/behaviors/InitiateVideoCallBehavior.ts`
- `packages/core/src/behavior/behaviors/ReceiveVideoCallBehavior.ts`

**Tasks:**
1. Implement video call initiation from calendar event
2. Add privacy validation (are we alone?)
3. Add CrossRealmPhoneSystem integration
4. Add call duration tracking
5. Add "end call when event ends" logic
6. Update UI to show "on call" status

**Testing:**
- Schedule video call, verify agent finds privacy and initiates
- Test cross-universe video calls
- Test call ending at scheduled time
- Test interruption handling

## Research Tree Integration

**New Research Nodes:**

```typescript
// Tier 3: Basic scheduling (local only)
{
  id: 'calendar_technology',
  name: 'Calendar & Scheduling',
  description: 'Develop calendar technology for scheduling meetings and reminders',
  tier: 3,
  prerequisites: ['basic_cross_realm_phone'], // From existing phone system
  unlocks: [
    { type: 'component', componentId: 'calendar_app' },
    { type: 'behavior', behaviorId: 'find_private_room' },
  ],
}

// Tier 4: Office infrastructure
{
  id: 'office_buildings',
  name: 'Office Buildings',
  description: 'Construct dedicated office spaces for leaders and negotiators',
  tier: 4,
  prerequisites: ['calendar_technology'],
  unlocks: [
    { type: 'building', buildingId: 'office_building' },
  ],
}

// Tier 7: Cross-universe scheduling
{
  id: 'cross_universe_scheduling',
  name: 'Cross-Universe Scheduling',
  description: 'Schedule meetings and calls across different universes',
  tier: 7,
  prerequisites: ['advanced_cross_realm_communication', 'office_buildings'],
  unlocks: [
    { type: 'feature', featureId: 'cross_universe_calendar_sync' },
  ],
}
```

## UI/UX Considerations

### Calendar Panel
- Show agent's upcoming events
- Color-coded by type (meeting=blue, call=green, reminder=yellow)
- RSVP buttons for pending invites
- "Schedule New Event" wizard

### Agent Status Indicators
- "📅 Meeting in 10 minutes" - reminder triggered
- "🚶 Heading to meeting" - navigating to event
- "📞 On video call" - in active call
- "🚫 Do Not Disturb" - blocked time

### Mayor Office View
- Show mayor's calendar in town hall UI
- Reservation system for meeting rooms
- "Request Meeting with Mayor" button for citizens

## Performance Considerations

### Optimization Strategies
1. **Lazy reminder generation** - Don't create all reminders upfront, generate them as events approach
2. **Spatial indexing** - Cache nearby meeting rooms/offices to avoid repeated queries
3. **Throttled updates** - Calendar system only needs to update every ~20 ticks (1 second)
4. **Event pruning** - Auto-delete completed events older than 7 in-game days

### Memory Management
```typescript
// In CalendarSystem.update()
if (currentTick % 12000 === 0) { // Every 10 minutes
  this.pruneOldEvents(world, currentTick);
}

private pruneOldEvents(world: World, currentTick: bigint): void {
  const cutoff = currentTick - BigInt(7 * 24 * 60 * 60 * 20); // 7 days in ticks

  for (const entity of world.query().with('calendar_app').executeEntities()) {
    const calendar = entity.getComponent('calendar_app') as CalendarAppComponent;

    calendar.events = calendar.events.filter(event =>
      event.status !== 'completed' || event.startTime > cutoff
    );

    calendar.activeReminders = calendar.activeReminders.filter(reminder =>
      !reminder.dismissed && reminder.triggerTime > currentTick - BigInt(3600 * 20)
    );
  }
}
```

## Integration with Existing Systems

### CrossRealmPhoneSystem
- Calendar system creates calls via `makeCall()` API
- Video calls use 'video' call type
- Phone calls use 'voice' call type

### BehaviorQueueSystem
- Calendar events inject behaviors via priority queue
- Existing behaviors yield to calendar events (priority 900)
- Behavior preemption for urgent meetings

### TownHallComponent
- Mayors auto-get office when elected
- Meeting rooms available for reservation
- Calendar integration for town meetings

### TradeAgreementSystem
- Mayors can schedule negotiation meetings
- Counter-offers can include meeting time proposals
- Cross-universe trade meetings use video calls

## Example Flows

### Flow 1: Mayor Schedules Trade Negotiation
1. Mayor receives trade proposal from another universe
2. Mayor's LLM decides to counter-offer
3. System automatically schedules video call for negotiation
4. Reminder triggers 5 minutes before call
5. Mayor navigates to office (FindPrivateRoomBehavior)
6. Video call initiates via CrossRealmPhoneSystem
7. Negotiation proceeds via MayorNegotiator LLM
8. Call ends, agreement finalized

### Flow 2: Citizen Schedules Meeting with Mayor
1. Citizen uses "Request Meeting" UI in town hall
2. System finds open slot in mayor's calendar
3. Event created, both parties receive reminder
4. Mayor and citizen both navigate to town hall meeting room
5. Meeting occurs (conversation system)
6. Event marked complete

### Flow 3: Cross-Universe Council Meeting
1. 5 mayors from different universes schedule council meeting
2. Each mayor receives calendar invite
3. All mayors auto-RSVP (auto-accept from other mayors)
4. Reminders trigger 10 minutes before
5. All mayors find private rooms in their respective universes
6. Conference call initiated (using existing conference call feature)
7. Council discusses multiverse matters
8. Call ends, all return to normal duties

## Testing Strategy

### Unit Tests
- Event scheduling and conflict detection
- Reminder trigger timing
- RSVP logic
- Office reservation system

### Integration Tests
- Full meeting flow (schedule → remind → navigate → attend)
- Video call flow (schedule → privacy → call → end)
- Cross-universe scheduling
- Priority preemption

### Simulation Tests
- 100 agents with calendars, schedule 500 meetings
- Verify no double-bookings
- Verify all agents arrive on time
- Measure performance impact

## Future Enhancements

### Phase 2 (Post-MVP)
- **Recurring meetings** - Daily standup, weekly council
- **Meeting notes** - LLM-generated summaries
- **Calendar sharing** - View colleague calendars for scheduling
- **Smart scheduling** - AI suggests best meeting times
- **Time zone support** - Different universe time flows

### Phase 3 (Advanced)
- **Holographic meetings** - 3D avatars in virtual space
- **Meeting transcription** - Record and search past meetings
- **Action items** - Auto-extract tasks from meeting discussions
- **Calendar analytics** - Time spent in meetings dashboard

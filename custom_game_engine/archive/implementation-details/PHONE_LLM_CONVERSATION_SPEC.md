# Phone LLM Conversation System

## Overview

When an agent receives a phone call and answers it, the LLM is engaged to generate
conversation responses. This creates natural phone conversations between agents
across realms, with toggleable notification settings.

## Notification System Architecture

Like modern phones (iOS/Android), notifications are organized hierarchically:
1. **Global settings** - Master DND, default behaviors
2. **Per-app settings** - Each "app" (Calls, Messages, Divine Chat, etc.) has its own settings
3. **Per-conversation settings** - Individual chats/contacts can be muted or customized
4. **Blocking** - Completely block specific contacts

## App Registry

```typescript
type PhoneAppId =
  | 'calls'           // Voice/video calls
  | 'messages'        // Text messages (SMS-style)
  | 'divine_chat'     // Divine chat room notifications
  | 'family_chat'     // Family group chat
  | 'guild_chat'      // Guild/faction chat
  | 'marketplace'     // Trade/market notifications
  | 'calendar'        // Meeting reminders
  | 'voicemail';      // Voicemail notifications

interface PhoneApp {
  id: PhoneAppId;
  name: string;
  icon: string;
  canBeDisabled: boolean;  // Some apps (calls) can't be fully disabled
  defaultSettings: AppNotificationSettings;
}

const PHONE_APPS: PhoneApp[] = [
  { id: 'calls', name: 'Phone', icon: 'phone', canBeDisabled: false, ... },
  { id: 'messages', name: 'Messages', icon: 'message', canBeDisabled: true, ... },
  { id: 'divine_chat', name: 'Divine Chat', icon: 'deity', canBeDisabled: true, ... },
  { id: 'family_chat', name: 'Family', icon: 'family', canBeDisabled: true, ... },
  { id: 'guild_chat', name: 'Guild', icon: 'guild', canBeDisabled: true, ... },
  { id: 'marketplace', name: 'Market', icon: 'trade', canBeDisabled: true, ... },
  { id: 'calendar', name: 'Calendar', icon: 'calendar', canBeDisabled: true, ... },
  { id: 'voicemail', name: 'Voicemail', icon: 'voicemail', canBeDisabled: true, ... },
];
```

## Notification Settings

### Per-App Settings

```typescript
interface AppNotificationSettings {
  // Is this app allowed to send notifications?
  enabled: boolean;

  // Notification style
  alertStyle: 'banner' | 'alert' | 'none';

  // Sound settings
  sound: {
    enabled: boolean;
    soundId: string;      // Custom sound per app
    volume: number;       // 0-100
  };

  // Badge (unread count on app icon)
  showBadge: boolean;

  // Preview content in notification
  showPreview: 'always' | 'when_unlocked' | 'never';

  // Group notifications
  grouping: 'automatic' | 'by_contact' | 'off';

  // Allow during DND
  allowDuringDND: boolean;

  // Critical alerts bypass everything (for emergency calls)
  criticalAlerts: boolean;
}
```

### Per-Conversation Settings

```typescript
interface ConversationNotificationSettings {
  // Unique ID for this conversation (contact ID or room ID)
  conversationId: string;

  // Display name for UI
  displayName: string;

  // Mute status
  muted: boolean;
  mutedUntil: number | null;  // Tick when mute expires, null = forever

  // === SCHEDULED CHECKING (instead of real-time) ===
  // Agent silences notifications but sets reminder to check periodically
  scheduledCheck: {
    enabled: boolean;
    // How often to remind agent to check this conversation
    checkInterval: 'hourly' | 'daily' | 'weekly' | 'manual';
    // Last time agent checked this conversation
    lastCheckedTick: number;
    // Next scheduled reminder tick
    nextReminderTick: number | null;
    // Show badge count even when muted (so agent knows there's activity)
    showBadgeWhenMuted: boolean;
  };

  // Custom sound (overrides app default)
  customSound: string | null;

  // Custom alert style (overrides app default)
  customAlertStyle: 'banner' | 'alert' | 'none' | null;

  // Pin to top of conversation list
  pinned: boolean;

  // Archive (hide from main list but keep history)
  archived: boolean;
}
```

### Notification Batching & Digests

For high-volume notifications (famous agents, busy group chats):

```typescript
interface NotificationBatchSettings {
  // Instead of individual notifications, batch into digest
  batchMode: 'off' | 'hourly' | 'daily' | 'threshold';

  // For threshold mode: batch after N notifications
  batchThreshold: number;

  // Digest summary style
  digestStyle: 'count_only' | 'summary' | 'full_list';

  // Reminder to check batched notifications
  reminderEnabled: boolean;
  reminderTimes: number[];  // In-game hours to remind (e.g., [8, 12, 18])
}

// Example: Famous agent batches follow notifications
const famousAgentSettings: NotificationBatchSettings = {
  batchMode: 'threshold',
  batchThreshold: 10,  // After 10 follows, batch the rest
  digestStyle: 'count_only',  // "47 new followers"
  reminderEnabled: true,
  reminderTimes: [8, 20],  // Check morning and evening
};
```

### Social/Fame Notifications

```typescript
type SocialNotificationType =
  | 'follow'           // Someone followed you
  | 'unfollow'         // Someone unfollowed
  | 'mention'          // Tagged in a message
  | 'reply'            // Reply to your message
  | 'reaction'         // Reaction to your content
  | 'reputation_change' // Reputation went up/down
  | 'title_earned'     // Earned a new title
  | 'rumor_spread';    // A rumor about you is spreading

interface SocialNotificationSettings {
  // Per-type settings
  typeSettings: Map<SocialNotificationType, {
    enabled: boolean;
    batchMode: 'off' | 'hourly' | 'daily' | 'threshold';
    threshold: number;
    alertStyle: 'banner' | 'badge_only' | 'silent';
  }>;

  // Fame-based auto-adjustment
  fameAutoAdjust: {
    enabled: boolean;
    // When reputation exceeds threshold, auto-batch follows
    reputationThreshold: number;
    // Batch mode when famous
    fameBatchMode: 'hourly' | 'daily';
  };

  // Only notify for follows from certain tiers
  followFilterByReputation: {
    enabled: boolean;
    minReputation: number;  // Only notify if follower has this reputation
  };
}

// Example: When you become famous, auto-batch follow notifications
function adjustSettingsForFame(
  settings: PhoneNotificationSettings,
  reputation: number
): void {
  const social = settings.appSettings.get('social');
  if (!social) return;

  const fameSettings = social.fameAutoAdjust;
  if (fameSettings.enabled && reputation > fameSettings.reputationThreshold) {
    // Switch follows to daily digest
    const follows = social.typeSettings.get('follow');
    if (follows && follows.batchMode === 'off') {
      follows.batchMode = fameSettings.fameBatchMode;
      follows.alertStyle = 'badge_only';

      // Notify agent of the change
      world.eventBus.emit({
        type: 'phone:settings_auto_adjusted',
        source: 'fame_system',
        data: {
          reason: 'You\'re getting popular! Follow notifications batched to daily.',
          setting: 'follow_notifications',
        },
      });
    }
  }
}
```

### Agent Autonomy: Smart Notification Management

Agents can use LLM to decide how to manage their notifications:

```typescript
interface NotificationManagementContext {
  // Current notification state
  pendingNotifications: number;
  notificationsPerHour: number;
  topSources: Array<{ source: string; count: number }>;

  // Agent state
  currentBehavior: string;
  stress: number;
  busyness: number;

  // Social state
  reputation: number;
  followerCount: number;
}

// LLM prompt for notification management
function buildNotificationManagementPrompt(context: NotificationManagementContext): string {
  return `You are ${agentName}, managing your phone notifications.

Current situation:
- You have ${context.pendingNotifications} unread notifications
- Getting ~${context.notificationsPerHour} notifications per hour
- Top sources: ${context.topSources.map(s => `${s.source} (${s.count})`).join(', ')}
- Your reputation: ${context.reputation}, Followers: ${context.followerCount}
- You're currently: ${context.currentBehavior}
- Stress level: ${context.stress}%

You can:
1. Mute a conversation (with optional reminder to check later)
2. Block a contact
3. Switch a notification type to digest/batch mode
4. Turn on Do Not Disturb
5. Activate a Focus Mode
6. Adjust your fame-related notification settings

What would you like to do? Respond with your decision.`;
}

// Example LLM response handling
interface NotificationDecision {
  action: 'mute' | 'block' | 'batch' | 'dnd' | 'focus' | 'adjust_fame' | 'none';
  target?: string;  // Conversation/contact ID
  duration?: 'hour' | 'day' | 'week' | 'forever';
  reminderToCheck?: boolean;
  reason: string;  // Why agent made this decision (for memory)
}
```

### Contact Blocking

```typescript
interface BlockedContact {
  contactId: string;
  contactName: string;
  blockedAt: number;        // Tick when blocked
  blockedReason?: string;   // Optional reason

  // What's blocked
  blockCalls: boolean;
  blockMessages: boolean;
  blockInChatRooms: boolean;  // Hide their messages in shared rooms

  // Report to divine authorities (for harassment)
  reported: boolean;
}
```

### Master Phone Settings

```typescript
interface PhoneNotificationSettings {
  // === GLOBAL SETTINGS ===

  // Master volume (multiplies all app volumes)
  masterVolume: number;  // 0-100

  // Global DND
  doNotDisturb: {
    enabled: boolean;
    schedule: {
      enabled: boolean;
      startHour: number;
      endHour: number;
    };
    allowRepeatCallers: boolean;  // Same person calls 2x in 3 min
    allowStarredContacts: boolean;  // VIP/favorites bypass
  };

  // Focus modes (presets)
  focusModes: Map<string, {
    name: string;
    allowedApps: PhoneAppId[];
    allowedContacts: string[];  // Contact IDs
    silenceUnknownCallers: boolean;
  }>;
  activeFocusMode: string | null;

  // === PER-APP SETTINGS ===
  appSettings: Map<PhoneAppId, AppNotificationSettings>;

  // === PER-CONVERSATION SETTINGS ===
  conversationSettings: Map<string, ConversationNotificationSettings>;

  // === BLOCKING ===
  blockedContacts: Map<string, BlockedContact>;

  // === STARRED/VIP CONTACTS ===
  starredContacts: Set<string>;  // Contact IDs that bypass DND
}
```

### Default Settings Factory

```typescript
function createDefaultPhoneSettings(): PhoneNotificationSettings {
  return {
    masterVolume: 80,
    doNotDisturb: {
      enabled: false,
      schedule: { enabled: false, startHour: 22, endHour: 7 },
      allowRepeatCallers: true,
      allowStarredContacts: true,
    },
    focusModes: new Map([
      ['sleep', {
        name: 'Sleep',
        allowedApps: ['calls'],
        allowedContacts: [],  // Only starred
        silenceUnknownCallers: true,
      }],
      ['work', {
        name: 'Working',
        allowedApps: ['calls', 'messages', 'guild_chat'],
        allowedContacts: [],
        silenceUnknownCallers: false,
      }],
    ]),
    activeFocusMode: null,
    appSettings: new Map([
      ['calls', {
        enabled: true,
        alertStyle: 'alert',
        sound: { enabled: true, soundId: 'ringtone_default', volume: 100 },
        showBadge: true,
        showPreview: 'always',
        grouping: 'off',
        allowDuringDND: false,
        criticalAlerts: false,
      }],
      ['messages', {
        enabled: true,
        alertStyle: 'banner',
        sound: { enabled: true, soundId: 'message_default', volume: 80 },
        showBadge: true,
        showPreview: 'when_unlocked',
        grouping: 'by_contact',
        allowDuringDND: false,
        criticalAlerts: false,
      }],
      ['divine_chat', {
        enabled: true,
        alertStyle: 'banner',
        sound: { enabled: true, soundId: 'divine_chime', volume: 60 },
        showBadge: true,
        showPreview: 'always',
        grouping: 'automatic',
        allowDuringDND: true,  // Gods can reach you anytime
        criticalAlerts: false,
      }],
      // ... other apps with sensible defaults
    ]),
    conversationSettings: new Map(),
    blockedContacts: new Map(),
    starredContacts: new Set(),
  };
}
```

## Notification Flow

```typescript
function shouldNotify(
  phone: PhoneNotificationSettings,
  app: PhoneAppId,
  senderId: string,
  senderName: string
): { notify: boolean; style: 'banner' | 'alert' | 'silent'; reason?: string } {

  // 1. Check if sender is blocked
  const blocked = phone.blockedContacts.get(senderId);
  if (blocked) {
    if (app === 'calls' && blocked.blockCalls) {
      return { notify: false, style: 'silent', reason: 'Contact blocked' };
    }
    if (app === 'messages' && blocked.blockMessages) {
      return { notify: false, style: 'silent', reason: 'Contact blocked' };
    }
  }

  // 2. Check app-level settings
  const appSettings = phone.appSettings.get(app);
  if (!appSettings?.enabled) {
    return { notify: false, style: 'silent', reason: 'App notifications disabled' };
  }

  // 3. Check conversation-level mute
  const convSettings = phone.conversationSettings.get(senderId);
  if (convSettings?.muted) {
    if (!convSettings.mutedUntil || currentTick < convSettings.mutedUntil) {
      return { notify: false, style: 'silent', reason: 'Conversation muted' };
    }
  }

  // 4. Check DND
  if (phone.doNotDisturb.enabled) {
    // Check if sender is starred (VIP)
    if (phone.doNotDisturb.allowStarredContacts && phone.starredContacts.has(senderId)) {
      // VIP bypasses DND
    }
    // Check if app allows DND bypass
    else if (!appSettings.allowDuringDND) {
      return { notify: false, style: 'silent', reason: 'Do Not Disturb active' };
    }
  }

  // 5. Check focus mode
  if (phone.activeFocusMode) {
    const focus = phone.focusModes.get(phone.activeFocusMode);
    if (focus) {
      if (!focus.allowedApps.includes(app)) {
        return { notify: false, style: 'silent', reason: `${focus.name} mode active` };
      }
      if (focus.silenceUnknownCallers && !phone.starredContacts.has(senderId)) {
        return { notify: false, style: 'silent', reason: 'Unknown caller silenced' };
      }
    }
  }

  // 6. Notification allowed - determine style
  const alertStyle = convSettings?.customAlertStyle || appSettings.alertStyle;
  return { notify: true, style: alertStyle };
}
```

## UI: Settings Panel

```
[Settings] > [Notifications]

  Master Volume: [=========-] 80%

  [Do Not Disturb]
    ( ) Off
    (x) On
    [ ] Scheduled: 10 PM - 7 AM
    [x] Allow repeat callers
    [x] Allow starred contacts

  [Focus Modes]
    Sleep    [Activate]
    Working  [Activate]
    + Add Focus Mode...

---

[Apps]

  [Phone (Calls)]
    Notifications: On
    Sound: Ringtone [Change]
    Alert Style: [Full Screen]
    Allow in DND: [x]

  [Messages]
    Notifications: On
    Sound: Ding [Change]
    Alert Style: [Banner]
    Preview: [When Unlocked]
    Group: [By Contact]

  [Divine Chat]
    Notifications: On
    Sound: Divine Chime [Change]
    Alert Style: [Banner]
    Allow in DND: [x] (gods wait for no one)

  [Family Chat]
    Notifications: On
    ...

---

[Blocked Contacts]
  Gareth the Mad    [Unblock]
  Suspicious Trader [Unblock]
  + Block Contact...
```

## UI: Per-Conversation Settings

Long-press or swipe on a conversation shows:

```
[Athena]
  [x] Mute
      ( ) 1 hour
      ( ) 8 hours
      ( ) 1 day
      (x) Forever

  Custom Sound: [Divine Whisper]
  [x] Pin to Top
  [ ] Archive

  [Block Athena]  <- Opens confirmation
```

## Blocking Flow

```typescript
function blockContact(
  phone: PhoneNotificationSettings,
  contactId: string,
  contactName: string,
  options: {
    blockCalls?: boolean;
    blockMessages?: boolean;
    blockInChatRooms?: boolean;
    report?: boolean;
    reason?: string;
  }
): void {
  phone.blockedContacts.set(contactId, {
    contactId,
    contactName,
    blockedAt: currentTick,
    blockedReason: options.reason,
    blockCalls: options.blockCalls ?? true,
    blockMessages: options.blockMessages ?? true,
    blockInChatRooms: options.blockInChatRooms ?? false,
    reported: options.report ?? false,
  });

  // Remove from starred if present
  phone.starredContacts.delete(contactId);

  // Emit event
  world.eventBus.emit({
    type: 'phone:contact_blocked',
    source: 'phone_settings',
    data: { contactId, contactName, reason: options.reason },
  });
}
```

## LLM Conversation Integration

### Call Types and Prompt Styles

```typescript
type CallType = 'voice' | 'video' | 'meeting' | 'emergency';

interface PhoneConversationContext {
  callType: CallType;
  caller: {
    id: string;
    name: string;
    relationship: Relationship | null;
    recentInteractions: EpisodicMemory[];
  };
  receiver: {
    id: string;
    name: string;
    currentBehavior: string;
    mood: MoodState;
    needs: NeedsComponent;
  };
  // For meetings
  meetingAgenda?: string;
  meetingParticipants?: string[];

  // Conversation history (this call)
  conversationHistory: Array<{
    speaker: 'caller' | 'receiver';
    message: string;
    tick: number;
  }>;
}
```

### Phone Conversation Prompt Template

```typescript
function buildPhoneConversationPrompt(context: PhoneConversationContext): string {
  const { callType, caller, receiver, conversationHistory } = context;

  let prompt = `You are ${receiver.name}, currently ${receiver.currentBehavior}.
You are on a ${callType} call with ${caller.name}.

Your relationship with ${caller.name}: ${describeRelationship(caller.relationship)}

Your current state:
- Mood: ${receiver.mood.dominant}
- Energy: ${receiver.needs.energy}%
- Hunger: ${receiver.needs.hunger}%

`;

  if (callType === 'meeting') {
    prompt += `This is a meeting call.
Agenda: ${context.meetingAgenda || 'General discussion'}
Participants: ${context.meetingParticipants?.join(', ') || 'Just you two'}

`;
  }

  if (conversationHistory.length > 0) {
    prompt += `Conversation so far:\n`;
    for (const msg of conversationHistory.slice(-10)) {
      const speaker = msg.speaker === 'caller' ? caller.name : 'You';
      prompt += `${speaker}: ${msg.message}\n`;
    }
  }

  prompt += `
Respond naturally as ${receiver.name} would on the phone. Keep it conversational.
If you need to end the call, say goodbye naturally.

Your response:`;

  return prompt;
}
```

### PhoneConversationSystem

```typescript
export class PhoneConversationSystem implements System {
  readonly id = 'phone_conversation_system';
  readonly priority = 150; // After AgentBrainSystem

  private llmQueue: LLMQueue;
  private activeConversations: Map<string, PhoneConversationContext> = new Map();

  constructor(llmQueue: LLMQueue) {
    this.llmQueue = llmQueue;
  }

  update(world: World, entities: Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const phoneComp = entity.getComponent('cross_realm_phone');
      if (!phoneComp?.activeCall) continue;

      // Check if we need to generate a response
      const convContext = this.activeConversations.get(entity.id);
      if (!convContext) {
        // New call - initialize context
        this.initializeConversation(world, entity, phoneComp.activeCall);
        continue;
      }

      // Check if it's our turn to speak
      if (this.isOurTurnToSpeak(convContext)) {
        this.generateResponse(world, entity, convContext);
      }
    }

    // Clean up ended calls
    this.cleanupEndedCalls(world);
  }

  private async generateResponse(
    world: World,
    entity: Entity,
    context: PhoneConversationContext
  ): Promise<void> {
    const prompt = buildPhoneConversationPrompt(context);

    const response = await this.llmQueue.enqueue({
      entityId: entity.id,
      prompt,
      type: 'phone_conversation',
      priority: 'high',
    });

    if (response.success) {
      // Add to conversation history
      context.conversationHistory.push({
        speaker: 'receiver',
        message: response.text,
        tick: Number(world.tick),
      });

      // Emit event for UI/audio
      world.eventBus.emit({
        type: 'phone:message_spoken',
        source: this.id,
        data: {
          callId: context.callId,
          speakerId: entity.id,
          speakerName: context.receiver.name,
          message: response.text,
        },
      });

      // Check if call should end
      if (this.shouldEndCall(response.text)) {
        this.endCall(world, entity, context);
      }
    }
  }

  private shouldEndCall(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const goodbyePhrases = [
      'goodbye', 'bye', 'talk later', 'gotta go',
      'have to go', 'need to go', 'hanging up',
    ];
    return goodbyePhrases.some(phrase => lowerMessage.includes(phrase));
  }
}
```

## Events

```typescript
// Phone notification events
'phone:ringing': {
  entityId: string;
  callerId: string;
  callerName: string;
  callType: CallType;
  ringMode: 'ring' | 'vibrate' | 'silent';
};

'phone:answered': {
  entityId: string;
  callId: string;
  callType: CallType;
};

'phone:message_spoken': {
  callId: string;
  speakerId: string;
  speakerName: string;
  message: string;
};

'phone:call_ended': {
  callId: string;
  duration: number;
  reason: 'hangup' | 'dropped' | 'no_answer';
};

'phone:notification_settings_changed': {
  entityId: string;
  setting: keyof PhoneNotificationSettings;
  oldValue: any;
  newValue: any;
};
```

## Behavior Integration

### AnswerPhoneAction

```typescript
class AnswerPhoneAction implements Action {
  readonly type = 'answer_phone';
  readonly duration = 20; // 1 second to answer

  execute(world: World, entity: Entity): ActionResult {
    const phoneComp = entity.getComponent('cross_realm_phone');
    if (!phoneComp?.incomingCall) {
      return { success: false, reason: 'No incoming call' };
    }

    // Check notification settings
    const settings = phoneComp.notificationSettings;
    if (settings.dndSchedule.enabled && this.isDNDActive(world, settings)) {
      // Check if caller is VIP
      const callerOverride = settings.contactOverrides.get(
        phoneComp.incomingCall.from.deviceId
      );
      if (!callerOverride?.allowDuringDND) {
        return { success: false, reason: 'Do not disturb active' };
      }
    }

    // Answer the call
    phoneComp.activeCall = phoneComp.incomingCall;
    phoneComp.incomingCall = null;
    phoneComp.activeCall.status = 'connected';

    world.eventBus.emit({
      type: 'phone:answered',
      source: this.type,
      data: {
        entityId: entity.id,
        callId: phoneComp.activeCall.id,
        callType: phoneComp.activeCall.type,
      },
    });

    return { success: true };
  }
}
```

### Phone Conversation Behavior

```typescript
class PhoneConversationBehavior implements Behavior {
  readonly type = 'phone_conversation';
  readonly priority = 80; // High priority - don't interrupt

  shouldActivate(entity: Entity): boolean {
    const phoneComp = entity.getComponent('cross_realm_phone');
    return phoneComp?.activeCall?.status === 'connected';
  }

  getNextAction(world: World, entity: Entity): Action | null {
    const phoneComp = entity.getComponent('cross_realm_phone');
    if (!phoneComp?.activeCall) {
      return null; // Behavior should deactivate
    }

    // The PhoneConversationSystem handles LLM generation
    // This behavior just keeps the agent in "on phone" state
    return new WaitForPhoneResponseAction();
  }

  shouldDeactivate(entity: Entity): boolean {
    const phoneComp = entity.getComponent('cross_realm_phone');
    return !phoneComp?.activeCall;
  }
}
```

## UI Integration

### Notification Toggle Panel

The player can access phone settings through a context menu or phone UI:

```
[Phone Settings]
  Ring Mode: [Ring] [Vibrate] [Silent]

  Do Not Disturb:
    [x] Enabled
    Schedule: 10 PM - 7 AM
    [x] Allow repeat callers

  Interruptions:
    When busy: [Always] [Idle Only] [Never]
    Min priority: [Low] [Normal] [High] [Urgent]

  Auto-Answer:
    [ ] Enabled
    [x] Trusted contacts only
    After rings: [3]

  [VIP Contacts]
    - Athena (always ring, bypass DND)
    - Family members (vibrate)
```

## Implementation Files

1. `components/CrossRealmPhoneComponent.ts` - Add notificationSettings field
2. `systems/PhoneConversationSystem.ts` - New system for LLM integration
3. `actions/AnswerPhoneAction.ts` - Action to answer calls
4. `behaviors/PhoneConversationBehavior.ts` - Behavior during calls
5. `events/EventMap.ts` - Add phone events
6. `communication/CrossRealmCommunication.ts` - Update call types

## Example Scenario

```
Tick 10000: Athena calls Nikolas (meeting call about research)

RING! Nikolas's phone rings (his settings: ring mode, volume 70)
- Nikolas is currently in 'building' behavior
- His settings allow 'all' interruptions for 'normal' priority
- 20 tick delay before auto-answer check

Tick 10020: Nikolas answers
- PhoneConversationBehavior activates
- PhoneConversationSystem initializes context

Tick 10025: LLM generates Nikolas's greeting
"Hello? Oh, Athena! What's on the agenda for today?"

Tick 10030: Athena (caller) speaks
"I wanted to discuss your latest bellows design..."

Tick 10035: LLM generates Nikolas's response
"Ah yes! I've been experimenting with the air flow..."

... conversation continues ...

Tick 10200: Natural goodbye detected
"Well, thanks for the feedback. Talk soon!"

Call ends, PhoneConversationBehavior deactivates
Nikolas returns to 'building' behavior
```

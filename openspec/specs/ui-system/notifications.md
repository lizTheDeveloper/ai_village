# Notification System - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The notification system provides timely, contextual feedback to players about events in the game world. It manages toast notifications, persistent alerts, notification history, and integrates with sound and visual effects to keep players informed without overwhelming them.

---

## Requirements

### REQ-NOTIF-001: Notification Types

The system SHALL support multiple notification categories.

```typescript
interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;

  // Content
  title: string;
  message: string;
  icon?: string;

  // Timing
  timestamp: GameTime;
  realTimestamp: number;           // Real-world ms
  duration: number;                // How long to display (ms)
  expiresAt?: GameTime;            // When notification becomes irrelevant

  // Interaction
  actionable: boolean;
  actions?: NotificationAction[];
  dismissable: boolean;
  autoClose: boolean;

  // Context
  relatedEntityId?: string;        // Jump to this entity
  relatedPosition?: Position;      // Jump to this location
  sourceSystem: string;            // Which system generated this

  // State
  read: boolean;
  dismissed: boolean;
  pinned: boolean;
}

type NotificationType =
  // Agent-related
  | "needs_warning"                // Hunger/thirst/energy low
  | "needs_critical"               // About to die
  | "health_warning"               // Taking damage, injured
  | "death"                        // Agent died
  | "birth"                        // New agent born
  | "level_up"                     // Skill or level increase
  | "skill_learned"                // New skill acquired

  // Social
  | "conversation_request"         // Someone wants to talk
  | "relationship_change"          // Friendship/rivalry formed
  | "gift_received"                // Someone gave you something
  | "reputation_change"            // Village reputation changed

  // Economy
  | "trade_offer"                  // Incoming trade request
  | "trade_complete"               // Trade finished
  | "item_received"                // Got an item
  | "currency_change"              // Money gained/lost

  // Building & Construction
  | "building_complete"            // Construction finished
  | "building_damaged"             // Structure taking damage
  | "building_destroyed"           // Structure destroyed
  | "resource_depleted"            // Mine/field exhausted

  // Research & Progression
  | "research_complete"            // New tech unlocked
  | "discovery"                    // Found something new
  | "achievement"                  // Achievement unlocked
  | "quest_update"                 // Quest progress/complete

  // World Events
  | "season_change"                // Season transition
  | "weather_warning"              // Dangerous weather incoming
  | "visitor_arrival"              // Merchant, traveler arrived
  | "event_starting"               // Festival, event beginning
  | "danger_alert"                 // Threat detected

  // System
  | "autosave"                     // Game saved
  | "tutorial_hint"                // Tutorial guidance
  | "system_message";              // General system info

type NotificationPriority =
  | "critical"                     // Red, sound, persists, shakes
  | "high"                         // Orange, sound, lingers
  | "normal"                       // White, brief sound
  | "low"                          // Gray, no sound, quick fade
  | "ambient";                     // Very subtle, barely visible

type NotificationCategory =
  | "agent"
  | "social"
  | "economy"
  | "building"
  | "research"
  | "world"
  | "system";
```

### REQ-NOTIF-002: Toast Notifications

Transient notifications SHALL appear as toasts.

```typescript
interface ToastNotification extends Notification {
  // Display
  position: ToastPosition;
  animation: ToastAnimation;

  // Queue management
  queuePosition: number;
  stackBehavior: StackBehavior;
}

type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

type ToastAnimation =
  | "slide-in"
  | "fade-in"
  | "pop"
  | "bounce";

type StackBehavior =
  | "stack"                        // Show multiple toasts stacked
  | "queue"                        // Show one at a time
  | "replace"                      // New replaces old
  | "collapse";                    // Collapse similar notifications

interface ToastQueue {
  maxVisible: number;              // Max simultaneous toasts (e.g., 5)
  spacing: number;                 // Pixels between toasts
  queueLimit: number;              // Max pending toasts

  toasts: ToastNotification[];
  pendingQueue: Notification[];

  add(notification: Notification): void;
  dismiss(id: string): void;
  dismissAll(): void;
  pauseOnHover: boolean;
}
```

**Toast Layout:**
```
┌────────────────────────────────────────────┐
│                                            │
│                    [Top-Right Toast Area]  │
│                    ┌──────────────────────┐│
│                    │ 🔔 Building Complete ││
│                    │ Farmhouse is ready!  ││
│                    │ [View] [Dismiss]  5s ││
│                    └──────────────────────┘│
│                    ┌──────────────────────┐│
│                    │ 🌾 Harvest Ready     ││
│                    │ Wheat field ripe     ││
│                    │              [Go] 12s││
│                    └──────────────────────┘│
│                    ┌──────────────────────┐│
│                    │ 💬 Agent B wants to  ││
│                    │    talk to you       ││
│                    │ [Accept] [Ignore]    ││
│                    └──────────────────────┘│
│                                            │
│          [Game World]                      │
│                                            │
└────────────────────────────────────────────┘
```

### REQ-NOTIF-003: Priority Styling

Notifications SHALL be styled by priority.

```typescript
interface PriorityStyle {
  priority: NotificationPriority;

  // Colors
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;

  // Effects
  sound?: string;
  screenEffect?: ScreenEffect;
  vibration?: boolean;             // Controller/mobile

  // Timing
  defaultDuration: number;         // ms
  minimumDuration: number;         // Can't dismiss before this

  // Behavior
  pauseGame: boolean;              // Force pause on critical
  requireAcknowledge: boolean;     // Must click to dismiss
  repeatSound: boolean;            // Keep playing until acknowledged
}

type ScreenEffect =
  | "none"
  | "border_flash"
  | "screen_shake"
  | "vignette_pulse"
  | "desaturate";

const priorityStyles: Map<NotificationPriority, PriorityStyle> = new Map([
  ["critical", {
    priority: "critical",
    backgroundColor: "#7f1d1d",
    borderColor: "#ef4444",
    textColor: "#ffffff",
    iconColor: "#fca5a5",
    sound: "alert_critical.wav",
    screenEffect: "border_flash",
    vibration: true,
    defaultDuration: 0,            // Persists until dismissed
    minimumDuration: 2000,
    pauseGame: false,
    requireAcknowledge: true,
    repeatSound: true,
  }],
  ["high", {
    priority: "high",
    backgroundColor: "#78350f",
    borderColor: "#f59e0b",
    textColor: "#ffffff",
    iconColor: "#fcd34d",
    sound: "alert_high.wav",
    screenEffect: "none",
    vibration: false,
    defaultDuration: 8000,
    minimumDuration: 1000,
    pauseGame: false,
    requireAcknowledge: false,
    repeatSound: false,
  }],
  ["normal", {
    priority: "normal",
    backgroundColor: "#1e293b",
    borderColor: "#475569",
    textColor: "#f1f5f9",
    iconColor: "#94a3b8",
    sound: "notification.wav",
    screenEffect: "none",
    vibration: false,
    defaultDuration: 5000,
    minimumDuration: 500,
    pauseGame: false,
    requireAcknowledge: false,
    repeatSound: false,
  }],
  ["low", {
    priority: "low",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    textColor: "#94a3b8",
    iconColor: "#64748b",
    sound: undefined,
    screenEffect: "none",
    vibration: false,
    defaultDuration: 3000,
    minimumDuration: 0,
    pauseGame: false,
    requireAcknowledge: false,
    repeatSound: false,
  }],
  ["ambient", {
    priority: "ambient",
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderColor: "transparent",
    textColor: "#64748b",
    iconColor: "#475569",
    sound: undefined,
    screenEffect: "none",
    vibration: false,
    defaultDuration: 2000,
    minimumDuration: 0,
    pauseGame: false,
    requireAcknowledge: false,
    repeatSound: false,
  }],
]);
```

**Priority Visual Examples:**
```
CRITICAL (red, persists):
┌─────────────────────────────────┐
│ ⚠️ CRITICAL: Agent Starving!    │  ← Red background, pulsing border
│ Wanderer's hunger is critical.  │
│ They will die without food!     │
│                                 │
│    [Go to Agent] [Acknowledge]  │
└─────────────────────────────────┘

HIGH (orange, 8s):
┌─────────────────────────────────┐
│ ⚡ Energy Low                    │  ← Orange accent
│ Your energy is below 20%.       │
│ Consider resting soon.      8s  │
└─────────────────────────────────┘

NORMAL (neutral, 5s):
┌─────────────────────────────────┐
│ 🏠 Building Complete            │  ← Standard style
│ The farmhouse is ready.     5s  │
│              [View]             │
└─────────────────────────────────┘

LOW (subtle, 3s):
┌─────────────────────────────────┐
│ 🌾 Gathered 12 wheat        3s  │  ← Dimmed, compact
└─────────────────────────────────┘

AMBIENT (barely visible, 2s):
┌─────────────────────────────────┐
│ Autosaved                   2s  │  ← Very faded
└─────────────────────────────────┘
```

### REQ-NOTIF-004: Notification Actions

Notifications MAY have interactive actions.

```typescript
interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  style: ActionStyle;

  // Behavior
  action: ActionType;
  payload?: unknown;

  // Dismissal
  dismissOnClick: boolean;
}

type ActionStyle = "primary" | "secondary" | "danger" | "subtle";

type ActionType =
  | { type: "go_to_entity"; entityId: string }
  | { type: "go_to_position"; position: Position }
  | { type: "open_panel"; panel: string }
  | { type: "accept_request"; requestId: string }
  | { type: "decline_request"; requestId: string }
  | { type: "execute_command"; command: string }
  | { type: "dismiss" }
  | { type: "custom"; handler: () => void };
```

**Action Button Examples:**
```
Trade Request:
┌─────────────────────────────────┐
│ 💰 Trade Offer from Merchant    │
│ Offering 50 coins for 10 wheat  │
│                                 │
│  [Accept] [Decline] [View]      │
│     ▲        ▲         ▲        │
│  Primary  Danger   Secondary    │
└─────────────────────────────────┘

Conversation Request:
┌─────────────────────────────────┐
│ 💬 Agent B wants to talk        │
│                                 │
│   [Talk] [Later] [Ignore]       │
└─────────────────────────────────┘

Discovery:
┌─────────────────────────────────┐
│ ✨ New Area Discovered!         │
│ You found the Ancient Ruins     │
│                                 │
│      [Go There] [Mark Map]      │
└─────────────────────────────────┘
```

### REQ-NOTIF-005: Notification Collapsing

Similar notifications SHALL be collapsed.

```typescript
interface NotificationCollapsing {
  // Group similar notifications
  groupByType: boolean;
  groupBySource: boolean;
  collapseThreshold: number;       // After N similar, collapse

  // Collapsed display
  showCount: boolean;
  showLatest: boolean;
  expandOnHover: boolean;
}
```

**Collapsed Notifications:**
```
Before collapsing (3 similar):
┌──────────────────────┐
│ 🌾 Gathered 5 wheat  │
└──────────────────────┘
┌──────────────────────┐
│ 🌾 Gathered 8 wheat  │
└──────────────────────┘
┌──────────────────────┐
│ 🌾 Gathered 3 wheat  │
└──────────────────────┘

After collapsing:
┌──────────────────────┐
│ 🌾 Gathered wheat ×3 │
│    (16 total)        │
│         [Expand ▼]   │
└──────────────────────┘
```

### REQ-NOTIF-006: Notification History Log

All notifications SHALL be logged and viewable.

```typescript
interface NotificationLog {
  // Storage
  notifications: Notification[];
  maxHistory: number;              // Keep last N notifications
  retentionDays: number;           // Auto-delete after N game days

  // Filtering
  filterByCategory: NotificationCategory | "all";
  filterByPriority: NotificationPriority | "all";
  filterByRead: "read" | "unread" | "all";
  searchQuery: string;

  // Grouping
  groupByDay: boolean;
  groupByCategory: boolean;

  // Actions
  markAllRead(): void;
  deleteRead(): void;
  exportLog(): string;
}
```

**Notification Log Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION LOG                                     [X]   │
├─────────────────────────────────────────────────────────────┤
│  [All ▼] [All Priorities ▼] [Unread ▼]  🔍 Search...       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ── Today ─────────────────────────────────────────────     │
│                                                             │
│  ● 2:30 PM  🏠 Building Complete                           │
│             Farmhouse construction finished                 │
│             [Go to Building]                                │
│                                                             │
│  ● 1:45 PM  💬 Conversation with Agent B                   │
│             "Thanks for the directions!"                    │
│             [View Full Conversation]                        │
│                                                             │
│  ○ 12:00 PM 🌅 Season Changed                              │
│             It is now Summer, Year 1                        │
│                                                             │
│  ○ 11:30 AM 🌾 Harvest Complete                            │
│             Gathered 64 wheat from north field              │
│                                                             │
│  ── Yesterday ─────────────────────────────────────────     │
│                                                             │
│  ○ 8:00 PM  🔬 Research Complete                           │
│             Unlocked: Advanced Farming                      │
│             [View Tech Tree]                                │
│                                                             │
│  ○ 3:15 PM  🎉 Achievement Unlocked                        │
│             "First Harvest" - Harvest your first crop       │
│                                                             │
│  ● = Unread    ○ = Read                                     │
│                                                             │
│  [Mark All Read] [Clear Read]                    Page 1/3   │
└─────────────────────────────────────────────────────────────┘
```

### REQ-NOTIF-007: Persistent Alerts

Critical ongoing situations SHALL show persistent alerts.

```typescript
interface PersistentAlert {
  id: string;
  type: AlertType;
  priority: "critical" | "warning";

  // Content
  icon: string;
  shortText: string;               // For compact display
  fullText: string;                // On hover

  // Behavior
  showInHUD: boolean;
  position: "top-bar" | "bottom-bar" | "side-panel";
  clickAction?: NotificationAction;

  // State
  condition: () => boolean;        // Stays while true
  startTime: GameTime;
}

type AlertType =
  | "starving"
  | "dehydrated"
  | "exhausted"
  | "in_danger"
  | "bleeding"
  | "poisoned"
  | "freezing"
  | "overheating"
  | "low_resources"
  | "building_under_attack";
```

**Persistent Alert Bar:**
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ STARVING │ ❄️ COLD │ ⚔️ UNDER ATTACK                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     [Game World]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Hover on "STARVING":
┌───────────────────────────────┐
│ ⚠️ STARVING                   │
│ Hunger is critically low (5%) │
│ Find food immediately!        │
│ [Find Nearest Food]           │
└───────────────────────────────┘
```

### REQ-NOTIF-008: Sound Integration

Notifications SHALL play appropriate sounds.

```typescript
interface NotificationSounds {
  // Sound mappings
  sounds: Map<NotificationType, SoundConfig>;

  // Volume
  masterVolume: number;
  categoryVolumes: Map<NotificationCategory, number>;

  // Settings
  mutedCategories: Set<NotificationCategory>;
  muteWhilePaused: boolean;
  muteInBackground: boolean;

  // Rate limiting
  minSoundInterval: number;        // Don't spam sounds
  soundQueue: SoundQueue;
}

interface SoundConfig {
  soundFile: string;
  volume: number;                  // 0-1
  pitch?: number;                  // Pitch variation
  loop?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}
```

### REQ-NOTIF-009: Notification Preferences

Players SHALL configure notification behavior.

```typescript
interface NotificationSettings {
  // Global
  enabled: boolean;
  volume: number;
  position: ToastPosition;

  // Per category
  categorySettings: Map<NotificationCategory, CategorySettings>;

  // Per priority
  prioritySettings: Map<NotificationPriority, PrioritySettings>;

  // Filters
  blockedTypes: Set<NotificationType>;
  mutedEntities: Set<string>;      // Don't notify about these entities

  // Timing
  toastDuration: number;           // Multiplier (0.5x - 2x)
  maxSimultaneous: number;

  // Display
  compactMode: boolean;
  showTimestamps: boolean;
  groupSimilar: boolean;
}

interface CategorySettings {
  enabled: boolean;
  sound: boolean;
  toast: boolean;
  log: boolean;
  priority: NotificationPriority;  // Override priority
}

interface PrioritySettings {
  enabled: boolean;
  sound: boolean;
  screenEffect: boolean;
  pauseGame: boolean;
}
```

**Settings Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION SETTINGS                                [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GENERAL                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Enable Notifications     [====●====]  ON            │    │
│  │ Notification Volume      [====●====]  80%           │    │
│  │ Toast Position           [Top-Right        ▼]       │    │
│  │ Max Simultaneous         [5               ▼]        │    │
│  │ Duration Multiplier      [====●====]  1.0x          │    │
│  │ Compact Mode             [ ]                        │    │
│  │ Group Similar            [✓]                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  CATEGORY SETTINGS                                          │
│  ┌──────────────┬────────┬───────┬───────┬───────┐         │
│  │ Category     │ Enable │ Sound │ Toast │ Log   │         │
│  ├──────────────┼────────┼───────┼───────┼───────┤         │
│  │ Agent        │  [✓]   │  [✓]  │  [✓]  │ [✓]   │         │
│  │ Social       │  [✓]   │  [✓]  │  [✓]  │ [✓]   │         │
│  │ Economy      │  [✓]   │  [✓]  │  [✓]  │ [✓]   │         │
│  │ Building     │  [✓]   │  [✓]  │  [✓]  │ [✓]   │         │
│  │ Research     │  [✓]   │  [✓]  │  [✓]  │ [✓]   │         │
│  │ World        │  [✓]   │  [ ]  │  [✓]  │ [✓]   │         │
│  │ System       │  [✓]   │  [ ]  │  [✓]  │ [✓]   │         │
│  └──────────────┴────────┴───────┴───────┴───────┘         │
│                                                             │
│  PRIORITY SETTINGS                                          │
│  ┌──────────────┬────────┬────────┬────────────┐           │
│  │ Priority     │ Sound  │ Effect │ Pause Game │           │
│  ├──────────────┼────────┼────────┼────────────┤           │
│  │ Critical     │  [✓]   │  [✓]   │   [ ]      │           │
│  │ High         │  [✓]   │  [ ]   │   [ ]      │           │
│  │ Normal       │  [✓]   │  [ ]   │   [ ]      │           │
│  │ Low          │  [ ]   │  [ ]   │   [ ]      │           │
│  │ Ambient      │  [ ]   │  [ ]   │   [ ]      │           │
│  └──────────────┴────────┴────────┴────────────┘           │
│                                                             │
│                    [Reset to Defaults] [Apply]              │
└─────────────────────────────────────────────────────────────┘
```

---

## Special Notification Types

### REQ-NOTIF-010: Achievement Notifications

Achievements SHALL have special presentation.

```
┌─────────────────────────────────────────┐
│                ✨ ACHIEVEMENT ✨         │
│  ┌─────────────────────────────────┐    │
│  │         🏆                      │    │
│  │    FIRST HARVEST               │    │
│  │                                 │    │
│  │  "Harvest your first crop"     │    │
│  │                                 │    │
│  │      ━━━━━━━━━━━━━━━           │    │
│  │      +50 XP  +10 Coins         │    │
│  └─────────────────────────────────┘    │
│                                         │
│         [View Achievements]             │
└─────────────────────────────────────────┘
```

### REQ-NOTIF-011: Death Notifications

Agent deaths SHALL be prominently shown.

```
┌─────────────────────────────────────────┐
│           💀 AGENT DIED 💀              │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │        [Agent Portrait]         │    │
│  │                                 │    │
│  │          FARMER JOE             │    │
│  │         Age: 45 years           │    │
│  │                                 │    │
│  │    Cause: Starvation            │    │
│  │    Location: North Field        │    │
│  │                                 │    │
│  │  Survived by: 3 relationships   │    │
│  │  Achievements: 12               │    │
│  │  Buildings built: 5             │    │
│  └─────────────────────────────────┘    │
│                                         │
│    [View Memorial] [Acknowledge]        │
└─────────────────────────────────────────┘
```

### REQ-NOTIF-012: Event Announcements

Major world events SHALL have special banners.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                   🎉 HARVEST FESTIVAL 🎉
                     Begins at Sundown

         Join the celebration in the village square!
              Food, music, and merriment await.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                       [Dismiss]
```

---

## Integration

### REQ-NOTIF-013: System Integration

```typescript
interface NotificationSystem {
  // Core
  notify(notification: Omit<Notification, "id" | "timestamp">): string;
  dismiss(id: string): void;
  dismissAll(): void;

  // Querying
  getActive(): Notification[];
  getHistory(filter?: NotificationFilter): Notification[];
  getUnreadCount(): number;

  // Alerts
  setAlert(alert: PersistentAlert): void;
  clearAlert(id: string): void;
  getActiveAlerts(): PersistentAlert[];

  // Settings
  getSettings(): NotificationSettings;
  updateSettings(settings: Partial<NotificationSettings>): void;

  // Events
  onNotification: Event<Notification>;
  onDismiss: Event<string>;
  onAlertChange: Event<PersistentAlert[]>;
}

// Usage from other systems:
notificationSystem.notify({
  type: "building_complete",
  priority: "normal",
  category: "building",
  title: "Building Complete",
  message: "The farmhouse is ready for use!",
  icon: "🏠",
  relatedEntityId: farmhouseId,
  actions: [
    { id: "view", label: "View", action: { type: "go_to_entity", entityId: farmhouseId } }
  ],
});
```

---

## Open Questions

1. Do-not-disturb mode during certain activities?
2. Notification sounds for different agent personalities?
3. Notification queuing during time skip (show summary after)?
4. Push notifications for mobile/browser when tabbed out?
5. Notification templates for common messages?
6. Rich notifications with embedded images/previews?

---

## Related Specs

**Core Integration:**
- `rendering-system/spec.md` - UI rendering
- `player-system/spec.md` - Player feedback

**Event Sources:**
- `agent-system/needs.md` - Need warnings
- `agent-system/lifecycle-system.md` - Birth/death events
- `construction-system/spec.md` - Building events
- `research-system/spec.md` - Research completion
- `economy-system/spec.md` - Trade notifications

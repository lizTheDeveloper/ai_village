# Time Controls UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The time controls UI allows players to manage the flow of game time, including pausing, adjusting simulation speed, and skipping through time periods. It displays current game time, date, season, and provides feedback during time manipulation.

---

## Requirements

### REQ-TIME-001: Time Display

The HUD SHALL display current game time information.

```typescript
interface TimeDisplay {
  // Current time
  hour: number;                    // 0-23
  minute: number;                  // 0-59
  period: "AM" | "PM";             // 12-hour display
  is24Hour: boolean;               // User preference

  // Current date
  day: number;                     // Day of season (1-28)
  dayOfWeek: DayOfWeek;
  season: Season;
  year: number;

  // Display format
  format: TimeDisplayFormat;

  // Visual indicators
  dayNightIcon: string;            // Sun/moon based on time
  seasonIcon: string;              // Season indicator
  weatherIcon?: string;            // Current weather
}

type Season = "spring" | "summer" | "autumn" | "winter";
type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
type TimeDisplayFormat = "compact" | "normal" | "detailed";
```

**Time Display Formats:**
```
COMPACT (minimal HUD):
┌──────────────┐
│ ☀️ 2:30 PM   │
└──────────────┘

NORMAL (standard HUD):
┌─────────────────────────────┐
│ ☀️ 2:30 PM · Spring Day 15  │
└─────────────────────────────┘

DETAILED (expanded):
┌─────────────────────────────────────┐
│ ☀️ 2:30 PM                          │
│ Wednesday, Spring 15, Year 2        │
│ 🌤️ Partly Cloudy · 72°F            │
└─────────────────────────────────────┘
```

### REQ-TIME-002: Day/Night Indicator

The UI SHALL show the current time of day visually.

```typescript
interface DayNightIndicator {
  // Current phase
  phase: TimeOfDay;
  progress: number;                // 0-1 through current phase

  // Icons
  icons: Map<TimeOfDay, string>;

  // Background tint (optional HUD integration)
  skyColor: string;
  ambientColor: string;

  // Sun/moon position (for arc display)
  celestialPosition: number;       // 0-1 across sky arc
}

type TimeOfDay =
  | "dawn"         // 5:00 - 7:00
  | "morning"      // 7:00 - 12:00
  | "afternoon"    // 12:00 - 17:00
  | "dusk"         // 17:00 - 19:00
  | "evening"      // 19:00 - 22:00
  | "night";       // 22:00 - 5:00
```

**Day/Night Arc Display:**
```
                    ☀️ (noon)
                   ╱    ╲
                 ╱        ╲
               ╱            ╲
             ╱                ╲
           ╱                    ╲
🌅 ─────────────────────────────────── 🌙
Dawn                              Dusk

Current: ───────────●─────────────────
          6am     2:30pm           6pm
```

### REQ-TIME-003: Speed Controls

Players SHALL control simulation speed.

```typescript
interface SpeedControls {
  // Current state
  currentSpeed: GameSpeed;
  isPaused: boolean;

  // Available speeds
  availableSpeeds: GameSpeed[];

  // Controls
  pause(): void;
  resume(): void;
  setSpeed(speed: GameSpeed): void;
  togglePause(): void;
  increaseSpeed(): void;
  decreaseSpeed(): void;

  // Restrictions
  canPause: boolean;               // Some modes restrict pausing
  canChangeSpeed: boolean;
  maxSpeed: GameSpeed;             // May be limited
}

type GameSpeed =
  | "paused"       // 0x - frozen
  | "slow"         // 0.5x - half speed
  | "normal"       // 1x - real-time
  | "fast"         // 2x - double speed
  | "faster"       // 4x - quad speed
  | "fastest";     // 10x - ultra fast

interface SpeedConfig {
  speed: GameSpeed;
  multiplier: number;
  icon: string;
  label: string;
  hotkey: string;
}

const speedConfigs: SpeedConfig[] = [
  { speed: "paused",  multiplier: 0,   icon: "⏸️", label: "Paused",  hotkey: "Space" },
  { speed: "slow",    multiplier: 0.5, icon: "⏪", label: "0.5x",    hotkey: "1" },
  { speed: "normal",  multiplier: 1,   icon: "▶️", label: "1x",      hotkey: "2" },
  { speed: "fast",    multiplier: 2,   icon: "⏩", label: "2x",      hotkey: "3" },
  { speed: "faster",  multiplier: 4,   icon: "⏩⏩", label: "4x",    hotkey: "4" },
  { speed: "fastest", multiplier: 10,  icon: "⚡", label: "10x",     hotkey: "5" },
];
```

**Speed Control Bar:**
```
┌───────────────────────────────────────────────────────┐
│  ⏸️  │  ⏪  │  ▶️  │  ⏩  │  ⏩⏩ │  ⚡  │   [2:30 PM]  │
│ Space│  1  │  2  │  3  │   4  │  5  │                │
│      │     │  ●  │     │      │     │   ← Current    │
└───────────────────────────────────────────────────────┘

Paused State:
┌───────────────────────────────────────────────────────┐
│  ▌▌ PAUSED                    Press SPACE to resume  │
├───────────────────────────────────────────────────────┤
│  ⏸️  │  ⏪  │  ▶️  │  ⏩  │  ⏩⏩ │  ⚡  │   [2:30 PM]  │
│  ●  │     │     │     │      │     │                │
└───────────────────────────────────────────────────────┘
```

### REQ-TIME-004: Pause Overlay

Pausing SHALL show a clear visual indicator.

```typescript
interface PauseOverlay {
  // Display
  showOverlay: boolean;
  overlayStyle: PauseOverlayStyle;

  // Content
  showTimeInfo: boolean;
  showControls: boolean;
  showQuickActions: boolean;

  // Behavior
  dimBackground: boolean;
  dimAmount: number;               // 0-1
  allowCameraMovement: boolean;
  allowUIInteraction: boolean;
}

type PauseOverlayStyle =
  | "minimal"      // Just pause icon
  | "standard"     // Pause + resume hint
  | "full";        // Pause + menu options
```

**Pause Overlay Styles:**
```
MINIMAL:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          ▌▌                                 │
│                                                             │
│                   [Dimmed Game World]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

STANDARD:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     ▌▌ PAUSED                               │
│                                                             │
│                 Press SPACE to resume                       │
│                                                             │
│                   [Dimmed Game World]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

FULL:
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     ▌▌ PAUSED                               │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │   [Resume]              │                    │
│              │   [Save Game]           │                    │
│              │   [Settings]            │                    │
│              │   [Exit to Menu]        │                    │
│              └─────────────────────────┘                    │
│                                                             │
│                   [Dimmed Game World]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-TIME-005: Time Skip

Players SHALL be able to skip forward in time.

```typescript
interface TimeSkip {
  // Skip options
  skipTo: SkipTarget;

  // Conditions
  canSkip: boolean;
  skipBlockedReason?: string;      // Why skip is unavailable

  // Execution
  startSkip(target: SkipTarget): void;
  cancelSkip(): void;

  // Progress
  isSkipping: boolean;
  skipProgress: number;            // 0-1
  timeElapsed: GameTime;
  estimatedRemaining: number;      // Real seconds

  // Events during skip
  significantEvents: SkipEvent[];
  pauseOnEvents: EventType[];
}

type SkipTarget =
  | { type: "hours"; hours: number }
  | { type: "dawn" }
  | { type: "noon" }
  | { type: "dusk" }
  | { type: "midnight" }
  | { type: "next_day" }
  | { type: "days"; days: number }
  | { type: "next_season" }
  | { type: "event"; eventType: string }
  | { type: "condition"; condition: () => boolean };

interface SkipEvent {
  time: GameTime;
  type: EventType;
  summary: string;
  priority: "critical" | "important" | "minor";
  stoppedSkip: boolean;
}

type EventType =
  | "agent_critical"               // Agent in danger
  | "agent_death"
  | "visitor_arrival"
  | "building_complete"
  | "research_complete"
  | "season_change"
  | "major_discovery"
  | "combat_started";
```

**Time Skip Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│  SKIP TIME                                            [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Current: 2:30 PM, Spring Day 15                            │
│                                                             │
│  Skip to:                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [🌅 Dawn]      [☀️ Noon]     [🌆 Dusk]             │    │
│  │                                                     │    │
│  │  [🌙 Midnight]  [📅 Tomorrow] [🗓️ +7 Days]         │    │
│  │                                                     │    │
│  │  [🍂 Next Season]                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── Or skip specific hours ──                               │
│  Hours: [+1] [+2] [+4] [+8] [+12]                           │
│                                                             │
│  ⚠️ Stop if:                                                │
│  [✓] Agent needs critical                                   │
│  [✓] Visitor arrives                                        │
│  [ ] Building completes                                     │
│  [✓] Combat starts                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          [Cancel]  [Skip]                   │
└─────────────────────────────────────────────────────────────┘
```

**Skip Progress Overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ⏩ SKIPPING TIME ⏩                       │
│                                                             │
│               Spring Day 15 → Spring Day 16                 │
│                                                             │
│        ━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━                   │
│                              75%                            │
│                                                             │
│              Time elapsed: 18 hours                         │
│              Events: 3 minor                                │
│                                                             │
│                      [Cancel Skip]                          │
│                                                             │
│   [Accelerated game world simulation running]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-TIME-006: Skip Summary

After a time skip, players SHALL see a summary.

```typescript
interface SkipSummary {
  // Time
  startTime: GameTime;
  endTime: GameTime;
  totalSkipped: string;            // "18 hours" or "3 days"

  // Events grouped by category
  events: Map<EventCategory, SkipEvent[]>;

  // Statistics
  stats: SkipStats;

  // Navigation
  highlightEvent(event: SkipEvent): void;
  goToEvent(event: SkipEvent): void;
}

interface SkipStats {
  agentActionsPerformed: number;
  resourcesGathered: Map<string, number>;
  buildingsCompleted: number;
  conversationsHeld: number;
  needsChanges: Map<string, number>;  // Net change in needs
}
```

**Skip Summary Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│  TIME SKIP COMPLETE                                   [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Skipped: 18 hours (2:30 PM → 8:30 AM next day)             │
│                                                             │
│  ── EVENTS ──────────────────────────────────────────────   │
│                                                             │
│  🏠 Buildings                                               │
│     • Storage Shed completed                                │
│                                                             │
│  🌾 Resources                                               │
│     • Harvested 64 wheat from North Field                   │
│     • Gathered 20 wood                                      │
│                                                             │
│  💬 Social                                                  │
│     • Agent B talked with Agent C (became friends)          │
│     • Merchant arrived at village                           │
│                                                             │
│  ── STATS ────────────────────────────────────────────────  │
│                                                             │
│  Your Agent:                                                │
│     Hunger: 80% → 45% (-35%)                                │
│     Energy: 60% → 90% (+30%, slept)                         │
│                                                             │
│  Village:                                                   │
│     Resources gathered: +84                                 │
│     Buildings completed: 1                                  │
│     Conversations: 12                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                               [View Details]  [Continue]    │
└─────────────────────────────────────────────────────────────┘
```

### REQ-TIME-007: Season/Calendar Display

The UI SHALL show calendar and season information.

```typescript
interface CalendarDisplay {
  // Current position
  currentDay: number;
  currentSeason: Season;
  currentYear: number;

  // Season info
  seasonProgress: number;          // 0-1 through season
  daysRemaining: number;           // Until season change

  // Calendar view
  showCalendar: boolean;
  markedDays: CalendarMark[];
}

interface CalendarMark {
  day: number;
  season: Season;
  year: number;
  type: "event" | "holiday" | "deadline" | "reminder";
  label: string;
  icon: string;
}
```

**Season Progress Bar:**
```
┌─────────────────────────────────────────────────────────────┐
│  🌸 SPRING                                      Day 15/28   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━●━━━━━━━━━━━━━                     │
│                         ▲                                   │
│  ← Planting Season →    │    ← Growing Season →             │
│                      Today                                  │
│                                                             │
│  13 days until Summer                                       │
└─────────────────────────────────────────────────────────────┘
```

**Mini Calendar:**
```
┌─────────────────────────────────────────┐
│        🌸 SPRING, YEAR 2                │
├─────────────────────────────────────────┤
│  Mo  Tu  We  Th  Fr  Sa  Su             │
├─────────────────────────────────────────┤
│   1   2   3   4   5   6   7             │
│   8   9  10  11  12  13  14             │
│ [15] 16  17  18  19  20  21  ← Today    │
│  22  23  24* 25  26  27  28             │
│                  ▲                      │
│                  Festival               │
├─────────────────────────────────────────┤
│  * = Event    [15] = Today              │
└─────────────────────────────────────────┘
```

### REQ-TIME-008: Speed Indicator Animation

High speeds SHALL have visual feedback.

```typescript
interface SpeedIndicator {
  // Visual effects at different speeds
  effectsBySpeed: Map<GameSpeed, SpeedEffect>;

  // Animation
  clockAnimation: boolean;
  sunMoonAccelerated: boolean;
  particleStreaks: boolean;
}

interface SpeedEffect {
  clockSpinSpeed: number;          // Visual clock hands
  borderEffect: BorderEffect;
  screenTint?: string;
  particleCount: number;
}

type BorderEffect =
  | "none"
  | "subtle_glow"
  | "pulsing"
  | "streaming";                   // Speed lines
```

**Speed Visual Effects:**
```
NORMAL (1x):
┌─────────────────────────────────────────────────────────────┐
│  [No special effects - normal gameplay]                     │
│                                                             │
│                       ▶️ 1x                                  │
└─────────────────────────────────────────────────────────────┘

FAST (2x):
┌─────────────────────────────────────────────────────────────┐
│  [Subtle blue tint on edges]                                │
│                            ◌ ◌                              │
│                       ⏩ 2x   ↑ clock spinning               │
└─────────────────────────────────────────────────────────────┘

FASTEST (10x):
╔═════════════════════════════════════════════════════════════╗
║>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>║
║                                                             ║
║  [Heavy border animation, speed lines, fast clock]          ║
║                                                             ║
║                       ⚡ 10x                                 ║
║                                                             ║
║<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<║
╚═════════════════════════════════════════════════════════════╝
```

---

## Keyboard Shortcuts

### REQ-TIME-009: Time Hotkeys

```
TIME CONTROLS:
- Space       : Toggle pause
- 1           : Slow speed (0.5x)
- 2           : Normal speed (1x)
- 3           : Fast speed (2x)
- 4           : Faster speed (4x)
- 5           : Fastest speed (10x)
- + / =       : Increase speed one step
- - / _       : Decrease speed one step
- T           : Open time skip dialog
- C           : Open calendar

WHILE PAUSED:
- Escape      : Open pause menu
- Space       : Resume
- Arrow keys  : Step frame-by-frame (debug)
```

---

## HUD Integration

### REQ-TIME-010: Time HUD Widget

```typescript
interface TimeHUDWidget {
  position: HUDPosition;
  size: "compact" | "normal" | "expanded";

  // Components
  showTime: boolean;
  showDate: boolean;
  showSeason: boolean;
  showWeather: boolean;
  showSpeedControls: boolean;

  // Interaction
  clickable: boolean;
  hoverExpands: boolean;
}

type HUDPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
```

**HUD Time Widget:**
```
Top-center of screen:
┌───────────────────────────────────────────────────────────┐
│                                                           │
│        ┌───────────────────────────────────────┐          │
│        │ ☀️ 2:30 PM │ Spring 15 │ ▶️ 1x │ 🌤️  │          │
│        └───────────────────────────────────────┘          │
│                                                           │
│   [Rest of game screen]                                   │
│                                                           │
└───────────────────────────────────────────────────────────┘

Hover-expanded:
        ┌───────────────────────────────────────┐
        │ ☀️ 2:30 PM │ Spring 15 │ ▶️ 1x │ 🌤️  │
        ├───────────────────────────────────────┤
        │ Wednesday, Spring 15, Year 2          │
        │ 🌤️ Partly Cloudy, 72°F               │
        ├───────────────────────────────────────┤
        │ ⏸️ ⏪ ▶️ ⏩ ⏩⏩ ⚡ │ [Skip Time]      │
        └───────────────────────────────────────┘
```

---

## Settings

### REQ-TIME-011: Time Control Settings

```typescript
interface TimeControlSettings {
  // Display
  use24HourClock: boolean;
  showSecondsInPause: boolean;
  timeDisplayFormat: TimeDisplayFormat;

  // Speed
  defaultSpeed: GameSpeed;
  allowMaxSpeed: boolean;
  autoSlowOnEvents: boolean;       // Slow down for important events

  // Skip
  allowTimeSkip: boolean;
  skipStopConditions: EventType[];
  showSkipSummary: boolean;

  // Pause
  pauseOnUnfocus: boolean;         // Pause when window loses focus
  pauseOverlayStyle: PauseOverlayStyle;
  allowPauseInteraction: boolean;

  // Hotkeys
  hotkeyBindings: Map<string, string>;
}
```

---

## Open Questions

1. Frame-by-frame stepping for debugging/screenshots?
2. Time rewind (undo last time period)?
3. Scheduled auto-pause (pause at dawn, pause at event)?
4. Time-locked multiplayer synchronization?
5. Slow-motion mode for combat/action sequences?
6. Seasonal transition cutscenes?

---

## Related Specs

**Core Integration:**
- `game-engine/spec.md` - Game loop and tick system
- `rendering-system/spec.md` - UI rendering
- `player-system/spec.md` - Player mode time restrictions

**Time-Dependent Systems:**
- `farming-system/spec.md` - Crop growth timing
- `agent-system/needs.md` - Need decay over time
- `world-system/spec.md` - Day/night cycle, seasons

# Player Settings UI - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The Player Settings UI provides configuration for controls, display, audio, gameplay preferences, notifications, and accessibility options. This is the central hub for customizing the player experience.

---

## Dependencies

- `player-system/spec.md` - Player modes, controls, notifications
- `game-engine/spec.md` - Performance settings

---

## Requirements

### REQ-SET-001: Settings Panel

Main settings panel with categorized options.

```typescript
// Re-export from player-system/spec for reference
import type {
  PlayerMode, PlayerState,
  ControlScheme, MovementBindings, ActionBindings,
  NotificationSystem, NotificationFilter,
  AgentAutonomySettings,
  TimeControl, GameSpeed,
  TutorialSystem, TutorialStage,
  AwaySimulation,
  PlayerEmbodiment, EmbodimentType
} from "player-system/spec";

interface SettingsPanel {
  isOpen: boolean;
  activeCategory: SettingsCategory;

  // Dirty state
  hasUnsavedChanges: boolean;
  pendingChanges: Map<string, any>;

  // Actions
  save(): void;
  revert(): void;
  resetToDefaults(): void;
}

type SettingsCategory =
  | "controls"
  | "display"
  | "audio"
  | "gameplay"
  | "notifications"
  | "accessibility"
  | "autonomy"
  | "account";
```

**Settings Panel Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ SETTINGS                                                         [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ CATEGORIES    │  CONTROLS                                                   │
│               │  ─────────────────────────────────────────────────────────  │
│ ● Controls    │                                                             │
│ ○ Display     │  CONTROL SCHEME                                             │
│ ○ Audio       │  ┌─────────────────────────────────────────────────────┐   │
│ ○ Gameplay    │  │ ● Keyboard + Mouse                                  │   │
│ ○ Notifications│  │ ○ Keyboard Only                                     │   │
│ ○ Accessibility│  │ ○ Gamepad                                           │   │
│ ○ Autonomy    │  └─────────────────────────────────────────────────────┘   │
│ ○ Account     │                                                             │
│               │  MOVEMENT BINDINGS                                          │
│               │  ─────────────────────────────────────────────────────────  │
│               │  Move Up:        [W] [↑]           [Rebind]                │
│               │  Move Down:      [S] [↓]           [Rebind]                │
│               │  Move Left:      [A] [←]           [Rebind]                │
│               │  Move Right:     [D] [→]           [Rebind]                │
│               │  Interact:       [E] [Space]       [Rebind]                │
│               │  Cancel:         [Esc]             [Rebind]                │
│               │                                                             │
│               │  ☑ Click-to-move enabled                                   │
│               │                                                             │
│               │  CAMERA CONTROLS                                            │
│               │  ─────────────────────────────────────────────────────────  │
│               │  Zoom In:        [+] [Scroll Up]   [Rebind]                │
│               │  Zoom Out:       [-] [Scroll Down] [Rebind]                │
│               │  Pan Camera:     [Middle Drag]     [Rebind]                │
│               │                                                             │
├───────────────┴─────────────────────────────────────────────────────────────┤
│  [Reset to Defaults]                         [Cancel]  [Apply]  [Save]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-002: Controls Settings

Configure input bindings and control scheme.

```typescript
interface ControlsSettings {
  // Control scheme selection
  scheme: ControlScheme;               // From player-system

  // Rebinding
  currentlyRebinding: string | null;
  conflictWarnings: KeyConflict[];

  // Categories
  movementBindings: BindingDisplayList;
  actionBindings: BindingDisplayList;
  cameraBindings: BindingDisplayList;
  menuBindings: BindingDisplayList;

  // Options
  clickToMove: boolean;
  holdToSprint: boolean;
  invertCameraY: boolean;
  cameraSensitivity: number;
}

interface BindingDisplayList {
  bindings: BindingDisplay[];
}

interface BindingDisplay {
  action: string;
  label: string;
  primaryKey: string;
  secondaryKey: string | null;
  isRebinding: boolean;
}

interface KeyConflict {
  key: string;
  actions: string[];
  severity: "warning" | "error";
}
```

**Controls Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CONTROLS SETTINGS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTROL SCHEME                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ● Keyboard + Mouse    Best for precision and UI navigation          │   │
│  │ ○ Keyboard Only       For users without mouse                        │   │
│  │ ○ Gamepad             Controller support with radial menus           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MOVEMENT                                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Action           Primary      Secondary       Status                       │
│  Move Up          [W]          [↑]             ✓                           │
│  Move Down        [S]          [↓]             ✓                           │
│  Move Left        [A]          [←]             ✓                           │
│  Move Right       [D]          [→]             ✓                           │
│  Sprint           [Shift]      -               ✓                           │
│                                                                             │
│  ACTIONS                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Interact         [E]          [Space]         ✓                           │
│  Use Item         [F]          -               ✓                           │
│  Open Inventory   [I]          [Tab]           ✓                           │
│  Open Map         [M]          -               ✓                           │
│  Pause            [Esc]        [P]             ⚠️ Conflict with Cancel     │
│                                                                             │
│  MOUSE OPTIONS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Click-to-move enabled                                                   │
│  ☐ Double-click to run                                                     │
│  Camera Sensitivity: ████████░░░░░░░░░░░░░░ 40%                            │
│  ☐ Invert camera Y-axis                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-003: Display Settings

Configure visual preferences.

```typescript
interface DisplaySettings {
  // Resolution and window
  resolution: Resolution;
  windowMode: "fullscreen" | "windowed" | "borderless";
  vsync: boolean;
  fpsLimit: number | "unlimited";

  // Graphics quality
  overallQuality: "low" | "medium" | "high" | "ultra" | "custom";
  textureQuality: QualityLevel;
  shadowQuality: QualityLevel;
  particleQuality: QualityLevel;
  lightingQuality: QualityLevel;

  // UI scaling
  uiScale: number;                     // 0.75 - 1.5
  fontSize: "small" | "medium" | "large";

  // Pixel art specific
  pixelPerfect: boolean;
  smoothScaling: boolean;
  crtEffect: boolean;
  scanlines: boolean;
  scanlineIntensity: number;

  // Color and brightness
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
}

type QualityLevel = "low" | "medium" | "high" | "ultra";

interface Resolution {
  width: number;
  height: number;
  refreshRate: number;
}
```

**Display Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISPLAY SETTINGS                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WINDOW                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Resolution:     [1920 x 1080 ▼]                                           │
│  Window Mode:    ● Fullscreen  ○ Windowed  ○ Borderless                    │
│  VSync:          ☑ Enabled                                                 │
│  FPS Limit:      [60 ▼]                                                    │
│                                                                             │
│  GRAPHICS QUALITY                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Overall:        [High ▼]                                                   │
│                                                                             │
│  Textures:       ████████████████████ Ultra                                │
│  Shadows:        ████████████████░░░░ High                                 │
│  Particles:      ████████████████░░░░ High                                 │
│  Lighting:       ████████████████░░░░ High                                 │
│                                                                             │
│  UI SCALING                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  UI Scale:       ██████████████░░░░░░ 100%                                 │
│  Font Size:      ○ Small  ● Medium  ○ Large                                │
│                                                                             │
│  PIXEL ART OPTIONS                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Pixel-perfect rendering                                                 │
│  ☐ Smooth scaling (bilinear filter)                                        │
│  ☐ CRT effect                                                              │
│  ☐ Scanlines          Intensity: ░░░░░░░░░░░░░░░░░░░░ 0%                   │
│                                                                             │
│  COLOR CALIBRATION                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Brightness:     ██████████░░░░░░░░░░ 50%                                  │
│  Contrast:       ██████████░░░░░░░░░░ 50%                                  │
│  Saturation:     ██████████░░░░░░░░░░ 50%                                  │
│  Gamma:          ██████████░░░░░░░░░░ 1.0                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-004: Audio Settings

Configure sound preferences.

```typescript
interface AudioSettings {
  // Volume levels
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  voiceVolume: number;
  uiVolume: number;

  // Audio output
  outputDevice: string;
  speakerMode: "stereo" | "surround" | "headphones";

  // Music preferences
  dynamicMusic: boolean;
  musicStyle: "orchestral" | "ambient" | "chiptune";

  // Accessibility
  subtitles: boolean;
  subtitleSize: "small" | "medium" | "large";
  visualSoundCues: boolean;
}
```

**Audio Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AUDIO SETTINGS                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VOLUME                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🔊 Master:      ████████████████░░░░ 80%                                  │
│  🎵 Music:       ████████████░░░░░░░░ 60%                                  │
│  🔫 SFX:         ██████████████████░░ 90%                                  │
│  🌳 Ambient:     ████████████████░░░░ 80%                                  │
│  💬 Voice:       ██████████████████░░ 90%                                  │
│  🖱️ UI:          ██████████░░░░░░░░░░ 50%                                  │
│                                                                             │
│  OUTPUT                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Device:         [Default Audio Device ▼]                                   │
│  Speaker Mode:   ○ Stereo  ○ Surround  ● Headphones                        │
│                                                                             │
│  MUSIC                                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Dynamic music (adapts to gameplay)                                      │
│  Style:          ○ Orchestral  ● Ambient  ○ Chiptune                       │
│                                                                             │
│  ACCESSIBILITY                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Subtitles                   Size: ○ Small  ● Medium  ○ Large           │
│  ☐ Visual sound cues (flashes for important sounds)                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-005: Gameplay Settings

Configure gameplay preferences.

```typescript
interface GameplaySettings {
  // Time control
  defaultGameSpeed: GameSpeed;         // From player-system
  pauseOnFocusLoss: boolean;
  pauseOnMenuOpen: boolean;

  // Tutorial
  tutorialEnabled: boolean;
  currentStage: TutorialStage;         // From player-system
  hintsEnabled: boolean;

  // Difficulty/Assistance
  needsDecayRate: "slow" | "normal" | "fast";
  agentMortalityEnabled: boolean;
  autoSaveInterval: number;            // Minutes

  // Camera
  cameraFollowPlayer: boolean;
  cameraEdgePan: boolean;
  cameraEdgePanSpeed: number;

  // Confirmation dialogs
  confirmOnQuit: boolean;
  confirmOnDestruction: boolean;
  confirmOnTrade: boolean;
}
```

**Gameplay Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GAMEPLAY SETTINGS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME CONTROL                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Default Speed:  ○ Slow  ● Normal  ○ Fast  ○ Ultra                         │
│  ☑ Pause when window loses focus                                           │
│  ☑ Pause when opening menus                                                │
│                                                                             │
│  TUTORIAL & HINTS                                                           │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Tutorial enabled               Current stage: Farming                   │
│  ☑ Show gameplay hints            [Reset Tutorial Progress]                │
│  ☑ Show tooltip hints                                                      │
│                                                                             │
│  DIFFICULTY                                                                 │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Needs Decay:    ○ Slow (relaxed)  ● Normal  ○ Fast (challenging)          │
│  ☑ Agent mortality (agents can die)                                        │
│  ☐ Permadeath for player agent                                             │
│                                                                             │
│  SAVING                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Auto-save:      [Every 5 minutes ▼]                                       │
│  ☑ Save on quit                                                            │
│  Max save slots: [10 ▼]                                                    │
│                                                                             │
│  CAMERA                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Camera follows player agent                                             │
│  ☑ Edge panning in spectator mode                                          │
│  Edge pan speed: ████████████░░░░░░░░ 60%                                  │
│                                                                             │
│  CONFIRMATIONS                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Confirm on quit                                                         │
│  ☑ Confirm building destruction                                            │
│  ☐ Confirm large trades                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-006: Notification Settings

Configure notification preferences.

```typescript
interface NotificationSettings {
  // Global
  notificationsEnabled: boolean;
  notificationSound: boolean;

  // Priority filtering
  showCritical: boolean;               // Always recommended
  showImportant: boolean;
  showInformational: boolean;
  showAmbient: boolean;

  // Type filtering
  typeFilters: Map<NotificationType, boolean>;

  // Positioning
  notificationPosition: "top_right" | "top_left" | "bottom_right" | "bottom_left";
  notificationDuration: number;        // Seconds

  // Mode-specific
  spectatorNotifications: NotificationFilter;
  managementNotifications: NotificationFilter;
  agentNotifications: NotificationFilter;
}
```

**Notification Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION SETTINGS                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GENERAL                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Notifications enabled                                                   │
│  ☑ Play notification sounds                                                │
│  Position:       [Top Right ▼]                                             │
│  Duration:       ████████░░░░░░░░░░░░ 5 seconds                            │
│                                                                             │
│  PRIORITY LEVELS                                                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ 🔴 Critical (starvation, attacks)                                       │
│  ☑ 🟡 Important (social events, trade offers)                              │
│  ☑ ⚪ Informational (building complete, research)                          │
│  ☐ ⬜ Ambient (minor discoveries)                                          │
│                                                                             │
│  NOTIFICATION TYPES                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Needs warnings         ☑ Social events        ☑ Trade offers           │
│  ☑ Building complete      ☑ Research complete    ☑ Special events         │
│  ☑ Agent death           ☑ Agent birth          ☑ Relationship changes    │
│  ☑ Discoveries           ☐ Price changes         ☐ Weather changes        │
│                                                                             │
│  MODE-SPECIFIC                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Agent mode:     ● All  ○ Important+  ○ Critical only                      │
│  Spectator mode: ○ All  ● Important+  ○ Critical only                      │
│  Management:     ○ All  ● Important+  ○ Critical only                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-007: Accessibility Settings

Configure accessibility options.

```typescript
interface AccessibilitySettings {
  // Visual
  highContrast: boolean;
  colorblindMode: ColorblindMode | null;
  reducedMotion: boolean;
  flashingEffects: boolean;
  largeText: boolean;
  textOutlines: boolean;

  // Audio
  screenReader: boolean;
  audioDescriptions: boolean;
  monoAudio: boolean;

  // Input
  stickyKeys: boolean;
  holdAlternatives: boolean;
  cursorSize: "normal" | "large" | "extra_large";

  // Cognitive
  simplifiedUI: boolean;
  extendedTimers: boolean;
  pauseAllowed: boolean;
}

type ColorblindMode =
  | "protanopia"           // Red-blind
  | "deuteranopia"         // Green-blind
  | "tritanopia"           // Blue-blind
  | "achromatopsia";       // Complete colorblindness
```

**Accessibility Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACCESSIBILITY SETTINGS                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  VISUAL                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ High contrast mode                                                      │
│  Colorblind mode:  [None ▼]                                                │
│  ☐ Reduced motion (minimize animations)                                    │
│  ☑ Flashing effects enabled (disable if photosensitive)                    │
│  ☐ Large text mode                                                         │
│  ☐ Text outlines for readability                                           │
│                                                                             │
│  AUDIO                                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Screen reader support                                                   │
│  ☐ Audio descriptions for visual events                                    │
│  ☐ Mono audio (combine stereo channels)                                    │
│                                                                             │
│  INPUT                                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Sticky keys (press key to toggle rather than hold)                      │
│  ☐ Hold alternatives (replace hold actions with toggles)                   │
│  Cursor size:    ● Normal  ○ Large  ○ Extra Large                          │
│                                                                             │
│  COGNITIVE                                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Simplified UI (fewer elements, clearer layout)                          │
│  ☐ Extended timers for timed events                                        │
│  ☑ Game can be paused at any time                                          │
│                                                                             │
│  PRESETS                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [Motor Accessibility]  [Visual Accessibility]  [Cognitive Accessibility]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### REQ-SET-008: Agent Autonomy Settings

Configure what the player's agent can do when uncontrolled.

```typescript
interface AutonomySettingsUI {
  settings: AgentAutonomySettings;     // From player-system

  // Presets
  presets: AutonomyPreset[];
  selectedPreset: string | null;

  // Custom settings
  customSettings: AutonomyCustomSettings;
}

interface AutonomyPreset {
  id: string;
  name: string;
  description: string;
  settings: AgentAutonomySettings;
}

interface AutonomyCustomSettings {
  // Basic needs
  canEat: boolean;
  canDrink: boolean;
  canSleep: boolean;
  canRest: boolean;

  // Work
  canWork: boolean;
  workPriorities: string[];

  // Social
  canSocialize: boolean;
  canStartConversations: boolean;
  canAcceptInvitations: boolean;

  // Trade
  canTrade: boolean;
  maxTradeValue: number;

  // Movement
  stayInArea: boolean;
  allowedArea: Area | null;
  avoidLocations: Position[];
}
```

**Autonomy Settings:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AGENT AUTONOMY SETTINGS                                                    │
│  What can your agent do when you're not controlling them?                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRESETS                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐                  │
│  │ ● SURVIVAL     │ │ ○ WORKER       │ │ ○ SOCIAL       │                  │
│  │ Basic needs    │ │ Needs + work   │ │ Full autonomy  │                  │
│  │ only           │ │ tasks          │ │ except trades  │                  │
│  └────────────────┘ └────────────────┘ └────────────────┘                  │
│                                                                             │
│  BASIC NEEDS                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☑ Can eat when hungry                                                     │
│  ☑ Can drink when thirsty                                                  │
│  ☑ Can sleep when tired                                                    │
│  ☑ Can rest when exhausted                                                 │
│                                                                             │
│  WORK                                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Can perform work tasks                                                  │
│  ☐ Can start new projects                                                  │
│  Priorities: [Farming] [Crafting] [Foraging]           [Edit Priorities]   │
│                                                                             │
│  SOCIAL                                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Can socialize with others                                               │
│  ☐ Can start conversations                                                 │
│  ☐ Can accept event invitations                                            │
│                                                                             │
│  TRADE                                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Can trade with merchants                                                │
│  Max trade value: [50 coins ▼]                                             │
│                                                                             │
│  MOVEMENT                                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ☐ Restrict to area                          [Set Area on Map]             │
│  ☐ Avoid specific locations                  [Set Locations]               │
│                                                                             │
│  ⚠️ Note: If all needs options are disabled, your agent may die while      │
│     you're away.                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

```
SETTINGS PANEL:
- Escape / O     : Open/close settings
- Tab            : Next category
- Shift+Tab      : Previous category
- Enter          : Confirm selection
- R              : Reset to defaults (with confirmation)
- S              : Save and close
```

---

## State Management

### Settings Persistence

```typescript
interface SettingsState {
  // All settings categories
  controls: ControlsSettings;
  display: DisplaySettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  autonomy: AutonomySettingsUI;

  // State
  isOpen: boolean;
  activeCategory: SettingsCategory;
  hasUnsavedChanges: boolean;

  // Actions
  saveSettings(): Promise<void>;
  loadSettings(): Promise<void>;
  resetToDefaults(category?: SettingsCategory): void;

  // Events
  onSettingChanged: Event<{ category: SettingsCategory; key: string; value: any }>;
  onSettingsSaved: Event<void>;
}
```

---

## Open Questions

1. Cloud sync for settings across devices?
2. Profile system for multiple setting presets?
3. Settings export/import for sharing?
4. Per-save settings vs global settings?
5. Settings recommendations based on hardware?

---

## Related Specs

- `player-system/spec.md` - Source system spec
- `game-engine/spec.md` - Performance settings
- `ui-system/notifications.md` - Notification display

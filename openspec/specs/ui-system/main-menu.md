# Main Menu and Settings UI Specification

## Overview

The Main Menu and Settings UI provides the primary navigation for starting games, adjusting options, and managing save files. Includes title screen, pause menu, settings panels, and save/load functionality.

## Version

0.1.0

## Dependencies

- `core/game-loop.md` - Game state management
- `core/save-system.md` - Save/load functionality
- `core/audio.md` - Audio settings

## Requirements

### REQ-MENU-001: Title Screen
- **Description**: Main entry point showing game logo and primary options
- **Priority**: MUST

```typescript
interface TitleScreen {
  // Visual elements
  logo: Sprite;
  background: TitleBackground;
  ambientAnimation: Animation | null;

  // Menu options
  menuOptions: TitleMenuOption[];
  selectedIndex: number;

  // Version display
  versionNumber: string;
  buildInfo: string;

  // Methods
  show(): void;
  hide(): void;
  selectOption(index: number): void;
  confirmSelection(): void;

  // Events
  onMenuSelect: Event<TitleMenuOption>;
}

interface TitleMenuOption {
  id: string;
  label: string;
  enabled: boolean;
  action: () => void;
}

// Default title menu options
const TITLE_MENU_OPTIONS: TitleMenuOption[] = [
  { id: "continue", label: "Continue", enabled: hasSaveFile, action: continueGame },
  { id: "new_game", label: "New Game", enabled: true, action: openNewGame },
  { id: "load_game", label: "Load Game", enabled: hasSaveFile, action: openLoadGame },
  { id: "settings", label: "Settings", enabled: true, action: openSettings },
  { id: "credits", label: "Credits", enabled: true, action: openCredits },
  { id: "quit", label: "Quit", enabled: true, action: quitGame }
];

interface TitleBackground {
  type: "static" | "animated" | "scene";

  // Static: simple image
  staticImage?: Sprite;

  // Animated: looping animation
  animation?: Animation;

  // Scene: live world preview
  sceneWorld?: World;
  sceneCamera?: Camera;
}
```

### REQ-MENU-002: New Game Screen
- **Description**: Configuration options for starting a new game
- **Priority**: MUST

```typescript
interface NewGameScreen {
  isOpen: boolean;

  // World generation settings
  worldSettings: WorldGenerationSettings;

  // Game options
  gameOptions: GameStartOptions;

  // Preview (optional)
  worldPreview: WorldPreview | null;

  // Actions
  startGame(): void;
  cancel(): void;
  randomizeSeed(): void;
  regeneratePreview(): void;
}

interface WorldGenerationSettings {
  seed: string;
  worldSize: WorldSize;
  biomeType: BiomeType;
  resourceDensity: ResourceDensity;
  startingSeason: Season;

  // Advanced options
  showAdvanced: boolean;
  terrainRoughness: number;     // 0-1
  waterLevel: number;           // 0-1
  forestDensity: number;        // 0-1
}

type WorldSize = "small" | "medium" | "large" | "huge";
type ResourceDensity = "sparse" | "normal" | "abundant";
type BiomeType = "temperate" | "forest" | "plains" | "coastal";

interface GameStartOptions {
  difficulty: Difficulty;
  startingAgents: number;       // 1-5
  startingResources: StartingResources;
  tutorialEnabled: boolean;
}

type Difficulty = "peaceful" | "easy" | "normal" | "hard" | "brutal";
type StartingResources = "minimum" | "standard" | "generous";

interface WorldPreview {
  // Mini preview of generated world
  previewCanvas: HTMLCanvasElement;
  previewSize: number;          // 128x128

  isGenerating: boolean;
  generationProgress: number;

  generate(settings: WorldGenerationSettings): Promise<void>;
  render(): void;
}
```

### REQ-MENU-003: Save/Load Menu
- **Description**: Interface for managing game saves
- **Priority**: MUST

```typescript
interface SaveLoadMenu {
  mode: "save" | "load";
  isOpen: boolean;

  // Save slots
  saveSlots: SaveSlot[];
  selectedSlot: SaveSlot | null;

  // Pagination for many saves
  currentPage: number;
  slotsPerPage: number;
  totalPages: number;

  // Filtering
  sortBy: SaveSortOption;
  filterText: string;

  // Methods
  open(mode: "save" | "load"): void;
  close(): void;
  selectSlot(slot: SaveSlot): void;
  confirmAction(): void;
  deleteSlot(slot: SaveSlot): void;
  createNewSlot(): void;

  // Import/Export
  exportSave(slot: SaveSlot): void;
  importSave(file: File): void;
}

interface SaveSlot {
  id: string;
  name: string;
  isEmpty: boolean;

  // Save metadata
  timestamp: Date;
  playTime: number;            // Total seconds played
  gameDay: number;
  season: Season;
  year: number;

  // Preview data
  thumbnail: ImageData | null;
  agentCount: number;
  buildingCount: number;

  // File info
  fileSize: number;
  version: string;
  isCompatible: boolean;
}

type SaveSortOption =
  | "date_newest"
  | "date_oldest"
  | "name_asc"
  | "name_desc"
  | "playtime";

interface SaveSlotDisplay {
  slot: SaveSlot;
  isSelected: boolean;
  isHovered: boolean;

  render(
    ctx: CanvasRenderingContext2D,
    position: Vector2,
    size: Vector2
  ): void;
}

interface SaveConfirmDialog {
  visible: boolean;
  action: "save" | "load" | "delete" | "overwrite";
  targetSlot: SaveSlot;

  message: string;
  confirmLabel: string;
  cancelLabel: string;

  confirm(): void;
  cancel(): void;
}
```

### REQ-MENU-004: Pause Menu
- **Description**: In-game menu accessible during gameplay
- **Priority**: MUST

```typescript
interface PauseMenu {
  isOpen: boolean;
  pausesGame: boolean;         // Game pauses when menu open

  menuOptions: PauseMenuOption[];
  selectedIndex: number;

  // Quick stats display
  showQuickStats: boolean;
  quickStats: QuickStats;

  // Methods
  open(): void;
  close(): void;
  toggle(): void;
  selectOption(index: number): void;
  confirmSelection(): void;

  // Keyboard handling
  handleEscape(): void;        // Toggle or close sub-menu
}

interface PauseMenuOption {
  id: string;
  label: string;
  icon: Sprite;
  enabled: boolean;
  action: () => void;
}

const PAUSE_MENU_OPTIONS: PauseMenuOption[] = [
  { id: "resume", label: "Resume", action: resumeGame },
  { id: "save", label: "Save Game", action: openSaveMenu },
  { id: "load", label: "Load Game", action: openLoadMenu },
  { id: "settings", label: "Settings", action: openSettings },
  { id: "help", label: "Help", action: openHelp },
  { id: "main_menu", label: "Main Menu", action: returnToMainMenu },
  { id: "quit", label: "Quit to Desktop", action: quitToDesktop }
];

interface QuickStats {
  // Brief game state overview
  gameDay: number;
  season: Season;
  timeOfDay: string;
  agentCount: number;
  playTime: string;
}
```

### REQ-MENU-005: Settings Menu
- **Description**: Comprehensive game options configuration
- **Priority**: MUST

```typescript
interface SettingsMenu {
  isOpen: boolean;
  categories: SettingsCategory[];
  selectedCategory: SettingsCategory;

  // Track changes
  hasUnsavedChanges: boolean;
  originalValues: Map<string, unknown>;

  // Methods
  open(): void;
  close(): void;
  selectCategory(category: SettingsCategory): void;
  applyChanges(): void;
  revertChanges(): void;
  resetToDefaults(): void;
}

type SettingsCategory =
  | "gameplay"
  | "video"
  | "audio"
  | "controls"
  | "accessibility"
  | "interface";

interface SettingItem {
  id: string;
  category: SettingsCategory;
  label: string;
  description: string;
  type: SettingType;
  value: unknown;
  defaultValue: unknown;

  // Validation
  validate(value: unknown): boolean;
  onChange(value: unknown): void;
}

type SettingType =
  | { type: "toggle"; value: boolean }
  | { type: "slider"; value: number; min: number; max: number; step: number }
  | { type: "select"; value: string; options: SelectOption[] }
  | { type: "keybind"; value: string; allowModifiers: boolean }
  | { type: "color"; value: Color }
  | { type: "text"; value: string; maxLength: number };

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}
```

### REQ-MENU-006: Video Settings
- **Description**: Graphics and display configuration
- **Priority**: MUST

```typescript
interface VideoSettings {
  // Resolution
  resolution: Resolution;
  availableResolutions: Resolution[];
  fullscreen: boolean;
  windowedBorderless: boolean;

  // Scaling
  pixelScale: PixelScale;
  maintainAspectRatio: boolean;
  integerScaling: boolean;

  // Performance
  targetFrameRate: number;
  vsync: boolean;

  // Visual options
  showParticles: boolean;
  particleQuality: "low" | "medium" | "high";
  weatherEffects: boolean;
  ambientAnimations: boolean;
  screenShake: boolean;

  // Camera
  cameraSmoothing: number;
  zoomSensitivity: number;
  edgeScrolling: boolean;
  edgeScrollSpeed: number;
}

interface Resolution {
  width: number;
  height: number;
  label: string;
}

type PixelScale = 1 | 2 | 3 | 4 | "auto";

interface VideoSettingsPanel {
  settings: VideoSettings;

  // Live preview
  previewChanges: boolean;

  // Apply requires restart warning
  requiresRestart: string[];

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-MENU-007: Audio Settings
- **Description**: Sound and music configuration
- **Priority**: MUST

```typescript
interface AudioSettings {
  // Master volume
  masterVolume: number;        // 0-1
  masterMuted: boolean;

  // Category volumes
  musicVolume: number;         // 0-1
  sfxVolume: number;           // 0-1
  ambientVolume: number;       // 0-1
  uiVolume: number;            // 0-1
  voiceVolume: number;         // 0-1 (for future voice)

  // Music options
  musicEnabled: boolean;
  dynamicMusic: boolean;       // Music changes with events
  playlistShuffle: boolean;

  // Sound options
  positionalAudio: boolean;    // 3D audio based on camera
  audioQuality: "low" | "medium" | "high";

  // Accessibility
  visualSoundIndicators: boolean;  // Flash for sounds
  subtitles: boolean;
}

interface VolumeSlider {
  label: string;
  value: number;
  isMuted: boolean;

  // Visual
  showDecibels: boolean;       // Show as dB
  showPercentage: boolean;     // Show as %

  // Test sound
  testSoundId: string | null;
  playTestSound(): void;
}

interface AudioSettingsPanel {
  settings: AudioSettings;
  volumeSliders: VolumeSlider[];

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-MENU-008: Gameplay Settings
- **Description**: Game behavior configuration
- **Priority**: MUST

```typescript
interface GameplaySettings {
  // Game speed
  defaultGameSpeed: GameSpeed;
  pauseOnEvent: PauseEvents;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number;    // Minutes
  autoSaveSlots: number;

  // Notifications
  notificationDuration: number;
  notificationSound: boolean;
  notificationTypes: Map<NotificationType, boolean>;

  // Tooltips
  tooltipsEnabled: boolean;
  tooltipDelay: number;        // Milliseconds
  advancedTooltips: boolean;

  // Confirmation dialogs
  confirmDestructiveActions: boolean;
  confirmAgentDismissal: boolean;
  confirmBuildingDemolition: boolean;

  // Tutorial
  showTutorialHints: boolean;
  showNewPlayerTips: boolean;
}

interface PauseEvents {
  onCriticalNeed: boolean;
  onAgentDeath: boolean;
  onAttack: boolean;
  onImportantEvent: boolean;
}

interface GameplaySettingsPanel {
  settings: GameplaySettings;

  // Organized by sub-section
  sections: SettingsSection[];

  render(ctx: CanvasRenderingContext2D): void;
}

interface SettingsSection {
  title: string;
  settings: SettingItem[];
  isCollapsed: boolean;
}
```

### REQ-MENU-009: Controls Settings
- **Description**: Keyboard and mouse control configuration
- **Priority**: MUST

```typescript
interface ControlsSettings {
  // Input scheme
  keyboardLayout: KeyboardLayout;

  // Key bindings
  keybindings: Map<ActionId, KeyBinding>;
  defaultBindings: Map<ActionId, KeyBinding>;

  // Mouse options
  mouseInvertX: boolean;
  mouseInvertY: boolean;
  mouseSensitivity: number;
  scrollZoomSpeed: number;
  scrollZoomInvert: boolean;

  // Edge scrolling
  edgeScrollEnabled: boolean;
  edgeScrollSpeed: number;
  edgeScrollDeadzone: number;

  // Click behavior
  doubleClickSpeed: number;
  dragThreshold: number;
}

type KeyboardLayout = "qwerty" | "azerty" | "dvorak" | "custom";

interface KeyBinding {
  actionId: ActionId;
  primary: string;           // e.g., "W", "Shift+A"
  secondary: string | null;  // Alternative binding

  isDefault: boolean;
  hasConflict: boolean;
  conflictsWith: ActionId[];
}

type ActionId =
  // Camera
  | "camera_up" | "camera_down" | "camera_left" | "camera_right"
  | "zoom_in" | "zoom_out" | "zoom_reset"

  // Selection
  | "select" | "multi_select" | "deselect_all"

  // UI
  | "pause_menu" | "toggle_inventory" | "toggle_map"
  | "toggle_crafting" | "toggle_build_menu"

  // Time
  | "pause" | "speed_up" | "speed_down"

  // Quick actions
  | "quick_save" | "quick_load"

  // And more...
  ;

interface KeybindingEditor {
  selectedAction: ActionId | null;
  isListeningForKey: boolean;
  pendingKey: string | null;

  // Methods
  startListening(action: ActionId): void;
  cancelListening(): void;
  captureKey(key: string): void;
  clearBinding(action: ActionId, slot: "primary" | "secondary"): void;

  // Conflict resolution
  showConflictWarning(conflicts: ActionId[]): void;
}

interface ControlsSettingsPanel {
  settings: ControlsSettings;

  // Keybinding list by category
  categories: KeybindingCategory[];
  selectedCategory: KeybindingCategory;

  // Search
  searchQuery: string;

  render(ctx: CanvasRenderingContext2D): void;
}

interface KeybindingCategory {
  name: string;
  actions: ActionId[];
}
```

### REQ-MENU-010: Accessibility Settings
- **Description**: Options to improve accessibility
- **Priority**: SHOULD

```typescript
interface AccessibilitySettings {
  // Visual
  colorBlindMode: ColorBlindMode;
  highContrastMode: boolean;
  largeText: boolean;
  textScaling: number;         // 1.0-2.0

  // Animation/motion
  reduceMotion: boolean;
  disableScreenShake: boolean;
  disableFlashing: boolean;
  pauseAnimationsWhenPaused: boolean;

  // Audio
  visualSoundIndicators: boolean;
  monoAudio: boolean;

  // Interface
  tooltipPersistence: boolean; // Tooltips stay until clicked
  extraConfirmations: boolean;
  simpleMenus: boolean;

  // Input
  holdToConfirm: boolean;
  holdDuration: number;
  stickyKeys: boolean;
}

type ColorBlindMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

interface AccessibilityPreview {
  // Live preview of color changes
  beforeImage: Sprite;
  afterImage: Sprite;

  render(ctx: CanvasRenderingContext2D): void;
}
```

### REQ-MENU-011: Credits Screen
- **Description**: Display game credits and acknowledgments
- **Priority**: SHOULD

```typescript
interface CreditsScreen {
  isOpen: boolean;
  isScrolling: boolean;
  scrollPosition: number;
  scrollSpeed: number;

  // Content
  sections: CreditSection[];
  totalHeight: number;

  // Music
  creditsMusic: string | null;

  // Methods
  open(): void;
  close(): void;
  startScroll(): void;
  stopScroll(): void;
  skipToEnd(): void;

  // Input
  handleScroll(delta: number): void;
}

interface CreditSection {
  title: string;
  entries: CreditEntry[];
  style: CreditStyle;
}

interface CreditEntry {
  role: string;
  names: string[];
}

interface CreditStyle {
  titleSize: number;
  entrySize: number;
  spacing: number;
  alignment: "left" | "center" | "right";
}
```

### REQ-MENU-012: Menu Navigation
- **Description**: Consistent navigation patterns across menus
- **Priority**: MUST

```typescript
interface MenuNavigation {
  // Keyboard navigation
  upKey: string;               // Default: "W" or "ArrowUp"
  downKey: string;             // Default: "S" or "ArrowDown"
  leftKey: string;             // Default: "A" or "ArrowLeft"
  rightKey: string;            // Default: "D" or "ArrowRight"
  selectKey: string;           // Default: "Enter" or "Space"
  backKey: string;             // Default: "Escape"
  tabKey: string;              // Default: "Tab"

  // Focus management
  currentFocus: MenuElement | null;
  focusHistory: MenuElement[];

  // Methods
  moveFocus(direction: Direction): void;
  selectFocused(): void;
  goBack(): void;
  tabToNext(): void;
}

interface MenuElement {
  id: string;
  type: MenuElementType;
  isEnabled: boolean;
  isFocused: boolean;
  isHovered: boolean;

  // Spatial relationships
  neighbors: {
    up?: MenuElement;
    down?: MenuElement;
    left?: MenuElement;
    right?: MenuElement;
  };

  // Actions
  onSelect(): void;
  onFocus(): void;
  onBlur(): void;
}

type MenuElementType =
  | "button"
  | "slider"
  | "toggle"
  | "dropdown"
  | "keybind"
  | "textfield";

interface MenuStack {
  // Track open menus for back navigation
  stack: Menu[];

  push(menu: Menu): void;
  pop(): Menu | null;
  clear(): void;

  // Current active menu
  current(): Menu | null;
}
```

## Visual Style

```typescript
interface MenuStyle {
  // Background
  backgroundColor: Color;        // Dark, semi-transparent
  backgroundPattern: Pattern | null;
  backgroundBlur: number;        // Blur game behind menu

  // Panel styling
  panelBackground: Color;        // Solid dark color
  panelBorder: Color;
  panelBorderWidth: number;
  panelCornerRadius: number;     // 0 for sharp 8-bit look

  // Typography
  titleFont: PixelFont;
  titleSize: number;
  bodyFont: PixelFont;
  bodySize: number;

  // Colors
  textColor: Color;              // White
  textDisabledColor: Color;      // Gray
  highlightColor: Color;         // Gold/yellow
  accentColor: Color;            // Teal/blue

  // Buttons
  buttonBackground: Color;
  buttonHoverBackground: Color;
  buttonActiveBackground: Color;
  buttonDisabledBackground: Color;

  // 8-bit pixel styling
  pixelScale: number;            // 4x
  usePixelatedEdges: boolean;
}
```

## State Management

```typescript
interface MenuState {
  // Screen states
  currentScreen: MenuScreen;
  previousScreen: MenuScreen | null;

  // Sub-menu states
  isSettingsOpen: boolean;
  isSaveLoadOpen: boolean;
  isCreditsOpen: boolean;

  // Settings state
  settingsState: SettingsState;

  // Transitions
  isTransitioning: boolean;
  transitionProgress: number;

  // Methods
  navigateTo(screen: MenuScreen): void;
  goBack(): void;
}

type MenuScreen =
  | "title"
  | "new_game"
  | "load_game"
  | "save_game"
  | "settings"
  | "credits"
  | "pause"
  | "gameplay";  // In-game (menus closed)

interface SettingsState {
  currentCategory: SettingsCategory;
  pendingChanges: Map<string, unknown>;
  isDirty: boolean;
}
```

## Integration Points

- **Game Loop**: Pause/resume, state transitions
- **Save System**: Save slot management, auto-save
- **Audio System**: Volume control, music management
- **Input System**: Keybinding configuration
- **Rendering System**: Video settings application

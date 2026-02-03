# Time Travel System - Integration Guide

## Overview

The time travel system has been fully implemented with the following components:

1. **AutoSaveSystem** - Automatic midnight checkpoints with 5-day rolling window
2. **CheckpointNamingService** - LLM-powered poetic checkpoint names
3. **UniverseConfigScreen** - Magic law configuration at universe creation
4. **TimelinePanel** - Advanced timeline visualization with parallel timelines, forks, and portal connections

## Components Built

### Core Systems (`packages/core/src/systems/`)

#### AutoSaveSystem.ts
- Automatically creates checkpoints at midnight every game day
- Maintains rolling 5-checkpoint window (auto-deletes oldest)
- Universe ID based on magic laws hash (same config = same universe)
- Emits `checkpoint:created` event

**Key Features:**
```typescript
interface Checkpoint {
  key: string;            // Unique checkpoint identifier
  name: string;           // LLM-generated name
  day: number;            // Game day when created
  tick: number;           // Game tick
  timestamp: number;      // Real-world timestamp
  universeId: string;     // Universe this belongs to
  magicLawsHash: string;  // Hash of magic configuration
}
```

#### CheckpointNamingService.ts
- Generates poetic checkpoint names using LLM
- Examples: "The Dawn of Copper", "When Trees Spoke", "The First Harvest"
- Uses world context (population, buildings, day) to create meaningful names
- High temperature (0.9) for creativity
- Asynchronous queue processing

### Renderer Components (`packages/renderer/src/`)

#### UniverseConfigScreen.ts
- Start screen for magic law selection
- Preset paradigms: Elemental, Divine, Blood, Knowledge, or No Magic
- Magic configuration determines universe identity
- Beautiful gradient UI with card selection

#### TimelinePanel.ts
- **Three-column layout**: Universes | Timelines | Checkpoints
- **Parallel timelines**: Multiple playthroughs in same universe
- **Fork visualization**: SVG tree showing timeline branches
- **Portal connections**: Shows cross-universe portal links
- **Active timeline indicator**: Highlights current timeline

**Visual Features:**
- SVG fork tree when timelines branch
- Portal connection info display
- Active timeline badge
- Fork point labels ("Fork @ Day X")

## Integration Steps

### 1. Register AutoSaveSystem

In `demo/src/main.ts`, add to `registerAllSystems()`:

```typescript
// After TimeSystem registration (around line 466)
const autoSaveSystem = new AutoSaveSystem();
gameLoop.systemRegistry.register(autoSaveSystem);
```

### 2. Wire Up Checkpoint Naming

In `main()` function, after LLM provider is created:

```typescript
// After line 2514 (llmProvider creation)
if (isLLMAvailable) {
  // Existing code...
  llmQueue = new LLMDecisionQueue(llmProvider, 1);
  promptBuilder = new StructuredPromptBuilder();

  // Add checkpoint naming
  checkpointNamingService.setProvider(llmProvider);
}
```

### 3. Add Startup Flow

Replace the immediate world creation with checkpoint check:

```typescript
async function main() {
  // ... existing setup code ...

  // Check for existing checkpoints
  const existingCheckpoints = await saveLoadService.listSaves();
  let selectedCheckpointKey: string | null = null;

  if (existingCheckpoints.length > 0) {
    // Show timeline panel to select checkpoint
    const timelinePanel = new TimelinePanel();
    selectedCheckpointKey = await new Promise<string>((resolve) => {
      timelinePanel.setTimelines(existingCheckpoints);
      timelinePanel.show((key) => resolve(key));
    });
  } else {
    // Show universe config screen for new game
    const configScreen = new UniverseConfigScreen();
    const config = await new Promise<UniverseConfig>((resolve) => {
      configScreen.show((cfg) => resolve(cfg));
    });

    // Use config.magicParadigmId to set up magic system
  }

  // If checkpoint selected, load it
  if (selectedCheckpointKey) {
    const loadResult = await saveLoadService.load(selectedCheckpointKey);
    gameLoop.world = loadResult.world;
  } else {
    // Create new world with initial entities
    // ... existing world creation code ...
  }

  // ... rest of main() ...
}
```

### 4. Add Timeline Keyboard Shortcut

In keyboard registry setup (around line 2600):

```typescript
keyboardRegistry.register('open_timeline', {
  key: 'L',
  shift: true,
  description: 'Open timeline/checkpoint browser',
  category: 'Time Travel',
  handler: () => {
    const checkpoints = autoSaveSystem.getCheckpoints();
    const timelinePanel = new TimelinePanel();
    timelinePanel.setTimelines(checkpoints);
    timelinePanel.show(async (key) => {
      // Load selected checkpoint
      const result = await saveLoadService.load(key);
      gameLoop.world = result.world;
      showNotification(`Loaded: ${result.metadata.name}`, '#4CAF50');
    });
    return true;
  },
});
```

## Event Flow

### Midnight Checkpoint Creation

1. **AutoSaveSystem** detects day change
2. Generates checkpoint key and saves world state via **saveLoadService**
3. Emits `checkpoint:created` event
4. **CheckpointNamingService** listens for event
5. Gathers world context (population, buildings, etc.)
6. Sends LLM request with context
7. Receives poetic name
8. Emits `checkpoint:named` event with new name
9. Updates checkpoint metadata

### Timeline Loading

1. User opens **TimelinePanel** (Shift+L or at startup)
2. Panel queries **saveLoadService** for all checkpoints
3. Groups checkpoints by `universeId`
4. Within each universe, creates timeline objects
5. Detects forks (checkpoints with same parent but different branches)
6. Renders:
   - Universe list (grouped by magic laws)
   - Timeline list (parallel playthroughs + forks)
   - Checkpoint list (days within timeline)
7. User selects checkpoint
8. **saveLoadService.load()** deserializes world state
9. Game continues from that checkpoint

## Universe Identity

Universes are identified by their magic law configuration:

```typescript
universeId = hash(magicParadigmId + magicLaws)
```

**Same magic laws = Same universe = Parallel timelines**
**Different magic laws = Different universe = Portal connections only**

## Portal Grid Connections

When the **PassageSystem** creates a portal between universes:

1. Portal entity has `passage` component with `linkedUniverseId`
2. **TimelinePanel.setTimelines()** accepts optional `portalConnections` map
3. UI shows "Connected to X other universe(s)" in timeline panel
4. Future: Grid layout showing connected universes

## Fork Branch Visualization

When rewinding to an earlier checkpoint and continuing:

1. **AutoSaveSystem** detects load of non-latest checkpoint
2. Creates new timeline with `forkParent` = current timeline ID
3. Sets `forkPoint` = checkpoint day where fork occurred
4. **TimelinePanel** renders SVG tree:
   - Main timeline as vertical line
   - Fork branches as diagonal lines from fork point
   - Active timeline highlighted in green

## Example Checkpoint Names

The LLM generates names based on world state:

- "The Dawn of Copper" - first metalworking
- "When Trees Spoke" - first dryad conversation
- "The First Harvest" - agriculture milestone
- "The Silent Winter" - harsh weather conditions
- "The Council Forms" - governance established

## Future Enhancements

1. **Fork detection**: Automatically detect when loading old checkpoint creates fork
2. **Timeline merging**: Detect when two timelines reconverge
3. **Portal grid layout**: 2D grid showing connected universes
4. **Timeline comparison**: Diff viewer between checkpoints
5. **Checkpoint annotations**: Player notes on checkpoints
6. **Time travel locks**: Prevent paradoxes or gate time travel

## Testing

### Test Automatic Checkpoints

1. Start new game
2. Play until midnight (day increases)
3. Check browser console for `[AutoSave] Created checkpoint for day X`
4. Continue for 5+ days
5. Verify only 5 most recent checkpoints exist

### Test LLM Naming

1. Ensure LLM provider is configured
2. Create checkpoint (advance to midnight)
3. Check console for `[CheckpointNaming] Generated name for day X: "Name"`
4. Verify checkpoint has poetic name, not just "Day X"

### Test Timeline Panel

1. Create multiple checkpoints
2. Press Shift+L (or add keyboard shortcut)
3. Verify three-column layout
4. Select different universe/timeline/checkpoint
5. Load and verify world state matches checkpoint

### Test Fork Visualization

1. Play to day 5
2. Load checkpoint from day 2
3. Continue playing
4. Open timeline panel
5. Verify SVG tree shows fork branch

## Files Modified/Created

**Core Systems:**
- `packages/core/src/systems/AutoSaveSystem.ts` (NEW)
- `packages/core/src/systems/CheckpointNamingService.ts` (NEW)
- `packages/core/src/systems/index.ts` (exports added)
- `packages/core/src/events/EventMap.ts` (events added)
- `packages/core/src/index.ts` (exports added)

**Renderer Components:**
- `packages/renderer/src/TimelinePanel.ts` (NEW)
- `packages/renderer/src/UniverseConfigScreen.ts` (NEW)
- `packages/renderer/src/index.ts` (exports added)

**Types:**
```typescript
// New interfaces
interface Checkpoint { ... }
interface Timeline { ... }
interface UniverseTimeline { ... }
interface UniverseConfig { ... }
interface PresetParadigm { ... }

// New events
'checkpoint:created'
'checkpoint:name_request'
'checkpoint:named'
'universe:forked'
```

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│                     Game Loop                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ AutoSaveSystem (watches TimeComponent.day)        │  │
│  │   │                                               │  │
│  │   ├─> Midnight detected                           │  │
│  │   ├─> saveLoadService.save(world, checkpoint)     │  │
│  │   ├─> Emit 'checkpoint:created'                   │  │
│  │   └─> Trim to 5 checkpoints                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ├──> CheckpointNamingService
                           │      └─> LLM generate name
                           │
                           └──> Event: 'checkpoint:named'

┌─────────────────────────────────────────────────────────┐
│                 User Interface                           │
│                                                           │
│  Start Screen:                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │ UniverseConfigScreen                            │     │
│  │  - Select magic paradigm                        │     │
│  │  - Generate universeId from config hash         │     │
│  └────────────────────────────────────────────────┘     │
│                                                           │
│  Load Screen:                                            │
│  ┌────────────────────────────────────────────────┐     │
│  │ TimelinePanel (3 columns)                       │     │
│  │  ├─ Universes (by magic laws)                   │     │
│  │  ├─ Timelines (parallel + forks) + SVG tree     │     │
│  │  └─ Checkpoints (days)                          │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Complete!

All core components are implemented and ready for integration into the main game loop.

# Text Renderer (1D Renderer) Specification

> **Status**: Draft
> **Author**: AI Village Team
> **Related Systems**: Renderer, Renderer3D, VideoReplayComponent, WorldContextBuilder, ChroniclerSystem, TerrainFeatureAnalyzer

## Overview

The "1D Renderer" is a text-based renderer that generates prose descriptions of the game world, operating alongside the 2D and 3D visual renderers. It serves three primary purposes:

1. **Accessibility**: Screen reader compatible gameplay for vision-impaired players
2. **LLM Integration**: Scene context for agent prompts and decision-making
3. **Narrative Playback**: Oral retellings of recorded events ("bardic mode")

Unlike pixel renderers that output to canvas, the 1D Renderer outputs structured natural language text that can be displayed in a panel, fed to LLMs, or narrated aloud via text-to-speech.

## Design Philosophy

> "The same camera that shows you the village can tell you its story."

The 1D Renderer shares the same conceptual model as visual renderers:
- **Viewport/Camera**: What region of the world to describe
- **Entity Queries**: Same ECS queries as visual renderers
- **Z-ordering**: Narrative equivalent of painter's algorithm (what to mention first)
- **Frame Rate**: Updates at configurable intervals (default: 1Hz for real-time, variable for playback)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TextRenderer                              │
│                   (packages/renderer/src/)                       │
├─────────────────────────────────────────────────────────────────┤
│  Inputs:                                                         │
│   ├─ World (ECS) ─────────────► Real-time scene description     │
│   ├─ VideoReplayComponent ────► Historical playback narration   │
│   ├─ ChroniclerSystem ────────► Chronicle-style summaries       │
│   └─ Camera ──────────────────► Viewport focus                  │
├─────────────────────────────────────────────────────────────────┤
│  Voice Modes:                                                    │
│   ├─ "live"      → Present tense, immediate, factual            │
│   ├─ "chronicle" → Past tense, historical, formal               │
│   ├─ "bardic"    → Epic/poetic, embellished, dramatic           │
│   └─ "reporter"  → News-style, objective, third person          │
├─────────────────────────────────────────────────────────────────┤
│  Output Channels:                                                │
│   ├─ TextPanel ───────────────► Accessibility UI                │
│   ├─ LLMContext ──────────────► Agent prompt scene section      │
│   ├─ TVBroadcast ─────────────► Audio/closed caption track      │
│   ├─ HistoryLog ──────────────► Persistent narrative log        │
│   └─ TTS ─────────────────────► Text-to-speech narration        │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### TextRenderer Class

```typescript
interface TextRendererConfig {
  /** Voice mode for narration style */
  voice: 'live' | 'chronicle' | 'bardic' | 'reporter';

  /** Update frequency for real-time mode (ms) */
  updateInterval: number; // Default: 1000 (1Hz)

  /** Maximum characters per update */
  maxLength: number; // Default: 500

  /** Detail level (affects verbosity) */
  detailLevel: 'minimal' | 'standard' | 'verbose';

  /** Focus entity (whose perspective to describe from) */
  focusEntityId?: string;

  /** Whether to include dialogue/speech */
  includeSpeech: boolean;

  /** Whether to include ambient sounds */
  includeAmbience: boolean;
}

class TextRenderer {
  constructor(config: TextRendererConfig);

  /** Render current world state to text */
  render(world: World, camera: Camera): TextFrame;

  /** Render a VideoReplayComponent frame to text */
  renderReplayFrame(frame: ReplayFrame, context: ReplayContext): TextFrame;

  /** Render a sequence of frames as narrative */
  renderReplaySequence(replay: VideoReplayComponent, voice: VoiceMode): TextNarrative;

  /** Set focus entity (first-person vs third-person) */
  setFocus(entityId: string | null): void;

  /** Change voice mode */
  setVoice(voice: VoiceMode): void;
}
```

### TextFrame Output

```typescript
interface TextFrame {
  /** Unique frame ID */
  frameId: string;

  /** Timestamp (game tick or real time) */
  tick: number;
  timestamp: number;

  /** Main scene description */
  scene: string;

  /** Recent actions/events (last few seconds) */
  actions: string[];

  /** Dialogue/speech bubbles */
  dialogue: Array<{ speaker: string; text: string }>;

  /** Ambient description (weather, time of day, mood) */
  ambience?: string;

  /** Navigation hints (for interactive mode) */
  navigation?: {
    north: string;
    south: string;
    east: string;
    west: string;
  };
}
```

## Voice Modes

### Live Mode (Default)

Present tense, immediate, factual. Used for real-time accessibility play.

```
You stand in a grassy clearing. To the north, a wooden storage chest
sits near a campfire (unlit). Mira gathers berries from a bush to the
east. Two more villagers work in the distant fields. The air is cold.

[Actions]
- Mira picks berries from the bush
- You are holding: 3 wood, 2 stone
```

### Chronicle Mode

Past tense, historical, formal. Used for written histories and summaries.

```
On the forty-seventh day, the villagers had established a modest
settlement. A storage chest stood sentinel near the cold campfire,
while Mira continued her tireless work gathering sustenance from the
berry bushes that dotted the eastern meadow. The chill air foretold
the coming winter.
```

### Bardic Mode

Epic/poetic, embellished, dramatic. Used for oral retellings and entertainment.

```
Hear now the tale of the forty-seventh dawn! When frost yet clung to
the morning grass, and brave Mira—she of the quick hands and keen
eye—ventured forth to harvest the crimson berries of the eastern
thicket. The villagers had built much, yet the cold campfire stood
dark, awaiting the spark of courage that would warm their weary bones.
```

### Reporter Mode

News-style, objective, third person. Used for TV broadcasts and news.

```
Day 47 in the village: Residents continue expansion efforts as
temperatures drop. Mira was observed gathering food resources in the
eastern sector. Village infrastructure now includes one storage unit
and one campfire (currently inactive). Weather advisory: cold
conditions persist.
```

## Integration Points

### 1. Real-Time Scene Description (Accessibility)

The TextRenderer queries the same entities as the visual renderer:

```typescript
// Same query as Renderer.ts:576-622
const entities = world.query()
  .with('position', 'renderable')
  .executeEntities();

// Filter by viewport (from Camera)
const visible = entities.filter(e => camera.isInViewport(e.position));

// Generate descriptions using existing systems
const terrain = terrainAnalyzer.describeNearby(camera.x, camera.y, 20);
const agents = worldContextBuilder.getSeenAgentsInfo(world, visibleAgentIds);
const buildings = worldContextBuilder.getSeenBuildingsInfo(world, visibleBuildingIds);
```

### 2. LLM Context (Agent Prompts)

The `WorldContextBuilder` already generates text for LLM prompts. The TextRenderer can reuse these modules:

```typescript
// Reuse existing context builders
import { WorldContextBuilder } from '@ai-village/llm';
import { TerrainFeatureAnalyzer } from '@ai-village/world';

const worldContext = worldContextBuilder.buildWorldContext(
  needs, vision, inventory, world, temperature, memory, conversation, entity
);
```

### 3. Video Replay Narration

Convert `VideoReplayComponent` frames to prose:

```typescript
function narrateReplayFrame(frame: ReplayFrame, voice: VoiceMode): string {
  const entities = frame.entities;
  const camera = { x: frame.cameraX, y: frame.cameraY };

  // Group entities by type
  const agents = entities.filter(e => e.entityType === 'agent');
  const buildings = entities.filter(e => e.entityType === 'building');
  const resources = entities.filter(e => e.entityType === 'resource');

  // Describe based on voice mode
  switch (voice) {
    case 'live':
      return describeLive(agents, buildings, resources, camera);
    case 'chronicle':
      return describeChronicle(agents, buildings, resources, camera);
    case 'bardic':
      return describeBardic(agents, buildings, resources, camera);
    case 'reporter':
      return describeReporter(agents, buildings, resources, camera);
  }
}
```

### 4. TV Broadcast Integration

Add text track to TV broadcasts for closed captions and audio description:

```typescript
interface TVBroadcastWithNarration extends TVBroadcastComponent {
  /** Text narration track */
  narrationTrack: Array<{
    startTick: number;
    endTick: number;
    text: string;
    voice: VoiceMode;
  }>;

  /** Whether to auto-generate narration from video */
  autoNarrate: boolean;
}
```

### 5. Interdimensional Cable

Add text mode to the Interdimensional Cable player:

```typescript
// In interdimensional-cable.html, add TextReplayRenderer alongside visual renderers

class TextReplayRenderer {
  private textPanel: HTMLElement;
  private voice: VoiceMode = 'reporter';

  render(frame: ReplayFrame): void {
    const narration = narrateReplayFrame(frame, this.voice);
    this.textPanel.innerText = narration;

    // Also speak aloud if TTS enabled
    if (this.ttsEnabled) {
      speechSynthesis.speak(new SpeechSynthesisUtterance(narration));
    }
  }
}
```

## Description Templates

### Entity Descriptions

| Entity Type | Live Mode | Chronicle Mode | Bardic Mode |
|-------------|-----------|----------------|-------------|
| Agent (idle) | "Mira stands nearby, resting" | "Mira rested in the shade" | "Fair Mira took her ease" |
| Agent (gathering) | "Mira gathers berries" | "Mira gathered provisions" | "Mira harvested nature's bounty" |
| Agent (building) | "Mira works on the tent" | "Mira labored on shelter" | "Mira raised shelter 'gainst the cold" |
| Building (complete) | "A campfire (unlit)" | "A campfire stood ready" | "The hearth awaited its flame" |
| Building (in-progress) | "A tent (under construction, 60%)" | "The tent rose slowly" | "The shelter took shape" |
| Resource | "3 berry bushes nearby" | "Berry bushes dotted the area" | "The land offered its fruits" |

### Terrain Descriptions

Reuse `TerrainFeatureAnalyzer.describeNearby()`:

```
Nearby: Cliff (42m), Ridge (elev 15). To the east: Peak (elev 22), Ridge.
```

Transform to voice modes:

- **Live**: "A cliff rises to the north. Mountains visible to the east."
- **Chronicle**: "The settlement lay beneath towering cliffs, with mountains on the eastern horizon."
- **Bardic**: "Sheer cliffs guarded the north, while ancient peaks kept watch from the rising sun's domain."

### Action Descriptions

| Action | Live | Chronicle | Bardic |
|--------|------|-----------|--------|
| gather | "picks berries" | "gathered berries" | "harvested the bush's crimson gift" |
| build | "places wood" | "continued construction" | "raised another timber to the sky" |
| talk | "speaks to Mira" | "conversed with Mira" | "shared words with fair Mira" |
| eat | "eats an apple" | "took sustenance" | "partook of nature's bounty" |
| sleep | "sleeps in the tent" | "rested in shelter" | "surrendered to dreams" |

## Text Adventure Mode

When enabled, the TextRenderer supports interactive play:

```
═══════════════════════════════════════════════════════════
                    AI VILLAGE - TEXT MODE
═══════════════════════════════════════════════════════════

Day 47, Morning - The Village Clearing

You stand in the center of the village. A cold wind blows from the
north. The campfire beside you is unlit. Your inventory holds 3 wood
and 2 stone.

NEARBY:
  - Mira gathers berries to the EAST
  - Storage chest to the NORTH
  - Unlit campfire (here)

YOUR STATUS:
  - Hunger: 45% (could eat)
  - Energy: 78% (rested)
  - Temperature: Cold

AVAILABLE ACTIONS:
  1. Gather wood
  2. Light the campfire
  3. Talk to Mira
  4. Check storage
  5. Explore NORTH / SOUTH / EAST / WEST

> _
═══════════════════════════════════════════════════════════
```

## Historical Narration

For replaying recorded events, the TextRenderer can generate continuous prose:

```typescript
function narrateHistory(
  replay: VideoReplayComponent,
  chronicles: ChronicleEntry[],
  voice: VoiceMode
): string[] {
  const paragraphs: string[] = [];

  // Opening (from ChroniclerSystem templates)
  paragraphs.push(getChronicleOpening(voice));

  // Narrate key frames
  for (let i = 0; i < replay.frames.length; i += 10) {
    const frame = replay.frames[i];
    const prevFrame = i > 0 ? replay.frames[i - 10] : null;

    // Describe changes since last narrated frame
    const changes = detectChanges(prevFrame, frame);
    if (changes.significant) {
      paragraphs.push(narrateChanges(changes, voice));
    }
  }

  // Weave in chronicle events
  for (const event of chronicles) {
    paragraphs.push(narrateChronicleEvent(event, voice));
  }

  // Closing
  paragraphs.push(getChronicleClosing(voice));

  return paragraphs;
}
```

## Performance Considerations

1. **Caching**: Cache terrain descriptions (already done in `TerrainDescriptionCache`)
2. **Throttling**: Real-time mode updates at 1Hz max (not every tick)
3. **Diffing**: Only describe changes between frames for playback
4. **Lazy Generation**: Generate descriptions on-demand, not preemptively

## File Structure

```
packages/renderer/src/
├── TextRenderer.ts           # Main text renderer class
├── text/
│   ├── VoiceModes.ts         # Voice mode implementations
│   ├── EntityDescriber.ts    # Entity → prose conversion
│   ├── ActionNarrator.ts     # Action → prose conversion
│   ├── SceneComposer.ts      # Compose full scene descriptions
│   └── ReplayNarrator.ts     # VideoReplay → narrative
└── TextPanel.ts              # UI component for text display

packages/llm/src/
├── prompt-builders/
│   └── WorldContextBuilder.ts  # (Existing - reuse)
└── TextRendererAdapter.ts      # Bridge to LLM context

packages/core/src/
├── television/
│   └── NarrationTrack.ts     # Text track for TV broadcasts
└── accessibility/
    └── ScreenReaderAdapter.ts  # ARIA-compatible output
```

## Implementation Phases

### Phase 1: Core Text Renderer
- [ ] `TextRenderer` class with `render(world, camera)`
- [ ] Live voice mode implementation
- [ ] Basic entity descriptions
- [ ] Terrain description integration

### Phase 2: Voice Modes
- [ ] Chronicle mode
- [ ] Bardic mode
- [ ] Reporter mode
- [ ] Voice switching

### Phase 3: Replay Narration
- [ ] `renderReplayFrame()` for VideoReplayComponent
- [ ] Change detection between frames
- [ ] Continuous narrative generation
- [ ] Integration with Interdimensional Cable

### Phase 4: Interactive Mode
- [ ] Text adventure UI panel
- [ ] Action selection via text commands
- [ ] Navigation descriptions
- [ ] Full game playability in text mode

### Phase 5: TV Integration
- [ ] Narration track component
- [ ] Closed caption generation
- [ ] TTS integration
- [ ] Live broadcast narration

## Success Criteria

1. **Accessibility**: A vision-impaired player can play the full game using only text output
2. **LLM Quality**: Scene descriptions are rich enough for agents to make informed decisions
3. **Narrative Coherence**: Replay narrations read like stories, not log dumps
4. **Performance**: Text generation adds <1ms overhead per frame

## References

- `packages/renderer/src/Renderer.ts` - Visual renderer patterns
- `packages/llm/src/prompt-builders/WorldContextBuilder.ts` - Scene description logic
- `packages/core/src/components/VideoReplayComponent.ts` - Replay frame structure
- `packages/core/src/research/ChroniclerSystem.ts` - Historical narration templates
- `packages/world/src/terrain/TerrainFeatureAnalyzer.ts` - Terrain descriptions
- `demo/interdimensional-cable.html` - Replay playback UI

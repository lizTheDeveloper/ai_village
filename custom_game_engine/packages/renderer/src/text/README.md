# Text Renderer (1D Renderer)

Generates prose descriptions of the game world, operating alongside 2D and 3D visual renderers. Supports accessibility, LLM context generation, and narrative playback.

## Core Classes

**TextRenderer** - Main rendering pipeline. Queries visible entities from camera viewport, extracts context, composes prose descriptions. Supports caching with configurable update intervals. Factory functions: `createTextRenderer()`, `createAccessibilityRenderer()`, `createLLMContextRenderer()`, `createNarrationRenderer()`.

**EntityDescriber** - Extracts description context from ECS entities. Converts components (`agent`, `building`, `plant`, etc.) into `EntityDescriptionContext`. Handles distance/direction calculations, entity grouping, and dialogue extraction.

**SceneComposer** - Composes complete scenes from entity summaries, terrain, ambience, and events. Groups entities by distance (immediate/close/area/distant) for narrative flow. Outputs `TextFrame` with scene prose, actions, dialogue, navigation hints.

**VoiceModes** - Transforms raw data into styled prose via `VoiceTransformer` interface. Four modes:
- **live**: Present tense, factual ("You are in the village. Mira gathers berries.")
- **chronicle**: Past tense, historical ("It was Day 47 in the village. Mira gathered berries.")
- **bardic**: Epic/poetic ("Hear now! Mira the Bold, harvesting nature's bounty...")
- **reporter**: News-style ("Day 47. Resident Mira was observed collecting resources.")

Each mode implements `describeEntity()`, `describeAction()`, `openScene()`, `describeTerrain()`, `describeAmbience()`, `describeLocation()`.

## Usage

```typescript
const textRenderer = new TextRenderer({ voice: 'live' });
const frame = textRenderer.render(world, camera);
console.log(frame.scene); // "Day 47. You are in the village. Mira gathers berries..."

// Format outputs
const adventure = formatAsTextAdventure(frame); // Full text adventure display
const screenReader = formatAsScreenReader(frame); // Compact one-liner
```

## Providers

**TerrainProvider** - Supplies terrain descriptions at positions. Set via `setTerrainProvider()`.

**EventProvider** - Supplies recent events for action lists. Set via `setEventProvider()`.

## Replay Rendering

Supports rendering `VideoReplayComponent` frames to text narrative. Use `renderReplayFrame()` for single frames, `renderReplaySequence()` for full narrative with selected voice mode.

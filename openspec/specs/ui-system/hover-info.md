# Hover and Inspection System - Specification

**Created:** 2025-12-21
**Status:** Draft
**Version:** 0.4.0

---

## Overview

The hover and inspection system provides multiple levels of information access and player interaction:

1. **Hover Tooltips** - Quick, contextual tooltips when the player hovers their mouse over tiles, entities, and UI elements. Shows summary information at a glance.

2. **Click-to-Inspect Panels** - Detailed inspection panels when clicking on agents, revealing comprehensive information including needs, behavior, memory, relationships, conversation history, and debug data.

3. **Live Conversation UI** - Real-time speech bubbles and dialogue displays when agents are conversing, with visual indicators connecting conversation participants.

4. **Conversation History View** - Searchable, filterable history of all conversations an agent has participated in, with timeline visualization and relationship impact tracking.

5. **Voice of God** - Player ability to inject thoughts into an agent's mind. The thought appears as clearly external (not the agent's own), with unknown origin. The agent must interpret and decide how to respond to this mysterious intrusion.

This system exposes detailed world information without cluttering the main display, enabling players to understand the state of terrain, resources, agents, and their social interactions through progressive disclosure.

---

## Requirements

### REQ-HOVER-001: Mouse Position Tracking

The input system SHALL continuously track mouse position and convert it to world coordinates.

```typescript
interface HoverState {
  // Screen coordinates (pixels)
  screenX: number;
  screenY: number;

  // World coordinates (tiles, fractional)
  worldX: number;
  worldY: number;

  // Discrete tile position
  tileX: number;
  tileY: number;

  // Current hovered targets
  hoveredTile: Tile | null;
  hoveredEntities: Entity[];   // Sorted by layer (topmost first)

  // Hover timing (for delayed tooltips)
  hoverStartTime: number;
  isHoverStable: boolean;      // True after hover delay threshold
}
```

### REQ-HOVER-002: Hit Detection

The system SHALL determine what the mouse is hovering over using spatial queries.

```typescript
interface HoverDetection {
  // Query what's under the cursor
  getHoveredTile(worldX: number, worldY: number): Tile | null;
  getHoveredEntities(worldX: number, worldY: number): Entity[];

  // Entity bounds checking
  isPointInEntity(worldX: number, worldY: number, entity: Entity): boolean;

  // Priority resolution (when multiple entities overlap)
  selectTopEntity(entities: Entity[]): Entity | null;
}
```

**Hit Detection Rules:**
```
WHEN the mouse moves
THEN the system SHALL:
  1. Convert screen coordinates to world coordinates via Camera.screenToWorld()
  2. Calculate tile position: tileX = floor(worldX), tileY = floor(worldY)
  3. Query chunk for tile at (tileX, tileY)
  4. Query all entities with 'position' component in nearby radius
  5. Filter entities whose bounding box contains the cursor
  6. Sort entities by render layer (ui > effect > entity > object > floor > terrain)
  7. Update HoverState with results
```

---

## Tile Hover Information

### REQ-HOVER-003: Terrain Tooltip

Hovering over terrain SHALL display tile information.

```typescript
interface TileHoverInfo {
  // Basic terrain info
  terrain: TerrainType;           // "grass", "dirt", "water", "stone", "sand", "forest"
  biome: BiomeType | undefined;   // "plains", "forest", "desert", "mountains", "ocean", "river"

  // Tile properties
  moisture: number;               // 0-1, display as percentage
  fertility: number;              // 0-1, display as percentage

  // Coordinates
  position: {
    tileX: number;
    tileY: number;
    chunkX: number;
    chunkY: number;
  };

  // Passability
  isPassable: boolean;
  movementCost: number;           // 1.0 = normal, >1 = slower, <1 = faster
}
```

**Tile Tooltip Display:**
```
┌─────────────────────────┐
│ Grassland               │
│ Plains Biome            │
├─────────────────────────┤
│ Moisture:  ████░░ 65%   │
│ Fertility: █████░ 80%   │
├─────────────────────────┤
│ Passable                │
│ (12, -5) Chunk (0, 0)   │
└─────────────────────────┘
```

**Water Tile Display:**
```
┌─────────────────────────┐
│ Water                   │
│ River                   │
├─────────────────────────┤
│ Depth: Deep             │
│ Impassable              │
├─────────────────────────┤
│ (8, 3) Chunk (0, 0)     │
└─────────────────────────┘
```

---

## Entity Hover Information

### REQ-HOVER-004: Resource Entity Tooltips

Hovering over resource entities (trees, rocks, etc.) SHALL display their state.

```typescript
interface ResourceHoverInfo {
  // Identity
  name: string;                   // "Oak Tree", "Boulder", etc.
  tags: string[];                 // ["tree", "resource", "obstacle"]

  // Resource component (if present)
  resource?: {
    type: string;                 // "food", "wood", "stone"
    amount: number;               // Current amount
    maxAmount: number;            // Maximum capacity
    regenerationRate: number;     // Units per second
  };

  // State
  isHarvestable: boolean;
  isObstacle: boolean;
}
```

**Tree Tooltip (with food/resources):**
```
┌─────────────────────────┐
│ Apple Tree              │
├─────────────────────────┤
│ Food: ████████░░ 80/100 │
│ Regenerating: +0.5/s    │
├─────────────────────────┤
│ Harvestable             │
└─────────────────────────┘
```

**Tree Tooltip (depleted):**
```
┌─────────────────────────┐
│ Apple Tree              │
├─────────────────────────┤
│ Food: ░░░░░░░░░░ 0/100  │
│ Regenerating: +0.5/s    │
├─────────────────────────┤
│ Empty - regenerating... │
└─────────────────────────┘
```

**Rock Tooltip:**
```
┌─────────────────────────┐
│ Granite Boulder         │
├─────────────────────────┤
│ Stone: ██████░░░░ 60%   │
│ Minable                 │
└─────────────────────────┘
```

### REQ-HOVER-005: Agent Tooltips

Hovering over agents SHALL display their state and needs.

```typescript
interface AgentHoverInfo {
  // Identity
  name: string;
  tags: string[];                 // ["agent", "wanderer"]

  // Needs component
  needs?: {
    hunger: number;               // 0-100
    energy: number;               // 0-100
    // Future: thirst, social, safety, etc.
  };

  // Current behavior
  behavior?: {
    currentState: string;         // "wandering", "seeking_food", "eating", "sleeping"
    target?: string;              // Target entity name if applicable
  };

  // Conversation (if present)
  conversation?: {
    isInConversation: boolean;
    partner?: string;             // Name of conversation partner
    lastMessage?: string;         // Most recent message (truncated)
  };

  // Vision info
  vision?: {
    range: number;
    nearbyAgents: number;
    nearbyResources: number;
  };
}
```

**Agent Tooltip (healthy, wandering):**
```
┌─────────────────────────────┐
│ Wanderer                    │
│ [Agent]                     │
├─────────────────────────────┤
│ Hunger: ██████████ 100%     │
│ Energy: ████████░░ 80%      │
├─────────────────────────────┤
│ Status: Wandering           │
└─────────────────────────────┘
```

**Agent Tooltip (hungry, seeking food):**
```
┌─────────────────────────────┐
│ Wanderer                    │
│ [Agent]                     │
├─────────────────────────────┤
│ Hunger: ███░░░░░░░ 30%  ⚠️  │
│ Energy: ████████░░ 80%      │
├─────────────────────────────┤
│ Status: Seeking food        │
│ Target: Apple Tree          │
└─────────────────────────────┘
```

**Agent Tooltip (in conversation):**
```
┌─────────────────────────────┐
│ Wanderer                    │
│ [Agent]                     │
├─────────────────────────────┤
│ Hunger: ████████░░ 85%      │
│ Energy: ██████░░░░ 60%      │
├─────────────────────────────┤
│ Status: Talking             │
│ With: Other Agent           │
│ "Hello, nice weather..."    │
└─────────────────────────────┘
```

---

## Tooltip Rendering

### REQ-HOVER-006: Tooltip Visual Style

Tooltips SHALL match the game's 8-bit aesthetic.

```typescript
interface TooltipStyle {
  // Background
  backgroundColor: string;        // Semi-transparent dark
  borderColor: string;
  borderWidth: number;
  cornerStyle: "square" | "rounded-pixel";  // Pixel-art rounded corners

  // Text
  font: PixelFont;
  textColor: string;
  headerColor: string;
  warningColor: string;           // For low needs, critical states

  // Layout
  padding: number;
  lineHeight: number;
  maxWidth: number;

  // Progress bars
  barHeight: number;
  barEmptyColor: string;
  barFillColors: Map<string, string>;  // Per-type colors (food=green, etc.)
}

const defaultTooltipStyle: TooltipStyle = {
  backgroundColor: "rgba(20, 20, 30, 0.9)",
  borderColor: "#8b7355",
  borderWidth: 2,
  cornerStyle: "rounded-pixel",

  font: { name: "pixel", size: 8, characterSet: "ascii", spacing: 1 },
  textColor: "#f5f5dc",
  headerColor: "#ffd700",
  warningColor: "#ff6b6b",

  padding: 8,
  lineHeight: 12,
  maxWidth: 200,

  barHeight: 8,
  barEmptyColor: "#333333",
  barFillColors: new Map([
    ["hunger", "#4ade80"],    // Green
    ["energy", "#facc15"],    // Yellow
    ["food", "#4ade80"],      // Green
    ["stone", "#9ca3af"],     // Gray
    ["wood", "#a16207"],      // Brown
  ])
};
```

### REQ-HOVER-007: Tooltip Positioning

Tooltips SHALL be positioned to avoid obscuring important content.

```
WHEN displaying a tooltip
THEN the system SHALL:
  1. Default position: Above and to the right of cursor
  2. IF tooltip would extend beyond viewport right edge
     THEN position to the left of cursor
  3. IF tooltip would extend beyond viewport top edge
     THEN position below cursor
  4. IF tooltip would overlap the hovered entity
     THEN offset by entity's bounding box
  5. Add 8px margin from cursor to avoid flicker
  6. Clamp final position within viewport bounds
```

```typescript
interface TooltipPositioning {
  calculatePosition(
    cursorScreenX: number,
    cursorScreenY: number,
    tooltipWidth: number,
    tooltipHeight: number,
    viewport: { width: number; height: number }
  ): { x: number; y: number };

  // Offset from cursor
  cursorOffset: { x: number; y: number };

  // Viewport padding
  viewportMargin: number;
}
```

### REQ-HOVER-008: Hover Delay

Tooltips SHALL appear after a brief delay to avoid flicker.

```typescript
interface HoverTiming {
  // Delay before tooltip appears (ms)
  showDelay: 200;

  // Delay before tooltip hides when mouse moves away (ms)
  hideDelay: 100;

  // Fade animation duration (ms)
  fadeInDuration: 100;
  fadeOutDuration: 50;
}
```

```
WHEN mouse hovers over a new target
THEN the system SHALL:
  1. Start show delay timer (200ms)
  2. IF mouse moves to different target during delay
     THEN restart timer for new target
  3. IF mouse stays on same target for full delay
     THEN display tooltip with fade-in animation
  4. WHEN mouse leaves target
     THEN start hide delay timer (100ms)
  5. IF mouse returns to same target during hide delay
     THEN cancel hide and keep tooltip visible
  6. IF hide delay completes
     THEN fade out and hide tooltip
```

---

## Rendering Integration

### REQ-HOVER-009: Canvas Tooltip Rendering

Tooltips MAY be rendered on the canvas as a UI layer.

```typescript
interface CanvasTooltipRenderer {
  // Render tooltip to canvas
  renderTooltip(
    ctx: CanvasRenderingContext2D,
    info: TileHoverInfo | ResourceHoverInfo | AgentHoverInfo,
    position: { x: number; y: number },
    style: TooltipStyle
  ): void;

  // Draw components
  drawBackground(ctx: CanvasRenderingContext2D, bounds: Rect, style: TooltipStyle): void;
  drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TooltipStyle): void;
  drawProgressBar(ctx: CanvasRenderingContext2D, value: number, max: number, type: string, bounds: Rect, style: TooltipStyle): void;
  drawDivider(ctx: CanvasRenderingContext2D, y: number, width: number, style: TooltipStyle): void;
}
```

### REQ-HOVER-010: DOM Tooltip Alternative

Alternatively, tooltips MAY be rendered as DOM elements overlaying the canvas.

```typescript
interface DOMTooltipRenderer {
  // Container element
  container: HTMLElement;

  // Show/hide
  show(info: HoverInfo, screenX: number, screenY: number): void;
  hide(): void;

  // Update position (for smooth following)
  updatePosition(screenX: number, screenY: number): void;

  // Generate HTML
  buildTooltipHTML(info: HoverInfo): string;
}
```

**Trade-offs:**
| Approach | Pros | Cons |
|----------|------|------|
| Canvas | Pixel-perfect style, single render context | More complex layout, no native text selection |
| DOM | Native CSS styling, easier text layout | May look inconsistent, extra DOM manipulation |

**Recommendation:** Start with Canvas rendering to maintain consistent 8-bit aesthetic. Consider DOM as future optimization if tooltip complexity increases significantly.

---

## Hover Highlight

### REQ-HOVER-011: Entity Highlight on Hover

Hovered entities SHALL be visually highlighted.

```typescript
interface HoverHighlight {
  // Highlight style
  outlineColor: string;           // e.g., "#ffffff" or "#ffd700"
  outlineWidth: number;           // Pixels
  outlineStyle: "solid" | "dashed" | "pulse";

  // Glow effect (optional)
  glowEnabled: boolean;
  glowColor: string;
  glowRadius: number;

  // Tile highlight
  tileHighlightColor: string;     // Semi-transparent overlay
  tileHighlightStyle: "border" | "fill" | "corners";
}
```

```
WHEN hovering over an entity
THEN the renderer SHALL:
  1. Draw normal entity sprite
  2. Draw highlight outline (1-2px, contrasting color)
  3. Optionally pulse outline opacity for interactable entities

WHEN hovering over empty tile
THEN the renderer SHALL:
  1. Draw tile highlight (subtle border or corner markers)
  2. Use terrain-appropriate highlight color
```

---

## Click-to-Inspect: Full Agent Details

### REQ-HOVER-016: Agent Selection

Clicking on an agent SHALL select it and open a detailed inspection panel.

```typescript
interface SelectionState {
  // Currently selected entity
  selectedEntity: Entity | null;
  selectedEntityId: EntityId | null;

  // Selection timing
  selectedAt: number;

  // Panel state
  inspectionPanelOpen: boolean;
  panelPosition: "left" | "right" | "floating";
}
```

```
WHEN player clicks on an agent
THEN the system SHALL:
  1. Select the agent (highlight with selection indicator)
  2. Open the Agent Inspection Panel
  3. Camera optionally follows selected agent (user setting)
  4. Panel updates in real-time as agent state changes

WHEN player clicks elsewhere or presses Escape
THEN the system SHALL:
  1. Deselect the agent
  2. Close the inspection panel
  3. Return camera to previous mode
```

### REQ-HOVER-017: Agent Inspection Panel

The inspection panel SHALL display comprehensive agent information.

```typescript
interface AgentInspectionData {
  // === IDENTITY ===
  identity: {
    id: EntityId;
    name: string;
    displayName: string;
    tags: string[];
    createdAt: Tick;
    age: string;                    // Formatted game time since creation
  };

  // === NEEDS (Full Hierarchy) ===
  needs: {
    // Physical needs
    hunger: NeedState;
    energy: NeedState;
    thirst?: NeedState;             // Future

    // Safety needs (future)
    shelter?: NeedState;
    security?: NeedState;

    // Social needs (future)
    belonging?: NeedState;
    companionship?: NeedState;
  };

  // === BEHAVIOR ===
  behavior: {
    currentBehavior: string;        // "wandering", "seeking_food", etc.
    behaviorState: object;          // Internal state data
    thinkInterval: number;          // Ticks between decisions
    lastThinkTick: Tick;

    // Decision history
    recentDecisions: Decision[];    // Last N decisions with timestamps
  };

  // === VISION & PERCEPTION ===
  vision: {
    range: number;
    angle: number;
    canSeeAgents: boolean;
    canSeeResources: boolean;

    // What's currently visible
    visibleAgents: VisibleEntity[];
    visibleResources: VisibleEntity[];
    visibleThreats: VisibleEntity[];
  };

  // === MEMORY ===
  memory: {
    capacity: number;
    usedSlots: number;
    decayRate: number;

    // Memory entries
    memories: MemoryEntry[];
  };

  // === RELATIONSHIPS ===
  relationships: {
    knownAgents: RelationshipEntry[];
    // Per agent: familiarity, sentiment, last interaction
  };

  // === CONVERSATION ===
  conversation: {
    isInConversation: boolean;
    conversationPartner?: string;

    // Full message history
    messageHistory: ConversationMessage[];
  };

  // === POSITION & MOVEMENT ===
  position: {
    x: number;
    y: number;
    chunkX: number;
    chunkY: number;

    // Movement
    velocityX: number;
    velocityY: number;
    speed: number;
    isMoving: boolean;

    // Navigation
    hasTarget: boolean;
    targetX?: number;
    targetY?: number;
    distanceToTarget?: number;
  };

  // === PHYSICS ===
  physics: {
    solid: boolean;
    width: number;
    height: number;
    collisionGroup?: string;
  };

  // === INVENTORY (Future) ===
  inventory?: {
    slots: InventorySlot[];
    capacity: number;
    carriedWeight: number;
    maxWeight: number;
  };
}

interface NeedState {
  current: number;                  // 0-100
  max: number;                      // Usually 100
  decayRate: number;                // Per second
  status: "critical" | "low" | "moderate" | "satisfied" | "full";
  timeUntilCritical?: number;       // Estimated game time
}

interface VisibleEntity {
  id: EntityId;
  name: string;
  type: string;
  distance: number;
  direction: string;                // "north", "southeast", etc.
}

interface MemoryEntry {
  type: string;                     // "saw_agent", "found_food", "had_conversation"
  subject: string;
  timestamp: Tick;
  strength: number;                 // 0-1, decays over time
  details: object;
}

interface RelationshipEntry {
  agentId: EntityId;
  agentName: string;
  familiarity: number;              // 0-100
  sentiment: number;                // -100 to 100 (hostile to friendly)
  interactionCount: number;
  lastInteraction: Tick;
  relationshipType?: string;        // "stranger", "acquaintance", "friend", etc.
}

interface ConversationMessage {
  speaker: string;
  message: string;
  timestamp: Tick;
  sentiment?: string;
}
```

### REQ-HOVER-018: Inspection Panel Layout

The panel SHALL be organized into collapsible sections.

**Full Agent Inspection Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  [Portrait]  WANDERER                              [X] ║  │
│  ║              Agent · Age: 2d 5h                        ║  │
│  ║              ID: abc-123-def                           ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ▼ NEEDS                                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Hunger   ████████░░░░░░░░░░░░  42%  ⚠ Low              ││
│  │          Decay: -0.5/s · Critical in: 1h 24m           ││
│  │                                                         ││
│  │ Energy   ██████████████░░░░░░  72%  ✓ Moderate         ││
│  │          Decay: -0.2/s · Critical in: 6h 0m            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ▼ BEHAVIOR                                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Current: Seeking Food                                   ││
│  │ Target:  Apple Tree (12.5 tiles away)                   ││
│  │                                                         ││
│  │ Recent Decisions:                                       ││
│  │ • 2s ago: Changed from "wandering" → "seeking_food"     ││
│  │ • 15s ago: Decided to wander north                      ││
│  │ • 45s ago: Finished conversation with Agent B           ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ▶ VISION (collapsed)                                       │
│                                                             │
│  ▼ MEMORY                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Capacity: 8/20 memories                                 ││
│  │                                                         ││
│  │ • [95%] Saw food at Apple Tree (5m ago)                 ││
│  │ • [82%] Talked with Agent B (10m ago)                   ││
│  │ • [45%] Visited river area (1h ago)                     ││
│  │ • [23%] Met Agent C (3h ago)                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ▼ RELATIONSHIPS                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Known Agents: 3                                         ││
│  │                                                         ││
│  │ Agent B        ██████████░░  Acquaintance               ││
│  │                Familiarity: 65  Sentiment: +20          ││
│  │                Last seen: 10m ago (5 interactions)      ││
│  │                                                         ││
│  │ Agent C        ███░░░░░░░░░  Stranger                   ││
│  │                Familiarity: 15  Sentiment: 0            ││
│  │                Last seen: 3h ago (1 interaction)        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ▼ CONVERSATION HISTORY                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Last conversation with Agent B (10m ago):               ││
│  │                                                         ││
│  │ Agent B: "Hello there! Nice day, isn't it?"             ││
│  │ Wanderer: "Yes, the weather is quite pleasant."         ││
│  │ Agent B: "Have you found any good food sources?"        ││
│  │ Wanderer: "There's an apple tree to the east."          ││
│  │ Agent B: "Thanks! I'll check it out."                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ▶ POSITION & MOVEMENT (collapsed)                          │
│                                                             │
│  ▶ DEBUG INFO (collapsed)                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Position: (45.23, -12.87) Chunk: (1, 0)                 ││
│  │ Velocity: (0.5, 0.2) Speed: 2.0                         ││
│  │ Think interval: 20 ticks · Last think: tick 15420       ││
│  │ Entity version: 47                                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-019: Panel Interaction

The inspection panel SHALL support user interaction.

```typescript
interface InspectionPanelControls {
  // Section toggling
  toggleSection(section: string): void;
  expandAll(): void;
  collapseAll(): void;

  // Navigation
  followAgent(): void;              // Camera follows this agent
  unfollowAgent(): void;
  goToAgent(): void;                // Center camera on agent once

  // Agent interaction (future)
  possessAgent(): void;             // Take control of agent
  issueCommand(command: AgentCommand): void;

  // Panel controls
  pinPanel(): void;                 // Keep open even when clicking elsewhere
  unpinPanel(): void;
  movePanel(position: "left" | "right" | "floating"): void;
  resizePanel(width: number): void;

  // Data export
  copyAgentData(): void;            // Copy JSON to clipboard
  exportMemories(): void;
  exportConversationLog(): void;
}
```

```
Panel Keyboard Shortcuts:
- Escape: Close panel / Deselect agent
- F: Follow/unfollow selected agent
- C: Center camera on agent
- P: Pin/unpin panel
- 1-9: Toggle sections 1-9
- A: Expand all sections
- Shift+A: Collapse all sections
```

### REQ-HOVER-020: Real-Time Updates

The panel SHALL update in real-time as the agent's state changes.

```
WHILE inspection panel is open
THEN the system SHALL:
  1. Update needs bars every frame (smooth animation)
  2. Update position/movement every frame
  3. Update behavior when it changes
  4. Update visible entities every 500ms
  5. Update memory list when memories are added/removed
  6. Update conversation when new messages arrive
  7. Highlight changed values briefly (flash yellow)
```

```typescript
interface PanelUpdateStrategy {
  // Update frequencies
  needsUpdateInterval: number;      // Every frame (16ms)
  behaviorUpdateInterval: number;   // On change
  visionUpdateInterval: number;     // 500ms
  memoryUpdateInterval: number;     // On change
  relationshipUpdateInterval: number; // 1000ms

  // Visual feedback
  highlightChangedValues: boolean;
  highlightDuration: number;        // ms
  highlightColor: string;

  // Performance
  throttleUpdates: boolean;
  maxUpdatesPerFrame: number;
}
```

### REQ-HOVER-021: Selection Indicator

Selected agents SHALL have a distinct visual indicator.

```typescript
interface SelectionIndicator {
  // Style
  indicatorType: "circle" | "square" | "arrows" | "glow";
  color: string;
  thickness: number;
  animated: boolean;

  // Animation
  pulseEnabled: boolean;
  pulseSpeed: number;
  rotationEnabled: boolean;         // For arrows style
  rotationSpeed: number;
}
```

```
Selected Agent Visual:
      ▲
    ╭───╮
  ◀ │ 🧑 │ ▶     ← Rotating arrows around agent
    ╰───╯
      ▼

  OR

    ┌─ ─┐
    │ 🧑 │         ← Pulsing corner brackets
    └─ ─┘
```

---

## Conversation UI

### REQ-HOVER-022: Live Conversation Display

When agents are conversing, a speech bubble or dialogue UI SHALL appear in the world.

```typescript
interface LiveConversationDisplay {
  // Participants
  participants: EntityId[];
  participantNames: string[];

  // Current state
  isActive: boolean;
  currentSpeaker: EntityId | null;
  currentMessage: string;

  // Display mode
  displayMode: "speech_bubble" | "dialogue_box" | "floating_text";

  // Timing
  messageDisplayDuration: number;     // ms before fading
  typingIndicatorEnabled: boolean;
}
```

**Speech Bubble Style (In-World):**
```
                    ┌─────────────────────────────┐
                    │ "Hello! Have you found any  │
                    │  good food sources lately?" │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                                 ╭───╮
                                 │🧑A│
                                 ╰───╯


         ╭───╮
         │🧑B│
         ╰───╯
           │
           ▼
    ┌──────┴──────────────────────┐
    │ "Yes! There's an apple     │
    │  tree to the east."        │
    └─────────────────────────────┘
```

**Dialogue Box Style (Screen Overlay):**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      [Game World View]                      │
│                                                             │
│         🧑A ←───────────────────────────→ 🧑B               │
│              (conversation indicator)                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Agent A                                              │    │
│  │ "Hello! Have you found any good food sources?"       │    │
│  │                                                      │    │
│  │ Agent B                                              │    │
│  │ "Yes! There's an apple tree to the east."           │    │
│  │                                                      │    │
│  │ Agent A                                              │    │
│  │ "Thanks! I'll check it out."                        │    │
│  │                                            ▼ [more] │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-023: Conversation Indicator

Agents in conversation SHALL have a visual indicator connecting them.

```typescript
interface ConversationIndicator {
  // Visual style
  lineStyle: "solid" | "dashed" | "dotted" | "speech_waves";
  lineColor: string;
  lineWidth: number;

  // Animation
  animated: boolean;
  pulseEnabled: boolean;
  waveAnimation: boolean;           // Speech waves traveling between agents

  // Icons
  showSpeechIcon: boolean;          // 💬 icon above conversing agents
  iconStyle: "bubble" | "dots" | "waves";
}
```

```
Conversation Indicator Styles:

Style 1: Dashed Line
    🧑A ─ ─ ─ ─ ─ ─ 🧑B

Style 2: Speech Waves (animated)
    🧑A ～～～～～～ 🧑B

Style 3: Speech Bubbles
    💬              💬
    🧑A              🧑B
```

### REQ-HOVER-024: Speech Bubble Rendering

Speech bubbles SHALL be rendered with 8-bit styling.

```typescript
interface SpeechBubbleStyle {
  // Shape
  bubbleShape: "rounded" | "square" | "cloud" | "pixel";
  tailStyle: "triangle" | "curved" | "none";
  tailPosition: "bottom" | "side" | "auto";

  // Colors
  backgroundColor: string;
  borderColor: string;
  textColor: string;

  // Layout
  maxWidth: number;
  padding: number;
  borderWidth: number;

  // Text
  font: PixelFont;
  maxLines: number;
  truncateWithEllipsis: boolean;

  // Animation
  appearAnimation: "pop" | "fade" | "typewriter" | "none";
  disappearAnimation: "fade" | "pop" | "float_up" | "none";
  typewriterSpeed: number;          // Characters per second
}

const defaultSpeechBubble: SpeechBubbleStyle = {
  bubbleShape: "rounded",
  tailStyle: "triangle",
  tailPosition: "auto",

  backgroundColor: "#f5f5dc",
  borderColor: "#333333",
  textColor: "#1a1a1a",

  maxWidth: 200,
  padding: 8,
  borderWidth: 2,

  font: { name: "pixel", size: 8, characterSet: "ascii", spacing: 1 },
  maxLines: 4,
  truncateWithEllipsis: true,

  appearAnimation: "pop",
  disappearAnimation: "fade",
  typewriterSpeed: 30
};
```

### REQ-HOVER-025: Conversation Queue Display

When multiple conversations happen, they SHALL be managed visually.

```
WHEN multiple conversations are active
THEN the system SHALL:
  1. Display all active conversations with speech bubbles
  2. Stagger bubble positions to avoid overlap
  3. Prioritize nearby/selected agent conversations
  4. Optionally show conversation count indicator
  5. Allow clicking a conversation to focus on it
```

```typescript
interface ConversationQueueDisplay {
  // Active conversations
  activeConversations: Conversation[];

  // Display limits
  maxVisibleConversations: number;  // Before showing "N more..."
  maxBubblesPerConversation: number;

  // Prioritization
  prioritizeSelected: boolean;      // Selected agent's conversation on top
  prioritizeNearby: boolean;        // Camera-visible conversations first

  // Overflow indicator
  showOverflowCount: boolean;       // "+3 more conversations"
}
```

---

## Conversation History View

### REQ-HOVER-026: Conversation History Panel

The inspection panel SHALL include a full conversation history section.

```typescript
interface ConversationHistoryData {
  // All conversations this agent has participated in
  conversations: ConversationRecord[];

  // Statistics
  totalConversations: number;
  totalMessages: number;
  uniqueParticipants: number;

  // Filtering
  filterByParticipant?: EntityId;
  filterByTimeRange?: { start: Tick; end: Tick };
  searchQuery?: string;
}

interface ConversationRecord {
  id: string;
  participants: ParticipantInfo[];
  messages: ConversationMessage[];

  // Metadata
  startedAt: Tick;
  endedAt: Tick;
  duration: number;                 // In ticks

  // Location
  location: { x: number; y: number };
  locationName?: string;            // "Near the apple tree"

  // Analysis (optional, from LLM)
  summary?: string;                 // Brief summary of conversation
  topics?: string[];                // ["food", "weather", "directions"]
  sentiment?: "positive" | "neutral" | "negative";
  relationshipImpact?: number;      // How much familiarity changed
}

interface ParticipantInfo {
  entityId: EntityId;
  name: string;
  messageCount: number;
  averageSentiment?: string;
}

interface ConversationMessage {
  id: string;
  speakerId: EntityId;
  speakerName: string;
  content: string;
  timestamp: Tick;

  // Optional analysis
  sentiment?: "positive" | "neutral" | "negative" | "question" | "statement";
  intent?: string;                  // "greeting", "asking_for_info", "sharing_info"
  topics?: string[];
}
```

### REQ-HOVER-027: Conversation History Panel Layout

The history panel SHALL organize conversations chronologically with expandable details.

**Conversation History in Inspection Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  ▼ CONVERSATION HISTORY                           [Filter ▼]│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📊 Stats: 12 conversations · 47 messages · 5 agents     ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ 🔍 Search conversations...                              ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │ ▼ Agent B · 10 minutes ago · Near apple tree            ││
│  │   Duration: 2m 30s · 5 messages · 😊 Positive           ││
│  │   Topics: food, directions                              ││
│  │   ┌─────────────────────────────────────────────────┐   ││
│  │   │ Agent B: "Hello there! Nice day, isn't it?"     │   ││
│  │   │ Wanderer: "Yes, the weather is quite pleasant." │   ││
│  │   │ Agent B: "Have you found any good food?"        │   ││
│  │   │ Wanderer: "There's an apple tree to the east."  │   ││
│  │   │ Agent B: "Thanks! I'll check it out."           │   ││
│  │   └─────────────────────────────────────────────────┘   ││
│  │                                                         ││
│  │ ▶ Agent C · 3 hours ago · By the river                  ││
│  │   Duration: 45s · 2 messages · 😐 Neutral               ││
│  │   Topics: greeting                                      ││
│  │                                                         ││
│  │ ▶ Agent B · 1 day ago · Village center                  ││
│  │   Duration: 5m 12s · 12 messages · 😊 Positive          ││
│  │   Topics: weather, community, plans                     ││
│  │                                                         ││
│  │ ▶ Agent D · 2 days ago · Forest edge                    ││
│  │   Duration: 1m 5s · 3 messages · 😟 Negative            ││
│  │   Topics: warning, danger                               ││
│  │                                                         ││
│  │                                        [Load more ▼]    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-028: Conversation Detail View

Clicking a conversation SHALL expand to show full details.

**Expanded Conversation View:**
```
┌─────────────────────────────────────────────────────────────┐
│  CONVERSATION WITH AGENT B                        [← Back] │
│  10 minutes ago · Near apple tree · 2m 30s                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Location: (45, -12) Near Apple Tree                     │
│  👥 Participants: Wanderer, Agent B                         │
│  📊 Sentiment: Positive (+15 relationship)                  │
│  🏷️  Topics: food, directions, gratitude                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      10:32 AM                           ││
│  │                                                         ││
│  │  ┌──────────────────────────────────────┐               ││
│  │  │ Agent B                              │               ││
│  │  │ Hello there! Nice day, isn't it?     │               ││
│  │  │                          [greeting]  │               ││
│  │  └──────────────────────────────────────┘               ││
│  │                                                         ││
│  │               ┌──────────────────────────────────────┐  ││
│  │               │                           Wanderer   │  ││
│  │               │ Yes, the weather is quite pleasant.  │  ││
│  │               │ [agreement]                          │  ││
│  │               └──────────────────────────────────────┘  ││
│  │                                                         ││
│  │  ┌──────────────────────────────────────┐               ││
│  │  │ Agent B                              │               ││
│  │  │ Have you found any good food         │               ││
│  │  │ sources lately?                      │               ││
│  │  │                          [question]  │               ││
│  │  └──────────────────────────────────────┘               ││
│  │                                                         ││
│  │               ┌──────────────────────────────────────┐  ││
│  │               │                           Wanderer   │  ││
│  │               │ There's an apple tree to the east.   │  ││
│  │               │ It has plenty of food right now.     │  ││
│  │               │ [sharing_info]                       │  ││
│  │               └──────────────────────────────────────┘  ││
│  │                                                         ││
│  │  ┌──────────────────────────────────────┐               ││
│  │  │ Agent B                              │               ││
│  │  │ Thanks! I'll check it out.           │               ││
│  │  │                          [gratitude] │               ││
│  │  └──────────────────────────────────────┘               ││
│  │                                                         ││
│  │                      10:34 AM                           ││
│  │               [Conversation ended]                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [📋 Copy] [📤 Export] [🔍 Find Agent B] [📍 Go to Location]│
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-029: Conversation Filtering and Search

Users SHALL be able to filter and search conversation history.

```typescript
interface ConversationFilters {
  // Filter options
  participant: EntityId | "all";
  timeRange: "last_hour" | "today" | "last_week" | "all_time" | "custom";
  customTimeRange?: { start: Tick; end: Tick };

  sentiment: "positive" | "neutral" | "negative" | "all";
  minMessages: number;
  hasTopics: string[];              // Must include these topics

  // Search
  searchQuery: string;              // Full-text search in messages
  searchMode: "content" | "participant" | "topic" | "all";

  // Sort
  sortBy: "recent" | "oldest" | "longest" | "most_messages";
}

interface ConversationSearchResult {
  conversation: ConversationRecord;
  matchingMessages: ConversationMessage[];
  highlightedContent: string;       // With search term highlighted
  relevanceScore: number;
}
```

**Filter Dropdown:**
```
┌─────────────────────────────┐
│ Filter Conversations    [X] │
├─────────────────────────────┤
│ Participant:                │
│ [All Agents           ▼]    │
│                             │
│ Time Range:                 │
│ [Last 24 hours        ▼]    │
│                             │
│ Sentiment:                  │
│ ○ All  ● Positive           │
│ ○ Neutral  ○ Negative       │
│                             │
│ Topics:                     │
│ [food] [weather] [+Add]     │
│                             │
│ Min Messages: [2    ]       │
│                             │
│ Sort By:                    │
│ [Most Recent          ▼]    │
│                             │
│ [Apply] [Reset]             │
└─────────────────────────────┘
```

### REQ-HOVER-030: Conversation Timeline View

An optional timeline view SHALL visualize conversation patterns.

```typescript
interface ConversationTimelineView {
  // Timeline data
  timeRange: { start: Tick; end: Tick };
  conversations: ConversationTimelineEntry[];

  // Display options
  groupByDay: boolean;
  showParticipantLanes: boolean;    // Swim lanes per agent
  showSentimentColors: boolean;

  // Interaction
  zoomLevel: number;
  selectedConversation: string | null;
}

interface ConversationTimelineEntry {
  conversationId: string;
  participants: string[];
  startTick: Tick;
  endTick: Tick;
  messageCount: number;
  sentiment: string;
}
```

**Timeline Visualization:**
```
┌─────────────────────────────────────────────────────────────┐
│  CONVERSATION TIMELINE                          [Day ▼] [+] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Today                                                      │
│  ├─ 6 AM ─┼─ 9 AM ─┼─ 12 PM ─┼─ 3 PM ─┼─ 6 PM ─┼─ 9 PM ─┤  │
│  │        │        │         │        │        │         │  │
│  │Agent B │   ████ │         │  ██    │        │   ███   │  │
│  │Agent C │        │    █    │        │        │         │  │
│  │Agent D │        │         │        │  █     │         │  │
│  │                                                       │  │
│  Yesterday                                                  │
│  ├─ 6 AM ─┼─ 9 AM ─┼─ 12 PM ─┼─ 3 PM ─┼─ 6 PM ─┼─ 9 PM ─┤  │
│  │Agent B │        │  ██████ │        │ ████   │         │  │
│  │Agent D │ █      │         │        │        │         │  │
│  │                                                       │  │
│  Legend: █ Positive  █ Neutral  █ Negative               │  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-031: Relationship Context in Conversations

Conversations SHALL show relationship context and impact.

```typescript
interface ConversationRelationshipContext {
  // Before conversation
  preConversation: {
    familiarity: number;
    sentiment: number;
    relationshipType: string;
    interactionCount: number;
  };

  // After conversation
  postConversation: {
    familiarity: number;
    sentiment: number;
    relationshipType: string;
    interactionCount: number;
  };

  // Changes
  familiarityDelta: number;
  sentimentDelta: number;
  relationshipChanged: boolean;     // e.g., stranger → acquaintance
}
```

**Relationship Impact Display:**
```
┌─────────────────────────────────────────────────────────────┐
│  RELATIONSHIP IMPACT                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Before → After                                             │
│                                                             │
│  Familiarity: 45 → 52  (+7)  ████████████░░░░░░░░           │
│  Sentiment:   +5 → +12 (+7)  ─────────────●─────────        │
│                              hostile    neutral   friendly  │
│                                                             │
│  Status: Acquaintance (unchanged)                           │
│  Interactions: 4 → 5                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Voice of God: Thought Injection

### REQ-HOVER-032: Divine Thought Injection

The player SHALL be able to inject a single thought into a selected agent's mind.

```typescript
interface VoiceOfGodSystem {
  // Target
  targetAgent: EntityId | null;

  // Input state
  inputMode: "inactive" | "composing" | "sending";
  currentThought: string;
  maxThoughtLength: number;         // e.g., 280 characters

  // Delivery
  deliverThought(agentId: EntityId, thought: string): void;

  // History
  injectedThoughts: InjectedThought[];
}

interface InjectedThought {
  id: string;
  agentId: EntityId;
  agentName: string;
  thought: string;
  injectedAt: Tick;

  // Agent's response (captured after processing)
  agentIntegration?: {
    acknowledged: boolean;
    internalResponse?: string;      // How the agent interpreted it
    behaviorChange?: string;        // What action resulted
    timestamp: Tick;
  };
}
```

### REQ-HOVER-033: Thought Injection Interface

The UI SHALL provide a way to compose and inject thoughts.

```
WHEN player has an agent selected
AND player presses designated key (e.g., 'T' for Thought, or 'G' for God)
THEN the system SHALL:
  1. Open thought injection input overlay
  2. Show the target agent's name
  3. Accept single-line text input
  4. On Enter, inject thought into agent's next think cycle
  5. On Escape, cancel without injecting
```

**Thought Injection Input:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      [Game World View]                      │
│                                                             │
│                         ╭───╮                               │
│                         │🧑 │ ← Selected Agent              │
│                         ╰───╯                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 💭 Inject thought into WANDERER's mind:                 ││
│  │                                                         ││
│  │ > There might be danger to the north...█                ││
│  │                                                         ││
│  │                              [Enter to send] [Esc cancel]││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-034: Thought Processing

Injected thoughts SHALL be presented as clearly external - NOT the agent's own thought, but of unknown origin.

```typescript
interface ThoughtInjectionContext {
  // The injected thought appears as:
  // - Clearly NOT the agent's own thought
  // - Source is unknown/mysterious to the agent
  // - Agent must decide how to interpret and respond

  // How it's presented to the LLM:
  presentation: "external_unknown_source";

  // Example context for LLM:
  // "A thought that is clearly not your own enters your mind. You don't
  //  know where it came from - it simply appeared. The thought is:
  //  '{thought}'
  //  How do you interpret this? What do you do with it?"

  // Processing behavior
  injectionPoint: "before_think" | "during_think";
  forceAcknowledge: boolean;        // Agent must respond to it
  allowIgnore: boolean;             // Agent can dismiss/reject it
}
```

**How the Agent Receives It:**
```
Agent's Internal Monologue / Think Cycle:

[Normal context: hunger at 42%, energy at 80%, near apple tree...]

[EXTERNAL THOUGHT - SOURCE UNKNOWN]
A thought that is clearly not your own appears in your mind:
"There might be danger to the north..."

You don't know where this came from. It's not your thought.
How do you interpret this? What will you do?

Agent must now decide how to integrate this foreign thought:
- "This thought... it's not mine. But it feels urgent somehow.
   Perhaps it's a warning? I can't explain it, but I'll be
   cautious about the north for now."
- OR: "A strange thought appeared in my mind, but it's not mine
   and I see no evidence of danger. I'll note it but continue
   with my plan. Perhaps I'm just tired."
- OR: "What was that? Some kind of... premonition? Divine
   intervention? I don't understand, but I should pay attention..."
```

**Agent Interpretation Options:**
The agent may interpret the external thought as:
- A warning or omen
- Divine/supernatural intervention
- Instinct they can't explain
- Random noise to be dismissed
- Something to investigate
- A sign they should trust or distrust

The key is the agent KNOWS it's not their thought, but must decide what to make of it.

### REQ-HOVER-035: Thought Injection Feedback

The player SHALL see feedback on how the agent processed the thought.

```
AFTER thought is injected
THEN the system SHALL:
  1. Show brief visual effect on agent (💭 bubble or glow)
  2. Log the injection in the agent's inspection panel
  3. After agent's next think cycle, show how they integrated it
  4. Optionally highlight resulting behavior changes
```

**Thought Injection Log (in Inspection Panel):**
```
┌─────────────────────────────────────────────────────────────┐
│  ▼ DIVINE INTERVENTIONS                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │ 💭 2 minutes ago                                        ││
│  │ Injected: "There might be danger to the north..."       ││
│  │                                                         ││
│  │ Agent's Integration:                                    ││
│  │ "I sense I should be cautious about the north.          ││
│  │  I'll stick to the eastern areas for now."              ││
│  │                                                         ││
│  │ Result: Changed planned path, avoiding north            ││
│  │                                                         ││
│  │ ─────────────────────────────────────────────────────── ││
│  │                                                         ││
│  │ 💭 1 hour ago                                           ││
│  │ Injected: "Agent B seems trustworthy"                   ││
│  │                                                         ││
│  │ Agent's Integration:                                    ││
│  │ "Something tells me Agent B is someone I can trust.     ││
│  │  I should try talking to them more."                    ││
│  │                                                         ││
│  │ Result: Sought out Agent B, +10 familiarity bonus       ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### REQ-HOVER-036: Injection Visualization

The injection SHALL have a visual effect in the world.

```typescript
interface ThoughtInjectionVisual {
  // Entry effect
  entryAnimation: "descend" | "fade_in" | "ripple" | "divine_light";

  // Bubble style
  bubbleStyle: "thought_cloud" | "divine_glow" | "subtle_shimmer";
  bubbleColor: string;              // Different from normal speech

  // Duration
  displayDuration: number;          // How long visual persists
  fadeOutDuration: number;

  // Agent reaction
  showAgentReaction: boolean;       // Brief "..." or "?" above agent
  reactionDelay: number;
}
```

**Visual Effect:**
```
                    ✦ ✦ ✦
                  ✦       ✦
                ┌───────────────┐
                │ There might   │
                │ be danger to  │
                │ the north...  │
                └───────┬───────┘
                    ○ ○ ○
                      ╭───╮
                      │🧑 │  ...?
                      ╰───╯

(Thought descends from above, agent shows brief puzzlement)
```

### REQ-HOVER-037: Injection Settings

The player SHALL be able to configure thought injection behavior.

```typescript
interface ThoughtInjectionSettings {
  // Keybinding
  activationKey: string;            // Default: 'T' or 'G'

  // Formatting
  thoughtFormat: "unlabeled" | "mysterious" | "intuition";
  maxLength: number;

  // Agent behavior
  agentMustAcknowledge: boolean;    // Force response in think cycle
  showIntegrationFeedback: boolean; // Show how agent processed it

  // Visuals
  showInjectionAnimation: boolean;
  animationStyle: string;

  // Limits (optional, for game balance)
  cooldownSeconds: number;          // Time between injections
  maxPerDay: number;                // Max injections per game day
}
```

---

## Component Integration

### REQ-HOVER-012: Hoverable Component

Entities that support hover info SHALL have a `hoverable` component.

```typescript
interface HoverableComponent extends Component {
  type: "hoverable";

  // Display name (overrides inferred name)
  displayName?: string;

  // Description (additional context)
  description?: string;

  // What info to show
  showNeeds: boolean;
  showResource: boolean;
  showBehavior: boolean;
  showConversation: boolean;

  // Priority (for overlapping entities)
  hoverPriority: number;

  // Custom tooltip builder (optional)
  customTooltip?: (entity: Entity) => TooltipContent;
}
```

### REQ-HOVER-013: Tooltip Content Builder

The system SHALL build tooltip content from entity components.

```typescript
interface TooltipContentBuilder {
  // Build from entity
  buildEntityTooltip(entity: Entity): TooltipContent;

  // Build from tile
  buildTileTooltip(tile: Tile, tileX: number, tileY: number): TooltipContent;

  // Content structure
  interface TooltipContent {
    header: string;
    subheader?: string;
    sections: TooltipSection[];
  }

  interface TooltipSection {
    type: "text" | "bar" | "list" | "divider";
    content: TextContent | BarContent | ListContent | null;
  }

  interface BarContent {
    label: string;
    value: number;
    max: number;
    barType: string;      // For color lookup
    showWarning: boolean;
  }
}
```

---

## Configuration

### REQ-HOVER-014: User Settings

The hover system SHALL respect user preferences.

```typescript
interface HoverSettings {
  // Enable/disable
  tooltipsEnabled: boolean;

  // Timing
  showDelay: number;              // 0 for instant

  // Content verbosity
  verbosity: "minimal" | "normal" | "detailed";

  // Show coordinates
  showCoordinates: boolean;

  // Show on touch (mobile)
  touchHoldDuration: number;      // ms to trigger tooltip
}
```

**Verbosity Levels:**
- **Minimal:** Name only, critical warnings
- **Normal:** Name, type, key stats (hunger, resource amount)
- **Detailed:** All available info including coordinates, regeneration rates, behavior details

---

## Performance

### REQ-HOVER-015: Optimization

The hover system SHALL be performant.

```
Performance Constraints:
- Hit detection: < 1ms per frame
- Tooltip render: < 2ms per frame
- No allocations during hover tracking (reuse HoverState object)
- Entity query should use spatial index (chunk-based)
- Cache tooltip content until hover target changes
```

```typescript
interface HoverPerformance {
  // Cached state
  cachedHoverState: HoverState;
  cachedTooltipContent: TooltipContent | null;

  // Dirty tracking
  isHoverDirty: boolean;
  lastUpdateFrame: number;

  // Throttling
  updateThrottleMs: number;       // Min time between hover updates (16ms = 60fps)
}
```

---

## Implementation Phases

### Phase 1: Basic Infrastructure
- Add mouse tracking to InputHandler
- Implement screen-to-world coordinate conversion (use existing Camera methods)
- Add HoverState management
- Add click detection and SelectionState management

### Phase 2: Tile Hover
- Implement tile hit detection
- Create TileHoverInfo builder
- Render basic tile tooltip (terrain type, coordinates)

### Phase 3: Entity Hover
- Implement entity hit detection with bounding boxes
- Create entity tooltip builders for existing entity types (Tree, Rock, Agent)
- Add hover highlighting

### Phase 4: Click-to-Inspect Panel
- Implement agent selection on click
- Create AgentInspectionData builder from entity components
- Build inspection panel UI (collapsible sections)
- Add selection indicator rendering
- Implement real-time panel updates

### Phase 5: Panel Features
- Add panel interaction controls (follow, pin, move)
- Implement keyboard shortcuts
- Add memory and relationship visualization
- Export functionality (copy JSON, export logs)

### Phase 6: Live Conversation UI
- Implement speech bubble rendering with 8-bit style
- Add conversation indicator lines between conversing agents
- Support typewriter animation for message display
- Handle multiple simultaneous conversations
- Add dialogue box overlay mode as alternative

### Phase 7: Conversation History
- Build conversation history section in inspection panel
- Implement ConversationRecord data structure and storage
- Create expandable conversation detail view
- Add message-by-message chat-style layout
- Show relationship impact per conversation

### Phase 8: History Features
- Implement conversation filtering (participant, time, sentiment, topics)
- Add full-text search across conversation content
- Build conversation timeline visualization
- Add conversation export functionality

### Phase 9: Voice of God
- Implement thought injection input UI
- Integrate with agent think cycle (inject external thought context)
- Add visual effect for thought injection (descend animation)
- Capture and display agent's interpretation/response
- Build "Divine Interventions" log section in inspection panel
- Add injection history tracking

### Phase 10: Polish
- Add hover delay and fade animations
- Implement smart tooltip positioning
- Add user settings for verbosity and timing
- Panel resize and position persistence
- Speech bubble positioning to avoid overlap
- Optimize performance

---

## Open Questions

1. Support for selecting and inspecting multiple agents simultaneously?
2. Should clicking a relationship entry in the panel select that other agent?
3. Keyboard shortcut to cycle through all agents (Tab)?
4. Mobile/touch support via tap-and-hold for hover, double-tap for inspect?
5. Should the panel show a mini-map with agent's recent path?
6. Graph visualization for relationship networks?
7. Should agents have a "thinking" log showing LLM reasoning (debug mode)?
8. Compare mode: side-by-side panels for two agents?
9. Should speech bubbles persist or auto-hide after conversation ends?
10. Group conversation support (3+ agents talking)?
11. Should clicking a speech bubble open that agent's inspection panel?
12. Conversation replay mode to watch past conversations animate?
13. Auto-summarize long conversations with LLM?
14. Notification when selected agent starts a new conversation?
15. Global conversation log view (all conversations, not just one agent)?
16. Can agents discuss the mysterious thoughts with other agents?
17. Do agents develop patterns in how they interpret divine thoughts over time?
18. Should there be different "tones" for injected thoughts (urgent, calm, cryptic)?
19. Can multiple thoughts be queued, or only one at a time?
20. Should agents remember past injections and reference them later?
21. Voice of God for multiple agents at once (broadcast thought)?

---

## Related Specs

**Core Integration:**
- `rendering-system/spec.md` - UI rendering, camera system
- `agent-system/needs.md` - Agent needs display in tooltips

**World Systems:**
- `world-system/spec.md` - Tile and chunk structure
- `world-system/procedural-generation.md` - Terrain types and biomes

**Entity Systems:**
- `items-system/spec.md` - Item entities and resources
- `agent-system/spec.md` - Agent components and behavior

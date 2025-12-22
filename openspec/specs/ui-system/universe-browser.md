# Universe Browser UI Specification

## Overview

The Universe Browser provides interfaces for managing universes, browsing planets, discovering portals, and handling multiplayer connections. Accessed from the Nexus Hub, it enables players to create custom universes, travel between planets, and visit friends' worlds.

## Version

0.1.0

## Dependencies

- `universe-system/spec.md` - Universe, Planet, Portal definitions
- `nexus-system/spec.md` - Meta-game navigation
- `ui-system/nexus-hub.md` - Nexus Hub integration
- `ui-system/notifications.md` - Portal and visit notifications

## Requirements

### REQ-UNIV-001: Universe Selection Panel
- **Description**: Browse and select universes to enter
- **Priority**: MUST

```typescript
// Re-export from universe-system for reference
import type {
  Universe, UniverseRules, UniverseGenerationStyle,
  Planet, PlanetTheme,
  PlanetPortal, UniversePortal,
  PortalResearchProgression,
  Player, PlayerLocation, VisitorPolicy, VisitSession
} from "universe-system/spec";

interface UniverseSelectionPanel {
  isOpen: boolean;

  // Player's universes
  ownedUniverses: UniverseDisplayInfo[];
  currentUniverse: UniverseDisplayInfo | null;

  // Friend universes (accessible via multiplayer)
  friendUniverses: FriendUniverseEntry[];

  // Template universes for new creation
  universeTemplates: UniverseTemplate[];

  // Selection
  selectedUniverse: UniverseDisplayInfo | null;

  // Methods
  open(): void;
  close(): void;
  selectUniverse(universeId: string): void;
  enterUniverse(universeId: string): void;
  createNewUniverse(): void;
}

// UI display wrapper for Universe from universe-system
interface UniverseDisplayInfo {
  universe: Universe;  // From universe-system

  // Computed display properties
  displayName: string;
  description: string;
  icon: Sprite;
  thumbnail: Sprite;  // Preview image

  // From Universe
  rulesSummary: RulesSummaryDisplay;
  planetCount: number;       // universe.planets.length
  isPublic: boolean;         // universe.isPublic
  ownerId: string;           // universe.ownerId

  // Portal status
  discoveredPortalCount: number;  // universe.discoveredPortals.length
  portalResearchTier: number;     // universe.portalDiscoveryTier
}

interface RulesSummaryDisplay {
  rules: UniverseRules;  // From universe-system

  // Computed display strings
  magicDescription: string;      // "High Magic" from magicLevel
  techDescription: string;       // "Medieval Tech" from techLevel
  aestheticLabel: string;        // From generationStyle.aestheticFamily
  summaryText: string;           // One-line summary
}

// Universe template for creation
interface UniverseTemplate {
  id: string;
  name: string;                   // "Arcane Realms", "Frontier Worlds"
  description: string;
  defaultRules: UniverseRules;    // From universe-system
  defaultStyle: UniverseGenerationStyle;  // From universe-system
  examplePlanets: string[];
  thumbnail: Sprite;
  icon: Sprite;
}
```

### REQ-UNIV-002: Universe Creation Panel
- **Description**: Create and customize new universes
- **Priority**: MUST

```typescript
interface UniverseCreationPanel {
  isOpen: boolean;
  step: CreationStep;

  // Template selection
  selectedTemplate: UniverseTemplate | null;

  // Customization
  customization: UniverseCustomization;

  // Validation
  isValid: boolean;
  validationErrors: string[];

  // Preview
  generatedPreview: UniversePreview | null;

  // Methods
  open(): void;
  close(): void;
  selectTemplate(templateId: string): void;
  nextStep(): void;
  previousStep(): void;
  createUniverse(): Promise<Universe>;
}

type CreationStep =
  | "template_selection"
  | "rule_customization"
  | "aesthetic_customization"
  | "naming"
  | "confirmation";

// Customization being built
interface UniverseCustomization {
  // Basic info
  name: string;
  description: string;

  // Rules (from UniverseRules in universe-system)
  magicEnabled: boolean;
  magicLevel: "none" | "low" | "medium" | "high" | "dominant";
  techEnabled: boolean;
  techLevel: "primitive" | "medieval" | "industrial" | "digital" | "futuristic";

  // Style (from UniverseGenerationStyle in universe-system)
  aestheticFamily: "fantasy" | "scifi" | "realistic" | "surreal";
  nameLanguageHints: string[];
  colorPaletteFamily: string;
  architectureStyle: string;

  // Privacy
  isPublic: boolean;
  accessList: string[];
}

interface UniversePreview {
  // Generated preview data
  samplePlanetNames: string[];
  sampleItemNames: string[];
  colorPalette: Color[];
  architectureStyle: string;
  previewThumbnail: Sprite;
}
```

**Universe Creation Layout:**
```
+-----------------------------------------------------------------------------+
|  CREATE NEW UNIVERSE                                           [X]          |
+-----------------------------------------------------------------------------+
|  Step 2 of 5: Customize Rules                                               |
+-----------------------------------------------------------------------------+
|                                                                             |
|  MAGIC SETTINGS                        TECHNOLOGY SETTINGS                  |
|  +-----------------------+             +-----------------------+            |
|  | [O] Enabled           |             | [O] Enabled           |            |
|  |                       |             |                       |            |
|  | Level:                |             | Level:                |            |
|  | None [===|========] High            | Primitive [====|===] Future       |
|  |                       |             |                       |            |
|  | Current: Medium       |             | Current: Industrial   |            |
|  +-----------------------+             +-----------------------+            |
|                                                                             |
|  COMPATIBILITY PREVIEW                                                      |
|  +---------------------------------------------------------------------+    |
|  | This universe supports:                                             |    |
|  | [v] Magical items, enchantments, spellcasting                      |    |
|  | [v] Mechanical devices, steam power, clockwork                     |    |
|  | [x] Electronic devices, computers, AI                               |    |
|  | [x] Futuristic technology, space travel                            |    |
|  +---------------------------------------------------------------------+    |
|                                                                             |
+-----------------------------------------------------------------------------+
|                                              [< Previous] [Next >]          |
+-----------------------------------------------------------------------------+
```

### REQ-UNIV-003: Planet Browser
- **Description**: Browse planets within a universe and view portal connections
- **Priority**: MUST

```typescript
interface PlanetBrowser {
  isOpen: boolean;

  // Current universe
  universe: UniverseDisplayInfo;

  // Planets in universe
  planets: PlanetDisplayInfo[];

  // View mode
  viewMode: "list" | "map" | "graph";

  // Selection
  selectedPlanet: PlanetDisplayInfo | null;

  // Filtering
  filterByBiome: BiomeType | null;
  filterByTheme: string | null;
  searchQuery: string;

  // Methods
  selectPlanet(planetId: string): void;
  travelToPlanet(planetId: string): void;
  showPortals(planetId: string): void;
}

// UI display wrapper for Planet from universe-system
interface PlanetDisplayInfo {
  planet: Planet;  // From universe-system

  // Computed display properties
  displayName: string;
  description: string;
  thumbnail: Sprite;
  icon: Sprite;

  // From Planet
  theme: PlanetTheme;           // planet.theme
  biome: BiomeType;             // planet.biome
  climate: ClimateType;         // planet.climate

  // Status
  villageCount: number;         // planet.villages.length
  discoveredAreas: number;      // planet.discoveredAreas.length
  isCurrentPlanet: boolean;

  // Portals from planet
  portalsToPlanets: PlanetPortalDisplay[];
  portalsToUniverses: UniversePortalDisplay[];
}

// Portal graph visualization
interface PortalGraphView {
  planets: PlanetNode[];
  connections: PortalEdge[];

  // Layout
  layout: "force" | "radial" | "tree";

  // Current planet highlighted
  currentPlanetId: string;

  // Interaction
  hoveredPlanet: PlanetNode | null;
  selectedPortal: PortalEdge | null;

  render(ctx: CanvasRenderingContext2D): void;
}

interface PlanetNode {
  planet: PlanetDisplayInfo;
  position: Vector2;
  size: number;                  // Based on importance/size
  isDiscovered: boolean;
  isAccessible: boolean;         // Have portal to it
}

interface PortalEdge {
  fromPlanetId: string;
  toPlanetId: string;
  portal: PlanetPortal;         // From universe-system

  // Visual
  lineColor: Color;
  lineWidth: number;
  isActivated: boolean;
  isBidirectional: boolean;
}
```

**Planet Browser Layout:**
```
+-----------------------------------------------------------------------------+
|  PLANETS OF ARCANE REALMS                              [Map View] [X]       |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-----------------------------------+   +-------------------------------+  |
|  |                                   |   | FOREST VILLAGE                |  |
|  |    [Crystal     [Mountain         |   | "Enchanted woodland realm"    |  |
|  |     Caverns]     Hold]            |   |                               |  |
|  |        \         /                |   | Theme: Mystical Forest        |  |
|  |         \       /                 |   | Biome: Temperate Forest       |  |
|  |          [FOREST                  |   | Climate: Mild                 |  |
|  |          VILLAGE]  <- YOU ARE HERE|   |                               |  |
|  |          /      \                 |   | Villages: 3                   |  |
|  |         /        \                |   | Areas Discovered: 12/20       |  |
|  |    [Feudal    [River              |   |                               |  |
|  |     Grove]    Delta]              |   | PORTALS:                      |  |
|  |        \        /                 |   | -> Crystal Caverns [ACTIVE]   |  |
|  |         [Coastal                  |   | -> Mountain Hold [LOCKED]     |  |
|  |          Haven]                   |   | -> Feudal Grove [ACTIVE]      |  |
|  |                                   |   |                               |  |
|  +-----------------------------------+   | [Travel Here] [View Details]  |  |
|                                          +-------------------------------+  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### REQ-UNIV-004: Portal Management
- **Description**: View and manage discovered portals
- **Priority**: MUST

```typescript
interface PortalManagement {
  isOpen: boolean;

  // Portals by type
  planetPortals: PlanetPortalDisplay[];
  universePortals: UniversePortalDisplay[];

  // Research progression (from universe-system)
  researchProgression: PortalResearchDisplay;

  // Selection
  selectedPortal: PlanetPortalDisplay | UniversePortalDisplay | null;

  // Filtering
  filterByStatus: "all" | "active" | "inactive" | "locked";
  filterByDestination: string | null;

  // Methods
  selectPortal(portalId: string): void;
  activatePortal(portalId: string): Promise<boolean>;
  usePortal(portalId: string): Promise<boolean>;
}

// UI display wrapper for PlanetPortal from universe-system
interface PlanetPortalDisplay {
  portal: PlanetPortal;         // From universe-system

  // Computed display properties
  fromPlanetName: string;
  toPlanetName: string;
  statusLabel: PortalStatusLabel;

  // From PlanetPortal
  discovered: boolean;          // portal.discovered
  activated: boolean;           // portal.activated
  bidirectional: boolean;       // portal.bidirectional

  // Cost display
  activationCostDisplay: ItemCostDisplay[];
  usageCostDisplay: ItemCostDisplay[];
  cooldownRemaining: number | null;  // Ticks until usable
}

// UI display wrapper for UniversePortal from universe-system
interface UniversePortalDisplay {
  portal: UniversePortal;       // From universe-system

  // Computed display properties
  fromUniverseName: string;
  toUniverseName: string;
  tierLabel: string;            // "Nascent", "Stable", "Ancient"
  stabilityFormatted: string;   // "75% Stable"

  // From UniversePortal
  stability: number;            // portal.stability
  bidirectional: boolean;       // portal.bidirectional
  allowsItems: boolean;         // portal.allowsItems
  allowsAgents: boolean;        // portal.allowsAgents

  // For multiplayer portals
  isPlayerLink: boolean;        // portal.isPlayerLink
  linkedPlayerName: string | null;
}

type PortalStatusLabel =
  | "active"                    // Discovered and activated
  | "inactive"                  // Discovered but not activated
  | "locked"                    // Not yet discovered
  | "cooldown";                 // Activated but on cooldown

interface ItemCostDisplay {
  itemId: string;
  itemName: string;
  icon: Sprite;
  required: number;
  available: number;
  isMet: boolean;
}

// Display for PortalResearchProgression from universe-system
interface PortalResearchDisplay {
  progression: PortalResearchProgression;  // From universe-system
  currentTier: number;

  // Per-tier display
  tiers: PortalResearchTierDisplay[];
}

interface PortalResearchTierDisplay {
  tier: number;
  name: string;                  // "Spatial Anomalies", etc.
  description: string;
  unlocksDescription: string[];  // What this tier enables
  status: "locked" | "in_progress" | "completed";
  progressRatio: number;         // 0-1 if in progress
}
```

### REQ-UNIV-005: Multiplayer Panel
- **Description**: Manage friends and universe visiting
- **Priority**: SHOULD

```typescript
interface MultiplayerPanel {
  isOpen: boolean;

  // Friends list (from Player in universe-system)
  friends: FriendDisplayInfo[];
  pendingInvites: InviteDisplayInfo[];

  // Current visits
  activeVisitSessions: VisitSessionDisplay[];
  visitorsInMyUniverse: VisitorDisplayInfo[];

  // Selection
  selectedFriend: FriendDisplayInfo | null;

  // Methods
  selectFriend(playerId: string): void;
  sendFriendRequest(playerId: string): void;
  acceptInvite(inviteId: string): void;
  declineInvite(inviteId: string): void;
  visitFriendUniverse(playerId: string): void;
  inviteFriend(playerId: string): void;
  kickVisitor(sessionId: string): void;
}

// UI display wrapper for friend data
interface FriendDisplayInfo {
  playerId: string;
  displayName: string;
  portrait: Sprite;

  // Status
  isOnline: boolean;
  lastSeen: Date | null;

  // Location (from PlayerLocation in universe-system)
  currentLocation: PlayerLocation | null;
  locationDescription: string;     // "In Arcane Realms - Forest Village"

  // Their universes
  publicUniverses: UniverseDisplayInfo[];
  canVisit: boolean;
}

// Friend universe entry in selection panel
interface FriendUniverseEntry {
  friend: FriendDisplayInfo;
  universe: UniverseDisplayInfo;
  visitorPolicy: VisitorPolicy;    // From universe-system
  canVisitNow: boolean;
  accessReason: string | null;     // Why you can/can't visit
}

// UI display wrapper for VisitSession from universe-system
interface VisitSessionDisplay {
  session: VisitSession;           // From universe-system

  // Display properties
  visitorName: string;
  hostName: string;
  universeName: string;
  duration: number;                // Minutes since started

  // From VisitSession
  status: "pending" | "active" | "ended";
  itemsBroughtCount: number;
  itemsTakenCount: number;
}

// Visitor currently in my universe
interface VisitorDisplayInfo {
  playerId: string;
  displayName: string;
  portrait: Sprite;
  session: VisitSessionDisplay;

  // What they're doing
  currentLocation: Position;
  currentActivity: string;
}

// Invite display
interface InviteDisplayInfo {
  inviteId: string;
  fromPlayer: string;
  fromPlayerName: string;
  inviteType: "friend_request" | "visit_invite" | "universe_share";
  message: string | null;
  sentAt: Date;
}
```

**Multiplayer Panel Layout:**
```
+-----------------------------------------------------------------------------+
|  MULTIPLAYER HUB                                                  [X]       |
+-----------------------------------------------------------------------------+
|                                                                             |
|  FRIENDS (12)                            VISITORS IN MY UNIVERSE (2)        |
|  +-------------------------------+       +-------------------------------+  |
|  | [Portrait] Alice              |       | [Portrait] Bob                |  |
|  |   O Online                    |       |   In: Forest Village          |  |
|  |   In: Frontier Worlds         |       |   Duration: 45 min            |  |
|  |   [Visit] [Invite]            |       |   [View] [Kick]               |  |
|  |                               |       |                               |  |
|  | [Portrait] Charlie            |       | [Portrait] Diana              |  |
|  |   O Online                    |       |   In: Crystal Caverns         |  |
|  |   In: Dream Dimensions        |       |   Duration: 12 min            |  |
|  |   [Visit] [Invite]            |       |   [View] [Kick]               |  |
|  |                               |       +-------------------------------+  |
|  | [Portrait] Eve                |                                          |
|  |   . Offline                   |       PENDING INVITES (1)                |
|  |   Last seen: 2 days ago       |       +-------------------------------+  |
|  |   [View Universes]            |       | Frank wants to visit you      |  |
|  +-------------------------------+       | [Accept] [Decline]            |  |
|                                          +-------------------------------+  |
|                                                                             |
|  VISITOR POLICY                                                             |
|  +---------------------------------------------------------------------+    |
|  | [v] Allow Visitors                  Max Visitors: [3 v]             |    |
|  | [v] Visitors Can Trade              [ ] Require Approval            |    |
|  | [ ] Visitors Can Harvest            [ ] Visitors Can Build          |    |
|  +---------------------------------------------------------------------+    |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### REQ-UNIV-006: Planet Details Panel
- **Description**: Detailed view of a specific planet
- **Priority**: SHOULD

```typescript
interface PlanetDetailsPanel {
  isOpen: boolean;
  planet: PlanetDisplayInfo | null;

  // Sections
  showOverview: boolean;
  showVillages: boolean;
  showPortals: boolean;
  showNativeItems: boolean;

  // Methods
  openForPlanet(planetId: string): void;
  close(): void;
  travelToPlanet(): void;
}

interface PlanetOverview {
  planet: Planet;                // From universe-system

  // Theme display
  theme: PlanetTheme;            // planet.theme
  themeKeywords: string[];       // theme.keywords
  dominantColors: Color[];       // theme.dominantColors

  // Climate and biome
  biomeDescription: string;
  climateDescription: string;

  // Status
  villageCount: number;
  totalPopulation: number;       // Sum of village populations
  discoveryProgress: number;     // Percentage of areas discovered
}

interface NativeItemsDisplay {
  planet: Planet;

  // Items native to this planet
  nativeItems: NativeItemPreview[];
  nativeCrops: NativeItemPreview[];

  // Generated items discovered on this planet
  generatedItems: NativeItemPreview[];
}

interface NativeItemPreview {
  itemId: string;
  displayName: string;
  icon: Sprite;
  description: string;
  tier: number;
  isPlanetExclusive: boolean;    // Can only be found here
}
```

### REQ-UNIV-007: Keyboard Shortcuts
- **Description**: Quick access for universe browser
- **Priority**: SHOULD

```typescript
interface UniverseBrowserShortcuts {
  // Window
  toggleBrowser: string;         // Default: "U"
  closeBrowser: string;          // Default: "Escape"

  // Navigation
  nextPlanet: string;            // Default: "Tab"
  previousPlanet: string;        // Default: "Shift+Tab"

  // Actions
  travelToPlanet: string;        // Default: "Enter"
  viewPortals: string;           // Default: "P"
  viewFriends: string;           // Default: "F"

  // Creation
  createUniverse: string;        // Default: "N"
}
```

## Visual Style

```typescript
interface UniverseBrowserStyle {
  // Panel backgrounds
  backgroundColor: Color;
  sectionBackground: Color;

  // Universe type colors
  fantasyColor: Color;           // Purple/gold
  scifiColor: Color;             // Blue/silver
  realisticColor: Color;         // Green/brown
  surrealColor: Color;           // Pink/cyan

  // Portal colors
  activePortalColor: Color;      // Green
  inactivePortalColor: Color;    // Gray
  lockedPortalColor: Color;      // Red

  // Friend status
  onlineColor: Color;            // Green
  offlineColor: Color;           // Gray

  // 8-bit styling
  pixelScale: number;
}
```

## State Management

```typescript
interface UniverseBrowserState {
  // View state
  isOpen: boolean;
  activePanel: "selection" | "creation" | "planets" | "portals" | "multiplayer";

  // Current data (from universe-system)
  currentUniverse: Universe | null;
  currentPlanet: Planet | null;
  player: Player;

  // Selection
  selectedUniverseId: string | null;
  selectedPlanetId: string | null;
  selectedPortalId: string | null;

  // Creation draft
  creationDraft: UniverseCustomization | null;
  creationStep: CreationStep;

  // Events (using universe-system types)
  onUniverseSelected: Event<Universe>;
  onPlanetSelected: Event<Planet>;
  onPortalActivated: Event<PlanetPortal | UniversePortal>;
  onPortalUsed: Event<PlanetPortal | UniversePortal>;
  onVisitStarted: Event<VisitSession>;
  onVisitEnded: Event<VisitSession>;
  onVisitorArrived: Event<VisitSession>;
  onFriendOnline: Event<Player>;
}
```

## Integration Points

- **Universe System**: Universe, Planet, Portal definitions
- **Nexus System**: Meta-game hub integration
- **Player System**: Player identity, friends
- **Notification System**: Portal and visit alerts
- **Research System**: Portal discovery progression

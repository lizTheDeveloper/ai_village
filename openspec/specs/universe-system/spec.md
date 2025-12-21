# Universe and Planet System - Specification

**Created:** 2025-12-20
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The game world is organized into a hierarchy: **Universes** contain **Planets**, and planets contain all game content (items, agents, buildings). Universes define the fundamental rules (magic vs tech vs hybrid), while planets are themed variations within those rules. Players can travel between planets in the same universe freely, and discover portals to other universes through research. Multiplayer enables visiting friends' universes.

---

## Hierarchy

```
Multiverse (all connected games)
└── Universe (rule set: magic, sci-fi, etc.)
    └── Planet (themed world: forest, desert, etc.)
        └── Village (player's settlement)
            └── Content (items, agents, buildings)
```

---

## Universe Definition

```typescript
interface Universe {
  id: string;                    // "magic", "scifi", "hybrid"
  name: string;                  // "The Arcane Realms"
  description: string;

  // Ownership
  ownerId: string;               // Player who created it
  isPublic: boolean;             // Can others visit?
  accessList: string[];          // Allowed player IDs (if private)

  // Fundamental rules
  rules: UniverseRules;

  // Planets in this universe
  planets: string[];             // Planet IDs
  homePlanetId: string;          // Starting planet

  // Cross-universe connections
  discoveredPortals: PortalConnection[];
  portalDiscoveryTier: number;   // Research progress toward portals

  // Multiplayer
  connectedUniverses: string[];  // Friend universes linked
  visitorPolicy: VisitorPolicy;

  // Metadata
  createdAt: Date;
  seed: number;                  // For procedural generation
  version: string;               // For compatibility
}

interface UniverseRules {
  // Core physics
  magicEnabled: boolean;
  magicLevel: "none" | "low" | "medium" | "high" | "dominant";
  techEnabled: boolean;
  techLevel: "primitive" | "medieval" | "industrial" | "digital" | "futuristic";

  // What can exist
  allowedItemTags: string[];     // ["organic", "magical", "enchanted"]
  bannedItemTags: string[];      // ["electronic", "plasma"]
  allowedResearchFields: ResearchField[];

  // Generation constraints
  generationStyle: UniverseGenerationStyle;

  // Gameplay modifiers
  timeScale: number;             // How fast time passes
  difficultyModifiers: DifficultyMods;
}

interface UniverseGenerationStyle {
  aestheticFamily: "fantasy" | "scifi" | "realistic" | "surreal";
  nameLanguageHints: string[];   // ["elvish", "latin"] or ["technical", "acronyms"]
  colorPaletteFamily: string;    // Warm, cool, neon, muted
  architectureStyle: string;     // Gothic, organic, geometric, brutalist
}
```

---

## Universe Types

### Predefined Universe Templates

| Universe | Magic | Tech | Aesthetic | Example Planets |
|----------|-------|------|-----------|-----------------|
| **Arcane Realms** | High | Medieval | Fantasy | Forest Village, Feudal Grove, Crystal Caverns |
| **Frontier Worlds** | None | Futuristic | Sci-Fi | Starfall Colony, Ocean Platform, Asteroid Base |
| **Twilight Lands** | Medium | Industrial | Steampunk | Clockwork Vale, Smog City, Airship Dock |
| **Dream Dimensions** | Dominant | None | Surreal | Dreamweave, Mirror Realm, Void Garden |
| **Terra Nova** | None | Medieval | Realistic | Coastal Haven, Mountain Hold, River Delta |
| **Hybrid Zones** | Medium | Digital | Mixed | Magitech Hub, Enchanted Labs |

### Custom Universes

Players can create custom universes by:
1. Selecting a base template
2. Adjusting rule sliders (magic level, tech level)
3. Choosing aesthetic preferences
4. Naming and describing their universe

---

## Planet Definition

```typescript
interface Planet {
  id: string;                    // "forest_village"
  universeId: string;            // FK to parent universe
  name: string;                  // "Forest Village"
  description: string;

  // Theme
  theme: PlanetTheme;
  biome: BiomeType;              // Forest, desert, ocean, etc.
  climate: ClimateType;

  // Visual identity
  palette: ColorPalette;
  spriteVariants: Map<string, string>; // universalItemId -> planetSpriteId

  // Content
  nativeItems: string[];         // Planet-specific base items
  generatedItems: string[];      // Discovered/invented items
  nativeCrops: string[];
  nativeBuildings: string[];

  // World state
  villages: Village[];           // Player settlements on this planet
  worldMap: WorldMap;
  discoveredAreas: Area[];

  // Connections
  portalsToPlanets: PlanetPortal[];    // Same-universe travel
  portalsToUniverses: UniversePortal[]; // Cross-universe (rare)

  // Metadata
  createdAt: Date;
  seed: number;
}

interface PlanetTheme {
  name: string;                  // "Enchanted Forest"
  keywords: string[];            // ["mystical", "ancient", "verdant"]
  bannedConcepts: string[];      // ["industrial", "metal"]

  // Visual
  dominantColors: string[];
  architectureStyle: string;
  vegetationStyle: string;

  // Naming
  nameStyle: NameStyle;
  placeNameExamples: string[];
  itemNameExamples: string[];

  // Audio (future)
  musicStyle: string;
  ambientSounds: string[];
}
```

---

## Universal Items with Planet Variants

```typescript
interface UniversalItem {
  id: string;                    // "wood"
  name: string;                  // Base name
  category: ItemCategory;
  baseProperties: ItemProperties;

  // Planet-specific appearances
  planetVariants: Map<string, PlanetItemVariant>;

  // Universe restrictions
  existsInUniverses: string[] | "all";
}

interface PlanetItemVariant {
  planetId: string;
  displayName: string;           // "Enchanted Timber" vs "Synthetic Wood"
  description: string;
  spriteId: string;              // Different visual
  paletteOverride?: string[];

  // Optional stat modifications
  propertyModifiers?: Partial<ItemProperties>;
}

// Example: Wood across planets
const woodVariants: UniversalItem = {
  id: "wood",
  name: "Wood",
  category: "material",
  baseProperties: { tier: 1, weight: 1, tags: ["organic", "construction"] },

  planetVariants: new Map([
    ["forest_village", {
      planetId: "forest_village",
      displayName: "Heartwood",
      description: "Rich, amber-hued wood from ancient forest trees",
      spriteId: "forest_village:wood",
    }],
    ["feudal_grove", {
      planetId: "feudal_grove",
      displayName: "Hinoki",
      description: "Fragrant cypress wood, prized for building",
      spriteId: "feudal_grove:wood",
    }],
    ["starfall_colony", {
      planetId: "starfall_colony",
      displayName: "Biofiber Composite",
      description: "Engineered plant-based structural material",
      spriteId: "starfall_colony:wood",
    }],
    ["clockwork_vale", {
      planetId: "clockwork_vale",
      displayName: "Treated Timber",
      description: "Chemically hardened wood for industrial use",
      spriteId: "clockwork_vale:wood",
    }],
  ]),

  existsInUniverses: "all",
};
```

---

## Portal System

### Intra-Universe Portals (Planet to Planet)

```typescript
interface PlanetPortal {
  id: string;
  fromPlanetId: string;
  toPlanetId: string;

  // Location
  fromPosition: Position;
  toPosition: Position;

  // State
  discovered: boolean;
  activated: boolean;
  bidirectional: boolean;

  // Requirements
  activationCost: ItemStack[];
  usageCost: ItemStack[];        // Per trip
  cooldown: number;              // Ticks between uses

  // Discovery
  discoveryMethod: "exploration" | "research" | "quest" | "random";
  discoveredBy: string;          // Agent/player ID
  discoveredAt: GameTime;
}
```

### Inter-Universe Portals (Universe to Universe)

```typescript
interface UniversePortal {
  id: string;
  fromUniverseId: string;
  toUniverseId: string;

  // These are rare and significant
  tier: "nascent" | "stable" | "ancient";
  stability: number;             // 0-100, affects reliability

  // Discovery requirements
  requiredResearchTier: number;  // Must complete portal research
  requiredItems: ItemStack[];    // Rare materials
  ritualRequired: boolean;       // Special activation

  // Properties
  bidirectional: boolean;
  allowsItems: boolean;          // Can carry items through?
  allowsAgents: boolean;         // Can NPCs travel?
  transformsItems: boolean;      // Items change crossing universes?

  // For multiplayer
  isPlayerLink: boolean;         // Links to friend's universe
  linkedPlayerId?: string;
}
```

### Portal Discovery Progression

```typescript
interface PortalResearchProgression {
  // Tier 1: Discover portals exist
  tier1: {
    name: "Spatial Anomalies";
    unlocks: ["detect_portal_hints", "portal_theory"];
    requirements: ["research_tier_3"];
  };

  // Tier 2: Activate planet portals
  tier2: {
    name: "Planar Navigation";
    unlocks: ["activate_planet_portals", "portal_mapping"];
    requirements: ["spatial_anomalies", "ancient_texts"];
  };

  // Tier 3: Discover universe boundaries
  tier3: {
    name: "Reality Boundaries";
    unlocks: ["detect_universe_edges", "dimensional_theory"];
    requirements: ["planar_navigation", "void_crystals"];
  };

  // Tier 4: Create universe portals
  tier4: {
    name: "Dimensional Breach";
    unlocks: ["create_universe_portal", "stabilize_breach"];
    requirements: ["reality_boundaries", "legendary_materials"];
  };

  // Tier 5: Multiplayer linking
  tier5: {
    name: "Multiversal Attunement";
    unlocks: ["link_player_universes", "shared_discovery"];
    requirements: ["dimensional_breach", "player_connection"];
  };
}
```

---

## Multiplayer Architecture

### Player Identity

```typescript
interface Player {
  id: string;                    // Unique player ID
  displayName: string;

  // Owned content
  universes: string[];           // Universe IDs they own
  homeUniverseId: string;        // Primary universe

  // Social
  friends: string[];             // Friend player IDs
  pendingInvites: Invite[];
  blockedPlayers: string[];

  // Presence
  currentLocation: PlayerLocation;
  online: boolean;
  lastSeen: Date;
}

interface PlayerLocation {
  universeId: string;
  planetId: string;
  villageId: string;
  position: Position;
  isVisiting: boolean;           // In someone else's universe?
  hostPlayerId?: string;         // If visiting
}
```

### Visiting Other Universes

```typescript
interface VisitorPolicy {
  allowVisitors: boolean;
  requireApproval: boolean;      // Must approve each visit?

  // Permissions
  canVisitorsTrade: boolean;
  canVisitorsHarvest: boolean;
  canVisitorsBuild: boolean;
  canVisitorsTakeItems: boolean;

  // Limits
  maxConcurrentVisitors: number;
  visitDurationLimit: number;    // 0 = unlimited
}

interface VisitSession {
  id: string;
  visitorId: string;
  hostPlayerId: string;
  hostUniverseId: string;

  // State
  status: "pending" | "active" | "ended";
  startedAt: Date;
  endedAt?: Date;

  // What they brought/took
  itemsBrought: ItemStack[];
  itemsTaken: ItemStack[];       // If allowed

  // What they did
  actionsLog: VisitorAction[];
}
```

### Multiplayer Sync Model

```typescript
interface MultiverseSync {
  // Each universe is authoritative for its own state
  // Visitors stream updates from host

  // Host broadcasts
  hostBroadcasts: {
    worldState: "periodic";      // Every N seconds
    agentActions: "realtime";
    playerActions: "realtime";
    itemChanges: "on_change";
  };

  // Conflict resolution
  itemOwnership: "last_write_wins" | "host_authoritative";
  agentControl: "host_only";     // Visitors can't control host's agents

  // Offline handling
  offlineMode: "pause_visits" | "ai_continues";
}
```

---

## Item Travel Rules

### Same-Universe Travel

```typescript
interface IntraUniverseItemRules {
  // Items can freely move between planets in same universe
  freeMovement: true;

  // But may look different
  visualTransform: "apply_planet_variant";

  // And may have modified properties
  propertyTransform: "apply_planet_modifiers" | "none";

  // Some items are planet-locked
  exceptions: {
    planetLockedItems: true;     // Some items can't leave
    sacredItems: true;           // Religious/cultural items stay
  };
}
```

### Cross-Universe Travel

```typescript
interface CrossUniverseItemRules {
  // Not all items can cross
  canCross(item: Item, from: Universe, to: Universe): boolean {
    // Check universe compatibility
    if (!to.rules.allowedItemTags.some(tag => item.tags.includes(tag))) {
      return false; // Item type not allowed in target universe
    }

    // Magic items can't enter no-magic universes
    if (item.tags.includes("magical") && !to.rules.magicEnabled) {
      return false;
    }

    // Tech items can't enter primitive universes
    if (item.tags.includes("electronic") && to.rules.techLevel === "primitive") {
      return false;
    }

    return true;
  }

  // Items that cross may transform
  transformOnCrossing(item: Item, from: Universe, to: Universe): Item {
    // A magic sword entering a sci-fi universe might become...
    // "Plasma Blade (Ancient Design)"
    return {
      ...item,
      tags: [...item.tags, "exotic", "cross_universe"],
      exoticOrigin: from.id,
      transformed: true,
      originalForm: item,
    };
  }
}
```

---

## Data Architecture

### Database Schema

```sql
-- Universes
CREATE TABLE universes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rules JSONB NOT NULL,
  seed INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_public BOOLEAN DEFAULT false,

  FOREIGN KEY (owner_id) REFERENCES players(id)
);

-- Planets
CREATE TABLE planets (
  id TEXT PRIMARY KEY,
  universe_id TEXT NOT NULL,
  name TEXT NOT NULL,
  theme JSONB NOT NULL,
  seed INTEGER NOT NULL,

  FOREIGN KEY (universe_id) REFERENCES universes(id)
);

-- Items with universe/planet scoping
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  scope TEXT NOT NULL,  -- 'universal', 'universe', 'planet'
  universe_id TEXT,     -- NULL for universal
  planet_id TEXT,       -- NULL for universe-wide
  definition JSONB NOT NULL,

  FOREIGN KEY (universe_id) REFERENCES universes(id),
  FOREIGN KEY (planet_id) REFERENCES planets(id)
);

-- Planet variants for universal items
CREATE TABLE planet_item_variants (
  universal_item_id TEXT NOT NULL,
  planet_id TEXT NOT NULL,
  variant JSONB NOT NULL,

  PRIMARY KEY (universal_item_id, planet_id),
  FOREIGN KEY (planet_id) REFERENCES planets(id)
);

-- Portals
CREATE TABLE portals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,  -- 'planet', 'universe', 'player'
  from_universe_id TEXT,
  from_planet_id TEXT,
  to_universe_id TEXT,
  to_planet_id TEXT,
  properties JSONB NOT NULL,
  discovered_at TIMESTAMP,
  discovered_by TEXT
);

-- Multiplayer visits
CREATE TABLE visit_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  host_id TEXT NOT NULL,
  universe_id TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,

  FOREIGN KEY (visitor_id) REFERENCES players(id),
  FOREIGN KEY (host_id) REFERENCES players(id),
  FOREIGN KEY (universe_id) REFERENCES universes(id)
);
```

### ID Namespacing

```typescript
// Full item ID format
type FullItemId = string;

// Patterns:
// Universal:           "wood"
// Universe-scoped:     "arcane:mana_crystal"
// Planet-scoped:       "arcane:forest_village:enchanted_acorn"
// Generated:           "arcane:forest_village:gen:moonpetal_extract"
// Cross-universe:      "arcane:forest_village:gen:moonpetal_extract@frontier:starfall"

function parseFullItemId(id: FullItemId): ItemIdComponents {
  // ... parsing logic
}

function buildFullItemId(components: ItemIdComponents): FullItemId {
  // ... building logic
}
```

---

## Open Questions

1. **Universe templates vs freeform:** How much can players customize universe rules?
2. **Portal permanence:** Can portals close? Be destroyed?
3. **Cross-universe economy:** How to balance exotic item values?
4. **Multiplayer hosting:** P2P or dedicated servers?
5. **Offline progress:** Does your universe continue when you're offline?

---

## Related Specs

- `items-system/spec.md` - Item definitions
- `items-system/planet-scoping.md` - Previous scoping design
- `research-system/spec.md` - Portal discovery
- `agent-system/spec.md` - Agent travel between planets
- `agent-system/chroniclers.md` - Documenting multi-planet events
- `player-system/spec.md` - Player ownership and visiting

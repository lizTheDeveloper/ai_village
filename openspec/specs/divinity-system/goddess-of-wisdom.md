> **System:** divinity-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Goddess of Wisdom Entity & LLM Content Scrutiny

## Overview

The Goddess of Wisdom is a special deity entity that **manifests when the first LLM-generated content is proposed** (technology, recipe, or spell). This creates a dramatic moment: "The Goddess of Wisdom has entered the chat."

Unlike abstract validation systems, the Goddess of Wisdom is a **visible, conversational entity** that evaluates AI-generated content before it enters the world, ensuring balance, appropriateness, and narrative coherence.

## Core Principles

1. **Physical Manifestation**: The Goddess of Wisdom appears as an entity at research/discovery locations
2. **Memory & Persistence**: Remembers all judgments, approved/rejected creations, creator relationships
3. **Conversational**: Scrutiny happens as observable interactions using ConversationComponent
4. **Multiple Aspects**: Different wisdom goddesses from various mythologies, each with unique scrutiny styles
5. **Judgment Mode**: Uses LLM or heuristics to evaluate content fitness

## Manifestation Trigger

The Goddess of Wisdom manifests automatically when pending approvals pile up:

**Condition**: 5+ creations pending for 1 in-game hour (1200 ticks)

When triggered:
1. A random wisdom goddess is selected from the registry
2. She manifests at the location of the first pending creation's creator
3. Event emitted: `deity:manifested` with message "[Name] has joined the chat"
4. She processes each pending creation one per tick
5. Events emitted for each judgment: `wisdom:scrutiny_started`, `wisdom:judgment`
6. When queue is cleared: `wisdom:queue_processed`

This allows overnight games to auto-process backlogs while providing dramatic observability.

### Configuration

```typescript
const DEFAULT_CONFIG = {
  minPendingCount: 5,       // Minimum pending to trigger
  minStaleTicks: 1200,      // 1 in-game hour (TICKS_PER_HOUR)
  checkInterval: 60,        // Check every 3 seconds
  processPerTick: 1,        // Drama: one judgment per tick
};
```

## Entity Structure

### Components

The Goddess of Wisdom entity has:

```typescript
{
  // Identity
  identity: {
    name: "Athena" | "Saraswati" | "Thoth" | "Odin" | "Sophia" | "Seshat",
    title: "Goddess of Wisdom" // or "Allfather, God of Wisdom" for Odin
  },

  // Positioning - manifests at discovery location
  position: {
    x: research_location.x,
    y: research_location.y
  },

  // Visual appearance (PixelLab AI-generated sprites)
  renderable: {
    spriteId: "wisdom-goddesses/owl-scholar", // Athena
    layer: "entity"
  },

  // Memory system - CRITICAL
  episodic_memory: {
    memories: [
      // Every scrutiny judgment
      {
        type: "wisdom_scrutiny",
        creatorId: "inventor_123",
        creatorName: "Nikolas the Tinkerer",
        creationType: "technology",
        creationName: "Improved Bellows",
        approved: true,
        balanceScore: 0.8,
        noveltyScore: 0.6,
        fitScore: 0.9,
        timestamp: tick
      }
    ]
  },

  // Relationship tracking
  relationship: {
    // Tracks relationships with inventors/researchers
    // Those whose work was approved, rejected, etc.
  },

  // Conversation capability
  conversation: {
    partnerId: null,
    messages: [],
    topics: ["wisdom", "knowledge", "discovery", "creation", "balance"]
  },

  // Tags
  tags: {
    tags: [
      "deity",
      "immortal",
      "wisdom_goddess",
      "knowledge_keeper",
      "discovery_scrutinizer",
      "conversational",
      "origin:Greco-Classical", // or other origin
      "scrutiny_style:strict"   // or encouraging/curious/pragmatic
    ]
  }
}
```

## Wisdom Goddess Registry

Six wisdom goddesses are available, each with distinct scrutiny styles:

| Name | Origin | Sprite Folder | Scrutiny Style | Notes |
|------|--------|---------------|----------------|-------|
| Athena | Greco-Classical | owl-scholar | strict | High standards, exacting |
| Saraswati | Hindu | lotus-sage | encouraging | Supportive, generous |
| Thoth | Egyptian | ibis-scribe | pragmatic | Utility-focused |
| Odin | Norse | one-eyed-wanderer | curious | Favors novelty; **perpetually annoyed at being called a "goddess"** |
| Sophia | Gnostic | crystalline-oracle | encouraging | Light-being, supportive |
| Seshat | Egyptian | star-librarian | strict | Meticulous record-keeper |

### Odin's Special Case

Odin is the only male deity in the registry. He is **perpetually irritated** about being grouped with "goddesses" and will express this comedically in his judgments:

```typescript
// Example Odin wisdom comments:
"*sighs in Old Norse* I am the ALLFATHER, not a goddess. Anyway, this creation meets my exacting standards."

"I sacrificed an EYE for wisdom and they put me in the goddess folder. *pinches bridge of nose* Regardless, this is approved."

"The ravens laugh at me. Every day. 'Goddess of Wisdom,' they caw. Mockingly. But yes, your technology is sound."
```

## Scrutiny System

### Scrutiny Styles

Each style has different thresholds for approval:

```typescript
const SCRUTINY_THRESHOLDS = {
  strict: {
    minBalance: 0.7,    // Must be well-balanced
    minNovelty: 0.3,    // Some novelty expected
    minFit: 0.8,        // Must fit world setting well
    creativityBonus: 0  // No bonus for creativity
  },
  encouraging: {
    minBalance: 0.4,    // More forgiving
    minNovelty: 0.2,    // Low novelty OK
    minFit: 0.5,        // Moderate fit required
    creativityBonus: 0.2 // Rewards creativity
  },
  curious: {
    minBalance: 0.5,
    minNovelty: 0.5,    // HIGH novelty requirement
    minFit: 0.4,        // More flexible on fit
    creativityBonus: 0.3 // Strong creativity bonus
  },
  pragmatic: {
    minBalance: 0.6,
    minNovelty: 0.1,    // Doesn't care about novelty
    minFit: 0.7,        // Must fit well
    creativityBonus: 0.1
  }
};
```

### Scrutiny Result

```typescript
interface WisdomScrutinyResult {
  approved: boolean;
  reasoning: string;
  wisdomComment: string;  // In-character flavor text
  balanceScore: number;   // 0-1 how balanced
  noveltyScore: number;   // 0-1 how novel
  fitScore: number;       // 0-1 how well it fits
}
```

### Heuristic Scrutiny (Fast)

For quick evaluation without LLM calls:

```typescript
function heuristicWisdomScrutiny(
  creation: PendingCreation,
  style: ScrutinyStyle = 'pragmatic',
  goddessName?: string
): WisdomScrutinyResult
```

- **Technology checks**: Tier vs prerequisites, unlock count, field commonality
- **Recipe checks**: Ingredient count, general fit
- **Effect checks**: Paradigm alignment, balance assumptions

### LLM Scrutiny (Thorough)

For detailed evaluation using AI:

```typescript
async function scrutinizeWithWisdomGoddessLLM(
  creation: PendingCreation,
  goddessName: string,
  style: ScrutinyStyle
): Promise<WisdomScrutinyResult>
```

The LLM prompt includes:
- Goddess personality and style description
- Creation details (technology/recipe/spell)
- Creator information
- Creativity score

## Integration with Auto-Approval

The wisdom goddess scrutiny is wired into `PendingApprovalRegistry.shouldAutoApprove()`:

```typescript
interface AutoApprovalConfig {
  // ... existing fields ...
  wisdomGoddessName?: string;     // Which goddess judges
  wisdomGoddessStyle?: ScrutinyStyle;  // Override default style
}
```

Default scrutiny styles by creation type:
- **Technologies**: pragmatic (should be practical)
- **Effects/Spells**: strict (magic needs careful balance)
- **Recipes**: encouraging (recipes can be creative)

## Events & Observability

### Event Types

```typescript
// Goddess manifests
'deity:manifested' -> {
  deityId, deityName: "Goddess of Wisdom",
  reason: 'first_llm_discovery',
  location,
  message: "The Goddess of Wisdom has entered the chat"
}

// Scrutiny begins
'wisdom:scrutiny_started' -> {
  goddessId, creatorId, creationType, creationName
}

// Judgment rendered
'wisdom:judgment' -> {
  creatorId, creationName, approved, reasoning, wisdomComment
}
```

## Discovery Nodes

To enable LLM-generated content, the research tree includes **discovery nodes** - technologies that unlock generation capabilities:

```typescript
// Example discovery node
{
  id: 'alchemy_foundations',
  name: 'Alchemical Foundations',
  field: 'alchemy',
  tier: 2,
  unlocks: [{
    type: 'generated',
    generationType: 'alchemy_discovery'
  }]
}
```

### Available Discovery Nodes

| Field | Node | Tier | Enables |
|-------|------|------|---------|
| alchemy | Alchemical Foundations | 2 | Potion/transmutation recipes |
| cuisine | Culinary Arts | 2 | Food recipes |
| nature | Nature's Secrets | 2 | Herbal/natural remedies |
| crafting | Artisan's Innovation | 2 | Tool/craft recipes |
| arcane | Arcane Experimentation | 3 | Magical effects |
| textiles | Textile Mastery | 2 | Clothing/fabric items |
| medicine | Medical Knowledge | 2 | Healing items |
| music | Musical Discovery | 2 | Instruments/songs |
| enchanting | Enchanting Basics | 3 | Item enchantments |
| brewing | Brewing Arts | 2 | Beverages |
| ceramics | Potter's Way | 2 | Pottery items |
| glassworking | Glassblower's Art | 2 | Glass items |
| jewelry | Jeweler's Craft | 2 | Jewelry/accessories |
| tanning | Leatherworking | 2 | Leather goods |
| preservation | Food Preservation | 2 | Preserved foods |
| distillation | Distillation | 3 | Spirits/essences |
| herbalism | Advanced Herbalism | 3 | Complex herbal items |
| spellcraft | Spellcraft Research | 3 | New spell effects |
| artifice | Magical Artifice | 4 | Magical items |

## Implementation Files

- `packages/core/src/divinity/WisdomGoddessSpriteRegistry.ts` - Goddess registry
- `packages/core/src/divinity/GoddessOfWisdomEntity.ts` - Entity factory
- `packages/core/src/divinity/WisdomGoddessScrutiny.ts` - Scrutiny logic
- `packages/core/src/systems/WisdomGoddessSystem.ts` - Manifestation and queue processing
- `packages/core/src/crafting/PendingApprovalRegistry.ts` - Integration with approval flow
- `packages/core/src/events/EventMap.ts` - Event types for observability
- `packages/core/src/research/defaultResearch.ts` - Discovery node technologies

## Example Scenario

```
Tick 50000: Inventor Nikolas proposes "Improved Bellows" technology

EVENT: deity:manifested (if first discovery)
MESSAGE: "The Goddess of Wisdom has entered the chat"
- Athena appears at the research workshop
- Nearby agents see a dignified figure in white robes

SCRUTINY BEGINS:
Athena evaluates:
- Balance: 0.8 (tier 2 with 1 prerequisite - reasonable)
- Novelty: 0.6 (builds on existing metallurgy)
- Fit: 0.9 (practical crafting technology)

Athena: "This creation meets my exacting standards. Let it be known."

EVENT: wisdom:judgment
- approved: true
- Technology added to research tree

If it were Odin instead:
Odin: "*sighs in Old Norse* I am the ALLFATHER, not a goddess. Anyway,
this creation meets my exacting standards. Let it be known."
```

## Goddess Personality in Rejection

### Strict (Athena, Seshat)
- Approved: "This creation meets my exacting standards. Let it be known."
- Rejected (low balance): "This creation is unbalanced. Return when you have refined it."
- Rejected (low fit): "This does not meet my standards. Seek greater understanding."

### Encouraging (Saraswati, Sophia)
- Approved: "I see promise in this work! Let the creator be celebrated."
- Rejected: "This shows potential, but is not yet ready. Keep working!"

### Curious (Odin)
- Approved (high novelty): "Fascinating! This is genuinely novel. The world grows richer."
- Approved (normal): "An acceptable addition to mortal knowledge."
- Rejected (low novelty): "This is too derivative. Show me something I have not seen before."
- Rejected (poor execution): "The idea intrigues me, but the execution falls short."

### Pragmatic (Thoth)
- Approved: "This serves a clear purpose. Approved."
- Rejected: "I see no practical value in this. What problem does it solve?"

## Future Enhancements

- **Player Favor System**: Player can petition goddess for leniency
- **Goddess Workshops**: Special buildings where goddess resides when idle
- **Teaching Mode**: Goddess explains why something was rejected
- **Blessing System**: Approved creators get temporary research bonus
- **Multi-Goddess Consultation**: Complex creations reviewed by multiple deities

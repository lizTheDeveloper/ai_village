# Pantheon of Gods - AI Agent Hierarchy System

**Status**: ✅ Implemented (Demo)
**Implementation**: `custom_game_engine/demo/pantheon-of-gods.ts`
**Date**: 2026-01-06

## Overview

The Pantheon of Gods system enables multiple AI agents with different capabilities to participate in a networked multiverse as divine entities. Gods have tiered power levels tied to their underlying LLM models, creating a natural hierarchy from all-powerful Elder Gods to minor Nature Spirits.

This creates emergent gameplay where:
- **Elder Gods** (Sonnet/Opus) have full dev tools access and wisdom but respond slowly
- **Lesser Gods** (Haiku/LLaMA) have domain-specific powers and respond quickly
- **Trickster Gods** (Haiku) create chaos with unpredictable behavior
- **Nature Spirits** (tiny models) provide ambient world interaction

## Architecture

### Component Integration

```
┌─────────────────────────────────────────────────────┐
│         Pantheon of Gods System                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Elder Gods   │  │ Lesser Gods  │  │ Spirits  │ │
│  │ (Sonnet/Opus)│  │ (Haiku/LLaMA)│  │ (Tiny)   │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                 │                │       │
│         └─────────┬───────┴────────────────┘       │
│                   │                                │
│         ┌─────────▼──────────┐                     │
│         │  GodChatRoomNetwork │                     │
│         │  (Multiplayer Chat) │                     │
│         └─────────┬──────────┘                     │
│                   │                                │
│         ┌─────────▼──────────────┐                 │
│         │ MultiverseNetworkManager│                 │
│         │   (WebSocket Layer)     │                 │
│         └─────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### Message Flow

```
Human Player → Chat Message
    ↓
GodChatRoomNetwork
    ↓
All Gods evaluate shouldRespond()
    ↓
Matching Gods generate LLM responses
    ↓
Gods parse their own responses for [ACTION: ...] tags
    ↓
Gods execute actions based on their tier powers
    ↓
World state changes / Chat responses sent
```

## God Tier System

### Tier Definitions

| Tier | Model | Response Delay | Cost Multiplier | Purpose |
|------|-------|----------------|-----------------|---------|
| **Elder** | Sonnet, Opus | 5s | 10x | Wisdom, long-term guidance, dev tools |
| **Lesser** | Haiku, LLaMA | 2s | 1x | Domain expertise, active management |
| **Trickster** | Haiku | 1s | 0.5x | Chaos, entertainment, unpredictability |
| **Spirit** | Tiny models | 0.5s | 0.1x | Ambient interaction, atmosphere |

### Power Matrix

```typescript
interface GodPowers {
  canModifyWorld: boolean;        // Edit terrain, buildings, universe config
  canSpawnEntities: boolean;       // Create agents, animals, items
  canControlWeather: boolean;      // Modify weather and climate
  canGrantBoons: boolean;          // Buff players/entities
  canCurse: boolean;               // Debuff players/entities
  maxEntitySize: 'small' | 'medium' | 'large' | 'any';
  domain: string[];                // Areas of influence
  responseDelay: number;           // Minimum seconds between responses
  costMultiplier: number;          // API cost multiplier
}
```

**Elder Gods** (Full Power):
```typescript
{
  canModifyWorld: true,            // ✅ Full dev tools access
  canSpawnEntities: true,          // ✅ Any entity type
  canControlWeather: true,         // ✅ Global weather control
  canGrantBoons: true,             // ✅ Major blessings
  canCurse: true,                  // ✅ Major curses
  maxEntitySize: 'any',            // ✅ No limits
  domain: ['all'],                 // ✅ Universal domain
  responseDelay: 5,                // ⏱️ Slow and wise
  costMultiplier: 10               // 💰 Expensive
}
```

**Lesser Gods** (Domain-Specific):
```typescript
{
  canModifyWorld: false,           // ❌ No dev tools
  canSpawnEntities: true,          // ✅ Domain-specific only
  canControlWeather: true,         // ✅ Domain-related weather
  canGrantBoons: true,             // ✅ Minor blessings
  canCurse: false,                 // ❌ Cannot curse
  maxEntitySize: 'medium',         // ⚠️ Limited size
  domain: ['war', 'harvest', 'love'], // 🎯 Specific domains
  responseDelay: 2,                // ⏱️ Moderate speed
  costMultiplier: 1                // 💰 Normal cost
}
```

**Trickster Gods** (Chaos):
```typescript
{
  canModifyWorld: false,           // ❌ No dev tools
  canSpawnEntities: true,          // ✅ Chaotic entities
  canControlWeather: false,        // ❌ No weather control
  canGrantBoons: true,             // ✅ Random blessings
  canCurse: true,                  // ✅ Pranks and curses
  maxEntitySize: 'small',          // ⚠️ Small entities only
  domain: ['chaos', 'mischief'],   // 🎭 Chaos domain
  responseDelay: 1,                // ⏱️ Fast and impulsive
  costMultiplier: 0.5              // 💰 Cheap
}
```

**Nature Spirits** (Ambient):
```typescript
{
  canModifyWorld: false,           // ❌ No dev tools
  canSpawnEntities: false,         // ❌ Cannot spawn
  canControlWeather: false,        // ❌ No weather control
  canGrantBoons: true,             // ✅ Tiny blessings
  canCurse: false,                 // ❌ Cannot curse
  maxEntitySize: 'small',          // ⚠️ Small only
  domain: ['forest', 'river', 'mountain'], // 🌲 Location-specific
  responseDelay: 0.5,              // ⏱️ Very fast
  costMultiplier: 0.1              // 💰 Very cheap
}
```

## Divine Action Protocol

### Action Tags

Gods embed action commands in their responses:

```
[ACTION: spawn_rabbit]
[ACTION: bless player_123]
[ACTION: curse player_456]
[ACTION: dev_modify weather.rain = true]
[ACTION: domain_power harvest.boost = 2.0]
```

### Action Parser

```typescript
private parseActions(response: string): string[] {
  const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
  const actions: string[] = [];
  let match;

  while ((match = actionRegex.exec(response)) !== null) {
    actions.push(match[1]!.trim());
  }

  return actions;
}
```

### Action Execution

```typescript
private async executeAction(action: string): Promise<void> {
  const powers = GOD_TIERS[this.tier];

  // Parse action type
  if (action.startsWith('spawn_')) {
    if (!powers.canSpawnEntities) {
      console.warn(`[${this.name}] Insufficient power to spawn entities`);
      return;
    }
    await this.executeSpawn(action);
  }
  else if (action.startsWith('bless')) {
    if (!powers.canGrantBoons) {
      console.warn(`[${this.name}] Insufficient power to grant boons`);
      return;
    }
    await this.executeBless(action);
  }
  else if (action.startsWith('curse')) {
    if (!powers.canCurse) {
      console.warn(`[${this.name}] Insufficient power to curse`);
      return;
    }
    await this.executeCurse(action);
  }
  else if (action.startsWith('dev_modify')) {
    if (!powers.canModifyWorld) {
      console.warn(`[${this.name}] Insufficient power for dev tools`);
      return;
    }
    await this.executeDevModify(action);
  }
}
```

### Power Enforcement

Each action checks the god's tier powers before execution:

1. **Power Check**: Verify god has required capability
2. **Domain Check**: Verify action is within god's domain
3. **Size Check**: Verify spawned entity size is allowed
4. **Cost Check**: Calculate API cost based on tier multiplier
5. **Rate Limit**: Enforce response delay between actions
6. **Execute**: Perform the divine action

## Domain System

### Domain Categories

**Universal Domains** (Elder Gods only):
- `all` - No restrictions

**Primary Domains** (Lesser Gods):
- `war` - Combat, weapons, strategy
- `harvest` - Agriculture, fertility, growth
- `love` - Relationships, beauty, desire
- `wisdom` - Knowledge, prophecy, guidance
- `death` - Afterlife, necromancy, souls
- `forge` - Crafting, technology, fire
- `sea` - Oceans, storms, navigation
- `sky` - Weather, lightning, wind

**Chaos Domain** (Tricksters):
- `chaos` - Unpredictability, pranks
- `mischief` - Tricks, deception

**Location Domains** (Spirits):
- `forest` - Woods, trees, wildlife
- `river` - Water, fish, flow
- `mountain` - Peaks, stone, altitude
- `desert` - Sand, heat, survival
- `cave` - Underground, darkness, minerals

### Domain Conflict Resolution

When multiple gods respond to the same message:

1. **Elder Gods** always take precedence (can override)
2. **Domain Match**: Gods in matching domains respond
3. **Chaos Injection**: Tricksters randomly interject
4. **Spirit Ambience**: Spirits respond to location mentions

```typescript
private shouldRespond(message: ChatMessage): boolean {
  const content = message.content.toLowerCase();
  const powers = GOD_TIERS[this.tier];

  // Elder gods respond to direct mentions or big questions
  if (this.tier === 'elder') {
    return content.includes(this.name.toLowerCase()) ||
           content.includes('?') ||
           content.includes('how') ||
           content.includes('why');
  }

  // Lesser gods respond to domain keywords
  if (this.tier === 'lesser') {
    return powers.domain.some(d => content.includes(d));
  }

  // Tricksters randomly respond (20% chance)
  if (this.tier === 'trickster') {
    return Math.random() < 0.2;
  }

  // Spirits respond to location keywords
  if (this.tier === 'spirit') {
    return powers.domain.some(loc => content.includes(loc));
  }

  return false;
}
```

## LLM Model Requirements

### Model Selection by Tier

**Elder Gods**:
- **Recommended**: Claude Sonnet 4.5, Claude Opus 3.5
- **Requirements**:
  - Context window: 200k+ tokens
  - Long-term reasoning capability
  - Tool use support for dev actions
  - Cost: ~$3-15 per 1M tokens

**Lesser Gods**:
- **Recommended**: Claude Haiku 3.5, LLaMA 3.1 70B
- **Requirements**:
  - Context window: 32k+ tokens
  - Fast inference (<1s)
  - Domain-specific fine-tuning optional
  - Cost: ~$0.25-1 per 1M tokens

**Trickster Gods**:
- **Recommended**: Claude Haiku 3.5 (with chaotic system prompt)
- **Requirements**:
  - Fast inference (<500ms)
  - Creative/unpredictable outputs
  - Cost: ~$0.25 per 1M tokens

**Nature Spirits**:
- **Recommended**: Gemini Flash, Mistral 7B, Phi-3
- **Requirements**:
  - Very fast inference (<250ms)
  - Tiny models (<10B parameters)
  - Simple pattern matching
  - Cost: ~$0.01-0.10 per 1M tokens

### Cost Analysis

**Typical Session (1 hour, 10 players, 100 messages)**:

| Tier | Messages | Avg Tokens/Msg | Total Tokens | Cost |
|------|----------|----------------|--------------|------|
| Elder (2 gods) | 10 | 500 | 5,000 | $0.05 - $0.15 |
| Lesser (5 gods) | 50 | 300 | 15,000 | $0.01 - $0.05 |
| Trickster (2 gods) | 20 | 200 | 4,000 | $0.001 |
| Spirit (10 gods) | 100 | 100 | 10,000 | $0.001 |
| **Total** | **180** | - | **34,000** | **$0.06 - $0.21** |

**Monthly Cost** (30 hours/month):
- Conservative: $1.80 - $6.30/month
- Heavy usage (100 hours/month): $6 - $21/month

This is extremely affordable for a multiplayer god simulation.

## Example Pantheon Configurations

### Greek Mythology

```typescript
const greekPantheon = [
  // Elder Gods
  { name: 'Chronos', tier: 'elder', model: 'sonnet',
    domain: ['time', 'destiny'], personality: 'ancient and wise' },
  { name: 'Gaia', tier: 'elder', model: 'opus',
    domain: ['nature', 'life'], personality: 'nurturing but fierce' },

  // Lesser Gods
  { name: 'Ares', tier: 'lesser', model: 'haiku',
    domain: ['war'], personality: 'aggressive and direct' },
  { name: 'Demeter', tier: 'lesser', model: 'haiku',
    domain: ['harvest'], personality: 'gentle and patient' },
  { name: 'Aphrodite', tier: 'lesser', model: 'haiku',
    domain: ['love'], personality: 'charming and playful' },

  // Tricksters
  { name: 'Loki', tier: 'trickster', model: 'haiku',
    domain: ['chaos'], personality: 'mischievous and unpredictable' },

  // Nature Spirits
  { name: 'Dryad', tier: 'spirit', model: 'gemini-flash',
    domain: ['forest'], personality: 'shy and protective' },
  { name: 'Naiad', tier: 'spirit', model: 'gemini-flash',
    domain: ['river'], personality: 'flowing and changing' },
];
```

### Norse Mythology

```typescript
const norsePantheon = [
  // Elder Gods
  { name: 'Odin', tier: 'elder', model: 'opus',
    domain: ['wisdom', 'war', 'death'], personality: 'cunning and ruthless' },
  { name: 'Yggdrasil', tier: 'elder', model: 'sonnet',
    domain: ['cosmos', 'fate'], personality: 'eternal and knowing' },

  // Lesser Gods
  { name: 'Thor', tier: 'lesser', model: 'haiku',
    domain: ['thunder', 'strength'], personality: 'boisterous and brave' },
  { name: 'Freya', tier: 'lesser', model: 'haiku',
    domain: ['love', 'war'], personality: 'fierce and beautiful' },

  // Tricksters
  { name: 'Loki', tier: 'trickster', model: 'haiku',
    domain: ['chaos', 'fire'], personality: 'clever and treacherous' },
];
```

### Abstract Concepts

```typescript
const abstractPantheon = [
  // Elder Gods
  { name: 'Entropy', tier: 'elder', model: 'sonnet',
    domain: ['decay', 'chaos'], personality: 'inevitable and patient' },
  { name: 'Order', tier: 'elder', model: 'opus',
    domain: ['structure', 'law'], personality: 'rigid and unyielding' },

  // Lesser Gods
  { name: 'Progress', tier: 'lesser', model: 'haiku',
    domain: ['technology', 'innovation'], personality: 'optimistic and fast' },
  { name: 'Tradition', tier: 'lesser', model: 'haiku',
    domain: ['culture', 'memory'], personality: 'conservative and nostalgic' },

  // Tricksters
  { name: 'Paradox', tier: 'trickster', model: 'haiku',
    domain: ['contradiction'], personality: 'confusing and impossible' },
];
```

## Integration with Networking

### Initialization

```typescript
// Create pantheon manager
const pantheon = new PantheonOfGods(gameLoop, {
  enableElderGods: true,
  enableLesserGods: true,
  enableTricksters: true,
  enableSpirits: true,
  maxGods: 20,
  llmProviders: {
    sonnet: sonnetProvider,
    opus: opusProvider,
    haiku: haikuProvider,
    'gemini-flash': geminiProvider,
  }
});

// Start server and join chat
await pantheon.start(8080);
console.log(`Pantheon active with ${pantheon.getGodCount()} gods`);
```

### Message Routing

```typescript
// Gods automatically intercept chat messages
chatNetwork.handleNetworkMessage = async (peerId, message) => {
  // Let chat network process first
  originalHandler(peerId, message);

  // Then let pantheon evaluate
  if (message.type === 'chat_message') {
    await pantheon.evaluateMessage(message);
  }
};
```

### World State Access

All gods have read access to world state:

```typescript
private getWorldState(): string {
  const agents = this.gameLoop.world.query().with('agent').executeEntities();
  const buildings = this.gameLoop.world.query().with('building').executeEntities();
  const time = this.gameLoop.world.query().with('time').executeEntities()[0];

  return `
    Day: ${this.calculateDay(time)}
    Agents: ${agents.length}
    Buildings: ${buildings.length}
    Weather: ${this.getWeather()}
  `;
}
```

Only Elder Gods have write access via dev tools.

## Use Cases

### 1. Divine Council Server

**Setup**: Headless server with 2 Elder Gods as council

```bash
npx tsx demo/pantheon-of-gods.ts --mode=council --port=8080
```

Elder Gods debate major decisions while players observe and petition.

### 2. Active Pantheon Server

**Setup**: Mixed god tiers for active gameplay

```bash
npx tsx demo/pantheon-of-gods.ts --mode=active --port=8080
```

Lesser Gods manage domains, Tricksters cause chaos, Spirits provide ambience.

### 3. Spirit World Server

**Setup**: Only Nature Spirits for ambient RP

```bash
npx tsx demo/pantheon-of-gods.ts --mode=spirits --port=8080
```

Cheap, fast, atmospheric responses from location-based spirits.

### 4. Hybrid Human + AI Server

**Setup**: Human players with AI gods as NPCs

```bash
# Start pantheon server
npx tsx demo/pantheon-of-gods.ts --port=8080

# Human players connect
npm run dev
# Connect to ws://localhost:8080 via NetworkPanel
```

Humans play alongside AI deities in shared universe.

## Security and Moderation

### Power Limitations

Gods cannot:
- Delete entities (preservation rule)
- Access player credentials
- Modify save files directly
- Execute arbitrary code (actions are whitelisted)
- Bypass rate limits

### Rate Limiting

```typescript
private lastResponseTime: number = 0;

async respondToMessage(message: ChatMessage) {
  const now = Date.now();
  const powers = GOD_TIERS[this.tier];

  if (now - this.lastResponseTime < powers.responseDelay * 1000) {
    return; // Enforce cooldown
  }

  this.lastResponseTime = now;
  // ... proceed with response
}
```

### LLM Safety

All god responses pass through LLM provider safety filters:
- Anthropic: Built-in Claude safety
- OpenAI: Moderation API
- Google: Gemini safety filters

### Action Validation

Every divine action is validated:

```typescript
private async validateAction(action: string): Promise<boolean> {
  // Check power tier
  if (!this.hasPower(action)) return false;

  // Check domain match
  if (!this.isInDomain(action)) return false;

  // Check entity size limits
  if (!this.isAllowedSize(action)) return false;

  // Check malicious patterns
  if (this.isMalicious(action)) return false;

  return true;
}
```

## Game System Integrations

### ✅ Implemented Integrations

**1. Agent System** (`createLLMAgent`)
- Gods can spawn new agents/mortals
- Agents are created with dungeon master prompts mentioning their divine origin
- Action: `[ACTION: spawn_agent]`

**2. Skills System** (`SkillsComponent`)
- Gods can bless agents to boost domain-specific skills
- Gods can curse agents to reduce skills
- Blessing grants +0.5 skill level in domain skill (e.g., Ares boosts combat, Demeter boosts farming)
- Curse reduces random skill by -0.3
- Actions: `[ACTION: bless <name>]`, `[ACTION: curse <name>]`

**3. Weather System** (`WeatherComponent`)
- Gods can control weather patterns
- Changes weather type (clear, rain, storm, snow) for 120 seconds
- Action: `[ACTION: weather <type>]`

**4. Building System** (`BuildingComponent`)
- Gods can bless buildings to increase efficiency
- Blessing grants +20% efficiency (capped at 2.0x)
- Action: `[ACTION: bless_building]`

**5. Event System** (`EventBus`)
- All gods can emit domain-specific events
- Elder gods can emit `divine_intervention` events
- All gods can emit `divine_proclamation` events
- Actions: `[ACTION: proclaim <message>]`, `[ACTION: reality_edit <command>]`

**6. Identity System** (`IdentityComponent`)
- Blessings and curses target agents by name
- Gods can address specific agents in their actions

### Domain-Skill Mapping

Each god domain maps to specific skills for blessings:

| Domain | Skill Boosted |
|--------|---------------|
| war, combat | combat |
| harvest, agriculture, farming | farming |
| love, beauty | social |
| wisdom, knowledge | learning |
| forge, crafting | crafting |
| building | building |
| nature, forest | gathering |

### Action Reference

**All Tiers:**
- `spawn_agent` - Create new mortal (requires canSpawnEntities)
- `bless <name>` - Boost target's domain skill (requires canGrantBoons)
- `bless_building` - Boost random building efficiency (requires canGrantBoons)
- `proclaim <message>` - Emit divine proclamation event (all gods)

**Lesser Gods and Above:**
- `weather <type>` - Control weather patterns (requires canControlWeather)

**Tricksters and Elder Gods:**
- `curse <name>` - Reduce random skill (requires canCurse)

**Elder Gods Only:**
- `reality_edit <command>` - Emit divine intervention event (requires canModifyWorld)

## Future Enhancements

### Phase 1 Enhancements (✅ Complete)
- ✅ Basic god tier system
- ✅ Chat integration
- ✅ Action parsing
- ✅ Power enforcement
- ✅ Agent spawning integration
- ✅ Skills system integration
- ✅ Weather system integration
- ✅ Building system integration
- ✅ Event system integration

### Phase 2 Enhancements (Planned)
- ⏳ Animal System integration (bless/curse animals)
- ⏳ Plant System integration (bless crops)
- ⏳ Magic System integration (grant spells)
- ⏳ Combat System integration (intervene in battles)
- ⏳ Deity Emergence integration (gods from agent beliefs)
- ⏳ Memory System integration (divine visions)
- ⏳ God reputation system (players can pray/curse gods)
- ⏳ Divine quests (gods can issue quests to players)
- ⏳ Miracle system (rare high-power events)
- ⏳ Pantheon wars (gods can ally/oppose each other)

### Phase 3 Enhancements (Future)
- ⏳ God character sheets (stats, relationships, history)
- ⏳ Divine realms (gods have home planes)
- ⏳ Worship mechanics (prayers grant power)
- ⏳ Apotheosis (players can become gods)

## References

**Implementation**:
- `demo/pantheon-of-gods.ts` - Full implementation
- `demo/ai-agent-gamemaster.ts` - Single AI agent example

**Dependencies**:
- `packages/core/src/multiverse/GodChatRoomNetwork.ts` - Chat system
- `packages/core/src/multiverse/MultiverseNetworkManager.ts` - Networking
- `packages/llm/src/` - LLM provider abstractions

**Documentation**:
- `custom_game_engine/NETWORK_USAGE_GUIDE.md` - Networking guide
- `custom_game_engine/NETWORK_HEADLESS_COMPATIBILITY.md` - Headless support
- `openspec/specs/communication-system/cross-universe-networking.md` - Network spec

## Conclusion

The Pantheon of Gods system creates emergent gameplay by combining:
- **LLM model capabilities** → Natural power hierarchy
- **Response delays** → Personality differences (wise vs impulsive)
- **Domain restrictions** → Specialized roles
- **Action protocol** → Concrete world impact
- **Cost optimization** → Scalable to many gods

This enables rich multiplayer experiences where AI gods participate as first-class citizens alongside human players, creating dynamic narratives and emergent interactions.

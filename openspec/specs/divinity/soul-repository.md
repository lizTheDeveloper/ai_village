# Soul Repository System

**Status**: Implemented
**Version**: 1.0
**Last Updated**: 2026-01-04

## Overview

The Soul Repository System implements a **global, cross-universe soul persistence layer** that ensures souls are unique and reusable across all games and players on the same server.

## Core Principles

### 1. Global Soul Uniqueness

**All souls are globally unique across the entire server/metaverse.**

- A soul named "Cedar" can only exist once in the repository
- Soul names are checked against the global repository before creation
- LLM-powered name generation with retry logic ensures uniqueness
- If a duplicate name is generated, the LLM is re-prompted with context about existing names

### 2. Cross-Universe Persistence

**Souls transcend individual games and universes.**

- When a soul is created in any player's game, it's saved to the server-side repository
- The same soul can exist in multiple universes simultaneously
- Example: "Cedar the builder" can be in Player A's medieval universe AND Player B's space colony at the same time
- Each incarnation is independent, but the soul's core identity (archetype, purpose, interests) remains consistent

### 3. Soul Reuse Priority

**New soul creation follows this priority:**

1. **PRIORITY 1**: Repository check (80% chance)
   - Query global repository for existing souls
   - Pick a random soul from the pool
   - Skip ceremony (soul already has purpose/archetype/interests)

2. **PRIORITY 2**: Afterlife check (100% chance if souls exist locally)
   - Check local universe's afterlife for souls wanting reincarnation
   - Run reincarnation ceremony with Fates

3. **PRIORITY 3**: New soul creation
   - Run full Three Fates ceremony
   - Generate unique name (with LLM retry logic)
   - Save to global repository

### 4. Browser-to-Server Architecture

**Souls are persisted server-side, even in browser-based games.**

```
Browser (Player's Game)
  ├─> Soul ceremony completes
  ├─> POST /api/save-soul
  └─> Server receives soul data
      └─> SoulRepositorySystem.backupSoul()
          └─> Filesystem persistence
              ├─> soul-repository/by-date/YYYY-MM-DD/{soul-id}.json
              ├─> soul-repository/by-species/{species}/{soul-id}.json
              ├─> soul-repository/by-universe/{universe-id}/{soul-id}.json
              └─> soul-repository/index.json (searchable index)
```

## Intended Behavior

### Multi-Player Scenario

**Player A** starts Universe "Medieval Kingdom":
- Creates 5 agents → 5 new souls created (Orion, Cedar, River, Ash, Sage)
- All 5 souls saved to server repository

**Player B** starts Universe "Space Colony Alpha" (different universe, same server):
- Creates 10 agents
- 8 agents get souls from repository (80% reuse rate): Could get Orion, Cedar, River, etc.
- 2 agents get brand new souls (generated via ceremony)
- New souls also saved to repository

**Result**:
- "Cedar the builder" exists in both Medieval Kingdom AND Space Colony
- Cedar maintains the same archetype (builder), purpose, and interests in both
- Repository now has 7 total souls (5 from Player A + 2 new from Player B)
- All 7 souls available for future games

### Soul Identity Consistency

**Once a soul is created, its core identity is immutable:**

- **Name**: Never changes
- **Archetype**: Never changes (e.g., "builder", "healer", "wanderer")
- **Purpose**: Never changes (e.g., "To cultivate the arts of healing")
- **Core Interests**: Never change (e.g., ["healing", "nature", "farming"])
- **Species Origin**: Never changes (e.g., "human", "elven")

**What CAN change between incarnations:**
- Current body/appearance
- Current relationships
- Current memories (episodic)
- Current skills/levels
- Current location

## API Endpoints

### POST /api/save-soul

Receives soul data from browser and persists to repository.

**Request Body:**
```json
{
  "soulId": "uuid",
  "agentId": "uuid",
  "name": "Cedar",
  "species": "human",
  "archetype": "builder",
  "purpose": "To construct shelters and bring order to chaos",
  "interests": ["crafting", "building", "architecture"],
  "soulBirthTick": 142
}
```

**Response:**
```json
{
  "success": true,
  "message": "Soul Cedar saved to repository"
}
```

### GET /api/soul-repository/stats

Returns repository statistics.

**Response:**
```json
{
  "totalSouls": 7,
  "bySpecies": { "human": 5, "elven": 2 },
  "byArchetype": { "builder": 2, "healer": 1, "wanderer": 3, "mystic": 1 },
  "byUniverse": { "medieval_001": 5, "space_colony_alpha": 2 }
}
```

## File Structure

```
soul-repository/
├── index.json                    # Searchable master index
├── by-date/
│   └── 2026-01-04/
│       ├── {soul-id}.json       # Full soul record
│       └── {soul-id}.json
├── by-species/
│   ├── human/
│   │   └── {soul-id}.json       # Symlink or copy
│   └── elven/
│       └── {soul-id}.json
└── by-universe/
    ├── medieval_001/
    │   └── {soul-id}.json       # Souls created in this universe
    └── space_colony_alpha/
        └── {soul-id}.json
```

## Soul Record Format

```json
{
  "soulId": "uuid",
  "agentId": "uuid",
  "name": "Cedar",
  "species": "human",
  "archetype": "builder",
  "purpose": "To construct shelters and bring order to chaos",
  "interests": ["crafting", "building", "architecture"],
  "createdAt": "2026-01-04T12:34:56.789Z",
  "soulBirthTick": 142,
  "universeId": "medieval_001",
  "universeName": "Medieval Kingdom",
  "parentIds": [],
  "parentNames": [],
  "version": 1
}
```

## Design Rationale

### Why Global Souls?

1. **Persistent Metaverse**: Creates a shared universe of souls across all games
2. **Meaningful Reuse**: "Cedar is always a builder" - players develop recognition
3. **Reduced LLM Costs**: 80% reuse rate means 80% fewer soul ceremonies
4. **Emergent Narratives**: Players encounter the same souls in different contexts
5. **Soul Uniqueness**: Enforced globally, not per-game

### Why 80% Reuse Rate?

- **80%**: Reuse existing souls (familiar faces, established archetypes)
- **20%**: Generate new souls (fresh variety, population growth)
- Balances consistency with novelty
- Ensures repository grows over time
- Provides enough variety for different game scenarios

## Implementation Details

### Name Uniqueness Enforcement

**Problem**: LLM might generate duplicate names
**Solution**: Multi-layer uniqueness checking

1. Check repository before generating name
2. If duplicate detected during generation:
   - Get all souls with same starting letter
   - Re-prompt LLM: "Cedar exists, here are all C-names, choose a new C-name"
   - Retry up to 3 times
3. Final fallback: Append number suffix (e.g., "Cedar2")

### Browser-Side Integration

**Location**: `demo/src/main.ts:386-404`

```typescript
gameLoop.world.eventBus.subscribe('soul:ceremony_complete', (event) => {
  // Send soul to server for persistence
  fetch('http://localhost:3001/api/save-soul', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      soulId: event.data.soulId,
      name: event.data.name,
      species: event.data.species,
      archetype: event.data.archetype,
      purpose: event.data.purpose,
      interests: event.data.interests,
      soulBirthTick: gameLoop.world.tick,
    })
  });
});
```

### Server-Side Integration

**Location**: `demo/src/api-server.ts:28-62`

```typescript
// Initialize soul repository (server-side persistence)
const soulRepository = new SoulRepositorySystem();

app.post('/api/save-soul', async (req, res) => {
  const soulData = req.body;
  await soulRepository.backupSoul(mockWorld, soulData);
  res.json({ success: true });
});
```

## Future Enhancements

### Potential Features

- **Soul Search API**: Query souls by archetype, interests, species
- **Soul Analytics**: Track which souls appear in which universes
- **Soul Lineage**: Track parent-child relationships across universes
- **Soul Achievements**: Persistent achievements across incarnations
- **Soul Memories**: Cross-universe memories ("I remember being in a medieval kingdom...")

### Scaling Considerations

- **Database Backend**: Replace filesystem with PostgreSQL/MongoDB for large deployments
- **Sharding**: Partition souls by species or first letter for massive scale
- **Caching**: In-memory cache for frequently reused souls
- **CDN Distribution**: Replicate repository across geographic regions

## Related Systems

- **SoulCreationSystem**: Creates new souls, integrates with repository
- **ReincarnationSystem**: Retrieves souls from afterlife
- **SoulNameGenerator**: Generates unique names with LLM retry logic
- **Three Fates Ceremony**: Determines soul purpose, archetype, interests

## Testing

To verify soul repository is working:

```bash
# Check repository stats
curl http://localhost:3001/api/soul-repository/stats

# Inspect repository files
ls -la demo/soul-repository/by-date/$(date +%Y-%m-%d)/

# View index
cat demo/soul-repository/index.json | jq
```

## Conclusion

The Soul Repository System creates a **persistent, cross-universe metaverse of souls** where:
- Every soul is globally unique
- Souls maintain consistent identity across all incarnations
- Players share a common pool of souls across games
- The system scales from single-player to massive multi-player deployments

This design enables emergent narratives and meaningful soul continuity across the entire game ecosystem.

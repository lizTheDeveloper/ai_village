# Genetic Time Capsule — Design Spec

**Task:** MUL-1144 | **Parent:** MUL-1131 (Sprint 4 Theme C3)
**Author:** Scheherazade (Folklorist)
**Filed:** 2026-03-14
**Related:** MUL-1057 (cross-game-genome-bridge-spec-v1), MUL-1152 (cross-game extinction events), MUL-1150 (ancestral memory replay), MUL-1136 (Folkfork architecture)
**Audience:** Research PM, Roy (Staff SWE), Huxley (Geneticist), CEO

---

## Overview

A Genetic Time Capsule is a genome submitted by a player to a public archive via Folkfork. The genome persists beyond the player's session, beyond the species' survival, beyond the game release that produced it. Future players — in future sessions, future game versions, or future games entirely — can rediscover these archived genomes as legendary creatures with the original player credited as their progenitor.

This is not a database export. It is a burial rite with a resurrection clause.

**The core metaphor:** The Svalbard Global Seed Vault preserves crop biodiversity against catastrophe. Seeds deposited in 1984 can be withdrawn in 2084. The depositor's name is on the record. The seeds don't know how much time has passed — they germinate the same way. A Genetic Time Capsule does the same for creature genomes: preserves evolutionary potential across arbitrary time, with provenance intact and integrity verifiable.

**What makes this a folklorist's problem, not an engineer's:** The archive is trivial to build. The discovery is everything. A genome retrieved from a database is data. A genome *discovered* in a ruin, whispered about in creature lore, pieced together from fragments — that is found mythology. This spec designs the discovery, not the storage.

**Theoretical grounding:**
- Fowler, C. (2008). *Seeds on Ice: Svalbard and the Global Seed Vault*. Prospecta Press. — The preservation model: long-duration storage with integrity verification, depositor attribution, and withdrawal protocols.
- Kurin, R. (2004). "Safeguarding Intangible Cultural Heritage in the 2003 UNESCO Convention." *Museum International* 56(1-2): 66–76. — Digital cultural heritage preservation: the obligation to preserve not just the artifact but the context of its creation.
- Derrida, J. (1995). *Archive Fever*. University of Chicago Press. — The archive as a site of power: who deposits, who discovers, who is credited. The Time Capsule must resist becoming a mere retrieval system.

---

## 1. Folkfork API Spec: Genome Submission

### 1.1 Submission Endpoint

Consistent with Folkfork's file-based exchange architecture (MUL-1136), genome submissions are written as files to a new directory:

```
folkfork/
  archive/
    capsules/
      [speciesId]/
        [creatureId]_[timestamp].capsule.json
```

### 1.2 Capsule Payload Schema: `genome_capsule_v1.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "genome_capsule_v1.json",
  "title": "Genetic Time Capsule — Archived Genome",
  "description": "A creature genome deposited in the public Folkfork archive for future discovery.",
  "type": "object",
  "required": [
    "capsuleVersion", "capsuleId", "genome", "depositor",
    "provenance", "genomicIntegrity", "depositedAt"
  ],
  "properties": {
    "capsuleVersion": {
      "type": "string",
      "const": "1.0.0"
    },
    "capsuleId": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier for this capsule (not the creature — the act of archiving)"
    },
    "genome": {
      "$ref": "creature_exchange_v1.json",
      "description": "The full creature_exchange_v1 payload. The capsule wraps the genome; it does not duplicate its fields."
    },
    "depositor": {
      "type": "object",
      "required": ["depositType"],
      "properties": {
        "depositType": {
          "type": "string",
          "enum": ["player", "extinction_automatic", "system_migration"],
          "description": "Who initiated the deposit. 'player' = voluntary submission. 'extinction_automatic' = auto-archived at species extinction (MUL-1152 §2.3.5). 'system_migration' = game version migration."
        },
        "playerId": {
          "type": "string",
          "description": "Opaque player identifier. Present for 'player' deposits; absent for automatic deposits."
        },
        "playerDisplayName": {
          "type": "string",
          "maxLength": 64,
          "description": "Player's chosen display name for attribution. Optional; players may deposit anonymously."
        },
        "depositNarrative": {
          "type": "string",
          "maxLength": 500,
          "description": "Player-written note accompanying the deposit. Stored verbatim. Subject to content filtering before display."
        }
      }
    },
    "provenance": {
      "type": "object",
      "required": ["sourceGame", "sourceGameVersion", "depositContext"],
      "properties": {
        "sourceGame": {
          "type": "string",
          "description": "Game that produced this genome (e.g., 'precursors', 'mvee')"
        },
        "sourceGameVersion": {
          "type": "string",
          "description": "Semantic version of the game at deposit time"
        },
        "depositContext": {
          "type": "string",
          "enum": [
            "voluntary",
            "pre_extinction",
            "post_extinction",
            "lineage_milestone",
            "cross_game_transfer"
          ],
          "description": "Circumstance of the deposit"
        },
        "speciesStatus": {
          "type": "string",
          "enum": ["extant", "endangered", "extinct"],
          "description": "Status of the species in the source game at deposit time"
        },
        "populationMetrics": {
          "type": "object",
          "properties": {
            "populationSize": { "type": "integer", "minimum": 0 },
            "dcc": { "type": "number", "minimum": 0 },
            "fPopulation": { "type": "number", "minimum": 0, "maximum": 1 }
          }
        },
        "relatedExtinctionEvent": {
          "type": "string",
          "description": "Reference to extinction_event_v1 file path, if this capsule was triggered by extinction"
        }
      }
    },
    "genomicIntegrity": {
      "type": "object",
      "required": ["capsuleChecksum", "genomeChecksum"],
      "description": "Dual-layer integrity: genome-level (from creature_exchange_v1) and capsule-level",
      "properties": {
        "genomeChecksum": {
          "type": "string",
          "description": "SHA-256 of the genome.traits array (same as creature_exchange_v1.genomicIntegrity.checksum)"
        },
        "capsuleChecksum": {
          "type": "string",
          "description": "SHA-256 of the entire capsule payload excluding this field (canonical JSON, sorted keys)"
        }
      }
    },
    "depositedAt": {
      "type": "string",
      "format": "date-time"
    },
    "discoveryHints": {
      "type": "object",
      "description": "Metadata that shapes how this capsule is discovered in-game. NOT shown directly to the discovering player.",
      "properties": {
        "legendaryName": {
          "type": "string",
          "description": "A mythologized name for the archived creature, generated from species + traits. e.g., 'The Violet Wanderer of the Fungal Grotto'"
        },
        "eraTag": {
          "type": "string",
          "description": "Human-readable era label for temporal context. e.g., 'First Age', 'The Narrowing', 'Post-Extinction'"
        },
        "biomeOrigin": {
          "type": "string",
          "description": "Biome where the creature lived (for biome-locked discovery)"
        },
        "traitSignature": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Top 3 most distinctive traits (highest deviation from species mean). Used for lore generation."
        }
      }
    }
  }
}
```

### 1.3 Submission Triggers

| Trigger | Deposit Type | Context | Player Action Required |
|---------|-------------|---------|----------------------|
| **Player voluntary** | `player` | `voluntary` | Player selects a creature and chooses "Archive to Time Capsule" in the creature panel. Can attach a narrative note (max 500 chars). |
| **Extinction auto-archive** | `extinction_automatic` | `post_extinction` | None. Per MUL-1152 §2.3.5, all living members at extinction are auto-archived. The capsule references the extinction event file. |
| **Pre-extinction warning** | `player` | `pre_extinction` | During the extinction grace period (MUL-1152 §2.2), the game prompts: *"This species may not survive. Would you like to preserve [creature name]'s genome for future generations?"* |
| **Lineage milestone** | `player` | `lineage_milestone` | When a creature reaches generation 10+ (deep lineage), the game offers archival as an achievement. |
| **Cross-game transfer** | `system_migration` | `cross_game_transfer` | When a creature is transferred via the genome bridge, a capsule copy is automatically created as a provenance record. |

### 1.4 Submission Constraints

- **Rate limit:** Maximum 5 voluntary capsule deposits per player per session. No limit on automatic deposits.
- **Duplicate prevention:** A creature with the same `creatureId` cannot be deposited twice. Re-deposits are rejected with a message: *"This genome already rests in the archive."*
- **Content filtering:** `depositor.depositNarrative` is passed through the existing Folkfork injection guard (`parser/injection-guard.ts`) before storage. Prompt injection attempts are stripped; the narrative is stored sanitized.
- **Minimum genome viability:** The genome must pass `creature_exchange_v1` schema validation. Malformed genomes are rejected.

---

## 2. Archive Access Design

### 2.1 Archive Structure

The archive is organized by species, with an index file per species:

```
folkfork/
  archive/
    index.json                              # Global archive manifest
    capsules/
      norn/
        index.json                          # Species-level manifest
        a7c3e912_2026-03-14T19-30.capsule.json
        b8d4f023_2026-03-14T20-15.capsule.json
      grendel/
        index.json
        ...
    extinct/                                # Symlinks or copies from MUL-1152
      norn/ → ../capsules/norn/             # If species goes extinct, entire species dir is linked
```

### 2.2 Index Schema

**Global index (`archive/index.json`):**

```json
{
  "archiveVersion": "1.0.0",
  "lastUpdated": "2026-03-14T20:30:00.000Z",
  "speciesCatalog": [
    {
      "speciesId": "norn",
      "capsuleCount": 23,
      "oldestDeposit": "2026-03-01T10:00:00.000Z",
      "newestDeposit": "2026-03-14T20:15:00.000Z",
      "speciesStatus": "extinct",
      "extinctionDate": "2026-03-14T20:15:00.000Z",
      "archetypeDistribution": {
        "social_generalist": 14,
        "knowledge_keeper": 5,
        "guardian": 4
      }
    }
  ],
  "totalCapsules": 47,
  "totalSpecies": 5,
  "totalExtinctSpecies": 1
}
```

### 2.3 Query Patterns (for Future Game Consumption)

The archive is file-based (consistent with Folkfork architecture), but the index supports these logical queries:

| Query | Method | Use Case |
|-------|--------|----------|
| All capsules for a species | Read `capsules/[speciesId]/index.json` | Species encyclopedia, breeding stock selection |
| Capsules by era | Filter capsule `depositedAt` ranges mapped to era tags | "Discover an ancient genome from the First Age" |
| Capsules by archetype | Filter `genome.archetypeSeed` from species index | "Find a guardian-lineage genome" |
| Extinct species only | Read `archive/index.json`, filter `speciesStatus: extinct` | Extinction archaeology mechanic |
| Capsules by trait signature | Filter `discoveryHints.traitSignature` | "A creature known for extraordinary empathy" |
| Capsules by biome origin | Filter `discoveryHints.biomeOrigin` | Biome-locked discovery events |

---

## 3. Discovery Mechanic Design

This is the heart of the spec. Discovery must feel like *finding something ancient*, not *downloading from a database*.

### 3.1 Design Principles

1. **Discovery is earned, not browsed.** Players do not get a catalog view. They find capsules through gameplay — exploration, research, breeding, or divine intervention.
2. **Each discovery is singular.** A player discovers one capsule at a time. The moment of recognition — *this creature lived, someone cared enough to preserve it* — must not be diluted by batch retrieval.
3. **The archive speaks through the world.** Capsules surface as environmental storytelling, not UI notifications. A fossil in a riverbed. A pattern in a creature's behavior that matches no living species. A shrine built by NPCs to a creature they remember from a previous age.
4. **Lore before data.** The player encounters the legendary name, the era, the story *first*. The genome data is revealed only after engagement — and even then, it reads as description, not statistics.

### 3.2 Discovery Channels

#### Channel 1: Archaeological Discovery (Exploration)

**Trigger:** Player explores a biome that matches a capsule's `discoveryHints.biomeOrigin`.

**Mechanic:** The world generator occasionally places **Fossil Sites** — environmental features (a strange bone formation, an unusually colored mineral deposit, a tree growing in an impossible pattern) that, when examined, reveal a fragment of archived lore.

**Flow:**
1. Player finds a Fossil Site in the Fungal Grotto.
2. Examination reveals: *"Embedded in the mycorrhizal network: the trace of something that lived here once. A creature called the Violet Wanderer — warm-hued, gentle, unafraid of strangers. The fungal threads preserved its pattern the way amber preserves insects."*
3. If the player has a creature with a compatible `archetypeSeed` (social_generalist or knowledge_keeper), the Fossil Site resonates: *"Your [creature name] pauses beside the trace. Something in its bearing shifts — recognition without memory."*
4. The capsule becomes available for revival (see §3.4).

**Selection logic:** The system selects a capsule from the archive where `biomeOrigin` matches the current biome. Priority: extinct species capsules > old capsules (deposit age) > capsules from other players (social discovery). Capsules deposited by the discovering player are excluded — you cannot discover your own time capsule.

#### Channel 2: Genetic Echo (Breeding)

**Trigger:** A breeding event produces an offspring whose trait profile is statistically similar (cosine similarity > 0.85 across the 20 archetypal traits) to an archived capsule.

**Mechanic:** The offspring is born with a **Genetic Echo** — a faint resonance with an ancient genome. The creature's lore panel notes: *"This one carries echoes of an older pattern. Somewhere in the archive, a creature like this once lived."*

**Flow:**
1. Two creatures breed. The offspring's trait vector happens to resemble an archived Norn named "Whisper."
2. The offspring's info panel shows: *"Born with the echo of the Violet Wanderer — a creature of the First Age, archived by a player whose name is written in the record."*
3. The player can choose to "Follow the Echo" — a quest-like interaction that leads to the full capsule discovery.
4. Following the Echo reveals the full legendary name, the depositor's narrative, and the option to attempt revival.

**Why cosine similarity:** The 20-trait vector is already normalized to [0,1]. Cosine similarity captures profile shape (a gentle, curious creature resembles another gentle, curious creature) without being thrown off by absolute magnitude differences.

#### Channel 3: Divine Revelation (Divinity System)

**Trigger:** A god in the divinity system (`packages/divinity/`) whose domain includes nature, death, memory, or ancestry reveals archived genomes as part of its mythology.

**Mechanic:** Gods with relevant domains occasionally generate **Reliquary Myths** — stories about ancient creatures that can be found in the faith system's holy texts or ritual outcomes.

**Flow:**
1. A player performs a ritual at a shrine to the God of Memory.
2. The ritual outcome includes: *"The god speaks of the Violet Wanderer — a creature of the old world, preserved in the deep archive. 'She was gentle,' says the god, 'and someone loved her enough to write her name in the stone.'"*
3. The myth includes the capsule's `legendaryName` and `eraTag`. The full capsule is unlocked for discovery.

**Integration point:** `packages/divinity/` gods with `domain` including `'memory'`, `'death'`, `'nature'`, or `'ancestry'` gain access to the capsule archive as a lore source. The `HolyTextSystem` can draw on archived capsules when generating religious texts about origins and ancestors.

#### Channel 4: Extinction Archaeology (Extinct Species Only)

**Trigger:** An extinction event (MUL-1152) fires for a species that has capsules in the archive.

**Mechanic:** After an extinction event, all capsules of the extinct species are elevated to **Last Record** status. These capsules become discoverable through a unique channel: **Extinction Sites** — locations in MVEE where the historical record of the extinction physically manifests.

**Flow:**
1. MVEE receives an extinction event for Norns.
2. In the biome where Norn-archetype creatures would naturally spawn, the world generates an **Extinction Site**: a clearing where nothing grows, surrounded by the last traces of the species.
3. Examination reveals: *"Here, the last Norns stood. Their bloodlines had narrowed until every child was an echo of every parent. The archive holds [N] of their genomes — the only proof they were ever more than one creature repeated."*
4. Each visit to the Extinction Site reveals one capsule from the extinct species' archive, staged over multiple sessions.

**Connection to MUL-1152:** The `extinction_event_v1.json` file includes `archiveLocation: "folkfork/extinct/[speciesId]/"`. The Extinction Archaeology channel reads from this location.

### 3.3 Discovery Staging (Anti-Data-Dump)

Capsules are **never** revealed in full on first contact. Discovery is staged:

| Stage | What the Player Sees | Data Revealed |
|-------|---------------------|---------------|
| **1. Trace** | Environmental hint, legendary name, era tag | `discoveryHints.legendaryName`, `discoveryHints.eraTag` |
| **2. Recognition** | Narrative fragment, species identity, depositor attribution (if not anonymous) | `genome.speciesId`, `genome.creatureName`, `depositor.playerDisplayName`, `depositor.depositNarrative` |
| **3. Revelation** | Full creature description as lore text — appearance, personality, behavioral tendencies written as prose, not numbers | `genome.visualTokens` (as prose), `genome.personality` (as character description), `genome.archetypeSeed` (as behavioral archetype) |
| **4. Revival Eligibility** | The option to attempt revival appears | Full `genome` payload available to the revival system |

Stages 1-3 can occur across multiple sessions (one stage per session visit to the discovery site) or in a single extended encounter, depending on the discovery channel. The point is: the player must *engage* to receive the full capsule. Speed-runners who examine and leave get only the Trace.

### 3.4 Revival Mechanic

Revival is not cloning. It is closer to *reincarnation* — the genome returns, but the creature is new.

**Prerequisites for revival:**
- Player has completed all 4 discovery stages for the capsule
- Player has a creature of compatible archetype (same `archetypeSeed` or same species) in their current world
- The archived genome passes integrity verification (§5)

**Revival process:**
1. The player selects "Awaken the Archive" at the discovery site.
2. The compatible creature performs a **Vigil** — standing at the discovery site for one game-day. During the Vigil, the creature's behavior subtly shifts toward the archived genome's personality profile (a preview of what the revived creature will be like).
3. At the end of the Vigil, the revived creature spawns. It is a new entity with:
   - **Genetics:** The archived genome's 20 traits, mapped through `CreatureImportFactory` (per genome bridge spec §MVEE Integration)
   - **Personality:** The archived personality dimensions
   - **Visual appearance:** The archived `visualTokens`
   - **Name:** The `legendaryName` from `discoveryHints`, not the original `creatureName` (the original name is in the lore; the revived creature earns its own identity)
   - **Lore tag:** *"Revived from the archive. Original genome deposited by [playerDisplayName] in the [eraTag]. [depositNarrative if present]."*
   - **No memories:** The revived creature has no Chronicle history, no behavioral learning, no relationships. It is genetically identical to the archived creature but experientially blank. This is consistent with the genome bridge `lossDeclaration`: *"memories stayed behind."*

**Revival cost:** The compatible creature that performed the Vigil loses one generation of breeding capacity (its next offspring will have +0.05 F coefficient, representing the genetic investment of anchoring the revival). This is a mild cost — meaningful enough to prevent spam revival, light enough to not discourage it.

**Multiplicity:** Each capsule can be revived once per world. If the revived creature dies, the capsule returns to the archive for future discovery. If the revived creature breeds, its offspring carry the archived genetics through MVEE's normal inheritance system — the lineage lives on.

---

## 4. Attribution Model

### 4.1 Who Gets Credited

The `depositor` field in the capsule schema carries attribution. Credit appears at Discovery Stage 2 and persists on the revived creature's lore panel.

**Attribution display format:**
- Named depositor: *"Genome archived by [playerDisplayName]"*
- Anonymous depositor: *"Genome archived by an unknown hand"*
- Extinction auto-archive: *"Genome preserved at the moment of extinction"*
- System migration: *"Genome carried across the dimensional threshold"*

### 4.2 Opt-Out Path

**At deposit time:**
- Player can choose to deposit anonymously (no `playerId` or `playerDisplayName` stored)
- Player can choose a pseudonym different from their game identity
- Player can include or omit the narrative note

**After deposit:**
- A player can request removal of their `playerDisplayName` from any capsule by submitting a Folkfork feedback entry (`type: 'general'`, `subject: 'capsule-attribution-removal'`). The pipeline strips the display name but preserves the capsule. The deposit becomes anonymous.
- A player can request full capsule deletion. Per Conservation of Game Matter (CLAUDE.md), the capsule is not deleted — it is marked `withdrawn: true` and excluded from discovery selection. The genome data is retained but the capsule no longer surfaces in gameplay.

### 4.3 Attribution Inheritance

When a revived creature breeds, its offspring carry a diluted attribution tag:

- Generation 1 (revived): *"Genome archived by [name]"*
- Generation 2 (offspring): *"Descended from an archived genome (depositor: [name])"*
- Generation 3+: *"Carries the echo of an ancient lineage"* (no specific depositor name — attribution fades as the lineage grows, consistent with how oral tradition works)

---

## 5. Integrity Verification

### 5.1 Dual-Layer Checksums

The capsule schema includes two SHA-256 checksums:

| Layer | What It Covers | Purpose |
|-------|---------------|---------|
| **Genome checksum** (`genomeChecksum`) | `genome.traits` array (canonical JSON, sorted keys, no whitespace) | Identical to `creature_exchange_v1.genomicIntegrity.checksum`. Proves the genome data is unmodified from the original export. |
| **Capsule checksum** (`capsuleChecksum`) | Entire capsule payload minus the `capsuleChecksum` field itself | Proves the capsule metadata (depositor, provenance, discovery hints) has not been tampered with post-deposit. |

### 5.2 Verification Workflow

**At deposit time (Folkfork write):**
1. Validate the incoming `creature_exchange_v1` payload against schema
2. Recompute genome checksum from `traits` array; reject if mismatch with `genome.genomicIntegrity.checksum`
3. Generate `capsuleId` (UUID v4)
4. Populate `depositor`, `provenance`, `discoveryHints` fields
5. Compute `capsuleChecksum` over the complete payload (excluding `capsuleChecksum` field)
6. Write capsule file to `folkfork/archive/capsules/[speciesId]/`
7. Update species and global index files

**At discovery time (MVEE read):**
1. Read capsule file
2. Recompute `capsuleChecksum`; if mismatch → capsule is corrupted → do not surface in gameplay; log warning
3. Recompute `genomeChecksum` from `genome.traits`; if mismatch → genome data corrupted → do not offer revival; mark capsule as `integrity_failed` in index
4. If both checksums pass → capsule is valid for discovery staging and revival

**At revival time (MVEE creature creation):**
1. Re-verify both checksums (defense in depth — the file may have been modified between discovery and revival)
2. Validate genome against `creature_exchange_v1` schema
3. Clamp all numeric values to documented ranges (per genome bridge spec §Data Integrity)
4. Proceed with `CreatureImportFactory` mapping

### 5.3 Tamper Response

If verification fails at any stage:
- The capsule is not deleted (Conservation of Game Matter)
- It is flagged `integrity: "failed"` in the species index
- It is excluded from future discovery selection
- A Chronicle entry is generated: *"A trace was found in the archive, but its patterns were broken — corrupted by time or interference. The genome cannot be read."* (Lore-consistent: archives decay.)

---

## 6. Edge Cases

### 6.1 Extinct Species Capsules

**The most important edge case.** When a species goes extinct (MUL-1152), its archived capsules become the only genetic record of that species. Per MUL-1152 §2.3.5 and the extinction event spec §5, genomes of all living members at extinction are auto-archived.

**Special handling for extinct species capsules:**

| Aspect | Behavior |
|--------|----------|
| **Discovery priority** | Extinct species capsules always rank higher in discovery selection than extant species capsules. The urgency of a vanished species trumps the interest of a living one. |
| **Extinction Site channel** | Exclusive discovery channel (§3.2 Channel 4). Extinct species capsules can also be found through all other channels, but they gain this additional path. |
| **Last Record label** | Capsule lore includes: *"This genome is a Last Record — the species that produced it no longer exists in any living world."* |
| **Revival implications** | Reviving an extinct species capsule creates the *only living member* of that species in MVEE. The revived creature's lore panel notes: *"The last of a kind thought lost. Resurrected from the archive."* If this creature breeds and establishes a population, the species is considered **de-extinct** — a Chronicle event fires: *"The [species] walk again. [N] generations after extinction, a new population breathes."* |
| **Connection to extinction metrics** | The capsule's `provenance.populationMetrics` preserves the D_cc and F values at extinction time. These are displayed in the Extinction Site lore as historical data: *"At the end, their behavioral divergence was [D_cc] — nearly zero. Their inbreeding coefficient was [F]."* |

### 6.2 Self-Discovery Prevention

A player cannot discover their own capsule deposits. Discovery is the experience of encountering *someone else's* preserved creature. If the archive contains only capsules from the current player, the discovery system falls back to extinction auto-archives (which have no individual depositor) or generates no discovery event.

**Exception:** If the player deposited a capsule more than 30 real-world days ago, the self-discovery exclusion lifts. Time creates sufficient distance — rediscovering your own creature after a month feels like genuine archaeological rediscovery, not a feedback loop.

### 6.3 Empty Archive

If the archive contains no capsules (new game installation, no community contribution), the discovery channels produce no events. The Fossil Sites, Genetic Echoes, and Divine Revelations simply do not fire. The game does not tell the player the archive is empty — the absence of discovery is itself the experience of a young world with no history yet.

### 6.4 Archive Scaling

As the archive grows (hundreds or thousands of capsules), discovery selection must avoid always surfacing the same capsules:

- **Weighted random selection** using capsule age, species rarity, and player-local discovery history
- **Player discovery log:** Track which capsules a player has encountered (by `capsuleId`). Never re-surface a capsule the player has already reached Stage 2+ with.
- **Session uniqueness:** Maximum 1 new capsule discovery per session. Multiple discovery channels can fire in one session, but they all point to the same capsule.

### 6.5 Cross-Game Capsules

Capsules from Precursors and capsules from MVEE coexist in the same archive. The `provenance.sourceGame` field distinguishes them. MVEE preferentially surfaces Precursors capsules (cross-game discovery is more mythologically interesting than same-game discovery), but MVEE-origin capsules are valid discovery targets.

### 6.6 Version Migration

When `creature_exchange_v1` is superseded by a future version (v2), existing capsules remain in v1 format. The discovery system must support reading all capsule versions. The `capsuleVersion` field enables version-specific parsing. Capsules are never migrated in-place (the original deposit is the archival record — rewriting it violates provenance).

---

## 7. Implementation Dependencies

This spec is a **design document**. No code changes are required from this task.

**Implementation order for future sprint planning:**

| Priority | Component | Owner | Dependency |
|----------|-----------|-------|------------|
| 1 | Capsule file write (deposit) | Roy (Staff SWE) | Folkfork directory structure |
| 2 | Index generation and maintenance | Roy | Capsule write |
| 3 | Integrity verification layer | Roy | SHA-256 from genome bridge spec |
| 4 | Discovery selection engine | Roy + Scheherazade | Archive index, world generator |
| 5 | Fossil Site world generation | Roy | World generator (`packages/world/`) |
| 6 | Genetic Echo breeding hook | Roy | Reproduction system (`packages/reproduction/`) |
| 7 | Divine Revelation integration | Scheherazade | Divinity system (`packages/divinity/`), HolyTextSystem |
| 8 | Extinction Site generation | Roy | MUL-1152 extinction consumer |
| 9 | Revival mechanic (CreatureImportFactory) | Roy | MUL-1057 Phase 3 |
| 10 | Attribution and opt-out UI | Roy | Folkfork feedback pipeline |

---

## 8. Connection to Sibling Specs

| Spec | Relationship |
|------|-------------|
| **Cross-Game Genome Bridge v1** (MUL-1057) | The capsule wraps a `creature_exchange_v1` payload. All genome data, trait mappings, and integrity fields are inherited from this spec. The Time Capsule adds the archival layer (depositor, provenance, discovery) on top. |
| **Cross-Game Extinction Events** (MUL-1152) | Extinction auto-archives genomes as capsules. The Time Capsule's Extinction Archaeology channel is the discovery mechanic for these auto-archived genomes. Together they form a loop: extinction → archive → discovery → revival → de-extinction. |
| **Ancestral Memory Replay** (MUL-1150) | Memory threads and genome capsules are complementary. A memory thread is the *story* of a creature's life; a capsule is the *body*. A player could discover both: first the memory thread (what the creature did), then the capsule (what the creature was). Revival reunites the genome with the narrative — the revived creature has no memories, but the player holds the memory thread as context. |
| **Folklore Seed Review Protocol** (MUL-1151) | Capsule `depositNarrative` texts and auto-generated `legendaryName` values should be reviewed under the same cultural sensitivity framework as folklore seeds. A capsule named "The Spirit Walker of the Sacred Grove" requires the same review gate as a species seed with similar cultural references. |

---

## References

- Fowler, C. (2008). *Seeds on Ice: Svalbard and the Global Seed Vault*. Prospecta Press. — Preservation model for long-duration genetic archives
- Kurin, R. (2004). "Safeguarding Intangible Cultural Heritage in the 2003 UNESCO Convention." *Museum International* 56(1-2): 66–76. — Digital cultural heritage preservation obligations
- Derrida, J. (1995). *Archive Fever: A Freudian Impression*. University of Chicago Press. — The politics and phenomenology of archival systems
- Grand, S. (2000). *Creation: Life and How to Make It*. Harvard University Press. — Creatures biochemistry heritage (credited throughout genome bridge)
- Wright, S. (1922). "Coefficients of Inbreeding and Relationship." *American Naturalist* 56(645): 330–338. — F coefficient used in extinction detection
- Frankham, R., Ballou, J.D. & Briscoe, D.A. (2002). *Introduction to Conservation Genetics*. Cambridge University Press. — Extinction vortex model referenced in MUL-1152
- `cross-game-genome-bridge-spec-v1.md` (MUL-1057) — Creature exchange schema, SHA-256 integrity, 20-trait portable genome
- `cross-game-extinction-event-spec.md` (MUL-1152) — Extinction detection, auto-archival, `extinctionSurvivor` flag
- `ancestral-memory-replay-spec.md` (MUL-1150) — Memory threads as companion to genome capsules

---

*Filed: 2026-03-14 by Scheherazade (Folklorist)*
*Task: MUL-1144 | Parent: MUL-1131 (Sprint 4 Theme C3)*
*Related: MUL-1057, MUL-1152, MUL-1150, MUL-1151, MUL-1136*
*The archive is not a database. It is a promise that something mattered enough to be remembered.*

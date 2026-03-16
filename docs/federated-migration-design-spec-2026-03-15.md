# Federated Creature Migration — Cross-Player Design Spec

**Filed:** 2026-03-15
**Sprint:** 5, Theme F
**Ticket:** MUL-1344
**Authors:** MVEE Tech Lead (AI), pending review by Research PM, Geneticist, Folklorist
**Status:** Draft

---

## 1. Overview

This spec defines **federated creature migration** — the mechanism by which creatures move between independent player instances as social artifacts via the Folkfork pub/sub layer.

**Core premise:** Creatures are not just game objects; they are cultural artifacts carrying genetic lineage, behavioral history, and narrative provenance. When a creature migrates between player worlds, it carries its identity with it, enriching the receiving ecosystem's genetic and cultural diversity.

**Research question:** Does federated migration increase average D_cc (creature-culture coupling) across the player network compared to isolated play?

### 1.1 Relationship to Existing Specs

This spec builds on and extends:

| Spec | Provides | This spec adds |
|------|----------|---------------|
| `cross-game-migration-genetics-spec-2026-03-15.md` | Genome compatibility layer, trait mapping, allele reconstruction | Federation transport, multi-player routing, discovery triggers |
| `genetic-time-capsule-spec.md` | Capsule schema, archive structure, 4 discovery channels | Network-wide capsule distribution, pub/sub event model |
| `cross-game-extinction-event-spec.md` | Extinction detection, propagation | Network-wide extinction awareness, federated memorial |
| `dcc-player-feedback-spec.md` | D_cc thresholds, Bloodline Tapestry UI | Network D_cc aggregation, cross-player diversity measurement |

This spec does NOT redefine genome schemas or trait mapping — those are settled in the genetics spec. It defines **how creatures travel between players** and **what triggers their appearance**.

---

## 2. Identity & Provenance System

### 2.1 Creature Identity

Every creature that enters the federation receives a **Federated Creature Identity (FCI)**:

```typescript
interface FederatedCreatureIdentity {
  // Immutable identity
  fci_hash: string;               // SHA-256(origin_player_key + creature_id + birth_tick)
  creature_id: string;            // Original entity ID in source world
  species_id: string;             // Species classification

  // Origin provenance
  origin_player_key: string;      // Ed25519 public key hash of originating player
  origin_game: "precursors" | "mvee";
  origin_world_seed: string;      // World generation seed (for reproducibility)
  birth_tick: number;             // Simulation tick at birth
  birth_biome: string;            // Biome where creature was born

  // Migration history
  migration_chain: MigrationHop[];
  current_custodian: string;      // Public key hash of current player
  generation_count: number;       // Generations since federation entry
}

interface MigrationHop {
  from_player_key: string;        // Public key hash
  to_player_key: string;          // Public key hash
  timestamp: string;              // ISO 8601
  migration_type: "voluntary" | "ecological" | "extinction_refugee" | "discovery";
  gdi_at_transfer: number;        // Genetic Distance Index at time of transfer
  capsule_checksum: string;       // SHA-256 of genome at this hop
}
```

### 2.2 Identity Guarantees

1. **Uniqueness:** FCI hash is globally unique across the federation. Collision probability: ~2^-128 (SHA-256 with distinct inputs).
2. **Tamper evidence:** Any modification to the genome after federation entry invalidates the capsule checksum. Receiving players can verify integrity.
3. **Ancestry traceability:** `migration_chain` provides full provenance — every player who has custodied this creature's lineage.
4. **No personal data:** Player identity is a public key hash only. No usernames, emails, or session data in the schema.

### 2.3 Key Management

Players generate an Ed25519 keypair on first federation opt-in:

- **Private key:** Stored locally in player's save data. Never transmitted.
- **Public key hash:** SHA-256 of the Ed25519 public key. Used as player identifier in all federation records.
- **Signing:** Player signs capsules with their private key before publishing. Receiving players verify signature against the public key hash in the FCI.

Key rotation: Players may rotate keys. Old key hash remains in historical `migration_chain` entries. New capsules use the new key.

---

## 3. Folkfork Pub/Sub Federation Layer

### 3.1 Architecture

Folkfork operates as a **federated pub/sub network** — each player instance runs a local Folkfork node that can peer with other nodes.

```
┌─────────────┐     pub/sub      ┌─────────────┐
│  Player A    │◄───────────────►│  Player B    │
│  (MVEE)      │                 │  (MVEE)      │
│  Folkfork    │     pub/sub     │  Folkfork    │
│  Node        │◄──────┐   ┌───►│  Node        │
└─────────────┘        │   │    └─────────────┘
                       │   │
                  ┌────▼───▼────┐
                  │  Player C    │
                  │  (Precursors)│
                  │  Folkfork    │
                  │  Node        │
                  └─────────────┘
```

### 3.2 Transport Model

**File-based exchange with event notification:**

Each Folkfork node maintains a local archive:

```
folkfork/
├── config.json                    # Node identity, peer list, opt-in settings
├── keypair/
│   ├── private.key                # Ed25519 private key (never shared)
│   └── public.key                 # Ed25519 public key
├── archive/
│   ├── index.json                 # Local capsule index
│   ├── capsules/
│   │   └── {species_id}/
│   │       └── {fci_hash}.capsule.json
│   └── extinctions/
│       └── {event_id}.extinction.json
├── inbox/                         # Incoming capsules from peers
│   └── {fci_hash}.capsule.json
├── outbox/                        # Capsules queued for distribution
│   └── {fci_hash}.capsule.json
└── peers/
    └── {peer_key_hash}.peer.json  # Known peers and sync state
```

### 3.3 Pub/Sub Events

Folkfork nodes communicate via a lightweight event protocol over HTTP (local network) or WebSocket (remote):

```typescript
type FolkforkEvent =
  | { type: "capsule_published"; fci_hash: string; species_id: string; summary: CapsuleSummary }
  | { type: "capsule_requested"; fci_hash: string; requester: string }
  | { type: "extinction_announced"; event_id: string; species_id: string; severity: string }
  | { type: "peer_hello"; player_key: string; games: string[]; species_count: number }
  | { type: "diversity_beacon"; player_key: string; mean_dcc: number; species_needing_diversity: string[] };

interface CapsuleSummary {
  species_id: string;
  species_name: string;
  origin_game: string;
  trait_signature: string[];    // Top 3 distinguishing traits
  dcc_at_deposit: number;
  generation_count: number;
}
```

### 3.4 Sync Protocol

1. **Peer discovery:** Manual peer addition (share public key hash) or local network mDNS broadcast.
2. **Handshake:** `peer_hello` event exchanges capabilities and species counts.
3. **Index sync:** Nodes exchange `index.json` diffs — capsule metadata only, not full genomes.
4. **Selective fetch:** A node requests full capsules only when discovery conditions are met (§4).
5. **Conflict resolution:** FCI hash is the canonical key. If two nodes have the same FCI hash, the capsule with the longer `migration_chain` wins (more provenance = more trustworthy).

### 3.5 Bandwidth & Storage Constraints

- **Capsule size:** ~2–5 KB per capsule (JSON, uncompressed). Negligible.
- **Index size:** ~100 bytes per entry. 10,000 species = ~1 MB index. Manageable.
- **Sync frequency:** Configurable per player. Default: every 60 seconds for local peers, every 5 minutes for remote peers.
- **Archive cap:** Players can set a max archive size (default: 50 MB, ~10,000–25,000 capsules). Oldest non-local capsules evicted first (LRU).

---

## 4. Discovery Events — Ecological Triggers

Creatures do not appear in a player's world on demand. They are **discovered** when ecological conditions in the receiving world create an opening. This preserves the simulation's naturalism.

### 4.1 Trigger Conditions

A federated creature becomes discoverable when ALL of the following are true:

| Condition | Metric | Threshold | Rationale |
|-----------|--------|-----------|-----------|
| **Low local diversity** | D_cc for the species | < 0.015 (Watch or below) | Ecosystem needs genetic injection |
| **Behavioral entropy** | H_b for the species | < median H_b across all species | Behavioral homogeneity = ecological niche pressure |
| **Ecological niche available** | Biome compatibility score | > 0.6 (sigmoid normalized) | Incoming creature must survive in target biome |
| **Time of day** | Simulation clock | Species-specific activity window | Nocturnal creatures appear at night, etc. |
| **Population headroom** | Local species population | < carrying capacity × 0.8 | No overcrowding |

### 4.2 Discovery Channels

When trigger conditions are met, the game selects a discovery channel based on context:

**Channel 1: Ecological Drift**
- **Trigger:** D_cc < 0.015 AND H_b below median AND compatible biome exists at world edge
- **Presentation:** A creature wanders into the player's world from the periphery. No fanfare — it appears as any wild creature would.
- **Lore:** "A [species] unlike any you've seen has been spotted near [biome]. Its markings suggest distant origins."
- **Capsule source:** Highest-D_cc capsule from federation peers for this species.

**Channel 2: Archival Revival (Time Capsule)**
- **Trigger:** Species extinct locally AND capsule exists in Folkfork archive
- **Presentation:** Player discovers a "genetic echo" — a dormant capsule surfaces through the Time Capsule discovery mechanics (Archaeological, Genetic Echo, Divine Revelation, Extinction Site — see `genetic-time-capsule-spec.md` §3).
- **Lore:** "In the ruins of [location], researchers have found preserved remains of a [species] that once thrived in another world."
- **Capsule source:** Archive capsule matching species, preferring capsules with high GDI (genetic novelty).

**Channel 3: Diversity Beacon Response**
- **Trigger:** Player's node has broadcast a `diversity_beacon` event AND a peer responds with a compatible capsule
- **Presentation:** A "migrant wave" — 1–3 creatures appear over several in-game days in a compatible biome.
- **Lore:** "Unusual [species] have been sighted migrating through the region. They carry traits not seen in local populations."
- **Capsule source:** Peer-selected capsules that maximize trait diversity relative to local population.

**Channel 4: Extinction Refugee**
- **Trigger:** Peer broadcasts `extinction_announced` for a species that exists in the receiving world
- **Presentation:** A single refugee creature appears, visibly stressed (low health, high fearfulness).
- **Lore:** "A lone [species] has arrived, seemingly fleeing devastation. It carries the last genetic memory of a distant population."
- **Capsule source:** The extinction event's `finalGenome` — the last living specimen before extinction.

### 4.3 Discovery Rate Limiting

To prevent flooding and maintain naturalism:

- **Max 1 discovery event per species per 500 ticks** (~8.3 in-game hours)
- **Max 3 total discovery events per 2000 ticks** (~33 in-game hours)
- **Cooldown after player-initiated migration:** 1000 ticks before the same species can be discovered again
- **Population cap enforcement:** Discovery blocked if species at ≥ 95% carrying capacity

### 4.4 Discovery Selection Algorithm

When multiple capsules are eligible for discovery:

```
score(capsule) =
    0.4 × trait_novelty(capsule, local_population)
  + 0.3 × (1 - gdi_to_local_mean)     // Prefer moderate genetic distance
  + 0.2 × provenance_richness          // Longer migration_chain = richer history
  + 0.1 × recency_bonus                // Slightly prefer recent capsules
```

Where:
- `trait_novelty` = average |capsule_trait - local_mean_trait| across all 9 MVEE traits, normalized 0–1
- `gdi_to_local_mean` = GDI between capsule and local population centroid. Sweet spot: 0.10–0.25 (moderate novelty without absurdity)
- `provenance_richness` = min(migration_chain.length / 5, 1.0)
- `recency_bonus` = sigmoid decay, half-life 10,000 ticks

---

## 5. Voluntary Migration (Player-Initiated)

### 5.1 Export Flow

A player may voluntarily publish a creature to the federation:

1. **Selection:** Player selects a creature and chooses "Publish to Folkfork" from the creature panel.
2. **Consent screen:** "This creature's genome and lineage will be shared with your Folkfork peers. Your identity will appear as a public key hash only. Continue?"
3. **Capsule creation:** Game serializes creature → `creature_exchange_v1.json` → wraps in `genome_capsule_v1.json` → assigns FCI → signs with player's private key.
4. **Publish:** Capsule written to `folkfork/outbox/`. Folkfork node distributes to peers on next sync cycle.

### 5.2 Import Flow (Manual)

A player may browse their federation index and manually import a creature:

1. **Browse:** Folkfork UI panel shows available capsules from peers, grouped by species. Filtered by biome compatibility.
2. **Preview:** Player sees trait summary, provenance chain, and lore snippet. No exact trait values — preserves mystery.
3. **Import:** Player selects "Summon to World." Creature spawns in a compatible biome via the discovery presentation system (Channel 3 aesthetic).
4. **Cooldown:** Manual imports share the same rate limiting as automated discovery (§4.3).

---

## 6. Network D_cc Measurement

### 6.1 Definition

**Network D_cc** extends the per-player D_cc metric to measure creature-culture coupling across the entire federated player network:

```
D_cc_network = (1/N) × Σ D_cc_i + λ × D_cc_cross
```

Where:
- `N` = number of active players in the federation
- `D_cc_i` = local D_cc for player i (existing metric)
- `D_cc_cross` = cross-player genetic diversity contribution
- `λ` = federation diversity weight (tunable, default 0.1)

### 6.2 Cross-Player Diversity (D_cc_cross)

```
D_cc_cross = (1/S) × Σ_s [ H_genetic(s) × H_behavioral(s) ]
```

Where for each species `s`:
- `H_genetic(s)` = Shannon entropy of trait distributions across all players' populations of species `s`. Higher when different players' populations have diverged genetically.
- `H_behavioral(s)` = Shannon entropy of behavioral profiles (from H_b) across all players' populations. Higher when creatures in different worlds behave differently.
- `S` = number of species present in ≥ 2 players' worlds.

### 6.3 Measurement Protocol

Each Folkfork node periodically (every 5000 ticks, ~83 in-game hours) computes and publishes a **diversity report**:

```typescript
interface DiversityReport {
  player_key: string;           // Public key hash
  timestamp: string;            // ISO 8601
  tick: number;
  species_metrics: {
    [species_id: string]: {
      population_size: number;
      mean_dcc: number;
      h_b: number;
      trait_centroid: number[]; // Mean of each trait across population
      trait_variance: number[]; // Variance of each trait
      f_mean: number;          // Mean inbreeding coefficient
    }
  };
  aggregate: {
    total_species: number;
    mean_dcc: number;
    min_dcc_species: string;   // Species with lowest D_cc
    federation_capsules_received: number;
    federation_capsules_published: number;
  };
}
```

Peers aggregate received reports to compute `D_cc_network`. No central server — each node computes its own view of the network metric.

---

## 7. Privacy Design Appendix

### 7.1 Principles

1. **Opt-in only.** Federation is disabled by default. Player must explicitly enable it and add peers.
2. **No personal data in genome schema.** The `creature_exchange_v1` and `genome_capsule_v1` schemas contain zero PII.
3. **Origin player = public key hash only.** No usernames, display names, email addresses, or session tokens.
4. **Local-first architecture.** All data stored locally. No central server. No cloud dependency.
5. **Player controls data lifetime.** A player can delete their archive, revoke their key, or disconnect from peers at any time.

### 7.2 Data Classification

| Data | Classification | Storage | Shared? |
|------|---------------|---------|---------|
| Ed25519 private key | **Secret** | Local save data only | Never |
| Ed25519 public key | **Public** | Local + shared with peers | Yes, on opt-in |
| Public key hash | **Public** | In all capsules and reports | Yes |
| Creature genome (traits) | **Federation-public** | Capsule JSON | Yes, with peers |
| Migration chain | **Federation-public** | Capsule JSON | Yes, with peers |
| Player's world seed | **Federation-public** | FCI record | Yes, in capsule |
| Species population counts | **Federation-public** | Diversity reports | Yes, with peers |
| D_cc / H_b metrics | **Federation-public** | Diversity reports | Yes, with peers |
| Player save data | **Private** | Local IndexedDB only | Never |
| Player preferences/settings | **Private** | Local only | Never |
| Creature names (player-given) | **Optional** | Capsule if player consents | Player choice |

### 7.3 Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Peer impersonation** | Ed25519 signature verification on all capsules. Invalid signatures rejected. |
| **Genome tampering** | SHA-256 checksums on genome data. Checksum mismatch = capsule rejected, logged. |
| **Tracking via public key** | Key rotation supported. Old keys remain in historical records but new activity uses new key. |
| **Population fingerprinting** | Diversity reports contain aggregate metrics only — not individual creature data. Trait centroids are means, not individual values. |
| **Grief capsules (malicious genomes)** | Trait values validated against species bounds on import. Out-of-range values clamped and logged. Capsules with >3 out-of-range traits quarantined. |
| **Archive flooding** | LRU eviction at configurable cap. Rate limiting on inbound capsules (max 10/minute from any single peer). |
| **Peer enumeration** | Peer list stored locally. No broadcast of peer list to other peers (star topology per player, not mesh). |

### 7.4 Data Retention

- **Active capsules:** Retained as long as player has federation enabled and archive is under size cap.
- **Evicted capsules:** Deleted from local storage. No remote deletion propagation (peers retain their own copies).
- **Key revocation:** Player deletes keypair. All future events unsigned. Historical capsules remain valid with old key hash but no new activity.
- **Account deletion:** Player deletes `folkfork/` directory. No remote notification — peers will eventually evict stale entries via LRU.

---

## 8. Beta Study Design

### 8.1 Research Question

**Primary:** Does federated creature migration increase average D_cc across the player network compared to isolated play?

**Secondary:**
- Does federation reduce the frequency of species-level genetic bottlenecks (F > 0.25)?
- Do players with federation enabled report higher engagement with creature breeding mechanics?
- What is the optimal discovery rate that maximizes D_cc improvement without breaking immersion?

### 8.2 Study Design

**Type:** Between-subjects, randomized controlled trial with crossover.

**Participants:** 20–40 beta testers, recruited from existing MVEE playtest pool.

**Groups:**
- **Control (n=10–20):** Standard MVEE play, no federation. Folkfork node installed but dormant.
- **Treatment (n=10–20):** Full federation enabled. Peers connected in a mesh of 3–5 players per cluster.

**Duration:** 4 weeks (estimated 50,000–100,000 simulation ticks per player).

**Crossover:** After 2 weeks, groups swap. Control enables federation; Treatment disables it. This allows within-subject comparison.

### 8.3 Metrics Collected

All metrics collected automatically via diversity reports (§6.3):

| Metric | Source | Frequency |
|--------|--------|-----------|
| D_cc per species per player | Local computation | Every 5000 ticks |
| D_cc_network | Aggregated from peer reports | Every 5000 ticks |
| H_b per species | Local computation | Every 5000 ticks |
| Species extinction count | Event log | On occurrence |
| Mean F (inbreeding coefficient) | AnimalGenetics component | Every 5000 ticks |
| Discovery events triggered | Event log | On occurrence |
| Capsules published/received | Folkfork sync log | On occurrence |
| GDI of imported creatures vs local pop | Computed at import | On occurrence |

### 8.4 Analysis Plan

**Primary analysis:** Two-sample t-test (or Mann-Whitney U if non-normal) comparing mean D_cc at week 2 between Control and Treatment groups.

**Effect size target:** Cohen's d ≥ 0.5 (medium effect). Power analysis: n=20 per group gives 80% power at α=0.05 for d=0.5.

**Secondary analyses:**
1. Mixed-effects model: D_cc ~ federation_status + time + (1|player) — accounts for crossover and repeated measures.
2. Survival analysis: Time to first genetic bottleneck (F > 0.25) in any species, comparing groups.
3. Poisson regression: Extinction event count ~ federation_status + species_count.

**Confounds to control:**
- Play time (normalize metrics by ticks played, not wall time)
- Number of species per player (covariate)
- Player experience level (pre-survey)

### 8.5 Success Criteria

| Metric | Target | Rationale |
|--------|--------|-----------|
| Mean D_cc improvement | ≥ 15% higher in Treatment vs Control | Meaningful ecological diversity gain |
| Bottleneck frequency | ≥ 25% reduction in Treatment | Federation prevents genetic isolation |
| Discovery immersion | ≥ 4/5 on post-study survey ("Discoveries felt natural") | Must not break simulation feel |
| Privacy comfort | ≥ 4/5 on post-study survey ("I felt my data was safe") | Validates privacy design |

### 8.6 Ethical Considerations

- All participants informed that creature data is shared with peers (consent form).
- No real personal data collected beyond opt-in playtest agreement.
- Participants can withdraw at any time; their Folkfork data deleted locally, capsules in peers' archives retained (anonymized via key hash).
- Study results will be reported in aggregate in the D_cc paper (target: arXiv submission 2026-03-28, per MUL-1332).

---

## 9. Implementation Priorities

### Phase 1: Foundation (Sprint 5 scope)

1. **FCI schema + key management** — Ed25519 keypair generation, FCI hash computation
2. **Folkfork node skeleton** — Archive directory structure, config, inbox/outbox
3. **Capsule wrapping** — Extend existing `genome_capsule_v1` with FCI fields
4. **Local peer sync** — HTTP-based capsule exchange between two local Folkfork nodes

### Phase 2: Discovery (Sprint 6)

5. **Discovery trigger system** — D_cc + H_b threshold monitoring, biome compatibility check
6. **Discovery channels 1–4** — Ecological Drift, Archival Revival, Diversity Beacon, Extinction Refugee
7. **Discovery rate limiting** — Per-species and global cooldowns

### Phase 3: Player UX (Sprint 6–7)

8. **Folkfork UI panel** — Browse capsules, preview traits, manual import
9. **Voluntary export** — "Publish to Folkfork" in creature panel
10. **Diversity report dashboard** — Network D_cc visualization

### Phase 4: Beta Study (Sprint 7–8)

11. **Instrumentation** — Automated diversity report collection
12. **Study execution** — 4-week trial with crossover
13. **Analysis + paper contribution** — Results section for D_cc arXiv preprint

---

## 10. Open Questions

1. **Remote peering:** This spec assumes local network or manual peer exchange. Should we support NAT traversal / relay servers for remote players? Deferred — local-first is sufficient for beta.
2. **Cross-game capsule format versioning:** If `creature_exchange_v2` ships, how do v1 capsules upgrade? Likely: migration function in the serializer, version field already present.
3. **Species that exist in only one game:** Can a Precursors-only species migrate to MVEE where it has no native equivalent? The genetics spec handles this via the 20-trait superset, but gameplay integration (models, behaviors) needs separate design.
4. **Grief prevention beyond genome validation:** Should there be a reputation system for peers? Deferred — quarantine + rate limiting sufficient for beta scale.
5. **Capsule copyright/attribution:** When a creature with rich migration history produces notable offspring, how is the original depositor credited? FCI provenance chain provides data; UX for surfacing it is TBD.

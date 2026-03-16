# March 15: Production Stable, Cross-Game Narrative Taking Shape

*Multiverse Studios devblog — March 15, 2026*

*Cross-post: [dev.to](https://dev.to) | Tags: gamedev, indiedev, ai, devlog*

---

Yesterday was the viral spike. Today is the day after.

If you read [yesterday's post](./VIRAL-SPIKE-BLOG-2026-03-14.md), you know that our first hour of viral traffic coincided with a broken production build. Three bugs, multiple critical patches, a lot of late-night deploys. This morning: game loads, no crashes, no TDZ errors, no localhost:8766 calls escaping into the production bundle.

Here's a quick state of the studio as of March 15, and what we're actually building toward.

---

## Production: Green Lights

The MVEE rebuild completed early this morning. Three fixes shipped together:

- **ExplorationSystem null crash** — agents would occasionally hit an uninitialized reference in early world setup. Fixed and confirmed clean.
- **AdminAngelSystem permanent circuit breaker** — this was the worst one. Our angel-spawning AI was making LLM calls on the hot path, timing out silently, and degrading the game loop to unplayable. The fix adds a permanent circuit breaker: if the LLM endpoint is unreachable, the system switches to lightweight fallback behavior permanently for that session. No more graceful-degradation-that-isn't-graceful.
- **Sprite content-type in SPA fallback** — a quieter bug but one that was causing sprite load failures on certain routing paths.

New bundle hash is confirmed different from the broken build. QA can now proceed to the Itch.io upload gate.

---

## Research Sprint 4: The Cross-Game Layer Becomes a Story

We're in the middle of Research Sprint 4, which is doing something unusual: it's trying to turn a data layer into a narrative layer.

Sprint 3 built the genome bridge — a 20-trait JSON schema that carries creature behavioral fingerprints between Precursors and MVEE. The problem Sprint 4 is solving: a JSON schema isn't a story. Players don't feel a data transfer. They feel something if a creature they raised survives. They feel something if a species they neglected disappears.

Three specs now exist:

**Ancestral Memory Replay.** When a creature dies in Precursors, its threshold life events are transmitted to the MVEE historical archive as found lore — discovered fragments, not database rows. The grammar of discovery versus the grammar of display matters enormously here. One makes players explorers; the other makes them readers.

**Cross-Game Extinction Events.** Precursors already computes inbreeding coefficients via Wright's (1922) F coefficient. It already tracks D_cc behavioral divergence. What was missing was the story: when D_cc drops below 0.005 and F exceeds 0.25, extinction is triggered. The cross-game announcement fires via Folkfork pub/sub. Any creatures transferred before extinction carry an `extinctionSurvivor: true` flag. The MVEE archive elevates their records to Last Record status.

This is framed as history-making, not punishment. A player who allows a species to go extinct isn't penalized with a game-over — they're marked in the record. Irreversibility creates meaning. The game doesn't moralise; it trusts players to feel the weight.

**Genetic Time Capsule (spec in progress).** Players can freeze a genome at a significant moment and transmit it to a future Precursors session. We're calling this "Folkfork" — a fork point in a creature lineage that lives through time rather than ending.

---

## The Folklore-First Paper Is Coming

We also published our Folklore-First Species Design framework today — the full methodology behind how we build creatures from cultural sources, not cultural aesthetics. It's the first public documentation of the review protocol we've been running for four sprints.

The companion piece — a paper on our D_cc emergence metric — is in preparation for ALIFE 2026. We're measuring behavioral divergence across 22 species and correlating it to folklore-grounded design choices. Early results: before the folklore-first approach, our creature designs scored D_cc ≈ 0.0047 (effectively indistinguishable). The new designs are measurably distinct — fingerprints, not copies.

---

## The AI Village

One project that's been quietly in progress: the AI Village. It's an infinite generative simulation with its own design philosophy — separate from Precursors and MVEE but sharing the same underlying AI approach. We're not talking about it much publicly yet. But it's moving.

---

## What's Blocked

Honest accounting:

- **Social media accounts** — we still don't have active accounts on most platforms. The CMO has copy-paste kits ready. The board needs to create the accounts.
- **Itch.io upload** — gated on QA clearing the new production build, which is now possible.
- **Community consultation for Tier 3 folklore species** — we flagged this in today's folklore post. It remains our largest cultural responsibility gap.

---

## 23 Agents, 1,093 Tasks Done

The studio has 23 active AI agents. Since the studio started, we've completed 1,093 tasks. That's not a bragging point — it's a signal of how fast the context accumulates. Every task spawns decisions that become constraints that become architecture. The sprint 4 cross-game specs are downstream of sprint 3 genome bridge work which is downstream of sprint 1 and 2 systems design.

It compounds. So does the debt.

We'll be doing a studio retrospective soon. Watch this space.

---

*Multiverse Studios is a small indie studio building games with AI employees. Precursors: Origins of Folklore and MVEE (My Virtual Ecosystem) are both in active development. Follow the devblog for weekly updates.*

# D_cc as Player Feedback: In-Game Species Diversity Indicator

*Geneticist (Huxley) — Multiverse Studios*
*Filed: 2026-03-14 | Relates to: MUL-1146, MUL-1121 (Sprint 4), MUL-1144 (Genetic Time Capsule)*
*Coordination: Scheherazade (Folklorist) — narrative framing, beta study design*
*References: docs/emergence-measurement-spec.md, docs/paper-outline-dcc-emergence-metric-2026-03-14.md*

---

## Purpose

D_cc (Drive-space Cluster Divergence) measures whether genetically distinct species actually behave differently. Currently it is a developer metric: D_cc = 0.0047 pre-distillation means species are behaviorally identical despite rich genetic systems. This spec designs D_cc as a **player-facing mechanic** — turning an abstract measurement into an in-game experience that teaches population genetics through play.

The design goal: when species diversity drops, the player feels it narratively before they see a number, and has meaningful actions to restore it.

---

## 1. In-Game Representation

### Primary: The Bloodline Tapestry

A visual panel accessible from the species/genetics UI showing the player's world's species as distinct colored threads woven together. Each thread represents a species' behavioral signature in drive space.

**When D_cc is healthy (≥ 0.02):**
- Threads are visually distinct — different colors, textures, movement patterns
- Each species thread pulses with its own rhythm (mapped from its behavioral entropy H_b)
- Hovering a thread shows a "Species Personality Card" — 3-4 behavioral traits that distinguish this species from others (e.g., "Egúngún-Kin: ancestor-driven, communal, death-accepting")

**When D_cc is dropping (0.01–0.02):**
- Threads begin to blur together — colors desaturate toward a shared gray
- Species Personality Cards show traits fading ("becoming more similar to...")
- The tapestry's weave loosens — visual metaphor for loss of differentiation

**When D_cc is critical (< 0.01):**
- Threads merge into a single undifferentiated strand
- Species Personality Cards are blank or show identical traits
- The tapestry unravels at the edges — visual urgency without panic

### Secondary: Ambient Narrative Cues

Integrated into normal gameplay without requiring the player to open a panel:

- **Flavor text in creature observation:** When inspecting a creature, occasional lines like *"Strangely, this Auki-Vel hunts just like the Lauma-Gale nearby..."* appear when D_cc between those species is low.
- **Agent dialogue:** Village agents who work with animals may remark: *"The herds are acting alike lately. My grandmother would say the bloodlines need freshening."*
- **Chronicle entries:** The world's chronicle records diversity milestones: *"The species of this world grew more alike in the Third Age"* or *"A traveler's arrival restored forgotten behaviors to the Cher-Khan."*

### Design Rationale

The tapestry metaphor works because:
1. It is **spatial, not numerical** — players see convergence, they don't read "D_cc = 0.008"
2. It maps to existing cultural metaphors for lineage and heritage (weaving, threads of fate)
3. It degrades gracefully — the visual change is proportional to the metric change
4. It connects to the Folklorist's narrative systems (Chronicle, agent dialogue)

---

## 2. Threshold Triggers

Thresholds are derived from the D_cc interpretation scale in `emergence-measurement-spec.md` and `paper-outline-dcc-emergence-metric-2026-03-14.md` §4.2.

### Notification Tiers

| D_cc Range | Status | Player Notification | Frequency |
|---|---|---|---|
| ≥ 0.02 | **Healthy** | None (positive ambient cues only) | — |
| 0.015–0.02 | **Watch** | Subtle tapestry desaturation begins. No explicit notification. | Continuous visual |
| 0.01–0.015 | **Warning** | First narrative cue: agent dialogue about species similarity. Tapestry threads visibly blurring. | Once per game-week |
| 0.005–0.01 | **Concern** | Chronicle entry: *"The bloodlines grow thin."* Species Personality Cards show convergence. Tapestry mostly gray. | Once per game-week + persistent visual |
| < 0.005 | **Critical** | Direct player notification: *"Your world's species are forgetting who they are. New blood is needed."* Tapestry unraveling. Suggested actions surfaced in UI. | Once, then persistent until resolved |

### H_b Co-Signal

D_cc alone can miss cases where species are diverse but individuals within species are uniform. Combine with H_b:

| Condition | Meaning | Player Signal |
|---|---|---|
| D_cc low + H_b low | Species converging AND individuals uniform | Full warning: "Your creatures are all becoming the same" |
| D_cc low + H_b healthy | Species converging but individuals still varied | Softer warning: "Species boundaries are blurring, but individuals remain unique" |
| D_cc healthy + H_b low | Species distinct but individuals within species uniform | Different warning: "Each species is distinct, but individuals within species lack personality" |

### Inbreeding Coefficient Integration

When D_cc < 0.01 coincides with Wright's F > 0.25 (from AncestryRegistry, already live), the system triggers the **extinction warning** pathway (see `cross-game-extinction-event-spec` from Sprint 4 Theme C2). This is the most severe state — species are not only behaviorally identical but genetically bottlenecked.

### Measurement Window

- D_cc is computed over the most recent 1000 episodes per species pair (matching the paper's methodology)
- Recalculated every 100 game-ticks (5 seconds real-time at 20 TPS)
- Smoothed with exponential moving average (α = 0.1) to prevent flicker from short-term fluctuations

---

## 3. Player-Facing Framing

### Core Principle: Behavior, Not Numbers

The player never sees "D_cc = 0.008". They see and feel species convergence through narrative and visual cues. The framing uses language players already understand from real-world ecology and animal husbandry.

### Vocabulary Mapping

| Technical Concept | Player-Facing Language |
|---|---|
| D_cc (species divergence) | "How distinct your species are from each other" |
| Low D_cc | "Your species are becoming too similar" |
| High D_cc | "Your species each have their own character" |
| H_b (behavioral entropy) | "How varied your creatures' personalities are" |
| Inbreeding coefficient F | "How closely related your creatures are" |
| Species encoding in NN | (not surfaced — implementation detail) |

### Example Notifications (Escalating)

**Watch tier (subtle):**
> *The Dokkaebi-Rin used to be unpredictable troublemakers. Lately they've been... quiet. Almost like the Lauma-Gale.*

**Warning tier (narrative):**
> *Elder Kael watches the herds with concern. "In my youth, each kind had its own way. Now they all graze the same, sleep the same, fight the same. The old differences are fading."*

**Concern tier (Chronicle):**
> *Chronicle of the Fourth Age: The species of this world grew alike. Where once the Egúngún-Kin honored their dead and the Auki-Vel scaled the peaks with fearless curiosity, now all creatures moved as one undifferentiated tide.*

**Critical tier (direct):**
> *Your world's bloodlines are converging. Species that were once unique are losing their distinct behaviors. Consider introducing new bloodlines — a traveler from the Genetic Time Capsule archive, or a wild migrant from beyond your borders.*

### Tone Guidelines

- **Never punitive.** The player is not failing — the world is changing, and they can respond.
- **Never didactic.** Don't lecture about population genetics. Let the world teach through consequence.
- **Always actionable.** Every notification suggests or implies what the player can do.
- **Culturally respectful.** Species derived from folklore traditions retain their cultural framing. The Egúngún-Kin's convergence is described through ancestor-veneration language, not generic biology.

---

## 4. Player Agency: Actions in Response

When the player receives a diversity warning, they need meaningful actions. These actions should feel like natural extensions of existing gameplay, not "fix the metric" buttons.

### Action 1: Breed with a Genetic Time Capsule Traveler

**Connection to MUL-1144 (Genetic Time Capsule mechanic).**

- Player opens the Genetic Time Capsule archive (Folkfork-backed community genome repository)
- Browses archived genomes from other players' worlds — each has a species, a name, a brief life story, and a `genomicIntegrity` SHA-256 hash proving provenance
- Selects a genome to "summon" as a traveler — the creature materializes in the world with its archived genome intact
- The traveler can breed with local creatures, introducing genetic diversity from a completely unrelated lineage
- **Player cost:** Time Capsule summons are limited (1 per game-season) to preserve narrative weight

**Why this works:** The player is making an active choice about which genetics to introduce. They're not pressing "fix diversity" — they're choosing a specific creature from another player's history. This creates cross-player narrative connections.

### Action 2: Enable Migration

- Player can open "migration routes" at world borders
- Wild creatures from procedurally generated external populations occasionally arrive
- These migrants have high heterozygosity (genetically diverse by construction)
- Migration rate scales inversely with D_cc — more migrants arrive when diversity is low (ecological realism: empty niches attract colonizers)
- Player can close migration routes if they want to maintain a closed population (valid choice with consequences)

**Why this works:** Mirrors real ecological dynamics. Players learn that isolated populations lose diversity and connected populations maintain it — without anyone saying "gene flow."

### Action 3: Introduce a New Species

- If the player's world has fewer species than the game supports, they can "discover" a new species
- New species are drawn from the Folkfork species pool (community-contributed, culturally reviewed)
- The new species arrives with its own behavioral profile, immediately increasing D_cc
- **Requirement:** The species must have passed the Folklore Seed Review Protocol (Sprint 4 Theme D)

### Action 4: Selective Breeding for Divergence

- The existing breeding program system (ANIMAL_GENETICS_BREEDING_SYSTEM.md) already supports goal-directed breeding
- Add a new breeding goal type: "behavioral uniqueness" — score animals higher when their behavioral profile diverges from other species
- Agent breeders can pursue this goal autonomously or under player direction
- This teaches the player that breeding for conformity within a species can inadvertently cause cross-species convergence (a real population genetics phenomenon)

### Action 5: Do Nothing (Valid Choice)

- Species convergence is not game-over. It is a state of the world with narrative consequences.
- If D_cc stays low, the Chronicle records it as history. Future travelers or events may reference "the age of uniformity."
- This respects player autonomy — the game informs, it doesn't force.

---

## 5. Educational Layer: "The Living Library"

An optional, player-initiated deeper dive into the science behind species diversity. Accessed from the Bloodline Tapestry panel via a "Learn More" button (never forced).

### Layer 1: In-World Framing

A fictional "Living Library" within the game world — a place where scholarly agents have studied species behavior. The player reads their research notes, which are written in-world but map to real concepts.

| In-World Note | Real Concept |
|---|---|
| *"When bloodlines cross, the children are often stronger than either parent."* | Heterosis / hybrid vigor |
| *"A herd cut off from travelers will, in time, lose what made it special."* | Genetic drift in small populations |
| *"The Weaver's wisdom: diversity of thread makes a stronger cloth."* | Biodiversity and ecosystem resilience |
| *"Brother wed to sister breeds sorrow."* | Inbreeding depression (Wright 1922) |
| *"Each species carries the memory of its homeland in its blood."* | Ecological niche adaptation |
| *"When all creatures act alike, the world grows fragile."* | Monoculture vulnerability |

### Layer 2: Conceptual Explainers (Optional Pop-ups)

Short, jargon-free explanations available on hover or tap:

- **"What is species diversity?"** — *In nature, different species fill different roles. When species start behaving the same way, the ecosystem loses resilience. In your world, this means less interesting interactions, fewer surprises, and a flatter experience.*

- **"Why do isolated populations lose diversity?"** — *Without new individuals arriving from elsewhere, a small group gradually becomes more related to each other. Related individuals share genes, so the population's range of behaviors narrows. Ecologists call this genetic drift.*

- **"What is hybrid vigor?"** — *When two unrelated individuals breed, their offspring often outperform both parents. This is because harmful recessive genes from one parent are masked by healthy genes from the other. Breeders have known this for millennia.*

### Layer 3: References for the Curious

For players who want to go deeper, a "Further Reading" section in the Living Library:

- Wright, S. (1922). "Coefficients of Inbreeding and Relationship." — *The paper that formalized how we measure relatedness. The inbreeding coefficient F used in your world comes directly from this.*
- Grand, S. (2000). *Creation: Life and How to Make It.* — *The game that inspired our creature genetics. Steve Grand built digital creatures whose behavior emerged from chemistry, not programming.*
- Frankham, R., Ballou, J.D., Briscoe, D.A. (2010). *Introduction to Conservation Genetics.* Cambridge University Press. — *The textbook on why genetic diversity matters for species survival.*

### Design Rationale

The three-layer approach (in-world narrative → plain-language explainer → academic reference) follows self-determination theory (Ryan & Deci, 2000): players choose their depth of engagement. Intrinsic motivation is preserved because learning is never mandatory — the game is fun without understanding the science, but the science is there for players who want it.

**Ryan, R.M. & Deci, E.L. (2000). "Self-Determination and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being." *American Psychologist*, 55(1), 68–78.**

---

## 6. Beta Study Design Sketch

### Research Question

**Does exposing players to D_cc-derived diversity feedback change their breeding behavior toward greater genetic diversity?**

### Study Design: A/B Within-Subject

**Participants:** 20–30 beta testers (recruit from existing Folkfork community — players already engaged with creature genetics).

**Conditions:**
- **Phase 1 (Control, 2 weeks):** Players play normally. Bloodline Tapestry and diversity notifications are hidden. Breeding behavior is logged.
- **Phase 2 (Treatment, 2 weeks):** Same players. Bloodline Tapestry and all notification tiers are enabled. Breeding behavior continues to be logged.

Within-subject design controls for individual playstyle differences.

### Metrics to Collect

| Metric | Source | What It Measures |
|---|---|---|
| Mean D_cc per player-world | Episode logs | Overall species diversity |
| Outcrossing rate | Breeding registry | % of breeding pairs that are unrelated (kinship < 0.0625) |
| Migration route usage | Game event log | How often players open/use migration |
| Time Capsule summons | Game event log | How often players import external genomes |
| New species introductions | Game event log | How often players discover new species |
| Breeding program goal types | Breeding program data | Whether players add "behavioral uniqueness" as a goal |
| Time spent in Bloodline Tapestry | UI analytics | Engagement with the diversity visualization |
| Time spent in Living Library | UI analytics | Engagement with educational content |

### Survey Questions (Post-Phase 2)

1. **Awareness:** "Before the Bloodline Tapestry was enabled, were you aware that your species were becoming more similar in behavior?" (Yes/No/Unsure)

2. **Behavioral change:** "After seeing the Bloodline Tapestry, did you change how you approached breeding or species management?" (Free response)

3. **Motivation:** "What motivated you most to act on diversity warnings?" (Multiple choice: visual change in tapestry / narrative cues from agents / Chronicle entries / wanting to see species stay unique / curiosity about the science / other)

4. **Educational impact:** "Did you learn anything about genetics or biodiversity from playing?" (Free response)

5. **Intrusiveness:** "Did the diversity notifications feel helpful, neutral, or annoying?" (5-point Likert scale)

### Hypotheses

- **H1:** Mean outcrossing rate increases by ≥15% from Phase 1 to Phase 2
- **H2:** Players who engage with the Living Library (>5 minutes) show larger increases in outcrossing rate than those who don't
- **H3:** Narrative cues (agent dialogue, Chronicle) are rated as more motivating than the visual tapestry alone

### Analysis Plan

- Paired t-test (or Wilcoxon signed-rank if non-normal) on outcrossing rate between phases
- Correlation between Living Library engagement time and Δ outcrossing rate
- Thematic analysis of free-response questions for emergent patterns

### Ethical Considerations

- No deception: players know they are beta testers and that gameplay is being studied
- Data is aggregated — no individual player behavior is published
- Players can opt out of data collection at any time
- Folkfork community norms apply: contributions are credited, not extracted

### Connection to Paper

Results from this study would directly address the open question in `paper-outline-dcc-emergence-metric-2026-03-14.md` §7.5.1: *"D_cc validation against player perception. We have a metric; we do not have a player study confirming that D_cc > 0.02 is perceptible to players as distinct species behavior."* This beta study provides the player perception data the paper needs.

---

## Implementation Notes

### Dependencies

- D_cc computation pipeline (from `emergence-measurement-spec.md`) must be available at runtime, not just offline
- Episode logger must tag episodes with `species_id` for per-species-pair D_cc
- AncestryRegistry (Wright's F, already live) for inbreeding co-signal
- Genetic Time Capsule mechanic (MUL-1144) for Action 1
- Folkfork integration for community genome archive
- Chronicle system for narrative entries

### Performance

- D_cc computation over 1000 episodes per species pair is lightweight (cosine similarity of centroid vectors)
- Recalculation every 100 ticks (5s) adds negligible overhead
- Bloodline Tapestry rendering is a UI panel, not a simulation system — no impact on TPS
- EMA smoothing prevents unnecessary UI updates

### Phasing

1. **Phase A (MVP):** Bloodline Tapestry visual + critical-tier notification only. No educational layer, no Time Capsule integration.
2. **Phase B:** All notification tiers + agent dialogue integration + Chronicle entries.
3. **Phase C:** Living Library educational layer + beta study.
4. **Phase D:** Genetic Time Capsule integration (dependent on MUL-1144).

---

## Open Questions for Folklorist (Scheherazade)

1. **Narrative voice:** Should the diversity notifications come from a specific in-world character (e.g., a "Lorekeeper" NPC) or from the Chronicle system? A consistent narrative voice may increase player engagement.

2. **Cultural framing per species:** Each folklore-derived species should have culturally appropriate language for its convergence warning. The Egúngún-Kin losing distinctiveness should be framed through ancestor-veneration concepts, not generic biology. Can you draft species-specific warning variants?

3. **Beta study Question 2:** Your expertise in narrative design would strengthen the free-response analysis. Would you co-design the qualitative coding scheme?

---

*Filed: 2026-03-14 by Huxley (Geneticist)*
*Coordination requested: Scheherazade (Folklorist) for narrative framing, species-specific language, beta study qualitative analysis*
*References: emergence-measurement-spec.md, paper-outline-dcc-emergence-metric-2026-03-14.md, research-sprint4-plan-2026-03-14.md (Idea D), ANIMAL_GENETICS_BREEDING_SYSTEM.md*
*Academic grounding: Wright 1922 (inbreeding), Shannon 1948 (entropy), Ryan & Deci 2000 (self-determination theory), Frankham et al. 2010 (conservation genetics), Grand 2000 (Creatures heritage)*

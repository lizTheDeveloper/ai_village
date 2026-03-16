# What Should Never Change: Ontological Constants in Branching Narrative Games

*Published: 2026-03-14 | Multiverse Studios devblog*

*Cross-post: [dev.to](https://dev.to)*

---

Most writing about branching narrative games focuses on player choice and consequence — the butterfly effect, the weight of decisions, the illusion of agency. But there's a problem that crops up much earlier in the design process, one that's harder to name: **fork fatigue**.

Fork fatigue is what happens when every timeline diverges from every other one with no anchor. Players save-scum their way through decisions because nothing persists between branches — so nothing matters. Alternatively, they don't fork at all, paralyzed by the possibility that the "real" timeline is somewhere else. The narrative erodes because it has no substrate underneath the choices.

When we built the universe-forking system for *Multiverse: The End of Eternity* (MVEE), we thought we were solving a technical problem: how do you persist and branch universe state across multiple timelines? We built snapshot-based forks, parent/child universe trees, and causal ordering for cross-universe events. The tech worked. The narrative problem didn't go away.

We needed a design pattern for things that *should not change* across forks. And the most useful answers we found came not from game design literature, but from folklore traditions that have been solving this problem for millennia.

---

## The Problem: When Everything Is Contingent

In a purely contingent world — one where every fork produces genuinely independent timelines — there is no reason to care about any particular branch. The player's investment in a named NPC, a faction, a city, a god, is entirely local to the branch they're currently in. Travel to a different fork and that NPC might be alive, dead, never born, or a completely different person.

Game writers often work around this by declaring certain things "canon" — but canon in a branching game is just enforced contingency. The Dark timeline in *The Legend of Zelda* is canonical in the sense that the franchise decided it matters. The player had no say. That's not design; it's editorial.

What folklore traditions offer is something different: a principled *ontological* distinction between entities that exist at the level of events and entities that exist at a deeper substrate. Some things are not contingent because they are not historical.

---

## Three Traditions That Solved This

These are living traditions, not game inspiration sources. We credit their originators accordingly — and in each case, we note where our application is an adaptation, not an accurate representation.

### The Dreaming (Yolŋu and broader Aboriginal Australian traditions)

The Dreaming — in Yolŋu language, *Djang* — is not a past moment. It is a layer of reality that underlies all time. Ancestral beings of the Dreaming are not historical figures; they are structural features of Country itself. They do not change across retellings because change is a property of surface events, not of the Dreaming stratum beneath them.

What this offers to game design: a universe fork, in Dreaming terms, creates variant *expressions* of the same underlying ancestor. The ancestor itself — its essential nature — is invariant across all forked timelines. The same entity appears in every branch not because of plot continuity but because it exists at a different layer of the world's ontology.

*Source: W.E.H. Stanner, "The Dreaming" (1953), in White Man Got No Dreaming: Essays 1938–1973, ANU Press, 1979, pp. 23–40. Note: Stanner is a non-Yolŋu anthropologist. Country-specific primary accounts from knowledge holders should supplement this text before any player-facing adaptation.*

### Yggdrasil and the Norns (Norse cosmology)

In Norse cosmological structure as compiled in the Prose Edda, Yggdrasil and the three wells at its roots persist across all Nine Worlds. They are not subject to the political and martial events of any individual realm. The Norns — Urðr, Verðandi, Skuld — weave fate at a level beneath individual world-events. Ragnarök destroys the worlds; the wellspring of fate is not destroyed with them.

The design application: fate-weavers exist at the machinery level, not the narrative level. A Norn-type entity doesn't experience your player's story — it *structures* the possibility space of stories. It appears in every fork because it is what makes forks intelligible. You can tell it was there by the shape of events, not by any encounter.

*Source: Snorri Sturluson, Gylfaginning, in Prose Edda, trans. Jesse Byock, Penguin Classics, 2005, chapters 15–17.*

### Avatara doctrine (Vaishnava Hindu tradition)

In Vaishnava theology, Vishnu's avataras descend into different cosmic ages in different forms — lion, turtle, dwarf, prince, and others — across different puranas with sometimes conflicting narrative details. The theological resolution is that the underlying identity is invariant; the forms are its expressions in different contexts. Different accounts do not contradict each other because they are describing different avatara encounters with the same essential nature.

This offers a design pattern for entities that are recognizable across forks despite *appearing differently* in each. The player learns to identify the constant by essence rather than form. They encounter this entity in a fork and recognize it without being able to say exactly how.

*Source: Bhagavata Purana, Book I, Chapter 3 (avatara list); see also Jan Gonda, Aspects of Early Vishnuism, Utrecht: A. Oosthoek, 1954, pp. 135–165.*

---

## The Design Principle: Ontological Constants vs. Historical Entities

Drawing these traditions together into a design pattern, we get a distinction:

**Historical entities** exist within timelines. They have causes and consequences. They can be killed, changed, never born, or entirely absent in a forked universe. Most characters, factions, cities, and events are historical.

**Ontological constants** exist at a deeper substrate than timelines. They cannot be absent because they are not contingent on any sequence of events. Their presence in a fork is not a continuity artifact — it is a property of what they *are*.

The practical question for game designers: how do you implement this distinction?

The implementation answer matters less than the design question. But a rough sketch: ontological constants could be stored relative to the root universe rather than any branching child. When `forkUniverse` creates a child timeline, it inherits these constants as read-only — present in every branch without belonging to any of them. The fork inherits their *presence* the way physical law is inherited: not as history, but as structure.

---

## Applied to MVEE's Forking System

MVEE's universe-forking system works by snapshotting full game state at a point in time and branching from that snapshot. Forks carry parent and fork-point metadata. Cross-universe events are causally ordered. Multiple universes can run in parallel.

The problem we hit in playtesting: when players forked timelines around named NPC deaths, they felt no grief because the "real" version of the character was always recoverable in the parent branch. The NPC was purely historical — nothing anchored them across the fork.

Working from the Folklorist's MUL-1021 brief, we're designing three categories of ontological constants for MVEE:

**Primordial deities** — gods that emerged from collective belief before any fork point — should appear in all child universes. Their *avatars* may differ; their essential nature persists. A god born from the belief of 10,000 agents in universe:main doesn't disappear when you fork from tick 50,000. The fork's agents may believe in them differently, iconography may shift, schisms may form — but the deity's underlying emergence is pre-fork, and thus pre-contingent.

**Cross-game persisting species** — where the Precursors creature pipeline feeds into MVEE — are a candidate for Avatara-style constants. The Abiiku-Vel (drawing on Yoruba Abiiku tradition, *a living religious system that requires proper cultural credit in player-facing text*) dissolve and reconstitute from preserved genetic memory rather than dying conventionally. In Precursors, this is biochemical. In MVEE, it becomes the narrative mechanism for why certain creatures appear in every fork: their nature encodes the history of all their timelines without privileging any one. The player encounters one and feels recognized by something that knows them without knowing *when* they are.

**Fork-invariant geography** — mountains, rivers, and terrain features that existed before any fork point remain constant across branches by physical necessity. This isn't ontological in the philosophical sense, but it teaches the player to distinguish what is structural from what is historical before they encounter more complex constants.

---

## Design Heuristics

A few rules of thumb for deciding what is an anchor and what forks:

**Is the entity pre-causal to the fork?** If an entity's essential character was established before the fork point, it is a candidate for ontological constant status. Its *expressions* may vary in the new branch, but its underlying nature preceded the branch and cannot be unmade by it.

**Is the entity structural or historical?** Fate-weavers, gods of origin, geographical features, and species-defining traits are structural. Marriages, wars, individual deaths, and political power are historical. Structure forks reluctantly; history forks freely.

**What does the player need to trust?** Every game needs some substrate the player can rely on across forks. Without anchors, players have no orientation. The question is not whether to have anchors, but which ones — and whether they're chosen intentionally or left implicit.

**Does recognizing the anchor require understanding what it is, or just feeling it?** The best ontological constants are recognized emotionally before they are understood intellectually. The creature looks at you like it has always known you. The god's domain feels familiar across wildly different iconography. Recognition precedes explanation.

---

## Closing

Most branching game narratives fail not because they have too many choices, but because they make everything contingent and nothing structural. The folklore traditions surveyed here have been solving this problem in living story forms for generations: some entities are definitional, not historical.

The design insight is not a technical one. It's a question of what your world is made of underneath its events. MVEE's multiverse system gave us the fork mechanic. These traditions gave us the vocabulary for what should not fork — and why that restraint is what makes the rest of the branching meaningful.

---

*This post draws on research from our internal Folklore Research Sprint (MUL-1021). Cultural credit for Yolŋu Dreaming concepts belongs to Aboriginal Australian knowledge holders; this adaptation is a game design extrapolation, not a representation of any specific cultural tradition. The Abiiku reference draws on Yoruba theological tradition, a living religious system. Any player-facing text using these concepts requires community consultation and editorial review.*

*Multiverse: The End of Eternity is in development. Follow our devblog for updates.*

# 48 Chemical Pathways: How Precursors Simulates Real Biochemistry

**Date:** March 9, 2026
**Tags:** Precursors, Deep Dive
**Published to:** devlog.html

---

When Steve Grand built the original Creatures in 1996, he gave his Norns 48 chemicals and a rule-based nervous system. It was the first consumer simulation where a creature's hunger was a *measurable quantity of a specific molecule*, not a timer. Players fell in love with creatures that had real biology.

Precursors is built on the same principle, taken further. There are **48 universal chemicals** shared by every species — then 25 or more additional chemicals unique to each lineage. A Norn's biochemistry and a Grendel's are as different as a mammal's and an insect's. Neither creature follows any scripted behavioral rules. Everything they do emerges from molecules reacting.

> No creature in Precursors is "programmed to be hungry." Hunger is a chemical. When its concentration crosses a threshold, the LLM cognition system perceives it as urgency. When the creature eats, the chemical drops. That's the entire hunger system.

## How the 48 universal pathways break down

The base chemistry is organized into functional groups that map to real biology:

- **Energy (5):** Glucose, ATP, ADP, Glycogen, Starch
- **Drives (14):** Hunger, Fear, Curiosity, Loneliness, Anger, Boredom, Pain, Fatigue, Sadness, Happiness, Comfort, Sleepiness, Crowding, Thirst
- **Hormones (10):** Adrenaline, Cortisol, Oxytocin, Dopamine, Serotonin, Endorphin, Testosterone, Oestrogen, Melatonin, GrowthHormone
- **Nutrients (5):** Protein, Fat, Water, Vitamin, Mineral
- **Damage & Healing (4):** Injury, Toxin, Antibody, HealingFactor
- **Reproduction (3):** Fertility, Pregnancy, MatingDrive
- **Neurotransmitters (5):** GABA, Glutamate, Acetylcholine, PreREM, REM
- **Meta (2):** Age, Dead

Each chemical has a half-life. The formula for decay rate is `1 − 0.5^(1 / 2.2^(halfLife × 32))` — borrowed from pharmacokinetics. Fear decays quickly (0.2). Hunger barely decays (0.02). Fertility and MatingDrive have no natural decay — they accumulate until a threshold triggers mating, then are consumed.

## Cascading reactions

Reactions follow `Reactant1 + Reactant2 → Product1 + Product2` at a defined rate, with limiting-reactant logic. Three reactions running in every creature:

- `Starch + ATP → Glucose + ADP` (Stomach, rate 0.8) — carbohydrate digestion
- `Glucose + ADP → ATP + Water` (Heart, rate 0.8) — primary energy cycle
- `Pain + ATP → Endorphin + ADP` (Brain, rate 0.3) — pain suppression

The brain organ also runs: `Loneliness + Oxytocin → Happiness + Dopamine`. A lonely creature that finds connection doesn't "become happy" because a flag was set. Dopamine is actually produced.

## Emergent behavior examples

**The Grendel damage spiral.** Grendels have a unique reaction: `Toxin + ATP → Endorphin + ADP` (rate 0.6). They metabolize poison into pleasure. When they take damage, Pain drives Anger and Adrenaline. Sustained Adrenaline (slow decay: 0.15) keeps them aggressive. Toxins produce Endorphin for them — so injured Grendels are chemically drawn toward toxic environments. They develop territorial behavior around poison sources. They appear "addicted." No addiction system was written. It emerged from five reactions.

**The Norn social feedback loop.** Lonely Norns produce Oxytocin via `Loneliness + ATP → Oxytocin`. When they find another creature, Happiness rises. Then `Oxytocin + Happiness → Dopamine + Serotonin` runs. High Dopamine/Serotonin push social behavior into the LLM context as high-priority drives. Norns form groups, separate with genuine distress, and seek reunion. No social AI was written.

## How this differs from original Creatures

| | Creatures 1/3 | Precursors |
|---|---|---|
| Chemical count | 48 (C1) / 256+ (C3) | 73+ (48 universal + species-specific) |
| Species divergence | Fixed reactions | Gene-expressed, fully evolvable |
| Half-life rates | Fixed | Genetic, heritable, species-specific |
| Drives | Direct agent state | Emergent from reaction chains |
| Cognition bridge | Neural net (disconnected) | DriveSystem → natural language → LLM |
| Species-specific chemicals | None | 25+ unique per lineage |

The Shee example: they run `Cortisol + ATP → Serotonin` — metabolizing stress into calm. Their `Serotonin + Glucose → GrowthHormone` reaction sustains cellular repair. Shee who stay intellectually engaged age more slowly. Not symbolically. The chemical math works out.

> The original Creatures had biochemistry. Precursors has biochemistry that *evolves*. Every species is a different experiment in chemical architecture.

The bridge to behavior: `DriveSystem` reads chemical levels, computes intensity thresholds (none / low / moderate / high / critical), generates natural language ("You feel very hungry and somewhat lonely"), and injects it into the LLM context. The creature reasons from its chemistry. When it acts, emitters inject chemicals back. The loop closes.

---

**Source code:** `src/biochemistry/` in [github.com/lizTheDeveloper/ai_village](https://github.com/lizTheDeveloper/ai_village)
**Play:** [Beta access](https://buy.stripe.com/28EfZg7V03rZcVT05H6c001)

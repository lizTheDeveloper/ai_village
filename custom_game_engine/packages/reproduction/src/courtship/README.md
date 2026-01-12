# Courtship Subsystem

Agent-driven courtship and mating system with species-specific paradigms, tactics, and compatibility calculations.

## State Machine

Six states managed by `CourtshipStateMachine`:
- **idle**: Not seeking or being courted
- **interested**: Identified compatible partner, threshold = `0.5 - romanticInclination * 0.3`
- **courting**: Actively performing tactics on target
- **being_courted**: Receiving courtship from initiator
- **consenting**: Accepted courtship, ready to mate
- **mating**: In mating behavior (duration varies by paradigm)

Transitions: `idle` → `interested` (compatibility check) → `courting` (initiate) → `consenting` (accept) → `mating` (event emission)

## Compatibility Scoring

`calculateCompatibility()` weights five factors:
1. **Sexual** (30%): Orientation, relationship style, attraction conditions
2. **Personality** (25%): Sigmoid-weighted mesh (extraversion complementarity, agreeableness avg, neuroticism penalty, creativity/spirituality similarity)
3. **Interests** (20%): Shared high-priority activities (gathering, building, farming, social, exploration, magic)
4. **Relationship** (15%): Familiarity, affinity, trust from `RelationshipComponent`
5. **Social** (10%): Placeholder for community/family factors

Returns 0-1 score. Sexual incompatibility = 0 (blocks courtship).

## Paradigms

Species-specific courtship protocols (`paradigms.ts`):
- **human/elf**: `gradual_proximity` (conversation, shared activity, proximity). Elves require 6+ tactics, 40k-120k ticks
- **dwarf**: `construction` (craft gift, demonstrate skill, shared project). High quality workshop, 30k-100k ticks, bond strength 0.95
- **bird_folk**: `display` (aerial dance, plumage, song). Elevated location, 5k-15k ticks
- **mystif**: `resonance` (mind touch, aura display, magic sharing). Ley line required, bond strength 1.0
- **default**: Generic proximity-based, 10k-30k ticks

Each paradigm defines: required/optional/forbidden tactics, minimum count, duration range, location requirements, mating behavior (location, duration, privacy, post-mating effects).

## Tactics

84 tactics across 10 categories: conversation, gift, display, proximity, activity, dominance, crafting, magic, service, ritual.

Requirements: items, skills, location, proximity, energy, time

Appeal calculation: `baseAppeal + (preferred ? 0.3 : 0) + (disliked ? -0.5 : 0) + romanticInclination * modifier`

Examples:
- `conversation`: Base 0.3, requires proximity 3, time 200
- `craft_gift` (dwarf): Base 0.9, requires crafting 5, metal/gems, time 2000
- `mind_touch` (mystif): Base 0.85, requires psionics 4, proximity 5, energy 15, not visible to others

## Cooldowns

Tracked in `CourtshipComponent`:
- General: `lastCourtshipAttempt` + `courtshipCooldown`
- Per-target rejection: `rejectionCooldown` Map

## Conception

`attemptConception()`: Probability = `baseProbability (0.3) * fertility * health * (0.8 + bondStrength * 0.4) * magic`

Emits `conception` event with `pregnantAgentId`, `otherParentId`, `conceptionTick`.

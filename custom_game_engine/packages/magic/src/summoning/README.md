# Summoning System

Contractual negotiation with otherworldly entities. Demons, devils, angels, spirits, fey, djinn, psychopomps, outsiders, and servitors.

## Overview

Summon entities from other realms through ritual magic. Each entity has personality, demands, services, and breach consequences. Negotiation determines contract terms. Breaking contracts has consequences.

## Entity Types

**Categories**: demon, devil, angel, spirit, fey, djinn, psychopomp, outsider, servitor

**Ranks**: lesser (weak), common (standard), greater (powerful), noble (elite), prince (legendary), archetype (unique)

## Personality System

Six personality axes define entity behavior:
- **mortalAttitude**: contemptuous, curious, predatory, protective, indifferent, envious
- **honesty**: truthful, misleading, deceptive, literalist, compulsive_liar
- **patience**: eternal, patient, impatient, volatile
- **humor**: cruel, dark, whimsical, dry, none, inappropriate
- **motivation**: power, knowledge, chaos, order, entertainment, freedom, revenge, duty
- **voice**: formal, casual, archaic, cryptic, verbose, laconic, poetic

30+ pre-configured archetypes in `PERSONALITY_ARCHETYPES`.

## Demands & Services

**Demand Types**: tribute, sacrifice, service, information, entertainment, worship, freedom, vengeance, knowledge, souls, emotions, time, memories, names, favors, artistic_creation

**Services**: Combat aid, knowledge, transformation, protection, creation, divination. Each has cost, duration, limitations, side effects.

## Contracts

**Duration**: instant, temporary, extended, permanent

**Binding Strength**: weak (easily broken), strong (penalties), absolute (inescapable)

**Breach Consequences**: curse, possession, debt, hunt, transformation, binding

## Negotiation

State machine: initial → negotiating → agreed/rejected → bound

Entities make offers/counteroffers based on `negotiationStyle`:
- **openingMove**: demand, offer, threat, bargain, question, riddle
- **flexibility**: rigid, pragmatic, creative, chaotic
- **walkAwayThreshold**: when entity ends negotiation
- **dealbreakers**: non-negotiable terms

Trust level and entity patience affect negotiation success.

## Summoning Requirements

**Types**: material (components), location (sacred sites), timing (celestial alignments), sacrifice, ritual (specific procedure), knowledge (true name)

Most requirements have optional substitutes.

## Usage

```typescript
import { PERSONALITY_ARCHETYPES, type SummonableEntity } from './summoning';

// Generate entity (LLM-driven)
const entity: SummonableEntity = {
  category: 'demon',
  rank: 'common',
  personality: PERSONALITY_ARCHETYPES.contemptuous_pedant.personality,
  demands: [{ type: 'knowledge', severity: 'moderate', negotiable: true }],
  // ... other fields
};

// Track negotiation
const negotiation: SummoningNegotiation = {
  entityId: entity.id,
  summonerId: mageId,
  state: 'negotiating',
  turnsRemaining: 10,
  entityPatience: 100,
  trustLevel: 0
};

// Create contract
const contract: ActiveContract = {
  entityId: entity.id,
  bindingStrength: 'strong',
  startTime: world.tick,
  endTime: world.tick + 12000, // 10 minutes
  breached: false
};
```

## Architecture

**LLM-Driven**: System provides components (personalities, demands, services). LLM mixes/matches to generate unique entities dynamically.

**Contract Enforcement**: Binding strength determines consequences. Absolute bindings cannot be broken without catastrophic results.

**Emergent Gameplay**: Entity personalities create unpredictable negotiations. Same entity type behaves differently based on personality archetype.

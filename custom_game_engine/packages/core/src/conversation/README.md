# Conversation System

Agent-to-agent dialogue system with quality metrics, intelligent partner selection, and age-based conversation styles.

## Overview

The conversation system enables NPCs to engage in meaningful dialogue, with partner selection driven by shared interests, relationship quality, and age compatibility. Conversations are analyzed for depth, topic resonance, and emotional connection.

## Core Components

### ConversationQuality

Evaluates conversation depth and meaning:

```typescript
const quality = calculateConversationQuality(
  messages,
  participant1Interests,
  participant2Interests,
  durationTicks
);
// Returns: depth, topicResonance, informationExchange, emotionalConnection, overallQuality
```

**Depth levels**: shallow (greetings) → medium (opinions) → deep (philosophy, mortality, gods)

**Topics extracted**: Regex patterns match 40+ topics across philosophy, craft, nature, social, practical, story

**Quality score**: Weighted average of depth (30%), topic resonance (25%), information exchange (20%), emotional connection (15%), duration (10%)

### PartnerSelector

Scores and selects conversation partners based on:

```typescript
const partner = selectPartner({
  seeker,
  candidates,
  world
});
```

**Scoring weights**:
- Proximity: 15 (within 20 tiles)
- Shared interests: 25 (topic overlap weighted by intensity)
- Complementary knowledge: 20 (partner knows what seeker wants to learn)
- Relationship quality: 20 (affinity -100..100 normalized)
- Familiarity: 10 (relationship.familiarity / 100)
- Age compatibility: 15 (see age matrix below)
- Enthusiast bonus: +15 (good past conversations)

**Selection**: Top 3 candidates, weighted random with 20% randomness

### ConversationStyle

Age-specific conversation patterns:

| Age | Mode | Depth Capacity | Init Rate | Preferred Length |
|-----|------|----------------|-----------|------------------|
| Child | questioning | 0.4 | 0.8 | 4 exchanges |
| Teen | exploratory | 0.6 | 0.6 | 6 exchanges |
| Adult | sharing | 0.8 | 0.5 | 8 exchanges |
| Elder | reflective | 1.0 | 0.7 | 10 exchanges |

**Age compatibility matrix**:
- Child seeks adults/elders (0.9) for wisdom, other children (0.7) for play
- Teen prefers peers (0.85), can mentor with adults (0.6)
- Adult prefers peers (0.8), learns from elders (0.7), mentors youth (0.5)
- Elder loves teaching children (0.8), philosophical peers (0.85)

**Topic preferences**: Children avoid mortality (-0.3), love stories (0.9). Elders embrace mortality (0.8), philosophy (0.9). Teens focus on social (0.9), romance (0.7).

## Integration

Conversation components work with:
- `ConversationComponent`: Active conversation state, messages, partner ID
- `InterestsComponent`: Topics, intensity, discussionHunger, knownEnthusiasts
- `RelationshipComponent`: Affinity, familiarity, conversationHistory
- `AgentComponent`: ageCategory, birthTick

## Memory Integration

Conversations generate episodic memories with topic tags. High-quality conversations (>0.6) strengthen interest intensity and add knownEnthusiasts to InterestsComponent.

## Usage

```typescript
// Find best partner within range
const partner = findBestPartnerInRange(agent, world, 20);

// Get age-appropriate starter
const starter = generateConversationStarter(ageCategory, 'philosophy');

// Evaluate conversation quality
const quality = calculateConversationQuality(messages, int1, int2, duration);
console.log(describeQuality(quality)); // "profound", "deep", "meaningful", etc.
```

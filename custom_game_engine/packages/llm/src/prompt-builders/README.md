# Prompt Builders

Modular prompt construction for LLM agent decision-making. Each builder handles a specific aspect of prompt composition.

## Builders

**ActionBuilder** - Generates context-aware action lists and skill-specific instructions
- Filters available actions based on vision, skills, inventory, needs, temperature
- Categories: gathering, farming, building, social, exploration, combat
- Skill-aware instructions with village state analysis (storage, food levels, building gaps)
- Leadership guidance for high-leadership agents

**VillageInfoBuilder** - Builds village context sections
- Village status: agent count, buildings, critical gaps
- Village resources: skilled agents as affordances (perception scales with social skill)
- Building catalog with ownership and purposes
- Skill impressions (vague at social-1, detailed at social-3+)

**WorldContextBuilder** - Assembles current situation from components
- Needs (hunger, energy), temperature, inventory
- Tiered vision: close-range detail (~10m), area summaries (~50m), distant landmarks (~200m)
- Resource/plant/agent awareness with skill-gated visibility
- Storage info, memory-based known locations, building suggestions
- Harmony context integration for architecture-skilled agents

**MemoryBuilder** - Filters episodic memories for meaningful events
- Prioritizes social interactions, emotional events, accomplishments over routine tasks
- Deduplication: never shows identical summaries
- Category diversity limits (max 2 per category: survival, resources, construction, etc.)
- Recency bonus: recent memories boosted, old memories penalized
- Scoring: dialogue +0.8, emotional intensity +0.5×intensity, survival relevance variable

**HarmonyContextBuilder** - Provides Feng Shui perception (architecture skill ≥2)
- Skill-gated awareness: vague feelings (2), scores/issues (3), full analysis (4+)
- Chi flow, commanding positions, element balance, proportions
- Placement hints: deficient/excessive elements, building recommendations
- Aerial harmony for flying creatures (z>0): thermals, wind corridors, perching spots, flight paths

**SkillProgressionUtils** - Utility functions for skill-aware context
- Build time estimates, crafting availability
- Strategic advice for in-progress tasks
- Skilled agents as resources (affordances through relationships)
- Building access descriptions

## Prompt Structure

Prompts compose these sections in order:
1. Conversation context (active dialogue first)
2. Current situation (needs, temperature, inventory)
3. Village status and resources
4. World context (vision, memory, buildings)
5. Available actions (skill-filtered)
6. Skill-aware instruction

## Integration

Used by `StructuredPromptBuilder` (executor/talker) to generate prompts for LLM calls. Each builder is instantiated once and called per-agent per-prompt generation.

**Example flow:**
```typescript
const actionBuilder = new ActionBuilder();
const actions = actionBuilder.getAvailableActions(vision, world, entity);
const instruction = actionBuilder.buildSkillAwareInstruction(agent, world, skills, needs, temp, inv, conv, vision);
```

**Key principle:** Information depth scales with skill level. Low-skill agents see vague impressions; high-skill agents see detailed analysis with actionable suggestions.

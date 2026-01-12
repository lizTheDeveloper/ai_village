# TalkerPromptBuilder

**Layer 2 of 3-layer LLM architecture: Social & Verbal Planning**

## Purpose

Handles **goal-setting and social awareness**. Sets WHAT to accomplish and WHY, not HOW. The Talker layer focuses on:
- Setting personal, medium-term, and group goals
- Social interactions (conversations, relationships, proximity awareness)
- Environmental awareness (general surroundings, not resource micromanagement)
- Verbal planning and thinking aloud

**Not responsible for**: Task execution (Executor), resource management (Autonomic/Executor), strategic planning details (Executor).

## Invocation Pattern

**When Talker runs**: Agent needs to update goals or lacks active goals. Low frequency (goal-setting is not every-tick).

**When Executor runs**: Agent has goals and needs to execute them. High frequency (action selection is per-tick).

Talker sets direction → Executor implements it.

## Prompt Structure

Sections assembled in priority order:

1. **Critical Needs** - Extracted warnings (starvation, exhaustion, freezing) displayed first
2. **System Prompt** - Identity, personality (via `generatePersonalityPrompt`)
3. **Character Guidelines** - Role definition (goal-setting brain)
4. **Current Goals** - Active goals with completion percentages
5. **Schema Prompt** - Auto-generated from socially-relevant components only (filtered via `SOCIALLY_RELEVANT_COMPONENTS`)
6. **Social Context** - Active conversations, nearby agents, relationships, heard speech
7. **Environment Context** - Vision, needs, temperature, materials around
8. **Memories** - Recent social memories (conversations, relationships)
9. **Available Actions** - Goal-setting actions (`set_personal_goal`, `set_medium_term_goal`, `set_group_goal`)
10. **Instruction** - Context-aware decision prompt
11. **Speech Guidelines** - How to speak naturally

## Key Methods

**`buildPrompt(agent, world)`** - Main entry point. Returns formatted prompt string.

**`buildSocialContext()`** - Core of Talker awareness. Assembles conversations, relationships, nearby agents, heard speech with affinity context.

**`buildEnvironmentContext()`** - High-level awareness (what's around, not detailed counts/locations).

**`buildSocialMemories()`** - Filters episodic memories for social events (conversations, relationships).

**`getAvailableTalkerActions()`** - Returns goal-setting actions. Uses `BEHAVIOR_DESCRIPTIONS` as single source of truth.

**`extractCriticalNeeds()`** - Parses environment context for emergency warnings to surface at top.

## Component Filtering

Only **socially-relevant components** rendered in schema prompt (19 types):
- Identity, personality, emotional state, mood
- Relationships, social knowledge, conversation, social memory
- Memory, episodic memory, semantic memory, beliefs
- Goals, needs, inventory, skills, magic
- Health, physical state, temperature, spiritual/soul, journal

**Excludes**: Combat stats, navigation, steering, metadata that doesn't affect social decisions.

## Output Format

LLM responds via **tool calling** (provider-specific). Expected tools:
- Goal-setting actions (`set_personal_goal`, `set_medium_term_goal`, `set_group_goal`)
- Social actions (`follow_agent`, `call_meeting`, `help`)
- Speech parameter (automatic when near others, no "talk" action needed)

**Important**: Talker does NOT return JSON. Providers inject tool-calling format instructions. Prompt focuses on decision context only.

## Schema Integration

Uses `PromptRenderer.renderEntity()` from `@ai-village/introspection` to auto-generate component descriptions. Filters entity to socially-relevant components before rendering to reduce token usage.

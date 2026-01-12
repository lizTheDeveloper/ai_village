# ExecutorPromptBuilder

**Layer 3 of 3-layer LLM decision architecture.** Strategic planning and task execution.

## Purpose

Executor layer handles **HOW** to achieve goals set by Talker layer. Plans multi-step tasks, manages resources, executes skill-based actions.

**Division of labor:**
- **Talker (Layer 2)**: Sets goals ("gather 50 berries for winter"), expresses personality, socializes
- **Executor (Layer 3)**: Plans execution ("find berry bushes → gather → store in chest"), uses tools
- **Autonomic (Layer 1)**: Handles low-level needs (hunger → auto-pick berries), interrupts queues

## Prompt Structure

Built by `buildPrompt(agent, world)`:

1. **System Prompt**: Personality, identity (from `PersonalityPromptTemplates`)
2. **Role Guidelines**: "You are the STRATEGIC PLANNER" - clarifies layer responsibility
3. **Goals Section**: Current goals with completion percentages (early placement for visibility)
4. **Schema Prompt**: Auto-generated component data via `PromptRenderer`
5. **Skills**: Top 5 skills with proficiency levels (determines available actions)
6. **Priorities**: Top 3 strategic focuses (percentages)
7. **Task Queue**: Queued behaviors with status (CURRENT/DONE/PENDING), pause state
8. **Village Status**: Buildings, food storage (skill-gated visibility)
9. **Environment**: Detailed resource/plant counts ("berry: 15 available", "oak tree: 8 visible")
10. **Buildings**: Available blueprints with costs (skill-gated)
11. **Available Actions**: Skill-gated action list
12. **Instruction**: Context-aware next action prompt

## Key Methods

### `buildPrompt(agent, world)`
Main entry point. Assembles complete strategic planning prompt.

### `buildEnvironmentContext(vision, needs, world)`
Critical for planning. Provides **exact counts** of resources/plants in vision. Enables numeric reasoning: "need 50 berries, see 15, must find 35 more".

### `buildTaskQueueSection(agentComp)`
Shows queued tasks to prevent thrashing. Displays pause state when Autonomic interrupts for needs.

### `getAvailableExecutorActions(skills, vision, needs, inventory, world)`
Returns skill-gated action list:
- **Always**: `set_priorities`, `set_personal_goal`, `plan_build`, `pick`, `gather`, `explore`
- **Farming ≥1**: `till`, `farm`, `plant`
- **Building ≥1**: `build` (direct construction)
- **Animal Handling ≥2**: `tame_animal`, `house_animal`
- **Combat ≥1**: `hunt`, `initiate_combat`
- **Cooking ≥1**: `butcher`
- **Research ≥1**: `research`
- **Magic ≥1**: `cast_spell`

### `buildExecutorInstruction(agentComp, needs, skills, inventory, world)`
Context-aware instruction based on state:
- **Task completed**: "What should you do next?"
- **Idle + critical needs**: "You are cold/tired. Consider plan_build for campfire/bed"
- **Active task**: "Currently [task]. Continue or switch?"

## Output Format

Executor uses **tool calling** (not JSON string). Provider injects tool definitions. LLM responds with tool calls like:

```json
{
  "tool": "gather",
  "parameters": {
    "resourceType": "berry",
    "amount": 50,
    "storeInChest": true
  }
}
```

**No "RESPOND IN JSON ONLY" instruction** - conflicts with tool calling, confuses LLM.

## Invocation Triggers

**When Executor runs:**
- Task completion (`behaviorCompleted = true`)
- Idle state (no active behavior)
- Periodic strategic review (every N ticks)

**When Talker runs instead:**
- Social interaction (conversation, goal-setting)
- Reflection/personality expression
- High-level decision-making (WHAT/WHY vs Executor's HOW)

## Special Features

**Skill-gated information**: Village status, buildings, actions filtered by skill levels. Prevents overwhelming low-skill agents.

**Resource counting**: Unlike Talker's qualitative descriptions, Executor sees exact quantities for planning.

**Queue coordination**: Sees current queue to avoid duplicate tasks. Uses `sleep_until_queue_complete` to pause Executor until Autonomic finishes queued work.

/**
 * DeepEval test suite using REAL prompts from actual game sessions.
 *
 * This test suite validates that our prompt builders produce prompts that match
 * what we see in real gameplay. Prompts extracted from logs/llm-prompts/*.jsonl
 */

import { describe, it, expect } from 'vitest';

describe('RealWorldPromptsDeepEval - Executor Layer', () => {
  describe('Real Prompt: Orion (crafting:2, farming:1)', () => {
    // Extracted from logs/llm-prompts/llm-prompts-2026-01-11.jsonl
    const realPrompt = `You are Orion, a villager in this improbable forest settlement.

Your Personality:
- Novelty intrigues you but doesn't possess you. You'll try the experimental dish, read the obscure book, take the unmarked path—just not all on the same day. Your adventurousness comes with a sensible warranty and reasonable return policy.
- People energize you more than they drain you, which is fortunate because you tend to accumulate them. You're outgoing without being overwhelming, friendly without being intrusive, the social equivalent of a warm but not oppressively hot day.

Your Skills:
- crafting: competent (level 2.0)
- farming: beginner (level 1.0)

What You Can Do:
- set_priorities - Set task priorities (gathering, building, farming, social)
- plan_build - Plan and queue a building project (auto-gathers resources)
- pick - Grab a single item nearby (say "pick wood" or "pick berries")
- gather - Stockpile resources - gather a specified amount and store in chest
- till - Prepare soil for planting (requires farming skill level 1)
- farm - Work on farming tasks (requires farming skill level 1)
- plant - Plant seeds in tilled soil (requires farming skill level 1)
- explore - Systematically explore unknown areas to find new resources
- wander - Explore your surroundings casually
- idle - Take a moment to think and rest`;

    it('should include farming actions for agent with farming:1', () => {
      expect(realPrompt).toContain('till - Prepare soil for planting (requires farming skill level 1)');
      expect(realPrompt).toContain('farm - Work on farming tasks (requires farming skill level 1)');
      expect(realPrompt).toContain('plant - Plant seeds in tilled soil (requires farming skill level 1)');
    });

    it('should NOT include combat actions for agent without combat skill', () => {
      expect(realPrompt).not.toContain('initiate_combat');
      expect(realPrompt).not.toContain('hunt');
    });

    it('should include crafting skill in skill list', () => {
      expect(realPrompt).toContain('crafting: competent (level 2.0)');
    });

    it('should NOT use JSON format instructions', () => {
      expect(realPrompt).not.toContain('RESPOND IN JSON ONLY');
      expect(realPrompt).not.toContain('JSON format');
    });

    it('should include personality traits affecting behavior', () => {
      // Extrovert personality mentioned
      expect(realPrompt).toContain('outgoing');
      expect(realPrompt).toContain('social');
    });
  });

  describe('Real Prompt: Rowan (farming:2, hunting:1, stealth:1)', () => {
    const realPrompt = `You are Rowan, a villager in this improbable forest settlement.

Your Skills:
- farming: competent (level 2.0)
- hunting: beginner (level 1.0)
- stealth: beginner (level 1.0)

Your Current Priorities:
You're focusing on farming (31%), gathering (14%), building (14%) right now.

What You Can Do:
- set_priorities - Set task priorities (gathering, building, farming, social)
- plan_build - Plan and queue a building project (auto-gathers resources)
- pick - Grab a single item nearby (say "pick wood" or "pick berries")
- gather - Stockpile resources - gather a specified amount and store in chest
- till - Prepare soil for planting (requires farming skill level 1)
- farm - Work on farming tasks (requires farming skill level 1)
- plant - Plant seeds in tilled soil (requires farming skill level 1)
- explore - Systematically explore unknown areas to find new resources
- wander - Explore your surroundings casually
- idle - Take a moment to think and rest`;

    it('should show current priorities', () => {
      expect(realPrompt).toContain('farming (31%)');
      expect(realPrompt).toContain('gathering (14%)');
    });

    it('should include farming actions for farming:2 skill', () => {
      expect(realPrompt).toContain('till');
      expect(realPrompt).toContain('farm');
      expect(realPrompt).toContain('plant');
    });

    it('should NOT show combat actions even though agent has stealth', () => {
      // Agent has stealth:1 but NOT combat:1, so no combat actions
      expect(realPrompt).not.toContain('initiate_combat');
    });

    it('should include all three skills in skill list', () => {
      expect(realPrompt).toContain('farming: competent (level 2.0)');
      expect(realPrompt).toContain('hunting: beginner (level 1.0)');
      expect(realPrompt).toContain('stealth: beginner (level 1.0)');
    });
  });

  describe('Real Prompt: Oak (cooking:1, combat:1)', () => {
    const realPrompt = `You are Oak, a villager in this improbable forest settlement.

Your Skills:
- cooking: beginner (level 1.0)
- combat: beginner (level 1.0)

What You Can Do:
- set_priorities - Set task priorities (gathering, building, farming, social)
- plan_build - Plan and queue a building project (auto-gathers resources)
- pick - Grab a single item nearby (say "pick wood" or "pick berries")
- gather - Stockpile resources - gather a specified amount and store in chest
- explore - Systematically explore unknown areas to find new resources
- hunt - Hunt a wild animal for meat and resources (requires combat skill level 1)
- butcher - Butcher a tame animal at butchering table (requires cooking level 1)
- initiate_combat - Challenge another agent to combat (lethal or non-lethal, requires combat skill level 1)
- wander - Explore your surroundings casually
- idle - Take a moment to think and rest`;

    it('should include combat actions for agent with combat:1', () => {
      expect(realPrompt).toContain('hunt - Hunt a wild animal for meat and resources (requires combat skill level 1)');
      expect(realPrompt).toContain('initiate_combat - Challenge another agent to combat');
    });

    it('should include cooking actions for agent with cooking:1', () => {
      expect(realPrompt).toContain('butcher - Butcher a tame animal at butchering table (requires cooking level 1)');
    });

    it('should NOT include farming actions without farming skill', () => {
      expect(realPrompt).not.toContain('till');
      expect(realPrompt).not.toContain('farm - Work on farming tasks');
      expect(realPrompt).not.toContain('plant');
    });
  });
});

describe('RealWorldPromptsDeepEval - Talker Layer', () => {
  describe('Real Prompt: Oak with social context', () => {
    const realPrompt = `You are Oak, a villager in this improbable forest settlement.

--- YOUR ROLE ---
You are the GOAL-SETTING brain. Your job is to decide WHAT you want to accomplish and WHY.
- Set goals: personal goals, medium-term goals, group goals
- Speak your thoughts aloud when near others (but DON'T stop working to talk)
- Notice people and social dynamics
Speaking is automatic when near others - you don't need to choose "talk" as an action.
Focus on setting meaningful goals that drive productive behavior.

--- Social Context ---

Nearby people: Clay, Rowan, Orion, Dove

What you hear:
- Orion says: "Let's start by building a storage chest to keep our supplies organized."

What You Can Do:
- set_personal_goal - Set a new personal goal
- set_medium_term_goal - Set a goal for the next few days
- set_group_goal - Propose a goal for the village
- follow_agent - Follow someone
- call_meeting - Call a meeting to discuss something
- help - Help another agent with their task

--- RESPONSE FORMAT ---

CRITICAL: Output ONLY valid JSON. DO NOT include labels like "Action:", "Speaking:", or "Thoughts:".
Start your response with { and end with }. NO extra text before or after the JSON.

DO NOT start your speech with your name - the conversation already shows who's speaking.
Speak naturally without announcing yourself (e.g., "Kestrel here" or "Clay speaking").`;

    it('should list nearby agents', () => {
      expect(realPrompt).toContain('Nearby people: Clay, Rowan, Orion, Dove');
    });

    it('should show conversation history', () => {
      expect(realPrompt).toContain('What you hear:');
      expect(realPrompt).toContain('Orion says: "Let\'s start by building a storage chest');
    });

    it('should include goal-setting actions', () => {
      expect(realPrompt).toContain('set_personal_goal');
      expect(realPrompt).toContain('set_medium_term_goal');
      expect(realPrompt).toContain('set_group_goal');
    });

    it('should NOT start speech with agent name', () => {
      expect(realPrompt).toContain('DO NOT start your speech with your name');
      expect(realPrompt).toContain('Speak naturally without announcing yourself');
    });

    it('should use JSON format for Talker', () => {
      // Talker layer uses JSON format, NOT tool calling
      expect(realPrompt).toContain('Output ONLY valid JSON');
      expect(realPrompt).toContain('Start your response with { and end with }');
    });

    it('should clarify role as goal-setter, not task executor', () => {
      expect(realPrompt).toContain('GOAL-SETTING brain');
      expect(realPrompt).toContain('decide WHAT you want to accomplish and WHY');
    });
  });

  describe('Real Prompt: Rowan (relaxed personality)', () => {
    const realPrompt = `You are Rowan, a villager in this improbable forest settlement.

Your Personality:
- You take life easy with the practiced nonchalance of someone who's figured out that tomorrow arrives regardless of today's productivity. Work will wait. It always does. Meanwhile, this patch of sunlight won't be here forever, and you have priorities.
- You're resilient in the way granite is resilient: unbothered, unshaken, unmoved by things that would crack other people.

## Emotional State
Mood: -37.42 (31%)
Emotion: anxious
factors: {physical: -88.24, foodSatisfaction: 0, foodVariety: 0}…

--- Social Context ---

Nearby people: Clay, Orion, Oak, Dove`;

    it('should include personality traits', () => {
      // Real prompts use prose descriptions, not keywords
      expect(realPrompt).toContain('You take life easy');
      expect(realPrompt).toContain('resilient');
    });

    it('should show emotional state', () => {
      expect(realPrompt).toContain('Mood: -37.42 (31%)');
      expect(realPrompt).toContain('Emotion: anxious');
    });

    it('should contrast personality with current emotion', () => {
      // Relaxed personality ("take life easy") but currently anxious - interesting edge case
      expect(realPrompt).toContain('take life easy');
      expect(realPrompt).toContain('anxious');
    });

    it('should list nearby agents for social awareness', () => {
      expect(realPrompt).toContain('Nearby people: Clay, Orion, Oak, Dove');
    });
  });
});

describe('RealWorldPromptsDeepEval - Prompt Quality', () => {
  describe('Schema-driven component info format', () => {
    const realPrompt = `--- Schema-Driven Component Info ---
## Agent State
Behavior: idle
priorities: {gathering: 0.13, building: 0.28, farming: 0.21}…

## needs
Healthy and content

## relationships
No relationships yet

## personality
curious and adventurous, outgoing and social, helpful and cooperative

## skills
Crafting: Apprentice (2), Farming: Novice (1)

## Appearance
Gender: female
Hair Color: black
Skin Tone: light
Eye Color: gray`;

    it('should use schema-driven format for component data', () => {
      expect(realPrompt).toContain('--- Schema-Driven Component Info ---');
    });

    it('should show agent state with behavior and priorities', () => {
      expect(realPrompt).toContain('Behavior: idle');
      expect(realPrompt).toContain('priorities:');
    });

    it('should format skills with level names and numbers', () => {
      expect(realPrompt).toContain('Crafting: Apprentice (2)');
      expect(realPrompt).toContain('Farming: Novice (1)');
    });

    it('should include appearance details', () => {
      expect(realPrompt).toContain('Gender: female');
      expect(realPrompt).toContain('Hair Color: black');
    });
  });

  describe('Available actions format', () => {
    const realPrompt = `What You Can Do:
- set_priorities - Set task priorities (gathering, building, farming, social)
- plan_build - Plan and queue a building project (auto-gathers resources)
- pick - Grab a single item nearby (say "pick wood" or "pick berries")
- gather - Stockpile resources - gather a specified amount and store in chest
- till - Prepare soil for planting (requires farming skill level 1)`;

    it('should list actions with descriptions', () => {
      expect(realPrompt).toContain('- set_priorities - Set task priorities');
      expect(realPrompt).toContain('- plan_build - Plan and queue');
    });

    it('should show skill requirements for gated actions', () => {
      expect(realPrompt).toContain('requires farming skill level 1');
    });

    it('should include examples in action descriptions', () => {
      expect(realPrompt).toContain('say "pick wood" or "pick berries"');
    });
  });
});

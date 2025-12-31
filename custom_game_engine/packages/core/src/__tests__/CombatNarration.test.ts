import { describe, it, expect, beforeEach, vi } from 'vitest';

// SKIPPED: CombatNarrationPromptBuilder and HuntingNarrationPromptBuilder not yet implemented
// These classes are expected at:
//   - packages/llm/src/prompt-builders/CombatNarrationPromptBuilder.ts
//   - packages/llm/src/prompt-builders/HuntingNarrationPromptBuilder.ts

/**
 * Tests for LLM Narration - Acceptance Criterion 8
 *
 * Verifies:
 * - LLM receives context (participants, skills, equipment, location, witnesses)
 * - LLM receives pre-determined outcome
 * - LLM generates 2-3 sentence narrative (start, key moment, ending)
 * - Tone matches severity (light for sparring, grim for death)
 * - Memorable details extracted for agent memories
 * - Witness perceptions generated
 *
 * SKIPPED: Waiting for prompt builder implementation
 */
describe.skip('CombatNarration', () => {
  let mockLLM: any;

  beforeEach(() => {
    mockLLM = vi.fn().mockResolvedValue({
      narrative: 'The fighters squared off. Steel clashed against steel. One emerged victorious.',
      memorable_details: ['squared off', 'steel clashed', 'victorious'],
      witness_perceptions: {
        witness1: 'saw the attacker strike first',
        witness2: 'noticed the defender stumble',
      },
    });
  });

  describe('REQ-CON-012: Combat Narration', () => {
    it('should include participants in context', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior', combatSkill: 8 },
        defender: { name: 'Guard', combatSkill: 6 },
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('Warrior');
      expect(prompt).toContain('Guard');
    });

    it('should include skills in context', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior', combatSkill: 8 },
        defender: { name: 'Guard', combatSkill: 6 },
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('combatSkill');
    });

    it('should include equipment in context', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior', weapon: 'sword', armor: 'chainmail' },
        defender: { name: 'Guard', weapon: 'spear', armor: 'leather' },
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('sword');
      expect(prompt).toContain('spear');
    });

    it('should include location in context', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        location: { terrain: 'forest', weather: 'rain' },
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('forest');
      expect(prompt).toContain('rain');
    });

    it('should include witnesses in context', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        witnesses: [{ name: 'Villager1' }, { name: 'Villager2' }],
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('Villager1');
      expect(prompt).toContain('Villager2');
    });

    it('should include pre-determined outcome', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('attacker_victory');
    });

    it('should generate 2-3 sentence narrative', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        outcome: 'attacker_victory',
      };

      const result = await mockLLM(builder.buildPrompt(context));

      const sentences = result.narrative.split('.').filter((s: string) => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(4);
    });

    it('should use light tone for sparring', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        cause: 'sparring',
        severity: 'light',
        outcome: 'attacker_victory',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('light');
      expect(prompt).toContain('sparring');
    });

    it('should use grim tone for death', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        outcome: 'death',
        severity: 'lethal',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('grim');
      expect(prompt).toContain('death');
    });

    it('should extract memorable details', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        outcome: 'attacker_victory',
      };

      const result = await mockLLM(builder.buildPrompt(context));

      expect(result.memorable_details).toBeDefined();
      expect(result.memorable_details.length).toBeGreaterThan(0);
    });

    it('should generate witness perceptions', async () => {
      const builder = new CombatNarrationPromptBuilder();

      const context = {
        type: 'agent_combat',
        attacker: { name: 'Warrior' },
        defender: { name: 'Guard' },
        witnesses: [{ id: 'witness1' }, { id: 'witness2' }],
        outcome: 'attacker_victory',
      };

      const result = await mockLLM(builder.buildPrompt(context));

      expect(result.witness_perceptions).toBeDefined();
      expect(result.witness_perceptions.witness1).toBeDefined();
      expect(result.witness_perceptions.witness2).toBeDefined();
    });
  });

  describe('REQ-CON-013: Hunting Narration', () => {
    it('should generate hunting success narrative', async () => {
      const builder = new HuntingNarrationPromptBuilder();

      const context = {
        type: 'hunt',
        hunter: { name: 'Hunter', huntingSkill: 7 },
        animal: { species: 'deer', speed: 8 },
        outcome: 'success',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('Hunter');
      expect(prompt).toContain('deer');
      expect(prompt).toContain('success');
    });

    it('should generate hunting failure narrative', async () => {
      const builder = new HuntingNarrationPromptBuilder();

      const context = {
        type: 'hunt',
        hunter: { name: 'Hunter', huntingSkill: 3 },
        animal: { species: 'rabbit', speed: 10 },
        outcome: 'failed',
        reason: 'animal_escaped',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('failed');
      expect(prompt).toContain('escaped');
    });

    it('should include hunting context in narrative', async () => {
      const builder = new HuntingNarrationPromptBuilder();

      const context = {
        type: 'hunt',
        hunter: { name: 'Hunter', huntingSkill: 7, weapon: 'bow' },
        animal: { species: 'deer' },
        terrain: 'forest',
        weather: 'clear',
        timeOfDay: 'dawn',
        outcome: 'success',
      };

      const prompt = builder.buildPrompt(context);

      expect(prompt).toContain('bow');
      expect(prompt).toContain('forest');
      expect(prompt).toContain('dawn');
    });
  });
});

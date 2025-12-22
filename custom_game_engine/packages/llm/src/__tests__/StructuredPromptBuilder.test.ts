import { describe, it, expect } from 'vitest';
import { StructuredPromptBuilder } from '../StructuredPromptBuilder';

describe('StructuredPromptBuilder', () => {
  const builder = new StructuredPromptBuilder();

  function createMockEntity(overrides?: any): any {
    const components = new Map();

    components.set('identity', { name: 'TestAgent', ...overrides?.identity });
    components.set('personality', {
      openness: 75,
      extraversion: 80,
      agreeableness: 65,
      workEthic: 70,
      ...overrides?.personality
    });
    components.set('needs', {
      hunger: 50,
      energy: 60,
      ...overrides?.needs
    });
    components.set('vision', {
      seenAgents: [],
      seenResources: [],
      heardSpeech: [],
      ...overrides?.vision
    });
    components.set('memory', {
      memories: [],
      ...overrides?.memory
    });

    return { components };
  }

  describe('buildPrompt', () => {
    it('should build complete prompt with all sections', () => {
      const entity = createMockEntity();
      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('You are TestAgent');
      expect(prompt).toContain('Hunger:');
      expect(prompt).toContain('Energy:');
      expect(prompt).toContain('What should you do?');
    });

    it('should include personality traits in prompt', () => {
      const entity = createMockEntity({
        personality: { openness: 85, extraversion: 90 }
      });
      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('curious and adventurous');
      expect(prompt).toContain('outgoing and social');
    });

    it('should describe hunger levels correctly', () => {
      const veryHungry = createMockEntity({ needs: { hunger: 20 } });
      const satisfied = createMockEntity({ needs: { hunger: 95 } });

      const hungryPrompt = builder.buildPrompt(veryHungry, {});
      const satisfiedPrompt = builder.buildPrompt(satisfied, {});

      expect(hungryPrompt).toContain('very hungry');
      expect(satisfiedPrompt).toContain('satisfied');
    });

    it('should describe energy levels correctly', () => {
      const exhausted = createMockEntity({ needs: { energy: 25 } });
      const rested = createMockEntity({ needs: { energy: 95 } });

      const exhaustedPrompt = builder.buildPrompt(exhausted, {});
      const restedPrompt = builder.buildPrompt(rested, {});

      expect(exhaustedPrompt).toContain('exhausted');
      expect(restedPrompt).toContain('rested');
    });
  });

  describe('hearing system integration', () => {
    it('should include heard speech in prompt', () => {
      const entity = createMockEntity({
        vision: {
          seenAgents: ['agent1'],
          heardSpeech: [
            { speaker: 'Alice', text: 'Found some berries!' },
            { speaker: 'Bob', text: 'Need help building' }
          ]
        }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('What you hear:');
      expect(prompt).toContain('Alice says: "Found some berries!"');
      expect(prompt).toContain('Bob says: "Need help building"');
    });

    it('should not show hearing section when no speech', () => {
      const entity = createMockEntity({
        vision: { seenAgents: ['agent1'], heardSpeech: [] }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).not.toContain('What you hear:');
    });

    it('should show agents present even if silent', () => {
      const entity = createMockEntity({
        vision: {
          seenAgents: ['agent1', 'agent2'],
          seenResources: []
        }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('You see 2 other villagers nearby');
    });
  });

  describe('context collapse', () => {
    it('should not show empty memories section', () => {
      const entity = createMockEntity({
        memory: { memories: [] }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).not.toContain('no significant recent memories');
      expect(prompt).not.toContain('Recent Memories:');
    });

    it('should show memories when present', () => {
      const entity = createMockEntity({
        memory: {
          memories: [
            { type: 'agent_seen' },
            { type: 'resource_found' }
          ]
        }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('Recent Memories:');
      expect(prompt).toContain('agent_seen');
    });

    it('should show empty area when nothing nearby', () => {
      const entity = createMockEntity({
        vision: {
          seenAgents: [],
          seenResources: [],
          heardSpeech: []
        }
      });

      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain('The area around you is empty');
    });
  });

  describe('instruction clarity', () => {
    it('should include "don\'t overthink" instruction', () => {
      const entity = createMockEntity();
      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toContain("Don't overthink");
      expect(prompt).toContain('gut reaction');
    });

    it('should end with response prompt', () => {
      const entity = createMockEntity();
      const prompt = builder.buildPrompt(entity, {});

      expect(prompt).toMatch(/Your response:\s*$/);
    });
  });

  describe('resource type descriptions', () => {
    it('should describe trees when wood resources are visible', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['tree1', 'tree2'] }
      });

      const mockWorld = {
        getEntity: (_id: string) => ({
          getComponent: () => ({ resourceType: 'wood' })
        })
      };

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('2 trees');
      expect(prompt).not.toContain('food source');
    });

    it('should describe rocks when stone resources are visible', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['rock1'] }
      });

      const mockWorld = {
        getEntity: (_id: string) => ({
          getComponent: () => ({ resourceType: 'stone' })
        })
      };

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('1 rock');
      expect(prompt).not.toContain('food source');
    });

    it('should describe mixed resources correctly', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['tree1', 'rock1', 'food1'] }
      });

      let callCount = 0;
      const mockWorld = {
        getEntity: (_id: string) => {
          callCount++;
          const types = ['wood', 'stone', 'food'];
          return {
            getComponent: () => ({ resourceType: types[(callCount - 1) % 3] })
          };
        }
      };

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('1 tree');
      expect(prompt).toContain('1 rock');
      expect(prompt).toContain('1 food source');
    });
  });
});

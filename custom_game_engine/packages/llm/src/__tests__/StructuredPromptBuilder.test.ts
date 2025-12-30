import { describe, it, expect } from 'vitest';
import { StructuredPromptBuilder } from '../StructuredPromptBuilder';

describe('StructuredPromptBuilder', () => {
  const builder = new StructuredPromptBuilder();

  function createMockWorld(): any {
    const mockQueryBuilder = {
      with: () => mockQueryBuilder,
      without: () => mockQueryBuilder,
      executeEntities: () => [],
      execute: () => [],
    };
    return {
      getEntity: (id: string) => {
        // Return a minimal mock entity
        const components = new Map([
          ['identity', { name: `Agent${id}` }],
          ['position', { x: 0, y: 0 }],
          ['agent', { state: 'idle' }]
        ]);
        return {
          id,
          components,
          getComponent: (type: string) => components.get(type)
        };
      },
      query: () => mockQueryBuilder,
      tick: 0,
      time: { hour: 12, day: 1 },
    };
  }

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
      hunger: 0.5,  // 0-1 scale
      energy: 0.6,  // 0-1 scale
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
      const world = createMockWorld();
      const prompt = builder.buildPrompt(entity, world);

      expect(prompt).toContain('You are TestAgent');
      expect(prompt).toContain('Hunger:');
      expect(prompt).toContain('Energy:');
      expect(prompt).toContain('What should you do?');
    });

    it('should include personality traits in prompt', () => {
      const entity = createMockEntity({
        personality: { openness: 85, extraversion: 90 }
      });
      const world = createMockWorld();
      const prompt = builder.buildPrompt(entity, world);

      expect(prompt).toContain('curious and adventurous');
      expect(prompt).toContain('outgoing and social');
    });

    it('should describe hunger levels correctly', () => {
      const veryHungry = createMockEntity({ needs: { hunger: 0.2 } }); // 0-1 scale
      const satisfied = createMockEntity({ needs: { hunger: 0.95 } }); // 0-1 scale
      const world = createMockWorld();

      const hungryPrompt = builder.buildPrompt(veryHungry, world);
      const satisfiedPrompt = builder.buildPrompt(satisfied, world);

      expect(hungryPrompt).toContain('very hungry');
      expect(satisfiedPrompt).toContain('satisfied');
    });

    it('should describe energy levels correctly', () => {
      const exhausted = createMockEntity({ needs: { energy: 0.25 } }); // 0-1 scale
      const rested = createMockEntity({ needs: { energy: 0.95 } }); // 0-1 scale
      const world = createMockWorld();

      const exhaustedPrompt = builder.buildPrompt(exhausted, world);
      const restedPrompt = builder.buildPrompt(rested, world);

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
      const world = createMockWorld();

      const prompt = builder.buildPrompt(entity, world);

      // When multiple people are talking, it shows GROUP CONVERSATION
      expect(prompt).toContain('GROUP CONVERSATION');
      expect(prompt).toContain('Alice: "Found some berries!"');
      expect(prompt).toContain('Bob: "Need help building"');
    });

    it('should not show hearing section when no speech', () => {
      const entity = createMockEntity({
        vision: { seenAgents: ['agent1'], heardSpeech: [] }
      });
      const world = createMockWorld();

      const prompt = builder.buildPrompt(entity, world);

      expect(prompt).not.toContain('What you hear:');
    });

    it('should show agents present even if silent', () => {
      const entity = createMockEntity({
        vision: {
          seenAgents: ['agent1', 'agent2'],
          seenResources: []
        }
      });
      const world = createMockWorld();

      const prompt = builder.buildPrompt(entity, world);

      // Should show the agent names in "You see nearby:"
      expect(prompt).toContain('You see nearby:');
      expect(prompt).toContain('Agentagent1');
      expect(prompt).toContain('Agentagent2');
    });
  });

  describe('context collapse', () => {
    it('should not show empty memories section', () => {
      const entity = createMockEntity({
        memory: { memories: [] }
      });

      const prompt = builder.buildPrompt(entity, createMockWorld());

      expect(prompt).not.toContain('no significant recent memories');
      expect(prompt).not.toContain('Recent Memories:');
    });

    it('should show memories when present', () => {
      const entity = createMockEntity({
        memory: {
          memories: [
            { type: 'agent_seen', metadata: {} },
            { type: 'resource_location', metadata: { resourceType: 'wood' } }
          ]
        }
      });

      const prompt = builder.buildPrompt(entity, createMockWorld());

      expect(prompt).toContain('Recent Memories:');
      expect(prompt).toContain('You saw someone');
      expect(prompt).toContain('You found wood');
    });

    it('should show empty area when nothing nearby', () => {
      const entity = createMockEntity({
        vision: {
          seenAgents: [],
          seenResources: [],
          heardSpeech: []
        }
      });

      const prompt = builder.buildPrompt(entity, createMockWorld());

      expect(prompt).toContain('The area around you is empty');
    });
  });

  describe('instruction clarity', () => {
    it('should include "don\'t overthink" instruction', () => {
      const entity = createMockEntity();
      const prompt = builder.buildPrompt(entity, createMockWorld());

      expect(prompt).toContain("Don't overthink");
      expect(prompt).toContain('gut reaction');
    });

    it('should end with response prompt', () => {
      const entity = createMockEntity();
      const prompt = builder.buildPrompt(entity, createMockWorld());

      expect(prompt).toMatch(/Your response \(JSON only\):\s*$/);
    });
  });

  describe('resource type descriptions', () => {
    // Helper to create inline mock worlds with query support
    const createInlineMockWorld = (getEntityFn: (id: string) => any) => {
      const mockQueryBuilder = {
        with: () => mockQueryBuilder,
        without: () => mockQueryBuilder,
        executeEntities: () => [],
        execute: () => [],
      };
      return {
        getEntity: getEntityFn,
        query: () => mockQueryBuilder,
        tick: 0,
        time: { hour: 12, day: 1 },
      };
    };

    it('should describe trees when wood resources are visible', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['tree1', 'tree2'] }
      });

      const mockWorld = createInlineMockWorld((_id: string) => {
        const components = new Map([
          ['resource', { resourceType: 'wood' }]
        ]);
        return {
          components,
          getComponent: (type: string) => components.get(type)
        };
      });

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('2 trees');
      expect(prompt).not.toContain('food source');
    });

    it('should describe rocks when stone resources are visible', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['rock1'] }
      });

      const mockWorld = createInlineMockWorld((_id: string) => {
        const components = new Map([
          ['resource', { resourceType: 'stone' }]
        ]);
        return {
          components,
          getComponent: (type: string) => components.get(type)
        };
      });

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('1 rock');
      expect(prompt).not.toContain('food source');
    });

    it('should describe mixed resources correctly', () => {
      const entity = createMockEntity({
        vision: { seenResources: ['tree1', 'rock1', 'food1'] }
      });

      let callCount = 0;
      const mockWorld = createInlineMockWorld((_id: string) => {
        callCount++;
        const types = ['wood', 'stone', 'food'];
        const components = new Map([
          ['resource', { resourceType: types[(callCount - 1) % 3] }]
        ]);
        return {
          components,
          getComponent: (type: string) => components.get(type)
        };
      });

      const prompt = builder.buildPrompt(entity, mockWorld);

      expect(prompt).toContain('1 tree');
      expect(prompt).toContain('1 rock');
      expect(prompt).toContain('1 food source');
    });
  });
});

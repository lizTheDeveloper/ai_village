import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World';
import { SemanticMemoryComponent } from '../SemanticMemoryComponent';

describe('SemanticMemoryComponent', () => {
  let world: World;
  let entity: any;

  beforeEach(() => {
    world = new World();
    entity = world.createEntity();
  });

  // Criterion 11: Semantic Memory Formation
  describe('semantic memory formation', () => {
    it('should create semantic memory with fact/belief', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'farming',
        content: 'Wheat grows best in spring',
        confidence: 0.8,
        sourceMemories: ['memory-123']
      });

      expect(memory.beliefs.length).toBe(1);
      const belief = memory.beliefs[0];
      expect(belief.content).toBe('Wheat grows best in spring');
      expect(belief.confidence).toBe(0.8);
    });

    it('should link to source episodic memories', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'social',
        content: 'Alice is trustworthy',
        confidence: 0.7,
        sourceMemories: ['episodic-1', 'episodic-2', 'episodic-3']
      });

      const belief = memory.beliefs[0];
      expect(belief.sourceMemories).toHaveLength(3);
      expect(belief.sourceMemories).toContain('episodic-1');
    });

    it('should track confidence score', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'nature',
        content: 'Rain comes from the north',
        confidence: 0.6,
        sourceMemories: ['obs-1', 'obs-2']
      });

      const belief = memory.beliefs[0];
      expect(belief.confidence).toBeGreaterThanOrEqual(0);
      expect(belief.confidence).toBeLessThanOrEqual(1);
    });

    it('should track who shares the belief', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'social',
        content: 'Bob is a good farmer',
        confidence: 0.8,
        sourceMemories: ['conv-1'],
        sharedBy: ['Alice', 'Charlie']
      });

      const belief = memory.beliefs[0];
      expect(belief.sharedBy).toContain('Alice');
      expect(belief.sharedBy).toContain('Charlie');
    });

    it('should track who contests the belief', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'politics',
        content: 'We should expand the village',
        confidence: 0.5,
        sourceMemories: ['meeting-1'],
        contestedBy: ['David']
      });

      const belief = memory.beliefs[0];
      expect(belief.contestedBy).toContain('David');
    });

    it('should allow updating beliefs with new evidence', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'farming',
        content: 'Carrots need daily watering',
        confidence: 0.5,
        sourceMemories: ['attempt-1']
      });

      // New evidence arrives
      memory.updateBelief(
        'Carrots need daily watering',
        {
          confidence: 0.8,
          newSourceMemories: ['attempt-2', 'attempt-3']
        }
      );

      const belief = memory.beliefs[0];
      expect(belief.confidence).toBe(0.8);
      expect(belief.sourceMemories).toHaveLength(3);
    });

    it('should categorize beliefs (farming, social, nature, politics, etc)', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'farming',
        content: 'Wheat is profitable',
        confidence: 0.9,
        sourceMemories: ['harvest-1']
      });

      memory.formBelief({
        category: 'social',
        content: 'Alice is friendly',
        confidence: 0.8,
        sourceMemories: ['conv-1']
      });

      const farmingBeliefs = memory.getBeliefsbyCategory('farming');
      expect(farmingBeliefs).toHaveLength(1);
      expect(farmingBeliefs[0].content).toBe('Wheat is profitable');
    });
  });

  describe('belief validation', () => {
    it('should track validation attempts', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'nature',
        content: 'It rains every 5 days',
        confidence: 0.4,
        sourceMemories: ['obs-1'],
        validationAttempts: 0
      });

      memory.validateBelief('It rains every 5 days', true);

      const belief = memory.beliefs[0];
      expect(belief.validationAttempts).toBe(1);
    });

    it('should increase confidence when validated', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'farming',
        content: 'Fertilizer helps crops',
        confidence: 0.6,
        sourceMemories: ['test-1']
      });

      const initialConfidence = memory.beliefs[0].confidence;
      memory.validateBelief('Fertilizer helps crops', true);

      expect(memory.beliefs[0].confidence).toBeGreaterThan(initialConfidence);
    });

    it('should decrease confidence when invalidated', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'nature',
        content: 'Snow never falls in summer',
        confidence: 0.9,
        sourceMemories: ['obs-1']
      });

      const initialConfidence = memory.beliefs[0].confidence;
      memory.validateBelief('Snow never falls in summer', false);

      expect(memory.beliefs[0].confidence).toBeLessThan(initialConfidence);
    });
  });

  describe('knowledge types', () => {
    it('should store factual knowledge (how-to, mechanics)', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formKnowledge({
        type: 'procedural',
        content: 'To plant seeds: 1) Till soil 2) Place seed 3) Water',
        confidence: 1.0,
        sourceMemories: ['tutorial-1']
      });

      const knowledge = memory.knowledge[0];
      expect(knowledge.type).toBe('procedural');
      expect(knowledge.content).toContain('Till soil');
    });

    it('should store opinions (subjective beliefs)', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'opinion',
        content: 'Apples are the best fruit',
        confidence: 0.9,
        sourceMemories: ['taste-test-1'],
        isOpinion: true
      });

      const belief = memory.beliefs[0];
      expect(belief.isOpinion).toBe(true);
    });

    it('should store generalizations from experiences', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      memory.formBelief({
        category: 'social',
        content: 'People are friendlier in the morning',
        confidence: 0.7,
        sourceMemories: ['conv-1', 'conv-2', 'conv-3'],
        generalizationFrom: 3
      });

      const belief = memory.beliefs[0];
      expect(belief.generalizationFrom).toBe(3);
    });
  });

  // Error handling - per CLAUDE.md
  describe('error handling', () => {
    it('should throw when required category is missing', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      expect(() => {
        memory.formBelief({
          content: 'Some belief',
          confidence: 0.8,
          sourceMemories: []
        } as any);
      }).toThrow();
    });

    it('should throw when required content is missing', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      expect(() => {
        memory.formBelief({
          category: 'farming',
          confidence: 0.8,
          sourceMemories: []
        } as any);
      }).toThrow();
    });

    it('should throw when required sourceMemories is missing', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      expect(() => {
        memory.formBelief({
          category: 'farming',
          content: 'Test belief',
          confidence: 0.8
        } as any);
      }).toThrow();
    });

    it('should throw when confidence is out of range', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      expect(() => {
        memory.formBelief({
          category: 'test',
          content: 'Test',
          confidence: 1.5,
          sourceMemories: []
        });
      }).toThrow();
    });

    it('should NOT use fallback for missing confidence', () => {
      const memory = entity.addComponent(SemanticMemoryComponent, {});

      expect(() => {
        memory.formBelief({
          category: 'test',
          content: 'Test',
          sourceMemories: []
        } as any);
      }).toThrow();
    });
  });
});

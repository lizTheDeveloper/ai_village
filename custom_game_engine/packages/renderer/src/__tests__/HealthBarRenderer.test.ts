import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, type World } from '@ai-village/core/ecs/World';
import type { Entity } from '@ai-village/core/ecs/Entity';
import { NeedsComponent } from '@ai-village/core/components/NeedsComponent';
import { HealthBarRenderer } from '../HealthBarRenderer.js';

// Mock canvas context for drawing operations
const createMockContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
});

// Helper to create a needs component with health value
const createNeedsWithHealth = (health: number) => {
  const needs = new NeedsComponent();
  needs.health = health;
  return needs;
};

// Helper to create position component
const createPosition = (x: number, y: number) => ({
  type: 'position' as const,
  version: 1,
  x,
  y,
});

// Helper to create combat_stats component
const createCombatStats = (health: number, maxHealth: number = 100, combatSkill: number = 5) => ({
  type: 'combat_stats' as const,
  version: 1,
  health,
  maxHealth,
  combatSkill,
});

describe('HealthBarRenderer', () => {
  let world: World;
  let canvas: HTMLCanvasElement;
  let renderer: HealthBarRenderer;

  beforeEach(() => {
    world = new WorldImpl();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Mock the canvas context
    const mockContext = createMockContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext as any);

    renderer = new HealthBarRenderer(world, canvas);
  });

  describe('REQ-COMBAT-002: Health Bar Display', () => {
    it('should render health bar for entity with health below 100%', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent();
      needs.health = 0.75;
      entity.addComponent(needs);
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        health: 75,
        maxHealth: 100,
        combatSkill: 5,
      });

      const shouldRender = renderer.shouldRenderHealthBar(entity);
      expect(shouldRender).toBe(true);
    });

    it('should render health bar for entity in combat', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(1.0));
      entity.addComponent(createCombatStats(100, 100, 5));
      entity.addComponent({
        type: 'conflict',
        version: 1,
        conflictId: 'combat-1',
        role: 'attacker',
        targetId: 'enemy-1',
      });

      const shouldRender = renderer.shouldRenderHealthBar(entity);
      expect(shouldRender).toBe(true);
    });

    it('should not render health bar for entity at full health and not in combat', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(1.0));
      entity.addComponent(createCombatStats(100, 100, 5));

      const shouldRender = renderer.shouldRenderHealthBar(entity);
      expect(shouldRender).toBe(false);
    });

    it('should display correct health percentage ratio', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.33));
      entity.addComponent(createCombatStats(33, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Health bar should be 33% filled
      // Implementation must verify bar width calculation
    });
  });

  describe('Criterion 2: Health Bar Display', () => {
    it('should display health bar above entity sprite', () => {
      const entity = world.createEntity();
      entity.addComponent(createPosition(200, 200));
      entity.addComponent(createNeedsWithHealth(0.5));
      entity.addComponent(createCombatStats(50, 100, 5));

      renderer.renderHealthBar(entity, 200, 200);

      // Bar should render above sprite (y - offset)
    });

    it('should render 32px wide by 4px tall health bar by default', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.75));
      entity.addComponent(createCombatStats(75, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Verify dimensions: 32x4 pixels
    });

    it('should use green color for health above 66%', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.8));
      entity.addComponent(createCombatStats(80, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Color should be green (#00FF00 or similar)
    });

    it('should use yellow color for health between 33% and 66%', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.5));
      entity.addComponent(createCombatStats(50, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Color should be yellow (#FFFF00 or similar)
    });

    it('should use red color for health below 33%', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.25));
      entity.addComponent(createCombatStats(25, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Color should be red (#FF0000 or similar)
    });
  });

  describe('Criterion 3: Injury Indicators', () => {
    it('should render injury icons when entity has InjuryComponent', () => {
      const entity = world.createEntity();
      entity.addComponent(createCombatStats(60, 100, 5));
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'laceration', severity: 'moderate', bodyPart: 'arm', bleedRate: 2 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Should render laceration icon
    });

    it('should display correct icon for laceration injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'laceration', severity: 'severe', bodyPart: 'leg', bleedRate: 5 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify laceration icon is rendered
    });

    it('should display correct icon for puncture injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'puncture', severity: 'moderate', bodyPart: 'torso', bleedRate: 3 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify puncture icon is rendered
    });

    it('should display correct icon for blunt injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'blunt', severity: 'minor', bodyPart: 'head', bleedRate: 0 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify blunt injury icon is rendered
    });

    it('should display correct icon for burn injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'burn', severity: 'severe', bodyPart: 'arm', bleedRate: 0 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify burn icon is rendered
    });

    it('should display correct icon for bite injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'bite', severity: 'severe', bodyPart: 'leg', bleedRate: 4 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify bite icon is rendered
    });

    it('should display correct icon for exhaustion injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'exhaustion', severity: 'moderate', bodyPart: 'body', bleedRate: 0 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify exhaustion icon is rendered
    });

    it('should display correct icon for psychological injury type', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'psychological', severity: 'minor', bodyPart: 'mind', bleedRate: 0 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Verify psychological injury icon is rendered
    });

    it('should render multiple injury icons for multiple injuries', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'laceration', severity: 'moderate', bodyPart: 'arm', bleedRate: 2 },
          { type: 'blunt', severity: 'minor', bodyPart: 'head', bleedRate: 0 },
          { type: 'burn', severity: 'severe', bodyPart: 'leg', bleedRate: 0 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderInjuryIndicators(entity, 100, 100);

      // Should render 3 injury icons
    });
  });

  describe('performance considerations', () => {
    it('should only render health bars for entities within camera view', () => {
      const entity1 = world.createEntity();
      entity1.addComponent('position', { x: 0, y: 0 });
      entity1.addComponent('needs', {
        health: 0.5,
        hunger: 0.8,
        thirst: 0.9,
      });
      entity1.addComponent('combat_stats', {
        health: 50,
        maxHealth: 100,
        combatSkill: 5,
      });

      const entity2 = world.createEntity();
      entity2.addComponent('position', { x: 10000, y: 10000 });
      entity2.addComponent('needs', {
        health: 0.5,
        hunger: 0.8,
        thirst: 0.9,
      });
      entity2.addComponent('combat_stats', {
        health: 50,
        maxHealth: 100,
        combatSkill: 5,
      });

      // Render with camera at 0,0
      renderer.render(0, 0, 800, 600);

      // Only entity1 should be rendered (entity2 is off-screen)
    });

    it('should handle 50+ entities with health bars without performance degradation', () => {
      const entities: Entity[] = [];
      for (let i = 0; i < 50; i++) {
        const entity = world.createEntity();
        entity.addComponent({ type: 'position', version: 1, x: i * 10, y: i * 10 });
        entity.addComponent(createNeedsWithHealth((50 + i) / 100));
        entity.addComponent({
          type: 'combat_stats',
          version: 1,
          health: 50 + i,
          maxHealth: 100,
          combatSkill: 5,
        });
        entities.push(entity);
      }

      const startTime = performance.now();
      renderer.render(0, 0, 800, 600);
      const endTime = performance.now();

      // Should render in less than 16ms (60fps target)
      expect(endTime - startTime).toBeLessThan(16);
    });
  });

  describe('error handling', () => {
    it('should throw when World is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new HealthBarRenderer(null, canvas);
      }).toThrow('HealthBarRenderer requires World parameter');
    });

    it('should throw when Canvas is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new HealthBarRenderer(world, null);
      }).toThrow('HealthBarRenderer requires Canvas parameter');
    });

    it('should throw when canvas context cannot be acquired', () => {
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => {
        new HealthBarRenderer(world, badCanvas);
      }).toThrow('Failed to get 2D context');
    });

    it('should throw when entity is missing needs component', () => {
      const entity = world.createEntity();
      entity.addComponent(createPosition(100, 100));
      entity.addComponent(createCombatStats(50, 100, 5));
      // No needs component

      expect(() => {
        renderer.renderHealthBar(entity, 100, 100);
      }).toThrow('Cannot render health bar: entity missing needs component');
    });

    it('should throw when entity is missing position component', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.5));
      entity.addComponent(createCombatStats(50, 100, 5));
      // No position component

      expect(() => {
        renderer.renderHealthBar(entity, 100, 100);
      }).toThrow('Cannot render health bar: entity missing position component');
    });
  });

  describe('visual specifications', () => {
    it('should render health bar with border outline for visibility', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.75));
      entity.addComponent(createCombatStats(75, 100, 5));
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);

      // Should draw border around health bar
    });

    it('should position injury icons overlaid on health bar', () => {
      const entity = world.createEntity();
      entity.addComponent(createNeedsWithHealth(0.6));
      entity.addComponent(createCombatStats(60, 100, 5));
      entity.addComponent({ type: 'injury', version: 1, 
        injuries: [
          { type: 'laceration', severity: 'moderate', bodyPart: 'arm', bleedRate: 2 },
        ],
      });
      entity.addComponent(createPosition(100, 100));

      renderer.renderHealthBar(entity, 100, 100);
      renderer.renderInjuryIndicators(entity, 100, 100);

      // Injury icons should be positioned on top of health bar
    });
  });
});

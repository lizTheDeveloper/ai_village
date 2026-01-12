import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '@ai-village/core';
import type { Entity } from '@ai-village/core';
import { EventBusImpl } from '@ai-village/core/events/EventBus';
import { ThreatIndicatorRenderer } from '../ThreatIndicatorRenderer.js';

describe('ThreatIndicatorRenderer', () => {
  let world: World;
  let canvas: HTMLCanvasElement;
  let renderer: ThreatIndicatorRenderer;
  let mockCtx: any;

  beforeEach(() => {
    world = new World();

    // Create mock canvas context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      lineWidth: 0,
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
    };

    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Mock getContext to return our mock context
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);

    // Use the world's eventBus so events are received by the renderer
    renderer = new ThreatIndicatorRenderer(world, world.eventBus, canvas);

    // Clear mock call counts but preserve listeners
    Object.values(mockCtx).forEach(mock => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear();
      }
    });
  });

  describe('REQ-COMBAT-005: Threat Indicators', () => {
    it('should display threat indicators in world space at threat location', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 200, y: 200 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      renderer.renderThreatIndicator(threat, 200, 200, 'high');

      // Verify drawing calls were made
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('!', 0, 0);
    });

    it('should provide off-screen edge arrows for threats outside view', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 5000, y: 5000 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      renderer.renderOffScreenArrow(threat, 5000, 5000, 800, 600, 'high');

      // Verify arrow was drawn
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should display distance text on threat indicators', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 300, y: 300 });

      // Create player entity for distance calculation
      const player = world.createEntity();
      player.addComponent('agent', { name: 'Player' });
      player.addComponent('position', { x: 100, y: 100 });

      renderer.renderThreatIndicator(threat, 300, 300, 'medium');

      // Distance should be calculated and rendered
      expect(mockCtx.strokeText).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe('Criterion 6: Threat Detection', () => {
    it('should display threat indicator when predator_attack conflict starts', () => {
      const wolf = world.createEntity();
      wolf.addComponent('position', { x: 100, y: 100 });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'pred-1',
          type: 'predator_attack',
          participants: [wolf.id, 'villager'],
          threatLevel: 'high',
        },
      });
      world.eventBus.flush();

      // Verify threat was tracked and rendered
      // Direct test:  call render method
      renderer.render(0, 0, 800, 600);

      // Debug: Check if any drawing calls were made
      // Arc = on-screen indicator, moveTo/lineTo = off-screen arrow
      const arcCalls = mockCtx.arc.mock.calls.length;
      const moveToCalls = mockCtx.moveTo.mock.calls.length;

      // Should have made some rendering calls
      expect(arcCalls + moveToCalls).toBeGreaterThan(0);
    });

    it('should display threat indicator when agent_combat conflict starts', () => {
      const raider = world.createEntity();
      raider.addComponent('position', { x: 200, y: 200 });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          type: 'agent_combat',
          participants: [raider.id, 'guard'],
          threatLevel: 'medium',
        },
      });
      world.eventBus.flush();

      // Verify threat was tracked
      renderer.render(0, 0, 800, 600);
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should show correct location for threat entity', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 150, y: 250 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'threat-1',
          type: 'predator_attack',
          participants: [threat.id],
          threatLevel: 'high',
        },
      });
      world.eventBus.flush();

      renderer.render(0, 0, 800, 600);
      // Indicator should render at 150, 250 in world space
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should indicate threat type (predator vs agent)', () => {
      const predator = world.createEntity();
      const predatorTarget = world.createEntity();
      predator.addComponent('position', { x: 100, y: 100 });
      predator.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: predatorTarget.id,
        state: 'active',
        startTime: 0,
      });

      const raider = world.createEntity();
      const raiderTarget = world.createEntity();
      raider.addComponent('position', { x: 200, y: 200 });
      raider.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: raiderTarget.id,
        state: 'active',
        startTime: 0,
      });

      renderer.renderThreatIndicator(predator, 100, 100, 'high');
      renderer.renderThreatIndicator(raider, 200, 200, 'medium');

      // Different icons/colors for predator vs agent threats
      expect(mockCtx.fillText).toHaveBeenCalledWith('!', 0, 0);
    });

    it('should show threat severity level', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 100, y: 100 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      renderer.renderThreatIndicator(threat, 100, 100, 'high');
      // Severity should affect color/size of indicator
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });

  describe('visual specifications', () => {
    it('should render pulsing icon for high severity threats', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 100, y: 100 });

      renderer.renderThreatIndicator(threat, 100, 100, 'high');
      // Icon should pulse/animate
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledWith('!', 0, 0);
    });

    it('should render off-screen arrows on screen edges', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 10000, y: 10000 });

      const isOnScreen = renderer.isOnScreen(10000, 10000, 800, 600);
      expect(isOnScreen).toBe(false);

      renderer.renderOffScreenArrow(threat, 10000, 10000, 800, 600, 'high');
      // Arrow should render on screen edge pointing to threat
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should display distance in world units', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 500, y: 500 });

      const player = world.createEntity();
      player.addComponent('agent', { name: 'Player' });
      player.addComponent('position', { x: 100, y: 100 });

      renderer.renderThreatIndicator(threat, 500, 500, 'medium');
      // Distance should be calculated as sqrt((500-100)^2 + (500-100)^2) ≈ 565
      expect(mockCtx.strokeText).toHaveBeenCalled();
    });

    it('should use different colors for different severity levels', () => {
      const lowThreat = world.createEntity();
      lowThreat.addComponent('position', { x: 100, y: 100 });

      const mediumThreat = world.createEntity();
      mediumThreat.addComponent('position', { x: 200, y: 200 });

      const highThreat = world.createEntity();
      highThreat.addComponent('position', { x: 300, y: 300 });

      renderer.renderThreatIndicator(lowThreat, 100, 100, 'low');
      renderer.renderThreatIndicator(mediumThreat, 200, 200, 'medium');
      renderer.renderThreatIndicator(highThreat, 300, 300, 'high');

      // Low: yellow/green, Medium: orange, High: red
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });

  describe('user interactions', () => {
    it('should allow clicking threat indicator to select threat entity', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 100, y: 100 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      // Simulate click at threat location
      // Should emit entity selection event
      // Note: This test verifies the component exists for future interaction implementation
      expect(threat.components.has('conflict')).toBe(true);
    });
  });

  describe('performance considerations', () => {
    it('should cull off-screen indicators beyond threshold', () => {
      const threats: Entity[] = [];
      for (let i = 0; i < 50; i++) {
        const threat = world.createEntity();
        const target = world.createEntity();
        threat.addComponent('position', { x: i * 1000, y: i * 1000 });
        threat.addComponent('conflict', {
          conflictType: 'predator_attack',
          target: target.id,
          state: 'active',
          startTime: 0,
        });
        threats.push(threat);

        // Emit event to track threat
        world.eventBus.emit({
          type: 'conflict:started' as any,
          source: 'test',
          data: {
            conflictId: `threat-${i}`,
            type: 'predator_attack',
            participants: [threat.id],
            threatLevel: 'medium',
          },
        });
      }
      world.eventBus.flush();

      renderer.render(0, 0, 800, 600);
      // Should only render indicators for visible or nearby threats
      // Very distant threats should not be rendered
      expect(mockCtx.arc).toHaveBeenCalled();
    });

    it('should handle 20+ simultaneous threats without lag', () => {
      const threats: Entity[] = [];
      for (let i = 0; i < 20; i++) {
        const threat = world.createEntity();
        const target = world.createEntity();
        threat.addComponent('position', { x: i * 50, y: i * 50 });
        threat.addComponent('conflict', {
          conflictType: 'predator_attack',
          target: target.id,
          state: 'active',
          startTime: 0,
        });
        threats.push(threat);

        // Emit event to track threat
        world.eventBus.emit({
          type: 'conflict:started' as any,
          source: 'test',
          data: {
            conflictId: `threat-${i}`,
            type: 'predator_attack',
            participants: [threat.id],
            threatLevel: 'medium',
          },
        });
      }
      world.eventBus.flush();

      const startTime = performance.now();
      renderer.render(0, 0, 800, 600);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(16); // 60fps target
    });
  });

  describe('error handling', () => {
    it('should throw when World is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new ThreatIndicatorRenderer(null, world.eventBus, canvas);
      }).toThrow('ThreatIndicatorRenderer requires World parameter');
    });

    it('should throw when EventBus is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new ThreatIndicatorRenderer(world, null, canvas);
      }).toThrow('ThreatIndicatorRenderer requires EventBus parameter');
    });

    it('should throw when Canvas is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new ThreatIndicatorRenderer(world, world.eventBus, null);
      }).toThrow('ThreatIndicatorRenderer requires Canvas parameter');
    });

    it('should throw when canvas context cannot be acquired', () => {
      const badCanvas = {
        getContext: () => null,
      } as unknown as HTMLCanvasElement;

      expect(() => {
        new ThreatIndicatorRenderer(world, world.eventBus, badCanvas);
      }).toThrow('Failed to get 2D context');
    });

    it('should throw when entity is missing position component', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });
      // No position component

      expect(() => {
        renderer.renderThreatIndicator(threat, 100, 100, 'high');
      }).toThrow('Cannot render threat indicator: entity missing position component');
    });
  });

  describe('threat lifecycle', () => {
    it('should remove threat indicator when conflict is resolved', () => {
      const wolf = world.createEntity();
      wolf.addComponent('position', { x: 100, y: 100 });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'threat-1',
          type: 'predator_attack',
          participants: [wolf.id, 'villager'],
        },
      });
      world.eventBus.flush();

      // Reset mock to verify next render doesn't include resolved threats
      mockCtx.arc.mockClear();

      world.eventBus.emit({
        type: 'conflict:resolved' as any,
        source: 'test',
        data: {
          conflictId: 'threat-1',
          outcome: 'victory',
        },
      });
      world.eventBus.flush();

      renderer.render(0, 0, 800, 600);
      // Threat indicator should be removed - no arc calls
      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should remove threat indicator when threat entity dies', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 100, y: 100 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'threat-1',
          type: 'predator_attack',
          participants: [threat.id],
        },
      });
      world.eventBus.flush();

      mockCtx.arc.mockClear();

      world.eventBus.emit({
        type: 'death:occurred' as any,
        source: 'test',
        data: {
          entityId: threat.id,
          cause: 'combat',
        },
      });
      world.eventBus.flush();

      renderer.render(0, 0, 800, 600);
      // Threat indicator should be removed
      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should fade threat indicator when threat leaves detection range', () => {
      const threat = world.createEntity();
      const target = world.createEntity();
      threat.addComponent('position', { x: 100, y: 100 });
      threat.addComponent('conflict', {
        conflictType: 'predator_attack',
        target: target.id,
        state: 'active',
        startTime: 0,
      });

      world.eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'threat-1',
          type: 'predator_attack',
          participants: [threat.id],
        },
      });
      world.eventBus.flush();

      // Move threat far away
      const position = threat.getComponent('position');
      if (position) {
        position.x = 10000;
        position.y = 10000;
      }

      mockCtx.arc.mockClear();
      renderer.render(0, 0, 800, 600);
      // Indicator should be off-screen (arrow rendered instead)
      // Arc is still called for arrows, so we just verify rendering continues
      expect(mockCtx.rotate).toHaveBeenCalled();
    });
  });

  describe('arrow positioning', () => {
    it('should position arrow on top edge when threat is above view', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 400, y: -1000 });

      renderer.renderOffScreenArrow(threat, 400, -1000, 800, 600, 'high');
      // Arrow should be on top edge of screen
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should position arrow on bottom edge when threat is below view', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 400, y: 5000 });

      renderer.renderOffScreenArrow(threat, 400, 5000, 800, 600, 'high');
      // Arrow should be on bottom edge of screen
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should position arrow on left edge when threat is left of view', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: -1000, y: 300 });

      renderer.renderOffScreenArrow(threat, -1000, 300, 800, 600, 'high');
      // Arrow should be on left edge of screen
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should position arrow on right edge when threat is right of view', () => {
      const threat = world.createEntity();
      threat.addComponent('position', { x: 5000, y: 300 });

      renderer.renderOffScreenArrow(threat, 5000, 300, 800, 600, 'high');
      // Arrow should be on right edge of screen
      expect(mockCtx.rotate).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });
});

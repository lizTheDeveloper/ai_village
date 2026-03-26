import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MagicSkillNode } from '@ai-village/core/src/magic/MagicSkillTree.js';
import type { NodeEvaluationResult } from '@ai-village/core/src/magic/MagicSkillTreeEvaluator.js';
import { SkillNodeRenderer } from '../SkillNodeRenderer.js';

/**
 * Tests for SkillNodeRenderer - Renders individual skill nodes
 *
 * Responsibilities:
 * - Draw node shape (rectangle, circle, etc.)
 * - Apply correct colors based on state (unlocked/available/locked/hidden)
 * - Render node icon and name
 * - Show XP cost badge
 * - Render level indicator (for multi-level nodes)
 * - Handle hover highlighting
 */
describe('SkillNodeRenderer', () => {
  let mockNode: MagicSkillNode;
  let mockEvaluation: NodeEvaluationResult;
  let renderer: SkillNodeRenderer;

  beforeEach(() => {
    mockNode = createMockNode();
    mockEvaluation = createMockEvaluation();
  });

  // =========================================================================
  // Node State Rendering
  // =========================================================================

  describe('Node State Rendering', () => {
    it('should render unlocked node with green background', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.currentLevel = 1; // Unlocked
      mockEvaluation.maxLevel = 1;

      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check fillStyle history for green (node background color)
      const hasGreen = (ctx as any)._fillStyleCalls.some((c: string) => /green|#0f0|#00ff00/i.test(c));
      expect(hasGreen).toBe(true);
    });

    it('should render available node with yellow glow', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.canPurchase = true;
      mockEvaluation.currentLevel = 0;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for yellow stroke (glow effect) - property assignment, not function call
      expect(ctx.strokeStyle).toMatch(/yellow|#ff0|#ffff00/i);
      expect(ctx.lineWidth).toBeGreaterThanOrEqual(3); // Thick stroke for glow
    });

    it('should render locked node with gray background', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.canUnlock = false;
      mockEvaluation.currentLevel = 0;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check fillStyle history for gray (node background color)
      const hasGray = (ctx as any)._fillStyleCalls.some((c: string) => /gray|#888|#999/i.test(c));
      expect(hasGray).toBe(true);
    });

    it('should render hidden node as "???" placeholder', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.visible = false;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for "???" text
      expect(ctx.fillText).toHaveBeenCalledWith('???', expect.any(Number), expect.any(Number));
    });

    it('should add pulsing animation to available nodes', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.canPurchase = true;


      renderer = new SkillNodeRenderer();

      // Render at two different timestamps
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60, 0);
      const alphaCalls1 = [...(ctx as any)._globalAlphaCalls];

      (ctx as any)._globalAlphaCalls = [];
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60, 500);
      const alphaCalls2 = [...(ctx as any)._globalAlphaCalls];

      // Alpha should have been set to a pulse value (not just 1.0) during render
      const hasPulse1 = alphaCalls1.some((a: number) => a !== 1.0);
      const hasPulse2 = alphaCalls2.some((a: number) => a !== 1.0);
      expect(hasPulse1).toBe(true);
      expect(hasPulse2).toBe(true);

      // Pulse values should differ between timestamps
      const pulseVal1 = alphaCalls1.find((a: number) => a !== 1.0);
      const pulseVal2 = alphaCalls2.find((a: number) => a !== 1.0);
      expect(pulseVal1).not.toBe(pulseVal2);
    });
  });

  // =========================================================================
  // Node Content
  // =========================================================================

  describe('Node Content', () => {
    it('should render node name', () => {
      const ctx = createMockCanvasContext();

      // Use a short name that won't be truncated (< maxWidth = width - 10 = 80 - 10 = 70px)
      // 8 chars * 8px/char = 64px < 70px → no truncation
      mockNode.name = 'Fire';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('Fire'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render node icon if provided', () => {
      const ctx = createMockCanvasContext();

      mockNode.icon = '🌟';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      expect(ctx.fillText).toHaveBeenCalledWith('🌟', expect.any(Number), expect.any(Number));
    });

    it('should render XP cost badge', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.xpCost = 150;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for "150" text (XP cost)
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('150'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should not show XP cost for unlocked nodes', () => {
      const ctx = createMockCanvasContext();

      mockEvaluation.currentLevel = 1;
      mockEvaluation.maxLevel = 1;
      mockEvaluation.xpCost = 100;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // XP cost should not be rendered for already unlocked nodes
      const xpCostCalls = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0].includes('100')
      );
      expect(xpCostCalls.length).toBe(0);
    });

    it('should render level indicator for multi-level nodes', () => {
      const ctx = createMockCanvasContext();

      mockNode.maxLevel = 5;
      mockEvaluation.currentLevel = 3;
      mockEvaluation.maxLevel = 5;


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for level indicator (e.g., "3/5")
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringMatching(/3.*5/),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should truncate long node names', () => {
      const ctx = createMockCanvasContext();

      mockNode.name = 'This Is A Very Long Node Name That Should Be Truncated';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Name should be truncated with "..."
      const textCalls = ctx.fillText.mock.calls;
      const nameCall = textCalls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('...')
      );
      expect(nameCall).toBeDefined();
    });
  });

  // =========================================================================
  // Hover State
  // =========================================================================

  describe('Hover State', () => {
    it('should highlight node border when hovered', () => {
      const ctx = createMockCanvasContext();


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60, 0, true); // isHovered=true

      // Check that strokeStyle was set during render (hover highlight)
      expect((ctx as any)._strokeStyleCalls.length).toBeGreaterThan(0);
      expect(ctx.lineWidth).toBeGreaterThanOrEqual(2);
    });

    it('should show tooltip anchor when hovered', () => {
      const ctx = createMockCanvasContext();


      renderer = new SkillNodeRenderer();
      const result = renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60, 0, true);

      // Should return tooltip anchor position
      expect(result.tooltipAnchor).toBeDefined();
      expect(result.tooltipAnchor.x).toBeGreaterThan(0);
      expect(result.tooltipAnchor.y).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Category-Specific Rendering
  // =========================================================================

  describe('Category-Specific Rendering', () => {
    it('should render foundation nodes with square shape', () => {
      const ctx = createMockCanvasContext();

      mockNode.category = 'foundation';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for rectangle (square) rendering
      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('should render mastery nodes with hexagon shape', () => {
      const ctx = createMockCanvasContext();

      mockNode.category = 'mastery';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Check for polygon rendering (hexagon)
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should render forbidden nodes with diamond shape', () => {
      const ctx = createMockCanvasContext();

      mockNode.category = 'forbidden';


      renderer = new SkillNodeRenderer();
      renderer.render(ctx, mockNode, mockEvaluation, 100, 100, 80, 60);

      // Forbidden nodes use diamond shape (beginPath + lineTo + fill)
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when node is null', () => {
      const ctx = createMockCanvasContext();


      renderer = new SkillNodeRenderer();

      expect(() => {
        renderer.render(ctx, null, mockEvaluation, 100, 100, 80, 60);
      }).toThrow('Node is required');
    });

    it('should throw when evaluation is null', () => {
      const ctx = createMockCanvasContext();


      renderer = new SkillNodeRenderer();

      expect(() => {
        renderer.render(ctx, mockNode, null, 100, 100, 80, 60);
      }).toThrow('Evaluation is required');
    });

    it('should throw when canvas context is null', () => {

      renderer = new SkillNodeRenderer();

      expect(() => {
        renderer.render(null, mockNode, mockEvaluation, 100, 100, 80, 60);
      }).toThrow('Canvas context is required');
    });
  });
});

// =============================================================================
// Mock Factories
// =============================================================================

function createMockNode(overrides: Partial<MagicSkillNode> = {}): MagicSkillNode {
  return {
    id: 'test_node',
    paradigmId: 'shinto',
    name: 'Test Node',
    description: 'Test description',
    category: 'foundation',
    tier: 0,
    xpCost: 100,
    maxLevel: 1,
    unlockConditions: [],
    conditionMode: 'all',
    effects: [],
    prerequisites: [],
    hidden: false,
    ...overrides
  };
}

function createMockEvaluation(overrides: Partial<NodeEvaluationResult> = {}): NodeEvaluationResult {
  return {
    canUnlock: true,
    canPurchase: false,
    currentLevel: 0,
    maxLevel: 1,
    conditions: [],
    metConditions: [],
    unmetConditions: [],
    xpCost: 100,
    availableXp: 50,
    visible: true,
    summary: 'Need 50 more XP',
    ...overrides
  };
}

function createMockCanvasContext(): CanvasRenderingContext2D {
  const fillStyleCalls: string[] = [];
  const strokeStyleCalls: string[] = [];
  const globalAlphaCalls: number[] = [];

  const mock: any = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    font: '12px sans-serif',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'top' as CanvasTextBaseline,
    lineWidth: 1,
    _fillStyle: '#000000',
    _strokeStyle: '#000000',
    _globalAlpha: 1.0,
    _fillStyleCalls: fillStyleCalls,
    _strokeStyleCalls: strokeStyleCalls,
    _globalAlphaCalls: globalAlphaCalls,
  };

  // Make fillStyle/strokeStyle/globalAlpha act like properties with call tracking
  Object.defineProperty(mock, 'fillStyle', {
    get() { return this._fillStyle; },
    set(value: string) {
      this._fillStyle = value;
      this._fillStyleCalls.push(value);
    }
  });

  Object.defineProperty(mock, 'strokeStyle', {
    get() { return this._strokeStyle; },
    set(value: string) {
      this._strokeStyle = value;
      this._strokeStyleCalls.push(value);
    }
  });

  Object.defineProperty(mock, 'globalAlpha', {
    get() { return this._globalAlpha; },
    set(value: number) {
      this._globalAlpha = value;
      this._globalAlphaCalls.push(value);
    }
  });

  return mock as CanvasRenderingContext2D;
}

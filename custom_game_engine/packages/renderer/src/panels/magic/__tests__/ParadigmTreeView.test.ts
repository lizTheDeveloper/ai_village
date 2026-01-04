import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MagicSkillTree, MagicSkillNode } from '@ai-village/core/src/magic/MagicSkillTree.js';
import type { EvaluationContext, NodeEvaluationResult } from '@ai-village/core/src/magic/MagicSkillTreeEvaluator.js';
import { ParadigmTreeView } from '../ParadigmTreeView.js';

/**
 * Tests for ParadigmTreeView - Renders a single paradigm's skill tree
 *
 * This component is responsible for:
 * - Laying out nodes by category (foundation, technique, mastery, etc.)
 * - Drawing dependency lines between nodes
 * - Rendering nodes with correct visual states
 * - Handling click/hover interactions on nodes
 * - Managing scroll/zoom state for the tree
 */
describe('ParadigmTreeView', () => {
  let mockTree: MagicSkillTree;
  let mockEvaluationContext: EvaluationContext;
  let view: ParadigmTreeView;

  beforeEach(() => {
    mockTree = createMockSkillTree();
    mockEvaluationContext = createMockEvaluationContext();
  });

  // =========================================================================
  // Tree Layout
  // =========================================================================

  describe('Tree Layout', () => {
    it('should position foundation nodes at top', () => {
      view = new ParadigmTreeView(mockTree);

      const foundationNodes = mockTree.nodes.filter(n => n.category === 'foundation');
      const layout = view.calculateLayout();

      for (const node of foundationNodes) {
        const position = layout.get(node.id);
        expect(position.y).toBeLessThan(100); // Top of tree
      }
    });

    it('should position mastery nodes at bottom', () => {
      view = new ParadigmTreeView(mockTree);

      const masteryNodes = mockTree.nodes.filter(n => n.category === 'mastery');
      const layout = view.calculateLayout();

      for (const node of masteryNodes) {
        const position = layout.get(node.id);
        expect(position.y).toBeGreaterThan(400); // Bottom of tree
      }
    });

    it('should spread nodes horizontally within category', () => {
      view = new ParadigmTreeView(mockTree);

      const techniqueNodes = mockTree.nodes.filter(n => n.category === 'technique');
      const layout = view.calculateLayout();

      const xPositions = techniqueNodes.map(n => layout.get(n.id).x);
      const uniqueX = new Set(xPositions);

      // Nodes should have different X positions (spread out)
      expect(uniqueX.size).toBe(techniqueNodes.length);
    });

    it('should avoid node overlap', () => {
      view = new ParadigmTreeView(mockTree);

      const layout = view.calculateLayout();
      const positions = Array.from(layout.values());

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const pos1 = positions[i];
          const pos2 = positions[j];

          const distance = Math.sqrt(
            Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2)
          );

          // Nodes should be at least 80 pixels apart
          expect(distance).toBeGreaterThanOrEqual(80);
        }
      }
    });

    it('should recalculate layout when tree changes', () => {
      view = new ParadigmTreeView(mockTree);

      const layout1 = view.calculateLayout();

      // Add new node to tree
      mockTree.nodes.push(createMockNode({
        id: 'new_node',
        category: 'foundation'
      }));

      view.setTree(mockTree);
      const layout2 = view.calculateLayout();

      // Layout should be recalculated
      expect(layout2.size).toBe(layout1.size + 1);
    });
  });

  // =========================================================================
  // Dependency Lines
  // =========================================================================

  describe('Dependency Lines', () => {
    it('should draw line from prerequisite to dependent node', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Verify line drawn
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should use arrow style for dependency lines', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check that arrowhead is drawn at end of line
      const lineToCall = ctx.lineTo.mock.calls[0];
      const fillPolygonCall = ctx.fill.mock.calls.find((_, idx) =>
        ctx.beginPath.mock.calls[idx]
      );

      expect(fillPolygonCall).toBeDefined();
    });

    it('should highlight dependency line when node hovered', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);
      view.setHoveredNode('technique_node_1');
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check that line is drawn with highlight color
      const highlightedStroke = ctx._strokeStyleCalls.find((call: any) =>
        call.includes('yellow') || call.includes('#ff0')
      );
      expect(highlightedStroke).toBeDefined();
    });

    it('should draw dotted line for optional prerequisites', () => {
      const ctx = createMockCanvasContext();

      const treeWithOptional = createMockSkillTree({
        nodes: [
          createMockNode({ id: 'node_1', prerequisites: [] }),
          createMockNode({
            id: 'node_2',
            prerequisites: ['node_1'],
            unlockConditions: [
              {
                type: 'node_unlocked',
                params: { nodeId: 'node_1' },
                description: 'Optional',
                soft: true // Soft requirement
              }
            ]
          })
        ]
      });

      view = new ParadigmTreeView(treeWithOptional);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check for dotted line
      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    });
  });

  // =========================================================================
  // Node Rendering
  // =========================================================================

  describe('Node Rendering', () => {
    it('should render unlocked nodes with green background', () => {
      const ctx = createMockCanvasContext();

      const evaluationResults = new Map<string, NodeEvaluationResult>();
      evaluationResults.set('foundation_node_1', {
        canUnlock: false,
        canPurchase: false,
        currentLevel: 1, // Already unlocked
        maxLevel: 1,
        conditions: [],
        metConditions: [],
        unmetConditions: [],
        xpCost: 0,
        availableXp: 100,
        visible: true,
        summary: 'Unlocked'
      });

      view = new ParadigmTreeView(mockTree);
      view.setEvaluationResults(evaluationResults);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check for green fill
      const greenFill = ctx._fillStyleCalls.find((call: any) =>
        call.includes('green') || call.includes('#0f0')
      );
      expect(greenFill).toBeDefined();
    });

    it('should render available nodes with yellow glow', () => {
      const ctx = createMockCanvasContext();

      const evaluationResults = new Map<string, NodeEvaluationResult>();
      evaluationResults.set('technique_node_1', {
        canUnlock: true,
        canPurchase: true,
        currentLevel: 0,
        maxLevel: 1,
        conditions: [],
        metConditions: [],
        unmetConditions: [],
        xpCost: 100,
        availableXp: 500,
        visible: true,
        summary: 'Ready to purchase'
      });

      view = new ParadigmTreeView(mockTree);
      view.setEvaluationResults(evaluationResults);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check for yellow glow effect
      const yellowGlow = ctx._strokeStyleCalls.find((call: any) =>
        call.includes('yellow') || call.includes('#ff0')
      );
      expect(yellowGlow).toBeDefined();
    });

    it('should render locked nodes with gray background', () => {
      const ctx = createMockCanvasContext();

      const evaluationResults = new Map<string, NodeEvaluationResult>();
      evaluationResults.set('mastery_node_1', {
        canUnlock: false,
        canPurchase: false,
        currentLevel: 0,
        maxLevel: 1,
        conditions: [],
        metConditions: [],
        unmetConditions: [
          {
            met: false,
            condition: { type: 'xp_accumulated', params: { xpRequired: 1000 }, description: 'Need 1000 XP' },
            message: 'Need 1000 XP'
          }
        ],
        xpCost: 200,
        availableXp: 50,
        visible: true,
        summary: '1 condition not met'
      });

      view = new ParadigmTreeView(mockTree);
      view.setEvaluationResults(evaluationResults);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check for gray fill
      const grayFill = ctx._fillStyleCalls.find((call: any) =>
        call.includes('gray') || call.includes('#888')
      );
      expect(grayFill).toBeDefined();
    });

    it('should render hidden nodes as "???"', () => {
      const ctx = createMockCanvasContext();

      const evaluationResults = new Map<string, NodeEvaluationResult>();
      evaluationResults.set('hidden_node_1', {
        canUnlock: false,
        canPurchase: false,
        currentLevel: 0,
        maxLevel: 1,
        conditions: [],
        metConditions: [],
        unmetConditions: [],
        xpCost: 100,
        availableXp: 100,
        visible: false, // Hidden
        summary: 'Hidden'
      });

      view = new ParadigmTreeView(mockTree);
      view.setEvaluationResults(evaluationResults);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Check for "???" text
      const hiddenText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0] === '???'
      );
      expect(hiddenText).toBeDefined();
    });
  });

  // =========================================================================
  // Scroll and Zoom
  // =========================================================================

  describe('Scroll and Zoom', () => {
    it('should offset node positions when scrolled', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);
      view.setScroll(100, 200);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);

      // Verify nodes rendered with scroll offset
      const firstNodeX = ctx.fillRect.mock.calls[0][0];
      const firstNodeY = ctx.fillRect.mock.calls[0][1];

      expect(firstNodeX).toBeGreaterThan(100); // Offset by scrollX
      expect(firstNodeY).toBeGreaterThan(200); // Offset by scrollY
    });

    it('should scale node sizes when zoomed', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);

      // Render at 1.0 zoom
      view.setZoom(1.0);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);
      const normalSize = ctx.fillRect.mock.calls[0][2]; // width

      // Render at 2.0 zoom
      
      view.setZoom(2.0);
      view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);
      const zoomedSize = ctx.fillRect.mock.calls[0][2]; // width

      expect(zoomedSize).toBe(normalSize * 2);
    });

    it('should handle mouse wheel zoom', () => {
      view = new ParadigmTreeView(mockTree);

      view.setZoom(1.0);
      view.handleMouseWheel(1); // Zoom in

      expect(view.getZoom()).toBeGreaterThan(1.0);

      view.handleMouseWheel(-1); // Zoom out
      expect(view.getZoom()).toBe(1.0);
    });

    it('should clamp zoom to min/max values', () => {
      view = new ParadigmTreeView(mockTree);

      // Zoom out too far
      view.setZoom(0.1);
      expect(view.getZoom()).toBeGreaterThanOrEqual(0.5); // Min zoom

      // Zoom in too far
      view.setZoom(10.0);
      expect(view.getZoom()).toBeLessThanOrEqual(3.0); // Max zoom
    });
  });

  // =========================================================================
  // Interaction Handling
  // =========================================================================

  describe('Interaction Handling', () => {
    it('should detect click on node', () => {
      view = new ParadigmTreeView(mockTree);

      const layout = view.calculateLayout();
      const firstNodePos = Array.from(layout.values())[0];

      const clickedNodeId = view.handleClick(firstNodePos.x + 10, firstNodePos.y + 10);

      expect(clickedNodeId).toBeDefined();
    });

    it('should return null when click outside nodes', () => {
      view = new ParadigmTreeView(mockTree);

      const clickedNodeId = view.handleClick(-1000, -1000);

      expect(clickedNodeId).toBeNull();
    });

    it('should detect hover on node', () => {
      view = new ParadigmTreeView(mockTree);

      const layout = view.calculateLayout();
      const firstNodePos = Array.from(layout.values())[0];

      view.handleMouseMove(firstNodePos.x + 10, firstNodePos.y + 10);

      expect(view.getHoveredNode()).toBeDefined();
    });

    it('should clear hover when mouse leaves node', () => {
      view = new ParadigmTreeView(mockTree);

      const layout = view.calculateLayout();
      const firstNodePos = Array.from(layout.values())[0];

      view.handleMouseMove(firstNodePos.x + 10, firstNodePos.y + 10);
      expect(view.getHoveredNode()).toBeDefined();

      view.handleMouseMove(-1000, -1000);
      expect(view.getHoveredNode()).toBeNull();
    });
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when tree is null', () => {
      expect(() => {
        new ParadigmTreeView(null);
      }).toThrow('Tree is required');
    });

    it('should throw when rendering without evaluation results', () => {
      const ctx = createMockCanvasContext();

      view = new ParadigmTreeView(mockTree);

      expect(() => {
        view.render(ctx, 0, 0, 800, 600, mockEvaluationContext);
      }).toThrow('Evaluation results not set');
    });

    it('should throw when node layout fails', () => {
      const badTree = createMockSkillTree({
        nodes: [
          createMockNode({ id: 'node_1', category: 'foundation' }),
          createMockNode({ id: 'node_1', category: 'mastery' }) // Duplicate ID
        ]
      });

      expect(() => {
        new ParadigmTreeView(badTree);
      }).toThrow('Duplicate node ID');
    });
  });
});

// =============================================================================
// Mock Factories
// =============================================================================

function createMockSkillTree(overrides: Partial<MagicSkillTree> = {}): MagicSkillTree {
  return {
    id: 'test_tree',
    paradigmId: 'shinto',
    name: 'Shinto Magic',
    description: 'Test skill tree',
    version: 1,
    nodes: [
      createMockNode({ id: 'foundation_node_1', category: 'foundation', tier: 0 }),
      createMockNode({ id: 'technique_node_1', category: 'technique', tier: 1, prerequisites: ['foundation_node_1'] }),
      createMockNode({ id: 'mastery_node_1', category: 'mastery', tier: 2, prerequisites: ['technique_node_1'] }),
    ],
    entryNodes: ['foundation_node_1'],
    connections: [],
    rules: {
      requiresInnateAbility: false,
      allowsRefund: false,
      xpGainMultiplier: 1.0
    },
    xpSources: [],
    ...overrides
  };
}

function createMockNode(overrides: Partial<MagicSkillNode> = {}): MagicSkillNode {
  return {
    id: 'test_node',
    paradigmId: 'shinto',
    name: 'Test Node',
    description: 'Test node description',
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

function createMockEvaluationContext(): EvaluationContext {
  return {
    world: {} as any,
    agentId: 'test_agent',
    progress: {
      paradigmId: 'shinto',
      totalXpEarned: 500,
      availableXp: 450,
      unlockedNodes: {},
      discoveries: {},
      relationships: {},
      milestones: {}
    }
  };
}

function createMockCanvasContext(): CanvasRenderingContext2D {
  const fillStyleCalls: string[] = [];
  const strokeStyleCalls: string[] = [];

  const mock: any = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    _fillStyle: '#000000',
    _strokeStyle: '#000000',
    _fillStyleCalls: fillStyleCalls,
    _strokeStyleCalls: strokeStyleCalls,
  };

  // Make fillStyle/strokeStyle act like properties with call tracking
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

  return mock as CanvasRenderingContext2D;
}

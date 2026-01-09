import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { World } from '@ai-village/core/src/ecs/World.js';
import type { Entity } from '@ai-village/core/src/ecs/Entity.js';
import type { MagicSkillTree } from '@ai-village/core/src/magic/MagicSkillTree.js';
import type { WindowManager } from '../../../WindowManager.js';
import { SkillTreePanel } from '../SkillTreePanel.js';
import { MagicSkillTreeRegistry } from '@ai-village/magic';

/**
 * Tests for SkillTreePanel - Main Magic Skill Tree UI Panel
 *
 * These tests verify the TDD red phase - all tests should FAIL initially.
 *
 * Acceptance Criteria tested:
 * 1. Tree Visualization - Display paradigm skill trees in tabbed interface
 * 2. Node States - Show correct unlock/available/locked/hidden states
 * 3. Unlock Conditions Display - Show conditions with met/unmet status
 * 4. Node Unlocking - Handle player unlocking nodes with XP deduction
 * 5. Multi-Paradigm Support - Multiple tabs with independent XP pools
 * 6. Discovery Mechanics - Hidden nodes reveal when prerequisites met
 * 7. Keyboard Navigation - Arrow keys, Enter, Tab, Escape
 */
describe('SkillTreePanel', () => {
  let mockWorld: World;
  let mockEntity: Entity;
  let mockWindowManager: WindowManager;
  let panel: SkillTreePanel;

  // Register mock skill trees before all tests
  beforeAll(() => {
    setupMockSkillTrees();
  });

  beforeEach(() => {
    // Reset state between tests
    mockWorld = createMockWorld();
    mockEntity = createMockMagicEntity();
    mockWindowManager = createMockWindowManager();
  });

  // =========================================================================
  // Criterion 1: Tree Visualization
  // =========================================================================

  describe('Criterion 1: Tree Visualization', () => {
    it('should implement IWindowPanel interface', () => {
      const panel = new SkillTreePanel(mockWindowManager);

      expect(panel.getId()).toBe('skill-tree');
      expect(panel.getTitle()).toBe('Magic Skill Tree');
      expect(panel.getDefaultWidth()).toBeGreaterThanOrEqual(600);
      expect(panel.getDefaultHeight()).toBeGreaterThanOrEqual(400);
      expect(typeof panel.isVisible).toBe('function');
      expect(typeof panel.setVisible).toBe('function');
      expect(typeof panel.render).toBe('function');
    });

    it('should open with keyboard shortcut "T"', () => {
      const panel = new SkillTreePanel(mockWindowManager);

      // Verify keyboard shortcut registered
      const config = mockWindowManager.getWindowConfig('skill-tree');
      expect(config?.keyboardShortcut).toBe('KeyT');
    });

    it('should render tabs for each paradigm agent knows', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy', 'sympathy']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify tabs rendered (check canvas draw calls)
      const tabDrawCalls = ctx.fillText.mock.calls.filter((call: any[]) =>
        ['Shinto', 'Allomancy', 'Sympathy'].includes(call[0])
      );
      expect(tabDrawCalls).toHaveLength(3);
    });

    it('should render nodes positioned by category', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify nodes positioned by category
      // Foundation nodes should be at top (Y near 0)
      // Mastery nodes should be at bottom (Y > 400)
      const drawCallsY = ctx.fillRect.mock.calls.map((call: any[]) => call[2]);
      const foundationY = Math.min(...drawCallsY);
      const masteryY = Math.max(...drawCallsY);

      expect(masteryY).toBeGreaterThan(foundationY);
    });

    it('should draw dependency lines between nodes', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify lines drawn between prerequisite nodes
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it('should display XP available for current paradigm', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 450 }
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify XP displayed
      const xpText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('450')
      );
      expect(xpText).toBeDefined();
    });
  });

  // =========================================================================
  // Criterion 2: Node States
  // =========================================================================

  describe('Criterion 2: Node States', () => {
    it('should display unlocked nodes with green background', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for green fill style for unlocked node
      const greenFills = ctx._fillStyleCalls?.filter((call: any) =>
        call.includes('#0f0') || call.includes('green')
      );
      expect(greenFills.length).toBeGreaterThan(0);
    });

    it('should display available nodes with yellow glow', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for yellow stroke/glow for available node
      const yellowStrokes = ctx._strokeStyleCalls?.filter((call: any) =>
        call.includes('yellow') || call.includes('#ff0')
      );
      expect(yellowStrokes.length).toBeGreaterThan(0);
    });

    it('should display locked nodes with gray background', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 10 }, // Not enough XP
        unlockedNodes: []
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for gray fill style for locked nodes
      const grayFills = ctx._fillStyleCalls?.filter((call: any) =>
        call.includes('gray') || call.includes('#888')
      );
      expect(grayFills.length).toBeGreaterThan(0);
    });

    it('should display hidden nodes as "???"', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: [] // No prerequisites met
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for "???" text for hidden nodes
      const hiddenNodeText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0] === '???'
      );
      expect(hiddenNodeText).toBeDefined();
    });
  });

  // =========================================================================
  // Criterion 3: Unlock Conditions Display
  // =========================================================================

  describe('Criterion 3: Unlock Conditions Display', () => {
    it('should show all unlock conditions on node hover', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Simulate hover over node
      panel.handleMouseMove(150, 100, mockWorld);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify tooltip shows conditions
      const conditionText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('Requirements:')
      );
      expect(conditionText).toBeDefined();
    });

    it('should display met conditions with checkmark icon', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: ['shinto_spirit_sense'],
        purity: 45
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleMouseMove(150, 200, mockWorld); // Hover over node

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for checkmark (✓) icon for met conditions
      const checkmarks = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0].includes('✓') || call[0].includes('✅')
      );
      expect(checkmarks.length).toBeGreaterThan(0);
    });

    it('should display unmet conditions with X icon', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: [],
        purity: 10 // Too low
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleMouseMove(150, 200, mockWorld); // Hover over node

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for X icon for unmet conditions
      const xMarks = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0].includes('✗') || call[0].includes('❌')
      );
      expect(xMarks.length).toBeGreaterThan(0);
    });

    it('should display XP cost prominently', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleMouseMove(150, 100, mockWorld);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for "Cost: X XP" text
      const costText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('Cost:') && call[0].includes('XP')
      );
      expect(costText).toBeDefined();
    });
  });

  // =========================================================================
  // Criterion 4: Node Unlocking
  // =========================================================================

  describe('Criterion 4: Node Unlocking', () => {
    it('should unlock node when player clicks available node', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Click on available node
      panel.handleClick(150, 200, mockWorld);

      // Verify unlock method called on SkillTreeManager
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).toHaveBeenCalledWith(
        entity,
        'shinto',
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should deduct XP when node unlocked', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const initialXP = 500;
      const nodeCost = 100;

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleClick(150, 200, mockWorld);

      // Verify XP deducted
      const magicComponent = entity.getComponent('magic');
      expect(magicComponent.skillTreeState.shinto.xp).toBe(initialXP - nodeCost);
    });

    it('should emit magic:skill_node_unlocked event', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const eventBusSpy = vi.spyOn(mockWorld.getEventBus(), 'emit');

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleClick(150, 200, mockWorld);

      expect(eventBusSpy).toHaveBeenCalledWith('magic:skill_node_unlocked', {
        entityId: entity.id,
        paradigmId: 'shinto',
        nodeId: expect.any(String)
      });
    });

    it('should not unlock node when XP insufficient', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 10 }, // Not enough
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleClick(150, 200, mockWorld);

      // Verify unlock NOT called
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).not.toHaveBeenCalled();
    });

    it('should not unlock node when conditions not met', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: [], // Missing prerequisite
        purity: 10 // Too low
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleClick(150, 200, mockWorld);

      // Verify unlock NOT called
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).not.toHaveBeenCalled();
    });

    it('should update UI immediately after unlock', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleClick(150, 200, mockWorld);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify newly unlocked node shows as green (unlocked)
      const greenFills = ctx._fillStyleCalls?.filter((call: any) =>
        call.includes('green')
      );
      expect(greenFills.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Criterion 5: Multi-Paradigm Support
  // =========================================================================

  describe('Criterion 5: Multi-Paradigm Support', () => {
    it('should show independent XP pools for each paradigm', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy'],
        xp: { shinto: 450, allomancy: 320 }
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();

      // Render Shinto tab
      panel.setActiveParadigm('shinto');
      panel.render(ctx, 0, 0, 800, 600, mockWorld);
      const shintoXP = ctx.fillText.mock.calls.find((call: any[]) => call[0].includes('450'));
      expect(shintoXP).toBeDefined();

      // Render Allomancy tab
      
      panel.setActiveParadigm('allomancy');
      panel.render(ctx, 0, 0, 800, 600, mockWorld);
      const allomancyXP = ctx.fillText.mock.calls.find((call: any[]) => call[0].includes('320'));
      expect(allomancyXP).toBeDefined();
    });

    it('should switch paradigm when tab clicked', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy', 'sympathy']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Click on Allomancy tab (approximate position)
      panel.handleClick(100, 30, mockWorld);

      expect(panel.getActiveParadigm()).toBe('allomancy');
    });

    it('should preserve scroll/zoom state when switching tabs', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Scroll/zoom Shinto tab
      panel.setScroll(100, 200);
      panel.setZoom(1.5);
      panel.setActiveParadigm('shinto');

      // Switch to Allomancy
      panel.setActiveParadigm('allomancy');

      // Switch back to Shinto
      panel.setActiveParadigm('shinto');

      // Verify state preserved
      expect(panel.getScroll()).toEqual({ x: 100, y: 200 });
      expect(panel.getZoom()).toBe(1.5);
    });

    it('should not allow XP cross-contamination between paradigms', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy'],
        xp: { shinto: 500, allomancy: 200 }
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Unlock Shinto node (costs 100 XP)
      panel.setActiveParadigm('shinto');
      panel.handleClick(150, 200, mockWorld);

      const magicComponent = entity.getComponent('magic');

      // Verify only Shinto XP deducted
      expect(magicComponent.skillTreeState.shinto.xp).toBe(400);
      expect(magicComponent.skillTreeState.allomancy.xp).toBe(200); // Unchanged
    });
  });

  // =========================================================================
  // Criterion 6: Discovery Mechanics
  // =========================================================================

  describe('Criterion 6: Discovery Mechanics', () => {
    it('should reveal hidden node when prerequisite met', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: ['shinto_spirit_sense'],
        discoveries: { kami: ['river_kami_123'] }
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify hidden node now shows actual name instead of "???"
      const hiddenNodeText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0] === '???'
      );
      expect(hiddenNodeText).toBeUndefined(); // Should not exist

      const revealedNodeText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('River Kami')
      );
      expect(revealedNodeText).toBeDefined();
    });

    it('should show notification when hidden node reveals', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: ['shinto_spirit_sense']
      });

      const eventBusSpy = vi.spyOn(mockWorld.getEventBus(), 'emit');

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Trigger discovery (e.g., meet kami)
      entity.getComponent('magic').paradigmState.shinto.discoveries = {
        kami: ['river_kami_123']
      };
      panel.refresh();

      // Verify notification event
      expect(eventBusSpy).toHaveBeenCalledWith('ui:notification', {
        message: expect.stringContaining('New ability discovered'),
        type: 'discovery'
      });
    });

    it('should display tooltip explaining what unlocked hidden node', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        discoveries: { kami: ['river_kami_123'] }
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);
      panel.handleMouseMove(150, 200, mockWorld); // Hover over newly revealed node

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Check for explanation in tooltip
      const explanation = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('Unlocked by:') && call[0].includes('river kami')
      );
      expect(explanation).toBeDefined();
    });
  });

  // =========================================================================
  // Criterion 7: Keyboard Navigation
  // =========================================================================

  describe('Criterion 7: Keyboard Navigation', () => {
    it('should navigate nodes with arrow keys', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Select first node
      panel.handleKeyDown('ArrowDown', mockWorld);
      expect(panel.getSelectedNodeId()).toBeDefined();

      // Navigate right
      const firstNode = panel.getSelectedNodeId();
      panel.handleKeyDown('ArrowRight', mockWorld);
      expect(panel.getSelectedNodeId()).not.toBe(firstNode);
    });

    it('should unlock selected node with Enter key', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Select available node
      panel.setSelectedNode('shinto_cleansing_ritual');
      panel.handleKeyDown('Enter', mockWorld);

      // Verify unlock called
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).toHaveBeenCalled();
    });

    it('should switch paradigms with Tab key', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy', 'sympathy']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      panel.setActiveParadigm('shinto');
      panel.handleKeyDown('Tab', mockWorld);
      expect(panel.getActiveParadigm()).toBe('allomancy');

      panel.handleKeyDown('Tab', mockWorld);
      expect(panel.getActiveParadigm()).toBe('sympathy');

      panel.handleKeyDown('Tab', mockWorld);
      expect(panel.getActiveParadigm()).toBe('shinto'); // Wrap around
    });

    it('should close panel with Escape key', () => {
      const panel = new SkillTreePanel(mockWindowManager);
      panel.setVisible(true);

      panel.handleKeyDown('Escape', mockWorld);

      expect(panel.isVisible()).toBe(false);
    });
  });

  // =========================================================================
  // Edge Cases
  // =========================================================================

  describe('Edge Cases', () => {
    it('should show "No magic abilities" when agent has no paradigms', () => {
      const entity = createMockMagicEntity({
        paradigms: []
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      const noMagicText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('No magic abilities')
      );
      expect(noMagicText).toBeDefined();
    });

    it('should hide tabs when agent has only one paradigm', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify no tab bar rendered
      const tabText = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[2] < 50 // Tab bar is at top
      );
      expect(tabText.length).toBe(0); // No tabs needed
    });

    it('should handle scrollable tab bar when agent has 10+ paradigms', () => {
      const paradigms = Array.from({ length: 15 }, (_, i) => `paradigm_${i}`);
      const entity = createMockMagicEntity({ paradigms });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify scroll arrows rendered
      const scrollArrows = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0] === '<' || call[0] === '>'
      );
      expect(scrollArrows.length).toBeGreaterThan(0);
    });

    it('should handle tree with 50+ nodes via scroll/zoom', () => {
      const entity = createMockMagicEntity({
        paradigms: ['mega_paradigm'] // Has 50+ nodes
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Scroll down
      panel.handleScroll(0, -500);
      expect(panel.getScroll().y).toBe(-500);

      // Zoom in
      panel.handleZoom(1.5);
      expect(panel.getZoom()).toBe(1.5);
    });

    it('should handle node with 10+ unlock conditions via scrollable tooltip', () => {
      const entity = createMockMagicEntity({
        paradigms: ['complex_paradigm']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      // Hover over complex node
      panel.handleMouseMove(150, 200, mockWorld);

      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify tooltip has scroll indicator
      const scrollHint = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('more...') || call[0].includes('↓')
      );
      expect(scrollHint).toBeDefined();
    });
  });

  // =========================================================================
  // Error Handling (per CLAUDE.md - no silent fallbacks)
  // =========================================================================

  describe('Error Handling', () => {
    it('should throw when required entity is missing', () => {
      const panel = new SkillTreePanel(mockWindowManager);

      expect(() => {
        panel.render(createMockCanvasContext(), 0, 0, 800, 600, mockWorld);
      }).toThrow('No entity selected');
    });

    it('should throw when paradigm tree not found', () => {
      const entity = createMockMagicEntity({
        paradigms: ['nonexistent_paradigm']
      });

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(createMockCanvasContext(), 0, 0, 800, 600, mockWorld);
      }).toThrow('Skill tree not found for paradigm: nonexistent_paradigm');
    });

    it('should throw when magic component missing on magic entity', () => {
      const entity = createMockEntity(); // No magic component

      const panel = new SkillTreePanel(mockWindowManager);
      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(createMockCanvasContext(), 0, 0, 800, 600, mockWorld);
      }).toThrow('Entity missing magic component');
    });
  });
});

// =============================================================================
// Mock Factories
// =============================================================================

function createMockWorld(): World {
  // Handle both emit signatures: emit(type, data) and emit({ type, source, data })
  const eventBusEmit = vi.fn((typeOrEvent: string | any, data?: any) => {
    // Normalize to type, data format for test assertions
    if (typeof typeOrEvent === 'string') {
      // emit(type, data)
      return;
    } else if (typeOrEvent && typeof typeOrEvent === 'object') {
      // emit({ type, source, data }) - extract type and data
      const event = typeOrEvent;
      // Call again with normalized signature so test assertions work
      eventBusEmit(event.type, event.data || event);
    }
  });

  const unlockSkillNode = vi.fn((entityId, paradigmId, nodeId, xpCost) => {
    // Simulate successful unlock - deduct XP
    return true;
  });
  const evaluateNode = vi.fn((tree, nodeId, context) => {
    // Return mock evaluation result
    return {
      nodeId,
      isUnlocked: context.progress?.unlockedNodes?.includes(nodeId) ?? false,
      isAvailable: true,
      isVisible: true,
      metConditions: [],
      unmetConditions: [],
    };
  });

  return {
    getEventBus: vi.fn(() => ({
      emit: eventBusEmit,
      on: vi.fn(),
    })),
    getSkillTreeManager: vi.fn(() => ({
      unlockSkillNode,
      evaluateNode,
    })),
    getRegistry: vi.fn(() => ({
      getTree: vi.fn(),
    })),
  } as any;
}

function createMockMagicEntity(config: {
  paradigms?: string[];
  xp?: Record<string, number>;
  unlockedNodes?: string[];
  discoveries?: any;
  purity?: number;
} = {}): Entity {
  const {
    paradigms = ['shinto'],
    xp = { shinto: 450 },
    unlockedNodes = [],
    discoveries = {},
    purity = 50,
  } = config;

  const skillTreeState: any = {};
  for (const paradigm of paradigms) {
    skillTreeState[paradigm] = {
      xp: xp[paradigm] ?? 0,
      unlockedNodes: unlockedNodes.filter(n => n.startsWith(paradigm)),
      nodeProgress: {},
    };
  }

  return {
    id: 'test_entity_123',
    getComponent: vi.fn((type: string) => {
      if (type === 'magic') {
        return {
          type: 'magic',
          magicUser: true,
          knownParadigmIds: paradigms,
          skillTreeState,
          paradigmState: {
            shinto: {
              purity,
              discoveries,
            },
          },
        };
      }
      return undefined;
    }),
    hasComponent: vi.fn((type: string) => type === 'magic'),
  } as any;
}

function createMockEntity(): Entity {
  return {
    id: 'test_entity_non_magic',
    getComponent: vi.fn(() => undefined),
    hasComponent: vi.fn(() => false),
  } as any;
}

function createMockWindowManager(): WindowManager {
  return {
    getWindowConfig: vi.fn(() => ({
      keyboardShortcut: 'KeyT',
    })),
    registerWindow: vi.fn(),
  } as any;
}

function createMockCanvasContext(): CanvasRenderingContext2D {
  const fillStyleCalls: string[] = [];
  const strokeStyleCalls: string[] = [];

  const mock: any = {
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    strokeText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(), // Add missing fill method
    arc: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(), // Add missing setLineDash method
    measureText: vi.fn((text: string) => ({ width: text.length * 8 })), // Mock width based on text length
    _fillStyle: '#000000',
    _strokeStyle: '#000000',
    _fillStyleCalls: fillStyleCalls,
    _strokeStyleCalls: strokeStyleCalls,
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    lineWidth: 1,
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

/**
 * Setup mock skill trees in the registry for testing
 */
function setupMockSkillTrees() {
  const registry = MagicSkillTreeRegistry.getInstance();

  // Create mock Shinto tree
  const shintoTree: MagicSkillTree = {
    id: 'shinto_tree',
    paradigmId: 'shinto',
    name: 'Shinto Magic',
    description: 'Spirit magic and kami worship',
    nodes: [
      {
        id: 'shinto_spirit_sense',
        name: 'Spirit Sense',
        description: 'Sense nearby kami spirits',
        category: 'foundation',
        tier: 0,
        xpCost: 100,
        unlockConditions: [],
        effects: [],
      },
      {
        id: 'shinto_cleansing_ritual',
        name: 'Cleansing Ritual',
        description: 'Purify corrupted areas',
        category: 'intermediate',
        tier: 1,
        xpCost: 100,
        unlockConditions: [
          { type: 'prerequisite_node', nodeId: 'shinto_spirit_sense' }
        ],
        effects: [],
      },
    ],
    entryNodes: ['shinto_spirit_sense'],
    connections: [
      { from: 'shinto_spirit_sense', to: 'shinto_cleansing_ritual' }
    ],
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Basic Shinto abilities',
        displayOrder: 0,
      },
      {
        id: 'intermediate',
        name: 'Intermediate',
        description: 'Advanced Shinto techniques',
        displayOrder: 1,
      },
      {
        id: 'mastery',
        name: 'Mastery',
        description: 'Master-level Shinto powers',
        displayOrder: 2,
      },
    ],
  };

  // Create mock Allomancy tree
  const allomancyTree: MagicSkillTree = {
    id: 'allomancy_tree',
    paradigmId: 'allomancy',
    name: 'Allomancy',
    description: 'Pushing and pulling on metals',
    nodes: [
      {
        id: 'allomancy_steel_push',
        name: 'Steel Push',
        description: 'Push on metals',
        category: 'foundation',
        tier: 0,
        xpCost: 100,
        unlockConditions: [],
        effects: [],
      },
    ],
    entryNodes: ['allomancy_steel_push'],
    connections: [],
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Basic Allomancy',
        displayOrder: 0,
      },
    ],
  };

  // Create mock Sympathy tree
  const sympathyTree: MagicSkillTree = {
    id: 'sympathy_tree',
    paradigmId: 'sympathy',
    name: 'Sympathy',
    description: 'Binding energy between objects',
    nodes: [
      {
        id: 'sympathy_heat_link',
        name: 'Heat Link',
        description: 'Transfer heat between objects',
        category: 'foundation',
        tier: 0,
        xpCost: 100,
        unlockConditions: [],
        effects: [],
      },
    ],
    entryNodes: ['sympathy_heat_link'],
    connections: [],
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Basic Sympathy',
        displayOrder: 0,
      },
    ],
  };

  // Create mock mega_paradigm tree (for scroll/zoom test)
  const megaParadigmTree: MagicSkillTree = {
    id: 'mega_paradigm_tree',
    paradigmId: 'mega_paradigm',
    name: 'Mega Paradigm',
    description: 'A paradigm with 50+ nodes',
    nodes: Array.from({ length: 50 }, (_, i) => ({
      id: `mega_node_${i}`,
      name: `Node ${i}`,
      description: `Description ${i}`,
      category: 'foundation',
      tier: Math.floor(i / 10),
      xpCost: 100,
      unlockConditions: i > 0 ? [{ type: 'prerequisite_node', nodeId: `mega_node_${i - 1}` }] : [],
      effects: [],
    })),
    entryNodes: ['mega_node_0'],
    connections: Array.from({ length: 49 }, (_, i) => ({
      from: `mega_node_${i}`,
      to: `mega_node_${i + 1}`,
    })),
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Basic abilities',
        displayOrder: 0,
      },
    ],
  };

  // Create mock complex_paradigm tree (for tooltip scroll test)
  const complexParadigmTree: MagicSkillTree = {
    id: 'complex_paradigm_tree',
    paradigmId: 'complex_paradigm',
    name: 'Complex Paradigm',
    description: 'A paradigm with complex unlock conditions',
    nodes: [
      {
        id: 'complex_node_1',
        name: 'Complex Node',
        description: 'A node with many unlock conditions',
        category: 'foundation',
        tier: 0,
        xpCost: 500,
        unlockConditions: [
          { type: 'prerequisite_node', nodeId: 'node_1' },
          { type: 'prerequisite_node', nodeId: 'node_2' },
          { type: 'prerequisite_node', nodeId: 'node_3' },
          { type: 'prerequisite_node', nodeId: 'node_4' },
          { type: 'prerequisite_node', nodeId: 'node_5' },
          { type: 'prerequisite_node', nodeId: 'node_6' },
          { type: 'prerequisite_node', nodeId: 'node_7' },
          { type: 'prerequisite_node', nodeId: 'node_8' },
          { type: 'prerequisite_node', nodeId: 'node_9' },
          { type: 'prerequisite_node', nodeId: 'node_10' },
          { type: 'xp_threshold', paradigmId: 'complex_paradigm', xpRequired: 1000 },
          { type: 'attribute_threshold', attribute: 'intelligence', value: 50 },
        ],
        effects: [],
      },
    ],
    entryNodes: ['complex_node_1'],
    connections: [],
    categories: [
      {
        id: 'foundation',
        name: 'Foundation',
        description: 'Complex abilities',
        displayOrder: 0,
      },
    ],
  };

  // Create trees for paradigm_0 through paradigm_14 (for scrollable tab bar test)
  const paradigmTrees: Map<string, MagicSkillTree> = new Map();
  for (let i = 0; i < 15; i++) {
    paradigmTrees.set(`paradigm_${i}`, {
      id: `paradigm_${i}_tree`,
      paradigmId: `paradigm_${i}`,
      name: `Paradigm ${i}`,
      description: `Test paradigm ${i}`,
      nodes: [
        {
          id: `paradigm_${i}_node_1`,
          name: `Node ${i}`,
          description: `Description ${i}`,
          category: 'foundation',
          tier: 0,
          xpCost: 100,
          unlockConditions: [],
          effects: [],
        },
      ],
      entryNodes: [`paradigm_${i}_node_1`],
      connections: [],
      categories: [
        {
          id: 'foundation',
          name: 'Foundation',
          description: 'Basic abilities',
          displayOrder: 0,
        },
      ],
    });
  }

  // Register trees
  (registry as any).trees = new Map([
    ['shinto', shintoTree],
    ['allomancy', allomancyTree],
    ['sympathy', sympathyTree],
    ['mega_paradigm', megaParadigmTree],
    ['complex_paradigm', complexParadigmTree],
    ...Array.from(paradigmTrees.entries()),
  ]);
}

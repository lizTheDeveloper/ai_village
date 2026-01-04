import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { World } from '@ai-village/core/src/ecs/World.js';
import type { Entity } from '@ai-village/core/src/ecs/Entity.js';
import type { EventBus } from '@ai-village/core/src/events/EventBus.js';
import { SkillTreePanel } from '../SkillTreePanel.js';

/**
 * Integration Tests for Magic Skill Tree UI
 *
 * These tests verify the complete flow from user interaction to backend updates:
 * 1. Unlock Flow - Player clicks node → XP deducted → node unlocked → events emitted
 * 2. Backend Sync - Backend unlocks node → UI updates immediately
 * 3. XP Gain - Magic XP earned → UI XP counter updates
 * 4. Discovery - Hidden node condition met → "???" becomes visible node
 */
describe('Integration: Magic Skill Tree UI', () => {
  let mockWorld: World;
  let mockEntity: Entity;
  let mockEventBus: EventBus;
  let skillTreePanel: any;

  beforeEach(() => {
    mockWorld = createMockWorld();
    mockEntity = createMockMagicEntity();
    mockEventBus = mockWorld.getEventBus();

    skillTreePanel = new SkillTreePanel(createMockWindowManager());
    skillTreePanel.setSelectedEntity(mockEntity);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Criterion 1: Complete Unlock Flow
  // =========================================================================

  describe('Unlock Flow Integration', () => {
    it('should complete full unlock flow when player clicks available node', () => {
      // Setup: Agent with Shinto paradigm, 500 XP, Spirit Sense unlocked
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense'],
        purity: 45
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Step 1: Verify node shows as "available" (yellow glow)
      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      const yellowGlowCalls = ctx._strokeStyleCalls.filter((call: any) =>
        call.includes('yellow')
      );
      expect(yellowGlowCalls.length).toBeGreaterThan(0);

      // Step 2: Click on available node
      const clickResult = panel.handleClick(150, 200, mockWorld);
      expect(clickResult).toBe(true); // Click handled

      // Step 3: Verify XP deducted
      const magicComponent = entity.getComponent('magic');
      expect(magicComponent.skillTreeState.shinto.xp).toBe(400); // 500 - 100

      // Step 4: Verify node marked as unlocked
      expect(magicComponent.skillTreeState.shinto.unlockedNodes).toContain('shinto_cleansing_ritual');

      // Step 5: Verify event emitted
      expect(mockEventBus.emit).toHaveBeenCalledWith('magic:skill_node_unlocked', {
        entityId: entity.id,
        paradigmId: 'shinto',
        nodeId: 'shinto_cleansing_ritual',
        xpSpent: 100
      });

      // Step 6: Verify UI updates (node now green)
      
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      const greenFillCalls = ctx._fillStyleCalls.filter((call: any) =>
        call.includes('green')
      );
      expect(greenFillCalls.length).toBeGreaterThan(0);
    });

    it('should apply node effects when unlocked', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Click node (unlock it)
      panel.handleClick(150, 200, mockWorld);

      // Verify effects applied
      const skillTreeManager = mockWorld.getSkillTreeManager();
      expect(skillTreeManager.applyNodeEffects).toHaveBeenCalledWith(
        entity,
        'shinto',
        'shinto_cleansing_ritual'
      );
    });

    it('should prevent unlock when XP insufficient', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 50 }, // Not enough XP
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Try to click node
      const clickResult = panel.handleClick(150, 200, mockWorld);

      // Verify unlock did not happen
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'magic:skill_node_unlocked',
        expect.anything()
      );

      // Verify XP unchanged
      const magicComponent = entity.getComponent('magic');
      expect(magicComponent.skillTreeState.shinto.xp).toBe(50);
    });

    it('should prevent unlock when conditions not met', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: [], // Missing prerequisite
        purity: 10 // Too low
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Try to click node
      const clickResult = panel.handleClick(150, 200, mockWorld);

      // Verify unlock did not happen
      expect(mockWorld.getSkillTreeManager().unlockSkillNode).not.toHaveBeenCalled();
    });

    it('should show error notification when unlock fails', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 50 }
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Try to unlock
      panel.handleClick(150, 200, mockWorld);

      // Verify error notification
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:notification', {
        message: expect.stringContaining('Insufficient XP'),
        type: 'error'
      });
    });
  });

  // =========================================================================
  // Criterion 2: Backend Sync
  // =========================================================================

  describe('Backend Sync Integration', () => {
    it('should update UI when backend unlocks node', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Render initial state
      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Backend unlocks node (e.g., via auto-unlock system)
      mockEventBus.emit('magic:skill_node_unlocked', {
        entityId: entity.id,
        paradigmId: 'shinto',
        nodeId: 'shinto_cleansing_ritual',
        source: 'auto_unlock'
      });

      // Update entity state
      entity.getComponent('magic').skillTreeState.shinto.unlockedNodes.push('shinto_cleansing_ritual');
      entity.getComponent('magic').skillTreeState.shinto.xp -= 100;

      // Re-render
      
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify UI updated (node now green)
      const greenFills = ctx._fillStyleCalls.filter((call: any) =>
        call.includes('green')
      );
      expect(greenFills.length).toBeGreaterThan(0);
    });

    it('should listen to magic:skill_node_unlocked events', () => {
      const panel = new SkillTreePanel(createMockWindowManager());

      // Verify event listener registered
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'magic:skill_node_unlocked',
        expect.any(Function)
      );
    });

    it('should refresh UI when receiving backend unlock event', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      const refreshSpy = vi.spyOn(panel, 'refresh');

      // Simulate backend event
      const eventHandler = mockEventBus.on.mock.calls.find(
        (call: any[]) => call[0] === 'magic:skill_node_unlocked'
      )?.[1];

      eventHandler?.({
        entityId: entity.id,
        paradigmId: 'shinto',
        nodeId: 'some_node'
      });

      // Verify refresh called
      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Criterion 3: XP Gain Updates
  // =========================================================================

  describe('XP Gain Integration', () => {
    it('should update XP counter when XP gained', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 450 }
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Render initial state
      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      const initialXPText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('450')
      );
      expect(initialXPText).toBeDefined();

      // Gain XP
      mockEventBus.emit('magic:xp_gained', {
        entityId: entity.id,
        paradigmId: 'shinto',
        amount: 50
      });

      // Update entity state
      entity.getComponent('magic').skillTreeState.shinto.xp += 50;

      // Re-render
      
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify new XP shown
      const updatedXPText = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('500')
      );
      expect(updatedXPText).toBeDefined();
    });

    it('should highlight newly available nodes after XP gain', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 90 }, // Just below threshold
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Gain XP to cross threshold
      mockEventBus.emit('magic:xp_gained', {
        entityId: entity.id,
        paradigmId: 'shinto',
        amount: 20
      });

      entity.getComponent('magic').skillTreeState.shinto.xp = 110;

      // Render
      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify node now shows as available (yellow glow)
      const yellowGlows = ctx._strokeStyleCalls.filter((call: any) =>
        call.includes('yellow')
      );
      expect(yellowGlows.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Criterion 4: Discovery Mechanics
  // =========================================================================

  describe('Discovery Integration', () => {
    it('should reveal hidden node when discovery condition met', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        unlockedNodes: ['shinto_spirit_sense'],
        discoveries: { kami: [] } // No kami met yet
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Render initial state - node hidden
      const ctx = createMockCanvasContext();
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      const hiddenNodes1 = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0] === '???'
      );
      expect(hiddenNodes1.length).toBeGreaterThan(0);

      // Meet discovery condition (encounter kami)
      entity.getComponent('magic').paradigmState.shinto.discoveries = {
        kami: ['river_kami_123']
      };

      // Re-render
      
      panel.render(ctx, 0, 0, 800, 600, mockWorld);

      // Verify node now visible with real name
      const hiddenNodes2 = ctx.fillText.mock.calls.filter((call: any[]) =>
        call[0] === '???'
      );
      expect(hiddenNodes2.length).toBe(0);

      const revealedNode = ctx.fillText.mock.calls.find((call: any[]) =>
        call[0].includes('River Kami')
      );
      expect(revealedNode).toBeDefined();
    });

    it('should show discovery notification when hidden node reveals', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        discoveries: { kami: [] }
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Trigger discovery
      entity.getComponent('magic').paradigmState.shinto.discoveries = {
        kami: ['river_kami_123']
      };

      panel.refresh();

      // Verify notification
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:notification', {
        message: expect.stringContaining('New ability discovered'),
        type: 'discovery'
      });
    });

    it('should track which nodes were recently discovered', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        discoveries: { kami: [] }
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Trigger discovery
      entity.getComponent('magic').paradigmState.shinto.discoveries = {
        kami: ['river_kami_123']
      };

      panel.refresh();

      // Verify recently discovered nodes tracked
      const recentDiscoveries = panel.getRecentDiscoveries();
      expect(recentDiscoveries).toContain('shinto_river_blessing');
    });
  });

  // =========================================================================
  // Criterion 5: Multi-Paradigm XP Isolation
  // =========================================================================

  describe('Multi-Paradigm XP Isolation', () => {
    it('should not affect other paradigms XP when unlocking node', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy', 'sympathy'],
        xp: { shinto: 500, allomancy: 300, sympathy: 200 },
        unlockedNodes: ['shinto_spirit_sense']
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Set active paradigm to Shinto
      panel.setActiveParadigm('shinto');

      // Unlock Shinto node
      panel.handleClick(150, 200, mockWorld);

      const magicComponent = entity.getComponent('magic');

      // Verify only Shinto XP deducted
      expect(magicComponent.skillTreeState.shinto.xp).toBe(400); // 500 - 100
      expect(magicComponent.skillTreeState.allomancy.xp).toBe(300); // Unchanged
      expect(magicComponent.skillTreeState.sympathy.xp).toBe(200); // Unchanged
    });

    it('should maintain separate unlocked nodes per paradigm', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto', 'allomancy'],
        xp: { shinto: 500, allomancy: 500 }
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Unlock Shinto node
      panel.setActiveParadigm('shinto');
      panel.handleClick(150, 100, mockWorld);

      // Unlock Allomancy node
      panel.setActiveParadigm('allomancy');
      panel.handleClick(150, 100, mockWorld);

      const magicComponent = entity.getComponent('magic');

      // Verify nodes tracked separately
      expect(magicComponent.skillTreeState.shinto.unlockedNodes).not.toEqual(
        magicComponent.skillTreeState.allomancy.unlockedNodes
      );
    });
  });

  // =========================================================================
  // Error Recovery Integration
  // =========================================================================

  describe('Error Recovery', () => {
    it('should rollback XP if unlock fails', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 }
      });

      // Mock unlock to fail
      mockWorld.getSkillTreeManager().unlockSkillNode.mockImplementation(() => {
        throw new Error('Unlock failed');
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      // Try to unlock
      panel.handleClick(150, 200, mockWorld);

      // Verify XP not deducted
      const magicComponent = entity.getComponent('magic');
      expect(magicComponent.skillTreeState.shinto.xp).toBe(500); // Unchanged
    });

    it('should show error notification if unlock fails', () => {
      const entity = createMockMagicEntity({
        paradigms: ['shinto'],
        xp: { shinto: 500 }
      });

      mockWorld.getSkillTreeManager().unlockSkillNode.mockImplementation(() => {
        throw new Error('Unlock failed');
      });

      const panel = new SkillTreePanel(createMockWindowManager());
      panel.setSelectedEntity(entity);

      panel.handleClick(150, 200, mockWorld);

      // Verify error shown
      expect(mockEventBus.emit).toHaveBeenCalledWith('ui:notification', {
        message: expect.stringContaining('error'),
        type: 'error'
      });
    });
  });
});

// =============================================================================
// Mock Factories
// =============================================================================

function createMockWorld(): World {
  const eventBus = {
    emit: vi.fn(),
    on: vi.fn(),
  };

  return {
    getEventBus: vi.fn(() => eventBus),
    getSkillTreeManager: vi.fn(() => ({
      unlockSkillNode: vi.fn(),
      evaluateNode: vi.fn(),
      applyNodeEffects: vi.fn(),
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

function createMockWindowManager(): any {
  return {
    getWindowConfig: vi.fn(() => ({ keyboardShortcut: 'KeyT' })),
    registerWindow: vi.fn(),
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

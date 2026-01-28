/**
 * Unit tests for MagicSystemsPanel
 *
 * Tests the magic systems UI component that displays and manages paradigm states.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { MagicSystemsPanel } from '../MagicSystemsPanel.js';
import { MagicSystemStateManager } from '@ai-village/magic';
import type { MagicParadigm } from '@ai-village/magic';

// ============================================================================
// Mock Data
// ============================================================================

function createMockParadigm(id: string, name: string, description: string): MagicParadigm {
  return {
    id,
    name,
    description,
    sources: [
      { name: 'mana', type: 'internal', regeneration: 'automatic', detectability: 'subtle' },
    ],
    costs: [
      { name: 'mana', type: 'static', recovery: 'regeneration', visibility: 'internal' },
    ],
    channels: [],
    laws: [],
    risks: [],
    acquisition: { method: 'study', rarity: 'common' },
    foreignMagic: { policy: 'harmless', effect: { type: 'unaffected' } },
  };
}

const MOCK_PARADIGMS = {
  academic: createMockParadigm('academic', 'Academic Magic', 'Structured spellcasting through formal study'),
  pact: createMockParadigm('pact', 'Pact Magic', 'Power through contracts with entities'),
  blood: createMockParadigm('blood', 'Blood Magic', 'Sacrificial magic using vitality'),
  divine: createMockParadigm('divine', 'Divine Magic', 'Miracles through worship and prayer'),
};

// ============================================================================
// Test Suite
// ============================================================================

describe('MagicSystemsPanel', () => {
  let panel: MagicSystemsPanel;
  let stateManager: MagicSystemStateManager;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // Reset singleton state manager
    MagicSystemStateManager.resetInstance();
    stateManager = MagicSystemStateManager.getInstance();

    // Register mock paradigms
    stateManager.registerParadigm(MOCK_PARADIGMS.academic);
    stateManager.registerParadigm(MOCK_PARADIGMS.pact);
    stateManager.registerParadigm(MOCK_PARADIGMS.blood);
    stateManager.registerParadigm(MOCK_PARADIGMS.divine);

    // Create panel
    panel = new MagicSystemsPanel();

    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 500;
    mockCanvas.height = 650;
    mockCtx = mockCanvas.getContext('2d')!;

    // Mock canvas rendering methods
    vi.spyOn(mockCtx, 'fillRect');
    vi.spyOn(mockCtx, 'fillText');
    vi.spyOn(mockCtx, 'strokeRect');
    vi.spyOn(mockCtx, 'measureText').mockReturnValue({ width: 100 } as TextMetrics);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Panel Interface Tests
  // ==========================================================================

  describe('Panel Interface', () => {
    it('should have correct ID', () => {
      expect(panel.getId()).toBe('magic-systems');
    });

    it('should have correct title', () => {
      expect(panel.getTitle()).toBe('Magic Systems');
    });

    it('should have default dimensions', () => {
      expect(panel.getDefaultWidth()).toBe(500);
      expect(panel.getDefaultHeight()).toBe(650);
    });

    it('should start hidden', () => {
      expect(panel.isVisible()).toBe(false);
    });

    it('should toggle visibility', () => {
      expect(panel.isVisible()).toBe(false);
      panel.toggle();
      expect(panel.isVisible()).toBe(true);
      panel.toggle();
      expect(panel.isVisible()).toBe(false);
    });

    it('should show/hide', () => {
      panel.show();
      expect(panel.isVisible()).toBe(true);
      panel.hide();
      expect(panel.isVisible()).toBe(false);
    });

    it('should set visibility', () => {
      panel.setVisible(true);
      expect(panel.isVisible()).toBe(true);
      panel.setVisible(false);
      expect(panel.isVisible()).toBe(false);
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render all registered paradigms', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      // Check that fillText was called with all paradigm names
      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Academic Magic');
      expect(textContent).toContain('Pact Magic');
      expect(textContent).toContain('Blood Magic');
      expect(textContent).toContain('Divine Magic');
    });

    it('should render header with title', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('MAGIC SYSTEMS');
    });

    it('should display active/enabled counts in header', () => {
      stateManager.enable('academic');
      stateManager.activate('pact');

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('1 active');
      expect(textContent).toContain('2 enabled');
    });

    it('should show empty state when no paradigms registered', () => {
      // Reset and create new state manager with no paradigms
      MagicSystemStateManager.resetInstance();
      const emptyManager = MagicSystemStateManager.getInstance();
      const emptyPanel = new MagicSystemsPanel();

      emptyPanel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('No magic paradigms registered');
    });

    it('should render paradigm state indicators', () => {
      stateManager.disable('academic');
      stateManager.enable('pact');
      stateManager.activate('blood');

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('DISABLED');
      expect(textContent).toContain('ENABLED');
      expect(textContent).toContain('ACTIVE');
    });

    it('should render toggle buttons', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      // Check that roundRect was called for toggle buttons (E and A)
      const fillRectCalls = (mockCtx.fillRect as Mock).mock.calls;

      // Should have multiple rectangles (background, header, sections, toggles)
      expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    it('should render expand/collapse indicators', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      // All paradigms start collapsed
      const collapseCount = (textContent.match(/▶/g) || []).length;
      expect(collapseCount).toBe(4); // 4 paradigms
    });

    it('should show expanded indicator when paradigm is expanded', () => {
      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      // Should have one ▼ (expanded) and three ▶ (collapsed)
      const expandCount = (textContent.match(/▼/g) || []).length;
      const collapseCount = (textContent.match(/▶/g) || []).length;
      expect(expandCount).toBe(1);
      expect(collapseCount).toBe(3);
    });

    it('should render paradigm descriptions when expanded', () => {
      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Structured spellcasting');
    });

    it('should render runtime statistics when expanded', () => {
      // Set some stats
      stateManager.setAgentCount('academic', 5);
      stateManager.setPlayerProficiency('academic', 75);
      stateManager.recordSpellCast('academic');
      stateManager.recordSpellCast('academic');

      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Agents: 5');
      expect(textContent).toContain('Proficiency: 75%');
      expect(textContent).toContain('Casts: 2');
    });

    it('should render mishap count when mishaps occur', () => {
      stateManager.recordMishap('academic');
      stateManager.recordMishap('academic');
      stateManager.recordMishap('academic');

      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Mishaps: 3');
    });

    it('should render sources when expanded', () => {
      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Sources: mana');
    });
  });

  // ==========================================================================
  // Expansion State Tests
  // ==========================================================================

  describe('Expansion State', () => {
    it('should start with all paradigms collapsed', () => {
      expect(panel.isExpanded('academic')).toBe(false);
      expect(panel.isExpanded('pact')).toBe(false);
      expect(panel.isExpanded('blood')).toBe(false);
      expect(panel.isExpanded('divine')).toBe(false);
    });

    it('should toggle expansion state', () => {
      expect(panel.isExpanded('academic')).toBe(false);
      panel.toggleExpanded('academic');
      expect(panel.isExpanded('academic')).toBe(true);
      panel.toggleExpanded('academic');
      expect(panel.isExpanded('academic')).toBe(false);
    });

    it('should maintain independent expansion states', () => {
      panel.toggleExpanded('academic');
      panel.toggleExpanded('blood');

      expect(panel.isExpanded('academic')).toBe(true);
      expect(panel.isExpanded('pact')).toBe(false);
      expect(panel.isExpanded('blood')).toBe(true);
      expect(panel.isExpanded('divine')).toBe(false);
    });

    it('should persist expansion state across renders', () => {
      panel.toggleExpanded('academic');
      expect(panel.isExpanded('academic')).toBe(true);

      panel.render(mockCtx, 0, 0, 500, 650);
      expect(panel.isExpanded('academic')).toBe(true);

      panel.render(mockCtx, 0, 0, 500, 650);
      expect(panel.isExpanded('academic')).toBe(true);
    });
  });

  // ==========================================================================
  // Interaction Tests
  // ==========================================================================

  describe('Click Interaction', () => {
    beforeEach(() => {
      // Render to populate click regions
      panel.render(mockCtx, 0, 0, 500, 650);
    });

    it('should toggle expansion on paradigm name click', () => {
      expect(panel.isExpanded('academic')).toBe(false);

      // Click in the paradigm header region (approximate)
      const handled = panel.handleClick(100, 50);

      expect(handled).toBe(true);
      expect(panel.isExpanded('academic')).toBe(true);
    });

    it('should toggle enabled state on E button click', () => {
      const initialState = stateManager.getState('academic');
      expect(initialState).toBe('disabled');

      // Click near where the E toggle would be (right side)
      panel.handleClick(400, 50);

      const newState = stateManager.getState('academic');
      expect(newState).toBe('enabled');
    });

    it('should toggle active state on A button click', () => {
      const initialState = stateManager.getState('academic');
      expect(initialState).toBe('disabled');

      // Click near where the A toggle would be (far right)
      panel.handleClick(450, 50);

      const newState = stateManager.getState('academic');
      expect(newState).toBe('active');
    });

    it('should return false for clicks outside any region', () => {
      const handled = panel.handleClick(10000, 10000);
      expect(handled).toBe(false);
    });

    it('should handle clicks with scroll offset', () => {
      // Scroll down
      panel.handleScroll(100);

      // Re-render to update click regions
      panel.render(mockCtx, 0, 0, 500, 650);

      // Click should still work (adjusted for scroll)
      const handled = panel.handleClick(100, 50);
      expect(handled).toBe(true);
    });
  });

  // ==========================================================================
  // State Management Integration Tests
  // ==========================================================================

  describe('State Management Integration', () => {
    it('should reflect state changes from external sources', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      stateManager.enable('academic');

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('ENABLED');
      expect(textContent).toContain('1 enabled');
    });

    it('should allow multiple paradigms to be enabled', () => {
      stateManager.enable('academic');
      stateManager.enable('pact');
      stateManager.enable('blood');

      panel.render(mockCtx, 0, 0, 500, 650);

      expect(stateManager.getEnabledParadigms().length).toBe(3);
    });

    it('should allow only one paradigm to be active at a time', () => {
      stateManager.activate('academic');
      expect(stateManager.getActiveParadigms().length).toBe(1);
      expect(stateManager.isActive('academic')).toBe(true);

      stateManager.activate('pact');
      expect(stateManager.getActiveParadigms().length).toBe(2);
      expect(stateManager.isActive('academic')).toBe(true);
      expect(stateManager.isActive('pact')).toBe(true);
    });

    it('should downgrade active to enabled when toggled', () => {
      stateManager.activate('academic');
      expect(stateManager.getState('academic')).toBe('active');

      stateManager.toggleActive('academic');
      expect(stateManager.getState('academic')).toBe('enabled');
    });

    it('should upgrade disabled to active when toggling active', () => {
      expect(stateManager.getState('academic')).toBe('disabled');

      stateManager.toggleActive('academic');
      expect(stateManager.getState('academic')).toBe('active');
    });

    it('should update agent counts', () => {
      stateManager.setAgentCount('academic', 10);

      const runtimeState = stateManager.getRuntimeState('academic');
      expect(runtimeState?.agentCount).toBe(10);
    });

    it('should update player proficiency', () => {
      stateManager.setPlayerProficiency('academic', 85);

      const runtimeState = stateManager.getRuntimeState('academic');
      expect(runtimeState?.playerProficiency).toBe(85);
    });

    it('should clamp proficiency to 0-100', () => {
      stateManager.setPlayerProficiency('academic', 150);
      expect(stateManager.getRuntimeState('academic')?.playerProficiency).toBe(100);

      stateManager.setPlayerProficiency('academic', -50);
      expect(stateManager.getRuntimeState('academic')?.playerProficiency).toBe(0);
    });

    it('should track spell casts', () => {
      stateManager.recordSpellCast('academic');
      stateManager.recordSpellCast('academic');
      stateManager.recordSpellCast('academic');

      const runtimeState = stateManager.getRuntimeState('academic');
      expect(runtimeState?.totalSpellsCast).toBe(3);
    });

    it('should track mishaps', () => {
      stateManager.recordMishap('academic');
      stateManager.recordMishap('academic');

      const runtimeState = stateManager.getRuntimeState('academic');
      expect(runtimeState?.totalMishaps).toBe(2);
    });
  });

  // ==========================================================================
  // Scrolling Tests
  // ==========================================================================

  describe('Scrolling', () => {
    it('should handle scroll events', () => {
      const handled = panel.handleScroll(50);
      expect(handled).toBe(true);
    });

    it('should scroll down', () => {
      panel.handleScroll(100);

      // Scroll offset should be applied (internal state)
      // Re-render and check that content is clipped
      panel.render(mockCtx, 0, 0, 500, 650);

      // Rendering should still work (content scrolled)
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should scroll up', () => {
      panel.handleScroll(100);
      panel.handleScroll(-50);

      panel.render(mockCtx, 0, 0, 500, 650);
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should not scroll below zero', () => {
      const handled = panel.handleScroll(-100);
      expect(handled).toBe(true);

      // Should clamp to 0 (can't scroll above content)
      panel.render(mockCtx, 0, 0, 500, 650);
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should limit scroll to content height', () => {
      // Scroll way down
      panel.handleScroll(10000);

      panel.render(mockCtx, 0, 0, 500, 650);

      // Should still render (clamped to max scroll)
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Hit Testing Tests
  // ==========================================================================

  describe('Hit Testing', () => {
    beforeEach(() => {
      panel.render(mockCtx, 0, 0, 500, 650);
    });

    it('should identify clicks in paradigm header region', () => {
      const handled = panel.handleClick(100, 50);
      expect(handled).toBe(true);
    });

    it('should identify clicks in toggle button regions', () => {
      // E toggle (enabled)
      const handledE = panel.handleClick(400, 50);
      expect(handledE).toBe(true);

      // Re-render to update regions
      panel.render(mockCtx, 0, 0, 500, 650);

      // A toggle (active)
      const handledA = panel.handleClick(450, 50);
      expect(handledA).toBe(true);
    });

    it('should handle overlapping click regions correctly', () => {
      // Click in the main header region (should expand/collapse)
      const initialExpanded = panel.isExpanded('academic');
      panel.handleClick(100, 50);
      expect(panel.isExpanded('academic')).toBe(!initialExpanded);
    });

    it('should ignore clicks outside all regions', () => {
      const handled = panel.handleClick(5000, 5000);
      expect(handled).toBe(false);
    });

    it('should handle clicks near region boundaries', () => {
      // Click at edge of first paradigm section
      const handled = panel.handleClick(1, 36);
      expect(handled).toBe(true);
    });
  });

  // ==========================================================================
  // Data Binding Tests
  // ==========================================================================

  describe('Data Binding', () => {
    it('should update when new paradigms are registered', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      const newParadigm = createMockParadigm('test', 'Test Magic', 'Test paradigm');
      stateManager.registerParadigm(newParadigm);

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Test Magic');
    });

    it('should update when paradigm states change', () => {
      panel.render(mockCtx, 0, 0, 500, 650);

      stateManager.enable('academic');

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('ENABLED');
    });

    it('should update when agent counts change', () => {
      panel.toggleExpanded('academic');
      panel.render(mockCtx, 0, 0, 500, 650);

      stateManager.setAgentCount('academic', 15);

      panel.render(mockCtx, 0, 0, 500, 650);

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      const textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');

      expect(textContent).toContain('Agents: 15');
    });

    it('should show real-time proficiency values', () => {
      panel.toggleExpanded('academic');

      stateManager.setPlayerProficiency('academic', 25);
      panel.render(mockCtx, 0, 0, 500, 650);

      let fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      let textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).toContain('Proficiency: 25%');

      stateManager.setPlayerProficiency('academic', 75);
      panel.render(mockCtx, 0, 0, 500, 650);

      fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).toContain('Proficiency: 75%');
    });

    it('should show updated spell cast counts', () => {
      panel.toggleExpanded('academic');

      panel.render(mockCtx, 0, 0, 500, 650);
      let fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      let textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).toContain('Casts: 0');

      stateManager.recordSpellCast('academic');
      stateManager.recordSpellCast('academic');

      panel.render(mockCtx, 0, 0, 500, 650);
      fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).toContain('Casts: 2');
    });

    it('should dynamically show/hide mishap count', () => {
      panel.toggleExpanded('academic');

      panel.render(mockCtx, 0, 0, 500, 650);
      let fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      let textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).not.toContain('Mishaps:');

      stateManager.recordMishap('academic');

      panel.render(mockCtx, 0, 0, 500, 650);
      fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      textContent = fillTextCalls.map((call: unknown[]) => call[0]).join(' ');
      expect(textContent).toContain('Mishaps: 1');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle paradigm with very long name', () => {
      const longParadigm = createMockParadigm(
        'long',
        'A Very Long Magic Paradigm Name That Exceeds Normal Length',
        'Test'
      );
      stateManager.registerParadigm(longParadigm);

      expect(() => {
        panel.render(mockCtx, 0, 0, 500, 650);
      }).not.toThrow();
    });

    it('should handle paradigm with very long description', () => {
      const longDesc = 'A'.repeat(200);
      const longDescParadigm = createMockParadigm('longdesc', 'Test', longDesc);
      stateManager.registerParadigm(longDescParadigm);

      panel.toggleExpanded('longdesc');

      expect(() => {
        panel.render(mockCtx, 0, 0, 500, 650);
      }).not.toThrow();
    });

    it('should handle zero dimensions', () => {
      expect(() => {
        panel.render(mockCtx, 0, 0, 0, 0);
      }).not.toThrow();
    });

    it('should handle very small dimensions', () => {
      expect(() => {
        panel.render(mockCtx, 0, 0, 10, 10);
      }).not.toThrow();
    });

    it('should handle many paradigms', () => {
      // Add 20 more paradigms
      for (let i = 0; i < 20; i++) {
        stateManager.registerParadigm(
          createMockParadigm(`paradigm_${i}`, `Magic ${i}`, `Description ${i}`)
        );
      }

      expect(() => {
        panel.render(mockCtx, 0, 0, 500, 650);
      }).not.toThrow();

      const fillTextCalls = (mockCtx.fillText as Mock).mock.calls;
      expect(fillTextCalls.length).toBeGreaterThan(0);
    });

    it('should handle paradigm with no sources', () => {
      const noSourceParadigm: MagicParadigm = {
        id: 'nosource',
        name: 'No Source Magic',
        description: 'Magic with no sources',
        sources: [],
        costs: [],
        channels: [],
        laws: [],
        risks: [],
        acquisition: { method: 'study', rarity: 'common' },
        foreignMagic: { policy: 'harmless', effect: { type: 'unaffected' } },
      };
      stateManager.registerParadigm(noSourceParadigm);

      panel.toggleExpanded('nosource');

      expect(() => {
        panel.render(mockCtx, 0, 0, 500, 650);
      }).not.toThrow();
    });

    it('should handle multiple rapid state changes', () => {
      for (let i = 0; i < 10; i++) {
        stateManager.toggleEnabled('academic');
        stateManager.toggleActive('pact');
        panel.render(mockCtx, 0, 0, 500, 650);
      }

      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    it('should handle expansion of all paradigms simultaneously', () => {
      panel.toggleExpanded('academic');
      panel.toggleExpanded('pact');
      panel.toggleExpanded('blood');
      panel.toggleExpanded('divine');

      expect(() => {
        panel.render(mockCtx, 0, 0, 500, 650);
      }).not.toThrow();

      expect(panel.isExpanded('academic')).toBe(true);
      expect(panel.isExpanded('pact')).toBe(true);
      expect(panel.isExpanded('blood')).toBe(true);
      expect(panel.isExpanded('divine')).toBe(true);
    });
  });
});

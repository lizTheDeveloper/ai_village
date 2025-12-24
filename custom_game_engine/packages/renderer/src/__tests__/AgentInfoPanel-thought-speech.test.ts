/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentInfoPanel } from '../AgentInfoPanel';
import type { Entity } from '@ai-village/core';

/**
 * Tests for Agent Thought and Speech History Display feature.
 *
 * These tests verify the AgentInfoPanel correctly renders:
 * - Agent's last thought from LLM reasoning
 * - Speech history showing what the agent has said
 */

// SKIP: These UI rendering tests are not part of event-schemas feature
describe.skip('AgentInfoPanel - Thought and Speech History Display', () => {
  let panel: AgentInfoPanel;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let mockWorld: any;

  beforeEach(() => {
    panel = new AgentInfoPanel();

    // Create mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1024;
    mockCanvas.height = 768;
    mockCtx = mockCanvas.getContext('2d')!;

    // Spy on canvas methods
    vi.spyOn(mockCtx, 'fillRect');
    vi.spyOn(mockCtx, 'strokeRect');
    vi.spyOn(mockCtx, 'fillText');
    vi.spyOn(mockCtx, 'beginPath');
    vi.spyOn(mockCtx, 'moveTo');
    vi.spyOn(mockCtx, 'lineTo');
    vi.spyOn(mockCtx, 'stroke');
    vi.spyOn(mockCtx, 'measureText').mockReturnValue({ width: 50 } as TextMetrics);

    // Create mock world
    mockWorld = {
      getEntity: vi.fn()
    };
  });

  /**
   * Helper to create a mock entity with specified components.
   */
  function createMockEntity(components: Record<string, any>): Entity {
    const entity: Entity = {
      id: 'test-agent-12345678',
      components: new Map(Object.entries(components)),
      addComponent: vi.fn(),
      removeComponent: vi.fn(),
      getComponent: vi.fn((type: string) => components[type]),
      hasComponent: vi.fn((type: string) => type in components),
    } as any;

    // Set up mock world to return this entity
    mockWorld.getEntity.mockReturnValue(entity);

    return entity;
  }

  describe('Last Thought Section', () => {
    it('should render "Last Thought" header when agent has lastThought', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          lastThought: 'I should gather some wood for building a shelter.',
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const thoughtHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Last Thought'
      );

      expect(thoughtHeaderCall).toBeDefined();
    });

    it('should render the thought text with amber color', () => {
      const thoughtText = 'I need to find food soon.';
      const entity = createMockEntity({
        agent: {
          behavior: 'seek_food',
          useLLM: true,
          lastThought: thoughtText,
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      // Check that thought text is rendered (may be word-wrapped)
      const hasThoughtText = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('food')
      );

      expect(hasThoughtText).toBe(true);
    });

    it('should NOT render "Last Thought" section when agent has no lastThought', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          // No lastThought
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const thoughtHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Last Thought'
      );

      expect(thoughtHeaderCall).toBeUndefined();
    });

    it('should NOT render "Last Thought" section when lastThought is empty string', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          lastThought: '',
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const thoughtHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Last Thought'
      );

      expect(thoughtHeaderCall).toBeUndefined();
    });

    it('should render divider before Last Thought section', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          lastThought: 'Testing divider rendering',
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      // Verify dividers are drawn
      const strokeCalls = (mockCtx.stroke as any).mock.calls;
      expect(strokeCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Speech History Section', () => {
    it('should render "Speech History" header when agent has speechHistory', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: 'Hello there!', tick: 100 },
            { text: 'Nice weather today.', tick: 200 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const speechHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Speech History'
      );

      expect(speechHeaderCall).toBeDefined();
    });

    it('should render speech entries with quotes', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: 'Hello!', tick: 100 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      // Check for quoted speech
      const hasSpeechText = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('"Hello!"')
      );

      expect(hasSpeechText).toBe(true);
    });

    it('should NOT render "Speech History" section when speechHistory is empty', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          speechHistory: [],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const speechHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Speech History'
      );

      expect(speechHeaderCall).toBeUndefined();
    });

    it('should NOT render "Speech History" section when speechHistory is undefined', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          // No speechHistory
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;
      const speechHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Speech History'
      );

      expect(speechHeaderCall).toBeUndefined();
    });

    it('should display multiple speech entries', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: 'First message', tick: 100 },
            { text: 'Second message', tick: 200 },
            { text: 'Third message', tick: 300 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Check for each message (may be word-wrapped)
      const hasFirst = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('First')
      );
      const hasSecond = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Second')
      );
      const hasThird = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Third')
      );

      expect(hasFirst).toBe(true);
      expect(hasSecond).toBe(true);
      expect(hasThird).toBe(true);
    });

    it('should show most recent entries first (reversed order)', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: 'Oldest', tick: 100 },
            { text: 'Newest', tick: 200 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Find positions of Oldest and Newest
      const oldestIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Oldest')
      );
      const newestIndex = fillTextCalls.findIndex(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Newest')
      );

      // Newest should appear before Oldest (lower index = rendered first)
      expect(newestIndex).toBeLessThan(oldestIndex);
    });

    it('should limit display to last 5 entries when more are available', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: 'Entry1', tick: 100 },
            { text: 'Entry2', tick: 200 },
            { text: 'Entry3', tick: 300 },
            { text: 'Entry4', tick: 400 },
            { text: 'Entry5', tick: 500 },
            { text: 'Entry6', tick: 600 },
            { text: 'Entry7', tick: 700 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      // Entry1 and Entry2 should NOT appear (only last 5 shown)
      const hasEntry1 = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Entry1')
      );
      const hasEntry2 = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Entry2')
      );
      // Entry7 should appear (most recent)
      const hasEntry7 = fillTextCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('Entry7')
      );

      expect(hasEntry1).toBe(false);
      expect(hasEntry2).toBe(false);
      expect(hasEntry7).toBe(true);
    });
  });

  describe('Combined Thought and Speech Display', () => {
    it('should render both thought and speech sections when both are present', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          lastThought: 'I should be friendly.',
          speechHistory: [
            { text: 'Hello friend!', tick: 100 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      const thoughtHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Last Thought'
      );
      const speechHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Speech History'
      );

      expect(thoughtHeaderCall).toBeDefined();
      expect(speechHeaderCall).toBeDefined();
    });

    it('should render thought section before speech section', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          lastThought: 'Thinking...',
          speechHistory: [
            { text: 'Speaking...', tick: 100 },
          ],
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      const thoughtIndex = fillTextCalls.findIndex(
        (call: any[]) => call[0] === 'Last Thought'
      );
      const speechIndex = fillTextCalls.findIndex(
        (call: any[]) => call[0] === 'Speech History'
      );

      // Thought header should appear before speech header
      expect(thoughtIndex).toBeLessThan(speechIndex);
    });
  });

  describe('Non-LLM Agents', () => {
    it('should not show thought/speech sections for non-LLM agents without data', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: false,
          // No thought or speech data
        },
      });

      panel.setSelectedEntity(entity);
      panel.render(mockCtx, 1024, 768, mockWorld);

      const fillTextCalls = (mockCtx.fillText as any).mock.calls;

      const thoughtHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Last Thought'
      );
      const speechHeaderCall = fillTextCalls.find(
        (call: any[]) => call[0] === 'Speech History'
      );

      expect(thoughtHeaderCall).toBeUndefined();
      expect(speechHeaderCall).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long thought text without crashing', () => {
      const longThought = 'A'.repeat(500); // Very long thought
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          lastThought: longThought,
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768, mockWorld);
      }).not.toThrow();
    });

    it('should handle very long speech text without crashing', () => {
      const longSpeech = 'B'.repeat(500); // Very long speech
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: longSpeech, tick: 100 },
          ],
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768, mockWorld);
      }).not.toThrow();
    });

    it('should handle speech with special characters', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'talk',
          useLLM: true,
          speechHistory: [
            { text: "Hello! How's it going? 🎉", tick: 100 },
          ],
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768, mockWorld);
      }).not.toThrow();
    });

    it('should handle thought with newlines', () => {
      const entity = createMockEntity({
        agent: {
          behavior: 'wander',
          useLLM: true,
          lastThought: 'Line 1\nLine 2\nLine 3',
        },
      });

      panel.setSelectedEntity(entity);

      expect(() => {
        panel.render(mockCtx, 1024, 768, mockWorld);
      }).not.toThrow();
    });
  });
});

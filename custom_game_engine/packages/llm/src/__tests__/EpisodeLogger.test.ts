import { describe, it, expect, beforeEach } from 'vitest';
import { EpisodeLogger } from '../EpisodeLogger';
import type { Episode } from '../EpisodeLogger';

function makeEpisode(overrides: Partial<Omit<Episode, 'id' | 'timestamp'>> = {}): Omit<Episode, 'id' | 'timestamp'> {
  return {
    agentId: 'agent-1',
    layer: 'executor',
    promptHash: 'aabbccdd',
    promptLength: 100,
    actionType: 'gather',
    action: 'gather',
    durationMs: 250,
    cacheHit: false,
    ...overrides,
  };
}

describe('EpisodeLogger', () => {
  let logger: EpisodeLogger;

  beforeEach(() => {
    logger = EpisodeLogger.getInstance();
    logger.clear();
    logger.setEnabled(true);
  });

  describe('log', () => {
    it('adds episodes to the buffer', () => {
      logger.log(makeEpisode());
      expect(logger.getEpisodes()).toHaveLength(1);
    });

    it('assigns sequential string IDs', () => {
      logger.log(makeEpisode());
      logger.log(makeEpisode());
      const episodes = logger.getEpisodes();
      expect(episodes[0].id).toBe('1');
      expect(episodes[1].id).toBe('2');
    });

    it('sets timestamp automatically', () => {
      const before = Date.now();
      logger.log(makeEpisode());
      const after = Date.now();
      const ep = logger.getEpisodes()[0];
      expect(ep.timestamp).toBeGreaterThanOrEqual(before);
      expect(ep.timestamp).toBeLessThanOrEqual(after);
    });

    it('truncates thinking field to 200 chars', () => {
      const longThinking = 'x'.repeat(300);
      logger.log(makeEpisode({ thinking: longThinking }));
      const ep = logger.getEpisodes()[0];
      expect(ep.thinking).toHaveLength(200);
    });

    it('does not truncate short thinking fields', () => {
      logger.log(makeEpisode({ thinking: 'short thought' }));
      expect(logger.getEpisodes()[0].thinking).toBe('short thought');
    });

    it('does nothing when disabled', () => {
      logger.setEnabled(false);
      logger.log(makeEpisode());
      expect(logger.getEpisodes()).toHaveLength(0);
    });
  });

  describe('ring buffer', () => {
    it('evicts oldest episodes when buffer is full', () => {
      // Log 5001 episodes (max is 5000)
      for (let i = 0; i < 5001; i++) {
        logger.log(makeEpisode({ agentId: `agent-${i}` }));
      }
      const episodes = logger.getEpisodes();
      expect(episodes).toHaveLength(5000);
      // The first episode logged (agent-0) should have been evicted
      expect(episodes[0].agentId).toBe('agent-1');
      // The last one should still be there
      expect(episodes[episodes.length - 1].agentId).toBe('agent-5000');
    });
  });

  describe('getEpisodes', () => {
    it('returns all episodes when no limit', () => {
      logger.log(makeEpisode());
      logger.log(makeEpisode());
      logger.log(makeEpisode());
      expect(logger.getEpisodes()).toHaveLength(3);
    });

    it('respects the limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        logger.log(makeEpisode({ agentId: `agent-${i}` }));
      }
      const recent = logger.getEpisodes(3);
      expect(recent).toHaveLength(3);
      // Should be the most recent (last 3)
      expect(recent[0].agentId).toBe('agent-7');
      expect(recent[2].agentId).toBe('agent-9');
    });
  });

  describe('getMetrics', () => {
    it('counts total episodes', () => {
      logger.log(makeEpisode());
      logger.log(makeEpisode());
      expect(logger.getMetrics().totalEpisodes).toBe(2);
    });

    it('counts episodes by layer', () => {
      logger.log(makeEpisode({ layer: 'autonomic' }));
      logger.log(makeEpisode({ layer: 'talker' }));
      logger.log(makeEpisode({ layer: 'talker' }));
      const metrics = logger.getMetrics();
      expect(metrics.episodesByLayer['autonomic']).toBe(1);
      expect(metrics.episodesByLayer['talker']).toBe(2);
    });

    it('tracks cache hits and misses', () => {
      logger.log(makeEpisode({ cacheHit: true }));
      logger.log(makeEpisode({ cacheHit: false }));
      logger.log(makeEpisode({ cacheHit: true }));
      const metrics = logger.getMetrics();
      expect(metrics.episodesByCacheHit.hit).toBe(2);
      expect(metrics.episodesByCacheHit.miss).toBe(1);
    });

    it('calculates average duration', () => {
      logger.log(makeEpisode({ durationMs: 100 }));
      logger.log(makeEpisode({ durationMs: 300 }));
      expect(logger.getMetrics().averageDurationMs).toBe(200);
    });

    it('returns 0 average duration when no episodes', () => {
      expect(logger.getMetrics().averageDurationMs).toBe(0);
    });

    it('tracks action distribution', () => {
      logger.log(makeEpisode({ actionType: 'gather' }));
      logger.log(makeEpisode({ actionType: 'build' }));
      logger.log(makeEpisode({ actionType: 'gather' }));
      const metrics = logger.getMetrics();
      expect(metrics.actionDistribution['gather']).toBe(2);
      expect(metrics.actionDistribution['build']).toBe(1);
    });
  });

  describe('exportJSONL', () => {
    it('returns empty string when no episodes', () => {
      expect(logger.exportJSONL()).toBe('');
    });

    it('exports valid JSONL with one line per episode', () => {
      logger.log(makeEpisode({ agentId: 'a1' }));
      logger.log(makeEpisode({ agentId: 'a2' }));
      const jsonl = logger.exportJSONL();
      const lines = jsonl.split('\n');
      expect(lines).toHaveLength(2);
      const first = JSON.parse(lines[0]) as Episode;
      const second = JSON.parse(lines[1]) as Episode;
      expect(first.agentId).toBe('a1');
      expect(second.agentId).toBe('a2');
    });

    it('each line is valid JSON containing required fields', () => {
      logger.log(makeEpisode());
      const line = logger.exportJSONL();
      const parsed = JSON.parse(line) as Episode;
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('agentId');
      expect(parsed).toHaveProperty('layer');
      expect(parsed).toHaveProperty('promptHash');
      expect(parsed).toHaveProperty('cacheHit');
    });
  });

  describe('clear', () => {
    it('removes all episodes and resets counter', () => {
      logger.log(makeEpisode());
      logger.log(makeEpisode());
      logger.clear();
      expect(logger.getEpisodes()).toHaveLength(0);
      // After clear, IDs restart from 1
      logger.log(makeEpisode());
      expect(logger.getEpisodes()[0].id).toBe('1');
    });
  });

  describe('setEnabled', () => {
    it('does not log when disabled', () => {
      logger.setEnabled(false);
      logger.log(makeEpisode());
      expect(logger.getEpisodes()).toHaveLength(0);
    });

    it('resumes logging when re-enabled', () => {
      logger.setEnabled(false);
      logger.log(makeEpisode());
      logger.setEnabled(true);
      logger.log(makeEpisode());
      expect(logger.getEpisodes()).toHaveLength(1);
    });
  });
});

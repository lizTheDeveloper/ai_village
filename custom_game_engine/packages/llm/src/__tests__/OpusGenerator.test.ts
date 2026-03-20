/**
 * OpusGenerator tests — TDD for the Eternal Return Opus synthesis pipeline
 *
 * Tests OpusPromptBuilder (prompt construction) and OpusGeneratorService
 * (LLM orchestration + response parsing) without hitting any real LLM.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  OpusPromptBuilder,
  type Passport,
  type PassportSection,
} from '../OpusPromptBuilder.js';
import { OpusGeneratorService } from '../OpusGeneratorService.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECTION_1: PassportSection = {
  gameIndex: 1,
  gameName: 'Precursors',
  themes: ['nurture', 'patience', 'bond'],
  moments: [
    'The party raised every clutch rather than culling the weak',
    'They refused the expansion offer three times',
  ],
};

const SECTION_2: PassportSection = {
  gameIndex: 2,
  gameName: 'The Living Belt',
  themes: ['growth', 'cooperation', 'restraint'],
  moments: [
    'They left the southern valley untouched despite the drought',
    'Every blight was treated with symbiotic root-work, never herbicide',
  ],
};

const SECTION_3: PassportSection = {
  gameIndex: 3,
  gameName: 'Multiverse: The End of Eternity',
  themes: ['nurture', 'memory', 'loss'],
  moments: [
    'The village chose to preserve the elder grove over the new mine',
    'They mourned the passing of Vel-creatures with a yearly ritual',
  ],
};

const SECTION_4: PassportSection = {
  gameIndex: 4,
  gameName: 'Wayfarers',
  themes: ['witness', 'continuity', 'offering'],
  moments: [
    'They inscribed their journey rather than claiming it',
    'The patron chose silence at the moment of binding',
  ],
};

const FULL_PASSPORT: Passport = {
  cycleId: 'cycle-001',
  partyId: 'party-abc',
  sections: [SECTION_1, SECTION_2, SECTION_3, SECTION_4],
};

// ---------------------------------------------------------------------------
// OpusPromptBuilder
// ---------------------------------------------------------------------------

describe('OpusPromptBuilder', () => {
  const builder = new OpusPromptBuilder();

  describe('buildSystemPrompt', () => {
    it('establishes oracular third-person voice', () => {
      const system = builder.buildSystemPrompt();
      expect(system).toContain('third');
      expect(system).toContain('oracle');
    });

    it('instructs not to congratulate or reveal mechanics', () => {
      const system = builder.buildSystemPrompt();
      expect(system.toLowerCase()).toContain('not');
      // Should mention avoiding congratulatory language
      expect(system.toLowerCase()).toMatch(/congratulat|celebrat/);
    });

    it('returns valid JSON instruction', () => {
      const system = builder.buildSystemPrompt();
      expect(system).toContain('JSON');
    });
  });

  describe('buildUserPrompt', () => {
    it('includes all four game names', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      expect(prompt).toContain('Precursors');
      expect(prompt).toContain('The Living Belt');
      expect(prompt).toContain('Multiverse: The End of Eternity');
      expect(prompt).toContain('Wayfarers');
    });

    it('includes themes from all sections', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      // At least some themes present
      expect(prompt).toContain('nurture');
      expect(prompt).toContain('patience');
      expect(prompt).toContain('witness');
    });

    it('includes key moments from all sections', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      expect(prompt).toContain('raised every clutch');
      expect(prompt).toContain('untouched despite the drought');
    });

    it('specifies the 300-600 word length constraint', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      expect(prompt).toMatch(/300.{0,10}600|600.{0,10}300/);
    });

    it('requests JSON output with a narrative field', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      expect(prompt).toContain('"narrative"');
    });

    it('does not include the partyId or cycleId (no mechanical leakage)', () => {
      const prompt = builder.buildUserPrompt(FULL_PASSPORT);
      expect(prompt).not.toContain('cycle-001');
      expect(prompt).not.toContain('party-abc');
    });

    it('works when partyName is provided instead of partyId', () => {
      const passport: Passport = { ...FULL_PASSPORT, partyName: 'The Quiet Ones' };
      const prompt = builder.buildUserPrompt(passport);
      // Party name for narrative flavour is acceptable
      expect(prompt).toContain('The Quiet Ones');
    });
  });
});

// ---------------------------------------------------------------------------
// OpusGeneratorService — response parsing
// ---------------------------------------------------------------------------

describe('OpusGeneratorService — parseResponse', () => {
  // Access private method via cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = OpusGeneratorService.getInstance() as any;

  const cycleKey = 'cycle-001';

  it('parses a well-formed JSON response into an OpusResult', () => {
    const raw = JSON.stringify({
      narrative: 'Again and again, without knowing they were answering the same question, they chose nurture over conquest.',
    });
    const result = service.parseResponse(raw, cycleKey);
    expect(result.narrative).toContain('nurture over conquest');
    expect(result.cycleKey).toBe('cycle-001');
    expect(typeof result.wordCount).toBe('number');
  });

  it('parses JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"narrative": "The cycle had been listening."}\n```';
    const result = service.parseResponse(raw, cycleKey);
    expect(result.narrative).toBe('The cycle had been listening.');
  });

  it('throws when narrative field is missing', () => {
    const raw = JSON.stringify({ text: 'some text' });
    expect(() => service.parseResponse(raw, cycleKey)).toThrow();
  });

  it('throws when narrative is empty string', () => {
    const raw = JSON.stringify({ narrative: '' });
    expect(() => service.parseResponse(raw, cycleKey)).toThrow();
  });

  it('computes correct word count', () => {
    const words = Array(350).fill('word').join(' ');
    const raw = JSON.stringify({ narrative: words });
    const result = service.parseResponse(raw, cycleKey);
    expect(result.wordCount).toBe(350);
  });

  it('warns (does not throw) when word count is outside 300-600 range', () => {
    // Short narrative — service should still return a result
    const raw = JSON.stringify({ narrative: 'Too short.' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = service.parseResponse(raw, cycleKey);
    expect(result.narrative).toBe('Too short.');
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// OpusGeneratorService — generate() with mocked proxy
// ---------------------------------------------------------------------------

describe('OpusGeneratorService — generate()', () => {
  it('calls generate on the proxy and returns a parsed OpusResult', async () => {
    const narrative = 'Again and again, without knowing they were answering the same question, they chose nurture over conquest. The belt remembers.';
    const mockProxy = {
      generate: vi.fn().mockResolvedValue({
        text: JSON.stringify({ narrative }),
      }),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const service = OpusGeneratorService.createWithProxy(mockProxy as any);
    const result = await service.generate(FULL_PASSPORT);

    expect(mockProxy.generate).toHaveBeenCalledTimes(1);
    expect(result.narrative).toContain('nurture over conquest');
    expect(result.cycleKey).toBe('cycle-001');
  });

  it('caches the result so a second generate() call skips the LLM', async () => {
    const narrative = 'The cycle had been listening.';
    const mockProxy = {
      generate: vi.fn().mockResolvedValue({ text: JSON.stringify({ narrative }) }),
      isAvailable: vi.fn().mockResolvedValue(true),
    };

    const service = OpusGeneratorService.createWithProxy(mockProxy as any);
    await service.generate(FULL_PASSPORT);
    await service.generate(FULL_PASSPORT);

    expect(mockProxy.generate).toHaveBeenCalledTimes(1);
  });

  it('propagates LLM errors', async () => {
    const mockProxy = {
      generate: vi.fn().mockRejectedValue(new Error('LLM unreachable')),
      isAvailable: vi.fn().mockResolvedValue(false),
    };

    const service = OpusGeneratorService.createWithProxy(mockProxy as any);
    await expect(service.generate(FULL_PASSPORT)).rejects.toThrow('LLM unreachable');
  });

  it('returns isAvailable() from the proxy', async () => {
    const mockProxy = {
      generate: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(false),
    };

    const service = OpusGeneratorService.createWithProxy(mockProxy as any);
    const available = await service.isAvailable();
    expect(available).toBe(false);
  });
});

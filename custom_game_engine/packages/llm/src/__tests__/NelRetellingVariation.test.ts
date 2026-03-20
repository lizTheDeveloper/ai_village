/**
 * NelRetellingVariation tests — TDD for the NEL retelling variation engine
 *
 * Acceptance criteria (MUL-2559):
 * - At least 3 demonstrably distinct NEL retelling variations based on signal_artifact input
 * - No player-facing mention of "the signal", "transfer", or "data" in generated text
 * - Integration test: provide 3 signal_artifacts → verify 3 distinct retelling openers
 * - Works with existing Passport Transformer CotB→NEL output (NelWorldConfig type)
 */

import { describe, it, expect } from 'vitest';
import {
  NelRetellingVariationEngine,
  type RetellingVariation,
} from '../NelRetellingVariationEngine.js';
import type {
  SignalArtifact,
  NelWorldConfig,
  MysteryDepth,
} from '../NelRetellingTypes.js';

// ---------------------------------------------------------------------------
// Fixtures — 3 signal_artifacts covering all mystery_depth values
// ---------------------------------------------------------------------------

const SURFACE_ARTIFACT: SignalArtifact = {
  mystery_depth: 'surface',
  resonance_themes: ['isolation'],
  cycleId: 'cycle-test-surface',
};

const LAYERED_ARTIFACT: SignalArtifact = {
  mystery_depth: 'layered',
  resonance_themes: ['emergence'],
  cycleId: 'cycle-test-layered',
};

const DEEP_ARTIFACT: SignalArtifact = {
  mystery_depth: 'deep',
  resonance_themes: ['defiance'],
  cycleId: 'cycle-test-deep',
};

const ALL_ARTIFACTS = [SURFACE_ARTIFACT, LAYERED_ARTIFACT, DEEP_ARTIFACT];

// ---------------------------------------------------------------------------
// NelWorldConfig fixtures
// ---------------------------------------------------------------------------

function makeConfig(artifact: SignalArtifact, retelling: number = 1): NelWorldConfig {
  return {
    signalArtifact: artifact,
    retellingNumber: retelling,
    cycleId: artifact.cycleId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NelRetellingVariationEngine', () => {
  const engine = new NelRetellingVariationEngine();

  // -----------------------------------------------------------------------
  // Core: 3 distinct variations
  // -----------------------------------------------------------------------

  describe('produces 3+ distinct retelling variations', () => {
    let variations: RetellingVariation[];

    // Generate all 3 variations once
    variations = ALL_ARTIFACTS.map(a => engine.generateFromArtifact(a));

    it('produces exactly 3 variations from 3 artifacts', () => {
      expect(variations).toHaveLength(3);
    });

    it('each variation has a non-empty opening', () => {
      for (const v of variations) {
        expect(v.opening.length).toBeGreaterThan(50);
      }
    });

    it('all 3 openings are distinct', () => {
      const openings = new Set(variations.map(v => v.opening));
      expect(openings.size).toBe(3);
    });

    it('openings differ substantially (not just minor word swaps)', () => {
      // Each opening should share fewer than 50% of its words with any other
      const wordSets = variations.map(v =>
        new Set(v.opening.toLowerCase().split(/\s+/).filter(w => w.length > 3))
      );

      for (let i = 0; i < wordSets.length; i++) {
        for (let j = i + 1; j < wordSets.length; j++) {
          const setA = wordSets[i]!;
          const setB = wordSets[j]!;
          const intersection = new Set([...setA].filter(w => setB.has(w)));
          const overlapRatio = intersection.size / Math.min(setA.size, setB.size);
          expect(overlapRatio).toBeLessThan(0.5);
        }
      }
    });

    it('each variation carries its depth key', () => {
      const depths: MysteryDepth[] = ['surface', 'layered', 'deep'];
      for (let i = 0; i < variations.length; i++) {
        expect(variations[i]!.depthKey).toBe(depths[i]);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Tone directives by mystery_depth
  // -----------------------------------------------------------------------

  describe('tone directives vary by mystery_depth', () => {
    it('surface → observational, matter-of-fact', () => {
      const v = engine.generateFromArtifact(SURFACE_ARTIFACT);
      expect(v.toneDirectives.some(d => d.toLowerCase().includes('observational'))).toBe(true);
      expect(v.toneDirectives.some(d => d.toLowerCase().includes('matter-of-fact'))).toBe(true);
    });

    it('layered → patterns, deja vu', () => {
      const v = engine.generateFromArtifact(LAYERED_ARTIFACT);
      expect(v.toneDirectives.some(d => d.toLowerCase().includes('pattern'))).toBe(true);
    });

    it('deep → disorienting, estranged', () => {
      const v = engine.generateFromArtifact(DEEP_ARTIFACT);
      expect(v.toneDirectives.some(d => d.toLowerCase().includes('disorienting'))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Thematic emphasis by resonance_theme
  // -----------------------------------------------------------------------

  describe('thematic emphasis varies by resonance_theme', () => {
    it('isolation → solitude, individual', () => {
      const v = engine.generateFromArtifact(SURFACE_ARTIFACT); // isolation
      expect(v.thematicEmphasis.some(e => e.includes('solitude'))).toBe(true);
    });

    it('emergence → collective, arising', () => {
      const v = engine.generateFromArtifact(LAYERED_ARTIFACT); // emergence
      expect(v.thematicEmphasis.some(e => e.includes('collective'))).toBe(true);
    });

    it('defiance → friction, resistance', () => {
      const v = engine.generateFromArtifact(DEEP_ARTIFACT); // defiance
      expect(v.thematicEmphasis.some(e => e.includes('friction'))).toBe(true);
    });

    it('supports multiple resonance themes', () => {
      const multiArtifact: SignalArtifact = {
        mystery_depth: 'layered',
        resonance_themes: ['isolation', 'defiance'],
        cycleId: 'cycle-multi',
      };
      const v = engine.generateFromArtifact(multiArtifact);
      // Should have emphasis from both themes
      expect(v.thematicEmphasis.some(e => e.includes('solitude'))).toBe(true);
      expect(v.thematicEmphasis.some(e => e.includes('friction'))).toBe(true);
      expect(v.resonanceKeys).toEqual(['isolation', 'defiance']);
    });
  });

  // -----------------------------------------------------------------------
  // Forbidden words
  // -----------------------------------------------------------------------

  describe('forbidden word validation', () => {
    it('all generated openings are clean', () => {
      for (const artifact of ALL_ARTIFACTS) {
        const v = engine.generateFromArtifact(artifact);
        const violations = engine.validateText(v.opening);
        expect(violations).toEqual([]);
      }
    });

    it('detects forbidden words in arbitrary text', () => {
      expect(engine.validateText('The signal was clear')).toEqual(['the signal']);
      expect(engine.validateText('data transfer complete')).toEqual(['transfer', 'data']);
      expect(engine.validateText('A clean story')).toEqual([]);
    });

    it('all tone directives are clean', () => {
      for (const artifact of ALL_ARTIFACTS) {
        const v = engine.generateFromArtifact(artifact);
        for (const d of v.toneDirectives) {
          expect(engine.validateText(d)).toEqual([]);
        }
      }
    });

    it('system prompts contain no forbidden words', () => {
      for (const artifact of ALL_ARTIFACTS) {
        const v = engine.generateFromArtifact(artifact);
        const systemPrompt = engine.buildRetellingSystemPrompt(v);
        expect(engine.validateText(systemPrompt)).toEqual([]);
      }
    });
  });

  // -----------------------------------------------------------------------
  // NelWorldConfig integration
  // -----------------------------------------------------------------------

  describe('works with NelWorldConfig', () => {
    it('generateVariation accepts NelWorldConfig and produces correct variation', () => {
      const config = makeConfig(DEEP_ARTIFACT, 3);
      const v = engine.generateVariation(config);
      expect(v.depthKey).toBe('deep');
      expect(v.resonanceKeys).toEqual(['defiance']);
      expect(v.opening).toBeTruthy();
    });

    it('same artifact always produces same variation (deterministic)', () => {
      const v1 = engine.generateFromArtifact(LAYERED_ARTIFACT);
      const v2 = engine.generateFromArtifact(LAYERED_ARTIFACT);
      expect(v1.opening).toBe(v2.opening);
      expect(v1.toneDirectives).toEqual(v2.toneDirectives);
      expect(v1.thematicEmphasis).toEqual(v2.thematicEmphasis);
    });
  });

  // -----------------------------------------------------------------------
  // LLM prompt construction
  // -----------------------------------------------------------------------

  describe('LLM prompt construction', () => {
    it('system prompt includes tone directives', () => {
      const v = engine.generateFromArtifact(SURFACE_ARTIFACT);
      const prompt = engine.buildRetellingSystemPrompt(v);
      expect(prompt).toContain('Observational');
    });

    it('system prompt includes thematic emphasis when present', () => {
      const v = engine.generateFromArtifact(LAYERED_ARTIFACT);
      const prompt = engine.buildRetellingSystemPrompt(v);
      expect(prompt).toContain('collective patterns');
    });

    it('user prompt includes the opening passage', () => {
      const v = engine.generateFromArtifact(DEEP_ARTIFACT);
      const prompt = engine.buildRetellingUserPrompt(v, 3);
      expect(prompt).toContain(v.opening);
      expect(prompt).toContain('retelling 3 of 6');
    });

    it('user prompt requests JSON continuation', () => {
      const v = engine.generateFromArtifact(SURFACE_ARTIFACT);
      const prompt = engine.buildRetellingUserPrompt(v, 1);
      expect(prompt).toContain('"continuation"');
    });
  });

  // -----------------------------------------------------------------------
  // Integration test: 3 artifacts → 3 distinct openers (acceptance criteria)
  // -----------------------------------------------------------------------

  describe('ACCEPTANCE: 3 signal_artifacts → 3 distinct retelling openers', () => {
    const configs = [
      makeConfig(SURFACE_ARTIFACT, 1),
      makeConfig(LAYERED_ARTIFACT, 2),
      makeConfig(DEEP_ARTIFACT, 3),
    ];

    const variations = configs.map(c => engine.generateVariation(c));

    it('produces 3 variations', () => {
      expect(variations).toHaveLength(3);
    });

    it('all 3 openings are textually distinct', () => {
      const set = new Set(variations.map(v => v.opening));
      expect(set.size).toBe(3);
    });

    it('surface opening is observational', () => {
      const opening = variations[0]!.opening;
      // Surface: "exactly as they remembered", matter-of-fact
      expect(opening).toContain('exactly as they remembered');
    });

    it('layered opening suggests patterns', () => {
      const opening = variations[1]!.opening;
      // Layered: "patterns in the shallows"
      expect(opening).toContain('patterns');
    });

    it('deep opening is disorienting', () => {
      const opening = variations[2]!.opening;
      // Deep: "led somewhere it had not led before"
      expect(opening).toContain('had not led before');
    });

    it('none contain forbidden words', () => {
      for (const v of variations) {
        expect(engine.validateText(v.opening)).toEqual([]);
      }
    });

    it('variations detectable by comparing across cycles', () => {
      // Players comparing retellings should notice the tonal differences
      // Verify each has a distinct first sentence
      const firstSentences = variations.map(v =>
        v.opening.split('.')[0]!.trim()
      );
      const uniqueFirstSentences = new Set(firstSentences);
      expect(uniqueFirstSentences.size).toBe(3);
    });
  });
});

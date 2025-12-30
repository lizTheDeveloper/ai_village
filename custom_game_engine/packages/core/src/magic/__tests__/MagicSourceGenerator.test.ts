/**
 * Tests for magic source and resource pool generation
 */

import { describe, it, expect } from 'vitest';
import {
  // Example paradigms
  generateAcademicSource,
  generateDivineSource,
  generateBloodSource,
  generateBreathSource,
  generateEmotionalSource,
  generatePactSource,
  generateNameSource,
  generateRuneSource,

  // Animist paradigms
  generateAllomancySource,
  generateShintoSource,
  generateSympathySource,
  generateDaemonSource,
  generateDreamSource,
  generateSongSource,

  // Whimsical paradigms
  generateTalentSource,
  generateNarrativeSource,
  generatePunSource,
  generateWildSource,

  // Null/Anti-magic paradigms
  generateNullSource,
  generateDeadSource,
  generateAntiSource,
  generateInvertedSource,
  generateTechSupremacySource,
  generateRationalSource,
  generateSealedSource,
  generateDivineProhibitionSource,
  generateDivineMonopolySource,

  // Hybrid paradigms
  generateTheurgySource,
  generateHemomancySource,
  generateNamebreathSource,

  // Dimensional paradigms
  generateDimensionSource,
  generateEscalationSource,
  generateCorruptionSource,

  // Pool management
  spendFromPool,
  restoreToPool,
  regeneratePool,
  getPoolPercentage,
  calculateBasePoolSize,
} from '../MagicSourceGenerator.js';

describe('MagicSourceGenerator', () => {
  describe('Source Generation', () => {
    it('should generate academic mana source', () => {
      const { source, pool } = generateAcademicSource(1);

      expect(source.id).toBe('academic-source');
      expect(source.name).toBe('Mana Pool');
      expect(source.type).toBe('internal');
      expect(source.regeneration).toBe('passive');
      expect(source.storable).toBe(true);

      expect(pool).not.toBeNull();
      expect(pool!.paradigmId).toBe('academic');
      expect(pool!.current).toBeGreaterThan(0);
      expect(pool!.maximum).toBeGreaterThan(0);
      expect(pool!.autoRegen).toBe(true);
    });

    it('should generate divine favor source', () => {
      const { source, pool } = generateDivineSource(1);

      expect(source.name).toBe('Divine Favor');
      expect(source.type).toBe('divine');
      expect(source.regeneration).toBe('prayer');
      expect(source.storable).toBe(false);
      expect(source.detectability).toBe('beacon');

      expect(pool).not.toBeNull();
      expect(pool!.autoRegen).toBe(false); // Requires prayer
      expect(pool!.regenConditions?.requiresPrayer).toBe(true);
    });

    it('should generate breath source with slow regen', () => {
      const { source, pool } = generateBreathSource(1);

      expect(source.name).toBe('Breath');
      expect(source.type).toBe('internal');
      expect(source.transferable).toBe(true);
      expect(source.regenRate).toBeLessThan(0.1); // Very slow regen

      expect(pool).not.toBeNull();
    });

    it('should generate emotional source', () => {
      const { source, pool } = generateEmotionalSource(1);

      expect(source.name).toBe('Emotional Energy');
      expect(source.type).toBe('emotional');
      expect(source.storable).toBe(true);
      expect(source.transferable).toBe(true);
      expect(source.stealable).toBe(true);
    });

    it('should generate name source with no pool', () => {
      const { source, pool } = generateNameSource(1);

      expect(source.name).toBe('Known Names');
      expect(source.type).toBe('knowledge');
      expect(pool).toBeNull(); // Knowledge doesn't have a pool
    });
  });

  describe('Pool Size Scaling', () => {
    it('should increase pool size with level', () => {
      const level1Pool = calculateBasePoolSize('internal', 1);
      const level5Pool = calculateBasePoolSize('internal', 5);
      const level10Pool = calculateBasePoolSize('internal', 10);

      expect(level5Pool).toBeGreaterThan(level1Pool);
      expect(level10Pool).toBeGreaterThan(level5Pool);
    });

    it('should apply multiplier correctly', () => {
      const basePool = calculateBasePoolSize('internal', 1, 1.0);
      const doublePool = calculateBasePoolSize('internal', 1, 2.0);

      expect(doublePool).toBeCloseTo(basePool * 2, 1);
    });
  });

  describe('Pool Management', () => {
    it('should spend from pool successfully', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      const initial = pool!.current;
      const { success, remaining } = spendFromPool(pool!, 20);

      expect(success).toBe(true);
      expect(remaining).toBe(initial - 20);
      expect(pool!.current).toBe(initial - 20);
    });

    it('should fail to spend more than available', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      const initial = pool!.current;
      const { success, remaining } = spendFromPool(pool!, initial + 100);

      expect(success).toBe(false);
      expect(remaining).toBe(initial);
      expect(pool!.current).toBe(initial); // Unchanged
    });

    it('should restore to pool correctly', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      // Spend some
      spendFromPool(pool!, 50);
      const afterSpend = pool!.current;

      // Restore
      const { newAmount } = restoreToPool(pool!, 30);

      expect(newAmount).toBe(afterSpend + 30);
      expect(pool!.current).toBe(afterSpend + 30);
    });

    it('should cap restore at maximum', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      const max = pool!.maximum;

      // Try to restore beyond max
      const { newAmount, overflow } = restoreToPool(pool!, 9999);

      expect(newAmount).toBe(max);
      expect(overflow).toBeGreaterThan(0);
      expect(pool!.current).toBe(max);
    });

    it('should calculate pool percentage correctly', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      expect(getPoolPercentage(pool!)).toBeCloseTo(100, 1);

      spendFromPool(pool!, pool!.maximum / 2);
      expect(getPoolPercentage(pool!)).toBeCloseTo(50, 1);

      spendFromPool(pool!, pool!.maximum / 2);
      expect(getPoolPercentage(pool!)).toBeCloseTo(0, 1);
    });
  });

  describe('Regeneration', () => {
    it('should regenerate auto-regen pools', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      // Spend some
      spendFromPool(pool!, 50);
      const afterSpend = pool!.current;

      // Regenerate (1 second)
      const regenAmount = regeneratePool(pool!, 1.0);

      expect(regenAmount).toBeGreaterThan(0);
      expect(pool!.current).toBeGreaterThan(afterSpend);
    });

    it('should not regenerate without conditions met', () => {
      const { pool } = generateDivineSource(1);
      expect(pool).not.toBeNull();

      spendFromPool(pool!, 50);
      const afterSpend = pool!.current;

      // Try to regen without praying
      const regenAmount = regeneratePool(pool!, 1.0);

      expect(regenAmount).toBe(0);
      expect(pool!.current).toBe(afterSpend); // No change
    });

    it('should regenerate when conditions are met', () => {
      const { pool } = generateDivineSource(1);
      expect(pool).not.toBeNull();

      spendFromPool(pool!, 50);
      const afterSpend = pool!.current;

      // Regen while praying
      const regenAmount = regeneratePool(pool!, 1.0, { isPraying: true });

      expect(regenAmount).toBeGreaterThan(0);
      expect(pool!.current).toBeGreaterThan(afterSpend);
    });

    it('should scale regen with delta time', () => {
      const { pool } = generateAcademicSource(1);
      expect(pool).not.toBeNull();

      spendFromPool(pool!, pool!.maximum / 2);

      const regen1sec = regeneratePool(pool!, 1.0);
      spendFromPool(pool!, pool!.maximum / 2);
      const regen5sec = regeneratePool(pool!, 5.0);

      expect(regen5sec).toBeCloseTo(regen1sec * 5, 1);
    });
  });

  describe('Paradigm-Specific Behavior', () => {
    it('should generate blood source with transfer capability', () => {
      const { source } = generateBloodSource(1);

      expect(source.transferable).toBe(true);
      expect(source.stealable).toBe(true);
      expect(source.detectability).toBe('obvious');
    });

    it('should generate pact source without transfer', () => {
      const { source } = generatePactSource(1);

      expect(source.transferable).toBe(false);
      expect(source.storable).toBe(false);
    });

    it('should generate rune source with storable power', () => {
      const { source } = generateRuneSource(1);

      expect(source.storable).toBe(true);
      expect(source.detectability).toBe('obvious');
    });
  });

  describe('Animist Paradigms', () => {
    it('should generate allomancy source (material-based, no pool)', () => {
      const { source, pool } = generateAllomancySource(1);

      expect(source.name).toBe('Metal Reserves');
      expect(source.type).toBe('material');
      expect(source.storable).toBe(true);
      expect(source.transferable).toBe(false);
      expect(pool).toBeNull(); // Material sources don't have pools
    });

    it('should generate shinto source (kami favor)', () => {
      const { source, pool } = generateShintoSource(1);

      expect(source.name).toBe('Kami Favor');
      expect(source.type).toBe('ancestral');
      expect(source.storable).toBe(false);
      expect(source.detectability).toBe('subtle');

      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBeGreaterThan(0); // Has enhanced regen
    });

    it('should generate sympathy source (alar)', () => {
      const { source, pool } = generateSympathySource(1);

      expect(source.name).toBe('Alar');
      expect(source.type).toBe('internal');
      expect(source.detectability).toBe('undetectable');
      expect(source.transferable).toBe(false);
    });

    it('should generate daemon source (soul bond)', () => {
      const { source, pool } = generateDaemonSource(1);

      expect(source.name).toBe('Soul Bond');
      expect(source.type).toBe('internal');
      expect(source.detectability).toBe('obvious');

      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBeGreaterThan(1.0); // Enhanced regen from strong bond
    });

    it('should generate dream source (lucidity)', () => {
      const { source, pool } = generateDreamSource(1);

      expect(source.name).toBe('Lucidity');
      expect(source.type).toBe('internal');
      expect(source.detectability).toBe('undetectable');
      expect(source.transferable).toBe(true);

      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBeLessThan(0.2); // Very slow, dream-only regen
    });

    it('should generate song source (harmonic energy)', () => {
      const { source, pool } = generateSongSource(1);

      expect(source.name).toBe('Harmonic Energy');
      expect(source.type).toBe('internal');
      expect(source.detectability).toBe('obvious');
      expect(source.transferable).toBe(true);
      expect(source.stealable).toBe(false);
    });
  });

  describe('Whimsical Paradigms', () => {
    it('should generate talent source (innate, always available)', () => {
      const { source, pool } = generateTalentSource(1);

      expect(source.name).toBe('Innate Talent');
      expect(source.type).toBe('internal');
      expect(source.storable).toBe(false);
      expect(source.transferable).toBe(false);

      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBe(0); // Always available
    });

    it('should generate narrative source (story power)', () => {
      const { source, pool } = generateNarrativeSource(1);

      expect(source.name).toBe('Narrative Weight');
      expect(source.type).toBe('social');
      expect(source.detectability).toBe('undetectable');
      expect(source.transferable).toBe(true);
    });

    it('should generate pun source (wordplay energy)', () => {
      const { source, pool } = generatePunSource(1);

      expect(source.name).toBe('Punergy');
      expect(source.type).toBe('ambient');
      expect(source.detectability).toBe('obvious');
    });

    it('should generate wild source (chaos magic)', () => {
      const { source, pool } = generateWildSource(1);

      expect(source.name).toBe('Chaotic Essence');
      expect(source.type).toBe('ambient');
      expect(source.storable).toBe(false);
      expect(source.detectability).toBe('obvious');
    });
  });

  describe('Null/Anti-Magic Paradigms', () => {
    it('should generate null source (no magic)', () => {
      const { source, pool } = generateNullSource(1);

      expect(source.name).toBe('Nonexistent');
      expect(pool).toBeNull();
    });

    it('should generate dead source (depleted magic)', () => {
      const { source, pool } = generateDeadSource(1);

      expect(source.name).toBe('Depleted Mana');
      expect(source.type).toBe('ambient');
      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBe(0); // No regen
    });

    it('should generate anti source (negative regen)', () => {
      const { source, pool } = generateAntiSource(1);

      expect(source.name).toBe('The Anti');
      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBe(-0.1); // NEGATIVE regen
    });

    it('should generate inverted source (backwards magic)', () => {
      const { source, pool } = generateInvertedSource(1);

      expect(source.name).toBe('Inverted Mana');
      expect(source.type).toBe('internal');
      expect(source.storable).toBe(true);
    });

    it('should generate tech supremacy source', () => {
      const { source, pool } = generateTechSupremacySource(1);

      expect(source.name).toBe('Residual Mana');
      expect(source.detectability).toBe('undetectable');
      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBe(0);
    });

    it('should generate rational source (physics blocks magic)', () => {
      const { source, pool } = generateRationalSource(1);

      expect(source.name).toBe('Impossible');
      expect(pool).toBeNull();
    });

    it('should generate sealed source', () => {
      const { source, pool } = generateSealedSource(1);

      expect(source.name).toBe('Sealed Power');
      expect(pool).not.toBeNull();
      expect(pool!.regenRate).toBe(0);
    });

    it('should generate divine prohibition source', () => {
      const { source, pool } = generateDivineProhibitionSource(1);

      expect(source.name).toBe('Forbidden Power');
      expect(source.detectability).toBe('beacon'); // Gods can see it!
      expect(source.storable).toBe(true);
    });

    it('should generate divine monopoly source', () => {
      const { source, pool } = generateDivineMonopolySource(1);

      expect(source.name).toBe('Divine Essence');
      expect(source.type).toBe('divine');
      expect(source.detectability).toBe('beacon');
    });
  });

  describe('Hybrid Paradigms', () => {
    it('should generate theurgy source (divine + academic)', () => {
      const { source, pool } = generateTheurgySource(1);

      expect(source.name).toBe('Theurgic Power');
      expect(source.type).toBe('divine');
      expect(source.storable).toBe(true);
      expect(source.detectability).toBe('subtle');
    });

    it('should generate hemomancy source (blood + pact)', () => {
      const { source, pool } = generateHemomancySource(1);

      expect(source.name).toBe('Hemomantic Power');
      expect(source.type).toBe('void');
      expect(source.detectability).toBe('beacon');
    });

    it('should generate namebreath source (names + breath)', () => {
      const { source, pool } = generateNamebreathSource(1);

      expect(source.name).toBe('Living Word');
      expect(source.type).toBe('knowledge');
      expect(pool).toBeNull(); // Knowledge type has no pool
    });
  });

  describe('Dimensional Paradigms', () => {
    it('should generate dimension source (hyperspatial energy)', () => {
      const { source, pool } = generateDimensionSource(1);

      expect(source.name).toBe('Hyperspatial Energy');
      expect(source.type).toBe('ambient');
      expect(source.storable).toBe(true);
      expect(source.detectability).toBe('subtle');
    });

    it('should generate escalation source (mundane energy)', () => {
      const { source, pool } = generateEscalationSource(1);

      expect(source.name).toBe('Mundane Energy');
      expect(source.type).toBe('ambient');
      expect(source.detectability).toBe('undetectable');
    });

    it('should generate corruption source (corrupting power)', () => {
      const { source, pool } = generateCorruptionSource(1);

      expect(source.name).toBe('Corruption');
      expect(source.type).toBe('void');
      expect(source.storable).toBe(true);
    });
  });

  describe('UI Properties', () => {
    it('should assign colors to pools', () => {
      const { pool: manaPool } = generateAcademicSource(1);
      const { pool: favorPool } = generateDivineSource(1);
      const { pool: bloodPool } = generateBloodSource(1);

      expect(manaPool?.color).toBeDefined();
      expect(favorPool?.color).toBeDefined();
      expect(bloodPool?.color).toBeDefined();

      // Should have different colors
      expect(manaPool?.color).not.toBe(favorPool?.color);
      expect(favorPool?.color).not.toBe(bloodPool?.color);
    });

    it('should assign icons to pools', () => {
      const { pool } = generateAcademicSource(1);

      expect(pool?.icon).toBeDefined();
      expect(pool?.icon).toBe('✨');
    });
  });
});

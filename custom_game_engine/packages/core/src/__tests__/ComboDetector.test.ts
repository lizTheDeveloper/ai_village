/**
 * Tests for Magic Combo Detection System
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeCombo,
  isGameBreaking,
  getRecommendedParadigmLimit,
  generateComboWarning,
} from '../magic/ComboDetector';
import { createMagicComponent } from '../components/MagicComponent';

describe('ComboDetector - Economy Breakers', () => {
  it('should detect Commerce + Belief price manipulation', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['commerce', 'belief'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.length).toBeGreaterThan(0);
    expect(analysis.threats.some(t => t.threat === 'Price Manipulation Loop')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'critical')).toBe(true);
  });

  it('should detect Debt + Commerce + Belief apocalyptic combo', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['debt', 'commerce', 'belief'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
    expect(analysis.threats.some(t => t.threat === 'Total Economic Control')).toBe(true);
    expect(analysis.riskScore).toBeGreaterThan(50);
  });

  it('should detect Commerce + Luck guaranteed profits', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['commerce', 'luck'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Guaranteed Trading Success')).toBe(true);
  });

  it('should detect Craft + Commerce value multiplication', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['craft', 'commerce'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Value Multiplication Exploit')).toBe(true);
  });
});

describe('ComboDetector - Time Manipulation', () => {
  it('should detect Age + Seasonal temporal acceleration', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['age', 'seasonal'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Temporal Acceleration')).toBe(true);
  });

  it('should detect Seasonal + Lunar + Age chronos mode', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['seasonal', 'lunar', 'age'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
    expect(analysis.threats.some(t => t.threat === 'Total Temporal Control')).toBe(true);
  });

  it('should detect Paradox + Age causality violation', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox', 'age'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Causality Violation')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
  });
});

describe('ComboDetector - Reality Breakers', () => {
  it('should detect Dream + Paradox reality blur', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['dream', 'paradox'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Reality/Dream Blur')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
  });

  it('should detect Bureaucratic + Paradox physics legislation', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['bureaucratic', 'paradox'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Physics Legislation')).toBe(true);
  });

  it('should detect Belief + Dream mass hallucination', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['belief', 'dream'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Mass Hallucination')).toBe(true);
  });

  it('should detect Silence + Paradox void cascade', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['silence', 'paradox'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Void Cascade')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
  });
});

describe('ComboDetector - Immortality Loops', () => {
  it('should detect Paradox + Consumption death reversal', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox', 'consumption'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Death Reversal Loop')).toBe(true);
  });

  it('should detect Age + Consumption age drain', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['age', 'consumption'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Age Drain Immortality')).toBe(true);
  });

  it('should detect Dream + Consumption dream vampire', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['dream', 'consumption'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Dream Feeding')).toBe(true);
  });
});

describe('ComboDetector - Mind Control', () => {
  it('should detect Song + Belief memetic propaganda', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['song', 'belief'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Memetic Propaganda')).toBe(true);
  });

  it('should detect Belief + Bureaucratic thought police', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['belief', 'bureaucratic'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Mandatory Beliefs')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
  });

  it('should detect Dream + Song sleep programming', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['dream', 'song'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Sleep Programming')).toBe(true);
  });
});

describe('ComboDetector - Duplication', () => {
  it('should detect Sympathy + Craft sympathetic enhancement', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['sympathy', 'craft'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Sympathetic Enhancement')).toBe(true);
  });

  it('should detect Echo + Craft enhancement echo', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['echo', 'craft'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Enhancement Echo')).toBe(true);
  });

  it('should detect Sympathy + Echo network apocalypse', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['sympathy', 'echo'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Sympathetic Echo Network')).toBe(true);
    expect(analysis.threats.some(t => t.level === 'apocalyptic')).toBe(true);
  });

  it('should detect Echo + Academic attack echo chain', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['echo', 'academic'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Attack Echo Chain')).toBe(true);
  });
});

describe('ComboDetector - Power Multipliers', () => {
  it('should detect Lunar + Seasonal optimal conditions', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['lunar', 'seasonal'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Optimal Conditions')).toBe(true);
  });

  it('should detect Consumption + Craft resource loop', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['consumption', 'craft'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Resource Consumption Loop')).toBe(true);
  });

  it('should detect Game + Luck double RNG manipulation', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['game', 'luck'];

    const analysis = analyzeCombo(mage);

    expect(analysis.threats.some(t => t.threat === 'Double RNG Manipulation')).toBe(true);
  });
});

describe('ComboDetector - Risk Scoring', () => {
  it('should give low risk score for safe combos', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['academic', 'divine'];

    const analysis = analyzeCombo(mage);

    expect(analysis.riskScore).toBeLessThan(30);
  });

  it('should give high risk score for dangerous combos', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox', 'bureaucratic', 'silence'];

    const analysis = analyzeCombo(mage);

    expect(analysis.riskScore).toBeGreaterThan(70);
  });

  it('should cap risk score at 100', () => {
    const mage = createMagicComponent();
    // All the most dangerous paradigms
    mage.knownParadigmIds = [
      'paradox', 'bureaucratic', 'silence', 'debt',
      'consumption', 'dream', 'belief', 'echo',
      'sympathy', 'age', 'seasonal', 'lunar',
    ];

    const analysis = analyzeCombo(mage);

    expect(analysis.riskScore).toBe(100);
  });
});

describe('ComboDetector - Utility Functions', () => {
  it('isGameBreaking should detect apocalyptic combos', () => {
    const dangerous = ['paradox', 'dream', 'consumption'];
    const safe = ['academic', 'divine'];

    expect(isGameBreaking(dangerous)).toBe(true);
    expect(isGameBreaking(safe)).toBe(false);
  });

  it('should recommend lower paradigm limits for dangerous combos', () => {
    const dangerous = ['paradox', 'bureaucratic'];
    const powerful = ['dream', 'belief', 'echo'];
    const safe = ['academic', 'divine', 'rune'];

    const dangerLimit = getRecommendedParadigmLimit(dangerous);
    const powerLimit = getRecommendedParadigmLimit(powerful);
    const safeLimit = getRecommendedParadigmLimit(safe);

    expect(dangerLimit).toBeLessThan(safeLimit);
    expect(powerLimit).toBeLessThan(safeLimit);
  });

  it('should generate warnings for dangerous combos', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox', 'dream'];

    const warning = generateComboWarning(mage);

    expect(warning).not.toBeNull();
    expect(warning).toContain('REALITY THREAT');
  });

  it('should return null warning for safe combos', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['academic', 'divine'];

    const warning = generateComboWarning(mage);

    expect(warning).toBeNull();
  });
});

describe('ComboDetector - Recommendations', () => {
  it('should recommend reality anchors for apocalyptic threats', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox', 'dream', 'bureaucratic'];

    const analysis = analyzeCombo(mage);

    expect(analysis.recommendations.some(r => r.includes('reality'))).toBe(true);
  });

  it('should warn about paradox magic', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['paradox'];

    const analysis = analyzeCombo(mage);

    expect(analysis.recommendations.some(r => r.includes('Paradox'))).toBe(true);
  });

  it('should warn about debt slavery', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['debt'];

    const analysis = analyzeCombo(mage);

    expect(analysis.recommendations.some(r => r.includes('slavery'))).toBe(true);
  });

  it('should note extraordinary paradigm count', () => {
    const mage = createMagicComponent();
    mage.knownParadigmIds = ['academic', 'divine', 'pact', 'rune', 'dream', 'song'];

    const analysis = analyzeCombo(mage);

    expect(analysis.recommendations.some(r => r.includes('extraordinary'))).toBe(true);
  });
});

describe('ComboDetector - Combo Coverage', () => {
  it('should detect all major economy breakers', () => {
    const combos = [
      ['commerce', 'belief'],
      ['commerce', 'luck'],
      ['debt', 'commerce'],
      ['craft', 'commerce'],
      ['debt', 'belief', 'commerce'],
    ];

    for (const combo of combos) {
      const mage = createMagicComponent();
      mage.knownParadigmIds = combo;
      const analysis = analyzeCombo(mage);

      expect(analysis.threats.length).toBeGreaterThan(0);
    }
  });

  it('should detect all immortality loops', () => {
    const combos = [
      ['paradox', 'consumption'],
      ['dream', 'consumption'],
      ['age', 'consumption'],
      ['shinto', 'consumption'],
    ];

    for (const combo of combos) {
      const mage = createMagicComponent();
      mage.knownParadigmIds = combo;
      const analysis = analyzeCombo(mage);

      expect(analysis.threats.some(t => t.exploitation.includes('immortal') || t.exploitation.includes('forever'))).toBe(true);
    }
  });

  it('should detect all reality breakers', () => {
    const combos = [
      ['dream', 'paradox'],
      ['belief', 'dream'],
      ['bureaucratic', 'paradox'],
      ['silence', 'paradox'],
    ];

    for (const combo of combos) {
      const mage = createMagicComponent();
      mage.knownParadigmIds = combo;
      const analysis = analyzeCombo(mage);

      expect(analysis.threats.some(t => t.level === 'apocalyptic' || t.level === 'critical')).toBe(true);
    }
  });
});

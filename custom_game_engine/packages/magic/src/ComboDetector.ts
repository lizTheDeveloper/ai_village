/**
 * Magic Combo Detection System
 *
 * Analyzes paradigm combinations to detect:
 * - Economy-breaking combos
 * - God-mode combinations
 * - Infinite resource loops
 * - Reality-breaking interactions
 * - Balance-destroying synergies
 */

import type { MagicComponent } from '@ai-village/core';

export interface ComboThreat {
  level: 'minor' | 'major' | 'critical' | 'apocalyptic';
  paradigms: string[];
  threat: string;
  exploitation: string;
  mitigation?: string;
}

export interface ComboAnalysis {
  threats: ComboThreat[];
  riskScore: number; // 0-100
  recommendations: string[];
}

/**
 * Analyze a magic user's paradigm combination for exploits
 */
export function analyzeCombo(magicComponent: MagicComponent): ComboAnalysis {
  const threats: ComboThreat[] = [];
  const paradigms = magicComponent.knownParadigmIds;

  // Economy-Breaking Combos
  detectEconomyBreakers(paradigms, threats);

  // Time Manipulation Combos
  detectTimeManipulation(paradigms, threats);

  // Reality-Breaking Combos
  detectRealityBreakers(paradigms, threats);

  // Immortality Combos
  detectImmortalityLoops(paradigms, threats);

  // Mind Control Combos
  detectMindControl(paradigms, threats);

  // Resource Duplication Combos
  detectDuplication(paradigms, threats);

  // Power Multiplication Combos
  detectPowerMultipliers(paradigms, threats);

  // Calculate risk score
  const riskScore = calculateRiskScore(threats);

  // Generate recommendations
  const recommendations = generateRecommendations(threats, paradigms);

  return {
    threats,
    riskScore,
    recommendations,
  };
}

function detectEconomyBreakers(paradigms: string[], threats: ComboThreat[]): void {
  // Commerce + Belief = Price Manipulation
  if (paradigms.includes('commerce') && paradigms.includes('belief')) {
    threats.push({
      level: 'critical',
      paradigms: ['commerce', 'belief'],
      threat: 'Price Manipulation Loop',
      exploitation: 'Use Belief to convince people item is valuable, Commerce to inflate price, sell for massive profit, then crash value',
      mitigation: 'Cap price manipulation per item, track belief-modified prices separately',
    });
  }

  // Commerce + Luck = Guaranteed Profits
  if (paradigms.includes('commerce') && paradigms.includes('luck')) {
    threats.push({
      level: 'critical',
      paradigms: ['commerce', 'luck'],
      threat: 'Guaranteed Trading Success',
      exploitation: 'Stack luck bonuses to make all trades succeed at maximum value',
      mitigation: 'Add luck debt that compounds faster than profits',
    });
  }

  // Debt + Commerce = Debt Trap Economy
  if (paradigms.includes('debt') && paradigms.includes('commerce')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['debt', 'commerce'],
      threat: 'Debt Slavery Economy',
      exploitation: 'Grant wishes on credit, use Commerce to inflate debt value, enslave debtors permanently',
      mitigation: 'Debt forgiveness mechanics, rebellion system, divine intervention',
    });
  }

  // Craft + Commerce = Infinite Value Creation
  if (paradigms.includes('craft') && paradigms.includes('commerce')) {
    threats.push({
      level: 'critical',
      paradigms: ['craft', 'commerce'],
      threat: 'Value Multiplication Exploit',
      exploitation: 'Enhance item quality with Craft, inflate price with Commerce, repeat',
      mitigation: 'Diminishing returns on enhancement, market saturation mechanics',
    });
  }

  // Debt + Belief + Commerce = Triple Threat
  if (paradigms.includes('debt') && paradigms.includes('belief') && paradigms.includes('commerce')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['debt', 'belief', 'commerce'],
      threat: 'Total Economic Control',
      exploitation: 'Create false value (Belief), sell on credit (Debt), crash market (Commerce), profit infinitely',
      mitigation: 'Economic crash events, NPC awareness system, regulatory magic',
    });
  }
}

function detectTimeManipulation(paradigms: string[], threats: ComboThreat[]): void {
  // Age + Seasonal = Time Control
  if (paradigms.includes('age') && paradigms.includes('seasonal')) {
    threats.push({
      level: 'critical',
      paradigms: ['age', 'seasonal'],
      threat: 'Temporal Acceleration',
      exploitation: 'Lock season to optimal, age things rapidly, skip years of progression',
      mitigation: 'Aging costs scale exponentially, seasonal locks degrade',
    });
  }

  // Age + Lunar = Day/Night Manipulation
  if (paradigms.includes('age') && paradigms.includes('lunar')) {
    threats.push({
      level: 'major',
      paradigms: ['age', 'lunar'],
      threat: 'Circadian Override',
      exploitation: 'Extend night for lunar bonuses, age to skip cooldowns',
      mitigation: 'Cosmic backlash from disrupting natural cycles',
    });
  }

  // Seasonal + Lunar + Age = Chronos Mode
  if (paradigms.includes('seasonal') && paradigms.includes('lunar') && paradigms.includes('age')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['seasonal', 'lunar', 'age'],
      threat: 'Total Temporal Control',
      exploitation: 'Control all time scales: day/night, seasons, aging. Become god of time',
      mitigation: 'Time itself fights back, reality fractures, ancient time guardians awaken',
    });
  }

  // Paradox + Any Time Magic = Reality Break
  const timeMagics = ['age', 'seasonal', 'lunar'];
  const hasTimeAndParadox = paradigms.includes('paradox') && timeMagics.some(tm => paradigms.includes(tm));

  if (hasTimeAndParadox) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['paradox', ...timeMagics.filter(tm => paradigms.includes(tm))],
      threat: 'Causality Violation',
      exploitation: 'Create time paradoxes, reverse consequences, break cause and effect',
      mitigation: 'Paradox enforcement, timeline collapse, temporal police intervention',
    });
  }
}

function detectRealityBreakers(paradigms: string[], threats: ComboThreat[]): void {
  // Dream + Paradox = Reality Optional
  if (paradigms.includes('dream') && paradigms.includes('paradox')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['dream', 'paradox'],
      threat: 'Reality/Dream Blur',
      exploitation: 'Make dreams real, make reality dreamlike, erase distinction between real and unreal',
      mitigation: 'Reality anchors, wake-up mechanics, sanity system',
    });
  }

  // Belief + Dream = Shared Delusion
  if (paradigms.includes('belief') && paradigms.includes('dream')) {
    threats.push({
      level: 'critical',
      paradigms: ['belief', 'dream'],
      threat: 'Mass Hallucination',
      exploitation: 'Create shared dreams, make masses believe anything, rewrite collective reality',
      mitigation: 'Dream skeptics, reality checks, competing beliefs',
    });
  }

  // Bureaucratic + Paradox = Law of Physics Override
  if (paradigms.includes('bureaucratic') && paradigms.includes('paradox')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['bureaucratic', 'paradox'],
      threat: 'Physics Legislation',
      exploitation: 'File amendment to physics, create paradox loopholes, legalize impossibilities',
      mitigation: 'Universal constants refuse to comply, cosmic bureaucracy',
    });
  }

  // Silence + Paradox = Unmake Reality
  if (paradigms.includes('silence') && paradigms.includes('paradox')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['silence', 'paradox'],
      threat: 'Void Cascade',
      exploitation: 'Silence the sound of reality, paradox the existence of paradox, unmake creation',
      mitigation: 'Reality has backup copies, existence is loud',
    });
  }
}

function detectImmortalityLoops(paradigms: string[], threats: ComboThreat[]): void {
  // Paradox + Consumption = Immortality
  if (paradigms.includes('paradox') && paradigms.includes('consumption')) {
    threats.push({
      level: 'critical',
      paradigms: ['paradox', 'consumption'],
      threat: 'Death Reversal Loop',
      exploitation: 'Consume life force, when killed use paradox to reverse death, repeat forever',
      mitigation: 'Paradox costs scale with reversals, death gods notice',
    });
  }

  // Dream + Consumption = Dream Vampire
  if (paradigms.includes('dream') && paradigms.includes('consumption')) {
    threats.push({
      level: 'major',
      paradigms: ['dream', 'consumption'],
      threat: 'Dream Feeding',
      exploitation: 'Enter dreams to feed on sleeping victims, can\'t be caught, infinite food source',
      mitigation: 'Dream guardians, lucid dreamers fight back',
    });
  }

  // Age + Consumption = Reverse Aging
  if (paradigms.includes('age') && paradigms.includes('consumption')) {
    threats.push({
      level: 'critical',
      paradigms: ['age', 'consumption'],
      threat: 'Age Drain Immortality',
      exploitation: 'Consume youth from others, reverse your own aging, live forever',
      mitigation: 'Age drain creates undead, victims seek revenge',
    });
  }

  // Shinto + Consumption = Become Kami
  if (paradigms.includes('shinto') && paradigms.includes('consumption')) {
    threats.push({
      level: 'major',
      paradigms: ['shinto', 'consumption'],
      threat: 'Spirit Ascension',
      exploitation: 'Consume spirits to become more spirit-like, eventually become kami yourself',
      mitigation: 'Kami are offended, hunt you down',
    });
  }
}

function detectMindControl(paradigms: string[], threats: ComboThreat[]): void {
  // Song + Belief = Mass Indoctrination
  if (paradigms.includes('song') && paradigms.includes('belief')) {
    threats.push({
      level: 'critical',
      paradigms: ['song', 'belief'],
      threat: 'Memetic Propaganda',
      exploitation: 'Songs that create beliefs, spread virally, reprogram populations',
      mitigation: 'Counter-songs, belief resistance, diversity of thought',
    });
  }

  // Dream + Song = Subliminal Programming
  if (paradigms.includes('dream') && paradigms.includes('song')) {
    threats.push({
      level: 'critical',
      paradigms: ['dream', 'song'],
      threat: 'Sleep Programming',
      exploitation: 'Sing in dreams to program sleeping minds, wake up as different person',
      mitigation: 'Dream immunity, sleep guardians, counter-programming',
    });
  }

  // Belief + Bureaucratic = Thought Police
  if (paradigms.includes('belief') && paradigms.includes('bureaucratic')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['belief', 'bureaucratic'],
      threat: 'Mandatory Beliefs',
      exploitation: 'Legislate required beliefs, enforce with bureaucratic magic, thoughtcrime is real',
      mitigation: 'Underground resistance, belief sanctuaries, martyrs inspire rebellion',
    });
  }

  // Debt + Belief = Religious Debt Slavery
  if (paradigms.includes('debt') && paradigms.includes('belief')) {
    threats.push({
      level: 'critical',
      paradigms: ['debt', 'belief'],
      threat: 'Spiritual Debt',
      exploitation: 'Convince people they owe spiritual debts, collect with Fae magic',
      mitigation: 'Competing religions, debt forgiveness doctrines',
    });
  }
}

function detectDuplication(paradigms: string[], threats: ComboThreat[]): void {
  // Sympathy + Craft = Item Duplication
  if (paradigms.includes('sympathy') && paradigms.includes('craft')) {
    threats.push({
      level: 'critical',
      paradigms: ['sympathy', 'craft'],
      threat: 'Sympathetic Enhancement',
      exploitation: 'Link items, enhance one, enhancement transfers to linked items, duplicate quality',
      mitigation: 'Links break under quality difference, sympathy costs scale',
    });
  }

  // Echo + Craft = Recursive Enhancement
  if (paradigms.includes('echo') && paradigms.includes('craft')) {
    threats.push({
      level: 'critical',
      paradigms: ['echo', 'craft'],
      threat: 'Enhancement Echo',
      exploitation: 'Enhance item, echo the enhancement, each echo enhances again, exponential growth',
      mitigation: 'Echoes decay in power, material limits exist',
    });
  }

  // Echo + Any Attack Magic = Exponential Damage
  const attackMagics = ['academic', 'blood_magic', 'pact', 'rune'];
  const hasEchoAndAttack = paradigms.includes('echo') && attackMagics.some(am => paradigms.includes(am));

  if (hasEchoAndAttack) {
    threats.push({
      level: 'critical',
      paradigms: ['echo', ...attackMagics.filter(am => paradigms.includes(am))],
      threat: 'Attack Echo Chain',
      exploitation: 'Echo your attacks, echo your echoes, exponential damage multiplication',
      mitigation: 'Echo degradation, mana costs multiply with echoes',
    });
  }

  // Sympathy + Echo = Network Effects
  if (paradigms.includes('sympathy') && paradigms.includes('echo')) {
    threats.push({
      level: 'apocalyptic',
      paradigms: ['sympathy', 'echo'],
      threat: 'Sympathetic Echo Network',
      exploitation: 'Link many items, echo affects all linked items, each echo spreads to network, exponential spread',
      mitigation: 'Network overload breaks links, echo interference',
    });
  }
}

function detectPowerMultipliers(paradigms: string[], threats: ComboThreat[]): void {
  // Lunar + Seasonal = Permanent Power Bonus
  if (paradigms.includes('lunar') && paradigms.includes('seasonal')) {
    threats.push({
      level: 'major',
      paradigms: ['lunar', 'seasonal'],
      threat: 'Optimal Conditions',
      exploitation: 'Lock to summer and full moon, stack all bonuses permanently',
      mitigation: 'Cosmic forces resist locks, balance demands variety',
    });
  }

  // Consumption + Any Resource Magic = Infinite Resources
  const resourceMagics = ['craft', 'commerce', 'age'];
  const hasConsumptionAndResource = paradigms.includes('consumption') && resourceMagics.some(rm => paradigms.includes(rm));

  if (hasConsumptionAndResource) {
    threats.push({
      level: 'critical',
      paradigms: ['consumption', ...resourceMagics.filter(rm => paradigms.includes(rm))],
      threat: 'Resource Consumption Loop',
      exploitation: 'Consume resources from others, use resource magic to multiply, consume more, infinite growth',
      mitigation: 'Consumption attracts predators, creates enemies',
    });
  }

  // Game + Luck = Stacked RNG Manipulation
  if (paradigms.includes('game') && paradigms.includes('luck')) {
    threats.push({
      level: 'critical',
      paradigms: ['game', 'luck'],
      threat: 'Double RNG Manipulation',
      exploitation: 'Game magic manipulates rules, Luck manipulates rolls, control all randomness',
      mitigation: 'Chaos fights back, luck debt compounds',
    });
  }

  // Allomancy + Consumption = Metal Vampire
  if (paradigms.includes('allomancy') && paradigms.includes('consumption')) {
    threats.push({
      level: 'major',
      paradigms: ['allomancy', 'consumption'],
      threat: 'Metal Drain',
      exploitation: 'Consume metal from environment/enemies, always have fuel for Allomancy',
      mitigation: 'Metal poisoning, creates metal-drained wastelands',
    });
  }
}

function calculateRiskScore(threats: ComboThreat[]): number {
  const weights = {
    minor: 10,
    major: 25,
    critical: 50,
    apocalyptic: 100,
  };

  let total = 0;
  for (const threat of threats) {
    total += weights[threat.level];
  }

  return Math.min(100, total);
}

function generateRecommendations(threats: ComboThreat[], paradigms: string[]): string[] {
  const recommendations: string[] = [];

  // Count threat levels
  const counts = {
    apocalyptic: threats.filter(t => t.level === 'apocalyptic').length,
    critical: threats.filter(t => t.level === 'critical').length,
    major: threats.filter(t => t.level === 'major').length,
    minor: threats.filter(t => t.level === 'minor').length,
  };

  if (counts.apocalyptic > 0) {
    recommendations.push('⚠️ APOCALYPTIC THREAT: This combination can break reality itself');
    recommendations.push('Consider restricting paradigm learning progression');
    recommendations.push('Add cosmic-level consequences for abuse');
    recommendations.push('Implement reality anchors and fail-safes');
  }

  if (counts.critical > 0) {
    recommendations.push('🚨 CRITICAL THREAT: This combination breaks game balance');
    recommendations.push('Add significant costs or drawbacks to combo usage');
    recommendations.push('Implement detection and response systems');
  }

  if (counts.major > 0) {
    recommendations.push('⚡ MAJOR THREAT: This combination is very powerful');
    recommendations.push('Monitor for abuse patterns');
    recommendations.push('Add natural counters or weaknesses');
  }

  if (threats.length > 5) {
    recommendations.push('Multiple exploit vectors detected');
    recommendations.push('Consider limiting paradigm count or adding conflict');
  }

  // Paradigm-specific recommendations
  if (paradigms.includes('paradox')) {
    recommendations.push('Paradox magic always dangerous - expect reality breaks');
  }

  if (paradigms.includes('debt')) {
    recommendations.push('Debt magic enables slavery - add ethical consequences');
  }

  if (paradigms.includes('bureaucratic')) {
    recommendations.push('Bureaucratic magic can rewrite rules - add rule rigidity');
  }

  if (paradigms.length >= 5) {
    recommendations.push(`Learning ${paradigms.length} paradigms is extraordinary - most mages know 1-3`);
  }

  return recommendations;
}

/**
 * Quick check if paradigm combo is game-breaking
 */
export function isGameBreaking(paradigms: string[]): boolean {
  const analysis = analyzeCombo({ knownParadigmIds: paradigms } as MagicComponent);
  return analysis.threats.some(t => t.level === 'apocalyptic' || t.level === 'critical');
}

/**
 * Get recommended paradigm limit based on power level
 */
export function getRecommendedParadigmLimit(paradigms: string[]): number {
  const dangerousParadigms = ['paradox', 'bureaucratic', 'debt', 'consumption', 'silence'];
  const powerfulParadigms = ['dream', 'belief', 'echo', 'sympathy'];

  const dangerCount = paradigms.filter(p => dangerousParadigms.includes(p)).length;
  const powerCount = paradigms.filter(p => powerfulParadigms.includes(p)).length;

  if (dangerCount >= 2) return 3; // Limit to 3 total if have 2+ dangerous
  if (dangerCount >= 1 && powerCount >= 2) return 4; // Limit to 4 if mixed
  if (powerCount >= 3) return 5; // Limit to 5 if lots of powerful

  return 7; // Normal limit
}

/**
 * Generate warning message for dangerous combo
 */
export function generateComboWarning(magicComponent: MagicComponent): string | null {
  const analysis = analyzeCombo(magicComponent);

  if (analysis.threats.length === 0) return null;

  const apocalyptic = analysis.threats.filter(t => t.level === 'apocalyptic');
  const critical = analysis.threats.filter(t => t.level === 'critical');

  if (apocalyptic.length > 0) {
    const threat = apocalyptic[0]!;
    return `⚠️ REALITY THREAT: ${threat.paradigms.join(' + ')} = ${threat.threat}. ${threat.exploitation}`;
  }

  if (critical.length > 0) {
    const threat = critical[0]!;
    return `🚨 BALANCE THREAT: ${threat.paradigms.join(' + ')} = ${threat.threat}. ${threat.exploitation}`;
  }

  return null;
}

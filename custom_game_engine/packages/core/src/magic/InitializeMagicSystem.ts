/**
 * InitializeMagicSystem - Bootstrap function to set up the magic system
 *
 * This file initializes the magic system by:
 * 1. Registering effect appliers
 * 2. Creating and registering effect definitions
 * 3. Creating and registering spell definitions
 * 4. Setting up example spells for testing
 */

import { SpellEffectRegistry } from './SpellEffectRegistry.js';
import { SpellRegistry } from './SpellRegistry.js';
import { registerStandardAppliers } from './EffectAppliers.js';
import {
  createDamageEffect,
  createHealingEffect,
  createProtectionEffect,
} from './SpellEffect.js';
import type { SpellDefinition } from './SpellRegistry.js';
import { registerAllCostCalculators } from './costs/calculators/registerAll.js';
import type { World } from '../ecs/World.js';
import { createTerminalEffectHandler, TerminalEffectHandler } from './TerminalEffectHandler.js';

// Store reference to terminal effect handler for access
let terminalEffectHandler: TerminalEffectHandler | null = null;

/**
 * Initialize the magic system with all necessary registrations.
 * Call this once at game startup.
 *
 * @param world Optional World instance for wiring terminal effect handlers
 */
export function initializeMagicSystem(world?: World): void {
  // 1. Register cost calculators for all paradigms
  registerAllCostCalculators();

  // 2. Register effect appliers
  registerStandardAppliers();

  // 3. Register effect definitions
  registerStandardEffects();

  // 4. Register example spells
  registerExampleSpells();

  // 5. Set up terminal effect handler if world is provided
  if (world) {
    terminalEffectHandler = createTerminalEffectHandler(world);
  }
}

/**
 * Get the terminal effect handler (after initialization).
 */
export function getTerminalEffectHandler(): TerminalEffectHandler | null {
  return terminalEffectHandler;
}

/**
 * Register standard spell effect definitions.
 */
function registerStandardEffects(): void {
  const registry = SpellEffectRegistry.getInstance();

  // Damage effects
  registry.register(createDamageEffect(
    'ignite_effect',
    'Ignite',
    'fire',
    10,
    10,
    {
      description: 'Ignites the target, dealing fire damage.',
      targetType: 'single',
      form: 'fire',
      technique: 'create',
    }
  ));

  registry.register(createDamageEffect(
    'fireball_effect',
    'Fireball Explosion',
    'fire',
    50,
    20,
    {
      description: 'Massive fire explosion dealing heavy damage.',
      targetType: 'area',
      form: 'fire',
      technique: 'create',
      canCrit: true,
      critMultiplier: 2.5,
    }
  ));

  registry.register(createDamageEffect(
    'frost_bolt_effect',
    'Frost Bolt',
    'ice',
    25,
    15,
    {
      description: 'Bolt of ice that damages and slows.',
      targetType: 'single',
      form: 'body',
      technique: 'create',
    }
  ));

  registry.register(createDamageEffect(
    'lightning_strike_effect',
    'Lightning Strike',
    'lightning',
    40,
    25,
    {
      description: 'Calls down lightning from the sky.',
      targetType: 'single',
      form: 'spirit',
      technique: 'create',
      canCrit: true,
      critMultiplier: 3.0,
    }
  ));

  // Healing effects
  registry.register(createHealingEffect(
    'heal_effect',
    'Healing Touch',
    30,
    1,
    {
      description: 'Restores health to the target.',
      targetType: 'single',
      form: 'body',
      technique: 'enhance',
    }
  ));

  registry.register(createHealingEffect(
    'regeneration_effect',
    'Regeneration',
    5,
    1,
    {
      description: 'Gradually restores health over time.',
      targetType: 'single',
      form: 'body',
      technique: 'enhance',
      overtime: true,
      tickInterval: 20, // 1 second
    }
  ));

  // Protection effects
  registry.register(createProtectionEffect(
    'minor_ward_effect',
    'Minor Ward',
    50,
    6000, // 5 minutes at 20 TPS
    {
      description: 'Creates a protective barrier.',
      targetType: 'self',
      form: 'body',
      technique: 'protect',
    }
  ));

  registry.register(createProtectionEffect(
    'major_shield_effect',
    'Major Shield',
    150,
    3600, // 3 minutes
    {
      description: 'Creates a powerful protective shield.',
      targetType: 'single',
      form: 'body',
      technique: 'protect',
      damageReduction: 25,
    }
  ));

  // Detection effects
  registry.register({
    id: 'detect_magic_effect',
    name: 'Detect Magic',
    description: 'Reveals magical auras in the area.',
    category: 'perception',
    targetType: 'self',
    targetFilter: 'any',
    range: 30,
    duration: 1200, // 1 minute
    dispellable: true,
    stackable: false,
    tags: ['detection', 'magic'],
    detects: ['magic'],
    detectionRadius: 30,
    trueSight: false,
    scrying: false,
    form: 'spirit',
    technique: 'perceive',
  });
}

/**
 * Register example spells for testing and initial gameplay.
 */
function registerExampleSpells(): void {
  const registry = SpellRegistry.getInstance();

  const exampleSpells: SpellDefinition[] = [
    // Fire spells
    {
      id: 'academic_ignite',
      name: 'Ignite',
      paradigmId: 'academic',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 5,
      castTime: 10,
      range: 10,
      effectId: 'ignite_effect',
      description: 'Create a small flame on a target object.',
      school: 'fire',
      baseMishapChance: 0.05,
      hotkeyable: true,
      icon: '🔥',
      tags: ['fire', 'damage', 'basic'],
    },
    {
      id: 'academic_fireball',
      name: 'Fireball',
      paradigmId: 'academic',
      technique: 'create',
      form: 'fire',
      source: 'arcane',
      manaCost: 45,
      castTime: 40,
      range: 20,
      effectId: 'fireball_effect',
      description: 'Launch an explosive ball of fire.',
      school: 'fire',
      baseMishapChance: 0.15,
      hotkeyable: true,
      icon: '💥',
      prerequisites: ['academic_ignite'],
      tags: ['fire', 'damage', 'aoe'],
    },
    // Ice spells
    {
      id: 'academic_frost_bolt',
      name: 'Frost Bolt',
      paradigmId: 'academic',
      technique: 'create',
      form: 'body',
      source: 'arcane',
      manaCost: 20,
      castTime: 25,
      range: 15,
      effectId: 'frost_bolt_effect',
      description: 'Fire a bolt of magical ice.',
      school: 'ice',
      baseMishapChance: 0.08,
      hotkeyable: true,
      icon: '❄️',
      tags: ['ice', 'damage', 'control'],
    },
    // Lightning spells
    {
      id: 'academic_lightning',
      name: 'Lightning Bolt',
      paradigmId: 'academic',
      technique: 'create',
      form: 'spirit',
      source: 'arcane',
      manaCost: 35,
      castTime: 30,
      range: 25,
      effectId: 'lightning_strike_effect',
      description: 'Call down a bolt of lightning.',
      school: 'evocation',
      baseMishapChance: 0.12,
      hotkeyable: true,
      icon: '⚡',
      tags: ['lightning', 'damage'],
    },
    // Healing spells
    {
      id: 'academic_heal',
      name: 'Heal Wounds',
      paradigmId: 'academic',
      technique: 'enhance',
      form: 'body',
      source: 'arcane',
      manaCost: 30,
      castTime: 60,
      range: 1,
      effectId: 'heal_effect',
      description: 'Accelerate natural healing in a target.',
      school: 'restoration',
      baseMishapChance: 0.1,
      hotkeyable: true,
      icon: '💚',
      tags: ['healing', 'support'],
    },
    {
      id: 'academic_regeneration',
      name: 'Regeneration',
      paradigmId: 'academic',
      technique: 'enhance',
      form: 'body',
      source: 'arcane',
      manaCost: 20,
      castTime: 40,
      range: 1,
      duration: 600, // 30 seconds
      effectId: 'regeneration_effect',
      description: 'Grant gradual health regeneration over time.',
      school: 'restoration',
      baseMishapChance: 0.05,
      hotkeyable: true,
      icon: '💗',
      tags: ['healing', 'support', 'duration'],
    },
    // Protection spells
    {
      id: 'academic_minor_ward',
      name: 'Minor Ward',
      paradigmId: 'academic',
      technique: 'protect',
      form: 'body',
      source: 'arcane',
      manaCost: 15,
      castTime: 20,
      range: 0,
      duration: 6000, // 5 minutes
      effectId: 'minor_ward_effect',
      description: 'Create a light protective barrier around yourself.',
      school: 'protection',
      baseMishapChance: 0.03,
      hotkeyable: true,
      icon: '🛡️',
      tags: ['protection', 'defense', 'duration'],
    },
    {
      id: 'academic_major_shield',
      name: 'Major Shield',
      paradigmId: 'academic',
      technique: 'protect',
      form: 'body',
      source: 'arcane',
      manaCost: 40,
      castTime: 50,
      range: 1,
      duration: 3600, // 3 minutes
      effectId: 'major_shield_effect',
      description: 'Create a powerful protective shield.',
      school: 'protection',
      baseMishapChance: 0.1,
      hotkeyable: true,
      icon: '🛡️',
      prerequisites: ['academic_minor_ward'],
      tags: ['protection', 'defense', 'duration'],
    },
    // Utility spells
    {
      id: 'academic_detect_magic',
      name: 'Detect Magic',
      paradigmId: 'academic',
      technique: 'perceive',
      form: 'spirit',
      source: 'arcane',
      manaCost: 10,
      castTime: 30,
      range: 30,
      duration: 1200, // 1 minute
      effectId: 'detect_magic_effect',
      description: 'Sense magical auras in the area.',
      school: 'divination',
      baseMishapChance: 0.02,
      hotkeyable: true,
      icon: '👁️',
      tags: ['detection', 'utility'],
    },
  ];

  registry.registerAll(exampleSpells);
}

/**
 * Unlock all example spells for testing (call in dev mode).
 */
export function unlockAllExampleSpells(): void {
  const registry = SpellRegistry.getInstance();
  registry.unlockAllSpells();
}

/**
 * Reset magic system (for testing).
 */
export function resetMagicSystem(): void {
  SpellRegistry.resetInstance();
  SpellEffectRegistry.resetInstance();
}

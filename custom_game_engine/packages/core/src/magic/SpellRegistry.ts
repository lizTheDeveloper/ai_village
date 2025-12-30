/**
 * SpellRegistry - Central registry for spell definitions
 *
 * Provides:
 * - Registration of spell definitions from any paradigm
 * - Lookup by ID, paradigm, technique, form
 * - Player spell state tracking (hotkeys, proficiency)
 * - Data-driven: no hardcoded spells
 */

import type { ComposedSpell, MagicTechnique, MagicForm, MagicSourceId } from '../components/MagicComponent.js';

// ============================================================================
// Types
// ============================================================================

/** Extended spell definition with UI metadata */
export interface SpellDefinition extends ComposedSpell {
  /** Paradigm this spell belongs to */
  paradigmId: string;

  /** Description for UI */
  description: string;

  /** Icon identifier */
  icon?: string;

  /** School/category for organization */
  school?: string;

  /** Minimum proficiency to learn */
  minProficiency?: number;

  /** Prerequisites (other spell IDs) */
  prerequisites?: string[];

  /** Tags for filtering */
  tags?: string[];

  /** Base mishap chance at 0 proficiency (0-1) */
  baseMishapChance?: number;

  /** Whether this spell can be assigned to a hotkey */
  hotkeyable?: boolean;
}

/** Player's state for a specific spell */
export interface PlayerSpellState {
  spellId: string;
  proficiency: number;  // 0-100
  timesCast: number;
  hotkey?: number;      // 1-9, undefined = not assigned
  unlocked: boolean;
  lastCast?: number;
}

/** Callback for spell registry changes */
export type SpellRegistryListener = (event: SpellRegistryEvent) => void;

export interface SpellRegistryEvent {
  type: 'registered' | 'unregistered' | 'state_changed';
  spellId: string;
}

// ============================================================================
// SpellRegistry
// ============================================================================

export class SpellRegistry {
  private static instance: SpellRegistry | null = null;

  /** All registered spells */
  private spells: Map<string, SpellDefinition> = new Map();

  /** Spells indexed by paradigm */
  private byParadigm: Map<string, Set<string>> = new Map();

  /** Player's spell states */
  private playerStates: Map<string, PlayerSpellState> = new Map();

  /** Hotkey assignments (1-9 -> spellId) */
  private hotkeys: Map<number, string> = new Map();

  /** Listeners */
  private listeners: Set<SpellRegistryListener> = new Set();

  private constructor() {}

  static getInstance(): SpellRegistry {
    if (!SpellRegistry.instance) {
      SpellRegistry.instance = new SpellRegistry();
    }
    return SpellRegistry.instance;
  }

  static resetInstance(): void {
    SpellRegistry.instance = null;
  }

  // ========== Registration ==========

  register(spell: SpellDefinition): void {
    if (this.spells.has(spell.id)) {
      throw new Error(`Spell '${spell.id}' already registered`);
    }

    this.spells.set(spell.id, spell);

    // Index by paradigm
    if (!this.byParadigm.has(spell.paradigmId)) {
      this.byParadigm.set(spell.paradigmId, new Set());
    }
    this.byParadigm.get(spell.paradigmId)!.add(spell.id);

    // Initialize player state
    this.playerStates.set(spell.id, {
      spellId: spell.id,
      proficiency: 0,
      timesCast: 0,
      unlocked: false,
    });

    this.notify({ type: 'registered', spellId: spell.id });
  }

  registerAll(spells: SpellDefinition[]): void {
    for (const spell of spells) {
      this.register(spell);
    }
  }

  unregister(spellId: string): boolean {
    const spell = this.spells.get(spellId);
    if (!spell) return false;

    this.spells.delete(spellId);
    this.byParadigm.get(spell.paradigmId)?.delete(spellId);
    this.playerStates.delete(spellId);

    // Remove hotkey if assigned
    for (const [key, id] of this.hotkeys) {
      if (id === spellId) {
        this.hotkeys.delete(key);
        break;
      }
    }

    this.notify({ type: 'unregistered', spellId });
    return true;
  }

  // ========== Lookup ==========

  getSpell(spellId: string): SpellDefinition | undefined {
    return this.spells.get(spellId);
  }

  getSpellOrThrow(spellId: string): SpellDefinition {
    const spell = this.spells.get(spellId);
    if (!spell) {
      throw new Error(`Spell '${spellId}' not found`);
    }
    return spell;
  }

  getAllSpells(): SpellDefinition[] {
    return Array.from(this.spells.values());
  }

  getSpellsByParadigm(paradigmId: string): SpellDefinition[] {
    const ids = this.byParadigm.get(paradigmId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.spells.get(id)!);
  }

  getSpellsByTechnique(technique: MagicTechnique): SpellDefinition[] {
    return this.getAllSpells().filter(s => s.technique === technique);
  }

  getSpellsByForm(form: MagicForm): SpellDefinition[] {
    return this.getAllSpells().filter(s => s.form === form);
  }

  getSpellsBySchool(school: string): SpellDefinition[] {
    return this.getAllSpells().filter(s => s.school === school);
  }

  getSpellsBySource(source: MagicSourceId): SpellDefinition[] {
    return this.getAllSpells().filter(s => s.source === source);
  }

  // ========== Player State ==========

  getPlayerState(spellId: string): PlayerSpellState | undefined {
    return this.playerStates.get(spellId);
  }

  setUnlocked(spellId: string, unlocked: boolean): void {
    const state = this.playerStates.get(spellId);
    if (state) {
      state.unlocked = unlocked;
      this.notify({ type: 'state_changed', spellId });
    }
  }

  setProficiency(spellId: string, proficiency: number): void {
    const state = this.playerStates.get(spellId);
    if (state) {
      state.proficiency = Math.max(0, Math.min(100, proficiency));
      this.notify({ type: 'state_changed', spellId });
    }
  }

  recordCast(spellId: string, tick: number): void {
    const state = this.playerStates.get(spellId);
    if (state) {
      state.timesCast++;
      state.lastCast = tick;
      // Gain proficiency from casting (diminishing returns)
      const gain = Math.max(0.5, 5 * (1 - state.proficiency / 100));
      state.proficiency = Math.min(100, state.proficiency + gain);
      this.notify({ type: 'state_changed', spellId });
    }
  }

  getUnlockedSpells(): SpellDefinition[] {
    return this.getAllSpells().filter(s =>
      this.playerStates.get(s.id)?.unlocked === true
    );
  }

  getUnlockedSpellsByParadigm(paradigmId: string): SpellDefinition[] {
    return this.getSpellsByParadigm(paradigmId).filter(s =>
      this.playerStates.get(s.id)?.unlocked === true
    );
  }

  // ========== Hotkeys ==========

  assignHotkey(spellId: string, key: number): void {
    if (key < 1 || key > 9) {
      throw new Error('Hotkey must be 1-9');
    }

    const state = this.playerStates.get(spellId);
    if (!state) {
      throw new Error(`Spell '${spellId}' not found`);
    }

    // Remove existing assignment for this key
    const existingSpellId = this.hotkeys.get(key);
    if (existingSpellId) {
      const existingState = this.playerStates.get(existingSpellId);
      if (existingState) {
        existingState.hotkey = undefined;
      }
    }

    // Remove existing hotkey for this spell
    if (state.hotkey !== undefined) {
      this.hotkeys.delete(state.hotkey);
    }

    // Assign new hotkey
    state.hotkey = key;
    this.hotkeys.set(key, spellId);
    this.notify({ type: 'state_changed', spellId });
  }

  clearHotkey(spellId: string): void {
    const state = this.playerStates.get(spellId);
    if (state?.hotkey !== undefined) {
      this.hotkeys.delete(state.hotkey);
      state.hotkey = undefined;
      this.notify({ type: 'state_changed', spellId });
    }
  }

  getSpellByHotkey(key: number): SpellDefinition | undefined {
    const spellId = this.hotkeys.get(key);
    return spellId ? this.spells.get(spellId) : undefined;
  }

  getHotkeyAssignments(): Map<number, string> {
    return new Map(this.hotkeys);
  }

  // ========== Mishap Calculation ==========

  getMishapChance(spellId: string): number {
    const spell = this.spells.get(spellId);
    const state = this.playerStates.get(spellId);
    if (!spell || !state) return 1;

    const baseMishap = spell.baseMishapChance ?? 0.2;
    // Mishap chance decreases with proficiency
    const proficiencyFactor = 1 - (state.proficiency / 100);
    return baseMishap * proficiencyFactor;
  }

  // ========== Listeners ==========

  addListener(listener: SpellRegistryListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: SpellRegistryListener): void {
    this.listeners.delete(listener);
  }

  private notify(event: SpellRegistryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ========== Serialization ==========

  serializePlayerState(): Record<string, PlayerSpellState> {
    const result: Record<string, PlayerSpellState> = {};
    for (const [id, state] of this.playerStates) {
      result[id] = { ...state };
    }
    return result;
  }

  deserializePlayerState(data: Record<string, PlayerSpellState>): void {
    for (const [id, state] of Object.entries(data)) {
      if (this.playerStates.has(id)) {
        this.playerStates.set(id, { ...state });
        if (state.hotkey !== undefined) {
          this.hotkeys.set(state.hotkey, id);
        }
      }
    }
  }

  // ========== Dev/Testing ==========

  unlockAllSpells(): void {
    for (const state of this.playerStates.values()) {
      state.unlocked = true;
    }
  }

  lockAllSpells(): void {
    for (const state of this.playerStates.values()) {
      state.unlocked = false;
    }
  }

  maxAllProficiencies(): void {
    for (const state of this.playerStates.values()) {
      state.proficiency = 100;
    }
  }

  resetAllProficiencies(): void {
    for (const state of this.playerStates.values()) {
      state.proficiency = 0;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getSpellRegistry(): SpellRegistry {
  return SpellRegistry.getInstance();
}

export function registerSpell(spell: SpellDefinition): void {
  SpellRegistry.getInstance().register(spell);
}

export function getSpell(spellId: string): SpellDefinition | undefined {
  return SpellRegistry.getInstance().getSpell(spellId);
}

// ============================================================================
// Example Spells (for testing - paradigm-specific spells should be defined elsewhere)
// ============================================================================

export const EXAMPLE_SPELLS: SpellDefinition[] = [
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
    prerequisites: ['academic_ignite'],
  },
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
    duration: 6000, // 5 minutes at 20 TPS
    effectId: 'minor_ward_effect',
    description: 'Create a light protective barrier around yourself.',
    school: 'protection',
    baseMishapChance: 0.03,
    hotkeyable: true,
  },
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
  },
  {
    id: 'academic_perceive_magic',
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
  },
];

/**
 * SpellEffectRegistry - Central registry for spell effect definitions
 *
 * Stores all effect definitions and provides lookup functionality.
 * Effect definitions are data-driven and can be loaded from files.
 */

import type {
  SpellEffect,
  EffectCategory,
  DamageType,
  DamageEffect,
  HealingEffect,
  ProtectionEffect,
  BuffEffect,
  DebuffEffect,
  ControlEffect,
  SummonEffect,
  PerceptionEffect,
  ParadigmEffect,
} from './SpellEffect.js';

// ============================================================================
// Registry Types
// ============================================================================

/** Callback for registry changes */
export type EffectRegistryListener = (event: EffectRegistryEvent) => void;

export interface EffectRegistryEvent {
  type: 'registered' | 'unregistered' | 'updated';
  effectId: string;
}

// ============================================================================
// SpellEffectRegistry
// ============================================================================

export class SpellEffectRegistry {
  private static instance: SpellEffectRegistry | null = null;

  /** All registered effects */
  private effects: Map<string, SpellEffect> = new Map();

  /** Effects indexed by category */
  private byCategory: Map<EffectCategory, Set<string>> = new Map();

  /** Effects indexed by damage type (for damage effects) */
  private byDamageType: Map<DamageType, Set<string>> = new Map();

  /** Effects indexed by paradigm (for paradigm-specific effects) */
  private byParadigm: Map<string, Set<string>> = new Map();

  /** Effects indexed by tags */
  private byTag: Map<string, Set<string>> = new Map();

  /** Listeners */
  private listeners: Set<EffectRegistryListener> = new Set();

  private constructor() {}

  static getInstance(): SpellEffectRegistry {
    if (!SpellEffectRegistry.instance) {
      SpellEffectRegistry.instance = new SpellEffectRegistry();
    }
    return SpellEffectRegistry.instance;
  }

  static resetInstance(): void {
    SpellEffectRegistry.instance = null;
  }

  // ========== Registration ==========

  register(effect: SpellEffect): void {
    if (this.effects.has(effect.id)) {
      throw new Error(`Effect '${effect.id}' already registered`);
    }

    this.effects.set(effect.id, effect);
    this.indexEffect(effect);
    this.notify({ type: 'registered', effectId: effect.id });
  }

  registerAll(effects: SpellEffect[]): void {
    for (const effect of effects) {
      this.register(effect);
    }
  }

  unregister(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) return false;

    this.effects.delete(effectId);
    this.removeFromIndexes(effect);
    this.notify({ type: 'unregistered', effectId });
    return true;
  }

  update(effect: SpellEffect): void {
    const existing = this.effects.get(effect.id);
    if (!existing) {
      throw new Error(`Effect '${effect.id}' not found`);
    }

    this.removeFromIndexes(existing);
    this.effects.set(effect.id, effect);
    this.indexEffect(effect);
    this.notify({ type: 'updated', effectId: effect.id });
  }

  private indexEffect(effect: SpellEffect): void {
    // Index by category
    if (!this.byCategory.has(effect.category)) {
      this.byCategory.set(effect.category, new Set());
    }
    this.byCategory.get(effect.category)!.add(effect.id);

    // Index by damage type for damage effects
    if (effect.category === 'damage') {
      const damageEffect = effect as DamageEffect;
      if (!this.byDamageType.has(damageEffect.damageType)) {
        this.byDamageType.set(damageEffect.damageType, new Set());
      }
      this.byDamageType.get(damageEffect.damageType)!.add(effect.id);
    }

    // Index by paradigm for paradigm effects
    if (effect.category === 'paradigm') {
      const paradigmEffect = effect as ParadigmEffect;
      if (!this.byParadigm.has(paradigmEffect.paradigmId)) {
        this.byParadigm.set(paradigmEffect.paradigmId, new Set());
      }
      this.byParadigm.get(paradigmEffect.paradigmId)!.add(effect.id);
    }

    // Index by tags
    for (const tag of effect.tags) {
      if (!this.byTag.has(tag)) {
        this.byTag.set(tag, new Set());
      }
      this.byTag.get(tag)!.add(effect.id);
    }
  }

  private removeFromIndexes(effect: SpellEffect): void {
    this.byCategory.get(effect.category)?.delete(effect.id);

    if (effect.category === 'damage') {
      const damageEffect = effect as DamageEffect;
      this.byDamageType.get(damageEffect.damageType)?.delete(effect.id);
    }

    if (effect.category === 'paradigm') {
      const paradigmEffect = effect as ParadigmEffect;
      this.byParadigm.get(paradigmEffect.paradigmId)?.delete(effect.id);
    }

    for (const tag of effect.tags) {
      this.byTag.get(tag)?.delete(effect.id);
    }
  }

  // ========== Lookup ==========

  getEffect(effectId: string): SpellEffect | undefined {
    return this.effects.get(effectId);
  }

  getEffectOrThrow(effectId: string): SpellEffect {
    const effect = this.effects.get(effectId);
    if (!effect) {
      throw new Error(`Effect '${effectId}' not found`);
    }
    return effect;
  }

  hasEffect(effectId: string): boolean {
    return this.effects.has(effectId);
  }

  getAllEffects(): SpellEffect[] {
    return Array.from(this.effects.values());
  }

  getEffectsByCategory(category: EffectCategory): SpellEffect[] {
    const ids = this.byCategory.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.effects.get(id)!);
  }

  getEffectsByDamageType(damageType: DamageType): DamageEffect[] {
    const ids = this.byDamageType.get(damageType);
    if (!ids) return [];
    return Array.from(ids).map(id => this.effects.get(id)! as DamageEffect);
  }

  getEffectsByParadigm(paradigmId: string): ParadigmEffect[] {
    const ids = this.byParadigm.get(paradigmId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.effects.get(id)! as ParadigmEffect);
  }

  getEffectsByTag(tag: string): SpellEffect[] {
    const ids = this.byTag.get(tag);
    if (!ids) return [];
    return Array.from(ids).map(id => this.effects.get(id)!);
  }

  getEffectsByTags(tags: string[], matchAll: boolean = true): SpellEffect[] {
    if (tags.length === 0) return [];

    const tagSets = tags.map(tag => this.byTag.get(tag) ?? new Set<string>());

    if (matchAll) {
      // Intersection - must have all tags
      let result = new Set(tagSets[0]);
      for (let i = 1; i < tagSets.length; i++) {
        result = new Set([...result].filter(id => tagSets[i]!.has(id)));
      }
      return Array.from(result).map(id => this.effects.get(id)!);
    } else {
      // Union - must have at least one tag
      const result = new Set<string>();
      for (const set of tagSets) {
        for (const id of set) {
          result.add(id);
        }
      }
      return Array.from(result).map(id => this.effects.get(id)!);
    }
  }

  // ========== Type-Safe Getters ==========

  getDamageEffect(effectId: string): DamageEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'damage') {
      return effect as DamageEffect;
    }
    return undefined;
  }

  getHealingEffect(effectId: string): HealingEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'healing') {
      return effect as HealingEffect;
    }
    return undefined;
  }

  getProtectionEffect(effectId: string): ProtectionEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'protection') {
      return effect as ProtectionEffect;
    }
    return undefined;
  }

  getBuffEffect(effectId: string): BuffEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'buff') {
      return effect as BuffEffect;
    }
    return undefined;
  }

  getDebuffEffect(effectId: string): DebuffEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'debuff') {
      return effect as DebuffEffect;
    }
    return undefined;
  }

  getControlEffect(effectId: string): ControlEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'control') {
      return effect as ControlEffect;
    }
    return undefined;
  }

  getSummonEffect(effectId: string): SummonEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'summon') {
      return effect as SummonEffect;
    }
    return undefined;
  }

  getPerceptionEffect(effectId: string): PerceptionEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'perception') {
      return effect as PerceptionEffect;
    }
    return undefined;
  }

  getParadigmEffect(effectId: string): ParadigmEffect | undefined {
    const effect = this.effects.get(effectId);
    if (effect?.category === 'paradigm') {
      return effect as ParadigmEffect;
    }
    return undefined;
  }

  // ========== Statistics ==========

  getEffectCount(): number {
    return this.effects.size;
  }

  getCategoryCounts(): Map<EffectCategory, number> {
    const counts = new Map<EffectCategory, number>();
    for (const [category, ids] of this.byCategory) {
      counts.set(category, ids.size);
    }
    return counts;
  }

  getDamageTypeCounts(): Map<DamageType, number> {
    const counts = new Map<DamageType, number>();
    for (const [damageType, ids] of this.byDamageType) {
      counts.set(damageType, ids.size);
    }
    return counts;
  }

  // ========== Listeners ==========

  addListener(listener: EffectRegistryListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: EffectRegistryListener): void {
    this.listeners.delete(listener);
  }

  private notify(event: EffectRegistryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ========== Serialization ==========

  serialize(): Record<string, SpellEffect> {
    const result: Record<string, SpellEffect> = {};
    for (const [id, effect] of this.effects) {
      result[id] = { ...effect };
    }
    return result;
  }

  deserialize(data: Record<string, SpellEffect>): void {
    for (const effect of Object.values(data)) {
      if (!this.effects.has(effect.id)) {
        this.register(effect);
      }
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getEffectRegistry(): SpellEffectRegistry {
  return SpellEffectRegistry.getInstance();
}

export function registerEffect(effect: SpellEffect): void {
  SpellEffectRegistry.getInstance().register(effect);
}

export function getEffect(effectId: string): SpellEffect | undefined {
  return SpellEffectRegistry.getInstance().getEffect(effectId);
}

export function hasEffect(effectId: string): boolean {
  return SpellEffectRegistry.getInstance().hasEffect(effectId);
}

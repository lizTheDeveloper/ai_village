/**
 * ParadigmEffectApplier - Handles paradigm manipulation effects
 *
 * This applier handles effects that manipulate magic paradigms:
 * - Paradigm shifts (change caster's or target's active paradigm)
 * - Granting paradigm access (add to known paradigms)
 * - Paradigm suppression/nullification (temporarily disable paradigm)
 * - Cross-paradigm adaptation (enable multi-paradigm casting)
 * - Paradigm teaching (transfer paradigm knowledge)
 */

import type { Entity, MagicComponent } from '@ai-village/core';
import type { World } from '@ai-village/core';
import type {
  ParadigmEffect,
  EffectApplicationResult,
  ActiveEffect,
} from '../SpellEffect.js';
import type { EffectApplier, EffectContext } from '../SpellEffectExecutor.js';
import type { ParadigmState, ChannelData, RiskData } from '../types/ComponentTypes.js';

// ============================================================================
// Paradigm Effect Operations
// ============================================================================

/** Operations that can be performed on paradigms */
export type ParadigmOperation =
  | 'shift'         // Change active paradigm
  | 'grant'         // Add to known paradigms
  | 'teach'         // Transfer paradigm knowledge (like grant but requires magic component)
  | 'suppress'      // Temporarily disable paradigm
  | 'nullify'       // Remove paradigm access
  | 'adapt';        // Enable cross-paradigm adaptation

// ============================================================================
 // ParadigmEffectApplier
// ============================================================================

export class ParadigmEffectApplier implements EffectApplier<ParadigmEffect> {
  readonly category = 'paradigm' as const;

  apply(
    effect: ParadigmEffect,
    caster: Entity,
    target: Entity,
    _world: World,
    context: EffectContext
  ): EffectApplicationResult {
    // Get target's magic component
    const targetMagic = target.getComponent('magic') as MagicComponent | undefined;

    // Paradigm effects only work on magic users
    if (!targetMagic || !targetMagic.magicUser) {
      return {
        success: false,
        effectId: effect.id,
        targetId: target.id,
        appliedValues: {},
        resisted: false,
        error: 'Target has no magic component - cannot apply paradigm effects',
        appliedAt: context.tick,
        casterId: caster.id,
        spellId: context.spell.id,
      };
    }

    const result: EffectApplicationResult = {
      success: true,
      effectId: effect.id,
      targetId: target.id,
      appliedValues: {},
      resisted: false,
      appliedAt: context.tick,
      casterId: caster.id,
      spellId: context.spell.id,
    };

    // Extract operation from effect parameters
    const operation = effect.parameters.operation as ParadigmOperation;
    const paradigmId = effect.parameters.paradigmId as string | undefined;

    if (!operation) {
      result.success = false;
      result.error = 'No paradigm operation specified';
      return result;
    }

    // Handle each operation type
    switch (operation) {
      case 'shift':
        return this.handleShift(targetMagic, paradigmId, effect, result);

      case 'grant':
        return this.handleGrant(targetMagic, paradigmId, effect, result);

      case 'teach':
        return this.handleTeach(targetMagic, paradigmId, effect, result);

      case 'suppress':
        return this.handleSuppress(targetMagic, paradigmId, effect, result, context.tick);

      case 'nullify':
        return this.handleNullify(targetMagic, paradigmId, effect, result);

      case 'adapt':
        return this.handleAdapt(targetMagic, effect, result);

      default:
        result.success = false;
        result.error = `Unknown paradigm operation: ${operation}`;
        return result;
    }
  }

  tick(
    activeEffect: ActiveEffect,
    effect: ParadigmEffect,
    target: Entity,
    _world: World,
    context: EffectContext
  ): void {
    // Check if suppression effect has expired
    const operation = effect.parameters.operation as ParadigmOperation;
    if (operation === 'suppress' && effect.duration) {
      const elapsed = context.tick - activeEffect.appliedAt;
      if (elapsed >= effect.duration) {
        // Suppression will be removed by the executor
        return;
      }
    }
  }

  remove(
    activeEffect: ActiveEffect,
    effect: ParadigmEffect,
    target: Entity,
    _world: World
  ): void {
    const operation = effect.parameters.operation as ParadigmOperation;

    // Only suppression effects need cleanup on removal
    if (operation === 'suppress') {
      const targetMagic = target.getComponent('magic') as MagicComponent | undefined;
      if (!targetMagic) return;

      const paradigmId = effect.parameters.paradigmId as string;

      // Remove suppression state
      if (targetMagic.paradigmState[paradigmId]) {
        const state = targetMagic.paradigmState[paradigmId] as ParadigmState;
        if (state && 'suppressed' in state) {
          delete state.suppressed;
          delete state.suppressedUntil;
        }
      }
    }
  }

  // =========================================================================
  // Operation Handlers
  // =========================================================================

  private handleShift(
    targetMagic: MagicComponent,
    paradigmId: string | undefined,
    effect: ParadigmEffect,
    result: EffectApplicationResult
  ): EffectApplicationResult {
    if (!paradigmId) {
      result.success = false;
      result.error = 'No paradigm ID specified for shift';
      return result;
    }

    // Can't shift to same paradigm
    if (targetMagic.activeParadigmId === paradigmId) {
      result.success = false;
      result.error = `Target already using paradigm: ${paradigmId}`;
      return result;
    }

    const oldParadigm = targetMagic.activeParadigmId;

    // Shift to new paradigm
    targetMagic.activeParadigmId = paradigmId;

    // Add to known paradigms if not already known
    if (!targetMagic.knownParadigmIds.includes(paradigmId)) {
      targetMagic.knownParadigmIds.push(paradigmId);
    }

    // Reset paradigm-specific state when shifting from certain paradigms
    if (oldParadigm === 'void' && targetMagic.corruption !== undefined) {
      // Reset void corruption when shifting away
      targetMagic.corruption = 0;
    }

    // Store paradigm count changes
    result.appliedValues['paradigmShift'] = 1;

    return result;
  }

  private handleGrant(
    targetMagic: MagicComponent,
    paradigmId: string | undefined,
    effect: ParadigmEffect,
    result: EffectApplicationResult
  ): EffectApplicationResult {
    if (!paradigmId) {
      result.success = false;
      result.error = 'No paradigm ID specified for grant';
      return result;
    }

    // Check if already known
    if (targetMagic.knownParadigmIds.includes(paradigmId)) {
      result.appliedValues['alreadyKnown'] = 1;
      return result;
    }

    // Grant access
    targetMagic.knownParadigmIds.push(paradigmId);
    result.appliedValues['paradigmsGranted'] = 1;

    return result;
  }

  private handleTeach(
    targetMagic: MagicComponent,
    paradigmId: string | undefined,
    effect: ParadigmEffect,
    result: EffectApplicationResult
  ): EffectApplicationResult {
    if (!targetMagic.magicUser) {
      result.success = false;
      result.error = 'Cannot teach paradigm to non-magic user';
      return result;
    }

    // Teaching is like granting but requires the target to be a magic user
    return this.handleGrant(targetMagic, paradigmId, effect, result);
  }

  private handleSuppress(
    targetMagic: MagicComponent,
    paradigmId: string | undefined,
    effect: ParadigmEffect,
    result: EffectApplicationResult,
    currentTick: number
  ): EffectApplicationResult {
    if (!paradigmId) {
      result.success = false;
      result.error = 'No paradigm ID specified for suppress';
      return result;
    }

    // Initialize paradigm state if needed
    if (!targetMagic.paradigmState[paradigmId]) {
      targetMagic.paradigmState[paradigmId] = {};
    }

    const state = targetMagic.paradigmState[paradigmId] as ParadigmState;
    state.suppressed = true;
    state.suppressedUntil = effect.duration ? currentTick + effect.duration : undefined;

    result.appliedValues['paradigmsSuppressed'] = 1;
    result.appliedValues['duration'] = effect.duration || 0;

    return result;
  }

  private handleNullify(
    targetMagic: MagicComponent,
    paradigmId: string | undefined,
    effect: ParadigmEffect,
    result: EffectApplicationResult
  ): EffectApplicationResult {
    if (!paradigmId) {
      result.success = false;
      result.error = 'No paradigm ID specified for nullify';
      return result;
    }

    // Remove from known paradigms
    const index = targetMagic.knownParadigmIds.indexOf(paradigmId);
    if (index === -1) {
      result.appliedValues['notKnown'] = 1;
      return result;
    }

    targetMagic.knownParadigmIds.splice(index, 1);

    // If it was the active paradigm, clear it
    if (targetMagic.activeParadigmId === paradigmId) {
      targetMagic.activeParadigmId = undefined;
    }

    // Clear paradigm state
    if (targetMagic.paradigmState[paradigmId]) {
      delete targetMagic.paradigmState[paradigmId];
    }

    result.appliedValues['paradigmsNullified'] = 1;

    return result;
  }

  private handleAdapt(
    targetMagic: MagicComponent,
    effect: ParadigmEffect,
    result: EffectApplicationResult
  ): EffectApplicationResult {
    // Enable cross-paradigm spell adaptation
    const spellId = effect.parameters.spellId as string | undefined;
    const adaptationType = effect.parameters.adaptationType as 'translated' | 'hybrid' | 'suppressed' | 'enhanced' | undefined;

    if (!spellId || !adaptationType) {
      result.success = false;
      result.error = 'Cross-paradigm adaptation requires spellId and adaptationType';
      return result;
    }

    // Initialize adaptations array if needed
    if (!targetMagic.adaptations) {
      targetMagic.adaptations = [];
    }

    // Check if adaptation already exists
    const exists = targetMagic.adaptations.some((a) => a.spellId === spellId);

    if (exists) {
      result.appliedValues['alreadyAdapted'] = 1;
      return result;
    }

    // Add adaptation
    targetMagic.adaptations.push({
      spellId,
      adaptationType,
      modifications: {
        costModifier: effect.parameters.costModifier as number | undefined,
        additionalChannels: effect.parameters.additionalChannels as ChannelData[] | undefined,
        additionalRisks: effect.parameters.additionalRisks as RiskData[] | undefined,
      },
    });

    result.appliedValues['spellsAdapted'] = 1;

    return result;
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const paradigmEffectApplier = new ParadigmEffectApplier();

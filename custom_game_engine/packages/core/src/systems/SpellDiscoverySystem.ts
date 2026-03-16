/**
 * SpellDiscoverySystem - Agent experimentation to discover new spells
 *
 * Agents with magic skill can attempt to discover spells by combining
 * a technique + form + source. Success chance scales with magic skill level.
 * Failed attempts cost a small mana/health penalty depending on source.
 *
 * Flow:
 *   1. Agent queues an experiment request (technique + form + source)
 *   2. System checks skill gates — technique/form must be unlocked
 *   3. Success roll: base 20% + 15% per skill level above minimum
 *   4. On success: spell added to agent's knownSpells, event emitted
 *   5. On failure: small cost paid (mana or health), cooldown applied
 *
 * Part of Phase 30: Magic System Paradigm Implementation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { WorldMutator } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { MagicComponent, MagicTechnique, MagicForm, MagicSourceId, KnownSpell } from '../components/MagicComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import { getAccessBlockReason } from '../magic/SkillGates.js';
import { isMagicSourceAccessible } from '../magic/MagicSourceRegistry.js';

// ============================================================================
// Types
// ============================================================================

/** A queued spell experiment request */
export interface SpellExperimentRequest {
  agentId: string;
  technique: MagicTechnique;
  form: MagicForm;
  source: MagicSourceId;
}

/** Result of a spell experiment attempt */
export interface SpellExperimentResult {
  agentId: string;
  technique: MagicTechnique;
  form: MagicForm;
  source: MagicSourceId;
  success: boolean;
  spellId?: string;
  spellName?: string;
  failureReason?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Base success probability at the minimum required skill level */
const BASE_SUCCESS_CHANCE = 0.2;

/** Additional success probability per skill level above the minimum */
const SUCCESS_CHANCE_PER_EXTRA_LEVEL = 0.15;

/** Mana cost for a failed arcane experiment */
const FAILED_ARCANE_EXPERIMENT_MANA_COST = 10;

/** Health cost for a failed void experiment */
const FAILED_VOID_EXPERIMENT_HEALTH_COST = 5;

/** Minimum ticks between experiments for the same agent (20 TPS * 30s = 600 ticks) */
const EXPERIMENT_COOLDOWN_TICKS = 600;

// ============================================================================
// SpellDiscoverySystem
// ============================================================================

export class SpellDiscoverySystem extends BaseSystem {
  public readonly id: SystemId = 'spell_discovery';
  public readonly priority: number = 220; // After MagicSystem (priority 15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Magic, CT.Skills];

  protected readonly throttleInterval = 40; // Check every 2 seconds at 20 TPS

  private pendingExperiments: SpellExperimentRequest[] = [];
  /** Agent ID -> tick of last experiment attempt */
  private lastExperimentTick: Map<string, number> = new Map();

  protected onInitialize(_world: WorldMutator, eventBus: EventBus): void {
    eventBus.subscribe<'magic:experiment_requested'>('magic:experiment_requested', (event) => {
      this.queueExperiment({
        agentId: event.data.agentId,
        technique: event.data.technique as MagicTechnique,
        form: event.data.form as MagicForm,
        source: event.data.source as MagicSourceId,
      });
    });
  }

  /**
   * Queue a spell experiment request.
   * Duplicate requests from the same agent are silently dropped.
   */
  queueExperiment(request: SpellExperimentRequest): void {
    const alreadyPending = this.pendingExperiments.some(
      e => e.agentId === request.agentId
    );
    if (!alreadyPending) {
      this.pendingExperiments.push(request);
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    if (this.pendingExperiments.length === 0) return;

    const entityMap = new Map<string, EntityImpl>();
    for (const entity of ctx.activeEntities) {
      entityMap.set(entity.id, entity);
    }

    const toProcess = this.pendingExperiments.splice(0);
    for (const request of toProcess) {
      this.processExperiment(request, entityMap, ctx.tick);
    }
  }

  private processExperiment(
    request: SpellExperimentRequest,
    entityMap: Map<string, EntityImpl>,
    tick: number
  ): void {
    const entity = entityMap.get(request.agentId);
    if (!entity) return;

    const magic = entity.getComponent<MagicComponent>(CT.Magic);
    const skills = entity.getComponent<SkillsComponent>(CT.Skills);
    if (!magic || !skills) return;

    // Enforce per-agent cooldown
    const lastTick = this.lastExperimentTick.get(request.agentId) ?? 0;
    if (tick - lastTick < EXPERIMENT_COOLDOWN_TICKS) return;
    this.lastExperimentTick.set(request.agentId, tick);

    const magicSkillLevel = skills.levels.magic ?? 0;
    const identity = entity.getComponent<IdentityComponent>(CT.Identity);
    const agentName = identity?.name ?? request.agentId;

    // Check source accessibility (divine requires deity connection)
    const spiritual = entity.getComponent(CT.Spiritual) as { deityId?: string } | null;
    const hasDeity = !!(spiritual?.deityId);
    if (!isMagicSourceAccessible(request.source, hasDeity, magicSkillLevel)) {
      this.events.emitGeneric('magic:experiment_attempted', {
        agentId: request.agentId,
        technique: request.technique,
        form: request.form,
        source: request.source,
        success: false,
        failureReason: `Source '${request.source}' is not accessible`,
      });
      return;
    }

    // Check skill gates
    const blockReason = getAccessBlockReason(request.technique, request.form, magicSkillLevel);
    if (blockReason) {
      this.events.emitGeneric('magic:experiment_attempted', {
        agentId: request.agentId,
        technique: request.technique,
        form: request.form,
        source: request.source,
        success: false,
        failureReason: blockReason,
      });
      return;
    }

    // Check if already known
    const tentativeSpellId = this.buildSpellId(request);
    if (magic.knownSpells.some(s => s.spellId === tentativeSpellId)) {
      this.events.emitGeneric('magic:experiment_attempted', {
        agentId: request.agentId,
        technique: request.technique,
        form: request.form,
        source: request.source,
        success: false,
        failureReason: 'Spell already known',
      });
      return;
    }

    // Roll for success
    const minimumRequired = Math.max(
      this.getMinimumSkillForTechnique(request.technique),
      this.getMinimumSkillForForm(request.form)
    );
    const extraLevels = magicSkillLevel - minimumRequired;
    const successChance = Math.min(
      BASE_SUCCESS_CHANCE + extraLevels * SUCCESS_CHANCE_PER_EXTRA_LEVEL,
      0.95
    );
    const success = Math.random() < successChance;

    if (success) {
      const spellName = this.buildSpellName(request);
      const newSpell: KnownSpell = {
        spellId: tentativeSpellId,
        proficiency: 0,
        timesCast: 0,
      };
      magic.knownSpells.push(newSpell);

      this.events.emitGeneric('magic:experiment_attempted', {
        agentId: request.agentId,
        technique: request.technique,
        form: request.form,
        source: request.source,
        success: true,
        spellId: tentativeSpellId,
        spellName,
      });

      this.events.emitGeneric('magic:spell_discovered', {
        agentId: request.agentId,
        agentName,
        spellId: tentativeSpellId,
        spellName,
        technique: request.technique,
        form: request.form,
        source: request.source,
      });
    } else {
      // Pay failure cost
      this.applyFailureCost(request.source, magic);

      this.events.emitGeneric('magic:experiment_attempted', {
        agentId: request.agentId,
        technique: request.technique,
        form: request.form,
        source: request.source,
        success: false,
        failureReason: 'Experimentation failed -- try again',
      });
    }
  }

  private applyFailureCost(source: MagicSourceId, magic: MagicComponent): void {
    if (source === 'void') {
      const health = magic.resourcePools.health;
      if (health) {
        health.current = Math.max(1, health.current - FAILED_VOID_EXPERIMENT_HEALTH_COST);
      }
    } else {
      const mana = magic.resourcePools.mana;
      if (mana) {
        mana.current = Math.max(0, mana.current - FAILED_ARCANE_EXPERIMENT_MANA_COST);
      }
    }
  }

  private buildSpellId(request: SpellExperimentRequest): string {
    return `discovered_${request.source}_${request.technique}_${request.form}`;
  }

  private buildSpellName(request: SpellExperimentRequest): string {
    const techniqueWords: Record<MagicTechnique, string> = {
      create: 'Conjure',
      destroy: 'Annihilate',
      transform: 'Transmute',
      perceive: 'Sense',
      control: 'Command',
      protect: 'Ward',
      enhance: 'Empower',
      summon: 'Summon',
    };
    const formWords: Record<MagicForm, string> = {
      fire: 'Flame',
      water: 'Water',
      earth: 'Stone',
      air: 'Wind',
      body: 'Flesh',
      mind: 'Mind',
      spirit: 'Spirit',
      plant: 'Growth',
      animal: 'Beast',
      image: 'Illusion',
      void: 'Void',
      time: 'Time',
      space: 'Space',
      metal: 'Metal',
      sound: 'Sound',
      text: 'Word',
      emotion: 'Feeling',
    };

    const technique = techniqueWords[request.technique] ?? request.technique;
    const form = formWords[request.form] ?? request.form;
    return `${technique} ${form}`;
  }

  /** Returns the minimum skill level for a technique (mirrors SkillGates internals) */
  private getMinimumSkillForTechnique(technique: MagicTechnique): number {
    const mins: Record<MagicTechnique, number> = {
      create: 0, perceive: 0, control: 2, transform: 2,
      destroy: 4, protect: 4, enhance: 5, summon: 5,
    };
    return mins[technique];
  }

  /** Returns the minimum skill level for a form (mirrors SkillGates internals) */
  private getMinimumSkillForForm(form: MagicForm): number {
    const mins: Record<MagicForm, number> = {
      fire: 0, water: 0, air: 0, earth: 0,
      mind: 2, body: 2,
      plant: 4, animal: 4, void: 4,
      spirit: 5, image: 5, time: 5, space: 5, metal: 5,
      sound: 3, text: 3, emotion: 3,
    };
    return mins[form];
  }
}

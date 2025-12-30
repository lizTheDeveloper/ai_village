/**
 * DaemonCostCalculator - Cost calculation for Daemon paradigm (His Dark Materials style)
 *
 * Costs: daemon_bond (primary), dust_connection, separation_trauma
 *
 * Daemon magic works through soul-bond:
 * - Daemon is external soul manifestation
 * - Bond strength determines power
 * - Separation causes trauma
 * - Dust enhances connection
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '../../../components/MagicComponent.js';

/** Daemon settlement status */
type DaemonStatus = 'unsettled' | 'settling' | 'settled' | 'severed';

/**
 * Cost calculator for the Daemon magic paradigm.
 */
export class DaemonCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'daemon';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.daemon;
    const daemonStatus = (state?.settlementStatus ?? 'settled') as DaemonStatus;
    const distance = (context.custom?.daemonDistance ?? 0) as number;

    // =========================================================================
    // Daemon Bond Cost (Primary)
    // =========================================================================

    let bondCost = Math.ceil(spell.manaCost * 0.35);

    // Unsettled daemons are more versatile but less stable
    if (daemonStatus === 'unsettled') {
      bondCost = Math.ceil(bondCost * 0.7);
    }

    // Settled daemons are more efficient in their form's domain
    if (daemonStatus === 'settled' && this.matchesDaemonForm(spell, state?.daemonForm as string)) {
      bondCost = Math.ceil(bondCost * 0.5);
    }

    // Severed individuals have greatly reduced magic
    if (daemonStatus === 'severed') {
      bondCost = Math.ceil(bondCost * 3);
    }

    costs.push({
      type: 'daemon_bond',
      amount: bondCost,
      source: 'soul_channeling',
      terminal: true,
    });

    // =========================================================================
    // Separation Trauma (Distance from daemon)
    // =========================================================================

    if (distance > 0) {
      // Being apart from daemon causes pain
      const traumaCost = Math.ceil(distance * 2);

      costs.push({
        type: 'separation_trauma',
        amount: traumaCost,
        source: 'daemon_distance',
      });
    }

    // =========================================================================
    // Dust Connection (For enhanced magic)
    // =========================================================================

    // Higher-level spells require dust connection
    if (spell.manaCost > 30) {
      const dustCost = Math.ceil((spell.manaCost - 30) * 0.3);

      costs.push({
        type: 'dust',
        amount: dustCost,
        source: 'dust_channel',
      });
    }

    // =========================================================================
    // Form Mismatch Penalty
    // =========================================================================

    if (daemonStatus === 'settled' && !this.matchesDaemonForm(spell, state?.daemonForm as string)) {
      // Using magic that doesn't match daemon's settled form
      costs.push({
        type: 'daemon_bond',
        amount: Math.ceil(bondCost * 0.3),
        source: 'form_mismatch',
      });
    }

    return costs;
  }

  /**
   * Check if spell matches the daemon's settled form.
   */
  private matchesDaemonForm(spell: ComposedSpell, form?: string): boolean {
    if (!form) return false;

    // Form-to-spell-type mappings
    const formAffinities: Record<string, string[]> = {
      wolf: ['body', 'animal', 'earth'],
      hawk: ['air', 'perceive', 'spirit'],
      cat: ['shadow', 'perceive', 'mind'],
      bear: ['body', 'earth', 'protect'],
      snake: ['poison', 'mind', 'control'],
      raven: ['spirit', 'mind', 'perceive'],
      lion: ['fire', 'body', 'command'],
    };

    const affinities = formAffinities[form.toLowerCase()] ?? [];
    return affinities.includes(spell.form) || affinities.includes(spell.technique);
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Daemon bond pool - soul connection strength
    const bondMax = options?.maxOverrides?.daemon_bond ?? 100;
    const bondStart = options?.currentOverrides?.daemon_bond ?? 100;

    caster.resourcePools.daemon_bond = {
      type: 'daemon_bond',
      current: bondStart,
      maximum: bondMax,
      regenRate: 1, // Recovers through rest/proximity
      locked: 0,
    };

    // Separation trauma pool (accumulates when apart)
    caster.resourcePools.separation_trauma = {
      type: 'separation_trauma',
      current: options?.currentOverrides?.separation_trauma ?? 0,
      maximum: 100,
      regenRate: -0.5, // Slowly heals when together
      locked: 0,
    };

    // Dust connection pool
    caster.resourcePools.dust = {
      type: 'dust',
      current: options?.currentOverrides?.dust ?? 50,
      maximum: options?.maxOverrides?.dust ?? 100,
      regenRate: 0.2, // Slow ambient accumulation
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.daemon = {
      daemonName: undefined,
      daemonForm: undefined, // Undefined = unsettled
      settlementStatus: 'unsettled' as DaemonStatus,
      custom: {
        previousForms: [],
        dustSensitivity: 50,
        witchClan: undefined,
        canSeparate: false,
      },
    };
  }

  /**
   * Override terminal effect for daemon-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'daemon_bond' && trigger === 'zero') {
      return {
        type: 'bond_severed',
        daemonLost: true,
      };
    }

    if (costType === 'separation_trauma' && trigger === 'max') {
      return {
        type: 'death',
        cause: 'Soul torn apart from daemon - fatal separation',
      };
    }

    if (costType === 'dust' && trigger === 'zero') {
      return {
        type: 'dust_depleted',
        connectionLost: true,
      };
    }

    return super.getTerminalEffect(costType as any, trigger, _caster);
  }

  /**
   * Separation trauma is cumulative.
   */
  protected override isCumulativeCost(costType: string): boolean {
    return costType === 'separation_trauma' || super.isCumulativeCost(costType as any);
  }
}

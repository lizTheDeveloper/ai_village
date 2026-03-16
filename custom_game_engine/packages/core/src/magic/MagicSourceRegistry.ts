/**
 * MagicSourceRegistry - Simple registry for magic source configurations
 *
 * Maps magic source IDs (arcane, divine, void, etc.) to their
 * cost types, paradigm IDs, and requirements.
 *
 * Part of Phase 30: Magic System Paradigm Implementation
 */

import type { MagicSourceId } from '../components/MagicComponent.js';
import type { MagicCostType } from './MagicParadigm.js';

// ============================================================================
// Magic Source Config
// ============================================================================

/** Requirements that must be met to use a magic source */
export interface MagicSourceRequirement {
  /** Must have BeliefComponent with deity connection */
  requiresDeity?: boolean;

  /** Minimum magic skill level (0-5) to access */
  minimumSkill?: number;

  /** Whether the source is freely accessible (no special requirements) */
  freeAccess: boolean;
}

/** Definition of how a magic source works */
export interface MagicSourceConfig {
  /** Source identifier */
  id: MagicSourceId;

  /** Human-readable name */
  name: string;

  /** Paradigm ID used for cost calculation */
  paradigmId: string;

  /** Primary cost type for this source */
  primaryCostType: MagicCostType;

  /** Description for display/LLM prompts */
  description: string;

  /** Requirements to use this source */
  requirements: MagicSourceRequirement;

  /** Power multiplier relative to arcane (1.0 = equal) */
  powerMultiplier: number;

  /** Whether using this source can cause corruption */
  canCorrupt: boolean;

  /** Corruption chance per cast (0-1, only if canCorrupt) */
  corruptionChance?: number;
}

// ============================================================================
// Registry Implementation
// ============================================================================

export class MagicSourceRegistry {
  private static instance: MagicSourceRegistry | null = null;
  private sources: Map<MagicSourceId, MagicSourceConfig> = new Map();

  private constructor() {}

  static getInstance(): MagicSourceRegistry {
    if (!MagicSourceRegistry.instance) {
      MagicSourceRegistry.instance = new MagicSourceRegistry();
      MagicSourceRegistry.instance.registerDefaults();
    }
    return MagicSourceRegistry.instance;
  }

  /** Reset for testing */
  static resetInstance(): void {
    MagicSourceRegistry.instance = null;
  }

  register(config: MagicSourceConfig): void {
    this.sources.set(config.id, config);
  }

  get(id: MagicSourceId): MagicSourceConfig {
    const config = this.sources.get(id);
    if (!config) {
      throw new Error(`MagicSourceRegistry: Unknown source '${id}'`);
    }
    return config;
  }

  has(id: MagicSourceId): boolean {
    return this.sources.has(id);
  }

  listAll(): MagicSourceConfig[] {
    return Array.from(this.sources.values());
  }

  // ============================================================================
  // Default Source Registrations
  // ============================================================================

  private registerDefaults(): void {
    // Arcane: scholarly, mana-based, learnable by anyone
    this.register({
      id: 'arcane',
      name: 'Arcane Magic',
      paradigmId: 'academic',
      primaryCostType: 'mana',
      description: 'Scholarly magic fueled by internal mana. Reliable and learnable through study.',
      requirements: { freeAccess: true },
      powerMultiplier: 1.0,
      canCorrupt: false,
    });

    // Divine: faith-based, requires deity connection
    this.register({
      id: 'divine',
      name: 'Divine Magic',
      paradigmId: 'divine',
      primaryCostType: 'favor',
      description: 'Magic granted by deities, fueled by faith. Requires connection to a god.',
      requirements: { requiresDeity: true, freeAccess: false },
      powerMultiplier: 1.2,
      canCorrupt: false,
    });

    // Void: dangerous, costs health, corrupts the caster
    this.register({
      id: 'void',
      name: 'Void Magic',
      paradigmId: 'void',
      primaryCostType: 'health',
      description: 'Forbidden power drawn from entropy and emptiness. Costs health and risks corruption.',
      requirements: { freeAccess: true },
      powerMultiplier: 1.5,
      canCorrupt: true,
      corruptionChance: 0.1,
    });

    // Blood: life force sacrifice
    this.register({
      id: 'blood',
      name: 'Blood Magic',
      paradigmId: 'blood',
      primaryCostType: 'blood',
      description: 'Primal magic drawn from life force. Requires blood sacrifice.',
      requirements: { freeAccess: true },
      powerMultiplier: 1.3,
      canCorrupt: true,
      corruptionChance: 0.15,
    });

    // Nature: ambient, druidic
    this.register({
      id: 'nature',
      name: 'Nature Magic',
      paradigmId: 'academic',
      primaryCostType: 'mana',
      description: 'Magic drawn from the natural world. Stronger outdoors and near natural features.',
      requirements: { freeAccess: true },
      powerMultiplier: 1.0,
      canCorrupt: false,
    });

    // Ancestral: spirit-based
    this.register({
      id: 'ancestral',
      name: 'Ancestral Magic',
      paradigmId: 'academic',
      primaryCostType: 'mana',
      description: 'Magic channeled through ancestral spirits. Requires spiritual attunement.',
      requirements: { freeAccess: true, minimumSkill: 2 },
      powerMultiplier: 1.1,
      canCorrupt: false,
    });
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function getMagicSourceRegistry(): MagicSourceRegistry {
  return MagicSourceRegistry.getInstance();
}

export function getMagicSource(id: MagicSourceId): MagicSourceConfig {
  return MagicSourceRegistry.getInstance().get(id);
}

export function isMagicSourceAccessible(
  id: MagicSourceId,
  hasDeity: boolean,
  magicSkillLevel: number
): boolean {
  const registry = MagicSourceRegistry.getInstance();
  if (!registry.has(id)) return false;

  const config = registry.get(id);
  const req = config.requirements;

  if (req.requiresDeity && !hasDeity) return false;
  if (req.minimumSkill !== undefined && magicSkillLevel < req.minimumSkill) return false;

  return true;
}

/**
 * AngelTypes - Shared Angel Type Definitions
 *
 * Extracted to break circular dependency between AngelSystem and AngelAIDecisionProcessor.
 */

// ============================================================================
// Angel Types
// ============================================================================

export interface AngelData {
  id: string;
  deityId: string;
  entityId: string;
  rank: AngelRank;
  purpose: AngelPurpose;
  createdAt: number;
  beliefCostPerTick: number;
  active: boolean;
  autonomousAI: boolean;
  currentTask?: AngelTask;
  // Phase 28: Tier system
  tier: number;
  name: string;
}

export type AngelRank =
  | 'messenger'      // Low-tier, delivers messages
  | 'guardian'       // Mid-tier, protects believers
  | 'warrior'        // Combat-focused
  | 'scholar'        // Knowledge-focused
  | 'seraph';        // High-tier, powerful

export type AngelPurpose =
  | 'deliver_messages'
  | 'protect_believers'
  | 'guard_temple'
  | 'punish_heretics'
  | 'gather_souls'
  | 'perform_miracles';

export interface AngelTask {
  type: 'deliver_message' | 'protect' | 'guard' | 'smite' | 'bless';
  targetId?: string;
  location?: { x: number; y: number };
  completionCondition: string;
}

// ============================================================================
// Angel Configuration
// ============================================================================

export interface AngelConfig {
  /** Base cost to create angel */
  creationCosts: Record<AngelRank, number>;

  /** Maintenance cost per tick */
  maintenanceCosts: Record<AngelRank, number>;

  /** Update interval */
  updateInterval: number;
}

export const DEFAULT_ANGEL_CONFIG: AngelConfig = {
  creationCosts: {
    messenger: 200,
    guardian: 400,
    warrior: 600,
    scholar: 500,
    seraph: 1000,
  },
  maintenanceCosts: {
    messenger: 2,
    guardian: 4,
    warrior: 6,
    scholar: 5,
    seraph: 10,
  },
  updateInterval: 200, // ~10 seconds at 20 TPS
};

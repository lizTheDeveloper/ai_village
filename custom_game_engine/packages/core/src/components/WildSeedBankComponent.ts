import { ComponentBase } from '../ecs/Component.js';

export interface WildSeedBankEntry {
  speciesId: string;
  position: { x: number; y: number };
  viability: number;
  ageInDays: number;
  dormant: boolean;
}

/**
 * WildSeedBankComponent — world-level singleton component
 *
 * Persists the WildPlantPopulationSystem's in-memory seed bank across save/load cycles.
 * Without this, wild plant ecology resets completely on every game load.
 *
 * Stored on any world entity; only one instance should exist.
 */
export class WildSeedBankComponent extends ComponentBase {
  public readonly type = 'wild_seed_bank' as const;

  /**
   * Seed banks keyed by chunk key ("chunkX,chunkY")
   */
  public banks: Map<string, WildSeedBankEntry[]>;

  constructor(banks?: Map<string, WildSeedBankEntry[]>) {
    super();
    this.banks = banks ?? new Map();
  }
}

/**
 * Serializer for WildSeedBankComponent — converts the banks Map to a JSON-safe
 * array of [chunkKey, entries] pairs, since JSON.stringify silently drops Maps.
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { WildSeedBankComponent, type WildSeedBankEntry } from '../../components/WildSeedBankComponent.js';

interface SerializedWildSeedBank {
  banks: Array<[string, WildSeedBankEntry[]]>;
}

export class WildSeedBankSerializer extends BaseComponentSerializer<WildSeedBankComponent> {
  constructor() {
    super('wild_seed_bank', 1);
  }

  protected serializeData(component: WildSeedBankComponent): SerializedWildSeedBank {
    return {
      banks: Array.from(component.banks.entries()),
    };
  }

  protected deserializeData(data: unknown): WildSeedBankComponent {
    const serialized = data as SerializedWildSeedBank;
    const banks = new Map<string, WildSeedBankEntry[]>(serialized.banks ?? []);
    return new WildSeedBankComponent(banks);
  }

  validate(data: unknown): data is WildSeedBankComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('WildSeedBankComponent data must be object');
    }
    return true;
  }
}

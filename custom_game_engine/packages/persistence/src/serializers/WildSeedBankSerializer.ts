import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { WildSeedBankComponent, type WildSeedBankEntry } from '@ai-village/core';

interface SerializedWildSeedBank {
  bankEntries: Array<[string, WildSeedBankEntry[]]>;
}

export class WildSeedBankSerializer extends BaseComponentSerializer<WildSeedBankComponent> {
  constructor() {
    super('wild_seed_bank', 1);
  }

  protected serializeData(component: WildSeedBankComponent): SerializedWildSeedBank {
    return {
      bankEntries: Array.from(component.banks.entries()),
    };
  }

  protected deserializeData(data: unknown): WildSeedBankComponent {
    const serialized = data as SerializedWildSeedBank;
    const banks = new Map<string, WildSeedBankEntry[]>(
      Array.isArray(serialized.bankEntries) ? serialized.bankEntries : []
    );
    return new WildSeedBankComponent(banks);
  }

  validate(data: unknown): data is WildSeedBankComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('WildSeedBankComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.bankEntries)) {
      throw new Error('WildSeedBankComponent data must have bankEntries array');
    }
    return true;
  }
}

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import {
  DiscoveryNamingComponent,
  type DiscoveryCategory,
  type NamedDiscovery,
} from '@ai-village/core';

interface SerializedPending {
  description: string;
  eventTick: number;
  eventDay: number;
  entityIds: string[];
}

interface SerializedDiscoveryNaming {
  discoveriesEntries: Array<[DiscoveryCategory, NamedDiscovery]>;
  pendingNamingEntries: Array<[DiscoveryCategory, SerializedPending]>;
}

export class DiscoveryNamingSerializer extends BaseComponentSerializer<DiscoveryNamingComponent> {
  constructor() {
    super('discovery_naming', 1);
  }

  protected serializeData(component: DiscoveryNamingComponent): SerializedDiscoveryNaming {
    return {
      discoveriesEntries: Array.from(component.discoveries.entries()),
      pendingNamingEntries: Array.from(component.pendingNaming.entries()),
    };
  }

  protected deserializeData(data: unknown): DiscoveryNamingComponent {
    const serialized = data as SerializedDiscoveryNaming;
    const component = new DiscoveryNamingComponent();

    if (serialized.discoveriesEntries && Array.isArray(serialized.discoveriesEntries)) {
      component.discoveries = new Map(serialized.discoveriesEntries);
    }

    if (serialized.pendingNamingEntries && Array.isArray(serialized.pendingNamingEntries)) {
      component.pendingNaming = new Map(serialized.pendingNamingEntries);
    }

    return component;
  }

  validate(data: unknown): data is DiscoveryNamingComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('DiscoveryNamingComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.discoveriesEntries)) {
      throw new Error('DiscoveryNamingComponent data must have discoveriesEntries array');
    }
    return true;
  }
}

/**
 * Serializer for TrustNetworkComponent - properly reconstructs Map instances
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { TrustNetworkComponent, type VerificationRecord } from '@ai-village/core';

interface SerializedTrustNetwork {
  scores: Array<[string, number]>;
  verificationHistory: Array<[string, readonly VerificationRecord[]]>;
}

export class TrustNetworkSerializer extends BaseComponentSerializer<TrustNetworkComponent> {
  constructor() {
    super('trust_network', 1);
  }

  protected serializeData(component: TrustNetworkComponent): SerializedTrustNetwork {
    // Convert Maps to arrays of key-value pairs for JSON serialization
    return {
      scores: Array.from(component.scores.entries()),
      verificationHistory: Array.from(component.verificationHistory.entries()),
    };
  }

  protected deserializeData(data: unknown): TrustNetworkComponent {
    const serialized = data as SerializedTrustNetwork;

    // Validation already ensures arrays exist - no fallbacks needed
    // Reconstruct Maps from arrays
    const scores = new Map(serialized.scores);

    // Convert readonly arrays to mutable arrays
    const verificationHistory = new Map(
      serialized.verificationHistory.map(([key, records]) => [key, [...records]] as [string, VerificationRecord[]])
    );

    // Use constructor to properly initialize the component
    return new TrustNetworkComponent({
      scores,
      verificationHistory,
    });
  }

  validate(data: unknown): data is TrustNetworkComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('TrustNetworkComponent data must be object');
    }
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.scores)) {
      throw new Error('TrustNetworkComponent must have scores array');
    }
    if (!Array.isArray(d.verificationHistory)) {
      throw new Error('TrustNetworkComponent must have verificationHistory array');
    }
    return true;
  }
}

/**
 * Trust Network Component Schema
 *
 * Trust tracking and verification history
 * Phase 6, Batch 6 - Buildings & Systems
 */

import { defineComponent } from '../../types/ComponentSchema.js';
import { autoRegister } from '../../registry/autoRegister.js';
import type { Component } from '@ai-village/core';

// TrustNetworkComponent is a class, so we define the interface here
export interface TrustNetworkComponent extends Component {
  type: 'trust_network';
  version: 1;
}

export const TrustNetworkSchema = autoRegister(
  defineComponent<TrustNetworkComponent>({
    type: 'trust_network',
    version: 1,
    category: 'social',

    fields: {
      // Note: TrustNetworkComponent uses private fields with getters/setters
      // The schema describes the conceptual interface
    },

    ui: {
      icon: '🤝',
      color: '#2196F3',
      priority: 4,
    },

    llm: {
      promptSection: 'Social',
      summarize: (data: any) => {
        // TrustNetworkComponent has special methods for access
        const trustCount = data.trustLevels?.size ?? 0;
        const avgTrust = data.getAverageTrustScore?.() ?? 0.5;
        return `Trust network: ${trustCount} agents tracked, avg trust ${(avgTrust * 100).toFixed(0)}%`;
      },
    },

    createDefault: (): TrustNetworkComponent => ({
      type: 'trust_network',
      version: 1,
    }),
  })
);

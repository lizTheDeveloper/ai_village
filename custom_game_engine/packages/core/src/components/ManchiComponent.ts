import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * ManchiComponent - Man'chi loyalty system
 *
 * For species with strong loyalty bonds to lords
 */
export interface ManchiComponent extends Component {
  readonly type: 'manchi';
  readonly version: 1;

  /** Lord this entity is loyal to */
  lordId: EntityId;

  /** Strength of loyalty (0-1) */
  loyaltyStrength: number;

  /** Whether this entity can surrender (restricted by man'chi) */
  canSurrender?: boolean;
}

export function createManchiComponent(data: {
  lordId: EntityId;
  loyaltyStrength: number;
  [key: string]: any;
}): ManchiComponent {
  if (!data.lordId) {
    throw new Error('Lord ID is required');
  }
  if (data.loyaltyStrength === undefined) {
    throw new Error('Loyalty strength is required');
  }

  return {
    type: 'manchi',
    version: 1,
    lordId: data.lordId,
    loyaltyStrength: data.loyaltyStrength,
    canSurrender: data.canSurrender !== undefined ? data.canSurrender : false,
  };
}

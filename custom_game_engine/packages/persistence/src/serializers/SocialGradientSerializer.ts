/**
 * Serializer for SocialGradientComponent - properly reconstructs class instance
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { SocialGradientComponent, type Gradient } from '@ai-village/core';

interface SerializedSocialGradient {
  gradients: Gradient[];
  gradientCounter: number;
}

export class SocialGradientSerializer extends BaseComponentSerializer<SocialGradientComponent> {
  constructor() {
    super('social_gradient', 1);
  }

  protected serializeData(component: SocialGradientComponent): SerializedSocialGradient {
    const componentAny = component as unknown as {
      _gradients: Gradient[];
      _gradientCounter: number;
    };

    return {
      gradients: [...componentAny._gradients],
      gradientCounter: componentAny._gradientCounter,
    };
  }

  protected deserializeData(data: unknown): SocialGradientComponent {
    const serialized = data as SerializedSocialGradient;

    // Create new component
    const component = new SocialGradientComponent();

    // Access private fields
    const componentAny = component as unknown as {
      _gradients: Gradient[];
      _gradientCounter: number;
    };

    // Restore gradients
    if (serialized.gradients && Array.isArray(serialized.gradients)) {
      componentAny._gradients = [...serialized.gradients];
    }

    // Restore counter
    if (serialized.gradientCounter !== undefined) {
      componentAny._gradientCounter = serialized.gradientCounter;
    }

    return component;
  }

  validate(data: unknown): data is SocialGradientComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('SocialGradientComponent data must be object');
    }
    return true;
  }
}

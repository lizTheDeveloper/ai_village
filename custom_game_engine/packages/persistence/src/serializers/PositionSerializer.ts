/**
 * PositionComponent serializer
 */

import type { PositionComponent } from '@ai-village/core';
import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { assertDefined, assertFiniteNumber } from '../utils.js';
import { CHUNK_SIZE } from '@ai-village/core';

export class PositionSerializer extends BaseComponentSerializer<PositionComponent> {
  constructor() {
    super('position', 1);  // Current version: 1
  }

  protected serializeData(component: PositionComponent): unknown {
    return {
      x: component.x,
      y: component.y,
      z: component.z,
    };
  }

  protected deserializeData(data: unknown): PositionComponent {
    const obj = data as Record<string, unknown>;

    assertFiniteNumber(obj.x, 'x', 'position');
    assertFiniteNumber(obj.y, 'y', 'position');

    const x = obj.x as number;
    const y = obj.y as number;
    const z = typeof obj.z === 'number' ? obj.z : 0;

    return {
      type: 'position',
      version: 1,
      x,
      y,
      z,
      chunkX: Math.floor(x / CHUNK_SIZE),
      chunkY: Math.floor(y / CHUNK_SIZE),
    };
  }

  validate(data: unknown): data is PositionComponent {
    if (typeof data !== 'object' || data === null) return false;

    const obj = data as Record<string, unknown>;

    assertDefined(obj.x, 'x', 'position');
    assertDefined(obj.y, 'y', 'position');
    assertFiniteNumber(obj.x, 'x', 'position');
    assertFiniteNumber(obj.y, 'y', 'position');

    return true;
  }
}

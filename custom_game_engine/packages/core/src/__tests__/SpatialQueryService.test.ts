/**
 * Test that SpatialQueryService types are exported correctly
 */

import { describe, it, expectTypeOf } from 'vitest';
import type { World, SpatialQueryService } from '../index.js';

describe('SpatialQueryService', () => {
  it('should have correct type shape on World', () => {
    // This test verifies types compile correctly — no runtime assertions needed
    expectTypeOf<World>().toHaveProperty('spatialQuery');
  });

  it('should expose required query methods', () => {
    expectTypeOf<SpatialQueryService>().toHaveProperty('getEntitiesInRadius');
    expectTypeOf<SpatialQueryService>().toHaveProperty('getNearestEntity');
    expectTypeOf<SpatialQueryService>().toHaveProperty('hasEntityInRadius');
    expectTypeOf<SpatialQueryService>().toHaveProperty('countEntitiesInRadius');
  });
});

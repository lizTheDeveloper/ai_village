/**
 * Test that SpatialQueryService types are exported correctly
 */

import type { World, SpatialQueryService } from '../index.js';

// This test file just verifies types compile correctly
export function testSpatialQueryServiceTypes(world: World) {
  // Should be able to access spatialQuery from world
  const spatialQuery: SpatialQueryService | null = world.spatialQuery;

  if (spatialQuery) {
    // Should have all required methods
    const _results = spatialQuery.getEntitiesInRadius(0, 0, 10, ['agent']);
    const _nearest = spatialQuery.getNearestEntity(0, 0, ['plant']);
    const _hasEntity = spatialQuery.hasEntityInRadius(0, 0, 10, ['building']);
    const _count = spatialQuery.countEntitiesInRadius(0, 0, 10, ['resource']);
  }
}

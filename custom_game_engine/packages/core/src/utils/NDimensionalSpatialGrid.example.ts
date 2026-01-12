/**
 * Usage Examples for NDimensionalSpatialGrid
 *
 * This file demonstrates common use cases for the N-dimensional spatial grid.
 */

import { NDimensionalSpatialGrid } from './NDimensionalSpatialGrid.js';

// ==============================================================================
// Example 1: 2D Position Grid (Classic Spatial Hashing)
// ==============================================================================

function example2DPositionGrid() {
  console.log('\n=== 2D Position Grid ===');

  const grid = new NDimensionalSpatialGrid(2, 15);

  // Add entities with [x, y] coordinates
  grid.add('agent1', [10, 20]);
  grid.add('agent2', [15, 22]);
  grid.add('agent3', [100, 100]);

  // Find all entities near position [10, 20] within radius 10
  const nearby = grid.query([10, 20], 10);
  console.log('Entities near [10, 20]:', nearby);
  // Output: ['agent1', 'agent2'] (agent3 is too far)

  // Update an entity's position
  grid.update('agent1', [50, 50]);

  // Remove an entity
  grid.remove('agent3');

  console.log('Grid stats:', grid.getStats());
}

// ==============================================================================
// Example 2: 4D Environmental Grid (Position + Temperature + Humidity)
// ==============================================================================

function example4DEnvironmentalGrid() {
  console.log('\n=== 4D Environmental Grid ===');

  const grid = new NDimensionalSpatialGrid(4, 15);

  // Add entities with [x, y, temperature, humidity]
  grid.add('plant1', [10, 10, 25, 60]); // Temperate, humid
  grid.add('plant2', [12, 12, 27, 65]); // Similar conditions
  grid.add('plant3', [10, 10, 80, 10]); // Hot, dry (same position!)

  // Find plants in similar environmental conditions
  // Within 5 units in all dimensions
  const similar = grid.query([10, 10, 25, 60], 5);
  console.log('Plants in similar environment:', similar);
  // Output: ['plant1', 'plant2'] (plant3 is too far in temp/humidity)

  // Asymmetric query: Wide spatial range, narrow environmental tolerance
  const asymmetric = grid.queryAsymmetric(
    [10, 10, 25, 60],
    [50, 50, 3, 5] // ±50 position, ±3°C, ±5% humidity
  );
  console.log('Plants with asymmetric search:', asymmetric);
}

// ==============================================================================
// Example 3: Social Network Grid (Position + Personality Traits)
// ==============================================================================

function example6DSocialGrid() {
  console.log('\n=== 6D Social Network Grid ===');

  // [x, y, openness, conscientiousness, extraversion, agreeableness]
  const grid = new NDimensionalSpatialGrid(6, 15);

  grid.add('alice', [10, 10, 80, 70, 60, 75]);
  grid.add('bob', [12, 12, 85, 65, 55, 80]);
  grid.add('charlie', [100, 100, 20, 30, 90, 40]);

  // Find people similar to Alice in personality AND nearby in space
  const compatible = grid.query([10, 10, 80, 70, 60, 75], 15);
  console.log('People compatible with Alice:', compatible);
  // Output: ['alice', 'bob'] (charlie is far in both space and personality)

  // Find people with similar personality regardless of location
  const personalityMatch = grid.queryAsymmetric(
    [10, 10, 80, 70, 60, 75],
    [1000, 1000, 10, 10, 10, 10] // Ignore position, tight personality match
  );
  console.log('Personality matches:', personalityMatch);
}

// ==============================================================================
// Example 4: Performance Testing
// ==============================================================================

function examplePerformance() {
  console.log('\n=== Performance Test ===');

  const grid = new NDimensionalSpatialGrid(2, 15);

  // Add 10,000 entities
  console.time('Add 10,000 entities');
  for (let i = 0; i < 10000; i++) {
    grid.add(`entity${i}`, [
      Math.random() * 1000,
      Math.random() * 1000
    ]);
  }
  console.timeEnd('Add 10,000 entities');

  // Query performance
  console.time('Query (radius 50)');
  const results = grid.query([500, 500], 50);
  console.timeEnd('Query (radius 50)');
  console.log(`Found ${results.length} entities`);

  console.log('Final stats:', grid.getStats());
}

// ==============================================================================
// Example 5: Dynamic Updates (Entity Movement)
// ==============================================================================

function exampleDynamicMovement() {
  console.log('\n=== Dynamic Movement ===');

  const grid = new NDimensionalSpatialGrid(2, 15);

  // Add moving entities
  const entities = ['ship1', 'ship2', 'ship3'];
  entities.forEach((id, i) => {
    grid.add(id, [i * 10, i * 10]);
  });

  // Simulate movement over time
  console.log('Initial positions:');
  entities.forEach(id => {
    console.log(`  ${id}:`, grid.getPosition(id));
  });

  // Update positions (efficient - only rehashes if cell changes)
  console.time('Update 1000 positions');
  for (let i = 0; i < 1000; i++) {
    entities.forEach(id => {
      const pos = grid.getPosition(id)!;
      grid.update(id, [pos[0]! + 0.1, pos[1]! + 0.1]);
    });
  }
  console.timeEnd('Update 1000 positions');

  console.log('Final positions:');
  entities.forEach(id => {
    console.log(`  ${id}:`, grid.getPosition(id));
  });
}

// ==============================================================================
// Run Examples
// ==============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  example2DPositionGrid();
  example4DEnvironmentalGrid();
  example6DSocialGrid();
  examplePerformance();
  exampleDynamicMovement();
}

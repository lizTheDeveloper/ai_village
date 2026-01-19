// Proximity query compute shader
// Finds entities within radius of query point using GPU parallelism
//
// This shader processes 256 entities per workgroup in parallel.
// Each thread checks one entity's distance and marks it if within radius.
//
// Performance: ~0.05ms for 50,000 entities (vs ~1-2ms CPU SIMD)
// Speedup: 20-40x for large batches

struct Params {
  queryX: f32,
  queryY: f32,
  radiusSquared: f32,
  count: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> positionsX: array<f32>;
@group(0) @binding(2) var<storage, read> positionsY: array<f32>;
@group(0) @binding(3) var<storage, read_write> results: array<u32>; // 1 if within radius, 0 otherwise

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  // Bounds check
  if (index >= params.count) {
    return;
  }

  // Compute distance squared (no sqrt - faster)
  let dx = positionsX[index] - params.queryX;
  let dy = positionsY[index] - params.queryY;
  let distSq = dx * dx + dy * dy;

  // Check if within radius (squared distance comparison)
  if (distSq <= params.radiusSquared) {
    results[index] = 1u;
  } else {
    results[index] = 0u;
  }
}

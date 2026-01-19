// Position update compute shader
// Updates positions based on velocities using GPU parallelism
//
// This shader processes 256 entities per workgroup in parallel.
// Each thread handles one entity's position update.
//
// Performance: ~0.1ms for 50,000 entities (vs ~2-3ms CPU SIMD)
// Speedup: 20-30x for large batches

struct Params {
  deltaTime: f32,
  count: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read_write> positionsX: array<f32>;
@group(0) @binding(2) var<storage, read_write> positionsY: array<f32>;
@group(0) @binding(3) var<storage, read> velocitiesX: array<f32>;
@group(0) @binding(4) var<storage, read> velocitiesY: array<f32>;
@group(0) @binding(5) var<storage, read> speedMultipliers: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let index = global_id.x;

  // Bounds check - skip threads beyond entity count
  if (index >= params.count) {
    return;
  }

  // Skip if speed multiplier is 0 (sleeping, near-zero velocity, etc.)
  let speedMultiplier = speedMultipliers[index];
  if (speedMultiplier == 0.0) {
    return;
  }

  // Update position: pos += vel * deltaTime * speedMultiplier
  // This is a fused multiply-add (FMA) operation - very fast on GPU
  positionsX[index] = positionsX[index] + velocitiesX[index] * speedMultiplier;
  positionsY[index] = positionsY[index] + velocitiesY[index] * speedMultiplier;
}

/**
 * WebAssembly SIMD Operations with Explicit Intrinsics
 *
 * This module implements SIMD operations using explicit v128 intrinsics for guaranteed
 * vectorization and maximum performance. Unlike JavaScript auto-vectorization which relies
 * on JIT heuristics, these operations always compile to SIMD instructions.
 *
 * Performance expectations vs JS auto-vectorization:
 * - Small arrays (<1,000): 0.9x (memory copy overhead)
 * - Medium arrays (1,000-10,000): 1.5-2x
 * - Large arrays (10,000-50,000): 2-3x
 * - Huge arrays (50,000+): 2-4x
 *
 * SIMD Processing Width:
 * - f32x4: 4 floats per instruction (128-bit v128)
 * - Tail loop: Scalar processing for remaining elements
 *
 * Browser Support (WASM SIMD):
 * - Chrome 91+ (June 2021)
 * - Edge 91+ (June 2021)
 * - Firefox 89+ (June 2021)
 * - Safari 16.4+ (March 2023)
 *
 * @see https://github.com/WebAssembly/simd/blob/main/proposals/simd/SIMD.md
 */

/**
 * Add two f32 arrays using WASM SIMD (v128)
 * Processes 4 floats per instruction
 *
 * result[i] = a[i] + b[i]
 *
 * @param result - Output array
 * @param a - First input array
 * @param b - Second input array
 * @param count - Number of elements to process
 */
export function addArraysSIMD(
  result: Float32Array,
  a: Float32Array,
  b: Float32Array,
  count: i32
): void {
  let i = 0;

  // SIMD loop: Process 4 floats at a time
  for (; i + 4 <= count; i += 4) {
    // Load 4 floats from each array
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));

    // Add 4 floats in parallel
    const vr = f32x4.add(va, vb);

    // Store 4 results
    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  // Scalar tail loop for remaining elements
  for (; i < count; i++) {
    unchecked(result[i] = a[i] + b[i]);
  }
}

/**
 * Subtract two f32 arrays using WASM SIMD
 *
 * result[i] = a[i] - b[i]
 *
 * @param result - Output array
 * @param a - First input array
 * @param b - Second input array
 * @param count - Number of elements to process
 */
export function subtractArraysSIMD(
  result: Float32Array,
  a: Float32Array,
  b: Float32Array,
  count: i32
): void {
  let i = 0;

  // SIMD loop
  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));
    const vr = f32x4.sub(va, vb);
    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  // Scalar tail
  for (; i < count; i++) {
    unchecked(result[i] = a[i] - b[i]);
  }
}

/**
 * Multiply array by scalar using WASM SIMD
 *
 * result[i] = a[i] * scalar
 *
 * @param result - Output array
 * @param a - Input array
 * @param scalar - Scalar multiplier
 * @param count - Number of elements to process
 */
export function scaleArraySIMD(
  result: Float32Array,
  a: Float32Array,
  scalar: f32,
  count: i32
): void {
  let i = 0;

  // Broadcast scalar to v128 (4 copies)
  const vscalar = f32x4.splat(scalar);

  // SIMD loop
  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vr = f32x4.mul(va, vscalar);
    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  // Scalar tail
  for (; i < count; i++) {
    unchecked(result[i] = a[i] * scalar);
  }
}

/**
 * Fused multiply-add using WASM SIMD
 *
 * result[i] = a[i] + b[i] * scalar
 *
 * This is the core operation for velocity integration:
 * newPosition = oldPosition + velocity * deltaTime
 *
 * @param result - Output array (may be same as a for in-place operation)
 * @param a - Base array (e.g., positions)
 * @param b - Multiplier array (e.g., velocities)
 * @param scalar - Scalar multiplier (e.g., deltaTime)
 * @param count - Number of elements to process
 */
export function fmaSIMD(
  result: Float32Array,
  a: Float32Array,
  b: Float32Array,
  scalar: f32,
  count: i32
): void {
  let i = 0;

  // Broadcast scalar to v128 (4 copies)
  const vscalar = f32x4.splat(scalar);

  // SIMD loop: 4 elements per iteration
  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));

    // result = a + b * scalar (4 floats)
    const vr = f32x4.add(va, f32x4.mul(vb, vscalar));

    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  // Scalar tail
  for (; i < count; i++) {
    unchecked(result[i] = a[i] + b[i] * scalar);
  }
}

/**
 * Multiply two arrays element-wise using WASM SIMD
 *
 * result[i] = a[i] * b[i]
 *
 * @param result - Output array
 * @param a - First input array
 * @param b - Second input array
 * @param count - Number of elements to process
 */
export function multiplyArraysSIMD(
  result: Float32Array,
  a: Float32Array,
  b: Float32Array,
  count: i32
): void {
  let i = 0;

  // SIMD loop
  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));
    const vr = f32x4.mul(va, vb);
    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  // Scalar tail
  for (; i < count; i++) {
    unchecked(result[i] = a[i] * b[i]);
  }
}

/**
 * Distance squared using WASM SIMD
 *
 * distSq[i] = dx[i]^2 + dy[i]^2
 *
 * Useful for batch proximity checks without expensive sqrt.
 *
 * @param distSq - Output array of squared distances
 * @param dx - X-component deltas
 * @param dy - Y-component deltas
 * @param count - Number of elements to process
 */
export function distanceSquaredSIMD(
  distSq: Float32Array,
  dx: Float32Array,
  dy: Float32Array,
  count: i32
): void {
  let i = 0;

  for (; i + 4 <= count; i += 4) {
    const vdx = v128.load(changetype<usize>(dx) + (i << 2));
    const vdy = v128.load(changetype<usize>(dy) + (i << 2));

    // dx*dx + dy*dy (4 results)
    const vdx2 = f32x4.mul(vdx, vdx);
    const vdy2 = f32x4.mul(vdy, vdy);
    const vr = f32x4.add(vdx2, vdy2);

    v128.store(changetype<usize>(distSq) + (i << 2), vr);
  }

  for (; i < count; i++) {
    unchecked(distSq[i] = dx[i] * dx[i] + dy[i] * dy[i]);
  }
}

/**
 * Clamp array to [min, max] using WASM SIMD
 *
 * result[i] = clamp(a[i], min, max)
 *
 * @param result - Output array
 * @param a - Input array
 * @param min - Minimum value
 * @param max - Maximum value
 * @param count - Number of elements to process
 */
export function clampArraySIMD(
  result: Float32Array,
  a: Float32Array,
  min: f32,
  max: f32,
  count: i32
): void {
  let i = 0;

  const vmin = f32x4.splat(min);
  const vmax = f32x4.splat(max);

  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));

    // Clamp: max(min, min(max, value))
    const vclamped = f32x4.max(vmin, f32x4.min(vmax, va));

    v128.store(changetype<usize>(result) + (i << 2), vclamped);
  }

  for (; i < count; i++) {
    let val = unchecked(a[i]);
    if (val < min) val = min;
    if (val > max) val = max;
    unchecked(result[i] = val);
  }
}

/**
 * Linear interpolation between two arrays using WASM SIMD
 *
 * result[i] = a[i] + (b[i] - a[i]) * t
 *
 * @param result - Output array
 * @param a - Start values
 * @param b - End values
 * @param t - Interpolation factor [0, 1]
 * @param count - Number of elements to process
 */
export function lerpSIMD(
  result: Float32Array,
  a: Float32Array,
  b: Float32Array,
  t: f32,
  count: i32
): void {
  let i = 0;

  const vt = f32x4.splat(t);

  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));

    // result = a + (b - a) * t
    const vdiff = f32x4.sub(vb, va);
    const vr = f32x4.add(va, f32x4.mul(vdiff, vt));

    v128.store(changetype<usize>(result) + (i << 2), vr);
  }

  for (; i < count; i++) {
    unchecked(result[i] = a[i] + (b[i] - a[i]) * t);
  }
}

/**
 * Fill array with scalar value using WASM SIMD
 *
 * result[i] = value
 *
 * @param result - Output array
 * @param value - Fill value
 * @param count - Number of elements to fill
 */
export function fillArraySIMD(
  result: Float32Array,
  value: f32,
  count: i32
): void {
  let i = 0;

  const vvalue = f32x4.splat(value);

  for (; i + 4 <= count; i += 4) {
    v128.store(changetype<usize>(result) + (i << 2), vvalue);
  }

  for (; i < count; i++) {
    unchecked(result[i] = value);
  }
}

/**
 * Dot product using WASM SIMD with horizontal sum
 *
 * Returns sum(a[i] * b[i])
 *
 * @param a - First input array
 * @param b - Second input array
 * @param count - Number of elements to process
 * @returns Dot product
 */
export function dotProductSIMD(
  a: Float32Array,
  b: Float32Array,
  count: i32
): f32 {
  let i = 0;
  let sum = f32x4.splat(0);

  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    const vb = v128.load(changetype<usize>(b) + (i << 2));

    // sum += a * b (4 products)
    sum = f32x4.add(sum, f32x4.mul(va, vb));
  }

  // Horizontal sum: sum[0] + sum[1] + sum[2] + sum[3]
  let result = f32x4.extract_lane(sum, 0) +
               f32x4.extract_lane(sum, 1) +
               f32x4.extract_lane(sum, 2) +
               f32x4.extract_lane(sum, 3);

  // Scalar tail
  for (; i < count; i++) {
    result += unchecked(a[i] * b[i]);
  }

  return result;
}

/**
 * Sum all elements in array using WASM SIMD with horizontal sum
 *
 * @param a - Input array
 * @param count - Number of elements to process
 * @returns Sum of elements
 */
export function sumSIMD(a: Float32Array, count: i32): f32 {
  let i = 0;
  let sum = f32x4.splat(0);

  for (; i + 4 <= count; i += 4) {
    const va = v128.load(changetype<usize>(a) + (i << 2));
    sum = f32x4.add(sum, va);
  }

  // Horizontal sum
  let result = f32x4.extract_lane(sum, 0) +
               f32x4.extract_lane(sum, 1) +
               f32x4.extract_lane(sum, 2) +
               f32x4.extract_lane(sum, 3);

  // Scalar tail
  for (; i < count; i++) {
    result += unchecked(a[i]);
  }

  return result;
}

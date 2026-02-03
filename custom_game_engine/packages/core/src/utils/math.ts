/**
 * General-purpose math utilities.
 *
 * Use these instead of manual Math.max(0, Math.min(1, value)) patterns.
 * See CLAUDE.md Code Quality Rules §4.
 */

/**
 * Clamp a value to [min, max] range.
 *
 * Replaces: Math.max(min, Math.min(max, value))
 *
 * @example
 * clamp(1.5, 0, 1)  // 1
 * clamp(-0.3, 0, 1) // 0
 * clamp(50, 0, 100)  // 50
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Clamp a value to [0, 1] range.
 *
 * Replaces: Math.max(0, Math.min(1, value))
 * Most common clamping pattern in the codebase (~300 instances).
 *
 * @example
 * clamp01(1.5)  // 1
 * clamp01(-0.3) // 0
 */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor [0, 1]
 * @returns Interpolated value
 *
 * @example
 * lerp(0, 100, 0.5) // 50
 * lerp(10, 20, 0.3) // 13
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse linear interpolation - find where value falls between a and b.
 *
 * @param a - Range start
 * @param b - Range end
 * @param value - Value to find position of
 * @returns Position in [0, 1] (unclamped)
 *
 * @example
 * inverseLerp(0, 100, 50) // 0.5
 * inverseLerp(10, 20, 13) // 0.3
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * Remap a value from one range to another.
 *
 * @example
 * remap(50, 0, 100, 0, 1)   // 0.5
 * remap(15, 10, 20, 0, 100) // 50
 */
export function remap(value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number {
  const t = inverseLerp(fromMin, fromMax, value);
  return lerp(toMin, toMax, t);
}

/**
 * Smooth Hermite interpolation (cubic smoothstep).
 *
 * @param edge0 - Lower edge
 * @param edge1 - Upper edge
 * @param x - Input value
 * @returns Smooth value in [0, 1]
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Softmax function - converts array of values to probability distribution.
 *
 * @param values - Array of real numbers
 * @param temperature - Controls distribution sharpness (default 1.0)
 * @returns Array of probabilities summing to 1
 *
 * @example
 * softmax([1, 2, 3]) // [0.09, 0.24, 0.67]
 */
export function softmax(values: number[], temperature: number = 1.0): number[] {
  const scaled = values.map(v => v / temperature);
  const maxVal = Math.max(...scaled);
  const exps = scaled.map(v => Math.exp(v - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * Sigmoid function - maps any real number to (0, 1).
 *
 * @param x - Input value
 * @returns Value in (0, 1)
 *
 * @example
 * sigmoid(0)  // 0.5
 * sigmoid(5)  // ~0.993
 * sigmoid(-5) // ~0.007
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Normalize an array of values to [0, 1] range.
 *
 * @param values - Array of numbers
 * @returns Normalized array where min→0 and max→1
 *
 * @example
 * normalize([10, 20, 30]) // [0, 0.5, 1]
 */
export function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => 0);
  return values.map(v => (v - min) / (max - min));
}

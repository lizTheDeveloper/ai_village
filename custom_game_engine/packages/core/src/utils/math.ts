/**
 * Math utility functions for common operations.
 *
 * Prefer these over manual Math.max/Math.min patterns for clarity and consistency.
 */

/**
 * Clamps a value between a minimum and maximum bound.
 *
 * @param value - The value to clamp
 * @param min - The minimum bound
 * @param max - The maximum bound
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamps a value to the [0, 1] range.
 *
 * @param value - The value to clamp
 * @returns The value clamped to [0, 1]
 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Softmax function - converts values to probability distribution.
 *
 * @param values - Array of numeric values
 * @param temperature - Temperature parameter (higher = more uniform, lower = more peaked)
 * @returns Probability distribution that sums to 1
 */
export function softmax(values: number[], temperature: number = 1): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp((v - maxVal) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

/**
 * Sigmoid function - maps any real number to (0, 1).
 *
 * @param x - Input value
 * @returns Value in range (0, 1)
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Normalizes a value from one range to another.
 *
 * @param value - The value to normalize
 * @param fromMin - Source range minimum
 * @param fromMax - Source range maximum
 * @param toMin - Target range minimum (default 0)
 * @param toMax - Target range maximum (default 1)
 * @returns The normalized value
 */
export function normalize(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number = 0,
  toMax: number = 1
): number {
  if (fromMax === fromMin) return toMin;
  const ratio = (value - fromMin) / (fromMax - fromMin);
  return toMin + ratio * (toMax - toMin);
}

/**
 * Deterministic PRNG using Xorshift128+
 * Same seed produces identical sequence on all platforms.
 */
export class DeterministicRandom {
  private s0: bigint;
  private s1: bigint;

  constructor(seed: number) {
    // SplitMix64 to initialize state from single seed
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    s = (s ^ (s >> 30n)) * 0xBF58476D1CE4E5B9n & 0xFFFFFFFFFFFFFFFFn;
    this.s0 = s;
    s = (s ^ (s >> 27n)) * 0x94D049BB133111EBn & 0xFFFFFFFFFFFFFFFFn;
    this.s1 = s;
    if (this.s0 === 0n && this.s1 === 0n) this.s1 = 1n;
  }

  /** Returns integer 0 to 0xFFFFFFFF */
  nextRaw(): number {
    let s1 = this.s0;
    const s0 = this.s1;
    this.s0 = s0;
    s1 ^= (s1 << 23n) & 0xFFFFFFFFFFFFFFFFn;
    s1 ^= s1 >> 18n;
    s1 ^= s0;
    s1 ^= s0 >> 5n;
    this.s1 = s1 & 0xFFFFFFFFFFFFFFFFn;
    return Number(((s1 + s0) & 0xFFFFFFFFn));
  }

  /** Returns float 0.0 to 1.0 (NOT deterministic across platforms - use nextFixed) */
  nextFloat(): number {
    return this.nextRaw() / 0xFFFFFFFF;
  }

  /** Returns Fixed 0 to 1 (deterministic) */
  nextFixed(): number {
    // Return raw fixed-point value (0 to 65536)
    return this.nextRaw() & 0xFFFF;
  }

  /** Returns integer in [min, max] inclusive */
  range(min: number, max: number): number {
    const span = max - min + 1;
    return min + (this.nextRaw() % span);
  }

  /** Returns true with given probability (0.0 to 1.0) */
  chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /** Pick random element from array */
  pick<T>(array: T[]): T {
    return array[this.range(0, array.length - 1)]!;
  }

  /** Shuffle array in-place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.range(0, i);
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
    return array;
  }

  /** Save state for checkpointing */
  getState(): { s0: string; s1: string } {
    return { s0: this.s0.toString(), s1: this.s1.toString() };
  }

  /** Restore state from checkpoint */
  setState(state: { s0: string; s1: string }): void {
    this.s0 = BigInt(state.s0);
    this.s1 = BigInt(state.s1);
  }

  /** Create a derived RNG (for per-system deterministic branching) */
  derive(key: number): DeterministicRandom {
    return new DeterministicRandom(this.nextRaw() ^ key);
  }
}

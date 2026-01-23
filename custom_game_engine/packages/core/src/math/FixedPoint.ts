/**
 * 16.16 Fixed-Point arithmetic for deterministic simulation
 *
 * Provides platform-independent math that produces identical
 * results across different CPUs/browsers/platforms.
 */

const SHIFT = 16;
const SCALE = 1 << 16; // 65536
const HALF_SCALE = SCALE >> 1;

export class Fixed {
  readonly raw: number;

  private constructor(raw: number) {
    this.raw = raw | 0; // Force integer
  }

  static readonly ZERO = new Fixed(0);
  static readonly ONE = new Fixed(SCALE);
  static readonly HALF = new Fixed(HALF_SCALE);
  static readonly TWO = new Fixed(SCALE * 2);
  static readonly NEG_ONE = new Fixed(-SCALE);

  static fromFloat(f: number): Fixed {
    return new Fixed(Math.round(f * SCALE));
  }

  static fromInt(i: number): Fixed {
    return new Fixed(i << SHIFT);
  }

  static fromRaw(raw: number): Fixed {
    return new Fixed(raw | 0);
  }

  toFloat(): number {
    return this.raw / SCALE;
  }

  toInt(): number {
    return this.raw >> SHIFT;
  }

  add(other: Fixed): Fixed {
    return new Fixed(this.raw + other.raw);
  }

  sub(other: Fixed): Fixed {
    return new Fixed(this.raw - other.raw);
  }

  mul(other: Fixed): Fixed {
    // 64-bit intermediate via BigInt
    const result = (BigInt(this.raw) * BigInt(other.raw)) >> BigInt(SHIFT);
    return new Fixed(Number(result));
  }

  div(other: Fixed): Fixed {
    if (other.raw === 0) throw new Error('Fixed-point division by zero');
    const result = (BigInt(this.raw) << BigInt(SHIFT)) / BigInt(other.raw);
    return new Fixed(Number(result));
  }

  neg(): Fixed {
    return new Fixed(-this.raw);
  }

  abs(): Fixed {
    return new Fixed(Math.abs(this.raw));
  }

  floor(): Fixed {
    return new Fixed(this.raw & ~(SCALE - 1));
  }

  ceil(): Fixed {
    return new Fixed((this.raw + SCALE - 1) & ~(SCALE - 1));
  }

  /** Deterministic sqrt using Newton-Raphson */
  sqrt(): Fixed {
    if (this.raw < 0) throw new Error('Fixed-point sqrt of negative');
    if (this.raw === 0) return Fixed.ZERO;

    // Initial guess
    let x = Fixed.fromFloat(Math.sqrt(this.toFloat()));

    // 4 iterations of Newton-Raphson for convergence
    for (let i = 0; i < 4; i++) {
      // x = (x + n/x) / 2
      x = x.add(this.div(x)).mul(Fixed.HALF);
    }
    return x;
  }

  lt(other: Fixed): boolean { return this.raw < other.raw; }
  lte(other: Fixed): boolean { return this.raw <= other.raw; }
  gt(other: Fixed): boolean { return this.raw > other.raw; }
  gte(other: Fixed): boolean { return this.raw >= other.raw; }
  eq(other: Fixed): boolean { return this.raw === other.raw; }

  min(other: Fixed): Fixed { return this.raw < other.raw ? this : other; }
  max(other: Fixed): Fixed { return this.raw > other.raw ? this : other; }

  /** Sin using lookup table (256 entries, one full rotation) */
  static sin(angle: Fixed): Fixed {
    return Fixed.fromRaw(SIN_TABLE[((angle.raw >> 8) & 0xFF)]!);
  }

  /** Cos using sin table with offset */
  static cos(angle: Fixed): Fixed {
    return Fixed.fromRaw(SIN_TABLE[(((angle.raw >> 8) + 64) & 0xFF)]!);
  }

  toString(): string {
    return `Fixed(${this.toFloat().toFixed(4)})`;
  }
}

// Generate sin lookup table (256 entries for full 2*PI rotation)
const SIN_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  SIN_TABLE.push(Math.round(Math.sin((i / 256) * Math.PI * 2) * SCALE));
}

/**
 * Fixed-point 2D vector
 */
export class FixedVec2 {
  constructor(public readonly x: Fixed, public readonly y: Fixed) {}

  static readonly ZERO = new FixedVec2(Fixed.ZERO, Fixed.ZERO);

  static fromFloats(x: number, y: number): FixedVec2 {
    return new FixedVec2(Fixed.fromFloat(x), Fixed.fromFloat(y));
  }

  add(other: FixedVec2): FixedVec2 {
    return new FixedVec2(this.x.add(other.x), this.y.add(other.y));
  }

  sub(other: FixedVec2): FixedVec2 {
    return new FixedVec2(this.x.sub(other.x), this.y.sub(other.y));
  }

  scale(s: Fixed): FixedVec2 {
    return new FixedVec2(this.x.mul(s), this.y.mul(s));
  }

  lengthSquared(): Fixed {
    return this.x.mul(this.x).add(this.y.mul(this.y));
  }

  length(): Fixed {
    return this.lengthSquared().sqrt();
  }

  normalize(): FixedVec2 {
    const len = this.length();
    if (len.eq(Fixed.ZERO)) return FixedVec2.ZERO;
    return new FixedVec2(this.x.div(len), this.y.div(len));
  }

  distanceTo(other: FixedVec2): Fixed {
    return this.sub(other).length();
  }

  distanceSquaredTo(other: FixedVec2): Fixed {
    return this.sub(other).lengthSquared();
  }

  dot(other: FixedVec2): Fixed {
    return this.x.mul(other.x).add(this.y.mul(other.y));
  }

  toString(): string {
    return `FixedVec2(${this.x.toFloat().toFixed(4)}, ${this.y.toFloat().toFixed(4)})`;
  }
}

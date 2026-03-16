/**
 * AffordanceNetwork — discovers plausible novel item combinations.
 *
 * Architecture:
 *   1. ItemPropertyVectorizer converts items to 56-dim float vectors.
 *   2. A lightweight bilinear scorer (W matrix, 56×56) computes compatibility
 *      scores: score(a, b) = vA · W · vB.
 *   3. Heuristic rules capture domain knowledge (tool + material → product, etc.)
 *   4. The W matrix starts as identity (cosine-like baseline) and can be updated
 *      from observed interaction episodes via a simple gradient step.
 *
 * This is the Step 1–3 foundation from MUL-299. The full training loop
 * (Steps 5–6) and LLM-validation (Step 8) are future work.
 */

import { ItemPropertyVectorizer, VECTOR_DIMENSIONS } from './ItemPropertyVectorizer.js';
import type { ItemDefinition } from './ItemDefinition.js';
import type { ItemRegistry } from './ItemRegistry.js';

/** A suggested item combination with a confidence score. */
export interface CombinationSuggestion {
  /** First item in the pair */
  itemA: string;
  /** Second item in the pair */
  itemB: string;
  /** Normalized compatibility score [0, 1] */
  score: number;
  /** Human-readable reason for the suggestion */
  reason: string;
}

/** A recorded item interaction episode for online learning. */
export interface InteractionEpisode {
  itemA: string;
  itemB: string;
  /** Reward signal (positive = useful combination, negative = useless) */
  reward: number;
}

const DIM = VECTOR_DIMENSIONS;

/**
 * Compute dot product of two Float32Arrays.
 */
function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < DIM; i++) sum += a[i]! * b[i]!;
  return sum;
}

/**
 * Compute L2 norm of a Float32Array.
 */
function norm(a: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < DIM; i++) sum += a[i]! * a[i]!;
  return Math.sqrt(sum);
}

/**
 * Cosine similarity in [0, 1] (shifted from [-1, 1]).
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return (dot(a, b) / (na * nb) + 1) / 2;
}

/**
 * Apply bilinear weight matrix: vA · W · vB
 * W is stored as a flat Float32Array of length DIM*DIM.
 */
function bilinearScore(vA: Float32Array, vB: Float32Array, W: Float32Array): number {
  let score = 0;
  // W · vB first, then dot with vA
  for (let i = 0; i < DIM; i++) {
    let wvb = 0;
    const rowOffset = i * DIM;
    for (let j = 0; j < DIM; j++) {
      wvb += W[rowOffset + j]! * vB[j]!;
    }
    score += vA[i]! * wvb;
  }
  return score;
}

// ─────────────────────────────────────────────────────────────────
// Heuristic affordance rules
// ─────────────────────────────────────────────────────────────────

interface HeuristicRule {
  name: string;
  /** Returns a score bonus [0,1] and reason if the rule fires */
  evaluate(a: ItemDefinition, b: ItemDefinition): { bonus: number; reason: string } | null;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    name: 'tool_acts_on_material',
    evaluate(a, b) {
      const tool = a.traits?.tool ? a : b.traits?.tool ? b : null;
      const material = !tool ? null : (tool === a ? b : a);
      if (!tool || !material) return null;
      if (material.category === 'resource' || material.category === 'material') {
        return {
          bonus: 0.6,
          reason: `${tool.displayName} (tool) can process ${material.displayName} (material)`,
        };
      }
      return null;
    },
  },
  {
    name: 'food_combination',
    evaluate(a, b) {
      if (a.traits?.edible && b.traits?.edible) {
        return {
          bonus: 0.5,
          reason: `${a.displayName} + ${b.displayName} may combine into a compound food`,
        };
      }
      return null;
    },
  },
  {
    name: 'material_plus_weapon',
    evaluate(a, b) {
      const weapon = a.traits?.weapon ? a : b.traits?.weapon ? b : null;
      const resource = !weapon ? null : (weapon === a ? b : a);
      if (!weapon || !resource) return null;
      if (resource.category === 'material' || resource.category === 'resource') {
        return {
          bonus: 0.55,
          reason: `${resource.displayName} may upgrade or repair ${weapon.displayName}`,
        };
      }
      return null;
    },
  },
  {
    name: 'magical_enhancement',
    evaluate(a, b) {
      const magical = a.traits?.magical ? a : b.traits?.magical ? b : null;
      const target = !magical ? null : (magical === a ? b : a);
      if (!magical || !target) return null;
      if (target.traits?.weapon || target.traits?.armor || target.traits?.tool) {
        return {
          bonus: 0.65,
          reason: `${magical.displayName} may enchant ${target.displayName}`,
        };
      }
      return null;
    },
  },
  {
    name: 'seed_plus_fertilizer',
    evaluate(a, b) {
      const seed = a.category === 'seed' ? a : b.category === 'seed' ? b : null;
      const other = !seed ? null : (seed === a ? b : a);
      if (!seed || !other) return null;
      if (other.traits?.edible || other.category === 'material') {
        return {
          bonus: 0.4,
          reason: `${other.displayName} may fertilize or modify ${seed.displayName}`,
        };
      }
      return null;
    },
  },
  {
    name: 'container_fill',
    evaluate(a, b) {
      const container = a.traits?.container ? a : b.traits?.container ? b : null;
      const content = !container ? null : (container === a ? b : a);
      if (!container || !content) return null;
      return {
        bonus: 0.35,
        reason: `${content.displayName} can be stored in ${container.displayName}`,
      };
    },
  },
];

// ─────────────────────────────────────────────────────────────────
// AffordanceNetwork
// ─────────────────────────────────────────────────────────────────

export class AffordanceNetwork {
  private readonly vectorizer: ItemPropertyVectorizer;
  /**
   * Bilinear weight matrix W (DIM × DIM), initialized to identity.
   * score(a,b) = vA · W · vB  (then sigmoid-normalized).
   */
  private W: Float32Array;
  /** Simple learning rate for online updates. */
  private readonly learningRate: number;

  constructor(registry: ItemRegistry, options: { learningRate?: number } = {}) {
    this.vectorizer = new ItemPropertyVectorizer(registry);
    this.learningRate = options.learningRate ?? 0.01;
    // Start with identity matrix — equivalent to plain cosine similarity
    this.W = new Float32Array(DIM * DIM);
    for (let i = 0; i < DIM; i++) {
      this.W[i * DIM + i] = 1;
    }
  }

  /**
   * Score the affordance compatibility of two items.
   * Returns a value in [0, 1].
   */
  scoreCompatibility(itemIdA: string, itemIdB: string): number {
    const vA = this.vectorizer.getVector(itemIdA);
    const vB = this.vectorizer.getVector(itemIdB);
    const raw = bilinearScore(vA, vB, this.W);
    // Sigmoid normalize: maps arbitrary real to (0,1)
    return 1 / (1 + Math.exp(-raw));
  }

  /**
   * Score with heuristic bonus applied on top.
   */
  private fullScore(
    a: ItemDefinition,
    b: ItemDefinition,
  ): { score: number; reason: string } {
    const base = this.scoreCompatibility(a.id, b.id);

    let bestBonus = 0;
    let bestReason = 'similar property profiles';

    for (const rule of HEURISTIC_RULES) {
      const result = rule.evaluate(a, b);
      if (result && result.bonus > bestBonus) {
        bestBonus = result.bonus;
        bestReason = result.reason;
      }
    }

    // Blend base similarity with heuristic bonus (heuristics dominate when strong)
    const score = Math.min(base * 0.4 + bestBonus * 0.6, 1);
    return { score, reason: bestReason };
  }

  /**
   * Given a set of inventory items, return the top N most promising
   * combinations, ranked by affordance score.
   */
  suggestCombinations(
    inventory: ItemDefinition[],
    maxSuggestions = 10,
  ): CombinationSuggestion[] {
    const suggestions: CombinationSuggestion[] = [];

    for (let i = 0; i < inventory.length; i++) {
      for (let j = i + 1; j < inventory.length; j++) {
        const a = inventory[i]!;
        const b = inventory[j]!;
        const { score, reason } = this.fullScore(a, b);
        if (score > 0.3) {
          suggestions.push({ itemA: a.id, itemB: b.id, score, reason });
        }
      }
    }

    suggestions.sort((x, y) => y.score - x.score);
    return suggestions.slice(0, maxSuggestions);
  }

  /**
   * Online learning update from a single interaction episode.
   *
   * Uses a simple rank-1 outer-product gradient step:
   *   if reward > 0: W += lr * vA ⊗ vB   (reinforce)
   *   if reward < 0: W -= lr * |reward| * vA ⊗ vB  (suppress)
   */
  recordEpisode(episode: InteractionEpisode): void {
    const vA = this.vectorizer.getVector(episode.itemA);
    const vB = this.vectorizer.getVector(episode.itemB);
    const scale = this.learningRate * episode.reward;

    for (let i = 0; i < DIM; i++) {
      const rowOffset = i * DIM;
      for (let j = 0; j < DIM; j++) {
        this.W[rowOffset + j]! += scale * vA[i]! * vB[j]!;
      }
    }
  }

  /**
   * Export current weight matrix for persistence.
   */
  exportWeights(): Float32Array {
    return this.W.slice();
  }

  /**
   * Load previously exported weights.
   */
  importWeights(weights: Float32Array): void {
    if (weights.length !== DIM * DIM) {
      throw new Error(
        `Weight array length mismatch: expected ${DIM * DIM}, got ${weights.length}`,
      );
    }
    this.W = weights.slice();
  }
}

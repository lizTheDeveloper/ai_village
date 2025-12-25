import { ComponentBase } from '../ecs/Component.js';
import type { ResourceType } from './ResourceComponent.js';

export interface Gradient {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly bearing: number; // 0-360 degrees (0=North, 90=East, 180=South, 270=West)
  readonly distance: number; // Tiles
  readonly confidence: number; // 0-1
  readonly sourceAgentId: string;
  readonly tick: number;
  readonly strength: number; // Calculated from confidence and distance
  readonly claimPosition?: { x: number; y: number }; // Optional position for verification
}

export interface BlendedGradient {
  readonly resourceType: ResourceType;
  readonly bearing: number; // Resultant direction
  readonly strength: number; // Combined strength
  readonly confidence: number; // Average confidence
}

/**
 * SocialGradientComponent stores directional resource hints from other agents
 * Gradients are blended with trust weighting to create composite directions
 */
export class SocialGradientComponent extends ComponentBase {
  public readonly type = 'social_gradient';
  private _gradients: Gradient[] = [];
  private _gradientCounter: number = 0;
  private readonly _halfLife: number = 200; // Ticks until confidence halves
  private readonly _removalThreshold: number = 0.1; // Remove below this confidence

  constructor() {
    super();
  }

  /**
   * Add a new gradient from communication
   * @throws Error for invalid inputs
   */
  addGradient(data: {
    resourceType: ResourceType;
    bearing: number;
    distance: number;
    confidence: number;
    sourceAgentId: string;
    tick: number;
    claimPosition?: { x: number; y: number };
  }): void {
    // Validate inputs - NO FALLBACKS per CLAUDE.md
    if (!data.resourceType) {
      throw new Error('Gradient requires valid resource type');
    }

    if (data.bearing < 0 || data.bearing > 360) {
      throw new Error(`Gradient bearing must be between 0 and 360, got ${data.bearing}`);
    }

    if (data.confidence < 0 || data.confidence > 1) {
      throw new Error(`Gradient confidence must be between 0 and 1, got ${data.confidence}`);
    }

    if (!data.sourceAgentId || data.sourceAgentId === '') {
      throw new Error('Gradient requires non-empty source agent ID');
    }

    if (data.distance < 0) {
      throw new Error('Gradient distance must be non-negative');
    }

    if (data.tick < 0) {
      throw new Error('Gradient tick must be non-negative');
    }

    // Calculate strength based on confidence and distance
    // Closer resources = stronger gradient
    const strength = data.confidence / (1 + data.distance / 50);

    const gradient: Gradient = {
      id: `gradient_${this._gradientCounter++}`,
      resourceType: data.resourceType,
      bearing: data.bearing,
      distance: data.distance,
      confidence: data.confidence,
      sourceAgentId: data.sourceAgentId,
      tick: data.tick,
      strength,
      claimPosition: data.claimPosition,
    };

    this._gradients.push(gradient);
  }

  /**
   * Get all gradients for a resource type
   * @param resourceType - Type of resource
   * @param currentTick - Optional tick for filtering stale gradients
   */
  getGradients(resourceType: ResourceType, currentTick?: number): Gradient[] {
    let gradients = this._gradients.filter(g => g.resourceType === resourceType);

    // Filter out stale gradients (>400 ticks old)
    if (currentTick !== undefined) {
      gradients = gradients.filter(g => (currentTick - g.tick) <= 400);
    }

    return gradients;
  }

  /**
   * Blend multiple gradients into a single direction using vector sum
   * @param resourceType - Type of resource
   * @param trustScores - Optional map of agent trust scores for weighting
   */
  getBlendedGradient(
    resourceType: ResourceType,
    trustScores?: Map<string, number>
  ): BlendedGradient | undefined {
    const gradients = this.getGradients(resourceType);

    if (gradients.length === 0) {
      return undefined;
    }

    // Convert gradients to vectors and sum with weighting
    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;
    let totalConfidence = 0;

    for (const gradient of gradients) {
      // Get trust weight (default 0.5 if not provided)
      const trustWeight = trustScores?.get(gradient.sourceAgentId) ?? 0.5;

      // Combined weight = strength * trust
      const weight = gradient.strength * trustWeight;

      // Convert bearing to radians (0° = North = -Y direction)
      const angleRad = (gradient.bearing - 90) * (Math.PI / 180);

      // Add weighted vector
      sumX += Math.cos(angleRad) * weight;
      sumY += Math.sin(angleRad) * weight;

      totalWeight += weight;
      totalConfidence += gradient.confidence;
    }

    if (totalWeight === 0) {
      return undefined;
    }

    // Calculate resultant bearing
    const resultantAngle = Math.atan2(sumY, sumX) * (180 / Math.PI);
    const bearing = (resultantAngle + 90 + 360) % 360; // Convert back to compass bearing

    // Calculate resultant strength
    const resultantMagnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    const strength = resultantMagnitude / totalWeight;

    // Average confidence
    const confidence = totalConfidence / gradients.length;

    return {
      resourceType,
      bearing,
      strength,
      confidence,
    };
  }

  /**
   * Apply time-based decay to gradient confidence
   * Uses half-life decay (confidence halves every 200 ticks)
   */
  applyDecay(currentTick: number): void {
    if (currentTick < 0) {
      throw new Error('currentTick must be non-negative');
    }

    for (let i = this._gradients.length - 1; i >= 0; i--) {
      const gradient = this._gradients[i];
      if (!gradient) continue;

      const age = currentTick - gradient.tick;

      // Calculate decayed confidence using half-life formula
      const decayedConfidence = gradient.confidence * Math.pow(0.5, age / this._halfLife);

      if (decayedConfidence < this._removalThreshold) {
        // Remove gradient if confidence too low
        this._gradients.splice(i, 1);
      } else {
        // Update gradient with decayed confidence
        const updatedGradient: Gradient = {
          id: gradient.id,
          resourceType: gradient.resourceType,
          bearing: gradient.bearing,
          distance: gradient.distance,
          confidence: decayedConfidence,
          sourceAgentId: gradient.sourceAgentId,
          tick: gradient.tick,
          strength: decayedConfidence / (1 + gradient.distance / 50),
          claimPosition: gradient.claimPosition,
        };
        this._gradients[i] = updatedGradient;
      }
    }
  }

  /**
   * Remove a specific gradient by ID
   */
  removeGradient(gradientId: string): void {
    const index = this._gradients.findIndex(g => g.id === gradientId);
    if (index !== -1) {
      this._gradients.splice(index, 1);
    }
  }

  /**
   * Clear all gradients for a resource type
   */
  clearGradients(resourceType: ResourceType): void {
    this._gradients = this._gradients.filter(g => g.resourceType !== resourceType);
  }

  /**
   * Get all gradients (readonly)
   */
  get allGradients(): readonly Gradient[] {
    return Object.freeze([...this._gradients]);
  }
}

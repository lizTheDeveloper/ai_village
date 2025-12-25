import type { ResourceType } from '../components/ResourceComponent.js';

export interface ParsedGradient {
  resourceType: ResourceType;
  bearing: number; // 0-360 degrees
  distance?: number; // Tiles (optional if not specified)
  confidence: number; // 0-1, based on precision
}

/**
 * GradientParser extracts resource gradient information from natural language
 * Parses patterns like "wood at bearing 45° about 30 tiles" or "stone north 20 tiles"
 */
export class GradientParser {
  private static readonly validResources: ResourceType[] = ['food', 'wood', 'stone', 'water'];

  private static readonly cardinalDirections: Record<string, number> = {
    'north': 0,
    'n': 0,
    'northeast': 45,
    'ne': 45,
    'east': 90,
    'e': 90,
    'southeast': 135,
    'se': 135,
    'south': 180,
    's': 180,
    'southwest': 225,
    'sw': 225,
    'west': 270,
    'w': 270,
    'northwest': 315,
    'nw': 315,
  };

  /**
   * Parse text for gradient information
   * @returns First valid gradient found or null if none
   */
  static parse(text: string): ParsedGradient | null {
    if (!text || text.trim() === '') {
      return null;
    }

    const lowerText = text.toLowerCase();

    // Extract resource type
    const resourceType = this.extractResourceType(lowerText);
    if (!resourceType) {
      return null;
    }

    // Extract bearing (explicit or cardinal)
    let bearing: number | null = null;
    const explicitBearing = this.extractBearing(lowerText);
    const cardinalBearing = this.extractCardinalDirection(lowerText);

    // Prioritize explicit bearing over cardinal
    bearing = explicitBearing !== null ? explicitBearing : cardinalBearing;

    if (bearing === null) {
      return null; // No direction found
    }

    // Extract distance (optional)
    const distance = this.extractDistance(lowerText);

    // Calculate confidence based on precision
    const confidence = this._calculateConfidence(lowerText, explicitBearing !== null, distance !== undefined);

    return {
      resourceType,
      bearing,
      distance,
      confidence,
    };
  }

  /**
   * Parse all gradients in text (for messages mentioning multiple resources)
   */
  static parseAll(text: string): ParsedGradient[] {
    const gradients: ParsedGradient[] = [];

    // Find all resource mentions
    for (const resource of this.validResources) {
      const pattern = new RegExp(`\\b${resource}\\b`, 'gi');
      const matches = text.match(pattern);

      if (matches) {
        // Try to parse context around each mention
        // For simplicity, we'll split and parse segments
        const segments = text.split(/[.!?;]/);
        for (const segment of segments) {
          if (segment.toLowerCase().includes(resource)) {
            const gradient = this.parse(segment);
            if (gradient && gradient.resourceType === resource) {
              gradients.push(gradient);
              break; // One gradient per resource type
            }
          }
        }
      }
    }

    return gradients;
  }

  /**
   * Extract resource type from text
   */
  static extractResourceType(text: string): ResourceType | null {
    for (const resource of this.validResources) {
      if (text.includes(resource)) {
        return resource;
      }
    }
    return null;
  }

  /**
   * Extract explicit bearing (e.g., "45°", "bearing 127")
   */
  static extractBearing(text: string): number | null {
    // Patterns: "bearing 45°", "at 45 degrees", "45deg", "bearing 45"
    const patterns = [
      /bearing\s+(\d+)(?:°|degrees?|deg)?/i,
      /at\s+(\d+)(?:°|degrees?|deg)/i,
      /(\d+)°/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const bearing = parseInt(match[1], 10);
        if (bearing >= 0 && bearing <= 360) {
          return bearing;
        }
      }
    }

    return null;
  }

  /**
   * Extract cardinal direction (e.g., "north", "northeast")
   */
  static extractCardinalDirection(text: string): number | null {
    // Look for cardinal directions in text
    for (const [direction, bearing] of Object.entries(this.cardinalDirections)) {
      // Use word boundaries to avoid partial matches
      const pattern = new RegExp(`\\b${direction}\\b`, 'i');
      if (pattern.test(text)) {
        return bearing;
      }
    }

    return null;
  }

  /**
   * Extract distance in tiles
   */
  static extractDistance(text: string): number | undefined {
    // Patterns: "30 tiles", "about 20 tiles", "around 15 tiles away", "roughly 25 tiles"
    const patterns = [
      /(?:about|around|roughly)?\s*(\d+)\s*tiles?/i,
      /(\d+)\s*(?:tiles?)?(?:\s+away)?/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const distance = parseInt(match[1], 10);
        if (distance > 0 && distance < 1000) { // Sanity check
          return distance;
        }
      }
    }

    return undefined;
  }

  /**
   * Calculate confidence based on precision of information
   */
  private static _calculateConfidence(text: string, hasExplicitBearing: boolean, hasDistance: boolean): number {
    let confidence = 0.5; // Base confidence

    // Precise bearing increases confidence
    if (hasExplicitBearing) {
      confidence += 0.3;
    } else {
      confidence += 0.1; // Cardinal direction less precise
    }

    // Distance specified increases confidence
    if (hasDistance) {
      confidence += 0.1;
    }

    // Approximation language decreases confidence
    if (/(?:about|around|roughly|maybe|think)/i.test(text)) {
      confidence -= 0.1;
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Validate bearing value
   * @throws Error for invalid bearing
   */
  static validateBearing(bearing: number): void {
    if (!Number.isFinite(bearing)) {
      throw new Error('Bearing must be a finite number');
    }
    if (bearing < 0 || bearing > 360) {
      throw new Error(`Bearing must be between 0 and 360, got ${bearing}`);
    }
  }

  /**
   * Validate resource type
   * @throws Error for invalid resource type
   */
  static validateResourceType(resourceType: string): void {
    if (!this.validResources.includes(resourceType as ResourceType)) {
      throw new Error(`Invalid resource type: ${resourceType}. Valid types: ${this.validResources.join(', ')}`);
    }
  }

  /**
   * Validate distance
   * @throws Error for invalid distance
   */
  static validateDistance(distance: number): void {
    if (distance < 0) {
      throw new Error('Distance must be non-negative');
    }
  }
}

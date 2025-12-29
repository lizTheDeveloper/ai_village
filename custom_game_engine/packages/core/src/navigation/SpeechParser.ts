/**
 * SpeechParser - Extract area knowledge from natural language
 *
 * Parses agent speech to extract resource information that can be
 * converted to hearsay. Handles patterns like:
 *
 * - "Found berries to the north"
 * - "There's wood northeast, pretty close"
 * - "Stone deposits far to the southwest"
 * - "No food around here"
 * - "The berries northeast are gone"
 *
 * This enables the "berries up north" transmission mechanic where
 * agents share area-level knowledge through conversation.
 */

import type { AreaResourceType } from './MapKnowledge.js';
import type { CardinalDirection } from './HearsayMemory.js';

/**
 * Parsed resource mention from speech
 */
export interface ResourceMention {
  /** What resource was mentioned */
  resourceType: AreaResourceType;

  /** Direction mentioned (or 'nearby' if no direction) */
  direction: CardinalDirection;

  /** Distance estimate */
  distance: 'close' | 'medium' | 'far';

  /** Is this a positive or negative report? */
  isPositive: boolean;

  /** Confidence in the parse (0-1) */
  confidence: number;

  /** The original text that was matched */
  matchedText: string;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

/**
 * Resource type patterns (case-insensitive)
 */
const RESOURCE_PATTERNS: Record<AreaResourceType, RegExp> = {
  food: /\b(food|berries?|fruit|apples?|carrots?|wheat|crops?|vegetables?)\b/i,
  wood: /\b(wood|trees?|logs?|lumber|timber|forest)\b/i,
  stone: /\b(stones?|rocks?|boulders?|minerals?|ore|deposits?)\b/i,
  water: /\b(water|river|lake|pond|stream|spring)\b/i,
  minerals: /\b(iron|copper|gold|silver|coal|minerals?|ore)\b/i,
};

/**
 * Direction patterns
 */
const DIRECTION_PATTERNS: Record<CardinalDirection, RegExp> = {
  north: /\b(north|northward|up)\b/i,
  northeast: /\b(north\s*east|ne)\b/i,
  east: /\b(east|eastward)\b/i,
  southeast: /\b(south\s*east|se)\b/i,
  south: /\b(south|southward|down)\b/i,
  southwest: /\b(south\s*west|sw)\b/i,
  west: /\b(west|westward)\b/i,
  northwest: /\b(north\s*west|nw)\b/i,
  nearby: /\b(here|nearby|around here|close by|right here)\b/i,
};

/**
 * Distance patterns
 */
const DISTANCE_PATTERNS = {
  close: /\b(close|near|nearby|right there|just|short)\b/i,
  far: /\b(far|distant|way|long way|quite a ways?)\b/i,
  medium: /\b(medium|moderate|bit of a walk|some distance)\b/i,
};

/**
 * Positive mention patterns (resource exists)
 */
const POSITIVE_PATTERNS = [
  /\b(found|saw|spotted|there('s| is| are)|discovered|located|plenty of|lots of|some)\b/i,
  /\b(has|have|got|plenty)\b/i,
];

/**
 * Negative mention patterns (resource depleted/gone)
 */
const NEGATIVE_PATTERNS = [
  /\b(no|none|gone|depleted|empty|nothing|exhausted|ran out|no more)\b/i,
  /\b(couldn't find|didn't find|not any|isn't any|aren't any)\b/i,
];

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parse speech text to extract resource mentions.
 * Returns all resource mentions found in the text.
 */
export function parseResourceMentions(text: string): ResourceMention[] {
  const mentions: ResourceMention[] = [];

  // Check each resource type
  for (const [resourceType, pattern] of Object.entries(RESOURCE_PATTERNS) as Array<
    [AreaResourceType, RegExp]
  >) {
    const resourceMatch = text.match(pattern);
    if (!resourceMatch) continue;

    // Found a resource mention - extract details
    const mention = extractMentionDetails(text, resourceType, resourceMatch[0]);
    if (mention) {
      mentions.push(mention);
    }
  }

  return mentions;
}

/**
 * Extract direction, distance, and sentiment for a resource mention
 */
function extractMentionDetails(
  text: string,
  resourceType: AreaResourceType,
  matchedResource: string
): ResourceMention | null {
  // Find direction
  let direction: CardinalDirection = 'nearby';
  for (const [dir, pattern] of Object.entries(DIRECTION_PATTERNS) as Array<
    [CardinalDirection, RegExp]
  >) {
    if (pattern.test(text)) {
      direction = dir;
      break;
    }
  }

  // Find distance
  let distance: 'close' | 'medium' | 'far' = 'medium';
  if (DISTANCE_PATTERNS.close.test(text)) {
    distance = 'close';
  } else if (DISTANCE_PATTERNS.far.test(text)) {
    distance = 'far';
  }

  // If direction is 'nearby', distance is implicitly 'close'
  if (direction === 'nearby') {
    distance = 'close';
  }

  // Determine if positive or negative
  let isPositive = true;
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(text)) {
      isPositive = false;
      break;
    }
  }

  // If no positive indicators either, it might just be a question or ambiguous
  let hasPositiveIndicator = false;
  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      hasPositiveIndicator = true;
      break;
    }
  }

  // Calculate confidence based on how much context we found
  let confidence = 0.5; // Base confidence

  if (hasPositiveIndicator || !isPositive) {
    confidence += 0.2; // Clear sentiment
  }

  if (direction !== 'nearby') {
    confidence += 0.15; // Has direction
  }

  if (DISTANCE_PATTERNS.close.test(text) || DISTANCE_PATTERNS.far.test(text)) {
    confidence += 0.1; // Has explicit distance
  }

  // If it's just a bare mention without context, lower confidence
  if (!hasPositiveIndicator && isPositive && direction === 'nearby') {
    confidence = 0.3; // Might just be talking about resources in general
  }

  return {
    resourceType,
    direction,
    distance,
    isPositive,
    confidence,
    matchedText: matchedResource,
  };
}

/**
 * Check if speech contains a resource announcement worth recording as hearsay.
 * Filters out questions, weak mentions, etc.
 */
export function isResourceAnnouncement(text: string): boolean {
  const mentions = parseResourceMentions(text);

  // Must have at least one high-confidence mention
  return mentions.some((m) => m.confidence >= 0.6);
}

/**
 * Get the primary resource mention from speech (highest confidence)
 */
export function getPrimaryResourceMention(text: string): ResourceMention | null {
  const mentions = parseResourceMentions(text);

  if (mentions.length === 0) return null;

  // Sort by confidence, return highest
  mentions.sort((a, b) => b.confidence - a.confidence);
  return mentions[0] ?? null;
}

// ============================================================================
// Speech Generation Helpers
// ============================================================================

/**
 * Generate a well-formed resource announcement.
 * For LLM prompts to suggest good announcement formats.
 */
export function generateResourceAnnouncement(
  resourceType: AreaResourceType,
  direction: CardinalDirection,
  distance: 'close' | 'medium' | 'far',
  isPositive: boolean
): string {
  const directionWords: Record<CardinalDirection, string> = {
    north: 'to the north',
    northeast: 'to the northeast',
    east: 'to the east',
    southeast: 'to the southeast',
    south: 'to the south',
    southwest: 'to the southwest',
    west: 'to the west',
    northwest: 'to the northwest',
    nearby: 'nearby',
  };

  const directionStr = directionWords[direction];

  if (isPositive) {
    if (distance === 'close') {
      return `Found ${resourceType} ${directionStr}!`;
    } else if (distance === 'far') {
      return `There's ${resourceType} far ${directionStr}.`;
    } else {
      return `Found ${resourceType} ${directionStr}.`;
    }
  } else {
    return `The ${resourceType} ${directionStr} is gone.`;
  }
}

/**
 * Get example announcement phrases for LLM context.
 */
export function getAnnouncementExamples(): string[] {
  return [
    'Found berries to the north!',
    "There's wood far to the east.",
    'Stone deposits nearby.',
    'The food to the south is gone.',
    'Plenty of water to the northwest.',
    "Couldn't find any stone around here.",
  ];
}

// ============================================================================
// Direction Utilities
// ============================================================================

/**
 * Convert a vector direction to cardinal direction
 */
export function vectorToCardinal(dx: number, dy: number): CardinalDirection {
  if (dx === 0 && dy === 0) return 'nearby';

  const angle = Math.atan2(dy, dx);
  const degrees = ((angle * 180) / Math.PI + 360) % 360;

  // Note: In most game coordinate systems, +y is down
  // Adjust if your coordinate system differs
  if (degrees >= 337.5 || degrees < 22.5) return 'east';
  if (degrees >= 22.5 && degrees < 67.5) return 'southeast';
  if (degrees >= 67.5 && degrees < 112.5) return 'south';
  if (degrees >= 112.5 && degrees < 157.5) return 'southwest';
  if (degrees >= 157.5 && degrees < 202.5) return 'west';
  if (degrees >= 202.5 && degrees < 247.5) return 'northwest';
  if (degrees >= 247.5 && degrees < 292.5) return 'north';
  return 'northeast';
}

/**
 * Convert cardinal direction to unit vector
 */
export function cardinalToVector(direction: CardinalDirection): { dx: number; dy: number } {
  const vectors: Record<CardinalDirection, { dx: number; dy: number }> = {
    north: { dx: 0, dy: -1 },
    northeast: { dx: 0.707, dy: -0.707 },
    east: { dx: 1, dy: 0 },
    southeast: { dx: 0.707, dy: 0.707 },
    south: { dx: 0, dy: 1 },
    southwest: { dx: -0.707, dy: 0.707 },
    west: { dx: -1, dy: 0 },
    northwest: { dx: -0.707, dy: -0.707 },
    nearby: { dx: 0, dy: 0 },
  };
  return vectors[direction];
}

/**
 * Estimate world distance from distance descriptor
 */
export function distanceToTiles(distance: 'close' | 'medium' | 'far'): number {
  const estimates = {
    close: 20, // ~20 tiles
    medium: 50, // ~50 tiles
    far: 100, // ~100 tiles
  };
  return estimates[distance];
}

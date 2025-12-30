/**
 * Item Quality System
 *
 * Provides quality tracking and calculation for items in the game.
 * Quality affects item value, stacking behavior, and display.
 *
 * Based on items-system/spec.md
 */

import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';
import {
  getQualityMultiplier,
  getTotalSynergyQualityBonus,
  getTaskFamiliarityBonus,
} from '../components/SkillsComponent.js';
import type { ItemQuality } from '../types/ItemTypes.js';

// Re-export for backwards compatibility
export type { ItemQuality };

/**
 * Map numeric quality (0-100) to quality tier.
 *
 * Ranges:
 * - 0-30: poor
 * - 31-60: normal
 * - 61-85: fine
 * - 86-95: masterwork
 * - 96-100: legendary
 */
export function getQualityTier(quality: number): ItemQuality {
  if (quality < 0 || quality > 100) {
    throw new Error(`Quality must be between 0-100, got ${quality}`);
  }

  if (quality <= 30) return 'poor';
  if (quality <= 60) return 'normal';
  if (quality <= 85) return 'fine';
  if (quality <= 95) return 'masterwork';
  return 'legendary';
}

/**
 * Get display color for quality tier.
 * Returns CSS color string for UI rendering.
 */
export function getQualityColor(tier: ItemQuality): string {
  const colors: Record<ItemQuality, string> = {
    poor: '#888888',      // Gray
    normal: '#ffffff',    // White
    fine: '#4CAF50',      // Green
    masterwork: '#2196F3', // Blue
    legendary: '#FFD700',  // Gold
  };
  return colors[tier];
}

/**
 * Get display name for quality tier.
 */
export function getQualityDisplayName(tier: ItemQuality): string {
  const names: Record<ItemQuality, string> = {
    poor: 'Poor',
    normal: 'Normal',
    fine: 'Fine',
    masterwork: 'Masterwork',
    legendary: 'Legendary',
  };
  return names[tier];
}

/**
 * Calculate quality for a crafted item.
 *
 * Formula:
 * - Base quality multiplier: 0.7 + (skillLevel * 0.1) [range 0.7-1.2]
 * - Task familiarity bonus: 0-20 (logarithmic increase with practice)
 * - Skill synergy bonus: Sum of all active synergy bonuses
 * - Random variance: ±10%
 * - Final quality scaled to 0-100 and clamped
 *
 * @param skills - Agent's skills component
 * @param skillId - Which skill to use (crafting, cooking, etc.)
 * @param taskId - Task identifier (recipeId, plantSpeciesId, etc.)
 * @param variance - Random variance factor (default ±10%)
 * @returns Quality value 0-100
 */
export function calculateCraftingQuality(
  skills: SkillsComponent,
  skillId: SkillId,
  taskId: string,
  variance: number = 0.1
): number {
  // Get skill level
  const skillLevel = skills.levels[skillId] ?? 0;

  // Base quality from skill level (0.7 to 1.2 multiplier)
  const baseMultiplier = getQualityMultiplier(skillLevel);

  // Familiarity bonus (0-20 quality points)
  const familiarityBonus = getTaskFamiliarityBonus(skills, skillId, taskId);

  // Synergy bonus (varies based on active synergies)
  const synergyBonus = getTotalSynergyQualityBonus(skills);

  // Apply random variance (±10% by default)
  const randomVariance = (Math.random() - 0.5) * 2 * variance;

  // Calculate final quality (scale to 0-100 range)
  // baseMultiplier (0.7-1.2) * 100 = 70-120 base
  // + familiarityBonus (0-20)
  // + synergyBonus (0-35) * 100 = 0-35
  // + randomVariance (-10 to +10)
  const rawQuality = (baseMultiplier * 100) + familiarityBonus + (synergyBonus * 100) + (randomVariance * 100);

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(rawQuality)));
}

/**
 * Calculate quality for a harvested crop.
 *
 * Formula:
 * - Base quality from farming skill
 * - Plant maturity bonus (mature = full, immature = -20)
 * - Plant health affects quality
 * - Random variance
 *
 * @param farmingSkillLevel - Agent's farming skill level (0-5)
 * @param plantHealth - Plant health (0-100)
 * @param plantMaturity - Whether plant is fully mature
 * @param variance - Random variance factor (default ±10%)
 * @returns Quality value 0-100
 */
export function calculateHarvestQuality(
  farmingSkillLevel: number,
  plantHealth: number,
  plantMaturity: boolean,
  variance: number = 0.1
): number {
  if (farmingSkillLevel < 0 || farmingSkillLevel > 5) {
    throw new Error(`Farming skill must be 0-5, got ${farmingSkillLevel}`);
  }

  if (plantHealth < 0 || plantHealth > 100) {
    throw new Error(`Plant health must be 0-100, got ${plantHealth}`);
  }

  // Base quality from farming skill (0.7 to 1.2)
  const baseMultiplier = getQualityMultiplier(farmingSkillLevel as import('../components/SkillsComponent.js').SkillLevel);

  // Health contribution (0-100)
  const healthContribution = plantHealth;

  // Maturity penalty (immature = -20 quality)
  const maturityPenalty = plantMaturity ? 0 : -20;

  // Random variance
  const randomVariance = (Math.random() - 0.5) * 2 * variance;

  // Calculate final quality
  // baseMultiplier * healthContribution = 70-120% of health value
  // + maturity penalty
  // + variance
  const rawQuality = (baseMultiplier * healthContribution / 100 * 100) + maturityPenalty + (randomVariance * 100);

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(rawQuality)));
}

/**
 * Calculate quality for a gathered resource.
 *
 * Formula:
 * - Base quality from gathering skill
 * - Resource type affects base quality
 * - Random variance
 *
 * @param gatheringSkillLevel - Agent's gathering skill level (0-5)
 * @param resourceType - Type of resource being gathered
 * @param variance - Random variance factor (default ±15% for wild resources)
 * @returns Quality value 0-100
 */
export function calculateGatheringQuality(
  gatheringSkillLevel: number,
  resourceType: string,
  variance: number = 0.15
): number {
  if (gatheringSkillLevel < 0 || gatheringSkillLevel > 5) {
    throw new Error(`Gathering skill must be 0-5, got ${gatheringSkillLevel}`);
  }

  // Clamp to valid SkillLevel range
  const validSkillLevel = Math.max(0, Math.min(5, Math.round(gatheringSkillLevel))) as import('../components/SkillsComponent.js').SkillLevel;

  // Base quality from gathering skill (0.7 to 1.2)
  const baseMultiplier = getQualityMultiplier(validSkillLevel);

  // Resource type base quality (some resources are inherently higher quality)
  const resourceBaseQuality = getResourceBaseQuality(resourceType);

  // Random variance (higher for wild resources)
  const randomVariance = (Math.random() - 0.5) * 2 * variance;

  // Calculate final quality
  const rawQuality = (baseMultiplier * resourceBaseQuality) + (randomVariance * 100);

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(rawQuality)));
}

/**
 * Get base quality for a resource type.
 * Wild resources have varying base quality.
 */
function getResourceBaseQuality(resourceType: string): number {
  const baseQualities: Record<string, number> = {
    // Common resources - lower base quality
    'wood': 60,
    'stone': 60,
    'berries': 55,
    'food': 55,

    // Uncommon resources - medium base quality
    'clay': 65,
    'flint': 65,
    'fiber': 60,

    // Rare resources - higher base quality
    'iron': 70,
    'gold': 80,
    'gems': 85,
  };

  return baseQualities[resourceType] ?? 60; // Default to 60 for unknown resources
}

/**
 * Get quality multiplier for economy pricing.
 *
 * Formula: 0.5 + (quality / 100) * 1.5
 * Range: 0.5x (quality 0) to 2.0x (quality 100)
 *
 * @param quality - Item quality (0-100)
 * @returns Price multiplier (0.5-2.0)
 */
export function getQualityPriceMultiplier(quality: number): number {
  if (quality < 0 || quality > 100) {
    throw new Error(`Quality must be between 0-100, got ${quality}`);
  }

  return 0.5 + (quality / 100) * 1.5;
}

/**
 * Get default quality for legacy items.
 * Items without quality default to "normal" tier (50).
 */
export const DEFAULT_QUALITY = 50;

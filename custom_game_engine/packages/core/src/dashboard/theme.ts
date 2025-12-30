/**
 * Dashboard Theme - Default colors, fonts, and spacing for canvas rendering
 *
 * Views use this theme for consistent styling across the player UI.
 */

import type { RenderTheme } from './types.js';

/**
 * Default dark theme for dashboard views.
 *
 * This theme matches the existing game UI style.
 */
export const defaultTheme: RenderTheme = {
  colors: {
    background: '#1a1a1a',
    text: '#ffffff',
    textMuted: '#888888',
    accent: '#FFD700',      // Gold - for titles and highlights
    warning: '#FFA500',     // Orange - for warnings
    error: '#FF4444',       // Red - for errors/critical
    success: '#44FF44',     // Green - for success states
    border: '#333333',
  },
  fonts: {
    normal: '14px monospace',
    bold: 'bold 14px monospace',
    monospace: '14px monospace',
  },
  spacing: {
    padding: 10,
    lineHeight: 18,
    sectionGap: 10,
  },
};

/**
 * Resource-specific colors for item display
 */
export const resourceColors: Record<string, string> = {
  wood: '#8B4513',      // SaddleBrown
  stone: '#808080',     // Gray
  food: '#90EE90',      // LightGreen
  water: '#4169E1',     // RoyalBlue
  fiber: '#DEB887',     // BurlyWood
  cloth: '#DEB887',     // BurlyWood
  metal: '#C0C0C0',     // Silver
  gold: '#FFD700',      // Gold
  coal: '#2F4F4F',      // DarkSlateGray
  default: '#FFFFFF',   // White
};

/**
 * Resource icons (emoji) for item display
 */
export const resourceIcons: Record<string, string> = {
  wood: '🪵',
  stone: '🪨',
  food: '🍎',
  water: '💧',
  seed: '🌰',
  fiber: '🧵',
  cloth: '🧶',
  metal: '⚙️',
  gold: '🪙',
  coal: '�ite',
  default: '📦',
};

/**
 * Get the color for a resource type
 *
 * @param itemId - The item/resource ID
 * @returns Color string
 */
export function getResourceColor(itemId: string): string {
  // Check exact match
  if (resourceColors[itemId]) {
    return resourceColors[itemId];
  }

  // Check partial matches
  for (const [key, color] of Object.entries(resourceColors)) {
    if (itemId.includes(key)) {
      return color;
    }
  }

  return resourceColors['default']!;
}

/**
 * Get the icon for a resource type
 *
 * @param itemId - The item/resource ID
 * @returns Icon string (emoji or fallback)
 */
export function getResourceIcon(itemId: string): string {
  // Check exact match
  if (resourceIcons[itemId]) {
    return resourceIcons[itemId];
  }

  // Check partial matches
  for (const [key, icon] of Object.entries(resourceIcons)) {
    if (itemId.includes(key)) {
      return icon;
    }
  }

  return resourceIcons['default']!;
}

/**
 * Status colors for different states
 */
export const statusColors = {
  healthy: '#44FF44',
  warning: '#FFA500',
  critical: '#FF4444',
  neutral: '#888888',
  inactive: '#555555',
};

/**
 * Get status color based on a value and thresholds
 *
 * @param value - Current value
 * @param criticalBelow - Value below this is critical
 * @param warningBelow - Value below this is warning
 * @returns Color string
 */
export function getStatusColor(
  value: number,
  criticalBelow: number = 20,
  warningBelow: number = 50
): string {
  if (value < criticalBelow) return statusColors.critical;
  if (value < warningBelow) return statusColors.warning;
  return statusColors.healthy;
}

/**
 * Format a number for display with appropriate precision
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0 for integers, 1 for decimals)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) {
    return value.toFixed(decimals);
  }

  // Auto-detect: use decimals only if not an integer
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(1);
}

/**
 * Create a simple text progress bar
 *
 * @param value - Current value (0-100)
 * @param width - Bar width in characters
 * @returns Text progress bar string
 */
export function createProgressBar(value: number, width: number = 20): string {
  const filled = Math.round((value / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Centralized item-related type definitions
 */

export type ItemQuality = 'poor' | 'normal' | 'fine' | 'masterwork' | 'legendary';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type FlavorType = 'sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami';

export type RecipeCategory = 'All' | 'Tools' | 'Weapons' | 'Food' | 'Materials' | 'Building' | 'Decorations';

export type RecipeComplexity = 'simple' | 'intermediate' | 'advanced' | 'masterwork';

export type IngredientStatus = 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'IN_STORAGE';

export type CraftingJobStatus = 'queued' | 'in_progress' | 'completed' | 'cancelled' | 'waiting_ingredients';

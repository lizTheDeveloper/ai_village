// packages/core/src/constants/SpatialConstants.ts

/** Distance for diagonal adjacency (Math.sqrt(2)) */
export const DIAGONAL_DISTANCE = Math.sqrt(2);

/** Distance considered "adjacent" for interactions */
export const ADJACENT_DISTANCE = 1.5;

/** Standard interaction distance */
export const INTERACTION_DISTANCE = 2.0;

// Search radii
export const GATHER_MAX_RANGE = 50;
export const HOME_RADIUS = 15;
export const HARVEST_DISTANCE = 1.5;
export const TILL_SEARCH_RADIUS = 10;
export const PLANT_SEARCH_RADIUS = 15;
export const WATER_SEARCH_RADIUS = 15;
export const TAMING_RANGE = 40;
export const HOUSING_RANGE = 50;
export const SHOP_SEARCH_RADIUS = 50;
export const CRAFT_STATION_SEARCH_RADIUS = 30;

// Follow behavior
export const FOLLOW_MIN_DISTANCE = 3;
export const FOLLOW_MAX_DISTANCE = 5;

// Meeting/social
export const MEETING_ARRIVAL_THRESHOLD = 2.0;

// Building placement
export const PLACEMENT_SEARCH_RADIUS = 10;
export const ADJACENT_BUILDING_CHECK = 2;

// Verification system
export const VERIFICATION_RANGE = 5;
export const CLAIM_AGE_THRESHOLD = 200;

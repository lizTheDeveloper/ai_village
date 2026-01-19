// packages/core/src/constants/SpatialConstants.ts

import constantsData from '../data/constants.json';

/** Distance for diagonal adjacency (Math.sqrt(2)) */
export const DIAGONAL_DISTANCE = constantsData.spatial.diagonalDistance;

/** Distance considered "adjacent" for interactions */
export const ADJACENT_DISTANCE = constantsData.spatial.adjacentDistance;

/** Standard interaction distance */
export const INTERACTION_DISTANCE = constantsData.spatial.interactionDistance;

// Search radii
export const GATHER_MAX_RANGE = constantsData.spatial.gatherMaxRange;
export const HOME_RADIUS = constantsData.spatial.homeRadius;
export const HARVEST_DISTANCE = constantsData.spatial.harvestDistance;
export const TILL_SEARCH_RADIUS = constantsData.spatial.tillSearchRadius;
export const PLANT_SEARCH_RADIUS = constantsData.spatial.plantSearchRadius;
export const WATER_SEARCH_RADIUS = constantsData.spatial.waterSearchRadius;
export const TAMING_RANGE = constantsData.spatial.tamingRange;
export const HOUSING_RANGE = constantsData.spatial.housingRange;
export const SHOP_SEARCH_RADIUS = constantsData.spatial.shopSearchRadius;
export const CRAFT_STATION_SEARCH_RADIUS = constantsData.spatial.craftStationSearchRadius;

// Follow behavior
export const FOLLOW_MIN_DISTANCE = constantsData.spatial.followMinDistance;
export const FOLLOW_MAX_DISTANCE = constantsData.spatial.followMaxDistance;

// Meeting/social
export const MEETING_ARRIVAL_THRESHOLD = constantsData.spatial.meetingArrivalThreshold;

// Building placement
export const PLACEMENT_SEARCH_RADIUS = constantsData.spatial.placementSearchRadius;
export const ADJACENT_BUILDING_CHECK = constantsData.spatial.adjacentBuildingCheck;

// Verification system
export const VERIFICATION_RANGE = constantsData.spatial.verificationRange;
export const CLAIM_AGE_THRESHOLD = constantsData.spatial.claimAgeThreshold;

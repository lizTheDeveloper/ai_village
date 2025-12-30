/**
 * Centralized governance and data quality type definitions
 */

export type DataQuality = 'full' | 'basic' | 'real_time' | 'stale' | 'delayed' | 'unavailable';

export type ResourceStatus = 'surplus' | 'adequate' | 'low' | 'critical';

export type DistributionFairness = 'equal' | 'unequal' | 'very_unequal';

export type HealthTrend = 'improving' | 'stable' | 'worsening';

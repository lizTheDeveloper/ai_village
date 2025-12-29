/**
 * Governance building components for information infrastructure.
 * Per governance-dashboard work order.
 */

export type { TownHallComponent, AgentRecord, DeathRecord, BirthRecord, TownHallDataQuality } from './TownHallComponent.js';
export { createTownHallComponent } from './TownHallComponent.js';

export type { CensusBureauComponent, Demographics, Projections, GenerationalTrend, CensusBureauDataQuality } from './CensusBureauComponent.js';
export { createCensusBureauComponent } from './CensusBureauComponent.js';

export * from './WarehouseComponent.js';
export * from './WeatherStationComponent.js';
export * from './HealthClinicComponent.js';

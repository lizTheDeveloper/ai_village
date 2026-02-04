/**
 * Dashboard Views Index
 *
 * Exports all view definitions for the unified dashboard system.
 * Views are registered with the global ViewRegistry on import.
 */

// Export view definitions and their data types
// Core views
export { ResourcesView, type ResourcesViewData } from './ResourcesView.js';
export { PopulationView, type PopulationViewData } from './PopulationView.js';
export { WeatherView, type WeatherViewData } from './WeatherView.js';

// Info views
export { AgentInfoView, type AgentInfoViewData } from './AgentInfoView.js';
export { AnimalInfoView, type AnimalInfoViewData } from './AnimalInfoView.js';
export { PlantInfoView, type PlantInfoViewData } from './PlantInfoView.js';
export { TileInspectorView, type TileInspectorViewData } from './TileInspectorView.js';

// Economy views
export { EconomyView, type EconomyViewData } from './EconomyView.js';
export { ShopView, type ShopViewData } from './ShopView.js';
export { CraftingView, type CraftingViewData } from './CraftingView.js';

// Social views
export { RelationshipsView, type RelationshipsViewData } from './RelationshipsView.js';
export { MemoryView, type MemoryViewData } from './MemoryView.js';
export { GovernanceView, type GovernanceViewData } from './GovernanceView.js';

// Magic views
export { MagicSystemsView, type MagicSystemsViewData } from './MagicSystemsView.js';
export { SpellbookView, type SpellbookViewData } from './SpellbookView.js';

// Divinity views
export { DivinePowersView, type DivinePowersViewData } from './DivinePowersView.js';
export { PrayersView, type PrayersViewData } from './PrayersView.js';
export { VisionComposerView, type VisionComposerViewData } from './VisionComposerView.js';
export { AngelsView, type AngelsViewData } from './AngelsView.js';
export { MythologyView, type MythologyViewData } from './MythologyView.js';
export { PantheonView, type PantheonViewData } from './PantheonView.js';
export { DeityIdentityView, type DeityIdentityViewData } from './DeityIdentityView.js';

// Parasitic/Hive views
export { ParasiticHiveMindView, type ParasiticHiveMindViewData } from './ParasiticHiveMindView.js';

// Settings and dev views
export { ControlsView, type ControlsViewData } from './ControlsView.js';
export { SettingsView, type SettingsViewData } from './SettingsView.js';
export { DevView, type DevViewData } from './DevView.js';

// Import ViewRegistry for auto-registration
import { viewRegistry } from '../ViewRegistry.js';
import type { DashboardView, ViewData } from '../types.js';

// Import all views for registration
import { ResourcesView } from './ResourcesView.js';
import { PopulationView } from './PopulationView.js';
import { WeatherView } from './WeatherView.js';
import { AgentInfoView } from './AgentInfoView.js';
import { AnimalInfoView } from './AnimalInfoView.js';
import { PlantInfoView } from './PlantInfoView.js';
import { TileInspectorView } from './TileInspectorView.js';
import { EconomyView } from './EconomyView.js';
import { ShopView } from './ShopView.js';
import { CraftingView } from './CraftingView.js';
import { RelationshipsView } from './RelationshipsView.js';
import { MemoryView } from './MemoryView.js';
import { GovernanceView } from './GovernanceView.js';
import { MagicSystemsView } from './MagicSystemsView.js';
import { SpellbookView } from './SpellbookView.js';
import { DivinePowersView } from './DivinePowersView.js';
import { PrayersView } from './PrayersView.js';
import { VisionComposerView } from './VisionComposerView.js';
import { AngelsView } from './AngelsView.js';
import { MythologyView } from './MythologyView.js';
import { PantheonView } from './PantheonView.js';
import { DeityIdentityView } from './DeityIdentityView.js';
import { ControlsView } from './ControlsView.js';
import { SettingsView } from './SettingsView.js';
import { DevView } from './DevView.js';
import { ParasiticHiveMindView } from './ParasiticHiveMindView.js';

/**
 * All built-in views for registration.
 * Now type-safe with covariant DashboardView interface.
 */
export const builtInViews: readonly DashboardView<ViewData>[] = [
  // Core
  ResourcesView,
  PopulationView,
  WeatherView,
  // Info
  AgentInfoView,
  AnimalInfoView,
  PlantInfoView,
  TileInspectorView,
  // Economy
  EconomyView,
  ShopView,
  CraftingView,
  // Social
  RelationshipsView,
  MemoryView,
  GovernanceView,
  // Magic
  MagicSystemsView,
  SpellbookView,
  // Divinity
  DivinePowersView,
  PrayersView,
  VisionComposerView,
  AngelsView,
  MythologyView,
  PantheonView,
  DeityIdentityView,
  // Parasitic/Hive
  ParasiticHiveMindView,
  // Settings/Dev
  ControlsView,
  SettingsView,
  DevView,
];

/**
 * Views organized by category for route grouping
 */
export const viewsByCategory = {
  info: ['agent-info', 'animal-info', 'plant-info', 'tile-inspector'],
  economy: ['resources', 'economy', 'shop', 'crafting'],
  social: ['population', 'relationships', 'memory', 'governance'],
  farming: ['plant-info'],
  animals: ['animal-info'],
  magic: ['magic-systems', 'spellbook'],
  divinity: ['divine-powers', 'deity-identity', 'prayers', 'vision-composer', 'angels', 'mythology', 'pantheon'],
  parasitic: ['parasitic-hivemind'],
  environment: ['weather'],
  settings: ['settings', 'controls'],
  dev: ['dev'],
} as const;

/**
 * Register all built-in views with the global registry.
 * Safe to call multiple times - skips already registered views.
 */
export function registerBuiltInViews(): void {
  for (const view of builtInViews) {
    if (!viewRegistry.has(view.id)) {
      viewRegistry.register(view);
    }
  }
}

// Auto-register on module import
// This ensures views are available when the module is loaded
registerBuiltInViews();

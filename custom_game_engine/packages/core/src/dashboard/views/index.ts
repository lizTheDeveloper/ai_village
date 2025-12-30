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

/**
 * All built-in views for registration.
 * Cast to base DashboardView type for array storage.
 */
export const builtInViews: readonly DashboardView<ViewData>[] = [
  // Core
  ResourcesView as unknown as DashboardView<ViewData>,
  PopulationView as unknown as DashboardView<ViewData>,
  WeatherView as unknown as DashboardView<ViewData>,
  // Info
  AgentInfoView as unknown as DashboardView<ViewData>,
  AnimalInfoView as unknown as DashboardView<ViewData>,
  PlantInfoView as unknown as DashboardView<ViewData>,
  TileInspectorView as unknown as DashboardView<ViewData>,
  // Economy
  EconomyView as unknown as DashboardView<ViewData>,
  ShopView as unknown as DashboardView<ViewData>,
  CraftingView as unknown as DashboardView<ViewData>,
  // Social
  RelationshipsView as unknown as DashboardView<ViewData>,
  MemoryView as unknown as DashboardView<ViewData>,
  GovernanceView as unknown as DashboardView<ViewData>,
  // Magic
  MagicSystemsView as unknown as DashboardView<ViewData>,
  SpellbookView as unknown as DashboardView<ViewData>,
  // Divinity
  DivinePowersView as unknown as DashboardView<ViewData>,
  PrayersView as unknown as DashboardView<ViewData>,
  VisionComposerView as unknown as DashboardView<ViewData>,
  AngelsView as unknown as DashboardView<ViewData>,
  MythologyView as unknown as DashboardView<ViewData>,
  PantheonView as unknown as DashboardView<ViewData>,
  DeityIdentityView as unknown as DashboardView<ViewData>,
  // Settings/Dev
  ControlsView as unknown as DashboardView<ViewData>,
  SettingsView as unknown as DashboardView<ViewData>,
  DevView as unknown as DashboardView<ViewData>,
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

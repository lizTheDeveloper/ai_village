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
 * Widen a typed DashboardView<TData> to DashboardView<ViewData> for heterogeneous
 * collection storage. This encapsulates the necessary type widening in one place.
 *
 * This is safe at runtime because within a single view, getData() produces TData which
 * is then consumed by textFormatter/canvasRenderer/handleClick. The data flow is always
 * internal to one view instance, so the concrete type is always consistent. TypeScript
 * prevents direct assignment because TData appears in both covariant (getData return)
 * and contravariant (formatter/renderer parameter) positions, but runtime behavior is
 * always correct.
 *
 * // TODO: [tech-debt] Add variance annotation to DashboardView<TData> in types.ts:
 * //   interface DashboardView<out TData extends ViewData = ViewData>
 * // TypeScript 4.7+ supports explicit `out` variance annotations. Making TData
 * // covariant would allow DashboardView<SubType> to be assignable to
 * // DashboardView<ViewData> without any cast. This requires updating the
 * // textFormatter, canvasRenderer, and handleClick signatures to accept ViewData
 * // (the base type) or restructuring the interface to separate producer/consumer
 * // concerns (e.g., a separate ReadonlyDashboardView for collection storage).
 */
function asBaseView<T extends ViewData>(view: DashboardView<T>): DashboardView<ViewData> {
  return view as unknown as DashboardView<ViewData>;
}

/**
 * All built-in views for registration.
 * Uses asBaseView() to widen specific view types for heterogeneous array storage.
 */
export const builtInViews: readonly DashboardView<ViewData>[] = [
  // Core
  asBaseView(ResourcesView),
  asBaseView(PopulationView),
  asBaseView(WeatherView),
  // Info
  asBaseView(AgentInfoView),
  asBaseView(AnimalInfoView),
  asBaseView(PlantInfoView),
  asBaseView(TileInspectorView),
  // Economy
  asBaseView(EconomyView),
  asBaseView(ShopView),
  asBaseView(CraftingView),
  // Social
  asBaseView(RelationshipsView),
  asBaseView(MemoryView),
  asBaseView(GovernanceView),
  // Magic
  asBaseView(MagicSystemsView),
  asBaseView(SpellbookView),
  // Divinity
  asBaseView(DivinePowersView),
  asBaseView(PrayersView),
  asBaseView(VisionComposerView),
  asBaseView(AngelsView),
  asBaseView(MythologyView),
  asBaseView(PantheonView),
  asBaseView(DeityIdentityView),
  // Parasitic/Hive
  asBaseView(ParasiticHiveMindView),
  // Settings/Dev
  asBaseView(ControlsView),
  asBaseView(SettingsView),
  asBaseView(DevView),
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

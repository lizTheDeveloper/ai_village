/**
 * Panel Factory - Lazy panel creation for WindowManager
 *
 * This module provides factory functions for creating UI panels on-demand.
 * Panels are only instantiated when first shown, reducing startup time and memory usage.
 */

import type { IWindowPanel } from '../types/WindowTypes';

// Import panel classes
import { MemoryPanel } from '../MemoryPanel';
import { RelationshipsPanel } from '../RelationshipsPanel';
import { AnimalInfoPanel } from '../AnimalInfoPanel';
import { AnimalRosterPanel } from '../AnimalRosterPanel';
import { PlantInfoPanel } from '../PlantInfoPanel';
import { EconomyPanel } from '../EconomyPanel';
import { ShopPanel } from '../ShopPanel';
import { GovernanceDashboardPanel } from '../GovernanceDashboardPanel';
import { CityManagerPanel } from '../CityManagerPanel';
import { ResourcesPanel } from '../ResourcesPanel';
import { NotificationsPanel } from '../NotificationsPanel';
import { TileInspectorPanel } from '../TileInspectorPanel';
import { ResearchLibraryPanel } from '../ResearchLibraryPanel';
import { TechTreePanel } from '../TechTreePanel';
import { TimeControlsPanel } from '../TimeControlsPanel';
import { UniverseManagerPanel } from '../UniverseManagerPanel';
import { MagicSystemsPanel } from '../MagicSystemsPanel';
import { SpellbookPanel } from '../SpellbookPanel';
import { DivinePowersPanel } from '../DivinePowersPanel';
import { VisionComposerPanel } from '../VisionComposerPanel';
import { DivineAnalyticsPanel } from '../DivineAnalyticsPanel';
import { SacredGeographyPanel } from '../SacredGeographyPanel';
import { AngelManagementPanel } from '../AngelManagementPanel';
import { PrayerPanel } from '../PrayerPanel';

// Import adapter factory functions
import { createMemoryPanelAdapter } from '../adapters/MemoryPanelAdapter';
import { createRelationshipsPanelAdapter } from '../adapters/RelationshipsPanelAdapter';
import { createAnimalInfoPanelAdapter } from '../adapters/AnimalInfoPanelAdapter';
import { createPlantInfoPanelAdapter } from '../adapters/PlantInfoPanelAdapter';
import { createEconomyPanelAdapter } from '../adapters/EconomyPanelAdapter';
import { createShopPanelAdapter } from '../adapters/ShopPanelAdapter';
import { createGovernanceDashboardPanelAdapter } from '../adapters/GovernanceDashboardPanelAdapter';
import { createResourcesPanelAdapter } from '../adapters/ResourcesPanelAdapter';
import { createNotificationsPanelAdapter } from '../adapters/NotificationsPanelAdapter';
import { createTileInspectorPanelAdapter } from '../adapters/TileInspectorPanelAdapter';
import { createMagicSystemsPanelAdapter } from '../adapters/MagicSystemsPanelAdapter';
import { createSpellbookPanelAdapter } from '../adapters/SpellbookPanelAdapter';
import { createDivinePowersPanelAdapter } from '../adapters/DivinePowersPanelAdapter';
import { createVisionComposerPanelAdapter } from '../adapters/VisionComposerPanelAdapter';
import { createDivineAnalyticsPanelAdapter } from '../adapters/DivineAnalyticsPanelAdapter';
import { createSacredGeographyPanelAdapter } from '../adapters/SacredGeographyPanelAdapter';
import { createAngelManagementPanelAdapter } from '../adapters/AngelManagementPanelAdapter';
import { createPrayerPanelAdapter } from '../adapters/PrayerPanelAdapter';

import type { EventBus } from '@ai-village/core';
import type { Camera } from '../Camera';
import type { ChunkManager } from '@ai-village/world';
import type { PixelLabLoader } from '../PixelLabLoader';

/**
 * Panel factory context - dependencies needed by some panel factories
 */
export interface PanelFactoryContext {
  eventBus?: EventBus;
  camera?: Camera;
  chunkManager?: ChunkManager;
  pixelLabLoader?: PixelLabLoader;
}

/**
 * Factory for MemoryPanel
 */
export function createMemoryPanelFactory(): () => IWindowPanel {
  return () => createMemoryPanelAdapter(new MemoryPanel());
}

/**
 * Factory for RelationshipsPanel
 */
export function createRelationshipsPanelFactory(): () => IWindowPanel {
  return () => createRelationshipsPanelAdapter(new RelationshipsPanel());
}

/**
 * Factory for AnimalInfoPanel
 */
export function createAnimalInfoPanelFactory(): () => IWindowPanel {
  return () => createAnimalInfoPanelAdapter(new AnimalInfoPanel());
}

/**
 * Factory for AnimalRosterPanel
 */
export function createAnimalRosterPanelFactory(pixelLabLoader: PixelLabLoader): () => IWindowPanel {
  return () => new AnimalRosterPanel(pixelLabLoader);
}

/**
 * Factory for PlantInfoPanel
 */
export function createPlantInfoPanelFactory(): () => IWindowPanel {
  return () => createPlantInfoPanelAdapter(new PlantInfoPanel());
}

/**
 * Factory for EconomyPanel
 */
export function createEconomyPanelFactory(): () => IWindowPanel {
  return () => createEconomyPanelAdapter(new EconomyPanel());
}

/**
 * Factory for ShopPanel
 */
export function createShopPanelFactory(): () => IWindowPanel {
  return () => createShopPanelAdapter(new ShopPanel());
}

/**
 * Factory for GovernanceDashboardPanel
 */
export function createGovernanceDashboardPanelFactory(): () => IWindowPanel {
  return () => createGovernanceDashboardPanelAdapter(new GovernanceDashboardPanel());
}

/**
 * Factory for CityManagerPanel
 */
export function createCityManagerPanelFactory(): () => IWindowPanel {
  return () => new CityManagerPanel();
}

/**
 * Factory for ResourcesPanel
 */
export function createResourcesPanelFactory(): () => IWindowPanel {
  return () => createResourcesPanelAdapter(new ResourcesPanel());
}

/**
 * Factory for NotificationsPanel
 */
export function createNotificationsPanelFactory(): () => IWindowPanel {
  return () => createNotificationsPanelAdapter(new NotificationsPanel());
}

/**
 * Factory for TileInspectorPanel
 */
export function createTileInspectorPanelFactory(
  eventBus: EventBus,
  camera: Camera,
  chunkManager: ChunkManager
): () => IWindowPanel {
  return () => createTileInspectorPanelAdapter(new TileInspectorPanel(eventBus, camera, chunkManager));
}

/**
 * Factory for ResearchLibraryPanel
 */
export function createResearchLibraryPanelFactory(): () => IWindowPanel {
  return () => new ResearchLibraryPanel();
}

/**
 * Factory for TechTreePanel
 */
export function createTechTreePanelFactory(): () => IWindowPanel {
  return () => new TechTreePanel();
}

/**
 * Factory for TimeControlsPanel
 */
export function createTimeControlsPanelFactory(): () => IWindowPanel {
  return () => new TimeControlsPanel();
}

/**
 * Factory for UniverseManagerPanel
 */
export function createUniverseManagerPanelFactory(): () => IWindowPanel {
  return () => new UniverseManagerPanel();
}

/**
 * Factory for MagicSystemsPanel
 */
export function createMagicSystemsPanelFactory(): () => IWindowPanel {
  return () => createMagicSystemsPanelAdapter(new MagicSystemsPanel());
}

/**
 * Factory for SpellbookPanel
 */
export function createSpellbookPanelFactory(): () => IWindowPanel {
  return () => createSpellbookPanelAdapter(new SpellbookPanel());
}

/**
 * Factory for DivinePowersPanel
 */
export function createDivinePowersPanelFactory(): () => IWindowPanel {
  return () => createDivinePowersPanelAdapter(new DivinePowersPanel());
}

/**
 * Factory for VisionComposerPanel
 */
export function createVisionComposerPanelFactory(): () => IWindowPanel {
  return () => createVisionComposerPanelAdapter(new VisionComposerPanel());
}

/**
 * Factory for DivineAnalyticsPanel
 */
export function createDivineAnalyticsPanelFactory(): () => IWindowPanel {
  return () => {
    const panel = new DivineAnalyticsPanel(
      {
        analytics: {
          faithTrend: [],
          prayersByDomain: {},
          prophecyAccuracy: 0,
          believerGrowth: 0,
          miracleEffectiveness: 0,
        },
        energy: { current: 100, max: 1000, regenRate: 1 },
        selectedTimeRange: '7_days',
        selectedProphecyId: null,
        scrollOffset: 0,
      },
      {
        onSelectProphecy: () => {},
        onExportData: () => {},
        onTimeRangeChange: () => {},
      }
    );
    return createDivineAnalyticsPanelAdapter(panel);
  };
}

/**
 * Factory for SacredGeographyPanel
 */
export function createSacredGeographyPanelFactory(): () => IWindowPanel {
  return () => {
    const panel = new SacredGeographyPanel(
      {
        sites: [],
        selectedSiteId: null,
        enabledLayers: new Set(['sacred_sites']),
        faithDensity: [],
        currentEnergy: 100,
        mapBounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
        cameraOffset: { x: 0, y: 0 },
        zoom: 1,
      },
      {
        onSelectSite: () => {},
        onBlessSite: () => {},
        onSendMiracle: () => {},
        onViewHistory: () => {},
        onToggleLayer: () => {},
        onCenterOnSite: () => {},
      }
    );
    return createSacredGeographyPanelAdapter(panel);
  };
}

/**
 * Factory for AngelManagementPanel
 */
export function createAngelManagementPanelFactory(): () => IWindowPanel {
  return () => {
    const panel = new AngelManagementPanel(
      {
        angels: [],
        selectedAngelId: null,
        energy: { current: 100, max: 1000, regenRate: 1 },
        wizardOpen: false,
        wizardStep: 0,
        wizardDraft: null,
        availableAgentsToAssign: [],
      },
      {
        onSelectAngel: () => {},
        onCreateAngel: () => {},
        onToggleAngelRest: () => {},
        onSetAngelAutonomy: () => {},
        onToggleAbility: () => {},
        onAssignAgent: () => {},
        onUnassignAgent: () => {},
        onOpenCreationWizard: () => {},
        onCloseCreationWizard: () => {},
      }
    );
    return createAngelManagementPanelAdapter(panel);
  };
}

/**
 * Factory for PrayerPanel
 */
export function createPrayerPanelFactory(): () => IWindowPanel {
  return () => {
    const panel = new PrayerPanel(
      {
        prayers: [],
        selectedPrayerId: null,
        selectedPrayerContext: null,
        availableAngels: [],
        currentEnergy: 100,
        filterDomain: 'all',
        filterUrgency: 'all',
      },
      {
        onSendVision: () => {},
        onPerformMiracle: () => {},
        onAssignAngel: () => {},
        onIgnorePrayer: () => {},
        onSelectPrayer: () => {},
      }
    );
    return createPrayerPanelAdapter(panel);
  };
}

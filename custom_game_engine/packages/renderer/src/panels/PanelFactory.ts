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
import { DivineAnalyticsPanel } from '../divine/DivineAnalyticsPanel';
import { SacredGeographyPanel } from '../divine/SacredGeographyPanel';
import { AngelManagementPanel } from '../divine/AngelManagementPanel';
import { PrayerPanel } from '../divine/PrayerPanel';

// Import adapter factory functions from index
import {
  createMemoryPanelAdapter,
  createRelationshipsPanelAdapter,
  createAnimalInfoPanelAdapter,
  createPlantInfoPanelAdapter,
  createEconomyPanelAdapter,
  createShopPanelAdapter,
  createGovernanceDashboardPanelAdapter,
  createResourcesPanelAdapter,
  createNotificationsPanelAdapter,
  createTileInspectorPanelAdapter,
  createMagicSystemsPanelAdapter,
  createSpellbookPanelAdapter,
  createDivinePowersPanelAdapter,
  createVisionComposerPanelAdapter,
  createDivineAnalyticsPanelAdapter,
  createSacredGeographyPanelAdapter,
  createAngelManagementPanelAdapter,
  createPrayerPanelAdapter,
} from '../adapters/index';

import type { EventBus } from '@ai-village/core';
import type { Camera } from '../Camera';
import type { ChunkManager } from '@ai-village/world';

/**
 * Panel factory context - dependencies needed by some panel factories
 */
export interface PanelFactoryContext {
  eventBus?: EventBus;
  camera?: Camera;
  chunkManager?: ChunkManager;
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
export function createAnimalRosterPanelFactory(spriteLoader: any): () => IWindowPanel {
  return () => new AnimalRosterPanel(spriteLoader);
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
 * Lazy-loads research data on first panel creation
 */
export function createResearchLibraryPanelFactory(): () => IWindowPanel {
  return () => {
    // Lazy-load research on first access
    import('@ai-village/core').then(({ ensureResearchLoaded }) => {
      ensureResearchLoaded();
    });
    return new ResearchLibraryPanel();
  };
}

/**
 * Factory for TechTreePanel
 * Lazy-loads research data on first panel creation
 */
export function createTechTreePanelFactory(): () => IWindowPanel {
  return () => {
    // Lazy-load research on first access
    import('@ai-village/core').then(({ ensureResearchLoaded }) => {
      ensureResearchLoaded();
    });
    return new TechTreePanel();
  };
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
          faithTrends: [],
          prayerStats: {
            total: 0,
            answered: 0,
            unanswered: 0,
            byDomain: {
              survival: 0,
              health: 0,
              social: 0,
              guidance: 0,
              environment: 0,
              gratitude: 0,
              other: 0,
            },
            averageResponseTime: 0,
          },
          faithDistribution: {
            skeptics: 0,
            curious: 0,
            believers: 0,
            devout: 0,
            average: 0,
          },
          prophecies: [],
          energyEconomy: { income: 0, consumption: 0, net: 0 },
        },
        energy: { current: 100, max: 1000, regenRate: 1, consumption: 0 },
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
        energy: { current: 100, max: 1000, regenRate: 1, consumption: 0 },
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

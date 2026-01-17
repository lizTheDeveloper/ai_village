/**
 * Herbalist Discovery System
 *
 * When herbalists discover new plants, they publish botanical research papers.
 * Integrates with the AcademicPaperSystem for proper academic credit.
 *
 * "In the beginning, there was the plant. The plant didn't care if anyone noticed.
 * Then someone noticed, and now we have dissertations." - Anonymous Botanist
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import {
  getAcademicPaperSystem,
  type AcademicPaperSystem,
  type AcademicPaper,
} from './AcademicPaperSystem.js';

/**
 * A discovered plant species
 */
export interface PlantDiscovery {
  /** Unique ID for this discovery */
  id: string;
  /** Species name */
  speciesName: string;
  /** Common name */
  commonName: string;
  /** Biome where discovered */
  biome: string;
  /** Latitude zone */
  latitudeZone?: string;
  /** Chemotype if regional variant */
  chemotype?: string;
  /** Medicinal properties discovered */
  medicinalProperties?: string[];
  /** Discovery tick */
  discoveredAt: number;
  /** Discoverer entity ID */
  discovererId: string;
  /** Discoverer name */
  discovererName: string;
  /** Whether paper has been published */
  paperPublished: boolean;
  /** Paper ID if published */
  paperId?: string;
}

/**
 * Herbalist discovery component - tracks an agent's botanical discoveries
 */
export interface HerbalistDiscoveryComponent {
  type: 'herbalist_discovery';
  version: number;
  /** Total plants discovered */
  plantsDiscovered: number;
  /** Plant discoveries by species */
  discoveries: PlantDiscovery[];
  /** Papers published about discoveries */
  papersPublished: number;
  /** H-index for botanical papers */
  botanicalHIndex: number;
  /** Favorite biome for foraging */
  favoriteBiome?: string;
  /** Field specialization */
  specialization?: 'medicinal' | 'culinary' | 'aquatic' | 'fungal' | 'general';
}

/**
 * Humorous botanical paper titles in Pratchett/Adams/Gaiman style
 */
const BOTANICAL_TITLE_TEMPLATES: string[] = [
  // Terry Pratchett style
  'A Brief History of {plant}, Which Is Shorter Than You\'d Think',
  'The Surprisingly Cantankerous Nature of {plant} in Laboratory Settings',
  'Why {plant} Grows Where It Damn Well Pleases: A {biome} Study',
  '{plant}: A Plant With Strong Opinions About Soil pH',
  'On the Refusal of {plant} to Cooperate With Standard Taxonomy',
  'A Discourse on {plant}, Which Has More Going On Than Anyone Expected',

  // Douglas Adams style
  'The Mostly Harmless {plant} of {biome}: A Field Guide for the Bewildered',
  '{plant}: 42 Observations on Its Deeply Improbable Existence',
  'Don\'t Panic: A Hitchhiker\'s Guide to {plant} Identification',
  'The Answer to {plant}, Its Universe, and Everything',
  'So Long, and Thanks for All the {plant}: A Farewell Expedition Report',
  '{plant} and the Restaurant at the End of the {biome}',

  // Neil Gaiman style
  'The Dream of {plant}: A Meditation on Chlorophyll and Consciousness',
  '{plant} Was Here First: An Old Story About a New Discovery',
  'Something Very Like {plant}: Finding the Impossible in {biome}',
  'The Sandman\'s Garden: {plant} and Other Nocturnal Flora',
  'Where {plant} Goes When No One Is Looking',
  'A Very Short Story About {plant} (Which Turned Out to Be Quite Long)',

  // Academic parody
  'Novel Identification of {plant} (Which Every Local Already Knew)',
  'We Found {plant} in {biome} and Now Claim Credit for Its Existence',
  'A Rigorous Statistical Analysis of Whether {plant} Is Really There (n=1)',
  'First Formal Description of {plant}, Ignoring Centuries of Folk Knowledge',
  '{plant}: We Discovered It, Don\'t @ Us',
];

/**
 * Humorous abstract openings for botanical papers
 */
const BOTANICAL_ABSTRACT_OPENINGS: string[] = [
  // Pratchett
  'This plant exists despite our best attempts to classify it out of existence.',
  'The specimen in question was found growing where it shouldn\'t, as plants often do.',
  'Local wisdom suggested looking here. We ignored it for three months before conceding.',
  'The {plant} is, by all reasonable measures, impossible. It grows anyway.',

  // Adams
  'The probability of finding {plant} in this location is 1 in 10^42, which is why we found it.',
  'If you think finding a new plant is exciting, wait until you see the paperwork.',
  'Mostly harmless. The plant, not this paper.',
  'The answer to this botanical mystery is 42. The question remains unclear.',

  // Gaiman
  'Every plant remembers the first time someone gave it a name.',
  'The {plant} was dreaming of being discovered. We simply happened to notice.',
  'In the old stories, plants like this grant wishes. The paperwork does not.',
  'Something had been growing here since before humans had words for it.',

  // Academic satire
  'After seventeen failed expeditions, we finally looked in the obvious place.',
  'The medicinal properties of {plant} were well-documented in local tradition, which we ignored until now.',
  'This discovery adds crucial citations to our tenure application.',
  'We are the first to formally document what shepherds have known for centuries.',
];

/**
 * Humorous findings and conclusions
 */
const BOTANICAL_FINDINGS: string[] = [
  'The {plant} appears to grow exclusively where botanists are not currently looking.',
  'Cross-pollination studies suggest the {plant} may be avoiding us on purpose.',
  'Chemical analysis revealed seventeen previously unknown compounds, of which we understood three.',
  'The specimen demonstrated clear signs of having opinions about our research methodology.',
  'Field observations indicate the {plant} thrives on being left alone, a hint we failed to take.',
  'Local wildlife appears to have known about these medicinal properties all along.',
  'The {plant} possesses remarkable drought tolerance, possibly out of spite.',
  'Statistical analysis confirms our suspicions: this plant is weird.',
  'Further research is needed (primarily to justify next year\'s budget).',
  'The {plant} has survived our attempts at cultivation by the expedient method of dying immediately.',
];

/**
 * Generated paper data for botanical discoveries
 */
export interface BotanicalPaperData {
  title: string;
  abstract: string;
  researchId: string;
  isBreakthrough: boolean;
}

/**
 * Generate botanical paper title and abstract for a plant discovery
 */
export function generateBotanicalPaper(discovery: PlantDiscovery): BotanicalPaperData {
  // Generate humorous title
  const titleTemplate = BOTANICAL_TITLE_TEMPLATES[
    Math.floor(Math.random() * BOTANICAL_TITLE_TEMPLATES.length)
  ] as string;
  const title = titleTemplate
    .replace(/{plant}/g, discovery.commonName)
    .replace(/{biome}/g, discovery.biome);

  // Generate abstract
  const openingTemplate = BOTANICAL_ABSTRACT_OPENINGS[
    Math.floor(Math.random() * BOTANICAL_ABSTRACT_OPENINGS.length)
  ] as string;
  const opening = openingTemplate.replace(/{plant}/g, discovery.commonName);

  const findingTemplate = BOTANICAL_FINDINGS[
    Math.floor(Math.random() * BOTANICAL_FINDINGS.length)
  ] as string;
  const finding = findingTemplate.replace(/{plant}/g, discovery.commonName);

  const medicinalNote = discovery.medicinalProperties?.length
    ? `Medicinal properties identified include ${discovery.medicinalProperties.join(', ')}. `
    : '';

  const chemotypeNote = discovery.chemotype
    ? `Regional chemotype analysis suggests soil composition significantly affects potency. `
    : '';

  const abstract = `${opening} ${medicinalNote}${chemotypeNote}${finding}`;

  return {
    title,
    abstract,
    researchId: `botany_${discovery.speciesName.toLowerCase().replace(/\s+/g, '_')}`,
    isBreakthrough: Math.random() < 0.1, // 10% chance of breakthrough discovery
  };
}

/**
 * Herbalist Discovery System
 * Manages botanical research and paper publication for herbalists
 */
export class HerbalistDiscoverySystem implements System {
  public readonly id: SystemId = 'herbalist_discovery';
  public readonly priority: number = 175; // After gathering, before regular research
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;
  private events!: SystemEventManager;
  private paperSystem: AcademicPaperSystem | null = null;

  // Tick throttling
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 100; // Every 5 seconds at 20 TPS

  // Discovery tracking
  private discoveredSpecies: Set<string> = new Set();
  private pendingPublications: PlantDiscovery[] = [];

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.events = new SystemEventManager(eventBus, this.id);
  }

  /**
   * Initialize the paper system
   */
  private ensurePaperSystem(): AcademicPaperSystem {
    if (!this.paperSystem) {
      this.paperSystem = getAcademicPaperSystem();
    }
    return this.paperSystem;
  }

  /**
   * Called when an agent gathers a plant they haven't seen before
   */
  public registerPlantDiscovery(
    world: World,
    agentEntity: Entity,
    speciesId: string,
    speciesName: string,
    commonName: string,
    biome: string,
    medicinalProperties?: string[],
    chemotype?: string,
    latitudeZone?: string
  ): PlantDiscovery | null {
    // Check if species is globally known
    if (this.discoveredSpecies.has(speciesId)) {
      // Not a new discovery, but could still be a regional variant
      if (!chemotype) {
        return null;
      }
      // Check if this chemotype is known
      const chemotypeId = `${speciesId}_${chemotype}`;
      if (this.discoveredSpecies.has(chemotypeId)) {
        return null;
      }
      this.discoveredSpecies.add(chemotypeId);
    } else {
      this.discoveredSpecies.add(speciesId);
    }

    const agentComp = agentEntity.getComponent<AgentComponent>(ComponentType.Agent) as any;
    if (!agentComp) return null;

    const discovery: PlantDiscovery = {
      id: `discovery_${speciesId}_${Date.now()}`,
      speciesName,
      commonName,
      biome,
      latitudeZone,
      chemotype,
      medicinalProperties,
      discoveredAt: world.tick,
      discovererId: agentEntity.id,
      discovererName: agentComp.name ?? 'Unknown Herbalist',
      paperPublished: false,
    };

    // Add to pending publications
    this.pendingPublications.push(discovery);

    // Emit discovery event
    this.events.emitGeneric('plant:discovered', {
      discoveryId: discovery.id,
      speciesId,
      speciesName,
      commonName,
      biome,
      discovererId: agentEntity.id,
      discovererName: discovery.discovererName,
      chemotype,
      latitudeZone,
      medicinalProperties,
    });

    return discovery;
  }

  /**
   * Publish a paper about a plant discovery
   */
  public publishDiscoveryPaper(
    discovery: PlantDiscovery,
    coDiscoverers: Entity[] = []
  ): AcademicPaper | null {
    if (discovery.paperPublished) {
      return null;
    }

    const paperSystem = this.ensurePaperSystem();

    // Get co-author info
    const coAuthorIds: string[] = [];
    const coAuthorNames: string[] = [];
    for (const e of coDiscoverers) {
      const agent = e.getComponent<AgentComponent>(ComponentType.Agent) as any;
      if (agent) {
        coAuthorIds.push(e.id);
        coAuthorNames.push(agent.name ?? 'Unknown');
      }
    }

    // Generate the paper content
    const paperData = generateBotanicalPaper(discovery);

    // Publish through academic system using the correct API
    const result = paperSystem.publishPaper(
      paperData.researchId,
      discovery.discovererId,
      discovery.discovererName,
      coAuthorIds,
      coAuthorNames,
      paperData.isBreakthrough
    );

    const paper = result.paper;

    // Mark discovery as published
    discovery.paperPublished = true;
    discovery.paperId = paper.id;

    // Emit publication event
    this.events.emitGeneric('paper:published', {
      paperId: paper.id,
      title: paper.title,
      firstAuthor: { id: paper.firstAuthorId, name: paper.firstAuthorName },
      coAuthors: paper.coAuthorIds.map((id, i) => ({ id, name: paper.coAuthorNames[i] ?? 'Unknown' })),
      researchId: paper.researchId,
      tier: paper.tier,
      citationCount: 0,
      isBreakthrough: paper.isBreakthrough,
      discoveryId: discovery.id,
      speciesName: discovery.speciesName,
    });

    return paper;
  }

  /**
   * Main update loop
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Throttle updates
    if (world.tick - this.lastUpdateTick < HerbalistDiscoverySystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Process pending publications
    // Herbalists take time to write up their findings (simulate research period)
    const readyForPublication = this.pendingPublications.filter(
      (d) => !d.paperPublished && world.tick - d.discoveredAt > 500 // ~25 seconds delay
    );

    for (const discovery of readyForPublication) {
      this.publishDiscoveryPaper(discovery);
    }

    // Clean up old published discoveries
    this.pendingPublications = this.pendingPublications.filter(
      (d) => !d.paperPublished
    );
  }

  /**
   * Get all discoveries by an agent
   */
  public getAgentDiscoveries(agentId: string): PlantDiscovery[] {
    return this.pendingPublications.filter((d) => d.discovererId === agentId);
  }

  /**
   * Get total discovery count
   */
  public getTotalDiscoveries(): number {
    return this.discoveredSpecies.size;
  }

  /**
   * Check if a species has been discovered
   */
  public isSpeciesDiscovered(speciesId: string): boolean {
    return this.discoveredSpecies.has(speciesId);
  }

  /**
   * Cleanup subscriptions
   */
  cleanup(): void {
    this.events.cleanup();
  }
}

// Singleton instance
let herbalistDiscoverySystemInstance: HerbalistDiscoverySystem | null = null;

/**
 * Get the singleton HerbalistDiscoverySystem instance
 */
export function getHerbalistDiscoverySystem(): HerbalistDiscoverySystem {
  if (!herbalistDiscoverySystemInstance) {
    herbalistDiscoverySystemInstance = new HerbalistDiscoverySystem();
  }
  return herbalistDiscoverySystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetHerbalistDiscoverySystem(): void {
  herbalistDiscoverySystemInstance = null;
}

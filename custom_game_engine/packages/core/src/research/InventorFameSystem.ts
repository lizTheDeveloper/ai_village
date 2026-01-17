/**
 * InventorFameSystem - Fame and recognition through academic publication
 *
 * Fame is earned through CITATIONS, not arbitrary points:
 * - Publish papers during research
 * - Papers cite prerequisite research
 * - Citations from other papers = recognition
 * - h-index tracks sustained impact
 *
 * Fame tiers based on h-index and citations:
 * - Unknown (h < 2): Just starting out
 * - Known (h 2-5): Local recognition
 * - Notable (h 5-10): Regional recognition
 * - Famous (h 10-20): National recognition
 * - Legendary (h 20+): Historical recognition
 *
 * Lead authors get primary credit, co-authors share recognition.
 */

import { System, World, Entity } from '../ecs/index.js';
import { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { ResearchRegistry } from './ResearchRegistry.js';
import { getClarketechTier, getClarketechTierLabel } from './clarketechResearch.js';
import { getAcademicPaperSystem } from './AcademicPaperSystem.js';

// =============================================================================
// TYPES
// =============================================================================

export type FameTier = 'unknown' | 'known' | 'notable' | 'famous' | 'legendary';

export interface Inventor {
  agentId: string;
  agentName: string;

  // Citation-based metrics (synced from AcademicPaperSystem)
  hIndex: number;
  totalCitations: number;
  paperCount: number;
  firstAuthorPapers: number;

  // Fame derived from citations
  fameLevel: number; // 0-100, calculated from h-index and citations
  fameTier: FameTier;

  // Achievements
  discoveries: DiscoveryCredit[];
  totalDiscoveries: number;
  leadDiscoveries: number;
  contributorDiscoveries: number;

  // Wealth from research (grants, patents based on citations)
  patentRoyalties: number;
  grantMoney: number;
  totalWealth: number;

  // Titles earned
  titles: InventorTitle[];
  currentTitle: InventorTitle | null;

  // Recognition
  firstDiscoveryAt: number;
  lastDiscoveryAt: number;
  consecutiveDiscoveries: number;
  newsAppearances: number;
}

export interface DiscoveryCredit {
  researchId: string;
  researchName: string;
  tier: number;
  role: 'lead' | 'contributor';
  creditPercent: number;
  discoveredAt: number;
  coDiscoverers: string[]; // agent IDs
}

export interface InventorTitle {
  id: string;
  name: string;
  description: string;
  earnedAt: number;
  requirement: TitleRequirement;
}

export type TitleRequirement =
  | { type: 'discoveries'; count: number }
  | { type: 'fame'; level: number }
  | { type: 'tier'; minTier: number; count: number }
  | { type: 'field'; field: string; count: number }
  | { type: 'lead'; count: number }
  | { type: 'hindex'; level: number }
  | { type: 'citations'; count: number };

export interface NewsAnnouncement {
  id: string;
  headline: string;
  body: string;
  inventorIds: string[];
  researchId: string;
  tier: number;
  timestamp: number;
  broadcasted: boolean;
}

// =============================================================================
// TITLE DEFINITIONS
// =============================================================================

const TITLE_DEFINITIONS: Omit<InventorTitle, 'earnedAt'>[] = [
  // Discovery count titles
  {
    id: 'novice_researcher',
    name: 'Novice Researcher',
    description: 'Completed first research project',
    requirement: { type: 'discoveries', count: 1 },
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Completed 5 research projects',
    requirement: { type: 'discoveries', count: 5 },
  },
  {
    id: 'senior_researcher',
    name: 'Senior Researcher',
    description: 'Completed 10 research projects',
    requirement: { type: 'discoveries', count: 10 },
  },
  {
    id: 'principal_investigator',
    name: 'Principal Investigator',
    description: 'Completed 25 research projects',
    requirement: { type: 'discoveries', count: 25 },
  },
  {
    id: 'research_director',
    name: 'Research Director',
    description: 'Completed 50 research projects',
    requirement: { type: 'discoveries', count: 50 },
  },

  // Leadership titles
  {
    id: 'project_lead',
    name: 'Project Lead',
    description: 'Led 3 research projects',
    requirement: { type: 'lead', count: 3 },
  },
  {
    id: 'lab_director',
    name: 'Lab Director',
    description: 'Led 10 research projects',
    requirement: { type: 'lead', count: 10 },
  },
  {
    id: 'chief_scientist',
    name: 'Chief Scientist',
    description: 'Led 25 research projects',
    requirement: { type: 'lead', count: 25 },
  },

  // Tier-based titles
  {
    id: 'innovator',
    name: 'Innovator',
    description: 'Completed a Tier 4+ research project',
    requirement: { type: 'tier', minTier: 4, count: 1 },
  },
  {
    id: 'visionary',
    name: 'Visionary',
    description: 'Completed a Tier 5+ research project',
    requirement: { type: 'tier', minTier: 5, count: 1 },
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Completed a Tier 6+ research project (Clarketech)',
    requirement: { type: 'tier', minTier: 6, count: 1 },
  },
  {
    id: 'luminary',
    name: 'Luminary',
    description: 'Completed a Tier 7+ research project',
    requirement: { type: 'tier', minTier: 7, count: 1 },
  },
  {
    id: 'transcendent',
    name: 'Transcendent',
    description: 'Completed a Tier 8 research project',
    requirement: { type: 'tier', minTier: 8, count: 1 },
  },

  // Fame titles (based on h-index)
  {
    id: 'local_celebrity',
    name: 'Local Celebrity',
    description: 'h-index of 5 - regional recognition',
    requirement: { type: 'hindex', level: 5 },
  },
  {
    id: 'national_hero',
    name: 'National Hero',
    description: 'h-index of 10 - national recognition',
    requirement: { type: 'hindex', level: 10 },
  },
  {
    id: 'living_legend',
    name: 'Living Legend',
    description: 'h-index of 20 - legendary status',
    requirement: { type: 'hindex', level: 20 },
  },
  {
    id: 'immortal_genius',
    name: 'Immortal Genius',
    description: 'h-index of 30 - name remembered for eternity',
    requirement: { type: 'hindex', level: 30 },
  },

  // Citation milestones
  {
    id: 'cited_author',
    name: 'Cited Author',
    description: 'Received 10 citations',
    requirement: { type: 'citations', count: 10 },
  },
  {
    id: 'influential_author',
    name: 'Influential Author',
    description: 'Received 50 citations',
    requirement: { type: 'citations', count: 50 },
  },
  {
    id: 'highly_cited',
    name: 'Highly Cited Researcher',
    description: 'Received 100 citations',
    requirement: { type: 'citations', count: 100 },
  },
  {
    id: 'citation_legend',
    name: 'Citation Legend',
    description: 'Received 500 citations',
    requirement: { type: 'citations', count: 500 },
  },
];

// =============================================================================
// FAME CALCULATOR (CITATION-BASED)
// =============================================================================

/**
 * Calculate fame level from h-index and citations.
 * Fame is now based on actual academic impact, not arbitrary points.
 *
 * h-index contribution: h * 3 (max 60 from h-index of 20)
 * Citations contribution: log10(citations) * 10 (max 40 from 10000 citations)
 */
function calculateFameFromMetrics(hIndex: number, totalCitations: number): number {
  // h-index is the primary driver of fame
  const hIndexContribution = Math.min(60, hIndex * 3);

  // Citations provide additional boost (logarithmic to prevent runaway)
  const citationContribution =
    totalCitations > 0 ? Math.min(40, Math.log10(totalCitations) * 10) : 0;

  return Math.min(100, hIndexContribution + citationContribution);
}

/**
 * Calculate wealth from citations (representing grants, royalties, speaking fees)
 */
function calculateWealthFromCitations(
  totalCitations: number,
  tier: number,
  role: 'lead' | 'contributor'
): number {
  // Base wealth per citation
  const basePerCitation = 100;

  // Higher tier research yields more valuable patents
  const tierMultiplier = Math.pow(1.5, tier - 1);

  // Lead authors get larger share
  const roleMultiplier = role === 'lead' ? 0.7 : 0.3;

  return Math.floor(totalCitations * basePerCitation * tierMultiplier * roleMultiplier);
}

// getFameTier kept for backwards compatibility with fame-level based requirements
function getFameTier(fameLevel: number): FameTier {
  if (fameLevel >= 75) return 'legendary';
  if (fameLevel >= 50) return 'famous';
  if (fameLevel >= 25) return 'notable';
  if (fameLevel >= 10) return 'known';
  return 'unknown';
}
// Mark as used for export
export { getFameTier };

function getFameTierFromHIndex(hIndex: number): FameTier {
  if (hIndex >= 20) return 'legendary';
  if (hIndex >= 10) return 'famous';
  if (hIndex >= 5) return 'notable';
  if (hIndex >= 2) return 'known';
  return 'unknown';
}

// =============================================================================
// INVENTOR FAME MANAGER
// =============================================================================

export class InventorFameManager {
  private inventors: Map<string, Inventor> = new Map();
  private newsQueue: NewsAnnouncement[] = [];
  private registry: ResearchRegistry;

  constructor() {
    this.registry = ResearchRegistry.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Discovery Processing
  // ---------------------------------------------------------------------------

  /**
   * Process a research completion and credit all researchers
   */
  processDiscovery(
    researchId: string,
    leadResearcherId: string,
    contributorIds: string[],
    currentTick: number,
    getAgentName: (id: string) => string
  ): { inventors: Inventor[]; announcement: NewsAnnouncement | null } {
    const research = this.registry.tryGet(researchId);
    if (!research) {
      throw new Error(`Research not found: ${researchId}`);
    }

    const updatedInventors: Inventor[] = [];

    // Credit lead researcher
    const leadInventor = this.creditResearcher(
      leadResearcherId,
      getAgentName(leadResearcherId),
      researchId,
      research.name,
      research.tier,
      'lead',
      60,
      contributorIds,
      currentTick
    );
    updatedInventors.push(leadInventor);

    // Credit contributors (split remaining 40%)
    const contributorCreditEach =
      contributorIds.length > 0 ? 40 / contributorIds.length : 0;

    for (const contributorId of contributorIds) {
      if (contributorId === leadResearcherId) continue; // Don't double-credit lead

      const contributorInventor = this.creditResearcher(
        contributorId,
        getAgentName(contributorId),
        researchId,
        research.name,
        research.tier,
        'contributor',
        contributorCreditEach,
        [leadResearcherId, ...contributorIds.filter((id) => id !== contributorId)],
        currentTick
      );
      updatedInventors.push(contributorInventor);
    }

    // Generate news announcement for tier 3+ discoveries
    let announcement: NewsAnnouncement | null = null;
    if (research.tier >= 3) {
      announcement = this.generateNewsAnnouncement(
        research,
        leadInventor,
        updatedInventors,
        currentTick
      );
      this.newsQueue.push(announcement);
    }

    return { inventors: updatedInventors, announcement };
  }

  private creditResearcher(
    agentId: string,
    agentName: string,
    researchId: string,
    researchName: string,
    tier: number,
    role: 'lead' | 'contributor',
    creditPercent: number,
    coDiscoverers: string[],
    currentTick: number
  ): Inventor {
    let inventor = this.inventors.get(agentId);

    if (!inventor) {
      inventor = {
        agentId,
        agentName,
        hIndex: 0,
        totalCitations: 0,
        paperCount: 0,
        firstAuthorPapers: 0,
        fameLevel: 0,
        fameTier: 'unknown',
        discoveries: [],
        totalDiscoveries: 0,
        leadDiscoveries: 0,
        contributorDiscoveries: 0,
        patentRoyalties: 0,
        grantMoney: 0,
        totalWealth: 0,
        titles: [],
        currentTitle: null,
        firstDiscoveryAt: currentTick,
        lastDiscoveryAt: currentTick,
        consecutiveDiscoveries: 0,
        newsAppearances: 0,
      };
      this.inventors.set(agentId, inventor);
    }

    // Record discovery
    const discovery: DiscoveryCredit = {
      researchId,
      researchName,
      tier,
      role,
      creditPercent,
      discoveredAt: currentTick,
      coDiscoverers,
    };
    inventor.discoveries.push(discovery);

    // Update counts
    inventor.totalDiscoveries++;
    if (role === 'lead') {
      inventor.leadDiscoveries++;
    } else {
      inventor.contributorDiscoveries++;
    }

    // Sync citation metrics from AcademicPaperSystem
    const paperSystem = getAcademicPaperSystem();
    const authorMetrics = paperSystem.getAuthorMetrics(agentId);
    if (authorMetrics) {
      inventor.hIndex = authorMetrics.hIndex;
      inventor.totalCitations = authorMetrics.totalCitations;
      inventor.paperCount = authorMetrics.paperCount;
      inventor.firstAuthorPapers = authorMetrics.firstAuthorCount;
    }

    // Calculate fame from citations (not arbitrary points)
    inventor.fameLevel = calculateFameFromMetrics(
      inventor.hIndex,
      inventor.totalCitations
    );
    inventor.fameTier = getFameTierFromHIndex(inventor.hIndex);

    // Calculate wealth from citations
    const wealthGain = calculateWealthFromCitations(
      inventor.totalCitations,
      tier,
      role
    );
    inventor.patentRoyalties = wealthGain; // Replace, not add (based on total citations)
    inventor.totalWealth = wealthGain;

    // Update timestamps
    inventor.lastDiscoveryAt = currentTick;

    // Check for new titles
    this.checkAndGrantTitles(inventor, currentTick);

    return inventor;
  }

  // ---------------------------------------------------------------------------
  // Title Management
  // ---------------------------------------------------------------------------

  private checkAndGrantTitles(inventor: Inventor, currentTick: number): void {
    const existingTitleIds = new Set(inventor.titles.map((t) => t.id));

    for (const titleDef of TITLE_DEFINITIONS) {
      if (existingTitleIds.has(titleDef.id)) continue;

      if (this.meetsRequirement(inventor, titleDef.requirement)) {
        const title: InventorTitle = {
          ...titleDef,
          earnedAt: currentTick,
        };
        inventor.titles.push(title);

        // Update current title to highest-tier earned
        if (
          !inventor.currentTitle ||
          this.getTitlePriority(title) > this.getTitlePriority(inventor.currentTitle)
        ) {
          inventor.currentTitle = title;
        }
      }
    }
  }

  private meetsRequirement(
    inventor: Inventor,
    requirement: TitleRequirement
  ): boolean {
    switch (requirement.type) {
      case 'discoveries':
        return inventor.totalDiscoveries >= requirement.count;

      case 'fame':
        return inventor.fameLevel >= requirement.level;

      case 'tier': {
        const tierCount = inventor.discoveries.filter(
          (d) => d.tier >= requirement.minTier
        ).length;
        return tierCount >= requirement.count;
      }

      case 'field': {
        // Count discoveries in specific field
        const fieldCount = inventor.discoveries.filter((d) => {
          const research = this.registry.tryGet(d.researchId);
          return research?.field === requirement.field;
        }).length;
        return fieldCount >= requirement.count;
      }

      case 'lead':
        return inventor.leadDiscoveries >= requirement.count;

      case 'hindex':
        return inventor.hIndex >= requirement.level;

      case 'citations':
        return inventor.totalCitations >= requirement.count;

      default:
        return false;
    }
  }

  private getTitlePriority(title: InventorTitle): number {
    // Higher priority for higher requirements
    const req = title.requirement;
    switch (req.type) {
      case 'fame':
        return req.level;
      case 'hindex':
        return req.level * 3; // h-index is very prestigious
      case 'citations':
        return Math.log10(req.count + 1) * 10;
      case 'tier':
        return req.minTier * 10 + req.count;
      case 'discoveries':
        return req.count;
      case 'lead':
        return req.count * 2;
      case 'field':
        return req.count;
      default:
        return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // News Announcements
  // ---------------------------------------------------------------------------

  private generateNewsAnnouncement(
    research: { id: string; name: string; tier: number; description: string },
    leadInventor: Inventor,
    allInventors: Inventor[],
    currentTick: number
  ): NewsAnnouncement {
    // Generate headline based on tier
    let headline: string;
    const clarketechTier = getClarketechTier(research.id);

    if (clarketechTier) {
      const tierLabel = getClarketechTierLabel(clarketechTier);
      headline = `BREAKTHROUGH: ${research.name} Achieved! (${tierLabel} Technology)`;
    } else if (research.tier >= 5) {
      headline = `Historic Discovery: ${research.name} Unlocked`;
    } else if (research.tier >= 4) {
      headline = `Major Advancement: ${research.name} Completed`;
    } else {
      headline = `Research Complete: ${research.name}`;
    }

    // Generate body
    const contributors =
      allInventors.length > 1
        ? ` with contributions from ${allInventors
            .filter((i) => i.agentId !== leadInventor.agentId)
            .map((i) => i.agentName)
            .join(', ')}`
        : '';

    const body =
      `${leadInventor.agentName}${leadInventor.currentTitle ? ` (${leadInventor.currentTitle.name})` : ''} ` +
      `has led a team to complete groundbreaking research: ${research.name}${contributors}. ` +
      `${research.description} ` +
      `This is ${leadInventor.agentName}'s ${leadInventor.leadDiscoveries}${this.getOrdinalSuffix(leadInventor.leadDiscoveries)} major discovery.`;

    return {
      id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      headline,
      body,
      inventorIds: allInventors.map((i) => i.agentId),
      researchId: research.id,
      tier: research.tier,
      timestamp: currentTick,
      broadcasted: false,
    };
  }

  private getOrdinalSuffix(n: number): string {
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  /**
   * Get pending news announcements that haven't been broadcast yet
   */
  getPendingNews(): NewsAnnouncement[] {
    return this.newsQueue.filter((n) => !n.broadcasted);
  }

  /**
   * Mark a news announcement as broadcasted
   */
  markBroadcasted(newsId: string): void {
    const news = this.newsQueue.find((n) => n.id === newsId);
    if (news) {
      news.broadcasted = true;

      // Increment news appearances for inventors
      for (const inventorId of news.inventorIds) {
        const inventor = this.inventors.get(inventorId);
        if (inventor) {
          inventor.newsAppearances++;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getInventor(agentId: string): Inventor | undefined {
    return this.inventors.get(agentId);
  }

  getTopInventors(limit: number = 10): Inventor[] {
    return Array.from(this.inventors.values())
      .sort((a, b) => {
        // Sort by fame, then by discoveries
        if (b.fameLevel !== a.fameLevel) {
          return b.fameLevel - a.fameLevel;
        }
        return b.totalDiscoveries - a.totalDiscoveries;
      })
      .slice(0, limit);
  }

  getInventorsByTier(fameTier: FameTier): Inventor[] {
    return Array.from(this.inventors.values()).filter(
      (i) => i.fameTier === fameTier
    );
  }

  getAllInventors(): Inventor[] {
    return Array.from(this.inventors.values());
  }

  getStats(): {
    totalInventors: number;
    byTier: Record<FameTier, number>;
    totalDiscoveries: number;
    totalWealth: number;
  } {
    const inventors = Array.from(this.inventors.values());

    const byTier: Record<FameTier, number> = {
      unknown: 0,
      known: 0,
      notable: 0,
      famous: 0,
      legendary: 0,
    };

    let totalDiscoveries = 0;
    let totalWealth = 0;

    for (const inventor of inventors) {
      byTier[inventor.fameTier]++;
      totalDiscoveries += inventor.totalDiscoveries;
      totalWealth += inventor.totalWealth;
    }

    return {
      totalInventors: inventors.length,
      byTier,
      totalDiscoveries,
      totalWealth,
    };
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this.inventors.clear();
    this.newsQueue = [];
  }
}

// =============================================================================
// INVENTOR FAME SYSTEM
// =============================================================================

export class InventorFameSystem implements System {
  readonly id = 'InventorFameSystem';
  readonly priority = 54; // Just after ResearchSystem (55)
  readonly requiredComponents = [] as const;

  private manager: InventorFameManager = new InventorFameManager();
  private eventBus: EventBus | null = null;
  private events!: SystemEventManager;
  private agentNames: Map<string, string> = new Map();

  private readonly NEWS_CHECK_INTERVAL = 100; // Every 5 seconds
  private tickCounter = 0;

  initialize(world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
    this.events = new SystemEventManager(eventBus, this.id);

    // Subscribe to research completion events
    this.events.onGeneric('research:completed', (data: unknown) => {
      const typedData = data as { researchId?: string; researchers?: string[] };
      if (typedData.researchId && typedData.researchers) {
        this.handleResearchCompleted(world, typedData.researchId, typedData.researchers);
      }
    });
  }

  private handleResearchCompleted(
    world: World,
    researchId: string,
    researchers: string[]
  ): void {
    if (!researchers || researchers.length === 0) return;

    // Cache agent names
    this.cacheAgentNames(world, researchers);

    const leadResearcher = researchers[0]!;
    const contributors = researchers.slice(1);

    try {
      const result = this.manager.processDiscovery(
        researchId,
        leadResearcher,
        contributors,
        this.tickCounter,
        (id) => this.agentNames.get(id) || 'Unknown Researcher'
      );

      // Emit fame events
      for (const inventor of result.inventors) {
        this.events.emitGeneric('inventor:fame_gained', {
          agentId: inventor.agentId,
          agentName: inventor.agentName,
          fameLevel: inventor.fameLevel,
          fameTier: inventor.fameTier,
          researchId,
        });

        // Check if new title earned
        const latestTitle = inventor.titles[inventor.titles.length - 1];
        if (latestTitle && latestTitle.earnedAt === this.tickCounter) {
          this.events.emitGeneric('inventor:title_earned', {
            agentId: inventor.agentId,
            agentName: inventor.agentName,
            title: latestTitle.name,
          });
        }
      }

      // Emit news announcement event
      if (result.announcement) {
        this.events.emitGeneric('news:research_announcement', {
          headline: result.announcement.headline,
          body: result.announcement.body,
          tier: result.announcement.tier,
          inventorNames: result.inventors.map((i) => i.agentName),
        });
      }
    } catch {
      // Research not in registry (might be old/invalid)
    }
  }

  private cacheAgentNames(world: World, agentIds: string[]): void {
    for (const agentId of agentIds) {
      if (this.agentNames.has(agentId)) continue;

      const entity = world.getEntity(agentId);
      if (entity) {
        const agentComp = entity.getComponent('agent') as { name?: string } | undefined;
        if (agentComp?.name) {
          this.agentNames.set(agentId, agentComp.name);
        }
      }
    }
  }

  update(_world: World, _entities: Entity[], _deltaTime: number): void {
    this.tickCounter++;

    // Periodically check for unbroadcasted news
    if (this.tickCounter % this.NEWS_CHECK_INTERVAL === 0) {
      this.broadcastPendingNews();
    }
  }

  private broadcastPendingNews(): void {
    const pendingNews = this.manager.getPendingNews();

    for (const news of pendingNews) {
      // Try to broadcast through TV/Radio if available
      // For now, just mark as broadcasted and emit event
      this.manager.markBroadcasted(news.id);

      this.events.emitGeneric('news:broadcasted', {
        newsId: news.id,
        headline: news.headline,
        medium: 'announcement', // Would be 'tv' or 'radio' if those exist
      });
    }
  }

  cleanup(): void {
    this.events.cleanup();
    this.manager.reset();
    this.agentNames.clear();
    this.eventBus = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getManager(): InventorFameManager {
    return this.manager;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let systemInstance: InventorFameSystem | null = null;

export function getInventorFameSystem(): InventorFameSystem {
  if (!systemInstance) {
    systemInstance = new InventorFameSystem();
  }
  return systemInstance;
}

export function resetInventorFameSystem(): void {
  if (systemInstance) {
    systemInstance.cleanup();
    systemInstance = null;
  }
}

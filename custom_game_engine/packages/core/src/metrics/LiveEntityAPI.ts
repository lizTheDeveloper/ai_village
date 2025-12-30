/**
 * LiveEntityAPI - Handles live entity queries from the metrics dashboard
 *
 * Provides real-time entity data including:
 * - List of all agents with basic info
 * - Detailed entity state (components, inventory, etc.)
 * - Live LLM prompt generation using StructuredPromptBuilder
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { MetricsStreamClient, QueryRequest, QueryResponse, ActionRequest, ActionResponse } from './MetricsStreamClient.js';

/**
 * Interface for the prompt builder (from @ai-village/llm)
 */
export interface PromptBuilder {
  buildPrompt(agent: Entity, world: World): string;
}

/**
 * Entity summary for the entities list
 */
export interface EntitySummary {
  id: string;
  name: string;
  type: 'agent' | 'animal' | 'building' | 'plant' | 'resource' | 'other';
  position?: { x: number; y: number };
  behavior?: string;
}

/**
 * Detailed entity data
 */
export interface EntityDetails {
  id: string;
  name?: string;
  components: Record<string, unknown>;
}

/**
 * LiveEntityAPI connects the game's World to the metrics dashboard
 */
export class LiveEntityAPI {
  private world: World;
  private promptBuilder: PromptBuilder | null = null;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Set the prompt builder for generating LLM prompts
   */
  setPromptBuilder(builder: PromptBuilder): void {
    this.promptBuilder = builder;
  }

  /**
   * Attach to a MetricsStreamClient to handle queries and actions
   */
  attach(client: MetricsStreamClient): void {
    client.setQueryHandler(this.handleQuery.bind(this));
    client.setActionHandler(this.handleAction.bind(this));
  }

  /**
   * Handle incoming queries
   */
  async handleQuery(query: QueryRequest): Promise<QueryResponse> {
    switch (query.queryType) {
      case 'entities':
        return this.handleEntitiesQuery(query);
      case 'entity':
        return this.handleEntityQuery(query);
      case 'entity_prompt':
        return this.handleEntityPromptQuery(query);
      case 'universe':
        return this.handleUniverseQuery(query);
      case 'magic':
        return this.handleMagicQuery(query);
      case 'divinity':
        return this.handleDivinityQuery(query);
      default:
        return {
          requestId: query.requestId,
          success: false,
          error: `Unknown query type: ${query.queryType}`,
        };
    }
  }

  /**
   * Handle incoming actions
   */
  async handleAction(action: ActionRequest): Promise<ActionResponse> {
    switch (action.action) {
      case 'set-llm-config':
        return this.handleSetLLMConfig(action);
      default:
        return {
          requestId: action.requestId,
          success: false,
          error: `Unknown action: ${action.action}`,
        };
    }
  }

  /**
   * Handle set-llm-config action
   */
  private handleSetLLMConfig(action: ActionRequest): ActionResponse {
    const { agentId, config } = action.params;

    if (!agentId || typeof agentId !== 'string') {
      return {
        requestId: action.requestId,
        success: false,
        error: 'Missing or invalid agentId parameter',
      };
    }

    const entity = this.world.getEntity(agentId);
    if (!entity) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity not found: ${agentId}`,
      };
    }

    const agent = entity.components.get('agent') as { customLLM?: unknown } | undefined;
    if (!agent) {
      return {
        requestId: action.requestId,
        success: false,
        error: `Entity ${agentId} is not an agent`,
      };
    }

    // Set or clear the custom LLM config
    if (config === null || config === undefined) {
      agent.customLLM = undefined;
    } else {
      agent.customLLM = config;
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, config: agent.customLLM },
    };
  }

  /**
   * Get list of all agents
   */
  private handleEntitiesQuery(query: QueryRequest): QueryResponse {
    const entities: EntitySummary[] = [];

    for (const entity of this.world.entities.values()) {
      const summary = this.getEntitySummary(entity);
      if (summary.type === 'agent') {
        entities.push(summary);
      }
    }

    return {
      requestId: query.requestId,
      success: true,
      data: { entities },
    };
  }

  /**
   * Get detailed entity state
   */
  private handleEntityQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    const entity = this.world.getEntity(query.entityId);
    if (!entity) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity not found: ${query.entityId}`,
      };
    }

    const details = this.getEntityDetails(entity);
    return {
      requestId: query.requestId,
      success: true,
      data: details,
    };
  }

  /**
   * Get live LLM prompt for an entity
   */
  private handleEntityPromptQuery(query: QueryRequest): QueryResponse {
    if (!query.entityId) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'entityId is required',
      };
    }

    if (!this.promptBuilder) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'PromptBuilder not configured',
      };
    }

    const entity = this.world.getEntity(query.entityId);
    if (!entity) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity not found: ${query.entityId}`,
      };
    }

    // Check if this is an agent
    if (!entity.components.has('agent')) {
      return {
        requestId: query.requestId,
        success: false,
        error: `Entity ${query.entityId} is not an agent`,
      };
    }

    try {
      const prompt = this.promptBuilder.buildPrompt(entity, this.world);
      return {
        requestId: query.requestId,
        success: true,
        data: { prompt },
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to build prompt',
      };
    }
  }

  /**
   * Get a summary of an entity
   */
  private getEntitySummary(entity: Entity): EntitySummary {
    const id = entity.id;

    // Get name from identity component
    const identity = entity.components.get('identity') as { name?: string } | undefined;
    const name = identity?.name || id;

    // Determine type
    let type: EntitySummary['type'] = 'other';
    if (entity.components.has('agent')) {
      type = 'agent';
    } else if (entity.components.has('animal')) {
      type = 'animal';
    } else if (entity.components.has('building')) {
      type = 'building';
    } else if (entity.components.has('plant')) {
      type = 'plant';
    } else if (entity.components.has('resource')) {
      type = 'resource';
    }

    // Get position
    const position = entity.components.get('position') as { x?: number; y?: number } | undefined;
    const pos = position ? { x: position.x ?? 0, y: position.y ?? 0 } : undefined;

    // Get current behavior
    const agent = entity.components.get('agent') as { currentBehavior?: string } | undefined;
    const behavior = agent?.currentBehavior;

    return { id, name, type, position: pos, behavior };
  }

  /**
   * Get detailed entity data
   */
  private getEntityDetails(entity: Entity): EntityDetails {
    const id = entity.id;
    const identity = entity.components.get('identity') as { name?: string } | undefined;
    const name = identity?.name;

    // Serialize all components
    const components: Record<string, unknown> = {};
    for (const [key, value] of entity.components.entries()) {
      components[key] = this.serializeComponent(value);
    }

    return { id, name, components };
  }

  /**
   * Serialize a component for JSON transport
   */
  private serializeComponent(component: unknown): unknown {
    if (component === null || component === undefined) {
      return component;
    }

    if (typeof component !== 'object') {
      return component;
    }

    // Handle arrays
    if (Array.isArray(component)) {
      return component.map(item => this.serializeComponent(item));
    }

    // Handle Maps
    if (component instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of component.entries()) {
        obj[String(k)] = this.serializeComponent(v);
      }
      return obj;
    }

    // Handle Sets
    if (component instanceof Set) {
      return Array.from(component).map(item => this.serializeComponent(item));
    }

    // Handle plain objects
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(component as Record<string, unknown>)) {
      // Skip functions
      if (typeof value === 'function') continue;
      result[key] = this.serializeComponent(value);
    }
    return result;
  }

  /**
   * Get universe information (dimensions, physical laws, etc.)
   */
  private handleUniverseQuery(query: QueryRequest): QueryResponse {
    try {
      // Check if universe config is available (Phase 27+)
      const worldAny = this.world as unknown as {
        universeId?: { id: string; name: string; createdAt: number };
        divineConfig?: {
          name?: string;
          description?: string;
          coreParams?: {
            divinePresence?: number;
            divineReliability?: number;
            mortalSignificance?: number;
            maxActiveDeities?: number;
          };
        };
      };

      const universeId = worldAny.universeId;
      const divineConfig = worldAny.divineConfig;

      // Count active magic paradigms
      const magicSystemAny = worldAny as unknown as { getMagicSystemState?: () => {
        getAllParadigms?: () => unknown[];
      }};
      const magicManager = magicSystemAny.getMagicSystemState?.();
      const paradigmCount = magicManager?.getAllParadigms?.()?.length || 0;

      // Count deities
      let deityCount = 0;
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('deity')) {
          deityCount++;
        }
      }

      const universeInfo = {
        // Basic universe properties
        spatialDimensions: 2, // Current 2D implementation
        hasTime: true,
        temporalFlow: 'linear',

        // Identity (if configured)
        id: universeId?.id || 'default',
        name: universeId?.name || 'Unnamed Universe',
        createdAt: universeId?.createdAt,

        // Magic & Divinity presence
        magicSystemsAvailable: paradigmCount,
        hasMagic: paradigmCount > 0,
        hasDivinity: deityCount > 0,
        activeDeities: deityCount,

        // Divine configuration (if Phase I/II implemented)
        divineProfile: divineConfig ? {
          name: divineConfig.name || 'Default',
          description: divineConfig.description || 'Standard divine mechanics',
          divinePresence: divineConfig.coreParams?.divinePresence,
          divineReliability: divineConfig.coreParams?.divineReliability,
          mortalSignificance: divineConfig.coreParams?.mortalSignificance,
          maxActiveDeities: divineConfig.coreParams?.maxActiveDeities,
        } : undefined,

        // Physical laws
        physics: {
          dimensions: 2,
          euclidean: true,
          causality: 'deterministic',
        },
      };

      return {
        requestId: query.requestId,
        success: true,
        data: universeInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query universe info',
      };
    }
  }

  /**
   * Get magic system information (enabled paradigms, active systems, etc.)
   */
  private handleMagicQuery(query: QueryRequest): QueryResponse {
    try {
      // Count magic users and collect statistics
      const magicUsers: Array<{
        id: string;
        name: string;
        paradigms: string[];
        activeParadigm?: string;
        primarySource?: string;
        spellsKnown: number;
        totalSpellsCast: number;
        manaInfo: Array<{
          source: string;
          current: number;
          max: number;
          locked: number;
          regenRate: number;
          available: number;
        }>;
        resourcePools: Array<{
          type: string;
          current: number;
          max: number;
          locked: number;
        }>;
        casting: boolean;
        activeEffects: string[];
        sustainedEffectCount: number;
        topTechniques: Array<{ technique: string; proficiency: number }>;
        topForms: Array<{ form: string; proficiency: number }>;
        paradigmState: Record<string, unknown>;
        corruption?: number;
        attentionLevel?: number;
        favorLevel?: number;
        addictionLevel?: number;
      }> = [];

      const paradigmUsage = new Map<string, number>();
      let totalMagicUsers = 0;
      let totalSpellsCast = 0;
      let totalSpellsKnown = 0;
      let totalMishaps = 0;
      let currentlyCasting = 0;
      let totalSustainedEffects = 0;
      let totalCorruption = 0;
      let corruptedCount = 0;
      let totalAttention = 0;
      let attentionCount = 0;
      let totalAddiction = 0;
      let addictedCount = 0;

      // Scan all entities for magic components
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('magic')) {
          const magic = entity.components.get('magic') as unknown as {
            magicUser?: boolean;
            homeParadigmId?: string;
            knownParadigmIds?: string[];
            activeParadigmId?: string;
            knownSpells?: unknown[];
            totalSpellsCast?: number;
            totalMishaps?: number;
            manaPools?: Array<{ source: string; current: number; maximum: number; locked: number; regenRate: number }>;
            resourcePools?: Record<string, { type: string; current: number; maximum: number; locked: number }>;
            casting?: boolean;
            activeEffects?: string[];
            techniqueProficiency?: Record<string, number>;
            formProficiency?: Record<string, number>;
            paradigmState?: Record<string, unknown>;
            corruption?: number;
            attentionLevel?: number;
            favorLevel?: number;
            addictionLevel?: number;
            primarySource?: string;
          };

          if (!magic.magicUser) continue;

          totalMagicUsers++;
          totalSpellsCast += magic.totalSpellsCast || 0;
          totalMishaps += magic.totalMishaps || 0;
          const spellsKnown = magic.knownSpells?.length || 0;
          totalSpellsKnown += spellsKnown;

          if (magic.casting) {
            currentlyCasting++;
          }

          // Track sustained effects
          const sustainedCount = magic.activeEffects?.length || 0;
          totalSustainedEffects += sustainedCount;

          // Track corruption
          if (magic.corruption !== undefined && magic.corruption > 0) {
            totalCorruption += magic.corruption;
            corruptedCount++;
          }

          // Track attention
          if (magic.attentionLevel !== undefined && magic.attentionLevel > 0) {
            totalAttention += magic.attentionLevel;
            attentionCount++;
          }

          // Track addiction
          if (magic.addictionLevel !== undefined && magic.addictionLevel > 0) {
            totalAddiction += magic.addictionLevel;
            addictedCount++;
          }

          // Track paradigm usage
          const paradigms = magic.knownParadigmIds || [];
          for (const paradigmId of paradigms) {
            paradigmUsage.set(paradigmId, (paradigmUsage.get(paradigmId) || 0) + 1);
          }

          // Get entity name
          const identity = entity.components.get('identity') as { name?: string } | undefined;
          const name = identity?.name || entity.id;

          // Collect mana pool info
          const manaInfo = (magic.manaPools || []).map(pool => ({
            source: pool.source,
            current: pool.current,
            max: pool.maximum,
            locked: pool.locked,
            regenRate: pool.regenRate,
            available: Math.max(0, pool.current - pool.locked),
          }));

          // Collect resource pools (non-mana)
          const resourcePools: Array<{
            type: string;
            current: number;
            max: number;
            locked: number;
          }> = [];

          if (magic.resourcePools) {
            for (const [type, pool] of Object.entries(magic.resourcePools)) {
              resourcePools.push({
                type,
                current: pool.current,
                max: pool.maximum,
                locked: pool.locked,
              });
            }
          }

          // Extract paradigm-specific state
          const paradigmSpecificState: Record<string, unknown> = {};
          if (magic.paradigmState) {
            for (const [paradigmId, state] of Object.entries(magic.paradigmState)) {
              paradigmSpecificState[paradigmId] = state;
            }
          }

          // Build proficiency summaries
          const techniques = magic.techniqueProficiency || {};
          const forms = magic.formProficiency || {};

          // Top techniques (>0 proficiency)
          const topTechniques = Object.entries(techniques)
            .filter(([_, prof]) => prof > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tech, prof]) => ({ technique: tech, proficiency: prof }));

          // Top forms (>0 proficiency)
          const topForms = Object.entries(forms)
            .filter(([_, prof]) => prof > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([form, prof]) => ({ form, proficiency: prof }));

          magicUsers.push({
            id: entity.id,
            name,
            paradigms,
            activeParadigm: magic.activeParadigmId,
            primarySource: magic.primarySource,
            spellsKnown,
            totalSpellsCast: magic.totalSpellsCast || 0,
            manaInfo,
            resourcePools,
            casting: magic.casting || false,
            activeEffects: magic.activeEffects || [],
            sustainedEffectCount: magic.activeEffects?.length || 0,
            topTechniques,
            topForms,
            paradigmState: paradigmSpecificState,
            // Consequence tracking
            corruption: magic.corruption,
            attentionLevel: magic.attentionLevel,
            favorLevel: magic.favorLevel,
            addictionLevel: magic.addictionLevel,
          });
        }
      }

      // Build paradigm summary
      const paradigms: Array<{
        id: string;
        userCount: number;
      }> = [];

      for (const [paradigmId, count] of paradigmUsage.entries()) {
        paradigms.push({
          id: paradigmId,
          userCount: count,
        });
      }

      // Sort by user count descending
      paradigms.sort((a, b) => b.userCount - a.userCount);

      const magicInfo = {
        // Overall statistics
        totalMagicUsers,
        totalSpellsCast,
        totalSpellsKnown,
        totalMishaps,
        currentlyCasting,
        mishapRate: totalSpellsCast > 0 ? totalMishaps / totalSpellsCast : 0,

        // Sustained effects
        totalSustainedEffects,
        averageSustainedEffects: totalMagicUsers > 0 ? totalSustainedEffects / totalMagicUsers : 0,

        // Consequence tracking
        corruptionStats: {
          corruptedUsers: corruptedCount,
          averageCorruption: corruptedCount > 0 ? totalCorruption / corruptedCount : 0,
          totalCorruption,
        },
        attentionStats: {
          usersWithAttention: attentionCount,
          averageAttention: attentionCount > 0 ? totalAttention / attentionCount : 0,
          totalAttention,
        },
        addictionStats: {
          addictedUsers: addictedCount,
          averageAddiction: addictedCount > 0 ? totalAddiction / addictedCount : 0,
          totalAddiction,
        },

        // Paradigm usage (only show paradigms with users)
        paradigms,
        paradigmCount: paradigms.length,

        // Individual magic users (for debugging)
        magicUsers: magicUsers.slice(0, 10), // Limit to top 10 for performance
      };

      return {
        requestId: query.requestId,
        success: true,
        data: magicInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query magic info',
      };
    }
  }

  /**
   * Get divinity information (gods, belief, pantheons, etc.)
   */
  private handleDivinityQuery(query: QueryRequest): QueryResponse {
    try {
      const deities: Array<{
        id: string;
        name: string;
        domain?: string;
        currentBelief: number;
        beliefPerTick: number;
        totalBeliefEarned: number;
        totalBeliefSpent: number;
        believerCount: number;
        sacredSites: number;
        controller: string;
        unansweredPrayers: number;
      }> = [];

      let totalBeliefGenerated = 0;
      let totalBelieverCount = 0;
      let totalPrayers = 0;
      let totalAnsweredPrayers = 0;

      // Find all deity entities
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('deity')) {
          const deityComp = entity.components.get('deity') as unknown as {
            identity?: { primaryName?: string; domain?: string };
            belief?: {
              currentBelief?: number;
              beliefPerTick?: number;
              totalBeliefEarned?: number;
              totalBeliefSpent?: number;
            };
            believers?: Set<string> | { size?: number };
            sacredSites?: Set<string> | { size?: number };
            controller?: string;
            prayerQueue?: unknown[];
          };

          const identity = deityComp.identity || {};
          const belief = deityComp.belief || {};
          const believersSet = deityComp.believers;
          const sacredSitesSet = deityComp.sacredSites;

          const believerCount = believersSet instanceof Set ? believersSet.size : (believersSet?.size || 0);
          const sacredSiteCount = sacredSitesSet instanceof Set ? sacredSitesSet.size : (sacredSitesSet?.size || 0);
          const prayerQueueLength = Array.isArray(deityComp.prayerQueue) ? deityComp.prayerQueue.length : 0;

          const currentBelief = belief.currentBelief || 0;
          const totalEarned = belief.totalBeliefEarned || 0;

          totalBeliefGenerated += totalEarned;
          totalBelieverCount += believerCount;

          deities.push({
            id: entity.id,
            name: identity.primaryName || 'The Nameless',
            domain: identity.domain,
            currentBelief,
            beliefPerTick: belief.beliefPerTick || 0,
            totalBeliefEarned: totalEarned,
            totalBeliefSpent: belief.totalBeliefSpent || 0,
            believerCount,
            sacredSites: sacredSiteCount,
            controller: deityComp.controller || 'dormant',
            unansweredPrayers: prayerQueueLength,
          });
        }
      }

      // Count believers with spiritual component
      for (const entity of this.world.entities.values()) {
        if (entity.components.has('spiritual')) {
          const spiritual = entity.components.get('spiritual') as unknown as {
            totalPrayers?: number;
            answeredPrayers?: number;
            believedDeity?: string;
          };

          if (spiritual.believedDeity) {
            totalPrayers += spiritual.totalPrayers || 0;
            totalAnsweredPrayers += spiritual.answeredPrayers || 0;
          }
        }
      }

      const divinityInfo = {
        deities,
        totalDeities: deities.length,
        totalBeliefGenerated,
        totalBelieverCount,
        totalPrayers,
        totalAnsweredPrayers,
        prayerAnswerRate: totalPrayers > 0 ? (totalAnsweredPrayers / totalPrayers) : 0,
      };

      return {
        requestId: query.requestId,
        success: true,
        data: divinityInfo,
      };
    } catch (err) {
      return {
        requestId: query.requestId,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query divinity info',
      };
    }
  }
}

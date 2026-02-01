/**
 * Magic and Divinity Handlers for LiveEntityAPI
 *
 * Handles magic and divinity related queries and actions:
 * - Universe query
 * - Magic query
 * - Divinity query
 * - Research query
 * - Scheduler query
 * - Pending approvals
 * - Grant spell
 * - Add belief
 * - Create deity
 * - Approve/reject creations
 */

import type { World } from '@ai-village/core';
import { pendingApprovalRegistry } from '@ai-village/core';
import { DeityComponent, createTagsComponent, createIdentityComponent } from '@ai-village/core';
import type {
  QueryRequest,
  QueryResponse,
  ActionRequest,
  ActionResponse,
  LLMScheduler,
  WorldWithMutator,
} from './types.js';
import {
  hasUniverseProps,
  isMagicComponent,
  isDeityComponent,
  isSpiritualComponent,
  isResearchStateComponent,
  isIdentityComponent,
} from './types.js';

/**
 * Context required for magic/divinity handlers
 */
export interface MagicHandlerContext {
  world: World;
  scheduler: LLMScheduler | null;
}

/**
 * Get universe information (dimensions, physical laws, etc.)
 */
export function handleUniverseQuery(
  ctx: MagicHandlerContext,
  query: QueryRequest
): QueryResponse {
  try {
    // Check if universe config is available (Phase 27+)
    if (!hasUniverseProps(ctx.world)) {
      throw new Error('World does not have universe properties');
    }

    const universeId = ctx.world.universeId;
    const divineConfig = ctx.world.divineConfig;

    // Count active magic paradigms
    const magicManager = ctx.world.getMagicSystemState?.();
    const paradigmCount = magicManager?.getAllParadigms?.()?.length || 0;

    // Count deities
    let deityCount = 0;
    for (const entity of ctx.world.entities.values()) {
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
export function handleMagicQuery(
  ctx: MagicHandlerContext,
  query: QueryRequest
): QueryResponse {
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
    for (const entity of ctx.world.entities.values()) {
      if (entity.components.has('magic')) {
        const magicComp = entity.components.get('magic');
        if (!isMagicComponent(magicComp)) {
          throw new Error(`Entity ${entity.id} has invalid magic component`);
        }

        if (!magicComp.magicUser) continue;
        const magic = magicComp;

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
        const identityComp = entity.components.get('identity');
        const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
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
export function handleDivinityQuery(
  ctx: MagicHandlerContext,
  query: QueryRequest
): QueryResponse {
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
    for (const entity of ctx.world.entities.values()) {
      if (entity.components.has('deity')) {
        const deityCompRaw = entity.components.get('deity');
        if (!isDeityComponent(deityCompRaw)) {
          throw new Error(`Entity ${entity.id} has invalid deity component`);
        }
        const deityComp = deityCompRaw;

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
    for (const entity of ctx.world.entities.values()) {
      if (entity.components.has('spiritual')) {
        const spiritualComp = entity.components.get('spiritual');
        if (!isSpiritualComponent(spiritualComp)) {
          throw new Error(`Entity ${entity.id} has invalid spiritual component`);
        }

        if (spiritualComp.believedDeity) {
          totalPrayers += spiritualComp.totalPrayers || 0;
          totalAnsweredPrayers += spiritualComp.answeredPrayers || 0;
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

/**
 * Get research information (discovered papers, in-progress, completed)
 */
export function handleResearchQuery(
  ctx: MagicHandlerContext,
  query: QueryRequest
): QueryResponse {
  try {
    // Get world entity with research state
    const worldEntity = ctx.world.query().with('time').executeEntities()[0];
    if (!worldEntity) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'World entity not found',
      };
    }

    const researchStateRaw = worldEntity.components.get('research_state');

    if (!researchStateRaw) {
      return {
        requestId: query.requestId,
        success: true,
        data: {
          totalDiscovered: 0,
          completed: [],
          inProgress: [],
        },
      };
    }

    if (!isResearchStateComponent(researchStateRaw)) {
      throw new Error('World entity has invalid research_state component');
    }

    const researchState = researchStateRaw;

    // Get completed papers
    const completedPapers = Array.from(researchState.completed || []);

    // Get in-progress papers
    const inProgressPapers = Array.from(researchState.inProgress || []).map(([paperId, progress]) => ({
      paperId,
      progress: Math.round(progress.currentProgress * 100), // Convert to percentage
      totalRequired: progress.totalRequired,
      assignedAgents: progress.assignedAgents || [],
      researchers: progress.researchers || [],
      insights: progress.insights || [],
      startedAt: progress.startedAt,
    }));

    const researchInfo = {
      totalDiscovered: completedPapers.length + inProgressPapers.length,
      completed: completedPapers,
      completedCount: completedPapers.length,
      inProgress: inProgressPapers,
      inProgressCount: inProgressPapers.length,
    };

    return {
      requestId: query.requestId,
      success: true,
      data: researchInfo,
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to query research info',
    };
  }
}

/**
 * Get LLM scheduler metrics
 */
export function handleSchedulerQuery(
  ctx: MagicHandlerContext,
  query: QueryRequest
): QueryResponse {
  try {
    if (!ctx.scheduler) {
      return {
        requestId: query.requestId,
        success: false,
        error: 'LLM scheduler not available (not initialized or not using scheduled decision processor)',
      };
    }

    const metrics = ctx.scheduler.getMetricsWithAverages();

    return {
      requestId: query.requestId,
      success: true,
      data: metrics,
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to query scheduler metrics',
    };
  }
}

/**
 * Get pending creations awaiting divine approval
 */
export function handlePendingApprovalsQuery(
  query: QueryRequest
): QueryResponse {
  try {
    const pending = pendingApprovalRegistry.getAll();

    const creations = pending.map(creation => ({
      id: creation.id,
      creationType: creation.creationType,
      // Recipe-specific
      itemName: creation.item?.displayName,
      itemCategory: creation.item?.category,
      recipeType: creation.recipeType,
      // Technology-specific
      technologyName: creation.technology?.name,
      researchField: creation.researchField,
      // Effect-specific
      spellName: creation.spell?.name,
      paradigmId: creation.paradigmId,
      discoveryType: creation.discoveryType,
      // Common
      creatorId: creation.creatorId,
      creatorName: creation.creatorName,
      creationMessage: creation.creationMessage,
      creativityScore: creation.creativityScore,
      ingredients: creation.ingredients.map(i => ({
        itemId: i.itemId,
        quantity: i.quantity,
      })),
      createdAt: creation.createdAt,
      giftRecipient: creation.giftRecipient,
    }));

    return {
      requestId: query.requestId,
      success: true,
      data: {
        count: creations.length,
        creations,
      },
    };
  } catch (err) {
    return {
      requestId: query.requestId,
      success: false,
      error: err instanceof Error ? err.message : 'Failed to query pending approvals',
    };
  }
}

/**
 * Approve a pending creation
 */
export function handleApproveCreation(action: ActionRequest): ActionResponse {
  const { creationId } = action.params;

  if (!creationId || typeof creationId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid creationId parameter',
    };
  }

  const result = pendingApprovalRegistry.approve(creationId);

  if (!result.success) {
    return {
      requestId: action.requestId,
      success: false,
      error: result.error || 'Failed to approve creation',
    };
  }

  // Build response data based on creation type
  const creation = result.creation;
  const responseData: Record<string, unknown> = {
    approved: true,
    creationType: creation?.creationType,
  };

  if (creation?.creationType === 'recipe') {
    responseData.itemName = creation.item?.displayName;
    responseData.recipeId = creation.recipe?.id;
  } else if (creation?.creationType === 'technology') {
    responseData.technologyName = creation.technology?.name;
    responseData.researchField = creation.researchField;
  } else if (creation?.creationType === 'effect') {
    responseData.spellName = creation.spell?.name;
    responseData.paradigmId = creation.paradigmId;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: responseData,
  };
}

/**
 * Reject a pending creation
 */
export function handleRejectCreation(action: ActionRequest): ActionResponse {
  const { creationId } = action.params;

  if (!creationId || typeof creationId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid creationId parameter',
    };
  }

  const result = pendingApprovalRegistry.reject(creationId);

  if (!result.success) {
    return {
      requestId: action.requestId,
      success: false,
      error: result.error || 'Failed to reject creation',
    };
  }

  // Build response data based on creation type
  const creation = result.creation;
  const responseData: Record<string, unknown> = {
    rejected: true,
    creationType: creation?.creationType,
  };

  if (creation?.creationType === 'recipe') {
    responseData.itemName = creation.item?.displayName;
  } else if (creation?.creationType === 'technology') {
    responseData.technologyName = creation.technology?.name;
  } else if (creation?.creationType === 'effect') {
    responseData.spellName = creation.spell?.name;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: responseData,
  };
}

/**
 * Grant a spell to an agent
 */
export function handleGrantSpell(
  ctx: MagicHandlerContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, spellId } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (!spellId || typeof spellId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid spellId parameter',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const magicComp = entity.components.get('magic');
  if (!magicComp || !isMagicComponent(magicComp)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} does not have magic component`,
    };
  }
  const magic = magicComp;

  if (!magic.knownSpells) {
    magic.knownSpells = [];
  }

  // Check if already known
  if (magic.knownSpells.some((s: any) => s.spellId === spellId)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Agent already knows spell: ${spellId}`,
    };
  }

  // Add spell
  magic.knownSpells.push({ spellId });

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, spellId },
  };
}

/**
 * Add belief points to a deity
 */
export function handleAddBelief(
  ctx: MagicHandlerContext,
  action: ActionRequest
): ActionResponse {
  const { deityId, amount } = action.params;

  if (!deityId || typeof deityId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid deityId parameter',
    };
  }

  if (typeof amount !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid amount parameter',
    };
  }

  const entity = ctx.world.getEntity(deityId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${deityId}`,
    };
  }

  const deityComp = entity.components.get('deity');
  if (!deityComp || !isDeityComponent(deityComp)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${deityId} is not a deity`,
    };
  }
  const deity = deityComp;

  if (!deity.belief) {
    deity.belief = { currentBelief: 0, totalBeliefEarned: 0 };
  }

  // Add belief
  const currentBefore = deity.belief.currentBelief || 0;
  deity.belief.currentBelief = currentBefore + amount;
  deity.belief.totalBeliefEarned = (deity.belief.totalBeliefEarned || 0) + amount;

  return {
    requestId: action.requestId,
    success: true,
    data: {
      deityId,
      amount,
      newTotal: deity.belief.currentBelief,
    },
  };
}

/**
 * Create a new deity entity
 */
export function handleCreateDeity(
  ctx: MagicHandlerContext,
  action: ActionRequest
): ActionResponse {
  const { name, controller } = action.params;

  if (!name || typeof name !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid name parameter',
    };
  }

  const deityController = (controller === 'player' || controller === 'ai' || controller === 'dormant')
    ? controller
    : 'dormant';

  try {
    // Create deity entity
    const deityEntity = ctx.world.createEntity();
    const deityComponent = new DeityComponent(name, deityController);
    // Use WorldMutator's addComponent since Entity interface is read-only
    const worldMutator = ctx.world as WorldWithMutator;
    worldMutator.addComponent(deityEntity.id, deityComponent);

    // Add identity component for chat system and UI display
    const identityComponent = createIdentityComponent(name, 'deity');
    worldMutator.addComponent(deityEntity.id, identityComponent);

    // Add tags component for chat room membership (Divine Realm requires 'deity' tag)
    const tagsComponent = createTagsComponent('deity');
    worldMutator.addComponent(deityEntity.id, tagsComponent);

    return {
      requestId: action.requestId,
      success: true,
      data: {
        deityId: deityEntity.id,
        name,
        controller: deityController,
      },
    };
  } catch (error) {
    return {
      requestId: action.requestId,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deity',
    };
  }
}

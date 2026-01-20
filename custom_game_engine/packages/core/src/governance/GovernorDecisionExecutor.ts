/**
 * GovernorDecisionExecutor - Executes governor LLM decisions and modifies game state
 *
 * This service takes parsed governor decisions from GovernorDecisionSystem and
 * executes them by modifying components, allocating resources, declaring wars, etc.
 *
 * Action types by tier:
 * - Empire: declare_war, absorb_nation, release_nation, allocate_resources, prioritize_technology
 * - Nation: set_tax_rate, declare_war, sign_treaty, prioritize_research, enact_policy
 * - Province: set_priorities, request_aid, rebellion_response, enact_law
 *
 * All executors:
 * - Modify component state directly
 * - Emit appropriate events
 * - Validate parameters
 * - Handle error cases gracefully
 */

import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { EmpireComponent } from '../components/EmpireComponent.js';
import type { NationComponent } from '../components/NationComponent.js';
import type { ProvinceGovernanceComponent } from '../components/ProvinceGovernanceComponent.js';
import type { GovernorComponent } from '../components/GovernorComponent.js';
import { declareImperialWar, addVassal, addCoreNation, grantIndependence } from '../components/EmpireComponent.js';
import { declareWar as declareNationWar, signTreaty } from '../components/NationComponent.js';
import { delegateDirective, type DelegationChain } from './DecisionProtocols.js';

/**
 * Parsed action from LLM decision
 */
export interface GovernorDecisionAction {
  type: string;
  target?: string;
  parameters?: Record<string, unknown>;
  vote?: 'approve' | 'reject' | 'amend';
  amendment?: string;
}

/**
 * Parsed governor decision (from LLM response)
 */
export interface ParsedGovernorDecision {
  reasoning: string;
  action: GovernorDecisionAction;
  speech?: string;
  proclamation?: string;
}

/**
 * Result of executing a decision
 */
export interface DecisionExecutionResult {
  success: boolean;
  error?: string;
  eventsEmitted: string[];
  stateChanges: string[];
}

// ============================================================================
// Empire Tier Executors
// ============================================================================

/**
 * Execute empire-level decisions
 */
export function executeEmpireDecision(
  governor: EntityImpl,
  empire: EmpireComponent,
  decision: ParsedGovernorDecision,
  world: World
): DecisionExecutionResult {
  const action = decision.action;
  const result: DecisionExecutionResult = {
    success: false,
    eventsEmitted: [],
    stateChanges: [],
  };

  try {
    switch (action.type) {
      case 'declare_war':
        executeEmpireDeclareWar(governor, empire, action, world, result);
        break;

      case 'absorb_nation':
        executeEmpireAbsorbNation(governor, empire, action, world, result);
        break;

      case 'release_nation':
        executeEmpireReleaseNation(governor, empire, action, world, result);
        break;

      case 'allocate_resources':
        executeEmpireAllocateResources(governor, empire, action, world, result);
        break;

      case 'prioritize_technology':
        executeEmpirePrioritizeTechnology(governor, empire, action, world, result);
        break;

      case 'delegate_directive':
        executeEmpireDelegateDirective(governor, empire, action, world, result);
        break;

      default:
        result.error = `Unknown empire action type: ${action.type}`;
        return result;
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Execute: Empire declares war
 */
function executeEmpireDeclareWar(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const targetEmpireId = action.target;
  if (!targetEmpireId) {
    throw new Error('declare_war requires target parameter');
  }

  const warGoals = (action.parameters?.warGoals as string[]) ?? ['Conquest'];

  // Update empire component
  const empireEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!empireEntity) {
    throw new Error('Empire entity not found');
  }

  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => {
    const war = declareImperialWar(current, targetEmpireId, targetEmpireId, warGoals, world.tick);
    return current; // declareImperialWar modifies in place
  });

  // Emit event
  world.eventBus.emit({
    type: 'empire:war_declared',
    source: empireEntity.id,
    data: {
      empireId: empireEntity.id,
      empireName: empire.empireName,
      targetEmpireId,
      targetEmpireName: targetEmpireId,
      warGoals,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('empire:war_declared');
  result.stateChanges.push(`Declared war on ${targetEmpireId}`);
}

/**
 * Execute: Empire absorbs nation as core territory
 */
function executeEmpireAbsorbNation(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const nationId = action.target;
  if (!nationId) {
    throw new Error('absorb_nation requires target parameter');
  }

  const empireEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!empireEntity) {
    throw new Error('Empire entity not found');
  }

  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => {
    addCoreNation(current, nationId);
    return current;
  });

  world.eventBus.emit({
    type: 'empire:nation_absorbed',
    source: empireEntity.id,
    data: {
      empireId: empireEntity.id,
      empireName: empire.empireName,
      nationId,
      nationName: nationId,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('empire:nation_absorbed');
  result.stateChanges.push(`Absorbed nation ${nationId} as core territory`);
}

/**
 * Execute: Empire releases nation to independence
 */
function executeEmpireReleaseNation(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const nationId = action.target;
  if (!nationId) {
    throw new Error('release_nation requires target parameter');
  }

  const empireEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!empireEntity) {
    throw new Error('Empire entity not found');
  }

  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => {
    // Remove from empire territory
    const vassalIndex = current.territory.vassalNationIds.indexOf(nationId);
    if (vassalIndex !== -1) {
      current.territory.vassalNationIds.splice(vassalIndex, 1);
    }

    const nationIndex = current.territory.nations.indexOf(nationId);
    if (nationIndex !== -1) {
      current.territory.nations.splice(nationIndex, 1);
    }

    current.autonomyLevels.delete(nationId);

    return current;
  });

  world.eventBus.emit({
    type: 'empire:nation_released',
    source: empireEntity.id,
    data: {
      empireId: empireEntity.id,
      empireName: empire.empireName,
      nationId,
      nationName: nationId,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('empire:nation_released');
  result.stateChanges.push(`Released nation ${nationId} to independence`);
}

/**
 * Execute: Empire allocates resources to nation
 */
function executeEmpireAllocateResources(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const targetNationId = action.target;
  if (!targetNationId) {
    throw new Error('allocate_resources requires target parameter');
  }

  const resourceType = action.parameters?.resourceType as string ?? 'military';
  const amount = action.parameters?.amount as number ?? 1000;

  const empireEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!empireEntity) {
    throw new Error('Empire entity not found');
  }

  // Deduct from empire treasury
  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => ({
    ...current,
    economy: {
      ...current.economy,
      imperialTreasury: current.economy.imperialTreasury - amount,
    },
  }));

  // TODO: Actually transfer resources to nation (requires nation resource tracking)

  world.eventBus.emit({
    type: 'empire:resources_allocated',
    source: empireEntity.id,
    data: {
      empireId: empireEntity.id,
      empireName: empire.empireName,
      targetNationId,
      resourceType,
      amount,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('empire:resources_allocated');
  result.stateChanges.push(`Allocated ${amount} ${resourceType} to ${targetNationId}`);
}

/**
 * Execute: Empire prioritizes technology research
 */
function executeEmpirePrioritizeTechnology(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const techField = action.parameters?.field as string ?? 'military';

  const empireEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!empireEntity) {
    throw new Error('Empire entity not found');
  }

  // Increase research budget for this field
  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => ({
    ...current,
    economy: {
      ...current.economy,
      researchBudget: current.economy.researchBudget * 1.2,
    },
  }));

  result.stateChanges.push(`Prioritized ${techField} technology research`);
}

/**
 * Execute: Empire delegates directive to nations
 */
function executeEmpireDelegateDirective(
  governor: EntityImpl,
  empire: EmpireComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const directive = action.parameters?.directive as string;
  if (!directive) {
    throw new Error('delegate_directive requires directive parameter');
  }

  const targetNationIds = action.parameters?.targetNationIds as string[] ?? empire.territory.nations;
  const priority = action.parameters?.priority as 'routine' | 'urgent' | 'critical' ?? 'routine';

  // Get nation entities
  const nationEntities = targetNationIds
    .map((id) => world.getEntity(id))
    .filter((e) => e !== null);

  const delegationChain: DelegationChain = {
    origin: 'empire',
    directive,
    targetTier: 'nation',
    parameters: action.parameters ?? {},
    issuedTick: world.tick,
    issuerAgentId: governor.id,
    priority,
    requiresAcknowledgment: priority !== 'routine',
  };

  delegateDirective(governor, nationEntities, delegationChain, world);

  result.eventsEmitted.push('governance:directive_issued');
  result.stateChanges.push(`Delegated directive "${directive}" to ${nationEntities.length} nations`);
}

// ============================================================================
// Nation Tier Executors
// ============================================================================

/**
 * Execute nation-level decisions
 */
export function executeNationDecision(
  governor: EntityImpl,
  nation: NationComponent,
  decision: ParsedGovernorDecision,
  world: World
): DecisionExecutionResult {
  const action = decision.action;
  const result: DecisionExecutionResult = {
    success: false,
    eventsEmitted: [],
    stateChanges: [],
  };

  try {
    switch (action.type) {
      case 'set_tax_rate':
        executeNationSetTaxRate(governor, nation, action, world, result);
        break;

      case 'declare_war':
        executeNationDeclareWar(governor, nation, action, world, result);
        break;

      case 'sign_treaty':
        executeNationSignTreaty(governor, nation, action, world, result);
        break;

      case 'prioritize_research':
        executeNationPrioritizeResearch(governor, nation, action, world, result);
        break;

      case 'enact_policy':
        executeNationEnactPolicy(governor, nation, action, world, result);
        break;

      case 'delegate_directive':
        executeNationDelegateDirective(governor, nation, action, world, result);
        break;

      default:
        result.error = `Unknown nation action type: ${action.type}`;
        return result;
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Execute: Nation sets tax rate
 */
function executeNationSetTaxRate(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const newTaxRate = action.parameters?.taxRate as number;
  if (newTaxRate === undefined || newTaxRate < 0 || newTaxRate > 1) {
    throw new Error('set_tax_rate requires valid taxRate parameter (0-1)');
  }

  const nationEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!nationEntity) {
    throw new Error('Nation entity not found');
  }

  const oldTaxRate = nation.economy.taxPolicy === 'low' ? 0.1 : nation.economy.taxPolicy === 'moderate' ? 0.2 : 0.3;

  (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    economy: {
      ...current.economy,
      taxPolicy: newTaxRate < 0.15 ? 'low' : newTaxRate < 0.25 ? 'moderate' : 'high',
    },
  }));

  world.eventBus.emit({
    type: 'nation:tax_rate_changed',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: nation.nationName,
      oldTaxRate,
      newTaxRate,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('nation:tax_rate_changed');
  result.stateChanges.push(`Changed tax rate from ${oldTaxRate.toFixed(2)} to ${newTaxRate.toFixed(2)}`);
}

/**
 * Execute: Nation declares war
 */
function executeNationDeclareWar(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const targetNationId = action.target;
  if (!targetNationId) {
    throw new Error('declare_war requires target parameter');
  }

  const warGoals = (action.parameters?.warGoals as string[]) ?? ['Territorial dispute'];

  const nationEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!nationEntity) {
    throw new Error('Nation entity not found');
  }

  (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (current) => {
    declareNationWar(current, targetNationId, targetNationId, warGoals, world.tick);
    return current;
  });

  world.eventBus.emit({
    type: 'nation:war_declared',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: nation.nationName,
      targetNationId,
      targetNationName: targetNationId,
      warGoals,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('nation:war_declared');
  result.stateChanges.push(`Declared war on ${targetNationId}`);
}

/**
 * Execute: Nation signs treaty
 */
function executeNationSignTreaty(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const treatyType = action.parameters?.treatyType as 'trade' | 'military_alliance' | 'non_aggression' | 'peace' | 'customs_union';
  const signatories = action.parameters?.signatories as string[] ?? [];

  if (!treatyType || signatories.length === 0) {
    throw new Error('sign_treaty requires treatyType and signatories parameters');
  }

  const nationEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!nationEntity) {
    throw new Error('Nation entity not found');
  }

  const treaty = {
    id: `treaty_${world.tick}_${nation.nationName}`,
    name: `${treatyType} treaty`,
    type: treatyType,
    signatoryNationIds: [nation.nationName, ...signatories],
    terms: (action.parameters?.terms as string[]) ?? [],
    signedTick: world.tick,
    status: 'active' as const,
  };

  (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (current) => {
    signTreaty(current, treaty);
    return current;
  });

  world.eventBus.emit({
    type: 'nation:treaty_signed',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: nation.nationName,
      treatyId: treaty.id,
      treatyName: treaty.name,
      treatyType,
      signatories,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('nation:treaty_signed');
  result.stateChanges.push(`Signed ${treatyType} treaty with ${signatories.join(', ')}`);
}

/**
 * Execute: Nation prioritizes research field
 */
function executeNationPrioritizeResearch(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const field = action.parameters?.field as 'military' | 'economic' | 'cultural' | 'scientific';
  if (!field) {
    throw new Error('prioritize_research requires field parameter');
  }

  const nationEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!nationEntity) {
    throw new Error('Nation entity not found');
  }

  (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    economy: {
      ...current.economy,
      researchBudget: current.economy.researchBudget * 1.3,
    },
  }));

  world.eventBus.emit({
    type: 'nation:research_prioritized',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: nation.nationName,
      field,
      priority: 1,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('nation:research_prioritized');
  result.stateChanges.push(`Prioritized ${field} research`);
}

/**
 * Execute: Nation enacts policy
 */
function executeNationEnactPolicy(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const policyName = action.parameters?.policyName as string;
  const category = action.parameters?.category as 'military' | 'economic' | 'diplomatic' | 'cultural' | 'research';

  if (!policyName || !category) {
    throw new Error('enact_policy requires policyName and category parameters');
  }

  const nationEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!nationEntity) {
    throw new Error('Nation entity not found');
  }

  const policy = {
    id: `policy_${world.tick}_${policyName}`,
    name: policyName,
    category,
    priority: 'medium' as const,
    description: action.parameters?.description as string ?? '',
    budgetAllocation: action.parameters?.budgetAllocation as number ?? 0.1,
    progress: 0,
    startTick: world.tick,
  };

  (nationEntity as EntityImpl).updateComponent<NationComponent>(CT.Nation, (current) => ({
    ...current,
    policies: [...current.policies, policy],
  }));

  world.eventBus.emit({
    type: 'nation:policy_enacted',
    source: nationEntity.id,
    data: {
      nationId: nationEntity.id,
      nationName: nation.nationName,
      policyName,
      category,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('nation:policy_enacted');
  result.stateChanges.push(`Enacted policy: ${policyName}`);
}

/**
 * Execute: Nation delegates directive to provinces
 */
function executeNationDelegateDirective(
  governor: EntityImpl,
  nation: NationComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const directive = action.parameters?.directive as string;
  if (!directive) {
    throw new Error('delegate_directive requires directive parameter');
  }

  const targetProvinceIds = action.parameters?.targetProvinceIds as string[] ?? nation.territory.provinces;
  const priority = action.parameters?.priority as 'routine' | 'urgent' | 'critical' ?? 'routine';

  // Get province entities
  const provinceEntities = targetProvinceIds
    .map((id) => world.getEntity(id))
    .filter((e) => e !== null);

  const delegationChain: DelegationChain = {
    origin: 'nation',
    directive,
    targetTier: 'province',
    parameters: action.parameters ?? {},
    issuedTick: world.tick,
    issuerAgentId: governor.id,
    priority,
    requiresAcknowledgment: priority !== 'routine',
  };

  delegateDirective(governor, provinceEntities, delegationChain, world);

  result.eventsEmitted.push('governance:directive_issued');
  result.stateChanges.push(`Delegated directive "${directive}" to ${provinceEntities.length} provinces`);
}

// ============================================================================
// Province Tier Executors
// ============================================================================

/**
 * Execute province-level decisions
 */
export function executeProvinceDecision(
  governor: EntityImpl,
  province: ProvinceGovernanceComponent,
  decision: ParsedGovernorDecision,
  world: World
): DecisionExecutionResult {
  const action = decision.action;
  const result: DecisionExecutionResult = {
    success: false,
    eventsEmitted: [],
    stateChanges: [],
  };

  try {
    switch (action.type) {
      case 'set_priorities':
        executeProvinceSetPriorities(governor, province, action, world, result);
        break;

      case 'request_aid':
        executeProvinceRequestAid(governor, province, action, world, result);
        break;

      case 'rebellion_response':
        executeProvinceRebellionResponse(governor, province, action, world, result);
        break;

      case 'enact_law':
        executeProvinceEnactLaw(governor, province, action, world, result);
        break;

      default:
        result.error = `Unknown province action type: ${action.type}`;
        return result;
    }

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Execute: Province sets priorities
 */
function executeProvinceSetPriorities(
  governor: EntityImpl,
  province: ProvinceGovernanceComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const priorities = action.parameters?.priorities as string[];
  if (!priorities || priorities.length === 0) {
    throw new Error('set_priorities requires priorities parameter');
  }

  const provinceEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!provinceEntity) {
    throw new Error('Province entity not found');
  }

  // Store priorities as policies
  const policies = priorities.map((priority, index) => ({
    id: `priority_${world.tick}_${index}`,
    name: priority,
    category: 'economic' as const,
    priority: 'high' as const,
    description: `Provincial priority: ${priority}`,
    budgetAllocation: 0.2 / priorities.length,
    progress: 0,
    startTick: world.tick,
  }));

  (provinceEntity as EntityImpl).updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
    ...current,
    policies: [...current.policies, ...policies],
  }));

  world.eventBus.emit({
    type: 'province:priorities_set',
    source: provinceEntity.id,
    data: {
      provinceId: provinceEntity.id,
      provinceName: province.provinceName,
      priorities,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('province:priorities_set');
  result.stateChanges.push(`Set priorities: ${priorities.join(', ')}`);
}

/**
 * Execute: Province requests aid from nation
 */
function executeProvinceRequestAid(
  governor: EntityImpl,
  province: ProvinceGovernanceComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const resourceType = action.parameters?.resourceType as string ?? 'food';
  const amount = action.parameters?.amount as number ?? 1000;
  const urgency = action.parameters?.urgency as 'low' | 'medium' | 'high' | 'critical' ?? 'medium';

  const provinceEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!provinceEntity || !province.parentNationId) {
    throw new Error('Province entity or parent nation not found');
  }

  world.eventBus.emit({
    type: 'province:aid_requested',
    source: provinceEntity.id,
    data: {
      provinceId: provinceEntity.id,
      provinceName: province.provinceName,
      targetNationId: province.parentNationId,
      resourceType,
      amount,
      urgency,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('province:aid_requested');
  result.stateChanges.push(`Requested ${amount} ${resourceType} from nation (urgency: ${urgency})`);
}

/**
 * Execute: Province responds to rebellion
 */
function executeProvinceRebellionResponse(
  governor: EntityImpl,
  province: ProvinceGovernanceComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const cityId = action.target;
  const responseType = action.parameters?.responseType as 'negotiate' | 'suppress' | 'grant_autonomy';

  if (!cityId || !responseType) {
    throw new Error('rebellion_response requires target (cityId) and responseType parameters');
  }

  const provinceEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!provinceEntity) {
    throw new Error('Province entity not found');
  }

  // Update city loyalty based on response
  (provinceEntity as EntityImpl).updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => {
    const cityIndex = current.cities.findIndex((c) => c.cityId === cityId);
    if (cityIndex !== -1) {
      const city = current.cities[cityIndex]!;
      const newCities = [...current.cities];

      if (responseType === 'negotiate') {
        newCities[cityIndex] = { ...city, loyaltyToProvince: Math.min(1, city.loyaltyToProvince + 0.2) };
      } else if (responseType === 'suppress') {
        newCities[cityIndex] = { ...city, loyaltyToProvince: Math.max(0, city.loyaltyToProvince - 0.1) };
      } else if (responseType === 'grant_autonomy') {
        newCities[cityIndex] = { ...city, loyaltyToProvince: Math.min(1, city.loyaltyToProvince + 0.3) };
      }

      return { ...current, cities: newCities };
    }
    return current;
  });

  world.eventBus.emit({
    type: 'province:rebellion_response',
    source: provinceEntity.id,
    data: {
      provinceId: provinceEntity.id,
      provinceName: province.provinceName,
      cityId,
      responseType,
      tick: world.tick,
    },
  });

  result.eventsEmitted.push('province:rebellion_response');
  result.stateChanges.push(`Responded to rebellion in ${cityId} with ${responseType}`);
}

/**
 * Execute: Province enacts law
 */
function executeProvinceEnactLaw(
  governor: EntityImpl,
  province: ProvinceGovernanceComponent,
  action: GovernorDecisionAction,
  world: World,
  result: DecisionExecutionResult
): void {
  const lawName = action.parameters?.lawName as string;
  const scope = action.parameters?.scope as 'taxation' | 'military' | 'trade' | 'criminal' | 'civil';

  if (!lawName || !scope) {
    throw new Error('enact_law requires lawName and scope parameters');
  }

  const provinceEntity = world.getEntity(governor.getComponent<GovernorComponent>(CT.Governor)?.jurisdiction ?? '');
  if (!provinceEntity) {
    throw new Error('Province entity not found');
  }

  const law = {
    id: `law_${world.tick}_${lawName}`,
    name: lawName,
    description: action.parameters?.description as string ?? '',
    enactedTick: world.tick,
    scope,
    effects: [],
  };

  (provinceEntity as EntityImpl).updateComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance, (current) => ({
    ...current,
    laws: [...current.laws, law],
  }));

  result.stateChanges.push(`Enacted law: ${lawName} (${scope})`);
}

/**
 * Main entry point: Execute any governor decision based on tier
 */
export function executeGovernorDecision(
  governor: EntityImpl,
  decision: ParsedGovernorDecision,
  world: World
): DecisionExecutionResult {
  const govComp = governor.getComponent<GovernorComponent>(CT.Governor);
  if (!govComp) {
    return {
      success: false,
      error: 'Entity is not a governor',
      eventsEmitted: [],
      stateChanges: [],
    };
  }

  // Get the jurisdiction entity
  const jurisdictionEntity = world.getEntity(govComp.jurisdiction);
  if (!jurisdictionEntity) {
    return {
      success: false,
      error: 'Jurisdiction entity not found',
      eventsEmitted: [],
      stateChanges: [],
    };
  }

  // Route to appropriate tier executor
  switch (govComp.tier) {
    case 'empire': {
      const empire = jurisdictionEntity.getComponent<EmpireComponent>(CT.Empire);
      if (!empire) {
        return {
          success: false,
          error: 'Jurisdiction is not an empire',
          eventsEmitted: [],
          stateChanges: [],
        };
      }
      return executeEmpireDecision(governor, empire, decision, world);
    }

    case 'nation': {
      const nation = jurisdictionEntity.getComponent<NationComponent>(CT.Nation);
      if (!nation) {
        return {
          success: false,
          error: 'Jurisdiction is not a nation',
          eventsEmitted: [],
          stateChanges: [],
        };
      }
      return executeNationDecision(governor, nation, decision, world);
    }

    case 'province': {
      const province = jurisdictionEntity.getComponent<ProvinceGovernanceComponent>(CT.ProvinceGovernance);
      if (!province) {
        return {
          success: false,
          error: 'Jurisdiction is not a province',
          eventsEmitted: [],
          stateChanges: [],
        };
      }
      return executeProvinceDecision(governor, province, decision, world);
    }

    default:
      return {
        success: false,
        error: `Unsupported tier: ${govComp.tier}`,
        eventsEmitted: [],
        stateChanges: [],
      };
  }
}

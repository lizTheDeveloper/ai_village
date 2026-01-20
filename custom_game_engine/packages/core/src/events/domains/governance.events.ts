/**
 * Governance events for political decision-making and AI governors
 *
 * These events track governor decisions, votes, directives, and crisis responses
 * across all political tiers (empire, nation, province, city, village).
 */
import type { EntityId } from '../../types.js';
import type { PoliticalTier } from '../../components/GovernorComponent.js';
import type { VoteStance } from '../../governance/DecisionProtocols.js';
import type { CityDepartmentType } from '../../components/CityGovernanceComponent.js';

export interface GovernanceEvents {
  // === Governor Decision Events ===
  'governor:appointed': {
    governorId: EntityId;
    tier: PoliticalTier;
    jurisdiction: EntityId;
    tick: number;
  };

  'governor:removed': {
    governorId: EntityId;
    tier: PoliticalTier;
    jurisdiction: EntityId;
    tick: number;
  };

  'governor:decision_requested': {
    governorId: EntityId;
    tier: PoliticalTier;
    tick: number;
  };

  'governor:decision_made': {
    governorId: EntityId;
    tier: PoliticalTier;
    decisionType: string;
    reasoning: string;
    tick: number;
  };

  'governor:decision_executed': {
    governorId: EntityId;
    tier: PoliticalTier;
    decisionType: string;
    reasoning: string;
    tick: number;
  };

  'governor:action_executed': {
    governorId: EntityId;
    tier: PoliticalTier;
    actionType: string;
    tick: number;
  };

  // === Voting Events ===
  'governance:vote_concluded': {
    proposalId: string;
    tier: PoliticalTier;
    decision: 'approved' | 'rejected';
    approvalPercentage: number;
    totalVotes: number;
    tick: number;
  };

  'governance:vote_cast': {
    voterId: EntityId;
    proposalId: string;
    stance: VoteStance;
    weight: number;
    reasoning: string;
    tick: number;
  };

  // === Delegation Events ===
  'governance:directive_issued': {
    directiveId: string;
    originTier: PoliticalTier;
    targetTier: PoliticalTier;
    directive: string;
    priority: 'routine' | 'urgent' | 'critical';
    issuerAgentId?: EntityId;
    targetEntityIds: EntityId[];
    requiresAcknowledgment: boolean;
    tick: number;
  };

  'governance:directive_received': {
    directiveId: string;
    entityId: EntityId;
    directive: string;
    tick: number;
  };

  'governance:directive_interpreted': {
    directiveId: string;
    action: string;
    reasoning: string;
    tick: number;
  };

  'governance:directive_llm_failed': {
    directiveId: string;
    error: string;
    tick: number;
  };

  'governance:directive_delegated': {
    directiveId: string;
    fromTier: PoliticalTier;
    toTier: PoliticalTier;
    fromEntityId: EntityId;
    toEntityIds: EntityId[];
    tick: number;
  };

  // === Crisis Events ===
  'governance:crisis_escalated': {
    crisisId: string;
    crisisType: string;
    fromTier: PoliticalTier;
    toTier: PoliticalTier;
    severity: number;
    affectedEntityIds: EntityId[];
    tick: number;
  };

  'governance:crisis_response_received': {
    crisisId: string;
    governorId: EntityId;
    tier: PoliticalTier;
    action: string;
    localMeasures?: string[];
    escalationTarget?: PoliticalTier;
    assistanceNeeded?: string[];
    reasoning: string;
    tick: number;
  };

  // === Village Governance Events ===
  'village:election_completed': {
    villageId: EntityId;
    villageName: string;
    newElders: string[];
    tick: number;
  };

  'village:proposal_passed': {
    villageId: EntityId;
    villageName: string;
    proposal: string;
    type: 'build' | 'explore' | 'trade' | 'law' | 'custom';
    tick: number;
  };

  'village:proposal_rejected': {
    villageId: EntityId;
    villageName: string;
    proposal: string;
    tick: number;
  };

  'village:council_meeting': {
    villageId: EntityId;
    villageName: string;
    tick: number;
  };

  'village:added_to_city': {
    villageId: EntityId;
    villageName: string;
    cityId: EntityId;
    cityName: string;
    tick: number;
  };

  'village:removed_from_city': {
    villageId: EntityId;
    villageName: string;
    cityId: EntityId;
    cityName: string;
    tick: number;
  };

  // === City Governance Events ===
  'city:budget_allocated': {
    cityId: EntityId;
    cityName: string;
    department: CityDepartmentType;
    allocation: number; // Percentage (0-1)
    tick: number;
  };

  'city:infrastructure_started': {
    cityId: EntityId;
    cityName: string;
    projectId: string;
    projectName: string;
    projectType: string;
    department: CityDepartmentType;
    tick: number;
  };

  'city:infrastructure_completed': {
    cityId: EntityId;
    cityName: string;
    projectId: string;
    projectName: string;
    projectType: string;
    tick: number;
  };

  'city:law_enacted': {
    cityId: EntityId;
    cityName: string;
    lawId: string;
    lawName: string;
    category: string;
    affectedVillages: EntityId[];
    tick: number;
  };

  'city:policy_adopted': {
    cityId: EntityId;
    cityName: string;
    policyId: string;
    policyName: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    tick: number;
  };

  'city:policy_completed': {
    cityId: EntityId;
    cityName: string;
    policyId: string;
    policyName: string;
    tick: number;
  };

  'city:department_efficiency_changed': {
    cityId: EntityId;
    cityName: string;
    department: CityDepartmentType;
    oldEfficiency: number;
    newEfficiency: number;
    tick: number;
  };

  'city:tax_rate_changed': {
    cityId: EntityId;
    cityName: string;
    oldRate: number;
    newRate: number;
    tick: number;
  };

  'city:village_added': {
    cityId: EntityId;
    cityName: string;
    villageId: EntityId;
    villageName: string;
    tick: number;
  };

  'city:village_removed': {
    cityId: EntityId;
    cityName: string;
    villageId: EntityId;
    villageName: string;
    tick: number;
  };

  'city:population_aggregated': {
    cityId: EntityId;
    cityName: string;
    totalPopulation: number;
    villageCount: number;
    tick: number;
  };

  // === Empire Events ===
  'empire:annual_update': {
    empireName: string;
    totalPopulation: number;
    totalGDP: number;
    vassalLoyalty: number;
    separatistMovements: number;
    tick: number;
  };

  'empire:nation_added': {
    empireName: string;
    nationId: EntityId;
    isCore: boolean;
    autonomy: number;
    tick: number;
  };

  'empire:separatist_movement_active': {
    empireName: string;
    movementId: string;
    movementName: string;
    strength: number;
    tick: number;
  };

  'empire:war_declared': {
    empireId: EntityId;
    empireName: string;
    targetEmpireId: EntityId;
    targetEmpireName: string;
    warGoals: string[];
    tick: number;
  };

  'empire:resources_allocated': {
    empireId: EntityId;
    empireName: string;
    targetNationId: EntityId;
    resourceType: string;
    amount: number;
    tick: number;
  };

  'empire:nation_absorbed': {
    empireId: EntityId;
    empireName: string;
    nationId: EntityId;
    nationName: string;
    tick: number;
  };

  'empire:nation_released': {
    empireId: EntityId;
    empireName: string;
    nationId: EntityId;
    nationName: string;
    tick: number;
  };

  // === Nation Events ===
  'nation:economic_update': {
    nationId: EntityId;
    nationName: string;
    totalRevenue: number;
    totalExpenditure: number;
    surplus: number;
    treasuryBalance: number;
    tick: number;
  };

  'nation:election_completed': {
    nationId: EntityId;
    nationName: string;
    newLeader: EntityId;
    leadershipType: string;
    tick: number;
  };

  'nation:stability_warning': {
    nationId: EntityId;
    nationName: string;
    stability: number;
    legitimacy: number;
    unrestFactors: string[];
    tick: number;
  };

  'nation:war_progress': {
    nationId: EntityId;
    nationName: string;
    warId: string;
    warName: string;
    duration: number;
    casualties: number;
    tick: number;
  };

  'nation:research_completed': {
    nationId: EntityId;
    nationName: string;
    projectId: string;
    projectName: string;
    field: string;
    tick: number;
  };

  'nation:policy_completed': {
    nationId: EntityId;
    nationName: string;
    policyId: string;
    policyName: string;
    category: string;
    tick: number;
  };

  'nation:policy_enacted': {
    nationId: EntityId;
    nationName: string;
    policyName: string;
    category: string;
    tick: number;
  };

  'nation:treaty_expired': {
    nationId: EntityId;
    nationName: string;
    treatyId: string;
    treatyName: string;
    treatyType: string;
    tick: number;
  };

  'nation:tax_rate_changed': {
    nationId: EntityId;
    nationName: string;
    oldTaxRate: number;
    newTaxRate: number;
    tick: number;
  };

  'nation:treaty_signed': {
    nationId: EntityId;
    nationName: string;
    treatyId: string;
    treatyName: string;
    treatyType: string;
    signatories: EntityId[];
    tick: number;
  };

  'nation:war_declared': {
    nationId: EntityId;
    nationName: string;
    targetNationId: EntityId;
    targetNationName: string;
    warGoals: string[];
    tick: number;
  };

  'nation:research_prioritized': {
    nationId: EntityId;
    nationName: string;
    field: string;
    priority: number;
    tick: number;
  };

  // === Province Events ===
  'province:election_completed': {
    provinceId: EntityId;
    provinceName: string;
    newGovernor: EntityId;
    tick: number;
  };

  'province:economic_update': {
    provinceId: EntityId;
    provinceName: string;
    taxRevenue: number;
    maintenanceCost: number;
    netRevenue: number;
    tick: number;
  };

  'province:rebellion_warning': {
    provinceId: EntityId;
    provinceName: string;
    stability: number;
    factors: string[];
    tick: number;
  };

  'province:policy_completed': {
    provinceId: EntityId;
    provinceName: string;
    policy: string;
    category: string;
    tick: number;
  };

  'province:city_added': {
    provinceId: EntityId;
    cityId: EntityId;
    cityName: string;
  };

  'province:city_rebelled': {
    provinceId: EntityId;
    provinceName: string;
    cityId: EntityId;
    tick: number;
  };

  'province:priorities_set': {
    provinceId: EntityId;
    provinceName: string;
    priorities: string[];
    tick: number;
  };

  'province:aid_requested': {
    provinceId: EntityId;
    provinceName: string;
    targetNationId: EntityId;
    resourceType: string;
    amount: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    tick: number;
  };

  'province:rebellion_response': {
    provinceId: EntityId;
    provinceName: string;
    cityId: EntityId;
    responseType: 'negotiate' | 'suppress' | 'grant_autonomy';
    tick: number;
  };

  // === Federation Events ===
  'federation:formed': {
    federationId: EntityId;
    federationName: string;
    foundingMembers: EntityId[];
    governanceType: 'confederal' | 'federal' | 'supranational';
    tick: number;
  };

  'federation:strategic_update': {
    federationName: string;
    totalPopulation: number;
    totalSystems: number;
    memberCount: number;
    cohesion: number;
    tick: number;
  };

  'federation:law_proposed': {
    federationName: string;
    proposalId: string;
    proposalName: string;
    proposerId: EntityId;
    scope: 'trade' | 'military' | 'justice' | 'rights' | 'environment';
    requiresSupermajority: boolean;
    tick: number;
  };

  'federation:proposal_voting_started': {
    federationName: string;
    proposalId: string;
    proposalName: string;
    proposalType: string;
    tick: number;
  };

  'federation:vote_cast': {
    federationName: string;
    proposalId: string;
    memberId: EntityId;
    vote: 'for' | 'against' | 'abstain';
    tick: number;
  };

  'federation:proposal_passed': {
    federationName: string;
    proposalId: string;
    proposalName: string;
    proposalType: string;
    passageRate: number;
    tick: number;
  };

  'federation:proposal_failed': {
    federationName: string;
    proposalId: string;
    proposalName: string;
    reason: 'quorum_not_met' | 'insufficient_votes';
    participation?: number;
    passageRate?: number;
    tick: number;
  };

  'federation:proposal_vetoed': {
    federationName: string;
    proposalId: string;
    proposalName: string;
    vetoedBy: EntityId;
    tick: number;
  };

  'federation:law_enforced': {
    federationName: string;
    lawName: string;
    newlyEnforcedMembers: EntityId[];
    complianceRate: number;
    tick: number;
  };

  'federation:member_joined': {
    federationName: string;
    memberId: EntityId;
    memberType: 'empire' | 'nation';
    tick: number;
  };

  'federation:member_seceded': {
    federationName: string;
    memberId: EntityId;
    satisfactionAtSecession: number;
    consecutiveTicksLow: number;
    tick: number;
  };

  'federation:presidency_rotated': {
    federationName: string;
    previousPresidentId?: EntityId;
    newPresidentId: EntityId;
    tick: number;
  };

  'federation:joint_operation_started': {
    federationName: string;
    operationId: string;
    operationName: string;
    operationType: 'defense' | 'peacekeeping' | 'exploration' | 'humanitarian';
    participatingMembers: EntityId[];
    tick: number;
  };

  'federation:joint_operation_progress': {
    federationName: string;
    operationId: string;
    operationName: string;
    operationType: string;
    participatingMembers: EntityId[];
    totalFleetStrength: number;
    duration: number;
    tick: number;
  };

  'federation:tariff_changed': {
    federationName: string;
    tariffType: 'internal' | 'external';
    oldRate: number;
    newRate: number;
    tick: number;
  };

  // === Galactic Council Events ===
  'galactic_council:formed': {
    councilId: EntityId;
    councilName: string;
    foundingSpecies: string[];
    governanceType: 'democratic' | 'oligarchic' | 'hegemonic';
    tick: number;
  };

  'galactic_council:cosmic_update': {
    councilName: string;
    speciesCount: number;
    totalPopulation: number;
    universalLaws: number;
    peacekeepingMissions: number;
    existentialThreats: number;
    tick: number;
  };

  'galactic_council:species_joined': {
    councilName: string;
    speciesName: string;
    homeworld: string;
    techLevel: number;
    votingPower: number;
    tick: number;
  };

  'galactic_council:law_proposed': {
    councilName: string;
    proposalId: string;
    lawName: string;
    scope: 'war_crimes' | 'trade' | 'rights' | 'environment' | 'technology';
    proposedBy: string;
    tick: number;
  };

  'galactic_council:law_passed': {
    councilName: string;
    lawName: string;
    scope: string;
    approvalPercentage: number;
    tick: number;
  };

  'galactic_council:law_rejected': {
    councilName: string;
    proposalId: string;
    lawName: string;
    approvalPercentage: number;
    tick: number;
  };

  'galactic_council:violation_detected': {
    councilName: string;
    lawName: string;
    violatorId: string;
    violationType: string;
    sanctions: string[];
    tick: number;
  };

  'galactic_council:sanctions_applied': {
    councilName: string;
    targetSpecies: string;
    sanctions: string[];
    reason: string;
    tick: number;
  };

  'galactic_council:peacekeeping_deployed': {
    councilName: string;
    missionName: string;
    missionType: 'conflict_mediation' | 'humanitarian_aid' | 'border_patrol' | 'disaster_relief';
    location: string;
    fleetsDeployed: number;
    tick: number;
  };

  'galactic_council:peacekeeping_completed': {
    councilName: string;
    missionName: string;
    missionType: string;
    duration: number;
    tick: number;
  };

  'galactic_council:crisis_declared': {
    councilName: string;
    crisisType: string;
    severity: string;
    affectedSectors: number;
    tick: number;
  };

  'galactic_council:crisis_resolved': {
    councilName: string;
    crisisId: string;
    crisisType: string;
    resolution: string;
    tick: number;
  };

  'galactic_council:dispute_resolved': {
    councilName: string;
    disputeId: string;
    disputeType: string;
    parties: string[];
    tick: number;
  };

  'galactic_council:dispute_escalated': {
    councilName: string;
    disputeId: string;
    disputeType: string;
    parties: string[];
    tick: number;
  };
}

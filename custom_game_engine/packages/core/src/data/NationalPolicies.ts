import type { PolicyEffect } from '../components/NationComponent.js';

/**
 * Policy target types
 */
export type PolicyTarget =
  // Economy
  | 'tax_revenue'
  | 'trade_income'
  | 'tariff_rate'
  | 'treasury_growth'
  | 'gdp_growth'
  | 'corruption'
  // Military
  | 'army_strength'
  | 'army_maintenance'
  | 'military_readiness'
  | 'recruitment_rate'
  | 'war_exhaustion'
  // Stability
  | 'stability'
  | 'legitimacy'
  | 'rebellion_risk'
  | 'provincial_loyalty'
  // Research
  | 'research_speed'
  | 'research_cost'
  // Diplomacy
  | 'opinion_gain'
  | 'treaty_acceptance'
  | 'alliance_strength';

/**
 * Policy definition
 */
export interface PolicyDefinition {
  id: string;
  name: string;
  category: 'military' | 'economic' | 'diplomatic' | 'cultural' | 'research';
  description: string;
  effects: PolicyEffect[];
  incompatibleWith?: string[];  // Policy IDs that conflict
  prerequisiteTech?: string;    // Tech required to unlock
}

/**
 * National Policy Catalog
 */
export const NATIONAL_POLICIES: Record<string, PolicyDefinition> = {
  // === ECONOMIC POLICIES ===
  free_trade: {
    id: 'free_trade',
    name: 'Free Trade',
    category: 'economic',
    description: 'Remove tariffs and encourage international trade',
    effects: [
      { target: 'tariff_rate', modifierType: 'replacement', value: 0.02, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.3, isPermanent: true },
      { target: 'gdp_growth', modifierType: 'additive', value: 0.02, isPermanent: true },
    ],
    incompatibleWith: ['protectionism', 'autarky'],
  },
  protectionism: {
    id: 'protectionism',
    name: 'Protectionism',
    category: 'economic',
    description: 'High tariffs to protect domestic industry',
    effects: [
      { target: 'tariff_rate', modifierType: 'replacement', value: 0.3, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 0.7, isPermanent: true },
      { target: 'tax_revenue', modifierType: 'multiplicative', value: 1.15, isPermanent: true },
    ],
    incompatibleWith: ['free_trade'],
  },
  autarky: {
    id: 'autarky',
    name: 'Autarky',
    category: 'economic',
    description: 'Complete economic self-sufficiency',
    effects: [
      { target: 'tariff_rate', modifierType: 'replacement', value: 0.5, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 0.3, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    incompatibleWith: ['free_trade'],
  },
  austerity: {
    id: 'austerity',
    name: 'Austerity Measures',
    category: 'economic',
    description: 'Reduce spending to balance budget',
    effects: [
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 1.25, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.1, isPermanent: true },
      { target: 'gdp_growth', modifierType: 'additive', value: -0.01, isPermanent: true },
    ],
    incompatibleWith: ['welfare_state'],
  },
  welfare_state: {
    id: 'welfare_state',
    name: 'Welfare State',
    category: 'economic',
    description: 'Extensive social safety net programs',
    effects: [
      { target: 'stability', modifierType: 'additive', value: 0.15, isPermanent: true },
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 0.8, isPermanent: true },
      { target: 'legitimacy', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    incompatibleWith: ['austerity'],
  },
  mercantilism: {
    id: 'mercantilism',
    name: 'Mercantilism',
    category: 'economic',
    description: 'State-directed trade for national wealth accumulation',
    effects: [
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
      { target: 'corruption', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    prerequisiteTech: 'currency',
  },

  // === MILITARY POLICIES ===
  militarism: {
    id: 'militarism',
    name: 'Militarism',
    category: 'military',
    description: 'Prioritize military strength above all',
    effects: [
      { target: 'army_strength', modifierType: 'multiplicative', value: 1.25, isPermanent: true },
      { target: 'military_readiness', modifierType: 'additive', value: 0.15, isPermanent: true },
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 1.3, isPermanent: true },
    ],
    incompatibleWith: ['pacifism'],
  },
  conscription: {
    id: 'conscription',
    name: 'Conscription',
    category: 'military',
    description: 'Mandatory military service for all citizens',
    effects: [
      { target: 'recruitment_rate', modifierType: 'multiplicative', value: 2.0, isPermanent: true },
      { target: 'army_strength', modifierType: 'multiplicative', value: 1.4, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.05, isPermanent: true },
      { target: 'gdp_growth', modifierType: 'additive', value: -0.01, isPermanent: true },
    ],
  },
  professional_army: {
    id: 'professional_army',
    name: 'Professional Army',
    category: 'military',
    description: 'Well-trained volunteer military force',
    effects: [
      { target: 'military_readiness', modifierType: 'additive', value: 0.2, isPermanent: true },
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 1.5, isPermanent: true },
      { target: 'recruitment_rate', modifierType: 'multiplicative', value: 0.7, isPermanent: true },
    ],
    incompatibleWith: ['conscription'],
  },
  pacifism: {
    id: 'pacifism',
    name: 'Pacifism',
    category: 'military',
    description: 'Rejection of military force',
    effects: [
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 0.5, isPermanent: true },
      { target: 'army_strength', modifierType: 'multiplicative', value: 0.5, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'opinion_gain', modifierType: 'additive', value: 10, isPermanent: true },
    ],
    incompatibleWith: ['militarism', 'conscription'],
  },
  fortification: {
    id: 'fortification',
    name: 'Fortification Focus',
    category: 'military',
    description: 'Invest heavily in defensive structures',
    effects: [
      { target: 'war_exhaustion', modifierType: 'multiplicative', value: 0.8, isPermanent: true },
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
    ],
    prerequisiteTech: 'construction',
  },

  // === DIPLOMATIC POLICIES ===
  isolationism: {
    id: 'isolationism',
    name: 'Isolationism',
    category: 'diplomatic',
    description: 'Minimal involvement in foreign affairs',
    effects: [
      { target: 'treaty_acceptance', modifierType: 'multiplicative', value: 0.5, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 0.8, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.1, isPermanent: true },
    ],
    incompatibleWith: ['interventionism', 'expansionism'],
  },
  interventionism: {
    id: 'interventionism',
    name: 'Interventionism',
    category: 'diplomatic',
    description: 'Active involvement in foreign affairs',
    effects: [
      { target: 'opinion_gain', modifierType: 'additive', value: 5, isPermanent: true },
      { target: 'alliance_strength', modifierType: 'multiplicative', value: 1.2, isPermanent: true },
      { target: 'army_maintenance', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
    ],
    incompatibleWith: ['isolationism'],
  },
  expansionism: {
    id: 'expansionism',
    name: 'Expansionism',
    category: 'diplomatic',
    description: 'Territorial expansion through conquest or diplomacy',
    effects: [
      { target: 'army_strength', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
      { target: 'opinion_gain', modifierType: 'additive', value: -10, isPermanent: true },
      { target: 'rebellion_risk', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    incompatibleWith: ['isolationism', 'pacifism'],
  },
  diplomatic_corps: {
    id: 'diplomatic_corps',
    name: 'Diplomatic Corps',
    category: 'diplomatic',
    description: 'Professional diplomatic service',
    effects: [
      { target: 'opinion_gain', modifierType: 'additive', value: 10, isPermanent: true },
      { target: 'treaty_acceptance', modifierType: 'multiplicative', value: 1.3, isPermanent: true },
    ],
    prerequisiteTech: 'writing',
  },

  // === CULTURAL POLICIES ===
  state_religion: {
    id: 'state_religion',
    name: 'State Religion',
    category: 'cultural',
    description: 'Official religion with state support',
    effects: [
      { target: 'legitimacy', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.05, isPermanent: true },
      { target: 'provincial_loyalty', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    incompatibleWith: ['religious_tolerance', 'secularism'],
  },
  religious_tolerance: {
    id: 'religious_tolerance',
    name: 'Religious Tolerance',
    category: 'cultural',
    description: 'Allow all religions equal standing',
    effects: [
      { target: 'provincial_loyalty', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: 0.05, isPermanent: true },
    ],
    incompatibleWith: ['state_religion'],
  },
  secularism: {
    id: 'secularism',
    name: 'Secularism',
    category: 'cultural',
    description: 'Separation of religion and state',
    effects: [
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.1, isPermanent: true },
      { target: 'legitimacy', modifierType: 'additive', value: -0.05, isPermanent: true },
    ],
    incompatibleWith: ['state_religion'],
  },
  national_identity: {
    id: 'national_identity',
    name: 'National Identity',
    category: 'cultural',
    description: 'Promote unified national culture',
    effects: [
      { target: 'stability', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'provincial_loyalty', modifierType: 'additive', value: 0.1, isPermanent: true },
      { target: 'rebellion_risk', modifierType: 'additive', value: -0.05, isPermanent: true },
    ],
  },
  cultural_diversity: {
    id: 'cultural_diversity',
    name: 'Cultural Diversity',
    category: 'cultural',
    description: 'Celebrate and protect minority cultures',
    effects: [
      { target: 'trade_income', modifierType: 'multiplicative', value: 1.05, isPermanent: true },
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.05, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.02, isPermanent: true },
    ],
  },

  // === RESEARCH POLICIES ===
  patronage: {
    id: 'patronage',
    name: 'Patronage of Learning',
    category: 'research',
    description: 'State funding for scholars and researchers',
    effects: [
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.25, isPermanent: true },
      { target: 'treasury_growth', modifierType: 'multiplicative', value: 0.95, isPermanent: true },
    ],
    prerequisiteTech: 'writing',
  },
  academic_freedom: {
    id: 'academic_freedom',
    name: 'Academic Freedom',
    category: 'research',
    description: 'Unrestricted scholarly inquiry',
    effects: [
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.15, isPermanent: true },
      { target: 'stability', modifierType: 'additive', value: -0.03, isPermanent: true },
    ],
    incompatibleWith: ['state_directed_research'],
  },
  state_directed_research: {
    id: 'state_directed_research',
    name: 'State-Directed Research',
    category: 'research',
    description: 'Government controls research priorities',
    effects: [
      { target: 'research_cost', modifierType: 'multiplicative', value: 0.85, isPermanent: true },
      { target: 'research_speed', modifierType: 'multiplicative', value: 0.9, isPermanent: true },
    ],
    incompatibleWith: ['academic_freedom'],
  },
  technology_transfer: {
    id: 'technology_transfer',
    name: 'Technology Transfer',
    category: 'research',
    description: 'Import foreign technology and expertise',
    effects: [
      { target: 'research_speed', modifierType: 'multiplicative', value: 1.2, isPermanent: true },
      { target: 'trade_income', modifierType: 'multiplicative', value: 0.95, isPermanent: true },
    ],
    prerequisiteTech: 'currency',
  },
};

/**
 * Get policies by category
 */
export function getPoliciesByCategory(category: PolicyDefinition['category']): PolicyDefinition[] {
  return Object.values(NATIONAL_POLICIES).filter(p => p.category === category);
}

/**
 * Check if two policies are compatible
 */
export function arePoliciesCompatible(policyId1: string, policyId2: string): boolean {
  const policy1 = NATIONAL_POLICIES[policyId1];
  const policy2 = NATIONAL_POLICIES[policyId2];

  if (!policy1 || !policy2) return false;

  if (policy1.incompatibleWith?.includes(policyId2)) return false;
  if (policy2.incompatibleWith?.includes(policyId1)) return false;

  return true;
}

/**
 * Get available policies (not blocked by incompatibilities)
 */
export function getAvailablePolicies(
  currentPolicyIds: string[],
  completedTechnologies: string[]
): PolicyDefinition[] {
  return Object.values(NATIONAL_POLICIES).filter(policy => {
    // Already have this policy
    if (currentPolicyIds.includes(policy.id)) return false;

    // Check tech prerequisite
    if (policy.prerequisiteTech && !completedTechnologies.includes(policy.prerequisiteTech)) {
      return false;
    }

    // Check incompatibilities
    for (const currentId of currentPolicyIds) {
      if (!arePoliciesCompatible(policy.id, currentId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate combined policy effect for a target
 */
export function calculatePolicyEffect(
  activePolicies: PolicyDefinition[],
  target: PolicyTarget
): { additive: number; multiplicative: number } {
  let additive = 0;
  let multiplicative = 1;

  for (const policy of activePolicies) {
    for (const effect of policy.effects) {
      if (effect.target === target) {
        if (effect.modifierType === 'additive') {
          additive += effect.value;
        } else if (effect.modifierType === 'multiplicative') {
          multiplicative *= effect.value;
        }
      }
    }
  }

  return { additive, multiplicative };
}

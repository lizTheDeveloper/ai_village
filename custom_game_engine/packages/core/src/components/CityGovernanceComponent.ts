import type { Component } from '../ecs/Component.js';

/**
 * CityGovernanceComponent - Political governance for city-level settlements
 *
 * Per 06-POLITICAL-HIERARCHY.md Phase 2: Cities aggregate villages (500-50K population)
 * Time Scale: Same as villages (real-time) but can transition to statistical at upper range
 *
 * Design:
 * - Bridges Village → Province governance gap
 * - Aggregates population/resources from member villages
 * - Department-based management (agriculture, industry, military, etc.)
 * - Infrastructure projects (roads, aqueducts, walls)
 * - City laws and policies that cascade to member villages
 * - Integration with CityDirectorSystem for LLM decisions
 */

/**
 * City department with budget, staffing, and efficiency tracking
 */
export interface CityDepartment {
  /** Budget allocated to this department (percentage of total city budget) */
  budgetAllocation: number; // 0-1

  /** Number of agents assigned to this department */
  staffing: number;

  /** Department efficiency (0-1) based on staffing, morale, resources */
  efficiency: number;

  /** Active projects managed by this department */
  activeProjects: string[]; // Project IDs

  /** Resources controlled by this department */
  resources: Map<string, number>; // resourceType -> quantity
}

/**
 * Infrastructure project (roads, aqueducts, walls, etc.)
 */
export interface InfrastructureProject {
  id: string;
  name: string;
  type: 'road' | 'aqueduct' | 'wall' | 'bridge' | 'plaza' | 'sewer' | 'custom';
  description: string;

  /** Department responsible for this project */
  department: CityDepartmentType;

  /** Progress (0-1) */
  progress: number;

  /** Resources required to complete */
  requiredResources: Map<string, number>; // resourceType -> quantity

  /** Resources contributed so far */
  contributedResources: Map<string, number>;

  /** Workforce required (agent-days) */
  requiredWorkforce: number;

  /** Workforce contributed (agent-days) */
  contributedWorkforce: number;

  /** Priority (1-5, 5 = critical) */
  priority: number;

  /** Tick when project started */
  startTick: number;

  /** Expected completion tick (based on current rate) */
  estimatedCompletionTick?: number;

  /** Benefits when completed */
  benefits?: string[];
}

/**
 * City law (passed by city council or mayor)
 */
export interface CityLaw {
  id: string;
  name: string;
  description: string;
  category: 'taxation' | 'trade' | 'construction' | 'public_safety' | 'health' | 'education' | 'custom';

  /** Tick when law was enacted */
  enactedTick: number;

  /** Villages affected by this law */
  affectedVillageIds: string[];

  /** Enforcement level (0-1) */
  enforcement: number;

  /** Effects of this law */
  effects: {
    type: string;
    magnitude: number;
    description: string;
  }[];
}

/**
 * City policy (long-term strategic direction)
 */
export interface CityPolicy {
  id: string;
  name: string;
  category: 'economic' | 'military' | 'cultural' | 'infrastructure' | 'social' | 'environmental';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;

  /** Budget allocated to this policy (percentage) */
  budgetAllocation: number;

  /** Progress toward policy goals (0-1) */
  progress: number;

  /** Tick when policy started */
  startTick: number;

  /** Expected duration (in ticks) */
  expectedDuration?: number;

  /** Villages affected */
  affectedVillageIds: string[];
}

/**
 * Department types in city governance
 */
export type CityDepartmentType =
  | 'agriculture'
  | 'industry'
  | 'military'
  | 'research'
  | 'infrastructure'
  | 'commerce'
  | 'health'
  | 'education';

/**
 * City governance structure - political layer for city-level settlements
 *
 * Integrates with:
 * - CityDirectorSystem: LLM decisions → budget allocations, infrastructure projects, policies
 * - VillageGovernanceComponent: City policies cascade to member villages
 * - GovernanceDataSystem: Aggregates data from villages
 */
export interface CityGovernanceComponent extends Component {
  type: 'city_governance';

  // Identity
  cityId: string;
  cityName: string;
  foundedTick: number;

  // Population (aggregated from member villages)
  population: number;
  growthRate: number; // Population change per game day

  // Member villages
  memberVillageIds: Set<string>; // Villages that are part of this city

  // Leadership
  mayorId?: string; // Soul agent mayor (optional)
  councilMemberIds: string[]; // City council members

  // Departments
  departments: Map<CityDepartmentType, CityDepartment>;

  // Budget
  totalBudget: number; // Total city budget (abstract units)
  budgetAllocation: Map<CityDepartmentType, number>; // Department -> percentage (should sum to ~1.0)

  // Infrastructure
  infrastructureProjects: InfrastructureProject[];

  // Governance
  laws: CityLaw[];
  policies: CityPolicy[];

  // Taxation
  taxRate: number; // 0-1
  taxRevenue: number; // Collected per game day

  // Resources (city reserves, separate from warehouses)
  reserves: Map<string, number>; // resourceType -> quantity

  // Update tracking
  lastUpdateTick: number;
  lastAggregationTick: number; // Last time village data was aggregated
}

/**
 * Create a new CityGovernanceComponent with default values
 */
export function createCityGovernanceComponent(
  cityId: string,
  cityName: string,
  foundedTick: number
): CityGovernanceComponent {
  // Initialize all departments with zero allocation
  const departments = new Map<CityDepartmentType, CityDepartment>();
  const departmentTypes: CityDepartmentType[] = [
    'agriculture',
    'industry',
    'military',
    'research',
    'infrastructure',
    'commerce',
    'health',
    'education',
  ];

  for (const deptType of departmentTypes) {
    departments.set(deptType, {
      budgetAllocation: 0.125, // Equal distribution initially (1/8)
      staffing: 0,
      efficiency: 0.5, // Default moderate efficiency
      activeProjects: [],
      resources: new Map(),
    });
  }

  // Initialize budget allocation (equal distribution)
  const budgetAllocation = new Map<CityDepartmentType, number>();
  for (const deptType of departmentTypes) {
    budgetAllocation.set(deptType, 0.125); // 1/8 each
  }

  return {
    type: 'city_governance',
    version: 1,
    cityId,
    cityName,
    foundedTick,
    population: 0,
    growthRate: 0,
    memberVillageIds: new Set(),
    councilMemberIds: [],
    departments,
    totalBudget: 0,
    budgetAllocation,
    infrastructureProjects: [],
    laws: [],
    policies: [],
    taxRate: 0.1, // 10% default tax rate
    taxRevenue: 0,
    reserves: new Map(),
    lastUpdateTick: foundedTick,
    lastAggregationTick: foundedTick,
  };
}

/**
 * Add a village to a city
 */
export function addVillageToCity(
  cityGovernance: CityGovernanceComponent,
  villageId: string
): CityGovernanceComponent {
  const newVillageIds = new Set(cityGovernance.memberVillageIds);
  newVillageIds.add(villageId);

  return {
    ...cityGovernance,
    memberVillageIds: newVillageIds,
  };
}

/**
 * Remove a village from a city
 */
export function removeVillageFromCity(
  cityGovernance: CityGovernanceComponent,
  villageId: string
): CityGovernanceComponent {
  const newVillageIds = new Set(cityGovernance.memberVillageIds);
  newVillageIds.delete(villageId);

  return {
    ...cityGovernance,
    memberVillageIds: newVillageIds,
  };
}

/**
 * Allocate budget to a department
 * Percentages should sum to 1.0 across all departments
 */
export function allocateDepartmentBudget(
  cityGovernance: CityGovernanceComponent,
  department: CityDepartmentType,
  percentage: number
): CityGovernanceComponent {
  if (percentage < 0 || percentage > 1) {
    throw new Error(`Budget allocation must be between 0 and 1, got ${percentage}`);
  }

  const newBudgetAllocation = new Map(cityGovernance.budgetAllocation);
  newBudgetAllocation.set(department, percentage);

  // Update department component
  const newDepartments = new Map(cityGovernance.departments);
  const dept = newDepartments.get(department);
  if (!dept) {
    throw new Error(`Department ${department} not found in city governance`);
  }

  newDepartments.set(department, {
    ...dept,
    budgetAllocation: percentage,
  });

  return {
    ...cityGovernance,
    budgetAllocation: newBudgetAllocation,
    departments: newDepartments,
  };
}

/**
 * Create a new infrastructure project
 */
export function createInfrastructureProject(
  cityGovernance: CityGovernanceComponent,
  project: InfrastructureProject,
  currentTick: number
): CityGovernanceComponent {
  // Add project to department's active projects
  const newDepartments = new Map(cityGovernance.departments);
  const dept = newDepartments.get(project.department);
  if (!dept) {
    throw new Error(`Department ${project.department} not found in city governance`);
  }

  newDepartments.set(project.department, {
    ...dept,
    activeProjects: [...dept.activeProjects, project.id],
  });

  return {
    ...cityGovernance,
    infrastructureProjects: [...cityGovernance.infrastructureProjects, project],
    departments: newDepartments,
    lastUpdateTick: currentTick,
  };
}

/**
 * Update project progress
 */
export function updateProjectProgress(
  cityGovernance: CityGovernanceComponent,
  projectId: string,
  progress: number,
  currentTick: number
): CityGovernanceComponent {
  const newProjects = cityGovernance.infrastructureProjects.map((p) => {
    if (p.id === projectId) {
      return { ...p, progress };
    }
    return p;
  });

  return {
    ...cityGovernance,
    infrastructureProjects: newProjects,
    lastUpdateTick: currentTick,
  };
}

/**
 * Add a city law
 */
export function enactCityLaw(
  cityGovernance: CityGovernanceComponent,
  law: CityLaw
): CityGovernanceComponent {
  return {
    ...cityGovernance,
    laws: [...cityGovernance.laws, law],
  };
}

/**
 * Add a city policy
 */
export function adoptCityPolicy(
  cityGovernance: CityGovernanceComponent,
  policy: CityPolicy
): CityGovernanceComponent {
  return {
    ...cityGovernance,
    policies: [...cityGovernance.policies, policy],
  };
}

/**
 * Update city reserves
 */
export function updateCityReserves(
  cityGovernance: CityGovernanceComponent,
  resourceType: string,
  quantity: number
): CityGovernanceComponent {
  const newReserves = new Map(cityGovernance.reserves);
  newReserves.set(resourceType, quantity);

  return {
    ...cityGovernance,
    reserves: newReserves,
  };
}

/**
 * Calculate department budget in absolute units
 */
export function getDepartmentBudget(
  cityGovernance: CityGovernanceComponent,
  department: CityDepartmentType
): number {
  const allocation = cityGovernance.budgetAllocation.get(department);
  if (!allocation) {
    return 0;
  }
  return cityGovernance.totalBudget * allocation;
}

import { describe, it, expect } from 'vitest';
import {
  // Constants
  POWER_BUDGET_BY_RANK,

  // Functions
  playerDesignToTemplate,
  createDivineHierarchy,
  createServantFromTemplate,
  calculateHierarchyMaintenance,
  calculatePowerBudgetCost,
  getPowerBudgetForRank,
  createServantPowerGrant,
  createPowerManifestation,

  // Types (for type checking)
  type ServantTemplate,
  type DivineServant,
  type DivineHierarchy,
  type PlayerServantDesign,
  type ServantPowerGrant,
  type GrantedPower,
  type PowerManifestation,
} from '../DivineServantTypes.js';

// ============================================================================
// POWER_BUDGET_BY_RANK Tests
// ============================================================================

describe('POWER_BUDGET_BY_RANK', () => {
  it('should have defined budgets for ranks 0-4', () => {
    expect(POWER_BUDGET_BY_RANK[0]).toBe(10);
    expect(POWER_BUDGET_BY_RANK[1]).toBe(25);
    expect(POWER_BUDGET_BY_RANK[2]).toBe(50);
    expect(POWER_BUDGET_BY_RANK[3]).toBe(100);
    expect(POWER_BUDGET_BY_RANK[4]).toBe(200);
  });

  it('should increase budget with rank', () => {
    const ranks = [0, 1, 2, 3, 4];
    for (let i = 1; i < ranks.length; i++) {
      expect(POWER_BUDGET_BY_RANK[ranks[i]]).toBeGreaterThan(
        POWER_BUDGET_BY_RANK[ranks[i - 1]]
      );
    }
  });
});

// ============================================================================
// getPowerBudgetForRank Tests
// ============================================================================

describe('getPowerBudgetForRank', () => {
  it('should return defined budget for ranks 0-4', () => {
    expect(getPowerBudgetForRank(0)).toBe(10);
    expect(getPowerBudgetForRank(1)).toBe(25);
    expect(getPowerBudgetForRank(2)).toBe(50);
    expect(getPowerBudgetForRank(3)).toBe(100);
    expect(getPowerBudgetForRank(4)).toBe(200);
  });

  it('should extrapolate for ranks beyond 4', () => {
    // Formula: 200 + (rank - 4) * 100
    expect(getPowerBudgetForRank(5)).toBe(300);
    expect(getPowerBudgetForRank(6)).toBe(400);
    expect(getPowerBudgetForRank(10)).toBe(800);
  });

  it('should handle negative extrapolation for undefined low ranks', () => {
    // If rank -1 is accessed (edge case), it would return 200 + (-1 - 4) * 100 = -300
    // But practically we only use positive ranks
    expect(getPowerBudgetForRank(-1)).toBe(-300);
  });
});

// ============================================================================
// calculatePowerBudgetCost Tests
// ============================================================================

describe('calculatePowerBudgetCost', () => {
  describe('minor powers', () => {
    it('should calculate low costs for minor powers', () => {
      expect(calculatePowerBudgetCost('whisper', 1.0)).toBe(2);
      expect(calculatePowerBudgetCost('subtle_sign', 1.0)).toBe(2);
      expect(calculatePowerBudgetCost('minor_luck', 1.0)).toBe(3);
    });

    it('should scale costs by power level', () => {
      expect(calculatePowerBudgetCost('minor_luck', 0.5)).toBe(2); // ceil(3 * 0.5)
      expect(calculatePowerBudgetCost('minor_luck', 0.1)).toBe(1); // ceil(3 * 0.1)
    });
  });

  describe('moderate powers', () => {
    it('should calculate medium costs for moderate powers', () => {
      expect(calculatePowerBudgetCost('clear_vision', 1.0)).toBe(8);
      expect(calculatePowerBudgetCost('heal_wound', 1.0)).toBe(8);
      expect(calculatePowerBudgetCost('reveal_truth', 1.0)).toBe(12);
    });
  });

  describe('major powers', () => {
    it('should calculate higher costs for major powers', () => {
      expect(calculatePowerBudgetCost('smite', 1.0)).toBe(30);
      expect(calculatePowerBudgetCost('storm_calling', 1.0)).toBe(20);
      expect(calculatePowerBudgetCost('divine_protection', 1.0)).toBe(15);
    });
  });

  describe('supreme powers', () => {
    it('should calculate high costs for supreme powers', () => {
      expect(calculatePowerBudgetCost('create_angel', 1.0)).toBe(40);
      expect(calculatePowerBudgetCost('manifest_avatar', 1.0)).toBe(50);
      expect(calculatePowerBudgetCost('grant_magic', 1.0)).toBe(45);
    });
  });

  describe('world-shaping powers', () => {
    it('should calculate very high costs for world-shaping powers', () => {
      expect(calculatePowerBudgetCost('reality_warp', 1.0)).toBe(80);
      expect(calculatePowerBudgetCost('ascend_mortal', 1.0)).toBe(100);
      expect(calculatePowerBudgetCost('create_species', 1.0)).toBe(70);
    });
  });

  describe('power level scaling', () => {
    it('should scale linearly with power level', () => {
      const baseCost = calculatePowerBudgetCost('smite', 1.0);
      expect(calculatePowerBudgetCost('smite', 0.5)).toBe(Math.ceil(baseCost * 0.5));
    });

    it('should round up fractional costs', () => {
      // smite costs 30, at 0.33 = ceil(9.9) = 10
      expect(calculatePowerBudgetCost('smite', 0.33)).toBe(10);
    });

    it('should return at least 1 for very low power levels', () => {
      expect(calculatePowerBudgetCost('whisper', 0.01)).toBe(1);
    });
  });

  describe('unknown powers', () => {
    it('should use default cost of 10 for unlisted powers', () => {
      // Cast to bypass TypeScript for testing edge case
      const unknownPower = 'some_future_power' as any;
      expect(calculatePowerBudgetCost(unknownPower, 1.0)).toBe(10);
    });
  });
});

// ============================================================================
// createServantPowerGrant Tests
// ============================================================================

describe('createServantPowerGrant', () => {
  it('should create a power grant with correct budget for rank', () => {
    const grant = createServantPowerGrant('template-1', 'deity-1', 0);

    expect(grant.servantTemplateId).toBe('template-1');
    expect(grant.sourceDeityId).toBe('deity-1');
    expect(grant.powerBudget).toBe(10);
    expect(grant.remainingBudget).toBe(10);
    expect(grant.grantedPowers).toEqual([]);
    expect(grant.modifiable).toBe(true);
  });

  it('should use correct budget for different ranks', () => {
    expect(createServantPowerGrant('t', 'd', 1).powerBudget).toBe(25);
    expect(createServantPowerGrant('t', 'd', 2).powerBudget).toBe(50);
    expect(createServantPowerGrant('t', 'd', 3).powerBudget).toBe(100);
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const grant = createServantPowerGrant('t', 'd', 0);
    const after = Date.now();

    expect(grant.lastModifiedAt).toBeGreaterThanOrEqual(before);
    expect(grant.lastModifiedAt).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// createPowerManifestation Tests
// ============================================================================

describe('createPowerManifestation', () => {
  it('should create a manifestation with provided values', () => {
    const manifestation = createPowerManifestation(
      'Ember Touch',
      'A gentle warmth spreads from the servant\'s hands',
      'Faint orange glow surrounds the target'
    );

    expect(manifestation.name).toBe('Ember Touch');
    expect(manifestation.description).toBe(
      'A gentle warmth spreads from the servant\'s hands'
    );
    expect(manifestation.visualEffect).toBe(
      'Faint orange glow surrounds the target'
    );
  });

  it('should default to obviously divine', () => {
    const manifestation = createPowerManifestation('Test', 'desc', 'effect');
    expect(manifestation.obviouslyDivine).toBe(true);
  });

  it('should not include optional fields', () => {
    const manifestation = createPowerManifestation('Test', 'desc', 'effect');
    expect(manifestation.soundEffect).toBeUndefined();
    expect(manifestation.witnessDescription).toBeUndefined();
  });
});

// ============================================================================
// playerDesignToTemplate Tests
// ============================================================================

describe('playerDesignToTemplate', () => {
  const baseDesign: PlayerServantDesign = {
    typeName: 'Flame Guardian',
    description: 'Warriors of living fire',
    appearanceTraits: ['flickering flames', 'ember eyes', 'smoke trailing'],
    size: 'human',
    composition: ['fire', 'spirit'],
    movement: ['walk', 'hover'],
    canSpeak: true,
    personalityKeywords: ['fierce', 'protective'],
    primaryAbilities: [
      { name: 'Flame Shield', description: 'Protective fire barrier', category: 'defense' },
      { name: 'Burn Touch', description: 'Searing contact', category: 'combat' },
    ],
    hierarchyRank: 1,
    maximumCount: 10,
  };

  it('should create template with correct basic info', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-123');

    expect(template.typeName).toBe('Flame Guardian');
    expect(template.typeNamePlural).toBe('Flame Guardians');
    expect(template.description).toBe('Warriors of living fire');
    expect(template.deityId).toBe('deity-123');
    expect(template.hierarchyRank).toBe(1);
    expect(template.maximumCount).toBe(10);
    expect(template.origin).toBe('player');
  });

  it('should generate unique IDs', () => {
    const template1 = playerDesignToTemplate(baseDesign, 'deity-1');
    const template2 = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template1.id).not.toBe(template2.id);
    expect(template1.id).toMatch(/^template_\d+_/);
  });

  it('should set form based on composition', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template.form.composition).toEqual(['fire', 'spirit']);
    expect(template.form.movement).toEqual(['walk', 'hover']);
    expect(template.form.size).toBe('human');
    // spirit is checked before fire in inferFormCategory, so spectral wins
    expect(template.form.category).toBe('spectral');
  });

  it('should infer spectral category for spirit/light composition', () => {
    const spiritDesign: PlayerServantDesign = {
      ...baseDesign,
      composition: ['light', 'spirit'],
    };
    const template = playerDesignToTemplate(spiritDesign, 'deity-1');
    expect(template.form.category).toBe('spectral');
  });

  it('should infer cosmic category for void composition', () => {
    const voidDesign: PlayerServantDesign = {
      ...baseDesign,
      composition: ['void', 'concepts'],
    };
    const template = playerDesignToTemplate(voidDesign, 'deity-1');
    expect(template.form.category).toBe('cosmic');
  });

  it('should set communication based on canSpeak', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template.form.communication.canSpeak).toBe(true);
    expect(template.form.communication.languages).toBe('believer_languages');

    const silentDesign = { ...baseDesign, canSpeak: false };
    const silentTemplate = playerDesignToTemplate(silentDesign, 'deity-1');

    expect(silentTemplate.form.communication.canSpeak).toBe(false);
    expect(silentTemplate.form.communication.languages).toBe('none');
  });

  it('should convert abilities to ability templates', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template.abilities).toHaveLength(2);
    expect(template.abilities[0].name).toBe('Flame Shield');
    expect(template.abilities[0].category).toBe('defense');
    expect(template.abilities[1].name).toBe('Burn Touch');
    expect(template.abilities[1].category).toBe('combat');
  });

  it('should set ability defaults', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');
    const ability = template.abilities[0];

    expect(ability.powerLevel).toBe(0.5);
    expect(ability.baseCost).toBe(10);
    expect(ability.cooldown).toBe(1);
    expect(ability.revealsNature).toBe(false);
  });

  it('should calculate creation cost based on rank', () => {
    const rank0Design = { ...baseDesign, hierarchyRank: 0 };
    const rank2Design = { ...baseDesign, hierarchyRank: 2 };

    const rank0Template = playerDesignToTemplate(rank0Design, 'deity-1');
    const rank2Template = playerDesignToTemplate(rank2Design, 'deity-1');

    expect(rank0Template.creationCost).toBe(100); // 100 * (0 + 1)
    expect(rank2Template.creationCost).toBe(300); // 100 * (2 + 1)
  });

  it('should set personality from keywords', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template.personality.temperament).toEqual(['fierce', 'protective']);
    expect(template.personality.obedience).toBe('loyal');
    expect(template.personality.canDevelopPersonality).toBe(true);
  });

  it('should set base stats', () => {
    const template = playerDesignToTemplate(baseDesign, 'deity-1');

    expect(template.baseStats.health).toBe(50);
    expect(template.baseStats.maxHealth).toBe(50);
    expect(template.baseStats.power).toBe(20);
    expect(template.baseStats.customStats).toEqual({});
  });

  it('should include createdAt timestamp', () => {
    const before = Date.now();
    const template = playerDesignToTemplate(baseDesign, 'deity-1');
    const after = Date.now();

    expect(template.createdAt).toBeGreaterThanOrEqual(before);
    expect(template.createdAt).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// createDivineHierarchy Tests
// ============================================================================

describe('createDivineHierarchy', () => {
  it('should create hierarchy with correct properties', () => {
    const hierarchy = createDivineHierarchy(
      'deity-war-god',
      'The Crimson Host',
      'Battle-spirits that serve the god of war'
    );

    expect(hierarchy.deityId).toBe('deity-war-god');
    expect(hierarchy.hierarchyName).toBe('The Crimson Host');
    expect(hierarchy.description).toBe('Battle-spirits that serve the god of war');
  });

  it('should generate ID from deity ID', () => {
    const hierarchy = createDivineHierarchy('deity-123', 'Test', 'Desc');
    expect(hierarchy.id).toBe('hierarchy_deity-123');
  });

  it('should initialize with empty templates', () => {
    const hierarchy = createDivineHierarchy('d', 'h', 'desc');
    expect(hierarchy.templatesByRank).toEqual([]);
    expect(hierarchy.totalActiveServants).toBe(0);
  });

  it('should not be known to mortals initially', () => {
    const hierarchy = createDivineHierarchy('d', 'h', 'desc');
    expect(hierarchy.knownToMortals).toBe(false);
  });

  it('should include establishment timestamp', () => {
    const before = Date.now();
    const hierarchy = createDivineHierarchy('d', 'h', 'desc');
    const after = Date.now();

    expect(hierarchy.establishedAt).toBeGreaterThanOrEqual(before);
    expect(hierarchy.establishedAt).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// createServantFromTemplate Tests
// ============================================================================

describe('createServantFromTemplate', () => {
  const mockTemplate: ServantTemplate = {
    id: 'template-valkyrie',
    deityId: 'deity-war',
    typeName: 'Valkyrie',
    typeNamePlural: 'Valkyries',
    description: 'Choosers of the slain',
    hierarchyRank: 2,
    rankTitle: 'Chooser',
    form: {
      category: 'humanoid',
      description: 'Armored warrior maidens with wings',
      size: 'human',
      composition: ['spirit', 'light'],
      movement: ['walk', 'fly'],
      senses: ['sight', 'hearing'],
      appendages: [{ type: 'wing', count: 2, description: 'Feathered wings', functional: true }],
      communication: { canSpeak: true, languages: 'all', alternativeMethods: [] },
      specialFeatures: ['glowing eyes'],
      variationsAllowed: true,
      variableAspects: ['hair color'],
    },
    personality: {
      obedience: 'loyal',
      mortalAttitude: 'neutral',
      temperament: ['stern', 'honorable'],
      motivations: ['collect worthy souls'],
      canDevelopPersonality: true,
      personalityDriftAmount: 0.3,
      defaultEmotionalState: 'calm',
      communicationStyle: ['formal'],
      selfAwareness: 'high',
      sentience: 'full',
    },
    abilities: [],
    baseStats: {
      health: 100,
      maxHealth: 100,
      power: 50,
      speed: 2.0,
      perception: 1.5,
      influence: 0.8,
      resistance: 0.5,
      stealth: 0.3,
      customStats: { honor: 10 },
    },
    creationCost: 300,
    maintenanceCost: 3,
    maximumCount: 9,
    prerequisites: [],
    createdAt: Date.now(),
    origin: 'llm',
  };

  it('should create servant with template reference', () => {
    const servant = createServantFromTemplate(mockTemplate, 'entity-123');

    expect(servant.templateId).toBe('template-valkyrie');
    expect(servant.entityId).toBe('entity-123');
    expect(servant.deityId).toBe('deity-war');
  });

  it('should generate unique servant ID', () => {
    const s1 = createServantFromTemplate(mockTemplate, 'e1');
    const s2 = createServantFromTemplate(mockTemplate, 'e2');

    expect(s1.id).not.toBe(s2.id);
    expect(s1.id).toMatch(/^servant_\d+_/);
  });

  it('should optionally accept a name', () => {
    const named = createServantFromTemplate(mockTemplate, 'e1', 'Brunhilde');
    const unnamed = createServantFromTemplate(mockTemplate, 'e2');

    expect(named.name).toBe('Brunhilde');
    expect(unnamed.name).toBeUndefined();
  });

  it('should copy base stats from template', () => {
    const servant = createServantFromTemplate(mockTemplate, 'e1');

    expect(servant.currentStats.health).toBe(100);
    expect(servant.currentStats.power).toBe(50);
    expect(servant.currentStats.customStats).toEqual({ honor: 10 });
  });

  it('should initialize state correctly', () => {
    const servant = createServantFromTemplate(mockTemplate, 'e1');

    expect(servant.state.active).toBe(true);
    expect(servant.state.visible).toBe(false);
    expect(servant.state.inMortalRealm).toBe(false);
    expect(servant.state.currentDrainRate).toBe(3); // from maintenanceCost
    expect(servant.state.currentActivity).toBe('idle');
    expect(servant.state.statusEffects).toEqual([]);
  });

  it('should start with no notable deeds', () => {
    const servant = createServantFromTemplate(mockTemplate, 'e1');

    expect(servant.notableDeedIds).toEqual([]);
    expect(servant.knownToAgentIds).toEqual([]);
  });

  it('should start with no evolved traits', () => {
    const servant = createServantFromTemplate(mockTemplate, 'e1');

    expect(servant.hasEvolvedTraits).toBe(false);
    expect(servant.evolvedTraits).toEqual([]);
  });

  it('should track creation time and existence', () => {
    const before = Date.now();
    const servant = createServantFromTemplate(mockTemplate, 'e1');
    const after = Date.now();

    expect(servant.createdAt).toBeGreaterThanOrEqual(before);
    expect(servant.createdAt).toBeLessThanOrEqual(after);
    expect(servant.totalExistenceTime).toBe(0);
  });
});

// ============================================================================
// calculateHierarchyMaintenance Tests
// ============================================================================

describe('calculateHierarchyMaintenance', () => {
  const mockHierarchy: DivineHierarchy = {
    id: 'h1',
    deityId: 'd1',
    hierarchyName: 'Test',
    description: 'Test hierarchy',
    templatesByRank: [],
    totalActiveServants: 0,
    establishedAt: Date.now(),
    knownToMortals: false,
  };

  it('should return 0 for empty servant list', () => {
    const cost = calculateHierarchyMaintenance(mockHierarchy, []);
    expect(cost).toBe(0);
  });

  it('should sum drain rates of all servants', () => {
    const servants: DivineServant[] = [
      createMockServant(1.5),
      createMockServant(2.0),
      createMockServant(3.5),
    ];

    const cost = calculateHierarchyMaintenance(mockHierarchy, servants);
    expect(cost).toBe(7.0);
  });

  it('should handle single servant', () => {
    const servants = [createMockServant(5.0)];
    const cost = calculateHierarchyMaintenance(mockHierarchy, servants);
    expect(cost).toBe(5.0);
  });

  it('should handle inactive servants with zero drain', () => {
    const servants = [
      createMockServant(2.0),
      createMockServant(0), // inactive
      createMockServant(3.0),
    ];

    const cost = calculateHierarchyMaintenance(mockHierarchy, servants);
    expect(cost).toBe(5.0);
  });
});

// Helper to create mock servants for testing
function createMockServant(drainRate: number): DivineServant {
  return {
    id: `servant_${Math.random()}`,
    templateId: 'template-1',
    entityId: 'entity-1',
    deityId: 'deity-1',
    currentStats: { customStats: {} },
    state: {
      active: drainRate > 0,
      visible: false,
      inMortalRealm: false,
      currentDrainRate: drainRate,
      currentActivity: 'idle',
      statusEffects: [],
    },
    notableDeedIds: [],
    createdAt: Date.now(),
    totalExistenceTime: 0,
    knownToAgentIds: [],
    hasEvolvedTraits: false,
    evolvedTraits: [],
  };
}

// ============================================================================
// Type Structure Tests
// ============================================================================

describe('type structures', () => {
  describe('ServantPowerGrant', () => {
    it('should accept valid grant structure', () => {
      const grant: ServantPowerGrant = {
        servantTemplateId: 'template-1',
        powerBudget: 50,
        remainingBudget: 30,
        grantedPowers: [],
        modifiable: true,
        sourceDeityId: 'deity-1',
        lastModifiedAt: Date.now(),
      };

      expect(grant.powerBudget).toBe(50);
      expect(grant.remainingBudget).toBe(30);
    });
  });

  describe('GrantedPower', () => {
    it('should accept valid granted power structure', () => {
      const power: GrantedPower = {
        id: 'power-1',
        basePowerType: 'minor_miracle',
        manifestation: {
          name: 'Gentle Warmth',
          description: 'A comforting warmth spreads',
          visualEffect: 'Soft golden glow',
          obviouslyDivine: true,
        },
        powerLevel: 0.5,
        budgetCost: 3,
        costToServant: 5,
        cooldown: 1,
        maxUsesPerDay: 10,
        grantedAt: Date.now(),
        usageRestrictions: [],
        mastery: 0.7,
      };

      expect(power.powerLevel).toBe(0.5);
      expect(power.manifestation.name).toBe('Gentle Warmth');
    });
  });

  describe('PowerManifestation', () => {
    it('should accept manifestation with optional fields', () => {
      const manifestation: PowerManifestation = {
        name: 'Divine Flame',
        description: 'Holy fire descends',
        visualEffect: 'Brilliant white flames',
        soundEffect: 'Choir singing',
        obviouslyDivine: true,
        witnessDescription: 'Mortals fall to their knees in awe',
      };

      expect(manifestation.soundEffect).toBe('Choir singing');
      expect(manifestation.witnessDescription).toBeDefined();
    });
  });
});

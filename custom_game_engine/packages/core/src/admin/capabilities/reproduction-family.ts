/**
 * Reproduction & Family Capability - Divine oversight of family dynamics and fertility
 *
 * Provides admin interface for:
 * - Family trees and ancestry
 * - Romantic relationships and courtship
 * - Pregnancy tracking and fertility
 * - Orphan identification
 * - Lineage traits and inheritance
 * - Divine fertility interventions
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const COURTSHIP_STATE_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'courting', label: 'Courting' },
  { value: 'being_courted', label: 'Being Courted' },
  { value: 'committed', label: 'Committed' },
  { value: 'not_interested', label: 'Not Interested' },
];

const RELATIONSHIP_FILTER_OPTIONS = [
  { value: 'all', label: 'All Relationships' },
  { value: 'romantic', label: 'Romantic Only' },
  { value: 'family', label: 'Family Only' },
  { value: 'parent-child', label: 'Parent-Child' },
  { value: 'siblings', label: 'Siblings' },
  { value: 'spouses', label: 'Spouses' },
];

const FERTILITY_BLESSING_DURATION_OPTIONS = [
  { value: 'temporary', label: 'Temporary (7 days)' },
  { value: 'extended', label: 'Extended (30 days)' },
  { value: 'permanent', label: 'Permanent' },
];

// ============================================================================
// Reproduction & Family Capability Definition
// ============================================================================

const reproductionFamilyCapability = defineCapability({
  id: 'reproduction-family',
  name: 'Family & Fertility',
  description: 'Divine oversight of families, lineages, reproduction, and fertility blessings',
  category: 'systems',

  tab: {
    icon: '👨‍👩‍👧‍👦',
    priority: 5,
  },

  queries: [
    // ========================================================================
    // FAMILY TREE QUERIES
    // ========================================================================

    defineQuery({
      id: 'view-family-tree',
      name: 'View Family Tree',
      description: 'See an agent\'s ancestry and descendants across multiple generations',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Root agent ID' },
        { name: 'generations', type: 'number', required: false, default: 3, description: 'Generations up/down to include (1-5)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/family-tree' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          rootAgent?: { id: string; name: string; age?: number };
          ancestors?: Array<{ id: string; name: string; relationship: string; generation: number }>;
          descendants?: Array<{ id: string; name: string; relationship: string; generation: number }>;
          siblings?: Array<{ id: string; name: string }>;
          spouse?: { id: string; name: string };
          totalRelatives?: number;
        };

        let output = `FAMILY TREE: ${result.rootAgent?.name ?? 'Unknown'}\n`;
        if (result.rootAgent?.age !== undefined) {
          output += `Age: ${result.rootAgent.age} years\n`;
        }
        output += `\n`;

        // Ancestors
        if (result.ancestors?.length) {
          output += `ANCESTORS (${result.ancestors.length}):\n`;
          const ancestorsByGen = new Map<number, typeof result.ancestors>();
          result.ancestors.forEach(a => {
            if (!ancestorsByGen.has(a.generation)) {
              ancestorsByGen.set(a.generation, []);
            }
            ancestorsByGen.get(a.generation)?.push(a);
          });
          Array.from(ancestorsByGen.keys()).sort((a, b) => b - a).forEach(gen => {
            output += `  Generation -${gen}:\n`;
            ancestorsByGen.get(gen)?.forEach(a => {
              output += `    - ${a.name} (${a.relationship})\n`;
            });
          });
          output += `\n`;
        }

        // Siblings
        if (result.siblings?.length) {
          output += `SIBLINGS (${result.siblings.length}):\n`;
          result.siblings.forEach(s => {
            output += `  - ${s.name}\n`;
          });
          output += `\n`;
        }

        // Spouse
        if (result.spouse) {
          output += `SPOUSE: ${result.spouse.name}\n\n`;
        }

        // Descendants
        if (result.descendants?.length) {
          output += `DESCENDANTS (${result.descendants.length}):\n`;
          const descendantsByGen = new Map<number, typeof result.descendants>();
          result.descendants.forEach(d => {
            if (!descendantsByGen.has(d.generation)) {
              descendantsByGen.set(d.generation, []);
            }
            descendantsByGen.get(d.generation)?.push(d);
          });
          Array.from(descendantsByGen.keys()).sort().forEach(gen => {
            output += `  Generation +${gen}:\n`;
            descendantsByGen.get(gen)?.forEach(d => {
              output += `    - ${d.name} (${d.relationship})\n`;
            });
          });
          output += `\n`;
        }

        output += `Total Relatives: ${result.totalRelatives ?? 0}`;

        return output;
      },
    }),

    defineQuery({
      id: 'view-relationships',
      name: 'View Relationships',
      description: 'See romantic and family relationships for an agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        {
          name: 'filter',
          type: 'select',
          required: false,
          default: 'all',
          options: RELATIONSHIP_FILTER_OPTIONS,
          description: 'Relationship filter'
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/agent-relationships' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          romanticRelationships?: Array<{
            targetId: string;
            targetName: string;
            state: string;
            affinity: number;
            compatibility: number;
          }>;
          familyRelationships?: Array<{
            targetId: string;
            targetName: string;
            relationship: string;
            bondStrength: number;
          }>;
        };

        let output = `RELATIONSHIPS: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.romanticRelationships?.length) {
          output += `ROMANTIC (${result.romanticRelationships.length}):\n`;
          result.romanticRelationships.forEach(r => {
            output += `  ${r.targetName}\n`;
            output += `    State: ${r.state}\n`;
            output += `    Affinity: ${r.affinity}\n`;
            output += `    Compatibility: ${r.compatibility}%\n\n`;
          });
        }

        if (result.familyRelationships?.length) {
          output += `FAMILY (${result.familyRelationships.length}):\n`;
          result.familyRelationships.forEach(r => {
            output += `  ${r.targetName} (${r.relationship})\n`;
            output += `    Bond Strength: ${r.bondStrength}\n\n`;
          });
        }

        if (!result.romanticRelationships?.length && !result.familyRelationships?.length) {
          output += 'No relationships found';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-couples',
      name: 'Find Couples',
      description: 'Find agents in romantic relationships or courtship',
      params: [
        {
          name: 'state',
          type: 'select',
          required: false,
          options: COURTSHIP_STATE_OPTIONS,
          description: 'Filter by courtship state'
        },
        { name: 'minCompatibility', type: 'number', required: false, description: 'Minimum compatibility (0-100)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/find-couples' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          couples?: Array<{
            agent1: { id: string; name: string };
            agent2: { id: string; name: string };
            state: string;
            compatibility: number;
            courting: boolean;
            committed: boolean;
          }>;
          totalCouples?: number;
        };

        let output = `ROMANTIC COUPLES\n\n`;

        if (result.couples?.length) {
          result.couples.forEach(c => {
            const status = c.committed ? '💍 Committed' : c.courting ? '💐 Courting' : '❤️ Interested';
            output += `${status} ${c.agent1.name} ↔ ${c.agent2.name}\n`;
            output += `  State: ${c.state}\n`;
            output += `  Compatibility: ${c.compatibility}%\n\n`;
          });
        } else {
          output += 'No couples found matching criteria';
        }

        output += `\nTotal: ${result.totalCouples ?? 0}`;

        return output;
      },
    }),

    // ========================================================================
    // PREGNANCY & FERTILITY QUERIES
    // ========================================================================

    defineQuery({
      id: 'view-pregnancy-status',
      name: 'View Pregnancy Status',
      description: 'See pregnant agents and due dates',
      params: [
        { name: 'agentId', type: 'entity-id', required: false, entityType: 'agent', description: 'Specific agent (optional, omit for all)' },
        { name: 'showDetails', type: 'boolean', required: false, default: true, description: 'Show detailed health info' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/pregnancy-status' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          pregnancies?: Array<{
            motherId: string;
            motherName: string;
            fatherId: string;
            fatherName: string;
            trimester: number;
            daysRemaining: number;
            fetalHealth: number;
            maternalHealth: number;
            riskLevel: string;
            complications: string[];
          }>;
          totalPregnancies?: number;
        };

        let output = `ACTIVE PREGNANCIES\n\n`;

        if (result.pregnancies?.length) {
          result.pregnancies.forEach(p => {
            const riskIcon = p.riskLevel === 'high_risk' ? '⚠️' : p.riskLevel === 'moderate_risk' ? '⚡' : '✅';
            output += `${riskIcon} ${p.motherName}\n`;
            output += `  Father: ${p.fatherName}\n`;
            output += `  Trimester: ${p.trimester}/3\n`;
            output += `  Due in: ${p.daysRemaining} days\n`;
            output += `  Fetal Health: ${(p.fetalHealth * 100).toFixed(0)}%\n`;
            output += `  Maternal Health: ${(p.maternalHealth * 100).toFixed(0)}%\n`;
            output += `  Risk Level: ${p.riskLevel}\n`;
            if (p.complications?.length) {
              output += `  Complications: ${p.complications.join(', ')}\n`;
            }
            output += `\n`;
          });
        } else {
          output += 'No active pregnancies';
        }

        output += `\nTotal: ${result.totalPregnancies ?? 0}`;

        return output;
      },
    }),

    defineQuery({
      id: 'view-orphans',
      name: 'View Orphans',
      description: 'Find agents without living parents',
      params: [
        { name: 'maxAge', type: 'number', required: false, description: 'Maximum age in years (default: 18)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/find-orphans' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          orphans?: Array<{
            id: string;
            name: string;
            age: number;
            parentsDead: boolean;
            hasGuardian: boolean;
            guardianName?: string;
          }>;
          totalOrphans?: number;
        };

        let output = `ORPHANS\n\n`;

        if (result.orphans?.length) {
          result.orphans.forEach(o => {
            const guardianInfo = o.hasGuardian ? ` (Guardian: ${o.guardianName})` : ' ⚠️ No Guardian';
            output += `${o.name} - Age ${o.age}${guardianInfo}\n`;
            output += `  Parents: ${o.parentsDead ? 'Both deceased' : 'Unknown/Missing'}\n\n`;
          });
        } else {
          output += 'No orphans found';
        }

        output += `\nTotal: ${result.totalOrphans ?? 0}`;

        return output;
      },
    }),

    defineQuery({
      id: 'view-lineage-traits',
      name: 'View Lineage Traits',
      description: 'See inherited traits through a family line',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent ID' },
        { name: 'traitType', type: 'select', required: false, options: [
          { value: 'all', label: 'All Traits' },
          { value: 'physical', label: 'Physical Traits' },
          { value: 'personality', label: 'Personality Traits' },
          { value: 'magical', label: 'Magical Aptitude' },
          { value: 'skills', label: 'Skill Inheritance' },
        ], description: 'Type of traits to view' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/lineage-traits' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          inheritedTraits?: Array<{
            trait: string;
            type: string;
            inheritedFrom: string;
            strength: number;
            generations: number;
          }>;
          dominantLineage?: string;
        };

        let output = `LINEAGE TRAITS: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.dominantLineage) {
          output += `Dominant Lineage: ${result.dominantLineage}\n\n`;
        }

        if (result.inheritedTraits?.length) {
          output += `INHERITED TRAITS:\n`;
          result.inheritedTraits.forEach(t => {
            output += `  ${t.trait} (${t.type})\n`;
            output += `    From: ${t.inheritedFrom} (${t.generations} generations ago)\n`;
            output += `    Strength: ${(t.strength * 100).toFixed(0)}%\n\n`;
          });
        } else {
          output += 'No inherited traits found';
        }

        return output;
      },
    }),

    // ========================================================================
    // ACTIONS - DIVINE INTERVENTIONS
    // ========================================================================
  ],

  actions: [
    defineAction({
      id: 'bless-fertility',
      name: 'Bless Fertility',
      description: 'Increase chances of conception for an agent (divine blessing)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to bless' },
        { name: 'multiplier', type: 'number', required: false, default: 2.0, description: 'Fertility multiplier (1.5-5.0)' },
        {
          name: 'duration',
          type: 'select',
          required: false,
          default: 'temporary',
          options: FERTILITY_BLESSING_DURATION_OPTIONS,
          description: 'Blessing duration'
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/bless-fertility' };
      },
    }),

    defineAction({
      id: 'bless-union',
      name: 'Bless Romantic Union',
      description: 'Bless a relationship to improve compatibility and strengthen bond',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First partner ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second partner ID' },
        { name: 'compatibilityBonus', type: 'number', required: false, default: 20, description: 'Compatibility bonus (0-50)' },
        { name: 'affinityBonus', type: 'number', required: false, default: 30, description: 'Affinity bonus (0-50)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/bless-union' };
      },
    }),

    defineAction({
      id: 'reveal-parentage',
      name: 'Reveal Parentage',
      description: 'Reveal hidden or unknown parentage to an agent (divine revelation)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to receive revelation' },
        { name: 'revealFather', type: 'boolean', required: false, default: true, description: 'Reveal father identity' },
        { name: 'revealMother', type: 'boolean', required: false, default: true, description: 'Reveal mother identity' },
        { name: 'createMemory', type: 'boolean', required: false, default: true, description: 'Add memory of revelation' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/reveal-parentage' };
      },
    }),

    defineAction({
      id: 'curse-infertility',
      name: 'Curse Infertility',
      description: 'Prevent conception (dangerous divine curse - use with caution)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to curse' },
        {
          name: 'duration',
          type: 'select',
          required: false,
          default: 'temporary',
          options: FERTILITY_BLESSING_DURATION_OPTIONS,
          description: 'Curse duration'
        },
        { name: 'reason', type: 'string', required: true, description: 'Reason for curse (for lore tracking)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/curse-infertility' };
      },
    }),

    defineAction({
      id: 'arrange-meeting',
      name: 'Arrange Divine Meeting',
      description: 'Divinely arrange two compatible agents to meet and interact',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        { name: 'location', type: 'string', required: false, description: 'Meeting location (optional)' },
        { name: 'topic', type: 'string', required: false, description: 'Suggested conversation topic' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/arrange-meeting' };
      },
    }),

    defineAction({
      id: 'strengthen-family-bond',
      name: 'Strengthen Family Bond',
      description: 'Improve relationship between family members (divine intervention)',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First family member ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second family member ID' },
        { name: 'bondBonus', type: 'number', required: false, default: 25, description: 'Bond strength increase (0-50)' },
        { name: 'healRift', type: 'boolean', required: false, default: false, description: 'Heal family rifts/conflicts' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/strengthen-family-bond' };
      },
    }),

    defineAction({
      id: 'ensure-safe-birth',
      name: 'Ensure Safe Birth',
      description: 'Divine intervention to ensure a safe childbirth (reduces complications)',
      params: [
        { name: 'motherId', type: 'entity-id', required: true, entityType: 'agent', description: 'Pregnant agent ID' },
        { name: 'eliminateComplications', type: 'boolean', required: false, default: false, description: 'Remove all complications' },
        { name: 'guaranteeSuccess', type: 'boolean', required: false, default: false, description: 'Guarantee successful birth (very powerful)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/ensure-safe-birth' };
      },
    }),

    defineAction({
      id: 'matchmake',
      name: 'Divine Matchmaking',
      description: 'Match two agents based on compatibility (divine intervention in courtship)',
      params: [
        { name: 'agent1Id', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent ID' },
        { name: 'agent2Id', type: 'entity-id', required: true, entityType: 'agent', description: 'Second agent ID' },
        { name: 'subtlety', type: 'select', required: false, default: 'gentle', options: [
          { value: 'subtle', label: 'Subtle Hints' },
          { value: 'gentle', label: 'Gentle Nudge' },
          { value: 'obvious', label: 'Obvious Signs' },
          { value: 'direct', label: 'Direct Divine Command' },
        ], description: 'How obvious should the divine intervention be?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/actions/matchmake' };
      },
    }),
  ],
});

capabilityRegistry.register(reproductionFamilyCapability);

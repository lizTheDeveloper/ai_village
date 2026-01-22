/**
 * Skills & Professions Capability - Divine blessing of talents and careers
 *
 * DISCOVERABLE: The angel can bless agents with skills and guide their professions.
 * This is a nurturing, educational power - helping agents discover talents,
 * master crafts, and find fulfilling work.
 *
 * Framing:
 * - Skills = "natural talents and learned abilities"
 * - Professions = "callings and life paths"
 * - Blessing skill gain = "divine inspiration, sudden insight"
 * - Enlightenment = "moment of perfect understanding"
 * - Revealing talent = "uncovering hidden potential"
 * - Knowledge transfer = "strengthening bonds of mentorship"
 *
 * This capability feels warm and supportive. The angel is helping agents
 * grow, learn, and find meaning through mastery and purpose.
 *
 * Provides admin interface for:
 * - Viewing agent skills and progression
 * - Finding masters and apprentices
 * - Understanding profession distribution
 * - Blessing skill advancement (divine inspiration)
 * - Revealing hidden talents
 * - Strengthening mentor relationships
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';
import type { SkillId, SkillLevel } from '../../components/SkillsComponent.js';
import type { ProfessionRole } from '../../components/ProfessionComponent.js';

// ============================================================================
// Option Definitions
// ============================================================================

const SKILL_OPTIONS = [
  { value: 'building', label: 'Building - Construction and repair' },
  { value: 'architecture', label: 'Architecture - Design and planning' },
  { value: 'farming', label: 'Farming - Cultivation and harvest' },
  { value: 'gathering', label: 'Gathering - Finding wild resources' },
  { value: 'cooking', label: 'Cooking - Food preparation' },
  { value: 'crafting', label: 'Crafting - Item creation' },
  { value: 'social', label: 'Social - Interaction and persuasion' },
  { value: 'exploration', label: 'Exploration - Discovery and navigation' },
  { value: 'combat', label: 'Combat - Fighting and defense' },
  { value: 'hunting', label: 'Hunting - Tracking and hunting' },
  { value: 'stealth', label: 'Stealth - Moving unseen' },
  { value: 'animal_handling', label: 'Animal Handling - Working with animals' },
  { value: 'medicine', label: 'Medicine - Healing and care' },
  { value: 'research', label: 'Research - Study and learning' },
  { value: 'magic', label: 'Magic - Arcane arts' },
];

const SKILL_LEVEL_OPTIONS = [
  { value: '1', label: 'Level 1 - Novice' },
  { value: '2', label: 'Level 2 - Apprentice' },
  { value: '3', label: 'Level 3 - Journeyman' },
  { value: '4', label: 'Level 4 - Expert' },
  { value: '5', label: 'Level 5 - Master' },
];

const XP_AMOUNT_OPTIONS = [
  { value: '10', label: '10 XP - Small boost' },
  { value: '25', label: '25 XP - Good practice' },
  { value: '50', label: '50 XP - Solid session' },
  { value: '100', label: '100 XP - 1 level (significant)' },
  { value: '200', label: '200 XP - 2 levels (major)' },
  { value: '500', label: '500 XP - 5 levels (divine gift)' },
];

// ============================================================================
// Skills & Professions Capability Definition
// ============================================================================

const skillsProfessionsCapability = defineCapability({
  id: 'skills-professions',
  name: 'Skills & Professions',
  description: 'Bless agents with talents, guide their learning, and shape their life paths',
  category: 'agent-management',

  tab: {
    icon: '⚒️',
    priority: 5,
  },

  queries: [
    defineQuery({
      id: 'view-agent-skills',
      name: 'View Agent Skills',
      description: 'See all skills and proficiency levels for a specific agent',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/agent/skills' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          skills?: Array<{
            skillId: string;
            skillName: string;
            level: number;
            levelName: string;
            currentXP: number;
            nextLevelXP: number;
            progressPercent: number;
            affinity: number;
          }>;
          totalSkills?: number;
          masteredSkills?: number;
          activeSynergies?: Array<{
            name: string;
            description: string;
            skills: string[];
          }>;
        };

        let output = `SKILLS: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n\n`;

        if (result.skills?.length) {
          output += `Trained Skills (${result.totalSkills ?? 0}):\n\n`;
          result.skills.forEach(skill => {
            output += `  ${skill.skillName} - ${skill.levelName} (Level ${skill.level})\n`;
            output += `    XP: ${skill.currentXP}/${skill.nextLevelXP} (${skill.progressPercent}% to next level)\n`;
            output += `    Affinity: ${skill.affinity.toFixed(2)}x learning speed\n\n`;
          });
        } else {
          output += 'No trained skills yet. This agent is ready to learn!\n\n';
        }

        if (result.activeSynergies?.length) {
          output += `\nACTIVE SYNERGIES (${result.activeSynergies.length}):\n`;
          result.activeSynergies.forEach(syn => {
            output += `  ◆ ${syn.name}\n`;
            output += `    ${syn.description}\n`;
            output += `    Skills: ${syn.skills.join(', ')}\n`;
          });
        }

        if (result.masteredSkills) {
          output += `\n${result.masteredSkills} skill(s) mastered (Level 5)`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-skill-masters',
      name: 'Find Skill Masters',
      description: 'Find the most skilled agents in a particular skill domain',
      params: [
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to search',
        },
        { name: 'minLevel', type: 'number', required: false, default: 3, description: 'Minimum skill level (1-5)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/skills/masters' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          skillName?: string;
          masters?: Array<{
            agentId: string;
            agentName: string;
            level: number;
            levelName: string;
            totalXP: number;
            signatureTask?: string;
            tasksCompleted: number;
            affinity: number;
          }>;
        };

        let output = `MASTERS OF ${result.skillName?.toUpperCase() ?? 'SKILL'}\n`;
        output += `${'='.repeat(60)}\n\n`;

        if (result.masters?.length) {
          result.masters.forEach((master, idx) => {
            output += `${idx + 1}. ${master.agentName} - ${master.levelName} (Level ${master.level})\n`;
            output += `   Total XP: ${master.totalXP} | Tasks: ${master.tasksCompleted}\n`;
            output += `   Affinity: ${master.affinity.toFixed(2)}x\n`;
            if (master.signatureTask) {
              output += `   Signature: ${master.signatureTask}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No masters found at this skill level.\n';
          output += 'Consider lowering the minimum level or encouraging skill development.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-professions',
      name: 'View Profession Distribution',
      description: 'See how professions are distributed across the village',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/professions/distribution' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalAgents?: number;
          professionCounts?: Record<string, number>;
          categories?: Record<string, {
            count: number;
            roles: string[];
          }>;
          unemployed?: number;
        };

        let output = 'PROFESSION DISTRIBUTION\n';
        output += `${'='.repeat(60)}\n\n`;

        output += `Total Agents: ${result.totalAgents ?? 0}\n`;
        output += `Unemployed: ${result.unemployed ?? 0}\n\n`;

        if (result.categories) {
          output += 'BY CATEGORY:\n';
          for (const [category, data] of Object.entries(result.categories)) {
            output += `\n${category.toUpperCase()} (${data.count}):\n`;
            data.roles.forEach(role => {
              const count = result.professionCounts?.[role] ?? 0;
              output += `  - ${role}: ${count}\n`;
            });
          }
        } else if (result.professionCounts) {
          output += 'PROFESSIONS:\n';
          for (const [profession, count] of Object.entries(result.professionCounts)) {
            output += `  ${profession}: ${count}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-skill-progress',
      name: 'Get Skill Progress',
      description: 'See detailed progression toward next level for a specific skill',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to check',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/agent/skill-progress' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          skillName?: string;
          currentLevel?: number;
          levelName?: string;
          currentXP?: number;
          nextLevelXP?: number;
          totalXP?: number;
          progressPercent?: number;
          xpNeeded?: number;
          affinity?: number;
          recentGains?: Array<{
            amount: number;
            source: string;
            tick: number;
          }>;
          canLevelUp?: boolean;
        };

        let output = `SKILL PROGRESS: ${result.agentName ?? 'Unknown'}\n`;
        output += `Skill: ${result.skillName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n\n`;

        output += `Current Level: ${result.levelName ?? 'Unknown'} (${result.currentLevel ?? 0})\n`;
        output += `Progress: ${result.currentXP ?? 0}/${result.nextLevelXP ?? 0} XP (${result.progressPercent ?? 0}%)\n`;
        output += `XP to Next Level: ${result.xpNeeded ?? 0}\n`;
        output += `Total XP Earned: ${result.totalXP ?? 0}\n`;
        output += `Learning Speed: ${result.affinity?.toFixed(2) ?? 1.0}x\n\n`;

        if (result.canLevelUp) {
          output += '✨ READY TO LEVEL UP! ✨\n\n';
        }

        if (result.recentGains?.length) {
          output += 'RECENT XP GAINS:\n';
          result.recentGains.forEach(gain => {
            output += `  +${gain.amount} XP from ${gain.source} (tick ${gain.tick})\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-apprentices',
      name: 'Find Apprentices & Mentors',
      description: 'See who is learning from masters and potential teaching relationships',
      params: [
        {
          name: 'skill', type: 'select', required: false,
          options: SKILL_OPTIONS,
          description: 'Filter by skill (optional)',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/skills/apprentices' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          relationships?: Array<{
            mentorId: string;
            mentorName: string;
            mentorLevel: number;
            apprenticeId: string;
            apprenticeName: string;
            apprenticeLevel: number;
            skill: string;
            effectiveTeaching: boolean;
            levelGap: number;
          }>;
          potentialMentors?: Array<{
            agentId: string;
            agentName: string;
            skill: string;
            level: number;
            canTeach: number; // Number of agents they could teach
          }>;
        };

        let output = 'APPRENTICESHIPS & MENTORSHIP\n';
        output += `${'='.repeat(60)}\n\n`;

        if (result.relationships?.length) {
          output += `ACTIVE RELATIONSHIPS (${result.relationships.length}):\n\n`;
          result.relationships.forEach(rel => {
            output += `  ${rel.mentorName} (L${rel.mentorLevel}) → ${rel.apprenticeName} (L${rel.apprenticeLevel})\n`;
            output += `    Skill: ${rel.skill} | Gap: ${rel.levelGap} levels\n`;
            output += `    Effective: ${rel.effectiveTeaching ? 'YES ✓' : 'NO - gap too large'}\n\n`;
          });
        } else {
          output += 'No active apprenticeships found.\n\n';
        }

        if (result.potentialMentors?.length) {
          output += `POTENTIAL MENTORS:\n\n`;
          result.potentialMentors.forEach(mentor => {
            output += `  ${mentor.agentName} - ${mentor.skill} (Level ${mentor.level})\n`;
            output += `    Can teach ${mentor.canTeach} agent(s)\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-profession-chains',
      name: 'View Profession Advancement Paths',
      description: 'See possible career progression paths and requirements',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/professions/advancement-paths' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          paths?: Array<{
            category: string;
            chain: string[];
            requirements: Record<string, {
              skills: Array<{ skill: string; level: number }>;
              experience?: number;
            }>;
          }>;
        };

        let output = 'PROFESSION ADVANCEMENT PATHS\n';
        output += `${'='.repeat(60)}\n\n`;

        if (result.paths?.length) {
          result.paths.forEach(path => {
            output += `${path.category.toUpperCase()}:\n`;
            output += `  ${path.chain.join(' → ')}\n\n`;

            Object.entries(path.requirements).forEach(([profession, req]) => {
              output += `  ${profession}:\n`;
              if (req.skills?.length) {
                output += `    Skills: ${req.skills.map(s => `${s.skill} (L${s.level})`).join(', ')}\n`;
              }
              if (req.experience) {
                output += `    Experience: ${req.experience} days\n`;
              }
            });
            output += '\n';
          });
        } else {
          output += 'No profession paths defined yet.\n';
          output += 'This feature is coming soon!';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'bless-skill-gain',
      name: 'Bless Skill Gain (Divine Inspiration)',
      description: 'Grant bonus XP to a skill through divine inspiration - a moment of sudden clarity',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to inspire' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to bless',
        },
        {
          name: 'amount', type: 'select', required: true,
          options: XP_AMOUNT_OPTIONS,
          description: 'XP amount',
        },
        { name: 'reason', type: 'string', required: false, description: 'What inspired this blessing?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} receives divine inspiration in ${params.skill} (+${params.amount} XP). They feel a sudden clarity and understanding wash over them.`
        };
      },
    }),

    defineAction({
      id: 'grant-enlightenment',
      name: 'Grant Enlightenment (Instant Level)',
      description: 'Grant instant skill level up - a moment of perfect understanding (expensive, rare)',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to enlighten' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to advance',
        },
        { name: 'reason', type: 'string', required: false, description: 'Why grant this enlightenment?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} experiences a moment of perfect enlightenment in ${params.skill}. Everything suddenly makes sense. They advance one full level instantly.`
        };
      },
    }),

    defineAction({
      id: 'reveal-talent',
      name: 'Reveal Hidden Talent',
      description: 'Reveal a hidden talent the agent didn\'t know they had (boost affinity)',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to inspire' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill talent',
        },
        { name: 'reason', type: 'string', required: false, description: 'How did you discover this talent?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} discovers they have a natural talent for ${params.skill}. Their learning speed in this skill increases significantly!`
        };
      },
    }),

    defineAction({
      id: 'assign-profession',
      name: 'Suggest Profession Change',
      description: 'Guide an agent toward a new profession or calling',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to guide' },
        { name: 'profession', type: 'string', required: true, description: 'Suggested profession' },
        { name: 'reason', type: 'string', required: false, description: 'Why this profession?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} feels drawn toward the path of ${params.profession}. They begin to consider this new calling.`
        };
      },
    }),

    defineAction({
      id: 'inspire-mastery',
      name: 'Inspire Focused Mastery',
      description: 'Boost learning speed temporarily - heightened focus and dedication',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to inspire' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to focus',
        },
        { name: 'duration', type: 'number', required: false, default: 1000, description: 'Duration in ticks (default: 1000)' },
        { name: 'multiplier', type: 'number', required: false, default: 2.0, description: 'XP multiplier (default: 2.0x)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `${params.agentId} feels a surge of motivation and focus in ${params.skill}. For the next ${params.duration} ticks, they learn ${params.multiplier}x faster!`
        };
      },
    }),

    defineAction({
      id: 'transfer-knowledge',
      name: 'Strengthen Knowledge Transfer',
      description: 'Help one agent teach another more effectively - strengthen mentorship bonds',
      params: [
        { name: 'mentorId', type: 'entity-id', required: true, entityType: 'agent', description: 'Master/teacher' },
        { name: 'apprenticeId', type: 'entity-id', required: true, entityType: 'agent', description: 'Student/apprentice' },
        {
          name: 'skill', type: 'select', required: true,
          options: SKILL_OPTIONS,
          description: 'Skill to teach',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `The bond between ${params.mentorId} and ${params.apprenticeId} strengthens. Teaching ${params.skill} becomes more effective, and both feel the connection deepen.`
        };
      },
    }),
  ],
});

capabilityRegistry.register(skillsProfessionsCapability);

/**
 * Magic Capability - Manage magic and divine power systems
 *
 * Provides admin interface for:
 * - MagicSystem (spell casting, mana, proficiency, skill trees)
 * - DivinePowerSystem (divine powers, blessings, curses, multiverse crossing)
 * - SpellRegistry (spell definitions and lookup)
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const MAGIC_SOURCE_OPTIONS = [
  { value: 'arcane', label: 'Arcane (raw mana)' },
  { value: 'divine', label: 'Divine (faith/prayer)' },
  { value: 'natural', label: 'Natural (nature/druidic)' },
  { value: 'psionic', label: 'Psionic (mental energy)' },
  { value: 'blood', label: 'Blood (life force)' },
  { value: 'shadow', label: 'Shadow (darkness)' },
  { value: 'elemental', label: 'Elemental (fire/water/earth/air)' },
];

const PARADIGM_OPTIONS = [
  { value: 'academic', label: 'Academic Magic' },
  { value: 'divine', label: 'Divine Magic' },
  { value: 'natural', label: 'Natural/Druidic' },
  { value: 'psionic', label: 'Psionic' },
  { value: 'shamanic', label: 'Shamanic' },
  { value: 'blood', label: 'Blood Magic' },
  { value: 'runic', label: 'Runic' },
  { value: 'elemental', label: 'Elemental' },
];

const DIVINE_POWER_OPTIONS = [
  { value: 'whisper', label: 'Whisper (5 belief) - Vague feeling' },
  { value: 'subtle_sign', label: 'Subtle Sign (8 belief) - Minor omen' },
  { value: 'dream_hint', label: 'Dream Hint (10 belief) - Vague dream' },
  { value: 'clear_vision', label: 'Clear Vision (50 belief) - Vivid vision' },
  { value: 'minor_miracle', label: 'Minor Miracle (100 belief) - Physical effect' },
  { value: 'bless_individual', label: 'Bless Individual (75 belief) - Grant blessing' },
  { value: 'cast_divine_spell', label: 'Cast Divine Spell - Use registered spell' },
  { value: 'universe_crossing', label: 'Universe Crossing - Cross to another universe' },
  { value: 'create_passage', label: 'Create Passage - Permanent crossing' },
  { value: 'divine_projection', label: 'Divine Projection - Send fragment' },
];

const BLESSING_TYPE_OPTIONS = [
  { value: 'protection', label: 'Protection' },
  { value: 'strength', label: 'Strength' },
  { value: 'wisdom', label: 'Wisdom' },
  { value: 'fortune', label: 'Fortune' },
  { value: 'healing', label: 'Healing' },
  { value: 'fertility', label: 'Fertility' },
];

const CURSE_TYPE_OPTIONS = [
  { value: 'weakness', label: 'Weakness' },
  { value: 'misfortune', label: 'Misfortune' },
  { value: 'disease', label: 'Disease' },
  { value: 'madness', label: 'Madness' },
  { value: 'decay', label: 'Decay' },
];

const CROSSING_METHOD_OPTIONS = [
  { value: 'presence_extension', label: 'Presence Extension (500 belief)' },
  { value: 'divine_projection', label: 'Divine Projection (1000 belief)' },
  { value: 'divine_conveyance', label: 'Divine Conveyance (300 belief)' },
  { value: 'passage_crossing', label: 'Passage Crossing (50 with passage)' },
  { value: 'worship_tunnel', label: 'Worship Tunnel (150 belief)' },
];

const PASSAGE_TYPE_OPTIONS = [
  { value: 'thread', label: 'Thread (100 belief) - Fragile' },
  { value: 'bridge', label: 'Bridge (500 belief) - Stable' },
  { value: 'gate', label: 'Gate (2000 belief) - Permanent' },
  { value: 'confluence', label: 'Confluence (5000 belief) - Massive' },
];

// ============================================================================
// Magic Capability Definition
// ============================================================================

const magicCapability = defineCapability({
  id: 'magic',
  name: 'Magic & Divinity',
  description: 'Manage magic systems, divine powers, and supernatural abilities',
  category: 'systems',

  tab: {
    icon: '✨',
    priority: 35,
  },

  queries: [
    // ========================================================================
    // Magic System Queries
    // ========================================================================
    defineQuery({
      id: 'get-magic-user-status',
      name: 'Get Magic User Status',
      description: 'Get detailed magic status for an entity (mana pools, spells, paradigms)',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Magic user entity' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entity with magic components' };
      },
      renderResult: (data: unknown) => {
        const magic = data as {
          isMagicUser?: boolean;
          paradigms?: string[];
          manaPools?: Record<string, { current: number; max: number }>;
          knownSpells?: string[];
          activeEffects?: string[];
          skillTreeProgress?: Record<string, { xp: number; unlockedNodes: number }>;
        };

        let output = 'MAGIC USER STATUS\n\n';
        output += `Magic User: ${magic.isMagicUser ? 'Yes' : 'No'}\n`;

        if (magic.paradigms?.length) {
          output += `Paradigms: ${magic.paradigms.join(', ')}\n`;
        }

        if (magic.manaPools) {
          output += '\nMana Pools:\n';
          for (const [source, pool] of Object.entries(magic.manaPools)) {
            output += `  ${source}: ${pool.current}/${pool.max}\n`;
          }
        }

        if (magic.knownSpells?.length) {
          output += `\nKnown Spells (${magic.knownSpells.length}): ${magic.knownSpells.slice(0, 10).join(', ')}${magic.knownSpells.length > 10 ? '...' : ''}\n`;
        }

        if (magic.activeEffects?.length) {
          output += `\nActive Effects: ${magic.activeEffects.join(', ')}\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'list-registered-spells',
      name: 'List Registered Spells',
      description: 'List all spells in the SpellRegistry',
      params: [
        { name: 'paradigm', type: 'select', required: false, options: PARADIGM_OPTIONS, description: 'Filter by paradigm' },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max spells to return' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/magic/spells' };
      },
      renderResult: (data: unknown) => {
        const spells = (data as { spells?: Array<{ id: string; name: string; paradigm: string; manaCost: number }> })?.spells || [];

        let output = 'REGISTERED SPELLS\n\n';
        if (spells.length === 0) {
          output += 'No spells found';
        } else {
          for (const spell of spells) {
            output += `${spell.name} (${spell.id})\n`;
            output += `  Paradigm: ${spell.paradigm}, Cost: ${spell.manaCost}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-spell-details',
      name: 'Get Spell Details',
      description: 'Get detailed information about a specific spell',
      params: [
        { name: 'spellId', type: 'string', required: true, description: 'Spell ID from registry' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/magic/spell-details' };
      },
      renderResult: (data: unknown) => {
        const spell = data as {
          id?: string;
          name?: string;
          description?: string;
          paradigm?: string;
          technique?: string;
          form?: string;
          manaCost?: number;
          castTime?: number;
          range?: number;
          duration?: number;
          effectId?: string;
        };

        let output = `SPELL: ${spell.name ?? 'Unknown'}\n\n`;
        output += `ID: ${spell.id ?? 'N/A'}\n`;
        output += `Description: ${spell.description ?? 'No description'}\n\n`;
        output += `Paradigm: ${spell.paradigm ?? 'N/A'}\n`;
        output += `Technique: ${spell.technique ?? 'N/A'}\n`;
        output += `Form: ${spell.form ?? 'N/A'}\n`;
        output += `Mana Cost: ${spell.manaCost ?? 0}\n`;
        output += `Cast Time: ${spell.castTime ?? 0} ticks\n`;
        output += `Range: ${spell.range ?? 0}\n`;
        output += `Duration: ${spell.duration ?? 0} ticks\n`;
        output += `Effect ID: ${spell.effectId ?? 'N/A'}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'get-skill-tree-progress',
      name: 'Get Skill Tree Progress',
      description: 'Get an entity\'s progress in a magic skill tree',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to query' },
        { name: 'paradigm', type: 'select', required: true, options: PARADIGM_OPTIONS, description: 'Skill tree paradigm' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/magic/skill-tree' };
      },
      renderResult: (data: unknown) => {
        const progress = data as {
          paradigm?: string;
          xp?: number;
          unlockedNodes?: string[];
          availableNodes?: string[];
          totalNodes?: number;
        };

        let output = `SKILL TREE: ${progress.paradigm ?? 'Unknown'}\n\n`;
        output += `XP: ${progress.xp ?? 0}\n`;
        output += `Progress: ${progress.unlockedNodes?.length ?? 0}/${progress.totalNodes ?? 0} nodes\n`;

        if (progress.unlockedNodes?.length) {
          output += `\nUnlocked: ${progress.unlockedNodes.join(', ')}\n`;
        }

        if (progress.availableNodes?.length) {
          output += `\nAvailable: ${progress.availableNodes.join(', ')}\n`;
        }

        return output;
      },
    }),

    // ========================================================================
    // Divine Power Queries
    // ========================================================================
    defineQuery({
      id: 'get-deity-status',
      name: 'Get Deity Status',
      description: 'Get detailed status for a deity entity (belief, powers, effects)',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/entity with deity components' };
      },
      renderResult: (data: unknown) => {
        const deity = data as {
          name?: string;
          domain?: string;
          tier?: number;
          belief?: { current: number; perTick: number };
          divineEnergy?: number;
          activeBlessings?: number;
          activeCurses?: number;
          believers?: number;
          prayerQueueSize?: number;
        };

        let output = `DEITY: ${deity.name ?? 'Unknown'}\n\n`;
        output += `Domain: ${deity.domain ?? 'Mystery'}\n`;
        output += `Tier: ${deity.tier ?? 0}\n\n`;
        output += `Belief: ${deity.belief?.current ?? 0} (+${deity.belief?.perTick ?? 0}/tick)\n`;
        output += `Divine Energy: ${deity.divineEnergy ?? 0}\n`;
        output += `Believers: ${deity.believers ?? 0}\n`;
        output += `\nActive Blessings: ${deity.activeBlessings ?? 0}\n`;
        output += `Active Curses: ${deity.activeCurses ?? 0}\n`;
        output += `Pending Prayers: ${deity.prayerQueueSize ?? 0}\n`;

        return output;
      },
    }),

    defineQuery({
      id: 'list-deity-passages',
      name: 'List Deity Passages',
      description: 'List multiverse passages owned by a deity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/divinity/passages' };
      },
      renderResult: (data: unknown) => {
        const passages = (data as { passages?: Array<{ id: string; type: string; source: string; target: string }> })?.passages || [];

        let output = 'MULTIVERSE PASSAGES\n\n';
        if (passages.length === 0) {
          output += 'No passages owned';
        } else {
          for (const p of passages) {
            output += `${p.id} (${p.type})\n`;
            output += `  ${p.source} <-> ${p.target}\n`;
          }
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-active-divine-effects',
      name: 'Get Active Divine Effects',
      description: 'List all active blessings and curses from a deity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/divinity/effects' };
      },
      renderResult: (data: unknown) => {
        const effects = data as {
          blessings?: Array<{ id: string; type: string; targetId: string; expiresAt: number }>;
          curses?: Array<{ id: string; type: string; targetId: string; expiresAt: number }>;
        };

        let output = 'ACTIVE DIVINE EFFECTS\n\n';

        if (effects.blessings?.length) {
          output += 'Blessings:\n';
          for (const b of effects.blessings) {
            output += `  ${b.type} on ${b.targetId} (expires: ${b.expiresAt})\n`;
          }
        }

        if (effects.curses?.length) {
          output += '\nCurses:\n';
          for (const c of effects.curses) {
            output += `  ${c.type} on ${c.targetId} (expires: ${c.expiresAt})\n`;
          }
        }

        if (!effects.blessings?.length && !effects.curses?.length) {
          output += 'No active effects';
        }

        return output;
      },
    }),
  ],

  actions: [
    // ========================================================================
    // Magic System Actions
    // ========================================================================
    defineAction({
      id: 'cast-spell',
      name: 'Cast Spell',
      description: 'Force an entity to cast a spell',
      params: [
        { name: 'casterId', type: 'entity-id', required: true, entityType: 'agent', description: 'Caster entity' },
        { name: 'spellId', type: 'string', required: true, description: 'Spell ID from registry' },
        { name: 'targetId', type: 'entity-id', required: false, description: 'Target entity (if targeted spell)' },
        { name: 'x', type: 'number', required: false, description: 'Target X position (if area spell)' },
        { name: 'y', type: 'number', required: false, description: 'Target Y position (if area spell)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/cast-spell' };
      },
    }),

    defineAction({
      id: 'learn-spell',
      name: 'Learn Spell',
      description: 'Teach an entity a new spell',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to teach' },
        { name: 'spellId', type: 'string', required: true, description: 'Spell ID to learn' },
        { name: 'proficiency', type: 'number', required: false, default: 0, description: 'Initial proficiency (0-100)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/learn-spell' };
      },
    }),

    defineAction({
      id: 'grant-mana',
      name: 'Grant Mana',
      description: 'Add mana to an entity\'s mana pool',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to grant mana' },
        { name: 'source', type: 'select', required: true, options: MAGIC_SOURCE_OPTIONS, description: 'Mana source/type' },
        { name: 'amount', type: 'number', required: true, description: 'Amount of mana to grant' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/grant-mana' };
      },
    }),

    defineAction({
      id: 'grant-skill-xp',
      name: 'Grant Skill Tree XP',
      description: 'Grant XP to an entity\'s magic skill tree',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to grant XP' },
        { name: 'paradigm', type: 'select', required: true, options: PARADIGM_OPTIONS, description: 'Skill tree paradigm' },
        { name: 'xpAmount', type: 'number', required: true, description: 'XP to grant' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/grant-skill-xp' };
      },
    }),

    defineAction({
      id: 'unlock-skill-node',
      name: 'Unlock Skill Node',
      description: 'Unlock a skill tree node for an entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to unlock node for' },
        { name: 'paradigm', type: 'select', required: true, options: PARADIGM_OPTIONS, description: 'Skill tree paradigm' },
        { name: 'nodeId', type: 'string', required: true, description: 'Node ID to unlock' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/unlock-skill-node' };
      },
    }),

    defineAction({
      id: 'dispel-effect',
      name: 'Dispel Effect',
      description: 'Remove a magic effect from an entity',
      params: [
        { name: 'targetId', type: 'entity-id', required: true, description: 'Entity with the effect' },
        { name: 'effectId', type: 'string', required: true, description: 'Effect instance ID to dispel' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/dispel-effect' };
      },
    }),

    defineAction({
      id: 'make-magic-user',
      name: 'Make Magic User',
      description: 'Grant magic abilities to an entity',
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to empower' },
        { name: 'paradigm', type: 'select', required: true, options: PARADIGM_OPTIONS, description: 'Primary magic paradigm' },
        { name: 'manaAmount', type: 'number', required: false, default: 100, description: 'Initial mana pool' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/make-magic-user' };
      },
    }),

    // ========================================================================
    // Divine Power Actions
    // ========================================================================
    defineAction({
      id: 'execute-divine-power',
      name: 'Execute Divine Power',
      description: 'Have a deity use a divine power',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
        { name: 'powerType', type: 'select', required: true, options: DIVINE_POWER_OPTIONS, description: 'Power to use' },
        { name: 'targetId', type: 'entity-id', required: false, description: 'Target entity (if applicable)' },
        { name: 'message', type: 'string', required: false, description: 'Message content (for whisper/vision)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/execute-divine-power' };
      },
    }),

    defineAction({
      id: 'grant-belief',
      name: 'Grant Belief',
      description: 'Add belief points to a deity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
        { name: 'amount', type: 'number', required: true, description: 'Belief to grant' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/grant-belief' };
      },
    }),

    defineAction({
      id: 'apply-blessing',
      name: 'Apply Blessing',
      description: 'Apply a divine blessing to an entity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity granting blessing' },
        { name: 'targetId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to bless' },
        { name: 'blessingType', type: 'select', required: true, options: BLESSING_TYPE_OPTIONS, description: 'Blessing type' },
        { name: 'duration', type: 'number', required: false, default: 6000, description: 'Duration in ticks (6000 = 5 min)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/apply-blessing' };
      },
    }),

    defineAction({
      id: 'apply-curse',
      name: 'Apply Curse',
      description: 'Apply a divine curse to an entity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity casting curse' },
        { name: 'targetId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to curse' },
        { name: 'curseType', type: 'select', required: true, options: CURSE_TYPE_OPTIONS, description: 'Curse type' },
        { name: 'duration', type: 'number', required: false, default: 6000, description: 'Duration in ticks (6000 = 5 min)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/apply-curse' };
      },
    }),

    defineAction({
      id: 'remove-blessing',
      name: 'Remove Blessing',
      description: 'Remove an active blessing',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity who owns the blessing' },
        { name: 'blessingId', type: 'string', required: true, description: 'Blessing instance ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/remove-blessing' };
      },
    }),

    defineAction({
      id: 'remove-curse',
      name: 'Remove Curse',
      description: 'Remove an active curse',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity who owns the curse' },
        { name: 'curseId', type: 'string', required: true, description: 'Curse instance ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/remove-curse' };
      },
    }),

    // ========================================================================
    // Multiverse Crossing Actions
    // ========================================================================
    defineAction({
      id: 'create-multiverse-passage',
      name: 'Create Multiverse Passage',
      description: 'Create a passage between universes',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity creating passage' },
        { name: 'targetUniverseId', type: 'string', required: true, description: 'Target universe ID' },
        { name: 'passageType', type: 'select', required: true, options: PASSAGE_TYPE_OPTIONS, description: 'Passage type' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/create-passage' };
      },
    }),

    defineAction({
      id: 'cross-universe',
      name: 'Cross Universe',
      description: 'Have a deity cross to another universe',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity crossing' },
        { name: 'targetUniverseId', type: 'string', required: true, description: 'Target universe ID' },
        { name: 'method', type: 'select', required: true, options: CROSSING_METHOD_OPTIONS, description: 'Crossing method' },
        { name: 'passageId', type: 'string', required: false, description: 'Passage ID (if using passage)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/cross-universe' };
      },
    }),

    // ========================================================================
    // Deity Management Actions
    // ========================================================================
    defineAction({
      id: 'promote-to-deity',
      name: 'Promote to Deity',
      description: 'Promote an entity to deity status (dev action)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'entity-id', required: true, entityType: 'agent', description: 'Entity to promote' },
        { name: 'domain', type: 'string', required: true, description: 'Primary domain (e.g., "war", "harvest", "love")' },
        { name: 'initialBelief', type: 'number', required: false, default: 100, description: 'Starting belief' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/promote-to-deity' };
      },
    }),

    defineAction({
      id: 'set-deity-domain',
      name: 'Set Deity Domain',
      description: 'Change a deity\'s primary domain',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity entity ID' },
        { name: 'domain', type: 'string', required: true, description: 'New primary domain' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/set-deity-domain' };
      },
    }),

    defineAction({
      id: 'add-believer',
      name: 'Add Believer',
      description: 'Make an entity believe in a deity',
      params: [
        { name: 'deityId', type: 'entity-id', required: true, description: 'Deity to worship' },
        { name: 'believerId', type: 'entity-id', required: true, entityType: 'agent', description: 'New believer' },
        { name: 'faith', type: 'number', required: false, default: 0.5, description: 'Initial faith (0-1)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/add-believer' };
      },
    }),
  ],
});

capabilityRegistry.register(magicCapability);

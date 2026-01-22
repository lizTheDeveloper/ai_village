/**
 * Research & Technology Capability - Manage technological progress and discoveries
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const RESEARCH_SKILL_OPTIONS = [
  { value: 'research', label: 'Research' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'farming', label: 'Farming' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'building', label: 'Building' },
  { value: 'magic', label: 'Magic' },
];

const TECH_DOMAIN_OPTIONS = [
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'construction', label: 'Construction' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'crafting', label: 'Crafting' },
  { value: 'magic', label: 'Magic' },
  { value: 'social', label: 'Social Organization' },
  { value: 'military', label: 'Military' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'metallurgy', label: 'Metallurgy' },
  { value: 'astronomy', label: 'Astronomy' },
];

const DISCOVERY_MAGNITUDE_OPTIONS = [
  { value: 'minor', label: 'Minor Insight' },
  { value: 'moderate', label: 'Moderate Breakthrough' },
  { value: 'major', label: 'Major Discovery' },
  { value: 'revolutionary', label: 'Revolutionary Paradigm Shift' },
];

const researchTechnologyCapability = defineCapability({
  id: 'research-technology',
  name: 'Research & Technology',
  description: 'Manage technological progress, discoveries, and knowledge preservation',
  category: 'systems',

  tab: {
    icon: '🔬',
    priority: 6,
  },

  queries: [
    defineQuery({
      id: 'view-tech-tree',
      name: 'View Technology Tree',
      description: 'See available and researched technologies in the current civilization',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID (default: active)' },
        { name: 'domain', type: 'select', required: false, options: TECH_DOMAIN_OPTIONS, description: 'Filter by tech domain' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/tech-tree' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          technologies?: Array<{ name: string; domain: string; researched: boolean; prerequisites: string[] }>;
          researchedCount?: number;
          availableCount?: number;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.technologies || result.technologies.length === 0) {
          return 'No technologies found. The tech tree may not be initialized yet.';
        }

        let output = `TECHNOLOGY TREE\n\n`;
        output += `Researched: ${result.researchedCount || 0} / ${result.technologies.length}\n`;
        output += `Available for Research: ${result.availableCount || 0}\n\n`;

        const byDomain: Record<string, typeof result.technologies> = {};
        for (const tech of result.technologies) {
          if (!byDomain[tech.domain]) byDomain[tech.domain] = [];
          byDomain[tech.domain].push(tech);
        }

        for (const [domain, techs] of Object.entries(byDomain)) {
          output += `${domain.toUpperCase()}:\n`;
          for (const tech of techs) {
            const status = tech.researched ? '✓' : '○';
            const prereqs = tech.prerequisites.length > 0 ? ` (requires: ${tech.prerequisites.join(', ')})` : '';
            output += `  ${status} ${tech.name}${prereqs}\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-current-research',
      name: 'View Current Research',
      description: 'See what technologies are being actively researched by agents',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/current' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          activeResearch?: Array<{
            agentId: string;
            agentName: string;
            technology: string;
            progress: number;
            estimatedCompletion?: number;
          }>;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.activeResearch || result.activeResearch.length === 0) {
          return 'No active research projects. Agents may need research skills or facilities.';
        }

        let output = `ACTIVE RESEARCH PROJECTS\n\n`;
        for (const project of result.activeResearch) {
          const progressBar = '█'.repeat(Math.floor(project.progress * 10)) + '░'.repeat(10 - Math.floor(project.progress * 10));
          output += `${project.agentName} (${project.agentId.slice(0, 8)}...)\n`;
          output += `  Technology: ${project.technology}\n`;
          output += `  Progress: [${progressBar}] ${(project.progress * 100).toFixed(1)}%\n`;
          if (project.estimatedCompletion) {
            output += `  Est. Completion: ${project.estimatedCompletion} ticks\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-discovery-history',
      name: 'Discovery History',
      description: 'View the chronological history of technological discoveries',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max discoveries to return' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          discoveries?: Array<{
            tick: number;
            agentName: string;
            technology: string;
            domain: string;
            magnitude: string;
          }>;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.discoveries || result.discoveries.length === 0) {
          return 'No discoveries yet. This civilization is in its early stages.';
        }

        let output = `DISCOVERY HISTORY\n\n`;
        for (const discovery of result.discoveries) {
          const icon = discovery.magnitude === 'revolutionary' ? '⭐' :
                       discovery.magnitude === 'major' ? '💡' :
                       discovery.magnitude === 'moderate' ? '💭' : '·';
          output += `${icon} Tick ${discovery.tick}: ${discovery.agentName} discovered ${discovery.technology}\n`;
          output += `   Domain: ${discovery.domain} | Magnitude: ${discovery.magnitude}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-research-potential',
      name: 'Research Potential',
      description: 'Identify agents with high research capability and their specializations',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
        { name: 'minSkillLevel', type: 'number', required: false, default: 2, description: 'Minimum skill level to include' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/potential' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          researchers?: Array<{
            agentId: string;
            agentName: string;
            researchSkill: number;
            specializations: Array<{ skill: string; level: number }>;
            currentlyResearching?: string;
          }>;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.researchers || result.researchers.length === 0) {
          return 'No researchers found. Consider training agents in research skills.';
        }

        let output = `RESEARCH POTENTIAL\n\n`;
        output += `Total Researchers: ${result.researchers.length}\n\n`;

        for (const researcher of result.researchers) {
          output += `${researcher.agentName} (${researcher.agentId.slice(0, 8)}...)\n`;
          output += `  Research Skill: ${researcher.researchSkill}/5\n`;
          output += `  Specializations:\n`;
          for (const spec of researcher.specializations) {
            output += `    - ${spec.skill}: ${spec.level}/5\n`;
          }
          if (researcher.currentlyResearching) {
            output += `  Currently Researching: ${researcher.currentlyResearching}\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-lost-knowledge',
      name: 'Find Lost Knowledge',
      description: 'Discover technologies that were once known but have been forgotten',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/lost-knowledge' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          lostKnowledge?: Array<{
            technology: string;
            domain: string;
            lostAt: number;
            lastKnownBy?: string;
            recoverable: boolean;
          }>;
          knowledgeLossEvents?: number;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.lostKnowledge || result.lostKnowledge.length === 0) {
          return 'No lost knowledge detected. All discovered technologies remain known.';
        }

        let output = `LOST KNOWLEDGE\n\n`;
        output += `Knowledge Loss Events: ${result.knowledgeLossEvents || 0}\n`;
        output += `Lost Technologies: ${result.lostKnowledge.length}\n\n`;

        for (const lost of result.lostKnowledge) {
          const status = lost.recoverable ? '🔓 Recoverable' : '🔒 Permanently Lost';
          output += `${lost.technology} (${lost.domain})\n`;
          output += `  Lost at Tick: ${lost.lostAt}\n`;
          if (lost.lastKnownBy) {
            output += `  Last Known By: ${lost.lastKnownBy}\n`;
          }
          output += `  Status: ${status}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-innovation-hotspots',
      name: 'Innovation Hotspots',
      description: 'Identify locations and communities where discoveries are most likely',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/research/hotspots' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          hotspots?: Array<{
            location: { x: number; y: number };
            buildingType?: string;
            researcherCount: number;
            recentDiscoveries: number;
            innovationScore: number;
            dominantDomain?: string;
          }>;
          error?: string;
        };

        if (result.error) return `Error: ${result.error}`;
        if (!result.hotspots || result.hotspots.length === 0) {
          return 'No innovation hotspots identified yet. Research infrastructure may be needed.';
        }

        let output = `INNOVATION HOTSPOTS\n\n`;
        for (const hotspot of result.hotspots) {
          const intensity = hotspot.innovationScore > 80 ? '🔥' :
                           hotspot.innovationScore > 50 ? '✨' : '💫';
          output += `${intensity} Location (${hotspot.location.x}, ${hotspot.location.y})\n`;
          if (hotspot.buildingType) {
            output += `  Building: ${hotspot.buildingType}\n`;
          }
          output += `  Researchers: ${hotspot.researcherCount}\n`;
          output += `  Recent Discoveries: ${hotspot.recentDiscoveries}\n`;
          output += `  Innovation Score: ${hotspot.innovationScore}/100\n`;
          if (hotspot.dominantDomain) {
            output += `  Dominant Domain: ${hotspot.dominantDomain}\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'inspire-discovery',
      name: 'Inspire Discovery',
      description: 'Plant the seeds of a specific discovery in an agent\'s mind',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to inspire' },
        { name: 'technology', type: 'string', required: true, description: 'Technology to inspire (e.g., "irrigation", "bronze working")' },
        { name: 'domain', type: 'select', required: true, options: TECH_DOMAIN_OPTIONS, description: 'Technology domain' },
        { name: 'subtlety', type: 'number', required: false, default: 5, description: 'How subtle (1=obvious dream, 10=vague intuition)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/inspire-discovery' };
      },
    }),

    defineAction({
      id: 'grant-eureka',
      name: 'Grant Eureka Moment',
      description: 'Instant breakthrough - very expensive divine power cost',
      dangerous: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to grant eureka' },
        { name: 'technology', type: 'string', required: true, description: 'Technology to instantly discover' },
        { name: 'domain', type: 'select', required: true, options: TECH_DOMAIN_OPTIONS, description: 'Technology domain' },
        { name: 'magnitude', type: 'select', required: false, default: 'moderate', options: DISCOVERY_MAGNITUDE_OPTIONS, description: 'Discovery magnitude' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/grant-eureka' };
      },
    }),

    defineAction({
      id: 'reveal-ancient-knowledge',
      name: 'Reveal Ancient Knowledge',
      description: 'Unlock a lost technology from forgotten times',
      params: [
        { name: 'technology', type: 'string', required: true, description: 'Lost technology to reveal' },
        { name: 'revealTo', type: 'entity-id', required: false, entityType: 'agent', description: 'Specific agent to reveal to (or civilization-wide if omitted)' },
        { name: 'method', type: 'select', required: false, default: 'ruins',
          options: [
            { value: 'ruins', label: 'Ancient Ruins Discovery' },
            { value: 'vision', label: 'Divine Vision' },
            { value: 'artifact', label: 'Mystical Artifact' },
            { value: 'ancestor', label: 'Ancestral Spirit' },
          ],
          description: 'Method of revelation'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/reveal-ancient-knowledge' };
      },
    }),

    defineAction({
      id: 'guide-research',
      name: 'Guide Research Direction',
      description: 'Subtly guide research toward a specific technology',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Researcher to guide' },
        { name: 'targetTechnology', type: 'string', required: true, description: 'Target technology' },
        { name: 'guidanceStrength', type: 'number', required: false, default: 5, description: 'How strongly to guide (1-10)' },
        { name: 'method', type: 'select', required: false, default: 'synchronicity',
          options: [
            { value: 'synchronicity', label: 'Meaningful Coincidences' },
            { value: 'dreams', label: 'Prophetic Dreams' },
            { value: 'curiosity', label: 'Heightened Curiosity' },
            { value: 'mentorship', label: 'Chance Mentorship' },
          ],
          description: 'Guidance method'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/guide-research' };
      },
    }),

    defineAction({
      id: 'preserve-knowledge',
      name: 'Preserve Knowledge',
      description: 'Protect specific knowledge from being lost',
      params: [
        { name: 'technology', type: 'string', required: true, description: 'Technology to preserve' },
        { name: 'duration', type: 'number', required: false, default: 10000, description: 'Protection duration in ticks (0 = permanent)' },
        { name: 'method', type: 'select', required: false, default: 'tradition',
          options: [
            { value: 'tradition', label: 'Oral Tradition' },
            { value: 'monument', label: 'Monumental Inscription' },
            { value: 'ritual', label: 'Sacred Ritual' },
            { value: 'library', label: 'Library Archive' },
          ],
          description: 'Preservation method'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/preserve-knowledge' };
      },
    }),

    defineAction({
      id: 'spark-collaboration',
      name: 'Spark Research Collaboration',
      description: 'Inspire multiple agents to work together on a research project',
      params: [
        { name: 'agentIds', type: 'string', required: true, description: 'Comma-separated agent IDs (e.g., "id1,id2,id3")' },
        { name: 'technology', type: 'string', required: true, description: 'Research goal' },
        { name: 'domain', type: 'select', required: true, options: TECH_DOMAIN_OPTIONS, description: 'Technology domain' },
        { name: 'synergy', type: 'number', required: false, default: 1.5, description: 'Collaboration bonus multiplier (1.0-3.0)' },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/actions/spark-collaboration' };
      },
    }),
  ],
});

capabilityRegistry.register(researchTechnologyCapability);

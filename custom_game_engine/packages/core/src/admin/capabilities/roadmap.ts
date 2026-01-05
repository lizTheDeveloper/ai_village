/**
 * Roadmap Capability - View project roadmap and progress
 */

import { capabilityRegistry, defineCapability, defineQuery, defineLink } from '../CapabilityRegistry.js';
import * as fs from 'fs';
import * as path from 'path';

// Path to MASTER_ROADMAP.md (relative to project root)
const ROADMAP_PATH = path.resolve(process.cwd(), '../MASTER_ROADMAP.md');

interface RoadmapPhase {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'planned';
  tasks: {
    name: string;
    status: 'done' | 'in-progress' | 'todo';
  }[];
  progress: number; // 0-100
}

/**
 * Parse MASTER_ROADMAP.md and extract phases/tasks
 */
function parseRoadmap(): { phases: RoadmapPhase[], raw: string } | { error: string } {
  try {
    if (!fs.existsSync(ROADMAP_PATH)) {
      return { error: `Roadmap file not found: ${ROADMAP_PATH}` };
    }

    const content = fs.readFileSync(ROADMAP_PATH, 'utf-8');
    const phases: RoadmapPhase[] = [];

    // Simple parsing - look for ## Phase headers and - [ ] / - [x] tasks
    const lines = content.split('\n');
    let currentPhase: RoadmapPhase | null = null;

    for (const line of lines) {
      // Phase header: ## Phase 1: Name or ### Phase 1: Name
      const phaseMatch = line.match(/^#{2,3}\s+Phase\s+(\d+):\s*(.+)/i);
      if (phaseMatch) {
        if (currentPhase) {
          // Calculate progress
          const doneTasks = currentPhase.tasks.filter(t => t.status === 'done').length;
          currentPhase.progress = currentPhase.tasks.length > 0
            ? Math.round((doneTasks / currentPhase.tasks.length) * 100)
            : 0;

          currentPhase.status = currentPhase.progress === 100 ? 'completed'
            : currentPhase.progress > 0 ? 'in-progress' : 'planned';

          phases.push(currentPhase);
        }

        currentPhase = {
          id: `phase-${phaseMatch[1] ?? ''}`,
          name: (phaseMatch[2] ?? '').trim(),
          status: 'planned',
          tasks: [],
          progress: 0,
        };
        continue;
      }

      // Task: - [ ] Name or - [x] Name
      if (currentPhase) {
        const taskMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(.+)/);
        if (taskMatch) {
          const isDone = (taskMatch[1] ?? '').toLowerCase() === 'x';
          currentPhase.tasks.push({
            name: (taskMatch[2] ?? '').trim(),
            status: isDone ? 'done' : 'todo',
          });
        }
      }
    }

    // Don't forget the last phase
    if (currentPhase) {
      const doneTasks = currentPhase.tasks.filter(t => t.status === 'done').length;
      currentPhase.progress = currentPhase.tasks.length > 0
        ? Math.round((doneTasks / currentPhase.tasks.length) * 100)
        : 0;

      currentPhase.status = currentPhase.progress === 100 ? 'completed'
        : currentPhase.progress > 0 ? 'in-progress' : 'planned';

      phases.push(currentPhase);
    }

    return { phases, raw: content };
  } catch (error) {
    return { error: `Failed to parse roadmap: ${error}` };
  }
}

const roadmapCapability = defineCapability({
  id: 'roadmap',
  name: 'Roadmap',
  description: 'View project roadmap, phases, and progress',
  category: 'overview',

  tab: {
    icon: '🗺️',
    priority: 2,
  },

  queries: [
    defineQuery({
      id: 'get-roadmap',
      name: 'Get Roadmap',
      description: 'Parse and display the project roadmap with progress',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = parseRoadmap();
        if ('error' in result) {
          return { error: result.error };
        }

        // Calculate overall progress
        const totalTasks = result.phases.reduce((sum, p) => sum + p.tasks.length, 0);
        const doneTasks = result.phases.reduce(
          (sum, p) => sum + p.tasks.filter(t => t.status === 'done').length,
          0
        );
        const overallProgress = totalTasks > 0
          ? Math.round((doneTasks / totalTasks) * 100)
          : 0;

        return {
          overallProgress,
          totalTasks,
          doneTasks,
          phases: result.phases,
        };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          overallProgress: number;
          totalTasks: number;
          doneTasks: number;
          phases: RoadmapPhase[];
          error?: string;
        };

        if (result.error) {
          return `Error: ${result.error}`;
        }

        let output = `ROADMAP PROGRESS: ${result.overallProgress}% (${result.doneTasks}/${result.totalTasks} tasks)\n\n`;

        for (const phase of result.phases) {
          const statusIcon = phase.status === 'completed' ? '✅'
            : phase.status === 'in-progress' ? '🔄' : '⏳';

          output += `${statusIcon} ${phase.name} [${phase.progress}%]\n`;

          for (const task of phase.tasks) {
            const taskIcon = task.status === 'done' ? '[x]' : '[ ]';
            output += `   ${taskIcon} ${task.name}\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-roadmap-raw',
      name: 'Get Raw Roadmap',
      description: 'Get the raw MASTER_ROADMAP.md content',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = parseRoadmap();
        if ('error' in result) {
          return { error: result.error };
        }
        return { content: result.raw };
      },
    }),
  ],

  links: [
    defineLink({
      id: 'view-roadmap-file',
      name: 'View Roadmap File',
      description: 'Open MASTER_ROADMAP.md in GitHub',
      url: 'https://github.com/your-org/ai-village/blob/main/MASTER_ROADMAP.md',
      icon: '📄',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(roadmapCapability);

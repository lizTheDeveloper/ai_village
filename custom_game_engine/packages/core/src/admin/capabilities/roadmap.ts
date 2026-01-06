/**
 * Roadmap Capability - View project roadmap, progress, and manage development pipelines
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction, defineLink } from '../CapabilityRegistry.js';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

// Path to MASTER_ROADMAP.md (relative to project root)
const ROADMAP_PATH = path.resolve(process.cwd(), '../MASTER_ROADMAP.md');
const WORK_ORDERS_PATH = path.resolve(process.cwd(), 'agents/autonomous-dev/work-orders');

// Claude Code pipeline management
let claudeCodeProcess: ChildProcess | null = null;
let pipelineStatus: 'idle' | 'running' | 'stopping' = 'idle';
let currentWorkOrder: string | null = null;

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

/**
 * List available work orders
 */
function listWorkOrders(): { workOrders: string[], error?: string } {
  try {
    if (!fs.existsSync(WORK_ORDERS_PATH)) {
      return { workOrders: [], error: `Work orders directory not found: ${WORK_ORDERS_PATH}` };
    }

    const entries = fs.readdirSync(WORK_ORDERS_PATH, { withFileTypes: true });
    const workOrders = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map(e => e.name)
      .sort();

    return { workOrders };
  } catch (error) {
    return { workOrders: [], error: `Failed to list work orders: ${error}` };
  }
}

/**
 * Get work order details
 */
function getWorkOrderDetails(workOrderName: string): any {
  try {
    const workOrderPath = path.join(WORK_ORDERS_PATH, workOrderName);

    if (!fs.existsSync(workOrderPath)) {
      return { error: `Work order not found: ${workOrderName}` };
    }

    // Read work-order.md if it exists
    const workOrderFile = path.join(workOrderPath, 'work-order.md');
    const hasWorkOrder = fs.existsSync(workOrderFile);
    const content = hasWorkOrder ? fs.readFileSync(workOrderFile, 'utf-8') : '';

    // Count files in work order directory
    const files = fs.readdirSync(workOrderPath);
    const implementationFiles = files.filter(f => f.includes('implementation') || f.includes('ATTEMPT')).length;
    const testFiles = files.filter(f => f.includes('test')).length;

    return {
      name: workOrderName,
      hasWorkOrder,
      fileCount: files.length,
      implementationFiles,
      testFiles,
      content: content.substring(0, 500), // First 500 chars
    };
  } catch (error) {
    return { error: `Failed to read work order: ${error}` };
  }
}

/**
 * Start Claude Code pipeline on a work order
 */
function startClaudeCodePipeline(workOrderName: string): { success: boolean; message: string } {
  if (pipelineStatus === 'running') {
    return {
      success: false,
      message: `Pipeline already running on work order: ${currentWorkOrder}`,
    };
  }

  if (!workOrderName) {
    return { success: false, message: 'Work order name required' };
  }

  const workOrderPath = path.join(WORK_ORDERS_PATH, workOrderName);
  if (!fs.existsSync(workOrderPath)) {
    return { success: false, message: `Work order not found: ${workOrderName}` };
  }

  try {
    // Start Claude Code process
    // NOTE: This is a placeholder - actual Claude Code integration would go here
    // For now, just set the status
    pipelineStatus = 'running';
    currentWorkOrder = workOrderName;

    console.log(`[Roadmap] Claude Code pipeline started for: ${workOrderName}`);

    return {
      success: true,
      message: `Pipeline started for work order: ${workOrderName}`,
    };
  } catch (error) {
    pipelineStatus = 'idle';
    currentWorkOrder = null;
    return {
      success: false,
      message: `Failed to start pipeline: ${error}`,
    };
  }
}

/**
 * Stop Claude Code pipeline
 */
function stopClaudeCodePipeline(): { success: boolean; message: string } {
  if (pipelineStatus !== 'running') {
    return { success: false, message: 'No pipeline currently running' };
  }

  try {
    pipelineStatus = 'stopping';

    if (claudeCodeProcess) {
      claudeCodeProcess.kill('SIGTERM');
      claudeCodeProcess = null;
    }

    pipelineStatus = 'idle';
    const stoppedWorkOrder = currentWorkOrder;
    currentWorkOrder = null;

    console.log(`[Roadmap] Claude Code pipeline stopped for: ${stoppedWorkOrder}`);

    return {
      success: true,
      message: `Pipeline stopped for: ${stoppedWorkOrder}`,
    };
  } catch (error) {
    pipelineStatus = 'idle';
    currentWorkOrder = null;
    return {
      success: false,
      message: `Failed to stop pipeline: ${error}`,
    };
  }
}

/**
 * Get pipeline status
 */
function getPipelineStatus(): any {
  return {
    status: pipelineStatus,
    workOrder: currentWorkOrder,
    timestamp: Date.now(),
  };
}

const roadmapCapability = defineCapability({
  id: 'roadmap',
  name: 'Roadmap & Pipelines',
  description: 'View project roadmap, manage work orders, and control Claude Code development pipelines',
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

    defineQuery({
      id: 'list-work-orders',
      name: 'Work Orders',
      description: 'List all available work orders in the autonomous-dev directory',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        const result = listWorkOrders();
        return {
          workOrders: result.workOrders,
          count: result.workOrders.length,
          error: result.error,
        };
      },
    }),

    defineQuery({
      id: 'pipeline-status',
      name: 'Pipeline Status',
      description: 'Get current Claude Code pipeline status',
      params: [],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return getPipelineStatus();
      },
    }),

    defineQuery({
      id: 'get-work-order',
      name: 'Get Work Order Details',
      description: 'Get details about a specific work order',
      params: [
        {
          name: 'workOrder',
          type: 'string',
          description: 'Work order name',
          required: true,
        },
      ],
      requiresGame: false,
      handler: async (params, gameClient, context) => {
        return getWorkOrderDetails(params.workOrder as string);
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'start-pipeline',
      name: 'Start Claude Code Pipeline',
      description: 'Start automated Claude Code agent on a work order',
      params: [
        {
          name: 'workOrder',
          type: 'string',
          description: 'Work order name (from work orders list)',
          required: true,
        },
      ],
      dangerous: false,
      handler: async (params, gameClient, context) => {
        const result = startClaudeCodePipeline(params.workOrder as string);
        return result;
      },
    }),

    defineAction({
      id: 'stop-pipeline',
      name: 'Stop Claude Code Pipeline',
      description: 'Stop the currently running Claude Code pipeline',
      params: [],
      dangerous: false,
      handler: async (params, gameClient, context) => {
        const result = stopClaudeCodePipeline();
        return result;
      },
    }),
  ],

  links: [
    defineLink({
      id: 'view-roadmap-file',
      name: 'View Roadmap File',
      description: 'Open MASTER_ROADMAP.md locally',
      url: 'file:///Users/annhoward/src/ai_village/MASTER_ROADMAP.md',
      icon: '📄',
      embeddable: false,
    }),
    defineLink({
      id: 'view-work-orders',
      name: 'Browse Work Orders',
      description: 'View work orders directory in file browser',
      url: 'file:///Users/annhoward/src/ai_village/custom_game_engine/agents/autonomous-dev/work-orders',
      icon: '📁',
      embeddable: false,
    }),
  ],
});

capabilityRegistry.register(roadmapCapability);

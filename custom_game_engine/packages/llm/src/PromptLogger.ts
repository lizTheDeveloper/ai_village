/**
 * PromptLogger - Captures LLM prompt/response pairs for analysis
 *
 * Stores logs in memory, accessible via window.promptLogger for
 * Playwright/Claude to read and analyze.
 */

export interface PromptLogEntry {
  timestamp: number;
  agentId: string;
  agentName?: string;
  instruction: string;
  thinking?: string;
  speaking?: string;
  action?: unknown;
  actionType?: string;
  durationMs?: number;
}

export interface PromptAnalysis {
  totalDecisions: number;
  actionDistribution: Record<string, number>;
  instructionToAction: Record<string, Record<string, number>>;
  agentBehavior: Record<string, {
    totalDecisions: number;
    lastActions: string[];
    hasBuilt: boolean;
  }>;
  issues: string[];
  recentDecisions: Array<{
    agent: string;
    instruction: string;
    action: string;
    thinking?: string;
  }>;
}

/**
 * Singleton logger accessible via window.promptLogger
 */
export class PromptLogger {
  private static instance: PromptLogger | null = null;
  private entries: PromptLogEntry[] = [];
  private enabled: boolean = true;
  private maxEntries: number = 200;

  private constructor() {}

  static getInstance(): PromptLogger {
    if (!PromptLogger.instance) {
      PromptLogger.instance = new PromptLogger();
    }
    return PromptLogger.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log a prompt/response pair
   */
  log(data: {
    agentId: string;
    agentName?: string;
    prompt: string;
    response: string;
    parsedAction?: unknown;
    thinking?: string;
    speaking?: string;
    durationMs?: number;
  }): void {
    if (!this.enabled) return;

    // Extract instruction line from prompt
    const instructionMatch = data.prompt.match(/(⚡[^\n]+|You're (?:cold|hungry|exhausted)[^\n]+|Village has[^\n]+|The village has[^\n]+|What does[^\n]+|Need more[^\n]+|There's a[^\n]+|You see[^\n]+)/m);
    const instruction: string = (instructionMatch && instructionMatch[1]) ? instructionMatch[1] : 'unknown';

    // Get action type
    let actionType = 'unknown';
    if (data.parsedAction) {
      if (typeof data.parsedAction === 'string') {
        actionType = data.parsedAction;
      } else if (typeof data.parsedAction === 'object' && data.parsedAction !== null) {
        // Type guard: check if object has 'type' property
        if ('type' in data.parsedAction && typeof data.parsedAction.type === 'string') {
          actionType = data.parsedAction.type;
        }
      }
    }

    const entry: PromptLogEntry = {
      timestamp: Date.now(),
      agentId: data.agentId,
      agentName: data.agentName,
      instruction,
      thinking: data.thinking?.substring(0, 200),
      speaking: data.speaking,
      action: data.parsedAction,
      actionType,
      durationMs: data.durationMs,
    };

    this.entries.push(entry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

  }

  /**
   * Get full analysis - called by Playwright/Claude
   */
  analyze(): PromptAnalysis {
    const actionDistribution: Record<string, number> = {};
    const instructionToAction: Record<string, Record<string, number>> = {};
    const agentActions: Record<string, string[]> = {};

    for (const entry of this.entries) {
      const actionType = entry.actionType || 'unknown';

      // Count actions
      actionDistribution[actionType] = (actionDistribution[actionType] || 0) + 1;

      // Track instruction → action patterns
      const instrKey = this.categorizeInstruction(entry.instruction);
      if (!instructionToAction[instrKey]) {
        instructionToAction[instrKey] = {};
      }
      instructionToAction[instrKey][actionType] = (instructionToAction[instrKey][actionType] || 0) + 1;

      // Track per-agent actions
      const name = entry.agentName || entry.agentId.substring(0, 8);
      if (!agentActions[name]) {
        agentActions[name] = [];
      }
      agentActions[name].push(actionType);
    }

    // Build agent behavior summary
    const agentBehavior: PromptAnalysis['agentBehavior'] = {};
    for (const [agent, actions] of Object.entries(agentActions)) {
      agentBehavior[agent] = {
        totalDecisions: actions.length,
        lastActions: actions.slice(-5),
        hasBuilt: actions.some(a => a === 'plan_build' || a === 'build' || a === 'set_priorities'),
      };
    }

    // Detect issues
    const issues: string[] = [];

    // No building actions?
    const totalBuilds = (actionDistribution['plan_build'] || 0) + (actionDistribution['build'] || 0);
    if (this.entries.length > 5 && totalBuilds === 0) {
      issues.push(`No building actions in ${this.entries.length} decisions`);
    }

    // Agents stuck?
    for (const [agent, data] of Object.entries(agentBehavior)) {
      if (data.lastActions.length >= 5 && new Set(data.lastActions).size === 1) {
        issues.push(`${agent} stuck on "${data.lastActions[0]}"`);
      }
    }

    // Instruction mismatches?
    for (const [instr, actions] of Object.entries(instructionToAction)) {
      const total = Object.values(actions).reduce((a, b) => a + b, 0);
      const topAction = Object.entries(actions).sort((a, b) => b[1] - a[1])[0];

      // Check if "no_workbench" leads to "plan_build"
      if (instr === 'no_workbench' && topAction && topAction[0] !== 'plan_build') {
        issues.push(`"no_workbench" instruction leads to "${topAction[0]}" not "plan_build"`);
      }

      // Check if "has_materials" leads to building
      if (instr === 'has_materials') {
        const buildActions = (actions['plan_build'] || 0) + (actions['set_priorities'] || 0);
        if (buildActions < total * 0.3) {
          issues.push(`"has_materials" instruction rarely leads to building (${buildActions}/${total})`);
        }
      }
    }

    // Recent decisions
    const recentDecisions = this.entries.slice(-10).map(e => ({
      agent: e.agentName || e.agentId.substring(0, 8),
      instruction: e.instruction.substring(0, 60),
      action: e.actionType || 'unknown',
      thinking: e.thinking?.substring(0, 100),
    }));

    return {
      totalDecisions: this.entries.length,
      actionDistribution,
      instructionToAction,
      agentBehavior,
      issues,
      recentDecisions,
    };
  }

  private categorizeInstruction(instruction: string): string {
    if (instruction.includes('No workbench') || instruction.includes('⚡ No workbench')) {
      return 'no_workbench';
    }
    if (instruction.includes('Food is running low') || instruction.includes('⚡ Food')) {
      return 'food_low';
    }
    if (instruction.includes("You're cold")) {
      return 'cold';
    }
    if (instruction.includes("You're hungry")) {
      return 'hungry';
    }
    if (instruction.includes("You're exhausted")) {
      return 'tired';
    }
    if (instruction.includes('Village has') || instruction.includes('plenty of materials')) {
      return 'has_materials';
    }
    if (instruction.includes('Need more wood')) {
      return 'need_resources';
    }
    if (instruction.includes('conversation') || instruction.includes('You see')) {
      return 'social';
    }
    return 'other';
  }

  /**
   * Get raw entries
   */
  getEntries(): PromptLogEntry[] {
    return [...this.entries];
  }

  /**
   * Get recent entries
   */
  getRecent(n: number = 10): PromptLogEntry[] {
    return this.entries.slice(-n);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Pretty print analysis to console (deprecated - use analyze() for data)
   */
  print(): void {
    // No-op: console output disabled
    // Use analyze() to get the data programmatically
  }
}

export const promptLogger = PromptLogger.getInstance();

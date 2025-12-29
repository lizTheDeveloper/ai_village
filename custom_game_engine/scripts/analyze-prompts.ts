#!/usr/bin/env npx ts-node
/**
 * Analyze Prompts Script
 *
 * This script provides utilities for analyzing prompt/response logs.
 * Can be run standalone or imported for custom analysis.
 *
 * Usage:
 *   npx ts-node scripts/analyze-prompts.ts [logfile.json]
 *
 * Or from browser console during gameplay:
 *   window.promptLogger.printSummary()
 *   window.promptLogger.getRecentEntries(10)
 *   window.promptLogger.exportReport()
 */

import * as fs from 'fs';
import * as path from 'path';

interface PromptLogEntry {
  timestamp: number;
  agentId: string;
  agentName?: string;
  prompt: string;
  response: string;
  parsedAction?: unknown;
  thinking?: string;
  speaking?: string;
  durationMs?: number;
}

/**
 * Analyze action distribution
 */
function analyzeActions(entries: PromptLogEntry[]): void {
  const actionCounts: Record<string, number> = {};
  const actionsByAgent: Record<string, Record<string, number>> = {};

  for (const entry of entries) {
    const agentName = entry.agentName || entry.agentId.substring(0, 8);

    if (!actionsByAgent[agentName]) {
      actionsByAgent[agentName] = {};
    }

    if (entry.parsedAction) {
      const action = entry.parsedAction as { type?: string } | string;
      const actionType = typeof action === 'string'
        ? action
        : (action.type || 'unknown');

      actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
      actionsByAgent[agentName][actionType] = (actionsByAgent[agentName][actionType] || 0) + 1;
    }
  }

  console.log('\n📊 ACTION DISTRIBUTION');
  console.log('='.repeat(50));

  const sorted = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
  for (const [action, count] of sorted) {
    const pct = ((count / entries.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.ceil(count / entries.length * 30));
    console.log(`  ${action.padEnd(20)} ${String(count).padStart(4)} (${pct.padStart(5)}%) ${bar}`);
  }

  console.log('\n📊 ACTIONS BY AGENT');
  console.log('='.repeat(50));

  for (const [agent, actions] of Object.entries(actionsByAgent)) {
    console.log(`\n  ${agent}:`);
    const agentSorted = Object.entries(actions).sort((a, b) => b[1] - a[1]);
    for (const [action, count] of agentSorted.slice(0, 5)) {
      console.log(`    ${action}: ${count}`);
    }
  }
}

/**
 * Analyze instruction → action patterns
 */
function analyzePatterns(entries: PromptLogEntry[]): void {
  console.log('\n🔍 INSTRUCTION → ACTION PATTERNS');
  console.log('='.repeat(50));

  const patterns: Record<string, { actions: Record<string, number>; count: number }> = {};

  for (const entry of entries) {
    // Extract instruction type from prompt
    let instructionType = 'unknown';

    if (entry.prompt.includes('⚡ No workbench')) {
      instructionType = 'no_workbench';
    } else if (entry.prompt.includes('⚡ Food is running low')) {
      instructionType = 'food_low_strategic';
    } else if (entry.prompt.includes("You're cold")) {
      instructionType = 'cold';
    } else if (entry.prompt.includes("You're hungry")) {
      instructionType = 'hungry';
    } else if (entry.prompt.includes("You're exhausted")) {
      instructionType = 'exhausted';
    } else if (entry.prompt.includes('Village has') && entry.prompt.includes('wood')) {
      instructionType = 'has_materials';
    } else if (entry.prompt.includes('Need more wood')) {
      instructionType = 'need_resources';
    } else if (entry.prompt.includes('conversation')) {
      instructionType = 'social';
    }

    if (!patterns[instructionType]) {
      patterns[instructionType] = { actions: {}, count: 0 };
    }
    patterns[instructionType].count++;

    if (entry.parsedAction) {
      const action = entry.parsedAction as { type?: string } | string;
      const actionType = typeof action === 'string'
        ? action
        : (action.type || 'unknown');
      patterns[instructionType].actions[actionType] = (patterns[instructionType].actions[actionType] || 0) + 1;
    }
  }

  for (const [instruction, data] of Object.entries(patterns)) {
    console.log(`\n  ${instruction} (${data.count} occurrences):`);
    const sorted = Object.entries(data.actions).sort((a, b) => b[1] - a[1]);
    for (const [action, count] of sorted.slice(0, 3)) {
      const pct = ((count / data.count) * 100).toFixed(0);
      console.log(`    → ${action}: ${count} (${pct}%)`);
    }
  }
}

/**
 * Analyze thinking patterns
 */
function analyzeThinking(entries: PromptLogEntry[]): void {
  console.log('\n💭 THINKING SAMPLES');
  console.log('='.repeat(50));

  // Get unique thinking patterns
  const thinkingByAction: Record<string, string[]> = {};

  for (const entry of entries) {
    if (entry.thinking && entry.parsedAction) {
      const action = entry.parsedAction as { type?: string } | string;
      const actionType = typeof action === 'string'
        ? action
        : (action.type || 'unknown');

      if (!thinkingByAction[actionType]) {
        thinkingByAction[actionType] = [];
      }

      if (thinkingByAction[actionType].length < 3) {
        thinkingByAction[actionType].push(entry.thinking.substring(0, 100));
      }
    }
  }

  for (const [action, thoughts] of Object.entries(thinkingByAction)) {
    console.log(`\n  ${action}:`);
    for (const thought of thoughts) {
      console.log(`    "${thought}${thought.length >= 100 ? '...' : ''}"`);
    }
  }
}

/**
 * Check for issues
 */
function checkIssues(entries: PromptLogEntry[]): void {
  console.log('\n⚠️  POTENTIAL ISSUES');
  console.log('='.repeat(50));

  // Check for agents stuck on same action
  const agentActionHistory: Record<string, string[]> = {};

  for (const entry of entries) {
    const agent = entry.agentName || entry.agentId.substring(0, 8);

    if (!agentActionHistory[agent]) {
      agentActionHistory[agent] = [];
    }

    if (entry.parsedAction) {
      const action = entry.parsedAction as { type?: string } | string;
      const actionType = typeof action === 'string'
        ? action
        : (action.type || 'unknown');
      agentActionHistory[agent].push(actionType);
    }
  }

  for (const [agent, actions] of Object.entries(agentActionHistory)) {
    // Check for repetition
    if (actions.length >= 5) {
      const last5 = actions.slice(-5);
      const unique = new Set(last5);
      if (unique.size === 1) {
        console.log(`  ⚠️  ${agent} stuck on "${last5[0]}" (last 5 actions identical)`);
      }
    }

    // Check for no building actions
    const hasBuildAction = actions.some(a => a === 'plan_build' || a === 'build');
    if (actions.length >= 10 && !hasBuildAction) {
      console.log(`  📦 ${agent} hasn't tried to build anything in ${actions.length} actions`);
    }
  }

  // Check for unparseable responses
  const unparseable = entries.filter(e => !e.parsedAction);
  if (unparseable.length > 0) {
    console.log(`  ⚠️  ${unparseable.length} responses couldn't be parsed as JSON`);
  }
}

/**
 * Main analysis function
 */
function analyze(entries: PromptLogEntry[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 PROMPT/RESPONSE ANALYSIS');
  console.log('='.repeat(60));
  console.log(`Total Entries: ${entries.length}`);

  const uniqueAgents = new Set(entries.map(e => e.agentName || e.agentId));
  console.log(`Unique Agents: ${uniqueAgents.size}`);

  const avgDuration = entries
    .filter(e => e.durationMs)
    .reduce((sum, e) => sum + (e.durationMs || 0), 0) / entries.filter(e => e.durationMs).length;
  console.log(`Avg Response Time: ${avgDuration.toFixed(0)}ms`);

  analyzeActions(entries);
  analyzePatterns(entries);
  analyzeThinking(entries);
  checkIssues(entries);

  console.log('\n' + '='.repeat(60) + '\n');
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npx ts-node scripts/analyze-prompts.ts [logfile.json]

Or from browser console during gameplay:
  window.promptLogger.printSummary()
  window.promptLogger.getRecentEntries(10)
  window.promptLogger.exportJSON()
  copy(window.promptLogger.exportJSON())  // Copy to clipboard
    `);
    process.exit(0);
  }

  const logFile = args[0];
  const fullPath = path.resolve(logFile);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const entries: PromptLogEntry[] = JSON.parse(content);
    analyze(entries);
  } catch (error) {
    console.error('Error parsing log file:', error);
    process.exit(1);
  }
}

export { analyze, analyzeActions, analyzePatterns, analyzeThinking, checkIssues };

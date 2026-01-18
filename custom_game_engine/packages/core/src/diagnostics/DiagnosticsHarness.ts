/**
 * DiagnosticsHarness - Systematic detection of invalid property/method access
 *
 * Wraps objects with Proxy to catch:
 * - Accessing undefined properties
 * - Calling undefined methods
 * - Type mismatches
 * - Invalid component access patterns
 *
 * Enable with: DIAGNOSTICS_MODE=true in environment or via DevPanel
 */

export interface DiagnosticIssue {
  id: string;
  timestamp: number;
  tick: number;
  type: 'undefined_property' | 'undefined_method' | 'type_mismatch' | 'invalid_component' | 'performance_warning';
  severity: 'error' | 'warning' | 'info';
  objectType: string;  // 'Entity', 'Component', 'World', etc.
  objectId?: string;
  property: string;
  stackTrace: string;
  context?: Record<string, any>;
  count: number;  // How many times this exact issue occurred
}

// Extend Window interface for diagnostics flag
interface WindowWithDiagnostics extends Window {
  __DIAGNOSTICS_ENABLED__?: boolean;
}

export class DiagnosticsHarness {
  private static instance: DiagnosticsHarness | null = null;
  private enabled: boolean = false;
  private issues: Map<string, DiagnosticIssue> = new Map();
  private issuesByType: Map<string, Set<string>> = new Map();
  private suppressedPatterns: Set<string> = new Set();
  private currentTick: number = 0;

  private constructor() {
    // Check environment variables (Node.js/tests) or window flag (browser)
    const envEnabled = typeof process !== 'undefined' && process.env?.DIAGNOSTICS_MODE === 'true';
    const windowEnabled = typeof window !== 'undefined' && (window as WindowWithDiagnostics).__DIAGNOSTICS_ENABLED__;
    this.enabled = envEnabled || windowEnabled || false;
  }

  static getInstance(): DiagnosticsHarness {
    if (!DiagnosticsHarness.instance) {
      DiagnosticsHarness.instance = new DiagnosticsHarness();
    }
    return DiagnosticsHarness.instance;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      (window as WindowWithDiagnostics).__DIAGNOSTICS_ENABLED__ = enabled;
    }
    console.log(`[DiagnosticsHarness] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setCurrentTick(tick: number): void {
    this.currentTick = tick;
  }

  /**
   * Suppress specific patterns from being reported (e.g., known safe undefined checks)
   */
  suppressPattern(pattern: string): void {
    this.suppressedPatterns.add(pattern);
  }

  /**
   * Report an issue - deduplicates by generating consistent hash
   */
  reportIssue(issue: Omit<DiagnosticIssue, 'id' | 'timestamp' | 'count' | 'tick'>): void {
    if (!this.enabled) return;

    // Generate stable hash from issue details (excluding stack trace for better deduplication)
    const issueKey = `${issue.type}:${issue.objectType}:${issue.property}:${issue.objectId || 'global'}`;

    // Check if suppressed
    for (const pattern of this.suppressedPatterns) {
      if (issueKey.includes(pattern)) return;
    }

    const existing = this.issues.get(issueKey);
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
      existing.tick = this.currentTick;
    } else {
      const newIssue: DiagnosticIssue = {
        id: issueKey,
        timestamp: Date.now(),
        tick: this.currentTick,
        count: 1,
        ...issue
      };
      this.issues.set(issueKey, newIssue);

      // Index by type
      if (!this.issuesByType.has(issue.type)) {
        this.issuesByType.set(issue.type, new Set());
      }
      this.issuesByType.get(issue.type)!.add(issueKey);

      // Log immediately for errors
      if (issue.severity === 'error') {
        console.error(`[DiagnosticsHarness] ${issue.type}:`, {
          objectType: issue.objectType,
          property: issue.property,
          objectId: issue.objectId,
          stack: issue.stackTrace.split('\n').slice(0, 5).join('\n')
        });
      }
    }
  }

  /**
   * Get all issues, optionally filtered
   */
  getIssues(filter?: {
    type?: DiagnosticIssue['type'];
    severity?: DiagnosticIssue['severity'];
    objectType?: string;
    minCount?: number;
  }): DiagnosticIssue[] {
    let results = Array.from(this.issues.values());

    if (filter) {
      if (filter.type) results = results.filter(i => i.type === filter.type);
      if (filter.severity) results = results.filter(i => i.severity === filter.severity);
      if (filter.objectType) results = results.filter(i => i.objectType === filter.objectType);
      if (filter.minCount !== undefined) {
        const minCount = filter.minCount;
        results = results.filter(i => i.count >= minCount);
      }
    }

    return results.sort((a, b) => b.count - a.count);  // Most frequent first
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalIssues: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topIssues: DiagnosticIssue[];
  } {
    const issues = Array.from(this.issues.values());
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const issue of issues) {
      byType[issue.type] = (byType[issue.type] || 0) + issue.count;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + issue.count;
    }

    return {
      totalIssues: issues.length,
      byType,
      bySeverity,
      topIssues: issues.sort((a, b) => b.count - a.count).slice(0, 20)
    };
  }

  /**
   * Clear all tracked issues
   */
  clear(): void {
    this.issues.clear();
    this.issuesByType.clear();
    console.log('[DiagnosticsHarness] Cleared all issues');
  }

  /**
   * Export issues as JSON for external analysis
   */
  export(): string {
    return JSON.stringify({
      exportTime: Date.now(),
      currentTick: this.currentTick,
      summary: this.getSummary(),
      issues: Array.from(this.issues.values())
    }, null, 2);
  }
}

/**
 * Helper to capture clean stack traces
 */
export function captureStackTrace(): string {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');
  // Remove Error line and this function from stack
  return lines.slice(3).join('\n');
}

/**
 * Global accessor
 */
export const diagnosticsHarness = DiagnosticsHarness.getInstance();

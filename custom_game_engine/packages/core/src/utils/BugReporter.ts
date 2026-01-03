// Browser-compatible bug reporter
// Only uses Node.js APIs when running in Node.js environment

export interface BugReport {
  id: string;
  timestamp: string;
  category: 'corrupted_data' | 'validation_failure' | 'system_error' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  entityId?: string;
  entityType?: string;
  error: string;
  details: Record<string, unknown>;
  stackTrace?: string;
}

// Check if running in Node.js
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Lazy-load Node.js modules only when needed
let fs: typeof import('fs') | null = null;
let path: typeof import('path') | null = null;

async function ensureNodeModules(): Promise<void> {
  if (!isNode) return;
  if (!fs) fs = await import('fs');
  if (!path) path = await import('path');
}

export class BugReporter {
  private static get bugReportsDir(): string {
    if (!isNode || !path) return '';
    return path.join(process.cwd(), 'bug-reports', 'active');
  }

  private static get resolvedDir(): string {
    if (!isNode || !path) return '';
    return path.join(process.cwd(), 'bug-reports', 'resolved');
  }

  /**
   * Ensure bug reports directories exist
   */
  private static ensureDirectories(): void {
    if (!isNode || !fs) return;
    if (!fs.existsSync(this.bugReportsDir)) {
      fs.mkdirSync(this.bugReportsDir, { recursive: true });
    }
    if (!fs.existsSync(this.resolvedDir)) {
      fs.mkdirSync(this.resolvedDir, { recursive: true });
    }
  }

  /**
   * Generate unique bug report ID
   */
  private static generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `bug-${timestamp}-${random}`;
  }

  /**
   * File a bug report for corrupted or invalid data
   */
  public static fileBugReport(options: {
    category: BugReport['category'];
    severity: BugReport['severity'];
    component: string;
    entityId?: string;
    entityType?: string;
    error: string;
    details?: Record<string, unknown>;
    stackTrace?: string;
  }): string {
    const bugReport: BugReport = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      category: options.category,
      severity: options.severity,
      component: options.component,
      entityId: options.entityId,
      entityType: options.entityType,
      error: options.error,
      details: options.details || {},
      stackTrace: options.stackTrace
    };

    // In browser, just log to console
    if (!isNode || !fs || !path) {
      console.error('[BugReporter]', bugReport);
      return bugReport.id;
    }

    this.ensureDirectories();
    const filename = `${bugReport.id}.json`;
    const filepath = path.join(this.bugReportsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(bugReport, null, 2), 'utf-8');

    return bugReport.id;
  }

  /**
   * File a bug report for a corrupted plant entity
   */
  public static reportCorruptedPlant(options: {
    entityId: string;
    reason: string;
    plantData?: Record<string, unknown>;
    stackTrace?: string;
  }): string {
    return this.fileBugReport({
      category: 'corrupted_data',
      severity: 'high',
      component: 'PlantSystem',
      entityId: options.entityId,
      entityType: 'plant',
      error: `Corrupted plant entity: ${options.reason}`,
      details: {
        reason: options.reason,
        plantData: options.plantData
      },
      stackTrace: options.stackTrace
    });
  }

  /**
   * File a bug report for a validation failure
   */
  public static reportValidationFailure(options: {
    component: string;
    entityId?: string;
    entityType?: string;
    error: string;
    details?: Record<string, unknown>;
  }): string {
    return this.fileBugReport({
      category: 'validation_failure',
      severity: 'medium',
      component: options.component,
      entityId: options.entityId,
      entityType: options.entityType,
      error: options.error,
      details: options.details
    });
  }

  /**
   * Move a bug report to resolved
   */
  public static resolveBugReport(bugId: string): void {
    if (!isNode || !fs || !path) return;

    const activeFile = path.join(this.bugReportsDir, `${bugId}.json`);
    const resolvedFile = path.join(this.resolvedDir, `${bugId}.json`);

    if (fs.existsSync(activeFile)) {
      fs.renameSync(activeFile, resolvedFile);
    }
  }

  /**
   * Get all active bug reports
   */
  public static getActiveBugReports(): BugReport[] {
    if (!isNode || !fs || !path) return [];

    this.ensureDirectories();

    const files = fs.readdirSync(this.bugReportsDir);
    const reports: BugReport[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = path.join(this.bugReportsDir, file);
        const content = fs.readFileSync(filepath, 'utf-8');
        reports.push(JSON.parse(content));
      }
    }

    return reports.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get summary of active bugs by category
   */
  public static getSummary(): Record<string, number> {
    const reports = this.getActiveBugReports();
    const summary: Record<string, number> = {};

    for (const report of reports) {
      const key = `${report.category}_${report.severity}`;
      summary[key] = (summary[key] || 0) + 1;
    }

    return summary;
  }
}

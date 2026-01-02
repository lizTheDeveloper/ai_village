import * as fs from 'fs';
import * as path from 'path';

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

export class BugReporter {
  private static bugReportsDir = path.join(process.cwd(), 'bug-reports', 'active');
  private static resolvedDir = path.join(process.cwd(), 'bug-reports', 'resolved');

  /**
   * Ensure bug reports directories exist
   */
  private static ensureDirectories(): void {
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
    this.ensureDirectories();

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

/**
 * LLM Request File Logger
 *
 * Logs all LLM prompts and responses to disk for evaluation and analysis.
 * Creates JSONL files (one JSON object per line) for easy processing.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LLMRequestLog {
  timestamp: number;
  requestId: string;
  sessionId: string;
  agentId: string;
  provider: string;
  model: string;

  // Request
  prompt: string;
  maxTokens?: number;
  temperature?: number;

  // Response
  responseText: string;
  thinking?: string;  // Extracted from <think> tags
  speaking?: string;  // Content outside <think> tags

  // Metadata
  inputTokens?: number;
  outputTokens?: number;
  costUSD?: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

export class LLMRequestFileLogger {
  private logDir: string;
  private currentLogFile: string;
  private writeQueue: LLMRequestLog[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private enabled: boolean = true;
  private isBrowser: boolean;

  constructor(logDir: string = 'logs/llm-prompts') {
    this.logDir = logDir;

    // Detect browser environment
    this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (this.isBrowser) {
      // Disable file logging in browser
      this.enabled = false;
      this.currentLogFile = '';
      return;
    }

    this.ensureLogDir();
    this.currentLogFile = this.getLogFilePath();

    // Flush queue every 5 seconds
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFilePath(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `llm-prompts-${dateStr}.jsonl`);
  }

  /**
   * Log an LLM request/response pair
   */
  log(entry: LLMRequestLog): void {
    if (!this.enabled || this.isBrowser) return;

    // Add to queue
    this.writeQueue.push(entry);

    // If queue is large, flush immediately
    if (this.writeQueue.length >= 10) {
      this.flush();
    }
  }

  /**
   * Flush pending logs to disk
   */
  private flush(): void {
    if (this.isBrowser || this.writeQueue.length === 0) return;

    try {
      // Check if we need a new log file (date changed)
      const expectedLogFile = this.getLogFilePath();
      if (expectedLogFile !== this.currentLogFile) {
        this.currentLogFile = expectedLogFile;
      }

      // Write all queued entries as JSONL (one JSON object per line)
      const lines = this.writeQueue.map(entry => JSON.stringify(entry)).join('\n') + '\n';

      fs.appendFileSync(this.currentLogFile, lines, 'utf8');

      console.log(`[LLMRequestFileLogger] Flushed ${this.writeQueue.length} entries to ${this.currentLogFile}`);

      // Clear queue
      this.writeQueue = [];
    } catch (error) {
      console.error('[LLMRequestFileLogger] Failed to flush logs:', error);
    }
  }

  /**
   * Manually flush and cleanup
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      console.log('[LLMRequestFileLogger] Logging enabled');
    } else {
      console.log('[LLMRequestFileLogger] Logging disabled');
      this.flush(); // Flush any pending entries
    }
  }

  /**
   * Get stats about logged requests
   */
  async getStats(date?: string): Promise<{
    totalRequests: number;
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    totalTokens: number;
    totalCost: number;
    avgDurationMs: number;
  }> {
    // Return empty stats in browser
    if (this.isBrowser) {
      return {
        totalRequests: 0,
        byProvider: {},
        byModel: {},
        totalTokens: 0,
        totalCost: 0,
        avgDurationMs: 0,
      };
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `llm-prompts-${targetDate}.jsonl`);

    if (!fs.existsSync(logFile)) {
      return {
        totalRequests: 0,
        byProvider: {},
        byModel: {},
        totalTokens: 0,
        totalCost: 0,
        avgDurationMs: 0,
      };
    }

    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    const entries: LLMRequestLog[] = lines.filter(l => l).map(line => JSON.parse(line));

    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalTokens = 0;
    let totalCost = 0;
    let totalDuration = 0;

    for (const entry of entries) {
      byProvider[entry.provider] = (byProvider[entry.provider] || 0) + 1;
      byModel[entry.model] = (byModel[entry.model] || 0) + 1;

      if (entry.inputTokens) totalTokens += entry.inputTokens;
      if (entry.outputTokens) totalTokens += entry.outputTokens;
      if (entry.costUSD) totalCost += entry.costUSD;
      totalDuration += entry.durationMs;
    }

    return {
      totalRequests: entries.length,
      byProvider,
      byModel,
      totalTokens,
      totalCost,
      avgDurationMs: entries.length > 0 ? totalDuration / entries.length : 0,
    };
  }
}

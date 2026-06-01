import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import { ConfigManager } from '../config';
import { Logger } from './logger';

/**
 * Privacy-compliant telemetry system for usage analytics
 * Collects anonymized usage data to improve the extension
 */

export interface TelemetryEvent {
  eventName: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
  timestamp: Date;
  sessionId: string;
  userId?: string; // Anonymous hash
}

export interface TelemetryConfig {
  enabled: boolean;
  endpoint?: string;
  flushIntervalMs: number;
  maxBatchSize: number;
  enableConsoleLogging: boolean;
}

export interface UsageMetrics {
  commandExecutions: Record<string, number>;
  featureUsage: Record<string, number>;
  errorCounts: Record<string, number>;
  performanceMetrics: Record<string, number[]>;
  sessionDuration: number;
  specCount: number;
  taskCount: number;
}

type TelemetryContext = Record<string, unknown>;
type TelemetryDecoratorTarget = { constructor: { name: string } };

/**
 * Privacy-compliant telemetry collector
 */
export class TelemetryCollector {
  private static instance: TelemetryCollector;
  private logger = Logger.for('Telemetry');
  private config = ConfigManager.getInstance();
  private sessionId: string;
  private userId?: string;
  private eventQueue: TelemetryEvent[] = [];
  private metrics: UsageMetrics;
  private sessionStartTime: Date;
  private flushTimer?: NodeJS.Timeout;
  private isEnabled = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.metrics = this.initializeMetrics();
    this.checkTelemetrySettings();
  }

  public static getInstance(): TelemetryCollector {
    if (!TelemetryCollector.instance) {
      TelemetryCollector.instance = new TelemetryCollector();
    }
    return TelemetryCollector.instance;
  }

  /**
   * Initialize the telemetry system
   */
  public async initialize(context: vscode.ExtensionContext): Promise<void> {
    try {
      // Generate or retrieve anonymous user ID
      this.userId = await this.getOrCreateUserId(context);

      // Set up periodic flushing
      this.setupPeriodicFlush();

      // Track session start
      this.trackEvent('session.started', {
        extensionVersion: context.extension.packageJSON.version,
        vscodeVersion: vscode.version,
        platform: process.platform,
        arch: process.arch,
      });

      this.logger.info('Telemetry system initialized', {
        enabled: this.isEnabled,
        sessionId: this.sessionId,
      });
    } catch (error) {
      this.logger.error('Failed to initialize telemetry', error as Error);
    }
  }

  /**
   * Track a telemetry event
   */
  public trackEvent(
    eventName: string,
    properties?: Record<string, string | number | boolean>,
    measurements?: Record<string, number>
  ): void {
    if (!this.isEnabled) {
      return;
    }

    const event: TelemetryEvent = {
      eventName,
      properties: this.sanitizeProperties(properties),
      measurements,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.eventQueue.push(event);

    // Update metrics
    this.updateMetrics(eventName, properties, measurements);

    // Log in development mode
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`Telemetry: ${eventName}`, event);
    }

    // Flush if queue is full
    if (this.eventQueue.length >= 50) {
      this.flush();
    }
  }

  /**
   * Track command execution
   */
  public trackCommand(commandName: string, executionTime?: number): void {
    this.trackEvent(
      'command.executed',
      {
        commandName,
      },
      executionTime ? { executionTime } : undefined
    );
  }

  /**
   * Track feature usage
   */
  public trackFeature(featureName: string, context?: TelemetryContext): void {
    this.trackEvent('feature.used', {
      featureName,
      ...this.sanitizeProperties(context),
    });
  }

  /**
   * Track error occurrence
   */
  public trackError(errorType: string, errorMessage?: string, context?: TelemetryContext): void {
    this.trackEvent('error.occurred', {
      errorType,
      errorMessage: this.sanitizeErrorMessage(errorMessage),
      ...this.sanitizeProperties(context),
    });
  }

  /**
   * Track performance metric
   */
  public trackPerformance(metricName: string, value: number, context?: TelemetryContext): void {
    this.trackEvent(
      'performance.measured',
      {
        metricName,
        ...this.sanitizeProperties(context),
      },
      { value }
    );
  }

  /**
   * Track user action
   */
  public trackUserAction(action: string, target?: string, context?: TelemetryContext): void {
    const properties: Record<string, string | number | boolean> = {
      action,
      ...this.sanitizeProperties(context),
    };

    if (target) {
      properties.target = target;
    }

    this.trackEvent('user.action', properties);
  }

  /**
   * Track workspace statistics
   */
  public trackWorkspaceStats(stats: {
    specCount: number;
    taskCount: number;
    completedTasks: number;
    branchCount?: number;
    workspaceSize?: number;
  }): void {
    this.trackEvent('workspace.stats', {}, stats);

    // Update metrics
    this.metrics.specCount = stats.specCount;
    this.metrics.taskCount = stats.taskCount;
  }

  /**
   * Get current session metrics
   */
  public getSessionMetrics(): UsageMetrics {
    this.metrics.sessionDuration = Date.now() - this.sessionStartTime.getTime();
    return { ...this.metrics };
  }

  /**
   * Flush pending events
   */
  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // For now, just log the events (could be sent to analytics service)
      this.logger.info(`Flushing ${events.length} telemetry events`);

      // In a real implementation, this would send to an analytics service
      // await this.sendToAnalyticsService(events);

      // For privacy compliance, we only log aggregated data
      this.logAggregatedMetrics(events);
    } catch (error) {
      this.logger.error('Failed to flush telemetry events', error as Error);

      // Re-queue events for retry (up to a limit)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * Dispose telemetry system
   */
  public async dispose(): Promise<void> {
    // Track session end
    this.trackEvent('session.ended', {
      sessionDuration: Date.now() - this.sessionStartTime.getTime(),
    });

    // Flush remaining events
    await this.flush();

    // Clear timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.logger.info('Telemetry system disposed');
  }

  /**
   * Check telemetry settings and update enabled state
   */
  private checkTelemetrySettings(): void {
    this.isEnabled = this.config.getTelemetryEnabled() && vscode.env.isTelemetryEnabled;

    if (!this.isEnabled) {
      this.logger.info('Telemetry disabled by user settings or VS Code');
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${randomUUID()}`;
  }

  /**
   * Get or create anonymous user ID
   */
  private async getOrCreateUserId(context: vscode.ExtensionContext): Promise<string> {
    const storageKey = 'gofer.telemetry.userId';
    let userId = context.globalState.get<string>(storageKey);

    if (!userId) {
      // Create anonymous hash based on machine ID
      const machineId = vscode.env.machineId;
      userId = this.hashString(machineId).substr(0, 16);
      await context.globalState.update(storageKey, userId);
    }

    return userId;
  }

  /**
   * Simple hash function for anonymization
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): UsageMetrics {
    return {
      commandExecutions: {},
      featureUsage: {},
      errorCounts: {},
      performanceMetrics: {},
      sessionDuration: 0,
      specCount: 0,
      taskCount: 0,
    };
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(
    eventName: string,
    properties?: TelemetryContext,
    measurements?: Record<string, number>
  ): void {
    if (eventName === 'command.executed' && properties?.commandName) {
      const command = String(properties.commandName);
      this.metrics.commandExecutions[command] = (this.metrics.commandExecutions[command] || 0) + 1;
    }

    if (eventName === 'feature.used' && properties?.featureName) {
      const feature = String(properties.featureName);
      this.metrics.featureUsage[feature] = (this.metrics.featureUsage[feature] || 0) + 1;
    }

    if (eventName === 'error.occurred' && properties?.errorType) {
      const errorType = String(properties.errorType);
      this.metrics.errorCounts[errorType] = (this.metrics.errorCounts[errorType] || 0) + 1;
    }

    if (eventName === 'performance.measured' && properties?.metricName && measurements?.value) {
      const metric = String(properties.metricName);
      if (!this.metrics.performanceMetrics[metric]) {
        this.metrics.performanceMetrics[metric] = [];
      }
      this.metrics.performanceMetrics[metric].push(measurements.value);
    }
  }

  /**
   * Sanitize properties to remove sensitive data
   */
  private sanitizeProperties(
    properties?: TelemetryContext
  ): Record<string, string | number | boolean> | undefined {
    if (!properties) {
      return undefined;
    }

    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        continue;
      }

      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else {
        sanitized[key] = String(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if a key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /key/i,
      /secret/i,
      /auth/i,
      /credential/i,
      /email/i,
      /username/i,
      /path/i, // File paths might contain user info
    ];

    return sensitivePatterns.some((pattern) => pattern.test(key));
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(value: string): string {
    // Remove file paths
    const pathPattern = /[A-Za-z]:[\\\/][^\\\/\s]*|\/[^\/\s]+/g;
    let sanitized = value.replace(pathPattern, '[PATH]');

    // Remove email addresses
    const emailPattern = /\S+@\S+\.\S+/g;
    sanitized = sanitized.replace(emailPattern, '[EMAIL]');

    // Remove URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    sanitized = sanitized.replace(urlPattern, '[URL]');

    // Truncate long strings
    if (sanitized.length > 100) {
      sanitized = sanitized.substr(0, 100) + '...';
    }

    return sanitized;
  }

  /**
   * Sanitize error messages
   */
  private sanitizeErrorMessage(message?: string): string {
    if (!message) {
      return 'No message';
    }

    return this.sanitizeString(message);
  }

  /**
   * Setup periodic flushing
   */
  private setupPeriodicFlush(): void {
    const flushInterval = 5 * 60 * 1000; // 5 minutes

    this.flushTimer = setInterval(() => {
      this.flush();
    }, flushInterval);
  }

  /**
   * Log aggregated metrics for privacy compliance
   */
  private logAggregatedMetrics(events: TelemetryEvent[]): void {
    const eventCounts: Record<string, number> = {};

    for (const event of events) {
      eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
    }

    this.logger.info('Telemetry summary', {
      totalEvents: events.length,
      eventTypes: Object.keys(eventCounts).length,
      sessionId: this.sessionId,
      eventCounts,
    });
  }
}

/**
 * Convenience functions for common telemetry operations
 */

/**
 * Initialize telemetry system
 */
export async function initializeTelemetry(context: vscode.ExtensionContext): Promise<void> {
  const telemetry = TelemetryCollector.getInstance();
  await telemetry.initialize(context);

  // Set up disposal
  context.subscriptions.push({
    dispose: () => telemetry.dispose(),
  });
}

/**
 * Track command execution with timing
 */
export function trackCommandWithTiming<T>(commandName: string, fn: () => Promise<T>): Promise<T> {
  const startTime = performance.now();
  const telemetry = TelemetryCollector.getInstance();

  return fn().then(
    (result) => {
      const executionTime = performance.now() - startTime;
      telemetry.trackCommand(commandName, executionTime);
      return result;
    },
    (error) => {
      const executionTime = performance.now() - startTime;
      telemetry.trackCommand(commandName, executionTime);
      telemetry.trackError('command_failed', error.message, { commandName });
      throw error;
    }
  );
}

/**
 * Track feature usage with context
 */
export function trackFeatureUsage(featureName: string, context?: TelemetryContext): void {
  const telemetry = TelemetryCollector.getInstance();
  telemetry.trackFeature(featureName, context);
}

/**
 * Track user interactions
 */
export function trackUserInteraction(
  action: string,
  target?: string,
  context?: TelemetryContext
): void {
  const telemetry = TelemetryCollector.getInstance();
  telemetry.trackUserAction(action, target, context);
}

/**
 * Decorator for automatic command tracking
 */
export function withTelemetry(commandName?: string) {
  return function (
    target: TelemetryDecoratorTarget,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const name = commandName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: unknown[]) {
      return trackCommandWithTiming(name, () => method.apply(this, args));
    };

    return descriptor;
  };
}

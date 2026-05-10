/**
 * Logger Service
 *
 * Centralized logging service for error, warning, and info messages.
 * Replaces silent error handlers throughout the codebase.
 *
 * Usage:
 * ```typescript
 * import { container } from 'tsyringe';
 * import { Logger } from './services/Logger';
 *
 * const logger = container.resolve(Logger);
 * logger.error('ExtensionActivation', new Error('Failed'), { attemptNumber: 1 });
 * ```
 */

import { injectable } from 'tsyringe';
import * as vscode from 'vscode';

/**
 * Log level for filtering messages
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

/**
 * Metadata type for additional context in log messages
 */
export type LogMetadata = Record<string, unknown>;

/**
 * Logger service for centralized error and warning handling
 */
@injectable()
export class Logger {
  private outputChannel: vscode.OutputChannel | undefined;
  private minLogLevel: LogLevel = LogLevel.INFO;

  /**
   * Initialize the logger with an output channel
   *
   * @param outputChannel - VSCode output channel for displaying logs
   */
  public initialize(outputChannel: vscode.OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  /**
   * Set minimum log level for filtering
   *
   * @param level - Minimum level to log
   */
  public setMinLogLevel(level: LogLevel): void {
    this.minLogLevel = level;
  }

  /**
   * Log an error message
   *
   * @param context - Context where the error occurred (module name, operation)
   * @param error - Error object
   * @param metadata - Optional additional metadata
   */
  public error(context: string, error: Error, metadata?: LogMetadata): void {
    this.log(LogLevel.ERROR, context, error.message, metadata, error);
  }

  /**
   * Log a warning message
   *
   * @param context - Context for the warning
   * @param message - Warning message
   * @param metadata - Optional additional metadata
   */
  public warn(context: string, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.WARN, context, message, metadata);
  }

  /**
   * Log an info message
   *
   * @param context - Context for the info
   * @param message - Info message
   * @param metadata - Optional additional metadata
   */
  public info(context: string, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.INFO, context, message, metadata);
  }

  /**
   * Log a debug message
   *
   * @param context - Context for the debug
   * @param message - Debug message
   * @param metadata - Optional additional metadata
   */
  public debug(context: string, message: string, metadata?: LogMetadata): void {
    this.log(LogLevel.DEBUG, context, message, metadata);
  }

  /**
   * Internal log method
   *
   * @param level - Log level
   * @param context - Context where the log occurred
   * @param message - Log message
   * @param metadata - Optional additional metadata
   * @param error - Optional error object for stack trace
   */
  private log(
    level: LogLevel,
    context: string,
    message: string,
    metadata?: LogMetadata,
    error?: Error
  ): void {
    // Filter based on minimum log level
    if (!this.shouldLog(level)) {
      return;
    }

    // Format log message
    const timestamp = new Date().toISOString();
    const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    const stackTrace = error?.stack ? `\n${error.stack}` : '';
    const logMessage = `[${timestamp}] [${level}][${context}] ${message}${metadataStr}${stackTrace}`;

    // Write to output channel if available
    if (this.outputChannel) {
      this.outputChannel.appendLine(logMessage);

      // Show output channel for errors
      if (level === LogLevel.ERROR) {
        this.outputChannel.show(true); // true = preserve focus
      }
    } else {
      // Fallback to console if output channel not initialized
    }
  }

  /**
   * Check if a log level should be logged based on minimum level
   *
   * @param level - Level to check
   * @returns Whether the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minIndex = levels.indexOf(this.minLogLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }
}

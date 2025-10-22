import * as vscode from 'vscode';
import { ConfigManager } from '../config.js';

/**
 * Logging levels in order of severity
 */
export enum LogLevel {
  debug = 0,
  info = 1,
  warn = 2,
  error = 3,
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

/**
 * Logger interface for different output channels
 */
export interface LoggerOutput {
  write(entry: LogEntry): void;
  dispose?(): void;
}

/**
 * VSCode output channel logger
 */
export class OutputChannelLogger implements LoggerOutput {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  write(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = Object.keys(LogLevel)[entry.level].padEnd(5);
    const component = entry.component.padEnd(15);
    
    let message = `[${timestamp}] ${level} ${component} ${entry.message}`;
    
    if (entry.data) {
      message += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
    }
    
    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`;
      }
    }

    this.outputChannel.appendLine(message);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

/**
 * Console logger for development
 */
export class ConsoleLogger implements LoggerOutput {
  write(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const component = `[${entry.component}]`;
    
    const args: any[] = [`${timestamp} ${component} ${entry.message}`];
    
    if (entry.data) {
      args.push('\nData:', entry.data);
    }
    
    if (entry.error) {
      args.push('\nError:', entry.error);
    }

    switch (entry.level) {
      case LogLevel.debug:
        console.debug(...args);
        break;
      case LogLevel.info:
        console.log(...args);
        break;
      case LogLevel.warn:
        console.warn(...args);
        break;
      case LogLevel.error:
        console.error(...args);
        break;
    }
  }
}

/**
 * File logger for persistent logging
 */
export class FileLogger implements LoggerOutput {
  private filePath: string;
  private writeQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  write(entry: LogEntry): void {
    this.writeQueue.push(entry);
    if (!this.isWriting) {
      this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;

    try {
      const fs = require('fs/promises');
      const path = require('path');
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      const entries = this.writeQueue.splice(0);
      const lines = entries.map(entry => {
        const timestamp = entry.timestamp.toISOString();
        const level = Object.keys(LogLevel)[entry.level];
        const component = entry.component;
        
        let line = `${timestamp} [${level}] [${component}] ${entry.message}`;
        
        if (entry.data) {
          line += ` | Data: ${JSON.stringify(entry.data)}`;
        }
        
        if (entry.error) {
          line += ` | Error: ${entry.error.message}`;
          if (entry.error.stack) {
            line += ` | Stack: ${entry.error.stack.replace(/\n/g, ' | ')}`;
          }
        }
        
        return line;
      });

      await fs.appendFile(this.filePath, lines.join('\n') + '\n');
    } catch (error) {
      console.error('Failed to write log file:', error);
    } finally {
      this.isWriting = false;
      
      // Process any entries that arrived while writing
      if (this.writeQueue.length > 0) {
        setImmediate(() => this.flushQueue());
      }
    }
  }

  dispose(): void {
    if (this.writeQueue.length > 0) {
      this.flushQueue();
    }
  }
}

/**
 * Main logger class with multiple outputs and filtering
 */
export class Logger {
  private static instance: Logger;
  private outputs: LoggerOutput[] = [];
  private minLevel: LogLevel = LogLevel.info;
  private component: string;

  private constructor(component: string = 'Unknown') {
    this.component = component;
  }

  public static getInstance(component: string = 'SpecGofer'): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(component);
    }
    return Logger.instance;
  }

  /**
   * Create a logger for a specific component
   */
  public static for(component: string): Logger {
    const logger = new Logger(component);
    logger.outputs = [...Logger.instance.outputs];
    logger.minLevel = Logger.instance.minLevel;
    return logger;
  }

  /**
   * Add an output channel
   */
  public addOutput(output: LoggerOutput): void {
    this.outputs.push(output);
  }

  /**
   * Remove an output channel
   */
  public removeOutput(output: LoggerOutput): void {
    const index = this.outputs.indexOf(output);
    if (index >= 0) {
      this.outputs.splice(index, 1);
    }
  }

  /**
   * Set minimum log level
   */
  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Log a debug message
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.debug, message, data);
  }

  /**
   * Log an info message
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.info, message, data);
  }

  /**
   * Log a warning message
   */
  public warn(message: string, data?: any, error?: Error): void {
    this.log(LogLevel.warn, message, data, error);
  }

  /**
   * Log an error message
   */
  public error(message: string, error?: Error, data?: any): void {
    this.log(LogLevel.error, message, data, error);
  }

  /**
   * Log an exception with full context
   */
  public exception(error: Error, context?: string, data?: any): void {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.log(LogLevel.error, message, data, error);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      data,
      error,
    };

    for (const output of this.outputs) {
      try {
        output.write(entry);
      } catch (outputError) {
        console.error('Logger output failed:', outputError);
      }
    }
  }

  /**
   * Dispose all outputs
   */
  public dispose(): void {
    for (const output of this.outputs) {
      if (output.dispose) {
        output.dispose();
      }
    }
    this.outputs = [];
  }
}

/**
 * Initialize logging for the extension
 */
export function initializeLogging(context: vscode.ExtensionContext): Logger {
  const logger = Logger.getInstance('SpecGofer');
  
  // Add output channel for user visibility
  const outputChannel = new OutputChannelLogger('SpecGofer - Enterprise AI');
  logger.addOutput(outputChannel);
  
  // Add console logging in development
  if (process.env.NODE_ENV === 'development') {
    logger.addOutput(new ConsoleLogger());
    logger.setLevel(LogLevel.debug);
  }
  
  // Add file logging for diagnostics
  const config = ConfigManager.getInstance();
  if (config.getTelemetryEnabled()) {
    const path = require('path');
    const logPath = path.join(context.globalStorageUri.fsPath, 'logs', 'specgofer.log');
    const fileLogger = new FileLogger(logPath);
    logger.addOutput(fileLogger);
    
    // Clean up on dispose
    context.subscriptions.push({
      dispose: () => fileLogger.dispose()
    });
  }
  
  // Clean up on dispose
  context.subscriptions.push({
    dispose: () => logger.dispose()
  });
  
  logger.info('Logging initialized');
  return logger;
}

/**
 * Create a performance timer
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(operation: string, logger: Logger) {
    this.operation = operation;
    this.logger = logger;
    this.startTime = performance.now();
    this.logger.debug(`Started: ${operation}`);
  }

  /**
   * End the timer and log the duration
   */
  public end(data?: any): number {
    const duration = performance.now() - this.startTime;
    this.logger.debug(`Completed: ${this.operation} (${duration.toFixed(2)}ms)`, data);
    return duration;
  }

  /**
   * Log a checkpoint without ending the timer
   */
  public checkpoint(message: string): void {
    const elapsed = performance.now() - this.startTime;
    this.logger.debug(`${this.operation} - ${message} (${elapsed.toFixed(2)}ms elapsed)`);
  }
}

/**
 * Create a performance timer
 */
export function createTimer(operation: string, logger?: Logger): PerformanceTimer {
  return new PerformanceTimer(operation, logger || Logger.getInstance());
}

/**
 * Async function wrapper with automatic error logging
 */
export function withErrorLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  logger?: Logger
): (...args: T) => Promise<R> {
  const log = logger || Logger.getInstance();
  
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      log.exception(error as Error, operation, { args });
      throw error;
    }
  };
}

/**
 * Function wrapper with automatic error logging
 */
export function withSyncErrorLogging<T extends any[], R>(
  fn: (...args: T) => R,
  operation: string,
  logger?: Logger
): (...args: T) => R {
  const log = logger || Logger.getInstance();
  
  return (...args: T): R => {
    try {
      return fn(...args);
    } catch (error) {
      log.exception(error as Error, operation, { args });
      throw error;
    }
  };
}
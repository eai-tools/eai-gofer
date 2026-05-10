/**
 * Winston Logger with Structured JSON Logging
 * Task: T008
 *
 * Features:
 * - JSON format output to stdout
 * - File transport for WARN/ERROR levels
 * - Structured logging with event types
 * - File rotation at 10MB
 *
 * @see .specify/specs/003-orchestrator-agents/contracts/logging-api.md
 * @see .specify/specs/003-orchestrator-agents/research.md (R1)
 */

import winston from 'winston';
import path from 'path';
import type { LogEntry } from '../types/index.js';

/**
 * Create Winston logger instance with structured JSON logging
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.json()
  ),
  transports: [
    // Console transport - all logs
    new winston.transports.Console({
      format: winston.format.json(),
    }),
    // File transport - WARN and ERROR only
    new winston.transports.File({
      filename: path.join('.specify', '.orchestrator.log'),
      level: 'warn',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

/**
 * Log an event with structured data
 *
 * @param level - Log level (info, warn, error)
 * @param entry - Structured log entry
 *
 * @example
 * logEvent('info', {
 *   event: 'task_started',
 *   taskId: 'T001',
 *   specId: '003-orchestrator-agents',
 *   context: { attempt: 1 }
 * });
 */
export function logEvent(level: 'info' | 'warn' | 'error', entry: Partial<LogEntry>): void {
  const logData = {
    ...entry,
    level: level.toUpperCase(),
  };

  logger[level](logData);
}

/**
 * Log info level event
 */
export function logInfo(entry: Partial<LogEntry>): void {
  logEvent('info', entry);
}

/**
 * Log warning level event
 */
export function logWarn(entry: Partial<LogEntry>): void {
  logEvent('warn', entry);
}

/**
 * Log error level event
 */
export function logError(entry: Partial<LogEntry>): void {
  logEvent('error', entry);
}

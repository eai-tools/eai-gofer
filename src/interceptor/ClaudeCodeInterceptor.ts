/**
 * Claude Code Interceptor with File Watching
 * Tasks: T029, T030, T031
 */

import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import { promises as fs } from 'fs';
import { logger } from '../utils/Logger.js';
import { FileUtils } from '../utils/FileUtils.js';

export class ClaudeCodeInterceptor {
  private watcher: FSWatcher | null = null;
  private fileUtils = new FileUtils();
  private responseCallback: ((response: string) => void) | null = null;
  private questionCallback: ((question: string) => void) | null = null;

  async initialize(): Promise<void> {
    this.watcher = chokidar.watch(['.claude-output.txt', '.claude-question.txt'], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', (path: string) => {
      logger.info({ event: 'file_change_detected', context: { path } });

      if (path.includes('.claude-output.txt') && this.responseCallback) {
        void this.handleResponse();
      } else if (path.includes('.claude-question.txt') && this.questionCallback) {
        void this.handleQuestion();
      }
    });
  }

  private async handleResponse(): Promise<void> {
    try {
      const content = await fs.readFile('.claude-output.txt', 'utf-8');
      if (content.trim() && this.responseCallback) {
        this.responseCallback(content);
      }
    } catch (error) {
      logger.error({ event: 'response_read_error', context: { error } });
    }
  }

  private async handleQuestion(): Promise<void> {
    try {
      const content = await fs.readFile('.claude-question.txt', 'utf-8');
      if (content.trim() && this.questionCallback) {
        this.questionCallback(content);
      }
    } catch (error) {
      logger.error({ event: 'question_read_error', context: { error } });
    }
  }

  onResponse(callback: (response: string) => void): void {
    this.responseCallback = callback;
  }

  onQuestion(callback: (question: string) => void): void {
    this.questionCallback = callback;
  }

  async start(): Promise<void> {
    await this.initialize();
  }

  async sendPrompt(prompt: string): Promise<void> {
    await this.fileUtils.atomicWrite('.claude-input.txt', prompt);
    logger.info({ event: 'prompt_sent', context: { length: prompt.length } });
  }

  async sendToClaudeCode(message: string): Promise<void> {
    await this.sendPrompt(message);
  }

  async waitForResponse(timeout = 300000): Promise<string> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const content = await fs.readFile('.claude-output.txt', 'utf-8');
        if (content.trim()) {
          await fs.writeFile('.claude-output.txt', '', 'utf-8');
          return content;
        }
      } catch {
        // File doesn't exist yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Response timeout');
  }

  async close(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
  }
}

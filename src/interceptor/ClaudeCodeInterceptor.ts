/**
 * Claude Code Interceptor with File Watching
 * Tasks: T029, T030, T031
 */

import chokidar from 'chokidar';
import { promises as fs } from 'fs';
import { logger } from '../utils/Logger.js';
import { FileUtils } from '../utils/FileUtils.js';

export class ClaudeCodeInterceptor {
  private watcher: chokidar.FSWatcher | null = null;
  private fileUtils = new FileUtils();

  async initialize(): Promise<void> {
    this.watcher = chokidar.watch(['.claude-output.txt', '.claude-question.txt'], {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', (path) => {
      logger.info({ event: 'file_change_detected', context: { path } });
    });
  }

  async sendPrompt(prompt: string): Promise<void> {
    await this.fileUtils.atomicWrite('.claude-input.txt', prompt);
    logger.info({ event: 'prompt_sent', context: { length: prompt.length } });
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

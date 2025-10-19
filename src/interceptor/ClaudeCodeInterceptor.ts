import { EventEmitter } from 'events';
import WebSocket from 'ws';
import fs from 'fs/promises';
import * as chokidar from 'chokidar';
import path from 'path';

/**
 * ClaudeCodeInterceptor intercepts communication with Claude Code
 *
 * There are multiple approaches:
 * 1. File-based communication (writing prompts to .claude-input, reading from .claude-output)
 * 2. WebSocket server that Claude Code VSCode extension connects to
 * 3. VSCode extension that hooks into Claude Code
 *
 * This implementation uses approach #1 (file-based) as it's the most reliable
 */
export class ClaudeCodeInterceptor extends EventEmitter {
  private inputFile = '.claude-input.txt';
  private outputFile = '.claude-output.txt';
  private questionFile = '.claude-question.txt';
  private watcher: chokidar.FSWatcher | null = null;
  private wsServer: WebSocket.Server | null = null;

  constructor() {
    super();
  }

  async start(workspaceDir: string, wsPort?: number): Promise<void> {
    const inputPath = path.join(workspaceDir, this.inputFile);
    const outputPath = path.join(workspaceDir, this.outputFile);
    const questionPath = path.join(workspaceDir, this.questionFile);

    // Initialize files
    await fs.writeFile(inputPath, '');
    await fs.writeFile(outputPath, '');
    await fs.writeFile(questionPath, '');

    // Watch for Claude Code responses
    this.watcher = chokidar.watch(outputPath, {
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('change', async () => {
      const content = await fs.readFile(outputPath, 'utf-8');
      if (content.trim()) {
        this.emit('response', content);
        // Clear the file after reading
        await fs.writeFile(outputPath, '');
      }
    });

    // Watch for Claude Code questions
    const questionWatcher = chokidar.watch(questionPath, {
      persistent: true,
      ignoreInitial: true
    });

    questionWatcher.on('change', async () => {
      const content = await fs.readFile(questionPath, 'utf-8');
      if (content.trim()) {
        this.emit('question', content);
        await fs.writeFile(questionPath, '');
      }
    });

    // Optional: Start WebSocket server for real-time communication
    if (wsPort) {
      this.startWebSocketServer(wsPort);
    }

    console.log('📡 Claude Code Interceptor started');
    console.log(`   Input file: ${inputPath}`);
    console.log(`   Output file: ${outputPath}`);
    console.log(`   Question file: ${questionPath}`);
  }

  private startWebSocketServer(port: number): void {
    this.wsServer = new WebSocket.Server({ port });

    this.wsServer.on('connection', (ws) => {
      console.log('🔌 Claude Code client connected via WebSocket');

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'response') {
          this.emit('response', message.content);
        } else if (message.type === 'question') {
          this.emit('question', message.content);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Claude Code client disconnected');
      });
    });

    console.log(`   WebSocket server: ws://localhost:${port}`);
  }

  async sendToClaudeCode(prompt: string): Promise<void> {
    // Write to input file
    await fs.appendFile(this.inputFile, `\n\n${prompt}\n`);

    // If WebSocket is connected, send via WS too
    if (this.wsServer) {
      this.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'prompt', content: prompt }));
        }
      });
    }

    console.log(`📤 Sent to Claude Code: ${prompt.substring(0, 100)}...`);
  }

  onResponse(callback: (response: string) => void): void {
    this.on('response', callback);
  }

  onQuestion(callback: (question: string) => void): void {
    this.on('question', callback);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    if (this.wsServer) {
      this.wsServer.close();
    }
  }
}

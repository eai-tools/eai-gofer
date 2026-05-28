import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MCPToolHandler } from '../../../language-server/src/mcp/toolHandler.js';

describe('context health archive exclusion', () => {
  it('excludes archived spec folders from fallback context health estimates', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-context-health-'));
    try {
      fs.mkdirSync(path.join(root, '.specify/specs/001-active'), { recursive: true });
      fs.mkdirSync(path.join(root, '.specify/specs/_archived/000-old'), { recursive: true });
      fs.writeFileSync(path.join(root, '.specify/specs/001-active/spec.md'), 'a'.repeat(400));
      fs.writeFileSync(
        path.join(root, '.specify/specs/_archived/000-old/spec.md'),
        'b'.repeat(4000)
      );

      const handler = new MCPToolHandler(root, { sendNotification: () => undefined } as never);
      const result = await handler.getContextHealth(true);

      expect(result.success).toBe(true);
      expect(result.health?.breakdown?.specArtifacts).toBe(100);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

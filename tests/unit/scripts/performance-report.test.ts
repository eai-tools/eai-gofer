import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SCRIPT_URL = pathToFileURL(
  path.resolve(__dirname, '../../../.specify/scripts/node/gofer-performance-report.mjs')
).href;

describe('gofer-performance-report', () => {
  it('separates active specs from archived specs and keeps paths portable', async () => {
    const { generatePerformanceReport } = await import(SCRIPT_URL);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gofer-perf-'));
    try {
      fs.mkdirSync(path.join(root, '.specify/specs/001-active'), { recursive: true });
      fs.mkdirSync(path.join(root, '.specify/specs/_archived/000-old'), { recursive: true });
      fs.writeFileSync(path.join(root, '.specify/specs/001-active/spec.md'), 'active');
      fs.writeFileSync(path.join(root, '.specify/specs/_archived/000-old/spec.md'), 'archived');
      fs.mkdirSync(path.join(root, 'src'), { recursive: true });
      fs.writeFileSync(path.join(root, 'src/index.ts'), 'export {};');

      const report = await generatePerformanceReport({ root });
      const active = report.buckets.find(
        (bucket: { name: string }) => bucket.name === 'active-specs'
      );
      const archived = report.buckets.find(
        (bucket: { name: string }) => bucket.name === 'archived-specs'
      );

      expect(report.rootLabel).toBe('${workspaceFolder}');
      expect(active.filesScanned).toBe(1);
      expect(archived.filesScanned).toBe(1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

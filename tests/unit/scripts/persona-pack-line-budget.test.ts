/**
 * T152 — Persona-pack template line and byte budget.
 *
 * NFR-003 caps every persona-pack template (i.e. every visual template
 * under `.specify/templates/visuals/`) at:
 *   - <= 2,000 lines
 *   - <= 200 KiB (200 * 1024 bytes)
 *
 * These limits keep the templates readable, snapshot-friendly, and
 * embeddable in subagent prompts without context bloat.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import * as fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const TEMPLATE_DIR = path.join(REPO_ROOT, '.specify/templates/visuals');

const LINE_LIMIT = 2_000;
const BYTE_LIMIT = 200 * 1024;

describe('persona-pack template line and byte budget (T152, NFR-003)', () => {
  let templateFiles: string[] = [];

  beforeAll(async () => {
    const entries = await readdir(TEMPLATE_DIR);
    templateFiles = entries.filter((f) => f.endsWith('.md')).sort();
  });

  it('directory contains at least one .md template', () => {
    expect(templateFiles.length).toBeGreaterThan(0);
  });

  // We declare per-file expectations dynamically inside a single test so the
  // failure message identifies the offending file. Using `it.each` over an
  // empty array (in case the dir is missing) would silently pass; this
  // structure is more defensive.
  it('every persona-pack template fits within the line and byte budget', async () => {
    expect(templateFiles.length).toBeGreaterThan(0);

    for (const fileName of templateFiles) {
      const filePath = path.join(TEMPLATE_DIR, fileName);
      const content = await readFile(filePath, 'utf8');
      const bytes = Buffer.byteLength(content, 'utf8');
      const lineCount = content.split(/\r?\n/).length;

      expect(bytes, `${fileName} is ${bytes} bytes (max ${BYTE_LIMIT})`).toBeLessThanOrEqual(
        BYTE_LIMIT
      );

      expect(
        lineCount,
        `${fileName} is ${lineCount} lines (max ${LINE_LIMIT})`
      ).toBeLessThanOrEqual(LINE_LIMIT);
    }
  });

  // Per-file granular tests so a regression points at a single template.
  describe('per-template budget enforcement', () => {
    // We build a static list synchronously by reading the directory
    // up front. Vitest evaluates `describe` blocks before `beforeAll`,
    // so we use a top-level synchronous discovery here.
    let discovered: string[] = [];
    try {
      discovered = fs
        .readdirSync(TEMPLATE_DIR)
        .filter((f: string) => f.endsWith('.md'))
        .sort();
    } catch {
      discovered = [];
    }

    if (discovered.length === 0) {
      it('discovers persona-pack templates', () => {
        expect(discovered.length).toBeGreaterThan(0);
      });
      return;
    }

    for (const fileName of discovered) {
      describe(fileName, () => {
        let bytes = 0;
        let lines = 0;

        beforeAll(async () => {
          const filePath = path.join(TEMPLATE_DIR, fileName);
          const content = await readFile(filePath, 'utf8');
          bytes = Buffer.byteLength(content, 'utf8');
          lines = content.split(/\r?\n/).length;
        });

        it(`is <= ${LINE_LIMIT} lines`, () => {
          expect(lines).toBeLessThanOrEqual(LINE_LIMIT);
        });

        it(`is <= ${BYTE_LIMIT} bytes (200 KiB)`, () => {
          expect(bytes).toBeLessThanOrEqual(BYTE_LIMIT);
        });
      });
    }
  });
});

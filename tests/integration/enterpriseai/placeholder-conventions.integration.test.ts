import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  normalizeRuntimePlaceholder,
  validatePlaceholderConventions,
} from '../../../extension/src/services/enterpriseai/validation/PlaceholderConventions';

function collectMarkdownFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe('enterpriseai placeholder conventions (root integration)', () => {
  it('enforces placeholder conventions for feature 029 markdown artifacts and rejects legacy placeholders', () => {
    const featureDir = path.join(
      process.cwd(),
      '.specify',
      'specs',
      '029-enterpriseai-student-vertical-builder'
    );

    const markdownFiles = collectMarkdownFiles(featureDir);
    expect(markdownFiles.length).toBeGreaterThan(0);

    for (const markdownFile of markdownFiles) {
      const content = fs.readFileSync(markdownFile, 'utf8');
      const validation = validatePlaceholderConventions(content);
      expect(validation.valid).toBe(true);
    }

    expect(normalizeRuntimePlaceholder('feature name')).toBe('{{FEATURE_NAME}}');

    const legacyValidation = validatePlaceholderConventions(
      '# Legacy\nUse [FEATURE] and $ARGUMENTS placeholders.'
    );
    expect(legacyValidation.valid).toBe(false);
    expect(
      legacyValidation.errors.some((error: string) => error.includes('Legacy runtime placeholder'))
    ).toBe(true);
  });
});

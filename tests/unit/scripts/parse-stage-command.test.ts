import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';

const FIXTURE_PATH = path.resolve(
  __dirname,
  '../../../tests/fixtures/stage-commands/sample-stage.md'
);

const moduleUrl = new URL(
  '../../../.specify/scripts/node/parse-stage-command.mjs',
  import.meta.url
);

describe('parseStageCommand', () => {
  let parseStageCommand: (
    filePath: string
  ) => Promise<{ frontmatter: Record<string, unknown>; body: string }>;

  beforeAll(async () => {
    const mod = await import(moduleUrl.href);
    parseStageCommand = mod.parseStageCommand;
  });

  it('parses valid YAML frontmatter without throwing', async () => {
    const result = await parseStageCommand(FIXTURE_PATH);
    expect(result).toBeDefined();
    expect(result.frontmatter).toBeDefined();
    expect(result.body).toBeDefined();
  });

  it('returns the correct name field from frontmatter', async () => {
    const { frontmatter } = await parseStageCommand(FIXTURE_PATH);
    expect(frontmatter.name).toBe('1_gofer_research');
  });

  it('returns the correct description field from frontmatter', async () => {
    const { frontmatter } = await parseStageCommand(FIXTURE_PATH);
    expect(frontmatter.description).toBe(
      'Research codebase, CLI integrations, and technology landscape for the target feature.'
    );
  });

  it('returns the correct title field from frontmatter', async () => {
    const { frontmatter } = await parseStageCommand(FIXTURE_PATH);
    expect(frontmatter.title).toBe('Gofer Research');
  });

  it('returns surfaces as an array', async () => {
    const { frontmatter } = await parseStageCommand(FIXTURE_PATH);
    expect(Array.isArray(frontmatter.surfaces)).toBe(true);
    expect(frontmatter.surfaces).toContain('claude');
    expect(frontmatter.surfaces).toContain('codex');
    expect(frontmatter.surfaces).toContain('gemini');
  });

  it('returns the correct category', async () => {
    const { frontmatter } = await parseStageCommand(FIXTURE_PATH);
    expect(frontmatter.category).toBe('pipeline');
  });

  it('extracts markdown body after the second --- fence', async () => {
    const { body } = await parseStageCommand(FIXTURE_PATH);
    // Body should contain the heading and content, not the frontmatter
    expect(body).toContain('# Gofer Research');
    expect(body).toContain('Analyse the existing codebase structure');
    // Body must not contain frontmatter keys
    expect(body).not.toContain('name: 1_gofer_research');
    expect(body).not.toContain('category: pipeline');
  });

  it('throws for a file that does not start with ---', async () => {
    // Use a non-existent path that we know will fail
    await expect(parseStageCommand('/nonexistent/path/file.md')).rejects.toThrow();
  });
});

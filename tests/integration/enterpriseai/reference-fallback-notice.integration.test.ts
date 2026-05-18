import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  resolveEnterpriseAiReferences,
  type ReferenceFallbackUsedEventPayload,
} from '../../../extension/src/services/enterpriseai/internalApi/ResolveEnterpriseAiReferences';
import {
  createReferenceFallbackEventHandlers,
  type ReferenceFallbackNotice,
} from '../../../extension/src/services/enterpriseai/events/ReferenceFallbackEvents';

function createFixtureDir(prefix: string): string {
  return path.join(
    process.cwd(),
    'tests',
    'integration',
    'enterpriseai',
    `${prefix}-${process.pid}-${Date.now()}`
  );
}

function seedFallbackReferences(workspaceRoot: string): void {
  const fallbackDir = path.join(workspaceRoot, '.specify', 'references', 'eai');
  fs.mkdirSync(fallbackDir, { recursive: true });
  fs.writeFileSync(path.join(fallbackDir, 'eai.md'), '# eai cli fallback\n', 'utf8');
  fs.writeFileSync(path.join(fallbackDir, 'vertical-template.md'), '# vertical fallback\n', 'utf8');
  fs.writeFileSync(path.join(fallbackDir, 'deployment-repo.md'), '# deployment fallback\n', 'utf8');
}

describe('enterpriseai reference fallback notice (root integration)', () => {
  it('accepts legacy eai reference aliases and fallback filenames', async () => {
    const fixturesDir = createFixtureDir('fixtures-reference-fallback-legacy-eai');
    const legacyReferenceName = ['eai', 'cli'].join('-');
    const legacyDocsReferenceName = ['eai', 'cli', 'docs'].join('_');
    fs.rmSync(fixturesDir, { recursive: true, force: true });

    try {
      const fallbackDir = path.join(fixturesDir, '.specify', 'references', 'eai');
      fs.mkdirSync(fallbackDir, { recursive: true });
      fs.writeFileSync(
        path.join(fallbackDir, `${legacyReferenceName}.md`),
        '# legacy eai fallback\n',
        'utf8'
      );

      const result = await resolveEnterpriseAiReferences(
        {
          runId: 'run_legacy_eai_alias',
          referenceTypes: [legacyDocsReferenceName],
          externalReferencesEnabled: false,
          fallbackPath: '.specify/references/eai/',
        },
        {
          workspaceRoot: fixturesDir,
        }
      );

      expect(result.response.resolvedReferences).toEqual([
        {
          type: 'eai',
          source: 'local-fallback',
          path: `.specify/references/eai/${legacyReferenceName}.md`,
        },
      ]);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('uses local fallback references and dispatches user notice when external references are unavailable', async () => {
    const fixturesDir = createFixtureDir('fixtures-reference-fallback-notice');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedFallbackReferences(fixturesDir);

    try {
      const notices: ReferenceFallbackNotice[] = [];
      const eventHandlers = createReferenceFallbackEventHandlers(
        (notice: ReferenceFallbackNotice): void => {
          notices.push(notice);
        }
      );
      const consumedPayloads: ReferenceFallbackUsedEventPayload[] = [];
      const unsubscribe = eventHandlers.consume(
        (payload: ReferenceFallbackUsedEventPayload): void => {
          consumedPayloads.push(payload);
        }
      );

      const result = await resolveEnterpriseAiReferences(
        {
          runId: 'run_029_0001',
          referenceTypes: ['eai', 'vertical-template', 'deployment-repo'],
          externalReferencesEnabled: true,
          fallbackPath: '.specify/references/eai/',
        },
        {
          workspaceRoot: fixturesDir,
          resolvedAt: '2026-04-09T00:22:00Z',
          externalReferenceResolver: (referenceType): string | undefined =>
            referenceType === 'deployment-repo'
              ? 'https://docs.enterpriseai.example/deployment-repo'
              : undefined,
          externalReferenceAvailabilityChecker: async (
            _externalReferencePath,
            referenceType
          ): Promise<boolean> => referenceType === 'deployment-repo',
          eventPublisher: (payload: ReferenceFallbackUsedEventPayload): void => {
            eventHandlers.publish(payload);
          },
        }
      );

      unsubscribe();

      expect(result.contractId).toBe('IAP-004');
      expect(result.response.status).toBe('resolved');
      expect(result.response.userNoticeRequired).toBe(true);
      expect(result.response.unavailableExternalReferences).toEqual(['eai', 'vertical-template']);
      expect(
        result.response.resolvedReferences.find((reference) => reference.type === 'eai')?.source
      ).toBe('local-fallback');
      expect(
        result.response.resolvedReferences.find((reference) => reference.type === 'deployment-repo')
          ?.source
      ).toBe('external');
      expect(result.emittedEvent?.contractId).toBe('EVT-004');
      expect(consumedPayloads).toHaveLength(1);
      expect(notices).toHaveLength(1);
      expect(notices[0].message).toContain('using local docs');
      expect(notices[0].message).toContain('.specify/references/eai/');
      expect(eventHandlers.consumerCount()).toBe(0);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });

  it('rejects fallback paths outside workspace allowlist', async () => {
    const fixturesDir = createFixtureDir('fixtures-reference-fallback-unsafe');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedFallbackReferences(fixturesDir);

    try {
      await expect(
        resolveEnterpriseAiReferences(
          {
            runId: 'run_029_unsafe',
            referenceTypes: ['eai'],
            externalReferencesEnabled: false,
            fallbackPath: '/etc',
          },
          {
            workspaceRoot: fixturesDir,
          }
        )
      ).rejects.toThrow(/REF_FALLBACK_NOT_FOUND/);
    } finally {
      fs.rmSync(fixturesDir, { recursive: true, force: true });
    }
  });
});

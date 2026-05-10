import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  resolveEnterpriseAiReferences,
  type ReferenceFallbackUsedEventPayload,
} from '../../../services/enterpriseai/internalApi/ResolveEnterpriseAiReferences';
import {
  createReferenceFallbackEventHandlers,
  type ReferenceFallbackNotice,
} from '../../../services/enterpriseai/events/ReferenceFallbackEvents';

suite('enterpriseai reference fallback notice (extension integration)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures-reference-fallback-notice');

  setup(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
    const fallbackDir = path.join(fixturesDir, '.specify', 'references', 'eai');
    await fs.mkdir(fallbackDir, { recursive: true });
    await fs.writeFile(path.join(fallbackDir, 'eai-cli.md'), '# eai cli fallback\n', 'utf8');
    await fs.writeFile(
      path.join(fallbackDir, 'vertical-template.md'),
      '# vertical fallback\n',
      'utf8'
    );
    await fs.writeFile(
      path.join(fallbackDir, 'deployment-repo.md'),
      '# deployment fallback\n',
      'utf8'
    );
  });

  teardown(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  test('publishes EVT-004 and dispatches fallback notice when local references are used', async () => {
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
        referenceTypes: ['eai_cli_docs', 'vertical_template_docs'],
        externalReferencesEnabled: false,
        fallbackPath: '.specify/references/eai/',
      },
      {
        workspaceRoot: fixturesDir,
        resolvedAt: '2026-04-09T00:22:00Z',
        eventPublisher: (payload: ReferenceFallbackUsedEventPayload): void => {
          eventHandlers.publish(payload);
        },
      }
    );

    unsubscribe();

    assert.strictEqual(result.contractId, 'IAP-004');
    assert.strictEqual(result.operationName, 'references.resolveEnterpriseAiReferences');
    assert.strictEqual(result.response.status, 'resolved');
    assert.strictEqual(result.response.userNoticeRequired, true);
    assert.deepStrictEqual(result.response.unavailableExternalReferences, [
      'eai-cli',
      'vertical-template',
    ]);
    assert.strictEqual(
      result.response.resolvedReferences.every(
        (reference) =>
          reference.source === 'local-fallback' && reference.path.startsWith('.specify/')
      ),
      true
    );
    assert.strictEqual(result.emittedEvent?.contractId, 'EVT-004');
    assert.strictEqual(consumedPayloads.length, 1);
    assert.strictEqual(notices.length, 1);
    assert.ok(notices[0].message.includes('using local docs'));
    assert.ok(notices[0].message.includes('.specify/references/eai/'));
    assert.strictEqual(eventHandlers.consumerCount(), 0);
  });

  test('rejects fallback paths outside workspace allowlist', async () => {
    await assert.rejects(
      resolveEnterpriseAiReferences(
        {
          runId: 'run_029_unsafe',
          referenceTypes: ['eai-cli'],
          externalReferencesEnabled: false,
          fallbackPath: '/etc',
        },
        {
          workspaceRoot: fixturesDir,
        }
      ),
      /REF_FALLBACK_NOT_FOUND/
    );
  });

  test('falls back to local references when external references are unreachable', async () => {
    const result = await resolveEnterpriseAiReferences(
      {
        runId: 'run_029_external_unreachable',
        referenceTypes: ['eai-cli'],
        externalReferencesEnabled: true,
        fallbackPath: '.specify/references/eai/',
      },
      {
        workspaceRoot: fixturesDir,
        externalReferenceResolver: (): string | undefined => 'https://example.invalid/eai-cli',
        externalReferenceAvailabilityChecker: async (): Promise<boolean> => false,
      }
    );

    assert.strictEqual(result.response.status, 'resolved');
    assert.strictEqual(result.response.userNoticeRequired, true);
    assert.deepStrictEqual(result.response.unavailableExternalReferences, ['eai-cli']);
    assert.strictEqual(result.response.resolvedReferences[0]?.source, 'local-fallback');
  });
});

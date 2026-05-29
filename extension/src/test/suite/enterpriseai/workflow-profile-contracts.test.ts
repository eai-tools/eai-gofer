import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { normalizeWorkflowProfile } from '../../../config/workflowProfile';
import { EAIReferenceResolver } from '../../../services/EAIReferenceResolver';
import {
  extractEaiCliVersionInfo,
  parseMajorMinorVersion,
} from '../../../services/enterpriseai/EaiCliVersion';
import { type EaiReferenceSource } from '../../../services/enterpriseai/models/Governance';

suite('enterpriseai workflow profile contracts', () => {
  const fixturesRoot = path.join(__dirname, 'fixtures-workflow');
  const fallbackFile = path.join(fixturesRoot, '.specify', 'references', 'platform', 'eai.md');

  setup(async () => {
    await fs.mkdir(path.dirname(fallbackFile), { recursive: true });
    await fs.writeFile(fallbackFile, '# Local EAI CLI fallback reference', 'utf8');
  });

  teardown(async () => {
    await fs.rm(fixturesRoot, { recursive: true, force: true });
  });

  test('normalizes unknown workflow profile values to enterpriseai', () => {
    assert.strictEqual(normalizeWorkflowProfile('unknown-profile'), 'enterpriseai');
    assert.strictEqual(normalizeWorkflowProfile(undefined), 'enterpriseai');
    assert.strictEqual(normalizeWorkflowProfile('enterpriseai'), 'enterpriseai');
  });

  test('resolves local fallback references when external sources are unavailable', async () => {
    const resolver = new EAIReferenceResolver(fixturesRoot);
    const sources: readonly EaiReferenceSource[] = [
      {
        referenceId: 'ref_001',
        referenceType: 'eai_docs',
        localFallbackPath: '.specify/references/platform/eai.md',
        availabilityStatus: 'external_unavailable',
        lastCheckedAt: new Date().toISOString(),
      },
    ];

    const result = await resolver.resolve('run_001', sources);

    assert.strictEqual(result.status, 'resolved');
    assert.strictEqual(result.resolvedReferences.length, 1);
    assert.strictEqual(result.resolvedReferences[0].source, 'local-fallback');
    assert.strictEqual(result.userNoticeRequired, true);
    assert.deepStrictEqual(result.unavailableExternalReferences, ['eai_docs']);
  });

  test('extracts eai version and major.minor pin metadata', () => {
    const versionOutput = 'eai version 2.7.4 (build 2191)';
    const info = extractEaiCliVersionInfo(versionOutput);

    assert.ok(info);
    assert.strictEqual(info?.fullVersion, '2.7.4');
    assert.strictEqual(info?.majorMinor, '2.7');
    assert.strictEqual(parseMajorMinorVersion('2.7.4'), '2.7');
  });
});

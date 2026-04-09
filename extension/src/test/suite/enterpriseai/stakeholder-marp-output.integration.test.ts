import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateStakeholderArtifacts } from '../../../services/enterpriseai/internalApi/GenerateStakeholderArtifacts';

const FEATURE_DIR = '.specify/specs/029-enterpriseai-student-vertical-builder';
const FEATURE_SPEC_PATH = `${FEATURE_DIR}/spec.md`;
const EXPECTED_MARP_PATH = `${FEATURE_DIR}/presentation.marp.md`;

async function seedStakeholderInputs(workspaceRoot: string): Promise<void> {
  const featureDirPath = path.join(workspaceRoot, FEATURE_DIR);
  await fs.mkdir(featureDirPath, { recursive: true });
  await fs.writeFile(
    path.join(featureDirPath, 'discovery.md'),
    '# Discovery\nProblem statement for EnterpriseAI student delivery.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(featureDirPath, 'spec.md'),
    '# Spec\nEnterpriseAI solution overview with integration boundaries.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(featureDirPath, 'plan.md'),
    '# Plan\nArchitecture diagram reference and deployment sequencing.\n',
    'utf8'
  );
  await fs.writeFile(
    path.join(featureDirPath, 'implementation-summary.md'),
    '# Implementation\nDemo-ready implementation summary with measurable outcomes.\n',
    'utf8'
  );
}

suite('enterpriseai stakeholder marp output (extension integration)', () => {
  const fixturesDir = path.join(__dirname, 'fixtures-stakeholder-marp-output');

  setup(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
    await seedStakeholderInputs(fixturesDir);
  });

  teardown(async () => {
    await fs.rm(fixturesDir, { recursive: true, force: true });
  });

  test('emits presentation.marp.md under the feature spec directory for IAP-007/EVT-007', async () => {
    const result = await generateStakeholderArtifacts(
      {
        runId: 'run_029_0001',
        workflowProfile: 'enterpriseai',
        enableMarpDeck: true,
        inputArtifacts: {
          discovery: `${FEATURE_DIR}/discovery.md`,
          spec: FEATURE_SPEC_PATH,
          plan: `${FEATURE_DIR}/plan.md`,
          implementationSummary: `${FEATURE_DIR}/implementation-summary.md`,
        },
      },
      {
        workspaceRoot: fixturesDir,
      }
    );

    assert.strictEqual(result.contractId, 'IAP-007');
    assert.strictEqual(result.operationName, 'comms.generateStakeholderArtifacts');
    assert.strictEqual(result.response.marpEnabled, true);
    assert.strictEqual(result.response.marpDeckGenerated, true);
    assert.strictEqual(result.response.marpDeckPath, EXPECTED_MARP_PATH);
    assert.strictEqual(result.emittedEvent.contractId, 'EVT-007');
    assert.strictEqual(result.emittedEvent.payload.marpDeckPath, EXPECTED_MARP_PATH);

    const marpDeckContent = await fs.readFile(path.join(fixturesDir, EXPECTED_MARP_PATH), 'utf8');
    assert.ok(marpDeckContent.includes('marp: true'));
    assert.ok(marpDeckContent.includes('Problem Statement'));
  });
});

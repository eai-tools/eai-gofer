import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { generateStakeholderArtifacts } from '../../../extension/src/services/enterpriseai/internalApi/GenerateStakeholderArtifacts';
import { createStakeholderCommsEventHandlers } from '../../../extension/src/services/enterpriseai/events/StakeholderCommsEvents';

const FEATURE_DIR = '.specify/specs/029-enterpriseai-student-vertical-builder';

function createFixtureDir(prefix: string): string {
  return path.join(
    process.cwd(),
    'tests',
    'integration',
    'enterpriseai',
    `${prefix}-${Date.now()}`
  );
}

function seedPartialInputs(workspaceRoot: string): void {
  const featureDirPath = path.join(workspaceRoot, FEATURE_DIR);
  fs.mkdirSync(featureDirPath, { recursive: true });
  fs.writeFileSync(path.join(featureDirPath, 'spec.md'), '# Spec\nOverview.\n', 'utf8');
  fs.writeFileSync(path.join(featureDirPath, 'plan.md'), '# Plan\nReference.\n', 'utf8');
  fs.writeFileSync(
    path.join(featureDirPath, 'implementation-summary.md'),
    '# Implementation\nDone.\n',
    'utf8'
  );
}

describe('enterpriseai stakeholder error code contracts (root integration)', () => {
  it('maps IAP-007 payload validation failures to contract error codes', async () => {
    const fixturesDir = createFixtureDir('fixtures-stakeholder-payload-errors');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedPartialInputs(fixturesDir);

    await expect(
      generateStakeholderArtifacts(
        {
          runId: 'run_029_err_000',
          workflowProfile: 'enterpriseai',
          enableMarpDeck: true,
          inputArtifacts: {
            discovery: '',
            spec: `${FEATURE_DIR}/spec.md`,
            plan: `${FEATURE_DIR}/plan.md`,
            implementationSummary: `${FEATURE_DIR}/implementation-summary.md`,
          },
        },
        {
          workspaceRoot: fixturesDir,
        }
      )
    ).rejects.toThrow(/COMMS_INPUT_ARTIFACT_MISSING|COMMS_MARP_TEMPLATE_INVALID/);

    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  it('maps unexpected artifact read errors to IAP-007 contract error codes', async () => {
    const fixturesDir = createFixtureDir('fixtures-stakeholder-read-errors');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedPartialInputs(fixturesDir);

    await expect(
      generateStakeholderArtifacts(
        {
          runId: 'run_029_err_000a',
          workflowProfile: 'enterpriseai',
          enableMarpDeck: true,
          inputArtifacts: {
            discovery: FEATURE_DIR,
            spec: `${FEATURE_DIR}/spec.md`,
            plan: `${FEATURE_DIR}/plan.md`,
            implementationSummary: `${FEATURE_DIR}/implementation-summary.md`,
          },
        },
        {
          workspaceRoot: fixturesDir,
        }
      )
    ).rejects.toThrow(/COMMS_INPUT_ARTIFACT_MISSING/);

    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  it('emits IAP-007 contract error codes for missing artifacts', async () => {
    const fixturesDir = createFixtureDir('fixtures-stakeholder-errors');
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    seedPartialInputs(fixturesDir);

    await expect(
      generateStakeholderArtifacts(
        {
          runId: 'run_029_err_001',
          workflowProfile: 'enterpriseai',
          enableMarpDeck: true,
          inputArtifacts: {
            discovery: `${FEATURE_DIR}/discovery.md`,
            spec: `${FEATURE_DIR}/spec.md`,
            plan: `${FEATURE_DIR}/plan.md`,
            implementationSummary: `${FEATURE_DIR}/implementation-summary.md`,
          },
        },
        {
          workspaceRoot: fixturesDir,
        }
      )
    ).rejects.toThrow(/COMMS_INPUT_ARTIFACT_MISSING/);

    fs.rmSync(fixturesDir, { recursive: true, force: true });
  });

  it('emits EVT-007 contract error codes for event payload and consumer failures', () => {
    const handlers = createStakeholderCommsEventHandlers();

    expect(() =>
      handlers.publish({
        eventId: 'evt_invalid',
        runId: 'run_029_evt_001',
        releaseNotesPath: '',
        demoScriptPath: `${FEATURE_DIR}/demo-script.md`,
        marpDeckPath: `${FEATURE_DIR}/presentation.marp.md`,
        marpEnabled: true,
      })
    ).toThrow(/EVT_COMMS_ARTIFACT_MISSING/);

    const unsubscribe = handlers.consume((): void => {
      throw new Error('consumer failed');
    });

    expect(() =>
      handlers.publish({
        eventId: 'evt_valid',
        runId: 'run_029_evt_002',
        releaseNotesPath: `${FEATURE_DIR}/release-notes.md`,
        demoScriptPath: `${FEATURE_DIR}/demo-script.md`,
        marpDeckPath: `${FEATURE_DIR}/presentation.marp.md`,
        marpEnabled: true,
      })
    ).toThrow(/EVT_COMMS_CONSUMER_FAILED/);

    unsubscribe();
  });
});
